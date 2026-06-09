'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Archive,
  Calendar,
  AlertTriangle,
  DollarSign,
  Box,
  BookOpen,
  TrendingUp,
  Snowflake,
  Timer,
  Scale,
  Trash2,
  ChevronDown,
  RotateCcw,
  LineChart,
  AlertOctagon,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */

const CM3_TO_FT3 = 28316.8; // 1 ft³ = 30.48³ cm³ = 28,316.85 cm³

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

type Inputs = {
  length: number;
  width: number;
  height: number;
  units: number;
  netRevenuePerUnit: number;   // After Amazon fees
  landedCost: number;
  removalCostPerUnit: number;
  baseRate: number;
  peakRate: number;
  ltsfRate: number;
  currency: CurrencyCode;
};

const DEFAULTS: Inputs = {
  length: 20,
  width: 10,
  height: 5,
  units: 500,
  netRevenuePerUnit: 900,   // Net after ~25% Amazon take from 1200 list price
  landedCost: 400,
  removalCostPerUnit: 10,
  baseRate: 45,
  peakRate: 150,
  ltsfRate: 600,
  currency: 'INR',
};

const STORAGE_KEY = 'warehouse-cost:state:v1';
const OVERSIZE_DIM_CM = 45; // Common Amazon FBA standard-size dimension limit

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function fmtCurrency(n: number, code: CurrencyCode): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(Number.isFinite(n) ? n : 0);
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
  unitVolFt: number;
  totalVolFt: number;
  monthlyStandard: number;
  monthlyPeak: number;
  potentialLTSF: number;
  annualCost: number;
  weightedMonthlyCost: number;
  totalBatchProfit: number;
  unitProfit: number;
  timeToZeroProfit: number;          // Months until weighted storage burns profit
  valueDensity: number;              // Profit per ft³
  removalVerdict: 'LIQUIDATE' | 'HOLD';
  removalSavings: number;
  isLoss: boolean;
  isOversize: boolean;
  cumulativeCosts: number[];         // Indexed [0..12] for chart
  breakEvenMonth: number | null;     // Month when cumulative cost ≥ totalProfit
};

