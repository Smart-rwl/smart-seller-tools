'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Plus,
  Trash2,
  TrendingUp,
  Scale,
  DollarSign,
  Box,
  CheckCircle2,
  AlertCircle,
  Layers,
  BookOpen,
  Target,
  ScanLine,
  ChevronDown,
  RotateCcw,
  Info,
  PieChart,
  Microscope,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES + CONSTANTS
───────────────────────────────────────────── */

type Component = {
  id: number;
  name: string;
  cost: number;
  individualPrice: number;
  weight: number; // grams
  qty: number;
};

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

type BoxDims = { l: number; w: number; h: number };

type Inputs = {
  bundlePrice: number;
  referralFeePct: number;
  packagingCost: number;
  packagingWeight: number;
  boxDims: BoxDims;
  components: Component[];
  shippingRate: number;
  shippingTierStep: number;
  volDivisor: number;
  currency: CurrencyCode;
};

const DEFAULT_COMPONENTS: Component[] = [
  { id: 1, name: 'Shampoo 500ml',     cost: 150, individualPrice: 499, weight: 550, qty: 1 },
  { id: 2, name: 'Conditioner 500ml', cost: 180, individualPrice: 549, weight: 550, qty: 1 },
];

const DEFAULTS: Inputs = {
  bundlePrice: 1500,
  referralFeePct: 15,
  packagingCost: 30,
  packagingWeight: 100,
  boxDims: { l: 20, w: 15, h: 10 },
  components: DEFAULT_COMPONENTS,
  shippingRate: 70,
  shippingTierStep: 30,
  volDivisor: 5000,
  currency: 'INR',
};

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const VOL_DIVISORS = [
  { value: 5000, label: '5000 (FBA / Express)', hint: 'Amazon FBA India, DHL, FedEx, BlueDart' },
  { value: 6000, label: '6000 (Air IATA)',      hint: 'International air freight standard' },
  { value: 1000, label: '1000 (Sea LCL)',       hint: 'Less-than-container-load ocean freight' },
];

const STORAGE_KEY = 'bundle-intel:state:v1';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const safeInt = (v: unknown): number => Math.round(safeNum(v));

function fmtCurrency(n: number, code: CurrencyCode): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  if (!Number.isFinite(n)) return `${c.symbol}0`;
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
   MATH
───────────────────────────────────────────── */

type Metrics = {
  totalSourcingCost: number;
  actualWeightKg: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;
  isVolumetric: boolean;
  shippingCost: number;
  referralFeeAmt: number;
  totalExpenses: number;
  netProfit: number;
  margin: number;
  roi: number;
  individualTotal: number;
  customerSavings: number;
  breakEvenROAS: number;
  maxCPA: number;
};

function computeMetrics(i: Inputs): Metrics {
  // A. Component aggregation
  let sourcingCost = 0;
  let totalWtGrams = 0;
  let individualSum = 0;
  for (const c of i.components) {
    sourcingCost += c.cost * c.qty;
    totalWtGrams += c.weight * c.qty;
    individualSum += c.individualPrice * c.qty;
  }

  // B. Actual weight (with packaging)
  const actualWeightGrams = totalWtGrams + i.packagingWeight;
  const actualWeightKg = actualWeightGrams / 1000;

  // B1. Volumetric weight
  const volWeightKg = (i.boxDims.l * i.boxDims.w * i.boxDims.h) / i.volDivisor;
  const chargeableWeightKg = Math.max(actualWeightKg, volWeightKg);
  const chargeableWeightGrams = chargeableWeightKg * 1000;
  const isVolumetric = volWeightKg > actualWeightKg;

  // B2. Shipping (step-based, on chargeable weight)
  let shippingCost = i.shippingRate;
  if (chargeableWeightGrams > 500) {
    const extraSteps = Math.ceil((chargeableWeightGrams - 500) / 500);
    shippingCost += extraSteps * i.shippingTierStep;
  }

  // C. Referral fee (no GST tax added — assumes GST-registered seller with full ITC)
  const referralFeeAmt = i.bundlePrice * (i.referralFeePct / 100);

  // D. Final P&L
  const totalExpenses = sourcingCost + i.packagingCost + shippingCost + referralFeeAmt;
  const netProfit = i.bundlePrice - totalExpenses;

  // E. Derived metrics
  const margin = i.bundlePrice > 0 ? (netProfit / i.bundlePrice) * 100 : 0;
  const roi = sourcingCost > 0 ? (netProfit / sourcingCost) * 100 : 0;
  const customerSavings = individualSum > 0 ? ((individualSum - i.bundlePrice) / individualSum) * 100 : 0;

  // F. Marketing
  const breakEvenROAS = netProfit > 0 ? i.bundlePrice / netProfit : 0;
  const maxCPA = netProfit;

  return {
    totalSourcingCost: sourcingCost,
    actualWeightKg,
    volumetricWeightKg: volWeightKg,
    chargeableWeightKg,
    isVolumetric,
    shippingCost,
    referralFeeAmt,
    totalExpenses,
    netProfit,
    margin,
    roi,
    individualTotal: individualSum,
    customerSavings,
    breakEvenROAS,
    maxCPA,
  };
}

