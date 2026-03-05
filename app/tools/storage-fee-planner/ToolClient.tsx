'use client';

import React, { useState, useEffect } from 'react';
import { 
  Archive, 
  Calendar, 
  AlertTriangle, 
  DollarSign, 
  Box, 
  BookOpen, 
  ArrowRight, 
  TrendingUp, 
  Snowflake,
  Timer,       // NEW
  Scale,       // NEW
  Trash2       // NEW
} from 'lucide-react';

const CM3_TO_FT3 = 28316.8; 

export default function WarehouseCostAnalyzer() {
  // --- STATE ---
  
  // 1. Product Data
  const [length, setLength] = useState<number>(20);
  const [width, setWidth] = useState<number>(10);
  const [height, setHeight] = useState<number>(5);
  const [units, setUnits] = useState<number>(500);

  // 1.5 NEW: Financial Context (For ROI Calc)
  const [sellingPrice, setSellingPrice] = useState<number>(1200);
  const [landedCost, setLandedCost] = useState<number>(400); // Product + Shipping cost
  const [removalCostPerUnit, setRemovalCostPerUnit] = useState<number>(10); // Cost to remove/dispose 1 unit

  // 2. Fee Config
  const [baseRate, setBaseRate] = useState<number>(45); // e.g. ₹45/ft3 (Standard)
  const [peakRate, setPeakRate] = useState<number>(150); // e.g. ₹150/ft3 (Oct-Dec)
  const [ltsfRate, setLtsfRate] = useState<number>(600); // e.g. ₹600/ft3 (Aged)

  // 3. Output
  const [metrics, setMetrics] = useState({
    unitVolFt: 0,
    totalVolFt: 0,
    monthlyStandard: 0,
    monthlyPeak: 0,
    potentialLTSF: 0,
    annualCost: 0,
    status: 'efficient' as 'efficient' | 'heavy',
    // NEW METRICS
    totalProfitAtRisk: 0,
    timeToZeroProfit: 0, // Months until profit is eaten
    valueDensity: 0,     // Profit per cubic foot
    removalVerdict: 'Hold', // Hold vs Liquidate
    removalSavings: 0
  });

  // --- ENGINE ---
  useEffect(() => {
    // A. Volume Calculation
    const volCm = length * width * height;
    const volFt = volCm / CM3_TO_FT3;
    const totalFt = volFt * units;

    // B. Cost Projections
    const costStd = totalFt * baseRate;
    const costPeak = totalFt * peakRate;
    const costLtsf = totalFt * ltsfRate; // Penalty if aged

    // C. Annual Cost (Assuming 9 months std, 3 months peak)
    const annual = (costStd * 9) + (costPeak * 3);

    let status: 'efficient' | 'heavy' = 'efficient';
    if (volFt > 0.1) status = 'heavy'; // Large item warning

    // D. NEW: Advanced Economics
    const unitProfit = sellingPrice - landedCost;
    const totalBatchProfit = unitProfit * units;
    
    // "Death Date": Total Profit / Monthly Burn Rate (Standard)
    const monthsToBurn = costStd > 0 ? totalBatchProfit / costStd : 999;

    // Value Density: How much profit does 1 cubic foot of this product generate?
    // High is good. Low means you are storing "Air".
    const valDensity = totalFt > 0 ? totalBatchProfit / totalFt : 0;

    // Liquidation Verdict: Is LTSF Cost > Removal Cost?
    const totalRemovalCost = units * removalCostPerUnit;
    const verdict = costLtsf > totalRemovalCost ? 'LIQUIDATE' : 'HOLD';
    const savings = Math.abs(costLtsf - totalRemovalCost);

    setMetrics({
      unitVolFt: volFt,
      totalVolFt: totalFt,
      monthlyStandard: costStd,
      monthlyPeak: costPeak,
      potentialLTSF: costLtsf,
      annualCost: annual,
      status,
      totalProfitAtRisk: totalBatchProfit,
      timeToZeroProfit: monthsToBurn,
      valueDensity: valDensity,
      removalVerdict: verdict,
      removalSavings: savings
    });

  }, [length, width, height, units, baseRate, peakRate, ltsfRate, sellingPrice, landedCost, removalCostPerUnit]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Archive className="w-8 h-8 text-indigo-500" />
              Warehouse Cost Analyzer
            </h1>
            <p className="text-slate-400 mt-2">
              Predict storage fees, peak season surges, and calculate inventory "Death Dates".
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
             <Box className="w-4 h-4 text-emerald-500" />
             <span>Total Volume: {metrics.totalVolFt.toFixed(2)} ft³</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Dimensions */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Box className="w-4 h-4 text-blue-400" /> Product Specs
               </h3>
               
               <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">L (cm)</label>
                        <input type="number" value={length} onChange={e => setLength(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center focus:border-blue-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">W (cm)</label>
                        <input type="number" value={width} onChange={e => setWidth(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center focus:border-blue-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">H (cm)</label>
                        <input type="number" value={height} onChange={e => setHeight(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-center focus:border-blue-500 outline-none" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Total Units Stocked</label>
                     <input type="number" value={units} onChange={e => setUnits(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* 2. NEW: Financials */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Scale className="w-4 h-4 text-purple-400" /> Unit Economics
               </h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Selling Price</label>
                        <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Product Cost</label>
                        <input type="number" value={landedCost} onChange={e => setLandedCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Removal Fee (per unit)</label>
                     <input type="number" value={removalCostPerUnit} onChange={e => setRemovalCostPerUnit(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-purple-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-1">Cost to ship back to you (approx ₹10-30)</p>
                  </div>
               </div>
            </div>

            {/* 3. Rate Card */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Fee Rates (per ft³)
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Standard Month (Jan-Sep)</label>
                     <input type="number" value={baseRate} onChange={e => setBaseRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Peak Season (Oct-Dec)</label>
                     <input type="number" value={peakRate} onChange={e => setPeakRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-red-400 uppercase mb-1 block">LTSF Penalty (365+ Days)</label>
                     <input type="number" value={ltsfRate} onChange={e => setLtsfRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-red-500 outline-none" />
                  </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: PROJECTIONS (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Monthly Liability */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Calendar className="w-24 h-24 text-white" /></div>
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Standard Monthly Fee</h3>
                  <div className="text-4xl font-extrabold text-white mb-1">{fmt(metrics.monthlyStandard)}</div>
                  <p className="text-[10px] text-slate-400">Total volume x Base Rate</p>
               </div>

               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><Snowflake className="w-24 h-24 text-blue-300" /></div>
                  <h3 className="text-xs font-bold uppercase text-blue-300 mb-2">Peak Season Fee</h3>
                  <div className="text-4xl font-extrabold text-blue-200 mb-1">{fmt(metrics.monthlyPeak)}</div>
                  <p className="text-[10px] text-slate-400">Triples during Q4 (Oct-Dec)</p>
               </div>

            </div>

            {/* 2. NEW: Inventory "Death Date" Analysis */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 relative overflow-hidden">
                <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                    <div>
                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-2">
                            <Timer className="w-4 h-4" /> Break-Even Time
                        </h3>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-5xl font-black ${metrics.timeToZeroProfit < 6 ? 'text-red-500' : 'text-white'}`}>
                                {metrics.timeToZeroProfit.toFixed(1)}
                            </span>
                            <span className="text-lg text-slate-400 font-medium">Months</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 max-w-sm">
                            If you don't sell this stock within {metrics.timeToZeroProfit.toFixed(1)} months, your storage fees will exceed your total potential profit.
                        </p>
                    </div>
                    
                    <div className="h-16 w-px bg-slate-800 hidden md:block"></div>

                    <div>
                        <h3 className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-2">
                            <Scale className="w-4 h-4" /> Value Density
                        </h3>
                        <div className="text-2xl font-bold text-white mb-1">
                            {fmt(metrics.valueDensity)} <span className="text-sm text-slate-500 font-normal">/ ft³</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                            High density = Efficient. Low density = You are paying to store air.
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. NEW: The Liquidation Matrix */}
            <div className={`rounded-xl border p-6 flex flex-col md:flex-row items-center justify-between gap-6 ${
                metrics.removalVerdict === 'LIQUIDATE' ? 'bg-red-950/20 border-red-900' : 'bg-emerald-950/20 border-emerald-900'
            }`}>
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full ${metrics.removalVerdict === 'LIQUIDATE' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                        {metrics.removalVerdict === 'LIQUIDATE' ? <Trash2 className="w-6 h-6" /> : <Archive className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Verdict: {metrics.removalVerdict}</h3>
                        <p className="text-xs text-slate-400">Comparing Aged Penalty vs. Removal Cost</p>
                    </div>
                </div>
                
                <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                        {metrics.removalVerdict === 'LIQUIDATE' ? 'Potential Savings' : 'Cost Difference'}
                    </p>
                    <p className={`text-2xl font-mono font-bold ${metrics.removalVerdict === 'LIQUIDATE' ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {fmt(metrics.removalSavings)}
                    </p>
                </div>
            </div>

            {/* 4. Strategy Guide */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
               <div className="flex items-center gap-2 mb-4">
                   <BookOpen className="w-5 h-5 text-indigo-500" />
                   <h3 className="font-bold text-white">Storage Strategy</h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                       <h4 className="text-sm font-bold text-slate-300 mb-1">Standard vs. Peak</h4>
                       <p className="text-xs text-slate-500 leading-relaxed">
                           Amazon charges <b>~3x more</b> in Oct-Dec. If your "Time to Zero Profit" is less than 4 months, do NOT send this stock in for Q4 unless you are sure it will sell immediately.
                       </p>
                   </div>
                   <div>
                       <h4 className="text-sm font-bold text-red-300 mb-1">The 365-Day Cliff</h4>
                       <p className="text-xs text-slate-500 leading-relaxed">
                           
                           Once stock hits 365 days, the monthly fee jumps 10x. It is almost always cheaper to create a "Removal Order" (₹10/unit) than to pay the Long-Term Storage Fee.
                       </p>
                   </div>
               </div>
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