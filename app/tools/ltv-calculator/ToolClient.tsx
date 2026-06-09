'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  Repeat,
  Wallet,
  TrendingUp,
  Target,
  ShieldCheck,
  AlertTriangle,
  Infinity as InfinityIcon,
  ArrowRight,
  PieChart,
  Crown,
  Rocket,
  BarChart4,
  Microscope,
  ChevronDown,
  RotateCcw,
  Gauge,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES + CONSTANTS
───────────────────────────────────────────── */

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
type Status = 'unhealthy' | 'scale' | 'star';

type Inputs = {
  aov: number;
  purchaseFreq: number;
  lifespan: number;
  profitMargin: number;
  cac: number;
  monthlyAdBudget: number;
  currency: CurrencyCode;
};

const DEFAULTS: Inputs = {
  aov: 1500,
  purchaseFreq: 4,
  lifespan: 2,
  profitMargin: 25,
  cac: 500,
  monthlyAdBudget: 50000,
  currency: 'INR',
};

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const STORAGE_KEY = 'ltv-cac:state:v1';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function fmtCurrency(n: number, code: CurrencyCode): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  if (!Number.isFinite(n)) return '—';
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

function fmtCurrencyCompact(n: number, code: CurrencyCode): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 10_000_000) return `${sign}${c.symbol}${(abs / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000)    return `${sign}${c.symbol}${(abs / 100_000).toFixed(1)}L`;
  if (abs >= 1_000)      return `${sign}${c.symbol}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${c.symbol}${Math.round(abs).toLocaleString()}`;
}

/* ─────────────────────────────────────────────
   MATH
───────────────────────────────────────────── */

type Metrics = {
  grossLTV: number;
  netLTV: number;
  ltvCacRatio: number;
  paybackOrder: number | null;
  maxSafeCac: number;
  profitPerOrder: number;
  acquiredCustomers: number;
  cohortRevenue: number;
  cohortProfit: number;
  roiPercentage: number;
  impactAov: number;
  impactFreq: number;
  impactLifespan: number;
  status: Status;
};

function compute(i: Inputs): Metrics {
  const marginFrac = i.profitMargin / 100;
  const totalRevenue = i.aov * i.purchaseFreq * i.lifespan;
  const lifetimeProfit = totalRevenue * marginFrac;
  const profitPerOrder = i.aov * marginFrac;

  // LTV:CAC ratio
  const ltvCacRatio = i.cac > 0 ? lifetimeProfit / i.cac : Number.POSITIVE_INFINITY;

  // Payback order — null if no payback possible (zero margin)
  let paybackOrder: number | null = null;
  if (profitPerOrder > 0 && i.cac > 0) {
    paybackOrder = Math.ceil(i.cac / profitPerOrder);
  } else if (i.cac === 0 && profitPerOrder > 0) {
    paybackOrder = 1; // Free acquisition = instant payback
  }

  // Max safe CAC for 3:1 target
  const maxSafeCac = lifetimeProfit / 3;

  // Cohort
  const acquiredCustomers = i.cac > 0 ? Math.floor(i.monthlyAdBudget / i.cac) : 0;
  const cohortRevenue = acquiredCustomers * totalRevenue;
  const cohortGrossProfit = acquiredCustomers * lifetimeProfit;
  const cohortProfit = cohortGrossProfit - i.monthlyAdBudget;
  const roiPercentage = i.monthlyAdBudget > 0 ? (cohortProfit / i.monthlyAdBudget) * 100 : 0;

  // Sensitivity (impact of +10% improvement on each lever)
  const baseProfit = lifetimeProfit;
  const aovBoost = (i.aov * 1.1) * i.purchaseFreq * i.lifespan * marginFrac;
  const freqBoost = i.aov * (i.purchaseFreq * 1.1) * i.lifespan * marginFrac;
  const lifespanBoost = i.aov * i.purchaseFreq * (i.lifespan * 1.1) * marginFrac;

  // Status
  let status: Status;
  if (i.cac === 0 && profitPerOrder > 0) {
    status = 'star';
  } else if (!Number.isFinite(ltvCacRatio) || ltvCacRatio >= 5) {
    status = 'star';
  } else if (ltvCacRatio >= 3) {
    status = 'scale';
  } else {
    status = 'unhealthy';
  }

  return {
    grossLTV: totalRevenue,
    netLTV: lifetimeProfit,
    ltvCacRatio: Number.isFinite(ltvCacRatio) ? ltvCacRatio : 999,
    paybackOrder,
    maxSafeCac,
    profitPerOrder,
    acquiredCustomers,
    cohortRevenue,
    cohortProfit,
    roiPercentage,
    impactAov: aovBoost - baseProfit,
    impactFreq: freqBoost - baseProfit,
    impactLifespan: lifespanBoost - baseProfit,
    status,
  };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function LTVCalculator() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  /* Hydrate */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.inputs) setInputs({ ...DEFAULTS, ...s.inputs });
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* Persist */
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs }));
    } catch { /* ignore */ }
  }, [hydrated, inputs]);

  const metrics = useMemo(() => compute(inputs), [inputs]);

  const fmt = (n: number) => fmtCurrency(n, inputs.currency);
  const fmtC = (n: number) => fmtCurrencyCompact(n, inputs.currency);
  const symbol = CURRENCIES.find((c) => c.code === inputs.currency)?.symbol ?? '₹';

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULTS);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <InfinityIcon className="w-8 h-8 text-orange-500" />
              LTV & CAC Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Stop optimizing for the first sale. Optimize for the customer lifetime.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-800">
              <Target className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">LTV:CAC Ratio</p>
                <div className={`text-lg font-black font-mono ${
                  metrics.status === 'star' ? 'text-amber-400'
                  : metrics.status === 'scale' ? 'text-emerald-400'
                  : 'text-rose-400'
                }`}>
                  {metrics.ltvCacRatio >= 999 ? '∞' : `${metrics.ltvCacRatio.toFixed(1)}×`}
                </div>
              </div>
            </div>
            <CurrencyPicker value={inputs.currency} onChange={(c) => update('currency', c)} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

          {/* ─── LEFT: CONFIG ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Behavior Profile */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                <Users className="w-4 h-4 text-orange-400" /> Behavior profile
              </h3>
              <div className="space-y-4">
                <CurrencyField
                  label="Average order value (AOV)"
                  value={inputs.aov}
                  onChange={(v) => update('aov', v)}
                  symbol={symbol}
                />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Orders / year"
                    value={inputs.purchaseFreq}
                    onChange={(v) => update('purchaseFreq', v)}
                    step={0.1}
                  />
                  <NumberField
                    label="Lifespan (yrs)"
                    value={inputs.lifespan}
                    onChange={(v) => update('lifespan', v)}
                    step={0.1}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <Label>Net margin %</Label>
                    <span className="text-xs text-orange-400 font-bold font-mono">{inputs.profitMargin}%</span>
                  </div>
                  <input
                    type="range"
                    min={5} max={80} step={1}
                    value={inputs.profitMargin}
                    onChange={(e) => update('profitMargin', safeNum(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Acquisition */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                <Wallet className="w-4 h-4 text-emerald-400" /> Acquisition
              </h3>
              <div className="space-y-4">
                <CurrencyField
                  label="Current CAC (ad spend / sale)"
                  value={inputs.cac}
                  onChange={(v) => update('cac', v)}
                  symbol={symbol}
                  emphasized
                />
                <div className="pt-4 border-t border-slate-800">
                  <CurrencyField
                    label="Monthly ad budget"
                    value={inputs.monthlyAdBudget}
                    onChange={(v) => update('monthlyAdBudget', v)}
                    symbol={symbol}
                    hint="Used to forecast monthly cohort acquisition and value."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: INTELLIGENCE PANEL ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* LTV Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 relative overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
                <div>
                  <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Lifetime net profit
                  </h2>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-5xl font-black text-white font-mono">{fmt(metrics.netLTV)}</span>
                    <span className="text-sm text-slate-500">per customer</span>
                  </div>
                  <p className="text-xs text-emerald-400 mt-2 font-bold font-mono">
                    Gross revenue: {fmt(metrics.grossLTV)}
                  </p>
                </div>

                <RatioGauge metrics={metrics} />
              </div>
            </div>

            {/* Max Safe CAC indicator (NEW) */}
            <MaxSafeCacCard
              maxSafeCac={metrics.maxSafeCac}
              currentCac={inputs.cac}
              status={metrics.status}
              fmt={fmt}
            />

            {/* Payback path chart */}
            <PaybackChart
              cac={inputs.cac}
              profitPerOrder={metrics.profitPerOrder}
              paybackOrder={metrics.paybackOrder}
              netLTV={metrics.netLTV}
              fmtCompact={fmtC}
            />

            {/* Cohort + Sensitivity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CohortCard
                acquiredCustomers={metrics.acquiredCustomers}
                cohortProfit={metrics.cohortProfit}
                roiPercentage={metrics.roiPercentage}
                monthlyAdBudget={inputs.monthlyAdBudget}
                fmt={fmt}
              />
              <SensitivityCard
                impactAov={metrics.impactAov}
                impactFreq={metrics.impactFreq}
                impactLifespan={metrics.impactLifespan}
                fmt={fmt}
              />
            </div>

            {/* Winner's Rule banner */}
            <WinnersRuleBanner />
          </div>
        </div>

        {/* ─── CREATOR FOOTER (now correctly outside grid) ─── */}
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">
      {children}
    </label>
  );
}

function NumberField({
  label, value, onChange, hint, step,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  step?: number;
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <input
        type="number"
        min={0}
        step={step ?? 1}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
      />
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function CurrencyField({
  label, value, onChange, symbol, hint, emphasized,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  symbol: string;
  hint?: string;
  emphasized?: boolean;
}) {
  const longSymbol = symbol.length > 1;
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono ${longSymbol ? 'text-xs' : 'text-sm'}`}>
          {symbol}
        </span>
        <input
          type="number"
          min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full bg-slate-950 border border-slate-700 rounded ${emphasized ? 'p-3 text-lg' : 'p-2 text-sm'} ${longSymbol ? 'pl-12' : 'pl-7'} text-white font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition`}
        />
      </div>
      {hint && <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">{hint}</p>}
    </div>
  );
}

function CurrencyPicker({
  value, onChange,
}: { value: CurrencyCode; onChange: (c: CurrencyCode) => void }) {
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
        className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition"
      >
        <span className="font-mono">{current.symbol}</span>
        <span className="font-bold">{current.code}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 min-w-[120px] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-800 ${c.code === value ? 'text-orange-400' : 'text-slate-300'}`}
            >
              <span className="w-8 font-mono">{c.symbol}</span>
              <span className="font-bold">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RatioGauge({ metrics }: { metrics: Metrics }) {
  const fillPct = Math.min((metrics.ltvCacRatio / 6.67) * 100, 100);
  const tone =
    metrics.status === 'star' ? { text: 'text-amber-400', bar: 'bg-amber-400' }
    : metrics.status === 'scale' ? { text: 'text-emerald-400', bar: 'bg-emerald-500' }
    : { text: 'text-rose-400', bar: 'bg-rose-500' };

  return (
    <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 w-full md:w-72">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-3 text-center tracking-wider">
        Health check (target ≥ 3.0×)
      </h3>

      <div className="relative h-3 bg-slate-800 rounded-full w-full overflow-hidden">
        {/* 3x marker */}
        <div className="absolute top-0 bottom-0 left-[45%] w-px bg-slate-600" />
        <div
          className={`h-full transition-all duration-700 ${tone.bar}`}
          style={{ width: `${fillPct}%` }}
        />
      </div>

      <div className="mt-3 flex justify-between items-center">
        <span className="text-[10px] text-slate-500 font-mono">{metrics.status.toUpperCase()}</span>
        <span className={`text-xl font-mono font-bold ${tone.text}`}>
          {metrics.ltvCacRatio >= 999 ? '∞' : `${metrics.ltvCacRatio.toFixed(2)}×`}
        </span>
      </div>
    </div>
  );
}

