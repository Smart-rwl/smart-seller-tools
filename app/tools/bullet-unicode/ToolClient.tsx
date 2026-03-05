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

/* ---------------------------------------------
   AMAZON POLICY CONFIG
--------------------------------------------- */

const BANNED_WORDS = [
  'guarantee', 'warranty', 'best seller', 'free shipping', 
  'money back', 'satisfaction', 'promo', 'discount', 
  'sale', 'award winning', 'fda approved'
];

const POWER_WORDS = [
  'premium', 'durable', 'exclusive', 'instant', 
  'effortless', 'upgrade', 'protect', 'proven'
];

/* ---------------------------------------------
   UNICODE HEADER FORMATTER (Before :)
--------------------------------------------- */

const UNICODE_MAP: Record<string, string> = {
  A:"𝗔",B:"𝗕",C:"𝗖",D:"𝗗",E:"𝗘",F:"𝗙",G:"𝗚",H:"𝗛",I:"𝗜",J:"𝗝",
  K:"𝗞",L:"𝗟",M:"𝗠",N:"𝗡",O:"𝗢",P:"𝗣",Q:"𝗤",R:"𝗥",S:"𝗦",T:"𝗧",
  U:"𝗨",V:"𝗩",W:"𝗪",X:"𝗫",Y:"𝗬",Z:"𝗭",
  a:"𝗮",b:"𝗯",c:"𝗰",d:"𝗱",e:"𝗲",f:"𝗳",g:"𝗴",h:"𝗵",i:"𝗶",j:"𝗷",
  k:"𝗸",l:"𝗹",m:"𝗺",n:"𝗻",o:"𝗼",p:"𝗽",q:"𝗾",r:"𝗿",s:"𝘀",t:"𝘁",
  u:"𝘂",v:"𝘃",w:"𝘄",x:"𝘅",y:"𝘆",z:"𝘇",
  0:"𝟬",1:"𝟭",2:"𝟮",3:"𝟯",4:"𝟰",5:"𝟱",6:"𝟲",7:"𝟳",8:"𝟴",9:"𝟵"
};

const unicodeBeforeColon = (text: string) => {
  if (!text.includes(':')) return text;
  const colonIndex = text.indexOf(':');
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i <= colonIndex && UNICODE_MAP[ch]) out += UNICODE_MAP[ch];
    else out += ch;
  }
  return out;
};

/* ---------------------------------------------
   COMPONENT
--------------------------------------------- */

export default function AdvancedListingOptimizer() {

  const [bullets, setBullets] = useState<string[]>(['', '', '', '', '']);
  const [selectedIcon, setSelectedIcon] = useState('✅');

  const [metrics, setMetrics] = useState({
    totalBytes: 0,
    bannedFound: [] as string[],
    powerWordsFound: 0,
    readabilityScore: 0,
  });

  /* ---------------------------------------------
     ANALYTICS ENGINE
  --------------------------------------------- */

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
      bytes += new TextEncoder().encode(text).length;

      BANNED_WORDS.forEach(word => {
        if (lower.includes(word) && !banned.includes(word)) banned.push(word);
      });

      POWER_WORDS.forEach(word => {
        if (lower.includes(word)) powerCount++;
      });

      const words = text.split(/\s+/).filter(Boolean);
      const sentences = text.split(/[.!?]+/).filter(Boolean);

      totalWords += words.length;
      totalSentences += sentences.length;
      totalSyllables += words.filter(w => w.length > 2).length * 1.5;
    });

    let readability = 0;
    if (totalWords && totalSentences) {
      readability = 206.835 - (1.015 * (totalWords / totalSentences)) - (84.6 * (totalSyllables / totalWords));
    }

    readability = Math.max(0, Math.min(100, readability));

    setMetrics({
      totalBytes: bytes,
      bannedFound: banned,
      powerWordsFound: powerCount,
      readabilityScore: Math.round(readability)
    });
  }, [bullets]);

  /* ---------------------------------------------
     ACTIONS
  --------------------------------------------- */

  const handleUpdate = (i: number, value: string) => {
    const copy = [...bullets];
    copy[i] = value;
    setBullets(copy);
  };

  const applyIconPrefix = () => {
    setBullets(bullets.map(b => {
      const clean = b.replace(/^[\u2700-\u27BF\uE000-\uF8FF\uD83C-\uDBFF\uDC00-\uDFFF]+\s/, '');
      return clean.trim() ? `${selectedIcon} ${clean}` : '';
    }));
  };

  const autoCapitalizeHeader = () => {
    setBullets(bullets.map(b => {
      const parts = b.split(':');
      return parts.length > 1 ? parts[0].toUpperCase() + ':' + parts.slice(1).join(':') : b;
    }));
  };

  const applyUnicodeHeader = () => {
    setBullets(bullets.map(b => unicodeBeforeColon(b)));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bullets.filter(Boolean).join('\n'));
  };

  const clearAll = () => {
    if (confirm('Reset all fields?')) setBullets(['', '', '', '', '']);
  };

  /* ---------------------------------------------
     UI
  --------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="text-indigo-500" /> Listing Optimization Engine
          </h1>
          <div className="flex gap-3">
            <button onClick={clearAll} className="px-4 py-2 bg-slate-900 rounded border border-slate-800 text-sm flex gap-2">
              <Trash2 className="w-4 h-4" /> Reset
            </button>
            <button onClick={copyToClipboard} className="px-6 py-2 bg-emerald-600 rounded text-white flex gap-2">
              <Copy className="w-4 h-4" /> Copy All
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex gap-4 mb-6">
          <select value={selectedIcon} onChange={e => setSelectedIcon(e.target.value)} className="bg-slate-950 border border-slate-800 p-1">
            <option value="✅">Check</option>
            <option value="⭐">Star</option>
            <option value="🔥">Fire</option>
            <option value="⚡">Bolt</option>
          </select>

          <button onClick={applyIconPrefix} className="text-indigo-400 text-xs font-bold">+ Apply Icons</button>

          <button onClick={autoCapitalizeHeader} className="text-slate-300 text-xs font-bold flex gap-1">
            <Wand2 className="w-3 h-3 text-purple-400" /> CAPS Header
          </button>

          <button onClick={applyUnicodeHeader} className="text-indigo-400 text-xs font-bold flex gap-1">
            <Sparkles className="w-3 h-3" /> Unicode Header
          </button>
        </div>

        {/* BULLETS */}
        {bullets.map((text, i) => (
          <textarea
            key={i}
            value={text}
            onChange={e => handleUpdate(i, e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4"
            placeholder={`Bullet ${i + 1}`}
          />
        ))}


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
