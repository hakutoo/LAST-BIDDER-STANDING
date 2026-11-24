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
          給与計算中...
        </div>
      </div>
    );
  }

  const role = event.roleId ? ROLE_DEFINITIONS[event.roleId] : null;

  return (
    <div
      style={{
        backgroundColor: '#1C1915',
        border: '2px solid #B9975B',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '4px 4px 0 #000',
        position: 'relative',
        animation: 'actionFadeIn 0.25s ease-out',
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          borderBottom: '1px solid #4A4234',
          paddingBottom: '10px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#B9975B',
            color: '#12100D',
            padding: '3px 12px',
            fontSize: '0.85em',
            fontWeight: 700,
            letterSpacing: '0.05em',
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          [給与・賞与支給]
        </div>

        {isHost && onSkip && (
          <button
            onClick={onSkip}
            className="btn-normal"
            style={{
              padding: '3px 10px',
              fontSize: '0.8em',
            }}
            title="残りの演出をスキップしてドラフトを開始します"
          >
            演出スキップ
          </button>
        )}
      </div>

      {/* プレイヤー情報 */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: '12px',
        }}
      >
        <span style={{
          fontSize: '1.2em',
          fontWeight: 700,
          color: '#E9DFC8',
          fontFamily: '"Shippori Mincho B1", serif',
        }}>
          {event.playerName}
        </span>
        {role && (
          <span
            style={{
              marginLeft: '8px',
              padding: '2px 8px',
              backgroundColor: '#12100D',
              border: '1px solid #4A4234',
              fontSize: '0.78em',
              color: '#B9975B',
              fontFamily: '"IBM Plex Mono", monospace',
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
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '2.4em',
            fontWeight: 700,
            color: '#B9975B',
            letterSpacing: '1px',
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          +{event.total} G 支給！
        </div>
        <div style={{
          fontSize: '0.88em',
          color: '#A79B7E',
          marginTop: '4px',
          fontFamily: '"IBM Plex Mono", monospace',
        }}>
          所持金: <span>{event.prevG}G</span> ➔{' '}
          <b style={{ color: '#E9DFC8', fontSize: '1.05em' }}>{event.newG}G</b>
        </div>
      </div>

      {/* 内訳グリッド（値札風） */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '8px',
          backgroundColor: '#12100D',
          border: '1px solid #4A4234',
          padding: '12px',
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      >
        <div style={{ textAlign: 'center', borderRight: '1px solid #26221C', padding: '4px' }}>
          <div style={{ fontSize: '0.75em', color: '#A79B7E' }}>基本給</div>
          <div style={{ fontSize: '1.05em', fontWeight: 700, color: '#B9975B' }}>
            +{event.base}G
          </div>
        </div>
        <div style={{ textAlign: 'center', borderRight: '1px solid #26221C', padding: '4px' }}>
          <div style={{ fontSize: '0.75em', color: '#A79B7E' }}>戦功賞与(与ダメ)</div>
          <div style={{ fontSize: '1.05em', fontWeight: 700, color: '#B3352B' }}>
            +{event.damageBonus}G
          </div>
        </div>
        <div style={{ textAlign: 'center', borderRight: '1px solid #26221C', padding: '4px' }}>
          <div style={{ fontSize: '0.75em', color: '#A79B7E' }}>利息(所持G 10%)</div>
          <div style={{ fontSize: '1.05em', fontWeight: 700, color: '#E9DFC8' }}>
            +{event.interest}G
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '4px' }}>
          <div style={{ fontSize: '0.75em', color: '#A79B7E' }}>救済(損害 10%)</div>
          <div style={{ fontSize: '1.05em', fontWeight: 700, color: '#6B7F4E' }}>
            +{event.catchup}G
          </div>
        </div>
      </div>
    </div>
  );
};
