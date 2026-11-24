import React from 'react';
import type { BattleEvent, PublicPlayerInfo } from '../types/game';
import { CARD_DEFINITIONS } from '../data/cards';
import { ROLE_DEFINITIONS } from '../data/roles';

interface Props {
  event: BattleEvent | null;
  players: { [id: string]: PublicPlayerInfo };
  isHost: boolean;
  onSkip?: () => void;
}

export const ActionResolutionView: React.FC<Props> = ({
  event,
  players,
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
          戦闘解決中...
        </div>
      </div>
    );
  }

  const actor = event.actorId ? players[event.actorId] : null;
  const target = event.targetId ? players[event.targetId] : null;
  const cardDef = event.cardId ? CARD_DEFINITIONS[event.cardId] : null;
  const actorRole = actor?.roleId ? ROLE_DEFINITIONS[actor.roleId] : null;
  const targetRole = target?.roleId ? ROLE_DEFINITIONS[target.roleId] : null;

  // テーマカラーとテキストタグ
  let badgeLabel = '[行動]';
  let isAccented = false;

  switch (event.type) {
    case 'ACTION_START':
      badgeLabel = '[開始]';
      break;
    case 'ATTACK_HIT':
      if (event.isCritical) {
        badgeLabel = '[会心]';
        isAccented = true;
      } else if (event.isCriticalAvoided) {
        badgeLabel = '[軽減]';
      } else {
        badgeLabel = '[命中]';
      }
      break;
    case 'ATTACK_EVADED':
      badgeLabel = '[回避]';
      break;
    case 'ATTACK_PARRIED':
      badgeLabel = '[受流]';
      break;
    case 'COUNTER_ATTACK':
      badgeLabel = '[反撃]';
      break;
    case 'HEAL':
      badgeLabel = '[回復]';
      break;
    case 'BUFF':
    case 'PASSIVE':
      badgeLabel = '[特性]';
      break;
    case 'STATUS_APPLIED':
    case 'POISON_DAMAGE':
      badgeLabel = '[毒害]';
      break;
    case 'DEATH':
      badgeLabel = '[脱落]';
      isAccented = true;
      break;
    case 'SUDDEN_DEATH':
      badgeLabel = '[急死]';
      isAccented = true;
      break;
    case 'EFFECT_EXPIRED':
      badgeLabel = '[終了]';
      break;
    case 'ACTION_WAIT':
      badgeLabel = '[待機]';
      break;
  }

  return (
    <div
      style={{
        backgroundColor: '#1C1915',
        border: `2px solid ${isAccented ? '#B3352B' : '#4A4234'}`,
        padding: '18px 20px',
        marginBottom: '16px',
        boxShadow: '4px 4px 0 #000',
        position: 'relative',
        animation: 'actionFadeIn 0.25s ease-out',
      }}
    >
      {/* ヘッダー: バッジとスキップボタン */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          borderBottom: '1px solid #4A4234',
          paddingBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              backgroundColor: isAccented ? '#B3352B' : '#26221C',
              color: '#E9DFC8',
              border: '1px solid #4A4234',
              padding: '2px 8px',
              fontSize: '0.8em',
              fontWeight: 700,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            {badgeLabel}
          </span>
          <span style={{
            fontSize: '0.9em',
            fontWeight: 700,
            color: '#E9DFC8',
            fontFamily: '"Shippori Mincho B1", serif',
          }}>
            {event.title}
          </span>
        </div>

        {isHost && onSkip && (
          <button
            onClick={onSkip}
            className="btn-normal"
            style={{
              padding: '3px 10px',
              fontSize: '0.8em',
            }}
            title="残りの演出をスキップして即時確定します"
          >
            演出スキップ
          </button>
        )}
      </div>

      {/* メインステージ（アクター ➔ 結果 ➔ ターゲット） */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          margin: '12px 0 16px 0',
          flexWrap: 'wrap',
        }}
      >
        {/* 行動者 (Actor) */}
        {actor && (
          <div
            style={{
              backgroundColor: '#12100D',
              border: '1px solid #4A4234',
              padding: '10px 16px',
              minWidth: '150px',
              textAlign: 'center',
              boxShadow: '2px 2px 0 #000',
            }}
          >
            <div style={{ fontSize: '0.72em', color: '#A79B7E', marginBottom: '2px' }}>
              行動者
            </div>
            <div style={{ fontWeight: 700, fontSize: '1em', color: '#E9DFC8' }}>
              {actor.name}
            </div>
            {actorRole && (
              <div style={{ fontSize: '0.72em', color: '#B9975B', marginTop: '2px' }}>
                {actorRole.name}
              </div>
            )}
            {cardDef && (
              <div
                style={{
                  marginTop: '6px',
                  backgroundColor: '#1C1915',
                  padding: '3px 8px',
                  fontSize: '0.8em',
                  color: '#B9975B',
                  fontWeight: 700,
                  border: '1px solid #4A4234',
                  fontFamily: '"Shippori Mincho B1", serif',
                }}
              >
                {cardDef.name}
              </div>
            )}
          </div>
        )}

        {/* 矢印 */}
        {actor && target && actor.id !== target.id && (
          <div
            style={{
              fontSize: '1.4em',
              color: '#B9975B',
              fontWeight: 700,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            ➔
          </div>
        )}

        {/* 対象 (Target) */}
        {target && target.id !== actor?.id && (
          <div
            style={{
              backgroundColor: '#12100D',
              border: '1px solid #4A4234',
              padding: '10px 16px',
              minWidth: '150px',
              textAlign: 'center',
              boxShadow: '2px 2px 0 #000',
            }}
          >
            <div style={{ fontSize: '0.72em', color: '#A79B7E', marginBottom: '2px' }}>
              対象
            </div>
            <div style={{ fontWeight: 700, fontSize: '1em', color: '#E9DFC8' }}>
              {target.name}
            </div>
            {targetRole && (
              <div style={{ fontSize: '0.72em', color: '#A79B7E', marginTop: '2px' }}>
                {targetRole.name}
              </div>
            )}
            <div style={{
              fontSize: '0.75em',
              color: '#A79B7E',
              marginTop: '6px',
              fontFamily: '"IBM Plex Mono", monospace',
            }}>
              HP: {target.hp}/{target.maxHp}
              {target.sld > 0 && <span style={{ color: '#B9975B' }}> (SLD: {target.sld})</span>}
            </div>
          </div>
        )}
      </div>

      {/* 特大数値・演出表示（ダメージ、回復、MISS等） */}
      <div style={{ textAlign: 'center', marginTop: '6px' }}>
        {event.damage !== undefined && (
          <div
            style={{
              fontSize: event.isCritical ? '2.2em' : '1.9em',
              fontWeight: 700,
              color: event.isCritical ? '#B9975B' : '#B3352B',
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: '1px',
            }}
          >
            {event.isCritical && 'CRITICAL! '}
            -{event.damage} DAMAGE
            {event.sldDamage ? (
              <span style={{ fontSize: '0.55em', color: '#B9975B', marginLeft: '8px' }}>
                (SLD: -{event.sldDamage}, HP: -{event.hpDamage})
              </span>
            ) : null}
          </div>
        )}

        {event.healAmount !== undefined && (
          <div
            style={{
              fontSize: '1.9em',
              fontWeight: 700,
              color: '#6B7F4E',
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            +{event.healAmount} HEAL!
          </div>
        )}

        {/* 詳細メッセージ */}
        <div
          style={{
            fontSize: '0.95em',
            color: '#E9DFC8',
            marginTop: '8px',
            backgroundColor: '#12100D',
            border: '1px solid #4A4234',
            padding: '8px 16px',
            display: 'inline-block',
            maxWidth: '90%',
            lineHeight: 1.4,
            boxShadow: '2px 2px 0 #000',
          }}
        >
          {event.description}
        </div>
      </div>
    </div>
  );
};
