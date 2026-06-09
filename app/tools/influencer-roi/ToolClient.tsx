// app/tools/influencer-audit/ToolClient.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  Check,
  ChevronDown,
  Copy,
  Filter,
  Gauge,
  Ghost,
  Info,
  Repeat,
  RotateCcw,
  Save,
  Share2,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   Types & defaults
──────────────────────────────────────────────── */

type Status = 'safe' | 'risky' | 'impossible';

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

type Inputs = {
  // Deal
  influencerFee: number;
  seedingCost: number;
  adUsageFee: number;
  commissionRate: number; // %

  // Audience
  followerCount: number;
  estReach: number;       // %
  botPercentage: number;  // %

  // Product
  sellingPrice: number;
  landedCost: number;
  discountCode: number;   // %

  // Long-term
  ltvMultiplier: number;

  // Display
  currency: CurrencyCode;
};

const DEFAULTS: Inputs = {
  influencerFee: 10000,
  seedingCost: 500,
  adUsageFee: 0,
  commissionRate: 0,
  followerCount: 50000,
  estReach: 10,
  botPercentage: 20,
  sellingPrice: 1500,
  landedCost: 600,
  discountCode: 15,
  ltvMultiplier: 1.5,
  currency: 'INR',
};

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const STORAGE_KEY = 'smartrwl:influencer-audit:v2';

const REACH_PRESETS: { label: string; value: number; followerHint: string }[] = [
  { label: 'Nano',  value: 10,  followerHint: '< 10k followers' },
  { label: 'Micro', value: 5,   followerHint: '10k – 100k' },
  { label: 'Mid',   value: 2.5, followerHint: '100k – 500k' },
  { label: 'Macro', value: 1,   followerHint: '500k – 1M' },
  { label: 'Mega',  value: 0.5, followerHint: '> 1M' },
];

const BOT_PRESETS: { label: string; value: number }[] = [
  { label: 'Clean',      value: 5 },
  { label: 'Typical',    value: 20 },
  { label: 'Heavy',      value: 35 },
  { label: 'Very heavy', value: 50 },
];

/* ────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────── */

const safeNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

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

function fmtNumber(n: number, code: CurrencyCode): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  return Number.isFinite(n) ? n.toLocaleString(c.locale) : '—';
}

const fmtPct = (n: number, digits = 1) =>
  Number.isFinite(n) && n < 1000 ? `${n.toFixed(digits)}%` : '—';

/* ────────────────────────────────────────────────
   The math — pure, memoizable, all clamped
──────────────────────────────────────────────── */

type Metrics = {
  fixedCost: number;
  discountedPrice: number;
  commissionPerUnit: number;
  marginPerUnit: number;
  breakEvenUnits: number;
  target2xUnits: number;
  rawReach: number;
  realReach: number;
  requiredConversionPct: number;
  vanityCpm: number;
  realCpm: number;
  ltvProfitPerCustomer: number;
  ltvReturnMultiple: number;
  affiliatePayoutAt2x: number;
  status: Status;
};

