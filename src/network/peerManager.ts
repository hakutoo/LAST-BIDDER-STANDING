import Peer, { type DataConnection } from 'peerjs';
import type { ClientMessage, HostMessage } from './protocol';

const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ],
  },
};

export class PeerNetworkManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // host: clientId -> conn, client: 'host' -> conn
  private myPeerId: string = '';
  private isHost: boolean = false;

  private onClientMessageCallback?: (clientId: string, msg: ClientMessage) => void;
  private onHostMessageCallback?: (msg: HostMessage) => void;
  private onConnectionOpenCallback?: (id: string) => void;
  private onConnectionCloseCallback?: (id: string) => void;
  private onErrorCallback?: (err: any) => void;

  public getPeerId(): string {
    return this.myPeerId;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  // ホストとして初期化
  public async initAsHost(
    customRoomId?: string,
    onReady?: (roomId: string) => void,
    onClientMsg?: (clientId: string, msg: ClientMessage) => void,
    onClientConnect?: (clientId: string) => void,
    onClientDisconnect?: (clientId: string) => void,
    onError?: (err: any) => void
  ): Promise<string> {
    this.destroy();
    this.isHost = true;
    this.onClientMessageCallback = onClientMsg;
    this.onConnectionOpenCallback = onClientConnect;
    this.onConnectionCloseCallback = onClientDisconnect;
    this.onErrorCallback = onError;

    return new Promise((resolve, reject) => {
      // 短くわかりやすいIDにするか、ランダムID
      const id = customRoomId || `card-${Math.random().toString(36).substring(2, 8)}`;
      this.peer = new Peer(id, PEER_CONFIG);

      this.peer.on('open', (peerId) => {
        this.myPeerId = peerId;
        if (onReady) onReady(peerId);
        resolve(peerId);
      });

      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          this.connections.set(conn.peer, conn);
          if (this.onConnectionOpenCallback) {
            this.onConnectionOpenCallback(conn.peer);
          }
        });

        conn.on('data', (data: any) => {
          if (this.onClientMessageCallback) {
            this.onClientMessageCallback(conn.peer, data as ClientMessage);
          }
        });

        conn.on('close', () => {
          this.connections.delete(conn.peer);
          if (this.onConnectionCloseCallback) {
            this.onConnectionCloseCallback(conn.peer);
          }
        });

        conn.on('error', (err) => {
          console.error('Host connection error:', err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (this.onErrorCallback) this.onErrorCallback(err);
        reject(err);
      });
    });
  }

  // クライアントとして参加
  public async joinRoom(
    hostRoomId: string,
    onHostMsg: (msg: HostMessage) => void,
    onConnected?: () => void,
    onDisconnected?: () => void,
    onError?: (err: any) => void
  ): Promise<void> {
    this.destroy();
    this.isHost = false;
    this.onHostMessageCallback = onHostMsg;
    this.onErrorCallback = onError;

    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          const err = new Error('接続がタイムアウトしました。ルームIDを確認してください。');
          this.destroy();
          reject(err);
        }
      }, 8000);

      this.peer = new Peer(PEER_CONFIG);

      this.peer.on('open', (myId) => {
        this.myPeerId = myId;
        const conn = this.peer!.connect(hostRoomId);

        conn.on('open', () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            this.connections.set('host', conn);
            if (onConnected) onConnected();
            resolve();
          }
        });

        conn.on('data', (data: any) => {
          if (this.onHostMessageCallback) {
            this.onHostMessageCallback(data as HostMessage);
          }
        });

        conn.on('close', () => {
          this.connections.delete('host');
          if (onDisconnected) onDisconnected();
        });

        conn.on('error', (err) => {
          console.error('Client conn error:', err);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            reject(err);
          }
          if (this.onErrorCallback) this.onErrorCallback(err);
        });
      });

      this.peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          reject(err);
        }
        if (this.onErrorCallback) this.onErrorCallback(err);
      });
    });
  }

  // ホストから特定クライアントへ送信
  public sendToClient(clientId: string, msg: HostMessage): void {
    const conn = this.connections.get(clientId);
    if (conn && conn.open) {
      conn.send(msg);
    }
  }

  // クライアントからホストへ送信
  public sendToHost(msg: ClientMessage): void {
    const conn = this.connections.get('host');
    if (conn && conn.open) {
      conn.send(msg);
    }
  }

  public destroy(): void {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
