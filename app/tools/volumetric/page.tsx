'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sliders, 
  UploadCloud, 
  Database, 
  Zap, 
  Save, 
  BookOpen,
  PieChart,
  Activity
} from 'lucide-react';

// --- TYPES ---
type ProductRow = {
  id: string;
  sku: string;
  cost: number;
  price: number;
  monthlySales: number; // Volume
  fees: number;
};

// --- MOCK DATA GENERATOR (Simulating a CSV Upload) ---
const generateInitialData = (): ProductRow[] => [
  { id: '1', sku: 'WRL-HEADPHONE-01', cost: 500, price: 1500, monthlySales: 120, fees: 400 },
  { id: '2', sku: 'SMART-WATCH-X', cost: 1200, price: 3500, monthlySales: 45, fees: 800 },
  { id: '3', sku: 'USB-C-CABLE-2M', cost: 80, price: 399, monthlySales: 800, fees: 120 },
  { id: '4', sku: 'GAMING-MOUSE-RGB', cost: 450, price: 1200, monthlySales: 150, fees: 350 },
  { id: '5', sku: 'LAPTOP-STAND-ALU', cost: 600, price: 1800, monthlySales: 90, fees: 500 },
];

export default function BulkScenarioPlanner() {
  // --- STATE ---
  const [products, setProducts] = useState<ProductRow[]>(generateInitialData());
  
  // Simulation Modifiers (The "What-If" Factors)
  const [priceMod, setPriceMod] = useState<number>(0); // Change price by %
  const [costMod, setCostMod] = useState<number>(0);   // Supplier cost change %
  const [feeMod, setFeeMod] = useState<number>(0);     // Marketplace fee change %
  const [volumeMod, setVolumeMod] = useState<number>(0); // Est. volume change due to price

  // --- ADVANCED CALCULATION ENGINE ---
  const analytics = useMemo(() => {
    let currentRevenue = 0;
    let currentProfit = 0;
    let newRevenue = 0;
    let newProfit = 0;

    const simulatedRows = products.map(p => {
      // 1. Current State Calculations
      const curProfitUnit = p.price - p.cost - p.fees;
      const curTotalProfit = curProfitUnit * p.monthlySales;
      currentRevenue += p.price * p.monthlySales;
      currentProfit += curTotalProfit;

      // 2. Simulated State Calculations
      const newPrice = p.price * (1 + priceMod / 100);
      const newCost = p.cost * (1 + costMod / 100);
      const newFees = p.fees * (1 + feeMod / 100);
      
      // Elasticity Logic: If Price drops, Volume usually goes up (Simple Elasticity of 1.5)
      // Note: We also add the manual volume modifier
      let calculatedVolChange = volumeMod;
      if (priceMod < 0) calculatedVolChange += Math.abs(priceMod) * 1.5; 
      if (priceMod > 0) calculatedVolChange -= Math.abs(priceMod) * 1.5;
      
      const newVolume = Math.floor(p.monthlySales * (1 + calculatedVolChange / 100));

      const newProfitUnit = newPrice - newCost - newFees;
      const newTotalProfit = newProfitUnit * newVolume;
      
      newRevenue += newPrice * newVolume;
      newProfit += newTotalProfit;

      return {
        ...p,
        newPrice,
        newCost,
        newFees,
        newVolume,
        newProfitUnit,
        newTotalProfit,
        curTotalProfit
      };
    });

    return {
      currentRevenue,
      currentProfit,
      newRevenue,
      newProfit,
      simulatedRows,
      growth: ((newProfit - currentProfit) / currentProfit) * 100
    };
  }, [products, priceMod, costMod, feeMod, volumeMod]);

  // Helper for currency
  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-emerald-400" />
              Scenario Planning Console
            </h1>
            <p className="text-slate-400 mt-1">Run "What-If" simulations on your entire product portfolio.</p>
          </div>
          <div className="flex gap-3">
             <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm border border-slate-700 transition">
                <UploadCloud className="w-4 h-4" /> Load CSV
             </button>
             <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-emerald-900/20">
                <Save className="w-4 h-4" /> Save Scenario
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- LEFT: CONTROL PANEL (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Simulation Controls */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
               <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-blue-400" /> Global Modifiers
               </h2>
               
               <div className="space-y-8">
                  {/* Price Slider */}
                  <div>
                     <div className="flex justify-between text-sm mb-2">
                        <label className="text-slate-400">Selling Price Adjustment</label>
                        <span className={`font-mono font-bold ${priceMod > 0 ? 'text-green-400' : priceMod < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                           {priceMod > 0 ? '+' : ''}{priceMod}%
                        </span>
                     </div>
                     <input type="range" min="-30" max="30" step="1" value={priceMod} onChange={e => setPriceMod(Number(e.target.value))} className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                     <div className="flex justify-between text-[10px] text-slate-600 mt-1 uppercase font-bold">
                        <span>Discount</span>
                        <span>Premium</span>
                     </div>
                  </div>

                  {/* Cost Slider */}
                  <div>
                     <div className="flex justify-between text-sm mb-2">
                        <label className="text-slate-400">Supplier Cost Change</label>
                        <span className={`font-mono font-bold ${costMod > 0 ? 'text-red-400' : costMod < 0 ? 'text-green-400' : 'text-slate-500'}`}>
                           {costMod > 0 ? '+' : ''}{costMod}%
                        </span>
                     </div>
                     <input type="range" min="-20" max="20" step="1" value={costMod} onChange={e => setCostMod(Number(e.target.value))} className="w-full accent-orange-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                  </div>

                  {/* Fee Slider */}
                  <div>
                     <div className="flex justify-between text-sm mb-2">
                        <label className="text-slate-400">Marketplace Fees</label>
                        <span className="font-mono font-bold text-slate-300">{feeMod > 0 ? '+' : ''}{feeMod}%</span>
                     </div>
                     <input type="range" min="-10" max="30" step="1" value={feeMod} onChange={e => setFeeMod(Number(e.target.value))} className="w-full accent-purple-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                  </div>
                  
                  {/* Vol Slider */}
                  <div>
                     <div className="flex justify-between text-sm mb-2">
                        <label className="text-slate-400">Manual Volume Lift</label>
                        <span className="font-mono font-bold text-slate-300">{volumeMod > 0 ? '+' : ''}{volumeMod}%</span>
                     </div>
                     <input type="range" min="-50" max="100" step="5" value={volumeMod} onChange={e => setVolumeMod(Number(e.target.value))} className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                     <p className="text-[10px] text-slate-500 mt-2">
                        *Note: We automatically adjust volume based on price elasticity (Price Drop = More Sales). Use this slider for extra marketing push.
                     </p>
                  </div>
               </div>
            </div>

            {/* Impact Summary Card */}
            <div className={`rounded-xl p-6 border transition-all duration-500 ${analytics.growth >= 0 ? 'bg-emerald-950/30 border-emerald-900' : 'bg-red-950/30 border-red-900'}`}>
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-70 mb-1">Projected Net Profit Change</h3>
                <div className="flex items-center gap-3">
                   <span className={`text-4xl font-extrabold ${analytics.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {analytics.growth > 0 ? '+' : ''}{analytics.growth.toFixed(1)}%
                   </span>
                   {analytics.growth >= 0 ? <ArrowUpRight className="text-emerald-500" /> : <ArrowDownRight className="text-red-500" />}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
                   <div className="flex justify-between">
                      <span className="text-slate-400">Current Profit:</span>
                      <span className="font-mono">{fmt(analytics.currentProfit)}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-slate-400">Projected:</span>
                      <span className={`font-mono font-bold ${analytics.growth >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                         {fmt(analytics.newProfit)}
                      </span>
                   </div>
                </div>
            </div>

          </div>

          {/* --- RIGHT: DATA GRID (8 Cols) --- */}
          <div className="lg:col-span-8">
             <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                   <h2 className="font-semibold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-400" /> SKU Analysis
                   </h2>
                   <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">5 SKUs Loaded</span>
                </div>
                
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm text-slate-400">
                      <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
                         <tr>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3">Price Impact</th>
                            <th className="px-6 py-3 text-center">Volume</th>
                            <th className="px-6 py-3 text-right">Profit / Mo</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                         {analytics.simulatedRows.map((row) => {
                            const profitDiff = row.newTotalProfit - row.curTotalProfit;
                            return (
                               <tr key={row.id} className="hover:bg-slate-800/50 transition">
                                  <td className="px-6 py-4 font-medium text-slate-200">
                                     {row.sku}
                                     <div className="text-[10px] text-slate-500">Base Cost: {fmt(row.cost)}</div>
                                  </td>
                                  <td className="px-6 py-4 font-mono text-xs">
                                     <div className="flex flex-col">
                                        <span className="line-through text-slate-600">{fmt(row.price)}</span>
                                        <span className={priceMod !== 0 ? 'text-blue-400 font-bold' : 'text-slate-300'}>
                                           {fmt(row.newPrice)}
                                        </span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                     <div className="flex justify-center items-center gap-2">
                                        <span className="text-slate-500">{row.monthlySales}</span>
                                        <ArrowUpRight className="w-3 h-3 text-slate-600" />
                                        <span className={`font-bold ${row.newVolume > row.monthlySales ? 'text-emerald-400' : 'text-slate-300'}`}>
                                           {row.newVolume}
                                        </span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     <div className={`font-bold ${profitDiff > 0 ? 'text-emerald-400' : profitDiff < 0 ? 'text-red-400' : 'text-slate-200'}`}>
                                        {fmt(row.newTotalProfit)}
                                     </div>
                                     <div className="text-[10px] opacity-60">
                                        {profitDiff > 0 ? '+' : ''}{fmt(profitDiff)}
                                     </div>
                                  </td>
                               </tr>
                            );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>

        </div>

        {/* --- STRATEGY GUIDE --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-800">
           
           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3 text-emerald-400">
                 <Zap className="w-5 h-5" />
                 <h3 className="font-bold text-white">The "Elasticity" Trick</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                 Use this tool to find the <b>"Sweet Spot."</b> Often, lowering price by 5% increases volume by 10%, resulting in <i>higher</i> total profit despite lower margins. Use the sliders to find that balance.
              </p>
           </div>

           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3 text-orange-400">
                 <BookOpen className="w-5 h-5" />
                 <h3 className="font-bold text-white">When to use?</h3>
              </div>
              <ul className="text-sm text-slate-400 space-y-2">
                 <li>• <b>Before Big Sales:</b> Simulate a 20% price drop to see if the volume spike covers the margin loss.</li>
                 <li>• <b>Fee Hikes:</b> If Amazon raises fees by 2%, check if you need to raise prices or absorb the cost.</li>
              </ul>
           </div>

           <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3 text-blue-400">
                 <PieChart className="w-5 h-5" />
                 <h3 className="font-bold text-white">Portfolio Strategy</h3>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                 Don't look at products in isolation. Sometimes it's okay for one product to break even if it drives volume to your store, while others generate profit. This tool shows the <b>Total Net Outcome</b>.
              </p>
           </div>

        </div>
      </div>
    </div>
  );
}