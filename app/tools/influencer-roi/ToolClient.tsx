'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Gift, 
  Share2,
  BookOpen,
  Search,
  MessageSquare,
  Percent, 
  Copy,    
  Video,
  Ghost,   // NEW
  Infinity // NEW
} from 'lucide-react';

export default function InfluencerAuditTool() {
  // --- STATE ---
  
  // 1. Campaign Inputs
  const [influencerFee, setInfluencerFee] = useState<number>(10000);
  const [seedingCost, setSeedingCost] = useState<number>(500); 
  const [followerCount, setFollowerCount] = useState<number>(50000);
  const [estReach, setEstReach] = useState<number>(10); 
  
  // 2. Hybrid Deal Structure
  const [commissionRate, setCommissionRate] = useState<number>(0); 
  const [adUsageFee, setAdUsageFee] = useState<number>(0); 

  // 3. Unit Economics
  const [sellingPrice, setSellingPrice] = useState<number>(1500);
  const [landedCost, setLandedCost] = useState<number>(600);
  const [discountCode, setDiscountCode] = useState<number>(15); 

  // 4. NEW: Advanced "Truth" Inputs
  const [botPercentage, setBotPercentage] = useState<number>(20); // Industry avg is ~20%
  const [ltvMultiplier, setLtvMultiplier] = useState<number>(1.5); // Customers buy 1.5x over life

  // 5. Outputs
  const [metrics, setMetrics] = useState({
    totalCampaignCost: 0,
    profitPerUnit: 0,
    breakEvenUnits: 0,
    targetUnits2x: 0,
    requiredConversion: 0,
    cpm: 0,
    effectiveCpm: 0, // Real cost after removing bots
    affiliatePayout: 0, 
    effectiveMargin: 0,
    
    // NEW METRICS
    lifetimeProfit: 0, // Profit including repeat purchases
    ltvRoi: 0,         // ROI based on LTV
    
    status: 'neutral' as 'safe' | 'risky' | 'impossible'
  });

  // --- CALCULATION ENGINE ---
  useEffect(() => {
    // A. Fixed Costs
    const fixedCost = influencerFee + seedingCost + adUsageFee;
    
    // B. Unit Economics (Day 1)
    const discountedPrice = sellingPrice * (1 - discountCode / 100);
    const commissionAmt = discountedPrice * (commissionRate / 100);
    const margin = discountedPrice - landedCost - commissionAmt;

    // C. Reach Calculation (The "Truth" Filter)
    const rawActiveViewers = followerCount * (estReach / 100);
    const realActiveViewers = rawActiveViewers * (1 - botPercentage / 100);

    // D. Break Even Analysis (Day 1)
    let beUnits = 0;
    let targetUnits = 0;
    let reqConv = 0;
    let status: 'safe' | 'risky' | 'impossible' = 'safe';

    if (margin > 0) {
      beUnits = Math.ceil(fixedCost / margin);
      targetUnits = Math.ceil((fixedCost * 2) / margin); 
      
      // The "Reality Check" (Based on REAL viewers)
      if (realActiveViewers > 0) {
        reqConv = (beUnits / realActiveViewers) * 100;
      }
    } else {
      status = 'impossible'; 
    }

    // Status Logic
    if (status !== 'impossible') {
      if (reqConv > 5) status = 'impossible'; 
      else if (reqConv > 2.5) status = 'risky'; 
      else status = 'safe'; 
    }

    // E. Ad Metrics (CPM)
    const cpm = rawActiveViewers > 0 ? (fixedCost / rawActiveViewers) * 1000 : 0;
    const realCpm = realActiveViewers > 0 ? (fixedCost / realActiveViewers) * 1000 : 0;

    // F. NEW: LTV Analysis
    // Lifetime Profit per Customer = (Margin * LTV Multiplier)
    // Note: We assume commission is paid on repeat orders too (worst case) or just first order.
    // Let's assume standard behavior: Commission only on tracked first order.
    const repeatProfit = (sellingPrice - landedCost) * (ltvMultiplier - 1);
    const totalLifetimeValuePerAcquisition = margin + repeatProfit;
    
    const ltvRoi = (totalLifetimeValuePerAcquisition * beUnits) / fixedCost;

    setMetrics({
      totalCampaignCost: fixedCost,
      profitPerUnit: margin,
      breakEvenUnits: beUnits,
      targetUnits2x: targetUnits,
      requiredConversion: reqConv,
      cpm,
      effectiveCpm: realCpm,
      affiliatePayout: targetUnits * commissionAmt,
      effectiveMargin: margin,
      lifetimeProfit: totalLifetimeValuePerAcquisition,
      ltvRoi,
      status
    });

  }, [influencerFee, seedingCost, followerCount, estReach, sellingPrice, landedCost, discountCode, commissionRate, adUsageFee, botPercentage, ltvMultiplier]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Share2 className="w-8 h-8 text-pink-500" />
              Influencer Deal Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Advanced analysis: Hybrid Deals, Bot Filtering, and LTV Projection.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <div className={`w-3 h-3 rounded-full ${metrics.status === 'safe' ? 'bg-emerald-500' : metrics.status === 'risky' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
             <span className="text-sm font-medium text-slate-300">
                Risk Level: {metrics.status.toUpperCase()}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Campaign Inputs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-pink-400" /> Deal Structure
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Followers</label>
                     <input type="number" value={followerCount} onChange={e => setFollowerCount(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-pink-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Est. Reach %</label>
                     <input type="number" value={estReach} onChange={e => setEstReach(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-pink-500 outline-none" />
                  </div>
                  
                  <div className="h-px bg-slate-800"></div>

                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Flat Fee (₹)</label>
                     <input type="number" value={influencerFee} onChange={e => setInfluencerFee(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-pink-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Commission %</label>
                        <input type="number" value={commissionRate} onChange={e => setCommissionRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-pink-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Seeding Cost</label>
                        <input type="number" value={seedingCost} onChange={e => setSeedingCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-pink-500 outline-none" />
                     </div>
                  </div>
               </div>
            </div>

            {/* 2. Truth Filter (NEW) */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Ghost className="w-4 h-4 text-purple-400" /> The Truth Filter
               </h3>
               <div>
                   <div className="flex justify-between mb-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Estimated Fake/Bots</label>
                      <span className="text-xs text-purple-400 font-bold">{botPercentage}%</span>
                   </div>
                   <input type="range" min="0" max="50" step="5" value={botPercentage} onChange={e => setBotPercentage(Number(e.target.value))} className="w-full accent-purple-500" />
                   <p className="text-[10px] text-slate-500 mt-1">
                      Industry avg is 20-30%. Discounts the reach.
                   </p>
               </div>
            </div>

            {/* 3. LTV (NEW) */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Infinity className="w-4 h-4 text-emerald-400" /> Long Term Value
               </h3>
               <div>
                   <div className="flex justify-between mb-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">LTV Multiplier</label>
                      <span className="text-xs text-emerald-400 font-bold">{ltvMultiplier}x</span>
                   </div>
                   <input type="range" min="1" max="5" step="0.1" value={ltvMultiplier} onChange={e => setLtvMultiplier(Number(e.target.value))} className="w-full accent-emerald-500" />
                   <p className="text-[10px] text-slate-500 mt-1">
                      How many times does a customer buy over their life?
                   </p>
               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Risk Gauge (With Bot Logic) */}
            <div className={`rounded-xl border p-8 flex flex-col md:flex-row gap-8 items-center justify-between ${
               metrics.status === 'safe' ? 'bg-emerald-950/30 border-emerald-900' : 
               metrics.status === 'risky' ? 'bg-yellow-950/30 border-yellow-900' : 
               'bg-red-950/30 border-red-900'
            }`}>
               <div className="space-y-2">
                  <div className="flex items-center gap-2">
                     <Target className={`w-5 h-5 ${
                        metrics.status === 'safe' ? 'text-emerald-400' : 
                        metrics.status === 'risky' ? 'text-yellow-400' : 'text-red-400'
                     }`} />
                     <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Required Conversion Rate</span>
                  </div>
                  <div className="text-5xl font-extrabold text-white">
                     {metrics.requiredConversion.toFixed(2)}%
                  </div>
                  <p className="text-sm text-slate-400">
                     of <b>REAL</b> humans (bots excluded) must buy.
                  </p>
               </div>

               <div className="bg-slate-950/50 p-4 rounded-lg border border-white/10 w-full md:w-64 text-sm leading-relaxed text-slate-300">
                  {metrics.status === 'safe' && <span className="text-emerald-400 font-bold">Good Deal.</span>}
                  {metrics.status === 'risky' && <span className="text-yellow-400 font-bold">High Risk.</span>}
                  {metrics.status === 'impossible' && <span className="text-red-400 font-bold">Impossible.</span>}
                  <br/>
                  After removing {botPercentage}% bots, you need {metrics.requiredConversion.toFixed(1)}% of the remaining audience to convert just to break even.
               </div>
            </div>

            {/* 2. Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">Real vs Vanity CPM</h3>
                  <div className="space-y-3">
                      <div className="flex justify-between">
                          <span className="text-slate-400">Vanity CPM (All Followers):</span>
                          <span className="text-slate-500 line-through">{fmt(metrics.cpm)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-white font-bold">Real CPM (Active Humans):</span>
                          <span className="text-white font-mono font-bold">{fmt(metrics.effectiveCpm)}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-2">
                          This is what you are actually paying to reach real people.
                      </p>
                  </div>
               </div>

               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">Financials (Day 1)</h3>
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                          <span className="text-slate-400">Total Upfront Cost:</span>
                          <span className="text-white">{fmt(metrics.totalCampaignCost)}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-slate-400">Break-Even Units:</span>
                          <span className="text-white font-bold">{metrics.breakEvenUnits}</span>
                      </div>
                      <div className="flex justify-between">
                          <span className="text-slate-400">Margin per Unit:</span>
                          <span className="text-white">{fmt(metrics.effectiveMargin)}</span>
                      </div>
                  </div>
               </div>

            </div>

            {/* 3. NEW: Long Term Value (LTV) Card */}
            <div className="bg-indigo-900/10 border border-indigo-900/30 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Infinity className="w-24 h-24 text-indigo-500" />
                </div>
                <h3 className="text-xs font-bold uppercase text-indigo-400 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> The Long Game
                </h3>
                <div className="grid grid-cols-2 gap-8 relative z-10">
                    <div>
                        <span className="text-xs text-slate-400 block mb-1">Lifetime Profit / Customer</span>
                        <span className="text-2xl font-bold text-white">{fmt(metrics.lifetimeProfit)}</span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-400 block mb-1">Projected LTV ROI</span>
                        <span className="text-2xl font-bold text-indigo-400">{(metrics.ltvRoi * 100).toFixed(0)}%</span>
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-4 max-w-md">
                    Even if you break even on Day 1, with a {ltvMultiplier}x LTV multiplier, this campaign will eventually generate an ROI of {(metrics.ltvRoi * 100).toFixed(0)}% over the customer's lifetime.
                </p>
            </div>

            {/* 4. Strategy Guide */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
               <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">Negotiation Scripts</h3>
               <div className="space-y-3">
                   {metrics.status === 'risky' && (
                       <div className="p-3 bg-slate-950 rounded border border-slate-800">
                           <p className="text-xs text-slate-300 italic">"Our data shows an average reach of {estReach}% for this niche. Based on your fee, we'd need a {metrics.requiredConversion.toFixed(1)}% conversion rate just to break even, which is above industry standard. Can we shift ₹5,000 of the fee into an affiliate commission instead?"</p>
                       </div>
                   )}
                   {metrics.effectiveCpm > 500 && (
                       <div className="p-3 bg-slate-950 rounded border border-slate-800">
                           <p className="text-xs text-slate-300 italic">"We noticed a discrepancy between follower count and average views. Our Effective CPM calculation is coming out to {fmt(metrics.effectiveCpm)}, which is quite high. Would you be open to a performance-based bonus structure?"</p>
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