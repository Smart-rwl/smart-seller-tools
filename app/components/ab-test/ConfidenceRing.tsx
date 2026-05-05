'use client';
import React from 'react';
import AnimatedNumber from './AnimatedNumber';
import type { TestStatus } from '@/app/tools/ab-test/types';

interface Props {
  confidence: number;
  status: TestStatus;
}

export default function ConfidenceRing({ confidence, status }: Props) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const fill = (confidence / 100) * circ;
  const color =
    status === 'winner'
      ? '#10b981'
      : status === 'loser'
      ? '#ef4444'
      : status === 'leaning'
      ? '#f59e0b'
      : '#475569';

  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg
        width="140"
        height="140"
        style={{ transform: 'rotate(-90deg)' }}
        aria-label={`Confidence ${confidence.toFixed(1)} percent`}
      >
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1), stroke 0.4s' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1.6rem',
            fontWeight: 700,
            color,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          <AnimatedNumber value={confidence} decimals={1} suffix="%" />
        </span>
        <span
          style={{
            fontSize: '0.6rem',
            color: '#475569',
            fontWeight: 600,
            letterSpacing: '0.14em',
            marginTop: 4,
            fontFamily: "'Geist Mono', monospace",
          }}
        >
          CONFIDENCE
        </span>
      </div>
    </div>
  );
}