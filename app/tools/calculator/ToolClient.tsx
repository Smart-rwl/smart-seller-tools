import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  AlertTriangle,
  Info,
  DollarSign,
  Box,
  RefreshCw,
  Target,
  BookOpen,
  Lightbulb,
  HelpCircle,
  MousePointerClick,
} from 'lucide-react';

// --- Pure calculation (no React state) — easy to read, test, and reuse ---
type CalculatorInputs = {
  sellingPrice: number;
  productCost: number;
  platformFees: number;
  gstRate: number;
  gstMode: 'inclusive' | 'exclusive';
  shippingCost: number;
  adsCost: number;
  returnShipping: number;
  packaging: number;
  returnRate: number;
  damageRate: number;
};

type CalculatorStatus = 'profitable' | 'breakeven' | 'loss';

type CalculatorMetrics = {
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
  status: CalculatorStatus;
};

function calculateMetrics(i: CalculatorInputs): CalculatorMetrics {
  const r = i.returnRate / 100;

  // 1) GST: separate the seller's taxable revenue from the price the customer pays
  let basePrice, taxAmt, finalCustomerPrice;
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
  const cSuccessNoAd =
    i.productCost + i.platformFees + i.shippingCost + i.packaging;
  const profitOnSuccess = basePrice - cSuccessNoAd - i.adsCost;

  // 3) Return order economics: forward + reverse shipping + packaging + lost ad + expected damage
  const damagedValue = i.productCost * (i.damageRate / 100);
  const cReturnNoAd =
    i.shippingCost + i.returnShipping + i.packaging + damagedValue;
  const lossOnReturn = cReturnNoAd + i.adsCost;

  // 4) Weighted per-unit profit across success and return cohorts
  const weightedProfit = (1 - r) * profitOnSuccess - r * lossOnReturn;

  // 5) Margin on the seller's taxable revenue (both sides pre-GST — consistent)
  const margin = basePrice > 0 ? (profitOnSuccess / basePrice) * 100 : 0;

  // 6) ROI on capital invested (product cost)
  const roi = i.productCost > 0 ? (weightedProfit / i.productCost) * 100 : 0;

  // 7) Break-Even ROAS: the ad spend at which weighted profit = 0, expressed as ROAS multiplier.
  //    Solve (1-r)(basePrice - cSuccessNoAd - ad) - r(cReturnNoAd + ad) = 0  for ad
  //    => ad = (1-r)(basePrice - cSuccessNoAd) - r·cReturnNoAd
  const beAdsCost = (1 - r) * (basePrice - cSuccessNoAd) - r * cReturnNoAd;
  const breakEvenROAS = beAdsCost > 0 ? finalCustomerPrice / beAdsCost : null;
  // null => no positive ad spend can make this unit profitable (fix product economics first)

  // 8) Status with a small deadzone so ~₹0 doesn't flicker between "loss" and "profitable"
  let status: CalculatorStatus = 'breakeven';
  if (weightedProfit > 0.5) status = 'profitable';
  else if (weightedProfit < -0.5) status = 'loss';

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
    status,
  };
}

