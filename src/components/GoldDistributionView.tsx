import React from 'react';
import type { GoldDistributionEvent } from '../types/game';
import { ROLE_DEFINITIONS } from '../data/roles';

interface Props {
  event: GoldDistributionEvent | null;
  isHost: boolean;
  onSkip?: () => void;
}

export const GoldDistributionView: React.FC<Props> = ({
  event,
  isHost,
  onSkip,
}) => {
  if (!event) {
    return (
      <div
        style={{
          backgroundColor: '#090d16',
          border: '2px solid #eab308',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          marginBottom: '16px',
          boxShadow: '0 0 25px rgba(234, 179, 8, 0.25)',
        }}
      >
        <div style={{ fontSize: '1.2em', color: '#facc15', fontStyle: 'italic' }}>
          💰 給与計算中...
        </div>
      </div>
    );
  }

  const role = event.roleId ? ROLE_DEFINITIONS[event.roleId] : null;

  return (
    <div
      style={{
        backgroundColor: '#090d16',
        backgroundImage: 'linear-gradient(135deg, #090d16 0%, #1c1917 50%, #292524 100%)',
        border: '2px solid #eab308',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 0 25px rgba(234, 179, 8, 0.35)',
        position: 'relative',
        overflow: 'hidden',
        animation: 'actionFadeIn 0.3s ease-out',
      }}
    >
      {/* 背景のゴールドグロー */}
      <div
        style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(234, 179, 8, 0.15) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      {/* ヘッダー */}
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
            backgroundColor: '#eab308',
            color: '#000',
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '0.85em',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(234, 179, 8, 0.5)',
            letterSpacing: '0.5px',
          }}
        >
          <span>💰</span>
          <span>給与・ボーナス獲得！</span>
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
            title="残りの演出をスキップしてドラフトを開始します"
          >
            ⏭️ 演出スキップ
          </button>
        )}
      </div>

      {/* プレイヤー情報 */}
      <div
        style={{
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          marginBottom: '12px',
        }}
      >
        <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#f8fafc' }}>
          {event.playerName}
        </span>
        {role && (
          <span
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              backgroundColor: '#334155',
              borderRadius: '4px',
              fontSize: '0.8em',
              color: '#38bdf8',
            }}
          >
            {role.name}
          </span>
        )}
      </div>

      {/* 特大の合計獲得G */}
      <div
        style={{
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '2.4em',
            fontWeight: '900',
            color: '#facc15',
            textShadow: '0 0 20px rgba(250, 204, 21, 0.8), 2px 2px 0px #000',
            letterSpacing: '1px',
            animation: 'popBounce 0.4s ease-out',
          }}
        >
          +{event.total} G 獲得！
        </div>
        <div style={{ fontSize: '0.9em', color: '#cbd5e1', marginTop: '4px' }}>
          所持ゴールド: <span style={{ color: '#94a3b8' }}>{event.prevG}G</span> ➔{' '}
          <b style={{ color: '#facc15', fontSize: '1.1em' }}>{event.newG}G</b>
        </div>
      </div>

      {/* 内訳グリッド */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          backgroundColor: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid #44403c',
          borderRadius: '8px',
          padding: '12px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75em', color: '#a8a29e' }}>基本給</div>
          <div style={{ fontSize: '1.05em', fontWeight: 'bold', color: '#f59e0b' }}>
            +{event.base}G
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75em', color: '#a8a29e' }}>与ダメージボーナス</div>
          <div style={{ fontSize: '1.05em', fontWeight: 'bold', color: '#f87171' }}>
            +{event.damageBonus}G
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75em', color: '#a8a29e' }}>利子 (所持Gの10%)</div>
          <div style={{ fontSize: '1.05em', fontWeight: 'bold', color: '#38bdf8' }}>
            +{event.interest}G
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75em', color: '#a8a29e' }}>救済 (減少HPの10%)</div>
          <div style={{ fontSize: '1.05em', fontWeight: 'bold', color: '#4ade80' }}>
            +{event.catchup}G
          </div>
        </div>
      </div>
    </div>
  );
};
