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
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ fontSize: '1.2em', color: '#94a3b8', fontStyle: 'italic' }}>
          ⚔️ バトルを解決中...
        </div>
      </div>
    );
  }

  const actor = event.actorId ? players[event.actorId] : null;
  const target = event.targetId ? players[event.targetId] : null;
  const cardDef = event.cardId ? CARD_DEFINITIONS[event.cardId] : null;
  const actorRole = actor?.roleId ? ROLE_DEFINITIONS[actor.roleId] : null;
  const targetRole = target?.roleId ? ROLE_DEFINITIONS[target.roleId] : null;

  // テーマカラーとアイコン
  let badgeColor = '#64748b';
  let badgeIcon = '⚔️';
  let highlightBorder = '#3b82f6';

  switch (event.type) {
    case 'ACTION_START':
      badgeColor = '#3b82f6';
      badgeIcon = '🃏';
      highlightBorder = '#60a5fa';
      break;
    case 'ATTACK_HIT':
      if (event.isCritical) {
        badgeColor = '#f59e0b';
        badgeIcon = '⚡';
        highlightBorder = '#fbbf24';
      } else {
        badgeColor = '#ef4444';
        badgeIcon = '💥';
        highlightBorder = '#f87171';
      }
      break;
    case 'ATTACK_EVADED':
      badgeColor = '#06b6d4';
      badgeIcon = '💨';
      highlightBorder = '#22d3ee';
      break;
    case 'ATTACK_PARRIED':
      badgeColor = '#6366f1';
      badgeIcon = '🛡️';
      highlightBorder = '#818cf8';
      break;
    case 'COUNTER_ATTACK':
      badgeColor = '#ec4899';
      badgeIcon = '🗡️';
      highlightBorder = '#f472b6';
      break;
    case 'HEAL':
      badgeColor = '#10b981';
      badgeIcon = '💖';
      highlightBorder = '#34d399';
      break;
    case 'BUFF':
    case 'PASSIVE':
      badgeColor = '#8b5cf6';
      badgeIcon = '✨';
      highlightBorder = '#a78bfa';
      break;
    case 'STATUS_APPLIED':
    case 'POISON_DAMAGE':
      badgeColor = '#9333ea';
      badgeIcon = '🟣';
      highlightBorder = '#c084fc';
      break;
    case 'DEATH':
      badgeColor = '#dc2626';
      badgeIcon = '💀';
      highlightBorder = '#ef4444';
      break;
    case 'SUDDEN_DEATH':
      badgeColor = '#ea580c';
      badgeIcon = '🔥';
      highlightBorder = '#fb923c';
      break;
    case 'EFFECT_EXPIRED':
      badgeColor = '#475569';
      badgeIcon = '⏳';
      highlightBorder = '#64748b';
      break;
    case 'ACTION_WAIT':
      badgeColor = '#64748b';
      badgeIcon = '💤';
      highlightBorder = '#94a3b8';
      break;
  }

  return (
    <div
      style={{
        backgroundColor: '#090d16',
        backgroundImage: 'linear-gradient(135deg, #090d16 0%, #131d2e 100%)',
        border: `2px solid ${highlightBorder}`,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: `0 0 25px ${highlightBorder}33`,
        position: 'relative',
        overflow: 'hidden',
        animation: 'actionFadeIn 0.25s ease-out',
      }}
    >
      {/* 背景のグロー演出 */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: `radial-gradient(circle, ${highlightBorder}15 0%, transparent 60%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ヘッダー: バッジとスキップボタン */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: badgeColor,
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '0.85em',
            fontWeight: 'bold',
            boxShadow: `0 2px 8px ${badgeColor}66`,
            letterSpacing: '0.5px',
          }}
        >
          <span>{badgeIcon}</span>
          <span>{event.title}</span>
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
            title="残りの演出をスキップして即時確定します"
          >
            ⏭️ 演出スキップ
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
          position: 'relative',
          zIndex: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* 行動者 (Actor) */}
        {actor && (
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '10px 16px',
              minWidth: '150px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '0.75em', color: '#94a3b8', marginBottom: '2px' }}>
              行動者
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '1.05em', color: '#f8fafc' }}>
              {actor.name}
            </div>
            {actorRole && (
              <div style={{ fontSize: '0.75em', color: '#38bdf8', marginTop: '2px' }}>
                {actorRole.name}
              </div>
            )}
            {cardDef && (
              <div
                style={{
                  marginTop: '6px',
                  backgroundColor: '#0f172a',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  color: '#fbbf24',
                  fontWeight: 'bold',
                  border: '1px solid #334155',
                }}
              >
                🃏 {cardDef.name}
              </div>
            )}
          </div>
        )}

        {/* 矢印 / アクションアイコン */}
        {actor && target && actor.id !== target.id && (
          <div
            style={{
              fontSize: '1.8em',
              color: highlightBorder,
              fontWeight: 'bold',
              textShadow: `0 0 10px ${highlightBorder}`,
              animation: 'actionPulse 1s infinite alternate',
            }}
          >
            ➔
          </div>
        )}

        {/* 対象 (Target) */}
        {target && target.id !== actor?.id && (
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '10px 16px',
              minWidth: '150px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: '0.75em', color: '#94a3b8', marginBottom: '2px' }}>
              対象
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '1.05em', color: '#f8fafc' }}>
              {target.name}
            </div>
            {targetRole && (
              <div style={{ fontSize: '0.75em', color: '#f43f5e', marginTop: '2px' }}>
                {targetRole.name}
              </div>
            )}
            <div style={{ fontSize: '0.75em', color: '#94a3b8', marginTop: '6px' }}>
              HP: {target.hp}/{target.maxHp}
              {target.sld > 0 && <span style={{ color: '#38bdf8' }}> (SLD: {target.sld})</span>}
            </div>
          </div>
        )}
      </div>

      {/* 特大数値・演出表示（ダメージ、回復、MISS等） */}
      <div
        style={{
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          marginTop: '8px',
        }}
      >
        {event.damage !== undefined && (
          <div
            style={{
              fontSize: event.isCritical ? '2.4em' : '2em',
              fontWeight: '900',
              color: event.isCritical ? '#facc15' : '#ef4444',
              textShadow: event.isCritical
                ? '0 0 20px rgba(250, 204, 21, 0.8), 2px 2px 0px #000'
                : '0 0 15px rgba(239, 68, 68, 0.7), 2px 2px 0px #000',
              letterSpacing: '1px',
              animation: 'popBounce 0.35s ease-out',
            }}
          >
            {event.isCritical && 'CRITICAL! '}
            -{event.damage} DAMAGE
            {event.sldDamage ? (
              <span style={{ fontSize: '0.5em', color: '#38bdf8', marginLeft: '8px' }}>
                (SLD: -{event.sldDamage}, HP: -{event.hpDamage})
              </span>
            ) : null}
          </div>
        )}

        {event.healAmount !== undefined && (
          <div
            style={{
              fontSize: '2em',
              fontWeight: '900',
              color: '#34d399',
              textShadow: '0 0 15px rgba(52, 211, 153, 0.7), 2px 2px 0px #000',
              animation: 'popBounce 0.35s ease-out',
            }}
          >
            +{event.healAmount} HEAL!
          </div>
        )}

        {/* 詳細メッセージ */}
        <div
          style={{
            fontSize: '1.05em',
            color: '#e2e8f0',
            fontWeight: '500',
            marginTop: '8px',
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            padding: '8px 16px',
            borderRadius: '6px',
            display: 'inline-block',
            maxWidth: '90%',
            lineHeight: 1.4,
          }}
        >
          {event.description}
        </div>
      </div>
    </div>
  );
};
