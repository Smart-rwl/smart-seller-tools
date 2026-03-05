'use client';

import React, { useState } from 'react';
import { 
  Barcode, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Save, 
  BookOpen,
  Tag,
  Box,
  Layers
} from 'lucide-react';

type SkuRecord = {
  id: number;
  sku: string;
  desc: string;
};

export default function InventoryArchitect() {
  // --- STATE ---
  const [prefix, setPrefix] = useState(''); // Brand or Category Code
  const [attributes, setAttributes] = useState([
    { id: 1, label: 'Product Type', value: '' },
    { id: 2, label: 'Color', value: '' },
    { id: 3, label: 'Size', value: '' }
  ]);
  const [separator, setSeparator] = useState('-');
  const [generatedSku, setGeneratedSku] = useState('');
  const [history, setHistory] = useState<SkuRecord[]>([]);

  // --- ENGINE ---
  const generate = () => {
    // 1. Clean Inputs (Upper case, remove spaces, remove special chars)
    const clean = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // 2. Build Parts
    // Logic: If prefix is long (>4 chars), take first 3 chars. Else take full.
    const p = clean(prefix);
    const prefixPart = p.length > 4 ? p.substring(0, 3) : p;

    const attrParts = attributes.map(a => {
      const val = clean(a.value);
      // Smart Shorten: If value is "Medium", return "MED"
      if (['SMALL','MEDIUM','LARGE'].includes(val)) return val.substring(0,1); // S, M, L
      return val;
    }).filter(s => s.length > 0);

    const fullParts = [prefixPart, ...attrParts];
    const finalSku = fullParts.join(separator);

    setGeneratedSku(finalSku);
  };

  const saveToHistory = () => {
    if (!generatedSku) return;
    const desc = `${prefix} ${attributes.map(a=>a.value).join(' ')}`;
    setHistory([{ id: Date.now(), sku: generatedSku, desc }, ...history]);
    // Clear inputs for next item (keep prefix usually)
    setAttributes(attributes.map(a => ({ ...a, value: '' })));
    setGeneratedSku('');
  };

  const handleAttrChange = (id: number, val: string) => {
    setAttributes(attributes.map(a => a.id === id ? { ...a, value: val } : a));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Barcode className="w-8 h-8 text-indigo-500" />
              Inventory System Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Generate standardized, readable SKUs for warehouse efficiency.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <Layers className="w-4 h-4 text-emerald-500" />
             <span className="text-sm font-medium text-slate-300">Format: Brand{separator}Type{separator}Var</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: BUILDER (5 Cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Core Inputs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-blue-400" /> SKU Components
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Brand / Category Prefix</label>
                     <input 
                        type="text" 
                        value={prefix} 
                        onChange={e => setPrefix(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono uppercase focus:border-indigo-500 outline-none"
                        placeholder="e.g. NIKE"
                     />
                  </div>

                  {attributes.map((attr, i) => (
                     <div key={attr.id}>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{attr.label}</label>
                        <input 
                           type="text" 
                           value={attr.value} 
                           onChange={e => handleAttrChange(attr.id, e.target.value)} 
                           className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono uppercase focus:border-blue-500 outline-none"
                           placeholder={i === 0 ? "e.g. SHIRT" : i === 1 ? "e.g. RED" : "e.g. LARGE"}
                        />
                     </div>
                  ))}
               </div>

               <div className="mt-6 pt-4 border-t border-slate-800">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Separator Style</label>
                  <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                     {['-', '_', '/', ''].map((sep) => (
                        <button 
                           key={sep}
                           onClick={() => setSeparator(sep)}
                           className={`flex-1 py-1.5 text-xs font-mono rounded ${separator === sep ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                           {sep === '' ? 'None' : sep}
                        </button>
                     ))}
                  </div>
               </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
               <button 
                  onClick={generate}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-2"
               >
                  <RefreshCw className="w-4 h-4" /> Preview
               </button>
               <button 
                  onClick={() => { setPrefix(''); setAttributes(attributes.map(a => ({...a, value:''}))); setGeneratedSku(''); }}
                  className="px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition"
               >
                  <Trash2 className="w-4 h-4" />
               </button>
            </div>

          </div>

          {/* --- RIGHT: OUTPUT & HISTORY (7 Cols) --- */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Preview */}
            <div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 rounded-xl border border-slate-800 p-8 flex flex-col items-center justify-center relative overflow-hidden h-[200px]">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Barcode className="w-32 h-32 text-white" />
               </div>
               
               <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Generated SKU</p>
               {generatedSku ? (
                  <div className="flex flex-col items-center gap-4 z-10">
                     <div 
                        onClick={() => copyToClipboard(generatedSku)}
                        className="text-4xl md:text-5xl font-mono font-black text-white tracking-tight cursor-pointer hover:scale-105 transition-transform"
                     >
                        {generatedSku}
                     </div>
                     <button 
                        onClick={saveToHistory}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-sm font-bold shadow-lg shadow-emerald-900/20 transition"
                     >
                        <Save className="w-4 h-4" /> Save to List
                     </button>
                  </div>
               ) : (
                  <div className="text-slate-600 font-mono text-xl">Waiting for input...</div>
               )}
            </div>

            {/* History List */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[400px]">
               <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
                  <h3 className="font-bold text-white flex items-center gap-2">
                     <BookOpen className="w-4 h-4 text-slate-400" /> SKU Log
                  </h3>
                  <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{history.length} items</span>
               </div>
               
               <div className="overflow-y-auto flex-1 p-2 space-y-2">
                  {history.length > 0 ? history.map((item) => (
                     <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-800 rounded-lg group transition">
                        <div>
                           <div className="font-mono text-white font-bold text-lg">{item.sku}</div>
                           <div className="text-xs text-slate-500 uppercase">{item.desc}</div>
                        </div>
                        <button 
                           onClick={() => copyToClipboard(item.sku)}
                           className="text-slate-500 hover:text-white p-2"
                        >
                           <Copy className="w-4 h-4" />
                        </button>
                     </div>
                  )) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <Box className="w-12 h-12 mb-2 opacity-20" />
                        <p className="text-sm">No SKUs saved yet.</p>
                     </div>
                  )}
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