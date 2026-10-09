import React, { useState } from 'react';
import type { PublicPlayerInfo, GamePhase } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { CARD_DEFINITIONS, formatCardDescription } from '../data/cards';

interface Props {
  phase: GamePhase;
  roomCode: string;
  isHost: boolean;
  myId: string;
  players: { [id: string]: PublicPlayerInfo };
  selectedRoleId: string | null;
  isConnecting?: boolean;
  onSelectRole: (roleId: string) => void;
  onStartGame: () => void;
  onJoinRoom: (roomCode: string, name: string) => void;
  onCreateRoom: (name: string) => void;
  onBackToTitle?: () => void;
  onAddTestPlayer?: () => void;
  onForceEndGame?: () => void;
  onRename?: (name: string) => void;
}

export const LobbyView: React.FC<Props> = ({
  phase,
  roomCode,
  isHost,
  myId,
  players,
  selectedRoleId,
  isConnecting = false,
  onSelectRole,
  onStartGame,
  onJoinRoom,
  onCreateRoom,
  onBackToTitle,
  onAddTestPlayer,
  onForceEndGame,
  onRename,
}) => {
  const [inputName, setInputName] = useState<string>('');
  const [inputRoomCode, setInputRoomCode] = useState<string>('');
  const [copyNotice, setCopyNotice] = useState<string>('');
  const [lobbyName, setLobbyName] = useState<string>('');
  const [renameNotice, setRenameNotice] = useState<string>('');

  // URLパラメータ（?room=XXXX）があれば自動セット
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setInputRoomCode(roomParam.trim());
      }
    }
  }, []);

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopyNotice(`${label}をコピーしました！`);
        setTimeout(() => setCopyNotice(''), 2500);
      }).catch(() => {
        alert(`${label}: ${text}`);
      });
    } else {
      alert(`${label}: ${text}`);
    }
  };

  const getInviteUrl = () => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  };

  // 接続中画面
  if (isConnecting) {
    return (
      <div style={{ maxWidth: '480px', margin: '40px auto', backgroundColor: '#1e293b', padding: '32px 24px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.3em' }}>🔄 ルームに接続中...</h3>
        <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '0.95em', lineHeight: '1.6' }}>
          ルーム「<b style={{ color: '#38bdf8' }}>{inputRoomCode}</b>」を探しています。<br />
          接続が完了するまでお待ちください...
        </p>
        {onBackToTitle && (
          <button
            onClick={onBackToTitle}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              backgroundColor: '#475569',
              color: '#fff',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.9em',
            }}
          >
            ← タイトル画面に戻る
          </button>
        )}
      </div>
    );
  }

  // 1. 最初に入室前（ルーム作成 or 参加）
  if (!roomCode) {
    return (
      <div style={{ maxWidth: '520px', margin: '40px auto', backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', border: '1px solid #334155' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '12px' }}>⚔️ ターン制カードバトル</h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.88em', marginTop: 0, marginBottom: '20px' }}>
          ブラウザ同士で直接通信するオンラインPvPカードゲーム
        </p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.9em', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold' }}>
            あなたのプレイヤー名:
          </label>
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="名前を入力"
            style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '1em' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button
            onClick={() => {
              if (!inputName.trim()) return alert('名前を入力してください');
              onCreateRoom(inputName.trim());
            }}
            style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1em' }}
          >
            🏠 新しい部屋を作成（ホストになる）
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85em' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
            <span>または友達の部屋に参加</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#334155' }} />
          </div>

          <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #334155' }}>
            <label style={{ display: 'block', fontSize: '0.85em', color: '#94a3b8', marginBottom: '6px' }}>
              招待されたルームID（4桁の数字など）:
            </label>
            <input
              type="text"
              placeholder="例: 4821"
              value={inputRoomCode}
              onChange={(e) => setInputRoomCode(e.target.value)}
              style={{ width: '100%', padding: '10px', boxSizing: 'border-box', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#1e293b', color: '#fff', marginBottom: '10px', fontSize: '1em' }}
            />
            <button
              onClick={() => {
                if (!inputName.trim()) return alert('名前を入力してください');
                if (!inputRoomCode.trim()) return alert('ルームIDを入力してください');
                onJoinRoom(inputRoomCode.trim(), inputName.trim());
              }}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#059669', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.95em' }}
            >
              🚪 部屋に参加する
            </button>
          </div>
        </div>

        {/* 初心者向け手順ガイド */}
        <div style={{ marginTop: '20px', padding: '12px 14px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #1e3a8a', fontSize: '0.82em', color: '#94a3b8', lineHeight: '1.6' }}>
          <b style={{ color: '#60a5fa', display: 'block', marginBottom: '4px' }}>💡 オンライン対戦の手順:</b>
          1. 1人目のプレイヤーが「新しい部屋を作成」を押します<br />
          2. 待機室に表示される「招待URLをコピー」を友達にLINEやDiscordで送ります<br />
          3. 友達がそのURLを開いて「部屋に参加する」を押せばマッチング完了です！
        </div>
      </div>
    );
  }

  // 2. ロビー待機中
  if (phase === 'LOBBY') {
    return (
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0 }}>ルーム待機室</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.95em', color: '#94a3b8' }}>
                ルームID: <b style={{ color: '#38bdf8', fontSize: '1.25em', letterSpacing: '1px' }}>{roomCode}</b>
              </span>
              <button
                onClick={() => handleCopy(roomCode, 'ルームID')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: '#334155',
                  color: '#f8fafc',
                  border: '1px solid #475569',
                  fontSize: '0.8em',
                  cursor: 'pointer',
                }}
              >
                📋 IDをコピー
              </button>
              <button
                onClick={() => handleCopy(getInviteUrl(), '招待URL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  fontSize: '0.8em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🔗 招待リンクをコピー
              </button>
            </div>
            {copyNotice && (
              <div style={{ marginTop: '4px', color: '#4ade80', fontSize: '0.85em', fontWeight: 'bold' }}>
                ✓ {copyNotice}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onBackToTitle && (
              <button
                onClick={onBackToTitle}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#475569',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85em',
                }}
              >
                ← タイトル画面に戻る
              </button>
            )}
            {isHost && (
              <>
                {onAddTestPlayer && (
                  <button
                    onClick={onAddTestPlayer}
                    style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: '#334155', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85em' }}
                  >
                    ＋ テスト用プレイヤー追加
                  </button>
                )}
                <button
                  onClick={onStartGame}
                  style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                  ゲームを開始する 🚀
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <h3>参加者一覧 ({Object.keys(players).length}人)</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {Object.values(players).map(p => (
              <div key={p.id} style={{ padding: '8px 16px', backgroundColor: '#0f172a', borderRadius: '6px', border: p.id === myId ? '1px solid #3b82f6' : '1px solid #334155' }}>
                {p.name} {p.isHost && '👑'} {p.id === myId && '(自分)'}
              </div>
            ))}
          </div>
        </div>

        {/* 名前変更フォーム（ロビー待機中は全員使用可） */}
        {myId && onRename && (
          <div style={{ marginTop: '20px', backgroundColor: '#0f172a', padding: '16px', borderRadius: '6px', border: '1px solid #334155' }}>
            <label style={{ display: 'block', fontSize: '0.9em', color: '#cbd5e1', marginBottom: '6px', fontWeight: 'bold' }}>
              ✏️ プレイヤー名を変更:
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && lobbyName.trim()) {
                    onRename(lobbyName.trim());
                    setRenameNotice('名前を変更しました！');
                    setTimeout(() => setRenameNotice(''), 2500);
                  }
                }}
                placeholder={players[myId]?.name || '新しい名前を入力'}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', backgroundColor: '#1e293b', color: '#fff', fontSize: '0.95em' }}
              />
              <button
                onClick={() => {
                  if (!lobbyName.trim()) return;
                  onRename(lobbyName.trim());
                  setRenameNotice('名前を変更しました！');
                  setTimeout(() => setRenameNotice(''), 2500);
                }}
                style={{ padding: '8px 16px', borderRadius: '6px', backgroundColor: '#7c3aed', color: '#fff', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '0.9em', whiteSpace: 'nowrap' }}
              >
                変更する
              </button>
            </div>
            {renameNotice && (
              <div style={{ marginTop: '6px', color: '#4ade80', fontSize: '0.85em', fontWeight: 'bold' }}>
                ✓ {renameNotice}
              </div>
            )}
          </div>
        )}

        {!isHost && (
          <div style={{ marginTop: '16px', color: '#94a3b8', textAlign: 'center' }}>
            ホストがゲームを開始するのをお待ちください...
          </div>
        )}
      </div>
    );
  }

  // 3. ロール選択画面
  if (phase === 'ROLE_SELECT') {
    return (
      <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '8px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0 }}>🎭 ロール選択</h2>
            <div style={{ fontSize: '0.9em', color: '#94a3b8' }}>
              好きなロールを選択してください（ロールの重複は可能です）。全員が選択するとゲームが始まります。
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onBackToTitle && (
              <button
                onClick={onBackToTitle}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#475569',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                }}
              >
                ← タイトル画面に戻る
              </button>
            )}
            {isHost && onForceEndGame && (
              <button
                onClick={onForceEndGame}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
          {Object.values(ROLE_DEFINITIONS).map(role => {
            const isSelected = selectedRoleId === role.id;
            const uniqueA = CARD_DEFINITIONS[role.uniqueCardAId];
            const uniqueB = CARD_DEFINITIONS[role.uniqueCardBId];

            return (
              <div
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                style={{
                  backgroundColor: isSelected ? '#1e3a8a' : '#0f172a',
                  border: isSelected ? '2px solid #3b82f6' : '1px solid #334155',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <b style={{ fontSize: '1.1em', color: isSelected ? '#60a5fa' : '#fff' }}>{role.name}</b>
                  {isSelected && <span style={{ color: '#4ade80', fontSize: '0.85em', fontWeight: 'bold' }}>✓ 選択中</span>}
                </div>

                <div style={{ fontSize: '0.8em', backgroundColor: '#1e293b', padding: '4px 6px', borderRadius: '4px', marginBottom: '8px' }}>
                  HP:{role.initialStats.hp} ATK:{role.initialStats.atk} DEF:{role.initialStats.def} MAT:{role.initialStats.mat} MDF:{role.initialStats.mdf} SPD:{role.initialStats.spd}
                </div>

                <div style={{ fontSize: '0.8em', color: '#fbbf24', marginBottom: '6px' }}>
                  <b>特性【{role.passiveName}】</b>: {role.passiveDescription}
                </div>

                <div style={{ fontSize: '0.75em', color: '#94a3b8', borderTop: '1px solid #334155', paddingTop: '6px' }}>
                  <div><b>{uniqueA?.name}</b>: {formatCardDescription(uniqueA?.description, { ...role.initialStats, maxHp: role.initialStats.hp })}</div>
                  <div style={{ marginTop: '3px' }}><b>{uniqueB?.name}</b>: {formatCardDescription(uniqueB?.description, { ...role.initialStats, maxHp: role.initialStats.hp })}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};
