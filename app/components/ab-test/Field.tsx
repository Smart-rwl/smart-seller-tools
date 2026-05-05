'use client';
import React from 'react';

interface Props {
  label: string;
  value: number | '';
  onChange: (v: number | '') => void;
  placeholder: string;
  accent: string;
}

export default function Field({ label, value, onChange, placeholder, accent }: Props) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.66rem',
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: '#475569',
          marginBottom: 6,
          fontFamily: "'Geist Mono', monospace",
        }}
      >
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={0}
        onChange={(e) =>
          onChange(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
        }
        placeholder={placeholder}
        style={{
          width: '100%',
          background: '#020617',
          border: '1.5px solid #1e293b',
          borderRadius: 10,
          padding: '10px 14px',
          color: '#f1f5f9',
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '0.92rem',
          fontWeight: 500,
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxSizing: 'border-box',
          letterSpacing: '-0.01em',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = accent;
          e.currentTarget.style.boxShadow = `0 0 0 3px ${accent}25`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#1e293b';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}