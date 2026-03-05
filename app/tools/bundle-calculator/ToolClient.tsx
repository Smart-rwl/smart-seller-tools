'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Scale, 
  DollarSign, 
  Box, 
  CheckCircle2, 
  AlertCircle, 
  Layers,
  BookOpen,
  MousePointerClick,
  Lightbulb,
  Target, // New Icon
  ScanLine // New Icon
} from 'lucide-react';

// --- TYPES ---
type Component = {
  id: number;
  name: string;
  cost: number;        // Sourcing Cost
  individualPrice: number; // Selling Price if sold alone
  weight: number;      // Weight in grams
  qty: number;
};

export default function BundleIntelligenceCenter() {
  // --- STATE ---
  
  // 1. Bundle Config
  const [bundlePrice, setBundlePrice] = useState<number>(1500); // Target Selling Price
  const [referralFeePct, setReferralFeePct] = useState<number>(15); // Amazon Category Fee %
  const [packagingCost, setPackagingCost] = useState<number>(30);   // Box cost
  const [packagingWeight, setPackagingWeight] = useState<number>(100); // Box weight (g)

  // 1.5 NEW: Dimensional Logic (Volumetric)
  const [boxDims, setBoxDims] = useState({ l: 20, w: 15, h: 10 }); // cm

  // 2. Components List
  const [components, setComponents] = useState<Component[]>([
    { id: 1, name: 'Shampoo 500ml', cost: 150, individualPrice: 499, weight: 550, qty: 1 },
    { id: 2, name: 'Conditioner 500ml', cost: 180, individualPrice: 549, weight: 550, qty: 1 }
  ]);

  // 3. Logistics Config (Advanced)
  const [shippingRate, setShippingRate] = useState<number>(70); // Base fee for 500g
  const [shippingTierStep, setShippingTierStep] = useState<number>(30); // Extra per 500g

  // 4. Outputs
  const [metrics, setMetrics] = useState({
    totalSourcingCost: 0,
    totalWeightKg: 0,
    volumetricWeightKg: 0, // NEW
    chargeableWeightKg: 0, // NEW
    isVolumetric: false,   // NEW
    estimatedFBAFee: 0,
    referralFeeAmt: 0,
    totalExpenses: 0,
    netProfit: 0,
    margin: 0,
    roi: 0,
    individualTotal: 0,
    customerSavings: 0,
    breakEvenROAS: 0,      // NEW
    maxCPA: 0              // NEW
  });

  // --- CALCULATION ENGINE ---
  useEffect(() => {
    // A. Component Aggregation
    let sourcingCost = 0;
    let totalWtGrams = 0;
    let individualSum = 0;

    components.forEach(c => {
      sourcingCost += c.cost * c.qty;
      totalWtGrams += c.weight * c.qty;
      individualSum += c.individualPrice * c.qty;
    });

    // Add Packaging Weight
    const actualWeightGrams = totalWtGrams + packagingWeight;
    const actualWeightKg = actualWeightGrams / 1000;

    // B1. NEW: Volumetric Calculation (L*W*H / 5000 is standard divisor)
    const volWeightKg = (boxDims.l * boxDims.w * boxDims.h) / 5000;
    
    // Determine Chargeable Weight (Amazon charges the HIGHER of the two)
    const chargeableWeightKg = Math.max(actualWeightKg, volWeightKg);
    const chargeableWeightGrams = chargeableWeightKg * 1000;
    const isVolumetric = volWeightKg > actualWeightKg;

    // B2. Logistics Logic (Step-based calculation using CHARGEABLE weight)
    let logisticsCost = shippingRate; 
    if (chargeableWeightGrams > 500) {
      const extraWeight = chargeableWeightGrams - 500;
      const extraSteps = Math.ceil(extraWeight / 500);
      logisticsCost += extraSteps * shippingTierStep;
    }

    // C. Fee Logic
    const refFee = bundlePrice * (referralFeePct / 100);
    const taxApprox = (refFee + logisticsCost) * 0.18; // GST on services
    
    // D. Final P&L
    const totalExpenses = sourcingCost + packagingCost + logisticsCost + refFee + taxApprox;
    const profit = bundlePrice - totalExpenses;
    
    // E. Metrics
    const margin = bundlePrice > 0 ? (profit / bundlePrice) * 100 : 0;
    const roi = totalExpenses > 0 ? (profit / totalExpenses) * 100 : 0;
    const savings = individualSum > 0 ? ((individualSum - bundlePrice) / individualSum) * 100 : 0;

    // F. NEW: Marketing Metrics
    // Break Even ROAS = Selling Price / Profit. (e.g., if Price 100, Profit 25, ROAS must be 4.0 to break even)
    const beROAS = profit > 0 ? bundlePrice / profit : 0;
    // Max CPA = Net Profit (The most you can spend to acquire a customer without losing money)
    const maxCPA = profit;

    setMetrics({
      totalSourcingCost: sourcingCost,
      totalWeightKg: actualWeightKg,
      volumetricWeightKg: volWeightKg,
      chargeableWeightKg,
      isVolumetric,
      estimatedFBAFee: logisticsCost,
      referralFeeAmt: refFee,
      totalExpenses,
      netProfit: profit,
      margin,
      roi,
      individualTotal: individualSum,
      customerSavings: savings,
      breakEvenROAS: beROAS,
      maxCPA
    });

  }, [bundlePrice, referralFeePct, packagingCost, packagingWeight, components, shippingRate, shippingTierStep, boxDims]);

  // --- ACTIONS ---
  const addComponent = () => {
    setComponents([...components, { 
      id: Date.now(), 
      name: 'New Item', 
      cost: 0, 
      individualPrice: 0, 
      weight: 0, 
      qty: 1 
    }]);
  };

  const removeComponent = (id: number) => {
    if (components.length > 1) setComponents(components.filter(c => c.id !== id));
  };

  const updateComponent = (id: number, field: keyof Component, val: any) => {
    setComponents(components.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-500" />
              Bundle Intelligence Center
            </h1>
            <p className="text-slate-400 mt-2">
              Advanced unit economics, volumetric analysis & logistics planner.
            </p>
          </div>
          
          {/* UPDATED HEADER METRICS */}
          <div className="flex items-center gap-4 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Chargeable Weight</p>
                <div className="flex items-center gap-2 justify-end">
                    <p className={`text-lg font-mono font-bold ${metrics.isVolumetric ? 'text-orange-400' : 'text-white'}`}>
                        {metrics.chargeableWeightKg.toFixed(2)} kg
                    </p>
                    {metrics.isVolumetric && <ScanLine className="w-4 h-4 text-orange-400" />}
                </div>
             </div>
             <div className="h-8 w-px bg-slate-700"></div>
             <div className="text-right">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Est. FBA Fee</p>
                <p className="text-lg font-mono font-bold text-white">{fmt(metrics.estimatedFBAFee)}</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: BUILDER (7 Cols) --- */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Component List */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <Package className="w-4 h-4 text-blue-400" /> Bundle Components
                  </h3>
                  <button onClick={addComponent} className="text-xs flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full transition">
                     <Plus className="w-3 h-3" /> Add Item
                  </button>
               </div>
               
               <div className="p-4 space-y-3">
                  {components.map((comp, i) => (
                     <div key={comp.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center group">
                        <div className="flex-1 w-full">
                           <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Item Name</span>
                              <span className="group-hover:text-red-400 cursor-pointer" onClick={() => removeComponent(comp.id)}><Trash2 className="w-3 h-3" /></span>
                           </div>
                           <input type="text" value={comp.name} onChange={e => updateComponent(comp.id, 'name', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-indigo-500 outline-none text-white" />
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
                           <div className="w-20">
                              <label className="text-[10px] text-slate-500 block mb-1">Cost</label>
                              <input type="number" value={comp.cost} onChange={e => updateComponent(comp.id, 'cost', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm outline-none text-white" />
                           </div>
                           <div className="w-20">
                              <label className="text-[10px] text-slate-500 block mb-1">Sold Alone</label>
                              <input type="number" value={comp.individualPrice} onChange={e => updateComponent(comp.id, 'individualPrice', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm outline-none text-white" />
                           </div>
                           <div className="w-20">
                              <label className="text-[10px] text-slate-500 block mb-1">Wt (g)</label>
                              <input type="number" value={comp.weight} onChange={e => updateComponent(comp.id, 'weight', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm outline-none text-white" />
                           </div>
                           <div className="w-16">
                              <label className="text-[10px] text-slate-500 block mb-1">Qty</label>
                              <input type="number" value={comp.qty} onChange={e => updateComponent(comp.id, 'qty', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm outline-none text-white font-bold bg-indigo-900/20 border-indigo-900/50" />
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
               <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-right text-xs text-slate-400">
                  Total Sourcing Cost: <span className="text-white font-mono">{fmt(metrics.totalSourcingCost)}</span>
               </div>
            </div>

            {/* Config Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                  <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                     <DollarSign className="w-4 h-4 text-emerald-400" /> Pricing Strategy
                  </h3>
                  <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Bundle Selling Price</label>
                        <input type="number" value={bundlePrice} onChange={e => setBundlePrice(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-bold text-lg focus:border-emerald-500 outline-none" />
                     </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Category Referral Fee (%)</label>
                        <input type="number" value={referralFeePct} onChange={e => setReferralFeePct(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-emerald-500 outline-none" />
                     </div>
                  </div>
               </div>

               <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                  <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                     <Box className="w-4 h-4 text-orange-400" /> Logistics & Dimensions
                  </h3>
                  
                  {/* NEW: Dimensions Input */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                     <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">L (cm)</label>
                        <input type="number" value={boxDims.l} onChange={e => setBoxDims({...boxDims, l: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                     </div>
                     <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">W (cm)</label>
                        <input type="number" value={boxDims.w} onChange={e => setBoxDims({...boxDims, w: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                     </div>
                     <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">H (cm)</label>
                        <input type="number" value={boxDims.h} onChange={e => setBoxDims({...boxDims, h: Number(e.target.value)})} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Box Cost</label>
                        <input type="number" value={packagingCost} onChange={e => setPackagingCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                     </div>
                     <div>
                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Empty Box Wt (g)</label>
                        <input type="number" value={packagingWeight} onChange={e => setPackagingWeight(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm" />
                     </div>
                  </div>
                  
                  {/* NEW: Volumetric Warning */}
                  {metrics.isVolumetric && (
                    <div className="mb-4 p-2 bg-orange-900/20 border border-orange-900/50 rounded flex items-center gap-2">
                        <ScanLine className="w-4 h-4 text-orange-400" />
                        <span className="text-[10px] text-orange-200 leading-tight">
                            Volumetric Weight ({metrics.volumetricWeightKg.toFixed(2)}kg) exceeds actual weight. Amazon will charge you for the volume.
                        </span>
                         
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-800">
                     <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                        <span>FBA Base Rate (500g)</span>
                        <span>Tier Step (500g)</span>
                     </div>
                     <div className="flex gap-2">
                        <input type="number" value={shippingRate} onChange={e => setShippingRate(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white" />
                        <input type="number" value={shippingTierStep} onChange={e => setShippingTierStep(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white" />
                     </div>
                  </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: INTELLIGENCE (5 Cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Value Prop Card */}
            <div className={`rounded-xl border p-6 ${metrics.customerSavings > 10 ? 'bg-emerald-950/20 border-emerald-900' : 'bg-orange-950/20 border-orange-900'}`}>
               <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <TrendingUp className="w-4 h-4" /> Value Proposition
                  </h3>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${metrics.customerSavings > 10 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                     {metrics.customerSavings.toFixed(1)}% Savings
                  </span>
               </div>
               
               <p className="text-xs text-slate-400 mb-4">
                  Buying separately costs <b>{fmt(metrics.individualTotal)}</b>. Buying your bundle costs <b>{fmt(bundlePrice)}</b>.
               </p>

               {metrics.customerSavings < 5 ? (
                  <div className="flex items-start gap-2 text-xs text-orange-300 bg-orange-900/20 p-2 rounded border border-orange-900/50">
                     <AlertCircle className="w-4 h-4 shrink-0" />
                     <p>Warning: This bundle offers little value to the customer. Consider lowering the price to increase conversion.</p>
                  </div>
               ) : (
                  <div className="flex items-start gap-2 text-xs text-emerald-300 bg-emerald-900/20 p-2 rounded border border-emerald-900/50">
                     <CheckCircle2 className="w-4 h-4 shrink-0" />
                     <p>Great! The discount is significant enough to motivate customers to buy the bundle.</p>
                  </div>
               )}
            </div>

            {/* 2. Profit Dashboard */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
               <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-4">Financial Breakdown</h3>
               
               {/* NEW: Visual Profit Stack */}
               <div className="h-4 w-full bg-slate-800 rounded-full flex overflow-hidden mb-6">
                   <div className="bg-blue-500 h-full" style={{ width: `${(metrics.totalExpenses / bundlePrice) * 100}%` }}></div>
                   <div className="bg-emerald-500 h-full" style={{ width: `${metrics.margin}%` }}></div>
               </div>

               <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                     <span className="text-slate-400">Selling Price</span>
                     <span className="text-white font-mono">{fmt(bundlePrice)}</span>
                  </div>
                  <div className="h-px bg-slate-800"></div>
                  <div className="flex justify-between text-sm text-slate-400">
                     <span>(-) Product Cost</span>
                     <span>{fmt(metrics.totalSourcingCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                     <span>(-) Packaging</span>
                     <span>{fmt(packagingCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                     <span>(-) FBA/Shipping</span>
                     <span>{fmt(metrics.estimatedFBAFee)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                     <span>(-) Referral Fee</span>
                     <span>{fmt(metrics.referralFeeAmt)}</span>
                  </div>
               </div>

               <div className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                  <div className="flex justify-between items-end mb-1">
                     <span className="text-slate-400 text-xs uppercase font-bold">Net Profit</span>
                     <span className={`text-2xl font-bold ${metrics.netProfit > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {fmt(metrics.netProfit)}
                     </span>
                  </div>
                  <div className="flex gap-3 mt-3">
                     <div className={`flex-1 text-center p-2 rounded ${metrics.margin > 15 ? 'bg-emerald-900/20 text-emerald-400' : 'bg-slate-900 text-slate-400'}`}>
                        <div className="text-[10px] uppercase">Margin</div>
                        <div className="font-bold">{metrics.margin.toFixed(1)}%</div>
                     </div>
                     <div className={`flex-1 text-center p-2 rounded ${metrics.roi > 30 ? 'bg-blue-900/20 text-blue-400' : 'bg-slate-900 text-slate-400'}`}>
                        <div className="text-[10px] uppercase">ROI</div>
                        <div className="font-bold">{metrics.roi.toFixed(1)}%</div>
                     </div>
                  </div>
               </div>
            </div>

            {/* 3. NEW: Marketing Intelligence */}
            <div className="bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase text-indigo-400 tracking-wider mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Marketing Intelligence
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase block mb-1">Break-Even ROAS</span>
                        <div className="text-2xl font-mono font-bold text-white">{metrics.breakEvenROAS.toFixed(2)}x</div>
                        <p className="text-[10px] text-slate-500 mt-1">Min. ad return required</p>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-400 uppercase block mb-1">Max CPA</span>
                        <div className="text-2xl font-mono font-bold text-white">{fmt(metrics.maxCPA)}</div>
                        <p className="text-[10px] text-slate-500 mt-1">Max spend to acquire 1 order</p>
                    </div>
                </div>
            </div>

          </div>
        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              Strategy Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Layers className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Why Bundle?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    <b>Reduce FBA Fees:</b> You pay the "Pick & Pack" fee only ONCE for the whole box, instead of twice for two items. This instantly increases margin.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-orange-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Scale className="w-5 h-5 text-orange-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The Volumetric Trap</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    If your box is light but large, Amazon charges for volume, not weight. Use the <b>L/W/H</b> inputs above. If the "Chargeable Weight" turns Orange, you are paying for air! Shrink your packaging.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Marketing Math</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Watch the <b>Break-Even ROAS</b>. If it says 3.0x, and your ads are running at 2.5x, you are losing money on every sale. Aim for ads to perform 30% above your break-even point.
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