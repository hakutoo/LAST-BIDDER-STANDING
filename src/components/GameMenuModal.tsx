import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { GameLogEntry } from '../types/game';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  logs: GameLogEntry[];
  myId?: string;
  isHost: boolean;
  onBackToTitle: () => void;
  onForceEndGame?: () => void;
  roomCode?: string;
  initialTab?: 'MENU' | 'LOG' | 'RULE';
  onOpenChat?: () => void;
  chatCount?: number;
}

export const GameMenuModal: React.FC<Props> = ({
  isOpen,
  onClose,
  logs,
  myId,
  isHost,
  onBackToTitle,
  onForceEndGame,
  roomCode,
  initialTab = 'MENU',
  onOpenChat,
  chatCount = 0,
}) => {
  const [currentView, setCurrentView] = useState<'MENU' | 'LOG' | 'RULE'>(initialTab);
  const [selectedTurnFilter, setSelectedTurnFilter] = useState<string>('ALL');
  const logTopRef = useRef<HTMLDivElement>(null);
  const logBottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef<boolean>(false);
  const prevViewRef = useRef<'MENU' | 'LOG' | 'RULE'>(initialTab);

  // モーダルが開かれた時にタブをリセットまたは初期タブに切り替え
  useEffect(() => {
    if (isOpen) {
      setCurrentView(initialTab);
    }
  }, [isOpen, initialTab]);

  // プレイヤー視点の可視ログ
  const filteredLogs = useMemo(() => {
    return myId
      ? logs.filter((log) => !log.visibleToPlayerId || log.visibleToPlayerId === myId)
      : logs;
  }, [logs, myId]);

  // 存在するターンのリスト
  const availableTurns = useMemo(() => {
    const turns = new Set<number>();
    filteredLogs.forEach((log) => turns.add(log.turn));
    return Array.from(turns).sort((a, b) => a - b);
  }, [filteredLogs]);

  // 絞り込み後のログ
  const displayLogs = useMemo(() => {
    if (selectedTurnFilter === 'ALL') {
      return filteredLogs;
    }
    const turnNum = Number(selectedTurnFilter);
    return filteredLogs.filter((log) => log.turn === turnNum);
  }, [filteredLogs, selectedTurnFilter]);

  // ログタブ表示時またはログ追加時のスクロール制御
  useEffect(() => {
    if (!isOpen || currentView !== 'LOG') {
      wasOpenRef.current = false;
      return;
    }

    const isJustOpened = !wasOpenRef.current || prevViewRef.current !== 'LOG';
    wasOpenRef.current = true;
    prevViewRef.current = currentView;

    if (isJustOpened) {
      requestAnimationFrame(() => {
        logBottomRef.current?.scrollIntoView({ behavior: 'auto' });
      });
    } else {
      const container = scrollContainerRef.current;
      const isNearBottom = container
        ? container.scrollHeight - container.scrollTop - container.clientHeight < 80
        : true;

      if (isNearBottom) {
        logBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [isOpen, currentView, logs.length]);

  const scrollToTop = () => {
    logTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    logBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTurnFilterChange = (newTurn: string) => {
    setSelectedTurnFilter(newTurn);
    requestAnimationFrame(() => {
      if (newTurn === 'ALL') {
        logBottomRef.current?.scrollIntoView({ behavior: 'auto' });
      } else {
        logTopRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        animation: 'actionFadeIn 0.15s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1C1915',
          border: '3px double #4A4234',
          borderRadius: '0px',
          width: '100%',
          maxWidth: currentView === 'MENU' ? '400px' : '660px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '6px 6px 0 #000',
          color: '#E9DFC8',
          overflow: 'hidden',
          transition: 'max-width 0.2s ease',
        }}
      >
        {/* モーダルヘッダー */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 18px',
            backgroundColor: '#12100D',
            borderBottom: '1px solid #4A4234',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {currentView !== 'MENU' && (
              <button
                onClick={() => setCurrentView('MENU')}
                className="btn-sub"
                style={{
                  fontSize: '0.85em',
                  padding: '2px 6px',
                }}
              >
                ← 戻る
              </button>
            )}
            <h3 style={{
              margin: 0,
              fontSize: '1.15em',
              fontWeight: 700,
              fontFamily: '"Shippori Mincho B1", serif',
              color: '#E9DFC8',
            }}>
              {currentView === 'MENU' && 'メニュー目録'}
              {currentView === 'LOG' && (
                <span>
                  戦闘記録 <span style={{ fontSize: '0.75em', color: '#A79B7E', fontFamily: '"IBM Plex Mono", monospace' }}>({filteredLogs.length}件)</span>
                </span>
              )}
              {currentView === 'RULE' && '規則解説'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn-sub"
            style={{
              fontSize: '1.2em',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* ログビュー用のツールバー（ターン絞り込み＆端ジャンプ） */}
        {currentView === 'LOG' && filteredLogs.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              backgroundColor: '#12100D',
              borderBottom: '1px solid #4A4234',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            {/* ターン絞り込みセレクタ */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.78em', color: '#A79B7E' }}>絞り込み:</span>
              <select
                value={selectedTurnFilter}
                onChange={(e) => handleTurnFilterChange(e.target.value)}
                style={{
                  backgroundColor: '#1C1915',
                  color: '#E9DFC8',
                  border: '1px solid #4A4234',
                  padding: '3px 8px',
                  fontSize: '0.8em',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                <option value="ALL">全ターン表示 ({filteredLogs.length}件)</option>
                {availableTurns.map((turn) => (
                  <option key={turn} value={turn}>
                    {turn === 0 ? '試合開始前・ロビー (T0)' : `第 ${turn} ターン`}
                  </option>
                ))}
              </select>
            </div>

            {/* 最初へ / 最新へ ボタン */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={scrollToTop}
                className="btn-normal"
                style={{
                  fontSize: '0.75em',
                  padding: '3px 8px',
                }}
              >
                最初へ
              </button>
              <button
                onClick={scrollToBottom}
                className="btn-normal"
                style={{
                  fontSize: '0.75em',
                  padding: '3px 8px',
                }}
              >
                最新へ
              </button>
            </div>
          </div>
        )}

        {/* コンテンツエリア */}
        <div ref={scrollContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* 1. メインメニュービュー */}
          {currentView === 'MENU' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {roomCode && (
                <div style={{
                  backgroundColor: '#12100D',
                  padding: '10px 14px',
                  border: '1px solid #4A4234',
                  fontSize: '0.85em',
                  color: '#A79B7E',
                  textAlign: 'center',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}>
                  ルームコード: <b style={{ color: '#B9975B' }}>{roomCode}</b>
                </div>
              )}

              {onOpenChat && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenChat();
                  }}
                  className="btn-normal"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    fontSize: '0.95em',
                    fontWeight: 700,
                  }}
                >
                  <span>会話を開く</span>
                  <span style={{ fontSize: '0.8em', color: '#B9975B', fontFamily: '"IBM Plex Mono", monospace' }}>
                    {chatCount > 0 ? `${chatCount}件 →` : '→'}
                  </span>
                </button>
              )}

              <button
                onClick={() => setCurrentView('LOG')}
                className="btn-normal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  fontSize: '0.95em',
                  fontWeight: 700,
                }}
              >
                <span>戦闘記録を見る</span>
                <span style={{ fontSize: '0.8em', color: '#B9975B', fontFamily: '"IBM Plex Mono", monospace' }}>
                  {filteredLogs.length}件 →
                </span>
              </button>

              <button
                onClick={() => setCurrentView('RULE')}
                className="btn-normal"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  fontSize: '0.95em',
                  fontWeight: 700,
                }}
              >
                <span>規則解説</span>
                <span style={{ fontSize: '0.8em', color: '#B9975B' }}>確認する →</span>
              </button>

              <div style={{ borderTop: '1px solid #4A4234', margin: '4px 0' }} />

              <button
                onClick={() => {
                  if (window.confirm('タイトル画面に戻りますか？')) {
                    onClose();
                    onBackToTitle();
                  }
                }}
                className="btn-sub"
                style={{
                  padding: '10px 14px',
                  fontSize: '0.9em',
                  textAlign: 'center',
                }}
              >
                タイトルへ戻る
              </button>

              {isHost && onForceEndGame && (
                <button
                  onClick={() => {
                    if (window.confirm('本当に試合を強制終了しますか？全プレイヤーのゲームが終了します。')) {
                      onClose();
                      onForceEndGame();
                    }
                  }}
                  className="btn-normal"
                  style={{
                    padding: '10px 16px',
                    borderColor: '#B3352B',
                    color: '#B3352B',
                    fontSize: '0.9em',
                    fontWeight: 700,
                  }}
                >
                  試合を強制終了 (主催者用)
                </button>
              )}
            </div>
          )}

          {/* 2. バトルログビュー */}
          {currentView === 'LOG' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: '"IBM Plex Mono", monospace', fontSize: '0.82em', minHeight: '300px' }}>
              <div ref={logTopRef} />
              {displayLogs.length === 0 ? (
                <div style={{ color: '#A79B7E', textAlign: 'center', padding: '32px' }}>
                  記録がありません。
                </div>
              ) : (
                <>
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '4px 0 8px 0',
                      color: '#A79B7E',
                      fontSize: '0.78em',
                      borderBottom: '1px solid #4A4234',
                      marginBottom: '4px',
                    }}
                  >
                    {selectedTurnFilter === 'ALL'
                      ? '--- 試合開始記録 ---'
                      : `--- ${selectedTurnFilter === '0' ? '試合開始前・ロビー' : `第 ${selectedTurnFilter} ターン`} の記録 (${displayLogs.length}件) ---`}
                  </div>
                  {displayLogs.map((log, index) => {
                    const prevLog = index > 0 ? displayLogs[index - 1] : null;
                    const isNewTurn = prevLog && prevLog.turn !== log.turn;

                    let color = '#E9DFC8';
                    let borderColor = '#4A4234';
                    if (log.type === 'damage') {
                      color = '#B3352B';
                      borderColor = '#B3352B';
                    }
                    if (log.type === 'heal') {
                      color = '#6B7F4E';
                      borderColor = '#6B7F4E';
                    }
                    if (log.type === 'status') {
                      color = '#B9975B';
                      borderColor = '#B9975B';
                    }
                    if (log.type === 'death') {
                      color = '#B3352B';
                      borderColor = '#B3352B';
                    }
                    if (log.type === 'draft') {
                      color = '#B9975B';
                      borderColor = '#B9975B';
                    }
                    if (log.type === 'system') {
                      color = '#A79B7E';
                      borderColor = '#4A4234';
                    }

                    return (
                      <React.Fragment key={log.id}>
                        {isNewTurn && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              margin: '10px 0 6px 0',
                              color: '#B9975B',
                              fontSize: '0.8em',
                              fontWeight: 700,
                            }}
                          >
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#4A4234' }} />
                            <span>{log.turn > 0 ? `第 ${log.turn} ターン` : 'ゲーム開始'}</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: '#4A4234' }} />
                          </div>
                        )}
                        <div
                          style={{
                            color,
                            padding: '4px 8px',
                            backgroundColor: '#12100D',
                            borderLeft: `3px solid ${borderColor}`,
                            lineHeight: '1.4',
                          }}
                        >
                          {log.turn > 0 && <span style={{ color: '#A79B7E' }}>[T{log.turn}] </span>}
                          {log.text}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </>
              )}
              <div ref={logBottomRef} />
            </div>
          )}

          {/* 3. ルール説明ビュー */}
          {currentView === 'RULE' && (
            <div style={{ fontSize: '0.88em', lineHeight: '1.6', color: '#E9DFC8', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                backgroundColor: '#12100D',
                padding: '12px',
                borderLeft: '4px solid #B9975B',
                borderTop: '1px solid #4A4234',
                borderRight: '1px solid #4A4234',
                borderBottom: '1px solid #4A4234',
              }}>
                <b style={{ color: '#B9975B', fontSize: '1.05em', fontFamily: '"Shippori Mincho B1", serif' }}>
                  勝敗条件
                </b>
                <p style={{ margin: '4px 0 0 0', color: '#A79B7E' }}>
                  他プレイヤーとの駆け引き・カードドラフトを制し、最後まで生き残った1人が勝利です。
                </p>
              </div>

              <div>
                <b style={{ color: '#B9975B', fontFamily: '"Shippori Mincho B1", serif', fontSize: '1em' }}>
                  進行手順
                </b>
                <ol style={{ paddingLeft: '20px', margin: '6px 0', color: '#A79B7E' }}>
                  <li>
                    <b style={{ color: '#E9DFC8' }}>給与獲得:</b> 各ロールの規定給料（G）を受け取ります。
                  </li>
                  <li>
                    <b style={{ color: '#E9DFC8' }}>ドラフト＆ショップ:</b> 場に出た共通カードにGを入札します。最高入札者が落札！また自分のロール専用カードを定額購入できます。
                  </li>
                  <li>
                    <b style={{ color: '#E9DFC8' }}>ドラフト結果:</b> 落札者とカードの配布を確認します。
                  </li>
                  <li>
                    <b style={{ color: '#E9DFC8' }}>行動選択:</b> 手札からカードを1枚使用するか「何もしない」で温存します。優先度やSPDが高い順に行動します。
                  </li>
                  <li>
                    <b style={{ color: '#E9DFC8' }}>行動解決:</b> 攻撃・防御・回復が順に適用されます。HPが0になったプレイヤーは脱落です。
                  </li>
                </ol>
              </div>

              <div>
                <b style={{ color: '#B9975B', fontFamily: '"Shippori Mincho B1", serif', fontSize: '1em' }}>
                  能力値の説明
                </b>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', fontSize: '0.82em', fontFamily: '"IBM Plex Mono", monospace' }}>
                  <div style={{ backgroundColor: '#12100D', padding: '6px', border: '1px solid #4A4234' }}>
                    <span style={{ color: '#B3352B', fontWeight: 700 }}>HP:</span> 生命力。0で脱落
                  </div>
                  <div style={{ backgroundColor: '#12100D', padding: '6px', border: '1px solid #4A4234' }}>
                    <span style={{ color: '#B9975B', fontWeight: 700 }}>SLD:</span> シールド。ダメージ肩代わり
                  </div>
                  <div style={{ backgroundColor: '#12100D', padding: '6px', border: '1px solid #4A4234' }}>
                    <span style={{ color: '#E9DFC8', fontWeight: 700 }}>ATK:</span> 物理攻撃力
                  </div>
                  <div style={{ backgroundColor: '#12100D', padding: '6px', border: '1px solid #4A4234' }}>
                    <span style={{ color: '#A79B7E', fontWeight: 700 }}>DEF:</span> 物理防御力
                  </div>
                  <div style={{ backgroundColor: '#12100D', padding: '6px', border: '1px solid #4A4234' }}>
                    <span style={{ color: '#B9975B', fontWeight: 700 }}>SPD:</span> 行動順、軽減・クリティカル回避
                  </div>
                  <div style={{ backgroundColor: '#12100D', padding: '6px', border: '1px solid #4A4234' }}>
                    <span style={{ color: '#E9DFC8', fontWeight: 700 }}>MAT:</span> 魔法攻撃力
                  </div>
                  <div style={{ backgroundColor: '#12100D', padding: '6px', border: '1px solid #4A4234' }}>
                    <span style={{ color: '#A79B7E', fontWeight: 700 }}>MDF:</span> 魔法防御力
                  </div>
                  <div style={{ backgroundColor: '#12100D', padding: '6px', border: '1px solid #4A4234' }}>
                    <span style={{ color: '#B9975B', fontWeight: 700 }}>CLT:</span> クリティカル確率
                  </div>
                </div>
              </div>

              <div>
                <b style={{ color: '#B9975B', fontFamily: '"Shippori Mincho B1", serif', fontSize: '1em' }}>
                  状態異常
                </b>
                <ul style={{ paddingLeft: '20px', margin: '6px 0', fontSize: '0.85em', color: '#A79B7E' }}>
                  <li><b style={{ color: '#E9DFC8' }}>毒:</b> ターン終了時にHPダメージ（SLD無視貫通）</li>
                  <li><b style={{ color: '#B3352B' }}>重傷:</b> 受けるHP回復効果が半減</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#12100D',
            borderTop: '1px solid #4A4234',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            className="btn-sub"
            style={{
              padding: '6px 16px',
              fontSize: '0.85em',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
