'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; // Added for Extension integration
import { 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  BarChart3, 
  AlertTriangle, 
  BookOpen,
  Image as ImageIcon,
  Type,
  Video,
  Star,
  Zap // Added icon for "Auto-Detected"
} from 'lucide-react';

type AuditItem = {
  id: string;
  label: string;
  weight: number;
  category: 'content' | 'media' | 'reviews';
  checked: boolean;
  tip: string;
};

const INITIAL_ITEMS: AuditItem[] = [
  { id: 'title', label: 'Title > 150 Characters', weight: 15, category: 'content', checked: false, tip: 'Use long-tail keywords for SEO visibility.' },
  { id: 'bullets', label: '5+ Bullet Points', weight: 15, category: 'content', checked: false, tip: 'Highlight benefits, not just features.' },
  { id: 'backend', label: 'Backend Search Terms Filled', weight: 10, category: 'content', checked: false, tip: 'Use the hidden 249 bytes wisely.' },
  { id: 'images', label: '7+ Images Uploaded', weight: 15, category: 'media', checked: false, tip: 'Use all available slots.' },
  { id: 'whitebg', label: 'Main Image White BG', weight: 5, category: 'media', checked: false, tip: 'Strict Amazon requirement.' },
  { id: 'video', label: 'Product Video', weight: 10, category: 'media', checked: false, tip: 'Videos increase conversion by 20%.' },
  { id: 'aplus', label: 'A+ Content (EBC)', weight: 10, category: 'media', checked: false, tip: 'Reduces bounce rate significantly.' },
  { id: 'reviews', label: '4.0+ Star Rating', weight: 10, category: 'reviews', checked: false, tip: 'Social proof is critical.' },
  { id: 'count', label: '15+ Reviews', weight: 5, category: 'reviews', checked: false, tip: 'Builds initial trust.' },
  { id: 'prime', label: 'Prime Eligible', weight: 5, category: 'reviews', checked: false, tip: 'FBA listings rank higher.' },
];

