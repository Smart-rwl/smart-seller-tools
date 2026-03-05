'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  BookOpen,
  Activity,
  CheckCircle2,
  LifeBuoy, // NEW
  Ban       // NEW
} from 'lucide-react';

export default function AccountHealthIntelligence() {
  // --- STATE ---
  
  // 1. Current Health
  const [totalOrders, setTotalOrders] = useState<number>(120);
  const [defects, setDefects] = useState<number>(2); // A-to-Z + Negative Feedback
  
  // 2. Velocity
  const [dailyVelocity, setDailyVelocity] = useState<number>(5); // Orders per day

  // 3. Outputs
  const [metrics, setMetrics] = useState({
    currentODR: 0,
    ordersNeeded: 0,
    daysToRecover: 0,
    status: 'safe' as 'safe' | 'warning' | 'critical' | 'suspended',
    riskScore: 0,
    defectBuffer: 0 // NEW
  });

  // --- ENGINE ---
  useEffect(() => {
    // A. Current ODR
    const odr = totalOrders > 0 ? (defects / totalOrders) * 100 : 0;
    
    // B. Recovery Math (Target < 1%)
    const targetRate = 0.009; // 0.9% safety buffer
    let needed = 0;
    
    if (odr >= 1) {
      const requiredTotal = defects / targetRate;
      needed = Math.ceil(requiredTotal - totalOrders);
    }

    // C. Time to Recover
    const days = dailyVelocity > 0 ? Math.ceil(needed / dailyVelocity) : 0;

    // D. NEW: "Survival Buffer" Calculation
    // How many defects can I take before hitting 1%?
    // 1% of Total Orders = Max Allowable Defects
    const maxDefects = Math.floor(totalOrders * 0.01);
    const buffer = maxDefects - defects;

    // E. Risk Logic
    let status: 'safe' | 'warning' | 'critical' | 'suspended' = 'safe';
    let risk = 0; // 0-100 scale for UI gauge

    if (odr < 0.7) {
      status = 'safe';
      risk = (odr / 1) * 60; // 0% to 60% gauge fill
    } else if (odr < 1) {
      status = 'warning';
      risk = 75;
    } else {
      status = 'critical';
      risk = 95;
    }

    // "Impossible" check
    if (needed > 500 && dailyVelocity < 10) {
      status = 'suspended'; 
    }

    setMetrics({
      currentODR: odr,
      ordersNeeded: needed > 0 ? needed : 0,
      daysToRecover: days,
      status,
      riskScore: risk,
      defectBuffer: Math.max(buffer, 0)
    });

  }, [totalOrders, defects, dailyVelocity]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              {metrics.status === 'safe' ? <ShieldCheck className="w-8 h-8 text-emerald-500" /> : <ShieldAlert className="w-8 h-8 text-red-500" />}
              Account Health Intelligence
            </h1>
            <p className="text-slate-400 mt-2">
              Order Defect Rate (ODR) Simulator & Suspension Prevention.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <Activity className="w-4 h-4 text-blue-500" />
             <span className="text-sm font-medium text-slate-300">
                Risk Status: <span className={metrics.status === 'safe' ? 'text-emerald-400' : 'text-red-400 uppercase'}>{metrics.status}</span>
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONFIG (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Health Inputs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-blue-400" /> 60-Day Data
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Total Orders (60 Days)</label>
                     <input type="number" value={totalOrders} onChange={e => setTotalOrders(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Defects (Neg + Claims)</label>
                     <input type="number" value={defects} onChange={e => setDefects(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-red-500 outline-none" />
                  </div>
                  <div className="h-px bg-slate-800 my-2"></div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Avg Daily Sales (Now)</label>
                     <input type="number" value={dailyVelocity} onChange={e => setDailyVelocity(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-emerald-500 outline-none" />
                     <p className="text-[10px] text-slate-500 mt-1">Used to calculate recovery time.</p>
                  </div>
               </div>
            </div>

            {/* 2. Amazon Limit */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" /> Policy Limit
               </h3>
               <p className="text-sm text-slate-400 leading-relaxed">
                  Amazon suspends accounts with ODR above <b>1%</b>. 
                  <br/><br/>
                  The "Order Defect Rate" window is rolling 60 days. Defects drop off automatically after 60 days.
               </p>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. ODR Gauge & Dashboard */}
            <div className={`rounded-xl border p-8 shadow-2xl relative overflow-hidden ${
               metrics.status === 'safe' ? 'bg-emerald-950/30 border-emerald-900' : 'bg-red-950/30 border-red-900'
            }`}>
               <div className="flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
                  <div className="space-y-2">
                     <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Current ODR</span>
                     <div className="text-6xl font-extrabold text-white">
                        {metrics.currentODR.toFixed(2)}%
                     </div>
                     <p className="text-sm text-slate-400">
                        Target: &lt; 1.00%
                     </p>
                  </div>

                  {/* Visual Gauge */}
                  <div className="flex-1 w-full md:max-w-xs">
                     <div className="h-4 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
                        <div 
                           className={`h-full transition-all duration-700 ${
                              metrics.status === 'safe' ? 'bg-emerald-500' : metrics.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                           }`} 
                           style={{ width: `${metrics.riskScore}%` }}
                        ></div>
                        {/* 1% Limit Marker */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-white z-10" style={{ left: '80%' }} title="1% Threshold"></div>
                     </div>
                     <div className="flex justify-between text-[10px] text-slate-500 mt-1 uppercase font-bold">
                        <span>Safe</span>
                        <span className="text-white pr-8">1% Limit</span>
                        <span>Risk</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* 2. Intelligent Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* NEW: The Buffer Card */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                   <div className="absolute right-0 top-0 opacity-10 p-4">
                       <LifeBuoy className="w-24 h-24 text-blue-500" />
                   </div>
                   <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
                       <ShieldCheck className="w-4 h-4" /> The Safety Buffer
                   </h3>
                   
                   {metrics.status === 'critical' || metrics.status === 'suspended' ? (
                       <div className="text-red-400 font-bold text-sm">
                           BUFFER BREACHED. <br/> You are currently over the limit.
                       </div>
                   ) : (
                       <>
                           <div className="text-4xl font-black text-white mb-2">{metrics.defectBuffer}</div>
                           <p className="text-xs text-slate-400 leading-relaxed relative z-10">
                               You can afford exactly <b>{metrics.defectBuffer} more defects</b> before your ODR hits 1% and triggers a review.
                           </p>
                       </>
                   )}
               </div>

               {/* The Recovery Card */}
               {metrics.ordersNeeded > 0 ? (
                   <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                      <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                         <TrendingUp className="w-4 h-4" /> Recovery Plan
                      </h3>
                      <div className="space-y-4">
                          <div>
                              <div className="flex items-baseline gap-2">
                                 <span className="text-4xl font-bold text-white">{metrics.ordersNeeded}</span>
                                 <span className="text-sm text-slate-400">clean orders needed</span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                
                                To dilute ODR back to 0.9%.
                              </p>
                          </div>
                          <div className="pt-4 border-t border-slate-800">
                              <div className="flex items-center gap-2">
                                 <Clock className="w-4 h-4 text-emerald-400" />
                                 <span className="text-sm text-emerald-400 font-bold">{metrics.daysToRecover} Days</span>
                              </div>
                              <p className="text-[10px] text-slate-500">at current velocity.</p>
                          </div>
                      </div>
                   </div>
               ) : (
                   <div className="bg-emerald-900/20 border border-emerald-900/50 rounded-xl p-6 flex flex-col justify-center items-center text-center">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
                      <h3 className="text-sm font-bold text-white">All Systems Green</h3>
                      <p className="text-xs text-slate-400 mt-1">Your ODR is healthy. No dilution needed.</p>
                   </div>
               )}

            </div>

            {/* 3. Action Guide */}
            {metrics.status !== 'safe' && (
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">Recommended Action</h3>
                  
                  {metrics.status === 'suspended' ? (
                     <div className="space-y-2 text-sm text-red-200">
                        <p className="flex items-center gap-2"><Ban className="w-4 h-4" /> <b>Critical Situation:</b> You need too many orders ({metrics.ordersNeeded}) to recover naturally.</p>
                        <p className="pl-6">👉 <b>Do not wait.</b> Prepare a "Plan of Action" (POA) for Amazon. Explain the root cause and how you fixed it.</p>
                     </div>
                  ) : (
                     <div className="space-y-2 text-sm text-yellow-100">
                        <p>🟡 <b>Dilution Strategy:</b> Run a <b>Lightning Deal</b> or aggressive <b>Coupon</b> immediately.</p>
                        <p>👉 Use the "Discount Planner" tool to find a break-even price. Your goal is volume, not profit, until ODR is safe.</p>
                     </div>
                  )}
               </div>
            )}

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