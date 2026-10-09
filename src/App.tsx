import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { PeerNetworkManager } from './network/peerManager';
import { GameEngine } from './logic/gameEngine';
import type { ClientSyncData, ClientMessage, HostMessage } from './network/protocol';
import { LobbyView } from './components/LobbyView';
import { PlayerBoard } from './components/PlayerBoard';
import { DraftView } from './components/DraftView';
import { ActionView } from './components/ActionView';
import { ActionResolutionView } from './components/ActionResolutionView';
import { GameLogView } from './components/GameLogView';
import type { DraftBid, PlayerAction } from './types/game';
import { ROLE_DEFINITIONS } from './data/roles';
import { CARD_DEFINITIONS } from './data/cards';

export const App: React.FC = () => {
  const [network] = useState(() => new PeerNetworkManager());
  const engineRef = useRef<GameEngine | null>(null);

  const [myId, setMyId] = useState<string>('');
  const myIdRef = useRef<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // 同期されるゲームステート
  const [syncData, setSyncData] = useState<ClientSyncData | null>(null);

  // 最新のコールバック関数を保持するRef（クロージャ問題防止）
  const onEngineUpdateRef = useRef<() => void>(() => {});
  const onClientMessageRef = useRef<(clientId: string, msg: ClientMessage) => void>(() => {});

  // ホストのエンジン状態更新時に全クライアントへ送信
  const handleHostEngineStateUpdate = () => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    const hostId = engine.state.hostId;

    // ホスト自身（自分）用の同期データ
    const hostSync = engine.generateClientSyncData(hostId);
    setSyncData(hostSync);

    // 各クライアントに送信
    for (const player of Object.values(engine.state.players)) {
      if (player.id !== hostId && !player.id.startsWith('bot_')) {
        const clientSync = engine.generateClientSyncData(player.id);
        network.sendToClient(player.id, {
          type: 'SYNC_STATE',
          data: clientSync,
        });
      }
    }

    // もしボット（テストプレイヤー）が存在する場合、フェーズに応じた自動行動を実行
    handleBotActions(engine);
  };

  // ボットの自動行動ハンドラ
  const handleBotActions = (engine: GameEngine) => {
    const bots = Object.values(engine.state.players).filter(p => p.id.startsWith('bot_') && p.isAlive);
    if (bots.length === 0) return;

    if (engine.state.phase === 'ROLE_SELECT') {
      setTimeout(() => {
        const roles = Object.keys(ROLE_DEFINITIONS);
        bots.forEach(b => {
          if (!b.roleId) {
            const randomRole = roles[Math.floor(Math.random() * roles.length)];
            engine.selectRole(b.id, randomRole);
          }
        });
      }, 500);
    } else if (engine.state.phase === 'DRAFT') {
      setTimeout(() => {
        bots.forEach(b => {
          if (!engine.state.draftBids[b.id]) {
            const bids: { [key: string]: number } = {};
            if (engine.state.draftPool.length > 0 && b.g > 0) {
              const targetCard = engine.state.draftPool[Math.floor(Math.random() * engine.state.draftPool.length)];
              const bidAmount = Math.min(b.g, Math.floor(Math.random() * 5) + 1);
              bids[targetCard.instanceId] = bidAmount;
            }
            engine.submitDraftBid({ playerId: b.id, bids, isConfirmed: true });
          }
        });
      }, 800);
    } else if (engine.state.phase === 'ACTION') {
      setTimeout(() => {
        const alivePlayers = Object.values(engine.state.players).filter(p => p.isAlive);
        bots.forEach(b => {
          if (!engine.state.playerActions[b.id]) {
            if (b.hand.length === 0) return;
            const cardInstance = b.hand[Math.floor(Math.random() * b.hand.length)];
            const def = CARD_DEFINITIONS[cardInstance.cardId];

            let targetId: string | null = null;
            if (def && def.targetType === 'SINGLE_ENEMY') {
              const enemies = alivePlayers.filter(p => p.id !== b.id);
              if (enemies.length > 0) {
                targetId = enemies[Math.floor(Math.random() * enemies.length)].id;
              }
            } else {
              targetId = b.id;
            }

            engine.submitAction({
              playerId: b.id,
              cardInstanceId: cardInstance.instanceId,
              targetPlayerId: targetId,
            });
          }
        });
      }, 1000);
    }
  };

  // クライアントからのメッセージ処理（ホスト側）
  const handleClientMessageOnHost = (clientId: string, msg: ClientMessage) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;

    switch (msg.type) {
      case 'JOIN_REQUEST':
        engine.addPlayer(clientId, msg.playerName);
        break;
      case 'SET_NAME':
        engine.renamePlayer(clientId, msg.playerName);
        break;
      case 'SELECT_ROLE':
        engine.selectRole(clientId, msg.roleId);
        break;
      case 'START_GAME':
        // ホストのみ可能
        break;
      case 'SUBMIT_DRAFT_BID':
        engine.submitDraftBid(msg.bid);
        break;
      case 'SUBMIT_ACTION':
        engine.submitAction(msg.action);
        break;
      case 'SKIP_RESOLUTION':
        engine.skipResolution();
        break;
    }
  };

  // ホストからのメッセージ処理（クライアント側）
  const handleHostMessageOnClient = (msg: HostMessage) => {
    if (msg.type === 'SYNC_STATE') {
      setSyncData(msg.data);
    }
  };

  // コールバックRefを毎レンダー最新に保つ
  useEffect(() => {
    onEngineUpdateRef.current = handleHostEngineStateUpdate;
    onClientMessageRef.current = handleClientMessageOnHost;
  });

  // タイトル画面に戻る（接続切断・状態初期化）
  const handleBackToTitle = () => {
    network.destroy();
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
    setMyId('');
    myIdRef.current = '';
    setRoomCode('');
    setIsHost(false);
    setSyncData(null);
    setSelectedRoleId(null);
    setSelectedTargetId(null);
    setIsConnecting(false);
  };

