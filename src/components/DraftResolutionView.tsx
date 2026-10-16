import React from 'react';
import type { DraftResolutionEvent } from '../types/game';
import { CARD_DEFINITIONS } from '../data/cards';
import { ROLE_DEFINITIONS } from '../data/roles';

interface Props {
  event: DraftResolutionEvent | null;
  isHost: boolean;
  onSkip?: () => void;
}

export const DraftResolutionView: React.FC<Props> = ({
  event,
  isHost,
  onSkip,
}) => {
  if (!event) {
    return (
      <div
        style={{
          backgroundColor: '#090d16',
          border: '2px solid #38bdf8',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '16px',
          boxShadow: '0 0 25px rgba(56, 189, 248, 0.25)',
        }}
      >
        <div style={{ fontSize: '1.2em', color: '#38bdf8', fontStyle: 'italic' }}>
          📜 ドラフト結果を集計中...
        </div>
      </div>
    );
  }

  const cardDef = CARD_DEFINITIONS[event.cardId];
  const isWinnerAnnounce = event.step === 'WINNER_ANNOUNCE';
  const hasWinner = !!event.winnerId;

  return (
    <div
      style={{
        backgroundColor: '#090d16',
        backgroundImage: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)',
        border: `2px solid ${isWinnerAnnounce && hasWinner ? '#eab308' : '#38bdf8'}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: isWinnerAnnounce && hasWinner
          ? '0 0 30px rgba(234, 179, 8, 0.4)'
          : '0 0 25px rgba(56, 189, 248, 0.25)',
        position: 'relative',
        overflow: 'hidden',
        animation: 'actionFadeIn 0.3s ease-out',
        transition: 'border-color 0.3s, box-shadow 0.3s',
      }}
    >
      {/* 背景のグロー */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: isWinnerAnnounce && hasWinner
            ? 'radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, transparent 60%)'
            : 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* ヘッダー: ステップバッジ・カード進行・スキップボタン */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          position: 'relative',
          zIndex: 1,
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: isWinnerAnnounce ? '#eab308' : '#0284c7',
              color: isWinnerAnnounce ? '#000' : '#fff',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.85em',
              fontWeight: 'bold',
              boxShadow: isWinnerAnnounce
                ? '0 2px 10px rgba(234, 179, 8, 0.6)'
                : '0 2px 8px rgba(2, 132, 199, 0.5)',
              letterSpacing: '0.5px',
              transition: 'all 0.3s',
            }}
          >
            <span>{isWinnerAnnounce ? '👑' : '📜'}</span>
            <span>{isWinnerAnnounce ? '落札確定' : '入札開示'}</span>
          </div>

          <span style={{ fontSize: '0.9em', color: '#94a3b8', fontWeight: 'bold' }}>
            カード {event.cardIndex} / {event.totalCards}
          </span>
        </div>

        {isHost && onSkip && (
          <button
            onClick={onSkip}
            style={{
              backgroundColor: '#334155',
              color: '#cbd5e1',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.8em',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            title="残りのドラフト結果をスキップして即座に確定します"
          >
            ⏭️ 演出スキップ
          </button>
        )}
      </div>

      {/* 対象カード情報 */}
      <div
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25em', fontWeight: 'bold', color: '#f8fafc' }}>
              🃏 {event.cardName}
            </span>
            {cardDef?.statusBonus && (
              <span
                style={{
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  fontSize: '0.75em',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                }}
              >
                ステータス強化
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.85em', color: '#cbd5e1', marginTop: '4px' }}>
            {cardDef?.description}
          </div>
        </div>

        {event.statChangeText && isWinnerAnnounce && (
          <div
            style={{
              backgroundColor: '#1e1b4b',
              border: '1px solid #818cf8',
              padding: '4px 10px',
              borderRadius: '6px',
              color: '#a5b4fc',
              fontSize: '0.85em',
              fontWeight: 'bold',
              animation: 'popBounce 0.3s ease-out',
            }}
          >
            {event.statChangeText}
          </div>
        )}
      </div>

      {/* プレイヤー一覧 & 各入札額 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {event.bids.map((b) => {
          const role = b.roleId ? ROLE_DEFINITIONS[b.roleId] : null;
          const isWinner = isWinnerAnnounce && b.isWinner;
          const isDimmed = isWinnerAnnounce && hasWinner && !b.isWinner;

          return (
            <div
              key={b.playerId}
              style={{
                backgroundColor: isWinner ? '#1e1b4b' : '#0f172a',
                border: isWinner ? '3px solid #facc15' : '1px solid #334155',
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center',
                boxShadow: isWinner ? '0 0 16px rgba(250, 204, 21, 0.7)' : 'none',
                opacity: isDimmed ? 0.45 : 1,
                transform: isWinner ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {isWinner && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    backgroundColor: '#facc15',
                    color: '#000',
                    fontSize: '0.65em',
                    fontWeight: '900',
                    padding: '2px 6px',
                    borderBottomLeftRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  👑 落札！
                </div>
              )}

              <div style={{ fontWeight: 'bold', fontSize: '0.95em', color: '#f8fafc', marginBottom: '2px' }}>
                {b.playerName}
              </div>
              <div style={{ fontSize: '0.75em', color: '#94a3b8', marginBottom: '6px' }}>
                {role ? role.name : 'ロール'}
              </div>

              {/* 入札額 */}
              <div style={{ marginTop: '4px' }}>
                {b.bidAmount > 0 ? (
                  <div>
                    <span
                      style={{
                        fontSize: isWinner ? '1.4em' : '1.2em',
                        fontWeight: '900',
                        color: isWinner ? '#facc15' : '#38bdf8',
                        textShadow: isWinner ? '0 0 10px rgba(250, 204, 21, 0.6)' : 'none',
                      }}
                    >
                      {b.bidAmount} G
                    </span>
                    {b.effectiveBid > b.bidAmount && (
                      <div style={{ fontSize: '0.7em', color: '#ec4899', fontWeight: 'bold' }}>
                        (実効: {b.effectiveBid}G)
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.85em', color: '#64748b' }}>
                    入札なし (0G)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 獲得メッセージ表示（段階2で強調表示） */}
      <div
        style={{
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: isWinnerAnnounce ? '1.15em' : '0.95em',
            fontWeight: isWinnerAnnounce ? 'bold' : 'normal',
            color: isWinnerAnnounce
              ? hasWinner ? '#facc15' : '#94a3b8'
              : '#94a3b8',
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            border: isWinnerAnnounce && hasWinner ? '1px solid rgba(250, 204, 21, 0.5)' : '1px solid #334155',
            padding: '10px 20px',
            borderRadius: '8px',
            display: 'inline-block',
            maxWidth: '90%',
            lineHeight: 1.4,
            animation: isWinnerAnnounce ? 'popBounce 0.35s ease-out' : 'none',
            boxShadow: isWinnerAnnounce && hasWinner ? '0 0 15px rgba(250, 204, 21, 0.2)' : 'none',
          }}
        >
          {event.message}
        </div>
      </div>
    </div>
  );
};
