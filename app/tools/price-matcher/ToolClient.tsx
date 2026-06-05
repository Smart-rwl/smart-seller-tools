'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Swords,
  ShieldAlert,
  TrendingDown,
  DollarSign,
  Target,
  Flag,
  BookOpen,
  Scale,
  Zap,
  Receipt,
  Store,
  ChevronDown,
  RotateCcw,
  Crosshair,
  ShieldCheck,
  AlertTriangle,
  Eye,
  ArrowDown,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CURRENCIES + PRESETS
───────────────────────────────────────────── */
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const MARKETPLACE_PRESETS: { label: string; fee: number; hint: string }[] = [
  { label: 'Amazon IN', fee: 13,  hint: 'Avg India referral · 8–15%' },
  { label: 'Amazon US', fee: 12,  hint: 'Avg US referral · 8–15%' },
  { label: 'Flipkart',  fee: 12,  hint: 'Avg commission · 5–25%' },
  { label: 'eBay',      fee: 12,  hint: 'Final value fee · ~10–13%' },
  { label: 'Etsy',      fee: 6.5, hint: 'Transaction · plus listing' },
  { label: 'Shopify',   fee: 0,   hint: 'Own store · payment only' },
];

const TAX_PRESETS = [0, 5, 12, 18, 20, 28];

const STORAGE_KEY = 'price-war:state:v1';

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

/**
 * Find the price that yields a given net margin %, tax-inclusive.
 * P = cost / [1/(1+tax) − margin − fee]
 * Returns null when denominator ≤ 0 (impossible).
 */
function priceFromGoal(cost: number, marginPct: number, feePct: number, taxPct: number): number | null {
  const tax = taxPct / 100, margin = marginPct / 100, fee = feePct / 100;
  const denom = 1 / (1 + tax) - margin - fee;
  if (denom <= 0) return null;
  return cost / denom;
}

/** Breakdown at a gross price (tax-inclusive). */
function breakdownAt(price: number, cost: number, feePct: number, taxPct: number) {
  const tax = taxPct / 100, fee = feePct / 100;
  if (price <= 0) {
    return { cost, feeAmount: 0, taxAmount: 0, profit: -cost, marginPct: 0 };
  }
  const taxAmount = price - price / (1 + tax);
  const feeAmount = price * fee;
  const profit = price - cost - feeAmount - taxAmount;
  const marginPct = (profit / price) * 100;
  return { cost, feeAmount, taxAmount, profit, marginPct };
}

