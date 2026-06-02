'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  PieChart,
  Info,
  BookOpen,
  Target,
  ChevronDown,
  RotateCcw,
  Store,
  Receipt,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CURRENCIES + CONSTANTS
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
  { label: 'Amazon IN',  fee: 13,  hint: 'Avg India referral · 8–15%' },
  { label: 'Amazon US',  fee: 12,  hint: 'Avg US referral · 8–15%' },
  { label: 'Flipkart',   fee: 12,  hint: 'Avg commission · 5–25%' },
  { label: 'eBay',       fee: 12,  hint: 'Final value fee · ~10–13%' },
  { label: 'Etsy',       fee: 6.5, hint: 'Transaction fee · plus listing' },
  { label: 'Shopify',    fee: 0,   hint: 'Own store · only payment processing' },
];

const TAX_PRESETS = [0, 5, 12, 18, 20, 28];

type RoundMode = 'none' | 'psych99' | 'psych9' | 'whole';
const ROUND_MODES: { value: RoundMode; label: string; hint: string }[] = [
  { value: 'none',    label: 'Exact',     hint: 'No rounding' },
  { value: 'psych99', label: '.99',       hint: 'e.g. ₹1,499 — mass market' },
  { value: 'psych9',  label: '.9',        hint: 'e.g. ₹49 — sub-100 prices' },
  { value: 'whole',   label: 'Whole',     hint: 'e.g. ₹500 — premium / luxury' },
];

const STORAGE_KEY = 'pricing-architect:state:v1';

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

/** Smallest X >= price ending in .99 (round up to next 100k + 99) */
function roundUp99(price: number): number {
  if (price <= 99) return 99;
  const k = Math.ceil((price - 99) / 100);
  return k * 100 + 99;
}

/** Smallest X >= price ending in .9 (round up to next 10k + 9) */
function roundUp9(price: number): number {
  if (price <= 9) return 9;
  const k = Math.ceil((price - 9) / 10);
  return k * 10 + 9;
}

/** Smallest X >= price that's a whole multiple of 100 (or 10 below 100) */
function roundUpWhole(price: number): number {
  if (price <= 100) return Math.ceil(price / 10) * 10;
  return Math.ceil(price / 100) * 100;
}

function applyRounding(price: number, mode: RoundMode): number {
  if (price <= 0) return 0;
  switch (mode) {
    case 'psych99': return roundUp99(price);
    case 'psych9':  return roundUp9(price);
    case 'whole':   return roundUpWhole(price);
    case 'none':
    default:        return Math.round(price);
  }
}

/* ─── Pricing math ─── */
/**
 * Goal mode: given cost, target margin, fee and tax — find the gross price
 * that hits the margin (assuming tax-inclusive pricing).
 *
 * Derivation:
 *   P = cost + (margin × P) + (fee × P) + (P − P/(1+tax))
 *   ⇒ P × [1/(1+tax) − margin − fee] = cost
 *   ⇒ P = cost / [1/(1+tax) − margin − fee]
 *
 * Returns null when denominator ≤ 0 (mathematically impossible).
 */
function priceFromGoal(cost: number, marginPct: number, feePct: number, taxPct: number): number | null {
  const tax = taxPct / 100, margin = marginPct / 100, fee = feePct / 100;
  const denom = 1 / (1 + tax) - margin - fee;
  if (denom <= 0) return null;
  return cost / denom;
}

/** Maximum achievable margin given fee and tax (when cost is zero theoretical floor). */
function maxAchievableMarginPct(feePct: number, taxPct: number): number {
  const tax = taxPct / 100, fee = feePct / 100;
  return Math.max(0, (1 / (1 + tax) - fee) * 100);
}

