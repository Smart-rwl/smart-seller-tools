'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Percent,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Tag,
  BookOpen,
  Zap,
  BarChart3,
  ArrowUpRight,
  Scale,
  ChevronDown,
  RotateCcw,
  LineChart,
  Info,
  Box,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES + CONSTANTS
───────────────────────────────────────────── */

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
type RiskLevel = 'Safe' | 'Moderate' | 'High' | 'Extreme';
type DealStatus = 'BASELINE' | 'GREAT' | 'OK' | 'CAUTION' | 'RISKY' | 'TRAP' | 'LOSS';

type SimulationRow = {
  discountPct: number;
  dealPrice: number;
  refFee: number;
  taxAmount: number;
  netProfit: number;
  margin: number;
  roi: number;
  dealType: string;
  dealTone: DealTone;
  breakEvenLift: number | null;       // null when baseline unprofitable
  requiredDailyUnits: number | null;
  riskLevel: RiskLevel;
  status: DealStatus;
};

type DealTone = 'slate' | 'sky' | 'orange' | 'amber' | 'rose' | 'deepRose';

type Inputs = {
  sellingPrice: number;
  landedCost: number;
  referralFeePct: number;
  gstRate: number;
  currentDailyUnits: number;
  currency: CurrencyCode;
};

const DEFAULTS: Inputs = {
  sellingPrice: 2000,
  landedCost: 600,
  referralFeePct: 15,
  gstRate: 18,
  currentDailyUnits: 10,
  currency: 'INR',
};

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const DEAL_TIERS: { min: number; max: number; label: string; tone: DealTone; hex: string }[] = [
  { min: 0,  max: 0,  label: 'Standard Price',     tone: 'slate',     hex: '#64748b' },
  { min: 1,  max: 14, label: 'Coupon / Voucher',   tone: 'sky',       hex: '#0ea5e9' },
  { min: 15, max: 19, label: 'Prime Exclusive',    tone: 'orange',    hex: '#f97316' },
  { min: 20, max: 39, label: 'Lightning Deal',     tone: 'amber',     hex: '#f59e0b' },
  { min: 40, max: 59, label: '7-Day Deal',         tone: 'rose',      hex: '#f43f5e' },
  { min: 60, max: 80, label: 'Liquidation',        tone: 'deepRose',  hex: '#be123c' },
];

function getDealTier(d: number) {
  return DEAL_TIERS.find((t) => d >= t.min && d <= t.max) ?? DEAL_TIERS[0];
}

const STORAGE_KEY = 'promo-sim:state:v1';

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

