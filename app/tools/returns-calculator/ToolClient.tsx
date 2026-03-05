'use client';

import React, { useState, useEffect } from 'react';
import { 
  Undo2, 
  Trash2, 
  RefreshCcw, 
  DollarSign, 
  AlertOctagon, 
  TrendingDown, 
  BookOpen, 
  Calculator, 
  PieChart,
  ArrowRight,
  Activity,   
  Layers,     
  Target,
  CalendarRange, // NEW
  Megaphone,     // NEW
  Ghost          // NEW
} from 'lucide-react';

export default function ReturnsIntelligence() {
  // --- STATE: PRODUCT ECONOMICS ---
  const [sellingPrice, setSellingPrice] = useState<number>(2000);
  const [landedCost, setLandedCost] = useState<number>(500); // COGS
  const [fbaFee, setFbaFee] = useState<number>(150); // Shipping/Pick & Pack
  const [referralFeePct, setReferralFeePct] = useState<number>(15);

  // --- STATE: RETURNS SCENARIO ---
  const [returnRate, setReturnRate] = useState<number>(10); // % of orders returned
  const [sellablePct, setSellablePct] = useState<number>(60); // % returns put back in stock
  
  // --- STATE: NEW BUSINESS CONTEXT ---
  const [monthlyVolume, setMonthlyVolume] = useState<number>(500); // Units sold/mo
  const [cpa, setCpa] = useState<number>(200); // Cost Per Acquisition (Ad Spend per Sale)

  // --- STATE: OUTPUTS ---
  const [metrics, setMetrics] = useState({
    referralFee: 0,
    adminFee: 0,
    costOfReturnSellable: 0,
    costOfReturnDamaged: 0,
    weightedCostPerReturn: 0,
    
    // Profit Metrics
    idealProfit: 0, 
    realProfit: 0,  
    profitImpact: 0, 
    
    // Volume Equivalent
    salesEquivalent: 0, 
    
    // Break Even
    maxTolerableReturnRate: 0,

    // NEW: Strategic Metrics
    annualizedLoss: 0,
    marketingWaste: 0, // Ad spend lost on returned units
    priceInflation: 0, // Amount added to price just to cover returns

    status: 'Healthy' as 'Healthy' | 'Caution' | 'Critical'
  });

  // --- ENGINE ---
  useEffect(() => {
    // 1. Base Financials
    const refFee = sellingPrice * (referralFeePct / 100);
    const idealProfit = sellingPrice - landedCost - fbaFee - refFee;

    // 2. Cost of a Return (The Hidden Fees)
    const adminFee = refFee * 0.20; 

    // Scenario A: Sellable
    const costSellable = fbaFee + adminFee;

    // Scenario B: Damaged
    const costDamaged = fbaFee + adminFee + landedCost;

    // 3. Weighted Average Cost per Return
    const damagedPct = 100 - sellablePct;
    const weightedCost = (costSellable * (sellablePct / 100)) + (costDamaged * (damagedPct / 100));

    // 4. "Real" Profit per Unit Sold
    const successfulSales = 100 - returnRate;
    const totalBatchProfit = (successfulSales * idealProfit) - (returnRate * weightedCost);
    const realProfitPerUnit = totalBatchProfit / 100;

    // 5. Impact Analysis
    const profitDrop = idealProfit > 0 ? ((idealProfit - realProfitPerUnit) / idealProfit) * 100 : 0;

    // 6. Sales Equivalent
    const unitsToCoverLoss = idealProfit > 0 ? costDamaged / idealProfit : 0;

    // 7. Break Even
    const breakEvenRate = idealProfit > 0 ? (idealProfit / (idealProfit + weightedCost)) * 100 : 0;

    // 8. NEW: Strategic Calculations
    // Annualized Loss = Returns per month * Cost per Return * 12
    const returnsPerMonth = monthlyVolume * (returnRate / 100);
    const yearlyCashBurn = returnsPerMonth * weightedCost * 12;

    // Marketing Waste = CPA * Returns Per Month
    // You paid for the customer, but they returned it. That CPA is burned.
    const adWaste = returnsPerMonth * cpa;

    // Price Inflation (Subsidy)
    // How much of the selling price exists solely to pay for the returns?
    // Cost of Returns per Unit Sold = (ReturnRate% * WeightedCost)
    const subsidy = (returnRate / 100) * weightedCost;

    // 9. Status
    let status: 'Healthy' | 'Caution' | 'Critical' = 'Healthy';
    if (profitDrop > 30) status = 'Critical';
    else if (profitDrop > 15) status = 'Caution';

    setMetrics({
      referralFee: refFee,
      adminFee,
      costOfReturnSellable: costSellable,
      costOfReturnDamaged: costDamaged,
      weightedCostPerReturn: weightedCost,
      idealProfit,
      realProfit: realProfitPerUnit,
      profitImpact: profitDrop,
      salesEquivalent: unitsToCoverLoss,
      maxTolerableReturnRate: breakEvenRate,
      annualizedLoss: yearlyCashBurn,
      marketingWaste: adWaste,
      priceInflation: subsidy,
      status
    });

  }, [sellingPrice, landedCost, fbaFee, referralFeePct, returnRate, sellablePct, monthlyVolume, cpa]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Undo2 className="w-8 h-8 text-orange-500" />
              Returns Intelligence Engine
            </h1>
            <p className="text-slate-400 mt-2">
              Calculate the "True Cost" of returns and their impact on your bottom line.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <div className={`w-3 h-3 rounded-full ${
                metrics.status === 'Healthy' ? 'bg-emerald-500' : 
                metrics.status === 'Caution' ? 'bg-yellow-500' : 'bg-red-500'
             }`}></div>
             <span className="text-sm font-medium text-slate-300">
                Profit Health: <span className="text-white font-bold">{metrics.status}</span>
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Unit Economics */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Calculator className="w-4 h-4 text-blue-400" /> Unit Economics
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Selling Price</label>
                     <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono font-bold focus:border-blue-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Landed Cost</label>
                        <input type="number" value={landedCost} onChange={e => setLandedCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">FBA Fee</label>
                        <input type="number" value={fbaFee} onChange={e => setFbaFee(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Referral Fee %</label>
                     <input type="number" value={referralFeePct} onChange={e => setReferralFeePct(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* 2. Business Context (NEW) */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-purple-400" /> Business Context
               </h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Monthly Sales</label>
                        <input type="number" value={monthlyVolume} onChange={e => setMonthlyVolume(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">CPA (Ad Spend)</label>
                        <input type="number" value={cpa} onChange={e => setCpa(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                        <p className="text-[9px] text-slate-500 mt-1">Cost to acquire 1 order</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* 3. Returns Profile */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <RefreshCcw className="w-4 h-4 text-orange-400" /> Returns Profile
               </h3>
               <div className="space-y-6">
                  <div>
                     <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Return Rate</label>
                        <span className={`text-xs font-bold ${returnRate > 15 ? 'text-red-400' : 'text-orange-400'}`}>{returnRate}%</span>
                     </div>
                     <input type="range" min="0" max="30" step="0.5" value={returnRate} onChange={e => setReturnRate(Number(e.target.value))} className="w-full accent-orange-500" />
                     <p className="text-[10px] text-slate-500 mt-1">Percentage of orders sent back.</p>
                  </div>

                  <div>
                     <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Sellable vs Damaged</label>
                        <span className="text-xs text-emerald-400 font-bold">{sellablePct}% Sellable</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <input type="range" min="0" max="100" step="5" value={sellablePct} onChange={e => setSellablePct(Number(e.target.value))} className="w-full accent-emerald-500" />
                     </div>
                     <p className="text-[10px] text-slate-500 mt-1">
                        {sellablePct}% go back to stock. <span className="text-red-400">{100-sellablePct}% are total loss (Trash).</span>
                     </p>
                  </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. True Profit Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 relative overflow-hidden shadow-2xl">
               <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                  <div>
                      <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Real Profit / Unit</h2>
                      <div className="flex items-baseline gap-2">
                          <span className={`text-6xl font-black ${metrics.status === 'Critical' ? 'text-red-500' : 'text-white'}`}>
                              {fmt(metrics.realProfit)}
                          </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm">
                          <span className="text-slate-500 strike-through line-through">{fmt(metrics.idealProfit)}</span>
                          <span className="text-red-400 font-bold">-{metrics.profitImpact.toFixed(1)}% Impact</span>
                      </div>
                  </div>
                  
                  {/* Visual Impact */}
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 w-full md:w-72">
                      <div className="space-y-4">
                          <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Sellable Return Cost</span>
                              <span className="text-yellow-400 font-mono">-{fmt(metrics.costOfReturnSellable)}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Damaged Return Cost</span>
                              <span className="text-red-400 font-mono">-{fmt(metrics.costOfReturnDamaged)}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-px"></div>
                          <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-bold">Avg Loss per Return</span>
                              <span className="text-white font-mono font-bold">{fmt(metrics.weightedCostPerReturn)}</span>
                          </div>
                      </div>
                  </div>
               </div>
            </div>

            {/* 2. The "Ghost Economy" (NEW SECTION) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Annualized Loss */}
                <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-20"><CalendarRange className="w-12 h-12 text-red-500" /></div>
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-2">Annual Cash Burn</span>
                    <div className="text-2xl font-black text-white mb-1">{fmt(metrics.annualizedLoss)}</div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                        The total profit you will lose this year due to returns logic alone.
                    </p>
                </div>

                {/* Marketing Waste */}
                <div className="bg-orange-950/20 border border-orange-900/50 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-20"><Megaphone className="w-12 h-12 text-orange-500" /></div>
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-2">Ad Spend Waste</span>
                    <div className="text-2xl font-black text-white mb-1">{fmt(metrics.marketingWaste)}</div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                        Monthly ad spend burned on acquiring customers who returned the item.
                    </p>
                </div>

                {/* Price Inflation */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-10"><Ghost className="w-12 h-12 text-slate-400" /></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Subsidy Pricing</span>
                    <div className="text-2xl font-black text-white mb-1">{fmt(metrics.priceInflation)}</div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                        Amount included in every unit's price purely to cover return costs.
                    </p>
                </div>

            </div>

            {/* 3. The "Hidden Fees" Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* Fee Waterfall */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                   <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                      <PieChart className="w-4 h-4" /> Anatomy of a Return
                   </h3>
                   
                   
                   <div className="space-y-2 mt-3">
                       <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
                           <span className="text-xs text-slate-400">Refund to Customer</span>
                           <span className="text-xs text-white font-mono">{fmt(sellingPrice)}</span>
                       </div>
                       <div className="flex items-center justify-center text-slate-600">
                           <ArrowRight className="w-4 h-4 rotate-90" />
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                           <div className="p-2 rounded bg-red-900/10 border border-red-500/20">
                               <span className="text-[10px] text-red-300 block mb-1">Lost FBA Fee</span>
                               <span className="text-sm text-red-400 font-mono font-bold">-{fmt(fbaFee)}</span>
                           </div>
                           <div className="p-2 rounded bg-orange-900/10 border border-orange-500/20">
                               <span className="text-[10px] text-orange-300 block mb-1">Admin Fee</span>
                               <span className="text-sm text-orange-400 font-mono font-bold">-{fmt(metrics.adminFee)}</span>
                           </div>
                       </div>
                       <p className="text-[10px] text-slate-500 mt-2 text-center">
                           *Amazon keeps FBA fees and charges an Admin fee even if you get the item back.
                       </p>
                   </div>
               </div>

               {/* Sales Equivalent */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                   <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4" /> The Cost of Damage
                   </h3>
                   
                   <div className="text-center py-4">
                       <p className="text-xs text-slate-400 mb-2">To recover the loss from</p>
                       <p className="text-xl text-white font-bold mb-2">1 Damaged Return</p>
                       <p className="text-xs text-slate-400 mb-4">You must sell</p>
                       
                       <div className="inline-block bg-indigo-600 px-4 py-2 rounded-lg text-white font-black text-2xl shadow-lg">
                           {metrics.salesEquivalent.toFixed(1)} Units
                       </div>
                       
                       <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                           One damaged return wipes out the profit from {metrics.salesEquivalent.toFixed(1)} healthy sales. Reducing damage rate is often more profitable than increasing sales.
                       </p>
                   </div>
               </div>

            </div>

            {/* 4. NEW: Sensitivity Matrix & Visual Stack */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Sensitivity Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                        <Activity className="w-4 h-4" /> Profit Sensitivity
                    </h3>
                    <div className="overflow-hidden rounded border border-slate-800">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-950 text-slate-500">
                                <tr>
                                    <th className="p-2">Return Rate</th>
                                    <th className="p-2 text-right">Real Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                <tr className={returnRate <= 5 ? "bg-emerald-900/20" : ""}>
                                    <td className="p-2">Optimistic (5%)</td>
                                    <td className="p-2 text-right font-mono">{fmt(metrics.idealProfit * 0.95 - (0.05 * metrics.weightedCostPerReturn))}</td>
                                </tr>
                                <tr className={returnRate > 5 && returnRate <= 10 ? "bg-blue-900/20" : ""}>
                                    <td className="p-2">Current ({returnRate}%)</td>
                                    <td className="p-2 text-right font-mono font-bold text-white">{fmt(metrics.realProfit)}</td>
                                </tr>
                                <tr className={returnRate > 10 ? "bg-yellow-900/20" : ""}>
                                    <td className="p-2">Pessimistic (15%)</td>
                                    <td className="p-2 text-right font-mono">{fmt(metrics.idealProfit * 0.85 - (0.15 * metrics.weightedCostPerReturn))}</td>
                                </tr>
                                <tr className="bg-red-900/10">
                                    <td className="p-2 text-red-300">Break-Even ({metrics.maxTolerableReturnRate.toFixed(1)}%)</td>
                                    <td className="p-2 text-right font-mono text-red-300">₹0</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Visual Money Flow */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Where does the money go?
                    </h3>
                    <div className="flex h-4 w-full rounded-full overflow-hidden mb-4">
                        {/* COGS */}
                        <div className="h-full bg-slate-600" style={{ width: `${(landedCost/sellingPrice)*100}%` }} title="COGS"></div>
                        {/* Fees */}
                        <div className="h-full bg-indigo-500" style={{ width: `${((fbaFee + metrics.referralFee)/sellingPrice)*100}%` }} title="Fees"></div>
                        {/* Returns Loss */}
                        <div className="h-full bg-red-500" style={{ width: `${((sellingPrice - metrics.realProfit - landedCost - fbaFee - metrics.referralFee)/sellingPrice)*100}%` }} title="Returns Loss"></div>
                        {/* Profit */}
                        <div className="h-full bg-emerald-500" style={{ width: `${(metrics.realProfit/sellingPrice)*100}%` }} title="Profit"></div>
                    </div>
                    
                    <div className="space-y-2 text-[10px]">
                        <div className="flex justify-between">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-600"></div> Product Cost</span>
                            <span className="text-slate-400">{((landedCost/sellingPrice)*100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Amazon Fees</span>
                            <span className="text-slate-400">{(((fbaFee + metrics.referralFee)/sellingPrice)*100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> Lost to Returns</span>
                            <span className="text-red-400">{(((sellingPrice - metrics.realProfit - landedCost - fbaFee - metrics.referralFee)/sellingPrice)*100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between font-bold">
                            <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Net Profit</span>
                            <span className="text-emerald-400">{((metrics.realProfit/sellingPrice)*100).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* 5. Strategy Guide */}
            <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-5 flex gap-4">
               <BookOpen className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
               <div>
                  <h4 className="text-blue-300 font-bold text-sm mb-1">How to fix this?</h4>
                  <ul className="text-xs text-blue-200/70 leading-relaxed list-disc pl-4 space-y-1">
                     <li><b>Improve Packaging:</b> If "Damaged" % is high, spend ₹10 more on a better box. It saves ₹{fmt(metrics.costOfReturnDamaged)} per return.</li>
                     <li><b>Update Listing:</b> If customers return due to "Inaccurate Description", fix your bullets/images.</li>
                     <li><b>Liquidate:</b> Don't pay shipping to get damaged items back. Set "Unfulfillable Settings" to Liquidate/Dispose if item value is low.</li>
                  </ul>
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
    </div>
  );
}