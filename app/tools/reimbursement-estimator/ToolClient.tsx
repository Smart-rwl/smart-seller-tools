'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Info,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  RotateCcw,
  Package,
  PackageX,
  Receipt,
  Trash2,
  Clock,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES + CONSTANTS
───────────────────────────────────────────── */

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED';

type Inputs = {
  annualRevenue: number;
  inventoryValue: number;
  recoveryRate: number;
  currency: CurrencyCode;
};

const DEFAULTS: Inputs = {
  annualRevenue: 500000,
  inventoryValue: 50000,
  recoveryRate: 1.5,
  currency: 'USD',
};

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const PROFILES: { id: string; label: string; rate: number; desc: string }[] = [
  { id: 'conservative', label: 'Conservative', rate: 0.8, desc: 'Few SKUs, slow turnover, careful processes' },
  { id: 'typical',      label: 'Typical',      rate: 1.5, desc: 'Average FBA seller with mixed inventory' },
  { id: 'high-volume',  label: 'High-volume',  rate: 2.5, desc: 'Many SKUs, fast turnover, lots of returns' },
];

type Category = {
  id: string;
  label: string;
  pct: number;        // Share of total
  icon: React.ReactNode;
  tone: 'orange' | 'amber' | 'sky' | 'rose';
  desc: string;
  whereToFind: string;
};

const CATEGORIES: Category[] = [
  {
    id: 'lost',
    label: 'Lost inventory',
    pct: 0.40,
    icon: <PackageX className="w-4 h-4" />,
    tone: 'orange',
    desc: 'Units that disappeared in FBA warehouses without being scanned.',
    whereToFind: 'Inventory > Inventory Ledger > "Lost" disposition',
  },
  {
    id: 'damaged',
    label: 'Damaged returns',
    pct: 0.30,
    icon: <Package className="w-4 h-4" />,
    tone: 'amber',
    desc: 'Items refunded to customers but never returned to your sellable stock.',
    whereToFind: 'Reports > Customer Returns > Filter for "Carrier Damaged"',
  },
  {
    id: 'fees',
    label: 'FBA fee errors',
    pct: 0.15,
    icon: <Receipt className="w-4 h-4" />,
    tone: 'sky',
    desc: 'Overcharges from incorrect dimension/weight measurements at the warehouse.',
    whereToFind: 'Reports > Fulfillment > FBA Fee Preview vs. actual',
  },
  {
    id: 'removal',
    label: 'Removal shortfalls',
    pct: 0.15,
    icon: <Trash2 className="w-4 h-4" />,
    tone: 'rose',
    desc: 'Removal orders where fewer units came back than expected.',
    whereToFind: 'Inventory > Removal Order Detail report',
  },
];