/** Full breakdown at a given gross price (tax-inclusive). */
function breakdownAt(price: number, cost: number, feePct: number, taxPct: number) {
  const tax = taxPct / 100, fee = feePct / 100;
  const taxAmount = price - price / (1 + tax);
  const feeAmount = price * fee;
  const profit = price - cost - feeAmount - taxAmount;
  const marginPct = price > 0 ? (profit / price) * 100 : 0;
  return { cost, feeAmount, taxAmount, profit, marginPct };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function StrategicPricingArchitect() {
  /* ── Inputs ── */
  const [mode, setMode]                 = useState<'goal' | 'check'>('goal');
  const [productCost, setProductCost]   = useState(400);
  const [targetMargin, setTargetMargin] = useState(20);
  const [testPrice, setTestPrice]       = useState(799); // for 'check' mode
  const [platformFeePct, setPlatformFeePct] = useState(13);
  const [taxRate, setTaxRate]           = useState(18);
  const [competitorPrice, setCompetitorPrice] = useState(0);
  const [roundMode, setRoundMode]       = useState<RoundMode>('psych99');
  const [currency, setCurrency]         = useState<CurrencyCode>('INR');
  const [hydrated, setHydrated]         = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.mode === 'goal' || s.mode === 'check') setMode(s.mode);
        if (typeof s.productCost     === 'number') setProductCost(s.productCost);
        if (typeof s.targetMargin    === 'number') setTargetMargin(s.targetMargin);
        if (typeof s.testPrice       === 'number') setTestPrice(s.testPrice);
        if (typeof s.platformFeePct  === 'number') setPlatformFeePct(s.platformFeePct);
        if (typeof s.taxRate         === 'number') setTaxRate(s.taxRate);
        if (typeof s.competitorPrice === 'number') setCompetitorPrice(s.competitorPrice);
        if (typeof s.roundMode       === 'string') setRoundMode(s.roundMode as RoundMode);
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
        mode, productCost, targetMargin, testPrice,
        platformFeePct, taxRate, competitorPrice, roundMode, currency,
      }));
    } catch { /* ignore */ }
  }, [hydrated, mode, productCost, targetMargin, testPrice,
      platformFeePct, taxRate, competitorPrice, roundMode, currency]);

  /* ── Compute ── */
  const result = useMemo(() => {
    // Break-even at margin = 0
    const beRaw = priceFromGoal(productCost, 0, platformFeePct, taxRate);
    const breakEvenPrice = beRaw ?? Infinity;
    const maxMargin = maxAchievableMarginPct(platformFeePct, taxRate);

    if (mode === 'goal') {
      const rawPrice = priceFromGoal(productCost, targetMargin, platformFeePct, taxRate);
      if (rawPrice === null || rawPrice <= 0) {
        return {
          status: 'impossible' as const,
          rawPrice: 0, finalPrice: 0,
          breakdown: breakdownAt(0, productCost, platformFeePct, taxRate),
          breakEvenPrice, maxMargin,
        };
      }
      const finalPrice = applyRounding(rawPrice, roundMode);
      const breakdown = breakdownAt(finalPrice, productCost, platformFeePct, taxRate);
      return {
        status: 'ok' as const,
        rawPrice, finalPrice,
        breakdown, breakEvenPrice, maxMargin,
      };
    } else {
      // Check mode: testPrice is the user-given price
      const finalPrice = testPrice;
      const breakdown = breakdownAt(finalPrice, productCost, platformFeePct, taxRate);
      const status: 'ok' | 'impossible' = breakdown.profit < 0 ? 'impossible' : 'ok';
      return {
        status,
        rawPrice: finalPrice, finalPrice,
        breakdown, breakEvenPrice, maxMargin,
      };
    }
  }, [mode, productCost, targetMargin, testPrice, platformFeePct, taxRate, roundMode]);

  const fmt = (n: number) => formatCurrency(n, currency);
  const finalPrice = result.finalPrice;
  const breakdown = result.breakdown;

  /* ── Competitor comparison ── */
  const compInfo = useMemo(() => {
    if (!competitorPrice || competitorPrice <= 0 || finalPrice <= 0) return null;
    const delta = finalPrice - competitorPrice;
    const deltaPct = (delta / competitorPrice) * 100;
    let tone: 'aligned' | 'above' | 'below';
    if (Math.abs(deltaPct) <= 10) tone = 'aligned';
    else if (deltaPct > 0) tone = 'above';
    else tone = 'below';

    // What margin would you get if you matched competitor?
    const compBreakdown = breakdownAt(competitorPrice, productCost, platformFeePct, taxRate);

    return { delta, deltaPct, tone, compMargin: compBreakdown.marginPct, compProfit: compBreakdown.profit };
  }, [competitorPrice, finalPrice, productCost, platformFeePct, taxRate]);

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setMode('goal');
    setProductCost(400); setTargetMargin(20);
    setTestPrice(799); setPlatformFeePct(13); setTaxRate(18);
    setCompetitorPrice(0); setRoundMode('psych99');
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
              <Calculator className="w-8 h-8 text-orange-500" />
              Strategic Pricing Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Reverse-engineer the perfect selling price — or test one you're considering.
            </p>
          </div>
          <div className="flex items-center gap-3">
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

            {/* Mode toggle */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-2">
              <div className="flex">
                {([
                  { v: 'goal',  label: 'Set a goal',   sub: 'Find the price' },
                  { v: 'check', label: 'Check a price', sub: 'Find the margin' },
                ] as const).map((opt) => {
                  const active = mode === opt.v;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => setMode(opt.v)}
                      className={`flex-1 px-3 py-2.5 rounded-lg text-center transition ${
                        active
                          ? 'bg-orange-600 text-white shadow-md shadow-orange-900/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="text-sm font-bold">{opt.label}</div>
                      <div className={`text-[10px] ${active ? 'text-orange-200/90' : 'text-slate-500'}`}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cost + Platform + Tax */}
            <Section icon={<DollarSign className="w-4 h-4 text-orange-400" />} title="Cost structure">
              <NumberField
                label="Total product cost"
                value={productCost} onChange={setProductCost}
                hint="Manufacturing + shipping + packaging"
              />

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider flex items-center gap-1.5">
                  <Store className="w-3 h-3" /> Platform fee
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {MARKETPLACE_PRESETS.map((p) => {
                    const active = Math.abs(platformFeePct - p.fee) < 0.1;
                    return (
                      <button
                        key={p.label}
                        onClick={() => setPlatformFeePct(p.fee)}
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
                    value={platformFeePct === 0 ? '' : platformFeePct}
                    onChange={(e) => setPlatformFeePct(safeNum(e.target.value))}
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
                  {TAX_PRESETS.map((t) => {
                    const active = taxRate === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTaxRate(t)}
                        className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                          active
                            ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {t}%
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={50} step={0.5}
                    value={taxRate === 0 ? '' : taxRate}
                    onChange={(e) => setTaxRate(safeNum(e.target.value))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  />
                  <span className="text-slate-500 font-mono text-sm">%</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  GST · VAT · sales tax included in price. Set to <b>0</b> if your marketplace handles tax separately (Amazon US).
                </p>
              </div>
            </Section>

            {/* Goal / Test */}
            <Section
              icon={mode === 'goal' ? <Target className="w-4 h-4 text-orange-400" /> : <TrendingUp className="w-4 h-4 text-orange-400" />}
              title={mode === 'goal' ? 'Profit goal' : 'Test price'}
            >
              {mode === 'goal' ? (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Desired net margin</label>
                    <span className="text-orange-400 font-mono font-bold">{targetMargin}%</span>
                  </div>
                  <input
                    type="range" min={1} max={Math.max(60, Math.floor(result.maxMargin))} step={1}
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    Most healthy e-commerce businesses target 15–25% net margin.
                  </p>
                </div>
              ) : (
                <NumberField
                  label="Proposed selling price"
                  value={testPrice} onChange={setTestPrice}
                  hint="What margin would this give you?"
                />
              )}
            </Section>

            {/* Rounding strategy (only meaningful in goal mode) */}
            {mode === 'goal' && (
              <Section icon={<Sparkles className="w-4 h-4 text-orange-400" />} title="Rounding strategy">
                <div className="grid grid-cols-4 gap-1.5">
                  {ROUND_MODES.map((m) => {
                    const active = m.value === roundMode;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setRoundMode(m.value)}
                        title={m.hint}
                        className={`py-2 rounded border text-[11px] font-bold transition ${
                          active
                            ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {ROUND_MODES.find((m) => m.value === roundMode)?.hint}
                </p>
              </Section>
            )}

            {/* Competitor */}
            <Section icon={<Store className="w-4 h-4 text-orange-400" />} title="Competitor price (optional)">
              <NumberField
                label="What competitors charge"
                value={competitorPrice} onChange={setCompetitorPrice}
                placeholder="0 = skip"
                hint="Reality-check your recommendation"
              />
            </Section>
          </div>

          {/* ─── RIGHT: OUTPUT ─── */}
          <div className="lg:col-span-8 space-y-6">

            {result.status === 'impossible' ? (
              <ImpossibleCard
                mode={mode}
                targetMargin={targetMargin}
                testPrice={testPrice}
                productCost={productCost}
                maxMargin={result.maxMargin}
                breakEvenPrice={result.breakEvenPrice}
                fmt={fmt}
                onAdjustMargin={() => setTargetMargin(Math.max(1, Math.floor(result.maxMargin * 0.8)))}
              />
            ) : (
              <>
                {/* Main price card */}
                <MainPriceCard
                  mode={mode}
                  finalPrice={finalPrice}
                  rawPrice={result.rawPrice}
                  breakdown={breakdown}
                  breakEvenPrice={result.breakEvenPrice}
                  targetMargin={targetMargin}
                  fmt={fmt}
                />

                {/* Competitor comparison */}
                {compInfo && (
                  <CompetitorCard
                    finalPrice={finalPrice}
                    competitorPrice={competitorPrice}
                    info={compInfo}
                    fmt={fmt}
                  />
                )}

                {/* Revenue distribution */}
                <RevenueDistribution
                  finalPrice={finalPrice}
                  breakdown={breakdown}
                  fmt={fmt}
                />
              </>
            )}
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            Pricing Strategy Guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<Info className="w-5 h-5 text-orange-400" />}
              title="Reverse-engineer, don't guess"
              body={<>
                Start with your profit goal, not a number that "feels right". If the math says ₹999 but competitors sell at ₹499, the product isn't viable at your current cost — fix the cost, change category, or move on.
              </>}
            />
            <GuideCard
              icon={<Target className="w-5 h-5 text-orange-400" />}
              title="Pick your rounding intentionally"
              body={<>
                <b>.99 endings</b> exploit the left-digit effect — ₹1,499 reads as "fourteen-something" not "fifteen hundred".
                <b> Whole numbers</b> signal premium — luxury brands round on purpose. Match the convention of your category.
              </>}
            />
            <GuideCard
              icon={<CheckCircle2 className="w-5 h-5 text-orange-400" />}
              title="Break-even is your sale floor"
              body={<>
                The break-even price is the absolute lowest you can sell without losing money (margin = 0).
                Use it as the floor for lightning deals, clearance, or competitive responses — never go below.
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

function NumberField({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: number; onChange: (n: number) => void;
  placeholder?: string; hint?: string;
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
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
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

function MainPriceCard({
  mode, finalPrice, rawPrice, breakdown, breakEvenPrice, targetMargin, fmt,
}: {
  mode: 'goal' | 'check';
  finalPrice: number;
  rawPrice: number;
  breakdown: ReturnType<typeof breakdownAt>;
  breakEvenPrice: number;
  targetMargin: number;
  fmt: (n: number) => string;
}) {
  const tone =
    breakdown.profit > 0 && breakdown.marginPct >= 5 ? 'good'
    : breakdown.profit > 0 ? 'neutral'
    : 'critical';

  const accent = {
    good:     { ring: 'border-emerald-500/30', text: 'text-emerald-400', dim: 'bg-emerald-950/20' },
    neutral:  { ring: 'border-slate-700',      text: 'text-slate-300',   dim: 'bg-slate-900' },
    critical: { ring: 'border-rose-500/30',    text: 'text-rose-400',    dim: 'bg-rose-950/20' },
  }[tone];

  const showRoundingDelta = mode === 'goal' && Math.round(finalPrice) !== Math.round(rawPrice);

  return (
    <div className={`bg-gradient-to-br from-slate-900 to-slate-900 rounded-2xl p-8 border ${accent.ring} shadow-2xl relative overflow-hidden`}>
      <div className="absolute top-0 right-0 p-6 opacity-[0.04] pointer-events-none">
        <DollarSign className="w-56 h-56 text-white" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className={`${accent.text} text-xs font-bold uppercase tracking-widest mb-2`}>
            {mode === 'goal' ? 'Recommended price' : 'Your price'}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl md:text-7xl font-extrabold text-white font-mono">{fmt(finalPrice)}</span>
          </div>
          {showRoundingDelta && (
            <p className="text-slate-500 text-sm mt-2">
              Exact: <span className="font-mono">{fmt(rawPrice)}</span>
              <span className="ml-2 text-slate-600">· rounded for conversion</span>
            </p>
          )}
          {mode === 'check' && (
            <p className="text-slate-500 text-sm mt-2">
              Achieved margin: <span className={`font-mono font-bold ${breakdown.marginPct >= targetMargin ? 'text-emerald-400' : 'text-amber-400'}`}>
                {breakdown.marginPct.toFixed(1)}%
              </span>
            </p>
          )}
        </div>

        <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 w-full md:w-72 space-y-2.5 shrink-0">
          <KvRow label="Net profit"
                 value={<span className={accent.text}>{fmt(breakdown.profit)}</span>} />
          <KvRow label="Margin"
                 value={<span className={accent.text}>{breakdown.marginPct.toFixed(1)}%</span>} />
          <KvRow label="Break-even" value={fmt(breakEvenPrice)} tone="muted" last />
        </div>
      </div>
    </div>
  );
}

function KvRow({
  label, value, tone, last,
}: { label: string; value: React.ReactNode; tone?: 'muted'; last?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${!last ? 'border-b border-white/10 pb-2' : ''}`}>
      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">{label}</span>
      <span className={`font-mono font-bold ${tone === 'muted' ? 'text-amber-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

function CompetitorCard({
  finalPrice, competitorPrice, info, fmt,
}: {
  finalPrice: number;
  competitorPrice: number;
  info: { delta: number; deltaPct: number; tone: 'aligned' | 'above' | 'below'; compMargin: number; compProfit: number };
  fmt: (n: number) => string;
}) {
  const toneConfig = {
    aligned: { bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Market-aligned' },
    above:   { bg: 'bg-amber-950/20',   border: 'border-amber-500/30',   text: 'text-amber-400',   label: 'Above market' },
    below:   { bg: 'bg-orange-950/20',  border: 'border-orange-500/30',  text: 'text-orange-400',  label: 'Below market' },
  }[info.tone];

  return (
    <div className={`rounded-xl p-5 border ${toneConfig.bg} ${toneConfig.border}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Store className="w-3.5 h-3.5" /> Competitive reality check
        </h3>
        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border ${toneConfig.bg} ${toneConfig.border} ${toneConfig.text}`}>
          {toneConfig.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">You</div>
          <div className="text-lg font-bold text-white font-mono">{fmt(finalPrice)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Competitor</div>
          <div className="text-lg font-bold text-white font-mono">{fmt(competitorPrice)}</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Difference</div>
          <div className={`text-lg font-bold font-mono ${toneConfig.text}`}>
            {info.delta >= 0 ? '+' : ''}{info.deltaPct.toFixed(0)}%
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        If you matched the competitor at <span className="font-mono text-white">{fmt(competitorPrice)}</span>,
        your margin would be <span className={`font-mono font-bold ${info.compMargin >= 5 ? 'text-emerald-400' : info.compMargin >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
          {info.compMargin.toFixed(1)}%
        </span> (<span className="font-mono">{fmt(info.compProfit)}</span> per unit).
      </p>
    </div>
  );
}

function RevenueDistribution({
  finalPrice, breakdown, fmt,
}: {
  finalPrice: number;
  breakdown: ReturnType<typeof breakdownAt>;
  fmt: (n: number) => string;
}) {
  const pct = (n: number) => (finalPrice > 0 ? (n / finalPrice) * 100 : 0);
  const segments = [
    { label: 'Cost',     amount: breakdown.cost,      pct: pct(breakdown.cost),       color: 'bg-slate-500',   dot: 'bg-slate-500',   text: 'text-slate-300' },
    { label: 'Platform', amount: breakdown.feeAmount, pct: pct(breakdown.feeAmount),  color: 'bg-orange-500',  dot: 'bg-orange-500',  text: 'text-orange-400' },
    { label: 'Tax',      amount: breakdown.taxAmount, pct: pct(breakdown.taxAmount),  color: 'bg-sky-500',     dot: 'bg-sky-500',     text: 'text-sky-400' },
    { label: 'Profit',   amount: Math.max(0, breakdown.profit), pct: pct(Math.max(0, breakdown.profit)), color: 'bg-emerald-500', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-xs font-bold uppercase text-slate-500 mb-5 flex items-center gap-2 tracking-widest">
        <PieChart className="w-4 h-4 text-orange-400" /> Revenue distribution
      </h3>

      {/* Stacked bar */}
      <div className="flex h-10 w-full rounded-lg overflow-hidden border border-slate-800">
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.label}
              className={`${s.color} flex items-center justify-center text-[10px] font-bold text-white/90 overflow-hidden whitespace-nowrap transition-all`}
              style={{ width: `${s.pct}%` }}
              title={`${s.label}: ${fmt(s.amount)} (${s.pct.toFixed(1)}%)`}
            >
              {s.pct >= 8 && `${s.pct.toFixed(0)}%`}
            </div>
          ) : null,
        )}
      </div>

      {/* Detailed table */}
      <div className="mt-5 grid grid-cols-1 gap-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-800/40 rounded transition">
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
              <span className="text-sm text-slate-300">{s.label}</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className={`text-xs font-mono ${s.text}`}>{s.pct.toFixed(1)}%</span>
              <span className="text-sm font-mono font-bold text-white w-24 text-right">{fmt(s.amount)}</span>
            </div>
          </div>
        ))}
        <div className="border-t border-slate-800 mt-1 pt-2 px-2 flex items-center justify-between">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Total</span>
          <span className="text-sm font-mono font-bold text-white">{fmt(finalPrice)}</span>
        </div>
      </div>
    </div>
  );
}

function ImpossibleCard({
  mode, targetMargin, testPrice, productCost, maxMargin, breakEvenPrice, fmt, onAdjustMargin,
}: {
  mode: 'goal' | 'check';
  targetMargin: number;
  testPrice: number;
  productCost: number;
  maxMargin: number;
  breakEvenPrice: number;
  fmt: (n: number) => string;
  onAdjustMargin: () => void;
}) {
  return (
    <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-8">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 shrink-0">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white mb-2">
            {mode === 'goal' ? 'This margin goal isn\'t reachable' : 'Selling below cost'}
          </h2>

          {mode === 'goal' ? (
            <>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                With your current fees and tax, you can't reach <b className="text-rose-300">{targetMargin}%</b> margin —
                fees and tax scale with price, so raising the price doesn't help.
              </p>

              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Maximum achievable margin</span>
                  <span className="text-emerald-400 font-mono font-bold">{maxMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Break-even price</span>
                  <span className="text-amber-400 font-mono font-bold">{fmt(breakEvenPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">To hit your goal you'd need to</span>
                  <span className="text-slate-300 font-mono">lower cost or fees</span>
                </div>
              </div>

              <button
                onClick={onAdjustMargin}
                className="mt-4 px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition font-bold text-sm shadow-lg shadow-orange-900/30"
              >
                Try {Math.max(1, Math.floor(maxMargin * 0.8))}% (80% of max)
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                At <b className="text-rose-300">{fmt(testPrice)}</b>, after fees and tax you take home less than your product cost (<span className="font-mono">{fmt(productCost)}</span>).
                Every unit sold loses money.
              </p>
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Minimum viable price</span>
                  <span className="text-amber-400 font-mono font-bold">{fmt(breakEvenPrice)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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