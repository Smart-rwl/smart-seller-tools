'use client';
import React from 'react';
import { Trash2 } from 'lucide-react';
import Field from './Field';
import { VARIANT_ACCENTS } from '@/app/config/ab-test';
import type { Variant } from '@/app/tools/ab-test/types';

interface Props {
  variant: Variant;
  index: number;
  onChange: (v: Variant) => void;
  onRemove?: () => void;
  canRemove: boolean;
}

export default function VariantCard({ variant, index, onChange, onRemove, canRemove }: Props) {
  const isControl = index === 0;
  const accent = VARIANT_ACCENTS[index] || '#06b6d4';
  const label = isControl ? 'A' : String.fromCharCode(65 + index);

  const liveCR =
    variant.visitors && variant.conversions
      ? ((Number(variant.conversions) / Number(variant.visitors)) * 100).toFixed(2) + '%'
      : null;

  return (
    <div
      style={{
        background: '#0a0f1a',
        border: '1.5px solid #1e293b',
        borderRadius: 20,
        padding: 28,
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 4,
          height: '100%',
          background: isControl ? '#475569' : `linear-gradient(180deg, ${accent}, ${accent}aa)`,
          borderRadius: '20px 0 0 20px',
        }}
      />
      <div style={{ marginLeft: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: isControl ? '#1e293b' : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: !isControl ? `0 0 14px ${accent}66` : 'none',
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  color: isControl ? '#94a3b8' : '#fff',
                  fontSize: '0.9rem',
                  letterSpacing: '-0.02em',
                }}
              >
                {label}
              </span>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  letterSpacing: '0.12em',
                  color: isControl ? '#475569' : accent,
                }}
              >
                {isControl ? 'CONTROL' : 'VARIANT'}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#334155', fontWeight: 500, marginTop: 1 }}>
                {isControl ? 'Original / Baseline' : 'Challenger'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span
              style={{
                background: isControl ? '#1e293b' : `${accent}15`,
                color: isControl ? '#64748b' : accent,
                fontSize: '0.6rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '4px 10px',
                borderRadius: 99,
                border: !isControl ? `1px solid ${accent}30` : 'none',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              {isControl ? 'ORIGINAL' : 'CHALLENGER'}
            </span>
            {canRemove && onRemove && (
              <button
                onClick={onRemove}
                aria-label={`Remove variant ${label}`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#475569',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 6,
                  transition: 'color 0.2s, background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.background = '#ef444415';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field
            label="VISITORS / SESSIONS"
            value={variant.visitors}
            onChange={(v) => onChange({ ...variant, visitors: v })}
            placeholder="e.g. 5000"
            accent={accent}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field
              label="ORDERS / CONVERSIONS"
              value={variant.conversions}
              onChange={(v) => onChange({ ...variant, conversions: v })}
              placeholder="e.g. 150"
              accent={accent}
            />
            <Field
              label="TOTAL REVENUE ($)"
              value={variant.revenue}
              onChange={(v) => onChange({ ...variant, revenue: v })}
              placeholder="Optional"
              accent={accent}
            />
          </div>
          {liveCR && (
            <div
              style={{
                background: '#0f172a',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#334155',
                  fontWeight: 500,
                  fontFamily: "'Geist Mono', monospace",
                }}
              >
                Live CR
              </span>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  color: isControl ? '#94a3b8' : accent,
                  fontWeight: 500,
                  fontSize: '0.85rem',
                }}
              >
                {liveCR}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}