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
  Trophy,
  ShieldAlert,
  AlertTriangle,
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
import { DEFAULT_VARIANTS, MAX_VARIANTS } from '@/app/config/ab-test';
import type {
  Variant,
  VariantMetrics,
  ComparisonMetrics,
  TestStatus,
} from './types';

/* ─────────────────────────────────────────────
   LOCAL STATUS STYLES (orange-themed, replaces external STATUS_CONFIG colors)
───────────────────────────────────────────── */
const STATUS_STYLES: Record<TestStatus, {
  label: string;
  headline: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  hexColor: string;
}> = {
  winner: {
    label: 'WINNER · SHIP IT',
    headline: 'Ship the variant.',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    textClass: 'text-emerald-400',
    hexColor: '#10b981',
  },
  loser: {
    label: 'STOP · KEEP CONTROL',
    headline: 'Keep the control.',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    textClass: 'text-rose-400',
    hexColor: '#f43f5e',
  },
  leaning: {
    label: 'TRENDING',
    headline: 'Keep running the test.',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    textClass: 'text-amber-400',
    hexColor: '#f59e0b',
  },
  neutral: {
    label: 'INCONCLUSIVE',
    headline: 'Need more data.',
    bgClass: 'bg-slate-800/40',
    borderClass: 'border-slate-700',
    textClass: 'text-slate-400',
    hexColor: '#64748b',
  },
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
/** Cohen's h effect size for two proportions — magnitude-of-difference between p1 and p2. */
function cohensH(p1: number, p2: number): number {
  const phi = (p: number) => 2 * Math.asin(Math.sqrt(Math.max(0, Math.min(1, p))));
  return Math.abs(phi(p1) - phi(p2));
}

function cohensHLabel(h: number): { label: string; tone: string } {
  if (h >= 0.8) return { label: 'Large', tone: 'text-emerald-400' };
  if (h >= 0.5) return { label: 'Medium', tone: 'text-amber-400' };
  if (h >= 0.2) return { label: 'Small', tone: 'text-orange-400' };
  return { label: 'Negligible', tone: 'text-slate-500' };
}

const fmtCurrency = (n: number, decimals = 0) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
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
    if (!confirm('Reset all variants and settings?')) return;
    setVariants(DEFAULT_VARIANTS);
    setDuration(30);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  /* ── Per-variant metrics ── */
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

  /* ── Data sanity check ── */
  const sanityIssues = useMemo(() => {
    const issues: { variant: string; text: string }[] = [];
    variantMetrics.forEach((vm) => {
      if (vm.conversions > vm.visitors && vm.visitors > 0) {
        issues.push({
          variant: vm.name,
          text: `${vm.conversions.toLocaleString()} conversions on ${vm.visitors.toLocaleString()} visitors. Likely a typo — conversions can't exceed visitors.`,
        });
      }
      if (vm.visitors > 0 && vm.visitors < 30) {
        issues.push({
          variant: vm.name,
          text: `Only ${vm.visitors} visitors. Below ~30, the Z-test approximation breaks down — use Fisher's exact or wait for more data.`,
        });
      }
      if (vm.revenue > 0 && vm.conversions === 0) {
        issues.push({
          variant: vm.name,
          text: `Revenue (${fmtCurrency(vm.revenue)}) with zero conversions. AOV math will be undefined.`,
        });
      }
    });
    return issues;
  }, [variantMetrics]);

  /* ── Pairwise comparisons (each variant vs control) ── */
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
        control.conversions, control.visitors,
        variant.conversions, variant.visitors,
      );
      const ci = liftConfidenceInterval(
        control.conversions, control.visitors,
        variant.conversions, variant.visitors,
      );
      const bayesianProb = bayesianProbability(
        control.conversions, control.visitors,
        variant.conversions, variant.visitors,
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
        control, variant,
        liftCR, liftRPV, liftAOV,
        zScore: z, pValue: p, confidence, bayesianProb,
        ciLow: ci.low, ciHigh: ci.high,
        status, monthlyRevLift,
      };
    });
  }, [variantMetrics, duration]);

  /* ── Primary comparison + best winner across all variants ── */
  const primary = comparisons[0];
  const bestWinner = useMemo(() => {
    const winners = comparisons.filter((c) => c.status === 'winner' && c.liftCR > 0);
    if (winners.length === 0) return null;
    return winners.reduce((best, c) => (c.liftCR > best.liftCR ? c : best), winners[0]);
  }, [comparisons]);

  /* ── Warnings ── */
  const peekingWarning = useMemo(() => {
    if (!primary) return false;
    const totalSample = primary.control.visitors + primary.variant.visitors;
    return primary.confidence >= 95 && totalSample < 1000;
  }, [primary]);

  const multipleComparisonsWarning = comparisons.length >= 2;
  const bonferroniThreshold = comparisons.length > 0 ? 5 / comparisons.length : 5;

  /* ── Effect size for primary ── */
  const effectSize = useMemo(() => {
    if (!primary) return null;
    const h = cohensH(primary.control.cr, primary.variant.cr);
    return { h, ...cohensHLabel(h) };
  }, [primary]);

  /* ── Share + export ── */
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

  const ss = primary ? STATUS_STYLES[primary.status] : null;

  const verdictIcon = (status: TestStatus) => {
    switch (status) {
      case 'winner':  return <CheckCircle2 className="w-5 h-5" />;
      case 'loser':   return <XCircle className="w-5 h-5" />;
      case 'leaning': return <TrendingUp className="w-5 h-5" />;
      default:        return <Activity className="w-5 h-5" />;
    }
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          70% { box-shadow: 0 0 0 12px rgba(249,115,22,0); }
          100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
        }
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .delay-1 { animation-delay: 0.08s; }
        .delay-2 { animation-delay: 0.16s; }
        .delay-3 { animation-delay: 0.24s; }
        .delay-4 { animation-delay: 0.32s; }
        .shimmer-text {
          background: linear-gradient(90deg, #f97316, #fb923c, #fbbf24, #f97316);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .pulse-orange { animation: pulse-ring 2.5s ease-out infinite; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* Dot pattern background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{
          backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-8 pb-16">

        {/* ─── HEADER ─── */}
        <div className={loaded ? 'fade-up' : ''}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-2.5 shadow-lg shadow-orange-900/30 pulse-orange">
                  <FlaskConical className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold tracking-[0.18em] text-orange-400 font-mono">
                    SMART SELLER TOOLS
                  </span>
                  <span className="block text-[10px] text-slate-600 font-medium tracking-widest font-mono">
                    STATISTICAL ENGINE v3.0
                  </span>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-2 tracking-tight">
                A/B Test <span className="shimmer-text italic font-light">significance</span> calculator
              </h1>
              <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                Frequentist Z-test plus Bayesian probability, multi-variant support, revenue analysis, and shareable results — built for serious e-commerce teams.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 items-stretch md:items-end">
              <div className="flex gap-2 flex-wrap">
                <InfoBadge label="Algorithm" value="Z-Test · Bayesian" />
                <InfoBadge label="Threshold" value={`p < ${(bonferroniThreshold / 100).toFixed(4)}`} />
              </div>
              <div className="flex gap-1.5 flex-wrap md:justify-end">
                <ActionButton onClick={handleShare} icon={<Share2 className="w-3 h-3" />} label={shareMsg || 'Share'} accent="orange" />
                <ActionButton onClick={exportCSV} icon={<Download className="w-3 h-3" />} label="CSV" accent="emerald" disabled={!primary} />
                <ActionButton onClick={handleReset} icon={<RefreshCw className="w-3 h-3" />} label="Reset" accent="rose" />
              </div>
            </div>
          </div>
        </div>

        {/* ─── DURATION + ADD VARIANT ─── */}
        <div className={`${loaded ? 'fade-up delay-1' : ''} flex justify-between items-center gap-3 mb-4 flex-wrap`}>
          <div className="flex items-center gap-2.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <label className="text-[11px] text-slate-500 font-bold tracking-wider font-mono uppercase">
              Test duration
            </label>
            <input
              type="number" min={1}
              value={duration}
              onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 1))}
              className="w-14 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200 font-mono text-sm text-center outline-none focus:border-orange-500 transition"
            />
            <span className="text-[11px] text-slate-500 font-mono">days</span>
          </div>

          {variants.length < MAX_VARIANTS && (
            <button
              onClick={addVariant}
              className="flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 hover:border-orange-500/50 rounded-lg px-3.5 py-2 text-orange-400 hover:text-orange-300 text-xs font-bold transition"
            >
              <Plus className="w-3 h-3" />
              Add variant ({variants.length}/{MAX_VARIANTS})
            </button>
          )}
        </div>

        {/* ─── DATA SANITY WARNINGS ─── */}
        {sanityIssues.length > 0 && (
          <div className="mb-4 bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                Data quality issues ({sanityIssues.length})
              </span>
            </div>
            {sanityIssues.map((iss, i) => (
              <div key={i} className="text-xs text-rose-200/90 leading-relaxed flex gap-2">
                <span className="font-bold text-rose-400 shrink-0">{iss.variant}:</span>
                <span>{iss.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* ─── VARIANTS GRID ─── */}
        <div
          className={`grid gap-5 mb-5 ${
            variants.length === 2 ? 'grid-cols-1 md:grid-cols-2'
            : variants.length === 3 ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2'
          }`}
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

        {/* ─── RESULTS ─── */}
        {primary && ss ? (
          <div className="fade-up delay-3 flex flex-col gap-5">

            {/* WARNINGS BAR */}
            {(peekingWarning || multipleComparisonsWarning) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {peekingWarning && (
                  <WarningCard
                    icon={<AlertCircle className="w-4 h-4" />}
                    tone="amber"
                    title="Possible early-stopping bias"
                    body="Reaching 95% with under 1,000 visitors may be a false positive. Continue running to your pre-planned sample size."
                  />
                )}
                {multipleComparisonsWarning && (
                  <WarningCard
                    icon={<ShieldAlert className="w-4 h-4" />}
                    tone="orange"
                    title={`Multiple-comparisons inflation (${comparisons.length} variants)`}
                    body={<>With {comparisons.length} variants vs control, the family-wise false-positive rate is ~{(100 * (1 - Math.pow(0.95, comparisons.length))).toFixed(1)}%. Apply Bonferroni: require <span className="font-mono font-bold">p &lt; {(bonferroniThreshold / 100).toFixed(4)}</span> per comparison.</>}
                  />
                )}
              </div>
            )}

            {/* VERDICT BANNER */}
            <div className={`rounded-2xl p-6 md:p-8 border ${ss.bgClass} ${ss.borderClass}`}>
              <div className="flex items-center justify-between flex-wrap gap-5">
                <div className="flex items-center gap-5 flex-wrap">
                  <ConfidenceRing confidence={primary.confidence} status={primary.status} />
                  <div className="max-w-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={ss.textClass}>{verdictIcon(primary.status)}</span>
                      <span className={`font-mono text-[11px] font-bold tracking-widest ${ss.textClass}`}>
                        {ss.label}
                      </span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight mb-2 tracking-tight">
                      {ss.headline}
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      {primary.status === 'winner'
                        ? `Variant outperforms Control by ${primary.liftCR.toFixed(2)}% (CR) with ${primary.confidence.toFixed(1)}% confidence. Bayesian P(B>A) = ${primary.bayesianProb.toFixed(1)}%. Safe to ship.`
                        : primary.status === 'loser'
                        ? `Variant underperforms Control by ${Math.abs(primary.liftCR).toFixed(2)}% with ${primary.confidence.toFixed(1)}% confidence. Bayesian P(B>A) = ${primary.bayesianProb.toFixed(1)}%. Do not ship.`
                        : primary.status === 'leaning'
                        ? `Trending but not yet significant (${primary.confidence.toFixed(1)}% / need 95%). Bayesian P(B>A) = ${primary.bayesianProb.toFixed(1)}%. Continue the test.`
                        : `Only ${primary.confidence.toFixed(1)}% confidence. Bayesian P(B>A) = ${primary.bayesianProb.toFixed(1)}%. Keep running — don't decide on this data yet.`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 min-w-[200px]">
                  <StatCell label="Z-Score"           value={primary.zScore.toFixed(3)}                                            note="|z| > 1.96 = significant" />
                  <StatCell label="p-value"           value={primary.pValue.toFixed(4)}                                            note="p < 0.05 = significant" />
                  <StatCell label="Bayesian P(B>A)"   value={primary.bayesianProb.toFixed(1) + '%'}                                note="> 95% = high confidence" />
                  {effectSize && (
                    <StatCell
                      label="Effect size (h)"
                      value={effectSize.h.toFixed(3)}
                      note={effectSize.label}
                      noteClass={effectSize.tone}
                    />
                  )}
                  <StatCell label="Total Sample"      value={(primary.control.visitors + primary.variant.visitors).toLocaleString()} note="visitors combined" />
                </div>
              </div>
            </div>

            {/* MULTI-VARIANT TABLE (with best-winner highlight) */}
            {comparisons.length > 1 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[11px] font-bold tracking-widest text-slate-400 font-mono uppercase">
                    All variants vs control
                  </span>
                  {bestWinner && (
                    <span className="ml-auto flex items-center gap-1.5 text-[11px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full px-2.5 py-0.5 font-bold font-mono">
                      <Trophy className="w-3 h-3" />
                      Best: {bestWinner.variant.name}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 font-mono text-[10px] tracking-widest uppercase">
                        <th className="px-3 py-2">Variant</th>
                        <th className="px-3 py-2 text-right">CR</th>
                        <th className="px-3 py-2 text-right">Lift</th>
                        <th className="px-3 py-2 text-right">95% CI</th>
                        <th className="px-3 py-2 text-right">Confidence</th>
                        <th className="px-3 py-2 text-right">P(B&gt;A)</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisons.map((c) => {
                        const isBest = bestWinner && c.variant.id === bestWinner.variant.id;
                        const cs = STATUS_STYLES[c.status];
                        return (
                          <tr
                            key={c.variant.id}
                            className={`border-t border-slate-800 ${isBest ? 'bg-emerald-500/5' : 'hover:bg-slate-800/30'} transition`}
                          >
                            <td className="px-3 py-3 text-slate-100 font-medium">
                              <div className="flex items-center gap-2">
                                {isBest && <Trophy className="w-3.5 h-3.5 text-emerald-400" />}
                                {c.variant.name}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-300">
                              {(c.variant.cr * 100).toFixed(2)}%
                            </td>
                            <td className={`px-3 py-3 text-right font-mono ${c.liftCR > 0 ? 'text-emerald-400' : c.liftCR < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                              {c.liftCR > 0 ? '+' : ''}{c.liftCR.toFixed(2)}%
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-slate-500 text-xs">
                              [{c.ciLow.toFixed(1)}%, {c.ciHigh.toFixed(1)}%]
                            </td>
                            <td className={`px-3 py-3 text-right font-mono ${c.confidence >= 95 ? 'text-emerald-400' : c.confidence >= 80 ? 'text-amber-400' : 'text-slate-500'}`}>
                              {c.confidence.toFixed(1)}%
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-orange-400">
                              {c.bayesianProb.toFixed(1)}%
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border font-mono ${cs.bgClass} ${cs.borderClass} ${cs.textClass}`}>
                                {cs.label.split(' · ')[0]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* METRICS ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                icon={<MousePointerClick className="w-3.5 h-3.5 text-orange-400" />}
                label="Conversion rate"
                primary={primary}
                liftValue={primary.liftCR}
                hasData={primary.control.cr > 0 || primary.variant.cr > 0}
                emptyText="Add visitor & conversion data"
                bar={
                  <CompareBar
                    rows={[
                      { label: 'A · CONTROL', value: primary.control.cr * 100, color: '#64748b' },
                      { label: 'B · VARIANT', value: primary.variant.cr * 100, color: '#f97316' },
                    ]}
                    format={(n) => n.toFixed(2) + '%'}
                  />
                }
              />
              <MetricCard
                icon={<DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
                label="Revenue / visitor"
                primary={primary}
                liftValue={primary.liftRPV}
                hasData={primary.control.rpv > 0 || primary.variant.rpv > 0}
                emptyText="Enter revenue data to unlock RPV"
                bar={
                  <CompareBar
                    rows={[
                      { label: 'A · CONTROL', value: primary.control.rpv, color: '#64748b' },
                      { label: 'B · VARIANT', value: primary.variant.rpv, color: '#10b981' },
                    ]}
                    format={(n) => '$' + n.toFixed(2)}
                  />
                }
              />
              <MetricCard
                icon={<BarChart className="w-3.5 h-3.5 text-amber-400" />}
                label="Avg. order value"
                primary={primary}
                liftValue={primary.liftAOV}
                hasData={primary.control.aov > 0 || primary.variant.aov > 0}
                emptyText="Enter revenue data to unlock AOV"
                bar={
                  <CompareBar
                    rows={[
                      { label: 'A · CONTROL', value: primary.control.aov, color: '#64748b' },
                      { label: 'B · VARIANT', value: primary.variant.aov, color: '#f59e0b' },
                    ]}
                    format={(n) => '$' + n.toFixed(2)}
                  />
                }
              />
            </div>

            {/* CONFIDENCE + PROJECTED IMPACT */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-5">
                  <span className="text-[11px] font-bold tracking-widest text-slate-500 font-mono uppercase">
                    Confidence level breakdown
                  </span>
                  <span
                    className={`text-base font-bold ${
                      primary.confidence >= 95 ? 'text-emerald-400'
                      : primary.confidence >= 80 ? 'text-amber-400'
                      : 'text-slate-500'
                    }`}
                  >
                    <AnimatedNumber value={primary.confidence} decimals={1} suffix="%" />
                  </span>
                </div>

                <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden mb-2.5 border border-slate-800">
                  {/* Zone dividers */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    <div className="w-[80%] border-r border-dashed border-slate-700" />
                    <div className="w-[15%] border-r border-dashed border-slate-600" />
                  </div>
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      primary.confidence >= 95
                        ? 'bg-gradient-to-r from-orange-500 to-emerald-500 shadow-lg shadow-emerald-500/30'
                        : primary.confidence >= 80
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${primary.confidence}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0%</span>
                  <span className="text-slate-400">80% (Leaning)</span>
                  <span className={primary.confidence >= 95 ? 'text-emerald-400' : 'text-slate-400'}>95% ← Target</span>
                  <span>100%</span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4">
                  <ZoneBox range="0 – 80%"    label="Inconclusive" color="bg-slate-500"  textColor="text-slate-500" />
                  <ZoneBox range="80 – 95%"   label="Leaning"      color="bg-amber-500"   textColor="text-amber-400" />
                  <ZoneBox range="95 – 100%"  label="Significant"  color="bg-emerald-500" textColor="text-emerald-400" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] font-bold tracking-widest text-slate-500 font-mono uppercase">
                    30-Day Impact
                  </span>
                </div>
                {primary.control.rpv > 0 ? (
                  <>
                    <div className="mb-4">
                      <div className="text-[11px] text-slate-500 mb-1.5 font-mono">
                        Projected monthly rev. lift
                      </div>
                      <div className={`text-3xl font-bold leading-none tracking-tight ${primary.monthlyRevLift >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {primary.monthlyRevLift >= 0 ? '+' : '−'}$<AnimatedNumber value={Math.abs(primary.monthlyRevLift)} decimals={0} />
                      </div>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-500 leading-relaxed font-mono">
                      Based on {duration}-day test → 30-day projection. Assumes stable traffic and ship-to-100%.
                    </div>
                  </>
                ) : (
                  <div className="h-24 flex items-center justify-center text-slate-600 text-xs text-center leading-relaxed">
                    Add revenue data<br />to see projected impact
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className={`${loaded ? 'fade-up delay-3' : ''} bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-16 flex flex-col items-center justify-center gap-4`}>
            <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800">
              <BarChart2 className="w-9 h-9 text-slate-700" />
            </div>
            <p className="font-medium text-slate-400 text-base tracking-tight">
              Enter visitor data above to run the statistical engine
            </p>
            <p className="text-slate-600 text-xs font-mono">
              Results update in real-time as you type
            </p>
          </div>
        )}

        <div className={`${loaded ? 'fade-up delay-4' : ''} mt-5`}>
          <SampleSizeCalc />
        </div>

        <MethodologyGuide />

        {/* ─── CREATOR FOOTER ─── */}
        <div className="mt-14 pt-8 border-t border-slate-800 flex flex-col items-center gap-3">
          <p className="text-[11px] text-slate-600 font-bold tracking-[0.2em] font-mono">
            CREATED BY SMARTRWL
          </p>
          <div className="flex gap-4">
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-slate-600 hover:text-pink-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="text-slate-600 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-right">
      <div className="text-[10px] text-slate-600 font-bold tracking-widest font-mono">{label}</div>
      <div className="font-mono text-orange-400 text-xs font-medium mt-0.5">{value}</div>
    </div>
  );
}

function ActionButton({
  onClick, icon, label, accent, disabled,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  accent: 'orange' | 'emerald' | 'rose';
  disabled?: boolean;
}) {
  const hover = {
    orange:  'hover:border-orange-500/50 hover:text-orange-400',
    emerald: 'hover:border-emerald-500/50 hover:text-emerald-400',
    rose:    'hover:border-rose-500/50 hover:text-rose-400',
  }[accent];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-500 text-xs font-medium transition disabled:opacity-30 disabled:cursor-not-allowed ${disabled ? '' : hover}`}
    >
      {icon} {label}
    </button>
  );
}

function StatCell({
  label, value, note, noteClass,
}: {
  label: string;
  value: string;
  note: string;
  noteClass?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 min-w-[200px]">
      <div className="text-[10px] text-slate-600 font-bold tracking-widest font-mono uppercase">
        {label}
      </div>
      <div className="text-lg font-bold text-slate-100 leading-tight tracking-tight">
        {value}
      </div>
      <div className={`text-[10px] mt-0.5 font-mono ${noteClass ?? 'text-slate-600'}`}>
        {note}
      </div>
    </div>
  );
}

function WarningCard({
  icon, tone, title, body,
}: {
  icon: React.ReactNode;
  tone: 'amber' | 'orange';
  title: string;
  body: React.ReactNode;
}) {
  const config = {
    amber:  { bg: 'bg-amber-950/20',  border: 'border-amber-500/30',  text: 'text-amber-300',  body: 'text-amber-200/80' },
    orange: { bg: 'bg-orange-950/20', border: 'border-orange-500/30', text: 'text-orange-300', body: 'text-orange-200/80' },
  }[tone];
  return (
    <div className={`${config.bg} ${config.border} border rounded-xl px-4 py-3 flex items-start gap-3`}>
      <span className={config.text}>{icon}</span>
      <div>
        <div className={`${config.text} text-xs font-bold mb-1`}>{title}</div>
        <div className={`${config.body} text-xs leading-relaxed`}>{body}</div>
      </div>
    </div>
  );
}

function MetricCard({
  icon, label, primary, liftValue, hasData, emptyText, bar,
}: {
  icon: React.ReactNode;
  label: string;
  primary: ComparisonMetrics;
  liftValue: number;
  hasData: boolean;
  emptyText: string;
  bar: React.ReactNode;
}) {
  const liftColor =
    liftValue > 0 ? 'bg-emerald-500/15 text-emerald-400'
    : liftValue < 0 ? 'bg-rose-500/15 text-rose-400'
    : 'bg-slate-800 text-slate-500';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 hover:-translate-y-0.5 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[10px] font-bold tracking-widest text-slate-500 font-mono uppercase">
            {label}
          </span>
        </div>
        {hasData ? (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono ${liftColor}`}>
            {liftValue > 0 ? <ArrowUpRight className="w-3 h-3" /> : liftValue < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {liftValue !== 0 ? (liftValue > 0 ? '+' : '') + liftValue.toFixed(2) + '%' : 'N/A'}
          </span>
        ) : (
          <span className="text-[10px] text-slate-600 font-mono">Add revenue</span>
        )}
      </div>
      {hasData ? bar : (
        <div className="h-20 flex items-center justify-center text-slate-700 text-xs text-center leading-relaxed">
          {emptyText}
        </div>
      )}
    </div>
  );
}

function ZoneBox({
  range, label, color, textColor,
}: { range: string; label: string; color: string; textColor: string }) {
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 border-l-[3px]" style={{ borderLeftColor: color.replace('bg-', '#') }}>
      <div className={`${textColor} font-mono text-[10px] font-medium`}>{range}</div>
      <div className="text-slate-600 text-[10px] mt-0.5 font-mono">{label}</div>
    </div>
  );
}