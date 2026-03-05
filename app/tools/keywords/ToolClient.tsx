'use client';

import React, { useState, useEffect } from 'react';
import { 
  Eraser, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  Scissors,
  BookOpen,
  Search,
  Filter
} from 'lucide-react';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'as', 'into', 'like',
  'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without',
  'before', 'under', 'around', 'among', 'this', 'that', 'these', 'those', 'it', 'its',
  'they', 'their', 'them', 'we', 'our', 'us', 'you', 'your', 'my', 'mine', 'me',
  'he', 'him', 'his', 'she', 'her', 'hers', 'which', 'who', 'whom', 'whose',
  'what', 'where', 'when', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now'
]);

export default function SearchTermOptimizer() {
  // --- STATE ---
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [metrics, setMetrics] = useState({
    byteCount: 0,
    wordCount: 0,
    charCount: 0,
    removedCount: 0,
    limitStatus: 'good' as 'good' | 'warning' | 'critical'
  });
  
  const [settings, setSettings] = useState({
    removeStopWords: true,
    removeDuplicates: true,
    removeSpecialChars: true,
    lowercase: true
  });

  // --- ENGINE ---
  const processKeywords = () => {
    if (!input.trim()) {
      setOutput('');
      setMetrics({ byteCount: 0, wordCount: 0, charCount: 0, removedCount: 0, limitStatus: 'good' });
      return;
    }

    let text = input;

    // 1. Lowercase
    if (settings.lowercase) text = text.toLowerCase();

    // 2. Remove Special Chars (Keep only alphanumerics and spaces)
    if (settings.removeSpecialChars) {
      text = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
    }

    // 3. Split into words
    let words = text.split(/\s+/).filter(w => w.length > 0);
    const initialCount = words.length;

    // 4. Filter Stop Words
    if (settings.removeStopWords) {
      words = words.filter(w => !STOP_WORDS.has(w));
    }

    // 5. Remove Duplicates
    if (settings.removeDuplicates) {
      words = [...new Set(words)];
    }

    // 6. Output & Metrics
    const finalString = words.join(' ');
    const bytes = new TextEncoder().encode(finalString).length;
    
    let status: 'good' | 'warning' | 'critical' = 'good';
    if (bytes > 200) status = 'warning';
    if (bytes > 249) status = 'critical';

    setOutput(finalString);
    setMetrics({
      byteCount: bytes,
      wordCount: words.length,
      charCount: finalString.length,
      removedCount: initialCount - words.length,
      limitStatus: status
    });
  };

  // Auto-process when input or settings change
  useEffect(() => {
    processKeywords();
  }, [input, settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
  };

  const clearAll = () => {
    setInput('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
               <Filter className="w-8 h-8 text-emerald-500" />
               Search Term Optimizer
            </h1>
            <p className="text-slate-400 mt-2">
              Maximize Amazon backend keywords by removing junk & duplicates.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
             <AlertCircle className={`w-4 h-4 ${metrics.limitStatus === 'critical' ? 'text-red-500' : 'text-slate-500'}`} />
             <span>Limit: 249 Bytes</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: INPUT & SETTINGS (5 Cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Input Box */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col h-[400px]">
               <div className="flex justify-between items-center mb-3">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Keywords (Paste Here)</label>
                  <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                     <Trash2 className="w-3 h-3" /> Clear
                  </button>
               </div>
               <textarea 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 focus:border-emerald-500 outline-none resize-none leading-relaxed"
                  placeholder="Paste your keyword research here... e.g.&#10;Running shoes, shoes for men, cheap running shoes, best red shoe"
               />
            </div>

            {/* Settings Panel */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
               <h3 className="font-bold text-white flex items-center gap-2 mb-4 text-sm">
                  <Settings className="w-4 h-4 text-emerald-400" /> Optimization Filters
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                     <input type="checkbox" checked={settings.removeDuplicates} onChange={e => setSettings({...settings, removeDuplicates: e.target.checked})} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-offset-slate-900" />
                     <span className="text-sm text-slate-400 group-hover:text-white transition">Remove Duplicates</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                     <input type="checkbox" checked={settings.removeStopWords} onChange={e => setSettings({...settings, removeStopWords: e.target.checked})} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-offset-slate-900" />
                     <span className="text-sm text-slate-400 group-hover:text-white transition">Remove Stop Words</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                     <input type="checkbox" checked={settings.removeSpecialChars} onChange={e => setSettings({...settings, removeSpecialChars: e.target.checked})} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-offset-slate-900" />
                     <span className="text-sm text-slate-400 group-hover:text-white transition">Remove Punctuation</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                     <input type="checkbox" checked={settings.lowercase} onChange={e => setSettings({...settings, lowercase: e.target.checked})} className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-offset-slate-900" />
                     <span className="text-sm text-slate-400 group-hover:text-white transition">Force Lowercase</span>
                  </label>
               </div>
            </div>

          </div>

          {/* --- RIGHT: OUTPUT & METRICS (7 Cols) --- */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Metrics Dashboard */}
            <div className={`rounded-xl border p-6 flex items-center justify-between shadow-lg transition-colors duration-500 ${
               metrics.limitStatus === 'critical' ? 'bg-red-950/20 border-red-900' : 
               metrics.limitStatus === 'warning' ? 'bg-yellow-950/20 border-yellow-900' : 
               'bg-emerald-950/20 border-emerald-900'
            }`}>
               <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Byte Usage</span>
                  <div className="flex items-baseline gap-2">
                     <span className={`text-4xl font-extrabold ${
                        metrics.limitStatus === 'critical' ? 'text-red-400' : 
                        metrics.limitStatus === 'warning' ? 'text-yellow-400' : 'text-emerald-400'
                     }`}>
                        {metrics.byteCount}
                     </span>
                     <span className="text-sm text-slate-500">/ 249</span>
                  </div>
               </div>

               <div className="flex gap-8">
                  <div className="text-right">
                     <span className="text-xs text-slate-500 block mb-1">Words</span>
                     <span className="text-xl font-bold text-white">{metrics.wordCount}</span>
                  </div>
                  <div className="text-right">
                     <span className="text-xs text-slate-500 block mb-1">Removed</span>
                     <span className="text-xl font-bold text-slate-300">{metrics.removedCount}</span>
                  </div>
               </div>
            </div>

            {/* Output Area */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 h-[300px] flex flex-col">
               <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                     <span className="text-sm font-bold text-white">Optimized Output</span>
                  </div>
                  <button onClick={handleCopy} className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition text-slate-300 hover:text-white">
                     <Copy className="w-3 h-3" /> Copy Result
                  </button>
               </div>
               <textarea 
                  readOnly
                  value={output}
                  className={`flex-1 w-full bg-slate-950 border rounded-lg p-4 text-sm font-mono focus:outline-none resize-none leading-relaxed ${
                     metrics.limitStatus === 'critical' ? 'border-red-900/50 text-red-200' : 'border-slate-800 text-emerald-300'
                  }`}
                  placeholder="Optimized keywords will appear here..."
               />
               {metrics.limitStatus === 'critical' && (
                  <div className="mt-2 text-xs text-red-400 flex items-center gap-2">
                     <AlertCircle className="w-3 h-3" />
                     Over limit! Remove {metrics.byteCount - 249} bytes to save.
                  </div>
               )}
            </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-500" />
              SEO Best Practices
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Scissors className="w-5 h-5 text-emerald-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">No Commas needed</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Amazon's search engine treats spaces as separators. Commas just waste bytes. 
                    <br/>
                    "shoe, red, running" (18 bytes) vs "shoe red running" (16 bytes).
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Eraser className="w-5 h-5 text-indigo-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Stop Words</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Words like "a", "the", "for", "with" are ignored by Amazon's A9 algorithm. Removing them makes space for valuable keywords like "premium" or "durable".
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-orange-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Search className="w-5 h-5 text-orange-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Byte vs. Char</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Amazon limits by <b>Bytes</b>, not characters. Standard letters are 1 byte. Emojis or special symbols can be 3-4 bytes. This tool counts accurately.
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