'use client';

import React, { useState, useEffect } from 'react';
import { 
  Swords, 
  Trophy, 
  TrendingUp, 
  Target, 
  Scale, 
  Shield, 
  Crown,
  Zap,
  ArrowRight,
  BookOpen, 
  Compass,  
  Info,
  Skull,        
  Crosshair,    
  Banknote      
} from 'lucide-react';

export default function CompetitorWarRoom() {
  // --- STATE: MY PRODUCT ---
  const [myPrice, setMyPrice] = useState<number>(25);
  const [myReviews, setMyReviews] = useState<number>(150);
  const [myRating, setMyRating] = useState<number>(4.4);
  
  // NEW: Financial Context for War Cost
  const [myDailySales, setMyDailySales] = useState<number>(20); // Unit velocity
  const [myLandedCost, setMyLandedCost] = useState<number>(10); // COGS + Fees

  // --- STATE: COMPETITOR ---
  const [compPrice, setCompPrice] = useState<number>(29);
  const [compReviews, setCompReviews] = useState<number>(2500);
  const [compRating, setCompRating] = useState<number>(4.6);

  // --- STATE: OUTPUTS ---
  const [metrics, setMetrics] = useState({
    myPowerScore: 0,
    compPowerScore: 0,
    winProbability: 0, 
    priceToWin: 0,     
    reviewGap: 0,      
    status: 'Losing' as 'Winning' | 'Fighting' | 'Losing' | 'Dominating',
    
    // NEW METRICS
    monthlyWarCost: 0,    // Profit lost by dropping price
    breakEvenLift: 0,     // % Sales increase needed to cover the price drop
    positioning: 'Unknown' // Premium vs Value
  });

  // --- ENGINE ---
  useEffect(() => {
    // 1. Calculate "Market Power Score"
    const calculateScore = (p: number, r: number, star: number) => {
        if (p <= 0) return 0;
        const ratingWeight = Math.pow(star, 3);
        const reviewWeight = Math.log(r + 1) * 2;
        const priceFactor = 100 / p;
        return (ratingWeight * reviewWeight * priceFactor).toFixed(0);
    };

    const myScore = Number(calculateScore(myPrice, myReviews, myRating));
    const compScore = Number(calculateScore(compPrice, compReviews, compRating));

    // 2. Win Probability
    const totalScore = myScore + compScore;
    const winChance = totalScore > 0 ? (myScore / totalScore) * 100 : 0;

    // 3. Simulation: Price To Win
    // TargetScore = CompScore * 1.05 (Beat them by 5%)
    const targetScore = compScore * 1.05; 
    const myNumerator = Math.pow(myRating, 3) * (Math.log(myReviews + 1) * 2) * 100;
    const requiredPrice = myNumerator / targetScore;

    // 4. Status
    let status: 'Winning' | 'Fighting' | 'Losing' | 'Dominating' = 'Losing';
    if (winChance > 60) status = 'Dominating';
    else if (winChance > 50) status = 'Winning';
    else if (winChance > 40) status = 'Fighting';

    // 5. NEW: Cost of War Analysis
    // Baseline Profit = (CurrentPrice - Cost) * Volume
    // War Profit = (WinPrice - Cost) * Volume
    // War Cost = Baseline - War Profit
    const monthlyVol = myDailySales * 30;
    const currentMargin = myPrice - myLandedCost;
    const warMargin = requiredPrice - myLandedCost;
    
    const monthlyWarCost = (currentMargin - warMargin) * monthlyVol;

    // 6. NEW: Break-Even Volume Lift
    let liftNeeded = 0;
    if (warMargin > 0) {
        const currentTotalProfit = currentMargin * monthlyVol;
        const requiredVol = currentTotalProfit / warMargin;
        liftNeeded = ((requiredVol - monthlyVol) / monthlyVol) * 100;
    } else {
        liftNeeded = 9999; // Impossible if margin is negative
    }

    // 7. NEW: Positioning Logic
    let pos = "Standard";
    if (myPrice > compPrice && myRating >= compRating) pos = "Premium Brand";
    else if (myPrice > compPrice && myRating < compRating) pos = "Overpriced";
    else if (myPrice < compPrice && myRating >= compRating) pos = "Value Killer";
    else if (myPrice < compPrice && myRating < compRating) pos = "Budget Option";

    setMetrics({
        myPowerScore: myScore,
        compPowerScore: compScore,
        winProbability: winChance,
        priceToWin: requiredPrice,
        reviewGap: compReviews - myReviews,
        status,
        monthlyWarCost,
        breakEvenLift: liftNeeded,
        positioning: pos
    });

  }, [myPrice, myReviews, myRating, compPrice, compReviews, compRating, myDailySales, myLandedCost]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Swords className="w-8 h-8 text-red-500" />
              Competitor War Room
            </h1>
            <p className="text-slate-400 mt-2">
              Calculate your "Relative Market Power" and the financial cost of defeating your rival.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800">
             <Trophy className={`w-6 h-6 ${metrics.status === 'Losing' ? 'text-slate-600' : 'text-yellow-500'}`} />
             <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Battle Status</p>
                <div className={`text-xl font-black ${
                    metrics.status === 'Dominating' ? 'text-yellow-400' : 
                    metrics.status === 'Winning' ? 'text-emerald-400' : 
                    metrics.status === 'Fighting' ? 'text-orange-400' : 'text-red-500'
                }`}>
                    {metrics.status.toUpperCase()}
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: BATTLEFIELD (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* My Stats */}
            <div className="bg-slate-900 rounded-xl border-2 border-indigo-500/30 p-6 relative">
               <div className="absolute -top-3 left-6 bg-indigo-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                   YOU (The Challenger)
               </div>
               <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                         <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Your Price</label>
                         <input type="number" value={myPrice} onChange={e => setMyPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold text-lg focus:border-indigo-500 outline-none" />
                      </div>
                      <div>
                         <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Unit Cost</label>
                         <input type="number" value={myLandedCost} onChange={e => setMyLandedCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-lg focus:border-indigo-500 outline-none" />
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rating (1-5)</label>
                        <input type="number" step="0.1" value={myRating} onChange={e => setMyRating(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Review Count</label>
                        <input type="number" value={myReviews} onChange={e => setMyReviews(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none" />
                     </div>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Daily Sales</label>
                      <input type="number" value={myDailySales} onChange={e => setMyDailySales(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* Enemy Stats */}
            <div className="bg-slate-900 rounded-xl border-2 border-red-500/30 p-6 relative">
               <div className="absolute -top-3 left-6 bg-red-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                   THEM (The Leader)
               </div>
               <div className="space-y-4 mt-2">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Competitor Price</label>
                     <input type="number" value={compPrice} onChange={e => setCompPrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white font-bold text-lg focus:border-red-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rating (1-5)</label>
                        <input type="number" step="0.1" value={compRating} onChange={e => setCompRating(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-red-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Review Count</label>
                        <input type="number" value={compReviews} onChange={e => setCompReviews(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-red-500 outline-none" />
                     </div>
                  </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: WAR ROOM INTELLIGENCE (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. The Power Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 relative overflow-hidden shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                   <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                       <Scale className="w-4 h-4" /> Market Share Prediction
                   </h2>
                   <span className={`text-xs font-bold px-2 py-1 rounded border ${
                       metrics.positioning === 'Overpriced' ? 'bg-red-900/20 text-red-400 border-red-900' : 
                       metrics.positioning === 'Premium Brand' ? 'bg-purple-900/20 text-purple-400 border-purple-900' : 
                       'bg-blue-900/20 text-blue-400 border-blue-900'
                   }`}>
                       Position: {metrics.positioning}
                   </span>
               </div>
               
               {/* Visual Tug of War */}
               <div className="relative h-16 bg-slate-950 rounded-full border border-slate-700 flex overflow-hidden">
                   <div 
                       className={`h-full flex items-center justify-start pl-6 text-xl font-black italic transition-all duration-700 ${
                           metrics.winProbability > 50 ? 'bg-indigo-600 text-white' : 'bg-indigo-900/50 text-indigo-400'
                       }`}
                       style={{ width: `${metrics.winProbability}%` }}
                   >
                       YOU ({metrics.winProbability.toFixed(0)}%)
                   </div>
                   <div className="flex-1 h-full bg-slate-800 flex items-center justify-end pr-6 text-xl font-black italic text-slate-500">
                       THEM
                   </div>
                   
                   {/* Center Line */}
                   <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/20 z-10 border-l border-dashed"></div>
               </div>

               <p className="text-center text-xs text-slate-400 mt-4">
                   Your "Market Power Score" is <b>{metrics.myPowerScore}</b> vs. Their <b>{metrics.compPowerScore}</b>.
               </p>
            </div>

            {/* 2. Tactical Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* Price Weapon */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><Zap className="w-24 h-24 text-yellow-500" /></div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4 text-emerald-400" /> Price to Win
                   </h3>
                   
                   {metrics.winProbability > 55 ? (
                       <div className="text-emerald-400 font-bold text-sm">
                           You are already winning on value! <br/>
                           You could potentially RAISE price to {fmt(metrics.priceToWin)} and still win.
                       </div>
                   ) : (
                       <>
                           <div className="text-4xl font-black text-white mb-2">
                               {fmt(metrics.priceToWin)}
                           </div>
                           <p className="text-xs text-slate-500 leading-relaxed max-w-[80%]">
                               To overcome their review advantage instantly, you need to price at <b>{fmt(metrics.priceToWin)}</b>.
                           </p>
                       </>
                   )}
               </div>

               {/* NEW: Financial Casualties */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10"><Skull className="w-24 h-24 text-red-500" /></div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                      <Banknote className="w-4 h-4 text-red-400" /> The Cost of War
                   </h3>
                   
                   {metrics.monthlyWarCost > 0 ? (
                       <>
                           <div className="text-4xl font-black text-red-400 mb-2">
                               -{fmt(metrics.monthlyWarCost)}
                           </div>
                           <p className="text-xs text-slate-500 leading-relaxed max-w-[80%]">
                               Monthly profit sacrifice to match their power. <br/>
                               You need a <b>+{metrics.breakEvenLift.toFixed(0)}%</b> sales boost to break even on this price drop.
                           </p>
                       </>
                   ) : (
                       <div className="text-emerald-400 font-bold text-sm">
                           No cost. You are winning without dropping price!
                       </div>
                   )}
               </div>

            </div>

            {/* 3. Strategy Guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* WHY TO USE */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Compass className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Why use this?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    <b>Social Proof isn't fair.</b> A competitor with 2,500 reviews can charge more than you. This tool calculates the <b>"Value Gap"</b> you need to bridge to steal their customers.
                 </p>
              </div>

              {/* WHEN TO USE */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-orange-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Crosshair className="w-5 h-5 text-orange-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">When to use?</h3>
                 <ul className="text-sm text-slate-400 leading-relaxed list-disc pl-4 space-y-2">
                    <li><b>Product Launch:</b> Find your entry price.</li>
                    <li><b>Sales Slump:</b> Check if a competitor improved their Rating.</li>
                    <li><b>Ad Spend Spike:</b> If ACOS is rising, your "Win Probability" might be too low.</li>
                 </ul>
              </div>

              {/* HOW TO USE */}
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Info className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">How to use?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    1. Enter your current stats & costs.
                    <br/>
                    2. Enter your #1 Competitor's stats.
                    <br/>
                    3. Look at <b>Price to Win</b>.
                    <br/>
                    4. Check <b>Cost of War</b>. Can you afford to lose that margin to kill them?
                 </p>
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