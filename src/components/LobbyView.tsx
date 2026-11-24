import React, { useState } from 'react';
import type { PublicPlayerInfo, GamePhase } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { CARD_DEFINITIONS, formatCardDescription } from '../data/cards';
import { validatePlayerName, getNameCharLimitInfo } from '../utils/nameValidator';
import { normalizeRoomCode } from '../network/roomCodeUtils';

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
        setInputRoomCode(normalizeRoomCode(roomParam));
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
      <div style={{
        maxWidth: '520px',
        margin: '50px auto',
        backgroundColor: '#1C1915',
        border: '3px double #4A4234',
        padding: '36px 28px',
        textAlign: 'center',
        boxShadow: '4px 4px 0 #000',
      }}>
        <div style={{
          display: 'inline-block',
          border: '1px solid #B9975B',
          padding: '2px 10px',
          color: '#B9975B',
          fontSize: '0.75em',
          letterSpacing: '0.15em',
          marginBottom: '16px',
          fontFamily: '"IBM Plex Mono", monospace',
        }}>
          COMMUNICATION IN PROGRESS
        </div>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '1.4em',
          fontFamily: '"Shippori Mincho B1", serif',
          color: '#E9DFC8',
          letterSpacing: '-0.02em',
        }}>
          ルームに接続中...
        </h3>
        <p style={{
          color: '#A79B7E',
          marginBottom: '28px',
          fontSize: '0.92em',
          lineHeight: '1.7',
        }}>
          指定番号「<span style={{ color: '#B9975B', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 'bold' }}>{inputRoomCode}</span>」の競り場を照会しています。<br />
          接続が完了するまでお待ちください...
        </p>
        {onBackToTitle && (
          <button
            onClick={onBackToTitle}
            className="btn-normal"
            style={{
              padding: '10px 24px',
              fontSize: '0.9em',
            }}
          >
            タイトル画面に戻る
          </button>
        )}
      </div>
    );
  }

  // 1. 最初に入室前（ルーム作成 or 参加）- チラシレイアウト
  if (!roomCode) {
    return (
      <div style={{
        maxWidth: '680px',
        margin: '24px auto',
        backgroundColor: '#1C1915',
        border: '3px double #4A4234',
        padding: '28px 24px',
        boxShadow: '4px 4px 0 #000',
        position: 'relative',
      }}>
        {/* チラシ風の飾り四隅角 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #4A4234',
          paddingBottom: '8px',
          marginBottom: '20px',
          fontSize: '0.75em',
          color: '#A79B7E',
          fontFamily: '"IBM Plex Mono", monospace',
          letterSpacing: '0.15em',
        }}>
          <span>OFFICIAL NOTICE // VOL.01</span>
          <span>ONLINE BIDDING BATTLE</span>
          <span>SECRET SPEC</span>
        </div>

        {/* タイトル部（明朝で大きく組み、文字間を詰め気味にする） */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{
            fontFamily: '"Shippori Mincho B1", serif',
            fontWeight: 800,
            fontSize: 'clamp(2rem, 5vw, 2.9rem)',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            margin: '0 0 14px 0',
            color: '#E9DFC8',
          }}>
            LAST BIDDER<br />STANDING
          </h1>

          {/* キャッチコピー（赤いハンコ風ラベル、少し傾ける） */}
          <div style={{
            display: 'inline-block',
            transform: 'rotate(-2deg)',
            margin: '4px 0',
          }}>
            <div className="stamp-seal" style={{
              fontSize: '1em',
              padding: '4px 14px',
              borderWidth: '2px',
              backgroundColor: 'rgba(179, 53, 43, 0.08)',
            }}>
              賭けろ。戦え。生き残れ。
            </div>
          </div>
        </div>

        {(() => {
          const inputNameInfo = getNameCharLimitInfo(inputName);
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* セクション 1: プレイヤー名入力 */}
              <div style={{
                borderTop: '1px solid #4A4234',
                paddingTop: '18px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '8px',
                }}>
                  <label style={{
                    fontSize: '0.9em',
                    color: '#E9DFC8',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}>
                    あなたのプレイヤー名:
                  </label>
                  <span style={{
                    fontSize: '0.78em',
                    color: inputNameInfo.isOver ? '#B3352B' : '#A79B7E',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}>
                    {inputName.length > 0 ? (
                      <>
                        {inputNameInfo.count} / {inputNameInfo.max}字
                        {inputNameInfo.isOver && <b style={{ marginLeft: '6px' }}>[超過]</b>}
                      </>
                    ) : (
                      '半角24字 / 全角・混合12字以内'
                    )}
                  </span>
                </div>

                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="名前を入力 (半角24字/全角12字以内)"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: inputNameInfo.isOver ? '1px solid #B3352B' : '1px solid #4A4234',
                    backgroundColor: '#12100D',
                    color: '#E9DFC8',
                    fontSize: '1em',
                  }}
                />
                {inputNameInfo.isOver && (
                  <div style={{
                    color: '#B3352B',
                    fontSize: '0.8em',
                    marginTop: '6px',
                    fontWeight: 700,
                  }}>
                    ※ {inputNameInfo.hasFull ? '全角または混合の名前は12文字以内' : '半角の名前は24文字以内'}で入力してください。
                  </div>
                )}
              </div>

              {/* セクション 2: 部屋を作成（最重要ボタン） */}
              <div style={{
                borderTop: '1px solid #4A4234',
                paddingTop: '18px',
              }}>
                <div style={{
                  fontSize: '0.75em',
                  color: '#A79B7E',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}>
                  OPTION A: HOST A NEW TABLE
                </div>
                <button
                  onClick={() => {
                    const validation = validatePlayerName(inputName);
                    if (!validation.valid) {
                      return alert(validation.reason || '名前を入力してください');
                    }
                    onCreateRoom(inputName.trim());
                  }}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1.05em',
                    letterSpacing: '0.05em',
                  }}
                >
                  新しい部屋を作成（ホストになる）
                </button>
              </div>

              {/* セクション 3: 友達の部屋に参加 */}
              <div style={{
                borderTop: '1px solid #4A4234',
                paddingTop: '18px',
              }}>
                <div style={{
                  fontSize: '0.75em',
                  color: '#A79B7E',
                  letterSpacing: '0.1em',
                  marginBottom: '8px',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}>
                  OPTION B: JOIN EXISTING TABLE
                </div>
                <div style={{
                  backgroundColor: '#12100D',
                  padding: '16px',
                  border: '1px solid #4A4234',
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.85em',
                    color: '#A79B7E',
                    marginBottom: '8px',
                  }}>
                    招待されたルームID（6桁の数字 または 招待URL）:
                  </label>
                  <input
                    type="text"
                    placeholder="例: 582190 または 招待URLを貼り付け"
                    value={inputRoomCode}
                    onChange={(e) => setInputRoomCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: '#1C1915',
                      color: '#E9DFC8',
                      marginBottom: '12px',
                      fontSize: '1em',
                      fontFamily: '"IBM Plex Mono", monospace',
                    }}
                  />
                  <button
                    onClick={() => {
                      const validation = validatePlayerName(inputName);
                      if (!validation.valid) {
                        return alert(validation.reason || '名前を入力してください');
                      }
                      const normalized = normalizeRoomCode(inputRoomCode);
                      if (!normalized) return alert('ルームIDまたは招待URLを入力してください');
                      onJoinRoom(normalized, inputName.trim());
                    }}
                    className="btn-normal"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '0.98em',
                      fontWeight: 700,
                      borderColor: '#B9975B',
                      color: '#B9975B',
                    }}
                  >
                    部屋に参加する
                  </button>
                </div>
              </div>

              {/* セクション 4: オンライン対戦の手順（01 / 02 / 03 等幅フォント特大） */}
              <div style={{
                borderTop: '1px solid #4A4234',
                paddingTop: '18px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <span className="stamp-seal" style={{ fontSize: '0.72em', padding: '1px 6px' }}>
                    手順
                  </span>
                  <span style={{ fontSize: '0.88em', fontWeight: 700, color: '#E9DFC8' }}>
                    オンライン対戦の手順:
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  backgroundColor: '#12100D',
                  padding: '14px',
                  border: '1px solid #4A4234',
                  fontSize: '0.85em',
                  color: '#A79B7E',
                  lineHeight: '1.6',
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: '1.25em',
                      fontWeight: 700,
                      color: '#B9975B',
                      lineHeight: 1,
                      minWidth: '24px',
                    }}>
                      01
                    </span>
                    <div>1人目のプレイヤーが「新しい部屋を作成」を押します（ホストになります）</div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: '1.25em',
                      fontWeight: 700,
                      color: '#B9975B',
                      lineHeight: 1,
                      minWidth: '24px',
                    }}>
                      02
                    </span>
                    <div>待機室に表示される「招待リンクをコピー」または「6桁ID」を友達にLINEやDiscordで送ります</div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontSize: '1.25em',
                      fontWeight: 700,
                      color: '#B9975B',
                      lineHeight: 1,
                      minWidth: '24px',
                    }}>
                      03
                    </span>
                    <div>友達がそのURLを開くか、IDを入力して「部屋に参加する」を押せばマッチング完了です！</div>
                  </div>

                  <div style={{
                    marginTop: '4px',
                    paddingTop: '8px',
                    borderTop: '1px solid #26221C',
                    fontSize: '0.8em',
                    color: '#6B7F4E',
                  }}>
                    ※ ホストがURL共有のために別アプリを開いても部屋は維持されます。
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // 2. ロビー待機中（競り札風デザイン）
  if (phase === 'LOBBY') {
    const playerCount = Object.keys(players).length;
    const canStart = playerCount >= 2;

    return (
      <div style={{
        maxWidth: '820px',
        margin: '20px auto',
        backgroundColor: '#1C1915',
        border: '3px double #4A4234',
        padding: '24px',
        boxShadow: '4px 4px 0 #000',
      }}>
        {/* 上部ヘッダー部 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #4A4234',
          paddingBottom: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{
              fontSize: '0.75em',
              color: '#A79B7E',
              letterSpacing: '0.15em',
              fontFamily: '"IBM Plex Mono", monospace',
              marginBottom: '2px',
            }}>
              WAITING ROOM // AUCTION TABLE
            </div>
            <h2 style={{
              margin: 0,
              fontFamily: '"Shippori Mincho B1", serif',
              fontWeight: 700,
              fontSize: '1.6em',
              color: '#E9DFC8',
            }}>
              ルーム待機室
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {onBackToTitle && (
              <button
                onClick={onBackToTitle}
                className="btn-sub"
                style={{ fontSize: '0.85em' }}
              >
                タイトル画面に戻る
              </button>
            )}
            {isHost && onAddTestPlayer && (
              <button
                onClick={onAddTestPlayer}
                className="btn-normal"
                style={{ padding: '8px 12px', fontSize: '0.85em' }}
              >
                テスト用プレイヤー追加
              </button>
            )}
            {isHost && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className="btn-primary"
                style={{
                  padding: '10px 20px',
                  fontSize: '0.95em',
                }}
              >
                {canStart ? 'ゲームを開始する' : '対戦相手を待っています...'}
              </button>
            )}
          </div>
        </div>

        {/* ルームID（競り札ボックス風）と招待URL */}
        <div style={{
          backgroundColor: '#12100D',
          border: '2px solid #4A4234',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <div style={{
              fontSize: '0.75em',
              color: '#A79B7E',
              letterSpacing: '0.1em',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              BIDDER TABLE CODE
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '2px' }}>
              <span style={{ fontSize: '0.9em', color: '#A79B7E' }}>ルームID:</span>
              <span style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: '2.2em',
                fontWeight: 700,
                color: '#B9975B',
                letterSpacing: '3px',
                lineHeight: 1,
              }}>
                {roomCode}
              </span>
            </div>
            <div style={{ marginTop: '6px', fontSize: '0.78em', color: '#A79B7E' }}>
              ※ 別アプリを開いて招待リンクを送っても接続は維持されます
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleCopy(roomCode, 'ルームID')}
                className="btn-normal"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.82em',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                IDをコピー
              </button>
              <button
                onClick={() => handleCopy(getInviteUrl(), '招待URL')}
                className="btn-normal"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82em',
                  borderColor: '#B9975B',
                  color: '#B9975B',
                  fontWeight: 700,
                }}
              >
                招待リンクをコピー
              </button>
            </div>
            {copyNotice && (
              <div style={{
                color: '#6B7F4E',
                fontSize: '0.82em',
                fontWeight: 700,
                textAlign: 'right',
              }}>
                {copyNotice}
              </div>
            )}
          </div>
        </div>

        {/* 開始可能人数の警告（2〜4人で開始できます）：赤文字＋罫線ボックス */}
        {!canStart && (
          <div style={{
            border: '1px solid #B3352B',
            backgroundColor: 'rgba(179, 53, 43, 0.08)',
            padding: '10px 14px',
            marginBottom: '20px',
            color: '#B3352B',
            fontSize: '0.88em',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span className="stamp-seal-solid" style={{ fontSize: '0.7em', padding: '1px 5px' }}>
              注意
            </span>
            <span>2〜4人で開始できます。対戦相手の入室をお待ちください。</span>
          </div>
        )}

        {/* 参加者一覧（ピル型チップを廃止、四角い「名札」リスト） */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            borderBottom: '1px solid #4A4234',
            paddingBottom: '6px',
            marginBottom: '12px',
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1em',
              fontWeight: 700,
              color: '#E9DFC8',
              letterSpacing: '0.05em',
            }}>
              参加者一覧
            </h3>
            <span style={{
              fontSize: '0.85em',
              color: '#A79B7E',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              ({playerCount} / 4 人)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {Object.values(players).map(p => {
              const isMe = p.id === myId;
              const isBot = p.id.startsWith('bot_');

              return (
                <div
                  key={p.id}
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#12100D',
                    border: '1px solid #4A4234',
                    borderLeft: isMe ? '4px solid #B3352B' : '1px solid #4A4234',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '2px 2px 0 #000',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontWeight: 700,
                      fontSize: '0.95em',
                      color: isBot ? '#A79B7E' : '#E9DFC8',
                    }}>
                      {p.name}
                    </span>
                    {p.isHost && (
                      <span style={{
                        fontSize: '0.65em',
                        border: '1px solid #B9975B',
                        color: '#B9975B',
                        padding: '1px 4px',
                        fontFamily: '"IBM Plex Mono", monospace',
                      }}>
                        HOST
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75em', color: isMe ? '#B3352B' : '#A79B7E' }}>
                    {isMe ? '[あなた]' : isBot ? '[CPU]' : '[参加者]'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 名前変更フォーム（ロビー待機中は全員使用可） */}
        {myId && onRename && (() => {
          const lobbyNameInfo = getNameCharLimitInfo(lobbyName);
          const handleApplyRename = () => {
            const validation = validatePlayerName(lobbyName);
            if (!validation.valid) {
              return alert(validation.reason || '名前を入力してください');
            }
            onRename(lobbyName.trim());
            setRenameNotice('名前を変更しました！');
            setTimeout(() => setRenameNotice(''), 2500);
          };

          return (
            <div style={{
              backgroundColor: '#12100D',
              padding: '16px',
              border: '1px solid #4A4234',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '8px',
              }}>
                <label style={{ fontSize: '0.88em', color: '#E9DFC8', fontWeight: 700 }}>
                  プレイヤー名を変更:
                </label>
                <span style={{
                  fontSize: '0.78em',
                  color: lobbyNameInfo.isOver ? '#B3352B' : '#A79B7E',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}>
                  {lobbyName.length > 0 ? (
                    <>
                      {lobbyNameInfo.count} / {lobbyNameInfo.max}字
                      {lobbyNameInfo.isOver && <b style={{ marginLeft: '4px' }}>[超過]</b>}
                    </>
                  ) : (
                    '半角24字 / 全角・混合12字以内'
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={lobbyName}
                  onChange={(e) => setLobbyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyRename();
                    }
                  }}
                  placeholder={players[myId]?.name || '新しい名前を入力 (半角24字/全角12字以内)'}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: lobbyNameInfo.isOver ? '1px solid #B3352B' : '1px solid #4A4234',
                    backgroundColor: '#1C1915',
                    color: '#E9DFC8',
                    fontSize: '0.95em',
                  }}
                />
                <button
                  onClick={handleApplyRename}
                  className="btn-normal"
                  style={{
                    padding: '8px 16px',
                    fontSize: '0.88em',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  変更する
                </button>
              </div>
              {lobbyNameInfo.isOver && (
                <div style={{ color: '#B3352B', fontSize: '0.8em', marginTop: '6px' }}>
                  ※ {lobbyNameInfo.hasFull ? '全角または混合の名前は12文字以内' : '半角の名前は24文字以内'}で入力してください。
                </div>
              )}
              {renameNotice && (
                <div style={{ marginTop: '6px', color: '#6B7F4E', fontSize: '0.82em', fontWeight: 700 }}>
                  {renameNotice}
                </div>
              )}
            </div>
          );
        })()}

        {!isHost && (
          <div style={{
            marginTop: '20px',
            color: '#A79B7E',
            textAlign: 'center',
            fontSize: '0.9em',
            fontStyle: 'italic',
          }}>
            ホストがゲームを開始するのをお待ちください...
          </div>
        )}
      </div>
    );
  }

  // 3. ロール選択画面
  if (phase === 'ROLE_SELECT') {
    return (
      <div style={{
        maxWidth: '960px',
        margin: '20px auto',
        backgroundColor: '#1C1915',
        border: '3px double #4A4234',
        padding: '24px',
        boxShadow: '4px 4px 0 #000',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #4A4234',
          paddingBottom: '14px',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div>
            <div style={{
              fontSize: '0.75em',
              color: '#A79B7E',
              letterSpacing: '0.15em',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              ROLE SELECTION // CHOOSE YOUR CLASS
            </div>
            <h2 style={{
              margin: '2px 0 0 0',
              fontFamily: '"Shippori Mincho B1", serif',
              fontWeight: 700,
              color: '#E9DFC8',
              fontSize: '1.6em',
            }}>
              ロール選択
            </h2>
            <div style={{ fontSize: '0.85em', color: '#A79B7E', marginTop: '4px' }}>
              好きなロールを選択してください（ロールの重複は可能です）。全員が選択するとゲームが始まります。
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {onBackToTitle && (
              <button
                onClick={onBackToTitle}
                className="btn-sub"
                style={{ fontSize: '0.85em' }}
              >
                タイトル画面に戻る
              </button>
            )}
            {isHost && onForceEndGame && (
              <button
                onClick={onForceEndGame}
                className="btn-normal"
                style={{
                  color: '#B3352B',
                  borderColor: '#B3352B',
                  padding: '6px 12px',
                  fontSize: '0.85em',
                }}
              >
                試合を強制終了
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {Object.values(ROLE_DEFINITIONS).map(role => {
            const isSelected = selectedRoleId === role.id;
            const uniqueA = CARD_DEFINITIONS[role.uniqueCardAId];
            const uniqueB = CARD_DEFINITIONS[role.uniqueCardBId];

            return (
              <div
                key={role.id}
                onClick={() => onSelectRole(role.id)}
                style={{
                  backgroundColor: isSelected ? '#26221C' : '#12100D',
                  border: isSelected ? '2px solid #B9975B' : '1px solid #4A4234',
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  boxShadow: isSelected ? '3px 3px 0 #000' : '2px 2px 0 #000',
                  position: 'relative',
                }}
              >
                {/* 選択中スタンプ */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                  }}>
                    <span className="stamp-seal" style={{
                      fontSize: '0.75em',
                      borderColor: '#B9975B',
                      color: '#B9975B',
                    }}>
                      選択中
                    </span>
                  </div>
                )}

                <div style={{ marginBottom: '8px' }}>
                  <b style={{
                    fontSize: '1.15em',
                    fontFamily: '"Shippori Mincho B1", serif',
                    color: isSelected ? '#B9975B' : '#E9DFC8',
                  }}>
                    {role.name}
                  </b>
                </div>

                {/* ステータス表 */}
                <div style={{
                  fontSize: '0.8em',
                  backgroundColor: '#1C1915',
                  padding: '6px 8px',
                  border: '1px solid #4A4234',
                  marginBottom: '10px',
                  fontFamily: '"IBM Plex Mono", monospace',
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}>
                  <span>HP:{role.initialStats.hp}</span>
                  <span>ATK:{role.initialStats.atk}</span>
                  <span>DEF:{role.initialStats.def}</span>
                  <span>MAT:{role.initialStats.mat}</span>
                  <span>MDF:{role.initialStats.mdf}</span>
                  <span>SPD:{role.initialStats.spd}</span>
                </div>

                <div style={{
                  fontSize: '0.82em',
                  color: '#B9975B',
                  marginBottom: '8px',
                  lineHeight: '1.4',
                }}>
                  <b>特性【{role.passiveName}】</b>: {role.passiveDescription}
                </div>

                <div style={{
                  fontSize: '0.78em',
                  color: '#A79B7E',
                  borderTop: '1px solid #4A4234',
                  paddingTop: '8px',
                  lineHeight: '1.4',
                }}>
                  <div style={{ marginBottom: '4px' }}>
                    <b style={{ color: '#E9DFC8' }}>{uniqueA?.name}</b>: {formatCardDescription(uniqueA?.description, { ...role.initialStats, maxHp: role.initialStats.hp })}
                  </div>
                  <div>
                    <b style={{ color: '#E9DFC8' }}>{uniqueB?.name}</b>: {formatCardDescription(uniqueB?.description, { ...role.initialStats, maxHp: role.initialStats.hp })}
                  </div>
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