function AuditorContent() {
  // --- STATE ---
  const [items, setItems] = useState<AuditItem[]>(INITIAL_ITEMS);
  const [score, setScore] = useState(0);
  const [grade, setGrade] = useState('F');
  const [status, setStatus] = useState('Critical');
  const [isAutoFilled, setIsAutoFilled] = useState(false); // New State to show "Detected" badge
  
  const searchParams = useSearchParams();

  // --- NEW: CHROME EXTENSION LISTENER & ADVANCED LOGIC ---
  useEffect(() => {
    const autoFillData = searchParams.get('auto_fill');

    if (autoFillData) {
      try {
        const data = JSON.parse(decodeURIComponent(autoFillData));
        
        // Map the raw data to our Checklist Logic
        const newItems = items.map(item => {
          // Logic 1: Title Length Strategy
          if (item.id === 'title') {
            return { ...item, checked: (data.title && data.title.length > 150) };
          }
          // Logic 2: Bullet Count Strategy
          if (item.id === 'bullets') {
            return { ...item, checked: (data.bullets && data.bullets >= 5) };
          }
          // Logic 3: Image Count Strategy
          if (item.id === 'images') {
            return { ...item, checked: (data.images && data.images >= 7) };
          }
          // Logic 4: Video Detection
          if (item.id === 'video') {
            return { ...item, checked: !!data.hasVideo };
          }
          // Logic 5: Rating Check (if data exists)
          if (item.id === 'reviews' && data.rating) {
             // Extract number from string like "4.5 out of 5 stars" if needed
             const ratingVal = parseFloat(data.rating); 
             return { ...item, checked: (!isNaN(ratingVal) && ratingVal >= 4.0) };
          }
          
          return item;
        });

        setItems(newItems);
        setIsAutoFilled(true);
      } catch (e) {
        console.error("Failed to parse extension data", e);
      }
    }
  }, [searchParams]);

  // --- ENGINE ---
  useEffect(() => {
    // 1. Calculate Score
    const totalPoints = items.reduce((sum, item) => item.checked ? sum + item.weight : sum, 0);
    setScore(totalPoints);

    // 2. Determine Grade
    if (totalPoints >= 90) { setGrade('A+'); setStatus('Excellent'); }
    else if (totalPoints >= 80) { setGrade('A'); setStatus('Great'); }
    else if (totalPoints >= 70) { setGrade('B'); setStatus('Good'); }
    else if (totalPoints >= 50) { setGrade('C'); setStatus('Average'); }
    else { setGrade('D'); setStatus('Poor'); }

  }, [items]);

  const toggleItem = (id: string) => {
    setItems(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const getMissingItems = () => items.filter(i => !i.checked).sort((a,b) => b.weight - a.weight);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Listing Quality Auditor (LQS)
            </h1>
            <p className="text-slate-400 mt-2">
              Evaluate your Amazon listing against the top 10 ranking factors.
            </p>
          </div>
          
          <div className="flex gap-3">
            {isAutoFilled && (
               <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-lg border border-blue-500/50 text-sm text-blue-400 animate-pulse">
                  <Zap className="w-4 h-4" />
                  <span>Data Auto-Detected</span>
               </div>
            )}
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 text-sm text-slate-400">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <span>Algorithm: Amazon A10 Weights</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          
          {/* --- LEFT: CHECKLIST (8 Cols) --- */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Section 1: Content */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2">
                  <Type className="w-4 h-4 text-blue-400" />
                  <h3 className="font-bold text-white">SEO & Content</h3>
               </div>
               <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.filter(i => i.category === 'content').map(item => (
                     <div 
                        key={item.id} 
                        onClick={() => toggleItem(item.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                           item.checked ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                     >
                        <div className="flex items-center gap-3">
                           <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              item.checked ? 'bg-blue-500 border-blue-500' : 'border-slate-600 group-hover:border-slate-400'
                           }`}>
                              {item.checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                           </div>
                           <span className={item.checked ? 'text-blue-100 font-medium' : 'text-slate-400'}>{item.label}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500 font-mono">+{item.weight}pts</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* Section 2: Media */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-white">Visuals & Media</h3>
               </div>
               <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.filter(i => i.category === 'media').map(item => (
                     <div 
                        key={item.id} 
                        onClick={() => toggleItem(item.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                           item.checked ? 'bg-purple-900/20 border-purple-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                     >
                        <div className="flex items-center gap-3">
                           <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              item.checked ? 'bg-purple-500 border-purple-500' : 'border-slate-600 group-hover:border-slate-400'
                           }`}>
                              {item.checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                           </div>
                           <span className={item.checked ? 'text-purple-100 font-medium' : 'text-slate-400'}>{item.label}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500 font-mono">+{item.weight}pts</span>
                     </div>
                  ))}
               </div>
            </div>

            {/* Section 3: Reviews */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <h3 className="font-bold text-white">Conversion & Proof</h3>
               </div>
               <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.filter(i => i.category === 'reviews').map(item => (
                     <div 
                        key={item.id} 
                        onClick={() => toggleItem(item.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between group ${
                           item.checked ? 'bg-yellow-900/20 border-yellow-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                     >
                        <div className="flex items-center gap-3">
                           <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                              item.checked ? 'bg-yellow-500 border-yellow-500' : 'border-slate-600 group-hover:border-slate-400'
                           }`}>
                              {item.checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                           </div>
                           <span className={item.checked ? 'text-yellow-100 font-medium' : 'text-slate-400'}>{item.label}</span>
                        </div>
                        <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500 font-mono">+{item.weight}pts</span>
                     </div>
                  ))}
               </div>
            </div>

          </div>

          {/* --- RIGHT: SCORECARD (4 Cols) --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Score Wheel */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-8 flex flex-col items-center justify-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 opacity-5">
                  <Trophy className="w-40 h-40" />
               </div>
               
               <div className="relative z-10 text-center">
                  <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Quality Score</h3>
                  
                  <div className="relative w-40 h-40 flex items-center justify-center mx-auto mb-4">
                     {/* Background Circle */}
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-800" />
                        {/* Progress Circle */}
                        <circle 
                           cx="80" cy="80" r="70" 
                           stroke="currentColor" 
                           strokeWidth="10" 
                           fill="transparent" 
                           strokeLinecap="round"
                           className={`transition-all duration-1000 ease-out ${
                              score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500'
                           }`}
                           strokeDasharray={440} 
                           strokeDashoffset={440 - (440 * score) / 100} 
                        />
                     </svg>
                     <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-5xl font-black text-white">{score}</span>
                        <span className="text-xs text-slate-500">/ 100</span>
                     </div>
                  </div>

                  <div className={`text-4xl font-black mb-1 ${
                     score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                     {grade}
                  </div>
                  <p className="text-sm text-slate-400 font-medium">{status}</p>
               </div>
            </div>

            {/* Recommendations */}
            <div className="bg-indigo-900/20 border border-indigo-900/50 rounded-xl p-6">
               <h3 className="font-bold text-white flex items-center gap-2 mb-4 text-sm">
                  <AlertTriangle className="w-4 h-4 text-indigo-400" /> Priority Fixes
               </h3>
               
               {getMissingItems().length > 0 ? (
                  <ul className="space-y-3">
                     {getMissingItems().slice(0, 4).map(item => (
                        <li key={item.id} className="flex gap-3 items-start text-xs">
                           <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                           <div>
                              <span className="text-slate-300 block mb-0.5">{item.label}</span>
                              <span className="text-slate-500 leading-tight">{item.tip}</span>
                           </div>
                        </li>
                     ))}
                  </ul>
               ) : (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                     <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                     <p className="text-sm text-emerald-400 font-bold">Perfect Listing!</p>
                     <p className="text-xs text-slate-400 mt-1">You are ready to launch ads.</p>
                  </div>
               )}
            </div>

          </div>

        </div>

        {/* --- GUIDE SECTION --- */}
        <div className="border-t border-slate-800 pt-10">
           <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              LQS Ranking Guide
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Type className="w-5 h-5 text-blue-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Why Title Matters?</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    The title is the #1 factor for Amazon's algorithm. 
                    <br/>
                    <b>Tip:</b> Include your top 3 keywords in the first 80 characters. Don't waste space with filler words.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-purple-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">Image Optimization</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Customers can't touch the product. Images are their only way to "feel" it.
                    <br/>
                    <b>Required:</b> 1 Main (White BG), 3 Lifestyle, 2 Infographics, 1 Video.
                 </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                 <div className="bg-yellow-500/10 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
                    <Video className="w-5 h-5 text-yellow-400" />
                 </div>
                 <h3 className="font-bold text-white mb-2">The Video Edge</h3>
                 <p className="text-sm text-slate-400 leading-relaxed">
                    Listings with video convert <b>20% better</b>. It keeps users on the page longer (Dwell Time), which signals Amazon to rank you higher.
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

// Wrap in Suspense for Next.js 13+ client component requirements with searchParams
export default function SmartListingAuditor() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading Auditor...</div>}>
      <AuditorContent />
    </Suspense>
  );
}