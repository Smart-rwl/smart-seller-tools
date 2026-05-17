// app/tools/influencer-audit/ToolClient.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  Check,
  Copy,
  Gauge,
  Ghost,
  Info,
  Repeat,
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
};

const STORAGE_KEY = 'smartrwl:influencer-audit:v1';

const REACH_PRESETS: { label: string; value: number; followerHint: string }[] = [
  { label: 'Nano', value: 10, followerHint: '< 10k followers' },
  { label: 'Micro', value: 5, followerHint: '10k – 100k' },
  { label: 'Mid', value: 2.5, followerHint: '100k – 500k' },
  { label: 'Macro', value: 1, followerHint: '500k – 1M' },
  { label: 'Mega', value: 0.5, followerHint: '> 1M' },
];

const BOT_PRESETS: { label: string; value: number }[] = [
  { label: 'Clean', value: 5 },
  { label: 'Typical', value: 20 },
  { label: 'Heavy', value: 35 },
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

const fmtINR = (n: number) =>
  Number.isFinite(n)
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(n)
    : '—';

const fmtPct = (n: number, digits = 1) =>
  Number.isFinite(n) && n < 1000 ? `${n.toFixed(digits)}%` : '—';

/* ────────────────────────────────────────────────
   The math — pure, memoizable, all clamped
──────────────────────────────────────────────── */

type Metrics = {
  fixedCost: number;
  discountedPrice: number;
  commissionPerUnit: number;
  marginPerUnit: number;          // Day 1
  breakEvenUnits: number;
  target2xUnits: number;
  rawReach: number;
  realReach: number;
  requiredConversionPct: number;
  vanityCpm: number;
  realCpm: number;
  ltvProfitPerCustomer: number;
  ltvReturnMultiple: number;      // at break-even unit count
  affiliatePayoutAt2x: number;
  status: Status;
};

function compute(i: Inputs): Metrics {
  const fixedCost = Math.max(
    0,
    i.influencerFee + i.seedingCost + i.adUsageFee
  );

  // Day 1 unit economics
  const discount = clamp(i.discountCode, 0, 100) / 100;
  const commission = clamp(i.commissionRate, 0, 100) / 100;
  const discountedPrice = i.sellingPrice * (1 - discount);
  const commissionPerUnit = discountedPrice * commission;
  const marginPerUnit = discountedPrice - i.landedCost - commissionPerUnit;

  // Reach
  const reach = clamp(i.estReach, 0, 100) / 100;
  const bots = clamp(i.botPercentage, 0, 100) / 100;
  const rawReach = i.followerCount * reach;
  const realReach = rawReach * (1 - bots);

  // Break-even
  let breakEvenUnits = 0;
  let target2xUnits = 0;
  let requiredConversionPct = 0;

  if (marginPerUnit > 0 && fixedCost > 0) {
    breakEvenUnits = Math.ceil(fixedCost / marginPerUnit);
    target2xUnits = Math.ceil((fixedCost * 2) / marginPerUnit);
    if (realReach > 0) {
      requiredConversionPct = (breakEvenUnits / realReach) * 100;
    } else {
      requiredConversionPct = 9999; // sentinel: impossible
    }
  }

  // CPM
  const vanityCpm = rawReach > 0 ? (fixedCost / rawReach) * 1000 : 0;
  const realCpm = realReach > 0 ? (fixedCost / realReach) * 1000 : 0;

  // LTV — discount + commission apply to first order only;
  // repeat orders happen at full price with no commission.
  const ltvMult = Math.max(1, i.ltvMultiplier);
  const repeatProfit = (i.sellingPrice - i.landedCost) * (ltvMult - 1);
  const ltvProfitPerCustomer = marginPerUnit + repeatProfit;

  // Return multiple = total LTV profit / campaign cost (at break-even units sold)
  const ltvReturnMultiple =
    breakEvenUnits > 0 && fixedCost > 0
      ? (ltvProfitPerCustomer * breakEvenUnits) / fixedCost
      : 0;

  const affiliatePayoutAt2x = target2xUnits * commissionPerUnit;

  // Status
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
   Smart negotiation scripts — proportional, contextual
──────────────────────────────────────────────── */

type Script = { id: string; title: string; body: string };

function generateScripts(i: Inputs, m: Metrics): Script[] {
  const out: Script[] = [];

  if (m.marginPerUnit <= 0) {
    out.push({
      id: 'negative-margin',
      title: 'Fix the product economics first',
      body: `At ₹${i.sellingPrice} selling price with a ${i.discountCode}% discount code and ${i.commissionRate}% commission, the per-unit margin is ₹${m.marginPerUnit.toFixed(0)} — you lose money on every sale before the campaign cost is even counted. Drop the discount, raise the price, or remove commission before running any influencer deal on this SKU.`,
    });
  }

  if ((m.status === 'risky' || m.status === 'impossible') && i.influencerFee > 0) {
    const shift = Math.max(1000, Math.round((i.influencerFee * 0.3) / 1000) * 1000);
    out.push({
      id: 'shift-to-commission',
      title: 'Shift flat fee → commission',
      body: `"Based on our model, breaking even on this campaign requires ${m.requiredConversionPct.toFixed(1)}% of your real audience to buy, which is above the 1–2% industry norm for product launches. Could we shift ₹${shift.toLocaleString('en-IN')} of the flat fee into a 10% per-sale commission? It shares the risk on our side and gives you uncapped upside if the post performs."`,
    });
  }

  if (i.botPercentage >= 30) {
    out.push({
      id: 'audience-proof',
      title: 'Request audience proof before paying',
      body: `"Before we finalize, could you share screenshots of average reel views, saves, and shares from your last 5 posts in the ${i.commissionRate > 0 ? 'health / lifestyle / beauty / etc.' : 'same'} category as our product? Our model assumes ${i.botPercentage}% inflated reach for an audience of this size — we'd love data that proves otherwise."`,
    });
  }

  if (m.realCpm > 600 && m.fixedCost > 0) {
    out.push({
      id: 'high-cpm',
      title: 'Effective CPM is above market',
      body: `"After filtering for inactive accounts and bots, our effective CPM works out to ${fmtINR(m.realCpm)} per 1,000 real impressions. Branded reels in this category typically run ${fmtINR(200)}–${fmtINR(500)} CPM. Could we restructure as a performance-based deal — a smaller flat fee plus a per-sale bonus?"`,
    });
  }

  if (out.length === 0 && m.status === 'safe') {
    out.push({
      id: 'closing',
      title: 'Closing line',
      body: `"Numbers look workable. We're comfortable at ${fmtINR(i.influencerFee)} flat${i.commissionRate > 0 ? ` + ${i.commissionRate}% commission` : ''}. Ship date and content brief — can we lock those in this week?"`,
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

  // Load + save
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Inputs>;
      setInputs((p) => ({ ...p, ...parsed }));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const t = setTimeout(() => setSaveState('idle'), 1800);
    return () => clearTimeout(t);
  }, [saveState]);

  const metrics = useMemo(() => compute(inputs), [inputs]);

  // Sensitivity scenarios — same shape as cashflow planner's "levers"
  const scenarioLowerFee = useMemo(
    () => compute({ ...inputs, influencerFee: inputs.influencerFee * 0.7 }),
    [inputs]
  );
  const scenarioAddCommission = useMemo(
    () => compute({ ...inputs, commissionRate: Math.min(inputs.commissionRate + 10, 100) }),
    [inputs]
  );
  const scenarioWorstBots = useMemo(
    () => compute({ ...inputs, botPercentage: Math.min(inputs.botPercentage + 20, 100) }),
    [inputs]
  );

  const scripts = useMemo(() => generateScripts(inputs, metrics), [inputs, metrics]);

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const saveScenario = () => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      setSaveState('saved');
    } catch {
      /* quota */
    }
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
              Audit an influencer offer against unit economics, bot-filtered reach, and lifetime
              value — before you sign.
            </p>
          </div>
          <StatusBadge status={metrics.status} />
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT — inputs */}
          <div className="space-y-6 lg:col-span-5">
            <DealCard inputs={inputs} update={update} />
            <AudienceCard inputs={inputs} update={update} />
            <ProductCard inputs={inputs} update={update} />
            <LtvCard inputs={inputs} update={update} />

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
          <div className="space-y-6 lg:col-span-7">
            <RequiredConversionCard metrics={metrics} inputs={inputs} />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <CpmCard metrics={metrics} />
              <FinancialsCard metrics={metrics} inputs={inputs} />
            </div>

            <LtvCardOutput metrics={metrics} inputs={inputs} />

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

function DealCard({ inputs, update }: { inputs: Inputs; update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void }) {
  return (
    <Card icon={<Users className="h-4 w-4 text-orange-400" />} title="Deal structure">
      <CurrencyField label="Flat fee" value={inputs.influencerFee} onChange={(v) => update('influencerFee', v)} />
      <div className="grid grid-cols-2 gap-3">
        <CurrencyField label="Seeding cost" value={inputs.seedingCost} onChange={(v) => update('seedingCost', v)} />
        <CurrencyField label="Ad-usage fee" value={inputs.adUsageFee} onChange={(v) => update('adUsageFee', v)} />
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

function AudienceCard({ inputs, update }: { inputs: Inputs; update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void }) {
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
                  ? 'border-orange-500 bg-orange-900/30 text-orange-200'
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
          value={inputs.estReach}
          onChange={(e) => update('estReach', safeNum(e.target.value))}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-sm text-white outline-none focus:border-orange-500"
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
                  ? 'border-orange-500 bg-orange-900/30 text-orange-200'
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
          Currently <span className="text-slate-300">{inputs.botPercentage}%</span> — industry average is 20–30%.
        </p>
      </div>
    </Card>
  );
}

function ProductCard({ inputs, update }: { inputs: Inputs; update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void }) {
  return (
    <Card icon={<Wallet className="h-4 w-4 text-orange-400" />} title="Product economics">
      <div className="grid grid-cols-2 gap-3">
        <CurrencyField label="Selling price" value={inputs.sellingPrice} onChange={(v) => update('sellingPrice', v)} />
        <CurrencyField label="Landed cost (COGS)" value={inputs.landedCost} onChange={(v) => update('landedCost', v)} />
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

function LtvCard({ inputs, update }: { inputs: Inputs; update: <K extends keyof Inputs>(k: K, v: Inputs[K]) => void }) {
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
   Output cards
──────────────────────────────────────────────── */

function StatusBadge({ status }: { status: Status }) {
  const palette = {
    safe: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
    risky: { dot: 'bg-amber-500', text: 'text-amber-400' },
    impossible: { dot: 'bg-red-500', text: 'text-red-400' },
  }[status];
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2">
      <span className={`h-3 w-3 rounded-full ${palette.dot}`} />
      <span className="text-sm font-medium text-slate-300">
        Risk: <span className={palette.text}>{status.toUpperCase()}</span>
      </span>
    </div>
  );
}

function RequiredConversionCard({
  metrics,
  inputs,
}: {
  metrics: Metrics;
  inputs: Inputs;
}) {
  const palette = {
    safe: {
      border: 'border-emerald-900',
      bg: 'bg-emerald-950/30',
      text: 'text-emerald-400',
      icon: <Target className="h-5 w-5 text-emerald-400" />,
      verdict: 'Numbers work.',
    },
    risky: {
      border: 'border-amber-900',
      bg: 'bg-amber-950/30',
      text: 'text-amber-400',
      icon: <Target className="h-5 w-5 text-amber-400" />,
      verdict: 'High risk.',
    },
    impossible: {
      border: 'border-red-900',
      bg: 'bg-red-950/30',
      text: 'text-red-400',
      icon: <AlertOctagon className="h-5 w-5 text-red-400" />,
      verdict: 'Walk away.',
    },
  }[metrics.status];

  return (
    <div
      className={`flex flex-col items-center justify-between gap-8 rounded-xl border p-8 md:flex-row ${palette.border} ${palette.bg}`}
    >
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
        After filtering out {inputs.botPercentage}% bots from {inputs.followerCount.toLocaleString('en-IN')}{' '}
        followers at {inputs.estReach}% reach, you have{' '}
        <span className="text-white">{Math.round(metrics.realReach).toLocaleString('en-IN')}</span>{' '}
        real eyeballs. {metrics.breakEvenUnits || '—'} of them must buy to recover{' '}
        {fmtINR(metrics.fixedCost)}.
      </div>
    </div>
  );
}

function CpmCard({ metrics }: { metrics: Metrics }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 text-xs font-bold uppercase text-slate-500">Vanity vs real CPM</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Vanity CPM (all followers)</span>
          <span className="font-mono text-slate-500 line-through">{fmtINR(metrics.vanityCpm)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-bold text-white">Real CPM (active humans)</span>
          <span className="font-mono font-bold text-white">{fmtINR(metrics.realCpm)}</span>
        </div>
        <p className="text-[10px] text-slate-500">
          What you actually pay to reach 1,000 real people. Compare against ad-platform CPM for
          this category.
        </p>
      </div>
    </div>
  );
}

function FinancialsCard({ metrics, inputs }: { metrics: Metrics; inputs: Inputs }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 text-xs font-bold uppercase text-slate-500">Day-1 financials</h3>
      <dl className="space-y-2 text-sm">
        <Row label="Total campaign cost">{fmtINR(metrics.fixedCost)}</Row>
        <Row label="Margin per unit (post-discount)">
          <span className={metrics.marginPerUnit < 0 ? 'text-red-400' : ''}>
            {fmtINR(metrics.marginPerUnit)}
          </span>
        </Row>
        <Row label="Break-even units">{metrics.breakEvenUnits || '—'}</Row>
        <Row label="2× target units">{metrics.target2xUnits || '—'}</Row>
        {inputs.commissionRate > 0 && (
          <Row label={`Affiliate payout @ 2× (${inputs.commissionRate}%)`}>
            {fmtINR(metrics.affiliatePayoutAt2x)}
          </Row>
        )}
      </dl>
    </div>
  );
}

function LtvCardOutput({ metrics, inputs }: { metrics: Metrics; inputs: Inputs }) {
  // Convert return multiple to ROI %
  const ltvRoiPct = (metrics.ltvReturnMultiple - 1) * 100;

  return (
    <div className="relative overflow-hidden rounded-xl border border-orange-900/30 bg-orange-900/10 p-6">
      <div className="absolute right-4 top-4 opacity-10">
        <Repeat className="h-24 w-24 text-orange-500" />
      </div>
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-orange-300">
        <TrendingUp className="h-4 w-4" /> The long game
      </h3>
      <div className="relative z-10 grid grid-cols-2 gap-8">
        <div>
          <span className="mb-1 block text-xs text-slate-400">Lifetime profit / customer</span>
          <span className="font-mono text-2xl font-bold text-white">
            {fmtINR(metrics.ltvProfitPerCustomer)}
          </span>
        </div>
        <div>
          <span className="mb-1 block text-xs text-slate-400">
            LTV return at break-even
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-orange-400">
              {metrics.ltvReturnMultiple.toFixed(2)}×
            </span>
            <span className="text-xs text-orange-300/70">
              ({ltvRoiPct >= 0 ? '+' : ''}
              {ltvRoiPct.toFixed(0)}% ROI)
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 max-w-md text-[11px] text-slate-500">
        Even if Day-1 sales just break even, at a {inputs.ltvMultiplier.toFixed(1)}× LTV multiplier
        each acquired customer is worth {fmtINR(metrics.ltvProfitPerCustomer)} over their lifetime.
        The campaign returns {metrics.ltvReturnMultiple.toFixed(2)}× the spend long-term.
      </p>
    </div>
  );
}

function LeversCard({
  base,
  lowerFee,
  addCommission,
  worstBots,
}: {
  base: number;
  lowerFee: number;
  addCommission: number;
  worstBots: number;
}) {
  const Lever = ({
    title,
    blurb,
    value,
    desirable = 'down',
  }: {
    title: string;
    blurb: string;
    value: number;
    desirable?: 'up' | 'down';
  }) => {
    const delta = value - base;
    const isGood = desirable === 'down' ? delta < 0 : delta > 0;
    const deltaColor =
      delta === 0
        ? 'text-slate-500'
        : isGood
          ? 'text-emerald-400'
          : 'text-red-400';

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
      <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
        <TrendingUp className="h-4 w-4 text-purple-400" /> Sensitivity scenarios
      </h3>
      <p className="mb-4 text-[10px] text-slate-500">
        How does the required conversion rate change if you negotiate, or if assumptions are wrong?
      </p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Lever title="Negotiate fee −30%" blurb="Shift discount-shaped." value={lowerFee} />
        <Lever title="Add 10% commission" blurb="Hybrid deal, shared risk." value={addCommission} />
        <Lever title="Worst-case +20% bots" blurb="If audience is dirtier than assumed." value={worstBots} desirable="up" />
      </div>
    </div>
  );
}

function ScriptsCard({ scripts }: { scripts: Script[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (s: Script) => {
    try {
      await navigator.clipboard.writeText(s.body.replace(/^"|"$/g, ''));
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      /* ignore */
    }
  };

  if (scripts.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
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
                {copiedId === s.id ? (
                  <>
                    <Check className="h-3 w-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copy
                  </>
                )}
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
    <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  hint,
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
        value={value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className="w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-sm text-white outline-none focus:border-orange-500"
      />
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
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
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 pl-7 font-mono text-sm text-white outline-none focus:border-orange-500"
        />
      </div>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  hint,
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
          value={value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className="w-full rounded border border-slate-700 bg-slate-950 p-2 pr-7 font-mono text-sm text-white outline-none focus:border-orange-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
      </div>
      {hint && <p className="mt-1 text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-mono text-white">{children}</dd>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Disclaimer + Footer
──────────────────────────────────────────────── */

function Disclaimer() {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-[11px] text-slate-500">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        This model gives you a sanity-check, not a forecast. Real campaigns have view-to-purchase
        funnels, attribution windows, and audience-quality variance that no single number captures.
        Use the conversion ask as a negotiation anchor — not a promise of returns.
      </p>
    </div>
  );
}

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