const STORAGE_KEY = 'reimbursement:state:v1';
const CLAIM_WINDOW_DAYS = 60; // Current Amazon policy as of late 2024

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

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function ReimbursementEstimator() {
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

  /* Derived */
  const metrics = useMemo(() => {
    // Correct math: based on annual revenue only (NOT revenue + inventory)
    const totalAnnual = inputs.annualRevenue * (inputs.recoveryRate / 100);

    // Claimable now: roughly the proportion within the current 60-day window
    const claimableNow = totalAnnual * (CLAIM_WINDOW_DAYS / 365);
    const forfeited = totalAnnual - claimableNow;

    // Inventory turnover sanity check
    const turnoverRatio =
      inputs.inventoryValue > 0 ? inputs.annualRevenue / inputs.inventoryValue : null;

    // Category breakdown
    const categoryAmounts = CATEGORIES.map((c) => ({
      ...c,
      amount: totalAnnual * c.pct,
      claimableAmount: claimableNow * c.pct,
    }));

    return {
      totalAnnual,
      claimableNow,
      forfeited,
      turnoverRatio,
      categoryAmounts,
    };
  }, [inputs]);

  const fmt = (n: number) => fmtCurrency(n, inputs.currency);

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULTS);
  };

  /* Active profile detection (for highlighting the preset button) */
  const activeProfile = PROFILES.find((p) => Math.abs(p.rate - inputs.recoveryRate) < 0.05);

  /* Turnover commentary */
  const turnoverInsight = useMemo(() => {
    if (metrics.turnoverRatio === null) return null;
    if (metrics.turnoverRatio < 4) {
      return { label: 'Slow turnover', tone: 'amber', text: 'Inventory sits longer → more time for losses, damages, and fee errors to accumulate.' };
    }
    if (metrics.turnoverRatio > 8) {
      return { label: 'Fast turnover', tone: 'emerald', text: 'High velocity → fewer warehouse incidents per unit, but more transactions to audit.' };
    }
    return { label: 'Healthy turnover', tone: 'sky', text: 'Standard FBA pattern. Your recovery rate should land in the typical range.' };
  }, [metrics.turnoverRatio]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div className="flex items-start gap-3">
            <Link
              href="/tools"
              className="p-2 hover:bg-slate-900 rounded-lg transition-colors mt-1 shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-500 hover:text-slate-300" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <RefreshCw className="w-8 h-8 text-orange-500" /> Reimbursement Estimator
              </h1>
              <p className="text-slate-400 mt-2">
                How much Amazon FBA might owe you — split by category, with the 60-day claim window highlighted.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <CurrencyPicker value={inputs.currency} onChange={(c) => update('currency', c)} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">

          {/* ─── LEFT: INPUTS ─── */}
          <div className="lg:col-span-1 space-y-5">

            {/* Inputs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-5">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-400" /> Your numbers
              </h3>

              <CurrencyField
                label="Annual revenue (FBA only)"
                value={inputs.annualRevenue}
                onChange={(v) => update('annualRevenue', v)}
                symbol={CURRENCIES.find((c) => c.code === inputs.currency)!.symbol}
                emphasized
              />

              <CurrencyField
                label="Avg. FBA inventory value"
                value={inputs.inventoryValue}
                onChange={(v) => update('inventoryValue', v)}
                symbol={CURRENCIES.find((c) => c.code === inputs.currency)!.symbol}
                hint="Used for turnover sanity check — doesn't affect main estimate."
              />

              {/* Profile presets */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">
                  Seller profile
                </label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {PROFILES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => update('recoveryRate', p.rate)}
                      className={`rounded-lg border px-2 py-1.5 text-[10px] transition text-center ${
                        activeProfile?.id === p.id
                          ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                          : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                      title={p.desc}
                    >
                      <div className="font-bold">{p.label}</div>
                      <div className="font-mono opacity-80">{p.rate}%</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual rate slider */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider flex justify-between">
                  Recovery rate
                  <span className="text-orange-400 font-mono">{inputs.recoveryRate.toFixed(1)}%</span>
                </label>
                <input
                  type="range"
                  min={0.3} max={4} step={0.1}
                  value={inputs.recoveryRate}
                  onChange={(e) => update('recoveryRate', safeNum(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Industry data: 1–3% of annual revenue is typical for FBA sellers.
                </p>
              </div>
            </div>

            {/* Turnover insight */}
            {turnoverInsight && (
              <div className={`rounded-xl border p-4 ${
                turnoverInsight.tone === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/30'
                : turnoverInsight.tone === 'amber' ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-sky-500/10 border-sky-500/30'
              }`}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${
                    turnoverInsight.tone === 'emerald' ? 'text-emerald-300'
                    : turnoverInsight.tone === 'amber' ? 'text-amber-300'
                    : 'text-sky-300'
                  }`}>
                    {turnoverInsight.label}
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {metrics.turnoverRatio!.toFixed(1)}× / yr
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {turnoverInsight.text}
                </p>
              </div>
            )}

            {/* Did you know */}
            <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
              <div className="flex gap-2 mb-2 font-bold text-orange-300 text-xs">
                <Info className="w-4 h-4 shrink-0" />
                <span className="uppercase tracking-wider">Claim window</span>
              </div>
              <p className="text-xs text-orange-200/80 leading-relaxed">
                Most categories now have a <b className="text-white">60-day claim window</b> from the event date (down from 18 months pre-2024). FBA shipment claims are <b>30 days</b>. Check current Seller Central policy — Amazon revises this frequently.
              </p>
            </div>
          </div>

          {/* ─── RIGHT: RESULTS ─── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Big result card */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 p-8 text-center relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <p className="text-white/80 font-bold mb-2 uppercase tracking-widest text-xs">
                  Estimated reimbursement / year
                </p>
                <h2 className="text-5xl md:text-6xl font-black text-white mb-4 tracking-tight font-mono">
                  {fmt(metrics.totalAnnual)}
                </h2>
                <p className="text-white/90 text-sm max-w-md mx-auto leading-relaxed">
                  Based on <b>{inputs.recoveryRate.toFixed(1)}%</b> of <b className="font-mono">{fmt(inputs.annualRevenue)}</b> annual FBA revenue. Broken down by category below.
                </p>
              </div>
            </div>

            {/* Claim window timeline */}
            <ClaimWindowTimeline
              total={metrics.totalAnnual}
              claimableNow={metrics.claimableNow}
              forfeited={metrics.forfeited}
              fmt={fmt}
            />

            {/* Breakdown by category */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-400" />
                  Where to look — by category
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">% of total share</span>
              </div>
              <div className="space-y-3">
                {metrics.categoryAmounts.map((cat) => (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    fmt={fmt}
                  />
                ))}
              </div>
            </div>

            {/* Next steps CTA */}
            <NextStepsCard
              claimableNow={metrics.claimableNow}
              fmt={fmt}
            />
          </div>
        </div>

        {/* ─── DISCLAIMER ─── */}
        <div className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-[11px] text-slate-500 leading-relaxed">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Recovery rates vary widely by category, fulfillment region, and seller practices. This estimate uses generalized industry ranges (1-3% of annual revenue) and a typical 40/30/15/15 split across categories. Treat as a directional sanity check — the actual amount Amazon owes you is whatever your settlement reports + inventory ledger reveal.
          </p>
        </div>
      </div>

      {/* ─── CREATOR FOOTER (now correctly outside the grid + outside the bounded container) ─── */}
      <div className="max-w-6xl mx-auto mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8 pb-4 px-6">
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
  );
}

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

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
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">
        {label}
      </label>
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono ${longSymbol ? 'text-xs' : 'text-sm'}`}>
          {symbol}
        </span>
        <input
          type="number"
          min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full bg-slate-950 border border-slate-700 rounded ${emphasized ? 'p-3 text-base font-bold' : 'p-2 text-sm'} ${longSymbol ? 'pl-12' : 'pl-7'} text-white font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition`}
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

