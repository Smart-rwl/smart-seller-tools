'use client';

import React, { useState } from 'react';
import { 
  Shuffle, 
  Copy, 
  Trash2, 
  Settings, 
  ArrowRight, 
  CheckCircle2,
  BookOpen,
  Search,
  Target,
  Zap
} from 'lucide-react';

export default function PPCCampaignArchitect() {
  // --- STATE ---
  const [colA, setColA] = useState('');
  const [colB, setColB] = useState('');
  const [colC, setColC] = useState('');
  
  const [matchType, setMatchType] = useState<'broad' | 'phrase' | 'exact' | 'modified'>('broad');
  const [output, setOutput] = useState('');
  const [count, setCount] = useState(0);

  // --- ENGINE ---
  const generateMix = () => {
    // 1. Clean Inputs (Split by line, trim whitespace, remove empty lines)
    const listA = colA.split('\n').map(s => s.trim()).filter(s => s);
    const listB = colB.split('\n').map(s => s.trim()).filter(s => s);
    const listC = colC.split('\n').map(s => s.trim()).filter(s => s);

    // 2. Handle Empty Columns (If empty, treat as a single empty string to allow loops to run)
    const safeA = listA.length ? listA : [''];
    const safeB = listB.length ? listB : [''];
    const safeC = listC.length ? listC : [''];

    let results: string[] = [];

    // 3. Permutation Loop
    safeA.forEach(a => {
      safeB.forEach(b => {
        safeC.forEach(c => {
          // Join with space, remove double spaces if any part was empty
          let phrase = `${a} ${b} ${c}`.replace(/\s+/g, ' ').trim();
          
          if (phrase) {
            // 4. Apply Match Type Syntax
            switch (matchType) {
              case 'phrase':
                phrase = `"${phrase}"`;
                break;
              case 'exact':
                phrase = `[${phrase}]`;
                break;
              case 'modified':
                // Adds '+' before every word: +red +shoes
                phrase = phrase.split(' ').map(w => `+${w}`).join(' ');
                break;
            }
            results.push(phrase);
          }
        });
      });
    });

    setOutput(results.join('\n'));
    setCount(results.length);
  };

  const clearAll = () => {
    setColA('');
    setColB('');
    setColC('');
    setOutput('');
    setCount(0);
  };

  const copyToClipboard = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Shuffle className="w-8 h-8 text-indigo-500" />
              PPC Campaign Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Generate thousands of Amazon & Google keyword variations in seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
             <Target className="w-4 h-4 text-emerald-500" />
             <span className="text-sm font-medium text-slate-300">
                Mode: {matchType.toUpperCase()}
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: BUILDER (9 Cols) --- */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Input Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Col A */}
               <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-3">
                     <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider">A: Seed / Prefix</label>
                     <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">{colA.split('\n').filter(s=>s.trim()).length}</span>
                  </div>
                  <textarea 
                     value={colA}
                     onChange={e => setColA(e.target.value)}
                     className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:border-indigo-500 outline-none resize-none"
                     placeholder="e.g.&#10;Nike&#10;Adidas&#10;Running"
                  />
               </div>

               {/* Col B */}
               <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-3">
                     <label className="text-xs font-bold text-blue-400 uppercase tracking-wider">B: Product / Core</label>
                     <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">{colB.split('\n').filter(s=>s.trim()).length}</span>
                  </div>
                  <textarea 
                     value={colB}
                     onChange={e => setColB(e.target.value)}
                     className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:border-blue-500 outline-none resize-none"
                     placeholder="e.g.&#10;Shoes&#10;Sneakers&#10;Trainers"
                  />
               </div>

               {/* Col C */}
               <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col h-[400px]">
                  <div className="flex justify-between items-center mb-3">
                     <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider">C: Suffix / Modifier</label>
                     <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">{colC.split('\n').filter(s=>s.trim()).length}</span>
                  </div>
                  <textarea 
                     value={colC}
                     onChange={e => setColC(e.target.value)}
                     className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-300 focus:border-emerald-500 outline-none resize-none"
                     placeholder="e.g.&#10;Men&#10;Women&#10;Sale"
                  />
               </div>
            </div>

            {/* Output Area */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
               <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     <span className="text-sm font-bold text-white">Generated Keywords ({count})</span>
                  </div>
                  <button onClick={copyToClipboard} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition text-slate-300 hover:text-white">
                     <Copy className="w-3 h-3" /> Copy All
                  </button>
               </div>
               <textarea 
                  readOnly
                  value={output}
                  className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-emerald-400 focus:outline-none resize-none"
                  placeholder="Results will appear here..."
               />
            </div>

          </div>

          {/* --- RIGHT: CONTROLS (3 Cols) --- */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Action Panel */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 sticky top-6">
               <h3 className="font-bold text-white flex items-center gap-2 mb-6">
                  <Settings className="w-4 h-4 text-slate-400" /> Configuration
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Match Type</label>
                     <div className="grid grid-cols-1 gap-2">
                        <button 
                           onClick={() => setMatchType('broad')} 
                           className={`px-4 py-2 rounded text-sm text-left border transition-all ${matchType === 'broad' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                        >
                           Broad <span className="float-right opacity-50">abc</span>
                        </button>
                        <button 
                           onClick={() => setMatchType('phrase')} 
                           className={`px-4 py-2 rounded text-sm text-left border transition-all ${matchType === 'phrase' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                        >
                           "Phrase" <span className="float-right opacity-50">"abc"</span>
                        </button>
                        <button 
                           onClick={() => setMatchType('exact')} 
                           className={`px-4 py-2 rounded text-sm text-left border transition-all ${matchType === 'exact' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                        >
                           [Exact] <span className="float-right opacity-50">[abc]</span>
                        </button>
                     </div>
                  </div>

                  <div className="h-px bg-slate-800 my-2"></div>

                  <button 
                     onClick={generateMix}
                     className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-2"
                  >
                     <Zap className="w-4 h-4 fill-current" /> Generate Mix
                  </button>

                  <button 
                     onClick={clearAll}
                     className="w-full py-2 bg-transparent border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-medium rounded-lg transition"
                  >
                     Reset
                  </button>
               </div>
            </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              PPC Strategy Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Search className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Broad vs. Phrase</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    <b>Broad:</b> Cheapest, high reach, but irrelevant clicks.
                    <br/>
                    <b>Phrase:</b> Balanced. Order matters. "Red Shoes" matches "Big Red Shoes".
                    <br/>
                    Use this tool to generate Phrase lists for better ROI.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Target className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The Exact Match Sniper</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Use the <b>[Exact]</b> mode for your high-converting keywords.
                    <br/>
                    If you know "Running Shoes Men" sells well, generate [Running Shoes Men] and bid high on it.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Zap className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Negative Keywords</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    You can also use this tool to create <b>Negative Exact</b> lists.
                    <br/>
                    Mix "Free", "Cheap", "Used" in Col A with your product name in Col B to block bad traffic.
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