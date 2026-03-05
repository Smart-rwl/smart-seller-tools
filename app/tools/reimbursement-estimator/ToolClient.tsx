'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, DollarSign, RefreshCw, Info, AlertTriangle, TrendingUp 
} from 'lucide-react';

export default function ReimbursementPage() {
  // Inputs
  const [annualRevenue, setAnnualRevenue] = useState<number>(500000);
  const [inventoryValue, setInventoryValue] = useState<number>(50000);
  
  // Results
  const [estimatedOwed, setEstimatedOwed] = useState(0);
  const [recoveryRate, setRecoveryRate] = useState(1.5); // Industry avg 1-3%

  useEffect(() => {
    // Simple estimation logic: 
    // Amazon typically loses/damages 1-3% of inventory value annually.
    // We'll use a conservative 1.5% of total turnover flow (Sales + Inventory Value)
    const base = annualRevenue + inventoryValue;
    const estimate = base * (recoveryRate / 100);
    setEstimatedOwed(estimate);
  }, [annualRevenue, inventoryValue, recoveryRate]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/tools" className="p-2 hover:bg-white rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-6 h-6 text-emerald-600" /> Reimbursement Estimator
            </h1>
            <p className="text-slate-500 text-sm">Find out how much Amazon FBA might owe you.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left: Input Form */}
          <div className="md:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 mb-4">Your Data</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Annual Revenue</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={annualRevenue}
                    onChange={(e) => setAnnualRevenue(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Avg Inventory Value</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" 
                    className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={inventoryValue}
                    onChange={(e) => setInventoryValue(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex justify-between">
                  Recovery Rate 
                  <span className="text-emerald-600">{recoveryRate}%</span>
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="3" 
                  step="0.1"
                  className="w-full accent-emerald-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  value={recoveryRate}
                  onChange={(e) => setRecoveryRate(Number(e.target.value))}
                />
                <p className="text-[10px] text-slate-400">Industry average is 1% - 3%</p>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
              <div className="flex gap-2 mb-2 font-bold"><Info className="w-4 h-4" /> Did you know?</div>
              Amazon gives you 18 months to claim lost inventory. After that, the money is gone forever.
            </div>
          </div>

          {/* Right: Results */}
          <div className="md:col-span-2">
            <div className="bg-emerald-900 text-white p-8 rounded-2xl shadow-xl text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-emerald-800/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <div className="relative z-10">
                <p className="text-emerald-200 font-medium mb-2 uppercase tracking-widest text-xs">Estimated Refund Owed</p>
                <h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight">
                  ${estimatedOwed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </h2>
                <div className="inline-flex items-center gap-2 bg-emerald-800/50 px-4 py-2 rounded-full text-sm font-medium border border-emerald-700/50">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Potential 5-Year Loss: <span className="text-white">${(estimatedOwed * 5).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex gap-4">
                 <div className="p-3 bg-orange-100 text-orange-600 rounded-lg h-fit">
                    <AlertTriangle className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-900">Lost Inventory</h4>
                    <p className="text-sm text-slate-500 mt-1">Units that disappeared in FBA warehouses without being scanned.</p>
                 </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex gap-4">
                 <div className="p-3 bg-purple-100 text-purple-600 rounded-lg h-fit">
                    <RefreshCw className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-900">Damaged Returns</h4>
                    <p className="text-sm text-slate-500 mt-1">Items refunded to customer but never returned to your stock.</p>
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
    </div>
  );
}