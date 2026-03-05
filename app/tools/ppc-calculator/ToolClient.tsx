'use client';

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3,
  BookOpen,
  PieChart,
  MousePointerClick, // NEW
  Crosshair,         // NEW
  Calculator         // NEW
} from 'lucide-react';

export default function AdProfitabilityEngine() {
  // --- STATE ---
  
  // 1. Campaign Data
  const [adSpend, setAdSpend] = useState<number>(5000);
  const [adSales, setAdSales] = useState<number>(15000);
  const [totalSales, setTotalSales] = useState<number>(45000); // Organic + Ad Sales
  
  // 2. Unit Economics
  const [cpc, setCpc] = useState<number>(15); // Cost per Click
  const [sellingPrice, setSellingPrice] = useState<number>(1000);
  const [landedCost, setLandedCost] = useState<number>(400); // Product + Fees

  // 3. NEW: Strategy Config
  const [targetProfitMargin, setTargetProfitMargin] = useState<number>(10); // % Profit I want to KEEP

  // 4. Outputs
  const [metrics, setMetrics] = useState({
    acos: 0,
    roas: 0,
    tacos: 0,
    breakEvenAcos: 0,
    targetAcos: 0,      // NEW
    maxSafeBid: 0,      // Bid to Break Even
    goldenBid: 0,       // NEW: Bid to hit Target Profit
    netAdProfit: 0,
    conversionRate: 0,
    clicksToSale: 0,    // NEW
    cpa: 0,             // NEW
    status: 'healthy' as 'profitable' | 'break-even' | 'loss'
  });

  // --- ENGINE ---
  useEffect(() => {
    // A. Basic Ad Metrics
    const acos = adSales > 0 ? (adSpend / adSales) * 100 : 0;
    const roas = adSpend > 0 ? adSales / adSpend : 0;
    
    // B. Advanced TACoS (Total Ad Cost of Sales)
    const tacos = totalSales > 0 ? (adSpend / totalSales) * 100 : 0;

    // C. Profitability Limits
    const profitMargin = sellingPrice - landedCost;
    const marginPct = sellingPrice > 0 ? (profitMargin / sellingPrice) * 100 : 0;
    
    // Break Even ACOS = Profit Margin %
    const beAcos = marginPct;

    // NEW: Target ACOS (Speed Limit)
    // If Margin is 30% and I want to keep 10%, I can spend 20% on ads.
    let targetAcos = beAcos - targetProfitMargin;
    if (targetAcos < 0) targetAcos = 0;

    // D. Bidding Intelligence
    const clicks = cpc > 0 ? adSpend / cpc : 0;
    const orders = sellingPrice > 0 ? adSales / sellingPrice : 0;
    const cr = clicks > 0 ? (orders / clicks) * 100 : 0;

    // Max Safe Bid (Break Even) = Price * CR% * Margin%
    const maxSafeBid = profitMargin * (cr / 100);

    // NEW: Golden Bid (Target Profit)
    // Bid = Price * CR% * TargetACOS%
    const goldenBid = sellingPrice * (cr / 100) * (targetAcos / 100);

    // E. Funnel Metrics (NEW)
    const clicksToSale = cr > 0 ? Math.ceil(100 / cr) : 0;
    const cpa = clicksToSale * cpc; // Cost Per Acquisition (Actual)

    // F. Status
    let status: 'profitable' | 'break-even' | 'loss' = 'profitable';
    if (acos > beAcos) status = 'loss';
    else if (acos > beAcos - 5) status = 'break-even';

    // G. Net Ad Profit
    const costOfAdGoods = orders * landedCost;
    const netProfit = adSales - adSpend - costOfAdGoods;

    setMetrics({
      acos,
      roas,
      tacos,
      breakEvenAcos: beAcos,
      targetAcos,
      maxSafeBid,
      goldenBid,
      netAdProfit: netProfit,
      conversionRate: cr,
      clicksToSale,
      cpa,
      status
    });

  }, [adSpend, adSales, totalSales, cpc, sellingPrice, landedCost, targetProfitMargin]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              Ad Profitability Engine
            </h1>
            <p className="text-slate-400 mt-2">
              Advanced ACOS, TACoS, and Bid Optimization Calculator.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <div className={`w-3 h-3 rounded-full ${
                metrics.status === 'profitable' ? 'bg-emerald-500' : 
                metrics.status === 'break-even' ? 'bg-yellow-500' : 'bg-red-500'
             }`}></div>
             <span className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Campaign Health: {metrics.status}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Ad Performance */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-blue-400" /> Campaign Data
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ad Spend (₹)</label>
                     <input type="number" value={adSpend} onChange={e => setAdSpend(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ad Sales (Revenue)</label>
                     <input type="number" value={adSales} onChange={e => setAdSales(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Total Sales (Ad + Organic)</label>
                     <input type="number" value={totalSales} onChange={e => setTotalSales(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* 2. Unit Metrics */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-emerald-400" /> Unit Economics
               </h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CPC (Avg)</label>
                        <input type="number" value={cpc} onChange={e => setCpc(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Price</label>
                        <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Landed Cost</label>
                     <input type="number" value={landedCost} onChange={e => setLandedCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none" />
                  </div>
               </div>
            </div>

            {/* 3. NEW: Strategy Config */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Calculator className="w-4 h-4 text-purple-400" /> Profit Strategy
               </h3>
               <div>
                  <div className="flex justify-between mb-1">
                     <label className="text-xs font-bold text-slate-500 uppercase">Desired Net Margin</label>
                     <span className="text-xs text-purple-400 font-bold">{targetProfitMargin}%</span>
                  </div>
                  <input type="range" min="0" max="30" step="1" value={targetProfitMargin} onChange={e => setTargetProfitMargin(Number(e.target.value))} className="w-full accent-purple-500" />
                  <p className="text-[10px] text-slate-500 mt-1">I want to keep {targetProfitMargin}% profit after ad spend.</p>
               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Main KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               
               {/* ACOS */}
               <div className={`rounded-xl border p-4 ${metrics.status === 'loss' ? 'bg-red-950/20 border-red-900' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Actual ACOS</div>
                  <div className="text-2xl font-extrabold text-white mb-1">{metrics.acos.toFixed(1)}%</div>
               </div>

               {/* ROAS */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">ROAS</div>
                  <div className="text-2xl font-extrabold text-white mb-1">{metrics.roas.toFixed(2)}x</div>
               </div>

               {/* TACoS */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">TACoS</div>
                  <div className="text-2xl font-extrabold text-white mb-1">{metrics.tacos.toFixed(1)}%</div>
               </div>

               {/* Target ACOS (NEW) */}
               <div className="bg-purple-900/10 border border-purple-900/50 rounded-xl p-4">
                  <div className="text-xs font-bold text-purple-300 uppercase mb-1">Target ACOS</div>
                  <div className="text-2xl font-extrabold text-purple-400 mb-1">{metrics.targetAcos.toFixed(1)}%</div>
               </div>

            </div>

            {/* 2. Profitability Analysis */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <DollarSign className="w-48 h-48 text-white" />
               </div>
               
               <div className="relative z-10">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Net Ad Profit</h3>
                  
                  <div className="flex items-baseline gap-4 mb-4">
                     <span className={`text-5xl font-extrabold ${metrics.netAdProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {metrics.netAdProfit > 0 ? '+' : ''}{fmt(metrics.netAdProfit)}
                     </span>
                     <span className="text-slate-400 text-sm">from paid traffic</span>
                  </div>

                  <div className="w-full bg-slate-950 rounded-lg p-4 border border-slate-800 flex gap-4 text-xs">
                     {metrics.netAdProfit > 0 ? (
                        <p className="text-emerald-400 flex items-center gap-2">
                           <CheckCircle2 className="w-4 h-4" /> 
                           Your ads are generating real profit. Scale up!
                        </p>
                     ) : (
                        <p className="text-red-400 flex items-center gap-2">
                           <AlertTriangle className="w-4 h-4" /> 
                           You are losing money on every ad sale.
                        </p>
                     )}
                  </div>
               </div>
            </div>

            {/* 3. NEW: Bid Optimizer & Funnel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* Funnel Visualizer */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                     <MousePointerClick className="w-4 h-4" /> Ad Funnel
                     

[Image of e-commerce sales funnel]

                  </h3>
                  <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Current Conversion Rate</span>
                          <span className="text-white font-bold">{metrics.conversionRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-px"></div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Clicks needed for 1 Sale</span>
                          <span className="text-white font-bold">{metrics.clicksToSale} clicks</span>
                      </div>
                      <div className="w-full bg-slate-800 h-px"></div>
                      <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-400">Cost Per Acquisition (CPA)</span>
                          <span className="text-white font-mono">{fmt(metrics.cpa)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                         You spend {fmt(metrics.cpa)} in ads to get 1 order.
                      </p>
                  </div>
               </div>

               {/* Intelligent Bidding */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                     <Crosshair className="w-4 h-4" /> Recommended Bids
                  </h3>
                  <div className="space-y-4">
                     <div className="p-3 rounded bg-slate-950 border border-slate-800">
                        <span className="text-[10px] text-slate-500 uppercase block mb-1">Max Safe Bid (Break-Even)</span>
                        <div className="flex justify-between items-end">
                           <span className="text-xl font-bold text-white">₹{metrics.maxSafeBid.toFixed(2)}</span>
                           <span className="text-[10px] text-yellow-500">0% Profit</span>
                        </div>
                     </div>

                     <div className="p-3 rounded bg-purple-900/10 border border-purple-500/30">
                        <span className="text-[10px] text-purple-300 uppercase block mb-1">Golden Bid (Target Profit)</span>
                        <div className="flex justify-between items-end">
                           <span className="text-xl font-bold text-purple-400">₹{metrics.goldenBid.toFixed(2)}</span>
                           <span className="text-[10px] text-purple-300">{targetProfitMargin}% Profit</span>
                        </div>
                     </div>
                     <p className="text-[10px] text-slate-500">
                        Bid <b>₹{metrics.goldenBid.toFixed(2)}</b> to maintain your {targetProfitMargin}% margin goal.
                     </p>
                  </div>
               </div>

            </div>

            {/* 4. NEW: Bid Sensitivity Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">Bid Sensitivity (If Conversion Rate improves...)</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                    {[5, 10, 15, 20].map((cv) => (
                        <div key={cv} className={`p-2 rounded border ${
                            Math.abs(cv - metrics.conversionRate) < 2.5 ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                            <div className="text-[10px] uppercase mb-1">CvR {cv}%</div>
                            <div className="font-mono font-bold text-sm">
                                ₹{((sellingPrice * (cv/100)) * (metrics.targetAcos/100)).toFixed(0)}
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2 text-center">Max bid power increases significantly as conversion rate improves.</p>
            </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-yellow-500" />
              PPC Master Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">ACOS vs. TACoS</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    <b>ACOS</b> checks ad efficiency. <b>TACoS</b> checks business health. 
                    <br/>
                    If ACOS is high but TACoS is low (Below 10%), it means your organic sales are strong enough to support aggressive ads.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The Break-Even Rule</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Your Break-Even ACOS is simply your <b>Profit Margin %</b>. 
                    <br/>
                    If you have 30% margin, you can spend up to 30% of sales on ads without losing money.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-purple-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Crosshair className="w-5 h-5 text-purple-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Golden Bid Strategy</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Don't just bid to break even. Use the new <b>Golden Bid</b> metric to set bids that ensure you keep {targetProfitMargin}% profit in your pocket.
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