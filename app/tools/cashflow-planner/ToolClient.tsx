// app/tools/cashflow-planner/ToolClient.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  Anchor,
  ArrowRight,
  BarChart4,
  Banknote,
  CalendarClock,
  ChevronDown,
  Clock,
  Gauge,
  Info,
  Landmark,
  LineChart,
  Percent,
  RotateCcw,
  Save,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   TYPES & CONSTANTS
──────────────────────────────────────────────── */

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

type Inputs = {
  cashOnHand: number;
  monthlyRevenue: number;
  netMargin: number;          // %
  leadTimeDays: number;
  stockHoldingDays: number;
  depositPct: number;         // %
  payoutDelayDays: number;
  targetGrowth: number;       // monthly %
  interestRate: number;       // annual %
};

const DEFAULTS: Inputs = {
  cashOnHand: 50000,
  monthlyRevenue: 20000,
  netMargin: 20,
  leadTimeDays: 60,
  stockHoldingDays: 30,
  depositPct: 30,
  payoutDelayDays: 14,
  targetGrowth: 10,
  interestRate: 12,
};

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const STORAGE_KEY = 'smartrwl:cashflow-planner:v2';

/* ────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────── */

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
  if (abs >= 1_000_000)  return `${sign}${c.symbol}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)      return `${sign}${c.symbol}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${c.symbol}${Math.round(abs).toLocaleString()}`;
}

const fmtPct = (n: number, digits = 1) =>
  Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';

/* ────────────────────────────────────────────────
   MATH
──────────────────────────────────────────────── */

type Metrics = {
  ccc: number;
  cashTrappedPerCycle: number;
  cashTrappedAtTarget: number;
  cogsPerMonth: number;
  maxGrowthMonthly: number;
  maxGrowthAnnual: number;
  capitalNeeded: number;
  financeCostPerCycle: number;
  bufferRatio: number;            // cashOnHand / cashTrappedAtTarget
  status: 'safe' | 'risky' | 'critical';
};

/**
 * Corrected sustainable-growth derivation: cash flow is neutral when monthly
 * profit equals the increase in working capital.
 *
 *   profit_n = revenue_n × margin
 *   WC_n     = revenue_n × (1 − margin) × (ccc / 30)
 *   ΔWC_n    = WC_n × g / (1 + g)
 *
 * Setting profit_n = ΔWC_n and solving for g:
 *   g = (30 × m) / ((1 − m) × ccc − 30 × m)
 *
 * Returns monthly growth rate as a fraction (e.g. 0.0777 for 7.77%).
 */
function maxSustainableGrowthMonthly(marginFrac: number, ccc: number): number {
  if (marginFrac <= 0 || ccc <= 0) return 0;
  const denom = (1 - marginFrac) * ccc - 30 * marginFrac;
  if (denom <= 0) return Infinity;
  return (30 * marginFrac) / denom;
}

function compute(i: Inputs): Metrics {
  const marginFrac = Math.max(0, Math.min(95, i.netMargin)) / 100;
  const cogsPerMonth = i.monthlyRevenue * (1 - marginFrac);
  const ccc = i.leadTimeDays + i.stockHoldingDays + i.payoutDelayDays;

  // Cash trapped per CYCLE (not per month — earlier label was wrong)
  const cogsPerDay = cogsPerMonth / 30;
  const cashTrappedPerCycle = (i.depositPct / 100) * cogsPerDay * ccc;

  // Sustainable monthly growth rate (corrected formula)
  const sgrMonthly = maxSustainableGrowthMonthly(marginFrac, ccc);
  const maxGrowthMonthly = Number.isFinite(sgrMonthly) ? sgrMonthly * 100 : 9999;
  const maxGrowthAnnual = Number.isFinite(sgrMonthly)
    ? (Math.pow(1 + sgrMonthly, 12) - 1) * 100
    : 9999;

  // Capital needed at target growth (using full WC, more conservative)
  const grownRevenue = i.monthlyRevenue * (1 + i.targetGrowth / 100);
  const grownCogs = grownRevenue * (1 - marginFrac);
  const cashTrappedAtTarget = (i.depositPct / 100) * (grownCogs / 30) * ccc;
  const capitalNeeded = Math.max(0, cashTrappedAtTarget - i.cashOnHand);

  const cccMonths = ccc / 30;
  const financeCostPerCycle =
    capitalNeeded * (i.interestRate / 100 / 12) * cccMonths;

  // Buffer ratio — how many times over does cash cover the at-target trap?
  const bufferRatio = cashTrappedAtTarget > 0 ? i.cashOnHand / cashTrappedAtTarget : Infinity;

  // Status
  let status: Metrics['status'] = 'safe';
  if (i.targetGrowth > maxGrowthMonthly) status = 'risky';
  if (bufferRatio < 1) status = 'critical';

  return {
    ccc,
    cashTrappedPerCycle,
    cashTrappedAtTarget,
    cogsPerMonth,
    maxGrowthMonthly,
    maxGrowthAnnual,
    capitalNeeded,
    financeCostPerCycle,
    bufferRatio,
    status,
  };
}

/**
 * Project monthly cash balance for `months` months at the target growth rate.
 * Each month: balance += profit − ΔWC.
 * Uses deposit-based working capital for consistency with `compute()`.
 */
function projectBalances(i: Inputs, m: Metrics, months: number): number[] {
  const marginFrac = Math.max(0, Math.min(95, i.netMargin)) / 100;
  const g = i.targetGrowth / 100;
  const balances: number[] = [i.cashOnHand];
  let prevWC = m.cashTrappedPerCycle;

  for (let mo = 1; mo <= months; mo++) {
    const revenue = i.monthlyRevenue * Math.pow(1 + g, mo);
    const profit = revenue * marginFrac;
    const wc = (i.depositPct / 100) * (revenue * (1 - marginFrac) / 30) * m.ccc;
    const wcIncrease = wc - prevWC;
    const netChange = profit - wcIncrease;
    balances.push(balances[mo - 1] + netChange);
    prevWC = wc;
  }
  return balances;
}

/* ────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────── */

export default function CashflowPlanner() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [currency, setCurrency] = useState<CurrencyCode>('INR');
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [hydrated, setHydrated] = useState(false);

  // Hydrate
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.inputs) setInputs({ ...DEFAULTS, ...parsed.inputs });
        if (parsed.currency) setCurrency(parsed.currency);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // Persist
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, currency }));
    } catch { /* ignore */ }
  }, [hydrated, inputs, currency]);

  // Auto-clear save badge
  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 1800);
    return () => clearTimeout(t);
  }, [saveState]);

  const metrics = useMemo(() => compute(inputs), [inputs]);
  const balances = useMemo(() => projectBalances(inputs, metrics, 12), [inputs, metrics]);
  const monthsToCashOut = useMemo(() => {
    for (let i = 1; i < balances.length; i++) {
      if (balances[i] < 0) return i;
    }
    return null;
  }, [balances]);

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const saveScenario = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, currency }));
      setSaveState('saved');
    } catch { /* ignore */ }
  };

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULTS);
    setCurrency('INR');
  };

  const fmt = (n: number) => fmtCurrency(n, currency);
  const fmtC = (n: number) => fmtCurrencyCompact(n, currency);
  const currencySymbol = CURRENCIES.find((c) => c.code === currency)?.symbol ?? '₹';

  // Sensitivity scenarios
  const scenarioFaster = useMemo(
    () => compute({ ...inputs, leadTimeDays: Math.max(0, inputs.leadTimeDays - 15) }),
    [inputs]
  );
  const scenarioMargin = useMemo(
    () => compute({ ...inputs, netMargin: Math.min(95, inputs.netMargin + 5) }),
    [inputs]
  );
  const scenarioNoDeposit = useMemo(
    () => compute({ ...inputs, depositPct: 0 }),
    [inputs]
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 md:p-12">
      <div className="mx-auto max-w-6xl">
        {/* ─── HEADER ─── */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Landmark className="h-8 w-8 text-orange-500" />
              Cashflow &amp; Growth Commander
            </h1>
            <p className="mt-2 text-slate-400">
              Calculate your &ldquo;speed limit&rdquo; for growth. Don&apos;t go bankrupt by selling too fast.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5">
              <Gauge className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Speed limit
                </p>
                <div
                  className={`text-lg font-black ${
                    metrics.maxGrowthMonthly < inputs.targetGrowth
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {fmtPct(metrics.maxGrowthMonthly)}
                  <span className="ml-1 text-xs font-normal text-slate-500">/ mo</span>
                </div>
                <p className="text-[9px] text-slate-600">
                  ≈ {fmtPct(metrics.maxGrowthAnnual, 0)} annualized
                </p>
              </div>
            </div>
            <CurrencyPicker value={currency} onChange={setCurrency} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ─── LEFT: INPUTS ─── */}
          <div className="space-y-6 lg:col-span-4">
            <Card icon={<Wallet className="h-4 w-4 text-emerald-400" />} title="Financial fuel">
              <CurrencyField
                label="Cash on hand"
                value={inputs.cashOnHand}
                onChange={(v) => update('cashOnHand', v)}
                accent="emerald"
                symbol={currencySymbol}
              />
              <div className="grid grid-cols-2 gap-3">
                <CurrencyField
                  label="Revenue / mo"
                  value={inputs.monthlyRevenue}
                  onChange={(v) => update('monthlyRevenue', v)}
                  accent="emerald"
                  symbol={currencySymbol}
                />
                <PercentField
                  label="Net margin"
                  value={inputs.netMargin}
                  onChange={(v) => update('netMargin', v)}
                  accent="emerald"
                />
              </div>
            </Card>

            <Card icon={<Clock className="h-4 w-4 text-orange-400" />} title="Time lag">
              <NumberField
                label="Lead time (days)"
                value={inputs.leadTimeDays}
                onChange={(v) => update('leadTimeDays', v)}
                hint="Days from paying deposit to stock active at Amazon."
                accent="orange"
              />
              <NumberField
                label="Stock holding (days)"
                value={inputs.stockHoldingDays}
                onChange={(v) => update('stockHoldingDays', v)}
                hint="Safety-stock buffer days you keep on the shelf."
                accent="orange"
              />
              <NumberField
                label="Amazon payout delay (days)"
                value={inputs.payoutDelayDays}
                onChange={(v) => update('payoutDelayDays', v)}
                accent="orange"
              />
              <PercentField
                label="Deposit % to supplier"
                value={inputs.depositPct}
                onChange={(v) => update('depositPct', v)}
                accent="orange"
              />
            </Card>

            <Card icon={<TrendingUp className="h-4 w-4 text-orange-400" />} title="Growth &amp; debt">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    Monthly growth goal
                  </label>
                  <span
                    className={`text-xs font-bold ${
                      inputs.targetGrowth > metrics.maxGrowthMonthly
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {inputs.targetGrowth}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0} max={50} step={1}
                  value={inputs.targetGrowth}
                  onChange={(e) => update('targetGrowth', safeNum(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <PercentField
                label="Loan interest rate (annual)"
                value={inputs.interestRate}
                onChange={(v) => update('interestRate', v)}
                accent="orange"
              />
            </Card>

            <button
              onClick={saveScenario}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                saveState === 'saved'
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Save className="h-4 w-4" />
              {saveState === 'saved' ? 'Saved' : 'Save this scenario'}
            </button>
          </div>

          {/* ─── RIGHT: OUTPUTS ─── */}
          <div className="space-y-6 lg:col-span-8">
            <CashCycleTimeline inputs={inputs} ccc={metrics.ccc} />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <DiagnosisCard
                status={metrics.status}
                targetGrowth={inputs.targetGrowth}
                maxGrowthMonthly={metrics.maxGrowthMonthly}
                bufferRatio={metrics.bufferRatio}
                cashOnHand={inputs.cashOnHand}
                cashTrappedAtTarget={metrics.cashTrappedAtTarget}
                fmt={fmt}
              />
              <BufferCard
                bufferRatio={metrics.bufferRatio}
                monthsToCashOut={monthsToCashOut}
                capitalNeeded={metrics.capitalNeeded}
                financeCost={metrics.financeCostPerCycle}
                cashTrappedPerCycle={metrics.cashTrappedPerCycle}
                fmt={fmt}
              />
            </div>

            <ProjectionChart
              balances={balances}
              startingBalance={inputs.cashOnHand}
              monthsToCashOut={monthsToCashOut}
              fmtCompact={fmtC}
              targetGrowth={inputs.targetGrowth}
            />

            <LeversCard
              base={metrics.maxGrowthMonthly}
              faster={scenarioFaster.maxGrowthMonthly}
              margin={scenarioMargin.maxGrowthMonthly}
              noDeposit={scenarioNoDeposit.maxGrowthMonthly}
            />

            <StrategyCard />
            <Disclaimer />
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   FORM ATOMS
──────────────────────────────────────────────── */

function Card({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
        {icon} {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{children}</label>
  );
}

const accentRing: Record<'emerald' | 'orange', string> = {
  emerald: 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
  orange:  'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20',
};

function NumberField({
  label, value, onChange, hint, accent = 'orange',
}: { label: string; value: number; onChange: (v: number) => void; hint?: string; accent?: 'emerald' | 'orange' }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number" min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className={`w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-white outline-none transition ${accentRing[accent]}`}
      />
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function CurrencyField({
  label, value, onChange, accent = 'emerald', symbol,
}: { label: string; value: number; onChange: (v: number) => void; accent?: 'emerald' | 'orange'; symbol: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-mono">{symbol}</span>
        <input
          type="number" min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full rounded border border-slate-700 bg-slate-950 p-2 ${symbol.length > 1 ? 'pl-12' : 'pl-7'} font-mono text-white outline-none transition ${accentRing[accent]}`}
        />
      </div>
    </div>
  );
}