/** Smart undercut: 1% (min 1 unit), never below floor. */
function smartCounterStrike(competitor: number, floor: number): number {
  if (competitor <= 0) return 0;
  const undercut = Math.max(competitor * 0.01, 1);
  return Math.max(Math.floor(competitor - undercut), Math.ceil(floor));
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function PriceWarIntelligence() {
  const [landedCost, setLandedCost]         = useState(300);
  const [shippingCost, setShippingCost]     = useState(70);
  const [referralFeePct, setReferralFeePct] = useState(13);
  const [taxRate, setTaxRate]               = useState(18);
  const [minMarginGoal, setMinMarginGoal]   = useState(10);
  const [competitorPrice, setCompetitorPrice] = useState(550);
  const [currency, setCurrency]             = useState<CurrencyCode>('INR');
  const [hydrated, setHydrated]             = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.landedCost      === 'number') setLandedCost(s.landedCost);
        if (typeof s.shippingCost    === 'number') setShippingCost(s.shippingCost);
        if (typeof s.referralFeePct  === 'number') setReferralFeePct(s.referralFeePct);
        if (typeof s.taxRate         === 'number') setTaxRate(s.taxRate);
        if (typeof s.minMarginGoal   === 'number') setMinMarginGoal(s.minMarginGoal);
        if (typeof s.competitorPrice === 'number') setCompetitorPrice(s.competitorPrice);
        if (typeof s.currency        === 'string') setCurrency(s.currency as CurrencyCode);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        landedCost, shippingCost, referralFeePct, taxRate, minMarginGoal, competitorPrice, currency,
      }));
    } catch { /* ignore */ }
  }, [hydrated, landedCost, shippingCost, referralFeePct, taxRate, minMarginGoal, competitorPrice, currency]);

  /* ── Compute ── */
  const m = useMemo(() => {
    const totalCost = landedCost + shippingCost;

    const beRaw  = priceFromGoal(totalCost, 0,             referralFeePct, taxRate);
    const mvRaw  = priceFromGoal(totalCost, minMarginGoal, referralFeePct, taxRate);

    const breakEvenPrice = beRaw ?? Infinity;
    const minViablePrice = mvRaw ?? Infinity;

    const match = breakdownAt(competitorPrice, totalCost, referralFeePct, taxRate);
    const counterStrikePrice = smartCounterStrike(competitorPrice, breakEvenPrice);
    const counter = breakdownAt(counterStrikePrice, totalCost, referralFeePct, taxRate);

    let status: 'safe' | 'warning' | 'danger';
    if (match.profit < 0) status = 'danger';
    else if (match.marginPct < minMarginGoal) status = 'warning';
    else status = 'safe';

    // Hold-the-line strategy: stay at min viable
    const hold = Number.isFinite(minViablePrice)
      ? breakdownAt(minViablePrice, totalCost, referralFeePct, taxRate)
      : null;

    // Competitor's estimated economics (assuming same costs)
    const competitorBreakdown = breakdownAt(competitorPrice, totalCost, referralFeePct, taxRate);

    return {
      totalCost,
      breakEvenPrice,
      minViablePrice,
      match,
      counterStrikePrice,
      counter,
      hold,
      status,
      competitorBreakdown,
    };
  }, [landedCost, shippingCost, referralFeePct, taxRate, minMarginGoal, competitorPrice]);

  const fmt = (n: number) => formatCurrency(n, currency);

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setLandedCost(300); setShippingCost(70); setReferralFeePct(13);
    setTaxRate(18); setMinMarginGoal(10); setCompetitorPrice(550);
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
              <Swords className="w-8 h-8 text-orange-500" />
              Price War Intelligence
            </h1>
            <p className="text-slate-400 mt-2">
              War-game competitor pricing — find your floor, match the threat, or walk away.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={m.status} />
            <CurrencyPicker value={currency} onChange={setCurrency} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ─── LEFT: INPUTS ─── */}
          <div className="lg:col-span-4 space-y-6">

            <Section icon={<DollarSign className="w-4 h-4 text-orange-400" />} title="My cost structure">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Landed cost" value={landedCost} onChange={setLandedCost} />
                <NumberField label="Shipping"   value={shippingCost} onChange={setShippingCost} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider flex items-center gap-1.5">
                  <Store className="w-3 h-3" /> Platform fee
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {MARKETPLACE_PRESETS.map((p) => {
                    const active = Math.abs(referralFeePct - p.fee) < 0.1;
                    return (
                      <button
                        key={p.label}
                        onClick={() => setReferralFeePct(p.fee)}
                        title={p.hint}
                        className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
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
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={50} step={0.5}
                    value={referralFeePct === 0 ? '' : referralFeePct}
                    onChange={(e) => setReferralFeePct(safeNum(e.target.value))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  />
                  <span className="text-slate-500 font-mono text-sm">%</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3 h-3" /> Tax rate (inclusive)
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {TAX_PRESETS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTaxRate(t)}
                      className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                        taxRate === t
                          ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t}%
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  Set <b>0</b> if marketplace handles tax separately (Amazon US).
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3" /> Min margin goal
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={80}
                    value={minMarginGoal === 0 ? '' : minMarginGoal}
                    onChange={(e) => setMinMarginGoal(safeNum(e.target.value))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  />
                  <span className="text-slate-500 font-mono text-sm">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Lowest margin you'll accept to keep selling.</p>
              </div>
            </Section>

            {/* Competitor */}
            <div className="bg-slate-900 rounded-xl border border-rose-500/20 p-6">
              <h3 className="text-rose-400 font-bold flex items-center gap-2 mb-4 text-sm">
                <Target className="w-4 h-4" /> Competitor intel
              </h3>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">Competitor price</label>
              <input
                type="number" min={0}
                value={competitorPrice === 0 ? '' : competitorPrice}
                onChange={(e) => setCompetitorPrice(safeNum(e.target.value))}
                className="w-full bg-slate-950 border border-rose-500/40 rounded p-3 text-rose-300 font-bold text-lg focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none transition"
              />
            </div>
          </div>

          {/* ─── RIGHT: WAR ROOM ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Verdict */}
            <VerdictCard m={m} minMarginGoal={minMarginGoal} competitorPrice={competitorPrice} fmt={fmt} />

            {/* Price-position visual */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2 tracking-widest">
                  <Scale className="w-4 h-4 text-orange-400" /> Price position
                </h3>
                <PriceLineLegend />
              </div>
              <PriceLine
                landed={m.totalCost}
                breakEven={m.breakEvenPrice}
                minViable={m.minViablePrice}
                counterStrike={m.counterStrikePrice}
                competitor={competitorPrice}
                fmt={fmt}
              />
            </div>

            {/* 4-strategy comparison */}
            <ActionOptionsGrid m={m} competitorPrice={competitorPrice} fmt={fmt} />

            {/* Revenue distribution + Competitor insight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RevenueDistribution price={competitorPrice} breakdown={m.match} fmt={fmt} />
              <CompetitorInsightCard m={m} competitorPrice={competitorPrice} fmt={fmt} />
            </div>
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            War Room Strategy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<ShieldAlert className="w-5 h-5 text-orange-400" />}
              title="When to walk away"
              body={<>
                If competitor is below your break-even floor, don't follow. They're either burning cash, clearing dead stock, or have a structurally cheaper supplier. Wait them out — discount wars they can't sustain end in days.
              </>}
            />
            <GuideCard
              icon={<Zap className="w-5 h-5 text-orange-400" />}
              title="The 1% rule"
              body={<>
                Buy Box algorithms reward the lowest price, but you don't need to undercut dramatically. <b>1% (with a 1-unit floor)</b> is usually enough to flip the box without leaving margin on the table.
              </>}
            />
            <GuideCard
              icon={<TrendingDown className="w-5 h-5 text-orange-400" />}
              title="Fees scale with price"
              body={<>
                Lower your price, pay less referral fee. This calculator accounts for that automatically — sometimes a price drop hurts less than you'd think because the fee saving offsets the margin loss.
              </>}
            />
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">{icon} {title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <input
        type="number" min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value, 0))}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: 'safe' | 'warning' | 'danger' }) {
  const c = {
    safe:    { dot: 'bg-emerald-500',              text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Safe' },
    warning: { dot: 'bg-amber-500',                text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   label: 'Caution' },
    danger:  { dot: 'bg-rose-500 animate-pulse',   text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    label: 'Danger' },
  }[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
      <Flag className={`w-3.5 h-3.5 ${c.text}`} />
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

/* ─────────────────────────────────────────────
   VERDICT CARD (hero)
───────────────────────────────────────────── */
function VerdictCard({
  m, minMarginGoal, competitorPrice, fmt,
}: {
  m: any; minMarginGoal: number; competitorPrice: number; fmt: (n: number) => string;
}) {
  const tone =
    m.status === 'safe'    ? { bg: 'bg-emerald-950/30', border: 'border-emerald-500/30', accent: 'text-emerald-400', icon: <ShieldCheck className="w-5 h-5 text-emerald-400" /> }
    : m.status === 'warning' ? { bg: 'bg-amber-950/30',   border: 'border-amber-500/30',   accent: 'text-amber-400',   icon: <AlertTriangle className="w-5 h-5 text-amber-400" /> }
    : { bg: 'bg-rose-950/30', border: 'border-rose-500/30', accent: 'text-rose-400', icon: <ShieldAlert className="w-5 h-5 text-rose-400" /> };

  const profitSign = m.match.profit >= 0 ? '+' : '';

  // Build a smart, specific recommendation
  let recommendation: React.ReactNode;
  if (m.status === 'safe') {
    recommendation = (
      <>Match at <b className="text-white">{fmt(competitorPrice)}</b> for <b className="text-emerald-300">{profitSign}{fmt(m.match.profit)}</b> ({m.match.marginPct.toFixed(1)}%). Or undercut to <b className="text-white">{fmt(m.counterStrikePrice)}</b> to win Buy Box — margin still <b className="text-emerald-300">{m.counter.marginPct.toFixed(1)}%</b>.</>
    );
  } else if (m.status === 'warning') {
    recommendation = (
      <>Matching is profitable ({profitSign}{fmt(m.match.profit)} / {m.match.marginPct.toFixed(1)}%) but below your <b className="text-white">{minMarginGoal}% goal</b>. Consider holding at <b className="text-white">{fmt(m.minViablePrice)}</b> instead and accepting lower volume.</>
    );
  } else {
    recommendation = (
      <><b className="text-rose-300">Do not match.</b> At {fmt(competitorPrice)} you'd lose <b className="text-rose-300">{fmt(Math.abs(m.match.profit))}</b> per unit. Their price is below your break-even (<b className="text-white">{fmt(m.breakEvenPrice)}</b>). Walk away — let them stock out or run out of cash.</>
    );
  }

  return (
    <div className={`rounded-xl border p-7 shadow-2xl ${tone.bg} ${tone.border}`}>
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {tone.icon}
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Net outcome if matched</span>
          </div>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-5xl md:text-6xl font-extrabold tracking-tight font-mono ${m.match.profit >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {profitSign}{fmt(m.match.profit)}
            </span>
            <span className={`text-xl font-medium ${tone.accent}`}>
              {m.match.marginPct.toFixed(1)}% margin
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-4 leading-relaxed">
            {recommendation}
          </p>
        </div>

        {m.status !== 'danger' && (
          <div className="bg-slate-950/60 p-5 rounded-xl border border-orange-500/20 w-full md:w-64 shrink-0">
            <div className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Crosshair className="w-3 h-3" /> Counter-strike
            </div>
            <div className="text-3xl font-bold text-white mb-1 font-mono">{fmt(m.counterStrikePrice)}</div>
            <p className="text-[11px] text-slate-400 leading-tight">
              1% undercut → margin <span className="text-orange-300 font-mono">{m.counter.marginPct.toFixed(1)}%</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRICE LINE (SVG visualization)
───────────────────────────────────────────── */
function PriceLineLegend() {
  const items = [
    { color: '#f43f5e', label: 'Loss zone' },
    { color: '#fbbf24', label: 'Low-margin' },
    { color: '#10b981', label: 'Safe zone' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: it.color, opacity: 0.4 }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function PriceLine({
  landed, breakEven, minViable, counterStrike, competitor, fmt,
}: {
  landed: number; breakEven: number; minViable: number;
  counterStrike: number; competitor: number;
  fmt: (n: number) => string;
}) {
  // Clamp infinities to something visible
  const allValues = [landed, breakEven, minViable, counterStrike, competitor]
    .filter((v) => Number.isFinite(v) && v > 0);
  if (allValues.length === 0) {
    return <div className="text-sm text-slate-500 py-8 text-center">Enter values to see price positions.</div>;
  }
  const minRaw = Math.min(...allValues);
  const maxRaw = Math.max(...allValues);
  const minP = minRaw * 0.92;
  const maxP = maxRaw * 1.05;

  const W = 720, H = 130;
  const pad = { left: 30, right: 30, top: 30, bottom: 38 };
  const chartW = W - pad.left - pad.right;
  const axisY = pad.top + 22;
  const zoneH = 14;

  const x = (p: number): number =>
    pad.left + ((Math.max(minP, Math.min(maxP, p)) - minP) / (maxP - minP)) * chartW;

  // Zone boundaries (clamp to visible range)
  const beViz = Number.isFinite(breakEven) ? Math.max(minP, Math.min(maxP, breakEven)) : maxP;
  const mvViz = Number.isFinite(minViable) ? Math.max(minP, Math.min(maxP, minViable)) : maxP;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 130 }}>
      {/* Zones */}
      <rect
        x={x(minP)} y={axisY - zoneH / 2}
        width={Math.max(0, x(beViz) - x(minP))} height={zoneH}
        fill="#f43f5e" fillOpacity={0.18}
      />
      <rect
        x={x(beViz)} y={axisY - zoneH / 2}
        width={Math.max(0, x(mvViz) - x(beViz))} height={zoneH}
        fill="#fbbf24" fillOpacity={0.18}
      />
      <rect
        x={x(mvViz)} y={axisY - zoneH / 2}
        width={Math.max(0, x(maxP) - x(mvViz))} height={zoneH}
        fill="#10b981" fillOpacity={0.18}
      />

      {/* Axis line */}
      <line x1={pad.left} x2={W - pad.right} y1={axisY} y2={axisY} stroke="#334155" strokeWidth={1} />

      {/* Markers — labels alternate above / below to avoid collision */}
      <Marker x={x(landed)}        labelTop="Cost"         valueText={fmt(landed)}        color="#94a3b8" axisY={axisY} side="above" />
      {Number.isFinite(breakEven) && (
        <Marker x={x(breakEven)}   labelTop="Break-even"   valueText={fmt(breakEven)}     color="#f43f5e" axisY={axisY} side="below" />
      )}
      {Number.isFinite(minViable) && (
        <Marker x={x(minViable)}   labelTop="Min viable"   valueText={fmt(minViable)}     color="#fbbf24" axisY={axisY} side="above" />
      )}
      <Marker x={x(counterStrike)} labelTop="Counter"      valueText={fmt(counterStrike)} color="#f97316" axisY={axisY} side="below" />
      <Marker x={x(competitor)}    labelTop="Competitor"   valueText={fmt(competitor)}    color="#fff"    axisY={axisY} side="above" emphasize />
    </svg>
  );
}

function Marker({
  x, labelTop, valueText, color, axisY, side, emphasize,
}: {
  x: number; labelTop: string; valueText: string;
  color: string; axisY: number;
  side: 'above' | 'below'; emphasize?: boolean;
}) {
  const r = emphasize ? 5 : 4;
  const lineLen = 12;
  const labelY = side === 'above' ? axisY - 12 : axisY + lineLen + 12;
  const valueY = side === 'above' ? axisY - 24 : axisY + lineLen + 24;
  const lineY2 = side === 'above' ? axisY - 12 : axisY + 12;

  return (
    <g>
      <line x1={x} x2={x} y1={axisY} y2={lineY2} stroke={color} strokeWidth={1} opacity={0.6} />
      <circle cx={x} cy={axisY} r={r} fill={color} stroke="#0a0f1a" strokeWidth={2} />
      <text x={x} y={labelY} fontSize={9} fill={color} textAnchor="middle" fontWeight={emphasize ? 'bold' : 'normal'} fontFamily="ui-monospace, monospace">
        {labelTop}
      </text>
      <text x={x} y={valueY} fontSize={9} fill="#94a3b8" textAnchor="middle" fontFamily="ui-monospace, monospace">
        {valueText}
      </text>
    </g>
  );
}

/* ─────────────────────────────────────────────
   ACTION OPTIONS GRID
───────────────────────────────────────────── */
function ActionOptionsGrid({
  m, competitorPrice, fmt,
}: {
  m: any; competitorPrice: number; fmt: (n: number) => string;
}) {
  const matchTone =
    m.match.profit < 0 ? 'critical' : m.match.marginPct < 5 ? 'warning' : 'good';
  const counterTone =
    m.counter.profit < 0 ? 'critical' : m.counter.marginPct < 5 ? 'warning' : 'good';
  const holdTone =
    m.hold && m.hold.profit > 0 ? 'orange' : 'critical';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <OptionCard
        icon={<Swords className="w-4 h-4" />}
        label="Match"
        price={fmt(competitorPrice)}
        marginPct={m.match.marginPct}
        profit={m.match.profit}
        fmt={fmt}
        tone={matchTone}
      />
      <OptionCard
        icon={<Crosshair className="w-4 h-4" />}
        label="Undercut 1%"
        price={fmt(m.counterStrikePrice)}
        marginPct={m.counter.marginPct}
        profit={m.counter.profit}
        fmt={fmt}
        tone={counterTone}
      />
      <OptionCard
        icon={<ShieldCheck className="w-4 h-4" />}
        label="Hold the line"
        price={Number.isFinite(m.minViablePrice) ? fmt(m.minViablePrice) : '—'}
        marginPct={m.hold?.marginPct ?? 0}
        profit={m.hold?.profit ?? 0}
        fmt={fmt}
        tone={holdTone}
        sub={m.hold ? 'At min margin' : 'Goal unreachable'}
      />
      <OptionCard
        icon={<Eye className="w-4 h-4" />}
        label="Walk away"
        price="—"
        marginPct={null}
        profit={null}
        fmt={fmt}
        tone="neutral"
        sub="Let them stock out"
      />
    </div>
  );
}

function OptionCard({
  icon, label, price, marginPct, profit, fmt, tone, sub,
}: {
  icon: React.ReactNode; label: string; price: string;
  marginPct: number | null; profit: number | null;
  fmt: (n: number) => string;
  tone: 'good' | 'warning' | 'critical' | 'orange' | 'neutral';
  sub?: string;
}) {
  const toneConfig = {
    good:     { bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', accent: 'text-emerald-400' },
    warning:  { bg: 'bg-amber-950/20',   border: 'border-amber-500/30',   accent: 'text-amber-400' },
    critical: { bg: 'bg-rose-950/20',    border: 'border-rose-500/30',    accent: 'text-rose-400' },
    orange:   { bg: 'bg-orange-950/15',  border: 'border-orange-500/30',  accent: 'text-orange-400' },
    neutral:  { bg: 'bg-slate-900',      border: 'border-slate-700',      accent: 'text-slate-300' },
  }[tone];

  return (
    <div className={`rounded-xl border ${toneConfig.bg} ${toneConfig.border} p-4 transition`}>
      <div className={`flex items-center gap-2 mb-2 ${toneConfig.accent}`}>
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold text-white font-mono mb-1">{price}</div>
      {profit !== null && marginPct !== null ? (
        <div className="text-[11px] space-y-0.5">
          <div className={`font-mono ${profit >= 0 ? toneConfig.accent : 'text-rose-400'}`}>
            {profit >= 0 ? '+' : ''}{fmt(profit)} / unit
          </div>
          <div className={`font-mono ${toneConfig.accent}`}>
            {marginPct.toFixed(1)}% margin
          </div>
        </div>
      ) : (
        <div className="text-[11px] text-slate-500">{sub}</div>
      )}
      {sub && profit !== null && <div className="text-[10px] text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   REVENUE DISTRIBUTION
───────────────────────────────────────────── */
function RevenueDistribution({
  price, breakdown, fmt,
}: {
  price: number;
  breakdown: ReturnType<typeof breakdownAt>;
  fmt: (n: number) => string;
}) {
  const pct = (n: number) => (price > 0 ? (n / price) * 100 : 0);
  const profitVal = Math.max(0, breakdown.profit);

  const segments = [
    { label: 'Cost',     amount: breakdown.cost,      pct: pct(breakdown.cost),     color: 'bg-slate-500',  dot: 'bg-slate-500',  text: 'text-slate-300' },
    { label: 'Platform', amount: breakdown.feeAmount, pct: pct(breakdown.feeAmount), color: 'bg-orange-500', dot: 'bg-orange-500', text: 'text-orange-400' },
    { label: 'Tax',      amount: breakdown.taxAmount, pct: pct(breakdown.taxAmount), color: 'bg-sky-500',    dot: 'bg-sky-500',    text: 'text-sky-400' },
    { label: 'Profit',   amount: profitVal,           pct: pct(profitVal),           color: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  ];

  const lossAmount = breakdown.profit < 0 ? Math.abs(breakdown.profit) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
        <Scale className="w-3.5 h-3.5 text-orange-400" /> Where the revenue goes (@ competitor price)
      </h3>

      <div className="flex h-8 w-full rounded-lg overflow-hidden border border-slate-800">
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.label}
              className={`${s.color} flex items-center justify-center text-[10px] font-bold text-white/90 overflow-hidden whitespace-nowrap`}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${fmt(s.amount)}`}
            >
              {s.pct >= 10 && `${s.pct.toFixed(0)}%`}
            </div>
          ) : null,
        )}
        {lossAmount > 0 && (
          <div className="flex-1 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-2">
            LOSS: {fmt(lossAmount)}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between py-1 text-xs">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-slate-400">{s.label}</span>
            </div>
            <span className={`font-mono ${s.text}`}>{fmt(s.amount)}</span>
          </div>
        ))}
        {lossAmount > 0 && (
          <div className="flex items-center justify-between py-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-rose-500" />
              <span className="text-rose-400">Loss per unit</span>
            </div>
            <span className="font-mono text-rose-400">−{fmt(lossAmount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMPETITOR INSIGHT
───────────────────────────────────────────── */
function CompetitorInsightCard({
  m, competitorPrice, fmt,
}: {
  m: any; competitorPrice: number; fmt: (n: number) => string;
}) {
  const headroom = Math.max(0, competitorPrice - m.breakEvenPrice);
  const headroomPct = competitorPrice > 0 ? (headroom / competitorPrice) * 100 : 0;
  const compMargin = m.competitorBreakdown.marginPct;

  let signal: { tone: 'good' | 'warning' | 'critical'; text: React.ReactNode };
  if (compMargin <= 0) {
    signal = { tone: 'critical', text: <>They're <b className="text-rose-300">already losing money</b> at this price — likely won't last.</> };
  } else if (headroomPct < 5) {
    signal = { tone: 'warning', text: <>They have <b className="text-amber-300">almost no headroom</b> to drop further. Their floor is near current price.</> };
  } else if (headroomPct < 15) {
    signal = { tone: 'warning', text: <>They have <b className="text-amber-300">limited room</b> to cut — ~{headroomPct.toFixed(0)}% before they lose money.</> };
  } else {
    signal = { tone: 'critical', text: <>They can <b className="text-rose-300">drop further</b> — ~{headroomPct.toFixed(0)}% of headroom before they break-even. Expect more aggressive moves.</> };
  }

  const signalTone = {
    good:     'border-emerald-500/30 bg-emerald-950/15 text-emerald-300',
    warning:  'border-amber-500/30 bg-amber-950/15 text-amber-300',
    critical: 'border-rose-500/30 bg-rose-950/15 text-rose-300',
  }[signal.tone];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
        <Eye className="w-3.5 h-3.5 text-orange-400" /> Competitor inferred economics
      </h3>
      <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
        If their costs are similar to yours (<span className="font-mono">{fmt(m.totalCost)}</span> total):
      </p>

      <div className="space-y-2 mb-3">
        <div className="flex justify-between text-sm py-1.5 border-b border-slate-800">
          <span className="text-slate-400">Their margin</span>
          <span className={`font-mono font-bold ${compMargin > 10 ? 'text-emerald-400' : compMargin > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
            {compMargin.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-sm py-1.5 border-b border-slate-800">
          <span className="text-slate-400">Their profit / unit</span>
          <span className={`font-mono font-bold ${m.competitorBreakdown.profit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {m.competitorBreakdown.profit >= 0 ? '+' : ''}{fmt(m.competitorBreakdown.profit)}
          </span>
        </div>
        <div className="flex justify-between text-sm py-1.5">
          <span className="text-slate-400">Headroom to cut</span>
          <span className="font-mono font-bold text-slate-200">
            {fmt(headroom)} <span className="text-slate-500 text-xs">({headroomPct.toFixed(0)}%)</span>
          </span>
        </div>
      </div>

      <div className={`text-[11px] p-2.5 rounded-lg border leading-relaxed ${signalTone}`}>
        <div className="flex items-start gap-2">
          <ArrowDown className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>{signal.text}</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GUIDE CARD
───────────────────────────────────────────── */
function GuideCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className="bg-orange-500/10 border border-orange-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}