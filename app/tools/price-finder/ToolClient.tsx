'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  PieChart, 
  Info,
  BookOpen,
  Target
} from 'lucide-react';

export default function StrategicPricingArchitect() {
  // --- STATE ---
  
  // 1. Costs & Goals
  const [productCost, setProductCost] = useState<number>(400); // COGS + Shipping
  const [targetMargin, setTargetMargin] = useState<number>(20); // Desired Net Margin %
  const [platformFeePct, setPlatformFeePct] = useState<number>(15); // Amazon Referral Fee
  const [gstRate, setGstRate] = useState<number>(18); // Tax Rate

  // 2. Outputs
  const [metrics, setMetrics] = useState({
    suggestedPrice: 0,
    psychologicalPrice: 0,
    netProfit: 0,
    breakEvenPrice: 0,
    status: 'profitable' as 'profitable' | 'impossible'
  });

  // --- CALCULATION ENGINE ---
  useEffect(() => {
    // Formula derivation:
    // Price = Cost + Profit + Fee + GST
    // Profit = Price * Margin%
    // Fee = Price * Fee%
    // GST = (Price / (1+GST%)) * GST%  OR  Price - (Price/1.18)
    
    // Let P = Selling Price
    // P = Cost + (P * Margin) + (P * Fee) + (P - P/(1+GST))
    // P - (P * Margin) - (P * Fee) - (P - P/(1+GST)) = Cost
    // P * [1 - Margin - Fee - (1 - 1/(1+GST))] = Cost
    // P * [1/(1+GST) - Margin - Fee] = Cost
    // P = Cost / [1/(1+GST) - Margin - Fee]

    const gstDec = gstRate / 100;
    const marginDec = targetMargin / 100;
    const feeDec = platformFeePct / 100;

    const denominator = (1 / (1 + gstDec)) - marginDec - feeDec;

    if (denominator <= 0) {
      setMetrics({
        suggestedPrice: 0,
        psychologicalPrice: 0,
        netProfit: 0,
        breakEvenPrice: 0,
        status: 'impossible'
      });
      return;
    }

    const rawPrice = productCost / denominator;
    
    // Psychology Rounding (Ends in 99 or 9)
    const roundTo99 = Math.ceil(rawPrice / 100) * 100 - 1; // e.g. 499
    const roundTo9 = Math.ceil(rawPrice / 10) * 10 - 1; // e.g. 49
    const psychPrice = rawPrice > 1000 ? roundTo99 : roundTo9;

    // Recalculate Profit at Psych Price
    const basePrice = psychPrice / (1 + gstDec);
    const feeAmt = psychPrice * feeDec;
    const actualProfit = basePrice - productCost - feeAmt; // Simplified check

    // Break Even Price (Margin = 0)
    const beDenominator = (1 / (1 + gstDec)) - feeDec;
    const bePrice = productCost / beDenominator;

    setMetrics({
      suggestedPrice: rawPrice,
      psychologicalPrice: psychPrice,
      netProfit: actualProfit,
      breakEvenPrice: bePrice,
      status: 'profitable'
    });

  }, [productCost, targetMargin, platformFeePct, gstRate]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Calculator className="w-8 h-8 text-emerald-500" />
              Strategic Pricing Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Reverse-engineer your perfect selling price based on profit goals.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
             <Target className="w-4 h-4 text-emerald-500" />
             <span>Goal: {targetMargin}% Net Margin</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Cost Inputs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-blue-400" /> Cost Structure
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Total Product Cost</label>
                     <input type="number" value={productCost} onChange={e => setProductCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-1">Manufacturing + Shipping + Packaging</p>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Platform Referral Fee (%)</label>
                     <input type="number" value={platformFeePct} onChange={e => setPlatformFeePct(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">GST Rate (%)</label>
                     <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none">
                        <option value={0}>0%</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                     </select>
                  </div>
               </div>
            </div>

            {/* 2. Goal Input */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Profit Goal
               </h3>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Desired Net Margin (%)</label>
                  <div className="flex items-center gap-2">
                     <input type="range" min="5" max="50" step="1" value={targetMargin} onChange={e => setTargetMargin(Number(e.target.value))} className="w-full accent-emerald-500" />
                     <span className="text-white font-mono w-12 text-right">{targetMargin}%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                     Most healthy businesses aim for 15-25% net margin.
                  </p>
               </div>
            </div>

          </div>

          {/* --- RIGHT: OUTPUT (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {metrics.status === 'impossible' ? (
               <div className="h-full bg-red-950/20 border border-red-900 rounded-xl flex flex-col items-center justify-center p-8 text-center">
                  <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                  <h2 className="text-2xl font-bold text-white">Mathematically Impossible</h2>
                  <p className="text-slate-400 mt-2 max-w-md">
                     Your costs and fees are too high to achieve a {targetMargin}% margin. Even if you raise the price infinitely, the fees and taxes scale with it.
                  </p>
                  <button onClick={() => setTargetMargin(10)} className="mt-6 px-6 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg transition">
                     Try Lower Margin (10%)
                  </button>
               </div>
            ) : (
               <>
                  {/* 1. Main Price Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-5">
                        <DollarSign className="w-64 h-64 text-white" />
                     </div>
                     
                     <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        <div>
                           <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-2">Recommended Price</p>
                           <div className="flex items-baseline gap-2">
                              <span className="text-7xl font-extrabold text-white">{fmt(metrics.psychologicalPrice)}</span>
                           </div>
                           <p className="text-slate-400 text-sm mt-2">
                              Exact Math: {fmt(metrics.suggestedPrice)} → Rounded for Conversion
                           </p>
                        </div>

                        <div className="bg-slate-950/50 p-6 rounded-xl border border-white/5 min-w-[250px]">
                           <div className="flex justify-between mb-2">
                              <span className="text-slate-400 text-sm">Net Profit</span>
                              <span className="text-emerald-400 font-bold">{fmt(metrics.netProfit)}</span>
                           </div>
                           <div className="flex justify-between">
                              <span className="text-slate-400 text-sm">Break Even</span>
                              <span className="text-yellow-400 font-bold">{fmt(metrics.breakEvenPrice)}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* 2. Visual Breakdown */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                     <h3 className="text-xs font-bold uppercase text-slate-500 mb-6 flex items-center gap-2">
                        <PieChart className="w-4 h-4" /> Revenue Distribution
                     </h3>
                     
                     {/* Bar Chart */}
                     <div className="flex h-12 w-full rounded-lg overflow-hidden font-bold text-xs text-white text-center leading-[3rem]">
                        <div style={{ width: `${(productCost / metrics.psychologicalPrice) * 100}%` }} className="bg-blue-600">Cost</div>
                        <div style={{ width: `${(metrics.psychologicalPrice * (platformFeePct/100) / metrics.psychologicalPrice) * 100}%` }} className="bg-orange-500">Fee</div>
                        <div style={{ width: `${(metrics.psychologicalPrice - (metrics.psychologicalPrice/(1+gstRate/100))) / metrics.psychologicalPrice * 100}%` }} className="bg-purple-500">Tax</div>
                        <div className="flex-1 bg-emerald-500">Profit</div>
                     </div>

                     <div className="flex flex-wrap gap-4 mt-4 text-xs text-slate-400 justify-between px-2">
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 bg-blue-600 rounded-full"></div> Product Cost
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 bg-orange-500 rounded-full"></div> Platform Fee
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 bg-purple-500 rounded-full"></div> GST
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Your Profit
                        </div>
                     </div>
                  </div>
               </>
            )}

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-500" />
              Pricing Strategy Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Info className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The "Reverse" Method</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Don't guess a price. Start with your profit goal. If the tool says you need to sell at ₹999 to make 20%, but competitors are at ₹499, your product is <b>not viable</b>.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Psychological Pricing</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    We automatically round prices to end in <b>99</b> or <b>9</b>. 
                    <br/>
                    Research shows ₹499 sells significantly better than ₹480 or ₹500 due to the "left-digit effect."
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-yellow-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Break Even Point</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    The <b>Break Even Price</b> shown is the lowest you can go without losing money. Use this number when running Lightning Deals or Clearance sales.
                 </p>
              </div>

           </div>
        </div>

{/* --- CREATOR FOOTER START --- */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            {/* Instagram Icon */}
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-pink-500 transition-colors"
              title="Instagram"
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

            {/* GitHub Icon */}
            <a
              href="https://github.com/Smart-rwl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-white transition-colors"
              title="GitHub"
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
        {/* --- CREATOR FOOTER END --- */}
      </div>
    </div>
  );
}