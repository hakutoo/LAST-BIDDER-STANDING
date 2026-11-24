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

        // 枠線の色とベタ影
        let borderColor = '#4A4234';
        let boxShadow = '2px 2px 0 #000';

        if (isHit) {
          borderColor = '#B3352B';
          boxShadow = '3px 3px 0 #000';
        } else if (isDraftWinner) {
          borderColor = '#B9975B';
          boxShadow = '3px 3px 0 #000';
        } else if (isGettingGold) {
          borderColor = '#B9975B';
          boxShadow = '3px 3px 0 #000';
        } else if (isTargeted) {
          borderColor = '#B3352B';
          boxShadow = '3px 3px 0 #000';
        } else if (isActing) {
          borderColor = '#B9975B';
          boxShadow = '3px 3px 0 #000';
        } else if (isSelected) {
          borderColor = '#B3352B';
          boxShadow = '3px 3px 0 #000';
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
              border: `1px solid ${borderColor}`,
              borderLeft: isMe ? '4px solid #B3352B' : `1px solid ${borderColor}`,
              backgroundColor: isDead ? '#12100D' : isMe ? '#26221C' : '#1C1915',
              color: isDead ? '#A79B7E' : '#E9DFC8',
              cursor: canSelectTarget && !isDead ? 'pointer' : 'default',
              boxShadow,
              position: 'relative',
              borderRadius: '0px',
            }}
          >
            {/* 行動中 / 対象バッジ / 給与 / 落札（四角いハンコ風タグ） */}
            {isDraftWinner && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#B9975B',
                  color: '#12100D',
                  fontSize: '0.65em',
                  fontWeight: 700,
                  padding: '1px 6px',
                  boxShadow: '1px 1px 0 #000',
                  zIndex: 2,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                [落札]
              </div>
            )}
            {isGettingGold && !isDraftWinner && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#B9975B',
                  color: '#12100D',
                  fontSize: '0.65em',
                  fontWeight: 700,
                  padding: '1px 6px',
                  boxShadow: '1px 1px 0 #000',
                  zIndex: 2,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                [給与]
              </div>
            )}
            {isActing && !isDraftWinner && !isGettingGold && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#B9975B',
                  color: '#12100D',
                  fontSize: '0.65em',
                  fontWeight: 700,
                  padding: '1px 6px',
                  boxShadow: '1px 1px 0 #000',
                  zIndex: 2,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                [行動]
              </div>
            )}
            {isTargeted && !isActing && !isDraftWinner && !isGettingGold && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: '#B3352B',
                  color: '#E9DFC8',
                  fontSize: '0.65em',
                  fontWeight: 700,
                  padding: '1px 6px',
                  boxShadow: '1px 1px 0 #000',
                  zIndex: 2,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                [対象]
              </div>
            )}

            {/* G獲得フローティングポップアップ */}
            {isGettingGold && activeGoldEvent && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  backgroundColor: '#1C1915',
                  border: '2px solid #B9975B',
                  color: '#B9975B',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontWeight: 700,
                  fontSize: '1.1em',
                  padding: '2px 8px',
                  boxShadow: '3px 3px 0 #000',
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
                  top: '30%',
                  left: '50%',
                  backgroundColor: '#1C1915',
                  border: '2px solid #B9975B',
                  color: '#B9975B',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontWeight: 700,
                  fontSize: '0.95em',
                  padding: '2px 8px',
                  boxShadow: '3px 3px 0 #000',
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                GET: {activeDraftEvent.cardName}
              </div>
            )}

            {/* ダメージ・回復フローティングポップアップ */}
            {isTargeted && activeEvent?.damage !== undefined && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  backgroundColor: '#1C1915',
                  border: `2px solid ${activeEvent.isCritical ? '#B9975B' : '#B3352B'}`,
                  color: activeEvent.isCritical ? '#B9975B' : '#B3352B',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontWeight: 700,
                  fontSize: '1.15em',
                  padding: '2px 8px',
                  boxShadow: '3px 3px 0 #000',
                  zIndex: 10,
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeEvent.isCritical ? 'CRITICAL! ' : ''}-{activeEvent.damage}
              </div>
            )}

            {isTargeted && activeEvent?.type === 'ATTACK_EVADED' && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  backgroundColor: '#1C1915',
                  border: '2px solid #A79B7E',
                  color: '#E9DFC8',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontWeight: 700,
                  fontSize: '1em',
                  padding: '2px 8px',
                  boxShadow: '3px 3px 0 #000',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                MISS!
              </div>
            )}

            {isTargeted && activeEvent?.type === 'ATTACK_PARRIED' && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  backgroundColor: '#1C1915',
                  border: '2px solid #B9975B',
                  color: '#B9975B',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontWeight: 700,
                  fontSize: '1em',
                  padding: '2px 8px',
                  boxShadow: '3px 3px 0 #000',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                PARRY!
              </div>
            )}

            {(isTargeted || isActing) && activeEvent?.healAmount !== undefined && (
              <div
                className="floating-badge"
                style={{
                  position: 'absolute',
                  top: '30%',
                  left: '50%',
                  backgroundColor: '#1C1915',
                  border: '2px solid #6B7F4E',
                  color: '#6B7F4E',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontWeight: 700,
                  fontSize: '1.1em',
                  padding: '2px 8px',
                  boxShadow: '3px 3px 0 #000',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                +{activeEvent.healAmount} HP
              </div>
            )}

            {/* プレイヤー名・ロール */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{
                fontWeight: 700,
                fontSize: '0.85em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '65%',
                color: isMe ? '#E9DFC8' : '#E9DFC8',
              }}>
                {p.name} {isMe && '(自分)'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {p.isHost && (
                  <span style={{
                    fontSize: '0.62em',
                    border: '1px solid #B9975B',
                    color: '#B9975B',
                    padding: '0 3px',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}>
                    HOST
                  </span>
                )}
                <span style={{ fontSize: '0.72em', color: '#A79B7E', whiteSpace: 'nowrap' }}>
                  {role ? role.name : '未選択'}
                </span>
              </div>
            </div>

            {isDead ? (
              <div style={{
                color: '#B3352B',
                fontWeight: 700,
                textAlign: 'center',
                padding: '10px 0',
                fontSize: '0.85em',
                letterSpacing: '0.1em',
                border: '1px dashed #4A4234',
                marginTop: '4px',
              }}>
                [戦闘不能]
              </div>
            ) : (
              <>
                {/* HP & SLD バー */}
                <div style={{ marginBottom: '4px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75em',
                    marginBottom: '2px',
                    fontFamily: '"IBM Plex Mono", monospace',
                  }}>
                    <span>HP: {p.hp}/{p.maxHp}</span>
                    {p.sld > 0 && <span style={{ color: '#B9975B', fontWeight: 700 }}>SLD: {p.sld}</span>}
                  </div>

                  {/* SLDバー（鈍い金） */}
                  {p.sld > 0 && (
                    <div style={{
                      height: '4px',
                      backgroundColor: '#26221C',
                      borderRadius: '0px',
                      overflow: 'hidden',
                      marginBottom: '2px',
                      border: '1px solid #4A4234',
                    }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min(100, Math.max(0, (p.sld / p.maxHp) * 100))}%`,
                          backgroundColor: '#B9975B',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  )}

                  {/* HPバー（生成り / 減少時はアクセント赤） */}
                  <div style={{
                    height: '6px',
                    backgroundColor: '#12100D',
                    borderRadius: '0px',
                    overflow: 'hidden',
                    display: 'flex',
                    border: '1px solid #4A4234',
                  }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, (p.hp / p.maxHp) * 100))}%`,
                        backgroundColor: p.hp > p.maxHp * 0.3 ? '#E9DFC8' : '#B3352B',
                        transition: 'width 0.3s ease, background-color 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                {/* ステータスグリッド */}
                <div className="player-status-grid" style={{ fontFamily: '"IBM Plex Mono", monospace' }}>
                  <div>ATK:<b>{p.atk}</b></div>
                  <div>DEF:<b>{p.def}</b></div>
                  <div title="SPD: 行動順・被攻撃時に (SPD÷8 - ターン×0.05)% の確率(=x)でダメージ4x%軽減、8x%でクリティカル回避">
                    SPD:<b>{p.spd}</b>
                  </div>
                  <div>MAT:<b>{p.mat}</b></div>
                  <div>MDF:<b>{p.mdf}</b></div>
                  <div>CLT:<b>{p.clt}%</b></div>
                </div>

                {/* 回避率・手札枚数 */}
                <div style={{
                  marginTop: '4px',
                  fontSize: '0.7em',
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#A79B7E',
                  fontFamily: '"IBM Plex Mono", monospace',
                }}>
                  <span>手札: {p.handCount}枚</span>
                  {p.evasion > 0 && <span style={{ color: '#6B7F4E' }}>回避: {p.evasion}%</span>}
                </div>

                {/* 状態異常表示 */}
                {p.statuses.length > 0 && (
                  <div style={{ marginTop: '4px', display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {p.statuses.map((st, i) => (
                      <span
                        key={i}
                        title={st.type === 'poison' ? '毒: ターン終了時に 6+受ける人の現在HPの5% ダメージ（SLD貫通）' : '重傷: 受けるHP回復効果が半減'}
                        style={{
                          fontSize: '0.65em',
                          padding: '1px 4px',
                          border: `1px solid ${st.type === 'poison' ? '#4A4234' : '#B3352B'}`,
                          backgroundColor: '#12100D',
                          color: st.type === 'poison' ? '#A79B7E' : '#B3352B',
                          fontFamily: '"IBM Plex Mono", monospace',
                          fontWeight: 700,
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