function compute(i: Inputs): Metrics {
  const fixedCost = Math.max(0, i.influencerFee + i.seedingCost + i.adUsageFee);

  const discount = clamp(i.discountCode, 0, 100) / 100;
  const commission = clamp(i.commissionRate, 0, 100) / 100;
  const discountedPrice = i.sellingPrice * (1 - discount);
  const commissionPerUnit = discountedPrice * commission;
  const marginPerUnit = discountedPrice - i.landedCost - commissionPerUnit;

  const reach = clamp(i.estReach, 0, 100) / 100;
  const bots = clamp(i.botPercentage, 0, 100) / 100;
  const rawReach = i.followerCount * reach;
  const realReach = rawReach * (1 - bots);

  let breakEvenUnits = 0;
  let target2xUnits = 0;
  let requiredConversionPct = 0;

  if (marginPerUnit > 0 && fixedCost > 0) {
    breakEvenUnits = Math.ceil(fixedCost / marginPerUnit);
    target2xUnits = Math.ceil((fixedCost * 2) / marginPerUnit);
    if (realReach > 0) {
      requiredConversionPct = (breakEvenUnits / realReach) * 100;
    } else {
      requiredConversionPct = 9999;
    }
  }

  const vanityCpm = rawReach > 0 ? (fixedCost / rawReach) * 1000 : 0;
  const realCpm = realReach > 0 ? (fixedCost / realReach) * 1000 : 0;

  const ltvMult = Math.max(1, i.ltvMultiplier);
  const repeatProfit = (i.sellingPrice - i.landedCost) * (ltvMult - 1);
  const ltvProfitPerCustomer = marginPerUnit + repeatProfit;

  const ltvReturnMultiple =
    breakEvenUnits > 0 && fixedCost > 0
      ? (ltvProfitPerCustomer * breakEvenUnits) / fixedCost
      : 0;

  const affiliatePayoutAt2x = target2xUnits * commissionPerUnit;

  let status: Status;
  if (marginPerUnit <= 0 || fixedCost === 0) {
    status = marginPerUnit <= 0 && fixedCost > 0 ? 'impossible' : 'safe';
  } else if (requiredConversionPct > 5) {
    status = 'impossible';
  } else if (requiredConversionPct > 2.5) {
    status = 'risky';
  } else {
    status = 'safe';
  }

  return {
    fixedCost,
    discountedPrice,
    commissionPerUnit,
    marginPerUnit,
    breakEvenUnits,
    target2xUnits,
    rawReach,
    realReach,
    requiredConversionPct,
    vanityCpm,
    realCpm,
    ltvProfitPerCustomer,
    ltvReturnMultiple,
    affiliatePayoutAt2x,
    status,
  };
}

/* ────────────────────────────────────────────────
   Negotiation scripts — contextual, currency-aware
──────────────────────────────────────────────── */

type Script = { id: string; title: string; body: string };

function generateScripts(
  i: Inputs,
  m: Metrics,
  fmt: (n: number) => string,
  fmtN: (n: number) => string,
): Script[] {
  const out: Script[] = [];

  if (m.marginPerUnit <= 0) {
    out.push({
      id: 'negative-margin',
      title: 'Fix the product economics first',
      body: `At ${fmt(i.sellingPrice)} selling price with a ${i.discountCode}% discount code and ${i.commissionRate}% commission, per-unit margin is ${fmt(m.marginPerUnit)} — you lose money on every sale before the campaign cost is even counted. Drop the discount, raise the price, or remove commission before running any influencer deal on this SKU.`,
    });
  }

  if ((m.status === 'risky' || m.status === 'impossible') && i.influencerFee > 0) {
    const shift = Math.max(1000, Math.round((i.influencerFee * 0.3) / 1000) * 1000);
    out.push({
      id: 'shift-to-commission',
      title: 'Shift flat fee → commission',
      body: `"Based on our model, breaking even on this campaign requires ${m.requiredConversionPct.toFixed(1)}% of your real audience to buy, which is above the 1–2% industry norm for product launches. Could we shift ${fmt(shift)} of the flat fee into a 10% per-sale commission? It shares the risk on our side and gives you uncapped upside if the post performs."`,
    });
  }

  if (i.botPercentage >= 30) {
    out.push({
      id: 'audience-proof',
      title: 'Request audience proof before paying',
      body: `"Before we finalize, could you share screenshots of average reel views, saves, and shares from your last 5 posts in the same category as our product? Our model assumes ${i.botPercentage}% inflated reach for an audience of this size — we'd love data that proves otherwise."`,
    });
  }

  if (m.realCpm > 600 && m.fixedCost > 0) {
    out.push({
      id: 'high-cpm',
      title: 'Effective CPM is above market',
      body: `"After filtering for inactive accounts and bots, our effective CPM works out to ${fmt(m.realCpm)} per 1,000 real impressions. Branded reels in this category typically run ${fmt(200)}–${fmt(500)} CPM. Could we restructure as a performance-based deal — a smaller flat fee plus a per-sale bonus?"`,
    });
  }

  if (out.length === 0 && m.status === 'safe') {
    out.push({
      id: 'closing',
      title: 'Closing line',
      body: `"Numbers look workable. We're comfortable at ${fmt(i.influencerFee)} flat${i.commissionRate > 0 ? ` + ${i.commissionRate}% commission` : ''}. Ship date and content brief — can we lock those in this week?"`,
    });
  }

  return out;
}

/* ────────────────────────────────────────────────
   Component
──────────────────────────────────────────────── */

