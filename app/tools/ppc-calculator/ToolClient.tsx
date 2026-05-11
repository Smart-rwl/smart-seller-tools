'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
} from 'lucide-react';

// NOTE: adjust import path to wherever you placed the lib file.
// Common layouts:
//   import { ... } from '@/lib/ppc-calculations'
//   import { ... } from '../lib/ppc-calculations'
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

// ===========================================================================
// CONSTANTS
// ===========================================================================
const DEFAULTS: CampaignInputs = {
  adSpend: 5000,
  adSales: 15000,
  totalSales: 45000,
  cpc: 15,
  sellingPrice: 1000,
  landedCost: 400,
  targetProfitMargin: 10,
};

const STORAGE_KEY = 'smartrwl-ppc-engine-v2';

// ===========================================================================
// STORAGE HELPERS (SSR-safe)
// ===========================================================================
interface PersistedState extends CampaignInputs {
  activePreset: Preset | null;
}

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
  } catch {
    // quota / private mode — silently degrade
  }
}

// ===========================================================================
// FORMATTING HELPERS
// ===========================================================================
const fmt = (n: number): string => {
  if (!isFinite(n)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
};

// ===========================================================================
// COMPONENT
// ===========================================================================
export default function AdProfitabilityEngine() {
  // --- Inputs (SSR-safe: start with defaults, hydrate from storage in effect) ---
  const [adSpend, setAdSpend] = useState<number>(DEFAULTS.adSpend);
  const [adSales, setAdSales] = useState<number>(DEFAULTS.adSales);
  const [totalSales, setTotalSales] = useState<number>(DEFAULTS.totalSales);
  const [cpc, setCpc] = useState<number>(DEFAULTS.cpc);
  const [sellingPrice, setSellingPrice] = useState<number>(DEFAULTS.sellingPrice);
  const [landedCost, setLandedCost] = useState<number>(DEFAULTS.landedCost);
  const [targetProfitMargin, setTargetProfitMargin] = useState<number>(
    DEFAULTS.targetProfitMargin
  );
  const [activePreset, setActivePreset] = useState<Preset | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // --- Hydration from localStorage (client-only) ---
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
    }
    setHydrated(true);
  }, []);

  // --- Persist on change (after hydration) ---
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage({
      adSpend,
      adSales,
      totalSales,
      cpc,
      sellingPrice,
      landedCost,
      targetProfitMargin,
      activePreset,
    });
  }, [
    hydrated,
    adSpend,
    adSales,
    totalSales,
    cpc,
    sellingPrice,
    landedCost,
    targetProfitMargin,
    activePreset,
  ]);

  // --- Inject fonts once on mount ---
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'smartrwl-ppc-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }, []);

  // ---------- DERIVED STATE ----------
  const inputs: CampaignInputs = {
    adSpend,
    adSales,
    totalSales,
    cpc,
    sellingPrice,
    landedCost,
    targetProfitMargin,
  };

  const metrics = useMemo(
    () => calculateMetrics(inputs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adSpend, adSales, totalSales, cpc, sellingPrice, landedCost, targetProfitMargin]
  );

  const insights = useMemo(
    () => generateInsights(metrics, inputs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [metrics]
  );

  const scaleProjections = useMemo(
    () =>
      [1, 1.5, 2, 3].map((m) =>
        calculateScaleProjection(inputs, m, DEFAULT_SCALE_DECAY)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adSpend, adSales, cpc, sellingPrice, landedCost, targetProfitMargin]
  );

  // ---------- ACTIONS ----------
  const applyPreset = (preset: Preset) => {
    setActivePreset(preset);
    if (preset === 'growth') setTargetProfitMargin(5);
    if (preset === 'balanced') setTargetProfitMargin(10);
    if (preset === 'profit') setTargetProfitMargin(20);
  };

  // FIX #1: manual slider changes deactivate any active preset (unless they happen
  // to land exactly on the preset's value)
  const handleSliderChange = (value: number) => {
    setTargetProfitMargin(value);
    const presetValues: Record<Preset, number> = { growth: 5, balanced: 10, profit: 20 };
    if (activePreset && presetValues[activePreset] !== value) {
      setActivePreset(null);
    }
  };

  const resetAll = () => {
    setAdSpend(DEFAULTS.adSpend);
    setAdSales(DEFAULTS.adSales);
    setTotalSales(DEFAULTS.totalSales);
    setCpc(DEFAULTS.cpc);
    setSellingPrice(DEFAULTS.sellingPrice);
    setLandedCost(DEFAULTS.landedCost);
    setTargetProfitMargin(DEFAULTS.targetProfitMargin);
    setActivePreset(null);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  };

  // ---------- DISPLAY HELPERS ----------
  const statusConfig: Record<typeof metrics.status, { dot: string; label: string; glow: string }> = {
    profitable: { dot: 'bg-emerald-400', label: 'Profitable', glow: 'shadow-emerald-500/20' },
    'break-even': { dot: 'bg-amber-400', label: 'Break-even', glow: 'shadow-amber-500/20' },
    loss: { dot: 'bg-red-400', label: 'Losing money', glow: 'shadow-red-500/20' },
    critical: { dot: 'bg-red-500 animate-pulse', label: 'Critical loss', glow: 'shadow-red-600/30' },
  };

  const gaugeMax = Math.max(metrics.breakEvenAcos * 1.5, 30);
  const acosPct = Math.min((metrics.acos / gaugeMax) * 100, 100);
  const targetPct = Math.min((metrics.targetAcos / gaugeMax) * 100, 100);
  const breakEvenPct = Math.min((metrics.breakEvenAcos / gaugeMax) * 100, 100);

  // Shared focus ring class for accessibility (FIX #6)
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

  const inputBaseClass = `w-full bg-slate-950 border border-slate-800 rounded-md p-2 text-white font-mono text-sm outline-none transition-colors hover:border-slate-700 focus:border-amber-400/60 ${focusRing}`;

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <>
      {/* Local stylesheet — fonts, custom utilities, grid texture (FIX #3) */}
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
          {/* ============= HEADER ============= */}
          <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-10 pb-8 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-400/80 mb-2 font-bold">
                <span className="w-6 h-px bg-amber-400/60" />
                Smartrwl · PPC Terminal
              </div>
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl text-white leading-none flex items-center gap-3">
                <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" strokeWidth={1.5} />
                Profitability Engine
              </h1>
              <p className="text-slate-400 mt-3 text-sm sm:text-base max-w-xl">
                Advanced ACOS, TACoS, and bid optimization — built for sellers who scale on data, not vibes.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
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
                role="status"
                aria-live="polite"
              >
                <div className={`w-2.5 h-2.5 rounded-full ${statusConfig[metrics.status].dot}`} />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-[0.15em]">
                  {statusConfig[metrics.status].label}
                </span>
              </div>
            </div>
          </header>

          {/* ============= PRESET BAR ============= */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8 bg-gradient-to-r from-slate-900/80 to-slate-900/30 border border-slate-800 rounded-md p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold pr-3 sm:border-r sm:border-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Strategy
            </div>
            <div className="grid grid-cols-3 sm:flex gap-2 flex-1">
              <PresetButton active={activePreset === 'growth'} onClick={() => applyPreset('growth')} color="orange" icon={<Flame className="w-3.5 h-3.5" />} label="Growth" subtitle="5% margin" focusRing={focusRing} />
              <PresetButton active={activePreset === 'balanced'} onClick={() => applyPreset('balanced')} color="blue" icon={<Scale className="w-3.5 h-3.5" />} label="Balanced" subtitle="10% margin" focusRing={focusRing} />
              <PresetButton active={activePreset === 'profit'} onClick={() => applyPreset('profit')} color="emerald" icon={<Shield className="w-3.5 h-3.5" />} label="Profit" subtitle="20% margin" focusRing={focusRing} />
            </div>
          </div>

          {/* ============= MAIN GRID ============= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-16">
            {/* ----- LEFT: INPUTS ----- */}
            <div className="lg:col-span-4 space-y-6">
              <Panel title="Campaign Data" icon={<BarChart3 className="w-3.5 h-3.5 text-blue-400" />}>
                <Field label="Ad Spend (₹)">
                  <input type="number" min={0} value={adSpend || ''} onChange={(e) => setAdSpend(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                </Field>
                <Field label="Ad Sales (Revenue)">
                  <input type="number" min={0} value={adSales || ''} onChange={(e) => setAdSales(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                </Field>
                <Field label="Total Sales (Ad + Organic)">
                  <input type="number" min={0} value={totalSales || ''} onChange={(e) => setTotalSales(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                </Field>
              </Panel>

              <Panel title="Unit Economics" icon={<Target className="w-3.5 h-3.5 text-emerald-400" />}>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CPC (Avg)">
                    <input type="number" min={0} step="0.5" value={cpc || ''} onChange={(e) => setCpc(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                  </Field>
                  <Field label="Price">
                    <input type="number" min={0} value={sellingPrice || ''} onChange={(e) => setSellingPrice(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                  </Field>
                </div>
                <Field label="Landed Cost">
                  <input type="number" min={0} value={landedCost || ''} onChange={(e) => setLandedCost(safeNum(e.target.value))} className={inputBaseClass} placeholder="0" />
                </Field>

                <div className="bg-slate-950 border border-slate-800 rounded-md p-3 mt-2">
                  <div className="flex justify-between items-center text-[10px] uppercase tracking-wider">
                    <span className="text-slate-500 font-bold">Gross Margin</span>
                    <span className={`font-mono font-bold text-sm ppc-tick ${metrics.marginPct >= 30 ? 'text-emerald-400' : metrics.marginPct >= 15 ? 'text-amber-400' : 'text-red-400'}`}>
                      {metrics.marginPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-800/60 h-1 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${metrics.marginPct >= 30 ? 'bg-emerald-400' : metrics.marginPct >= 15 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(Math.max(metrics.marginPct, 0), 100)}%` }} />
                  </div>
                </div>
              </Panel>

              <Panel title="Profit Strategy" icon={<Calculator className="w-3.5 h-3.5 text-purple-400" />}>
                <div>
                  <div className="flex justify-between mb-2">
                    <label htmlFor="target-margin-slider" className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Desired Net Margin
                    </label>
                    <span className="text-xs text-purple-400 font-mono font-bold ppc-tick">
                      {targetProfitMargin}%
                    </span>
                  </div>
                  <input
                    id="target-margin-slider"
                    type="range"
                    min={0}
                    max={30}
                    step={1}
                    value={targetProfitMargin}
                    onChange={(e) => handleSliderChange(Number(e.target.value))}
                    className={`w-full accent-purple-500 ${focusRing}`}
                    aria-valuemin={0}
                    aria-valuemax={30}
                    aria-valuenow={targetProfitMargin}
                  />
                  <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                    Keep {targetProfitMargin}% net profit after ad spend on every sale.
                  </p>
                </div>
              </Panel>
            </div>

            {/* ----- RIGHT: INTELLIGENCE ----- */}
            <div className="lg:col-span-8 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiCard label="Actual ACOS" value={metrics.acos >= ACOS_INFINITE ? '∞' : `${metrics.acos.toFixed(1)}%`} danger={metrics.status === 'loss' || metrics.status === 'critical'} />
                <KpiCard label="ROAS" value={`${metrics.roas.toFixed(2)}x`} />
                <KpiCard label="TACoS" value={`${metrics.tacos.toFixed(1)}%`} />
                <KpiCard label="Target ACOS" value={`${metrics.targetAcos.toFixed(1)}%`} accent="purple" />
              </div>

              <Panel title="ACOS Position" icon={<Target className="w-3.5 h-3.5" />} rightSlot={<span className="text-[10px] text-slate-500 font-mono">0–{gaugeMax.toFixed(0)}%</span>}>
                <div className="relative h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500/30 to-emerald-500/50" style={{ width: `${targetPct}%` }} />
                  <div className="absolute top-0 h-full bg-gradient-to-r from-amber-500/30 to-amber-500/50" style={{ left: `${targetPct}%`, width: `${Math.max(breakEvenPct - targetPct, 0)}%` }} />
                  <div className="absolute top-0 h-full bg-gradient-to-r from-red-500/30 to-red-500/50" style={{ left: `${breakEvenPct}%`, right: 0 }} />
                  <div className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-full shadow-lg shadow-white/40 transition-all duration-500" style={{ left: `calc(${acosPct}% - 2px)` }} aria-hidden />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 text-[10px]">
                  <div>
                    <div className="text-emerald-400 font-bold uppercase tracking-wider">Profit Zone</div>
                    <div className="text-slate-500 font-mono ppc-tick mt-0.5">≤ {metrics.targetAcos.toFixed(1)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-amber-400 font-bold uppercase tracking-wider">Caution</div>
                    <div className="text-slate-500 font-mono ppc-tick mt-0.5">up to {metrics.breakEvenAcos.toFixed(1)}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-bold uppercase tracking-wider">Loss Zone</div>
                    <div className="text-slate-500 font-mono ppc-tick mt-0.5">&gt; {metrics.breakEvenAcos.toFixed(1)}%</div>
                  </div>
                </div>
              </Panel>

              <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-md p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.06] pointer-events-none">
                  <DollarSign className="w-40 h-40 sm:w-56 sm:h-56 text-white" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Net Ad Profit</h3>
                  <div className="flex items-baseline gap-4 mb-5 flex-wrap">
                    <span className={`font-display text-5xl sm:text-6xl md:text-7xl transition-colors ppc-tick ${metrics.netAdProfit > 0 ? 'text-emerald-300' : metrics.netAdProfit < 0 ? 'text-red-300' : 'text-slate-400'}`}>
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
                      <p className="text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        Losing money on every ad sale — adjust bids or pause.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Panel title="Smart Insights" icon={<Lightbulb className="w-3.5 h-3.5 text-amber-400" />}>
                <div className="space-y-2 ppc-fade">
                  {insights.map((insight, i) => (
                    <InsightRow key={i} type={insight.type} text={insight.text} />
                  ))}
                </div>
              </Panel>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Panel title="Ad Funnel" icon={<MousePointerClick className="w-3.5 h-3.5" />}>
                  <FunnelRow label="Conversion Rate" value={`${metrics.conversionRate.toFixed(1)}%`} bold />
                  <Divider />
                  <FunnelRow label="Clicks per Sale" value={metrics.clicksToSale > 0 ? `${metrics.clicksToSale}` : '—'} bold />
                  <Divider />
                  <FunnelRow label="Cost Per Acquisition" value={fmt(metrics.cpa)} mono />
                  <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
                    You spend <span className="font-mono text-slate-400">{fmt(metrics.cpa)}</span> in ads to acquire each order.
                  </p>
                </Panel>

                <Panel title="Recommended Bids" icon={<Crosshair className="w-3.5 h-3.5" />}>
                  <div className="p-3 rounded-md bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Max Safe Bid · Break-even</span>
                    <div className="flex justify-between items-end">
                      <span className="text-xl font-bold text-white font-mono ppc-tick">₹{metrics.maxSafeBid.toFixed(2)}</span>
                      <span className="text-[10px] text-amber-400">0% Profit</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-purple-500/[0.07] border border-purple-500/30">
                    <span className="text-[10px] text-purple-300 uppercase tracking-wider block mb-1">Golden Bid · Target Profit</span>
                    <div className="flex justify-between items-end">
                      <span className="text-xl font-bold text-purple-300 font-mono ppc-tick">₹{metrics.goldenBid.toFixed(2)}</span>
                      <span className="text-[10px] text-purple-300">{targetProfitMargin}% Profit</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Bid <b className="text-slate-300 font-mono">₹{metrics.goldenBid.toFixed(2)}</b> to maintain your {targetProfitMargin}% margin goal.
                  </p>
                </Panel>
              </div>

              <Panel title="Bid Sensitivity by Conversion Rate" icon={<TrendingUp className="w-3.5 h-3.5" />}>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[5, 10, 15, 20].map((cv) => {
                    const bid = sellingPrice * (cv / 100) * (metrics.targetAcos / 100);
                    const isClose = Math.abs(cv - metrics.conversionRate) < 2.5;
                    return (
                      <div key={cv} className={`p-2 sm:p-3 rounded-md border transition-all ${isClose ? 'bg-amber-400/15 border-amber-400/60 text-white scale-105 shadow-lg shadow-amber-500/10' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                        <div className="text-[10px] uppercase tracking-wider mb-1">CvR {cv}%</div>
                        <div className="font-mono font-bold text-sm ppc-tick">₹{bid.toFixed(0)}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-3 text-center leading-relaxed">
                  Higher conversion rate → afford to bid more per click for the same target ACOS.
                </p>
              </Panel>

              {/* FIX #2: realistic scale projection with decay */}
              <Panel title="Scale Projection" icon={<Rocket className="w-3.5 h-3.5 text-orange-400" />} rightSlot={<span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider hidden sm:inline">Decay-adjusted</span>}>
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
                          <td className="py-2.5 text-slate-300 font-medium">{p.mult === 1 ? 'Current' : `${p.mult}x`}</td>
                          <td className="text-right text-slate-400 font-mono ppc-tick">{fmt(p.spend)}</td>
                          <td className="text-right text-slate-400 font-mono ppc-tick">{fmt(p.sales)}</td>
                          <td className={`text-right font-mono font-bold ppc-tick ${p.profit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
                    <b className="text-amber-300">Realistic model:</b> conversion rate decays {(DEFAULT_SCALE_DECAY * 100).toFixed(0)}% per doubling of spend, because you exhaust high-intent searches first. Profit growth is sub-linear — plan accordingly.
                  </span>
                </div>
              </Panel>
            </div>
          </div>

          {/* ============= GUIDE ============= */}
          <section className="border-t border-slate-800 pt-12 mb-12">
            <h2 className="font-display text-3xl sm:text-4xl text-white mb-2 flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-amber-400" strokeWidth={1.5} />
              PPC Master Guide
            </h2>
            <p className="text-slate-400 text-sm mb-8">The three concepts every Amazon seller must internalize.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GuideCard icon={<BarChart3 className="w-5 h-5 text-blue-400" />} iconBg="bg-blue-500/10" title="ACOS vs. TACoS">
                <b>ACOS</b> checks ad efficiency. <b>TACoS</b> checks business health. If ACOS is high but TACoS is below 10%, your organic sales are strong enough to support aggressive ads.
              </GuideCard>
              <GuideCard icon={<Target className="w-5 h-5 text-emerald-400" />} iconBg="bg-emerald-500/10" title="The Break-Even Rule">
                Your break-even ACOS equals your <b>gross margin %</b>. With 30% margin, you can spend up to 30% of sales on ads without losing money — but that's zero profit.
              </GuideCard>
              <GuideCard icon={<Crosshair className="w-5 h-5 text-purple-400" />} iconBg="bg-purple-500/10" title="Golden Bid Strategy">
                Don't bid to break even — bid to <b>profit</b>. The Golden Bid sets your max keyword bid so every sale leaves {targetProfitMargin}% in your pocket.
              </GuideCard>
            </div>
          </section>

          {/* ============= FOOTER ============= */}
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

// ===========================================================================
// SUB-COMPONENTS
// ===========================================================================
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
  accent?: 'purple';
}
function KpiCard({ label, value, danger, accent }: KpiCardProps) {
  let cls = 'bg-slate-900/60 backdrop-blur border border-slate-800 rounded-md p-4 transition-colors';
  if (danger) cls = 'bg-red-950/30 backdrop-blur border border-red-900/60 rounded-md p-4 transition-colors';
  if (accent === 'purple') cls = 'bg-purple-500/[0.07] backdrop-blur border border-purple-500/30 rounded-md p-4';

  return (
    <div className={cls}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1 ${accent === 'purple' ? 'text-purple-300' : 'text-slate-400'}`}>
        {label}
      </div>
      <div className={`font-mono font-bold text-xl sm:text-2xl ppc-tick ${accent === 'purple' ? 'text-purple-300' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

interface PresetButtonProps {
  active: boolean;
  onClick: () => void;
  color: 'orange' | 'blue' | 'emerald';
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  focusRing: string;
}
function PresetButton({ active, onClick, color, icon, label, subtitle, focusRing }: PresetButtonProps) {
  const activeStyles = {
    orange: 'bg-orange-500/15 border-orange-500/60 text-orange-300',
    blue: 'bg-blue-500/15 border-blue-500/60 text-blue-300',
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
    danger: 'bg-red-500/[0.06] border-red-500/30 text-red-200',
    info: 'bg-slate-800/40 border-slate-700 text-slate-400',
  };
  const Icon = type === 'success' ? CheckCircle2 : type === 'danger' ? AlertTriangle : type === 'warning' ? TrendingDown : Info;
  return (
    <div className={`flex gap-3 p-3 rounded-md border text-sm leading-relaxed ${styles[type]}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  );
}

function FunnelRow({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`${bold ? 'text-white font-bold' : 'text-white'} ${mono ? 'font-mono ppc-tick' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="w-full bg-slate-800 h-px" />;
}

function GuideCard({ icon, iconBg, title, children }: { icon: React.ReactNode; iconBg: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur p-6 rounded-md border border-slate-800">
      <div className={`${iconBg} w-10 h-10 rounded-md flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-display text-xl text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}