import React, { useEffect, useRef } from 'react';
import type { GameLogEntry } from '../types/game';

interface Props {
  logs: GameLogEntry[];
  myId?: string;
}

export const GameLogView: React.FC<Props> = ({ logs, myId }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  const displayLogs = myId
    ? logs.filter((log) => !log.visibleToPlayerId || log.visibleToPlayerId === myId)
    : logs;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{
      backgroundColor: '#12100D',
      border: '1px solid #4A4234',
      padding: '12px',
      height: '180px',
      overflowY: 'auto',
      fontFamily: '"IBM Plex Mono", monospace',
      fontSize: '0.82em',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      boxShadow: '2px 2px 0 #000',
    }}>
      <div style={{
        fontWeight: 700,
        color: '#B9975B',
        borderBottom: '1px solid #4A4234',
        paddingBottom: '4px',
        marginBottom: '4px',
        letterSpacing: '0.05em',
      }}>
        戦闘記録
      </div>
      {displayLogs.map((log) => {
        let color = '#E9DFC8';
        if (log.type === 'damage') color = '#B3352B';
        if (log.type === 'heal') color = '#6B7F4E';
        if (log.type === 'status') color = '#B9975B';
        if (log.type === 'death') color = '#B3352B';
        if (log.type === 'draft') color = '#B9975B';
        if (log.type === 'system') color = '#A79B7E';

        return (
          <div key={log.id} style={{ color, lineHeight: '1.4' }}>
            {log.turn > 0 && <span style={{ color: '#A79B7E' }}>[T{log.turn}] </span>}
            {log.text}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
