'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  Info,
  Box,
  RefreshCw,
  Target,
  BookOpen,
  Lightbulb,
  HelpCircle,
  MousePointerClick,
  ChevronDown,
  RotateCcw,
  PieChart,
  Microscope,
  Wallet,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES + CONSTANTS
───────────────────────────────────────────── */

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
type GstMode = 'inclusive' | 'exclusive';
type CalculatorStatus = 'profitable' | 'breakeven' | 'loss';

type Inputs = {
  sellingPrice: number;
  productCost: number;
  platformFees: number;
  gstRate: number;
  gstMode: GstMode;
  shippingCost: number;
  adsCost: number;
  returnShipping: number;
  packaging: number;
  returnRate: number;
  damageRate: number;
  currency: CurrencyCode;
};

const DEFAULTS: Inputs = {
  sellingPrice: 2000,
  productCost: 600,
  platformFees: 300,
  gstRate: 18,
  gstMode: 'inclusive',
  shippingCost: 80,
  adsCost: 200,
  returnShipping: 120,
  packaging: 20,
  returnRate: 15,
  damageRate: 5,
  currency: 'INR',
};

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const STORAGE_KEY = 'profit-engine:state:v1';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function fmtCurrency(n: number, code: CurrencyCode, withSign = false): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  if (!Number.isFinite(n)) return '—';
  const sign = withSign && n > 0 ? '+' : '';
  try {
    return sign + new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${sign}${c.symbol}${Math.round(n).toLocaleString()}`;
  }
}

/* ─────────────────────────────────────────────
   MATH
───────────────────────────────────────────── */

type Metrics = {
  basePrice: number;
  taxAmt: number;
  finalCustomerPrice: number;
  profitOnSuccess: number;
  lossOnReturn: number;
  damagedValue: number;
  weightedProfit: number;
  margin: number;
  roi: number;
  breakEvenROAS: number | null;
  maxAffordableProductCost: number | null;
  status: CalculatorStatus;
};

function calculateMetrics(i: Inputs): Metrics {
  const r = i.returnRate / 100;
  const d = i.damageRate / 100;

  // 1) GST handling
  let basePrice: number, taxAmt: number, finalCustomerPrice: number;
  if (i.gstMode === 'inclusive') {
    basePrice = i.sellingPrice / (1 + i.gstRate / 100);
    taxAmt = i.sellingPrice - basePrice;
    finalCustomerPrice = i.sellingPrice;
  } else {
    basePrice = i.sellingPrice;
    taxAmt = i.sellingPrice * (i.gstRate / 100);
    finalCustomerPrice = i.sellingPrice + taxAmt;
  }

  // 2) Successful order economics
  const cSuccessNoAd = i.productCost + i.platformFees + i.shippingCost + i.packaging;
  const profitOnSuccess = basePrice - cSuccessNoAd - i.adsCost;

  // 3) Return order economics
  const damagedValue = i.productCost * d;
  const cReturnNoAd = i.shippingCost + i.returnShipping + i.packaging + damagedValue;
  const lossOnReturn = cReturnNoAd + i.adsCost;

  // 4) Weighted profit
  const weightedProfit = (1 - r) * profitOnSuccess - r * lossOnReturn;

  // 5) Margin (on taxable revenue)
  const margin = basePrice > 0 ? (profitOnSuccess / basePrice) * 100 : 0;

  // 6) ROI on capital (product cost)
  const roi = i.productCost > 0 ? (weightedProfit / i.productCost) * 100 : 0;

  // 7) Break-Even ROAS
  // ad = (1-r)(basePrice - cSuccessNoAd) - r * cReturnNoAd
  const beAdsCost = (1 - r) * (basePrice - cSuccessNoAd) - r * cReturnNoAd;
  const breakEvenROAS = beAdsCost > 0 ? finalCustomerPrice / beAdsCost : null;

  // 8) Max affordable product cost (solve weightedProfit = 0 for productCost)
  // (1-r)(B - PC - F_excl_pc - ads) - r(ship + retShip + pkg + PC*d + ads) = 0
  // where F_excl_pc = platformFees + shipping + packaging
  // Solve: PC * [(1-r) + r*d] = (1-r)(B - F_excl_pc - ads) - r(ship + retShip + pkg + ads)
  const fExclPC = i.platformFees + i.shippingCost + i.packaging;
  const returnFixedExclPC = i.shippingCost + i.returnShipping + i.packaging;
  const numerator =
    (1 - r) * (basePrice - fExclPC - i.adsCost) -
    r * (returnFixedExclPC + i.adsCost);
  const denominator = (1 - r) + r * d;
  const maxAffordableProductCost =
    denominator > 0 && numerator > 0 ? numerator / denominator : null;

  // 9) Status with currency-aware deadzone (0.5% of selling price, min 1)
  const deadzone = Math.max(1, i.sellingPrice * 0.005);
  let status: CalculatorStatus = 'breakeven';
  if (weightedProfit > deadzone) status = 'profitable';
  else if (weightedProfit < -deadzone) status = 'loss';

  return {
    basePrice,
    taxAmt,
    finalCustomerPrice,
    profitOnSuccess,
    lossOnReturn,
    damagedValue,
    weightedProfit,
    margin,
    roi,
    breakEvenROAS,
    maxAffordableProductCost,
    status,
  };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function ProfitIntelligenceEngine() {
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

  const m = useMemo(() => calculateMetrics(inputs), [inputs]);

  const fmt = (n: number, withSign = false) => fmtCurrency(n, inputs.currency, withSign);
  const symbol = CURRENCIES.find((c) => c.code === inputs.currency)?.symbol ?? '₹';

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULTS);
  };

  // Sensitivity scenarios — downside levers
  const sensitivities = useMemo(() => {
    const levers = [
      {
        label: 'Return rate +5pp',
        desc: `${inputs.returnRate}% → ${Math.min(inputs.returnRate + 5, 100)}%`,
        result: calculateMetrics({ ...inputs, returnRate: Math.min(inputs.returnRate + 5, 100) }),
      },
      {
        label: 'CPA +25%',
        desc: `Ad cost climbs to ${fmt(inputs.adsCost * 1.25)}`,
        result: calculateMetrics({ ...inputs, adsCost: inputs.adsCost * 1.25 }),
      },
      {
        label: 'Damage rate +10pp',
        desc: `${inputs.damageRate}% → ${Math.min(inputs.damageRate + 10, 100)}%`,
        result: calculateMetrics({ ...inputs, damageRate: Math.min(inputs.damageRate + 10, 100) }),
      },
    ];
    const withDeltas = levers.map((l) => ({
      ...l,
      delta: l.result.weightedProfit - m.weightedProfit,
    }));
    // Find biggest risk (most negative delta)
    const biggestRiskIdx = withDeltas.reduce(
      (minIdx, l, i) => l.delta < withDeltas[minIdx].delta ? i : minIdx,
      0,
    );
    return { levers: withDeltas, biggestRiskIdx };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, m.weightedProfit]);

  // Status pill styling
  const STATUS_STYLES = {
    profitable: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', label: 'Profitable strategy' },
    breakeven:  { bg: 'bg-amber-500/15',   border: 'border-amber-500/40',   text: 'text-amber-300',   label: 'Near break-even' },
    loss:       { bg: 'bg-rose-500/15',    border: 'border-rose-500/40',    text: 'text-rose-300',    label: 'Loss-making' },
  };
  const ss = STATUS_STYLES[m.status];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
              <div className="p-2 bg-orange-500/15 border border-orange-500/30 rounded-lg">
                <Calculator className="w-6 h-6 text-orange-400" />
              </div>
              Profit Intelligence Engine
            </h1>
            <p className="text-slate-400 mt-2">
              Advanced unit economics + risk simulator for Amazon, Flipkart, and DTC stores.
            </p>
          </div>
          <div className="flex gap-2 text-xs font-medium flex-wrap items-center">
            <span className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-slate-500">Break-even ROAS:</span>
              <span className="font-mono font-bold text-white">
                {m.breakEvenROAS !== null ? `${m.breakEvenROAS.toFixed(2)}×` : 'N/A'}
              </span>
            </span>
            <span className={`px-3 py-2 rounded-lg border ${ss.bg} ${ss.border} ${ss.text} font-mono font-bold uppercase tracking-wider`}>
              {ss.label}
            </span>
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

          {/* ─── LEFT: INPUTS ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Revenue & Costs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center flex-wrap gap-3">
                <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
                  <Wallet className="w-4 h-4 text-orange-400" />
                  Revenue & costs
                </h2>
                <div className="flex bg-slate-900 rounded-lg border border-slate-700 p-0.5" role="group" aria-label="GST mode">
                  <button
                    type="button"
                    onClick={() => update('gstMode', 'inclusive')}
                    aria-pressed={inputs.gstMode === 'inclusive'}
                    className={`px-3 py-1 text-[11px] font-bold rounded transition ${
                      inputs.gstMode === 'inclusive'
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Inclusive
                  </button>
                  <button
                    type="button"
                    onClick={() => update('gstMode', 'exclusive')}
                    aria-pressed={inputs.gstMode === 'exclusive'}
                    className={`px-3 py-1 text-[11px] font-bold rounded transition ${
                      inputs.gstMode === 'exclusive'
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Exclusive
                  </button>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <CurrencyField
                    label="Selling price"
                    value={inputs.sellingPrice}
                    onChange={(v) => update('sellingPrice', v)}
                    symbol={symbol}
                    emphasized
                  />
                  {inputs.gstMode === 'exclusive' && (
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      Customer pays <b className="text-slate-300 font-mono">{fmt(m.finalCustomerPrice)}</b> incl. {inputs.gstRate}% GST
                    </p>
                  )}
                  {inputs.gstMode === 'inclusive' && (
                    <p className="text-[10px] text-slate-500 mt-1.5">
                      Taxable revenue: <b className="text-slate-300 font-mono">{fmt(m.basePrice)}</b> (<span className="font-mono">{fmt(m.taxAmt)}</span> is GST)
                    </p>
                  )}
                </div>
                <CurrencyField
                  label="Product cost (landed)"
                  value={inputs.productCost}
                  onChange={(v) => update('productCost', v)}
                  symbol={symbol}
                />
                <CurrencyField
                  label="Platform fees"
                  value={inputs.platformFees}
                  onChange={(v) => update('platformFees', v)}
                  symbol={symbol}
                  hint="Referral + closing fees"
                />
                <div>
                  <Label>GST rate</Label>
                  <select
                    value={inputs.gstRate}
                    onChange={(e) => update('gstRate', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (India std)</option>
                    <option value={20}>20% (UK / EU VAT)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logistics + Marketing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="font-semibold text-white flex items-center gap-2 mb-4 text-sm">
                  <Box className="w-4 h-4 text-orange-400" /> Logistics
                </h2>
                <div className="space-y-4">
                  <CurrencyField
                    label="Forward shipping"
                    value={inputs.shippingCost}
                    onChange={(v) => update('shippingCost', v)}
                    symbol={symbol}
                  />
                  <CurrencyField
                    label="Packaging material"
                    value={inputs.packaging}
                    onChange={(v) => update('packaging', v)}
                    symbol={symbol}
                  />
                </div>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h2 className="font-semibold text-white flex items-center gap-2 mb-4 text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Marketing (Ads)
                </h2>
                <CurrencyField
                  label="Cost per acquisition (CPA)"
                  value={inputs.adsCost}
                  onChange={(v) => update('adsCost', v)}
                  symbol={symbol}
                  hint="Ad spend required to get 1 sale"
                />
              </div>
            </div>

            {/* Risk (RTO) */}
            <div className="bg-rose-500/10 rounded-xl border border-rose-500/30 p-6">
              <h2 className="font-semibold text-rose-300 flex items-center gap-2 mb-4 text-sm">
                <RefreshCw className="w-4 h-4" /> Returns & RTO simulation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Return rate (%)</label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range" min={0} max={40} step={1}
                      value={inputs.returnRate}
                      onChange={(e) => update('returnRate', safeNum(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                    <span className="font-bold text-rose-300 w-10 font-mono text-sm">{inputs.returnRate}%</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Return shipping</label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-400/70 font-mono text-sm">{symbol}</span>
                    <input
                      type="number" min={0}
                      value={inputs.returnShipping === 0 ? '' : inputs.returnShipping}
                      onChange={(e) => update('returnShipping', safeNum(e.target.value))}
                      className={`w-full bg-slate-950 border border-rose-500/20 rounded p-2 ${symbol.length > 1 ? 'pl-12' : 'pl-7'} text-white text-sm font-mono outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition`}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Damage rate (%)</label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range" min={0} max={100} step={1}
                      value={inputs.damageRate}
                      onChange={(e) => update('damageRate', safeNum(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                    <span className="font-bold text-rose-300 w-10 font-mono text-sm">{inputs.damageRate}%</span>
                  </div>
                  <p className="text-[10px] text-rose-400/70 mt-1">% of returns unsellable</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: STICKY RESULTS ─── */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl sticky top-6">
              <div className="mb-5">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Weighted net profit</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className={`text-4xl font-black font-mono ${
                    m.status === 'profitable' ? 'text-emerald-400'
                    : m.status === 'loss' ? 'text-rose-400'
                    : 'text-amber-300'
                  }`}>
                    {fmt(m.weightedProfit)}
                  </span>
                  <span className="text-slate-500 text-sm">/ unit</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Adjusted for <span className="text-slate-300 font-mono">{inputs.returnRate}%</span> returns
                </p>
              </div>

              <div className="space-y-2.5 pt-5 border-t border-slate-800 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Profit on success</span>
                  <span className={`font-mono ${m.profitOnSuccess >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {m.profitOnSuccess >= 0 ? '+' : ''}{fmt(m.profitOnSuccess)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Loss on return</span>
                  <span className="text-rose-400 font-mono">−{fmt(m.lossOnReturn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">GST payable</span>
                  <span className="text-white font-mono">{fmt(m.taxAmt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">ROI</div>
                  <div className={`font-bold font-mono text-sm ${m.roi >= 0 ? 'text-orange-400' : 'text-rose-400'}`}>
                    {m.roi.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Margin</div>
                  <div className={`font-bold font-mono text-sm ${m.margin >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {m.margin.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Max affordable product cost */}
              {m.maxAffordableProductCost !== null && (
                <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-300 mb-1">
                    Max affordable product cost
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono font-bold text-orange-400 text-lg">{fmt(m.maxAffordableProductCost)}</span>
                    <span className={`text-[10px] font-mono ${
                      m.maxAffordableProductCost > inputs.productCost ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {m.maxAffordableProductCost > inputs.productCost
                        ? `${fmt(m.maxAffordableProductCost - inputs.productCost)} headroom`
                        : `${fmt(inputs.productCost - m.maxAffordableProductCost)} over ceiling`}
                    </span>
                  </div>
                  <p className="text-[10px] text-orange-200/70 mt-1.5 leading-snug">
                    The highest product cost that still breaks even given current fees, returns, and ad spend.
                  </p>
                </div>
              )}

              {m.status === 'loss' && (
                <div className="mt-4 bg-rose-500/10 border border-rose-500/40 p-3 rounded-lg flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-200/90 leading-relaxed">
                    <span className="font-bold text-rose-300 block mb-1">Critical loss warning</span>
                    Returns and ad costs are eating all profits. Lower CPA, reduce return rate, or raise price.
                  </p>
                </div>
              )}

              {m.breakEvenROAS === null && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/40 p-3 rounded-lg flex gap-2 items-start">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    <span className="font-bold text-amber-300 block mb-1">No profitable ad spend exists</span>
                    Even at zero ads, this unit loses money. Fix product cost, fees, or return rate first.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-orange-400" /> ROI reality check
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A <b className="text-slate-200">{inputs.returnRate}%</b> return rate doesn&apos;t just mean {inputs.returnRate}% less sales. It means you pay shipping <b>twice</b> (forward + reverse) on those items, plus packaging loss, plus potentially the full product cost on damaged returns. This calculator deducts those hidden losses from your successful sales.
              </p>
            </div>
          </div>
        </div>

        {/* ─── NEW: COST STACK ─── */}
        <CostStack
          finalCustomerPrice={m.finalCustomerPrice}
          taxAmt={m.taxAmt}
          productCost={inputs.productCost}
          platformFees={inputs.platformFees}
          logistics={inputs.shippingCost + inputs.packaging}
          adsCost={inputs.adsCost}
          profitOnSuccess={m.profitOnSuccess}
          weightedProfit={m.weightedProfit}
          returnRate={inputs.returnRate}
          lossOnReturn={m.lossOnReturn}
          fmt={fmt}
        />

        {/* ─── NEW: SENSITIVITY ─── */}
        <SensitivityPanel
          base={m.weightedProfit}
          levers={sensitivities.levers}
          biggestRiskIdx={sensitivities.biggestRiskIdx}
          fmt={fmt}
        />

        {/* GST / ITC disclosure */}
        <div className="mt-6 flex gap-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-[11px] text-slate-500 leading-relaxed">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            GST math assumes a tax-registered seller with full Input Tax Credit on platform fees, shipping, and ads. Unregistered sellers will see slightly lower profit (typically 18% × the input services not recoverable as ITC). The break-even ROAS computes against customer-paid revenue (incl. GST) since that&apos;s the standard ROAS convention on Amazon/Flipkart.
          </p>
        </div>

        {/* ─── USER GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10 mt-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-400" />
            User guide & strategy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<MousePointerClick className="w-5 h-5 text-orange-400" />}
              tone="orange"
              title="When to use this"
            >
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <span>
                    <b className="text-slate-200">Product sourcing:</b> Before buying bulk from Alibaba/Indiamart. If weighted profit is negative, don&apos;t buy.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <span>
                    <b className="text-slate-200">Ad budgeting:</b> Compare your actual ROAS to the break-even ROAS up top. Actual must be <b className="text-emerald-300">higher</b> to make money.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-orange-400">•</span>
                  <span>
                    <b className="text-slate-200">Fee updates:</b> When Amazon changes referral fees, check if your price needs to rise.
                  </span>
                </li>
              </ul>
            </GuideCard>

            <GuideCard
              icon={<Lightbulb className="w-5 h-5 text-amber-400" />}
              tone="amber"
              title="Why weighted profit?"
            >
              <p className="text-sm text-slate-400 mb-3 leading-relaxed">
                Most sellers calculate <i>(Sale Price − Cost − Fees)</i>. That&apos;s wrong because it ignores returns (RTO).
              </p>
              <div className="bg-slate-950 p-3 rounded text-xs text-slate-300 border border-slate-800">
                <p className="font-semibold mb-1 text-slate-200">The reality:</p>
                <p>If you profit {fmt(200)} on a sale, but lose {fmt(150)} on a return…</p>
                <p className="mt-1">And 20% of orders return…</p>
                <p className="mt-1.5 font-bold text-orange-300">
                  Your real profit is only {fmt(130)}, not {fmt(200)}.
                </p>
              </div>
            </GuideCard>

            <GuideCard
              icon={<HelpCircle className="w-5 h-5 text-sky-400" />}
              tone="sky"
              title="Field guide"
            >
              <ul className="space-y-3 text-sm text-slate-400">
                <li>
                  <div className="font-bold text-slate-200">GST mode</div>
                  <div>Use <b>Inclusive</b> for Amazon/Flipkart (price shown to customer includes GST). Use <b>Exclusive</b> if tax is added at checkout (Shopify, custom DTC).</div>
                </li>
                <li>
                  <div className="font-bold text-slate-200">CPA (ad cost)</div>
                  <div>Average ad spend to get one purchase. Pull from Ads Manager → Performance → CPA column.</div>
                </li>
                <li>
                  <div className="font-bold text-slate-200">Damage rate</div>
                  <div>Percentage of returned items that come back unsellable (total write-off, not restockable).</div>
                </li>
              </ul>
            </GuideCard>
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            <a href="http://www.instagram.com/smartrwl" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-pink-500 transition-colors" title="Instagram" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://github.com/Smart-rwl/" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-white transition-colors" title="GitHub" aria-label="GitHub">
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

/* ─────────────────────────────────────────────
   COST STACK (NEW)
───────────────────────────────────────────── */

function CostStack({
  finalCustomerPrice, taxAmt, productCost, platformFees, logistics, adsCost,
  profitOnSuccess, weightedProfit, returnRate, lossOnReturn, fmt,
}: {
  finalCustomerPrice: number;
  taxAmt: number;
  productCost: number;
  platformFees: number;
  logistics: number;
  adsCost: number;
  profitOnSuccess: number;
  weightedProfit: number;
  returnRate: number;
  lossOnReturn: number;
  fmt: (n: number, withSign?: boolean) => string;
}) {
  const positiveProfit = Math.max(0, profitOnSuccess);
  const total = Math.max(
    finalCustomerPrice,
    taxAmt + productCost + platformFees + logistics + adsCost + Math.abs(profitOnSuccess),
  );

  const segments = [
    { key: 'gst',      label: 'GST → Govt',    amount: taxAmt,        hex: '#475569', tone: 'slate' },
    { key: 'product',  label: 'Product cost',  amount: productCost,   hex: '#f97316', tone: 'orange' },
    { key: 'fees',     label: 'Platform fees', amount: platformFees,  hex: '#f59e0b', tone: 'amber' },
    { key: 'logistics',label: 'Logistics',     amount: logistics,     hex: '#0ea5e9', tone: 'sky' },
    { key: 'ads',      label: 'Ads / CPA',     amount: adsCost,       hex: '#a78bfa', tone: 'violet' },
    { key: 'profit',   label: profitOnSuccess >= 0 ? 'Profit (success)' : 'Shortfall',
                       amount: Math.abs(profitOnSuccess),
                       hex: profitOnSuccess >= 0 ? '#10b981' : '#f43f5e',
                       tone: profitOnSuccess >= 0 ? 'emerald' : 'rose' },
  ];

  const returnPenaltyPerUnit = (returnRate / 100) * (profitOnSuccess + lossOnReturn); // per-unit penalty from returns vs all-success world

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <PieChart className="w-4 h-4 text-orange-400" /> Cost stack — where each unit&apos;s revenue goes
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">per successful order</span>
      </div>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Of the <b className="font-mono text-slate-300">{fmt(finalCustomerPrice)}</b> the customer pays, here&apos;s where it flows.
      </p>

      {/* Stacked bar */}
      <div className="relative h-10 bg-slate-950 rounded-lg overflow-hidden border border-slate-800 mb-3 flex">
        {segments.map((seg) => {
          const widthPct = total > 0 ? (seg.amount / total) * 100 : 0;
          return (
            <div
              key={seg.key}
              className="h-full transition-all relative group"
              style={{
                width: `${widthPct}%`,
                backgroundColor: seg.hex,
                opacity: 0.85,
              }}
              title={`${seg.label}: ${fmt(seg.amount)}`}
            />
          );
        })}
      </div>

      {/* Legend rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
        {segments.map((seg) => {
          const widthPct = total > 0 ? (seg.amount / total) * 100 : 0;
          return (
            <div key={seg.key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: seg.hex, opacity: 0.85 }} />
                <span className="text-slate-300 truncate">{seg.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-white font-mono font-bold text-sm">{fmt(seg.amount)}</span>
                <span className="text-slate-500 font-mono text-[10px]">({widthPct.toFixed(1)}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Per successful order</div>
          <div className={`font-mono font-bold text-lg ${profitOnSuccess >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(profitOnSuccess, true)}
          </div>
        </div>
        <div className="rounded-lg bg-slate-950 border border-slate-800 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Weighted (after {returnRate}% returns)</div>
          <div className={`font-mono font-bold text-lg ${weightedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(weightedProfit, true)}
          </div>
          {returnRate > 0 && (
            <p className="text-[10px] text-slate-500 mt-1">
              Returns pull <b className="text-rose-300 font-mono">−{fmt(profitOnSuccess - weightedProfit)}</b> off per unit
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SENSITIVITY PANEL (NEW)
───────────────────────────────────────────── */

function SensitivityPanel({
  base, levers, biggestRiskIdx, fmt,
}: {
  base: number;
  levers: { label: string; desc: string; delta: number; result: Metrics }[];
  biggestRiskIdx: number;
  fmt: (n: number, withSign?: boolean) => string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <Microscope className="w-4 h-4 text-orange-400" /> Sensitivity — what if things get worse?
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">downside scenarios</span>
      </div>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Current weighted profit: <b className="font-mono text-slate-300">{fmt(base)}</b>. Each scenario shows how it changes if one variable worsens.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {levers.map((lever, i) => {
          const isBiggestRisk = i === biggestRiskIdx && lever.delta < 0;
          const newProfit = lever.result.weightedProfit;
          return (
            <div
              key={lever.label}
              className={`rounded-lg p-4 transition border ${
                isBiggestRisk
                  ? 'border-rose-500/40 bg-rose-500/10'
                  : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-xs font-bold text-orange-300">{lever.label}</span>
                {isBiggestRisk && (
                  <span className="text-[9px] font-bold text-rose-300 bg-rose-500/15 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Biggest risk
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mb-3 leading-snug">{lever.desc}</p>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">New weighted</div>
                  <div className={`font-mono font-bold text-base ${newProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmt(newProfit)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Δ</div>
                  <div className={`font-mono font-bold text-sm ${lever.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fmt(lever.delta, true)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GUIDE CARD
───────────────────────────────────────────── */

function GuideCard({
  icon, tone, title, children,
}: {
  icon: React.ReactNode;
  tone: 'orange' | 'amber' | 'sky';
  title: string;
  children: React.ReactNode;
}) {
  const cfg = {
    orange: 'bg-orange-500/10 border-orange-500/30',
    amber:  'bg-amber-500/10 border-amber-500/30',
    sky:    'bg-sky-500/10 border-sky-500/30',
  }[tone];

  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 border ${cfg}`}>
        {icon}
      </div>
      <h3 className="font-bold text-white mb-3">{title}</h3>
      {children}
    </div>
  );
}