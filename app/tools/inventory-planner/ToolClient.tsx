'use client';

import React, { useState, useEffect } from 'react';
import { 
  CalendarDays, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ShoppingCart, 
  Package, 
  Truck,
  BookOpen,
  Anchor,
  DollarSign,
  PieChart,       // NEW
  AlertOctagon,   // NEW
  ArrowRight      // NEW
} from 'lucide-react';

export default function SmartInventorySystem() {
  // --- STATE ---
  
  // 1. Current Status
  const [currentStock, setCurrentStock] = useState<number>(500);
  const [inboundStock, setInboundStock] = useState<number>(0); // Stock already ordered but not arrived
  const [dailySales, setDailySales] = useState<number>(20);

  // 2. Supply Chain Config
  const [leadTime, setLeadTime] = useState<number>(15); // Days to arrive
  const [safetyDays, setSafetyDays] = useState<number>(7); // Buffer days
  const [orderInterval, setOrderInterval] = useState<number>(30); // How many days of stock to buy (MoQ duration)
  const [simulateDelay, setSimulateDelay] = useState<boolean>(false); // NEW: Scenario Toggle

  // 3. Financials
  const [unitCost, setUnitCost] = useState<number>(400); // Cost to buy 1 unit
  const [sellingPrice, setSellingPrice] = useState<number>(1200); // NEW: For Revenue Calc
  const [seasonality, setSeasonality] = useState<number>(0); // % Growth expected (e.g., 20% for Q4)

  // 4. Outputs
  const [metrics, setMetrics] = useState({
    burnRate: 0, // Adjusted sales velocity
    daysOfInventory: 0,
    stockoutDate: '',
    reorderPoint: 0,
    status: 'healthy' as 'critical' | 'warning' | 'healthy',
    suggestedOrderQty: 0,
    capitalRequired: 0,
    safetyStockUnits: 0,
    // NEW METRICS
    capitalTiedUp: 0,
    projectedRevenueLoss: 0,
    gapDays: 0
  });

  // --- CALCULATION ENGINE ---
  useEffect(() => {
    // A. Adjusted Velocity (Seasonality)
    const velocity = dailySales * (1 + seasonality / 100);

    // B. Coverage Analysis
    const totalStock = currentStock + inboundStock;
    const daysLeft = velocity > 0 ? totalStock / velocity : 0;
    
    const today = new Date();
    const stockoutDt = new Date();
    stockoutDt.setDate(today.getDate() + Math.floor(daysLeft));

    // C. Reorder Point (ROP) Formula
    // ROP = (Lead Time x Daily Sales) + Safety Stock
    // NEW: If simulation is ON, we add 7 days to Lead Time perception
    const effectiveLeadTime = simulateDelay ? leadTime + 7 : leadTime;
    
    const safetyUnits = Math.ceil(velocity * safetyDays);
    const leadTimeDemand = Math.ceil(velocity * effectiveLeadTime);
    const rop = leadTimeDemand + safetyUnits;

    // D. Order Quantity (EOQ Lite)
    // Order = (Order Interval Days * Daily Sales) - (Current Stock - ROP)
    const targetStockLevel = rop + (velocity * orderInterval);
    let orderQty = targetStockLevel - totalStock;
    if (orderQty < 0) orderQty = 0;

    // E. Status Logic
    let status: 'critical' | 'warning' | 'healthy' = 'healthy';
    if (totalStock <= safetyUnits) status = 'critical';
    else if (totalStock <= rop) status = 'warning';

    // F. Financials
    const capital = orderQty * unitCost;
    const tiedCapital = currentStock * unitCost; // NEW

    // G. Lost Revenue Calculation (The "Gap")
    // If Days Left < Lead Time, we WILL stock out before new stock arrives.
    let revenueLoss = 0;
    let gap = 0;
    if (daysLeft < effectiveLeadTime) {
        gap = effectiveLeadTime - daysLeft;
        const lostUnits = gap * velocity;
        revenueLoss = lostUnits * sellingPrice;
    }

    setMetrics({
      burnRate: velocity,
      daysOfInventory: daysLeft,
      stockoutDate: stockoutDt.toDateString(),
      reorderPoint: rop,
      status,
      suggestedOrderQty: Math.ceil(orderQty),
      capitalRequired: capital,
      safetyStockUnits: safetyUnits,
      capitalTiedUp: tiedCapital,
      projectedRevenueLoss: revenueLoss,
      gapDays: gap
    });

  }, [currentStock, inboundStock, dailySales, leadTime, safetyDays, orderInterval, unitCost, seasonality, sellingPrice, simulateDelay]);

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-500" />
              Smart Restock Intelligence
            </h1>
            <p className="text-slate-400 mt-2">
              Prevent stockouts with Safety Stock, Seasonality & Risk analysis.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <div className={`w-3 h-3 rounded-full ${
                metrics.status === 'healthy' ? 'bg-emerald-500' : 
                metrics.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'
             }`}></div>
             <span className="text-sm font-medium text-slate-300 uppercase tracking-wide">
                Inventory Health: {metrics.status}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CONTROL PANEL (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Velocity Inputs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Sales Velocity
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Avg Daily Sales (Units)</label>
                     <input type="number" value={dailySales} onChange={e => setDailySales(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Seasonality Growth (%)</label>
                     <div className="flex items-center gap-2">
                        <input type="range" min="0" max="200" step="10" value={seasonality} onChange={e => setSeasonality(Number(e.target.value))} className="w-full accent-emerald-500" />
                        <span className="text-white font-mono w-12 text-right">+{seasonality}%</span>
                     </div>
                     <p className="text-[10px] text-slate-500 mt-1">Adjust for peak season (e.g. Q4)</p>
                  </div>
               </div>
            </div>

            {/* 2. Stock Position */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Package className="w-4 h-4 text-blue-400" /> Current Position
               </h3>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">On Hand</label>
                     <input type="number" value={currentStock} onChange={e => setCurrentStock(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Inbound</label>
                     <input type="number" value={inboundStock} onChange={e => setInboundStock(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-blue-500 outline-none" />
                  </div>
               </div>
            </div>

            {/* 3. Supply Chain Config */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Truck className="w-4 h-4 text-orange-400" /> Supply Chain
               </h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Lead Time (Days)</label>
                     <input type="number" value={leadTime} onChange={e => setLeadTime(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Safety Days</label>
                        <input type="number" value={safetyDays} onChange={e => setSafetyDays(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Order Cycle</label>
                        <input type="number" value={orderInterval} onChange={e => setOrderInterval(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 outline-none" />
                     </div>
                  </div>
                  
                  {/* NEW: Simulation Toggle */}
                  <div className={`mt-4 p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                      simulateDelay ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-950 border-slate-700 hover:border-slate-600'
                  }`} onClick={() => setSimulateDelay(!simulateDelay)}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${simulateDelay ? 'bg-red-500 border-red-500' : 'border-slate-500'}`}>
                          {simulateDelay && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                          <span className={`text-xs font-bold block ${simulateDelay ? 'text-red-300' : 'text-slate-400'}`}>Simulate Delay</span>
                          <span className="text-[10px] text-slate-500">What if supplier is 7 days late?</span>
                      </div>
                  </div>

               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. Main Action Card */}
            <div className={`rounded-xl border p-8 flex flex-col md:flex-row gap-8 items-center justify-between shadow-2xl ${
               metrics.status === 'critical' ? 'bg-red-950/40 border-red-900' :
               metrics.status === 'warning' ? 'bg-yellow-950/40 border-yellow-900' :
               'bg-emerald-950/40 border-emerald-900'
            }`}>
               <div className="space-y-2">
                  <div className="flex items-center gap-2">
                     <ShoppingCart className={`w-5 h-5 ${
                        metrics.status === 'critical' ? 'text-red-400' :
                        metrics.status === 'warning' ? 'text-yellow-400' : 'text-emerald-400'
                     }`} />
                     <span className="text-sm font-bold uppercase tracking-wider text-slate-300">Recommended Order</span>
                  </div>
                  <div className="text-6xl font-extrabold text-white">
                     {metrics.suggestedOrderQty} <span className="text-2xl font-medium text-slate-400">units</span>
                  </div>
                  {metrics.suggestedOrderQty > 0 && (
                     <div className="inline-flex items-center gap-2 bg-slate-950/50 px-3 py-1 rounded-lg border border-white/10 text-sm text-slate-300 mt-2">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        Capital Required: <span className="text-emerald-400 font-mono font-bold">{fmt(metrics.capitalRequired)}</span>
                     </div>
                  )}
               </div>

               <div className="bg-slate-950/50 p-5 rounded-xl border border-white/10 w-full md:w-72 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                     <span className="text-xs text-slate-400 uppercase font-bold">Reorder Point</span>
                     <span className="text-white font-mono font-bold">{metrics.reorderPoint} units</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/10 pb-2">
                     <span className="text-xs text-slate-400 uppercase font-bold">Safety Stock</span>
                     <span className="text-white font-mono font-bold">{metrics.safetyStockUnits} units</span>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-xs text-slate-400 uppercase font-bold">Burn Rate</span>
                     <span className="text-white font-mono font-bold">{metrics.burnRate.toFixed(1)} / day</span>
                  </div>
               </div>
            </div>

            {/* 2. Timeline & Risk Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* Inventory Runway */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                     <CalendarDays className="w-4 h-4" /> Inventory Runway
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                     <span className={`text-4xl font-bold ${metrics.daysOfInventory < leadTime ? 'text-red-400' : 'text-white'}`}>
                        {Math.floor(metrics.daysOfInventory)}
                     </span>
                     <span className="text-sm text-slate-400">days left</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2 relative">
                     <div 
                        className={`h-full ${metrics.daysOfInventory < 15 ? 'bg-red-500' : 'bg-blue-500'}`} 
                        style={{ width: `${Math.min(metrics.daysOfInventory, 100)}%` }}
                     ></div>
                     {/* Lead Time Marker */}
                     <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-white opacity-50" 
                        style={{ left: `${Math.min(leadTime, 100)}%` }} 
                        title="Lead Time Threshold"
                     ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 mt-2">
                      <span>Empty: <b className="text-slate-300">{metrics.stockoutDate}</b></span>
                      <span>Lead Time: {leadTime}d</span>
                  </div>

                  {/* NEW: Risk Analysis */}
                  {metrics.projectedRevenueLoss > 0 && (
                      <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg flex items-start gap-3">
                          <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
                          <div>
                              <p className="text-xs text-red-300 font-bold mb-1">Stockout Inevitable</p>
                              <p className="text-[10px] text-red-200/70 leading-tight">
                                  You have {Math.floor(metrics.daysOfInventory)} days of stock, but lead time is {simulateDelay ? leadTime + 7 : leadTime} days. 
                                  <br/>
                                  <span className="text-white font-bold mt-1 block">Est. Revenue Loss: {fmt(metrics.projectedRevenueLoss)}</span>
                              </p>
                          </div>
                      </div>
                  )}
               </div>

               {/* Financial Config & Health */}
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4" /> Capital Efficiency
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Unit Cost</span>
                            <input 
                                type="number" value={unitCost} onChange={e => setUnitCost(Number(e.target.value))} 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-sm"
                            />
                        </div>
                        <div>
                            <span className="text-[10px] text-slate-400 block mb-1">Selling Price</span>
                            <input 
                                type="number" value={sellingPrice} onChange={e => setSellingPrice(Number(e.target.value))} 
                                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white text-sm"
                            />
                        </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Dead Inventory Value</span>
                      <div className="text-2xl font-bold text-white">{fmt(metrics.capitalTiedUp)}</div>
                      <p className="text-[10px] text-slate-500 mt-1">Cash tied up in current stock.</p>
                  </div>
               </div>

            </div>

            {/* 3. Diagnostics */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
               <h3 className="text-xs font-bold uppercase text-slate-500 mb-4">System Diagnostics</h3>
               <div className="flex items-center gap-4">
                  {metrics.status === 'critical' && (
                     <div className="flex items-center gap-3 text-red-400 bg-red-950/30 p-3 rounded-lg border border-red-900 w-full">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-bold">URGENT: Stock is below Safety Level. You risk stocking out during Lead Time. Air Freight recommended.</span>
                     </div>
                  )}
                  {metrics.status === 'warning' && (
                     <div className="flex items-center gap-3 text-yellow-400 bg-yellow-950/30 p-3 rounded-lg border border-yellow-900 w-full">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-bold">Reorder Point Hit. Place order immediately to avoid stockout.</span>
                     </div>
                  )}
                  {metrics.status === 'healthy' && (
                     <div className="flex items-center gap-3 text-emerald-400 bg-emerald-950/30 p-3 rounded-lg border border-emerald-900 w-full">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="text-sm font-bold">Stock levels are healthy. No immediate action required.</span>
                     </div>
                  )}
               </div>
            </div>

          </div>
        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-blue-500" />
              Inventory Strategy Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Anchor className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Safety Stock</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Never aim for 0 stock. Safety Stock is your insurance against supplier delays. 
                    

[Image of inventory buffer graph]

                    <br/>
                    <b>Recommended:</b> 7-14 days for local suppliers, 30 days for imports.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-orange-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <TrendingUp className="w-5 h-5 text-orange-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Seasonality</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Don't reorder based on <i>last month's</i> sales if Q4 is coming. Use the <b>Seasonality Slider</b> to simulate a +30% or +50% demand spike so you don't run dry in December.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Truck className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Reorder Point (ROP)</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    The ROP is the trigger. When your stock hits this number (e.g., 500 units), you MUST place an order that day. Waiting even 2 days eats into your safety buffer.
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