export default function InfluencerAuditor() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [hydrated, setHydrated] = useState(false);

  /* Hydrate */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Inputs>;
        setInputs((p) => ({ ...p, ...parsed }));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* Persist */
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
    } catch { /* ignore */ }
  }, [hydrated, inputs]);

  /* Save flash */
  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 1800);
    return () => clearTimeout(t);
  }, [saveState]);

  const metrics = useMemo(() => compute(inputs), [inputs]);

  const fmt = (n: number) => fmtCurrency(n, inputs.currency);
  const fmtN = (n: number) => fmtNumber(n, inputs.currency);
  const symbol = CURRENCIES.find((c) => c.code === inputs.currency)?.symbol ?? '₹';

  /* Sensitivity scenarios */
  const scenarioLowerFee = useMemo(
    () => compute({ ...inputs, influencerFee: inputs.influencerFee * 0.7 }),
    [inputs],
  );
  const scenarioAddCommission = useMemo(
    () => compute({ ...inputs, commissionRate: Math.min(inputs.commissionRate + 10, 100) }),
    [inputs],
  );
  const scenarioWorstBots = useMemo(
    () => compute({ ...inputs, botPercentage: Math.min(inputs.botPercentage + 20, 100) }),
    [inputs],
  );

  const scripts = useMemo(
    () => generateScripts(inputs, metrics, fmt, fmtN),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inputs, metrics],
  );

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const saveScenario = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      setSaveState('saved');
    } catch { /* quota */ }
  };

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULTS);
  };

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 md:p-12">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Share2 className="h-8 w-8 text-orange-500" />
              Influencer Deal Architect
            </h1>
            <p className="mt-2 text-slate-400">
              Audit an influencer offer against unit economics, bot-filtered reach, and lifetime value — before you sign.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={metrics.status} />
            <CurrencyPicker value={inputs.currency} onChange={(c) => update('currency', c)} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT — inputs */}
          <div className="space-y-6 lg:col-span-5">
            <DealCard inputs={inputs} update={update} symbol={symbol} />
            <AudienceCard inputs={inputs} update={update} fmtN={fmtN} />
            <ProductCard inputs={inputs} update={update} symbol={symbol} />
            <LtvCard inputs={inputs} update={update} />

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

          {/* RIGHT — outputs */}
          <div className="space-y-6 lg:col-span-7">
            <RequiredConversionCard metrics={metrics} inputs={inputs} fmt={fmt} fmtN={fmtN} />

            <ReachFunnel
              followerCount={inputs.followerCount}
              rawReach={metrics.rawReach}
              realReach={metrics.realReach}
              breakEvenUnits={metrics.breakEvenUnits}
              estReach={inputs.estReach}
              botPercentage={inputs.botPercentage}
              fmtN={fmtN}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <CpmCard metrics={metrics} fmt={fmt} />
              <FinancialsCard metrics={metrics} inputs={inputs} fmt={fmt} />
            </div>

            <LtvCardOutput metrics={metrics} inputs={inputs} fmt={fmt} />

            <LeversCard
              base={metrics.requiredConversionPct}
              lowerFee={scenarioLowerFee.requiredConversionPct}
              addCommission={scenarioAddCommission.requiredConversionPct}
              worstBots={scenarioWorstBots.requiredConversionPct}
            />

            <ScriptsCard scripts={scripts} />
          </div>
        </div>

        <Disclaimer />
        <Footer />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Input cards
──────────────────────────────────────────────── */

function DealCard({
  inputs, update, symbol,
}: {
  inputs: Inputs;
  update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void;
  symbol: string;
}) {
  return (
    <Card icon={<Users className="h-4 w-4 text-orange-400" />} title="Deal structure">
      <CurrencyField label="Flat fee" value={inputs.influencerFee} onChange={(v) => update('influencerFee', v)} symbol={symbol} />
      <div className="grid grid-cols-2 gap-3">
        <CurrencyField label="Seeding cost" value={inputs.seedingCost} onChange={(v) => update('seedingCost', v)} symbol={symbol} />
        <CurrencyField label="Ad-usage fee" value={inputs.adUsageFee} onChange={(v) => update('adUsageFee', v)} symbol={symbol} />
      </div>
      <PercentField
        label="Commission per sale"
        value={inputs.commissionRate}
        onChange={(v) => update('commissionRate', v)}
        hint="Optional hybrid: flat fee + % of each sale tracked to their code."
      />
    </Card>
  );
}

