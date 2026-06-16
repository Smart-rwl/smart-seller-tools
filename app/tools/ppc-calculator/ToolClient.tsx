'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  BookOpen,
  MousePointerClick,
  Crosshair,
  Calculator,
  Lightbulb,
  Rocket,
  RefreshCw,
  Sparkles,
  Info,
  Flame,
  Shield,
  Scale,
  ChevronDown,
  Filter,
} from 'lucide-react';

import {
  calculateMetrics,
  calculateScaleProjection,
  generateInsights,
  safeNum,
  ACOS_INFINITE,
  DEFAULT_SCALE_DECAY,
  type CampaignInputs,
  type Preset,
  type InsightType,
} from '@/lib/ppc-calculations';

/* ─────────────────────────────────────────────
   TYPES + CONSTANTS
───────────────────────────────────────────── */

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const DEFAULTS: CampaignInputs = {
  adSpend: 5000,
  adSales: 15000,
  totalSales: 45000,
  cpc: 15,
  sellingPrice: 1000,
  landedCost: 400,
  targetProfitMargin: 10,
};

const STORAGE_KEY = 'smartrwl-ppc-engine-v3';

interface PersistedState extends CampaignInputs {
  activePreset: Preset | null;
  currency: CurrencyCode;
}

/* ─────────────────────────────────────────────
   STORAGE (SSR-safe)
───────────────────────────────────────────── */

function loadFromStorage(): PersistedState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as PersistedState;
  } catch {
    return null;
  }
}

function saveToStorage(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* quota / private mode — silently degrade */ }
}

/* ─────────────────────────────────────────────
   FORMATTING
───────────────────────────────────────────── */

