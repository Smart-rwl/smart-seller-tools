'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Plus, 
  Trash2, 
  BarChart3, 
  Truck, 
  Anchor, 
  Scale, 
  BookOpen,
  Info,
  PackageCheck,
  Settings
} from 'lucide-react';

// --- TYPES ---
type CargoItem = {
  id: number;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number; // per carton
  qty: number;    // number of cartons
};

type ContainerType = {
  name: string;
  cbm: number;
  maxWeight: number; // kg
};

const CONTAINERS: ContainerType[] = [
  { name: '20ft Standard', cbm: 33.2, maxWeight: 25000 },
  { name: '40ft Standard', cbm: 67.7, maxWeight: 27600 },
  { name: '40ft High Cube', cbm: 76.3, maxWeight: 28600 },
];

export default function LogisticsOptimizationEngine() {
  // --- STATE ---
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm');
  const [items, setItems] = useState<CargoItem[]>([
    { id: 1, name: 'Master Carton A', length: 50, width: 40, height: 30, weight: 12, qty: 100 }
  ]);
  
  const [selectedContainer, setSelectedContainer] = useState<string>('20ft Standard');

  // Outputs
  const [metrics, setMetrics] = useState({
    totalCbm: 0,
    totalGrossWeight: 0,
    totalVolumetricWeight: 0,
    totalCartons: 0,
    utilization: 0,
    weightUtilization: 0
  });

  // --- CALCULATION ENGINE ---
  useEffect(() => {
    let totCbm = 0;
    let totGw = 0;
    let totVol = 0;
    let totQty = 0;

    items.forEach(item => {
      // 1. Normalize Dimensions to Meters
      let l_m = item.length, w_m = item.width, h_m = item.height;
      
      if (unit === 'cm') {
        l_m /= 100; w_m /= 100; h_m /= 100;
      } else {
        // Inch to Meter
        l_m *= 0.0254; w_m *= 0.0254; h_m *= 0.0254;
      }

      const cbmPerCarton = l_m * w_m * h_m;
      const totalItemCbm = cbmPerCarton * item.qty;
      
      // Volumetric Weight (Air Standard 1:6000)
      // Formula: CBM * 166.67
      const volWeight = totalItemCbm * 166.67;

      totCbm += totalItemCbm;
      totGw += item.weight * item.qty;
      totVol += volWeight;
      totQty += item.qty;
    });

    // Container Logic
    const container = CONTAINERS.find(c => c.name === selectedContainer) || CONTAINERS[0];
    const volUtil = (totCbm / container.cbm) * 100;
    const wtUtil = (totGw / container.maxWeight) * 100;

    setMetrics({
      totalCbm: totCbm,
      totalGrossWeight: totGw,
      totalVolumetricWeight: totVol,
      totalCartons: totQty,
      utilization: volUtil,
      weightUtilization: wtUtil
    });

  }, [items, unit, selectedContainer]);

  // --- ACTIONS ---
  const addItem = () => {
    setItems([...items, { 
      id: Date.now(), 
      name: `Carton ${items.length + 1}`, 
      length: 0, width: 0, height: 0, weight: 0, qty: 0 
    }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: number, field: keyof CargoItem, val: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Container className="w-8 h-8 text-blue-500" />
              Logistics Optimization Engine
            </h1>
            <p className="text-slate-400 mt-2">
              Multi-SKU CBM Calculator & Container Load Planner.
            </p>
          </div>
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800">
             <button 
                onClick={() => setUnit('cm')}
                className={`px-4 py-2 text-sm font-medium rounded ${unit === 'cm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
             >
                Metric (cm / kg)
             </button>
             <button 
                onClick={() => setUnit('inch')}
                className={`px-4 py-2 text-sm font-medium rounded ${unit === 'inch' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
             >
                Imperial (in / kg)
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: MANIFEST BUILDER (7 Cols) --- */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <PackageCheck className="w-4 h-4 text-blue-400" /> Shipment Manifest
                  </h3>
                  <button onClick={addItem} className="text-xs flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-full transition">
                     <Plus className="w-3 h-3" /> Add Carton Type
                  </button>
               </div>
               
               <div className="p-4 space-y-3">
                  {items.map((item, i) => (
                     <div key={item.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col md:flex-row gap-4 items-start md:items-center group">
                        <div className="w-full md:w-48">
                           <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Carton Name / SKU</span>
                              <span className="group-hover:text-red-400 cursor-pointer md:hidden" onClick={() => removeItem(item.id)}><Trash2 className="w-3 h-3" /></span>
                           </div>
                           <input type="text" value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm focus:border-blue-500 outline-none text-white" />
                        </div>
                        
                        <div className="grid grid-cols-5 gap-2 flex-1">
                           <div>
                              <label className="text-[10px] text-slate-500 block mb-1">L</label>
                              <input type="number" value={item.length} onChange={e => updateItem(item.id, 'length', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-sm outline-none text-white text-center" />
                           </div>
                           <div>
                              <label className="text-[10px] text-slate-500 block mb-1">W</label>
                              <input type="number" value={item.width} onChange={e => updateItem(item.id, 'width', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm outline-none text-white text-center" />
                           </div>
                           <div>
                              <label className="text-[10px] text-slate-500 block mb-1">H</label>
                              <input type="number" value={item.height} onChange={e => updateItem(item.id, 'height', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm outline-none text-white text-center" />
                           </div>
                           <div>
                              <label className="text-[10px] text-slate-500 block mb-1">Kg/Box</label>
                              <input type="number" value={item.weight} onChange={e => updateItem(item.id, 'weight', Number(e.target.value))} className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-sm outline-none text-white text-center" />
                           </div>
                           <div>
                              <label className="text-[10px] text-blue-400 font-bold block mb-1">Qty</label>
                              <input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} className="w-full bg-blue-900/20 border border-blue-800 rounded p-1.5 text-sm outline-none text-white font-bold text-center" />
                           </div>
                        </div>
                        <button onClick={() => removeItem(item.id)} className="hidden md:block text-slate-600 hover:text-red-400 p-2"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  ))}
               </div>
            </div>

            {/* Container Selector */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" /> Target Container
               </h3>
               <div className="grid grid-cols-3 gap-3">
                  {CONTAINERS.map(c => (
                     <button 
                        key={c.name}
                        onClick={() => setSelectedContainer(c.name)}
                        className={`p-3 rounded-lg border text-left transition-all ${selectedContainer === c.name ? 'bg-blue-900/20 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                     >
                        <div className="text-xs font-bold mb-1">{c.name}</div>
                        <div className="text-[10px] opacity-70">Cap: {c.cbm} m³</div>
                     </button>
                  ))}
               </div>
            </div>

          </div>

          {/* --- RIGHT: ANALYTICS (5 Cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Master Output */}
            <div className="bg-gradient-to-br from-blue-900 to-slate-900 rounded-2xl p-8 shadow-2xl border border-blue-800/50 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Anchor className="w-32 h-32 text-white" />
               </div>
               
               <div className="relative z-10">
                  <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-2">Total Shipment Volume</p>
                  <div className="flex items-baseline gap-2">
                     <span className="text-6xl font-extrabold text-white">{metrics.totalCbm.toFixed(2)}</span>
                     <span className="text-xl text-blue-300">m³</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 mt-8 border-t border-white/10 pt-6">
                     <div>
                        <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase mb-1">
                           <Scale className="w-4 h-4" /> Gross Weight
                        </div>
                        <p className="text-2xl font-bold text-white">{metrics.totalGrossWeight} <span className="text-sm">kg</span></p>
                     </div>
                     <div>
                        <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase mb-1">
                           <Truck className="w-4 h-4" /> Volumetric (Air)
                        </div>
                        <p className="text-2xl font-bold text-white">{metrics.totalVolumetricWeight.toFixed(0)} <span className="text-sm">kg</span></p>
                     </div>
                  </div>
               </div>
            </div>

            {/* 2. Load Meter */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
               <div className="flex justify-between items-end mb-4">
                  <div>
                     <h3 className="text-sm font-bold text-white">Container Utilization</h3>
                     <p className="text-xs text-slate-500 mt-1">{selectedContainer} Capacity</p>
                  </div>
                  <div className={`text-2xl font-bold ${metrics.utilization > 100 ? 'text-red-400' : metrics.utilization > 85 ? 'text-emerald-400' : 'text-blue-400'}`}>
                     {metrics.utilization.toFixed(1)}%
                  </div>
               </div>
               
               {/* Visual Bar */}
               <div className="h-4 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
                  <div 
                     className={`h-full transition-all duration-700 ${metrics.utilization > 100 ? 'bg-red-500' : metrics.utilization > 90 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                     style={{ width: `${Math.min(metrics.utilization, 100)}%` }}
                  ></div>
                  {/* Marker for "Safe Full" */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white/20" style={{ left: '90%' }}></div>
               </div>
               
               <div className="mt-4 flex gap-3 text-xs">
                  {metrics.utilization > 100 ? (
                     <div className="flex-1 bg-red-900/20 border border-red-900/50 p-2 rounded text-red-300">
                        ⚠ <b>Overloaded!</b> You need {Math.ceil(metrics.utilization / 100)} containers or remove items.
                     </div>
                  ) : metrics.utilization < 70 ? (
                     <div className="flex-1 bg-blue-900/20 border border-blue-900/50 p-2 rounded text-blue-300">
                        ℹ <b>Underutilized.</b> You are paying for air. Add more stock to lower per-unit shipping cost.
                     </div>
                  ) : (
                     <div className="flex-1 bg-emerald-900/20 border border-emerald-900/50 p-2 rounded text-emerald-300">
                        ✓ <b>Optimal Load.</b> Container is filled efficiently.
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
              Optimization Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Why calculate CBM?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Freight forwarders charge by CBM (Volume) for LCL sea shipments. For FCL (Full Container), you pay a fixed price for the container. 
                    <br/><br/>
                    <b>Goal:</b> Fill the container to 90%+ to get the cheapest shipping cost per unit.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-orange-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Truck className="w-5 h-5 text-orange-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Air vs Sea</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Check the <b>Volumetric Weight</b> output. 
                    <br/>
                    Air freight charges the higher of Actual Weight vs Volumetric. Sea freight mostly cares about CBM.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Info className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Container Tips</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    A "20ft Container" technically has 33 CBM, but you can rarely load more than <b>28 CBM</b> due to carton stacking gaps and pallet usage.
                    <br/>
                    Always leave 10-15% buffer.
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