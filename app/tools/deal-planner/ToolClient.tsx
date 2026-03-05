'use client';

import React, { useState, useEffect } from 'react';
import { 
  Percent, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Tag, 
  BookOpen,
  Zap,
  BarChart3,
  ArrowUpRight, // NEW
  Scale         // NEW
} from 'lucide-react';

type SimulationRow = {
  discountPct: number;
  dealPrice: number;
  refFee: number;
  netProfit: number;
  margin: number;
  roi: number;
  dealType: string;
  // NEW FIELDS
  breakEvenLift: number; // % increase in sales needed
  riskLevel: 'Safe' | 'Moderate' | 'High' | 'Extreme';
};

export default function PromotionSimulator() {
  // --- STATE ---
  const [sellingPrice, setSellingPrice] = useState<number>(2000);
  
  // Costs
  const [landedCost, setLandedCost] = useState<number>(600); // COGS + Shipping + FBA Fixed
  const [referralFeePct, setReferralFeePct] = useState<number>(15); // Amazon Fee %
  const [gstRate, setGstRate] = useState<number>(18); // GST on Fees/Price

  const [simulations, setSimulations] = useState<SimulationRow[]>([]);

  // --- ENGINE ---
  useEffect(() => {
    // 1. Calculate BASELINE (0% discount) for comparison
    const baseNewPrice = sellingPrice;
    const baseRefFee = baseNewPrice * (referralFeePct / 100);
    const baseTaxBase = baseNewPrice / (1 + gstRate / 100);
    const baseTaxAmount = baseNewPrice - baseTaxBase;
    const baseProfit = baseNewPrice - baseTaxAmount - landedCost - baseRefFee;

    const rows: SimulationRow[] = [];

    // Simulate discounts from 0% to 80%
    for (let d = 0; d <= 80; d += 5) {
      // 1. New Price
      const newPrice = sellingPrice * (1 - d / 100);
      
      // 2. Variable Fees (Depend on New Price)
      const refFee = newPrice * (referralFeePct / 100);
      
      // 3. Tax (GST on Price is standard in India, usually inclusive)
      const basePrice = newPrice / (1 + gstRate / 100);
      const taxAmount = newPrice - basePrice;

      // 4. Profit
      const profit = newPrice - taxAmount - landedCost - refFee;
      
      // 5. Metrics
      const margin = newPrice > 0 ? (profit / newPrice) * 100 : 0;
      const roi = landedCost > 0 ? (profit / landedCost) * 100 : 0;

      // 6. Deal Type Identification
      let type = 'Standard Price';
      if (d >= 5 && d < 15) type = 'Coupon / Voucher';
      if (d >= 15 && d < 20) type = 'Prime Exclusive';
      if (d >= 20 && d < 40) type = 'Lightning Deal (LD)';
      if (d >= 40 && d < 60) type = '7-Day Deal (BD)';
      if (d >= 60) type = 'Liquidation / Clearance';
      if (d === 0) type = 'Organic Sales';

      // 7. NEW: Break-Even Sales Lift Calculation
      // Formula: Required Lift % = (Base Margin % - Deal Margin %) / Deal Margin %
      // OR simpler: (Base Profit - Deal Profit) / Deal Profit
      let lift = 0;
      if (profit > 0 && baseProfit > 0) {
          lift = ((baseProfit - profit) / profit) * 100;
      } else if (profit <= 0) {
          lift = 9999; // Infinite lift needed
      }

      // 8. NEW: Risk Assessment
      let risk: 'Safe' | 'Moderate' | 'High' | 'Extreme' = 'Safe';
      if (lift > 300) risk = 'Extreme';
      else if (lift > 100) risk = 'High';
      else if (lift > 40) risk = 'Moderate';

      rows.push({
        discountPct: d,
        dealPrice: newPrice,
        refFee,
        netProfit: profit,
        margin,
        roi,
        dealType: type,
        breakEvenLift: lift,
        riskLevel: risk
      });
    }
    setSimulations(rows);
  }, [sellingPrice, landedCost, referralFeePct, gstRate]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-500" />
              Promotion Profitability Simulator
            </h1>
            <p className="text-slate-400 mt-2">
              Forecast net margins & required sales velocity for Lightning Deals & Clearance.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <Scale className="w-4 h-4 text-slate-400" />
             <span className="text-sm font-medium text-slate-300">Live Volume Analysis</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Economics Config
               </h3>
               
               <div className="space-y-5">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Regular Selling Price</label>
                     <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold text-lg focus:border-emerald-500 outline-none" />
                  </div>

                  <div className="h-px bg-slate-800 my-2"></div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fixed Costs (Landed)</label>
                     <input type="number" value={landedCost} onChange={e => setLandedCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-1">Product Cost + Shipping + FBA Fixed Fee</p>
                  </div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Variable Referral Fee (%)</label>
                     <input type="number" value={referralFeePct} onChange={e => setReferralFeePct(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-1">Amazon category fee (e.g. 15% for Home)</p>
                  </div>
                  
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">GST Rate (%)</label>
                     <select value={gstRate} onChange={e => setGstRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none">
                        <option value={0}>0% (Exempt)</option>
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18% (Standard)</option>
                        <option value={28}>28%</option>
                     </select>
                  </div>
               </div>
            </div>

            <div className="bg-indigo-900/20 border border-indigo-900/50 p-5 rounded-xl">
               <h4 className="text-indigo-300 font-bold text-sm mb-2 flex items-center gap-2">
                   <ArrowUpRight className="w-4 h-4" /> The "Volume Trap"
               </h4>
               <p className="text-xs text-indigo-200/70 leading-relaxed">
                  Look at the new <b>Req. Lift</b> column. <br/><br/>
                  If it says <b>+100%</b>, you must sell <b>DOUBLE</b> the units just to make the same total profit you make today. Don't discount unless you are sure you can hit that volume!
               </p>
            </div>
          </div>

          {/* --- RIGHT: SIMULATION TABLE (8 Cols) --- */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
               <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-400">
                     <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
                        <tr>
                           <th className="px-4 py-3">Deal Type</th>
                           <th className="px-4 py-3">Discount</th>
                           <th className="px-4 py-3">Price</th>
                           <th className="px-4 py-3">Profit</th>
                           <th className="px-4 py-3">ROI</th>
                           {/* NEW COLUMN HEADERS */}
                           <th className="px-4 py-3 text-right">Req. Lift</th>
                           <th className="px-4 py-3 text-right">Status</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                        {simulations.map((row) => (
                           <tr key={row.discountPct} className={`hover:bg-slate-800/50 transition ${row.dealType === 'Organic Sales' ? 'bg-slate-800/30' : ''}`}>
                              <td className="px-4 py-3">
                                 <div className="flex items-center gap-2">
                                    {row.discountPct >= 20 && row.discountPct < 60 && <Zap className="w-3 h-3 text-yellow-500" />}
                                    {row.discountPct >= 60 && <Tag className="w-3 h-3 text-red-400" />}
                                    <span className="text-xs font-medium text-slate-300">{row.dealType}</span>
                                 </div>
                              </td>
                              <td className="px-4 py-3 font-mono">
                                 {row.discountPct}%
                              </td>
                              <td className="px-4 py-3 font-mono text-white">
                                 {fmt(row.dealPrice)}
                              </td>
                              <td className={`px-4 py-3 font-bold ${row.netProfit > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                                 {fmt(row.netProfit)}
                              </td>
                              <td className="px-4 py-3 font-mono">
                                 {row.roi.toFixed(0)}%
                              </td>
                              
                              {/* NEW: Required Sales Lift */}
                              <td className="px-4 py-3 text-right">
                                  {row.discountPct === 0 ? (
                                      <span className="text-slate-600">-</span>
                                  ) : (
                                      <span className={`font-mono font-bold ${
                                          row.breakEvenLift > 100 ? 'text-red-400' : 
                                          row.breakEvenLift > 40 ? 'text-orange-400' : 'text-blue-400'
                                      }`}>
                                          +{row.breakEvenLift > 2000 ? '>2000' : row.breakEvenLift.toFixed(0)}%
                                      </span>
                                  )}
                              </td>

                              <td className="px-4 py-3 text-right">
                                 {row.netProfit > 0 ? (
                                    row.roi > 30 && row.riskLevel === 'Safe' ? (
                                       <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                                          <CheckCircle2 className="w-3 h-3" /> GREAT
                                       </span>
                                     ) : row.riskLevel === 'Extreme' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">
                                            TRAP
                                        </span>
                                     ) : (
                                       <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">
                                          OK
                                       </span>
                                     )
                                 ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400 text-[10px] font-bold border border-red-500/20">
                                       <AlertTriangle className="w-3 h-3" /> LOSS
                                    </span>
                                 )}
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          </div>
        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              Deal Strategy Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-yellow-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-yellow-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Lightning Deals (LD)</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Amazon usually requires a minimum <b>20% discount</b> off the lowest price in the last 30 days.
                    <br/><br/>
                    <b>When to use:</b> Use LDs to spike sales velocity.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-red-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <ArrowUpRight className="w-5 h-5 text-red-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The Volume Trap</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Look at the <b>Req. Lift</b> column. If it says <b>+100%</b>, you need to double your sales just to make the same money. If you usually sell 10 units/day, you MUST sell 20 units/day during the deal to break even.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingDown className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The Profit Cliff</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Watch the <b>ROI column</b> carefully. Once ROI drops below 30%, you are at risk. One return or damaged unit could wipe out the profit from 5 successful sales.
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