function MaxSafeCacCard({
  maxSafeCac, currentCac, status, fmt,
}: {
  maxSafeCac: number;
  currentCac: number;
  status: Status;
  fmt: (n: number) => string;
}) {
  const headroom = maxSafeCac - currentCac;
  const isWithinBudget = currentCac <= maxSafeCac;
  const pctOfSafe = maxSafeCac > 0 ? Math.min((currentCac / maxSafeCac) * 100, 100) : 0;
  const overSpend = !isWithinBudget && maxSafeCac > 0;

  const fillColor =
    pctOfSafe >= 100 ? 'bg-rose-500'
    : pctOfSafe >= 80 ? 'bg-amber-500'
    : 'bg-emerald-500';

  return (
    <div className={`rounded-xl border p-5 ${
      overSpend
        ? 'border-rose-500/30 bg-rose-950/15'
        : 'border-emerald-500/30 bg-emerald-950/10'
    }`}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <Gauge className={`w-4 h-4 ${overSpend ? 'text-rose-400' : 'text-emerald-400'}`} />
          <span className={overSpend ? 'text-rose-300' : 'text-emerald-300'}>
            Max safe CAC
          </span>
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white font-mono">{fmt(maxSafeCac)}</span>
          <span className="text-xs text-slate-500">for 3× return</span>
        </div>
      </div>

      <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-2">
        <div
          className={`h-full transition-all duration-500 ${fillColor}`}
          style={{ width: `${pctOfSafe}%` }}
        />
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {overSpend ? (
          <>You&apos;re spending <b className="text-rose-300 font-mono">{fmt(currentCac)}</b> per customer — <b className="text-rose-300">{fmt(Math.abs(headroom))} above</b> the safe ceiling. Cut CAC or raise LTV.</>
        ) : maxSafeCac === 0 ? (
          <>No margin means no safe CAC. Increase price or margin first.</>
        ) : currentCac === 0 ? (
          <>Free acquisition — you can spend up to <b className="text-emerald-300 font-mono">{fmt(maxSafeCac)}</b> per customer and still hit 3× returns.</>
        ) : (
          <>You have <b className="text-emerald-300 font-mono">{fmt(headroom)}</b> of headroom — room to scale ads more aggressively or test more expensive channels.</>
        )}
      </p>
    </div>
  );
}