function computeSimulations(i: Inputs): { rows: SimulationRow[]; baseProfit: number } {
  // Baseline at 0% discount
  const baseRefFee = i.sellingPrice * (i.referralFeePct / 100);
  const baseTaxBase = i.sellingPrice / (1 + i.gstRate / 100);
  const baseTaxAmount = i.sellingPrice - baseTaxBase;
  const baseProfit = i.sellingPrice - baseTaxAmount - i.landedCost - baseRefFee;

  const rows: SimulationRow[] = [];

  for (let d = 0; d <= 80; d += 5) {
    const newPrice = i.sellingPrice * (1 - d / 100);
    const refFee = newPrice * (i.referralFeePct / 100);
    const basePrice = newPrice / (1 + i.gstRate / 100);
    const taxAmount = newPrice - basePrice;
    const profit = newPrice - taxAmount - i.landedCost - refFee;

    const margin = newPrice > 0 ? (profit / newPrice) * 100 : 0;
    const roi = i.landedCost > 0 ? (profit / i.landedCost) * 100 : 0;

    const tier = getDealTier(d);

    // Lift calculation — strict baseline-loss handling
    let lift: number | null = 0;
    if (baseProfit <= 0) {
      lift = null; // No meaningful baseline
    } else if (d === 0) {
      lift = 0;
    } else if (profit > 0) {
      lift = ((baseProfit - profit) / profit) * 100;
    } else {
      lift = Infinity; // Can't recover at this discount
    }

    const requiredDailyUnits =
      lift === null || lift === Infinity || lift < 0
        ? null
        : Math.ceil(i.currentDailyUnits * (1 + lift / 100));

    // Risk level
    let riskLevel: RiskLevel = 'Safe';
    if (lift === Infinity) riskLevel = 'Extreme';
    else if (lift !== null && lift > 300) riskLevel = 'Extreme';
    else if (lift !== null && lift > 100) riskLevel = 'High';
    else if (lift !== null && lift > 40) riskLevel = 'Moderate';

    // Status — 6-tier mapping
    let status: DealStatus;
    if (profit <= 0) status = 'LOSS';
    else if (d === 0) status = 'BASELINE';
    else if (riskLevel === 'Extreme') status = 'TRAP';
    else if (riskLevel === 'High') status = 'RISKY';
    else if (riskLevel === 'Moderate') status = 'CAUTION';
    else if (roi > 30) status = 'GREAT';
    else status = 'OK';

    rows.push({
      discountPct: d,
      dealPrice: newPrice,
      refFee,
      taxAmount,
      netProfit: profit,
      margin,
      roi,
      dealType: tier.label,
      dealTone: tier.tone,
      breakEvenLift: lift,
      requiredDailyUnits,
      riskLevel,
      status,
    });
  }

  return { rows, baseProfit };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function PromotionSimulator() {
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

  const { rows: simulations, baseProfit } = useMemo(
    () => computeSimulations(inputs),
    [inputs],
  );

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
              <Zap className="w-8 h-8 text-amber-400" />
              Promotion Profitability Simulator
            </h1>
            <p className="text-slate-400 mt-2">
              Forecast net margin and required sales velocity for Lightning Deals, coupons, and clearance.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-400">
              <Scale className="w-3.5 h-3.5 text-orange-400" />
              <span>Baseline profit / unit: <b className={baseProfit > 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>{fmt(baseProfit)}</b></span>
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

            {/* Economics config */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="font-bold text-white mb-5 flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-orange-400" /> Economics config
              </h3>

              <div className="space-y-4">
                <CurrencyField
                  label="Regular selling price"
                  value={inputs.sellingPrice}
                  onChange={(v) => update('sellingPrice', v)}
                  symbol={symbol}
                  emphasized
                />

                <div className="h-px bg-slate-800" />

                <CurrencyField
                  label="Landed cost (fixed)"
                  value={inputs.landedCost}
                  onChange={(v) => update('landedCost', v)}
                  symbol={symbol}
                  hint="Product cost + shipping + FBA fixed fee"
                />

                <NumericField
                  label="Referral fee"
                  value={inputs.referralFeePct}
                  onChange={(v) => update('referralFeePct', v)}
                  suffix="%"
                  hint="Amazon category commission (e.g. 15% for Home, 8% for Electronics)"
                />

                <div>
                  <Label>GST / VAT rate</Label>
                  <select
                    value={inputs.gstRate}
                    onChange={(e) => update('gstRate', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
                  >
                    <option value={0}>0% (Exempt / VAT not applicable)</option>
                    <option value={5}>5% (India GST low)</option>
                    <option value={12}>12% (India GST mid)</option>
                    <option value={18}>18% (India GST standard)</option>
                    <option value={20}>20% (UK / EU VAT typical)</option>
                    <option value={28}>28% (India GST luxury)</option>
                  </select>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Treated as inclusive in the listed price (India / EU model).
                  </p>
                </div>
              </div>
            </div>

            {/* Daily volume input */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm">
                <Box className="w-4 h-4 text-emerald-400" /> Current volume
              </h3>
              <NumericField
                label="Units sold / day (at full price)"
                value={inputs.currentDailyUnits}
                onChange={(v) => update('currentDailyUnits', Math.round(v))}
                hint="Used to translate the abstract 'lift %' into concrete daily targets."
                integer
              />
            </div>

            {/* Volume Trap callout */}
            <div className="bg-orange-950/15 border border-orange-500/30 p-5 rounded-xl">
              <h4 className="text-orange-300 font-bold text-sm mb-2 flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4" /> The volume trap
              </h4>
              <p className="text-xs text-orange-200/80 leading-relaxed">
                The <b>Req. lift</b> column says how much extra volume you need to make the same total profit.
                <br /><br />
                At your current pace of <b className="text-white font-mono">{inputs.currentDailyUnits} units/day</b>, the <b>Req. units/day</b> column shows what you&apos;d actually need to sell while the deal runs. If that number is unrealistic, walk away.
              </p>
            </div>

            {/* GST/ITC disclosure */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[10px] text-slate-500 leading-relaxed flex gap-2">
              <Info className="w-3 h-3 shrink-0 mt-0.5" />
              <span>
                Profit math assumes the seller is GST-registered with full Input Tax Credit on Amazon fees. Unregistered sellers will see slightly lower profit (~18% × referral fee deducted further).
              </span>
            </div>
          </div>

          {/* ─── RIGHT: CHART + TABLE ─── */}
          <div className="lg:col-span-8 space-y-6">

            <ProfitCurveChart
              rows={simulations}
              baseProfit={baseProfit}
              fmtCompact={fmtC}
            />

            {/* Simulation table */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <tr>
                      <th className="px-3 py-3">Deal Type</th>
                      <th className="px-3 py-3 text-right">Disc.</th>
                      <th className="px-3 py-3 text-right">Price</th>
                      <th className="px-3 py-3 text-right">Profit</th>
                      <th className="px-3 py-3 text-right">ROI</th>
                      <th className="px-3 py-3 text-right">Req. Lift</th>
                      <th className="px-3 py-3 text-right">Req. units/day</th>
                      <th className="px-3 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {simulations.map((row) => (
                      <SimulationTableRow
                        key={row.discountPct}
                        row={row}
                        fmt={fmt}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            Deal strategy guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<Zap className="w-5 h-5 text-amber-400" />}
              tone="amber"
              title="Lightning Deals (LD)"
            >
              Amazon usually requires a minimum <b className="text-white">20% discount</b> off the lowest price in the last 30 days. Limited inventory commitment, runs 4-6 hours.
              <br /><br />
              <b className="text-white">When to use:</b> Spike sales velocity for a launch or to clear excess stock — but check the Req. lift first.
            </GuideCard>

            <GuideCard
              icon={<ArrowUpRight className="w-5 h-5 text-rose-400" />}
              tone="rose"
              title="The volume trap"
            >
              The <b className="text-white">Req. lift</b> column reveals the trap. At <b>+100%</b>, you must <b className="text-rose-300">double</b> your daily sales just to match today&apos;s profit. Most sellers don&apos;t.
              <br /><br />
              At 50% off, lift is typically 300-500% — that means you need <b>4-6×</b> your normal velocity. Rare without major external traffic.
            </GuideCard>

            <GuideCard
              icon={<TrendingDown className="w-5 h-5 text-emerald-400" />}
              tone="emerald"
              title="The profit cliff"
            >
              Watch the <b className="text-white">ROI column</b>. Once ROI drops below 30%, you&apos;re fragile. One return or damaged unit wipes out the profit from 3-5 successful sales.
              <br /><br />
              Below 15% ROI, even a small inventory adjustment can flip the campaign net-negative.
            </GuideCard>
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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">
      {children}
    </label>
  );
}

function NumericField({
  label, value, onChange, hint, suffix, integer,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  suffix?: string;
  integer?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={integer ? 1 : 0.01}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(integer ? Math.round(safeNum(e.target.value)) : safeNum(e.target.value))}
          className={`w-full bg-slate-950 border border-slate-700 rounded p-2 ${suffix ? 'pr-8' : 'pr-3'} text-white font-mono text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{suffix}</span>
        )}
      </div>
      {hint && <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">{hint}</p>}
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
          className={`w-full bg-slate-950 border border-slate-700 rounded ${emphasized ? 'p-3 text-lg font-bold' : 'p-2 text-sm'} ${longSymbol ? 'pl-12' : 'pl-7'} text-white font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition`}
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

/* ─────────────────────────────────────────────
   PROFIT CURVE CHART (NEW)
───────────────────────────────────────────── */

function ProfitCurveChart({
  rows, baseProfit, fmtCompact,
}: {
  rows: SimulationRow[];
  baseProfit: number;
  fmtCompact: (n: number) => string;
}) {
  const W = 720, H = 240;
  const pad = { top: 24, right: 18, bottom: 36, left: 70 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const profits = rows.map((r) => r.netProfit);
  const minVal = Math.min(0, ...profits);
  const maxVal = Math.max(baseProfit * 1.1, ...profits);
  const range = maxVal - minVal || 1;

  const xToPx = (discount: number) => pad.left + (discount / 80) * chartW;
  const yToPx = (v: number) => pad.top + chartH - ((v - minVal) / range) * chartH;

  const pathD = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(r.discountPct)} ${yToPx(r.netProfit)}`)
    .join(' ');

  const fillD = `${pathD} L ${xToPx(80)} ${yToPx(Math.max(0, minVal))} L ${xToPx(0)} ${yToPx(Math.max(0, minVal))} Z`;
  const zeroLineVisible = minVal < 0;

  // Find first negative point
  const firstNegRow = rows.find((r) => r.netProfit < 0);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minVal + t * range);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <LineChart className="w-4 h-4 text-orange-400" /> Profit curve across discount levels
        </h3>
        <div className="flex items-center gap-3 text-[10px] flex-wrap">
          {DEAL_TIERS.slice(1).map((tier) => (
            <span key={tier.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded" style={{ background: tier.hex, opacity: 0.6 }} />
              <span className="text-slate-400">{tier.label}</span>
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 220 }}>
        {/* Deal-tier background bands */}
        {DEAL_TIERS.slice(1).map((tier) => (
          <rect
            key={tier.label}
            x={xToPx(tier.min)}
            y={pad.top}
            width={xToPx(Math.min(tier.max, 80)) - xToPx(tier.min)}
            height={chartH}
            fill={tier.hex}
            fillOpacity={0.05}
          />
        ))}

        {/* Y-axis grid */}
        {yTicks.map((tv, i) => (
          <g key={i}>
            <line
              x1={pad.left} x2={W - pad.right}
              y1={yToPx(tv)} y2={yToPx(tv)}
              stroke="#1e293b" strokeWidth={1} strokeDasharray="3,4"
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

        {/* Zero line */}
        {zeroLineVisible && (
          <line
            x1={pad.left} x2={W - pad.right}
            y1={yToPx(0)} y2={yToPx(0)}
            stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.7}
          />
        )}

        {/* Filled area */}
        <path d={fillD} fill="#f97316" fillOpacity={0.12} />

        {/* Profit line */}
        <path d={pathD} fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round" />

        {/* First-negative marker */}
        {firstNegRow && (
          <g>
            <line
              x1={xToPx(firstNegRow.discountPct)} x2={xToPx(firstNegRow.discountPct)}
              y1={pad.top} y2={H - pad.bottom}
              stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3,3"
            />
            <circle
              cx={xToPx(firstNegRow.discountPct)} cy={yToPx(firstNegRow.netProfit)}
              r={4} fill="#f43f5e" stroke="#0a0f1a" strokeWidth={1.5}
            />
            <text
              x={xToPx(firstNegRow.discountPct)} y={pad.top - 6}
              fontSize={10} fill="#f43f5e" textAnchor="middle"
              fontWeight="bold" fontFamily="ui-monospace, monospace"
            >
              Loss at {firstNegRow.discountPct}%
            </text>
          </g>
        )}

        {/* Data points */}
        {rows.map((r) => (
          <circle
            key={r.discountPct}
            cx={xToPx(r.discountPct)} cy={yToPx(r.netProfit)} r={2.5}
            fill={r.netProfit >= 0 ? '#f97316' : '#f43f5e'}
            stroke="#0a0f1a" strokeWidth={1}
          />
        ))}

        {/* X-axis labels */}
        {[0, 10, 20, 30, 40, 50, 60, 70, 80].map((d) => (
          <text
            key={d} x={xToPx(d)} y={H - pad.bottom + 16}
            fontSize={10} fill="#64748b" textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {d}%
          </text>
        ))}

        {/* X-axis title */}
        <text
          x={pad.left + chartW / 2} y={H - 4}
          fontSize={9} fill="#475569" textAnchor="middle"
          fontFamily="ui-monospace, monospace"
        >
          DISCOUNT %
        </text>
      </svg>

      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
        Orange line = net profit per unit at each discount level. Background bands show which Amazon deal tier each region corresponds to. {firstNegRow ? <>Profit crosses zero at <b className="text-rose-300">{firstNegRow.discountPct}% discount</b> — never run a deal beyond this.</> : <>Profit stays positive across all simulated discount levels.</>}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TABLE ROW
───────────────────────────────────────────── */

function SimulationTableRow({
  row, fmt,
}: {
  row: SimulationRow;
  fmt: (n: number) => string;
}) {
  const isBaseline = row.discountPct === 0;

  const dealTier = DEAL_TIERS.find((t) => t.label === row.dealType);
  const tierHex = dealTier?.hex ?? '#64748b';

  // Status styles
  const statusConfig: Record<DealStatus, { label: string; bg: string; border: string; text: string; icon?: React.ReactNode }> = {
    BASELINE: { label: 'BASELINE',  bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   text: 'text-slate-400' },
    GREAT:    { label: 'GREAT',     bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <CheckCircle2 className="w-3 h-3" /> },
    OK:       { label: 'OK',        bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-400' },
    CAUTION:  { label: 'CAUTION',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400' },
    RISKY:    { label: 'RISKY',     bg: 'bg-orange-500/15',  border: 'border-orange-500/40',  text: 'text-orange-400' },
    TRAP:     { label: 'TRAP',      bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400' },
    LOSS:     { label: 'LOSS',      bg: 'bg-rose-500/15',    border: 'border-rose-500/40',    text: 'text-rose-400', icon: <AlertTriangle className="w-3 h-3" /> },
  };
  const ss = statusConfig[row.status];

  // Lift color
  const liftColor =
    row.breakEvenLift === null ? 'text-slate-600'
    : row.breakEvenLift === Infinity ? 'text-rose-400'
    : row.breakEvenLift > 300 ? 'text-rose-400'
    : row.breakEvenLift > 100 ? 'text-orange-400'
    : row.breakEvenLift > 40 ? 'text-amber-400'
    : row.breakEvenLift > 0 ? 'text-sky-400'
    : 'text-slate-600';

  // Daily units color (same tiers)
  const unitsColor = liftColor;

  return (
    <tr className={`hover:bg-slate-800/30 transition ${isBaseline ? 'bg-slate-800/20' : ''}`}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: tierHex }}
          />
          <span className="text-xs font-medium text-slate-200">{row.dealType}</span>
          {row.discountPct >= 20 && row.discountPct < 40 && <Zap className="w-3 h-3 text-amber-400 shrink-0" />}
          {row.discountPct >= 60 && <Tag className="w-3 h-3 text-rose-400 shrink-0" />}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-slate-300 text-xs">
        {row.discountPct}%
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-white text-xs">
        {fmt(row.dealPrice)}
      </td>
      <td className={`px-3 py-2.5 text-right font-mono font-bold text-xs ${row.netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {fmt(row.netProfit)}
      </td>
      <td className={`px-3 py-2.5 text-right font-mono text-xs ${row.roi > 30 ? 'text-emerald-400' : row.roi > 0 ? 'text-slate-300' : 'text-rose-400'}`}>
        {row.roi.toFixed(0)}%
      </td>
      <td className={`px-3 py-2.5 text-right font-mono font-bold text-xs ${liftColor}`}>
        {row.breakEvenLift === null
          ? '—'
          : row.breakEvenLift === Infinity
            ? '∞'
            : row.breakEvenLift === 0 && isBaseline
              ? '—'
              : row.breakEvenLift > 2000
                ? '>2000%'
                : `+${row.breakEvenLift.toFixed(0)}%`}
      </td>
      <td className={`px-3 py-2.5 text-right font-mono font-bold text-xs ${unitsColor}`}>
        {row.requiredDailyUnits === null
          ? '—'
          : `${row.requiredDailyUnits.toLocaleString()}`}
      </td>
      <td className="px-3 py-2.5 text-right">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${ss.bg} ${ss.border} ${ss.text}`}>
          {ss.icon}
          {ss.label}
        </span>
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────
   GUIDE CARD
───────────────────────────────────────────── */

function GuideCard({
  icon, tone, title, children,
}: {
  icon: React.ReactNode;
  tone: 'amber' | 'rose' | 'emerald' | 'orange';
  title: string;
  children: React.ReactNode;
}) {
  const config = {
    amber:   'bg-amber-500/10 border-amber-500/20',
    rose:    'bg-rose-500/10 border-rose-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    orange:  'bg-orange-500/10 border-orange-500/20',
  }[tone];

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${config}`}>
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}