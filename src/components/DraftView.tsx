import React, { useState, useEffect, useRef } from 'react';
import type { DraftCard, DraftBid, PublicPlayerInfo } from '../types/game';
import { CARD_DEFINITIONS, formatCardDescription } from '../data/cards';
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

  const bidsRef = useRef(bids);
  bidsRef.current = bids;
  const uniquePurchasesRef = useRef(uniquePurchases);
  uniquePurchasesRef.current = uniquePurchases;
  const isSubmittedRef = useRef(isSubmitted);
  isSubmittedRef.current = isSubmitted;
  const isFirstMount = useRef(true);

  // カウントダウンタイマー
  useEffect(() => {
    const updateTimer = () => {
      if (!phaseDeadline) return;
      const remaining = Math.max(0, Math.ceil((phaseDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !isSubmittedRef.current) {
        // タイムアウト時は現在の入札・購入で自動提出
        handleSubmit();
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [phaseDeadline]);

  // 入札・購入内容が変更されたら、未確定入札（下書き）としてホストに自動同期
  useEffect(() => {
    if (isSubmitted) return;
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const flattenedPurchases: string[] = [];
    for (const [cardId, count] of Object.entries(uniquePurchases)) {
      for (let i = 0; i < count; i++) {
        flattenedPurchases.push(cardId);
      }
    }

    onSubmitBid({
      playerId: myId,
      bids,
      uniquePurchases: flattenedPurchases,
      isConfirmed: false,
    });
  }, [bids, uniquePurchases, isSubmitted, myId, onSubmitBid]);

  const totalBid = Object.values(bids).reduce((sum, val) => sum + (val || 0), 0);
  const totalShopCost = Object.entries(uniquePurchases).reduce((sum, [cardId, count]) => {
    return sum + getUniqueCardPrice(cardId) * count;
  }, 0);
  const totalExpense = totalBid + totalShopCost;
  const remainingG = myG - totalExpense;
  const isJuggernaut = roleId === 'juggernaut';

  const myRole = roleId ? ROLE_DEFINITIONS[roleId] : null;
  const uniqueCardIds = myRole ? [myRole.uniqueCardAId, myRole.uniqueCardBId] : [];

  const handleBidChange = (instanceId: string, valueStr: string) => {
    if (isSubmitted) return;
    const value = parseInt(valueStr, 10) || 0;
    const currentOtherBids = totalBid - (bids[instanceId] || 0);
    const maxPossible = Math.max(0, myG - totalShopCost - currentOtherBids);

    if (value < 0) return;
    if (value > maxPossible) {
      setBids(prev => ({ ...prev, [instanceId]: maxPossible }));
    } else {
      setBids(prev => ({ ...prev, [instanceId]: value }));
    }
  };

  const handleUniquePurchaseChange = (cardId: string, delta: number) => {
    if (isSubmitted) return;
    const currentCount = uniquePurchases[cardId] || 0;
    const newCount = currentCount + delta;
    if (newCount < 0) return;

    const price = getUniqueCardPrice(cardId);
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

  const handleDoNothing = () => {
    if (isSubmittedRef.current) return;
    setIsSubmitted(true);
    isSubmittedRef.current = true;

    onSubmitBid({
      playerId: myId,
      bids: {},
      uniquePurchases: [],
      isConfirmed: true,
    });
  };

  const handleSubmit = () => {
    if (isSubmittedRef.current) return;
    setIsSubmitted(true);
    isSubmittedRef.current = true;

    const flattenedPurchases: string[] = [];
    for (const [cardId, count] of Object.entries(uniquePurchasesRef.current)) {
      for (let i = 0; i < count; i++) {
        flattenedPurchases.push(cardId);
      }
    }

    onSubmitBid({
      playerId: myId,
      bids: bidsRef.current,
      uniquePurchases: flattenedPurchases,
      isConfirmed: true,
    });
  };

  return (
    <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
      {/* フェーズヘッダー */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3em' }}>💰 ドラフト＆ショップフェーズ</h2>
          <div style={{ fontSize: '0.9em', color: '#94a3b8' }}>
            ドラフトカードへの入札と、自身のユニークカードの購入を行えます。
          </div>
          {isJuggernaut && (
            <div style={{ fontSize: '0.85em', color: '#38bdf8', marginTop: '2px' }}>
              ★ジャガーノートパッシブ: 回復カードへの入札は1.25倍として扱われます！
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: timeLeft <= 10 ? '#ef4444' : '#facc15' }}>
            ⏱ 残り: {timeLeft} 秒
          </div>
          <div style={{ fontSize: '0.95em', marginTop: '4px' }}>
            所持: <b>{myG}G</b> | 入札: <b style={{ color: '#f87171' }}>{totalBid}G</b> | ショップ: <b style={{ color: '#a855f7' }}>{totalShopCost}G</b> | 残: <b style={{ color: '#4ade80' }}>{remainingG}G</b>
          </div>
        </div>
      </div>

      {isSubmitted ? (
        <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
          <div style={{ fontSize: '1.2em', color: '#4ade80', fontWeight: 'bold' }}>
            入札・購入を提出しました！
          </div>
          <div style={{ color: '#94a3b8', marginTop: '6px' }}>
            他のプレイヤーの完了または時間切れを待っています...
          </div>
        </div>
      ) : (
        <>
          {/* 1. ユニークカードショップ欄 */}
          <div style={{ marginBottom: '24px', backgroundColor: '#0f172a', padding: '14px', borderRadius: '8px', border: '1px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <span style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#818cf8' }}>🛒 ユニークカードショップ</span>
                <span style={{ fontSize: '0.8em', color: '#94a3b8', marginLeft: '8px' }}>
                  （自ロール専用カード・定額購入・購入履歴は全体ログ非公開）
                </span>
              </div>
              <div style={{ fontSize: '0.9em', color: '#c7d2fe' }}>
                ショップ小計: <b>{totalShopCost}G</b>
              </div>
            </div>

            {uniqueCardIds.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: '0.9em' }}>購入可能なユニークカードがありません。</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
                {uniqueCardIds.map((cardId) => {
                  const def = CARD_DEFINITIONS[cardId];
                  if (!def) return null;
                  const price = getUniqueCardPrice(cardId);
                  const count = uniquePurchases[cardId] || 0;
                  const isUniqueA = def.category === 'UNIQUE_A';
                  const canBuy = remainingG >= price;

                  return (
                    <div
                      key={cardId}
                      style={{
                        backgroundColor: '#1e293b',
                        border: count > 0 ? '2px solid #818cf8' : '1px solid #475569',
                        borderRadius: '6px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <b style={{ fontSize: '1.05em', color: '#f8fafc' }}>{def.name}</b>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {def.priority === 'HIGH' && (
                              <span style={{ fontSize: '0.7em', padding: '1px 5px', borderRadius: '3px', backgroundColor: '#e11d48', color: '#fff' }}>
                                優先度:高
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '0.7em',
                                padding: '1px 5px',
                                borderRadius: '3px',
                                backgroundColor: isUniqueA ? '#4338ca' : '#6d28d9',
                                color: '#fff',
                              }}
                            >
                              {isUniqueA ? 'ユニークA' : 'ユニークB'} ({price}G)
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#cbd5e1', marginBottom: '8px' }}>
                          {formatCardDescription(def.description, myPlayer)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '8px', marginTop: '4px' }}>
                        <div style={{ fontSize: '0.9em', color: '#e2e8f0' }}>
                          単価: <b style={{ color: '#facc15' }}>{price}G</b>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleUniquePurchaseChange(cardId, -1)}
                            disabled={count <= 0}
                            style={{
                              padding: '2px 10px',
                              borderRadius: '4px',
                              cursor: count > 0 ? 'pointer' : 'not-allowed',
                              backgroundColor: count > 0 ? '#475569' : '#334155',
                              color: '#fff',
                              border: 'none',
                              fontWeight: 'bold',
                            }}
                          >
                            -
                          </button>
                          <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.05em', color: count > 0 ? '#818cf8' : '#94a3b8' }}>
                            {count}
                          </span>
                          <button
                            onClick={() => handleUniquePurchaseChange(cardId, 1)}
                            disabled={!canBuy}
                            style={{
                              padding: '2px 10px',
                              borderRadius: '4px',
                              cursor: canBuy ? 'pointer' : 'not-allowed',
                              backgroundColor: canBuy ? '#6366f1' : '#334155',
                              color: '#fff',
                              border: 'none',
                              fontWeight: 'bold',
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

          {/* 2. ドラフトプール一覧 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '1.1em', color: '#e2e8f0' }}>
              🎲 ドラフトプール（入札オークション）
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
              {draftPool.map((card) => {
                const def = CARD_DEFINITIONS[card.cardId];
                if (!def) return null;
                const isHeal = def.category === 'HEAL' || def.id === 'draft_heal_powder';
                const isStatus = !!def.statusBonus;

                return (
                  <div
                    key={card.instanceId}
                    style={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <b style={{ fontSize: '1.05em' }}>{def.name}</b>
                        <span
                          style={{
                            fontSize: '0.75em',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isStatus ? '#0284c7' : isHeal ? '#16a34a' : '#7c3aed',
                          }}
                        >
                          {isStatus ? '即時ステータス' : def.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85em', color: '#cbd5e1', marginBottom: '8px' }}>
                        {formatCardDescription(def.description, myPlayer)}
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9em' }}>入札G:</span>
                        <input
                          type="number"
                          min="0"
                          max={Math.max(0, myG - totalShopCost)}
                          value={bids[card.instanceId] || ''}
                          placeholder="0"
                          onChange={(e) => handleBidChange(card.instanceId, e.target.value)}
                          style={{
                            width: '70px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #64748b',
                            backgroundColor: '#1e293b',
                            color: '#fff',
                            fontWeight: 'bold',
                          }}
                        />
                        <button
                          onClick={() => handleBidChange(card.instanceId, `${(bids[card.instanceId] || 0) + 1}`)}
                          style={{ padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleBidChange(card.instanceId, `${(bids[card.instanceId] || 0) + 5}`)}
                          style={{ padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          +5
                        </button>
                      </div>
                      {isJuggernaut && isHeal && (bids[card.instanceId] || 0) > 0 && (
                        <div style={{ fontSize: '0.75em', color: '#38bdf8', marginTop: '4px' }}>
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
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px', alignItems: 'center' }}>
            <button
              onClick={handleDoNothing}
              style={{
                padding: '12px 24px',
                fontSize: '1.05em',
                borderRadius: '6px',
                backgroundColor: '#334155',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              何もしない (パス)
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: '12px 32px',
                fontSize: '1.05em',
                fontWeight: 'bold',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              入札・購入を確定する (合計: {totalExpense}G / 残り: {remainingG}G)
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.85em', color: '#94a3b8', marginTop: '8px' }}>
            ※確定ボタンを押さなくても、時間切れ時は現在選択・入力している内容で自動的に入札されます。全員が確定すると直ちに次のフェーズへ進みます。
          </div>
        </>
      )}
    </div>
  );
};
