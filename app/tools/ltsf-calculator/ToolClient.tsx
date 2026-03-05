'use client';

import React, { useState } from 'react';
import { 
  ArchiveBoxIcon, 
  CurrencyRupeeIcon, 
  CalendarIcon, 
  SparklesIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/solid';

// Updated Fee Rates (Hypothetical 2024/25 Rates for India/Global Average)
const FBA_FEES = {
  TIER_1_RATE: 6.90, // 181-365 Days (per cubic foot)
  TIER_2_RATE: 23.00 // 365+ Days (per cubic foot)
};

// Conversion Factors
const CBM_TO_CF = 35.315;

export default function InventoryAgeingTool() {
  // --- STATE ---
  const [inputData, setInputData] = useState(`SKU-001, 0.05, 190\nSKU-002, 0.02, 400\nSKU-003, 0.10, 150`);
  const [results, setResults] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalFee: 0,
    riskCount: 0,
    criticalCount: 0,
    totalVolumeCF: 0
  });

  // --- ENGINE ---
  const processInventory = () => {
    if (!inputData.trim()) return;

    const lines = inputData.split('\n').filter(l => l.trim());
    let total = 0;
    let vol = 0;
    let risk = 0;
    let crit = 0;

    const processed = lines.map(line => {
      // CSV Parsing: SKU, CBM, Days
      const parts = line.split(',').map(s => s.trim());
      if (parts.length < 3) return null;

      const sku = parts[0];
      const cbm = parseFloat(parts[1]) || 0;
      const days = parseInt(parts[2]) || 0;
      const cf = cbm * CBM_TO_CF;

      let fee = 0;
      let status = 'Safe';
      let tier = 'None';

      // Fee Logic
      if (days > 365) {
        fee = cf * FBA_FEES.TIER_2_RATE;
        status = 'Critical';
        tier = '365+ Days';
        crit++;
      } else if (days > 180) {
        fee = cf * FBA_FEES.TIER_1_RATE;
        status = 'At Risk';
        tier = '181-365 Days';
        risk++;
      }

      total += fee;
      vol += cf;

      return { sku, cbm, cf, days, fee, status, tier };
    }).filter(item => item !== null);

    setResults(processed);
    setMetrics({
      totalFee: total,
      totalVolumeCF: vol,
      riskCount: risk,
      criticalCount: crit
    });
  };

  const handleClear = () => {
    setInputData('');
    setResults([]);
    setMetrics({ totalFee: 0, totalVolumeCF: 0, riskCount: 0, criticalCount: 0 });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <ArchiveBoxIcon className="w-8 h-8 text-indigo-500" />
              LTSF Liability Auditor
            </h1>
            <p className="text-slate-400 mt-2">
              Calculate Amazon Long-Term Storage Fees before they hit your account.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Projected Liability</p>
                <p className="text-2xl font-mono font-bold text-red-500">₹{metrics.totalFee.toFixed(2)}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: INPUT (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col h-[500px]">
               <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Paste Inventory Data</label>
                  <div className="flex gap-2">
                     <button onClick={handleClear} className="text-xs text-slate-400 hover:text-white flex items-center gap-1">
                        <TrashIcon className="w-3 h-3" /> Clear
                     </button>
                  </div>
               </div>
               <textarea 
                  value={inputData}
                  onChange={e => setInputData(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm font-mono text-slate-300 focus:border-indigo-500 outline-none resize-none leading-relaxed"
                  placeholder="Format: SKU, Volume(CBM), Age(Days)&#10;Example:&#10;TSHIRT-RED-S, 0.002, 190&#10;MUG-BLACK, 0.015, 400"
               />
               <button 
                  onClick={processInventory}
                  className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-2"
               >
                  <SparklesIcon className="w-4 h-4" /> Calculate Fees
               </button>
            </div>

            {/* Fee Legend */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="font-bold text-white flex items-center gap-2 mb-4 text-sm">
                  <CurrencyRupeeIcon className="w-4 h-4 text-emerald-400" /> Fee Structure (Monthly)
               </h3>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-slate-800">
                     <span className="text-slate-400">181 - 365 Days</span>
                     <span className="font-mono text-yellow-400">₹{FBA_FEES.TIER_1_RATE.toFixed(2)} <span className="text-xs text-slate-600">/ ft³</span></span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-slate-950 rounded border border-slate-800">
                     <span className="text-slate-400">365+ Days</span>
                     <span className="font-mono text-red-400">₹{FBA_FEES.TIER_2_RATE.toFixed(2)} <span className="text-xs text-slate-600">/ ft³</span></span>
                  </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: ANALYSIS (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Metrics Dashboard */}
            <div className="grid grid-cols-3 gap-4">
               <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                  <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Total Volume</span>
                  <span className="text-xl font-mono text-white">{metrics.totalVolumeCF.toFixed(2)} <span className="text-sm text-slate-500">ft³</span></span>
               </div>
               <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><ExclamationTriangleIcon className="w-12 h-12 text-yellow-500" /></div>
                  <span className="text-xs text-yellow-500 uppercase font-bold block mb-1">At Risk SKUs</span>
                  <span className="text-xl font-mono text-white">{metrics.riskCount}</span>
               </div>
               <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10"><ExclamationTriangleIcon className="w-12 h-12 text-red-500" /></div>
                  <span className="text-xs text-red-500 uppercase font-bold block mb-1">Critical SKUs</span>
                  <span className="text-xl font-mono text-white">{metrics.criticalCount}</span>
               </div>
            </div>

            {/* Results Table */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl h-[500px] flex flex-col">
               <div className="px-6 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <h3 className="font-bold text-slate-300 text-sm">Inventory Breakdown</h3>
                  <button className="text-xs text-indigo-400 hover:text-white flex items-center gap-1">
                     <ArrowDownTrayIcon className="w-3 h-3" /> Export CSV
                  </button>
               </div>
               
               <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-sm text-slate-400">
                     <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500 sticky top-0 z-10">
                        <tr>
                           <th className="px-6 py-3 bg-slate-950">SKU</th>
                           <th className="px-6 py-3 bg-slate-950">Age (Days)</th>
                           <th className="px-6 py-3 bg-slate-950">Vol (ft³)</th>
                           <th className="px-6 py-3 bg-slate-950">Fee Tier</th>
                           <th className="px-6 py-3 bg-slate-950 text-right">Est. Fee</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800">
                        {results.length > 0 ? results.map((row, i) => (
                           <tr key={i} className={`hover:bg-slate-800/50 transition ${row.status === 'Critical' ? 'bg-red-950/10' : row.status === 'At Risk' ? 'bg-yellow-950/10' : ''}`}>
                              <td className="px-6 py-3 font-medium text-slate-200">{row.sku}</td>
                              <td className="px-6 py-3 font-mono">{row.days}</td>
                              <td className="px-6 py-3 font-mono">{row.cf.toFixed(2)}</td>
                              <td className="px-6 py-3">
                                 <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    row.status === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    row.status === 'At Risk' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                    'bg-slate-800 text-slate-500 border-slate-700'
                                 }`}>
                                    {row.tier}
                                 </span>
                              </td>
                              <td className={`px-6 py-3 text-right font-mono font-bold ${row.fee > 0 ? 'text-white' : 'text-slate-600'}`}>
                                 ₹{row.fee.toFixed(2)}
                              </td>
                           </tr>
                        )) : (
                           <tr>
                              <td colSpan={5} className="text-center py-20 text-slate-600 italic">
                                 No data processed yet. Paste CSV data on the left.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-indigo-400" /> The 180-Day Cliff
                 </h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Inventory aged over 180 days starts incurring Long-Term fees. These are charged monthly on the 15th. 
                    <br/><b>Action:</b> Create a "Flash Sale" or "Removal Order" before day 179.
                 </p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    <TrashIcon className="w-4 h-4 text-red-400" /> Liquidation Strategy
                 </h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    If the estimated fee is higher than your profit margin, it is cheaper to destroy or donate the stock than to keep it stored.
                 </p>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <h3 className="font-bold text-white mb-2 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-yellow-400" /> Aged Inventory Surcharge
                 </h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Amazon recently added a surcharge for inventory aged 181-270 days. This tool groups them into the broader 181+ bucket for safety planning.
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