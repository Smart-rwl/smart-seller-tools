'use client';

import React, { useState, useEffect } from 'react';
import { 
  Rocket, 
  Flame, 
  Target, 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Swords,
  ChevronRight,
  Trophy,       // NEW
  Timer,        // NEW
  Sprout        // NEW
} from 'lucide-react';

export default function LaunchSimulator() {
  // --- STATE: MARKET TARGET ---
  const [competitorDailySales, setCompetitorDailySales] = useState<number>(30); // Units/day to match
  const [kwSearchVolume, setKwSearchVolume] = useState<number>(5000); // Main keyword volume
  
  // --- STATE: LAUNCH ECONOMICS ---
  const [sellingPrice, setSellingPrice] = useState<number>(25);
  const [launchPrice, setLaunchPrice] = useState<number>(19); // Lower price for launch?
  const [landedCost, setLandedCost] = useState<number>(8);
  const [fbaFees, setFbaFees] = useState<number>(6);
  
  // --- STATE: ADVERTISING ---
  const [targetAcos, setTargetAcos] = useState<number>(80); // High ACOS during launch is normal
  const [cpc, setCpc] = useState<number>(1.50);

  // --- STATE: OUTPUTS ---
  const [metrics, setMetrics] = useState({
    launchDuration: 14, // Days
    unitsRequired: 0,
    totalRevenue: 0,
    totalAdSpend: 0,
    totalCosts: 0,
    burnAmount: 0, // The "Investment" (Loss)
    breakEvenDay: 0,
    velocityScore: 0,
    
    // NEW METRICS
    predictedRank: '',
    paybackDays: 0,
    postLaunchDailyProfit: 0,
    honeymoonEffectiveness: 0,

    status: 'Aggressive' as 'Aggressive' | 'Moderate' | 'Weak'
  });

  // --- ENGINE ---
  useEffect(() => {
    // 1. The CPR (Cerebro Product Rank) Logic
    const duration = 14;
    const dailyTarget = competitorDailySales * 0.8;
    const totalLaunchUnits = Math.ceil(dailyTarget * duration);

    // 2. Financials Calculation
    const revenue = totalLaunchUnits * launchPrice;
    const productCosts = totalLaunchUnits * (landedCost + fbaFees);
    const cpa = launchPrice * (targetAcos / 100);
    const adSpend = totalLaunchUnits * cpa;

    // 3. The "Burn" (Net Loss)
    const netResult = revenue - productCosts - adSpend;
    const burn = netResult < 0 ? Math.abs(netResult) : 0;

    // 4. Velocity Score (0-100)
    let score = (dailyTarget / (kwSearchVolume / 3000)) * 10;
    if (score > 100) score = 100;

    // 5. NEW: Next-Gen Predictions
    
    // A. Rank Prediction
    // Logic: If you match >80% of competitor velocity, you likely hit Top 5.
    // If you match >50%, you hit Page 1 Bottom.
    let rank = "Page 2+";
    if (dailyTarget >= competitorDailySales * 0.9) rank = "Top 3 (Hero)";
    else if (dailyTarget >= competitorDailySales * 0.7) rank = "Top 10";
    else if (dailyTarget >= competitorDailySales * 0.5) rank = "Page 1";

    // B. Post-Launch Profit (The "Payoff")
    // Assuming you stick the landing, you now sell at "Selling Price" with lower ACOS (e.g. 30%)
    // and you get organic sales (free).
    // Let's conservatively assume you keep 80% of the daily sales volume you built up.
    const stabilizedVolume = dailyTarget * 0.8;
    const stabilizedRefFee = sellingPrice * 0.15;
    const stabilizedUnitProfit = sellingPrice - landedCost - fbaFees - stabilizedRefFee;
    // Assuming 50% sales are organic (0 ad spend) and 50% are ads (30% TACOS)
    const blendedAdSpendPerUnit = sellingPrice * 0.15; // 15% Total ACOS
    const netProfitPerUnit = stabilizedUnitProfit - blendedAdSpendPerUnit;
    
    const dailyProfit = stabilizedVolume * netProfitPerUnit;

    // C. Payback Period
    // Days = Total Burn / Daily Profit
    const payback = dailyProfit > 0 ? Math.ceil(burn / dailyProfit) : 999;

    // D. Honeymoon Score
    // Measures how aggressive the launch is relative to search volume
    // High score = Maximizing the "New Release" boost
    const honeymoon = Math.min((dailyTarget / (competitorDailySales + 5)) * 100, 100);

    // 6. Status
    let status: 'Aggressive' | 'Moderate' | 'Weak' = 'Moderate';
    if (targetAcos > 100 || launchPrice < sellingPrice * 0.7) status = 'Aggressive';
    if (targetAcos < 40) status = 'Weak';

    setMetrics({
        launchDuration: duration,
        unitsRequired: totalLaunchUnits,
        totalRevenue: revenue,
        totalAdSpend: adSpend,
        totalCosts: productCosts + adSpend,
        burnAmount: burn,
        breakEvenDay: 0, 
        velocityScore: score,
        // New
        predictedRank: rank,
        paybackDays: payback,
        postLaunchDailyProfit: dailyProfit,
        honeymoonEffectiveness: honeymoon,
        status
    });

  }, [competitorDailySales, kwSearchVolume, sellingPrice, launchPrice, landedCost, fbaFees, targetAcos, cpc]);

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Rocket className="w-8 h-8 text-orange-500" />
              The Launchpad (Next Gen)
            </h1>
            <p className="text-slate-400 mt-2">
              Rank Velocity Simulator. Calculate the "Burn Budget" needed to hit Page 1.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800">
             <Flame className={`w-6 h-6 ${metrics.status === 'Aggressive' ? 'text-red-500' : metrics.status === 'Moderate' ? 'text-orange-400' : 'text-blue-400'}`} />
             <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Launch Intensity</p>
                <div className={`text-xl font-black ${
                    metrics.status === 'Aggressive' ? 'text-red-500' : 
                    metrics.status === 'Moderate' ? 'text-orange-400' : 'text-blue-400'
                }`}>
                    {metrics.status.toUpperCase()}
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Target Data */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-blue-400" /> Ranking Targets
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Competitor Daily Sales</label>
                     <input type="number" value={competitorDailySales} onChange={e => setCompetitorDailySales(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono font-bold focus:border-blue-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-1">Velocity of the Top 3 listing you want to beat.</p>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Main Keyword Volume</label>
                     <input type="number" value={kwSearchVolume} onChange={e => setKwSearchVolume(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* 2. Launch Strategy */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Swords className="w-4 h-4 text-orange-400" /> Attack Strategy
               </h3>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Normal Price</label>
                        <input type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Launch Price</label>
                        <input type="number" value={launchPrice} onChange={e => setLaunchPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-orange-500/50 rounded p-2 text-orange-400 font-bold text-sm outline-none" />
                     </div>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-800">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Max Launch ACOS %</label>
                      <div className="flex items-center gap-2">
                          <input type="range" min="30" max="200" step="5" value={targetAcos} onChange={e => setTargetAcos(Number(e.target.value))} className="w-full accent-orange-500" />
                          <span className="text-orange-400 font-bold text-sm">{targetAcos}%</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                          How much margin are you willing to sacrifice? (100% = Break Even on Rev)
                      </p>
                  </div>
               </div>
            </div>

            {/* 3. Costs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Product Costs
               </h3>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Landed Cost</label>
                       <input type="number" value={landedCost} onChange={e => setLandedCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">FBA Fees</label>
                       <input type="number" value={fbaFees} onChange={e => setFbaFees(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm outline-none" />
                   </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. The Burn Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 relative overflow-hidden shadow-2xl">
               <div className="flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
                  <div className="space-y-2">
                     <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Required Launch Budget</span>
                     <div className="flex items-baseline gap-2">
                         <span className="text-6xl font-black text-white">{fmt(metrics.burnAmount)}</span>
                         <span className="text-sm text-slate-500">investment</span>
                     </div>
                     <p className="text-sm text-slate-400">
                        Total estimated cash burn (Loss) over the first 14 days to secure rank.
                     </p>
                  </div>

                  {/* Velocity Gauge */}
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 text-center min-w-[200px]">
                     <p className="text-xs text-slate-400 uppercase font-bold mb-2">Units to Move</p>
                     <div className="text-4xl font-bold text-white mb-1">
                        {metrics.unitsRequired}
                     </div>
                     <p className="text-[10px] text-slate-500">
                        {Math.ceil(metrics.unitsRequired / 14)} units / day
                     </p>
                  </div>
               </div>
            </div>

            {/* 2. NEW: Post-Launch Horizon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Rank Prediction */}
                <div className="bg-indigo-900/10 border border-indigo-900/50 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="w-24 h-24 text-indigo-500" /></div>
                    <h3 className="text-xs font-bold uppercase text-indigo-400 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Predicted Rank
                    </h3>
                    <div className="space-y-3 relative z-10">
                        <div className="text-3xl font-black text-white">{metrics.predictedRank}</div>
                        <p className="text-xs text-indigo-200/70">
                            Based on your launch velocity matching {metrics.honeymoonEffectiveness.toFixed(0)}% of the competitor's speed.
                        </p>
                        
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-4">
                            <div className="h-full bg-indigo-500" style={{ width: `${metrics.honeymoonEffectiveness}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-500 text-right mt-1">Honeymoon Utilization</p>
                    </div>
                </div>

                {/* Investment Payback */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><Timer className="w-24 h-24 text-emerald-500" /></div>
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-emerald-400" /> Post-Launch Payback
                    </h3>
                    
                    <div className="space-y-4 relative z-10">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Future Daily Profit</span>
                            <span className="text-white font-bold">{fmt(metrics.postLaunchDailyProfit)}</span>
                        </div>
                        <div className="w-full h-px bg-slate-800"></div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Time to Break Even</span>
                            <span className="text-emerald-400 font-bold">{metrics.paybackDays} Days</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">
                            It will take {metrics.paybackDays} days of organic sales to earn back your launch investment.
                        </p>
                    </div>
                </div>

            </div>

            {/* 3. The Launch Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-6 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-400" /> 14-Day Velocity Ramp
                </h3>
                
                <div className="flex items-end gap-1 h-32 border-b border-slate-700 pb-2">
                    {[...Array(14)].map((_, i) => {
                        const day = i + 1;
                        const factor = day < 5 ? 0.5 : day < 10 ? 0.8 : 1.0; 
                        const dailyUnits = Math.ceil((metrics.unitsRequired / 14) * factor * 1.3); 
                        
                        return (
                            <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
                                <div 
                                    className="w-full bg-orange-500/80 rounded-t hover:bg-orange-400 transition-colors"
                                    style={{ height: `${(dailyUnits / (metrics.unitsRequired/10)) * 100}%` }}
                                ></div>
                                <span className="text-[9px] text-slate-600 mt-2">{day}</span>
                                <span className="absolute -top-8 text-[10px] bg-slate-800 px-2 py-1 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    {dailyUnits}u
                                </span>
                            </div>
                        )
                    })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>Day 1 (Warm Up)</span>
                    <span className="text-orange-400 font-bold">The "Honeymoon" Phase</span>
                    <span>Day 14 (Stable)</span>
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