/* ═════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════ */

export default function BundleIntelligenceCenter() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  /* Hydrate */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.inputs) {
          // Sanitize components carefully
          const comps = Array.isArray(s.inputs.components) && s.inputs.components.length > 0
            ? s.inputs.components.map((c: Partial<Component>, i: number) => ({
                id: typeof c.id === 'number' ? c.id : Date.now() + i,
                name: typeof c.name === 'string' ? c.name : `Item ${i + 1}`,
                cost: safeNum(c.cost),
                individualPrice: safeNum(c.individualPrice),
                weight: safeNum(c.weight),
                qty: safeInt(c.qty),
              }))
            : DEFAULTS.components;
          setInputs({ ...DEFAULTS, ...s.inputs, components: comps });
        }
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

  const metrics = useMemo(() => computeMetrics(inputs), [inputs]);
  const fmt = (n: number) => fmtCurrency(n, inputs.currency);
  const symbol = CURRENCIES.find((c) => c.code === inputs.currency)?.symbol ?? '₹';

  /* Price sensitivity */
  const sensitivity = useMemo(() => {
    const variants = [
      { label: '−10%', price: inputs.bundlePrice * 0.9 },
      { label: 'Current', price: inputs.bundlePrice },
      { label: '+10%', price: inputs.bundlePrice * 1.1 },
    ];
    const results = variants.map((v) => ({
      ...v,
      metrics: computeMetrics({ ...inputs, bundlePrice: v.price }),
    }));
    // Find biggest profit (excluding 'Current' to highlight the recommendation)
    const bestIdx = results.reduce((best, r, i) => r.metrics.netProfit > results[best].metrics.netProfit ? i : best, 0);
    return { results, bestIdx };
  }, [inputs]);

  /* Actions */
  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const updateBoxDims = (field: keyof BoxDims, val: number) =>
    setInputs((p) => ({ ...p, boxDims: { ...p.boxDims, [field]: val } }));

  const updateComponent = <K extends keyof Component>(id: number, field: K, val: Component[K]) =>
    setInputs((p) => ({
      ...p,
      components: p.components.map((c) => (c.id === id ? { ...c, [field]: val } : c)),
    }));

  const addComponent = () =>
    setInputs((p) => ({
      ...p,
      components: [
        ...p.components,
        { id: Date.now(), name: 'New Item', cost: 0, individualPrice: 0, weight: 0, qty: 1 },
      ],
    }));

  const removeComponent = (id: number) => {
    if (inputs.components.length <= 1) return;
    setInputs((p) => ({ ...p, components: p.components.filter((c) => c.id !== id) }));
  };

  const resetAll = () => {
    if (!confirm('Reset all bundle components and settings to defaults?')) return;
    setInputs({
      ...DEFAULTS,
      components: DEFAULT_COMPONENTS.map((c) => ({ ...c, id: Date.now() + c.id })),
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Layers className="w-8 h-8 text-orange-500" />
              Bundle Intelligence Center
            </h1>
            <p className="text-slate-400 mt-2">
              Advanced unit economics, volumetric analysis, and logistics planner.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Chargeable wt</p>
                <div className="flex items-center gap-1.5 justify-end">
                  <p className={`text-base font-mono font-bold ${metrics.isVolumetric ? 'text-orange-400' : 'text-white'}`}>
                    {metrics.chargeableWeightKg.toFixed(2)} kg
                  </p>
                  {metrics.isVolumetric && <ScanLine className="w-3.5 h-3.5 text-orange-400" />}
                </div>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Est. shipping</p>
                <p className="text-base font-mono font-bold text-white">{fmt(metrics.shippingCost)}</p>
              </div>
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

          {/* ─── LEFT: BUILDER ─── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Component list */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 flex-wrap gap-2">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-sky-400" /> Bundle components
                </h3>
                <button
                  onClick={addComponent}
                  className="text-xs flex items-center gap-1 bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-full transition"
                >
                  <Plus className="w-3 h-3" /> Add item
                </button>
              </div>

              <div className="p-4 space-y-3">
                {inputs.components.map((comp) => (
                  <ComponentRow
                    key={comp.id}
                    comp={comp}
                    canRemove={inputs.components.length > 1}
                    symbol={symbol}
                    onChange={updateComponent}
                    onRemove={() => removeComponent(comp.id)}
                  />
                ))}
              </div>
              <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-right text-xs text-slate-400">
                Total sourcing cost: <span className="text-white font-mono font-bold">{fmt(metrics.totalSourcingCost)}</span>
              </div>
            </div>

            {/* Config */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Pricing strategy */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Pricing strategy
                </h3>
                <div className="space-y-4">
                  <CurrencyField
                    label="Bundle selling price"
                    value={inputs.bundlePrice}
                    onChange={(v) => update('bundlePrice', v)}
                    symbol={symbol}
                    emphasized
                  />
                  <NumericField
                    label="Category referral fee (%)"
                    value={inputs.referralFeePct}
                    onChange={(v) => update('referralFeePct', v)}
                    suffix="%"
                  />
                </div>
              </div>

              {/* Logistics & dimensions */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                  <Box className="w-4 h-4 text-orange-400" /> Logistics & dimensions
                </h3>

                {/* Volumetric divisor */}
                <div className="mb-3">
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-wider">Volumetric divisor</label>
                  <select
                    value={inputs.volDivisor}
                    onChange={(e) => update('volDivisor', Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
                  >
                    {VOL_DIVISORS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {VOL_DIVISORS.find((d) => d.value === inputs.volDivisor)?.hint}
                  </p>
                </div>

                {/* Box dimensions */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <DimField label="L (cm)" value={inputs.boxDims.l} onChange={(v) => updateBoxDims('l', v)} />
                  <DimField label="W (cm)" value={inputs.boxDims.w} onChange={(v) => updateBoxDims('w', v)} />
                  <DimField label="H (cm)" value={inputs.boxDims.h} onChange={(v) => updateBoxDims('h', v)} />
                </div>

                {/* Packaging */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <CurrencyField
                    label="Box cost"
                    value={inputs.packagingCost}
                    onChange={(v) => update('packagingCost', v)}
                    symbol={symbol}
                  />
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block tracking-wider">Empty box (g)</label>
                    <input
                      type="number" min={0}
                      value={inputs.packagingWeight === 0 ? '' : inputs.packagingWeight}
                      onChange={(e) => update('packagingWeight', safeNum(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
                    />
                  </div>
                </div>

                {/* Volumetric warning */}
                {metrics.isVolumetric && (
                  <div className="mb-3 p-2.5 bg-orange-500/10 border border-orange-500/30 rounded flex items-start gap-2">
                    <ScanLine className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                    <span className="text-[10px] text-orange-200/90 leading-snug">
                      <b className="text-orange-300">Volumetric trap!</b> Box volume ({metrics.volumetricWeightKg.toFixed(2)} kg) exceeds actual weight ({metrics.actualWeightKg.toFixed(2)} kg). You&apos;re paying for air — shrink the box or fill it tighter.
                    </span>
                  </div>
                )}

                {/* Shipping tiers */}
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1 uppercase tracking-wider font-bold">
                    <span>Base rate (500g)</span>
                    <span>Tier step (per 500g)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <CurrencyField
                      label=""
                      value={inputs.shippingRate}
                      onChange={(v) => update('shippingRate', v)}
                      symbol={symbol}
                      small
                    />
                    <CurrencyField
                      label=""
                      value={inputs.shippingTierStep}
                      onChange={(v) => update('shippingTierStep', v)}
                      symbol={symbol}
                      small
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* GST/ITC disclosure */}
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-500 leading-relaxed flex gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Profit math assumes the seller is GST-registered with full Input Tax Credit on referral fees and shipping. Unregistered sellers should add ~18% × (referral + shipping) as additional cost — but Amazon India requires GSTIN for most categories, so this assumption holds for nearly all real sellers.
              </span>
            </div>
          </div>

          {/* ─── RIGHT: INTELLIGENCE ─── */}
          <div className="lg:col-span-5 space-y-6">

            {/* Value proposition */}
            <ValuePropositionCard
              savings={metrics.customerSavings}
              individualTotal={metrics.individualTotal}
              bundlePrice={inputs.bundlePrice}
              fmt={fmt}
            />

            {/* Financial breakdown */}
            <FinancialBreakdownCard
              bundlePrice={inputs.bundlePrice}
              sourcingCost={metrics.totalSourcingCost}
              packagingCost={inputs.packagingCost}
              shippingCost={metrics.shippingCost}
              referralFeeAmt={metrics.referralFeeAmt}
              netProfit={metrics.netProfit}
              margin={metrics.margin}
              roi={metrics.roi}
              fmt={fmt}
            />

            {/* Marketing intelligence */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
              <h3 className="text-xs font-bold uppercase text-orange-300 tracking-widest mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" /> Marketing intelligence
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block mb-1 tracking-wider font-bold">Break-even ROAS</span>
                  <div className="font-mono text-2xl font-bold text-white tabular-nums">
                    {metrics.breakEvenROAS > 0 ? `${metrics.breakEvenROAS.toFixed(2)}×` : '—'}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Min. ad return required</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block mb-1 tracking-wider font-bold">Max CPA</span>
                  <div className={`font-mono text-2xl font-bold tabular-nums ${metrics.maxCPA > 0 ? 'text-white' : 'text-rose-400'}`}>
                    {fmt(metrics.maxCPA)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">Max spend per order</p>
                </div>
              </div>
            </div>

            {/* Price sensitivity (NEW) */}
            <PriceSensitivityCard
              results={sensitivity.results}
              bestIdx={sensitivity.bestIdx}
              fmt={fmt}
            />
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            Strategy guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<Layers className="w-5 h-5 text-sky-400" />}
              tone="sky"
              title="Why bundle?"
            >
              <b className="text-slate-200">Reduce FBA fees:</b> You pay pick & pack once for the whole box instead of once per item. The fee savings alone often justify a 5-10% bundle discount over individual prices, and customers still feel they&apos;re getting a deal.
            </GuideCard>

            <GuideCard
              icon={<Scale className="w-5 h-5 text-orange-400" />}
              tone="orange"
              title="The volumetric trap"
            >
              If your box is light but large, Amazon charges by volume, not weight. Watch the chargeable-weight indicator at the top. When it turns orange, you&apos;re paying for air — shrink the box, pack tighter, or fill voids with denser products.
            </GuideCard>

            <GuideCard
              icon={<Target className="w-5 h-5 text-emerald-400" />}
              tone="emerald"
              title="Marketing math"
            >
              <b className="text-slate-200">Break-even ROAS</b> is your minimum ad return. If it says 3.0× and your campaigns are running at 2.5×, you&apos;re losing money on every paid sale. Aim for actual ROAS 30%+ above break-even.
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

function ComponentRow({
  comp, canRemove, symbol, onChange, onRemove,
}: {
  comp: Component;
  canRemove: boolean;
  symbol: string;
  onChange: <K extends keyof Component>(id: number, field: K, val: Component[K]) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center group">
      <div className="flex-1 w-full">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Item name</span>
          {canRemove && (
            <button
              onClick={onRemove}
              className="text-slate-500 hover:text-rose-400 transition cursor-pointer"
              aria-label="Remove component"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
        <input
          type="text"
          value={comp.name}
          onChange={(e) => onChange(comp.id, 'name', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition outline-none text-white"
        />
      </div>

      <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
        <div className="w-20">
          <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider font-bold">Cost</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">{symbol.length > 1 ? '' : symbol}</span>
            <input
              type="number" min={0}
              value={comp.cost === 0 ? '' : comp.cost}
              onChange={(e) => onChange(comp.id, 'cost', safeNum(e.target.value))}
              className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 ${symbol.length > 1 ? 'pl-2' : 'pl-5'} text-xs font-mono outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition text-white`}
            />
          </div>
        </div>
        <div className="w-20">
          <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider font-bold">Sold alone</label>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">{symbol.length > 1 ? '' : symbol}</span>
            <input
              type="number" min={0}
              value={comp.individualPrice === 0 ? '' : comp.individualPrice}
              onChange={(e) => onChange(comp.id, 'individualPrice', safeNum(e.target.value))}
              className={`w-full bg-slate-900 border border-slate-700 rounded p-1.5 ${symbol.length > 1 ? 'pl-2' : 'pl-5'} text-xs font-mono outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition text-white`}
            />
          </div>
        </div>
        <div className="w-20">
          <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider font-bold">Wt (g)</label>
          <input
            type="number" min={0}
            value={comp.weight === 0 ? '' : comp.weight}
            onChange={(e) => onChange(comp.id, 'weight', safeNum(e.target.value))}
            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs font-mono outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition text-white"
          />
        </div>
        <div className="w-16">
          <label className="text-[10px] text-orange-400 block mb-1 uppercase tracking-wider font-bold">Qty</label>
          <input
            type="number" min={0} step={1}
            value={comp.qty === 0 ? '' : comp.qty}
            onChange={(e) => onChange(comp.id, 'qty', safeInt(e.target.value))}
            className="w-full bg-orange-500/10 border border-orange-500/40 rounded p-1.5 text-xs text-center font-mono font-bold outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition text-white"
          />
        </div>
      </div>
    </div>
  );
}

function ValuePropositionCard({
  savings, individualTotal, bundlePrice, fmt,
}: {
  savings: number;
  individualTotal: number;
  bundlePrice: number;
  fmt: (n: number) => string;
}) {
  const good = savings > 10;
  return (
    <div className={`rounded-xl border p-6 ${
      good ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-orange-500/10 border-orange-500/30'
    }`}>
      <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <TrendingUp className="w-4 h-4" /> Value proposition
        </h3>
        <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${
          good ? 'bg-emerald-500/20 text-emerald-300' : 'bg-orange-500/20 text-orange-300'
        }`}>
          {savings.toFixed(1)}% savings
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        Buying separately costs <b className="text-white font-mono">{fmt(individualTotal)}</b>. Buying your bundle costs <b className="text-white font-mono">{fmt(bundlePrice)}</b>.
      </p>

      {savings < 5 ? (
        <div className="flex items-start gap-2 text-xs text-orange-200/90 bg-orange-500/10 p-2.5 rounded border border-orange-500/30">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-orange-300" />
          <p><b className="text-orange-200">Warning:</b> This bundle offers little value to the customer. Consider lowering the price or removing a component to increase conversion.</p>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-xs text-emerald-200/90 bg-emerald-500/10 p-2.5 rounded border border-emerald-500/30">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
          <p>The discount is significant enough to motivate customers to buy the bundle over individual items.</p>
        </div>
      )}
    </div>
  );
}

function FinancialBreakdownCard({
  bundlePrice, sourcingCost, packagingCost, shippingCost, referralFeeAmt, netProfit, margin, roi, fmt,
}: {
  bundlePrice: number;
  sourcingCost: number;
  packagingCost: number;
  shippingCost: number;
  referralFeeAmt: number;
  netProfit: number;
  margin: number;
  roi: number;
  fmt: (n: number) => string;
}) {
  // Segments for the cost-stack visualization
  const total = Math.max(bundlePrice, sourcingCost + packagingCost + shippingCost + referralFeeAmt + Math.abs(netProfit));
  const segments = [
    { key: 'product',  label: 'Product cost',  amount: sourcingCost,  hex: '#f97316', tone: 'orange' },
    { key: 'packaging',label: 'Packaging',     amount: packagingCost, hex: '#f59e0b', tone: 'amber' },
    { key: 'shipping', label: 'Shipping/FBA',  amount: shippingCost,  hex: '#0ea5e9', tone: 'sky' },
    { key: 'referral', label: 'Referral fee',  amount: referralFeeAmt,hex: '#64748b', tone: 'slate' },
    {
      key: 'profit',
      label: netProfit >= 0 ? 'Net profit' : 'Shortfall',
      amount: Math.abs(netProfit),
      hex: netProfit >= 0 ? '#10b981' : '#f43f5e',
      tone: netProfit >= 0 ? 'emerald' : 'rose',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
          <PieChart className="w-3.5 h-3.5 text-orange-400" /> Financial breakdown
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">per bundle sale</span>
      </div>

      {/* Segmented profit stack */}
      <div className="relative h-8 w-full bg-slate-950 rounded-md flex overflow-hidden mb-3 border border-slate-800">
        {segments.map((seg) => {
          const widthPct = total > 0 ? (seg.amount / total) * 100 : 0;
          return (
            <div
              key={seg.key}
              className="h-full transition-all relative"
              style={{
                width: `${widthPct}%`,
                backgroundColor: seg.hex,
                opacity: 0.85,
              }}
              title={`${seg.label}: ${fmt(seg.amount)} (${widthPct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 gap-1.5 text-xs mb-4">
        {segments.map((seg) => {
          const widthPct = total > 0 ? (seg.amount / total) * 100 : 0;
          return (
            <div key={seg.key} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded shrink-0" style={{ backgroundColor: seg.hex, opacity: 0.85 }} />
                <span className="text-slate-300">{seg.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5 shrink-0">
                <span className="text-white font-mono font-bold">{fmt(seg.amount)}</span>
                <span className="text-slate-500 font-mono text-[10px]">({widthPct.toFixed(1)}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Net profit + tiles */}
      <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
        <div className="flex justify-between items-end mb-1 flex-wrap gap-2">
          <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Net profit</span>
          <span className={`text-2xl font-mono font-bold tabular-nums ${netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmt(netProfit)}
          </span>
        </div>
        <div className="flex gap-3 mt-3">
          <div className={`flex-1 text-center p-2 rounded transition ${
            margin > 15 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}>
            <div className="text-[10px] uppercase tracking-wider font-bold">Margin</div>
            <div className="font-mono font-bold">{margin.toFixed(1)}%</div>
          </div>
          <div className={`flex-1 text-center p-2 rounded transition ${
            roi > 30 ? 'bg-sky-500/10 text-sky-300 border border-sky-500/30' : 'bg-slate-900 text-slate-400 border border-slate-800'
          }`}>
            <div className="text-[10px] uppercase tracking-wider font-bold">ROI</div>
            <div className="font-mono font-bold">{roi.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceSensitivityCard({
  results, bestIdx, fmt,
}: {
  results: { label: string; price: number; metrics: Metrics }[];
  bestIdx: number;
  fmt: (n: number) => string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
          <Microscope className="w-3.5 h-3.5 text-orange-400" /> Price sensitivity
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">±10% scenarios</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {results.map((r, i) => {
          const isBest = i === bestIdx;
          const isCurrent = r.label === 'Current';
          return (
            <div
              key={r.label}
              className={`rounded-lg p-3 border text-center transition ${
                isCurrent
                  ? 'border-orange-500/40 bg-orange-500/10'
                  : isBest
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950'
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className={isCurrent ? 'text-orange-300' : isBest ? 'text-emerald-300' : 'text-slate-500'}>
                  {r.label}
                </span>
                {isBest && !isCurrent && (
                  <span className="ml-1 text-[8px] text-emerald-400">★</span>
                )}
              </div>
              <div className="text-xs text-slate-400 mb-2 font-mono">{fmt(r.price)}</div>
              <div className={`font-mono font-bold text-base tabular-nums ${
                r.metrics.netProfit > 0 ? 'text-white' : 'text-rose-400'
              }`}>
                {fmt(r.metrics.netProfit)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {r.metrics.margin.toFixed(0)}% margin
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
        How profit shifts if you raise or lower the bundle price by 10%. The highlighted column shows your highest-profit option — but remember higher prices reduce conversion.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FORM ATOMS
───────────────────────────────────────────── */

function CurrencyField({
  label, value, onChange, symbol, emphasized, small,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  symbol: string;
  emphasized?: boolean;
  small?: boolean;
}) {
  const longSymbol = symbol.length > 1;
  return (
    <div>
      {label && (
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      )}
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono ${longSymbol ? 'text-xs' : 'text-sm'}`}>
          {symbol}
        </span>
        <input
          type="number" min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full bg-slate-950 border border-slate-700 rounded ${
            emphasized ? 'p-3 text-lg font-bold' : small ? 'p-1.5 text-xs' : 'p-2 text-sm'
          } ${longSymbol ? 'pl-12' : 'pl-7'} text-white font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition`}
        />
      </div>
    </div>
  );
}

function NumericField({
  label, value, onChange, suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <div className="relative">
        <input
          type="number" min={0}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(safeNum(e.target.value))}
          className={`w-full bg-slate-950 border border-slate-700 rounded p-2 ${suffix ? 'pr-8' : 'pr-3'} text-white font-mono text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function DimField({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block tracking-wider">{label}</label>
      <input
        type="number" min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm font-mono outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
      />
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

function GuideCard({
  icon, tone, title, children,
}: {
  icon: React.ReactNode;
  tone: 'orange' | 'sky' | 'emerald';
  title: string;
  children: React.ReactNode;
}) {
  const cfg = {
    orange:  'bg-orange-500/10 border-orange-500/30',
    sky:     'bg-sky-500/10 border-sky-500/30',
    emerald: 'bg-emerald-500/10 border-emerald-500/30',
  }[tone];
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${cfg}`}>
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{children}</p>
    </div>
  );
}