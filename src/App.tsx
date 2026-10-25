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
import { GoldDistributionView } from './components/GoldDistributionView';
import { DraftResolutionView } from './components/DraftResolutionView';
import { HandDock } from './components/HandDock';
import { GameMenuModal } from './components/GameMenuModal';
import type { DraftBid, PlayerAction } from './types/game';
import { ROLE_DEFINITIONS } from './data/roles';
import { CARD_DEFINITIONS } from './data/cards';
import { clampPlayerName } from './utils/nameValidator';
import { normalizeRoomCode } from './network/roomCodeUtils';

export const App: React.FC = () => {
  const [network] = useState(() => new PeerNetworkManager());
  const engineRef = useRef<GameEngine | null>(null);

  const [myId, setMyId] = useState<string>('');
  const myIdRef = useRef<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedCardInstanceId, setSelectedCardInstanceId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [reconnectingCountdown, setReconnectingCountdown] = useState<number | null>(null);

  // メニューモーダルおよび未読ログ管理
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [menuTab, setMenuTab] = useState<'MENU' | 'LOG' | 'RULE'>('MENU');
  const [lastReadLogCount, setLastReadLogCount] = useState<number>(0);

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
        if (!engine.state.players[clientId]) {
          engine.addPlayer(clientId, msg.playerName);
        } else {
          // 既存プレイヤー（一時切断からの復帰など）に即座に同期データを送る
          const clientSync = engine.generateClientSyncData(clientId);
          network.sendToClient(clientId, {
            type: 'SYNC_STATE',
            data: clientSync,
          });
        }
        break;
      case 'RECONNECT':
        // 再接続リクエスト受信時に即座に最新ステートを同期
        {
          const clientSync = engine.generateClientSyncData(clientId);
          network.sendToClient(clientId, {
            type: 'SYNC_STATE',
            data: clientSync,
          });
        }
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
    setSelectedCardInstanceId(null);
    setIsConnecting(false);
    setReconnectingCountdown(null);
    setIsMenuOpen(false);
  };

  // 1. 部屋作成（ホスト）
  const handleCreateRoom = async (name: string) => {
    const safeName = clampPlayerName(name);
    try {
      // 重複エラーが発生しても network.initAsHost 内で自動リトライされ、確定した6桁コードが返る
      const assignedRoomCode = await network.initAsHost(
        undefined,
        undefined,
        (clientId, msg) => {
          onClientMessageRef.current(clientId, msg);
        },
        (clientId) => {
          // クライアント接続・復帰時: 最新の同期データを即座に送信
          if (engineRef.current) {
            const clientSync = engineRef.current.generateClientSyncData(clientId);
            network.sendToClient(clientId, {
              type: 'SYNC_STATE',
              data: clientSync,
            });
          }
        },
        (clientId) => {
          // 15秒の猶予期間後に本当に切断された場合のみ削除
          if (engineRef.current) engineRef.current.removePlayer(clientId);
        },
        (err) => console.error('[Host error]', err)
      );

      const peerId = network.getPeerId();
      setMyId(peerId);
      myIdRef.current = peerId;
      setRoomCode(assignedRoomCode);
      setIsHost(true);

      const engine = new GameEngine(assignedRoomCode, peerId, safeName, () => {
        onEngineUpdateRef.current();
      });
      engineRef.current = engine;
      
      const hostSync = engine.generateClientSyncData(peerId);
      setSyncData(hostSync);
    } catch (e: any) {
      console.error('ルーム作成エラー:', e);
      alert('ルームの作成に失敗しました。時間をおいて再試行してください。');
      handleBackToTitle();
    }
  };

  // 2. 部屋参加（クライアント）
  const handleJoinRoom = async (targetRoomCode: string, name: string) => {
    const safeName = clampPlayerName(name);
    setIsConnecting(true);
    const normalizedCode = normalizeRoomCode(targetRoomCode);

    try {
      await network.joinRoom(targetRoomCode, {
        onHostMsg: handleHostMessageOnClient,
        onConnected: () => {
          // 接続完了時に参加リクエスト送信
          network.sendToHost({ type: 'JOIN_REQUEST', playerName: safeName });
        },
        onDisconnected: () => {
          alert('ホストとの接続が切断されました。タイトル画面に戻ります。');
          handleBackToTitle();
        },
        onReconnecting: (countdownSeconds) => {
          setReconnectingCountdown(countdownSeconds);
        },
        onReconnected: () => {
          setReconnectingCountdown(null);
          // 復帰時に念のため再参加/同期リクエストを送信
          network.sendToHost({ type: 'RECONNECT', playerId: network.getPeerId() });
        },
        onError: (err) => {
          console.error('[Client network error]', err);
        },
      });

      const clientPeerId = network.getPeerId();
      setMyId(clientPeerId);
      myIdRef.current = clientPeerId;
      setRoomCode(normalizedCode);
      setIsHost(false);
      setIsConnecting(false);
    } catch (e: any) {
      console.error('参加エラー:', e);
      const msg = typeof e?.message === 'string' ? e.message : '';
      const isUnavailable = e?.type === 'peer-unavailable' || msg.includes('タイムアウト') || msg.includes('見つかりません');
      alert(isUnavailable
        ? '指定されたルームIDが見つかりませんでした。番号が正しいか、ホストが部屋を開いているか確認してください。'
        : '部屋への参加に失敗しました。通信環境を確認のうえ再試行してください。');
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
    const safeName = clampPlayerName(newName);
    if (!safeName) return;
    if (isHost && engineRef.current) {
      engineRef.current.renamePlayer(effectiveMyId, safeName);
    } else {
      network.sendToHost({ type: 'SET_NAME', playerName: safeName });
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
    setSelectedCardInstanceId(null);
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

  // 行動選択フェーズ以外の時は選択中カードをリセット
  useEffect(() => {
    if (currentPhase !== 'ACTION') {
      setSelectedCardInstanceId(null);
    }
  }, [currentPhase]);

  // ログ閲覧ハンドラ
  const totalLogs = syncData?.logs.length || 0;
  const hasUnreadLogs = totalLogs > lastReadLogCount;

  const handleOpenLogs = () => {
    setMenuTab('LOG');
    setIsMenuOpen(true);
    setLastReadLogCount(totalLogs);
  };

  const handleOpenMenu = () => {
    setMenuTab('MENU');
    setIsMenuOpen(true);
  };

  return (
    <>
      {/* ホスト一時切断時の再接続待機オーバーレイ */}
      {reconnectingCountdown !== null && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px',
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '2px solid #eab308',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{ fontSize: '2.4em', marginBottom: '12px' }}>🔄</div>
            <h3 style={{ margin: '0 0 10px 0', color: '#facc15', fontSize: '1.25em' }}>
              ホストとの接続を再確立中...
            </h3>
            <p style={{ color: '#cbd5e1', fontSize: '0.9em', lineHeight: '1.6', margin: '0 0 16px 0' }}>
              ホストが別アプリを開いているか、通信環境が一時的に不安定です。<br />
              自動で再接続を試行しています。このままお待ちください...
            </p>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              padding: '8px 18px',
              borderRadius: '20px',
              color: '#38bdf8',
              fontWeight: 'bold',
              fontSize: '1em',
              marginBottom: '20px',
            }}>
              残り時間: {reconnectingCountdown} 秒
            </div>
            <div>
              <button
                onClick={handleBackToTitle}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#475569',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                }}
              >
                待機をやめてタイトルに戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 入室前・ロビー・ロール選択 */}
      {(!syncData || currentPhase === 'LOBBY' || currentPhase === 'ROLE_SELECT') ? (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '16px', color: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
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
        </div>
      ) : (
        /* メインゲーム画面（1画面収まりレイアウト） */
        <div className="game-viewport">
          {/* ヘッダー情報（コンパクト・固定） */}
          <div className="game-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.05em', fontWeight: 'bold' }}>第{syncData.turn}T</span>
              <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#1e293b', border: '1px solid #334155', fontSize: '0.8em', color: '#38bdf8', fontWeight: 'bold' }}>
                {currentPhase === 'GOLD_DISTRIBUTION' ? '給与' : currentPhase === 'DRAFT' ? 'ドラフト' : currentPhase === 'RESOLVING_DRAFT' ? 'ドラフト結果' : currentPhase === 'ACTION' ? '行動選択' : currentPhase === 'RESOLVING' ? '行動解決中' : currentPhase === 'ROUND_RESULT' ? '結果確認' : currentPhase}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8em', color: '#94a3b8' }}>
                ID:<b style={{ color: '#38bdf8' }}>{roomCode}</b>
              </span>

              {/* クイックログボタン */}
              <button
                onClick={handleOpenLogs}
                style={{
                  position: 'relative',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.8em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>📜 ログ</span>
                {hasUnreadLogs && (
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: '#ef4444',
                      display: 'inline-block',
                    }}
                  />
                )}
              </button>

              {/* ハンバーガーメニューボタン */}
              <button
                onClick={handleOpenMenu}
                aria-label="メニューを開く"
                style={{
                  backgroundColor: '#334155',
                  border: '1px solid #475569',
                  color: '#fff',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '1em',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ☰
              </button>
            </div>
          </div>

          {/* 全プレイヤーのステータス盤面（固定） */}
          <div style={{ padding: '6px 12px 0 12px', flexShrink: 0 }}>
            <PlayerBoard
              players={syncData.players}
              myId={effectiveMyId}
              selectedTargetId={selectedTargetId}
              onSelectTarget={(id) => setSelectedTargetId(id)}
              canSelectTarget={currentPhase === 'ACTION'}
              activeEvent={syncData.activeResolutionEvent}
              activeGoldEvent={syncData.activeGoldEvent}
              activeDraftEvent={syncData.activeDraftEvent}
            />
          </div>

          {/* 各フェーズのメイン操作パネル（中央スクロールエリア） */}
          <div className="game-main-content">
            {/* ゲーム終了画面 */}
            {currentPhase === 'GAME_OVER' && (
              <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', textAlign: 'center', marginBottom: '16px', border: '2px solid #eab308' }}>
                <h2 style={{ fontSize: '1.8em', margin: '0 0 12px 0', color: '#facc15' }}>
                  ゲーム終了！
                </h2>
                <div style={{ fontSize: '1.2em', marginBottom: '16px' }}>
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

            {currentPhase === 'GOLD_DISTRIBUTION' && (
              <GoldDistributionView
                event={syncData.activeGoldEvent || null}
                isHost={isHost}
                onSkip={handleSkipResolution}
              />
            )}

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

            {currentPhase === 'RESOLVING_DRAFT' && (
              <DraftResolutionView
                event={syncData.activeDraftEvent || null}
                isHost={isHost}
                onSkip={handleSkipResolution}
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
                selectedCardInstanceId={selectedCardInstanceId}
                onSelectCard={(id) => setSelectedCardInstanceId(id)}
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
              <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', textAlign: 'center', marginBottom: '16px', border: '1px solid #334155' }}>
                <h3 style={{ margin: '0 0 6px 0', color: '#38bdf8' }}>ターンの行動が終了しました</h3>
                <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85em' }}>
                  右上の【📜 ログ】または【☰ メニュー】からバトルの詳細を確認できます。間もなく次のドラフトが開始されます...
                </p>
              </div>
            )}
          </div>

          {/* 常設手札ドック（画面最下部固定・クリックで詳細確認） */}
          <HandDock
            hand={syncData.myHand || []}
            selectedCardInstanceId={selectedCardInstanceId}
            onSelectCard={(id) => setSelectedCardInstanceId(id)}
            isActionPhase={currentPhase === 'ACTION'}
            player={syncData.players[effectiveMyId]}
          />

          {/* ハンバーガーメニューモーダル（バトルログ、ルール説明、タイトル戻り） */}
          <GameMenuModal
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            logs={syncData.logs}
            myId={effectiveMyId}
            isHost={isHost}
            onBackToTitle={handleBackToTitle}
            onForceEndGame={handleForceEndGame}
            roomCode={roomCode}
            initialTab={menuTab}
          />
        </div>
      )}
    </>
  );
};

export default App;