// Clamp arbitrary user input to a finite non-negative number
const safeNum = (v: string | number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// Indian-locale number formatting (e.g. 1,00,000)
const fmt = (n: number, d = 1) =>
  Number.isFinite(n)
    ? n.toLocaleString('en-IN', {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      })
    : '0';

export default function AdvancedProfitCalculator() {
  // --- INPUTS ---
  const [sellingPrice, setSellingPrice] = useState(2000);
  const [productCost, setProductCost] = useState(600);
  const [platformFees, setPlatformFees] = useState(300);
  const [gstRate, setGstRate] = useState(18);
  const [gstMode, setGstMode] = useState<'inclusive' | 'exclusive'>('inclusive');
  const [shippingCost, setShippingCost] = useState(80);
  const [adsCost, setAdsCost] = useState(200);
  const [returnShipping, setReturnShipping] = useState(120);
  const [packaging, setPackaging] = useState(20);
  const [returnRate, setReturnRate] = useState(15);
  const [damageRate, setDamageRate] = useState(5);

  // --- DERIVED METRICS (pure, no extra render) ---
  const m = useMemo(
    () =>
      calculateMetrics({
        sellingPrice,
        productCost,
        platformFees,
        gstRate,
        gstMode,
        shippingCost,
        adsCost,
        returnShipping,
        packaging,
        returnRate,
        damageRate,
      }),
    [
      sellingPrice,
      productCost,
      platformFees,
      gstRate,
      gstMode,
      shippingCost,
      adsCost,
      returnShipping,
      packaging,
      returnRate,
      damageRate,
    ]
  );

  // Reusable number-input handler (clamps to non-negative)
  const numHandler = (setter: (value: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => setter(safeNum(e.target.value));

  // Status pill styling and label
  const statusStyles = {
    profitable: 'bg-green-50 border-green-200 text-green-700',
    breakeven: 'bg-amber-50 border-amber-200 text-amber-700',
    loss: 'bg-red-50 border-red-200 text-red-700',
  };
  const statusLabels = {
    profitable: 'Profitable Strategy',
    breakeven: 'Near Break-Even',
    loss: 'Strategy Loss Making',
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg text-white">
                <Calculator className="w-6 h-6" />
              </div>
              Profit Intelligence Engine
            </h1>
            <p className="text-slate-500 mt-1">
              Advanced unit economics & risk simulator for Amazon/Flipkart.
            </p>
          </div>
          <div className="flex gap-2 text-sm font-medium flex-wrap">
            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-600 flex items-center gap-1">
              <Target className="w-4 h-4" />
              Break-Even ROAS:{' '}
              {m.breakEvenROAS !== null
                ? `${m.breakEvenROAS.toFixed(2)}X`
                : 'N/A'}
            </span>
            <span
              className={`px-3 py-1 rounded-full border flex items-center gap-1 ${statusStyles[m.status]}`}
            >
              {statusLabels[m.status]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          {/* --- LEFT: INPUTS --- */}
          <div className="lg:col-span-8 space-y-6">
            {/* Revenue & Costs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                  Revenue & Costs
                </h2>
                <div
                  className="flex bg-white rounded-lg border border-slate-200 p-1"
                  role="group"
                  aria-label="GST mode"
                >
                  <button
                    type="button"
                    onClick={() => setGstMode('inclusive')}
                    aria-pressed={gstMode === 'inclusive'}
                    className={`px-3 py-1 text-xs font-medium rounded ${gstMode === 'inclusive' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
                  >
                    Inclusive
                  </button>
                  <button
                    type="button"
                    onClick={() => setGstMode('exclusive')}
                    aria-pressed={gstMode === 'exclusive'}
                    className={`px-3 py-1 text-xs font-medium rounded ${gstMode === 'exclusive' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
                  >
                    Exclusive
                  </button>
                </div>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="sellingPrice"
                    className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Selling Price
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      id="sellingPrice"
                      type="number"
                      min="0"
                      value={sellingPrice}
                      onChange={numHandler(setSellingPrice)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 py-2 sm:text-sm border-slate-300 rounded-md border"
                    />
                  </div>
                  {gstMode === 'exclusive' && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Customer pays ₹{fmt(m.finalCustomerPrice, 0)} incl.{' '}
                      {gstRate}% GST
                    </p>
                  )}
                  {gstMode === 'inclusive' && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Taxable revenue: ₹{fmt(m.basePrice, 0)} (₹
                      {fmt(m.taxAmt, 0)} is GST)
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="productCost"
                    className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Product Cost (Landed)
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-500 sm:text-sm">₹</span>
                    </div>
                    <input
                      id="productCost"
                      type="number"
                      min="0"
                      value={productCost}
                      onChange={numHandler(setProductCost)}
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 py-2 sm:text-sm border-slate-300 rounded-md border"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="platformFees"
                    className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    Platform Fees
                  </label>
                  <input
                    id="platformFees"
                    type="number"
                    min="0"
                    value={platformFees}
                    onChange={numHandler(setPlatformFees)}
                    className="mt-1 block w-full py-2 px-3 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Referral + Closing Fees
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="gstRate"
                    className="text-xs font-bold text-slate-500 uppercase tracking-wider"
                  >
                    GST Rate
                  </label>
                  <select
                    id="gstRate"
                    value={gstRate}
                    onChange={(e) => setGstRate(Number(e.target.value))}
                    className="mt-1 block w-full py-2 px-3 border border-slate-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logistics + Marketing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <Box className="w-4 h-4 text-orange-500" /> Logistics
                </h2>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="shipping"
                      className="text-xs font-medium text-slate-500"
                    >
                      Forward Shipping
                    </label>
                    <input
                      id="shipping"
                      type="number"
                      min="0"
                      value={shippingCost}
                      onChange={numHandler(setShippingCost)}
                      className="mt-1 block w-full border-slate-300 rounded-md border px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="packagingInput"
                      className="text-xs font-medium text-slate-500"
                    >
                      Packaging Material
                    </label>
                    <input
                      id="packagingInput"
                      type="number"
                      min="0"
                      value={packaging}
                      onChange={numHandler(setPackaging)}
                      className="mt-1 block w-full border-slate-300 rounded-md border px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-green-500" /> Marketing
                  (Ads)
                </h2>
                <div>
                  <label
                    htmlFor="cpa"
                    className="text-xs font-medium text-slate-500"
                  >
                    Cost Per Acquisition (CPA)
                  </label>
                  <input
                    id="cpa"
                    type="number"
                    min="0"
                    value={adsCost}
                    onChange={numHandler(setAdsCost)}
                    className="mt-1 block w-full border-slate-300 rounded-md border px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ad spend required to get 1 sale
                  </p>
                </div>
              </div>
            </div>

            {/* Risk (RTO) */}
            <div className="bg-red-50/50 rounded-xl shadow-sm border border-red-100 p-6">
              <h2 className="font-semibold text-red-800 flex items-center gap-2 mb-4">
                <RefreshCw className="w-4 h-4" /> Returns & RTO Simulation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label
                    htmlFor="returnRate"
                    className="text-xs font-medium text-red-700"
                  >
                    Return Rate (%)
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      id="returnRate"
                      type="range"
                      min="0"
                      max="40"
                      value={returnRate}
                      onChange={numHandler(setReturnRate)}
                      className="w-full accent-red-600"
                    />
                    <span className="font-bold text-red-700 w-8">
                      {returnRate}%
                    </span>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="returnShipping"
                    className="text-xs font-medium text-red-700"
                  >
                    Return Shipping Cost
                  </label>
                  <input
                    id="returnShipping"
                    type="number"
                    min="0"
                    value={returnShipping}
                    onChange={numHandler(setReturnShipping)}
                    className="mt-1 block w-full border-red-200 bg-white rounded-md border px-3 py-2 text-sm focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="damageRate"
                    className="text-xs font-medium text-red-700"
                  >
                    Damage Rate (%)
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      id="damageRate"
                      type="range"
                      min="0"
                      max="100"
                      value={damageRate}
                      onChange={numHandler(setDamageRate)}
                      className="w-full accent-red-600"
                    />
                    <span className="font-bold text-red-700 w-8">
                      {damageRate}%
                    </span>
                  </div>
                  <p className="text-[10px] text-red-400 mt-1">
                    % of returns unsellable
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* --- RIGHT: RESULTS --- */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl sticky top-6">
              <div className="mb-6">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                  Weighted Net Profit
                </p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span
                    className={`text-4xl font-bold ${
                      m.weightedProfit > 0.5
                        ? 'text-white'
                        : m.weightedProfit < -0.5
                          ? 'text-red-400'
                          : 'text-amber-300'
                    }`}
                  >
                    ₹{fmt(m.weightedProfit)}
                  </span>
                  <span className="text-slate-400 text-sm">/ unit</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Adjusted for {returnRate}% returns
                </p>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-800">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Profit on Success</span>
                  <span
                    className={`font-mono ${m.profitOnSuccess >= 0 ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {m.profitOnSuccess >= 0 ? '+' : '−'}₹
                    {fmt(Math.abs(m.profitOnSuccess))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Loss on Return</span>
                  <span className="text-red-400 font-mono">
                    −₹{fmt(m.lossOnReturn)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">GST Payable</span>
                  <span className="text-white font-mono">
                    ₹{fmt(m.taxAmt)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="bg-slate-800 p-3 rounded-lg text-center">
                  <div className="text-xs text-slate-400 mb-1">ROI</div>
                  <div
                    className={`font-bold ${m.roi >= 0 ? 'text-blue-400' : 'text-red-400'}`}
                  >
                    {fmt(m.roi)}%
                  </div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg text-center">
                  <div className="text-xs text-slate-400 mb-1">Margin</div>
                  <div
                    className={`font-bold ${m.margin >= 0 ? 'text-yellow-400' : 'text-red-400'}`}
                  >
                    {fmt(m.margin)}%
                  </div>
                </div>
              </div>

              {m.weightedProfit < -0.5 && (
                <div className="mt-6 bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-xs text-red-200 leading-relaxed">
                    <span className="font-bold text-red-400 block mb-1">
                      Critical Loss Warning
                    </span>
                    Your returns and ad costs are eating all profits. You must
                    lower CPA or reduce Return Rate.
                  </p>
                </div>
              )}

              {m.breakEvenROAS === null && (
                <div className="mt-3 bg-amber-500/10 border border-amber-500/50 p-3 rounded-lg flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-200 leading-relaxed">
                    <span className="font-bold text-amber-300 block mb-1">
                      No Profitable Ad Spend Exists
                    </span>
                    Even at ₹0 ads, this unit loses money. Fix product cost,
                    platform fees, or return rate first.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" /> ROI Reality Check
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                A {returnRate}% return rate doesn't just mean {returnRate}% less
                sales. It means you pay shipping <b>twice</b> (Forward +
                Reverse) on those items, plus packaging loss. This calculator
                deducts those hidden losses from your successful sales.
              </p>
            </div>
          </div>
        </div>

        {/* USER GUIDE */}
        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            User Guide & Strategy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="bg-blue-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                <MousePointerClick className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">
                When to use this?
              </h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>
                    <b>Product Sourcing:</b> Before buying bulk stock from
                    Alibaba/Indiamart. If "Weighted Net Profit" is negative, do
                    not buy.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>
                    <b>Ad Budgeting:</b> Compare your actual Ads ROAS to the
                    Break-Even ROAS up top. Your actual must be{' '}
                    <b>higher</b> to make money.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-500">•</span>
                  <span>
                    <b>Fee Updates:</b> When Amazon changes referral fees, check
                    if your price needs to increase.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="bg-orange-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                <Lightbulb className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">
                Why Weighted Profit?
              </h3>
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                Most sellers calculate:{' '}
                <i>(Sale Price − Cost − Fees)</i>. This is wrong because it
                ignores Returns (RTO).
              </p>
              <div className="bg-slate-50 p-3 rounded text-xs text-slate-700 border border-slate-100">
                <p className="font-semibold mb-1">The Reality:</p>
                <p>If you profit ₹200 on a sale, but lose ₹150 on a return…</p>
                <p className="mt-1">And 20% of orders return…</p>
                <p className="mt-1 font-bold text-blue-600">
                  Your real profit is only ₹130, not ₹200.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="bg-green-50 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                <HelpCircle className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Field Guide</h3>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex flex-col">
                  <span className="font-bold text-slate-800">GST Mode</span>
                  <span>
                    Use <b>Inclusive</b> for Amazon/Flipkart. Use{' '}
                    <b>Exclusive</b> if tax is added at checkout (e.g.,
                    Shopify).
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="font-bold text-slate-800">CPA (Ads Cost)</span>
                  <span>
                    The average amount you spend on ads to get ONE purchase.
                    Find this in your Ads Manager.
                  </span>
                </li>
                <li className="flex flex-col">
                  <span className="font-bold text-slate-800">Damage Rate</span>
                  <span>
                    Percentage of returned items that are broken and cannot be
                    sold again (total loss).
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* FOOTER (fixed for light theme) */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-200 pt-8">
          <p className="text-slate-500 font-medium text-sm">
            Created by SmartRwl
          </p>
          <div className="flex space-x-4">
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 hover:text-pink-500 transition-colors"
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
              className="text-slate-500 hover:text-slate-900 transition-colors"
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
      </div>
    </div>
  );
}