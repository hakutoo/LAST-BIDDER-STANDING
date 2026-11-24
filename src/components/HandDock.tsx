import React, { useState } from 'react';
import type { CardInstance, PublicPlayerInfo } from '../types/game';
import { CARD_DEFINITIONS, formatCardDescription } from '../data/cards';

interface Props {
  hand: CardInstance[];
  selectedCardInstanceId?: string | null;
  onSelectCard?: (instanceId: string) => void;
  isActionPhase?: boolean;
  isActionSubmitted?: boolean;
  player?: PublicPlayerInfo | null;
}

const CATEGORY_LABELS: { [key: string]: string } = {
  NORMAL: '通常',
  ACTIVE: 'アクティブ',
  COUNTER: 'カウンター',
  HEAL: '回復',
  UNIQUE_A: '固有A',
  UNIQUE_B: '固有B',
};

export const HandDock: React.FC<Props> = ({
  hand,
  selectedCardInstanceId,
  onSelectCard,
  isActionPhase = false,
  isActionSubmitted = false,
  player,
}) => {
  // 詳細モーダルで表示するカード（instanceId）
  const [detailCardInstanceId, setDetailCardInstanceId] = useState<string | null>(null);

  const detailCard = hand.find(c => c.instanceId === detailCardInstanceId);
  const detailDef = detailCard ? CARD_DEFINITIONS[detailCard.cardId] : null;

  const handleCardClick = (instanceId: string) => {
    setDetailCardInstanceId(instanceId);
  };

  const handleSelectFromModal = (instanceId: string) => {
    if (onSelectCard) {
      onSelectCard(instanceId);
    }
    setDetailCardInstanceId(null);
  };

  return (
    <>
      {/* 画面下部常設手札トレイ */}
      <div
        style={{
          backgroundColor: '#1C1915',
          borderTop: '2px solid #4A4234',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 -4px 0 #000',
          position: 'relative',
          zIndex: 40,
          flexShrink: 0,
          height: '62px',
          boxSizing: 'border-box',
        }}
      >
        {/* 左側ラベル */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            paddingRight: '10px',
            borderRight: '1px solid #4A4234',
            minWidth: '50px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '0.72em', color: '#A79B7E', fontWeight: 700 }}>手札</div>
          <div style={{
            fontSize: '0.95em',
            color: '#B9975B',
            fontWeight: 700,
            fontFamily: '"IBM Plex Mono", monospace',
          }}>
            {hand.length}枚
          </div>
        </div>

        {/* 手札カード横スクロールリスト */}
        {hand.length === 0 ? (
          <div style={{ color: '#A79B7E', fontSize: '0.8em', paddingLeft: '8px', fontStyle: 'italic' }}>
            所持カードはありません
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              overflowY: 'hidden',
              flex: 1,
              alignItems: 'center',
              padding: '2px 0',
              scrollbarWidth: 'thin',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {hand.map((item) => {
              const def = CARD_DEFINITIONS[item.cardId];
              if (!def) return null;
              const isSelected = selectedCardInstanceId === item.instanceId;
              const catLabel = CATEGORY_LABELS[def.category] || def.category;

              return (
                <button
                  key={item.instanceId}
                  onClick={() => handleCardClick(item.instanceId)}
                  style={{
                    backgroundColor: isSelected ? '#26221C' : '#12100D',
                    border: isSelected ? '2px solid #B9975B' : '1px solid #4A4234',
                    boxShadow: isSelected ? '2px 2px 0 #000' : '1px 1px 0 #000',
                    borderRadius: '0px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minWidth: '105px',
                    maxWidth: '135px',
                    height: '46px',
                    flexShrink: 0,
                    textAlign: 'left',
                    color: '#E9DFC8',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.65em',
                        border: '1px solid #4A4234',
                        color: '#A79B7E',
                        padding: '0 3px',
                        fontFamily: '"IBM Plex Mono", monospace',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {catLabel}
                    </span>
                    {def.priority === 'HIGH' && (
                      <span
                        style={{
                          fontSize: '0.6em',
                          backgroundColor: '#B3352B',
                          color: '#E9DFC8',
                          padding: '0 3px',
                          fontWeight: 700,
                        }}
                      >
                        高
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78em',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: isSelected ? '#B9975B' : '#E9DFC8',
                      fontFamily: '"Shippori Mincho B1", serif',
                    }}
                  >
                    {def.name}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* カード詳細モーダル */}
      {detailDef && detailCard && (
        <div
          onClick={() => setDetailCardInstanceId(null)}
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
            zIndex: 1000,
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
              padding: '20px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '6px 6px 0 #000',
              color: '#E9DFC8',
            }}
          >
            {/* ヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #4A4234', paddingBottom: '8px' }}>
              <div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.7em',
                      border: '1px solid #4A4234',
                      color: '#B9975B',
                      padding: '1px 5px',
                      fontFamily: '"IBM Plex Mono", monospace',
                    }}
                  >
                    {CATEGORY_LABELS[detailDef.category] || detailDef.category}
                  </span>
                  {detailDef.priority === 'HIGH' && (
                    <span style={{ fontSize: '0.7em', backgroundColor: '#B3352B', color: '#E9DFC8', padding: '1px 5px', fontWeight: 700 }}>
                      優先: 高
                    </span>
                  )}
                  <span style={{ fontSize: '0.72em', color: '#A79B7E' }}>
                    対象: {detailDef.targetType === 'SINGLE_ENEMY' ? '敵1体' : '自身'}
                  </span>
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.3em',
                  color: '#E9DFC8',
                  fontFamily: '"Shippori Mincho B1", serif',
                  fontWeight: 700,
                }}>
                  {detailDef.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailCardInstanceId(null)}
                className="btn-sub"
                style={{
                  fontSize: '1.1em',
                  padding: '2px 6px',
                }}
              >
                ✕
              </button>
            </div>

            {/* 効果説明文 */}
            <div
              style={{
                backgroundColor: '#12100D',
                border: '1px solid #4A4234',
                padding: '12px',
                fontSize: '0.88em',
                lineHeight: 1.6,
                color: '#E9DFC8',
                marginBottom: '16px',
              }}
            >
              {formatCardDescription(detailDef.description, player)}
            </div>

            {/* フッターアクション */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDetailCardInstanceId(null)}
                className="btn-sub"
                style={{
                  padding: '6px 14px',
                  fontSize: '0.85em',
                }}
              >
                閉じる
              </button>

              {/* 行動フェーズ中の場合、このカードを選択するボタン */}
              {isActionPhase && !isActionSubmitted && (
                <button
                  onClick={() => handleSelectFromModal(detailCard.instanceId)}
                  className="btn-primary"
                  style={{
                    padding: '8px 18px',
                    fontSize: '0.88em',
                  }}
                >
                  {selectedCardInstanceId === detailCard.instanceId ? '[選択中]' : 'このカードを使用'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
