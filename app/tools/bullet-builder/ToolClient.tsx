'use client';

import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Wand2, 
  AlertTriangle, 
  CheckCircle2, 
  Trash2, 
  BookOpen, 
  PenTool, 
  Search,
  Hash,
  Sparkles
} from 'lucide-react';

// Amazon Policy: Banned words that can trigger suppression
const BANNED_WORDS = [
  'guarantee', 'warranty', 'best seller', 'free shipping', 
  'money back', 'satisfaction', 'promo', 'discount', 
  'sale', 'award winning', 'fda approved'
];

// Powerful sales words to encourage
const POWER_WORDS = [
  'premium', 'durable', 'exclusive', 'instant', 
  'effortless', 'upgrade', 'protect', 'proven'
];

export default function AdvancedListingOptimizer() {
  // State for 5 bullet points
  const [bullets, setBullets] = useState<string[]>(['', '', '', '', '']);
  const [selectedIcon, setSelectedIcon] = useState('✅');
  
  // Analytics State
  const [metrics, setMetrics] = useState({
    totalBytes: 0,
    bannedFound: [] as string[],
    powerWordsFound: 0,
    readabilityScore: 0,
  });

  // --- ANALYSIS ENGINE ---
  useEffect(() => {
    let bytes = 0;
    let banned: string[] = [];
    let powerCount = 0;
    let totalSentences = 0;
    let totalWords = 0;
    let totalSyllables = 0;

    bullets.forEach(text => {
      if (!text) return;
      
      const lower = text.toLowerCase();

      // 1. Byte Count (Amazon Limit is Byte-based, not Char-based)
      bytes += new TextEncoder().encode(text).length;

      // 2. Banned Word Scan
      BANNED_WORDS.forEach(word => {
        if (lower.includes(word) && !banned.includes(word)) {
          banned.push(word);
        }
      });

      // 3. Power Word Scan
      POWER_WORDS.forEach(word => {
        if (lower.includes(word)) powerCount++;
      });

      // 4. Readability Logic (Flesch-Kincaid Proxy)
      const words = text.split(/\s+/).filter(w => w.length > 0);
      const sentences = text.split(/[.!?]+/).filter(s => s.length > 0);
      totalWords += words.length;
      totalSentences += sentences.length;
      // Rough syllable estimation: words > 3 chars
      totalSyllables += words.filter(w => w.length > 2).length * 1.5; 
    });

    // Calc Readability (Higher is easier)
    let readability = 0;
    if (totalWords > 0 && totalSentences > 0) {
      // Simplified Flesch Reading Ease Formula
      readability = 206.835 - (1.015 * (totalWords / totalSentences)) - (84.6 * (totalSyllables / totalWords));
    }
    // Clamp 0-100
    readability = Math.max(0, Math.min(100, readability));

    setMetrics({
      totalBytes: bytes,
      bannedFound: banned,
      powerWordsFound: powerCount,
      readabilityScore: Math.round(readability)
    });

  }, [bullets]);

  // --- ACTIONS ---

  const handleUpdate = (index: number, value: string) => {
    const newBullets = [...bullets];
    newBullets[index] = value;
    setBullets(newBullets);
  };

  const applyIconPrefix = () => {
    const newBullets = bullets.map(b => {
      // Remove existing icons if present to avoid double stacking
      const clean = b.replace(/^[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uDBFF\uDC00-\uDFFF]+\s/, '');
      return clean.trim() ? `${selectedIcon} ${clean}` : '';
    });
    setBullets(newBullets);
  };

  const autoCapitalizeHeader = () => {
    const newBullets = bullets.map(b => {
      const parts = b.split(':');
      if (parts.length > 1) {
        // Upper case everything before the first colon
        return parts[0].toUpperCase() + ':' + parts.slice(1).join(':');
      }
      return b;
    });
    setBullets(newBullets);
  };

  const copyToClipboard = () => {
    const text = bullets.filter(b => b.trim()).join('\n');
    navigator.clipboard.writeText(text);
  };

  const clearAll = () => {
    if (confirm("Reset all fields?")) setBullets(['', '', '', '', '']);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-indigo-500" />
              Listing Optimization Engine
            </h1>
            <p className="text-slate-400 mt-2">
              AI-assisted bullet point builder with policy compliance & SEO analysis.
            </p>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={clearAll}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm border border-slate-800 text-slate-400 transition"
             >
                <Trash2 className="w-4 h-4" /> Reset
             </button>
             <button 
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-emerald-900/20"
             >
                <Copy className="w-4 h-4" /> Copy All
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: EDITOR (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Toolbar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center">
                     <select 
                        value={selectedIcon} 
                        onChange={e => setSelectedIcon(e.target.value)}
                        className="bg-transparent text-white text-sm p-1 outline-none cursor-pointer"
                     >
                        <option value="✅">✅ Check</option>
                        <option value="➤">➤ Arrow</option>
                        <option value="⭐">⭐ Star</option>
                        <option value="💎">💎 Gem</option>
                        <option value="🔥">🔥 Fire</option>
                        <option value="⚡">⚡ Bolt</option>
                     </select>
                  </div>
                  <button onClick={applyIconPrefix} className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                     + Apply Icons
                  </button>
               </div>
               
               <div className="h-6 w-px bg-slate-800"></div>

               <button 
                  onClick={autoCapitalizeHeader}
                  className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition"
               >
                  <Wand2 className="w-3 h-3 text-purple-400" />
                  Auto-Format Headers
               </button>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
               {bullets.map((text, i) => {
                  const bytes = new TextEncoder().encode(text).length;
                  const isLimit = bytes > 500; // Amazon Hard Limit per bullet
                  
                  return (
                     <div key={i} className="group relative">
                        <div className="absolute -left-8 top-4 text-xs font-mono text-slate-600">0{i+1}</div>
                        <div className="flex justify-between mb-1 px-1">
                           <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Feature Benefit</span>
                           <span className={`text-[10px] font-mono ${isLimit ? 'text-red-500' : 'text-slate-600'}`}>
                              {bytes} / 500 bytes
                           </span>
                        </div>
                        <textarea
                           value={text}
                           onChange={e => handleUpdate(i, e.target.value)}
                           rows={3}
                           className={`w-full bg-slate-900 border rounded-lg p-4 text-sm text-slate-200 leading-relaxed focus:outline-none focus:ring-1 transition resize-none ${
                              isLimit ? 'border-red-900/50 focus:ring-red-500' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                           }`}
                           placeholder="Describe a key feature and its benefit to the customer..."
                        />
                     </div>
                  );
               })}
            </div>
          </div>

          {/* --- RIGHT: INTELLIGENCE PANEL (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* 1. Policy Audit */}
            <div className={`rounded-xl border p-5 ${metrics.bannedFound.length > 0 ? 'bg-red-950/20 border-red-900' : 'bg-emerald-950/20 border-emerald-900'}`}>
               <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                  {metrics.bannedFound.length > 0 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  Policy Compliance
               </h3>
               {metrics.bannedFound.length > 0 ? (
                  <div>
                     <p className="text-xs text-red-300 mb-2">Detected restricted keywords that may trigger listing suppression:</p>
                     <div className="flex flex-wrap gap-2">
                        {metrics.bannedFound.map(w => (
                           <span key={w} className="px-2 py-1 bg-red-900/50 border border-red-800 rounded text-[10px] text-red-200 font-mono">
                              "{w}"
                           </span>
                        ))}
                     </div>
                  </div>
               ) : (
                  <p className="text-xs text-emerald-400">No banned keywords detected. Listing is safe from keyword-based suppression.</p>
               )}
            </div>

            {/* 2. Content Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
               <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <Search className="w-4 h-4" /> Content Quality
               </h3>
               
               <div className="space-y-4">
                  {/* Readability */}
                  <div>
                     <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Readability Score</span>
                        <span className={`font-bold ${metrics.readabilityScore > 60 ? 'text-emerald-400' : 'text-orange-400'}`}>
                           {metrics.readabilityScore}/100
                        </span>
                     </div>
                     <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${metrics.readabilityScore}%` }}></div>
                     </div>
                     <p className="text-[10px] text-slate-500 mt-1">Target 60+. Keep sentences short for mobile shoppers.</p>
                  </div>

                  {/* Power Words */}
                  <div>
                     <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Power Words Used</span>
                        <span className="font-bold text-white">{metrics.powerWordsFound}</span>
                     </div>
                     <p className="text-[10px] text-slate-500">Words like "Premium", "Durable", "Instant" boost conversion.</p>
                  </div>

                  {/* Total Bytes */}
                  <div className="pt-4 border-t border-slate-800">
                     <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Total Byte Count</span>
                        <span className={`font-bold ${metrics.totalBytes < 2500 ? 'text-slate-300' : 'text-red-400'}`}>{metrics.totalBytes} / 2500</span>
                     </div>
                     <p className="text-[10px] text-slate-500">Amazon indexes the first 1000 bytes for SEO priority.</p>
                  </div>
               </div>
            </div>

            {/* 3. SEO Tip */}
            <div className="bg-indigo-900/20 border border-indigo-900/50 rounded-xl p-5">
               <div className="flex gap-3">
                  <Hash className="w-5 h-5 text-indigo-400 shrink-0" />
                  <div>
                     <h4 className="text-xs font-bold text-indigo-300 uppercase mb-1">Formatting Strategy</h4>
                     <p className="text-xs text-slate-400 leading-relaxed">
                        Use the <b>Auto-Format</b> tool. Capitalizing the first phrase (e.g., "LONG BATTERY LIFE:") acts as a visual hook, allowing customers to scan 5 bullets in 2 seconds.
                     </p>
                  </div>
               </div>
            </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              Optimization Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <PenTool className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Structure is Key</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Don't write walls of text. Follow this formula:
                    <br/>
                    <b>[HEADER IN CAPS]:</b> [Benefit explanation] + [Technical Feature].
                    <br/><br/>
                    <i>Example:</i> <b>24H INSULATION:</b> Keep drinks cold all day with double-wall vacuum steel.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-red-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Avoid "Subjective" Claims</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Amazon suppresses listings that use words like <b>"Best Seller"</b>, <b>"Ideal for everyone"</b>, or <b>"Satisfaction Guaranteed"</b>.
                    <br/>
                    Stick to factual data (sizes, materials, hours, watts).
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Search className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The Byte Limit Trap</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Amazon limits fields by <b>Bytes</b>, not characters.
                    <br/>
                    Standard Text: 1 char = 1 byte.
                    <br/>
                    Emojis (🔥): 1 char = <b>4 bytes</b>.
                    <br/>
                    This tool calculates Bytes so your listing doesn't get cut off.
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