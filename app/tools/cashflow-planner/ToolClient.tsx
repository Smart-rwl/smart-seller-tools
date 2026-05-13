// app/tools/cashflow-planner/ToolClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  Anchor,
  ArrowRight,
  BarChart4,
  Banknote,
  CalendarClock,
  Clock,
  Gauge,
  Info,
  Landmark,
  Percent,
  Save,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   Types & helpers
──────────────────────────────────────────────── */

type Inputs = {
  cashOnHand: number;
  monthlyRevenue: number;
  netMargin: number;          // %
  leadTimeDays: number;       // days from deposit to stock active
  stockHoldingDays: number;   // days of safety stock you keep on hand
  depositPct: number;         // % paid upfront to supplier
  payoutDelayDays: number;    // Amazon payout cycle
  targetGrowth: number;       // desired % growth per month
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

const STORAGE_KEY = 'smartrwl:cashflow-planner:v1';

const safeNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const fmtINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

const fmtPct = (n: number, digits = 1) =>
  Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—';

/* ────────────────────────────────────────────────
   The math
──────────────────────────────────────────────── */

type Metrics = {
  ccc: number;
  cashTrappedPerMonth: number;
  maxGrowthMonthly: number;     // sustainable growth as monthly %
  maxGrowthAnnual: number;      // same, but annual %
  capitalNeeded: number;
  financeCostQuarterly: number;
  runwayMonths: number | 'unlimited';
  status: 'safe' | 'risky' | 'critical';
  cogsPerMonth: number;
};

function compute(i: Inputs): Metrics {
  // Guard against divide-by-zero and nonsense
  const margin = Math.max(0, Math.min(95, i.netMargin)) / 100;
  const cogsPerMonth = i.monthlyRevenue * (1 - margin);

  // Cash Conversion Cycle
  // Days money is locked up: from paying supplier deposit, through goods in transit,
  // through stock-holding, until Amazon actually disburses to your bank.
  const ccc = i.leadTimeDays + i.stockHoldingDays + i.payoutDelayDays;

  // Capital tied up at any moment in the cycle:
  // (deposit fraction) × COGS during the cycle window
  // i.e., you've committed `deposit × COGS_for_CCC_days_worth_of_revenue`
  const cogsPerDay = cogsPerMonth / 30;
  const cashTrappedPerMonth = (i.depositPct / 100) * cogsPerDay * ccc;

  // PRAT-style sustainable growth, simplified:
  // Profit per inventory turn × turns per year. Convert to monthly compounded rate.
  const annualGrowthRate = ccc > 0 ? (i.netMargin / 100) * (365 / ccc) : 0;
  const maxGrowthAnnual = annualGrowthRate * 100;
  // Convert annual → monthly: (1 + g_annual)^(1/12) - 1
  const maxGrowthMonthly =
    annualGrowthRate > -1 ? (Math.pow(1 + annualGrowthRate, 1 / 12) - 1) * 100 : 0;

  // Capital needed: the gap between what cash you have and what's locked in the cycle,
  // assuming you're trying to support the target-grown next-period revenue.
  const grownRevenue = i.monthlyRevenue * (1 + i.targetGrowth / 100);
  const grownCogsPerMonth = grownRevenue * (1 - margin);
  const grownCashTrapped =
    (i.depositPct / 100) * (grownCogsPerMonth / 30) * ccc;

  const capitalGap = grownCashTrapped - i.cashOnHand;
  const capitalNeeded = Math.max(0, capitalGap);

  // Cost to finance that gap for one full CCC (in months)
  const cccMonths = ccc / 30;
  const financeCostQuarterly =
    capitalNeeded * (i.interestRate / 100 / 12) * cccMonths;

  // Runway — how many months current cash covers ongoing COGS needs without revenue.
  // (worst-case: revenue dries up and you keep buying inventory)
  let runwayMonths: number | 'unlimited' = 'unlimited';
  if (grownCogsPerMonth > 0) {
    runwayMonths = i.cashOnHand / grownCogsPerMonth;
  }

  // Status
  let status: Metrics['status'] = 'safe';
  if (i.targetGrowth > maxGrowthMonthly) status = 'risky';
  if (
    capitalGap > 0 &&
    (runwayMonths === 'unlimited' ? false : runwayMonths < 1.5)
  ) {
    status = 'critical';
  }

  return {
    ccc,
    cashTrappedPerMonth,
    maxGrowthMonthly,
    maxGrowthAnnual,
    capitalNeeded,
    financeCostQuarterly,
    runwayMonths,
    status,
    cogsPerMonth,
  };
}

/* ────────────────────────────────────────────────
   Component
──────────────────────────────────────────────── */

export default function CashflowPlanner() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');

  // Load saved scenario on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Inputs>;
      setInputs((prev) => ({ ...prev, ...parsed }));
    } catch {
      /* ignore corrupted storage */
    }
  }, []);

  // Auto-clear save badge
  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 1800);
    return () => clearTimeout(t);
  }, [saveState]);

  const metrics = useMemo(() => compute(inputs), [inputs]);

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const saveScenario = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      setSaveState('saved');
    } catch {
      /* quota — ignore */
    }
  };

  // Sensitivity scenarios — what-if levers
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
        {/* HEADER */}
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

          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
            <Gauge className="h-6 w-6 text-orange-500" />
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Speed limit (max growth)
              </p>
              <div
                className={`text-xl font-black ${
                  metrics.maxGrowthMonthly < inputs.targetGrowth
                    ? 'text-red-400'
                    : 'text-emerald-400'
                }`}
              >
                {fmtPct(metrics.maxGrowthMonthly)}{' '}
                <span className="text-xs font-normal text-slate-500">/ month</span>
              </div>
              <p className="text-[9px] text-slate-600">
                (≈ {fmtPct(metrics.maxGrowthAnnual, 0)} annualized)
              </p>
            </div>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT — inputs */}
          <div className="space-y-6 lg:col-span-4">
            <Card icon={<Wallet className="h-4 w-4 text-emerald-400" />} title="Financial fuel">
              <CurrencyField
                label="Cash on hand"
                value={inputs.cashOnHand}
                onChange={(v) => update('cashOnHand', v)}
                accent="emerald"
              />
              <div className="grid grid-cols-2 gap-3">
                <CurrencyField
                  label="Revenue / mo"
                  value={inputs.monthlyRevenue}
                  onChange={(v) => update('monthlyRevenue', v)}
                  accent="emerald"
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
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Monthly growth goal
                  </label>
                  <span
                    className={`text-xs font-bold ${
                      inputs.targetGrowth > metrics.maxGrowthMonthly
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {inputs.targetGrowth}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
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
                  ? 'border-emerald-700 bg-emerald-950/40 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Save className="h-4 w-4" />
              {saveState === 'saved' ? 'Saved' : 'Save this scenario'}
            </button>
          </div>

          {/* RIGHT — outputs */}
          <div className="space-y-6 lg:col-span-8">
            <CashCycleTimeline inputs={inputs} ccc={metrics.ccc} />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <DiagnosisCard
                status={metrics.status}
                targetGrowth={inputs.targetGrowth}
                maxGrowthMonthly={metrics.maxGrowthMonthly}
              />
              <RunwayCard
                runway={metrics.runwayMonths}
                capitalNeeded={metrics.capitalNeeded}
                financeCost={metrics.financeCostQuarterly}
                cashTrapped={metrics.cashTrappedPerMonth}
              />
            </div>

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
   Form atoms
──────────────────────────────────────────────── */

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
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
    <label className="mb-1 block text-xs font-bold uppercase text-slate-500">{children}</label>
  );
}

const accentRing: Record<'emerald' | 'orange', string> = {
  emerald: 'focus:border-emerald-500',
  orange: 'focus:border-orange-500',
};

function NumberField({
  label,
  value,
  onChange,
  hint,
  accent = 'orange',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  accent?: 'emerald' | 'orange';
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className={`w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-white outline-none ${accentRing[accent]}`}
      />
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  accent = 'emerald',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent?: 'emerald' | 'orange';
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₹</span>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full rounded border border-slate-700 bg-slate-950 p-2 pl-7 font-mono text-white outline-none ${accentRing[accent]}`}
        />
      </div>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  accent = 'orange',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  accent?: 'emerald' | 'orange';
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full rounded border border-slate-700 bg-slate-950 p-2 pr-7 font-mono text-white outline-none ${accentRing[accent]}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Cash-cycle timeline
──────────────────────────────────────────────── */