function ClaimWindowTimeline({
  total, claimableNow, forfeited, fmt,
}: {
  total: number;
  claimableNow: number;
  forfeited: number;
  fmt: (n: number) => string;
}) {
  const claimablePct = total > 0 ? (claimableNow / total) * 100 : 0;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-orange-400" /> Claim window timeline
        </h3>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          12-month rolling
        </span>
      </div>

      {/* Horizontal timeline bar */}
      <div className="relative h-14 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 mb-3">
        {/* Forfeited zone (left) */}
        <div className="absolute left-0 top-0 bottom-0 bg-slate-700/30"
          style={{ width: `${100 - claimablePct}%` }} />

        {/* Claimable zone (right) */}
        <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-r from-orange-500 to-amber-500"
          style={{ width: `${claimablePct}%` }} />

        {/* Vertical divider at 60-day mark */}
        <div className="absolute top-0 bottom-0 w-px bg-white/50"
          style={{ right: `${claimablePct}%` }} />

        {/* Labels inside */}
        <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Forfeited (older than {CLAIM_WINDOW_DAYS} days)
          </span>
          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
            ← claim now ({CLAIM_WINDOW_DAYS}d)
          </span>
        </div>
      </div>

      {/* Side-by-side amounts */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Already forfeited
          </div>
          <div className="text-xl font-bold font-mono text-slate-500">
            {fmt(forfeited)}
          </div>
          <p className="text-[10px] text-slate-600 mt-1 leading-snug">
            Older than {CLAIM_WINDOW_DAYS} days. Can&apos;t recover these.
          </p>
        </div>
        <div className="rounded-lg bg-orange-500/15 border border-orange-500/40 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-orange-300 mb-1">
            Claimable right now
          </div>
          <div className="text-xl font-bold font-mono text-orange-400">
            {fmt(claimableNow)}
          </div>
          <p className="text-[10px] text-orange-200/70 mt-1 leading-snug">
            Within the {CLAIM_WINDOW_DAYS}-day window. File before deadlines.
          </p>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  category, fmt,
}: {
  category: Category & { amount: number; claimableAmount: number };
  fmt: (n: number) => string;
}) {
  const toneClasses = {
    orange: { iconBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30', barBg: 'bg-orange-500' },
    amber:  { iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',    barBg: 'bg-amber-500' },
    sky:    { iconBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',          barBg: 'bg-sky-500' },
    rose:   { iconBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',       barBg: 'bg-rose-500' },
  }[category.tone];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg border shrink-0 ${toneClasses.iconBg}`}>
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
            <h4 className="font-bold text-white text-sm">{category.label}</h4>
            <div className="text-right">
              <span className="text-base font-bold font-mono text-white">{fmt(category.amount)}</span>
              <span className="text-[10px] text-slate-500 font-mono ml-1.5">({(category.pct * 100).toFixed(0)}%)</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-2">
            {category.desc}
          </p>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <span className="font-mono">📁</span>
              <span className="font-mono">{category.whereToFind}</span>
            </span>
            <span className="text-[10px] text-orange-400 font-mono font-bold">
              {fmt(category.claimableAmount)} claimable now
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextStepsCard({
  claimableNow, fmt,
}: {
  claimableNow: number;
  fmt: (n: number) => string;
}) {
  const isWorthIt = claimableNow >= 100;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
        <ArrowRight className="w-4 h-4 text-orange-400" /> Next steps
      </h3>

      <ol className="space-y-3 text-sm">
        <Step number={1} title="Pull your inventory ledger">
          In Seller Central: <span className="font-mono text-orange-300">Inventory &gt; Inventory Ledger</span>. Set the disposition filter to <b>&ldquo;Lost&rdquo;</b> for the last {CLAIM_WINDOW_DAYS} days.
        </Step>
        <Step number={2} title="Cross-check customer returns">
          <span className="font-mono text-orange-300">Reports &gt; Customer Returns</span>. Filter for &ldquo;Carrier Damaged&rdquo; or unreturned units. Match against your refund register.
        </Step>
        <Step number={3} title="Audit FBA fees">
          <span className="font-mono text-orange-300">Reports &gt; Fee Preview</span> vs. actual charges. Any unit charged at the wrong size tier is reclaimable.
        </Step>
        <Step number={4} title="File claims via Contact Seller Support">
          Use Case Type: <b>FBA Issue</b>. Submit one claim per disposition with supporting screenshots. Amazon typically responds within 3-7 days.
        </Step>
      </ol>

      {isWorthIt && (
        <div className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            With <b className="font-mono">{fmt(claimableNow)}</b> claimable right now, you may want to use a paid reimbursement audit service if filing yourself takes more than a few hours of work. They typically charge 15-25% of recovered funds.
          </p>
        </div>
      )}
    </div>
  );
}

function Step({
  number, title, children,
}: { number: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 font-bold text-xs font-mono shrink-0 mt-0.5">
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-200 text-sm mb-1">{title}</div>
        <p className="text-xs text-slate-400 leading-relaxed">{children}</p>
      </div>
    </li>
  );
}