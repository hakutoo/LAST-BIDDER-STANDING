import React, { useState, useEffect, useRef } from 'react';
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
}) => {
  const [currentView, setCurrentView] = useState<'MENU' | 'LOG' | 'RULE'>(initialTab);
  const logBottomRef = useRef<HTMLDivElement>(null);

  // モーダルが開かれた時にタブをリセットまたは初期タブに切り替え
  useEffect(() => {
    if (isOpen) {
      setCurrentView(initialTab);
    }
  }, [isOpen, initialTab]);

  // ログタブ表示時に一番下までスクロール
  useEffect(() => {
    if (isOpen && currentView === 'LOG') {
      logBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, currentView, logs]);

  if (!isOpen) return null;

  const displayLogs = myId
    ? logs.filter((log) => !log.visibleToPlayerId || log.visibleToPlayerId === myId)
    : logs;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '16px',
        animation: 'actionFadeIn 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1e293b',
          border: '2px solid #38bdf8',
          borderRadius: '12px',
          width: '100%',
          maxWidth: currentView === 'MENU' ? '380px' : '640px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
          color: '#f8fafc',
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
            padding: '14px 18px',
            backgroundColor: '#0f172a',
            borderBottom: '1px solid #334155',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentView !== 'MENU' && (
              <button
                onClick={() => setCurrentView('MENU')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38bdf8',
                  fontSize: '1em',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontWeight: 'bold',
                }}
              >
                ← 戻る
              </button>
            )}
            <h3 style={{ margin: 0, fontSize: '1.15em', fontWeight: 'bold' }}>
              {currentView === 'MENU' && '☰ メニュー'}
              {currentView === 'LOG' && '📜 バトルログ'}
              {currentView === 'RULE' && '📖 ルール説明'}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4em',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* コンテンツエリア */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {/* 1. メインメニュービュー */}
          {currentView === 'MENU' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roomCode && (
                <div style={{ backgroundColor: '#0f172a', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85em', color: '#94a3b8', textAlign: 'center' }}>
                  ルームコード: <b style={{ color: '#38bdf8' }}>{roomCode}</b>
                </div>
              )}

              <button
                onClick={() => setCurrentView('LOG')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                <span>📜 バトルログを見る</span>
                <span style={{ fontSize: '0.8em', color: '#38bdf8' }}>{displayLogs.length}件 →</span>
              </button>

              <button
                onClick={() => setCurrentView('RULE')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '1em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                <span>📖 ルール説明</span>
                <span style={{ fontSize: '0.8em', color: '#38bdf8' }}>確認する →</span>
              </button>

              <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '4px 0' }} />

              <button
                onClick={() => {
                  if (window.confirm('タイトル画面に戻りますか？')) {
                    onClose();
                    onBackToTitle();
                  }
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                🏠 タイトルへ戻る
              </button>

              {isHost && onForceEndGame && (
                <button
                  onClick={() => {
                    if (window.confirm('本当に試合を強制終了しますか？全プレイヤーのゲームが終了します。')) {
                      onClose();
                      onForceEndGame();
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#dc2626',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.95em',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  ⚠️ 試合を強制終了 (ホスト用)
                </button>
              )}
            </div>
          )}

          {/* 2. バトルログビュー */}
          {currentView === 'LOG' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'monospace', fontSize: '0.85em', minHeight: '300px' }}>
              {displayLogs.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '32px' }}>
                  まだログがありません。
                </div>
              ) : (
                displayLogs.map((log) => {
                  let color = '#e2e8f0';
                  if (log.type === 'damage') color = '#f87171';
                  if (log.type === 'heal') color = '#4ade80';
                  if (log.type === 'status') color = '#fbbf24';
                  if (log.type === 'death') color = '#ef4444';
                  if (log.type === 'draft') color = '#38bdf8';
                  if (log.type === 'system') color = '#a78bfa';

                  return (
                    <div
                      key={log.id}
                      style={{
                        color,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#0f172a',
                        borderLeft: `3px solid ${color}`,
                      }}
                    >
                      {log.turn > 0 && <span style={{ color: '#64748b' }}>[T{log.turn}] </span>}
                      {log.text}
                    </div>
                  );
                })
              )}
              <div ref={logBottomRef} />
            </div>
          )}

          {/* 3. ルール説明ビュー */}
          {currentView === 'RULE' && (
            <div style={{ fontSize: '0.9em', lineHeight: '1.6', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #38bdf8' }}>
                <b style={{ color: '#38bdf8', fontSize: '1.05em' }}>🎯 ゲームの目標</b>
                <p style={{ margin: '4px 0 0 0' }}>
                  他プレイヤーとの駆け引き・カードドラフトを制し、最後まで生き残った1人が勝利です！
                </p>
              </div>

              <div>
                <b style={{ color: '#facc15' }}>🔄 ターンの流れ</b>
                <ol style={{ paddingLeft: '20px', margin: '6px 0' }}>
                  <li>
                    <b>給料獲得:</b> 各ロールの規定給料（G）を受け取ります。
                  </li>
                  <li>
                    <b>ドラフト＆ショップ:</b> 場に出た共通カードにGを入札します。最高入札者が落札！また自分のロール専用カードを定額購入できます。
                  </li>
                  <li>
                    <b>ドラフト結果:</b> 落札者とカードの配布を確認します。
                  </li>
                  <li>
                    <b>行動選択:</b> 手札からカードを1枚使用するか「何もしない」で温存します。優先度やSPDが高い順に行動します。
                  </li>
                  <li>
                    <b>行動解決:</b> 攻撃・防御・回復が順に適用されます。HPが0になったプレイヤーは脱落です。
                  </li>
                </ol>
              </div>

              <div>
                <b style={{ color: '#4ade80' }}>📊 ステータスの意味</b>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', fontSize: '0.85em' }}>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>HP:</span> 生命力。0で脱落
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>SLD:</span> シールド。ダメージ肩代わり
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: '#f87171', fontWeight: 'bold' }}>ATK:</span> 物理攻撃力
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>DEF:</span> 物理防御力
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: '#facc15', fontWeight: 'bold' }}>SPD:</span> 行動順・回避率
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: '#c084fc', fontWeight: 'bold' }}>MAT:</span> 魔法攻撃力
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: '#818cf8', fontWeight: 'bold' }}>MDF:</span> 魔法防御力
                  </div>
                  <div style={{ backgroundColor: '#0f172a', padding: '6px', borderRadius: '4px' }}>
                    <span style={{ color: '#fb923c', fontWeight: 'bold' }}>CLT:</span> クリティカル確率
                  </div>
                </div>
              </div>

              <div>
                <b style={{ color: '#a855f7' }}>💡 状態異常</b>
                <ul style={{ paddingLeft: '20px', margin: '6px 0', fontSize: '0.85em' }}>
                  <li><b style={{ color: '#c084fc' }}>毒:</b> ターン終了時にHPダメージ（SLD無視貫通）</li>
                  <li><b style={{ color: '#f87171' }}>重傷:</b> 受けるHP回復効果が半減</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* モーダルフッター */}
        <div
          style={{
            padding: '12px 18px',
            backgroundColor: '#0f172a',
            borderTop: '1px solid #334155',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '6px',
              backgroundColor: '#475569',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