function compute(i: Inputs): Metrics {
  const volCm = i.length * i.width * i.height;
  const unitVolFt = volCm / CM3_TO_FT3;
  const totalVolFt = unitVolFt * i.units;

  const monthlyStandard = totalVolFt * i.baseRate;
  const monthlyPeak = totalVolFt * i.peakRate;
  const potentialLTSF = totalVolFt * i.ltsfRate;
  const annualCost = monthlyStandard * 9 + monthlyPeak * 3;
  const weightedMonthlyCost = annualCost / 12;

  const unitProfit = i.netRevenuePerUnit - i.landedCost;
  const totalBatchProfit = unitProfit * i.units;
  const isLoss = totalBatchProfit <= 0;

  // Break-even using weighted average — more realistic than just standard
  const timeToZeroProfit =
    !isLoss && weightedMonthlyCost > 0
      ? totalBatchProfit / weightedMonthlyCost
      : 0;

  const valueDensity = totalVolFt > 0 ? totalBatchProfit / totalVolFt : 0;

  // Liquidation: comparing what you'd pay in LTSF for 1 year vs removal now
  const totalRemovalCost = i.units * i.removalCostPerUnit;
  const removalVerdict: Metrics['removalVerdict'] =
    potentialLTSF > totalRemovalCost ? 'LIQUIDATE' : 'HOLD';
  const removalSavings = Math.abs(potentialLTSF - totalRemovalCost);

  // Oversize check: any dimension > 45cm trips Amazon's standard size tier
  const maxDim = Math.max(i.length, i.width, i.height);
  const isOversize = maxDim > OVERSIZE_DIM_CM;

  // Cumulative-cost projection for chart: months 1-9 std, 10-12 peak
  const cumulativeCosts: number[] = [0];
  let cum = 0;
  for (let m = 1; m <= 12; m++) {
    const isPeak = m >= 10;
    cum += isPeak ? monthlyPeak : monthlyStandard;
    cumulativeCosts.push(cum);
  }

  // Break-even month: first month where cumulative cost ≥ total profit
  let breakEvenMonth: number | null = null;
  if (!isLoss && totalBatchProfit > 0) {
    for (let i2 = 1; i2 < cumulativeCosts.length; i2++) {
      if (cumulativeCosts[i2] >= totalBatchProfit) {
        breakEvenMonth = i2;
        break;
      }
    }
  }

  return {
    unitVolFt,
    totalVolFt,
    monthlyStandard,
    monthlyPeak,
    potentialLTSF,
    annualCost,
    weightedMonthlyCost,
    totalBatchProfit,
    unitProfit,
    timeToZeroProfit,
    valueDensity,
    removalVerdict,
    removalSavings,
    isLoss,
    isOversize,
    cumulativeCosts,
    breakEvenMonth,
  };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function WarehouseCostAnalyzer() {
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

  const m = useMemo(() => compute(inputs), [inputs]);
  const fmt = (n: number) => fmtCurrency(n, inputs.currency);
  const fmtC = (n: number) => fmtCurrencyCompact(n, inputs.currency);
  const symbol = CURRENCIES.find((c) => c.code === inputs.currency)?.symbol ?? '₹';

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULTS);
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Archive className="w-8 h-8 text-orange-500" />
              Warehouse Cost Analyzer
            </h1>
            <p className="text-slate-400 mt-2">
              FBA storage fees, peak-season surges, and inventory break-even analysis.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-400">
              <Box className="w-3.5 h-3.5 text-orange-400" />
              <span>Total volume: <b className="text-white font-mono">{m.totalVolFt.toFixed(2)} ft³</b></span>
              {m.isOversize && (
                <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  OVERSIZE
                </span>
              )}
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

            {/* Product specs */}
            <Section icon={<Box className="w-4 h-4 text-orange-400" />} title="Product specs">
              <div className="grid grid-cols-3 gap-2">
                <DimField label="L" suffix="cm" value={inputs.length} onChange={(v) => update('length', v)} />
                <DimField label="W" suffix="cm" value={inputs.width} onChange={(v) => update('width', v)} />
                <DimField label="H" suffix="cm" value={inputs.height} onChange={(v) => update('height', v)} />
              </div>
              <NumericField
                label="Total units stocked"
                value={inputs.units}
                onChange={(v) => update('units', Math.round(v))}
                accent="orange"
                integer
              />
              {m.isOversize && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5">
                  <p className="text-[11px] text-amber-300 leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                    Longest dimension {Math.max(inputs.length, inputs.width, inputs.height)}cm exceeds Amazon&apos;s ~{OVERSIZE_DIM_CM}cm standard-size threshold. Expect oversize fee tier.
                  </p>
                </div>
              )}
            </Section>

            {/* Unit economics */}
            <Section icon={<Scale className="w-4 h-4 text-emerald-400" />} title="Unit economics">
              <div className="grid grid-cols-2 gap-2">
                <NumericField
                  label="Net revenue / unit"
                  value={inputs.netRevenuePerUnit}
                  onChange={(v) => update('netRevenuePerUnit', v)}
                  prefix={symbol}
                  accent="emerald"
                  hint="After Amazon referral + FBA fees"
                />
                <NumericField
                  label="Landed cost / unit"
                  value={inputs.landedCost}
                  onChange={(v) => update('landedCost', v)}
                  prefix={symbol}
                  accent="emerald"
                />
              </div>
              <NumericField
                label="Removal fee / unit"
                value={inputs.removalCostPerUnit}
                onChange={(v) => update('removalCostPerUnit', v)}
                prefix={symbol}
                accent="emerald"
                hint="What Amazon charges to ship back to you or dispose."
              />
              <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-slate-500">Profit / unit</span>
                  <span className={`font-bold font-mono ${m.unitProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmt(m.unitProfit)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-xs mt-1.5">
                  <span className="text-slate-500">Total batch profit</span>
                  <span className={`font-bold font-mono ${m.totalBatchProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmt(m.totalBatchProfit)}
                  </span>
                </div>
              </div>
            </Section>

            {/* Fee rates */}
            <Section icon={<DollarSign className="w-4 h-4 text-amber-400" />} title="Fee rates (per ft³)">
              <NumericField
                label="Standard month (Jan-Sep)"
                value={inputs.baseRate}
                onChange={(v) => update('baseRate', v)}
                prefix={symbol}
                accent="orange"
              />
              <NumericField
                label="Peak season (Oct-Dec)"
                value={inputs.peakRate}
                onChange={(v) => update('peakRate', v)}
                prefix={symbol}
                accent="orange"
                hint={`Typically ~${(inputs.peakRate / Math.max(inputs.baseRate, 1)).toFixed(1)}× standard rate`}
              />
              <NumericField
                label="LTSF penalty (365+ days)"
                value={inputs.ltsfRate}
                onChange={(v) => update('ltsfRate', v)}
                prefix={symbol}
                accent="orange"
                hint="Long-term storage surcharge for aged inventory."
              />
            </Section>
          </div>

          {/* ─── RIGHT: PROJECTIONS ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Standard + Peak fee cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeeCard
                icon={<Calendar className="w-24 h-24 text-orange-400" />}
                label="Standard monthly fee"
                value={fmt(m.monthlyStandard)}
                sublabel="Total volume × base rate"
                tone="default"
              />
              <FeeCard
                icon={<Snowflake className="w-24 h-24 text-sky-400" />}
                label="Peak season fee"
                value={fmt(m.monthlyPeak)}
                sublabel={`${(m.monthlyPeak / Math.max(m.monthlyStandard, 1)).toFixed(1)}× during Q4 (Oct-Dec)`}
                tone="peak"
              />
            </div>

            {/* Break-even + value density */}
            <BreakEvenCard
              isLoss={m.isLoss}
              timeToZeroProfit={m.timeToZeroProfit}
              breakEvenMonth={m.breakEvenMonth}
              valueDensity={m.valueDensity}
              fmt={fmt}
            />

            {/* Projection chart */}
            <ProjectionChart
              cumulativeCosts={m.cumulativeCosts}
              totalProfit={m.totalBatchProfit}
              breakEvenMonth={m.breakEvenMonth}
              monthlyStandard={m.monthlyStandard}
              monthlyPeak={m.monthlyPeak}
              isLoss={m.isLoss}
              fmtCompact={fmtC}
            />

            {/* Liquidation matrix */}
            <LiquidationCard
              verdict={m.removalVerdict}
              savings={m.removalSavings}
              ltsfCost={m.potentialLTSF}
              removalCost={inputs.units * inputs.removalCostPerUnit}
              fmt={fmt}
            />

            {/* Strategy guide */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-white">Storage strategy</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-200 mb-1">Standard vs. peak</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Amazon charges <b className="text-sky-300">~3× more</b> in Oct-Dec. If your break-even is under 4 months, do NOT send extra stock for Q4 unless you&apos;re sure it will sell immediately.
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-300 mb-1">The 365-day cliff</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Once stock hits 365 days, monthly fees jump ~10×. It&apos;s almost always cheaper to create a removal order ({fmt(inputs.removalCostPerUnit)}/unit) than to pay the LTSF surcharge.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CREATOR FOOTER ─── */}
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

function Section({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
        {icon} {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function NumericField({
  label, value, onChange, prefix, suffix, accent = 'orange', hint, integer,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  accent?: 'orange' | 'emerald';
  hint?: string;
  integer?: boolean;
}) {
  const ring = accent === 'orange'
    ? 'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
    : 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';
  const longPrefix = (prefix?.length ?? 0) > 1;

  return (
    <div>
      {label && (
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-500 ${longPrefix ? 'text-xs' : 'text-sm'}`}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(integer ? Math.round(safeNum(e.target.value)) : safeNum(e.target.value))}
          className={`w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono outline-none transition ${ring} ${
            prefix ? (longPrefix ? 'pl-12' : 'pl-7') : 'pl-3'
          } ${suffix ? 'pr-8' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{suffix}</span>
        )}
      </div>
      {hint && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

function DimField({
  label, value, onChange, suffix,
}: { label: string; value: number; onChange: (v: number) => void; suffix: string }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">
        {label} <span className="text-slate-600">({suffix})</span>
      </label>
      <input
        type="number"
        min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
      />
    </div>
  );
}

function FeeCard({
  icon, label, value, sublabel, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  tone: 'default' | 'peak';
}) {
  const colors = tone === 'peak'
    ? { labelText: 'text-sky-300', valueText: 'text-sky-200', border: 'border-sky-500/30 bg-sky-500/[0.04]' }
    : { labelText: 'text-slate-500', valueText: 'text-white', border: 'border-slate-800' };

  return (
    <div className={`bg-slate-900 border rounded-xl p-6 relative overflow-hidden ${colors.border}`}>
      <div className="absolute top-0 right-0 p-3 opacity-[0.06] pointer-events-none">
        {icon}
      </div>
      <h3 className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${colors.labelText}`}>{label}</h3>
      <div className={`text-3xl font-black mb-1 font-mono ${colors.valueText}`}>{value}</div>
      <p className="text-[10px] text-slate-500">{sublabel}</p>
    </div>
  );
}

function BreakEvenCard({
  isLoss, timeToZeroProfit, breakEvenMonth, valueDensity, fmt,
}: {
  isLoss: boolean;
  timeToZeroProfit: number;
  breakEvenMonth: number | null;
  valueDensity: number;
  fmt: (n: number) => string;
}) {
  // Loss state — selling at a loss, no break-even to talk about
  if (isLoss) {
    return (
      <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <AlertOctagon className="w-10 h-10 text-rose-400 shrink-0" />
          <div>
            <h3 className="text-base font-bold text-rose-200">Already at a loss</h3>
            <p className="text-xs text-rose-200/80 mt-1 max-w-md">
              Net revenue per unit is below landed cost. Each month in storage compounds the loss — break-even is mathematically impossible at this pricing. Either increase price, cut landed cost, or liquidate.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const breakEvenTone =
    timeToZeroProfit < 4 ? 'text-rose-400'
    : timeToZeroProfit < 9 ? 'text-amber-400'
    : 'text-white';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 relative overflow-hidden">
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-stretch relative z-10">
        <div className="flex-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
            <Timer className="w-3.5 h-3.5 text-orange-400" /> Break-even time
          </h3>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black font-mono ${breakEvenTone}`}>
              {timeToZeroProfit.toFixed(1)}
            </span>
            <span className="text-lg text-slate-400 font-medium">months</span>
          </div>
          <p className="text-xs text-slate-500 mt-2 max-w-md leading-relaxed">
            If unsold within <b className="text-slate-300">{timeToZeroProfit.toFixed(1)} months</b>, weighted storage fees (Jan-Sep std + Oct-Dec peak) will exceed total potential profit.
            {breakEvenMonth !== null && breakEvenMonth <= 12 && (
              <> Chart below marks month <b className="text-rose-300">M{breakEvenMonth}</b>.</>
            )}
          </p>
        </div>

        <div className="hidden md:block w-px bg-slate-800" />

        <div className="flex-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-orange-400" /> Value density
          </h3>
          <div className="text-2xl font-bold text-white mb-1 font-mono">
            {fmt(valueDensity)} <span className="text-sm text-slate-500 font-normal">/ ft³</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Profit per cubic foot stored. High = efficient use of warehouse. Low = paying to store air.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProjectionChart({
  cumulativeCosts, totalProfit, breakEvenMonth, monthlyStandard, monthlyPeak, isLoss, fmtCompact,
}: {
  cumulativeCosts: number[];
  totalProfit: number;
  breakEvenMonth: number | null;
  monthlyStandard: number;
  monthlyPeak: number;
  isLoss: boolean;
  fmtCompact: (n: number) => string;
}) {
  const W = 720, H = 240;
  const pad = { top: 24, right: 20, bottom: 32, left: 70 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const months = cumulativeCosts.length - 1; // 12

  const profitForScale = isLoss ? 0 : Math.max(totalProfit, 0);
  const maxVal = Math.max(profitForScale * 1.1, cumulativeCosts[cumulativeCosts.length - 1], 1);
  const minVal = 0;

  const xToPx = (mo: number) => pad.left + (mo / months) * chartW;
  const yToPx = (v: number) => pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH;

  const pathD = cumulativeCosts
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(i)} ${yToPx(c)}`)
    .join(' ');
  const fillD = `${pathD} L ${xToPx(months)} ${yToPx(0)} L ${xToPx(0)} ${yToPx(0)} Z`;

  const peakStartX = xToPx(9);
  const peakEndX = xToPx(12);
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minVal + t * (maxVal - minVal));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <LineChart className="w-4 h-4 text-orange-400" /> 12-month cumulative storage cost
        </h3>
        <div className="flex items-center gap-3 text-[10px] flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-slate-400">Cumulative cost</span>
          </span>
          {!isLoss && totalProfit > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-emerald-400" />
              <span className="text-slate-400">Profit ceiling</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-sky-500/30 rounded" />
            <span className="text-slate-400">Peak</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 220 }}>
        {/* Peak season backdrop */}
        <rect
          x={peakStartX} y={pad.top}
          width={peakEndX - peakStartX} height={chartH}
          fill="#0ea5e9" fillOpacity={0.08}
        />
        <text
          x={(peakStartX + peakEndX) / 2} y={pad.top + 10}
          fontSize={9} fill="#38bdf8" textAnchor="middle"
          fontWeight="bold" fontFamily="ui-monospace, monospace"
        >
          Q4 PEAK
        </text>

        {/* Y axis grid + labels */}
        {yTicks.map((tv, i) => (
          <g key={i}>
            <line
              x1={pad.left} x2={W - pad.right}
              y1={yToPx(tv)} y2={yToPx(tv)}
              stroke="#1e293b" strokeDasharray="3,4"
            />
            <text
              x={pad.left - 6} y={yToPx(tv) + 3}
              fontSize={10} fill="#475569" textAnchor="end"
              fontFamily="ui-monospace, monospace"
            >
              {fmtCompact(tv)}
            </text>
          </g>
        ))}

        {/* Profit ceiling line */}
        {!isLoss && totalProfit > 0 && totalProfit <= maxVal && (
          <>
            <line
              x1={pad.left} x2={W - pad.right}
              y1={yToPx(totalProfit)} y2={yToPx(totalProfit)}
              stroke="#10b981" strokeWidth={1.5} strokeDasharray="4,4"
            />
            <text
              x={W - pad.right - 4} y={yToPx(totalProfit) - 4}
              fontSize={10} fill="#10b981" textAnchor="end"
              fontWeight="bold" fontFamily="ui-monospace, monospace"
            >
              Profit: {fmtCompact(totalProfit)}
            </text>
          </>
        )}

        {/* Filled area under cost curve */}
        <path d={fillD} fill="#f97316" fillOpacity={0.14} />

        {/* Cost curve */}
        <path d={pathD} fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Break-even marker */}
        {breakEvenMonth !== null && (
          <g>
            <line
              x1={xToPx(breakEvenMonth)} x2={xToPx(breakEvenMonth)}
              y1={pad.top} y2={H - pad.bottom}
              stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3,3"
            />
            <circle
              cx={xToPx(breakEvenMonth)} cy={yToPx(cumulativeCosts[breakEvenMonth])} r={4}
              fill="#f43f5e" stroke="#0a0f1a" strokeWidth={1.5}
            />
            <text
              x={xToPx(breakEvenMonth)} y={pad.top - 6}
              fontSize={10} fill="#f43f5e" textAnchor="middle"
              fontWeight="bold" fontFamily="ui-monospace, monospace"
            >
              Break-even · M{breakEvenMonth}
            </text>
          </g>
        )}

        {/* Cost data points */}
        {cumulativeCosts.map((c, i) => {
          const overProfit = !isLoss && totalProfit > 0 && c >= totalProfit;
          return (
            <circle
              key={i} cx={xToPx(i)} cy={yToPx(c)} r={2.5}
              fill={overProfit ? '#f43f5e' : '#f97316'}
              stroke="#0a0f1a" strokeWidth={1}
            />
          );
        })}

        {/* X axis labels */}
        {[0, 3, 6, 9, 12].map((mo) => (
          <text
            key={mo} x={xToPx(mo)} y={H - pad.bottom + 16}
            fontSize={10} fill="#64748b" textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            M{mo}
          </text>
        ))}
      </svg>

      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        Orange = cumulative storage cost month by month. Sky-shaded region (Oct-Dec) shows the 3× peak rate kicking in.
        {!isLoss && breakEvenMonth !== null && (
          <> The rose vertical marker shows the month your storage cost equals your total batch profit.</>
        )}
      </p>
    </div>
  );
}

function LiquidationCard({
  verdict, savings, ltsfCost, removalCost, fmt,
}: {
  verdict: 'LIQUIDATE' | 'HOLD';
  savings: number;
  ltsfCost: number;
  removalCost: number;
  fmt: (n: number) => string;
}) {
  const isLiquidate = verdict === 'LIQUIDATE';
  const palette = isLiquidate
    ? { bg: 'bg-rose-950/20', border: 'border-rose-500/30', iconBg: 'bg-rose-500/20 text-rose-400', valueColor: 'text-rose-400' }
    : { bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', iconBg: 'bg-emerald-500/20 text-emerald-400', valueColor: 'text-emerald-400' };

  return (
    <div className={`rounded-xl border p-6 flex flex-col md:flex-row items-center justify-between gap-6 ${palette.bg} ${palette.border}`}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${palette.iconBg}`}>
          {isLiquidate ? <Trash2 className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">Verdict: {verdict}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            LTSF (1 yr) <b className="text-slate-300 font-mono">{fmt(ltsfCost)}</b> vs. removal <b className="text-slate-300 font-mono">{fmt(removalCost)}</b>
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
          {isLiquidate ? 'Liquidate to save' : 'Hold to save'}
        </p>
        <p className={`text-2xl font-bold font-mono ${palette.valueColor}`}>{fmt(savings)}</p>
      </div>
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