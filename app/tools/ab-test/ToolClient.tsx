'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Activity,
  MousePointerClick,
  FlaskConical,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart,
  RefreshCw,
  Download,
  Share2,
  Plus,
  Sparkles,
  Clock,
} from 'lucide-react';

import AnimatedNumber from '@/app/components/ab-test/AnimatedNumber';
import ConfidenceRing from '@/app/components/ab-test/ConfidenceRing';
import CompareBar from '@/app/components/ab-test/CompareBar';
import VariantCard from '@/app/components/ab-test/VariantCard';
import SampleSizeCalc from '@/app/components/ab-test/SampleSizeCalc';
import MethodologyGuide from '@/app/components/ab-test/MethodologyGuide';

import {
  zTestProportions,
  liftConfidenceInterval,
  bayesianProbability,
} from '@/app/services/ab-test/statistics';
import {
  encodeStateToURL,
  decodeStateFromURL,
} from '@/app/services/ab-test/url-state';
import { buildCSV, downloadCSV } from '@/app/services/ab-test/csv-export';
import {
  DEFAULT_VARIANTS,
  MAX_VARIANTS,
  STATUS_CONFIG,
} from '@/app/config/ab-test';
import type {
  Variant,
  VariantMetrics,
  ComparisonMetrics,
  TestStatus,
} from './types';