function PercentField({
  label, value, onChange, accent = 'orange',
}: { label: string; value: number; onChange: (v: number) => void; accent?: 'emerald' | 'orange' }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number" min={0} max={100}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full rounded border border-slate-700 bg-slate-950 p-2 pr-7 font-mono text-white outline-none transition ${accentRing[accent]}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
      </div>
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

/* ────────────────────────────────────────────────
   CASH CYCLE TIMELINE
──────────────────────────────────────────────── */

function CashCycleTimeline({ inputs, ccc }: { inputs: Inputs; ccc: number }) {
  const events = [
    { day: 0, label: 'Pay deposit', tone: 'rose' as const, icon: Banknote },
    { day: inputs.leadTimeDays, label: 'Stock arrives', tone: 'amber' as const, icon: Anchor },
    { day: inputs.leadTimeDays + inputs.stockHoldingDays, label: 'First sale', tone: 'sky' as const, icon: ArrowRight },
    { day: ccc, label: 'Amazon payout', tone: 'emerald' as const, icon: Banknote },
  ];

  const tonePill = {
    rose:    'bg-rose-950/40 border-rose-500/40 text-rose-300',
    amber:   'bg-amber-950/40 border-amber-500/40 text-amber-300',
    sky:     'bg-sky-950/40 border-sky-500/40 text-sky-300',
    emerald: 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300',
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          The cash trap cycle
        </h2>
        <span className="font-mono text-xs text-slate-500">
          Total: <span className="text-white">{ccc} days</span>
        </span>
      </div>

      <div className="relative pb-12 pt-2">
        <div className="absolute left-0 right-0 top-7 h-px bg-slate-800" />
        <div className="absolute left-0 top-7 h-px w-full bg-gradient-to-r from-rose-500/40 via-amber-500/40 to-emerald-500/40" />

        <div className="relative grid grid-cols-4 gap-2">
          {events.map((e, i) => {
            const Icon = e.icon;
            return (
              <div key={i} className="flex flex-col items-center text-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${tonePill[e.tone]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-3 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  {e.label}
                </div>
                <div className="mt-1 font-mono text-[10px] text-slate-500">Day {e.day}</div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mx-auto mt-2 max-w-md text-center text-xs text-slate-500">
        Your cash is locked for <b className="text-white">{ccc} day{ccc === 1 ? '' : 's'}</b> between paying the supplier and seeing the money in your Amazon disbursement.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   DIAGNOSIS + BUFFER CARDS
──────────────────────────────────────────────── */

function DiagnosisCard({
  status, targetGrowth, maxGrowthMonthly, bufferRatio, cashOnHand, cashTrappedAtTarget, fmt,
}: {
  status: Metrics['status'];
  targetGrowth: number;
  maxGrowthMonthly: number;
  bufferRatio: number;
  cashOnHand: number;
  cashTrappedAtTarget: number;
  fmt: (n: number) => string;
}) {
  const palette = {
    safe:     { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', text: 'text-emerald-400' },
    risky:    { border: 'border-orange-500/30',  bg: 'bg-orange-950/20',  text: 'text-orange-400' },
    critical: { border: 'border-rose-500/30',    bg: 'bg-rose-950/20',    text: 'text-rose-400' },
  }[status];

  const headline = status === 'safe' ? 'SAFE' : status === 'risky' ? 'RISKY' : 'CRITICAL';

  const shortfall = cashTrappedAtTarget - cashOnHand;
  const blurb =
    status === 'safe' ? (
      <>Your <b className="text-white">{fmt(cashOnHand)}</b> covers the {bufferRatio.toFixed(1)}× the cash trap your target growth requires. Self-funded growth is fine.</>
    ) : status === 'risky' ? (
      <>Target of <b className="text-white">{targetGrowth}% / mo</b> exceeds your {fmtPct(maxGrowthMonthly)} self-fund ceiling. Cash covers {bufferRatio.toFixed(2)}× the at-target trap — manageable but tight. Plan for outside capital within 2-3 cycles.</>
    ) : (
      <>Cash on hand (<b className="text-white">{fmt(cashOnHand)}</b>) covers only {bufferRatio.toFixed(2)}× of the trapped <b>{fmt(cashTrappedAtTarget)}</b>. Short by <b className="text-rose-300">{fmt(shortfall)}</b>. Slow growth, raise capital, or shorten the cycle before placing the next PO.</>
    );

  return (
    <div className={`rounded-xl border p-6 ${palette.border} ${palette.bg}`}>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        <AlertOctagon className="h-4 w-4" /> Growth diagnosis
      </h3>
      <div className={`mb-2 text-4xl font-black ${palette.text}`}>{headline}</div>
      <p className="text-xs leading-relaxed text-slate-300">{blurb}</p>
    </div>
  );
}

function BufferCard({
  bufferRatio, monthsToCashOut, capitalNeeded, financeCost, cashTrappedPerCycle, fmt,
}: {
  bufferRatio: number;
  monthsToCashOut: number | null;
  capitalNeeded: number;
  financeCost: number;
  cashTrappedPerCycle: number;
  fmt: (n: number) => string;
}) {
  const bufferDisplay = !Number.isFinite(bufferRatio) ? '∞×' : `${bufferRatio.toFixed(2)}×`;
  const bufferTone =
    !Number.isFinite(bufferRatio) || bufferRatio >= 2 ? 'text-emerald-400'
    : bufferRatio >= 1 ? 'text-amber-400'
    : 'text-rose-400';

  const cashOutDisplay =
    monthsToCashOut === null ? '12+ months' : `Month ${monthsToCashOut}`;
  const cashOutTone =
    monthsToCashOut === null ? 'text-emerald-400'
    : monthsToCashOut > 6 ? 'text-amber-400'
    : 'text-rose-400';

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="space-y-4">
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
            <CalendarClock className="h-4 w-4 text-orange-400" /> Cash buffer
          </h3>
          <div className={`text-3xl font-black ${bufferTone}`}>
            {bufferDisplay}<span className="text-base font-medium text-slate-500"> covered</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Cash trapped / cycle: <span className="text-slate-300 font-mono">{fmt(cashTrappedPerCycle)}</span>
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Cash-out month</span>
          <div className={`mt-1 text-xl font-bold font-mono ${cashOutTone}`}>{cashOutDisplay}</div>
          <p className="text-[10px] text-slate-500 mt-1">At your target growth, projected over 12 months</p>
        </div>
      </div>

      {capitalNeeded > 0 && (
        <div className="mt-4 rounded border border-rose-500/30 bg-rose-950/15 p-3">
          <div className="mb-1 flex justify-between text-xs text-rose-300">
            <span>Loan needed</span>
            <span className="font-bold font-mono">{fmt(capitalNeeded)}</span>
          </div>
          <div className="flex justify-between text-xs text-orange-300">
            <span>Interest / cycle</span>
            <span className="font-bold font-mono">{fmt(financeCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   PROJECTION CHART (SVG)
──────────────────────────────────────────────── */

function ProjectionChart({
  balances, startingBalance, monthsToCashOut, fmtCompact, targetGrowth,
}: {
  balances: number[];
  startingBalance: number;
  monthsToCashOut: number | null;
  fmtCompact: (n: number) => string;
  targetGrowth: number;
}) {
  const W = 720, H = 240;
  const pad = { top: 24, right: 18, bottom: 32, left: 64 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const minVal = Math.min(0, ...balances);
  const maxVal = Math.max(startingBalance * 1.1, ...balances);
  const range = maxVal - minVal || 1;

  const xToPx = (m: number) => pad.left + (m / (balances.length - 1)) * chartW;
  const yToPx = (v: number) => pad.top + chartH - ((v - minVal) / range) * chartH;

  const pathD = balances
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(i)} ${yToPx(b)}`)
    .join(' ');

  const fillD = `${pathD} L ${xToPx(balances.length - 1)} ${yToPx(0)} L ${xToPx(0)} ${yToPx(0)} Z`;
  const zeroLineVisible = minVal < 0;

  // Y axis ticks at quartiles
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minVal + t * range);
  const xTicks = [0, 3, 6, 9, 12];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
          <LineChart className="h-4 w-4 text-orange-400" /> 12-month cash projection
        </h3>
        <span className="text-[11px] text-slate-500">
          At <span className="text-orange-400 font-mono font-bold">{targetGrowth}%</span> / month growth
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 200 }}>
        {/* Grid lines */}
        {yTicks.map((tv, i) => (
          <g key={i}>
            <line
              x1={pad.left} x2={W - pad.right}
              y1={yToPx(tv)} y2={yToPx(tv)}
              stroke="#1e293b" strokeWidth={1}
              strokeDasharray={tv === 0 && zeroLineVisible ? '0' : '3,4'}
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

        {/* Zero line emphasis */}
        {zeroLineVisible && (
          <>
            <line
              x1={pad.left} x2={W - pad.right}
              y1={yToPx(0)} y2={yToPx(0)}
              stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.7}
            />
            <rect
              x={pad.left} y={yToPx(0)}
              width={chartW} height={H - pad.bottom - yToPx(0)}
              fill="#f43f5e" fillOpacity={0.06}
            />
          </>
        )}

        {/* Filled area */}
        <path d={fillD} fill="#f97316" fillOpacity={0.12} />

        {/* Line */}
        <path d={pathD} fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Starting balance line */}
        <line
          x1={pad.left} x2={W - pad.right}
          y1={yToPx(startingBalance)} y2={yToPx(startingBalance)}
          stroke="#10b981" strokeWidth={1} strokeDasharray="2,3" opacity={0.5}
        />
        <text
          x={W - pad.right - 4} y={yToPx(startingBalance) - 4}
          fontSize={9} fill="#10b981" textAnchor="end"
          fontFamily="ui-monospace, monospace"
        >
          start
        </text>

        {/* Cash-out month marker */}
        {monthsToCashOut !== null && (
          <g>
            <line
              x1={xToPx(monthsToCashOut)} x2={xToPx(monthsToCashOut)}
              y1={pad.top} y2={H - pad.bottom}
              stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3,3"
            />
            <circle cx={xToPx(monthsToCashOut)} cy={yToPx(balances[monthsToCashOut])} r={4}
              fill="#f43f5e" stroke="#0a0f1a" strokeWidth={1.5} />
            <text
              x={xToPx(monthsToCashOut)} y={pad.top - 6}
              fontSize={10} fill="#f43f5e" textAnchor="middle"
              fontWeight="bold" fontFamily="ui-monospace, monospace"
            >
              Cash out · M{monthsToCashOut}
            </text>
          </g>
        )}

        {/* Data point dots */}
        {balances.map((b, i) => (
          <circle key={i} cx={xToPx(i)} cy={yToPx(b)} r={2.5}
            fill={b < 0 ? '#f43f5e' : '#f97316'}
            stroke="#0a0f1a" strokeWidth={1}
          />
        ))}

        {/* X axis labels */}
        {xTicks.map((m) => (
          <text key={m} x={xToPx(m)} y={H - pad.bottom + 16}
            fontSize={10} fill="#64748b" textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            M{m}
          </text>
        ))}
      </svg>

      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
        Each month: balance += monthly profit − increase in working capital. Conservative model assumes deposit-fraction of COGS is committed across the {balances.length === 13 ? 'cash cycle' : 'period'}.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   LEVERS CARD
──────────────────────────────────────────────── */

function LeversCard({
  base, faster, margin, noDeposit,
}: { base: number; faster: number; margin: number; noDeposit: number }) {
  const Lever = ({
    icon, title, blurb, value,
  }: { icon: React.ReactNode; title: string; blurb: string; value: number }) => {
    const delta = value - base;
    return (
      <div className="rounded border border-slate-800 bg-slate-950 p-3 transition hover:border-orange-500/40">
        <div className="mb-2 flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-orange-300">{title}</span>
        </div>
        <p className="mb-2 text-[10px] text-slate-400">{blurb}</p>
        <div className="flex items-baseline gap-2 text-lg font-bold text-white">
          {fmtPct(value)}
          <span className={`text-xs font-mono ${delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        <BarChart4 className="h-4 w-4 text-orange-400" /> Levers of scale
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Lever
          icon={<Zap className="h-4 w-4 text-amber-400" />}
          title="Faster logistics"
          blurb="Lead time −15 days"
          value={faster}
        />
        <Lever
          icon={<Percent className="h-4 w-4 text-emerald-400" />}
          title="Better margins"
          blurb="Net margin +5%"
          value={margin}
        />
        <Lever
          icon={<Wallet className="h-4 w-4 text-sky-400" />}
          title="Net terms"
          blurb="Deposit = 0%"
          value={noDeposit}
        />
      </div>
      <p className="mt-4 text-[10px] text-slate-600">
        Each scenario re-runs the full model with one input changed. Compare the deltas to find the cheapest lever for your situation.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   STRATEGY + DISCLAIMER
──────────────────────────────────────────────── */

function StrategyCard() {
  return (
    <div className="flex gap-4 rounded-xl border border-orange-500/30 bg-orange-950/10 p-5">
      <Anchor className="mt-1 h-6 w-6 shrink-0 text-orange-400" />
      <div>
        <h4 className="mb-1 text-sm font-bold text-orange-300">How to grow faster, safely</h4>
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-orange-200/80">
          <li><b>Negotiate terms.</b> Moving from 30% deposit to net-30 or net-60 frees up significant working capital — often more impact than any other lever.</li>
          <li><b>Increase margin.</b> Each extra point of margin compounds across every inventory turn in the year. Small wins matter.</li>
          <li><b>Shorten lead time.</b> Air freight costs more per unit, but frees cash 30+ days earlier. Run the math — sometimes it&apos;s cheaper net of working-capital cost.</li>
        </ul>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-[11px] text-slate-500">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Numbers above assume steady monthly revenue. Real seller cashflow is lumpy — sales spikes, slow weeks, return windows. Treat this as a sanity-check for direction, not a CFO forecast. For real planning, pair this with a 12-week rolling cash-flow worksheet using your actual Amazon settlement reports.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   FOOTER
──────────────────────────────────────────────── */

function Footer() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
      <p className="text-sm font-medium text-slate-500">Created by SmartRwl</p>
      <div className="flex space-x-4">
        <a
          href="http://www.instagram.com/smartrwl"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 transition-colors hover:text-pink-500"
          title="Instagram"
          aria-label="Instagram"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
        <a
          href="https://github.com/Smart-rwl/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 transition-colors hover:text-white"
          title="GitHub"
          aria-label="GitHub"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
        </svg>
        </a>
      </div>
    </div>
  );
}