function AudienceCard({
  inputs, update, fmtN,
}: {
  inputs: Inputs;
  update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void;
  fmtN: (n: number) => string;
}) {
  return (
    <Card icon={<Gauge className="h-4 w-4 text-orange-400" />} title="Audience">
      <NumberField
        label="Follower count"
        value={inputs.followerCount}
        onChange={(v) => update('followerCount', v)}
      />

      <div>
        <Label>Estimated reach (%)</Label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {REACH_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => update('estReach', p.value)}
              className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
                inputs.estReach === p.value
                  ? 'border-orange-500 bg-orange-500/15 text-orange-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
              }`}
              title={p.followerHint}
            >
              {p.label} {p.value}%
            </button>
          ))}
        </div>
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={inputs.estReach === 0 ? '' : inputs.estReach}
          onChange={(e) => update('estReach', safeNum(e.target.value))}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
        />
      </div>

      <div>
        <Label>
          <span className="flex items-center gap-1">
            <Ghost className="h-3 w-3" /> Fake / bot followers
          </span>
        </Label>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {BOT_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => update('botPercentage', p.value)}
              className={`rounded-full border px-2.5 py-1 text-[10px] transition ${
                inputs.botPercentage === p.value
                  ? 'border-orange-500 bg-orange-500/15 text-orange-200'
                  : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
              }`}
            >
              {p.label} {p.value}%
            </button>
          ))}
        </div>
        <input
          type="range"
          min="0"
          max="80"
          step="1"
          value={inputs.botPercentage}
          onChange={(e) => update('botPercentage', safeNum(e.target.value))}
          className="w-full accent-orange-500"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          Currently <span className="text-slate-300 font-bold">{inputs.botPercentage}%</span> — industry average is 20–30%.
        </p>
      </div>
    </Card>
  );
}

function ProductCard({
  inputs, update, symbol,
}: {
  inputs: Inputs;
  update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void;
  symbol: string;
}) {
  return (
    <Card icon={<Wallet className="h-4 w-4 text-orange-400" />} title="Product economics">
      <div className="grid grid-cols-2 gap-3">
        <CurrencyField label="Selling price" value={inputs.sellingPrice} onChange={(v) => update('sellingPrice', v)} symbol={symbol} />
        <CurrencyField label="Landed cost (COGS)" value={inputs.landedCost} onChange={(v) => update('landedCost', v)} symbol={symbol} />
      </div>
      <PercentField
        label="Discount code (%)"
        value={inputs.discountCode}
        onChange={(v) => update('discountCode', v)}
        hint="The promo % the influencer gives their audience."
      />
    </Card>
  );
}

function LtvCard({
  inputs, update,
}: {
  inputs: Inputs;
  update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void;
}) {
  return (
    <Card icon={<Repeat className="h-4 w-4 text-orange-400" />} title="Long-term value">
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <Label>LTV multiplier</Label>
          <span className="font-mono text-xs font-bold text-orange-400">{inputs.ltvMultiplier.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          step="0.1"
          value={inputs.ltvMultiplier}
          onChange={(e) => update('ltvMultiplier', safeNum(e.target.value))}
          className="w-full accent-orange-500"
        />
        <p className="mt-1 text-[10px] text-slate-500">
          How many total orders per customer over their life? 1.0× = one-and-done, 3.0× = three orders on average.
        </p>
      </div>
    </Card>
  );
}

/* ────────────────────────────────────────────────
   Output: status badge
──────────────────────────────────────────────── */

function StatusBadge({ status }: { status: Status }) {
  const palette = {
    safe:       { dot: 'bg-emerald-500', text: 'text-emerald-400' },
    risky:      { dot: 'bg-amber-500',   text: 'text-amber-400' },
    impossible: { dot: 'bg-rose-500',    text: 'text-rose-400' },
  }[status];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
      <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} />
      <span className="text-xs font-medium text-slate-300">
        Risk: <span className={`${palette.text} font-bold tracking-wider`}>{status.toUpperCase()}</span>
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Output: required conversion banner
──────────────────────────────────────────────── */

function RequiredConversionCard({
  metrics, inputs, fmt, fmtN,
}: {
  metrics: Metrics;
  inputs: Inputs;
  fmt: (n: number) => string;
  fmtN: (n: number) => string;
}) {
  const palette = {
    safe: {
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-950/20',
      text: 'text-emerald-400',
      icon: <Target className="h-5 w-5 text-emerald-400" />,
      verdict: 'Numbers work.',
    },
    risky: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-950/20',
      text: 'text-amber-400',
      icon: <Target className="h-5 w-5 text-amber-400" />,
      verdict: 'High risk.',
    },
    impossible: {
      border: 'border-rose-500/30',
      bg: 'bg-rose-950/20',
      text: 'text-rose-400',
      icon: <AlertOctagon className="h-5 w-5 text-rose-400" />,
      verdict: 'Walk away.',
    },
  }[metrics.status];

  return (
    <div className={`flex flex-col items-center justify-between gap-8 rounded-xl border p-8 md:flex-row ${palette.border} ${palette.bg}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {palette.icon}
          <span className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Required conversion rate
          </span>
        </div>
        <div className="font-mono text-5xl font-extrabold text-white tabular-nums">
          {fmtPct(metrics.requiredConversionPct, 2)}
        </div>
        <p className="text-sm text-slate-400">
          of <b className="text-white">real</b> humans (bots excluded) must buy to break even.
        </p>
      </div>

      <div className="w-full rounded-lg border border-white/10 bg-slate-950/50 p-4 text-sm leading-relaxed text-slate-300 md:w-72">
        <span className={`font-bold ${palette.text}`}>{palette.verdict}</span>
        <br />
        After filtering out {inputs.botPercentage}% bots from {fmtN(inputs.followerCount)}{' '}
        followers at {inputs.estReach}% reach, you have{' '}
        <span className="text-white font-bold">{fmtN(Math.round(metrics.realReach))}</span>{' '}
        real eyeballs. {metrics.breakEvenUnits || '—'} of them must buy to recover{' '}
        <span className="text-white font-mono">{fmt(metrics.fixedCost)}</span>.
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Output: reach funnel viz (NEW)
──────────────────────────────────────────────── */

function ReachFunnel({
  followerCount, rawReach, realReach, breakEvenUnits, estReach, botPercentage, fmtN,
}: {
  followerCount: number;
  rawReach: number;
  realReach: number;
  breakEvenUnits: number;
  estReach: number;
  botPercentage: number;
  fmtN: (n: number) => string;
}) {
  if (followerCount === 0) return null;

  const pctOf = (v: number) => (followerCount > 0 ? (v / followerCount) * 100 : 0);
  // Visual scaling — even tiny ratios need a minimum bar width to be visible
  const visualWidth = (v: number) => Math.max(0.5, pctOf(v));

  const steps = [
    {
      label: 'Followers',
      count: followerCount,
      pct: 100,
      color: 'bg-orange-500',
      detail: 'Total audience size',
    },
    {
      label: 'Reached',
      count: Math.round(rawReach),
      pct: pctOf(rawReach),
      color: 'bg-orange-400',
      detail: `${estReach}% see the post`,
    },
    {
      label: 'Real humans',
      count: Math.round(realReach),
      pct: pctOf(realReach),
      color: 'bg-amber-400',
      detail: `${100 - botPercentage}% of reach are real accounts`,
    },
    {
      label: 'Need to buy',
      count: breakEvenUnits,
      pct: pctOf(breakEvenUnits),
      color: 'bg-rose-500',
      detail: 'Break-even ask',
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Filter className="h-4 w-4 text-orange-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Audience funnel
        </h3>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-3">
            <div className="w-28 shrink-0">
              <div className="text-xs font-bold text-slate-200">{step.label}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{step.detail}</div>
            </div>
            <div className="flex-1 relative h-7 bg-slate-950 rounded border border-slate-800 overflow-hidden">
              <div
                className={`h-full ${step.color} transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${visualWidth(step.count)}%` }}
              >
                {step.pct >= 8 && (
                  <span className="text-[10px] font-mono font-bold text-white">
                    {step.pct.toFixed(step.pct < 1 ? 2 : 1)}%
                  </span>
                )}
              </div>
              {step.pct < 8 && (
                <span className="absolute top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400"
                  style={{ left: `calc(${visualWidth(step.count)}% + 6px)` }}>
                  {step.pct.toFixed(step.pct < 1 ? 2 : 1)}%
                </span>
              )}
            </div>
            <div className="w-20 shrink-0 text-right">
              <div className="text-sm font-mono font-bold text-white">{fmtN(step.count)}</div>
              {idx > 0 && (
                <div className="text-[10px] text-slate-500 font-mono">
                  {((step.count / steps[idx - 1].count) * 100).toFixed(0)}% of prev
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
        Width shows fraction of total followers. The gap between &ldquo;Real humans&rdquo; and &ldquo;Need to buy&rdquo; is the conversion ask — wider gap = harder ask.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Output: CPM card
──────────────────────────────────────────────── */

function CpmCard({ metrics, fmt }: { metrics: Metrics; fmt: (n: number) => string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Vanity vs real CPM</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Vanity CPM (all followers)</span>
          <span className="font-mono text-slate-500 line-through">{fmt(metrics.vanityCpm)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-bold text-white">Real CPM (active humans)</span>
          <span className="font-mono font-bold text-white">{fmt(metrics.realCpm)}</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          What you actually pay to reach 1,000 real people. Compare against ad-platform CPM for this category.
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Output: financials
──────────────────────────────────────────────── */

function FinancialsCard({
  metrics, inputs, fmt,
}: {
  metrics: Metrics;
  inputs: Inputs;
  fmt: (n: number) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">Day-1 financials</h3>
      <dl className="space-y-2 text-sm">
        <Row label="Total campaign cost">{fmt(metrics.fixedCost)}</Row>
        <Row label="Margin per unit (post-discount)">
          <span className={metrics.marginPerUnit < 0 ? 'text-rose-400' : ''}>
            {fmt(metrics.marginPerUnit)}
          </span>
        </Row>
        <Row label="Break-even units">{metrics.breakEvenUnits || '—'}</Row>
        <Row label="2× target units">{metrics.target2xUnits || '—'}</Row>
        {inputs.commissionRate > 0 && (
          <Row label={`Affiliate payout @ 2× (${inputs.commissionRate}%)`}>
            {fmt(metrics.affiliatePayoutAt2x)}
          </Row>
        )}
      </dl>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Output: LTV card
──────────────────────────────────────────────── */

function LtvCardOutput({
  metrics, inputs, fmt,
}: {
  metrics: Metrics;
  inputs: Inputs;
  fmt: (n: number) => string;
}) {
  const ltvRoiPct = (metrics.ltvReturnMultiple - 1) * 100;

  return (
    <div className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-orange-950/10 p-6">
      <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
        <Repeat className="h-24 w-24 text-orange-500" />
      </div>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-300">
        <TrendingUp className="h-4 w-4" /> The long game
      </h3>
      <div className="relative z-10 grid grid-cols-2 gap-8">
        <div>
          <span className="mb-1 block text-xs text-slate-400">Lifetime profit / customer</span>
          <span className="font-mono text-2xl font-bold text-white">
            {fmt(metrics.ltvProfitPerCustomer)}
          </span>
        </div>
        <div>
          <span className="mb-1 block text-xs text-slate-400">LTV return at break-even</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-orange-400">
              {metrics.ltvReturnMultiple.toFixed(2)}×
            </span>
            <span className="text-xs text-orange-300/70 font-mono">
              ({ltvRoiPct >= 0 ? '+' : ''}{ltvRoiPct.toFixed(0)}% ROI)
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 max-w-md text-[11px] text-slate-500 leading-relaxed">
        Even if Day-1 sales just break even, at a {inputs.ltvMultiplier.toFixed(1)}× LTV multiplier each acquired customer is worth {fmt(metrics.ltvProfitPerCustomer)} over their lifetime. The campaign returns {metrics.ltvReturnMultiple.toFixed(2)}× the spend long-term.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Output: levers (sensitivity scenarios)
──────────────────────────────────────────────── */

function LeversCard({
  base, lowerFee, addCommission, worstBots,
}: {
  base: number;
  lowerFee: number;
  addCommission: number;
  worstBots: number;
}) {
  const Lever = ({
    title, blurb, value, desirable = 'down',
  }: {
    title: string;
    blurb: string;
    value: number;
    desirable?: 'up' | 'down';
  }) => {
    const delta = value - base;
    const isGood = desirable === 'down' ? delta < 0 : delta > 0;
    const deltaColor =
      delta === 0 ? 'text-slate-500'
      : isGood ? 'text-emerald-400'
      : 'text-rose-400';

    return (
      <div className="rounded border border-slate-800 bg-slate-950 p-3 transition hover:border-orange-500/40">
        <div className="text-xs font-bold text-orange-300">{title}</div>
        <p className="mb-2 mt-1 text-[10px] text-slate-400">{blurb}</p>
        <div className="flex items-baseline gap-2 font-mono text-lg font-bold text-white">
          {fmtPct(value, 2)}
          <span className={`text-xs ${deltaColor}`}>
            {delta > 0 ? '+' : ''}
            {Number.isFinite(delta) ? delta.toFixed(2) : '—'}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        <TrendingUp className="h-4 w-4 text-orange-400" /> Sensitivity scenarios
      </h3>
      <p className="mb-4 text-[10px] text-slate-500">
        How does the required conversion rate change if you negotiate, or if assumptions are wrong?
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Lever title="Negotiate fee −30%" blurb="Bigger margin, easier hit." value={lowerFee} />
        <Lever title="Add 10% commission" blurb="Hybrid deal, shared risk." value={addCommission} />
        <Lever title="Worst-case +20% bots" blurb="If audience is dirtier than assumed." value={worstBots} desirable="up" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Output: negotiation scripts
──────────────────────────────────────────────── */

function ScriptsCard({ scripts }: { scripts: Script[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (s: Script) => {
    try {
      await navigator.clipboard.writeText(s.body.replace(/^"|"$/g, ''));
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch { /* ignore */ }
  };

  if (scripts.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
        <Share2 className="h-4 w-4 text-orange-400" /> Negotiation scripts
      </h3>
      <div className="space-y-3">
        {scripts.map((s) => (
          <div key={s.id} className="rounded border border-slate-800 bg-slate-950 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold text-orange-300">{s.title}</div>
              <button
                onClick={() => copy(s)}
                className="flex items-center gap-1 rounded border border-slate-800 px-2 py-1 text-[10px] text-slate-400 transition hover:border-orange-500/40 hover:text-orange-300"
              >
                {copiedId === s.id ? (<><Check className="h-3 w-3" /> Copied</>) : (<><Copy className="h-3 w-3" /> Copy</>)}
              </button>
            </div>
            <p className="text-xs italic leading-relaxed text-slate-300">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Currency picker
──────────────────────────────────────────────── */

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

/* ────────────────────────────────────────────────
   Form atoms
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
    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </label>
  );
}

function NumberField({
  label, value, onChange, hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type="number"
        min="0"
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className="w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
      />
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function CurrencyField({
  label, value, onChange, symbol,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  symbol: string;
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
          min="0"
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full rounded border border-slate-700 bg-slate-950 p-2 ${longSymbol ? 'pl-12' : 'pl-7'} font-mono text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition`}
        />
      </div>
    </div>
  );
}

function PercentField({
  label, value, onChange, hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 pr-7 font-mono text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
      </div>
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-mono text-white">{children}</dd>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Disclaimer + footer
──────────────────────────────────────────────── */

function Disclaimer() {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-[11px] text-slate-500">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        This model gives you a sanity-check, not a forecast. Real campaigns have view-to-purchase funnels, attribution windows, and audience-quality variance that no single number captures. Use the conversion ask as a negotiation anchor — not a promise of returns.
      </p>
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
      <p className="text-sm font-medium text-slate-500">Created by SmartRwl</p>
      <div className="flex space-x-4">
        <a href="http://www.instagram.com/smartrwl" target="_blank" rel="noopener noreferrer" className="text-slate-600 transition-colors hover:text-pink-500" title="Instagram" aria-label="Instagram">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
        <a href="https://github.com/Smart-rwl/" target="_blank" rel="noopener noreferrer" className="text-slate-600 transition-colors hover:text-white" title="GitHub" aria-label="GitHub">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      </div>
    </div>
  );
}