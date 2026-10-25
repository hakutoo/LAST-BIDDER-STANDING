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

const CATEGORY_COLORS: { [key: string]: { bg: string; text: string; label: string } } = {
  NORMAL: { bg: '#334155', text: '#cbd5e1', label: '通常' },
  ACTIVE: { bg: '#991b1b', text: '#fca5a5', label: 'アクティブ' },
  COUNTER: { bg: '#4338ca', text: '#c7d2fe', label: 'カウンター' },
  HEAL: { bg: '#065f46', text: '#6ee7b7', label: '回復' },
  UNIQUE_A: { bg: '#701a75', text: '#f5d0fe', label: '固有A' },
  UNIQUE_B: { bg: '#854d0e', text: '#fef08a', label: '固有B' },
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
    // クリックされたら詳細モーダルを表示
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
          backgroundColor: '#090d16',
          borderTop: '2px solid #334155',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.4)',
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
            paddingRight: '8px',
            borderRight: '1px solid #334155',
            minWidth: '50px',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '0.75em', color: '#94a3b8', fontWeight: 'bold' }}>手札</div>
          <div style={{ fontSize: '0.9em', color: '#38bdf8', fontWeight: '900' }}>
            {hand.length}枚
          </div>
        </div>

        {/* 手札カード横スクロールリスト */}
        {hand.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: '0.8em', paddingLeft: '8px', fontStyle: 'italic' }}>
            手札がありません
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              gap: '6px',
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
              const catInfo = CATEGORY_COLORS[def.category] || CATEGORY_COLORS.NORMAL;

              return (
                <button
                  key={item.instanceId}
                  onClick={() => handleCardClick(item.instanceId)}
                  style={{
                    backgroundColor: isSelected ? '#1e3a8a' : '#1e293b',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid #475569',
                    boxShadow: isSelected ? '0 0 10px rgba(56, 189, 248, 0.7)' : 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    minWidth: '100px',
                    maxWidth: '130px',
                    height: '46px',
                    flexShrink: 0,
                    textAlign: 'left',
                    color: '#fff',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.65em',
                        backgroundColor: catInfo.bg,
                        color: catInfo.text,
                        padding: '1px 4px',
                        borderRadius: '3px',
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {catInfo.label}
                    </span>
                    {def.priority === 'HIGH' && (
                      <span
                        style={{
                          fontSize: '0.6em',
                          backgroundColor: '#dc2626',
                          color: '#fff',
                          padding: '1px 3px',
                          borderRadius: '2px',
                          fontWeight: 'bold',
                        }}
                      >
                        高
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78em',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: isSelected ? '#38bdf8' : '#f8fafc',
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
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
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
              padding: '20px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
              color: '#f8fafc',
            }}
          >
            {/* ヘッダー */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontSize: '0.75em',
                      backgroundColor: CATEGORY_COLORS[detailDef.category]?.bg || '#334155',
                      color: CATEGORY_COLORS[detailDef.category]?.text || '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                    }}
                  >
                    {CATEGORY_COLORS[detailDef.category]?.label || detailDef.category}
                  </span>
                  {detailDef.priority === 'HIGH' && (
                    <span style={{ fontSize: '0.75em', backgroundColor: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                      ⚡ 優先度: 高
                    </span>
                  )}
                  <span style={{ fontSize: '0.75em', color: '#94a3b8' }}>
                    対象: {detailDef.targetType === 'SINGLE_ENEMY' ? '敵1体' : '自身'}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25em', color: '#f8fafc' }}>
                  {detailDef.name}
                </h3>
              </div>
              <button
                onClick={() => setDetailCardInstanceId(null)}
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

            {/* 効果説明文 */}
            <div
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.9em',
                lineHeight: 1.5,
                color: '#e2e8f0',
                marginBottom: '16px',
              }}
            >
              {formatCardDescription(detailDef.description, player)}
            </div>

            {/* フッターアクション */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setDetailCardInstanceId(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  backgroundColor: '#475569',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                }}
              >
                閉じる
              </button>

              {/* 行動フェーズ中の場合、このカードを選択するボタン */}
              {isActionPhase && !isActionSubmitted && (
                <button
                  onClick={() => handleSelectFromModal(detailCard.instanceId)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    backgroundColor: selectedCardInstanceId === detailCard.instanceId ? '#16a34a' : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(37, 99, 235, 0.5)',
                  }}
                >
                  {selectedCardInstanceId === detailCard.instanceId ? '✓ 選択中' : 'このカードを使用'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