// ルームIDのプレフィックス整形（他のPeerJSアプリとのID衝突を防ぎつつ、入力のゆらぎに対応）
const normalizeRoomCode = (raw: string): string => {
  return raw.trim().toLowerCase().replace(/^cardgame-pvp-/, '').replace(/^room-/, '');
};

const toPeerRoomId = (code: string): string => {
  const normalized = normalizeRoomCode(code);
  return `cardgame-pvp-${normalized}`;
};

  // 1. 部屋作成（ホスト）
  const handleCreateRoom = async (name: string) => {
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      const peerId = toPeerRoomId(code);
      await network.initAsHost(
        peerId,
        undefined,
        (clientId, msg) => {
          onClientMessageRef.current(clientId, msg);
        },
        (_clientId) => {
          // 接続時
        },
        (clientId) => {
          if (engineRef.current) engineRef.current.removePlayer(clientId);
        },
        (err) => console.error(err)
      );

      setMyId(peerId);
      myIdRef.current = peerId;
      setRoomCode(code);
      setIsHost(true);

      const engine = new GameEngine(peerId, peerId, name, () => {
        onEngineUpdateRef.current();
      });
      engineRef.current = engine;
      
      const hostSync = engine.generateClientSyncData(peerId);
      setSyncData(hostSync);
    } catch (e) {
      console.error('ルーム作成エラー:', e);
      alert('ルームの作成に失敗しました。別のIDで再試行してください。');
      handleBackToTitle();
    }
  };

  // 2. 部屋参加（クライアント）
  const handleJoinRoom = async (targetRoomCode: string, name: string) => {
    setIsConnecting(true);
    const normalizedCode = normalizeRoomCode(targetRoomCode);
    const targetPeerId = toPeerRoomId(targetRoomCode);
    try {
      await network.joinRoom(
        targetPeerId,
        handleHostMessageOnClient,
        () => {
          // 接続完了時に参加リクエスト送信
          network.sendToHost({ type: 'JOIN_REQUEST', playerName: name });
        },
        () => {
          alert('ホストから切断されました。');
          handleBackToTitle();
        },
        (err) => {
          console.error(err);
        }
      );

      const clientPeerId = network.getPeerId();
      setMyId(clientPeerId);
      myIdRef.current = clientPeerId;
      setRoomCode(normalizedCode);
      setIsHost(false);
      setIsConnecting(false);
    } catch (e: any) {
      console.error('参加エラー:', e);
      const isUnavailable = e?.type === 'peer-unavailable' || (typeof e?.message === 'string' && e.message.includes('タイムアウト'));
      alert(isUnavailable
        ? '指定されたルームIDが見つかりませんでした。ルームIDを確認してください。'
        : '部屋への参加に失敗しました。ルームIDを確認してください。');
      handleBackToTitle();
    }
  };

  // テスト用ボットプレイヤー追加
  const handleAddTestPlayer = () => {
    if (!isHost || !engineRef.current) return;
    const botNum = Object.keys(engineRef.current.state.players).length;
    const botId = `bot_${Date.now()}_${botNum}`;
    engineRef.current.addPlayer(botId, `CPU-${botNum}`);
  };

  // ゲーム開始
  const handleStartGame = () => {
    if (!isHost || !engineRef.current) return;
    engineRef.current.startRoleSelect();
  };

  // 確実に有効なプレイヤーIDを取得
  const effectiveMyId = myId || syncData?.myId || myIdRef.current || '';

  // 名前変更（ロビー中のみ）
  const handleRename = (newName: string) => {
    if (!newName.trim()) return;
    if (isHost && engineRef.current) {
      engineRef.current.renamePlayer(effectiveMyId, newName.trim());
    } else {
      network.sendToHost({ type: 'SET_NAME', playerName: newName.trim() });
    }
  };

  // ロール選択
  const handleSelectRole = (roleId: string) => {
    setSelectedRoleId(roleId);
    const pid = effectiveMyId;
    if (isHost && engineRef.current) {
      engineRef.current.selectRole(pid, roleId);
    } else {
      network.sendToHost({ type: 'SELECT_ROLE', roleId });
    }
  };

  // ドラフト入札提出
  const handleSubmitBid = (bid: DraftBid) => {
    const correctedBid: DraftBid = {
      ...bid,
      playerId: bid.playerId || effectiveMyId,
    };
    if (isHost && engineRef.current) {
      engineRef.current.submitDraftBid(correctedBid);
    } else {
      network.sendToHost({ type: 'SUBMIT_DRAFT_BID', bid: correctedBid });
    }
  };

  // 行動提出
  const handleSubmitAction = (action: PlayerAction) => {
    const correctedAction: PlayerAction = {
      ...action,
      playerId: action.playerId || effectiveMyId,
    };
    if (isHost && engineRef.current) {
      engineRef.current.submitAction(correctedAction);
    } else {
      network.sendToHost({ type: 'SUBMIT_ACTION', action: correctedAction });
    }
  };

  // 試合の強制終了（ホスト操作）
  const handleForceEndGame = () => {
    if (!isHost || !engineRef.current) return;
    if (window.confirm('本当に試合を強制終了しますか？')) {
      engineRef.current.forceEndGame();
    }
  };

  // 行動解決演出スキップ
  const handleSkipResolution = () => {
    if (isHost && engineRef.current) {
      engineRef.current.skipResolution();
    } else {
      network.sendToHost({ type: 'SKIP_RESOLUTION' });
    }
  };

  // 終了時にクリーンアップ
  useEffect(() => {
    return () => {
      network.destroy();
      if (engineRef.current) engineRef.current.destroy();
    };
  }, [network]);

  const currentPhase = syncData?.phase || 'LOBBY';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* 入室前・ロビー・ロール選択 */}
      {(!syncData || currentPhase === 'LOBBY' || currentPhase === 'ROLE_SELECT') ? (
        <LobbyView
          phase={currentPhase}
          roomCode={roomCode}
          isHost={isHost}
          myId={effectiveMyId}
          players={syncData?.players || {}}
          selectedRoleId={selectedRoleId}
          isConnecting={isConnecting}
          onSelectRole={handleSelectRole}
          onStartGame={handleStartGame}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
          onBackToTitle={handleBackToTitle}
          onAddTestPlayer={handleAddTestPlayer}
          onForceEndGame={handleForceEndGame}
          onRename={handleRename}
        />
      ) : (
        /* メインゲーム画面 */
        <div>
          {/* ヘッダー情報 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '12px 16px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #334155', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span style={{ fontSize: '1.2em', fontWeight: 'bold' }}>第 {syncData.turn} ターン</span>
              <span style={{ marginLeft: '12px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#334155', fontSize: '0.85em' }}>
                フェーズ: {currentPhase === 'DRAFT' ? 'ドラフト' : currentPhase === 'ACTION' ? '行動選択' : currentPhase === 'RESOLVING' ? '行動解決中' : currentPhase === 'ROUND_RESULT' ? '結果確認' : currentPhase}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div>
                ルームID: <b style={{ color: '#38bdf8' }}>{roomCode}</b>
              </div>
              <button
                onClick={() => {
                  if (window.confirm('タイトル画面に戻りますか？')) {
                    handleBackToTitle();
                  }
                }}
                style={{
                  backgroundColor: '#475569',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                タイトルへ戻る
              </button>
              {isHost && (
                <button
                  onClick={handleForceEndGame}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  試合を強制終了
                </button>
              )}
            </div>
          </div>

          {/* 全プレイヤーのステータス盤面 */}
          <PlayerBoard
            players={syncData.players}
            myId={effectiveMyId}
            selectedTargetId={selectedTargetId}
            onSelectTarget={(id) => setSelectedTargetId(id)}
            canSelectTarget={currentPhase === 'ACTION'}
            activeEvent={syncData.activeResolutionEvent}
          />

          {/* ゲーム終了画面 */}
          {currentPhase === 'GAME_OVER' && (
            <div style={{ backgroundColor: '#1e293b', padding: '32px', borderRadius: '8px', textAlign: 'center', marginBottom: '16px', border: '2px solid #eab308' }}>
              <h2 style={{ fontSize: '2em', margin: '0 0 12px 0', color: '#facc15' }}>
                🎉 ゲーム終了！
              </h2>
              <div style={{ fontSize: '1.4em', marginBottom: '16px' }}>
                {syncData.winnerId === 'DRAW' ? (
                  <span style={{ color: '#ef4444' }}>引き分け！ 全員力尽きました！</span>
                ) : syncData.winnerId === 'FORCE_QUIT' ? (
                  <span style={{ color: '#ef4444' }}>⚠️ ホストにより試合が強制終了されました。</span>
                ) : (
                  <span>
                    勝者：<b style={{ color: '#4ade80' }}>{syncData.players[syncData.winnerId!]?.name}</b> の勝利です！
                  </span>
                )}
              </div>
              <button
                onClick={handleBackToTitle}
                style={{ padding: '10px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                タイトルへ戻る
              </button>
            </div>
          )}

          {/* 各フェーズのメイン操作パネル */}
          {currentPhase === 'DRAFT' && (
            <DraftView
              key={`draft-${syncData.turn}`}
              draftPool={syncData.draftPool}
              myG={syncData.myG}
              myId={effectiveMyId}
              roleId={syncData.players[effectiveMyId]?.roleId}
              phaseDeadline={syncData.phaseDeadline}
              onSubmitBid={handleSubmitBid}
              player={syncData.players[effectiveMyId]}
              players={syncData.players}
            />
          )}

          {currentPhase === 'ACTION' && (
            <ActionView
              key={`action-${syncData.turn}`}
              hand={syncData.myHand}
              players={syncData.players}
              myId={effectiveMyId}
              roleId={syncData.players[effectiveMyId]?.roleId}
              phaseDeadline={syncData.phaseDeadline}
              selectedTargetId={selectedTargetId}
              onSelectTarget={(id) => setSelectedTargetId(id)}
              onSubmitAction={handleSubmitAction}
            />
          )}

          {currentPhase === 'RESOLVING' && (
            <ActionResolutionView
              event={syncData.activeResolutionEvent || null}
              players={syncData.players}
              isHost={isHost}
              onSkip={handleSkipResolution}
            />
          )}

          {currentPhase === 'ROUND_RESULT' && (
            <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', textAlign: 'center', marginBottom: '16px', border: '1px solid #334155' }}>
              <h3 style={{ margin: 0, color: '#38bdf8' }}>ターンの行動が終了しました</h3>
              <p style={{ color: '#94a3b8', margin: '8px 0 0 0' }}>下のログを確認してください。間もなく次のドラフトが開始されます...</p>
            </div>
          )}

          {/* バトルログ */}
          <div style={{ marginTop: '16px' }}>
            <GameLogView logs={syncData.logs} />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
