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
          backgroundColor: '#1C1915',
          border: '2px solid #4A4234',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '16px',
          boxShadow: '3px 3px 0 #000',
        }}
      >
        <div style={{
          fontSize: '1.1em',
          color: '#B9975B',
          fontFamily: '"Shippori Mincho B1", serif',
        }}>
          ドラフト結果を集計中...
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
        backgroundColor: '#1C1915',
        border: `2px solid ${isWinnerAnnounce && hasWinner ? '#B9975B' : '#4A4234'}`,
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '4px 4px 0 #000',
        position: 'relative',
        animation: 'actionFadeIn 0.25s ease-out',
      }}
    >
      {/* ヘッダー: ステップバッジ・カード進行・スキップボタン */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px',
          borderBottom: '1px solid #4A4234',
          paddingBottom: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: isWinnerAnnounce ? '#B9975B' : '#26221C',
              color: isWinnerAnnounce ? '#12100D' : '#E9DFC8',
              border: '1px solid #4A4234',
              padding: '3px 12px',
              fontSize: '0.85em',
              fontWeight: 700,
              letterSpacing: '0.05em',
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            {isWinnerAnnounce ? '[落札確定]' : '[入札開示]'}
          </div>

          <span style={{
            fontSize: '0.85em',
            color: '#A79B7E',
            fontWeight: 700,
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            競売品 {event.cardIndex} / {event.totalCards}
          </span>
        </div>

        {isHost && onSkip && (
          <button
            onClick={onSkip}
            className="btn-normal"
            style={{
              padding: '4px 10px',
              fontSize: '0.8em',
            }}
            title="残りのドラフト結果をスキップして即座に確定します"
          >
            演出スキップ
          </button>
        )}
      </div>

      {/* 対象カード情報 */}
      <div
        style={{
          backgroundColor: '#12100D',
          border: '1px solid #4A4234',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '1.2em',
              fontWeight: 700,
              color: '#E9DFC8',
              fontFamily: '"Shippori Mincho B1", serif',
            }}>
              {event.cardName}
            </span>
            {cardDef?.statusBonus && (
              <span
                style={{
                  border: '1px solid #B9975B',
                  color: '#B9975B',
                  fontSize: '0.7em',
                  padding: '1px 6px',
                  fontWeight: 700,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                即時強化
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.82em', color: '#A79B7E', marginTop: '4px' }}>
            {cardDef?.description}
          </div>
        </div>

        {event.statChangeText && isWinnerAnnounce && (
          <div
            style={{
              backgroundColor: '#26221C',
              border: '1px solid #B9975B',
              padding: '4px 10px',
              color: '#B9975B',
              fontSize: '0.82em',
              fontWeight: 700,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            {event.statChangeText}
          </div>
        )}
      </div>

      {/* プレイヤー一覧 & 各入札額（名札・値札風） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          marginBottom: '16px',
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
                backgroundColor: isWinner ? '#26221C' : '#12100D',
                border: isWinner ? '2px solid #B9975B' : '1px solid #4A4234',
                padding: '10px',
                textAlign: 'center',
                boxShadow: isWinner ? '3px 3px 0 #000' : '1px 1px 0 #000',
                opacity: isDimmed ? 0.45 : 1,
                position: 'relative',
              }}
            >
              {isWinner && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    backgroundColor: '#B9975B',
                    color: '#12100D',
                    fontSize: '0.65em',
                    fontWeight: 700,
                    padding: '1px 5px',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >
                  落札
                </div>
              )}

              <div style={{ fontWeight: 700, fontSize: '0.9em', color: '#E9DFC8', marginBottom: '2px' }}>
                {b.playerName}
              </div>
              <div style={{ fontSize: '0.72em', color: '#A79B7E', marginBottom: '6px' }}>
                {role ? role.name : 'ロール'}
              </div>

              {/* 入札額 */}
              <div style={{ marginTop: '4px' }}>
                {b.bidAmount > 0 ? (
                  <div>
                    <span
                      style={{
                        fontSize: isWinner ? '1.3em' : '1.15em',
                        fontWeight: 700,
                        color: isWinner ? '#B9975B' : '#E9DFC8',
                        fontFamily: '"IBM Plex Mono", monospace',
                      }}
                    >
                      {b.bidAmount} G
                    </span>
                    {b.effectiveBid > b.bidAmount && (
                      <div style={{
                        fontSize: '0.7em',
                        color: '#B9975B',
                        fontFamily: '"IBM Plex Mono", monospace',
                      }}>
                        (実効: {b.effectiveBid}G)
                      </div>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8em', color: '#A79B7E', fontFamily: '"IBM Plex Mono", monospace' }}>
                    入札なし (0G)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 獲得メッセージ表示 */}
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: isWinnerAnnounce ? '1.05em' : '0.92em',
            fontWeight: isWinnerAnnounce ? 700 : 'normal',
            color: isWinnerAnnounce
              ? hasWinner ? '#B9975B' : '#A79B7E'
              : '#A79B7E',
            backgroundColor: '#12100D',
            border: isWinnerAnnounce && hasWinner ? '1px solid #B9975B' : '1px solid #4A4234',
            padding: '8px 18px',
            display: 'inline-block',
            maxWidth: '90%',
            lineHeight: 1.4,
            boxShadow: '2px 2px 0 #000',
            fontFamily: isWinnerAnnounce && hasWinner ? '"Shippori Mincho B1", serif' : 'inherit',
          }}
        >
          {event.message.replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()}
        </div>
      </div>
    </div>
  );
};
