'use client';
import React from 'react';

interface Row {
  label: string;
  value: number;
  color: string;
}

interface Props {
  rows: Row[];
  format: (n: number) => string;
}

export default function CompareBar({ rows, format }: Props) {
  const max = Math.max(...rows.map((r) => r.value), 0.001);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(({ label, value, color }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span
              style={{
                color,
                fontSize: '0.7rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                color: '#e2e8f0',
                fontSize: '0.85rem',
                fontWeight: 600,
                letterSpacing: '-0.01em',
              }}
            >
              {format(value)}
            </span>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                borderRadius: 99,
                background: color,
                width: `${(value / max) * 100}%`,
                transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
                boxShadow: `0 0 10px ${color}60`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}