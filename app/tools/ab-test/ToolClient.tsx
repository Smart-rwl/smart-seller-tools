'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Activity, 
  BookOpen,
  MousePointerClick,
  Lightbulb,
  Search
} from 'lucide-react';

export default function AdvancedAbTestCalculator() {
  // --- STATE ---
  // Version A (Control)
  const [visA, setVisA] = useState<number | ''>(''); 
  const [convA, setConvA] = useState<number | ''>(''); 
  const [revA, setRevA] = useState<number | ''>(''); // Total Revenue A

  // Version B (Variant)
  const [visB, setVisB] = useState<number | ''>('');
  const [convB, setConvB] = useState<number | ''>('');
  const [revB, setRevB] = useState<number | ''>(''); // Total Revenue B

  const [metrics, setMetrics] = useState<any>(null);

  // --- CALCULATION ENGINE ---
  useEffect(() => {
    const n1 = Number(visA);
    const x1 = Number(convA);
    const r1 = Number(revA);
    
    const n2 = Number(visB);
    const x2 = Number(convB);
    const r2 = Number(revB);

    if (!n1 || !n2) {
      setMetrics(null);
      return;
    }

    // 1. Conversion Rates (CR)
    const cr1 = x1 / n1;
    const cr2 = x2 / n2;
    
    // 2. Revenue Per Visitor (RPV)
    const rpv1 = n1 > 0 ? r1 / n1 : 0;
    const rpv2 = n2 > 0 ? r2 / n2 : 0;

    // 3. Statistical Significance (Z-Test for Proportions)
    const p = (x1 + x2) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * ((1 / n1) + (1 / n2)));
    const zScore = se > 0 ? Math.abs((cr1 - cr2) / se) : 0;

    // Convert Z-Score to Confidence % (Cumulative Normal Distribution approximation)
    // This is a simplified lookup for UI display
    let confidence = 0;
    if (zScore < 1.0) confidence = 50 + (zScore * 15); // Rough interpolation
    else if (zScore < 1.645) confidence = 80 + ((zScore - 1.0) * 15);
    else if (zScore < 1.96) confidence = 90 + ((zScore - 1.645) * 15);
    else confidence = 95 + ((zScore - 1.96) * 2);
    if (confidence > 99.9) confidence = 99.9;

    // 4. Lift Calculation
    const liftCR = cr1 > 0 ? ((cr2 - cr1) / cr1) * 100 : 0;
    const liftRPV = rpv1 > 0 ? ((rpv2 - rpv1) / rpv1) * 100 : 0;

    // 5. Verdict Logic
    let status = 'neutral';
    if (confidence >= 95) {
      status = liftCR > 0 ? 'winner' : 'loser';
    } else if (confidence >= 80) {
      status = 'leaning';
    }

    setMetrics({
      cr1: cr1 * 100,
      cr2: cr2 * 100,
      rpv1,
      rpv2,
      confidence,
      liftCR,
      liftRPV,
      status,
      winner: liftCR > 0 ? 'B' : 'A'
    });

  }, [visA, convA, revA, visB, convB, revB]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-500" />
              Statistical Significance Engine
            </h1>
            <p className="text-slate-400 mt-2">
              Advanced A/B testing analysis with Revenue Per Visitor (RPV) tracking.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
             <Search className="w-4 h-4" />
             <span>Algorithm: Two-tailed Z-Test (p &lt; 0.05)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: INPUTS (5 Cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Version A Card */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 relative overflow-hidden group hover:border-slate-700 transition">
               <div className="absolute top-0 left-0 w-1 h-full bg-slate-600"></div>
               <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 flex justify-between">
                  Control Group (A)
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">ORIGINAL</span>
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 mb-1 block">Visitors / Sessions</label>
                     <input type="number" value={visA} onChange={e => setVisA(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 focus:outline-none transition" placeholder="e.g. 5000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Orders</label>
                        <input type="number" value={convA} onChange={e => setConvA(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 focus:outline-none transition" placeholder="e.g. 150" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Total Revenue ($)</label>
                        <input type="number" value={revA} onChange={e => setRevA(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 focus:outline-none transition" placeholder="Optional" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Version B Card */}
            <div className="bg-slate-900 rounded-xl border border-blue-900/30 p-6 relative overflow-hidden group hover:border-blue-800 transition">
               <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
               <h3 className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-4 flex justify-between">
                  Variant Group (B)
                  <span className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-[10px]">NEW VERSION</span>
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 mb-1 block">Visitors / Sessions</label>
                     <input type="number" value={visB} onChange={e => setVisB(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 focus:outline-none transition" placeholder="e.g. 5000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Orders</label>
                        <input type="number" value={convB} onChange={e => setConvB(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 focus:outline-none transition" placeholder="e.g. 180" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block">Total Revenue ($)</label>
                        <input type="number" value={revB} onChange={e => setRevB(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:border-blue-500 focus:outline-none transition" placeholder="Optional" />
                     </div>
                  </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: RESULTS (7 Cols) --- */}
          <div className="lg:col-span-7 space-y-6">
            
            {metrics ? (
               <>
                  {/* 1. Verdict Banner */}
                  <div className={`rounded-xl p-6 border flex items-center gap-5 shadow-2xl ${
                     metrics.status === 'winner' ? 'bg-emerald-950/40 border-emerald-900' :
                     metrics.status === 'loser' ? 'bg-red-950/40 border-red-900' :
                     'bg-slate-900 border-slate-800'
                  }`}>
                     <div className={`p-3 rounded-full shrink-0 ${
                        metrics.status === 'winner' ? 'bg-emerald-500 text-black' :
                        metrics.status === 'loser' ? 'bg-red-500 text-white' :
                        'bg-slate-700 text-slate-300'
                     }`}>
                        {metrics.status === 'winner' ? <CheckCircle2 className="w-8 h-8" /> : 
                         metrics.status === 'loser' ? <XCircle className="w-8 h-8" /> : 
                         <Activity className="w-8 h-8" />}
                     </div>
                     <div>
                        <h2 className={`text-xl font-bold ${
                           metrics.status === 'winner' ? 'text-emerald-400' : 
                           metrics.status === 'loser' ? 'text-red-400' : 'text-slate-200'
                        }`}>
                           {metrics.status === 'winner' ? 'Test Significant: Variant B Wins' :
                            metrics.status === 'loser' ? 'Test Significant: Variant B Lost' :
                            'Data Not Significant Yet'}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                           {metrics.status === 'neutral' 
                              ? `We are ${metrics.confidence.toFixed(1)}% confident. You need 95% to confirm a winner.` 
                              : `We are ${metrics.confidence.toFixed(1)}% confident that this result is not due to luck.`}
                        </p>
                     </div>
                  </div>

                  {/* 2. Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                     
                     {/* Conversion Rate */}
                     <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                              <MousePointerClick className="w-4 h-4" /> Conv. Rate
                           </div>
                           <span className={`text-xs font-bold px-2 py-1 rounded ${metrics.liftCR > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {metrics.liftCR > 0 ? '+' : ''}{metrics.liftCR.toFixed(2)}%
                           </span>
                        </div>
                        <div className="space-y-3">
                           <div>
                              <div className="flex justify-between text-sm mb-1">
                                 <span className="text-slate-500">A (Control)</span>
                                 <span className="text-slate-300 font-mono">{metrics.cr1.toFixed(2)}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                 <div className="bg-slate-500 h-full rounded-full" style={{ width: `${Math.min(metrics.cr1 * 5, 100)}%` }}></div>
                              </div>
                           </div>
                           <div>
                              <div className="flex justify-between text-sm mb-1">
                                 <span className="text-blue-500">B (Variant)</span>
                                 <span className="text-blue-300 font-mono">{metrics.cr2.toFixed(2)}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                 <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(metrics.cr2 * 5, 100)}%` }}></div>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* Revenue Per Visitor (RPV) */}
                     <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase">
                              <DollarSign className="w-4 h-4" /> Revenue / Visitor
                           </div>
                           <span className={`text-xs font-bold px-2 py-1 rounded ${metrics.liftRPV > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {metrics.liftRPV > 0 ? '+' : ''}{metrics.liftRPV.toFixed(2)}%
                           </span>
                        </div>
                        {metrics.rpv1 === 0 && metrics.rpv2 === 0 ? (
                           <div className="h-20 flex items-center justify-center text-slate-600 text-xs italic">
                              Add revenue data to calculate RPV
                           </div>
                        ) : (
                           <div className="space-y-3">
                              <div className="flex justify-between items-center bg-slate-950 p-2 rounded">
                                 <span className="text-slate-500 text-xs">A (Control)</span>
                                 <span className="text-slate-300 font-mono text-sm">${metrics.rpv1.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center bg-blue-950/20 p-2 rounded border border-blue-900/30">
                                 <span className="text-blue-500 text-xs">B (Variant)</span>
                                 <span className="text-blue-300 font-mono text-sm">${metrics.rpv2.toFixed(2)}</span>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>

                  {/* Confidence Meter */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                     <div className="flex justify-between text-xs font-bold uppercase text-slate-400 mb-2">
                        <span>Confidence Level</span>
                        <span className={metrics.confidence >= 95 ? 'text-emerald-400' : 'text-slate-500'}>{metrics.confidence.toFixed(1)}%</span>
                     </div>
                     <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden">
                        {/* Threshold Marker 95% */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-600 z-10" style={{ left: '95%' }} title="95% Threshold"></div>
                        
                        {/* Bar */}
                        <div 
                           className={`h-full transition-all duration-1000 ease-out rounded-full ${
                              metrics.confidence >= 95 ? 'bg-emerald-500' : 
                              metrics.confidence >= 80 ? 'bg-blue-500' : 'bg-slate-700'
                           }`}
                           style={{ width: `${metrics.confidence}%` }}
                        ></div>
                     </div>
                     <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
                        <span>0%</span>
                        <span>95% (Target)</span>
                        <span>100%</span>
                     </div>
                  </div>

               </>
            ) : (
               <div className="h-full bg-slate-900/50 border border-slate-800 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-500 p-10">
                  <BarChart2 className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-sm font-medium">Enter data to run the statistical engine.</p>
               </div>
            )}

          </div>
        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-500" />
              Testing Methodology
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <MousePointerClick className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">When to Test?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Whenever you change a <b>Main Image</b>, <b>Title</b>, or <b>Price</b>. 
                    Amazon allows "Manage Experiments," but for Shopify or manual testing, you need this tool to verify results.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-orange-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <AlertCircle className="w-5 h-5 text-orange-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The 95% Rule</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    If Confidence is below 95%, the result might be <b>pure luck</b>. 
                    <br/><br/>
                    Example: If you flip a coin 10 times, you might get 7 Heads. That doesn't mean Heads is "better." You need more data (flips) to be sure.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Why Revenue Matters?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Sometimes Version B gets <i>fewer</i> orders, but people buy <i>more expensive</i> items. 
                    <br/>
                    <b>RPV (Revenue Per Visitor)</b> catches this. Always check if you are making more money, not just more sales.
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
    
  );
}