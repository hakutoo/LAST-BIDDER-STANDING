import React, { useState, useEffect, useCallback } from 'react';
import type { DraftCard, DraftBid, PublicPlayerInfo } from '../types/game';
import { CARD_DEFINITIONS, formatCardDescription, NORMAL_ATTACK_DERIVATIVE_CARD_IDS } from '../data/cards';
import { ROLE_DEFINITIONS } from '../data/roles';
import { getUniqueCardPrice } from '../logic/draft';

interface Props {
  draftPool: DraftCard[];
  myG: number;
  myId: string;
  roleId: string | null;
  phaseDeadline: number | null;
  onSubmitBid: (bid: DraftBid) => void;
  player?: PublicPlayerInfo | null;
  players?: { [id: string]: PublicPlayerInfo };
}

const normalizeBids = (raw: { [instanceId: string]: number }) => {
  const clean: { [instanceId: string]: number } = {};
  for (const [k, v] of Object.entries(raw)) {
    const num = Math.max(0, Number(v) || 0);
    if (num > 0) {
      clean[k] = num;
    }
  }
  return clean;
};

const CATEGORY_NAMES: { [key: string]: string } = {
  ACTIVE: 'アクティブ',
  COUNTER: 'カウンター',
  HEAL: '回復',
  NORMAL: '通常',
  UNIQUE_A: 'ユニークA',
  UNIQUE_B: 'ユニークB',
};

