'use client';
import React, { useState, useMemo } from 'react';
import { Target } from 'lucide-react';
import Field from './Field';
import { requiredSampleSize } from '@/app/services/ab-test/statistics';

export default function SampleSizeCalc() {
  const [baseline, setBaseline] = useState<number | ''>(3);
  const [mde, setMde] = useState<number | ''>(20);
  const [power, setPower] = useState<0.8 | 0.9>(0.8);

  const result = useMemo(() => {
    const p1 = Number(baseline) / 100;
    const lift = Number(mde) / 100;
    if (!p1 || !lift) return null;
    return requiredSampleSize(p1, lift, 0.05, power);
  }, [baseline, mde, power]);

  return (
    <div style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 16, padding: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#7c3aed20', borderRadius: 8, padding: 8 }}>
            <Target size={16} color="#a78bfa" />
          </div>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              color: '#e2e8f0',
              fontSize: '0.88rem',
              letterSpacing: '-0.01em',
            }}
          >
            Sample Size Planner
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {([0.8, 0.9] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPower(p)}
              style={{
                background: power === p ? '#7c3aed' : '#0f172a',
                border: `1px solid ${power === p ? '#7c3aed' : '#1e293b'}`,
                borderRadius: 8,
                padding: '4px 10px',
                color: power === p ? '#fff' : '#64748b',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'Geist Mono', monospace",
                transition: 'all 0.2s',
              }}
            >
              {(p * 100).toFixed(0)}% PWR
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Field label="BASELINE CR (%)" value={baseline} onChange={setBaseline} placeholder="e.g. 3" accent="#a78bfa" />
        <Field label="MIN. DETECTABLE EFFECT (%)" value={mde} onChange={setMde} placeholder="e.g. 20" accent="#a78bfa" />
      </div>
      {result !== null && result > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #7c3aed15, #4c1d9520)',
            border: '1px solid #7c3aed40',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 500 }}>Required per variant</span>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#a78bfa',
              letterSpacing: '-0.02em',
            }}
          >
            {result.toLocaleString()} visitors
          </span>
        </div>
      )}
      <p
        style={{
          color: '#334155',
          fontSize: '0.7rem',
          marginTop: 10,
          lineHeight: 1.5,
          fontFamily: "'Geist Mono', monospace",
        }}
      >
        95% confidence · {(power * 100).toFixed(0)}% power · two-tailed Z-test
      </p>
    </div>
  );
}