function fmtCurrency(n: number, code: CurrencyCode): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  if (!Number.isFinite(n)) return `${c.symbol}0`;
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${c.symbol}${Math.round(n).toLocaleString()}`;
  }
}

function fmtNumber(n: number, code: CurrencyCode): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  return Number.isFinite(n) ? Math.round(n).toLocaleString(c.locale) : '0';
}

/* ═════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════ */

export default function AdProfitabilityEngine() {
  /* Inputs (SSR-safe defaults first, hydrate in effect) */
  const [adSpend, setAdSpend] = useState<number>(DEFAULTS.adSpend);
  const [adSales, setAdSales] = useState<number>(DEFAULTS.adSales);
  const [totalSales, setTotalSales] = useState<number>(DEFAULTS.totalSales);
  const [cpc, setCpc] = useState<number>(DEFAULTS.cpc);
  const [sellingPrice, setSellingPrice] = useState<number>(DEFAULTS.sellingPrice);
  const [landedCost, setLandedCost] = useState<number>(DEFAULTS.landedCost);
  const [targetProfitMargin, setTargetProfitMargin] = useState<number>(DEFAULTS.targetProfitMargin);
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [hydrated, setHydrated] = useState(false);

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setAdSpend(safeNum(saved.adSpend));
      setAdSales(safeNum(saved.adSales));
      setTotalSales(safeNum(saved.totalSales));
      setCpc(safeNum(saved.cpc));
      setSellingPrice(safeNum(saved.sellingPrice));
      setLandedCost(safeNum(saved.landedCost));
      setTargetProfitMargin(safeNum(saved.targetProfitMargin));
      setActivePreset(saved.activePreset ?? null);
      if (saved.currency && CURRENCIES.some((c) => c.code === saved.currency)) {
        setCurrency(saved.currency);
      }
    }
    setHydrated(true);
  }, []);

  /* Persist after hydration */
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage({
      adSpend, adSales, totalSales, cpc, sellingPrice, landedCost,
      targetProfitMargin, activePreset, currency,
    });
  }, [hydrated, adSpend, adSales, totalSales, cpc, sellingPrice, landedCost, targetProfitMargin, activePreset, currency]);

  /* Inject fonts once */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'smartrwl-ppc-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  /* Derived */
  const inputs: CampaignInputs = useMemo(() => ({
    adSpend, adSales, totalSales, cpc, sellingPrice, landedCost, targetProfitMargin,
  }), [adSpend, adSales, totalSales, cpc, sellingPrice, landedCost, targetProfitMargin]);

  const metrics = useMemo(() => calculateMetrics(inputs), [inputs]);

  const fmt = (n: number) => fmtCurrency(n, currency);
  const fmtN = (n: number) => fmtNumber(n, currency);
  const symbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '₹';

  const insights = useMemo(
    () => generateInsights(metrics, inputs),
    [metrics, inputs],
  );

  const scaleProjections = useMemo(
    () => [1, 1.5, 2, 3].map((mult) => calculateScaleProjection(inputs, mult, DEFAULT_SCALE_DECAY)),
    [inputs],
  );

  /* Actions */
  const applyPreset = (preset: Preset) => {
    setActivePreset(preset);
    if (preset === 'growth') setTargetProfitMargin(5);
    if (preset === 'balanced') setTargetProfitMargin(10);
    if (preset === 'profit') setTargetProfitMargin(20);
  };

  const handleSliderChange = (value: number) => {
    setTargetProfitMargin(value);
    const presetValues: Record<Preset, number> = { growth: 5, balanced: 10, profit: 20 };
    if (activePreset && presetValues[activePreset] !== value) {
      setActivePreset(null);
    }
  };

  const resetAll = () => {
    if (!confirm('Reset all campaign inputs to defaults? This will clear your saved state.')) return;
    setAdSpend(DEFAULTS.adSpend);
    setAdSales(DEFAULTS.adSales);
    setTotalSales(DEFAULTS.totalSales);
    setCpc(DEFAULTS.cpc);
    setSellingPrice(DEFAULTS.sellingPrice);
    setLandedCost(DEFAULTS.landedCost);
    setTargetProfitMargin(DEFAULTS.targetProfitMargin);
    setActivePreset(null);
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  };

  /* Display config */
  const statusConfig: Record<typeof metrics.status, { dot: string; label: string; glow: string }> = {
    profitable:   { dot: 'bg-emerald-400',           label: 'Profitable',     glow: 'shadow-emerald-500/20' },
    'break-even': { dot: 'bg-amber-400',             label: 'Break-even',     glow: 'shadow-amber-500/20' },
    loss:         { dot: 'bg-rose-400',              label: 'Losing money',   glow: 'shadow-rose-500/20' },
    critical:     { dot: 'bg-rose-500 animate-pulse',label: 'Critical loss',  glow: 'shadow-rose-600/30' },
  };

  const gaugeMax = Math.max(metrics.breakEvenAcos * 1.5, 30);
  const acosPct = Math.min((metrics.acos / gaugeMax) * 100, 100);
  const targetPct = Math.min((metrics.targetAcos / gaugeMax) * 100, 100);
  const breakEvenPct = Math.min((metrics.breakEvenAcos / gaugeMax) * 100, 100);

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';
  const inputBaseClass = `w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white font-mono text-sm outline-none transition-colors hover:border-slate-700 focus:border-orange-400/60 ${focusRing}`;

  return (
    <>
      <style>{`
        .ppc-app {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          font-feature-settings: 'cv11', 'ss01', 'ss03';
        }
        .ppc-app .font-display {
          font-family: 'Instrument Serif', 'Georgia', serif;
          font-weight: 400;
          letter-spacing: -0.02em;
        }
        .ppc-app .font-mono {
          font-family: 'JetBrains Mono', 'Menlo', monospace;
          font-feature-settings: 'tnum', 'zero';
        }
        .ppc-grid-bg {
          background-image:
            linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.04) 1px, transparent 1px);
          background-size: 48px 48px;
          background-position: -1px -1px;
        }
        .ppc-tick { font-variant-numeric: tabular-nums; }
        @keyframes ppc-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ppc-fade { animation: ppc-fade-in 0.3s ease-out; }
      `}</style>

      <div className="ppc-app min-h-screen bg-slate-950 text-slate-200 ppc-grid-bg">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-12">

          {/* ─── HEADER ─── */}
          <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10 pb-8 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-orange-400/80 mb-2 font-bold">
                <span className="w-6 h-px bg-orange-400/60" />
                SmartRwl · PPC Terminal
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white leading-none flex items-center gap-3">
                <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" strokeWidth={1.5} />
                Profitability Engine
              </h1>
              <p className="text-slate-400 mt-3 text-sm sm:text-base max-w-xl">
                Advanced ACOS, TACoS, and bid optimization — built for sellers who scale on data, not vibes.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <CurrencyPicker value={currency} onChange={setCurrency} focusRing={focusRing} />
              <button
                onClick={resetAll}
                className={`flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-900/50 backdrop-blur px-3 py-2 rounded-md transition-colors ${focusRing}`}
                aria-label="Reset all inputs to defaults and clear saved state"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
              <div
                className={`flex items-center gap-2 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-md border border-slate-800 shadow-lg ${statusConfig[metrics.status].glow}`}
                role="status" aria-live="polite"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[metrics.status].dot}`} />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.15em]">
                  {statusConfig[metrics.status].label}
                </span>
              </div>
            </div>
          </header>

          {/* ─── PRESET BAR ─── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8 bg-gradient-to-r from-slate-900/80 to-slate-900/30 border border-slate-800 rounded-md p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold pr-3 sm:border-r sm:border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Strategy
            </div>
            <div className="grid grid-cols-3 sm:flex gap-2 flex-1">
              <PresetButton active={activePreset === 'growth'}   onClick={() => applyPreset('growth')}   color="orange"  icon={<Flame className="w-3.5 h-3.5" />}  label="Growth"   subtitle="5% margin"  focusRing={focusRing} />
              <PresetButton active={activePreset === 'balanced'} onClick={() => applyPreset('balanced')} color="sky"     icon={<Scale className="w-3.5 h-3.5" />}  label="Balanced" subtitle="10% margin" focusRing={focusRing} />
              <PresetButton active={activePreset === 'profit'}   onClick={() => applyPreset('profit')}   color="emerald" icon={<Shield className="w-3.5 h-3.5" />} label="Profit"   subtitle="20% margin" focusRing={focusRing} />
            </div>
          </div>

          {/* ─── MAIN GRID ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-16">

            {/* ── LEFT: INPUTS ── */}
            <div className="lg:col-span-4 space-y-6">

              <Panel title="Campaign Data" icon={<BarChart3 className="w-3.5 h-3.5 text-sky-400" />}>
                <Field label={`Ad Spend (${symbol})`}>
                  <input type="number" min={0} value={adSpend === 0 ? '' : adSpend} onChange={(e) => setAdSpend(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                </Field>
                <Field label="Ad Sales (Revenue)">
                  <input type="number" min={0} value={adSales === 0 ? '' : adSales} onChange={(e) => setAdSales(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                </Field>
                <Field label="Total Sales (Ad + Organic)">
                  <input type="number" min={0} value={totalSales === 0 ? '' : totalSales} onChange={(e) => setTotalSales(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                </Field>
              </Panel>

              <Panel title="Unit Economics" icon={<Target className="w-3.5 h-3.5 text-emerald-400" />}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CPC (Avg)">
                    <input type="number" min={0} step={0.5} value={cpc === 0 ? '' : cpc} onChange={(e) => setCpc(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                  </Field>
                  <Field label="Price">
                    <input type="number" min={0} value={sellingPrice === 0 ? '' : sellingPrice} onChange={(e) => setSellingPrice(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                  </Field>
                </div>
                <Field label="Landed Cost">
                  <input type="number" min={0} value={landedCost === 0 ? '' : landedCost} onChange={(e) => setLandedCost(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                </Field>

                <div className="bg-slate-950 border border-slate-800 rounded-md p-3 mt-2">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider">
                    <span className="text-slate-500 font-bold">Gross Margin</span>
                    <span className={`font-mono font-bold text-sm ppc-tick ${metrics.marginPct >= 30 ? 'text-emerald-400' : metrics.marginPct >= 15 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {metrics.marginPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/60 h-1 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${metrics.marginPct >= 30 ? 'bg-emerald-400' : metrics.marginPct >= 15 ? 'bg-amber-400' : 'bg-rose-400'}`}
                      style={{ width: `${Math.min(Math.max(metrics.marginPct, 0), 100)}%` }}
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="Profit Strategy" icon={<Calculator className="w-3.5 h-3.5 text-orange-400" />}>
                <div>
                  <div className="flex justify-between mb-2">
                    <label htmlFor="target-margin-slider" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Desired Net Margin
                    </label>
                    <span className="text-xs text-orange-400 font-mono font-bold ppc-tick">
                      {targetProfitMargin}%
                    </span>
                  </div>
                  <input
                    id="target-margin-slider"
                    type="range" min={0} max={30} step={1}
                    value={targetProfitMargin}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className={`w-full accent-orange-500 ${focusRing}`}
                    aria-valuemin={0} aria-valuemax={30} aria-valuenow={targetProfitMargin}
                  />
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    Keep <span className="text-slate-300 font-mono font-bold">{targetProfitMargin}%</span> net profit after ad spend on every sale.
                  </p>
                </div>
              </Panel>
            </div>

            {/* ── RIGHT: INTELLIGENCE ── */}
            <div className="lg:col-span-8 space-y-6">

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="Actual ACOS" value={metrics.acos >= ACOS_INFINITE ? '∞' : `${metrics.acos.toFixed(1)}%`} danger={metrics.status === 'loss' || metrics.status === 'critical'} />
                <KpiCard label="ROAS" value={`${metrics.roas.toFixed(2)}×`} />
                <KpiCard label="TACoS" value={`${metrics.tacos.toFixed(1)}%`} />
                <KpiCard label="Target ACOS" value={`${metrics.targetAcos.toFixed(1)}%`} accent="orange" />
              </div>

              {/* ACOS gauge */}
              <Panel title="ACOS Position" icon={<Target className="w-3.5 h-3.5 text-orange-400" />} rightSlot={<span className="text-[10px] text-slate-500 font-mono">0–{gaugeMax.toFixed(0)}%</span>}>
                <div className="relative h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500/30 to-emerald-500/50" style={{ width: `${targetPct}%` }} />
                  <div className="absolute top-0 h-full bg-gradient-to-r from-amber-500/30 to-amber-500/50" style={{ left: `${targetPct}%`, width: `${Math.max(breakEvenPct - targetPct, 0)}%` }} />
                  <div className="absolute top-0 h-full bg-gradient-to-r from-rose-500/30 to-rose-500/50" style={{ left: `${breakEvenPct}%`, right: 0 }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full shadow-lg shadow-white/40 transition-all duration-500" style={{ left: `calc(${acosPct}% - 2px)` }} aria-hidden />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-[10px]">
                  <div>
                    <div className="text-emerald-400 font-bold uppercase tracking-wider">Profit zone</div>
                    <div className="text-slate-500 font-mono ppc-tick mt-0.5">≤ {metrics.targetAcos.toFixed(1)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-400 font-bold uppercase tracking-wider">Caution</div>
                    <div className="text-slate-500 font-mono ppc-tick mt-0.5">up to {metrics.breakEvenAcos.toFixed(1)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-rose-400 font-bold uppercase tracking-wider">Loss zone</div>
                    <div className="text-slate-500 font-mono ppc-tick mt-0.5">&gt; {metrics.breakEvenAcos.toFixed(1)}%</div>
                  </div>
                </div>
              </Panel>

              {/* Net Ad Profit hero */}
              <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-md p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.06] pointer-events-none">
                  <DollarSign className="w-40 h-40 sm:w-56 sm:h-56 text-white" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Net ad profit</h3>
                  <div className="flex items-baseline gap-4 mb-5 flex-wrap">
                    <span className={`font-display text-5xl sm:text-6xl md:text-7xl transition-colors ppc-tick ${
                      metrics.netAdProfit > 0 ? 'text-emerald-300'
                      : metrics.netAdProfit < 0 ? 'text-rose-300'
                      : 'text-slate-400'
                    }`}>
                      {metrics.netAdProfit > 0 ? '+' : ''}{fmt(metrics.netAdProfit)}
                    </span>
                    <span className="text-slate-400 text-sm italic">from paid traffic</span>
                  </div>
                  <div className="w-full bg-slate-950/80 rounded-md p-3 border border-slate-800 flex gap-3 text-xs">
                    {metrics.netAdProfit > 0 ? (
                      <p className="text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        Ads are generating real profit. Consider scaling up.
                      </p>
                    ) : (
                      <p className="text-rose-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        Losing money on every ad sale — adjust bids or pause.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Smart Insights */}
              <Panel title="Smart Insights" icon={<Lightbulb className="w-3.5 h-3.5 text-amber-400" />}>
                <div className="space-y-2 ppc-fade">
                  {insights.map((insight, i) => (
                    <InsightRow key={i} type={insight.type} text={insight.text} />
                  ))}
                </div>
              </Panel>

              {/* NEW: Ad Funnel Visualization */}
              <AdFunnelPanel
                clicks={metrics.clicks}
                orders={metrics.orders}
                conversionRate={metrics.conversionRate}
                cpa={metrics.cpa}
                clicksToSale={metrics.clicksToSale}
                fmt={fmt}
                fmtN={fmtN}
              />

              {/* Recommended Bids */}
              <Panel title="Recommended Bids" icon={<Crosshair className="w-3.5 h-3.5 text-orange-400" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-md bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max safe bid · break-even</span>
                    <div className="flex justify-between items-end">
                      <span className="text-xl font-bold text-white font-mono ppc-tick">{fmt(metrics.maxSafeBid)}</span>
                      <span className="text-[10px] text-amber-400">0% profit</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-amber-500/[0.07] border border-amber-500/30">
                    <span className="text-[10px] text-amber-300 uppercase tracking-wider block mb-1">Golden bid · target profit</span>
                    <div className="flex justify-between items-end">
                      <span className="text-xl font-bold text-amber-300 font-mono ppc-tick">{fmt(metrics.goldenBid)}</span>
                      <span className="text-[10px] text-amber-300">{targetProfitMargin}% profit</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                  Bid <b className="text-slate-300 font-mono">{fmt(metrics.goldenBid)}</b> to maintain your <b className="text-amber-300">{targetProfitMargin}%</b> margin goal.
                </p>
              </Panel>

              {/* Bid Sensitivity */}
              <Panel title="Bid Sensitivity by Conversion Rate" icon={<TrendingUp className="w-3.5 h-3.5 text-orange-400" />}>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[5, 10, 15, 20].map((cv) => {
                    const bid = sellingPrice * (cv / 100) * (metrics.targetAcos / 100);
                    const isClose = Math.abs(cv - metrics.conversionRate) < 2.5;
                    return (
                      <div
                        key={cv}
                        className={`p-2 sm:p-3 rounded-md border transition-all ${
                          isClose
                            ? 'bg-orange-400/15 border-orange-400/60 text-white scale-105 shadow-lg shadow-orange-500/10'
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        <div className="text-[10px] uppercase tracking-wider mb-1">CvR {cv}%</div>
                        <div className="font-mono font-bold text-sm ppc-tick">{fmt(bid)}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-3 text-center leading-relaxed">
                  Higher conversion rate → afford to bid more per click for the same target ACOS.
                </p>
              </Panel>

              {/* Scale Projection */}
              <Panel
                title="Scale Projection"
                icon={<Rocket className="w-3.5 h-3.5 text-orange-400" />}
                rightSlot={<span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">Decay-adjusted</span>}
              >
                <div className="overflow-x-auto -mx-2 px-2">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800">
                        <th className="text-left py-2 font-bold">Scale</th>
                        <th className="text-right py-2 font-bold">Spend</th>
                        <th className="text-right py-2 font-bold">Sales</th>
                        <th className="text-right py-2 font-bold">Profit</th>
                        <th className="text-right py-2 font-bold">Implied CR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scaleProjections.map((p) => (
                        <tr key={p.mult} className={`border-b border-slate-800/40 ${p.mult === 1 ? 'bg-slate-800/20' : ''}`}>
                          <td className="py-2.5 text-slate-300 font-medium">{p.mult === 1 ? 'Current' : `${p.mult}×`}</td>
                          <td className="text-right text-slate-400 font-mono ppc-tick">{fmt(p.spend)}</td>
                          <td className="text-right text-slate-400 font-mono ppc-tick">{fmt(p.sales)}</td>
                          <td className={`text-right font-mono font-bold ppc-tick ${p.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.profit > 0 ? '+' : ''}{fmt(p.profit)}
                          </td>
                          <td className="text-right text-slate-500 font-mono ppc-tick text-xs">{p.conversionRate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 bg-amber-500/[0.05] border border-amber-500/20 rounded-md p-3 flex gap-2 text-[10px] text-amber-200/80 leading-relaxed">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <b className="text-amber-300">Realistic model:</b> conversion rate decays {(DEFAULT_SCALE_DECAY * 100).toFixed(0)}% per doubling of spend, because high-intent searches get exhausted first. Profit growth is sub-linear — plan accordingly.
                  </span>
                </div>
              </Panel>
            </div>
          </div>

          {/* ─── GUIDE ─── */}
          <section className="border-t border-slate-800 pt-12 mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-white mb-2 flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-orange-400" strokeWidth={1.5} />
              PPC master guide
            </h2>
            <p className="text-slate-400 text-sm mb-8">The three concepts every Amazon seller must internalize.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GuideCard icon={<BarChart3 className="w-5 h-5 text-sky-400" />} iconBg="bg-sky-500/10 border-sky-500/30" title="ACOS vs. TACoS">
                <b className="text-slate-200">ACOS</b> checks ad efficiency. <b className="text-slate-200">TACoS</b> checks business health. If ACOS is high but TACoS is below 10%, your organic sales are strong enough to support aggressive ads.
              </GuideCard>
              <GuideCard icon={<Target className="w-5 h-5 text-emerald-400" />} iconBg="bg-emerald-500/10 border-emerald-500/30" title="The break-even rule">
                Your break-even ACOS equals your <b className="text-slate-200">gross margin %</b>. With 30% margin, you can spend up to 30% of sales on ads without losing money — but that&apos;s zero profit.
              </GuideCard>
              <GuideCard icon={<Crosshair className="w-5 h-5 text-amber-400" />} iconBg="bg-amber-500/10 border-amber-500/30" title="Golden bid strategy">
                Don&apos;t bid to break even — bid to <b className="text-slate-200">profit</b>. The Golden Bid sets your max keyword bid so every sale leaves <b className="text-amber-300">{targetProfitMargin}%</b> in your pocket.
              </GuideCard>
            </div>
          </section>

          {/* ─── FOOTER ─── */}
          <footer className="flex flex-col items-center justify-center space-y-3 border-t border-slate-800 pt-8">
            <p className="text-slate-500 font-medium text-sm">
              Created by <span className="font-display text-slate-300 text-base">SmartRwl</span>
            </p>
            <div className="flex space-x-4">
              <a href="http://www.instagram.com/smartrwl" target="_blank" rel="noopener noreferrer" className={`text-slate-600 hover:text-pink-400 transition-colors rounded-full p-1 ${focusRing}`} title="Instagram" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="https://github.com/Smart-rwl/" target="_blank" rel="noopener noreferrer" className={`text-slate-600 hover:text-white transition-colors rounded-full p-1 ${focusRing}`} title="GitHub" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                </svg>
              </a>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

interface PanelProps {
  title: string;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}
function Panel({ title, icon, rightSlot, children }: PanelProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur rounded-md border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {rightSlot}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  danger?: boolean;
  accent?: 'orange';
}
function KpiCard({ label, value, danger, accent }: KpiCardProps) {
  let cls = 'bg-slate-900/60 backdrop-blur border border-slate-800 rounded-md p-4 transition-colors';
  if (danger) cls = 'bg-rose-950/30 backdrop-blur border border-rose-900/60 rounded-md p-4 transition-colors';
  if (accent === 'orange') cls = 'bg-orange-500/[0.07] backdrop-blur border border-orange-500/30 rounded-md p-4';

  return (
    <div className={cls}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1 ${accent === 'orange' ? 'text-orange-300' : 'text-slate-400'}`}>
        {label}
      </div>
      <div className={`font-mono font-bold text-xl sm:text-2xl ppc-tick ${accent === 'orange' ? 'text-orange-300' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

interface PresetButtonProps {
  active: boolean;
  onClick: () => void;
  color: 'orange' | 'sky' | 'emerald';
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  focusRing: string;
}
function PresetButton({ active, onClick, color, icon, label, subtitle, focusRing }: PresetButtonProps) {
  const activeStyles = {
    orange:  'bg-orange-500/15 border-orange-500/60 text-orange-300',
    sky:     'bg-sky-500/15 border-sky-500/60 text-sky-300',
    emerald: 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300',
  };
  return (
    <button
      onClick={onClick}
      className={`flex flex-col sm:flex-row items-center justify-center gap-2 px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${focusRing} ${active ? activeStyles[color] : 'bg-slate-800/40 border border-transparent text-slate-400 hover:text-white hover:bg-slate-800/70'}`}
      aria-pressed={active}
    >
      {icon}
      <span className="uppercase tracking-wider text-[11px] font-bold">{label}</span>
      <span className="text-[10px] text-slate-500 hidden sm:inline font-mono">{subtitle}</span>
    </button>
  );
}

function InsightRow({ type, text }: { type: InsightType; text: string }) {
  const styles: Record<InsightType, string> = {
    success: 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-200',
    warning: 'bg-amber-500/[0.06] border-amber-500/30 text-amber-200',
    danger:  'bg-rose-500/[0.06] border-rose-500/30 text-rose-200',
    info:    'bg-slate-800/40 border-slate-700 text-slate-400',
  };
  const Icon =
    type === 'success' ? CheckCircle2
    : type === 'danger' ? AlertTriangle
    : type === 'warning' ? TrendingDown
    : Info;
  return (
    <div className={`flex gap-3 p-3 rounded-md border text-sm leading-relaxed ${styles[type]}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function GuideCard({
  icon, iconBg, title, children,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900/60 backdrop-blur p-6 rounded-md border border-slate-800">
      <div className={`${iconBg} border w-10 h-10 rounded-md flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-display text-xl text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CURRENCY PICKER
───────────────────────────────────────────── */

function CurrencyPicker({
  value, onChange, focusRing,
}: {
  value: CurrencyCode;
  onChange: (c: CurrencyCode) => void;
  focusRing: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const current = CURRENCIES.find((c) => c.code === value)!;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 backdrop-blur px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors ${focusRing}`}
        aria-label="Change currency"
      >
        <span className="font-mono">{current.symbol}</span>
        <span className="font-bold uppercase tracking-wider">{current.code}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 min-w-[120px] rounded-md border border-slate-700 bg-slate-900/95 backdrop-blur py-1 shadow-2xl">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-800 ${c.code === value ? 'text-orange-400' : 'text-slate-300'}`}
            >
              <span className="w-8 font-mono">{c.symbol}</span>
              <span className="font-bold uppercase tracking-wider">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   AD FUNNEL (NEW)
───────────────────────────────────────────── */

function AdFunnelPanel({
  clicks, orders, conversionRate, cpa, clicksToSale, fmt, fmtN,
}: {
  clicks: number;
  orders: number;
  conversionRate: number;
  cpa: number;
  clicksToSale: number;
  fmt: (n: number) => string;
  fmtN: (n: number) => string;
}) {
  // If clicks is 0, show empty state
  const hasData = clicks > 0;
  const ordersPct = clicks > 0 ? (orders / clicks) * 100 : 0;
  // For visual scaling — orders bar needs minimum visible width
  const ordersVisualPct = Math.max(ordersPct, hasData ? 0.5 : 0);

  return (
    <Panel
      title="Ad Funnel"
      icon={<Filter className="w-3.5 h-3.5 text-orange-400" />}
      rightSlot={<span className="text-[10px] text-slate-500 font-mono">click → order</span>}
    >
      {hasData ? (
        <>
          {/* Clicks bar */}
          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0">
              <div className="text-xs font-bold text-slate-200">Clicks</div>
              <div className="text-[10px] text-slate-500 leading-tight">paid traffic</div>
            </div>
            <div className="flex-1 relative h-7 bg-slate-950 rounded border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: '100%' }}
              >
                <span className="text-[10px] font-mono font-bold text-white">100%</span>
              </div>
            </div>
            <div className="w-24 shrink-0 text-right">
              <div className="text-sm font-mono font-bold text-white ppc-tick">{fmtN(clicks)}</div>
              <div className="text-[10px] text-slate-500 font-mono">total clicks</div>
            </div>
          </div>

          {/* Orders bar */}
          <div className="flex items-center gap-3">
            <div className="w-24 shrink-0">
              <div className="text-xs font-bold text-slate-200">Orders</div>
              <div className="text-[10px] text-slate-500 leading-tight">converted sales</div>
            </div>
            <div className="flex-1 relative h-7 bg-slate-950 rounded border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${ordersVisualPct}%` }}
              >
                {ordersVisualPct >= 10 && (
                  <span className="text-[10px] font-mono font-bold text-white">
                    {conversionRate.toFixed(1)}%
                  </span>
                )}
              </div>
              {ordersVisualPct < 10 && (
                <span
                  className="absolute top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-emerald-300"
                  style={{ left: `calc(${ordersVisualPct}% + 6px)` }}
                >
                  {conversionRate.toFixed(2)}%
                </span>
              )}
            </div>
            <div className="w-24 shrink-0 text-right">
              <div className="text-sm font-mono font-bold text-white ppc-tick">{fmtN(orders)}</div>
              <div className="text-[10px] text-slate-500 font-mono">orders</div>
            </div>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="rounded-md bg-slate-950 border border-slate-800 p-2.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clicks per sale</div>
              <div className="font-mono font-bold text-white text-sm ppc-tick mt-0.5">{clicksToSale > 0 ? clicksToSale : '—'}</div>
            </div>
            <div className="rounded-md bg-slate-950 border border-slate-800 p-2.5">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cost per acquisition</div>
              <div className="font-mono font-bold text-white text-sm ppc-tick mt-0.5">{fmt(cpa)}</div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            You spend <span className="font-mono text-slate-300">{fmt(cpa)}</span> in ads to acquire each order. Of every <b className="text-orange-300 font-mono">{clicksToSale > 0 ? clicksToSale : '—'}</b> clicks, <b className="text-emerald-300 font-mono">1</b> converts.
          </p>
        </>
      ) : (
        <p className="text-xs text-slate-500 italic py-4 text-center">
          Enter ad spend, sales, and CPC to see the funnel.
        </p>
      )}
    </Panel>
  );
}