export default function ToolClient() {
  const [variants, setVariants] = useState<Variant[]>(DEFAULT_VARIANTS);
  const [duration, setDuration] = useState<number>(30);
  const [loaded, setLoaded] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    setLoaded(true);
    const { variants: urlV, duration: urlD } = decodeStateFromURL();
    if (urlV && urlV.length >= 2) setVariants(urlV);
    if (urlD) setDuration(urlD);
  }, []);

  const updateVariant = (i: number, v: Variant) => {
    const copy = [...variants];
    copy[i] = v;
    setVariants(copy);
  };

  const addVariant = () => {
    if (variants.length >= MAX_VARIANTS) return;
    const i = variants.length;
    setVariants([
      ...variants,
      {
        id: `v${i}`,
        name: `Variant ${String.fromCharCode(65 + i)}`,
        visitors: '',
        conversions: '',
        revenue: '',
      },
    ]);
  };

  const removeVariant = (i: number) => {
    if (variants.length <= 2) return;
    setVariants(variants.filter((_, idx) => idx !== i));
  };

  const handleReset = () => {
    setVariants(DEFAULT_VARIANTS);
    setDuration(30);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const variantMetrics: VariantMetrics[] = useMemo(() => {
    return variants.map((v) => {
      const n = Number(v.visitors) || 0;
      const x = Number(v.conversions) || 0;
      const r = Number(v.revenue) || 0;
      return {
        id: v.id,
        name: v.name,
        visitors: n,
        conversions: x,
        revenue: r,
        cr: n > 0 ? x / n : 0,
        rpv: n > 0 ? r / n : 0,
        aov: x > 0 ? r / x : 0,
      };
    });
  }, [variants]);

  const comparisons: ComparisonMetrics[] = useMemo(() => {
    const control = variantMetrics[0];
    if (!control || control.visitors === 0) return [];

    return variantMetrics.slice(1).map((variant) => {
      if (variant.visitors === 0) {
        return {
          control,
          variant,
          liftCR: 0,
          liftRPV: 0,
          liftAOV: 0,
          zScore: 0,
          pValue: 1,
          confidence: 0,
          bayesianProb: 50,
          ciLow: 0,
          ciHigh: 0,
          status: 'neutral' as TestStatus,
          monthlyRevLift: 0,
        };
      }

      const { z, p, confidence } = zTestProportions(
        control.conversions,
        control.visitors,
        variant.conversions,
        variant.visitors,
      );

      const ci = liftConfidenceInterval(
        control.conversions,
        control.visitors,
        variant.conversions,
        variant.visitors,
      );

      const bayesianProb = bayesianProbability(
        control.conversions,
        control.visitors,
        variant.conversions,
        variant.visitors,
        5000,
      );

      const liftCR = control.cr > 0 ? ((variant.cr - control.cr) / control.cr) * 100 : 0;
      const liftRPV = control.rpv > 0 ? ((variant.rpv - control.rpv) / control.rpv) * 100 : 0;
      const liftAOV = control.aov > 0 ? ((variant.aov - control.aov) / control.aov) * 100 : 0;

      let status: TestStatus = 'neutral';
      if (confidence >= 95) status = liftCR >= 0 ? 'winner' : 'loser';
      else if (confidence >= 80) status = 'leaning';

      const totalVisitors = control.visitors + variant.visitors;
      const dailyVisitors = duration > 0 ? totalVisitors / duration : 0;
      const monthlyRevLift = (variant.rpv - control.rpv) * dailyVisitors * 30;

      return {
        control,
        variant,
        liftCR,
        liftRPV,
        liftAOV,
        zScore: z,
        pValue: p,
        confidence,
        bayesianProb,
        ciLow: ci.low,
        ciHigh: ci.high,
        status,
        monthlyRevLift,
      };
    });
  }, [variantMetrics, duration]);

  const primary = comparisons[0];

  const peekingWarning = useMemo(() => {
    if (!primary) return false;
    const totalSample = primary.control.visitors + primary.variant.visitors;
    return primary.confidence >= 95 && totalSample < 1000;
  }, [primary]);

  const exportCSV = useCallback(() => {
    if (!primary) return;
    const csv = buildCSV(variantMetrics, comparisons);
    downloadCSV(`ab-test-${new Date().toISOString().split('T')[0]}.csv`, csv);
  }, [variantMetrics, comparisons, primary]);

  const handleShare = useCallback(async () => {
    const qs = encodeStateToURL(variants, duration);
    const url = `${window.location.origin}${window.location.pathname}?${qs}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg('Link copied!');
      window.history.replaceState({}, '', `?${qs}`);
      setTimeout(() => setShareMsg(''), 2000);
    } catch {
      setShareMsg('Copy failed');
      setTimeout(() => setShareMsg(''), 2000);
    }
  }, [variants, duration]);

  const sc = primary ? STATUS_CONFIG[primary.status] : null;

  const verdictIcon = (status: TestStatus) => {
    switch (status) {
      case 'winner':
        return <CheckCircle2 size={22} />;
      case 'loser':
        return <XCircle size={22} />;
      case 'leaning':
        return <TrendingUp size={22} />;
      default:
        return <Activity size={22} />;
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        background: '#020617',
        minHeight: '100vh',
        color: '#cbd5e1',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/style.css');

        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); } 70% { box-shadow: 0 0 0 12px rgba(99,102,241,0); } 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .shimmer-text {
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #6366f1);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .metric-card { transition: border-color 0.2s, transform 0.2s; }
        .metric-card:hover { border-color: #334155 !important; transform: translateY(-2px); }
        .serif-italic { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; }
        @media (max-width: 768px) {
          .input-grid { grid-template-columns: 1fr !important; }
          .results-grid { grid-template-columns: 1fr !important; }
          .metrics-row { grid-template-columns: 1fr !important; }
          .header-row { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
          opacity: 0.015,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(transparent, rgba(99,102,241,0.8), transparent)',
            animation: 'scanline 8s linear infinite',
          }}
        />
      </div>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.4,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 24px 64px',
        }}
      >
        {/* HEADER */}
        <div className={loaded ? 'fade-up' : ''} style={{ marginBottom: 48 }}>
          <div
            className="header-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    borderRadius: 12,
                    padding: 10,
                    boxShadow: '0 0 24px rgba(99,102,241,0.4)',
                    animation: 'pulse-ring 2.5s ease-out infinite',
                  }}
                >
                  <FlaskConical size={22} color="#fff" />
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      letterSpacing: '0.18em',
                      color: '#6366f1',
                      display: 'block',
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    SMART SELLER TOOLS
                  </span>
                  <span
                    style={{
                      fontSize: '0.6rem',
                      color: '#334155',
                      fontWeight: 500,
                      letterSpacing: '0.1em',
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    STATISTICAL ENGINE v3.0
                  </span>
                </div>
              </div>
              <h1
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(2rem, 4.4vw, 3rem)',
                  fontWeight: 600,
                  lineHeight: 1.02,
                  color: '#f1f5f9',
                  marginBottom: 10,
                  letterSpacing: '-0.035em',
                }}
              >
                A/B Test <span className="serif-italic shimmer-text">significance</span>
                <br />
                calculator
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: 520, lineHeight: 1.6, fontWeight: 400 }}>
                Frequentist Z-test plus Bayesian probability, multi-variant support, revenue analysis, and shareable
                results — built for serious e-commerce teams.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Algorithm', value: 'Z-Test · Bayesian' },
                  { label: 'Threshold', value: 'p < 0.05' },
                ].map((b) => (
                  <div
                    key={b.label}
                    style={{
                      background: '#0a0f1a',
                      border: '1px solid #1e293b',
                      borderRadius: 10,
                      padding: '8px 14px',
                      textAlign: 'right',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.6rem',
                        color: '#334155',
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      {b.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        color: '#6366f1',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                        marginTop: 2,
                      }}
                    >
                      {b.value}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleShare}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#0a0f1a',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    padding: '8px 14px',
                    color: '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.color = '#6366f1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  <Share2 size={13} /> {shareMsg || 'Share'}
                </button>
                <button
                  onClick={exportCSV}
                  disabled={!primary}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#0a0f1a',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    padding: '8px 14px',
                    color: primary ? '#475569' : '#1e293b',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    cursor: primary ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    if (!primary) return;
                    e.currentTarget.style.borderColor = '#10b981';
                    e.currentTarget.style.color = '#10b981';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.color = primary ? '#475569' : '#1e293b';
                  }}
                >
                  <Download size={13} /> CSV
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#0a0f1a',
                    border: '1px solid #1e293b',
                    borderRadius: 10,
                    padding: '8px 14px',
                    color: '#475569',
                    fontSize: '0.76rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ef4444';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1e293b';
                    e.currentTarget.style.color = '#475569';
                  }}
                >
                  <RefreshCw size={13} /> Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DURATION + ADD VARIANT */}
        <div
          className={loaded ? 'fade-up delay-1' : ''}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: '#0a0f1a',
              border: '1px solid #1e293b',
              borderRadius: 12,
              padding: '10px 14px',
            }}
          >
            <Clock size={14} color="#6366f1" />
            <label
              style={{
                fontSize: '0.7rem',
                color: '#475569',
                fontWeight: 600,
                letterSpacing: '0.08em',
                fontFamily: "'Geist Mono', monospace",
              }}
            >
              TEST DURATION
            </label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
              style={{
                width: 60,
                background: '#020617',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: '4px 8px',
                color: '#e2e8f0',
                fontFamily: "'Geist Mono', monospace",
                fontSize: '0.8rem',
                outline: 'none',
                textAlign: 'center',
              }}
            />
            <span style={{ fontSize: '0.7rem', color: '#475569', fontFamily: "'Geist Mono', monospace" }}>days</span>
          </div>
          {variants.length < MAX_VARIANTS && (
            <button
              onClick={addVariant}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #6366f120, #8b5cf620)',
                border: '1px solid #6366f140',
                borderRadius: 10,
                padding: '8px 14px',
                color: '#818cf8',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#6366f140';
              }}
            >
              <Plus size={13} /> Add Variant ({variants.length}/{MAX_VARIANTS})
            </button>
          )}
        </div>

        {/* VARIANTS GRID */}
        <div
          className="input-grid"
          style={{
            display: 'grid',
            gridTemplateColumns:
              variants.length === 2
                ? '1fr 1fr'
                : variants.length === 3
                ? 'repeat(3, 1fr)'
                : 'repeat(2, 1fr)',
            gap: 20,
            marginBottom: 20,
          }}
        >
          {variants.map((v, i) => (
            <div key={v.id} className={`fade-up delay-${Math.min(i + 1, 4)}`}>
              <VariantCard
                variant={v}
                index={i}
                onChange={(nv) => updateVariant(i, nv)}
                onRemove={i > 0 ? () => removeVariant(i) : undefined}
                canRemove={variants.length > 2 && i > 0}
              />
            </div>
          ))}
        </div>

        {/* RESULTS */}
        {primary && sc ? (
          <div className="fade-up delay-3" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {peekingWarning && (
              <div
                style={{
                  background: '#f59e0b15',
                  border: '1px solid #f59e0b40',
                  borderRadius: 12,
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <AlertCircle size={18} color="#f59e0b" />
                <div>
                  <div style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: 600, marginBottom: 2 }}>
                    Possible early-stopping bias
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', lineHeight: 1.5 }}>
                    Reaching 95% with under 1,000 visitors may be a false positive. Continue running to your pre-planned
                    sample size.
                  </div>
                </div>
              </div>
            )}

            {/* VERDICT BANNER */}
            <div
              style={{
                background: sc.bg,
                border: `1.5px solid ${sc.border}`,
                borderRadius: 20,
                padding: '24px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <ConfidenceRing confidence={primary.confidence} status={primary.status} />
                <div style={{ maxWidth: 480 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: sc.color }}>{verdictIcon(primary.status)}</span>
                    <span
                      style={{
                        fontFamily: "'Geist Mono', monospace",
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.15em',
                        color: sc.color,
                      }}
                    >
                      {sc.label}
                    </span>
                  </div>
                  <h2
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      color: '#f1f5f9',
                      lineHeight: 1.15,
                      marginBottom: 8,
                      letterSpacing: '-0.025em',
                    }}
                  >
                    {sc.headline}
                  </h2>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', lineHeight: 1.6 }}>
                    {primary.status === 'winner'
                      ? `Variant outperforms Control by ${primary.liftCR.toFixed(2)}% in conversion rate with ${primary.confidence.toFixed(1)}% confidence. Bayesian P(B>A) = ${primary.bayesianProb.toFixed(1)}%. Safe to ship.`
                      : primary.status === 'loser'
                      ? `Variant underperforms Control by ${Math.abs(primary.liftCR).toFixed(2)}% with ${primary.confidence.toFixed(1)}% confidence. Bayesian P(B>A) = ${primary.bayesianProb.toFixed(1)}%. Do not ship.`
                      : primary.status === 'leaning'
                      ? `Trending but not yet significant (${primary.confidence.toFixed(1)}% / need 95%). Bayesian P(B>A) = ${primary.bayesianProb.toFixed(1)}%. Continue the test.`
                      : `Only ${primary.confidence.toFixed(1)}% confidence. Bayesian P(B>A) = ${primary.bayesianProb.toFixed(1)}%. Keep running — don't decide on this data yet.`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Z-Score', value: primary.zScore.toFixed(3), note: '|z| > 1.96 = significant' },
                  { label: 'p-value', value: primary.pValue.toFixed(4), note: 'p < 0.05 = significant' },
                  { label: 'Bayesian P(B>A)', value: primary.bayesianProb.toFixed(1) + '%', note: '> 95% = high confidence' },
                  {
                    label: 'Total Sample',
                    value: (primary.control.visitors + primary.variant.visitors).toLocaleString(),
                    note: 'visitors combined',
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: '#0a0f1a',
                      border: '1px solid #1e293b',
                      borderRadius: 12,
                      padding: '10px 16px',
                      minWidth: 200,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.6rem',
                        color: '#334155',
                        fontWeight: 600,
                        letterSpacing: '0.12em',
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      {s.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        color: '#e2e8f0',
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {s.value}
                    </div>
                    <div
                      style={{
                        fontSize: '0.6rem',
                        color: '#334155',
                        marginTop: 2,
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      {s.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MULTI-VARIANT TABLE */}
            {comparisons.length > 1 && (
              <div style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Sparkles size={14} color="#a78bfa" />
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      color: '#94a3b8',
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    ALL VARIANTS VS CONTROL
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr
                        style={{
                          color: '#475569',
                          textAlign: 'left',
                          fontFamily: "'Geist Mono', monospace",
                          fontSize: '0.66rem',
                          letterSpacing: '0.1em',
                        }}
                      >
                        <th style={{ padding: '8px 12px' }}>VARIANT</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>CR</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>LIFT</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>95% CI</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>CONFIDENCE</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>P(B&gt;A)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center' }}>STATUS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((c) => (
                        <tr key={c.variant.id} style={{ borderTop: '1px solid #1e293b' }}>
                          <td style={{ padding: '12px', color: '#e2e8f0', fontWeight: 500 }}>{c.variant.name}</td>
                          <td
                            style={{
                              padding: '12px',
                              textAlign: 'right',
                              fontFamily: "'Geist Mono', monospace",
                              color: '#cbd5e1',
                            }}
                          >
                            {(c.variant.cr * 100).toFixed(2)}%
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              textAlign: 'right',
                              fontFamily: "'Geist Mono', monospace",
                              color: c.liftCR > 0 ? '#10b981' : c.liftCR < 0 ? '#ef4444' : '#475569',
                            }}
                          >
                            {c.liftCR > 0 ? '+' : ''}
                            {c.liftCR.toFixed(2)}%
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              textAlign: 'right',
                              fontFamily: "'Geist Mono', monospace",
                              color: '#64748b',
                              fontSize: '0.74rem',
                            }}
                          >
                            [{c.ciLow.toFixed(1)}%, {c.ciHigh.toFixed(1)}%]
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              textAlign: 'right',
                              fontFamily: "'Geist Mono', monospace",
                              color: c.confidence >= 95 ? '#10b981' : c.confidence >= 80 ? '#f59e0b' : '#475569',
                            }}
                          >
                            {c.confidence.toFixed(1)}%
                          </td>
                          <td
                            style={{
                              padding: '12px',
                              textAlign: 'right',
                              fontFamily: "'Geist Mono', monospace",
                              color: '#a78bfa',
                            }}
                          >
                            {c.bayesianProb.toFixed(1)}%
                          </td>
                          <td style={{ padding: '12px', textAlign: 'center' }}>
                            <span
                              style={{
                                background: STATUS_CONFIG[c.status].bg,
                                color: STATUS_CONFIG[c.status].color,
                                padding: '3px 10px',
                                borderRadius: 99,
                                fontSize: '0.62rem',
                                fontWeight: 600,
                                letterSpacing: '0.08em',
                                border: `1px solid ${STATUS_CONFIG[c.status].border}`,
                                fontFamily: "'Geist Mono', monospace",
                              }}
                            >
                              {STATUS_CONFIG[c.status].label.replace('CHALLENGER ', '')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* METRICS ROW */}
            <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {/* CR */}
              <div
                className="metric-card"
                style={{
                  background: '#0a0f1a',
                  border: '1.5px solid #1e293b',
                  borderRadius: 16,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MousePointerClick size={14} color="#6366f1" />
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        color: '#334155',
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      CONVERSION RATE
                    </span>
                  </div>
                  <span
                    style={{
                      background: primary.liftCR > 0 ? '#10b98115' : '#ef444415',
                      color: primary.liftCR > 0 ? '#10b981' : '#ef4444',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 99,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    {primary.liftCR > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                    {primary.liftCR > 0 ? '+' : ''}
                    {primary.liftCR.toFixed(2)}%
                  </span>
                </div>
                <CompareBar
                  rows={[
                    { label: 'A · CONTROL', value: primary.control.cr * 100, color: '#64748b' },
                    { label: 'B · VARIANT', value: primary.variant.cr * 100, color: '#6366f1' },
                  ]}
                  format={(n) => n.toFixed(2) + '%'}
                />
              </div>

              {/* RPV */}
              <div
                className="metric-card"
                style={{
                  background: '#0a0f1a',
                  border: '1.5px solid #1e293b',
                  borderRadius: 16,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={14} color="#10b981" />
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        color: '#334155',
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      REVENUE / VISITOR
                    </span>
                  </div>
                  {primary.control.rpv > 0 || primary.variant.rpv > 0 ? (
                    <span
                      style={{
                        background:
                          primary.liftRPV > 0
                            ? '#10b98115'
                            : primary.liftRPV < 0
                            ? '#ef444415'
                            : '#1e293b',
                        color:
                          primary.liftRPV > 0 ? '#10b981' : primary.liftRPV < 0 ? '#ef4444' : '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 99,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      {primary.liftRPV > 0 ? (
                        <ArrowUpRight size={11} />
                      ) : primary.liftRPV < 0 ? (
                        <ArrowDownRight size={11} />
                      ) : (
                        <Minus size={11} />
                      )}
                      {primary.liftRPV !== 0
                        ? (primary.liftRPV > 0 ? '+' : '') + primary.liftRPV.toFixed(2) + '%'
                        : 'N/A'}
                    </span>
                  ) : (
                    <span
                      style={{ fontSize: '0.65rem', color: '#334155', fontFamily: "'Geist Mono', monospace" }}
                    >
                      Add revenue
                    </span>
                  )}
                </div>
                {primary.control.rpv === 0 && primary.variant.rpv === 0 ? (
                  <div
                    style={{
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1e293b',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      lineHeight: 1.6,
                    }}
                  >
                    Enter revenue data
                    <br />
                    to unlock RPV analysis
                  </div>
                ) : (
                  <CompareBar
                    rows={[
                      { label: 'A · CONTROL', value: primary.control.rpv, color: '#64748b' },
                      { label: 'B · VARIANT', value: primary.variant.rpv, color: '#10b981' },
                    ]}
                    format={(n) => '$' + n.toFixed(2)}
                  />
                )}
              </div>

              {/* AOV */}
              <div
                className="metric-card"
                style={{
                  background: '#0a0f1a',
                  border: '1.5px solid #1e293b',
                  borderRadius: 16,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart size={14} color="#f59e0b" />
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        color: '#334155',
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      AVG. ORDER VALUE
                    </span>
                  </div>
                  {primary.control.aov > 0 || primary.variant.aov > 0 ? (
                    <span
                      style={{
                        background:
                          primary.liftAOV > 0
                            ? '#f59e0b15'
                            : primary.liftAOV < 0
                            ? '#ef444415'
                            : '#1e293b',
                        color:
                          primary.liftAOV > 0 ? '#f59e0b' : primary.liftAOV < 0 ? '#ef4444' : '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 99,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      {primary.liftAOV > 0 ? (
                        <ArrowUpRight size={11} />
                      ) : primary.liftAOV < 0 ? (
                        <ArrowDownRight size={11} />
                      ) : (
                        <Minus size={11} />
                      )}
                      {primary.liftAOV !== 0
                        ? (primary.liftAOV > 0 ? '+' : '') + primary.liftAOV.toFixed(2) + '%'
                        : 'N/A'}
                    </span>
                  ) : (
                    <span
                      style={{ fontSize: '0.65rem', color: '#334155', fontFamily: "'Geist Mono', monospace" }}
                    >
                      Add revenue
                    </span>
                  )}
                </div>
                {primary.control.aov === 0 && primary.variant.aov === 0 ? (
                  <div
                    style={{
                      height: 80,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1e293b',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      lineHeight: 1.6,
                    }}
                  >
                    Enter revenue data
                    <br />
                    to unlock AOV analysis
                  </div>
                ) : (
                  <CompareBar
                    rows={[
                      { label: 'A · CONTROL', value: primary.control.aov, color: '#64748b' },
                      { label: 'B · VARIANT', value: primary.variant.aov, color: '#f59e0b' },
                    ]}
                    format={(n) => '$' + n.toFixed(2)}
                  />
                )}
              </div>
            </div>

            {/* CONFIDENCE + PROJECTED */}
            <div className="results-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 16, padding: 24 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      color: '#334155',
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    CONFIDENCE LEVEL BREAKDOWN
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 600,
                      fontSize: '1rem',
                      color:
                        primary.confidence >= 95
                          ? '#10b981'
                          : primary.confidence >= 80
                          ? '#f59e0b'
                          : '#475569',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    <AnimatedNumber value={primary.confidence} decimals={1} suffix="%" />
                  </span>
                </div>
                <div
                  style={{
                    position: 'relative',
                    height: 16,
                    background: '#0f172a',
                    borderRadius: 99,
                    overflow: 'hidden',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                    <div style={{ width: '80%', borderRight: '1px dashed #1e293b' }} />
                    <div style={{ width: '15%', borderRight: '1px dashed #334155' }} />
                  </div>
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 99,
                      background:
                        primary.confidence >= 95
                          ? 'linear-gradient(90deg,#6366f1,#10b981)'
                          : primary.confidence >= 80
                          ? 'linear-gradient(90deg,#6366f1,#f59e0b)'
                          : '#334155',
                      width: `${primary.confidence}%`,
                      transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)',
                      position: 'relative',
                      zIndex: 1,
                      boxShadow:
                        primary.confidence >= 95 ? '0 0 16px rgba(16,185,129,0.4)' : 'none',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.6rem',
                    color: '#334155',
                    fontFamily: "'Geist Mono', monospace",
                  }}
                >
                  <span>0%</span>
                  <span style={{ color: '#475569' }}>80% (Leaning)</span>
                  <span style={{ color: primary.confidence >= 95 ? '#10b981' : '#475569' }}>95% ← Target</span>
                  <span>100%</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,1fr)',
                    gap: 8,
                    marginTop: 16,
                  }}
                >
                  {[
                    { range: '0 – 80%', label: 'Inconclusive', color: '#334155' },
                    { range: '80 – 95%', label: 'Leaning', color: '#f59e0b' },
                    { range: '95 – 100%', label: 'Significant', color: '#10b981' },
                  ].map((z) => (
                    <div
                      key={z.range}
                      style={{
                        background: '#0f172a',
                        borderRadius: 10,
                        padding: '8px 12px',
                        borderLeft: `3px solid ${z.color}`,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Geist Mono', monospace",
                          color: z.color,
                          fontSize: '0.62rem',
                          fontWeight: 500,
                        }}
                      >
                        {z.range}
                      </div>
                      <div
                        style={{
                          color: '#334155',
                          fontSize: '0.62rem',
                          marginTop: 2,
                          fontFamily: "'Geist Mono', monospace",
                        }}
                      >
                        {z.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Zap size={14} color="#f59e0b" />
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      letterSpacing: '0.12em',
                      color: '#334155',
                      fontFamily: "'Geist Mono', monospace",
                    }}
                  >
                    30-DAY IMPACT
                  </span>
                </div>
                {primary.control.rpv > 0 ? (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: '#334155',
                          marginBottom: 6,
                          fontFamily: "'Geist Mono', monospace",
                        }}
                      >
                        Projected Monthly Rev. Lift
                      </div>
                      <div
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          fontSize: '1.9rem',
                          fontWeight: 600,
                          color: primary.monthlyRevLift >= 0 ? '#10b981' : '#ef4444',
                          lineHeight: 1,
                          letterSpacing: '-0.03em',
                        }}
                      >
                        {primary.monthlyRevLift >= 0 ? '+' : '−'}$
                        <AnimatedNumber value={Math.abs(primary.monthlyRevLift)} decimals={0} />
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#334155',
                        lineHeight: 1.6,
                        background: '#0f172a',
                        borderRadius: 10,
                        padding: '10px 12px',
                        fontFamily: "'Geist Mono', monospace",
                      }}
                    >
                      Based on {duration}-day test → 30-day projection. Assumes stable traffic and ship-to-100%.
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      height: 100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#1e293b',
                      fontSize: '0.75rem',
                      textAlign: 'center',
                      lineHeight: 1.6,
                    }}
                  >
                    Add revenue data
                    <br />
                    to see projected impact
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div
            className="fade-up delay-3"
            style={{
              background: '#0a0f1a',
              border: '1.5px dashed #1e293b',
              borderRadius: 20,
              padding: 64,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <div style={{ background: '#0f172a', borderRadius: 16, padding: 20 }}>
              <BarChart2 size={36} color="#1e293b" />
            </div>
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 500,
                color: '#475569',
                fontSize: '1rem',
                letterSpacing: '-0.01em',
              }}
            >
              Enter visitor data above to run the statistical engine
            </p>
            <p style={{ color: '#334155', fontSize: '0.78rem', fontFamily: "'Geist Mono', monospace" }}>
              Results update in real-time as you type
            </p>
          </div>
        )}

        <div className="fade-up delay-4" style={{ marginTop: 20 }}>
          <SampleSizeCalc />
        </div>

        <MethodologyGuide />

        {/* FOOTER */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 28,
            borderTop: '1px solid #0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <p
            style={{
              fontSize: '0.7rem',
              color: '#1e293b',
              fontWeight: 600,
              letterSpacing: '0.15em',
              fontFamily: "'Geist Mono', monospace",
            }}
          >
            CREATED BY SMARTRWL
          </p>
          <div style={{ display: 'flex', gap: 16 }}>
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              style={{ color: '#334155', transition: 'color 0.2s' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#ec4899')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#334155')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://github.com/Smart-rwl/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              style={{ color: '#334155', transition: 'color 0.2s' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#f1f5f9')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#334155')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}