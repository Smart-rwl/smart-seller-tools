'use client';

import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  ShieldAlert, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Flag,
  BookOpen,
  Scale,
  Zap
} from 'lucide-react';

export default function CompetitiveIntelligenceEngine() {
  // --- STATE ---
  
  // 1. My Economics
  const [landedCost, setLandedCost] = useState<number>(300);
  const [shippingCost, setShippingCost] = useState<number>(70);
  const [referralFeePct, setReferralFeePct] = useState<number>(15);
  const [minMarginGoal, setMinMarginGoal] = useState<number>(10); // Minimum Acceptable Margin %

  // 2. Competitor Intel
  const [competitorPrice, setCompetitorPrice] = useState<number>(550);

  // 3. Outputs
  const [metrics, setMetrics] = useState({
    breakEvenPrice: 0,
    minViablePrice: 0,
    profitAtMatch: 0,
    marginAtMatch: 0,
    status: 'safe' as 'safe' | 'warning' | 'danger',
    recommendation: '',
    counterStrikePrice: 0
  });

  // --- ENGINE ---
  useEffect(() => {
    // A. Break Even (Zero Profit)
    // Price - (Price * Fee%) - Cost - Ship = 0
    // Price * (1 - Fee%) = Cost + Ship
    // Price = (Cost + Ship) / (1 - Fee%)
    const totalCost = landedCost + shippingCost;
    const feeDec = referralFeePct / 100;
    
    const bePrice = totalCost / (1 - feeDec);

    // B. Minimum Viable Price (To keep Min Margin Goal)
    // Price - (Price * Fee%) - Cost - Ship = Price * MinMargin%
    // Price * (1 - Fee% - MinMargin%) = Cost + Ship
    // Price = (Cost + Ship) / (1 - Fee% - MinMargin%)
    const minMarginDec = minMarginGoal / 100;
    const mvPrice = totalCost / (1 - feeDec - minMarginDec);

    // C. Scenario: Matching Competitor
    const compFee = competitorPrice * feeDec;
    const profitMatch = competitorPrice - totalCost - compFee;
    const marginMatch = competitorPrice > 0 ? (profitMatch / competitorPrice) * 100 : 0;

    // D. Counter Strike Strategy (Undercut by small amount or match)
    // If safe, undercut by 1-5 rupees or cents to win buy box
    const counterPrice = competitorPrice - 5; 

    // E. Status Logic
    let status: 'safe' | 'warning' | 'danger' = 'safe';
    let rec = '';

    if (profitMatch < 0) {
      status = 'danger';
      rec = 'DO NOT MATCH. You will lose money on every sale. Let them stock out.';
    } else if (marginMatch < minMarginGoal) {
      status = 'warning';
      rec = `Technically profitable, but below your ${minMarginGoal}% goal. Proceed with caution.`;
    } else {
      status = 'safe';
      rec = 'Safe to match or undercut. You have healthy margin buffer.';
    }

    setMetrics({
      breakEvenPrice: bePrice,
      minViablePrice: mvPrice,
      profitAtMatch: profitMatch,
      marginAtMatch: marginMatch,
      status,
      recommendation: rec,
      counterStrikePrice: counterPrice
    });

  }, [landedCost, shippingCost, referralFeePct, minMarginGoal, competitorPrice]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Swords className="w-8 h-8 text-red-500" />
              Price War Intelligence
            </h1>
            <p className="text-slate-400 mt-2">
              Analyze competitor pricing threats and determine your "Walk Away" point.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <Flag className={`w-4 h-4 ${metrics.status === 'safe' ? 'text-emerald-500' : 'text-red-500'}`} />
             <span className="text-sm font-medium text-slate-300">
                Action: <span className={metrics.status === 'safe' ? 'text-emerald-400' : metrics.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}>{metrics.status.toUpperCase()}</span>
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. My Economics */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-blue-400" /> My Cost Structure
               </h3>
               
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Landed Cost</label>
                        <input type="number" value={landedCost} onChange={e => setLandedCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Shipping</label>
                        <input type="number" value={shippingCost} onChange={e => setShippingCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                     </div>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Referral Fee %</label>
                     <input type="number" value={referralFeePct} onChange={e => setReferralFeePct(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Min Margin Goal %</label>
                     <input type="number" value={minMarginGoal} onChange={e => setMinMarginGoal(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-1">Lowest profit margin you accept.</p>
                  </div>
               </div>
            </div>

            {/* 2. Competitor */}
            <div className="bg-slate-900 rounded-xl border border-red-900/30 p-6">
               <h3 className="text-red-400 font-bold flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4" /> Competitor Intel
               </h3>
               
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Competitor Price</label>
                  <input type="number" value={competitorPrice} onChange={e => setCompetitorPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-red-900/50 rounded p-3 text-red-400 font-bold text-lg focus:border-red-500 outline-none" />
               </div>
            </div>

          </div>

          {/* --- RIGHT: WAR ROOM (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Tactical Dashboard */}
            <div className={`rounded-xl border p-8 shadow-2xl relative overflow-hidden ${
               metrics.status === 'safe' ? 'bg-emerald-950/30 border-emerald-900' : 
               metrics.status === 'warning' ? 'bg-yellow-950/30 border-yellow-900' : 
               'bg-red-950/30 border-red-900'
            }`}>
               <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                  <div className="flex-1">
                     <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Net Outcome if Matched</span>
                     <div className="flex items-baseline gap-4 mt-2">
                        <span className={`text-6xl font-extrabold ${metrics.profitAtMatch >= 0 ? 'text-white' : 'text-red-500'}`}>
                           {metrics.profitAtMatch >= 0 ? '+' : ''}{fmt(metrics.profitAtMatch)}
                        </span>
                        <span className={`text-xl font-medium ${metrics.marginAtMatch >= minMarginGoal ? 'text-emerald-400' : 'text-yellow-400'}`}>
                           {metrics.marginAtMatch.toFixed(1)}% Margin
                        </span>
                     </div>
                     <p className="text-sm text-slate-300 mt-4 leading-relaxed font-medium bg-slate-950/50 p-3 rounded border border-white/10">
                        {metrics.recommendation}
                     </p>
                  </div>

                  {/* Counter Strike */}
                  {metrics.status !== 'danger' && (
                     <div className="w-full md:w-64 bg-slate-950/80 p-4 rounded-xl border border-white/10 text-center">
                        <div className="text-xs font-bold text-indigo-400 uppercase mb-2 flex items-center justify-center gap-1">
                           <Zap className="w-3 h-3" /> Counter-Strike
                        </div>
                        <div className="text-3xl font-bold text-white mb-1">{fmt(metrics.counterStrikePrice)}</div>
                        <p className="text-[10px] text-slate-500">Undercut slightly to win Buy Box</p>
                     </div>
                  )}
               </div>
            </div>

            {/* 2. Price Anchors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                     <Scale className="w-4 h-4" /> Break-Even Floor
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                     <span className="text-4xl font-bold text-white">{fmt(metrics.breakEvenPrice)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                     The absolute lowest price you can sell at without losing cash (0 profit).
                  </p>
               </div>

               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                     <ShieldAlert className="w-4 h-4" /> Min. Viable Price
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                     <span className="text-4xl font-bold text-white">{fmt(metrics.minViablePrice)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                     Lowest price to maintain your {minMarginGoal}% margin goal. Do not go below this for long.
                  </p>
               </div>

            </div>

            {/* 3. Visual Margin Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
               <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">Profit Impact Visualizer</h3>
               <div className="h-8 w-full bg-slate-950 rounded-full overflow-hidden flex text-[10px] font-bold text-slate-900 leading-[2rem] text-center">
                  {/* Costs */}
                  <div style={{ width: `${((landedCost+shippingCost) / competitorPrice) * 100}%` }} className="bg-slate-600 text-slate-300">Cost</div>
                  {/* Fees */}
                  <div style={{ width: `${(referralFeePct)}%` }} className="bg-orange-500">Fee</div>
                  {/* Profit or Loss */}
                  {metrics.marginAtMatch > 0 ? (
                     <div style={{ width: `${metrics.marginAtMatch}%` }} className="bg-emerald-500">Profit</div>
                  ) : (
                     <div className="flex-1 bg-red-500 text-white">LOSS ZONE</div>
                  )}
               </div>
               <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>0%</span>
                  <span>Competitor Price (100%)</span>
               </div>
            </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-red-500" />
              War Room Strategy
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-red-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <ShieldAlert className="w-5 h-5 text-red-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">When to Walk Away?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    If the competitor price is below your <b>Break-Even Floor</b>, do not follow them. They are either clearing dead stock or have a cheaper supplier. Let them sell out at a loss.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The "Buy Box" Trick</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    You don't need to be ₹50 cheaper. Amazon's algorithm often awards the Buy Box to the lowest price by even <b>₹1 or ₹5</b>. Use the "Counter-Strike" price.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-yellow-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingDown className="w-5 h-5 text-yellow-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Variable Fees</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Remember: When you lower your price, you pay <b>less referral fee</b>. This calculator automatically accounts for that saving, often revealing hidden profit.
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