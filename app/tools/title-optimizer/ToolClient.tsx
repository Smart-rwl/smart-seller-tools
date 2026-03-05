'use client';

import React, { useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Type, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  BookOpen,
  Search
} from 'lucide-react';

const MAX_DESKTOP = 200;
const MAX_MOBILE = 80;

export default function ListingTitleArchitect() {
  // --- STATE ---
  const [title, setTitle] = useState('');
  
  // --- METRICS ---
  const charCount = title.length;
  const wordCount = title.trim().split(/\s+/).filter(w => w.length > 0).length;
  
  // Progress Bar Logic
  const progressPercent = Math.min((charCount / MAX_DESKTOP) * 100, 100);
  let progressColor = 'bg-emerald-500'; // Good length
  if (charCount > MAX_MOBILE && charCount <= MAX_DESKTOP) progressColor = 'bg-blue-500'; // Desktop Only range
  if (charCount > MAX_DESKTOP) progressColor = 'bg-red-500'; // Violation

  // --- ACTIONS ---
  const handleTitleCase = () => {
    // Advanced Title Case: Lowercase minor words unless first word
    const minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of', 'with'];
    
    const formatted = title.toLowerCase().split(' ').map((word, index) => {
      if (index > 0 && minorWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
    
    setTitle(formatted);
  };

  const handleUpperCase = () => setTitle(title.toUpperCase());
  
  const handleCopy = () => navigator.clipboard.writeText(title);
  
  const handleClear = () => setTitle('');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Type className="w-8 h-8 text-indigo-500" />
              Listing Title Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Optimize product titles for Amazon SEO & Mobile conversion.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
             <Smartphone className="w-4 h-4 text-emerald-500" />
             <span>Mobile Limit: 80 Chars</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: EDITOR (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Input Area */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-1">
               <textarea 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-40 bg-slate-950 border border-transparent rounded-lg p-6 text-lg text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-0 outline-none resize-none leading-relaxed shadow-inner"
                  placeholder="Start typing your product title here... e.g. NIKE Men's Running Shoes Air Zoom Pegasus 39..."
               />
               
               {/* Toolbar */}
               <div className="bg-slate-900 p-3 flex gap-2 border-t border-slate-800 rounded-b-lg">
                  <button onClick={handleTitleCase} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-slate-300 transition">
                     Title Case
                  </button>
                  <button onClick={handleUpperCase} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-slate-300 transition">
                     UPPERCASE
                  </button>
                  <div className="flex-1"></div>
                  <button onClick={handleCopy} className="p-2 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition" title="Copy">
                     <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={handleClear} className="p-2 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400 transition" title="Clear">
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
            </div>

            {/* Analysis Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
               <div className="flex justify-between items-end mb-4">
                  <div>
                     <span className="text-5xl font-extrabold text-white">{charCount}</span>
                     <span className="text-sm text-slate-500 ml-2 font-bold uppercase tracking-wider">Characters</span>
                  </div>
                  <div className="text-right">
                     <span className="text-xl font-bold text-slate-400">{wordCount}</span>
                     <span className="text-xs text-slate-600 ml-1 font-bold uppercase">Words</span>
                  </div>
               </div>

               {/* Progress Bar */}
               <div className="relative h-6 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                  <div 
                     className={`h-full transition-all duration-500 ease-out ${progressColor}`} 
                     style={{ width: `${progressPercent}%` }}
                  ></div>
                  
                  {/* Markers */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-white/20 z-10" style={{ left: `${(MAX_MOBILE / MAX_DESKTOP) * 100}%` }} title="Mobile Cutoff"></div>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: '100%' }} title="Max Limit"></div>
               </div>
               
               <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
                  <span>0</span>
                  <span className="text-emerald-400">Mobile (80)</span>
                  <span className="text-blue-400">Desktop (200)</span>
               </div>
            </div>

            {/* Mobile Preview Simulation */}
            <div className="bg-white rounded-xl border-4 border-slate-800 overflow-hidden max-w-sm mx-auto shadow-2xl">
               <div className="bg-slate-100 border-b p-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Amazon Mobile App</span>
                  <Smartphone className="w-4 h-4 text-slate-400" />
               </div>
               <div className="p-4 flex gap-3">
                  <div className="w-24 h-24 bg-slate-200 rounded-lg shrink-0"></div>
                  <div>
                     <div className="text-sm text-gray-900 leading-snug font-sans line-clamp-3 mb-1">
                        {title || "Your Product Title..."}
                     </div>
                     <div className="text-xs text-slate-500 mb-1">by Your Brand</div>
                     <div className="flex items-center gap-1">
                        <div className="flex text-yellow-400 text-xs">★★★★☆</div>
                        <span className="text-xs text-cyan-600">1,204</span>
                     </div>
                     <div className="text-lg font-bold text-gray-900 mt-1">₹1,499</div>
                  </div>
               </div>
            </div>

          </div>

          {/* --- RIGHT: GUIDELINES (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Status Cards */}
            <div className={`p-5 rounded-xl border flex items-start gap-3 ${
               charCount <= MAX_MOBILE ? 'bg-emerald-950/30 border-emerald-900' : 'bg-slate-900 border-slate-800'
            }`}>
               <div className={`mt-1 ${charCount <= MAX_MOBILE ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {charCount <= MAX_MOBILE ? <CheckCircle2 className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
               </div>
               <div>
                  <h3 className={`font-bold text-sm ${charCount <= MAX_MOBILE ? 'text-emerald-400' : 'text-slate-300'}`}>Mobile Optimized</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                     Ideally, keep your most important keywords in the first 80 characters.
                  </p>
               </div>
            </div>

            <div className={`p-5 rounded-xl border flex items-start gap-3 ${
               charCount > MAX_MOBILE && charCount <= MAX_DESKTOP ? 'bg-blue-950/30 border-blue-900' : 'bg-slate-900 border-slate-800'
            }`}>
               <div className={`mt-1 ${charCount > MAX_MOBILE && charCount <= MAX_DESKTOP ? 'text-blue-400' : 'text-slate-500'}`}>
                  {charCount > MAX_MOBILE && charCount <= MAX_DESKTOP ? <CheckCircle2 className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
               </div>
               <div>
                  <h3 className={`font-bold text-sm ${charCount > MAX_MOBILE && charCount <= MAX_DESKTOP ? 'text-blue-400' : 'text-slate-300'}`}>Desktop Friendly</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                     Desktop allows up to 200 chars. Use this space for secondary keywords.
                  </p>
               </div>
            </div>

            {charCount > MAX_DESKTOP && (
               <div className="p-5 rounded-xl border bg-red-950/30 border-red-900 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-1" />
                  <div>
                     <h3 className="font-bold text-sm text-red-400">Suppression Risk</h3>
                     <p className="text-xs text-red-200/70 mt-1 leading-relaxed">
                        Titles over 200 characters may be suppressed from search results by Amazon's algorithm. Shorten it!
                     </p>
                  </div>
               </div>
            )}

            {/* Guide */}
            <div className="bg-indigo-900/10 border border-indigo-900/50 rounded-xl p-6">
               <h3 className="text-xs font-bold uppercase text-indigo-300 mb-4 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Amazon Style Guide
               </h3>
               <ul className="space-y-3">
                  <li className="flex gap-2 text-xs text-slate-400">
                     <span className="text-red-400 font-bold">✕</span>
                     <span>Don't use ALL CAPS constantly.</span>
                  </li>
                  <li className="flex gap-2 text-xs text-slate-400">
                     <span className="text-red-400 font-bold">✕</span>
                     <span>No promotional words ("Best Seller", "Free").</span>
                  </li>
                  <li className="flex gap-2 text-xs text-slate-400">
                     <span className="text-emerald-400 font-bold">✓</span>
                     <span>Capitalize the first letter of each word.</span>
                  </li>
                  <li className="flex gap-2 text-xs text-slate-400">
                     <span className="text-emerald-400 font-bold">✓</span>
                     <span>Use numerals ("3" instead of "Three").</span>
                  </li>
               </ul>
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