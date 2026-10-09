import React, { useState, useEffect } from 'react';
import type { CardInstance, PlayerAction, PublicPlayerInfo } from '../types/game';
import { CARD_DEFINITIONS, formatCardDescription } from '../data/cards';

interface Props {
  hand: CardInstance[];
  players: { [id: string]: PublicPlayerInfo };
  myId: string;
  roleId: string | null;
  phaseDeadline: number | null;
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
  selectedTargetId,
  onSubmitAction,
}) => {
  const [selectedCardInstanceId, setSelectedCardInstanceId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(60);

  // カウントダウンタイマー
  useEffect(() => {
    const updateTimer = () => {
      if (!phaseDeadline) return;
      const remaining = Math.max(0, Math.ceil((phaseDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0 && !isSubmitted) {
        // タイムアウト時は何もしないで自動提出
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
  const requiresEnemyTarget = cardDef && cardDef.targetType === 'SINGLE_ENEMY';

  const handleCardClick = (instanceId: string) => {
    if (isSubmitted) return;
    setSelectedCardInstanceId(prev => (prev === instanceId ? null : instanceId));
  };

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
      alert('対象のプレイヤーを選択してください。上のプレイヤー一覧をクリックして選択できます。');
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
      <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '8px', textAlign: 'center', border: '1px solid #334155' }}>
        <h3 style={{ color: '#facc15', margin: 0 }}>手札が0枚のため、このターンは自動でスキップされます</h3>
        <p style={{ color: '#94a3b8' }}>他のプレイヤーの行動完了をお待ちください。</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.3em' }}>⚔️ 行動選択フェーズ</h2>
          <div style={{ fontSize: '0.9em', color: '#94a3b8' }}>
            使用するカードと対象を選択してください。「何もしない」でカードを温存することも可能です。
          </div>
          {isSpeedstar && (
            <div style={{ fontSize: '0.85em', color: '#38bdf8', marginTop: '2px' }}>
              ★スピードスターパッシブ: 優先度「高」のカードを使うと2回連続発動！
            </div>
          )}
        </div>
        <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: timeLeft <= 10 ? '#ef4444' : '#facc15' }}>
          ⏱ 残り: {timeLeft} 秒
        </div>
      </div>

      {isSubmitted ? (
        <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#0f172a', borderRadius: '6px' }}>
          <div style={{ fontSize: '1.2em', color: '#4ade80', fontWeight: 'bold' }}>
            行動を確定しました！
          </div>
          <div style={{ color: '#94a3b8', marginTop: '6px' }}>
            他のプレイヤーの選択を待っています...
          </div>
        </div>
      ) : (
        <>
          {/* 手札一覧 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            {hand.map((item) => {
              const def = CARD_DEFINITIONS[item.cardId];
              if (!def) return null;
              const isSelected = selectedCardInstanceId === item.instanceId;

              return (
                <div
                  key={item.instanceId}
                  onClick={() => handleCardClick(item.instanceId)}
                  style={{
                    backgroundColor: isSelected ? '#1e3a8a' : '#0f172a',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid #475569',
                    borderRadius: '8px',
                    padding: '10px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 0 10px rgba(59, 130, 246, 0.5)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <b style={{ fontSize: '0.95em' }}>{def.name}</b>
                      {def.priority === 'HIGH' && (
                        <span style={{ fontSize: '0.7em', backgroundColor: '#dc2626', padding: '2px 4px', borderRadius: '3px' }}>
                          優先度: 高
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8em', color: '#cbd5e1' }}>
                      {formatCardDescription(def.description, players[myId])}
                    </div>
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.75em', color: '#94a3b8' }}>
                    対象: {def.targetType === 'SINGLE_ENEMY' ? '敵1体' : '自身'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 対象プレイヤー指定案内 */}
          {requiresEnemyTarget && (
            <div style={{
              backgroundColor: selectedTargetId ? '#064e3b' : '#7f1d1d',
              padding: '8px 12px',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '0.9em',
            }}>
              {selectedTargetId ? (
                <span>ターゲット: <b>{players[selectedTargetId]?.name}</b> が選択されています。</span>
              ) : (
                <span>⚠️ 攻撃対象を選択してください（上のプレイヤー一覧から対象をクリック）。</span>
              )}
            </div>
          )}

          {/* 決定ボタン・何もしないボタン */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <button
              onClick={handleDoNothing}
              style={{
                padding: '10px 20px',
                borderRadius: '6px',
                backgroundColor: '#334155',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              何もしない (温存)
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedCardInstanceId}
              style={{
                padding: '10px 24px',
                borderRadius: '6px',
                backgroundColor: selectedCardInstanceId ? '#2563eb' : '#1e3a8a',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                cursor: selectedCardInstanceId ? 'pointer' : 'not-allowed',
                opacity: selectedCardInstanceId ? 1 : 0.6,
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
