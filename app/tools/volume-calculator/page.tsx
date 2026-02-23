'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Scale, 
  DollarSign, 
  BarChart3, 
  BookOpen, 
  Target,
  MoveHorizontal, // NEW
  Crosshair,      // NEW
  Zap             // NEW
} from 'lucide-react';

export default function SalesVelocitySimulator() {
  // --- STATE ---
  
  // 1. Current State
  const [currentPrice, setCurrentPrice] = useState<number>(1000);
  const [unitCost, setUnitCost] = useState<number>(600);
  const [currentVolume, setCurrentVolume] = useState<number>(100); // Monthly units

  // 2. Strategy
  const [targetPrice, setTargetPrice] = useState<number>(900); // Proposed price drop
  
  // 3. NEW: Market Sensitivity (Elasticity)
  const [elasticity, setElasticity] = useState<number>(1.5); // 1.5 is standard e-commerce elasticity

  // 4. Outputs
  const [metrics, setMetrics] = useState({
    currentMargin: 0,
    newMargin: 0,
    profitGap: 0,
    requiredVolume: 0,
    volumeIncreasePct: 0,
    
    // NEW METRICS
    predictedVolume: 0,
    predictedIncreasePct: 0,
    predictedTotalProfit: 0,
    currentTotalProfit: 0,
    netProfitChange: 0,
    
    status: 'safe' as 'safe' | 'risky' | 'impossible'
  });

  // --- ENGINE ---
  useEffect(() => {
    // A. Current Economics
    const currMargin = currentPrice - unitCost;
    const totalCurrProfit = currMargin * currentVolume;

    // B. New Economics
    const newMargin = targetPrice - unitCost;
    
    // C. Break Even Volume Logic (EXISTING)
    let reqVol = 0;
    let increasePct = 0;
    let status: 'safe' | 'risky' | 'impossible' = 'safe';

    if (newMargin <= 0) {
      status = 'impossible'; // Losing money per unit
    } else {
      reqVol = Math.ceil(totalCurrProfit / newMargin);
      increasePct = currentVolume > 0 ? ((reqVol - currentVolume) / currentVolume) * 100 : 0;

      // Risk Analysis
      if (increasePct > 100) status = 'impossible'; 
      else if (increasePct > 30) status = 'risky'; 
      else status = 'safe'; 
    }

    // D. NEW: Predictive Modeling (The "Likely" Outcome)
    // Elasticity Formula: % Change Qty = Elasticity * % Change Price
    const priceChangePct = currentPrice > 0 ? Math.abs((currentPrice - targetPrice) / currentPrice) : 0;
    
    // If price drops, volume goes UP (Positive impact)
    // If price rises, volume goes DOWN (Negative impact)
    const isPriceDrop = targetPrice < currentPrice;
    const predictedLiftPct = priceChangePct * elasticity; // e.g. 10% drop * 1.5 elasticity = 15% lift
    
    let predVol = 0;
    if (isPriceDrop) {
        predVol = Math.ceil(currentVolume * (1 + predictedLiftPct));
    } else {
        predVol = Math.floor(currentVolume * (1 - predictedLiftPct));
    }

    const predProfit = predVol * newMargin;
    const profitDelta = predProfit - totalCurrProfit;

    setMetrics({
      currentMargin: currMargin,
      newMargin: newMargin,
      profitGap: currMargin - newMargin,
      requiredVolume: reqVol,
      volumeIncreasePct: increasePct,
      // New
      predictedVolume: predVol,
      predictedIncreasePct: isPriceDrop ? predictedLiftPct * 100 : -predictedLiftPct * 100,
      predictedTotalProfit: predProfit,
      currentTotalProfit: totalCurrProfit,
      netProfitChange: profitDelta,
      status
    });

  }, [currentPrice, unitCost, currentVolume, targetPrice, elasticity]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Scale className="w-8 h-8 text-indigo-500" />
              Sales Velocity Simulator
            </h1>
            <p className="text-slate-400 mt-2">
              Calculate the sales volume increase needed to justify a price drop.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <Target className="w-4 h-4 text-blue-500" />
             <span className="text-sm font-medium text-slate-300">
                Strategy Risk: <span className={metrics.status === 'safe' ? 'text-emerald-400' : 'text-red-400 uppercase'}>{metrics.status}</span>
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Baseline */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-blue-400" /> Current Baseline
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Current Price</label>
                     <input type="number" value={currentPrice} onChange={e => setCurrentPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unit Cost (Landed)</label>
                     <input type="number" value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Monthly Sales (Units)</label>
                     <input type="number" value={currentVolume} onChange={e => setCurrentVolume(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* 2. Strategy */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <TrendingDown className="w-4 h-4 text-emerald-400" /> Proposed Strategy
               </h3>
               
               <div className="space-y-6">
                   <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">New Target Price</label>
                     <input type="number" value={targetPrice} onChange={e => setTargetPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-emerald-500/50 rounded p-3 text-emerald-400 font-bold text-lg focus:border-emerald-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-2">
                        {targetPrice < currentPrice ? `Price Drop of ${fmt(currentPrice - targetPrice)}` : `Price Hike of ${fmt(targetPrice - currentPrice)}`}
                     </p>
                   </div>

                   {/* NEW: Elasticity Slider */}
                   <div>
                       <div className="flex justify-between mb-2">
                          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                              <MoveHorizontal className="w-3 h-3" /> Market Elasticity
                          </label>
                          <span className="text-white font-bold">{elasticity.toFixed(1)}x</span>
                       </div>
                       <input 
                          type="range" min="0.5" max="3.0" step="0.1" 
                          value={elasticity} onChange={e => setElasticity(Number(e.target.value))} 
                          className="w-full accent-blue-500" 
                       />
                       <p className="text-[10px] text-slate-500 mt-2">
                          How sensitive are buyers? (1.0 = Normal, 2.0 = Very Sensitive to price changes)
                       </p>
                   </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Break Even Analysis (EXISTING) */}
            <div className={`rounded-xl border p-8 shadow-2xl relative overflow-hidden ${
               metrics.status === 'impossible' ? 'bg-red-950/30 border-red-900' : 'bg-slate-900 border-slate-800'
            }`}>
               <div className="flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
                  <div className="space-y-2">
                     <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Required Break-Even Volume</span>
                     <div className="text-6xl font-extrabold text-white">
                        {metrics.requiredVolume} <span className="text-2xl font-medium text-slate-400">units</span>
                     </div>
                     <p className="text-sm text-slate-400">
                        To maintain current total profit of {fmt(metrics.currentTotalProfit)}.
                     </p>
                  </div>

                  {/* Growth Meter */}
                  <div className="bg-slate-950/50 p-6 rounded-xl border border-white/10 text-center min-w-[200px]">
                     <p className="text-xs text-slate-400 uppercase font-bold mb-2">Sales Lift Needed</p>
                     <div className={`text-3xl font-bold ${metrics.volumeIncreasePct > 50 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {metrics.volumeIncreasePct > 0 ? '+' : ''}{metrics.volumeIncreasePct.toFixed(0)}%
                     </div>
                  </div>
               </div>
            </div>

            {/* 2. NEW: Predictive Forecast Card */}
            <div className="bg-indigo-900/10 border border-indigo-900/50 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Crosshair className="w-24 h-24 text-indigo-500" />
                </div>
                
                <h3 className="text-xs font-bold uppercase text-indigo-400 mb-6 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Predictive Forecast
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                    <div>
                        <span className="text-xs text-slate-400 block mb-1">Predicted Volume</span>
                        <span className="text-2xl font-bold text-white">{metrics.predictedVolume} units</span>
                        <p className="text-[10px] text-slate-500 mt-1">Based on {elasticity}x elasticity</p>
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 block mb-1">Predicted Total Profit</span>
                        <span className={`text-2xl font-bold ${metrics.netProfitChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {fmt(metrics.predictedTotalProfit)}
                        </span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 block mb-1">Net Outcome</span>
                        <div className={`px-3 py-1 rounded border inline-block text-sm font-bold ${
                            metrics.netProfitChange >= 0 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-red-500/20 border-red-500 text-red-400'
                        }`}>
                            {metrics.netProfitChange >= 0 ? '+' : ''}{fmt(metrics.netProfitChange)} / mo
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Profit Analysis (EXISTING + ENHANCED) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                     <DollarSign className="w-4 h-4" /> Margin Compression
                  </h3>
                  <div className="flex items-center gap-4">
                     <div>
                        <p className="text-xs text-slate-400">Old Margin</p>
                        <p className="text-xl font-mono text-white">{fmt(metrics.currentMargin)}</p>
                     </div>
                     <TrendingDown className="w-5 h-5 text-red-500" />
                     <div>
                        <p className="text-xs text-slate-400">New Margin</p>
                        <p className="text-xl font-mono text-white">{fmt(metrics.newMargin)}</p>
                     </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 bg-slate-950 p-2 rounded">
                     You lose <b>{fmt(metrics.profitGap)}</b> profit on every single unit sold.
                  </p>
               </div>

               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                     <BarChart3 className="w-4 h-4" /> Feasibility Check
                  </h3>
                  {metrics.predictedVolume >= metrics.requiredVolume ? (
                      <div className="text-emerald-400 text-sm">
                         <p className="font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Green Light</p>
                         <p className="mt-2 opacity-80">
                             Market demand (Predicted +{metrics.predictedIncreasePct.toFixed(0)}%) exceeds your Break-Even requirement (+{metrics.volumeIncreasePct.toFixed(0)}%).
                             <br/><b>This price drop is profitable.</b>
                         </p>
                      </div>
                  ) : (
                      <div className="text-red-400 text-sm">
                         <p className="font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Red Light</p>
                         <p className="mt-2 opacity-80">
                             You need +{metrics.volumeIncreasePct.toFixed(0)}% sales, but the market will likely only give you +{metrics.predictedIncreasePct.toFixed(0)}%.
                             <br/><b>You will likely lose money.</b>
                         </p>
                      </div>
                  )}
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