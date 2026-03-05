'use client';

import React, { useState, useEffect } from 'react';
import { 
  Banknote, 
  TrendingUp, 
  AlertOctagon, 
  Clock, 
  Landmark, 
  Anchor,
  ArrowRight,
  Gauge,
  Wallet,
  CalendarClock,
  Zap,          // NEW
  Percent,      // NEW
  BarChart4     // NEW
} from 'lucide-react';

export default function CashflowCommander() {
  // --- STATE: CURRENT HEALTH ---
  const [cashOnHand, setCashOnHand] = useState<number>(50000);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(20000);
  const [netMargin, setNetMargin] = useState<number>(20); // Net Profit %

  // --- STATE: SUPPLY CHAIN ---
  const [leadTime, setLeadTime] = useState<number>(60); // Days from order to Amazon
  const [paymentTerms, setPaymentTerms] = useState<number>(30); // % paid upfront (Deposit)
  const [payoutDelay, setPayoutDelay] = useState<number>(14); // Amazon pays every 14 days

  // --- STATE: GROWTH GOAL ---
  const [targetGrowth, setTargetGrowth] = useState<number>(10); // Desired growth % per month
  
  // --- STATE: FINANCING (NEW) ---
  const [interestRate, setInterestRate] = useState<number>(12); // Annual interest rate for loans

  // --- STATE: OUTPUTS ---
  const [metrics, setMetrics] = useState({
    cashConversionCycle: 0, // Days money is trapped
    maxSustainableGrowth: 0, // Max growth without loans
    cashBurnPerCycle: 0,
    runwayMonths: 0,
    capitalNeeded: 0,
    status: 'Safe' as 'Safe' | 'Risky' | 'Bankrupt',
    
    // NEW METRICS
    financeCost: 0,       // Cost to borrow the needed capital
    impactLeadTime: 0,    // Potential growth if lead time -15 days
    impactMargin: 0       // Potential growth if margin +5%
  });

  // --- ENGINE ---
  useEffect(() => {
    // 1. Cash Conversion Cycle (CCC)
    // Inventory Days = Lead Time + 30 days stock holding
    const inventoryDays = leadTime + 30; 
    const ccc = inventoryDays + payoutDelay;

    // 2. Max Sustainable Growth Rate (Self-Financing Growth)
    const turnsPerYear = 365 / ccc;
    const maxGrowth = netMargin * turnsPerYear; 

    // 3. Projecting Cashflow
    const currentCOGS = monthlyRevenue * (1 - (netMargin/100)); 
    const nextMonthRevenue = monthlyRevenue * (1 + (targetGrowth/100));
    const nextCOGS = nextMonthRevenue * (1 - (netMargin/100));
    
    const cashOut = nextCOGS;
    const cashIn = monthlyRevenue; 
    const burn = cashOut - cashIn; 

    // 4. Runway & Capital
    let runway = 99;
    if (burn > 0) {
        runway = cashOnHand / burn;
    }

    let loanNeeded = 0;
    if (runway < 3) {
        loanNeeded = (burn * 3) - cashOnHand; // Buffer for 3 months
    }
    
    // 5. NEW: Cost of Capital (Interest)
    // Interest for 3 months on the loan amount
    const interest = Math.max(loanNeeded, 0) * (interestRate / 100 / 12) * 3;

    // 6. NEW: Sensitivity Analysis (The "What If")
    // Scenario A: If Lead Time dropped by 15 days
    const fastCCC = (leadTime - 15 + 30) + payoutDelay;
    const fastGrowth = netMargin * (365 / fastCCC);
    
    // Scenario B: If Margin increased by 5%
    const richGrowth = (netMargin + 5) * turnsPerYear;

    // 7. Status
    let status: 'Safe' | 'Risky' | 'Bankrupt' = 'Safe';
    if (targetGrowth > maxGrowth) status = 'Risky';
    if (runway < 2) status = 'Bankrupt';

    setMetrics({
      cashConversionCycle: ccc,
      maxSustainableGrowth: maxGrowth,
      cashBurnPerCycle: burn,
      runwayMonths: runway,
      capitalNeeded: Math.max(loanNeeded, 0),
      status,
      financeCost: interest,
      impactLeadTime: fastGrowth,
      impactMargin: richGrowth
    });

  }, [cashOnHand, monthlyRevenue, netMargin, leadTime, paymentTerms, payoutDelay, targetGrowth, interestRate]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Landmark className="w-8 h-8 text-emerald-500" />
              Cashflow & Growth Commander
            </h1>
            <p className="text-slate-400 mt-2">
              Calculate your "Speed Limit" for growth. Don't go bankrupt by selling too fast.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800">
             <Gauge className="w-6 h-6 text-blue-500" />
             <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Speed Limit (Max Growth)</p>
                <div className={`text-xl font-black ${metrics.maxSustainableGrowth < 10 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {metrics.maxSustainableGrowth.toFixed(1)}% <span className="text-xs text-slate-500 font-normal">/ month</span>
                </div>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Bank Account */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Wallet className="w-4 h-4 text-emerald-400" /> Financial Fuel
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Cash on Hand</label>
                     <input type="number" value={cashOnHand} onChange={e => setCashOnHand(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-lg focus:border-emerald-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Revenue / Mo</label>
                        <input type="number" value={monthlyRevenue} onChange={e => setMonthlyRevenue(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-emerald-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Net Margin %</label>
                        <input type="number" value={netMargin} onChange={e => setNetMargin(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-emerald-500 outline-none" />
                     </div>
                  </div>
               </div>
            </div>

            {/* 2. Supply Chain Drag */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-orange-400" /> Time Lag
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Lead Time (Days)</label>
                     <input type="number" value={leadTime} onChange={e => setLeadTime(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-orange-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-1">Time from paying deposit to stock active.</p>
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amazon Payout Delay</label>
                     <input type="number" value={payoutDelay} onChange={e => setPayoutDelay(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Deposit % to Supplier</label>
                     <input type="number" value={paymentTerms} onChange={e => setPaymentTerms(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white focus:border-orange-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* 3. The Goal (with new Interest Rate) */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Growth & Debt
               </h3>
               <div className="space-y-4">
                   <div>
                       <div className="flex justify-between mb-1">
                          <label className="text-xs font-bold text-slate-500 uppercase">Monthly Growth Goal</label>
                          <span className={`text-xs font-bold ${metrics.status === 'Safe' ? 'text-emerald-400' : 'text-red-400'}`}>{targetGrowth}%</span>
                       </div>
                       <input type="range" min="0" max="50" step="1" value={targetGrowth} onChange={e => setTargetGrowth(Number(e.target.value))} className="w-full accent-blue-500" />
                   </div>
                   
                   {/* NEW: Interest Rate Input */}
                   <div className="pt-2 border-t border-slate-800">
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Loan Interest Rate (%)</label>
                       <input type="number" value={interestRate} onChange={e => setInterestRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none" />
                   </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Cash Conversion Cycle Visualization */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 relative overflow-hidden">
               <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">The Cash Trap Cycle</h2>
               
               <div className="flex items-center justify-between relative z-10">
                   {/* Step 1: Cash Out */}
                   <div className="flex flex-col items-center gap-2">
                       <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-full text-red-400">
                           <Banknote className="w-6 h-6" />
                       </div>
                       <span className="text-[10px] font-bold text-red-400 uppercase">Pay Deposit</span>
                   </div>

                   {/* Connector */}
                   <div className="flex-1 h-1 bg-slate-800 mx-2 relative">
                       <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-slate-400 font-mono bg-slate-950 px-2 py-1 border border-slate-800 rounded">
                           {metrics.cashConversionCycle} Days
                       </div>
                   </div>

                   {/* Step 2: Cash In */}
                   <div className="flex flex-col items-center gap-2">
                       <div className="p-3 bg-emerald-900/20 border border-emerald-500/50 rounded-full text-emerald-400">
                           <Banknote className="w-6 h-6" />
                       </div>
                       <span className="text-[10px] font-bold text-emerald-400 uppercase">Amazon Payout</span>
                   </div>
               </div>
               
               <p className="text-center text-xs text-slate-500 mt-6 max-w-md mx-auto">
                   Your money is trapped in inventory for <b>{metrics.cashConversionCycle} days</b> before it comes back as profit.
               </p>
            </div>

            {/* 2. Simulation Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* Status Card */}
               <div className={`rounded-xl border p-6 flex flex-col justify-between ${
                   metrics.status === 'Safe' ? 'bg-emerald-950/20 border-emerald-900' : 
                   metrics.status === 'Risky' ? 'bg-orange-950/20 border-orange-900' : 'bg-red-950/20 border-red-900'
               }`}>
                   <div>
                       <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                          <AlertOctagon className="w-4 h-4" /> Growth Diagnosis
                       </h3>
                       <div className={`text-4xl font-black mb-1 ${
                           metrics.status === 'Safe' ? 'text-emerald-400' : 
                           metrics.status === 'Risky' ? 'text-orange-400' : 'text-red-400'
                       }`}>
                           {metrics.status.toUpperCase()}
                       </div>
                       <p className="text-xs text-slate-300 leading-relaxed">
                           {metrics.status === 'Safe' ? "You can fund this growth with your own profits." : 
                            metrics.status === 'Risky' ? "You are growing faster than your cash allows. You will need external capital soon." : 
                            "CRITICAL: You will run out of cash before the new stock arrives."}
                       </p>
                   </div>
               </div>

               {/* Runway & Debt Card (UPDATED) */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                   <div>
                       <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                          <CalendarClock className="w-4 h-4 text-blue-400" /> Cash Runway
                       </h3>
                       <div className="text-4xl font-black text-white mb-1">
                           {metrics.runwayMonths > 12 ? '12+' : metrics.runwayMonths.toFixed(1)} <span className="text-lg font-medium text-slate-500">months</span>
                       </div>
                   </div>
                   
                   {metrics.capitalNeeded > 0 && (
                       <div className="mt-4 p-3 bg-red-900/10 border border-red-900/30 rounded">
                           <div className="flex justify-between text-xs text-red-300 mb-1">
                               <span>Loan Needed:</span>
                               <span className="font-bold">{fmt(metrics.capitalNeeded)}</span>
                           </div>
                           <div className="flex justify-between text-xs text-orange-300">
                               <span>Est. Interest:</span>
                               <span className="font-bold">{fmt(metrics.financeCost)}</span>
                           </div>
                       </div>
                   )}
               </div>

            </div>

            {/* 3. NEW: The Levers of Scale (Sensitivity Matrix) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
               <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                  <BarChart4 className="w-4 h-4 text-purple-400" /> The Levers of Scale
               </h3>
               <div className="grid grid-cols-2 gap-4">
                   {/* Lever 1: Speed */}
                   <div className="p-3 rounded bg-indigo-900/10 border border-indigo-900/30 group hover:border-indigo-500/50 transition-colors">
                       <div className="flex items-center gap-2 mb-2">
                           <Zap className="w-4 h-4 text-yellow-400" />
                           <span className="text-xs font-bold text-indigo-300">Faster Logistics</span>
                       </div>
                       <p className="text-[10px] text-slate-400 mb-2">If you reduce Lead Time by 15 days:</p>
                       <div className="text-lg font-bold text-white">
                           Max Growth: <span className="text-emerald-400">{metrics.impactLeadTime.toFixed(1)}%</span>
                       </div>
                   </div>

                   {/* Lever 2: Margin */}
                   <div className="p-3 rounded bg-indigo-900/10 border border-indigo-900/30 group hover:border-indigo-500/50 transition-colors">
                       <div className="flex items-center gap-2 mb-2">
                           <Percent className="w-4 h-4 text-emerald-400" />
                           <span className="text-xs font-bold text-indigo-300">Better Margins</span>
                       </div>
                       <p className="text-[10px] text-slate-400 mb-2">If you increase Margin by 5%:</p>
                       <div className="text-lg font-bold text-white">
                           Max Growth: <span className="text-emerald-400">{metrics.impactMargin.toFixed(1)}%</span>
                       </div>
                   </div>
               </div>
            </div>

            {/* 4. Strategy Guide */}
            <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-5 flex gap-4">
               <Anchor className="w-6 h-6 text-blue-400 shrink-0 mt-1" />
               <div>
                  <h4 className="text-blue-300 font-bold text-sm mb-1">How to grow faster safely?</h4>
                  <ul className="text-xs text-blue-200/70 leading-relaxed list-disc pl-4 space-y-1">
                     <li><b>Negotiate Terms:</b> Moving from "30% Deposit" to "0% Deposit, Net 60" increases your Safe Growth Rate by ~40%.</li>
                     <li><b>Increase Margin:</b> Higher margin means you generate cash faster to fund the next batch.</li>
                     <li><b>Shorten Lead Time:</b> Air freight (faster) might be more expensive but frees up cash 30 days earlier.</li>
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