import Peer, { type DataConnection } from 'peerjs';
import type { ClientMessage, HostMessage } from './protocol';
import { generateRoomCode, normalizeRoomCode, toPeerRoomId } from './roomCodeUtils';

// 接続設定：Google, Cloudflare STUN に加え、オープン TURN (Metered OpenRelay) を配備
// これにより Symmetric NAT / モバイル 4G/5G / CGNAT 環境でも確実に接続可能
const PEER_CONFIG: any = {
  debug: 1, // エラーのみコンソール出力
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
      // パブリックTURNサーバー（OpenRelay by Metered）
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelay',
        credential: 'openrelay',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelay',
        credential: 'openrelay',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelay',
        credential: 'openrelay',
      },
    ],
    iceCandidatePoolSize: 10,
  },
};

/**
 * バックグラウンドでのタイマースロットリングを防ぐ高精度ハートビートWorker
 * タブが最小化されたり別アプリに切り替わっても、Worker内のタイマーは抑制されずに動作する
 */
class BackgroundTimer {
  private worker: Worker | null = null;
  private fallbackInterval: any = null;
  private onTick: () => void;

  constructor(onTick: () => void) {
    this.onTick = onTick;
    try {
      const blob = new Blob([`
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => {
              self.postMessage('tick');
            }, 2000);
          } else if (e.data === 'stop') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        };
      `], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      this.worker = new Worker(url);
      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.onTick();
        }
      };
      URL.revokeObjectURL(url);
    } catch {
      this.worker = null;
    }
  }

  public start(): void {
    if (this.worker) {
      this.worker.postMessage('start');
    } else {
      if (this.fallbackInterval) clearInterval(this.fallbackInterval);
      this.fallbackInterval = setInterval(() => this.onTick(), 2000);
    }
  }

  public stop(): void {
    if (this.worker) {
      this.worker.postMessage('stop');
      this.worker.terminate();
      this.worker = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }
}

export interface JoinRoomCallbacks {
  onHostMsg: (msg: HostMessage) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onReconnecting?: (countdownSeconds: number) => void;
  onReconnected?: () => void;
  onError?: (err: any) => void;
}

