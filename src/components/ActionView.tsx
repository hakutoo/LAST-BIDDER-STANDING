import React, { useState, useEffect } from 'react';
import type { CardInstance, PlayerAction, PublicPlayerInfo } from '../types/game';
import { CARD_DEFINITIONS, formatCardDescription } from '../data/cards';

interface Props {
  hand: CardInstance[];
  players: { [id: string]: PublicPlayerInfo };
  myId: string;
  roleId: string | null;
  phaseDeadline: number | null;
  selectedCardInstanceId: string | null;
  onSelectCard: (instanceId: string | null) => void;
  selectedTargetId: string | null;
  onSelectTarget: (id: string) => void;
  onSubmitAction: (action: PlayerAction) => void;
}

export const ActionView: React.FC<Props> = ({
  hand,
  players,
  myId,
  roleId,
  phaseDeadline,
  selectedCardInstanceId,
  onSelectCard,
  selectedTargetId,
  onSubmitAction,
}) => {
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  // カウントダウンタイマー
  useEffect(() => {
    const updateTimer = () => {
      if (!phaseDeadline) return;
      const remaining = Math.max(0, Math.ceil((phaseDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !isSubmitted) {
        handleSubmitTimeout();
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [phaseDeadline, isSubmitted, selectedCardInstanceId, selectedTargetId]);

  const handleSubmitTimeout = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    onSubmitAction({
      playerId: myId,
      cardInstanceId: null,
      targetPlayerId: null,
    });
  };

  const selectedCard = hand.find(c => c.instanceId === selectedCardInstanceId);
  const cardDef = selectedCard ? CARD_DEFINITIONS[selectedCard.cardId] : null;
  const isSpeedstar = roleId === 'speedstar';

  // ターゲットが必要かどうか
  const requiresEnemyTarget = Boolean(cardDef && cardDef.targetType === 'SINGLE_ENEMY');

  const handleDoNothing = () => {
    if (isSubmitted) return;
    setIsSubmitted(true);
    onSubmitAction({
      playerId: myId,
      cardInstanceId: null,
      targetPlayerId: null,
    });
  };

  const handleSubmit = () => {
    if (isSubmitted) return;

    if (!selectedCardInstanceId) {
      alert('カードを選択するか、「何もしない」を選んでください。');
      return;
    }

    if (requiresEnemyTarget && !selectedTargetId) {
      alert('対象のプレイヤーを選択してください。上のプレイヤー盤面をタップして選択できます。');
      return;
    }

    setIsSubmitted(true);
    onSubmitAction({
      playerId: myId,
      cardInstanceId: selectedCardInstanceId,
      targetPlayerId: requiresEnemyTarget ? selectedTargetId : myId,
    });
  };

  if (hand.length === 0) {
    return (
      <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
        <h3 style={{ color: '#facc15', margin: '0 0 6px 0', fontSize: '1.1em' }}>手札が0枚のため、このターンは自動でスキップされます</h3>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85em' }}>他のプレイヤーの行動完了をお待ちください。</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#1e293b', padding: '12px 14px', borderRadius: '8px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* 上部ヘッダー（残り時間・パッシブ） */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.05em', color: '#f8fafc' }}>⚔️ 行動選択</span>
            {isSpeedstar && (
              <span style={{ fontSize: '0.75em', color: '#38bdf8', backgroundColor: '#0f172a', padding: '2px 6px', borderRadius: '4px' }}>
                ★スピードスター: 優先度「高」が2連発！
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>
            下の【手札】からカードを選んで決定、または温存できます
          </div>
        </div>
        <div style={{ fontSize: '1.1em', fontWeight: 'bold', color: timeLeft <= 10 ? '#ef4444' : '#facc15', whiteSpace: 'nowrap' }}>
          ⏱ {timeLeft}s
        </div>
      </div>

      {isSubmitted ? (
        <div style={{ textAlign: 'center', padding: '16px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
          <div style={{ fontSize: '1.1em', color: '#4ade80', fontWeight: 'bold' }}>
            ✓ 行動を確定しました！
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.85em', marginTop: '4px' }}>
            他のプレイヤーの選択を待っています...
          </div>
        </div>
      ) : (
        <>
          {/* 選択中カードのステータス表示 */}
          <div
            style={{
              backgroundColor: selectedCard ? '#1e3a8a22' : '#0f172a',
              border: selectedCard ? '1px solid #3b82f6' : '1px dashed #475569',
              borderRadius: '6px',
              padding: '8px 12px',
            }}
          >
            {selectedCard && cardDef ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75em', color: '#94a3b8' }}>選択中:</span>
                    <b style={{ color: '#38bdf8', fontSize: '1em' }}>{cardDef.name}</b>
                    {cardDef.priority === 'HIGH' && (
                      <span style={{ fontSize: '0.65em', backgroundColor: '#dc2626', color: '#fff', padding: '1px 4px', borderRadius: '3px' }}>
                        優先度:高
                      </span>
                    )}
                    <span style={{ fontSize: '0.75em', color: '#cbd5e1' }}>
                      ({cardDef.targetType === 'SINGLE_ENEMY' ? '敵1体' : '自身'})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#cbd5e1', marginTop: '2px' }}>
                    {formatCardDescription(cardDef.description, players[myId])}
                  </div>
                </div>
                <button
                  onClick={() => onSelectCard(null)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#334155',
                    color: '#cbd5e1',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.75em',
                  }}
                >
                  選択解除
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.85em', color: '#94a3b8', textAlign: 'center', padding: '4px 0' }}>
                👇 画面下の <b>手札</b> をタップしてカードを選んでください
              </div>
            )}
          </div>

          {/* ターゲット指定インジケーター（敵対象カード選択時） */}
          {requiresEnemyTarget && (
            <div
              style={{
                backgroundColor: selectedTargetId ? '#064e3b33' : '#7f1d1d33',
                border: `1px solid ${selectedTargetId ? '#059669' : '#dc2626'}`,
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.85em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {selectedTargetId ? (
                <span>🎯 対象: <b style={{ color: '#4ade80' }}>{players[selectedTargetId]?.name}</b> を選択中</span>
              ) : (
                <span style={{ color: '#fca5a5' }}>⚠️ 上のプレイヤー盤面をタップして攻撃対象を選択してください</span>
              )}
            </div>
          )}

          {/* 決定・温存ボタンエリア */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '2px' }}>
            <button
              onClick={handleDoNothing}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: '#334155',
                color: '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85em',
                fontWeight: 'bold',
              }}
            >
              何もしない (温存)
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedCardInstanceId || (requiresEnemyTarget && !selectedTargetId)}
              style={{
                padding: '8px 24px',
                borderRadius: '6px',
                backgroundColor:
                  selectedCardInstanceId && (!requiresEnemyTarget || selectedTargetId)
                    ? '#2563eb'
                    : '#1e3a8a',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                cursor:
                  selectedCardInstanceId && (!requiresEnemyTarget || selectedTargetId)
                    ? 'pointer'
                    : 'not-allowed',
                opacity:
                  selectedCardInstanceId && (!requiresEnemyTarget || selectedTargetId)
                    ? 1
                    : 0.5,
                fontSize: '0.9em',
                boxShadow:
                  selectedCardInstanceId && (!requiresEnemyTarget || selectedTargetId)
                    ? '0 0 10px rgba(37, 99, 235, 0.6)'
                    : 'none',
              }}
            >
              行動を確定する
            </button>
          </div>
        </>
      )}
    </div>
  );
};
