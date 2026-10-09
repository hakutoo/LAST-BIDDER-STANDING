import React, { useEffect, useRef } from 'react';
import type { GameLogEntry } from '../types/game';

interface Props {
  logs: GameLogEntry[];
}

export const GameLogView: React.FC<Props> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '12px',
      height: '180px',
      overflowY: 'auto',
      fontFamily: 'monospace',
      fontSize: '0.85em',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <div style={{ fontWeight: 'bold', color: '#94a3b8', borderBottom: '1px solid #334155', paddingBottom: '4px', marginBottom: '4px' }}>
        📜 バトルログ
      </div>
      {logs.map((log) => {
        let color = '#e2e8f0';
        if (log.type === 'damage') color = '#f87171';
        if (log.type === 'heal') color = '#4ade80';
        if (log.type === 'status') color = '#fbbf24';
        if (log.type === 'death') color = '#ef4444';
        if (log.type === 'draft') color = '#38bdf8';
        if (log.type === 'system') color = '#a78bfa';

        return (
          <div key={log.id} style={{ color }}>
            {log.turn > 0 && <span style={{ color: '#64748b' }}>[T{log.turn}] </span>}
            {log.text}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