export class PeerNetworkManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map(); // host: clientId -> conn, client: 'host' -> conn
  private myPeerId: string = '';
  private currentRoomCode: string = '';
  private isHost: boolean = false;
  private isDestroyed: boolean = false;

  // 切断猶予タイマー（ホスト側: clientId -> timeoutId）
  private disconnectGraceTimers: Map<string, any> = new Map();

  // クライアント側: 再接続制御
  private isReconnecting: boolean = false;
  private reconnectIntervalId: any = null;
  private reconnectTimeoutId: any = null;
  private targetHostRoomId: string = '';

  // バックグラウンド・ハートビートタイマー
  private bgTimer: BackgroundTimer | null = null;

  // コールバック
  private onClientMessageCallback?: (clientId: string, msg: ClientMessage) => void;
  private onHostMessageCallback?: (msg: HostMessage) => void;
  private onConnectionOpenCallback?: (id: string) => void;
  private onConnectionCloseCallback?: (id: string) => void;
  private onErrorCallback?: (err: any) => void;
  private clientCallbacks?: JoinRoomCallbacks;

  // イベントリスナーの参照
  private visibilityHandler: () => void;
  private onlineHandler: () => void;

  constructor() {
    this.visibilityHandler = () => this.handleVisibilityChange();
    this.onlineHandler = () => this.handleOnline();

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityHandler);
      window.addEventListener('online', this.onlineHandler);
      window.addEventListener('focus', this.visibilityHandler);
    }
  }

  public getPeerId(): string {
    return this.myPeerId;
  }

  public getRoomCode(): string {
    return this.currentRoomCode;
  }

  public getIsHost(): boolean {
    return this.isHost;
  }

  /**
   * ブラウザタブの可視性変更や復帰時のシグナリングサーバー再接続
   */
  private handleVisibilityChange(): void {
    if (this.isDestroyed || !this.peer) return;

    if (document.visibilityState === 'visible') {
      console.log('[PeerNetwork] Tab visible / focused. Checking connection status...');
      // シグナリングサーバーから切断されていたら再接続
      if (this.peer.disconnected && !this.peer.destroyed) {
        console.log('[PeerNetwork] Reconnecting to PeerServer after background...');
        this.peer.reconnect();
      }

      // クライアント側でホストとの接続が切れている場合は即時再接続チェック
      if (!this.isHost && this.isReconnecting && this.targetHostRoomId) {
        this.attemptClientReconnect();
      }
    }
  }

  private handleOnline(): void {
    if (this.isDestroyed || !this.peer) return;
    console.log('[PeerNetwork] Network online. Checking signaling connection...');
    if (this.peer.disconnected && !this.peer.destroyed) {
      this.peer.reconnect();
    }
  }

  /**
   * バックグラウンドタイマーからの定期ハートビート (2秒間隔)
   */
  private handleBackgroundTick(): void {
    if (this.isDestroyed || !this.peer) return;

    // 1. PeerServer (シグナリング) との接続維持
    if (this.peer.disconnected && !this.peer.destroyed) {
      console.log('[PeerNetwork] Auto-reconnecting disconnected PeerServer...');
      this.peer.reconnect();
    }

    // 2. DataConnection への PING 送信（パケットを流してアイドル切断防止）
    if (this.isHost) {
      for (const conn of this.connections.values()) {
        if (conn && conn.open) {
          try {
            conn.send({ type: 'PING' } as HostMessage);
          } catch {
            // 送信失敗時は close 処理に委ねる
          }
        }
      }
    } else {
      const conn = this.connections.get('host');
      if (conn && conn.open) {
        try {
          conn.send({ type: 'PING' } as ClientMessage);
        } catch {
          // 送信失敗
        }
      }
    }
  }

  /**
   * ホストとして初期化
   * 重複IDエラー（unavailable-id）が発生した場合は自動で新しい6桁IDを生成して最大5回リトライ
   */
  public async initAsHost(
    customRoomCode?: string,
    onReady?: (roomCode: string) => void,
    onClientMsg?: (clientId: string, msg: ClientMessage) => void,
    onClientConnect?: (clientId: string) => void,
    onClientDisconnect?: (clientId: string) => void,
    onError?: (err: any) => void
  ): Promise<string> {
    this.destroy();
    this.isDestroyed = false;
    this.isHost = true;
    this.onClientMessageCallback = onClientMsg;
    this.onConnectionOpenCallback = onClientConnect;
    this.onConnectionCloseCallback = onClientDisconnect;
    this.onErrorCallback = onError;

    // バックグラウンドタイマー開始
    this.bgTimer = new BackgroundTimer(() => this.handleBackgroundTick());
    this.bgTimer.start();

    const maxRetries = 5;
    let attempt = 0;
    let chosenCode = customRoomCode ? normalizeRoomCode(customRoomCode) : '';

    while (attempt < maxRetries) {
      attempt++;
      const roomCode = chosenCode || generateRoomCode();
      const peerId = toPeerRoomId(roomCode);

      try {
        await this.createHostPeer(peerId, roomCode);
        this.currentRoomCode = roomCode;
        if (onReady) onReady(roomCode);
        return roomCode;
      } catch (err: any) {
        console.warn(`[PeerNetwork] Host init attempt ${attempt} failed with ID ${roomCode}:`, err);
        // IDが既に使用中（unavailable-id）の場合は別IDで再試行
        if (err?.type === 'unavailable-id' || err?.message?.includes('taken') || err?.message?.includes('unavailable')) {
          chosenCode = ''; // 次回は完全ランダム生成
          continue;
        }
        // その他のエラーは中断
        throw err;
      }
    }

    throw new Error('部屋の作成に失敗しました。空いているルームIDが見つかりませんでした。');
  }

  private createHostPeer(peerId: string, roomCode: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const peer = new Peer(peerId, PEER_CONFIG);
      this.peer = peer;

      peer.on('open', (id) => {
        if (!settled) {
          settled = true;
          this.myPeerId = id;
          this.currentRoomCode = roomCode;
          resolve(roomCode);
        }
      });

      // シグナリングサーバー切断時の自動再接続
      peer.on('disconnected', (currentId) => {
        console.warn(`[PeerNetwork] Host Peer disconnected from signaling server (ID: ${currentId}). Reconnecting...`);
        if (!this.isDestroyed && this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      });

      peer.on('connection', (conn) => {
        this.setupHostConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('[PeerNetwork] Host Peer error:', err);
        if (!settled) {
          settled = true;
          reject(err);
        }
        if (this.onErrorCallback) this.onErrorCallback(err);
      });

      // 12秒タイムアウト
      setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error('ホストの作成がタイムアウトしました。ネット接続を確認してください。'));
        }
      }, 12000);
    });
  }

  private setupHostConnection(conn: DataConnection): void {
    const clientId = conn.peer;

    conn.on('open', () => {
      console.log(`[PeerNetwork] Client connected: ${clientId}`);
      // 既存の切断猶予タイマーがあればキャンセル
      if (this.disconnectGraceTimers.has(clientId)) {
        clearTimeout(this.disconnectGraceTimers.get(clientId));
        this.disconnectGraceTimers.delete(clientId);
        console.log(`[PeerNetwork] Client ${clientId} reconnected within grace period!`);
      }

      this.connections.set(clientId, conn);
      if (this.onConnectionOpenCallback) {
        this.onConnectionOpenCallback(clientId);
      }
    });

    conn.on('data', (data: any) => {
      const msg = data as ClientMessage;
      if (msg && msg.type === 'PING') {
        // PING応答
        if (conn.open) {
          conn.send({ type: 'PONG' } as HostMessage);
        }
        return;
      }
      if (msg && msg.type === 'PONG') {
        return;
      }

      // クライアントからの再接続リクエスト
      if (msg && msg.type === 'RECONNECT') {
        console.log(`[PeerNetwork] Received RECONNECT from client ${clientId}`);
        if (conn.open) {
          conn.send({ type: 'RECONNECT_ACK' } as HostMessage);
        }
      }

      if (this.onClientMessageCallback) {
        this.onClientMessageCallback(clientId, msg);
      }
    });

    conn.on('close', () => {
      console.warn(`[PeerNetwork] Client connection closed: ${clientId}. Starting 15s grace period...`);
      this.connections.delete(clientId);

      // 即座にゲームから削除せず、15秒の切断猶予タイマーを開始
      if (this.disconnectGraceTimers.has(clientId)) {
        clearTimeout(this.disconnectGraceTimers.get(clientId));
      }

      const timerId = setTimeout(() => {
        this.disconnectGraceTimers.delete(clientId);
        console.log(`[PeerNetwork] Grace period expired for client ${clientId}. Removing player.`);
        if (this.onConnectionCloseCallback) {
          this.onConnectionCloseCallback(clientId);
        }
      }, 15000);

      this.disconnectGraceTimers.set(clientId, timerId);
    });

    conn.on('error', (err) => {
      console.error(`[PeerNetwork] Client connection error (${clientId}):`, err);
    });
  }

  /**
   * クライアントとして参加
   * タイムアウト20秒 + 自動再試行 + 切断時の自動再接続待機モード
   */
  public async joinRoom(
    targetRoomCode: string,
    callbacks: JoinRoomCallbacks
  ): Promise<void> {
    this.destroy();
    this.isDestroyed = false;
    this.isHost = false;
    this.clientCallbacks = callbacks;
    this.onHostMessageCallback = callbacks.onHostMsg;
    this.onErrorCallback = callbacks.onError;

    const normalizedCode = normalizeRoomCode(targetRoomCode);
    const hostPeerId = toPeerRoomId(normalizedCode);
    this.targetHostRoomId = hostPeerId;
    this.currentRoomCode = normalizedCode;

    // バックグラウンドタイマー開始
    this.bgTimer = new BackgroundTimer(() => this.handleBackgroundTick());
    this.bgTimer.start();

    // 接続試行（最大2回）
    let lastError: any = null;
    for (let tryCount = 1; tryCount <= 2; tryCount++) {
      try {
        console.log(`[PeerNetwork] Connecting to room ${normalizedCode} (attempt ${tryCount}/2)...`);
        await this.connectToHostOnce(hostPeerId, 20000);
        return; // 接続成功
      } catch (err: any) {
        lastError = err;
        console.warn(`[PeerNetwork] Join attempt ${tryCount} failed:`, err);
        if (tryCount < 2) {
          // ホストが一時的にバックグラウンド等の可能性があるため1.5秒待って再試行
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    this.destroy();
    throw lastError || new Error('部屋への接続に失敗しました。');
  }

  private connectToHostOnce(hostPeerId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let isSettled = false;

      const timeoutId = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          const err = new Error('接続がタイムアウトしました。ルームIDが合っているか確認してください。');
          reject(err);
        }
      }, timeoutMs);

      // 新しいクライアントPeer
      const peer = new Peer(PEER_CONFIG);
      this.peer = peer;

      peer.on('open', (myId) => {
        this.myPeerId = myId;
        console.log(`[PeerNetwork] Client Peer opened with ID: ${myId}`);

        // reliable: true で接続
        const conn = peer.connect(hostPeerId, {
          reliable: true,
        });

        conn.on('open', () => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            this.connections.set('host', conn);
            this.setupClientConnection(conn);
            if (this.clientCallbacks?.onConnected) {
              this.clientCallbacks.onConnected();
            }
            resolve();
          }
        });

        conn.on('error', (err) => {
          console.error('[PeerNetwork] Connection error to host:', err);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            reject(err);
          }
        });
      });

      peer.on('disconnected', () => {
        console.warn('[PeerNetwork] Client Peer disconnected from signaling server. Reconnecting...');
        if (!this.isDestroyed && this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      });

      peer.on('error', (err) => {
        console.error('[PeerNetwork] Client Peer error:', err);
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timeoutId);
          reject(err);
        }
      });
    });
  }

  private setupClientConnection(conn: DataConnection): void {
    conn.on('data', (data: any) => {
      const msg = data as HostMessage;
      if (msg && msg.type === 'PING') {
        if (conn.open) {
          conn.send({ type: 'PONG' } as ClientMessage);
        }
        return;
      }
      if (msg && msg.type === 'PONG') {
        return;
      }

      if (msg && msg.type === 'RECONNECT_ACK') {
        console.log('[PeerNetwork] Reconnect ACK received from host!');
        this.handleClientReconnectSuccess();
      }

      if (this.onHostMessageCallback) {
        this.onHostMessageCallback(msg);
      }
    });

    conn.on('close', () => {
      console.warn('[PeerNetwork] Host connection closed. Entering reconnecting mode...');
      this.connections.delete('host');
      this.handleHostDisconnected();
    });

    conn.on('error', (err) => {
      console.error('[PeerNetwork] Client data connection error:', err);
    });
  }

  /**
   * ホストが一時的に切断された時の再接続モード（15秒猶予）
   */
  private handleHostDisconnected(): void {
    if (this.isDestroyed || this.isReconnecting) return;
    this.isReconnecting = true;

    let countdown = 15;
    if (this.clientCallbacks?.onReconnecting) {
      this.clientCallbacks.onReconnecting(countdown);
    }

    // カウントダウンタイマー
    this.reconnectTimeoutId = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        this.clearReconnectMode();
        console.warn('[PeerNetwork] Reconnect to host timed out after 15s.');
        if (this.clientCallbacks?.onDisconnected) {
          this.clientCallbacks.onDisconnected();
        }
      } else {
        if (this.clientCallbacks?.onReconnecting) {
          this.clientCallbacks.onReconnecting(countdown);
        }
      }
    }, 1000);

    // 2.5秒おきにホストへ再接続試行
    this.reconnectIntervalId = setInterval(() => {
      this.attemptClientReconnect();
    }, 2500);

    // 即時初回試行
    this.attemptClientReconnect();
  }

  private attemptClientReconnect(): void {
    if (!this.peer || this.peer.destroyed || !this.targetHostRoomId || !this.isReconnecting) return;

    if (this.peer.disconnected) {
      this.peer.reconnect();
    }

    console.log('[PeerNetwork] Attempting reconnect to host...');
    try {
      const conn = this.peer.connect(this.targetHostRoomId, { reliable: true });

      conn.on('open', () => {
        console.log('[PeerNetwork] Reconnect to host succeeded!');
        this.connections.set('host', conn);
        this.setupClientConnection(conn);

        // ホストに再接続メッセージを送信
        conn.send({
          type: 'RECONNECT',
          playerId: this.myPeerId,
        } as ClientMessage);

        this.handleClientReconnectSuccess();
      });

      conn.on('error', (err) => {
        console.warn('[PeerNetwork] Reconnect attempt failed:', err);
      });
    } catch (e) {
      console.warn('[PeerNetwork] Exception during reconnect attempt:', e);
    }
  }

  private handleClientReconnectSuccess(): void {
    this.clearReconnectMode();
    if (this.clientCallbacks?.onReconnected) {
      this.clientCallbacks.onReconnected();
    }
  }

  private clearReconnectMode(): void {
    this.isReconnecting = false;
    if (this.reconnectTimeoutId) {
      clearInterval(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }
    if (this.reconnectIntervalId) {
      clearInterval(this.reconnectIntervalId);
      this.reconnectIntervalId = null;
    }
  }

  // ホストから特定クライアントへ送信
  public sendToClient(clientId: string, msg: HostMessage): void {
    const conn = this.connections.get(clientId);
    if (conn && conn.open) {
      try {
        conn.send(msg);
      } catch (e) {
        console.warn(`[PeerNetwork] Failed to send to client ${clientId}:`, e);
      }
    }
  }

  // クライアントからホストへ送信
  public sendToHost(msg: ClientMessage): void {
    const conn = this.connections.get('host');
    if (conn && conn.open) {
      try {
        conn.send(msg);
      } catch (e) {
        console.warn('[PeerNetwork] Failed to send to host:', e);
      }
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.clearReconnectMode();

    if (this.bgTimer) {
      this.bgTimer.stop();
      this.bgTimer = null;
    }

    for (const timerId of this.disconnectGraceTimers.values()) {
      clearTimeout(timerId);
    }
    this.disconnectGraceTimers.clear();

    for (const conn of this.connections.values()) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    this.connections.clear();

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }

    this.myPeerId = '';
    this.currentRoomCode = '';
  }
}
