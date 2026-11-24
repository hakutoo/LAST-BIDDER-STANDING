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
      <div style={{
        backgroundColor: '#1C1915',
        padding: '16px',
        textAlign: 'center',
        border: '1px solid #4A4234',
        boxShadow: '3px 3px 0 #000',
      }}>
        <h3 style={{
          color: '#B9975B',
          margin: '0 0 6px 0',
          fontSize: '1.05em',
          fontFamily: '"Shippori Mincho B1", serif',
        }}>
          手札が0枚のため、このターンは自動でスキップされます
        </h3>
        <p style={{ color: '#A79B7E', margin: 0, fontSize: '0.85em' }}>
          他のプレイヤーの行動完了をお待ちください。
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1C1915',
      padding: '12px 16px',
      border: '1px solid #4A4234',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: '3px 3px 0 #000',
    }}>
      {/* 上部ヘッダー（残り時間・パッシブ） */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontWeight: 700,
              fontSize: '1.05em',
              color: '#E9DFC8',
              fontFamily: '"Shippori Mincho B1", serif',
            }}>
              行動選択
            </span>
            {isSpeedstar && (
              <span style={{
                fontSize: '0.72em',
                color: '#B9975B',
                backgroundColor: '#12100D',
                border: '1px solid #4A4234',
                padding: '1px 6px',
                fontFamily: '"IBM Plex Mono", monospace',
              }}>
                [特性] スピードスター: 優先度「高」が2連発！
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78em', color: '#A79B7E' }}>
            画面下の「手札」からカードを選んで決定、または温存できます
          </div>
        </div>
        <div style={{
          fontSize: '1.15em',
          fontWeight: 700,
          color: timeLeft <= 10 ? '#B3352B' : '#B9975B',
          fontFamily: '"IBM Plex Mono", monospace',
          whiteSpace: 'nowrap',
        }}>
          残り時間: {timeLeft}s
        </div>
      </div>

      {isSubmitted ? (
        <div style={{
          textAlign: 'center',
          padding: '16px',
          backgroundColor: '#12100D',
          border: '1px solid #4A4234',
        }}>
          <div style={{
            fontSize: '1.05em',
            color: '#B9975B',
            fontWeight: 700,
            fontFamily: '"Shippori Mincho B1", serif',
          }}>
            行動を確定しました
          </div>
          <div style={{ color: '#A79B7E', fontSize: '0.82em', marginTop: '4px' }}>
            他のプレイヤーの選択を待っています...
          </div>
        </div>
      ) : (
        <>
          {/* 選択中カードのステータス表示 */}
          <div
            style={{
              backgroundColor: selectedCard ? '#26221C' : '#12100D',
              border: selectedCard ? '1px solid #B9975B' : '1px dashed #4A4234',
              padding: '10px 12px',
            }}
          >
            {selectedCard && cardDef ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75em', color: '#A79B7E' }}>選択中:</span>
                    <b style={{ color: '#B9975B', fontSize: '1.05em', fontFamily: '"Shippori Mincho B1", serif' }}>
                      {cardDef.name}
                    </b>
                    {cardDef.priority === 'HIGH' && (
                      <span style={{
                        fontSize: '0.65em',
                        backgroundColor: '#B3352B',
                        color: '#E9DFC8',
                        padding: '1px 5px',
                        fontWeight: 700,
                      }}>
                        優先:高
                      </span>
                    )}
                    <span style={{ fontSize: '0.75em', color: '#A79B7E' }}>
                      ({cardDef.targetType === 'SINGLE_ENEMY' ? '敵1体' : '自身'})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82em', color: '#E9DFC8', marginTop: '4px', lineHeight: '1.4' }}>
                    {formatCardDescription(cardDef.description, players[myId])}
                  </div>
                </div>
                <button
                  onClick={() => onSelectCard(null)}
                  className="btn-sub"
                  style={{
                    fontSize: '0.78em',
                  }}
                >
                  選択解除
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.82em', color: '#A79B7E', textAlign: 'center', padding: '4px 0' }}>
                画面下の「手札」を選択してください
              </div>
            )}
          </div>

          {/* ターゲット指定インジケーター（敵対象カード選択時） */}
          {requiresEnemyTarget && (
            <div
              style={{
                backgroundColor: selectedTargetId ? 'rgba(185, 151, 91, 0.1)' : 'rgba(179, 53, 43, 0.1)',
                border: `1px solid ${selectedTargetId ? '#B9975B' : '#B3352B'}`,
                padding: '6px 12px',
                fontSize: '0.82em',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              {selectedTargetId ? (
                <span>対象: <b style={{ color: '#B9975B' }}>{players[selectedTargetId]?.name}</b> を選択中</span>
              ) : (
                <span style={{ color: '#B3352B', fontWeight: 700 }}>
                  ※ 上のプレイヤー盤面を選択して攻撃対象を指定してください
                </span>
              )}
            </div>
          )}

          {/* 決定・温存ボタンエリア */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '4px', alignItems: 'center' }}>
            <button
              onClick={handleDoNothing}
              className="btn-sub"
              style={{
                fontSize: '0.85em',
                padding: '6px 14px',
              }}
            >
              何もしない (温存)
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedCardInstanceId || (requiresEnemyTarget && !selectedTargetId)}
              className="btn-primary"
              style={{
                padding: '10px 24px',
                fontSize: '0.95em',
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
