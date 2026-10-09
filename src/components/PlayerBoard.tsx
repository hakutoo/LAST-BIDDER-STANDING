import React from 'react';
import type { PublicPlayerInfo, BattleEvent } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';
import { CARD_DEFINITIONS } from '../data/cards';

interface Props {
  players: { [id: string]: PublicPlayerInfo };
  myId: string;
  selectedTargetId?: string | null;
  onSelectTarget?: (targetId: string) => void;
  canSelectTarget?: boolean;
  activeEvent?: BattleEvent | null;
}

export const PlayerBoard: React.FC<Props> = ({
  players,
  myId,
  selectedTargetId,
  onSelectTarget,
  canSelectTarget = false,
  activeEvent = null,
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '16px' }}>
      {Object.values(players).map((p) => {
        const role = p.roleId ? ROLE_DEFINITIONS[p.roleId] : null;
        const lastCard = p.lastUsedCardId ? CARD_DEFINITIONS[p.lastUsedCardId] : null;
        const isMe = p.id === myId;
        const isSelected = selectedTargetId === p.id;
        const isDead = !p.isAlive;

        // イベント演出用の状態判定
        const isActing = activeEvent?.actorId === p.id;
        const isTargeted = activeEvent?.targetId === p.id;
        const isHit = isTargeted && activeEvent?.damage !== undefined && activeEvent.damage > 0;

        // 枠線の色
        let borderColor = '#334155';
        let boxShadow = 'none';

        if (isHit) {
          borderColor = '#ef4444';
          boxShadow = '0 0 16px rgba(239, 68, 68, 0.8)';
        } else if (isTargeted) {
          borderColor = '#f87171';
          boxShadow = '0 0 14px rgba(248, 113, 113, 0.7)';
        } else if (isActing) {
          borderColor = '#eab308';
          boxShadow = '0 0 14px rgba(234, 179, 8, 0.7)';
        } else if (isSelected) {
          borderColor = '#ff4444';
          boxShadow = '0 0 10px rgba(255, 68, 68, 0.7)';
        } else if (isMe) {
          borderColor = '#4caf50';
        }

        return (
          <div
            key={p.id}
            className={isHit ? 'hit-shake' : ''}
            onClick={() => {
              if (canSelectTarget && !isDead && onSelectTarget) {
                onSelectTarget(p.id);
              }
            }}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `2px solid ${borderColor}`,
              backgroundColor: isDead ? '#222' : isMe ? '#1e293b' : '#1f2937',
              color: isDead ? '#888' : '#fff',
              cursor: canSelectTarget && !isDead ? 'pointer' : 'default',
              boxShadow,
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* 行動中 / 対象バッジ */}
            {isActing && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#eab308',
                  color: '#000',
                  fontSize: '0.7em',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderBottomLeftRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  zIndex: 2,
                }}
              >
                ⚔️ 行動中
              </div>
            )}
            {isTargeted && !isActing && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '0.7em',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderBottomLeftRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  zIndex: 2,
                }}
              >
                🎯 対象
              </div>
            )}

            {/* ダメージ・回復フローティングポップアップ */}
            {isTargeted && activeEvent?.damage !== undefined && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: activeEvent.isCritical ? '#facc15' : '#ef4444',
                  color: activeEvent.isCritical ? '#000' : '#fff',
                  fontWeight: '900',
                  fontSize: '1.4em',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeEvent.isCritical ? '⚡CRITICAL! ' : ''}-{activeEvent.damage}
              </div>
            )}

            {isTargeted && activeEvent?.type === 'ATTACK_EVADED' && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#06b6d4',
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '1.2em',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                💨 MISS!
              </div>
            )}

            {isTargeted && activeEvent?.type === 'ATTACK_PARRIED' && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#6366f1',
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '1.2em',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                🛡️ PARRY!
              </div>
            )}

            {(isTargeted || isActing) && activeEvent?.healAmount !== undefined && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#10b981',
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '1.3em',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                +{activeEvent.healAmount} HP
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                {p.name} {isMe && '(自分)'} {p.isHost && '👑'}
              </div>
              <div style={{ fontSize: '0.85em', color: '#aaa' }}>
                {role ? role.name : 'ロール未選択'}
              </div>
            </div>

            {isDead ? (
              <div style={{ color: '#ff4444', fontWeight: 'bold', textAlign: 'center', padding: '16px 0' }}>
                💀 戦闘不能
              </div>
            ) : (
              <>
                {/* HP & SLD バー */}
                <div style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', marginBottom: '3px' }}>
                    <span>HP: {p.hp} / {p.maxHp}</span>
                    {p.sld > 0 && <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>SLD: {p.sld}</span>}
                  </div>
                  {/* SLDバー (青) */}
                  {p.sld > 0 && (
                    <div style={{ height: '6px', backgroundColor: '#1e293b', borderRadius: '3px', overflow: 'hidden', marginBottom: '3px' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, (p.sld / p.maxHp) * 100))}%`,
                          backgroundColor: '#38bdf8',
                          boxShadow: '0 0 4px rgba(56, 189, 248, 0.6)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  )}
                  {/* HPバー (緑/赤) */}
                  <div style={{ height: '8px', backgroundColor: '#555', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, (p.hp / p.maxHp) * 100))}%`,
                        backgroundColor: p.hp > p.maxHp * 0.3 ? '#22c55e' : '#ef4444',
                        transition: 'width 0.3s ease, background-color 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* ステータスグリッド */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', fontSize: '0.8em', backgroundColor: '#111827', padding: '6px', borderRadius: '4px' }}>
                  <div>ATK: <b style={{ color: '#f87171' }}>{p.atk}</b></div>
                  <div>DEF: <b style={{ color: '#60a5fa' }}>{p.def}</b></div>
                  <div>SPD: <b style={{ color: '#facc15' }}>{p.spd}</b></div>
                  <div>MAT: <b style={{ color: '#c084fc' }}>{p.mat}</b></div>
                  <div>MDF: <b style={{ color: '#818cf8' }}>{p.mdf}</b></div>
                  <div>CLT: <b style={{ color: '#fb923c' }}>{p.clt}%</b></div>
                </div>

                {/* 回避率・手札枚数・直前カード */}
                <div style={{ marginTop: '6px', fontSize: '0.8em', display: 'flex', justifyContent: 'space-between' }}>
                  <span>手札: {p.handCount}枚</span>
                  {p.evasion > 0 && <span style={{ color: '#34d399' }}>回避: {p.evasion}%</span>}
                </div>

                {lastCard && (
                  <div style={{ marginTop: '4px', fontSize: '0.75em', color: '#9ca3af' }}>
                    直前使用: {lastCard.name}
                  </div>
                )}

                {/* 状態異常表示 */}
                {p.statuses.length > 0 && (
                  <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {p.statuses.map((st, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.75em',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: st.type === 'poison' ? '#7e22ce' : '#b91c1c',
                          color: '#fff',
                        }}
                      >
                        {st.type === 'poison' ? `毒 (${st.remainingTurns}T)` : `重傷 (${st.remainingTurns}T)`}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