export const DraftView: React.FC<Props> = ({
  draftPool,
  myG,
  myId,
  roleId,
  phaseDeadline,
  onSubmitBid,
  player,
  players,
}) => {
  const myPlayer = player || (players && myId ? players[myId] : null);
  const [bids, setBids] = useState<{ [instanceId: string]: number }>({});
  const [uniquePurchases, setUniquePurchases] = useState<{ [cardId: string]: number }>({});
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  const handleSubmit = useCallback(() => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    const flattenedPurchases: string[] = [];
    for (const [cardId, count] of Object.entries(uniquePurchases)) {
      for (let i = 0; i < count; i++) {
        flattenedPurchases.push(cardId);
      }
    }

    onSubmitBid({
      playerId: myId,
      bids: normalizeBids(bids),
      uniquePurchases: flattenedPurchases,
      isConfirmed: true,
    });
  }, [isSubmitted, uniquePurchases, onSubmitBid, myId, bids]);

  const handleDoNothing = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);

    onSubmitBid({
      playerId: myId,
      bids: {},
      uniquePurchases: [],
      isConfirmed: true,
    });
  };

  // カウントダウンタイマー
  useEffect(() => {
    if (!phaseDeadline) return;
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((phaseDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !isSubmitted) {
        handleSubmit();
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [phaseDeadline, isSubmitted, handleSubmit]);

  // 入札・購入内容の下書き同期
  useEffect(() => {
    if (isSubmitted) return;

    const flattenedPurchases: string[] = [];
    for (const [cardId, count] of Object.entries(uniquePurchases)) {
      for (let i = 0; i < count; i++) {
        flattenedPurchases.push(cardId);
      }
    }

    onSubmitBid({
      playerId: myId,
      bids: normalizeBids(bids),
      uniquePurchases: flattenedPurchases,
      isConfirmed: false,
    });
  }, [bids, uniquePurchases, isSubmitted, myId, onSubmitBid]);

  const totalBid = Object.values(bids).reduce((sum, val) => sum + (val || 0), 0);
  const totalShopCost = Object.entries(uniquePurchases).reduce((sum, [cardId, count]) => {
    return sum + getUniqueCardPrice(cardId, roleId) * count;
  }, 0);
  const totalExpense = totalBid + totalShopCost;
  const remainingG = myG - totalExpense;
  const isJuggernaut = roleId === 'juggernaut';

  const myRole = roleId ? ROLE_DEFINITIONS[roleId] : null;
  const uniqueCardIds = myRole ? [myRole.uniqueCardAId, myRole.uniqueCardBId] : [];
  const normalAttackCardIds = [...NORMAL_ATTACK_DERIVATIVE_CARD_IDS];

  const handleBidChange = (instanceId: string, valueStr: string) => {
    if (isSubmitted) return;
    const value = Math.max(0, parseInt(valueStr, 10) || 0);
    const currentOtherBids = totalBid - (Number(bids[instanceId]) || 0);
    const maxPossible = Math.max(0, myG - totalShopCost - currentOtherBids);

    if (value > maxPossible) {
      setBids(prev => ({ ...prev, [instanceId]: Number(maxPossible) }));
    } else {
      setBids(prev => ({ ...prev, [instanceId]: Number(value) }));
    }
  };

  const handleUniquePurchaseChange = (cardId: string, delta: number) => {
    if (isSubmitted) return;
    const currentCount = uniquePurchases[cardId] || 0;
    const newCount = currentCount + delta;
    if (newCount < 0) return;

    const price = getUniqueCardPrice(cardId, roleId);
    if (delta > 0 && remainingG < price) {
      return; // 所持G不足
    }

    setUniquePurchases(prev => {
      const next = { ...prev };
      if (newCount === 0) {
        delete next[cardId];
      } else {
        next[cardId] = newCount;
      }
      return next;
    });
  };

  return (
    <div style={{
      backgroundColor: '#1C1915',
      border: '2px solid #4A4234',
      padding: '16px',
      boxShadow: '4px 4px 0 #000',
    }}>
      {/* フェーズヘッダー */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        borderBottom: '1px solid #4A4234',
        paddingBottom: '12px',
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
            PHASE // BIDDING & PROCUREMENT
          </div>
          <h2 style={{
            margin: '2px 0 0 0',
            fontSize: '1.4em',
            fontFamily: '"Shippori Mincho B1", serif',
            fontWeight: 700,
            color: '#E9DFC8',
          }}>
            ドラフト＆ショップ
          </h2>
          <div style={{ fontSize: '0.85em', color: '#A79B7E', marginTop: '2px' }}>
            ドラフト競り札への入札、および専用カードの調達を行います。
          </div>
          {isJuggernaut && (
            <div style={{
              fontSize: '0.82em',
              color: '#B9975B',
              marginTop: '4px',
              border: '1px solid #4A4234',
              padding: '2px 6px',
              display: 'inline-block',
            }}>
              [特性] ジャガーノート: 回復カードへの入札は1.25倍として扱われます
            </div>
          )}
        </div>

        {/* 残り時間と資産メーター */}
        <div style={{ textAlign: 'right', fontFamily: '"IBM Plex Mono", monospace' }}>
          <div style={{
            fontSize: '1.3em',
            fontWeight: 700,
            color: timeLeft <= 10 ? '#B3352B' : '#B9975B',
            letterSpacing: '1px',
          }}>
            残り時間: {timeLeft}s
          </div>
          <div style={{
            fontSize: '0.9em',
            marginTop: '4px',
            backgroundColor: '#12100D',
            padding: '4px 8px',
            border: '1px solid #4A4234',
          }}>
            所持: <b style={{ color: '#B9975B' }}>{myG}G</b> | 入札: <b style={{ color: '#B3352B' }}>{totalBid}G</b> | 店: <b style={{ color: '#A79B7E' }}>{totalShopCost}G</b> | 残: <b style={{ color: '#E9DFC8' }}>{remainingG}G</b>
          </div>
        </div>
      </div>

      {isSubmitted ? (
        <div style={{
          textAlign: 'center',
          padding: '32px 16px',
          backgroundColor: '#12100D',
          border: '1px solid #4A4234',
        }}>
          <div style={{
            fontSize: '1.2em',
            color: '#B9975B',
            fontWeight: 700,
            fontFamily: '"Shippori Mincho B1", serif',
            letterSpacing: '0.05em',
          }}>
            入札・調達の提出を完了しました
          </div>
          <div style={{ color: '#A79B7E', marginTop: '8px', fontSize: '0.88em' }}>
            他の参加者の提出または制限時間の終了をお待ちください...
          </div>
        </div>
      ) : (
        <>
          {/* 1. 定額ショップ欄（値札風カード） */}
          <div style={{
            marginBottom: '20px',
            backgroundColor: '#12100D',
            padding: '14px',
            border: '1px solid #4A4234',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              borderBottom: '1px solid #26221C',
              paddingBottom: '6px',
            }}>
              <div>
                <span style={{
                  fontSize: '1em',
                  fontWeight: 700,
                  color: '#B9975B',
                  letterSpacing: '0.05em',
                }}>
                  定額調達店
                </span>
                <span style={{ fontSize: '0.78em', color: '#A79B7E', marginLeft: '8px' }}>
                  （常時定額調達可能・調達履歴は非公開）
                </span>
              </div>
              <div style={{ fontSize: '0.88em', color: '#E9DFC8', fontFamily: '"IBM Plex Mono", monospace' }}>
                小計: <b style={{ color: '#B9975B' }}>{totalShopCost}G</b>
              </div>
            </div>

            {/* 固有ユニークカード */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{
                fontSize: '0.85em',
                fontWeight: 700,
                color: '#E9DFC8',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span className="stamp-seal" style={{ fontSize: '0.7em', padding: '0 4px' }}>専用</span>
                <span>固有ユニークカード</span>
                <span style={{ fontSize: '0.75em', fontWeight: 'normal', color: '#A79B7E' }}>（自ロール専用）</span>
              </div>

              {uniqueCardIds.length === 0 ? (
                <div style={{ color: '#A79B7E', fontSize: '0.85em', padding: '8px' }}>調達可能な専用カードがありません。</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  {uniqueCardIds.map((cardId) => {
                    const def = CARD_DEFINITIONS[cardId];
                    if (!def) return null;
                    const price = getUniqueCardPrice(cardId, roleId);
                    const count = uniquePurchases[cardId] || 0;
                    const isUniqueA = def.category === 'UNIQUE_A';
                    const canBuy = remainingG >= price;

                    return (
                      <div
                        key={cardId}
                        style={{
                          backgroundColor: count > 0 ? '#26221C' : '#1C1915',
                          border: count > 0 ? '2px solid #B9975B' : '1px solid #4A4234',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '2px 2px 0 #000',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <b style={{ fontSize: '1em', color: '#E9DFC8' }}>{def.name}</b>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {def.priority === 'HIGH' && (
                                <span style={{
                                  fontSize: '0.65em',
                                  padding: '1px 4px',
                                  backgroundColor: '#B3352B',
                                  color: '#E9DFC8',
                                  fontWeight: 700,
                                }}>
                                  優先:高
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.68em',
                                padding: '1px 4px',
                                border: '1px solid #4A4234',
                                color: '#B9975B',
                                fontFamily: '"IBM Plex Mono", monospace',
                              }}>
                                {isUniqueA ? '固有A' : '固有B'} ({price}G)
                              </span>
                            </div>
                          </div>
                          <div style={{ fontSize: '0.82em', color: '#A79B7E', marginBottom: '8px', lineHeight: '1.4' }}>
                            {formatCardDescription(def.description, myPlayer)}
                          </div>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid #26221C',
                          paddingTop: '6px',
                          marginTop: '4px',
                        }}>
                          <div style={{ fontSize: '0.85em', color: '#E9DFC8', fontFamily: '"IBM Plex Mono", monospace' }}>
                            単価: <b style={{ color: '#B9975B' }}>{price}G</b>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleUniquePurchaseChange(cardId, -1)}
                              disabled={count <= 0}
                              className="btn-normal"
                              style={{
                                padding: '1px 8px',
                                fontSize: '0.9em',
                                fontFamily: '"IBM Plex Mono", monospace',
                              }}
                            >
                              -
                            </button>
                            <span style={{
                              minWidth: '28px',
                              textAlign: 'center',
                              fontWeight: 700,
                              fontFamily: '"IBM Plex Mono", monospace',
                              fontSize: '1em',
                              color: count > 0 ? '#B9975B' : '#A79B7E',
                            }}>
                              {count}
                            </span>
                            <button
                              onClick={() => handleUniquePurchaseChange(cardId, 1)}
                              disabled={!canBuy}
                              className="btn-normal"
                              style={{
                                padding: '1px 8px',
                                fontSize: '0.9em',
                                fontFamily: '"IBM Plex Mono", monospace',
                                borderColor: canBuy ? '#B9975B' : '#4A4234',
                                color: canBuy ? '#B9975B' : '#A79B7E',
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 通常攻撃派生カード */}
            <div>
              <div style={{
                fontSize: '0.85em',
                fontWeight: 700,
                color: '#E9DFC8',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span className="stamp-seal" style={{ fontSize: '0.7em', padding: '0 4px' }}>共通</span>
                <span>通常攻撃カード</span>
                <span style={{ fontSize: '0.75em', fontWeight: 'normal', color: '#A79B7E' }}>（全員調達可能）</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {normalAttackCardIds.map((cardId) => {
                  const def = CARD_DEFINITIONS[cardId];
                  if (!def) return null;
                  const price = getUniqueCardPrice(cardId, roleId);
                  const count = uniquePurchases[cardId] || 0;
                  const isAtk = cardId.includes('_atk_');
                  const canBuy = remainingG >= price;

                  return (
                    <div
                      key={cardId}
                      style={{
                        backgroundColor: count > 0 ? '#26221C' : '#1C1915',
                        border: count > 0 ? '2px solid #B9975B' : '1px solid #4A4234',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: '2px 2px 0 #000',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <b style={{ fontSize: '1em', color: '#E9DFC8' }}>{def.name}</b>
                          <span style={{
                            fontSize: '0.68em',
                            padding: '1px 4px',
                            border: '1px solid #4A4234',
                            color: '#A79B7E',
                            fontFamily: '"IBM Plex Mono", monospace',
                          }}>
                            {isAtk ? '通常(ATK)' : '通常(MAT)'} ({price}G)
                          </span>
                        </div>
                        <div style={{ fontSize: '0.82em', color: '#A79B7E', marginBottom: '8px', lineHeight: '1.4' }}>
                          {formatCardDescription(def.description, myPlayer)}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid #26221C',
                        paddingTop: '6px',
                        marginTop: '4px',
                      }}>
                        <div style={{ fontSize: '0.85em', color: '#E9DFC8', fontFamily: '"IBM Plex Mono", monospace' }}>
                          単価: <b style={{ color: '#B9975B' }}>{price}G</b>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleUniquePurchaseChange(cardId, -1)}
                            disabled={count <= 0}
                            className="btn-normal"
                            style={{
                              padding: '1px 8px',
                              fontSize: '0.9em',
                              fontFamily: '"IBM Plex Mono", monospace',
                            }}
                          >
                            -
                          </button>
                          <span style={{
                            minWidth: '28px',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontFamily: '"IBM Plex Mono", monospace',
                            fontSize: '1em',
                            color: count > 0 ? '#B9975B' : '#A79B7E',
                          }}>
                            {count}
                          </span>
                          <button
                            onClick={() => handleUniquePurchaseChange(cardId, 1)}
                            disabled={!canBuy}
                            className="btn-normal"
                            style={{
                              padding: '1px 8px',
                              fontSize: '0.9em',
                              fontFamily: '"IBM Plex Mono", monospace',
                              borderColor: canBuy ? '#B9975B' : '#4A4234',
                              color: canBuy ? '#B9975B' : '#A79B7E',
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. ドラフトプール一覧（競り札／値札風） */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              borderBottom: '1px solid #4A4234',
              paddingBottom: '6px',
            }}>
              <span className="stamp-seal" style={{ fontSize: '0.75em', padding: '1px 6px' }}>競売</span>
              <span style={{ fontWeight: 700, fontSize: '1.05em', color: '#E9DFC8' }}>
                ドラフトプール（入札競り場）
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {draftPool.map((card) => {
                const def = CARD_DEFINITIONS[card.cardId];
                if (!def) return null;
                const isHeal = def.category === 'HEAL' || def.id === 'draft_heal_powder';
                const isStatus = !!def.statusBonus;
                const hasBid = (bids[card.instanceId] || 0) > 0;

                return (
                  <div
                    key={card.instanceId}
                    style={{
                      backgroundColor: hasBid ? '#26221C' : '#1C1915',
                      border: hasBid ? '2px solid #B9975B' : '1px solid #4A4234',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '3px 3px 0 #000',
                      position: 'relative',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <b style={{
                          fontSize: '1.05em',
                          color: '#E9DFC8',
                          fontFamily: '"Shippori Mincho B1", serif',
                        }}>
                          {def.name}
                        </b>
                        <span style={{
                          fontSize: '0.7em',
                          padding: '1px 5px',
                          border: '1px solid #4A4234',
                          color: isStatus ? '#B9975B' : isHeal ? '#6B7F4E' : '#A79B7E',
                          backgroundColor: '#12100D',
                          whiteSpace: 'nowrap',
                        }}>
                          {isStatus ? '即時強化' : (CATEGORY_NAMES[def.category] || def.category)}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82em', color: '#A79B7E', marginBottom: '10px', lineHeight: '1.4' }}>
                        {formatCardDescription(def.description, myPlayer)}
                      </div>
                    </div>

                    <div style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid #26221C',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.85em', color: '#A79B7E', fontFamily: '"IBM Plex Mono", monospace' }}>
                          入札:
                        </span>
                        <input
                          type="number"
                          min="0"
                          max={Math.max(0, myG - totalShopCost)}
                          value={bids[card.instanceId] || ''}
                          placeholder="0"
                          onChange={(e) => handleBidChange(card.instanceId, e.target.value)}
                          style={{
                            width: '74px',
                            padding: '4px 8px',
                            fontFamily: '"IBM Plex Mono", monospace',
                            fontWeight: 700,
                            color: '#B9975B',
                            fontSize: '0.95em',
                          }}
                        />
                        <button
                          onClick={() => handleBidChange(card.instanceId, `${(bids[card.instanceId] || 0) + 1}`)}
                          className="btn-normal"
                          style={{ padding: '3px 8px', fontSize: '0.8em', fontFamily: '"IBM Plex Mono", monospace' }}
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleBidChange(card.instanceId, `${(bids[card.instanceId] || 0) + 5}`)}
                          className="btn-normal"
                          style={{ padding: '3px 8px', fontSize: '0.8em', fontFamily: '"IBM Plex Mono", monospace' }}
                        >
                          +5
                        </button>
                      </div>
                      {isJuggernaut && isHeal && (bids[card.instanceId] || 0) > 0 && (
                        <div style={{ fontSize: '0.75em', color: '#B9975B', marginTop: '4px', fontFamily: '"IBM Plex Mono", monospace' }}>
                          実効入札額: {Math.floor((bids[card.instanceId] || 0) * 1.25)}G
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. 確定ボタン・何もしないボタン */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '14px',
            marginTop: '16px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            <button
              onClick={handleDoNothing}
              className="btn-sub"
              style={{
                fontSize: '0.9em',
                padding: '8px 16px',
              }}
            >
              何もしない (パス)
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
              style={{
                padding: '12px 28px',
                fontSize: '1em',
              }}
            >
              入札・購入を確定する (合計: {totalExpense}G / 残り: {remainingG}G)
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.8em', color: '#A79B7E', marginTop: '10px' }}>
            ※ 確定ボタンを押さなくても、時間切れ時は現在選択・入力している内容で自動的に入札されます。全員が確定すると直ちに次のフェーズへ進みます。
          </div>
        </>
      )}
    </div>
  );
};
