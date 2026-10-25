import React from 'react';
import type { PublicPlayerInfo, BattleEvent, GoldDistributionEvent, DraftResolutionEvent } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';

interface Props {
  players: { [id: string]: PublicPlayerInfo };
  myId: string;
  selectedTargetId?: string | null;
  onSelectTarget?: (targetId: string) => void;
  canSelectTarget?: boolean;
  activeEvent?: BattleEvent | null;
  activeGoldEvent?: GoldDistributionEvent | null;
  activeDraftEvent?: DraftResolutionEvent | null;
}

export const PlayerBoard: React.FC<Props> = ({
  players,
  myId,
  selectedTargetId,
  onSelectTarget,
  canSelectTarget = false,
  activeEvent = null,
  activeGoldEvent = null,
  activeDraftEvent = null,
}) => {
  return (
    <div className="player-board-grid">
      {Object.values(players).map((p) => {
        const role = p.roleId ? ROLE_DEFINITIONS[p.roleId] : null;
        const isMe = p.id === myId;
        const isSelected = selectedTargetId === p.id;
        const isDead = !p.isAlive;

        // イベント演出用の状態判定
        const isActing = activeEvent?.actorId === p.id;
        const isTargeted = activeEvent?.targetId === p.id;
        const isHit = isTargeted && activeEvent?.damage !== undefined && activeEvent.damage > 0;

        // G獲得演出・ドラフト落札演出
        const isGettingGold = activeGoldEvent?.playerId === p.id;
        const isDraftWinner = activeDraftEvent?.step === 'WINNER_ANNOUNCE' && activeDraftEvent?.winnerId === p.id;

        // 枠線の色
        let borderColor = '#334155';
        let boxShadow = 'none';

        if (isHit) {
          borderColor = '#ef4444';
          boxShadow = '0 0 16px rgba(239, 68, 68, 0.8)';
        } else if (isDraftWinner) {
          borderColor = '#facc15';
          boxShadow = '0 0 16px rgba(250, 204, 21, 0.8)';
        } else if (isGettingGold) {
          borderColor = '#eab308';
          boxShadow = '0 0 16px rgba(234, 179, 8, 0.7)';
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
            className={`player-card ${isHit ? 'hit-shake' : ''}`}
            onClick={() => {
              if (canSelectTarget && !isDead && onSelectTarget) {
                onSelectTarget(p.id);
              }
            }}
            style={{
              border: `2px solid ${borderColor}`,
              backgroundColor: isDead ? '#1a1f2c' : isMe ? '#1e293b' : '#111827',
              color: isDead ? '#64748b' : '#fff',
              cursor: canSelectTarget && !isDead ? 'pointer' : 'default',
              boxShadow,
            }}
          >
            {/* 行動中 / 対象バッジ / 給与 / 落札 */}
            {isDraftWinner && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#facc15',
                  color: '#000',
                  fontSize: '0.65em',
                  fontWeight: 'bold',
                  padding: '1px 6px',
                  borderBottomLeftRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  zIndex: 2,
                }}
              >
                👑 落札！
              </div>
            )}
            {isGettingGold && !isDraftWinner && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#eab308',
                  color: '#000',
                  fontSize: '0.65em',
                  fontWeight: 'bold',
                  padding: '1px 6px',
                  borderBottomLeftRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  zIndex: 2,
                }}
              >
                💰 給与
              </div>
            )}
            {isActing && !isDraftWinner && !isGettingGold && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#eab308',
                  color: '#000',
                  fontSize: '0.65em',
                  fontWeight: 'bold',
                  padding: '1px 6px',
                  borderBottomLeftRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  zIndex: 2,
                }}
              >
                ⚔️ 行動中
              </div>
            )}
            {isTargeted && !isActing && !isDraftWinner && !isGettingGold && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  fontSize: '0.65em',
                  fontWeight: 'bold',
                  padding: '1px 6px',
                  borderBottomLeftRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  zIndex: 2,
                }}
              >
                🎯 対象
              </div>
            )}

            {/* G獲得フローティングポップアップ */}
            {isGettingGold && activeGoldEvent && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#facc15',
                  color: '#000',
                  fontWeight: '900',
                  fontSize: '1.2em',
                  padding: '2px 10px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 14px rgba(250, 204, 21, 0.7)',
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                +{activeGoldEvent.total} G!
              </div>
            )}

            {/* ドラフト落札フローティングポップアップ */}
            {isDraftWinner && activeDraftEvent && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '25%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: '#facc15',
                  color: '#000',
                  fontWeight: '900',
                  fontSize: '1.1em',
                  padding: '2px 10px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 14px rgba(250, 204, 21, 0.7)',
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                👑 GET: {activeDraftEvent.cardName}
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
                  fontSize: '1.3em',
                  padding: '2px 10px',
                  borderRadius: '16px',
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
                  fontSize: '1.1em',
                  padding: '2px 10px',
                  borderRadius: '16px',
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
                  fontSize: '1.1em',
                  padding: '2px 10px',
                  borderRadius: '16px',
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
                  fontSize: '1.2em',
                  padding: '2px 10px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                +{activeEvent.healAmount} HP
              </div>
            )}

            {/* プレイヤー名・ロール */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.85em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '65%' }}>
                {p.name} {isMe && '(自分)'} {p.isHost && '👑'}
              </div>
              <div style={{ fontSize: '0.72em', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {role ? role.name : '未選択'}
              </div>
            </div>

            {isDead ? (
              <div style={{ color: '#ef4444', fontWeight: 'bold', textAlign: 'center', padding: '10px 0', fontSize: '0.85em' }}>
                💀 戦闘不能
              </div>
            ) : (
              <>
                {/* HP & SLD バー */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75em', marginBottom: '2px' }}>
                    <span>HP: {p.hp}/{p.maxHp}</span>
                    {p.sld > 0 && <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>SLD: {p.sld}</span>}
                  </div>
                  {/* SLDバー (青) */}
                  {p.sld > 0 && (
                    <div style={{ height: '4px', backgroundColor: '#1e293b', borderRadius: '2px', overflow: 'hidden', marginBottom: '2px' }}>
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
                  <div style={{ height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
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
                <div className="player-status-grid">
                  <div>ATK:<b style={{ color: '#f87171' }}>{p.atk}</b></div>
                  <div>DEF:<b style={{ color: '#60a5fa' }}>{p.def}</b></div>
                  <div>SPD:<b style={{ color: '#facc15' }}>{p.spd}</b></div>
                  <div>MAT:<b style={{ color: '#c084fc' }}>{p.mat}</b></div>
                  <div>MDF:<b style={{ color: '#818cf8' }}>{p.mdf}</b></div>
                  <div>CLT:<b style={{ color: '#fb923c' }}>{p.clt}%</b></div>
                </div>

                {/* 回避率・手札枚数 */}
                <div style={{ marginTop: '3px', fontSize: '0.7em', display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>手札: {p.handCount}枚</span>
                  {p.evasion > 0 && <span style={{ color: '#34d399' }}>回避: {p.evasion}%</span>}
                </div>

                {/* 状態異常表示 */}
                {p.statuses.length > 0 && (
                  <div style={{ marginTop: '3px', display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {p.statuses.map((st, i) => (
                      <span
                        key={i}
                        title={st.type === 'poison' ? '毒: ターン終了時に 6+受ける人の現在HPの5% ダメージ（SLD貫通）' : '重傷: 受けるHP回復効果が半減'}
                        style={{
                          fontSize: '0.65em',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: st.type === 'poison' ? '#7e22ce' : '#b91c1c',
                          color: '#fff',
                          cursor: 'help',
                        }}
                      >
                        {st.type === 'poison' ? `毒(${st.remainingTurns}T)` : `重傷(${st.remainingTurns}T)`}
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
