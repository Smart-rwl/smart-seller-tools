'use client';

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Trophy, 
  Target, 
  BarChart3,
  Calendar,
  MessageSquare,
  DollarSign, // NEW
  Zap,        // NEW
  Layers      // NEW
} from 'lucide-react';

export default function ReviewArchitect() {
  // --- STATE: CURRENT STATUS ---
  const [currentRating, setCurrentRating] = useState<number>(4.2);
  const [totalReviews, setTotalReviews] = useState<number>(120);
  
  // --- STATE: GOALS & SPEED ---
  const [targetRating, setTargetRating] = useState<number>(4.5);
  const [dailySales, setDailySales] = useState<number>(20);
  const [reviewRate, setReviewRate] = useState<number>(2.5); // % of buyers who leave a review
  
  // --- STATE: FINANCIALS (NEW) ---
  const [avgOrderValue, setAvgOrderValue] = useState<number>(25); // Price of product
  const [costPerReview, setCostPerReview] = useState<number>(5); // Estimated cost (Vine enrollment, insert cards, etc.)

  // --- STATE: OUTPUTS ---
  const [metrics, setMetrics] = useState({
    neededReviews: 0,
    timeToReach: 0,
    totalSalesNeeded: 0,
    isImpossible: false,
    starsGap: 0,
    
    // NEW METRICS
    revenueLift: 0,        // Estimated monthly revenue increase from better rating
    recoveryCost: 0,       // Cost to acquire needed reviews
    roi: 0,                // Return on Investment for fixing reputation
    conversionBoost: 0     // Est. conversion rate increase
  });

  // --- ENGINE ---
  useEffect(() => {
    // 1. Core Math: Weighted Average
    const currentSum = currentRating * totalReviews;
    let requiredX = 0;
    
    if (targetRating >= 5) {
        requiredX = 999999; 
    } else if (targetRating <= currentRating) {
        requiredX = 0; 
    } else {
        const numerator = (targetRating * totalReviews) - currentSum;
        const denominator = 5 - targetRating;
        
        if (denominator <= 0) requiredX = 999999;
        else requiredX = Math.ceil(numerator / denominator);
    }

    // 2. Time Estimation
    const reviewsPerDay = dailySales * (reviewRate / 100);
    const daysNeeded = reviewsPerDay > 0 ? Math.ceil(requiredX / reviewsPerDay) : 999;
    const salesNeeded = requiredX * (100 / reviewRate);

    // 3. Gap Visuals
    const gap = targetRating - currentRating;

    // 4. NEW: Financial Impact Logic
    // Rule of Thumb: Increasing rating from 4.2 to 4.5 usually boosts conversion by ~20%
    // Boost Factor varies by gap size.
    const boostFactor = gap * 0.4; // e.g. 0.3 gap * 0.4 = 12% boost
    const monthlyRevenue = dailySales * 30 * avgOrderValue;
    const newMonthlyRevenue = monthlyRevenue * (1 + boostFactor);
    const revenueLift = newMonthlyRevenue - monthlyRevenue;

    // Cost to acquire reviews (e.g. Vine fees / Rebates / Tool subscriptions)
    // We assume a cost per "generated" review strategy
    const recoveryCost = requiredX * costPerReview; 

    // ROI (Annualized Lift / One-time Cost)
    const annualLift = revenueLift * 12;
    const roi = recoveryCost > 0 ? (annualLift / recoveryCost) * 100 : 0;

    setMetrics({
        neededReviews: requiredX,
        timeToReach: daysNeeded,
        totalSalesNeeded: Math.ceil(salesNeeded),
        isImpossible: requiredX > 1000 || requiredX < 0,
        starsGap: gap,
        revenueLift,
        recoveryCost,
        roi,
        conversionBoost: boostFactor * 100
    });

  }, [currentRating, totalReviews, targetRating, dailySales, reviewRate, avgOrderValue, costPerReview]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Star className="w-8 h-8 text-yellow-500" />
              Reputation ROI Engine
            </h1>
            <p className="text-slate-400 mt-2">
              Calculate the recovery path and the financial value of a better reputation.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800">
             <Target className="w-6 h-6 text-indigo-500" />
             <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Goal</p>
                <div className="flex items-center gap-1">
                    <span className="text-xl font-black text-white">{targetRating}</span>
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: INPUTS (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Status */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-6">
                  <BarChart3 className="w-4 h-4 text-blue-400" /> Current Status
               </h3>
               <div className="space-y-6">
                  <div>
                     <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Current Rating</label>
                        <span className="text-white font-mono font-bold">{currentRating}</span>
                     </div>
                     <input type="range" min="1" max="5" step="0.1" value={currentRating} onChange={e => setCurrentRating(Number(e.target.value))} className="w-full accent-yellow-500" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Total Review Count</label>
                     <input type="number" value={totalReviews} onChange={e => setTotalReviews(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-lg focus:border-blue-500 outline-none" />
                  </div>
                  <div className="h-px bg-slate-800"></div>
                  <div>
                     <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Target Rating</label>
                        <span className="text-emerald-400 font-mono font-bold">{targetRating}</span>
                     </div>
                     <input type="range" min="3" max="4.9" step="0.1" value={targetRating} onChange={e => setTargetRating(Number(e.target.value))} className="w-full accent-emerald-500" />
                  </div>
               </div>
            </div>

            {/* 2. Velocity & Financials */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-6">
                  <TrendingUp className="w-4 h-4 text-purple-400" /> Business Profile
               </h3>
               <div className="grid grid-cols-2 gap-4 mb-4">
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Daily Sales</label>
                       <input type="number" value={dailySales} onChange={e => setDailySales(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Review Rate %</label>
                       <input type="number" value={reviewRate} onChange={e => setReviewRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                   </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Avg Order Val</label>
                       <input type="number" value={avgOrderValue} onChange={e => setAvgOrderValue(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cost / Review</label>
                       <input type="number" value={costPerReview} onChange={e => setCostPerReview(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                   </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. The Gap Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Trophy className="w-32 h-32 text-yellow-500" />
               </div>

               <div className="relative z-10">
                   <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">The Recovery Path</h2>
                   
                   {metrics.isImpossible ? (
                       <div className="flex items-center gap-4 text-red-400">
                           <AlertTriangle className="w-12 h-12" />
                           <div>
                               <h3 className="text-2xl font-bold">Target Unreachable</h3>
                               <p className="text-sm opacity-80">Mathematically, you cannot average {targetRating} without deleting reviews.</p>
                           </div>
                       </div>
                   ) : (
                       <div className="flex flex-col md:flex-row gap-8 items-start">
                           <div>
                               <span className="text-5xl font-black text-white">{metrics.neededReviews}</span>
                               <p className="text-sm text-yellow-400 font-bold mt-1 flex items-center gap-2">
                                   <Star className="w-4 h-4 fill-yellow-400" /> 
                                   Consecutive 5-Star Reviews
                               </p>
                           </div>
                           <div className="h-16 w-px bg-slate-800 hidden md:block"></div>
                           <div>
                               <span className="text-5xl font-black text-white">{metrics.timeToReach}</span>
                               <p className="text-sm text-slate-400 font-bold mt-1 flex items-center gap-2">
                                   <Calendar className="w-4 h-4" /> 
                                   Days Estimated
                               </p>
                           </div>
                       </div>
                   )}
               </div>

               {/* Progress Visual */}
               {!metrics.isImpossible && (
                   <div className="mt-8">
                       <div className="flex justify-between text-xs text-slate-400 mb-2">
                           <span>Current: {currentRating}</span>
                           <span>Target: {targetRating}</span>
                       </div>
                       <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '20%' }}></div>
                       </div>
                       <p className="text-[10px] text-slate-500 mt-2">
                           You need {metrics.neededReviews} perfect reviews to bridge the {metrics.starsGap.toFixed(1)} star gap.
                       </p>
                   </div>
               )}
            </div>

            {/* 2. NEW: Financial Impact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Revenue Lift */}
                <div className="bg-emerald-950/20 border border-emerald-900/50 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-20"><DollarSign className="w-8 h-8 text-emerald-500" /></div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-2">Est. Monthly Lift</span>
                    <div className="text-2xl font-black text-white mb-1">+${metrics.revenueLift.toFixed(0)}</div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                        Extra revenue per month from a {metrics.conversionBoost.toFixed(1)}% conversion boost.
                    </p>
                </div>

                {/* Cost of Recovery */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-10"><Layers className="w-8 h-8 text-slate-400" /></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Recovery Cost</span>
                    <div className="text-2xl font-black text-white mb-1">${metrics.recoveryCost}</div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                        Estimated spend (Vine/Rebates) to get {metrics.neededReviews} reviews.
                    </p>
                </div>

                {/* ROI */}
                <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-5 relative overflow-hidden">
                    <div className="absolute top-2 right-2 opacity-20"><Zap className="w-8 h-8 text-indigo-500" /></div>
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2">Recovery ROI</span>
                    <div className="text-2xl font-black text-white mb-1">{metrics.roi.toFixed(0)}%</div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                        Annual return on investment for fixing your reputation.
                    </p>
                </div>

            </div>

            {/* 3. Reality Check Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 group hover:border-emerald-500/50 transition-colors">
                   <div className="flex justify-between items-start mb-4">
                       <h3 className="text-xs font-bold text-slate-400 uppercase">Sales Required</h3>
                       <TrendingUp className="w-5 h-5 text-emerald-500" />
                   </div>
                   <div className="text-3xl font-black text-white mb-1">
                       {metrics.totalSalesNeeded.toLocaleString()}
                   </div>
                   <p className="text-xs text-slate-500 leading-relaxed">
                       At a {reviewRate}% review rate, you need this many orders to generate {metrics.neededReviews} reviews naturally.
                   </p>
               </div>

               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 group hover:border-purple-500/50 transition-colors">
                   <div className="flex justify-between items-start mb-4">
                       <h3 className="text-xs font-bold text-slate-400 uppercase">Wait Time</h3>
                       <Clock className="w-5 h-5 text-purple-500" />
                   </div>
                   <div className="text-3xl font-black text-white mb-1">
                       {(metrics.timeToReach / 30).toFixed(1)} <span className="text-lg font-medium text-slate-500">months</span>
                   </div>
                   <p className="text-xs text-slate-500 leading-relaxed">
                       If you rely on organic sales velocity alone. Consider Vine or Request a Review button to speed this up.
                   </p>
               </div>

            </div>

            {/* 4. Strategy Guide */}
            <div className="bg-indigo-900/10 border border-indigo-900/30 rounded-xl p-5 flex gap-4">
               <MessageSquare className="w-6 h-6 text-indigo-400 shrink-0 mt-1" />
               <div>
                  <h4 className="text-indigo-300 font-bold text-sm mb-1">How to speed this up?</h4>
                  <ul className="text-xs text-indigo-200/70 leading-relaxed list-disc pl-4 space-y-1">
                     <li><b>Amazon Vine:</b> Enrolling can get you up to 30 reviews in ~2-3 weeks (Cost: $200).</li>
                     <li><b>Request Button:</b> Use an automation tool to click "Request Review" on every order. This can double your review rate to 4-5%.</li>
                     <li><b>Insert Cards:</b> Ensure your packaging insert asks for feedback (Neutral language only! Do not ask for 5 stars specifically).</li>
                  </ul>
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