function CashCycleTimeline({ inputs, ccc }: { inputs: Inputs; ccc: number }) {
  // Day markers along the cycle
  const events = [
    { day: 0, label: 'Pay deposit', tone: 'red' as const, icon: Banknote },
    {
      day: inputs.leadTimeDays,
      label: 'Stock arrives',
      tone: 'amber' as const,
      icon: Anchor,
    },
    {
      day: inputs.leadTimeDays + inputs.stockHoldingDays,
      label: 'First sale',
      tone: 'sky' as const,
      icon: ArrowRight,
    },
    {
      day: ccc,
      label: 'Amazon payout',
      tone: 'emerald' as const,
      icon: Banknote,
    },
  ];

  const tonePill: Record<typeof events[number]['tone'], string> = {
    red: 'bg-red-900/30 border-red-500/40 text-red-300',
    amber: 'bg-amber-900/30 border-amber-500/40 text-amber-300',
    sky: 'bg-sky-900/30 border-sky-500/40 text-sky-300',
    emerald: 'bg-emerald-900/30 border-emerald-500/40 text-emerald-300',
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

      {/* Timeline rail */}
      <div className="relative pb-12 pt-2">
        <div className="absolute left-0 right-0 top-7 h-px bg-slate-800" />
        <div
          className="absolute left-0 top-7 h-px bg-gradient-to-r from-red-500/40 via-amber-500/40 to-emerald-500/40"
          style={{ width: '100%' }}
        />

        <div className="relative grid grid-cols-4 gap-2">
          {events.map((e, i) => {
            const Icon = e.icon;
            return (
              <div key={i} className="flex flex-col items-center text-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border ${tonePill[e.tone]}`}
                >
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
        Your cash is locked for{' '}
        <b className="text-white">
          {ccc} day{ccc === 1 ? '' : 's'}
        </b>{' '}
        between paying the supplier and seeing the money in your Amazon disbursement.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Diagnosis & runway cards
──────────────────────────────────────────────── */

function DiagnosisCard({
  status,
  targetGrowth,
  maxGrowthMonthly,
}: {
  status: Metrics['status'];
  targetGrowth: number;
  maxGrowthMonthly: number;
}) {
  const palette = {
    safe: { border: 'border-emerald-900', bg: 'bg-emerald-950/20', text: 'text-emerald-400' },
    risky: { border: 'border-orange-900', bg: 'bg-orange-950/20', text: 'text-orange-400' },
    critical: { border: 'border-red-900', bg: 'bg-red-950/20', text: 'text-red-400' },
  }[status];

  const headline =
    status === 'safe'
      ? 'SAFE'
      : status === 'risky'
        ? 'RISKY'
        : 'CRITICAL';

  const blurb =
    status === 'safe'
      ? 'Your cash cycle can fund this growth from profits. No external capital required.'
      : status === 'risky'
        ? `Your target of ${targetGrowth}% per month exceeds the ${fmtPct(maxGrowthMonthly)} you can self-fund. Expect to need outside capital within 2-3 cycles.`
        : 'Cash on hand cannot cover even one full cycle of inventory at this growth rate. Slow growth, raise capital, or shorten the cycle before placing the next PO.';

  return (
    <div className={`rounded-xl border p-6 ${palette.border} ${palette.bg}`}>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
        <AlertOctagon className="h-4 w-4" /> Growth diagnosis
      </h3>
      <div className={`mb-1 text-4xl font-black ${palette.text}`}>{headline}</div>
      <p className="text-xs leading-relaxed text-slate-300">{blurb}</p>
    </div>
  );
}

function RunwayCard({
  runway,
  capitalNeeded,
  financeCost,
  cashTrapped,
}: {
  runway: number | 'unlimited';
  capitalNeeded: number;
  financeCost: number;
  cashTrapped: number;
}) {
  const display =
    runway === 'unlimited' ? '∞' : runway > 12 ? '12+' : runway.toFixed(1);

  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div>
        <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
          <CalendarClock className="h-4 w-4 text-orange-400" /> Cash runway
        </h3>
        <div className="mb-1 text-4xl font-black text-white">
          {display}{' '}
          <span className="text-lg font-medium text-slate-500">
            month{display === '1.0' ? '' : 's'}
          </span>
        </div>
        <p className="text-[11px] text-slate-500">
          Cash trapped per cycle: <span className="text-slate-300">{fmtINR(cashTrapped)}</span>
        </p>
      </div>

      {capitalNeeded > 0 && (
        <div className="mt-4 rounded border border-red-900/30 bg-red-900/10 p-3">
          <div className="mb-1 flex justify-between text-xs text-red-300">
            <span>Loan needed</span>
            <span className="font-bold">{fmtINR(capitalNeeded)}</span>
          </div>
          <div className="flex justify-between text-xs text-orange-300">
            <span>Interest for one cycle</span>
            <span className="font-bold">{fmtINR(financeCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Levers card
──────────────────────────────────────────────── */

function LeversCard({
  base,
  faster,
  margin,
  noDeposit,
}: {
  base: number;
  faster: number;
  margin: number;
  noDeposit: number;
}) {
  const Lever = ({
    icon,
    title,
    blurb,
    value,
  }: {
    icon: React.ReactNode;
    title: string;
    blurb: string;
    value: number;
  }) => {
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
          <span
            className={`text-xs ${
              delta > 0
                ? 'text-emerald-400'
                : delta < 0
                  ? 'text-red-400'
                  : 'text-slate-500'
            }`}
          >
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
        <BarChart4 className="h-4 w-4 text-purple-400" /> Levers of scale
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Lever
          icon={<Zap className="h-4 w-4 text-yellow-400" />}
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
        Each scenario re-runs the full model with one input changed. Compare the deltas to find the
        cheapest lever for your situation.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Strategy & disclaimer
──────────────────────────────────────────────── */

function StrategyCard() {
  return (
    <div className="flex gap-4 rounded-xl border border-orange-900/30 bg-orange-900/10 p-5">
      <Anchor className="mt-1 h-6 w-6 shrink-0 text-orange-400" />
      <div>
        <h4 className="mb-1 text-sm font-bold text-orange-300">How to grow faster, safely</h4>
        <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-orange-200/70">
          <li>
            <b>Negotiate terms.</b> Moving from 30% deposit to net-30 or net-60 frees up significant
            working capital — often more impact than any other lever.
          </li>
          <li>
            <b>Increase margin.</b> Each extra point of margin compounds across every inventory turn
            in the year. Small wins matter.
          </li>
          <li>
            <b>Shorten lead time.</b> Air freight costs more per unit, but frees cash 30+ days
            earlier. Run the math — sometimes it&apos;s cheaper net of working-capital cost.
          </li>
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
        Numbers above assume steady monthly revenue. Real seller cashflow is lumpy — sales spikes,
        slow weeks, return windows. Treat this as a sanity-check for direction, not a CFO forecast.
        For real planning, pair this with a 12-week rolling cash-flow worksheet using your actual
        Amazon settlement reports.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Footer
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
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      </div>
    </div>
  );
}