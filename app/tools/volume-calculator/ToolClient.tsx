'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Scale,
  DollarSign,
  BarChart3,
  BookOpen,
  Target,
  Crosshair,
  Zap,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Lightbulb,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CURRENCIES
───────────────────────────────────────────── */
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const STORAGE_KEY = 'sales-velocity:state:v1';

/* ─────────────────────────────────────────────
   ELASTICITY PRESETS
───────────────────────────────────────────── */
type Preset = { label: string; value: number; hint: string };
const ELASTICITY_PRESETS: Preset[] = [
  { label: 'Luxury',    value: 0.5, hint: 'Strong brand · price-insensitive' },
  { label: 'Premium',   value: 0.9, hint: 'Some loyalty · moderate response' },
  { label: 'Standard',  value: 1.5, hint: 'Typical e-commerce category' },
  { label: 'Commodity', value: 2.5, hint: 'Staples · very price-sensitive' },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const safeNum = (v: string | number, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const formatCurrency = (n: number, currency: CurrencyCode): string => {
  const c = CURRENCIES.find((x) => x.code === currency)!;
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${c.symbol}${Math.round(n).toLocaleString()}`;
  }
};

/** Predicted volume at a given price using linear elasticity. Clamps at 0. */
function predictVolume(
  basePrice: number,
  newPrice: number,
  baseVolume: number,
  elasticity: number,
): number {
  if (basePrice <= 0) return baseVolume;
  const priceChangePct = (basePrice - newPrice) / basePrice; // +ve if dropping
  const liftPct = priceChangePct * elasticity;
  return Math.max(0, baseVolume * (1 + liftPct));
}

/** Profit at a given price. Clamps negative margins at 0 (chart cleanliness). */
function profitAtPrice(
  price: number, unitCost: number,
  basePrice: number, baseVolume: number, elasticity: number,
): number {
  const margin = price - unitCost;
  if (margin <= 0) return 0;
  const vol = predictVolume(basePrice, price, baseVolume, elasticity);
  return margin * vol;
}

/** Numerical search for the profit-maximizing price within reasonable bounds. */
function findOptimalPrice(
  unitCost: number, basePrice: number, baseVolume: number, elasticity: number,
): { price: number; profit: number; volume: number } {
  if (unitCost <= 0 || basePrice <= 0 || baseVolume <= 0) {
    return { price: basePrice, profit: 0, volume: baseVolume };
  }
  const minP = Math.max(unitCost * 1.01, unitCost + 1);
  const maxP = basePrice * 2;
  const steps = 200;
  let bestP = basePrice;
  let bestProfit = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const p = minP + (maxP - minP) * (i / steps);
    const prof = profitAtPrice(p, unitCost, basePrice, baseVolume, elasticity);
    if (prof > bestProfit) {
      bestProfit = prof;
      bestP = p;
    }
  }
  return {
    price: Math.round(bestP),
    profit: bestProfit,
    volume: predictVolume(basePrice, bestP, baseVolume, elasticity),
  };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function SalesVelocitySimulator() {
  const [currentPrice, setCurrentPrice]   = useState(1000);
  const [unitCost, setUnitCost]           = useState(600);
  const [currentVolume, setCurrentVolume] = useState(100);
  const [targetPrice, setTargetPrice]     = useState(900);
  const [elasticity, setElasticity]       = useState(1.5);
  const [currency, setCurrency]           = useState<CurrencyCode>('INR');
  const [hydrated, setHydrated]           = useState(false);

  /* ── Hydrate from localStorage ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.currentPrice  === 'number') setCurrentPrice(s.currentPrice);
        if (typeof s.unitCost      === 'number') setUnitCost(s.unitCost);
        if (typeof s.currentVolume === 'number') setCurrentVolume(s.currentVolume);
        if (typeof s.targetPrice   === 'number') setTargetPrice(s.targetPrice);
        if (typeof s.elasticity    === 'number') setElasticity(s.elasticity);
        if (typeof s.currency      === 'string') setCurrency(s.currency as CurrencyCode);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentPrice, unitCost, currentVolume, targetPrice, elasticity, currency,
      }));
    } catch { /* ignore */ }
  }, [hydrated, currentPrice, unitCost, currentVolume, targetPrice, elasticity, currency]);

  /* ── Compute everything ── */
  const m = useMemo(() => {
    const currentMargin = currentPrice - unitCost;
    const currentMarginPct = currentPrice > 0 ? (currentMargin / currentPrice) * 100 : 0;
    const currentTotalProfit = currentMargin * currentVolume;
    const currentRevenue = currentPrice * currentVolume;

    const newMargin = targetPrice - unitCost;
    const newMarginPct = targetPrice > 0 ? (newMargin / targetPrice) * 100 : 0;
    const marginDrop = currentMargin - newMargin;

    // Required volume to maintain current total profit
    const requiredVolume = newMargin > 0 ? Math.ceil(currentTotalProfit / newMargin) : Infinity;
    const requiredLiftPct = currentVolume > 0 && Number.isFinite(requiredVolume)
      ? ((requiredVolume - currentVolume) / currentVolume) * 100
      : 0;

    // Predicted volume from elasticity model
    const predictedVolume = Math.round(
      predictVolume(currentPrice, targetPrice, currentVolume, elasticity),
    );
    const predictedLiftPct = currentVolume > 0
      ? ((predictedVolume - currentVolume) / currentVolume) * 100
      : 0;

    const predictedTotalProfit = Math.max(0, newMargin) * predictedVolume;
    const profitDelta = predictedTotalProfit - currentTotalProfit;
    const profitDeltaPct = currentTotalProfit > 0
      ? (profitDelta / currentTotalProfit) * 100
      : 0;

    const predictedRevenue = targetPrice * predictedVolume;
    const revenueDelta = predictedRevenue - currentRevenue;
    const revenueDeltaPct = currentRevenue > 0
      ? (revenueDelta / currentRevenue) * 100
      : 0;

    // Optimal price + its profit
    const optimal = findOptimalPrice(unitCost, currentPrice, currentVolume, elasticity);
    const optimalUpliftPct = currentTotalProfit > 0
      ? ((optimal.profit - currentTotalProfit) / currentTotalProfit) * 100
      : 0;

    // Status — reflects actual outcome, not just required %
    let status: 'profitable' | 'neutral' | 'risky' | 'impossible';
    if (newMargin <= 0) status = 'impossible';
    else if (profitDeltaPct >= 5) status = 'profitable';
    else if (profitDeltaPct >= -5) status = 'neutral';
    else status = 'risky';

    // Feasibility (predicted vs required)
    const feasibilityRatio = Number.isFinite(requiredVolume) && requiredVolume > 0
      ? predictedVolume / requiredVolume
      : 0;

    return {
      currentMargin, currentMarginPct, currentTotalProfit, currentRevenue,
      newMargin, newMarginPct, marginDrop,
      requiredVolume, requiredLiftPct,
      predictedVolume, predictedLiftPct, predictedTotalProfit,
      profitDelta, profitDeltaPct,
      predictedRevenue, revenueDelta, revenueDeltaPct,
      optimal, optimalUpliftPct,
      status, feasibilityRatio,
    };
  }, [currentPrice, unitCost, currentVolume, targetPrice, elasticity]);

  const fmt = (n: number) => formatCurrency(n, currency);

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setCurrentPrice(1000); setUnitCost(600); setCurrentVolume(100);
    setTargetPrice(900); setElasticity(1.5);
  };

  const applyPreset = (p: Preset) => setElasticity(p.value);
  const useOptimalPrice = () => setTargetPrice(m.optimal.price);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Scale className="w-8 h-8 text-orange-500" />
              Sales Velocity Simulator
            </h1>
            <p className="text-slate-400 mt-2">
              Price-change modeling with elasticity, break-even, and profit-curve analysis.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={m.status} />
            <CurrencyPicker value={currency} onChange={setCurrency} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Reset all inputs"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ── LEFT: CONFIG ── */}
          <div className="lg:col-span-4 space-y-6">

            <Section icon={<BookOpen className="w-4 h-4 text-orange-400" />} title="Current baseline">
              <NumberField label="Current price"      value={currentPrice}  onChange={setCurrentPrice} />
              <NumberField label="Unit cost (landed)" value={unitCost}      onChange={setUnitCost} />
              <NumberField label="Monthly sales (units)" value={currentVolume} onChange={setCurrentVolume} />
              {m.currentTotalProfit > 0 && (
                <div className="text-[11px] text-slate-500 -mt-1">
                  Current monthly profit: <span className="text-emerald-400 font-mono">{fmt(m.currentTotalProfit)}</span>
                  <span className="text-slate-600"> · margin </span>
                  <span className="text-emerald-400 font-mono">{m.currentMarginPct.toFixed(0)}%</span>
                </div>
              )}
            </Section>

            <Section icon={<TrendingDown className="w-4 h-4 text-orange-400" />} title="Proposed price">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">
                  New target price
                </label>
                <input
                  type="number"
                  min={0}
                  value={targetPrice === 0 ? '' : targetPrice}
                  onChange={(e) => setTargetPrice(safeNum(e.target.value, 0))}
                  className="w-full bg-slate-950 border border-orange-500/40 rounded p-3 text-orange-300 font-bold text-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                />
                <p className="text-[11px] text-slate-500 mt-2">
                  {targetPrice < currentPrice
                    ? <>Drop of <span className="text-orange-400 font-mono">{fmt(currentPrice - targetPrice)}</span> ({(((currentPrice - targetPrice) / Math.max(currentPrice, 1)) * 100).toFixed(0)}%)</>
                    : targetPrice > currentPrice
                      ? <>Hike of <span className="text-orange-400 font-mono">{fmt(targetPrice - currentPrice)}</span> ({(((targetPrice - currentPrice) / Math.max(currentPrice, 1)) * 100).toFixed(0)}%)</>
                      : <>No change from current price</>
                  }
                </p>
                {targetPrice > 0 && targetPrice <= unitCost && (
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Below cost — every sale loses money
                  </p>
                )}
              </div>

              {/* Elasticity presets */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 tracking-wider">
                    <Crosshair className="w-3 h-3" /> Elasticity
                  </label>
                  <span className="text-white font-mono font-bold">{elasticity.toFixed(1)}x</span>
                </div>
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {ELASTICITY_PRESETS.map((p) => {
                    const active = Math.abs(elasticity - p.value) < 0.05;
                    return (
                      <button
                        key={p.label}
                        onClick={() => applyPreset(p)}
                        title={p.hint}
                        className={`py-1.5 text-[10px] font-bold rounded border transition ${
                          active
                            ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="range" min={0.2} max={3.5} step={0.1}
                  value={elasticity}
                  onChange={(e) => setElasticity(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  How much volume moves when price changes. 1.0× = proportional, 2.0× = double the response.
                </p>
              </div>
            </Section>

            {/* Optimal price suggestion */}
            {m.currentTotalProfit > 0 && m.optimalUpliftPct > 5 && (
              <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-5">
                <div className="flex items-start gap-2.5 mb-3">
                  <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-widest text-emerald-300 mb-1">
                      Profit-optimal price
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white font-mono">{fmt(m.optimal.price)}</span>
                      <span className="text-xs text-emerald-300">+{m.optimalUpliftPct.toFixed(0)}% profit</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Estimated max profit at your current elasticity setting.
                    </p>
                  </div>
                </div>
                <button
                  onClick={useOptimalPrice}
                  className="w-full text-xs font-bold py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded transition"
                >
                  Use {fmt(m.optimal.price)} as target →
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT: INTELLIGENCE PANEL ── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Outcome card */}
            <OutcomeCard m={m} fmt={fmt} />

            {/* Profit-vs-price curve */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2 tracking-widest">
                  <BarChart3 className="w-4 h-4 text-orange-400" /> Profit vs. price
                </h3>
                <ChartLegend />
              </div>
              <PriceCurve
                unitCost={unitCost}
                currentPrice={currentPrice}
                targetPrice={targetPrice}
                currentVolume={currentVolume}
                elasticity={elasticity}
                currentProfit={m.currentTotalProfit}
                optimalPrice={m.optimal.price}
                fmt={fmt}
              />
            </div>

            {/* Two-up: Feasibility + Margin */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2 tracking-widest">
                  <Target className="w-4 h-4 text-orange-400" /> Volume feasibility
                </h3>

                {!Number.isFinite(m.requiredVolume) ? (
                  <div className="text-rose-400 text-sm">
                    <p className="font-bold flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4" /> Cannot break even
                    </p>
                    <p className="text-xs opacity-80 leading-relaxed">
                      New margin is zero or negative. No volume can recover the profit gap.
                    </p>
                  </div>
                ) : (
                  <>
                    <Stat label="Required to break even"
                          value={`${m.requiredVolume.toLocaleString()} units`}
                          sub={`+${m.requiredLiftPct.toFixed(0)}% vs today`}
                          tone="orange" />
                    <Stat label="Predicted (elasticity)"
                          value={`${m.predictedVolume.toLocaleString()} units`}
                          sub={`${m.predictedLiftPct >= 0 ? '+' : ''}${m.predictedLiftPct.toFixed(0)}% vs today`}
                          tone={m.predictedVolume >= m.requiredVolume ? 'good' : 'critical'} />

                    <FeasibilityBar ratio={m.feasibilityRatio} />
                  </>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2 tracking-widest">
                  <DollarSign className="w-4 h-4 text-orange-400" /> Unit economics
                </h3>

                <Stat label="Current margin"  value={`${fmt(m.currentMargin)} · ${m.currentMarginPct.toFixed(0)}%`} tone="good" />
                <Stat label="New margin"      value={`${fmt(m.newMargin)} · ${m.newMarginPct.toFixed(0)}%`} tone={m.newMargin > 0 ? 'orange' : 'critical'} />
                <Stat label="Margin compression"
                      value={`−${fmt(m.marginDrop)}`}
                      sub="lost per unit"
                      tone="critical" />

                {m.currentRevenue > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Revenue change</span>
                    <span className={`font-mono font-bold ${m.revenueDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {m.revenueDelta >= 0 ? '+' : ''}{fmt(m.revenueDelta)}
                      <span className="text-xs opacity-70 ml-1">({m.revenueDeltaPct >= 0 ? '+' : ''}{m.revenueDeltaPct.toFixed(0)}%)</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostics */}
            <Diagnostics m={m} fmt={fmt} targetPrice={targetPrice} unitCost={unitCost} />
          </div>
        </div>

        {/* ── CREATOR FOOTER ── */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            <a href="http://www.instagram.com/smartrwl" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-pink-500 transition-colors" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://github.com/Smart-rwl/" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-white transition-colors" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">{icon} {title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function NumberField({
  label, value, onChange, placeholder,
}: {
  label: string; value: number; onChange: (n: number) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <input
        type="number"
        min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value, 0))}
        placeholder={placeholder ?? '0'}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: 'profitable' | 'neutral' | 'risky' | 'impossible' }) {
  const c = {
    profitable: { dot: 'bg-emerald-500',                  text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Profitable' },
    neutral:    { dot: 'bg-slate-400',                    text: 'text-slate-300',   bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   label: 'Neutral' },
    risky:      { dot: 'bg-amber-500',                    text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   label: 'Risky' },
    impossible: { dot: 'bg-rose-500 animate-pulse',       text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    label: 'Loss' },
  }[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
      <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
      <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{c.label}</span>
    </div>
  );
}

function CurrencyPicker({ value, onChange }: { value: CurrencyCode; onChange: (c: CurrencyCode) => void }) {
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
        className="flex items-center gap-2 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-200 transition"
      >
        <span className="font-mono">{current.symbol}</span>
        <span className="font-bold">{current.code}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-10 py-1 min-w-[120px]">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition flex items-center gap-2 ${c.code === value ? 'text-orange-400' : 'text-slate-300'}`}
            >
              <span className="font-mono w-8">{c.symbol}</span>
              <span className="font-bold">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function OutcomeCard({ m, fmt }: { m: any; fmt: (n: number) => string }) {
  const tone =
    m.status === 'impossible' ? { bg: 'bg-rose-950/40',    border: 'border-rose-500/30',    accent: 'text-rose-400' }
    : m.status === 'risky'    ? { bg: 'bg-amber-950/30',   border: 'border-amber-500/30',   accent: 'text-amber-400' }
    : m.status === 'neutral'  ? { bg: 'bg-slate-900',      border: 'border-slate-700',      accent: 'text-slate-400' }
    : { bg: 'bg-emerald-950/30', border: 'border-emerald-500/30', accent: 'text-emerald-400' };

  const sign = m.profitDelta >= 0 ? '+' : '';

  return (
    <div className={`rounded-xl border p-7 shadow-2xl ${tone.bg} ${tone.border} relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-4 opacity-[0.06] pointer-events-none">
        <Zap className="w-32 h-32 text-white" />
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className={`w-4 h-4 ${tone.accent}`} />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Predicted profit change</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-5xl md:text-6xl font-extrabold tracking-tight font-mono ${
              m.profitDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'
            }`}>
              {sign}{fmt(m.profitDelta)}
            </span>
            <span className="text-xl font-medium text-slate-400">/ month</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {fmt(m.currentTotalProfit)} → <span className="text-white font-mono">{fmt(m.predictedTotalProfit)}</span>
            {Number.isFinite(m.profitDeltaPct) && (
              <span className={`ml-2 font-mono ${m.profitDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ({sign}{m.profitDeltaPct.toFixed(0)}%)
              </span>
            )}
          </p>
        </div>

        <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 w-full md:w-72 space-y-2.5 shrink-0">
          <KvRow label="Predicted volume" value={`${m.predictedVolume.toLocaleString()} units`} />
          <KvRow label="Required to break even"
                 value={Number.isFinite(m.requiredVolume) ? `${m.requiredVolume.toLocaleString()} units` : '—'} />
          <KvRow label="Revenue change"
                 value={`${m.revenueDelta >= 0 ? '+' : ''}${fmt(m.revenueDelta)}`}
                 last />
        </div>
      </div>
    </div>
  );
}

function KvRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${!last ? 'border-b border-white/10 pb-2' : ''}`}>
      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">{label}</span>
      <span className="text-white font-mono font-bold">{value}</span>
    </div>
  );
}

function Stat({
  label, value, sub, tone = 'neutral',
}: {
  label: string; value: string; sub?: string;
  tone?: 'neutral' | 'orange' | 'good' | 'critical';
}) {
  const toneClass = {
    neutral:  'text-slate-200',
    orange:   'text-orange-300',
    good:     'text-emerald-300',
    critical: 'text-rose-300',
  }[tone];
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      <div className="text-right">
        <div className={`font-mono font-bold ${toneClass}`}>{value}</div>
        {sub && <div className="text-[10px] text-slate-500 font-mono">{sub}</div>}
      </div>
    </div>
  );
}

function FeasibilityBar({ ratio }: { ratio: number }) {
  const pct = Math.max(0, Math.min(150, ratio * 100));
  const fillColor =
    ratio >= 1   ? 'bg-emerald-500'
    : ratio >= 0.75 ? 'bg-amber-500'
    : 'bg-rose-500';
  return (
    <div className="mt-3 pt-3 border-t border-slate-800">
      <div className="flex justify-between mb-1.5 text-[10px] text-slate-500 font-mono uppercase tracking-wider">
        <span>Predicted / Required</span>
        <span className={ratio >= 1 ? 'text-emerald-400' : 'text-rose-400'}>{(ratio * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
        <div className={`h-full ${fillColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: '66.6%' }} title="100% line" />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
        <span>0</span>
        <span className="text-slate-400">100% (break-even)</span>
        <span>150%</span>
      </div>
    </div>
  );
}

function ChartLegend() {
  const items = [
    { color: '#f97316', label: 'Profit curve' },
    { color: '#fbbf24', label: 'Current price' },
    { color: '#38bdf8', label: 'Target price' },
    { color: '#10b981', label: 'Optimal price' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROFIT-VS-PRICE CHART
───────────────────────────────────────────── */
function PriceCurve({
  unitCost, currentPrice, targetPrice, currentVolume, elasticity,
  currentProfit, optimalPrice, fmt,
}: {
  unitCost: number;
  currentPrice: number;
  targetPrice: number;
  currentVolume: number;
  elasticity: number;
  currentProfit: number;
  optimalPrice: number;
  fmt: (n: number) => string;
}) {
  const minP = Math.max(unitCost * 1.05, unitCost + 1);
  const maxP = Math.max(currentPrice * 1.6, targetPrice * 1.2, optimalPrice * 1.15);

  // Generate points
  const N = 120;
  const points: { p: number; prof: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const p = minP + (maxP - minP) * (i / N);
    const prof = profitAtPrice(p, unitCost, currentPrice, currentVolume, elasticity);
    points.push({ p, prof });
  }
  const maxProfit = Math.max(currentProfit, ...points.map((pt) => pt.prof));
  const yMax = maxProfit > 0 ? maxProfit * 1.1 : 100;

  const W = 720, H = 260;
  const pad = { top: 16, right: 18, bottom: 32, left: 64 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const xToPx = (p: number) => pad.left + ((p - minP) / Math.max(maxP - minP, 1)) * chartW;
  const yToPx = (prof: number) => pad.top + (1 - prof / yMax) * chartH;

  // Path: smooth profit curve
  const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(pt.p)} ${yToPx(pt.prof)}`).join(' ');

  // Shaded "above current profit" area
  let aboveD = '';
  let inAbove = false;
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (pt.prof >= currentProfit) {
      if (!inAbove) {
        aboveD += `M ${xToPx(pt.p)} ${yToPx(currentProfit)} L ${xToPx(pt.p)} ${yToPx(pt.prof)}`;
        inAbove = true;
      } else {
        aboveD += ` L ${xToPx(pt.p)} ${yToPx(pt.prof)}`;
      }
    } else {
      if (inAbove) {
        aboveD += ` L ${xToPx(points[i - 1].p)} ${yToPx(currentProfit)} Z`;
        inAbove = false;
      }
    }
  }
  if (inAbove) {
    aboveD += ` L ${xToPx(points[points.length - 1].p)} ${yToPx(currentProfit)} Z`;
  }

  // Y ticks
  const ticks = [0, Math.round(yMax * 0.5), Math.round(yMax)];
  // X ticks
  const xTicks = [minP, currentPrice, maxP];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 230 }}>
      {/* Grid */}
      {ticks.map((tv) => (
        <g key={tv}>
          <line
            x1={pad.left} x2={W - pad.right}
            y1={yToPx(tv)} y2={yToPx(tv)}
            stroke="#1e293b" strokeWidth={1} strokeDasharray={tv === 0 ? '0' : '3,4'}
          />
          <text x={pad.left - 8} y={yToPx(tv) + 3} fontSize={10} fill="#475569" textAnchor="end" fontFamily="ui-monospace, monospace">
            {fmt(tv).replace(/\s/g, '')}
          </text>
        </g>
      ))}

      {/* "Above current profit" shaded zone */}
      {aboveD && (
        <path d={aboveD} fill="#10b981" fillOpacity={0.08} />
      )}

      {/* Current profit horizontal reference */}
      {currentProfit > 0 && currentProfit < yMax && (
        <>
          <line
            x1={pad.left} x2={W - pad.right}
            y1={yToPx(currentProfit)} y2={yToPx(currentProfit)}
            stroke="#64748b" strokeWidth={1} strokeDasharray="3,4" opacity={0.6}
          />
          <text x={pad.left + 4} y={yToPx(currentProfit) - 3} fontSize={9} fill="#94a3b8" fontFamily="ui-monospace, monospace">
            Current {fmt(currentProfit)}
          </text>
        </>
      )}

      {/* Profit curve */}
      <path d={pathD} fill="none" stroke="#f97316" strokeWidth={2.5} />

      {/* Current price marker */}
      {currentPrice >= minP && currentPrice <= maxP && (
        <>
          <line
            x1={xToPx(currentPrice)} x2={xToPx(currentPrice)}
            y1={pad.top} y2={H - pad.bottom}
            stroke="#fbbf24" strokeWidth={1} strokeDasharray="2,3" opacity={0.7}
          />
          <circle cx={xToPx(currentPrice)} cy={yToPx(profitAtPrice(currentPrice, unitCost, currentPrice, currentVolume, elasticity))}
            r={4} fill="#fbbf24" stroke="#0a0f1a" strokeWidth={2} />
          <text x={xToPx(currentPrice)} y={pad.top - 3} fontSize={9} fill="#fbbf24" textAnchor="middle" fontFamily="ui-monospace, monospace">
            Current
          </text>
        </>
      )}

      {/* Target price marker */}
      {targetPrice >= minP && targetPrice <= maxP && Math.abs(targetPrice - currentPrice) > 0.5 && (
        <>
          <line
            x1={xToPx(targetPrice)} x2={xToPx(targetPrice)}
            y1={pad.top} y2={H - pad.bottom}
            stroke="#38bdf8" strokeWidth={1} strokeDasharray="2,3" opacity={0.7}
          />
          <circle cx={xToPx(targetPrice)} cy={yToPx(profitAtPrice(targetPrice, unitCost, currentPrice, currentVolume, elasticity))}
            r={4} fill="#38bdf8" stroke="#0a0f1a" strokeWidth={2} />
          <text x={xToPx(targetPrice)} y={pad.top - 3} fontSize={9} fill="#38bdf8" textAnchor="middle" fontFamily="ui-monospace, monospace">
            Target
          </text>
        </>
      )}

      {/* Optimal price marker */}
      {optimalPrice >= minP && optimalPrice <= maxP && Math.abs(optimalPrice - currentPrice) > 0.5 && Math.abs(optimalPrice - targetPrice) > 0.5 && (
        <>
          <line
            x1={xToPx(optimalPrice)} x2={xToPx(optimalPrice)}
            y1={pad.top} y2={H - pad.bottom}
            stroke="#10b981" strokeWidth={1} strokeDasharray="2,3" opacity={0.6}
          />
          <circle cx={xToPx(optimalPrice)} cy={yToPx(profitAtPrice(optimalPrice, unitCost, currentPrice, currentVolume, elasticity))}
            r={4} fill="#10b981" stroke="#0a0f1a" strokeWidth={2} />
          <text x={xToPx(optimalPrice)} y={H - pad.bottom + 13} fontSize={9} fill="#10b981" textAnchor="middle" fontFamily="ui-monospace, monospace">
            Optimal
          </text>
        </>
      )}

      {/* X axis labels (bottom) */}
      {xTicks.map((p, i) => (
        <text
          key={i}
          x={xToPx(p)}
          y={H - pad.bottom + 24}
          fontSize={9}
          fill="#64748b"
          textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
          fontFamily="ui-monospace, monospace"
        >
          {fmt(p).replace(/\s/g, '')}
        </text>
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────
   DIAGNOSTICS
───────────────────────────────────────────── */
function Diagnostics({
  m, fmt, targetPrice, unitCost,
}: {
  m: any; fmt: (n: number) => string; targetPrice: number; unitCost: number;
}) {
  if (m.status === 'impossible') {
    return (
      <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-rose-300 mb-1">Don't do it</div>
          <div className="text-xs text-rose-200/90 leading-relaxed">
            At {fmt(targetPrice)}, your unit margin is {m.newMargin > 0 ? `only ${fmt(m.newMargin)}` : 'negative'} — every sale {m.newMargin > 0 ? 'barely covers cost' : 'loses money'}.
            Raise the target price above <b>{fmt(Math.ceil(unitCost * 1.15))}</b> (~15% margin) before re-running.
          </div>
        </div>
      </div>
    );
  }
  if (m.status === 'risky') {
    const gapPct = Math.max(0, m.requiredLiftPct - m.predictedLiftPct);
    return (
      <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-amber-300 mb-1">Likely loss</div>
          <div className="text-xs text-amber-200/90 leading-relaxed">
            Market is predicted to lift volume <b>+{m.predictedLiftPct.toFixed(0)}%</b>, but you need <b>+{m.requiredLiftPct.toFixed(0)}%</b> to break even — a <b>{gapPct.toFixed(0)} point gap</b>.
            Expect to lose ~<span className="text-rose-300 font-mono font-bold">{fmt(Math.abs(m.profitDelta))}/month</span>.
            {m.optimalUpliftPct > 0 && (
              <> Better target: <b>{fmt(m.optimal.price)}</b> for +{m.optimalUpliftPct.toFixed(0)}% profit.</>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (m.status === 'neutral') {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex items-start gap-3">
        <Target className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-200 mb-1">Roughly break-even</div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Profit lands within ±5% of today's. Worth doing if the goal is market share, traffic, or revenue
            ({m.revenueDelta >= 0 ? '+' : ''}{fmt(m.revenueDelta)} predicted) — but won't move the bottom line.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-5 flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-bold text-emerald-300 mb-1">Strategy looks profitable</div>
        <div className="text-xs text-emerald-200/90 leading-relaxed">
          Predicted +<span className="font-mono font-bold text-white">{fmt(m.profitDelta)}/month</span>
          {' '}(+{m.profitDeltaPct.toFixed(0)}%) at the chosen elasticity.
          {m.optimal.price !== targetPrice && m.optimalUpliftPct > m.profitDeltaPct + 5 && (
            <> Even better at <b>{fmt(m.optimal.price)}</b> (+{m.optimalUpliftPct.toFixed(0)}%).</>
          )}
        </div>
      </div>
    </div>
  );
}