function PaybackChart({
  cac, profitPerOrder, paybackOrder, netLTV, fmtCompact,
}: {
  cac: number;
  profitPerOrder: number;
  paybackOrder: number | null;
  netLTV: number;
  fmtCompact: (n: number) => string;
}) {
  // Dynamic order count: extend to cover payback + 2 orders, min 6, max 12
  const orderCount = Math.min(
    Math.max(paybackOrder !== null ? paybackOrder + 2 : 6, 6),
    12,
  );
  const orders = Array.from({ length: orderCount }, (_, i) => i + 1);
  const values = orders.map((n) => n * profitPerOrder - cac);
  const maxAbs = Math.max(...values.map(Math.abs), 1);

  // SVG dimensions
  const W = 720, H = 200;
  const pad = { top: 24, right: 12, bottom: 32, left: 12 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const zeroY = pad.top + chartH / 2;
  const barCellW = chartW / orders.length;
  const barWidth = barCellW * 0.7;
  const barGap = barCellW * 0.15;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-400" /> The payback path
        </h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span className="text-slate-400">Profit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span className="text-slate-400">Below CAC</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 180 }}>
        {/* Zero baseline */}
        <line x1={pad.left} x2={W - pad.right} y1={zeroY} y2={zeroY} stroke="#475569" strokeWidth={1} />
        <text x={pad.left + 4} y={zeroY - 3} fontSize={9} fill="#475569"
          fontFamily="ui-monospace, monospace">break-even</text>

        {/* Bars */}
        {values.map((v, i) => {
          const x = pad.left + i * barCellW + barGap;
          const h = (Math.abs(v) / maxAbs) * (chartH / 2 - 4);
          const y = v >= 0 ? zeroY - h : zeroY;
          const isPayback = paybackOrder !== null && orders[i] === paybackOrder;
          const color = v >= 0 ? '#10b981' : '#f43f5e';

          return (
            <g key={i}>
              <rect
                x={x} y={y}
                width={barWidth} height={Math.max(h, 1)}
                fill={color}
                fillOpacity={isPayback ? 1 : 0.55}
                stroke={isPayback ? color : 'transparent'}
                strokeWidth={isPayback ? 2 : 0}
                rx={3}
              />
              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={v >= 0 ? y - 4 : y + h + 11}
                fontSize={9}
                fill={v >= 0 ? '#34d399' : '#fb7185'}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontWeight="bold"
              >
                {fmtCompact(v)}
              </text>
              {/* X axis label */}
              <text
                x={x + barWidth / 2} y={H - 8}
                fontSize={9} fill={isPayback ? '#f97316' : '#64748b'}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontWeight={isPayback ? 'bold' : 'normal'}
              >
                #{orders[i]}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-3 text-xs text-slate-400 leading-relaxed flex items-center gap-2 flex-wrap">
        <ArrowRight className="w-4 h-4 text-orange-400 shrink-0" />
        {paybackOrder === null ? (
          <span>No payback possible — check that margin and AOV produce positive profit per order.</span>
        ) : paybackOrder === 1 ? (
          <span>Break-even on <b className="text-emerald-300">order 1</b> — instant profit on first purchase. Outstanding.</span>
        ) : paybackOrder <= 3 ? (
          <span>Break-even on <b className="text-emerald-300">order #{paybackOrder}</b>. Fast payback; you have room to scale aggressively.</span>
        ) : paybackOrder <= 6 ? (
          <span>Break-even on <b className="text-amber-300">order #{paybackOrder}</b>. Retention is the lever — make sure customers come back.</span>
        ) : (
          <span>Break-even on <b className="text-rose-300">order #{paybackOrder}</b>. Slow payback; cash is tied up. Consider lowering CAC or raising AOV.</span>
        )}
      </p>
    </div>
  );
}

function CohortCard({
  acquiredCustomers, cohortProfit, roiPercentage, monthlyAdBudget, fmt,
}: {
  acquiredCustomers: number;
  cohortProfit: number;
  roiPercentage: number;
  monthlyAdBudget: number;
  fmt: (n: number) => string;
}) {
  const profitTone = cohortProfit >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const roiTone = roiPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="bg-orange-950/15 border border-orange-500/30 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-[0.07] pointer-events-none">
        <Rocket className="w-24 h-24 text-orange-500" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-orange-300 mb-4 flex items-center gap-2">
        <BarChart4 className="w-4 h-4" /> Monthly cohort forecast
      </h3>

      <div className="space-y-4 relative z-10">
        <div>
          <span className="text-xs text-slate-400 block mb-1">
            With <b className="text-white font-mono">{fmt(monthlyAdBudget)}</b> ad budget, you acquire:
          </span>
          <span className="text-2xl font-bold text-white font-mono">
            {acquiredCustomers.toLocaleString()} new customers
          </span>
        </div>

        <div className="w-full h-px bg-orange-500/20" />

        <div>
          <span className="text-xs text-slate-400 block mb-1">
            Future net profit from this cohort:
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono ${profitTone}`}>
              {cohortProfit >= 0 ? fmt(cohortProfit) : '−' + fmt(Math.abs(cohortProfit))}
            </span>
            <span className={`text-xs font-mono ${roiTone}`}>
              ({roiPercentage >= 0 ? '+' : ''}{roiPercentage.toFixed(0)}% ROI)
            </span>
          </div>
          {cohortProfit < 0 && (
            <p className="text-[10px] text-rose-300 mt-2 leading-snug">
              ⚠ At current CAC, every customer cohort loses money. Fix LTV or cut CAC before scaling.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SensitivityCard({
  impactAov, impactFreq, impactLifespan, fmt,
}: {
  impactAov: number;
  impactFreq: number;
  impactLifespan: number;
  fmt: (n: number) => string;
}) {
  const rows = [
    { label: 'Price (AOV) +10%',       value: impactAov,      icon: '💰' },
    { label: 'Frequency +10%',         value: impactFreq,     icon: '🔄' },
    { label: 'Lifespan +10%',          value: impactLifespan, icon: '⏱' },
  ];
  // Find the most impactful lever
  const best = rows.reduce((a, b) => (b.value > a.value ? b : a), rows[0]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
        <Microscope className="w-4 h-4 text-orange-400" /> Growth sensitivity
      </h3>
      <div className="space-y-2.5">
        {rows.map((r) => {
          const isBest = r.value === best.value && r.value > 0;
          return (
            <div
              key={r.label}
              className={`flex justify-between items-center text-xs rounded p-2 transition ${
                isBest ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-slate-950 border border-slate-800'
              }`}
            >
              <span className="text-slate-300 flex items-center gap-2">
                <span>{r.icon}</span>
                <span>{r.label}</span>
                {isBest && (
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                    BIGGEST LIFT
                  </span>
                )}
              </span>
              <span className={`font-mono font-bold ${r.value > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                +{fmt(r.value)}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-slate-500 leading-relaxed">
        Extra lifetime profit per customer from a 10% lift in each lever. Focus on the highlighted one first.
      </p>
    </div>
  );
}

function WinnersRuleBanner() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-start gap-4">
      <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-2 shrink-0">
        <Crown className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-white mb-1">Winner&apos;s rule</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          &ldquo;He who can afford to spend the most to acquire a customer, wins.&rdquo; Increase LTV (better margins, repeat purchase, longer lifespan) so you can outbid competitors on ads. Most categories aren&apos;t won on product — they&apos;re won by whoever survived the longest customer-acquisition payback period.
        </p>
      </div>
    </div>
  );
}