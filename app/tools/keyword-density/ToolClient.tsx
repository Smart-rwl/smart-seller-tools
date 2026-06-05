'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Copy,
  Trash2,
  Search,
  Settings,
  Check,
  Download,
  RotateCcw,
  Sparkles,
  Hash,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   STOP WORDS (expanded)
───────────────────────────────────────────── */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'so', 'yet', 'as',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'done',
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'against', 'into',
  'through', 'after', 'over', 'under', 'between', 'out', 'during', 'without',
  'before', 'above', 'below', 'around', 'among', 'from', 'up', 'down', 'off',
  'until', 'while', 'since', 'across', 'behind', 'beneath',
  'this', 'that', 'these', 'those', 'all', 'any', 'both', 'each', 'every',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same',
  'it', 'its', 'itself',
  'they', 'them', 'their', 'theirs', 'themselves',
  'we', 'us', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'my', 'mine', 'me', 'myself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  'which', 'who', 'whom', 'whose', 'what', 'where', 'when', 'why', 'how',
  'not', 'than', 'too', 'very', 'just', 'now', 'also', 'really', 'like',
]);

const STORAGE_KEY = 'competitor-keyword:state:v1';

const EXAMPLE_INPUT =
  `Premium running shoes for men with breathable mesh upper and cushioned midsole. ` +
  `Designed for daily training, marathon running, and casual wear. ` +
  `Lightweight running shoes with shock-absorbing soles. ` +
  `These men's running shoes feature anti-slip rubber outsole and reinforced toe cap. ` +
  `Comfortable men's athletic shoes perfect for running, walking, gym workouts. ` +
  `Includes lace-up closure and padded collar for ankle support. ` +
  `Best running shoes for marathon runners and athletes. Durable men's footwear.`;

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type NgramEntry = {
  text: string;
  count: number;
  density: number; // % of total words
};

type AnalysisSettings = {
  topN: 5 | 10 | 20;
  minWordLength: number;
  removeStopWords: boolean;
};

type AnalysisResult = {
  totalWords: number;
  uniqueContentWords: number;
  stopWordsRemoved: number;
  topShare: number; // % of total words covered by top-10 single keywords
  oneGrams: NgramEntry[];
  twoGrams: NgramEntry[];
  threeGrams: NgramEntry[];
  hasInput: boolean;
};

const EMPTY_RESULT: AnalysisResult = {
  totalWords: 0, uniqueContentWords: 0, stopWordsRemoved: 0, topShare: 0,
  oneGrams: [], twoGrams: [], threeGrams: [], hasInput: false,
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function CompetitorKeywordAnalyzer() {
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<AnalysisSettings>({
    topN: 10,
    minWordLength: 3,
    removeStopWords: true,
  });
  const [hydrated, setHydrated] = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.text === 'string') setText(s.text);
        if (s.settings) setSettings((prev) => ({ ...prev, ...s.settings }));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ text, settings }));
    } catch { /* ignore */ }
  }, [hydrated, text, settings]);

  /* ── Analyze (auto on text/settings change) ── */
  const result = useMemo(() => analyzeText(text, settings), [text, settings]);

  const update = <K extends keyof AnalysisSettings>(key: K, value: AnalysisSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const resetAll = () => {
    setText('');
    setSettings({ topN: 10, minWordLength: 3, removeStopWords: true });
  };

  /* ── Export full CSV ── */
  const handleExportCsv = () => {
    const csvParts: string[] = [
      'Type,Phrase,Count,Density (%)',
      ...result.oneGrams.map((e) => `1-gram,${csvEscape(e.text)},${e.count},${e.density.toFixed(2)}`),
      ...result.twoGrams.map((e) => `2-gram,${csvEscape(e.text)},${e.count},${e.density.toFixed(2)}`),
      ...result.threeGrams.map((e) => `3-gram,${csvEscape(e.text)},${e.count},${e.density.toFixed(2)}`),
    ];
    const csv = csvParts.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keyword-analysis-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-orange-500" />
              Competitor Keyword Analyzer
            </h1>
            <p className="text-slate-400 mt-2">
              Paste a competitor's listing — see which keywords and phrases they lean on hardest.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setText(EXAMPLE_INPUT)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-orange-400 hover:text-orange-300 transition"
            >
              <Sparkles className="w-3 h-3" /> Load example
            </button>
            {result.hasInput && (
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-200 transition"
              >
                <Download className="w-3 h-3" /> Export CSV
              </button>
            )}
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        {/* ─── INPUT + SETTINGS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

          {/* Input */}
          <div className="lg:col-span-8 bg-slate-900 rounded-xl border border-slate-800 p-5 flex flex-col h-[320px]">
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Competitor listing text
              </label>
              <button
                onClick={() => setText('')}
                disabled={!text}
                className="text-xs text-slate-400 hover:text-rose-400 disabled:text-slate-700 disabled:hover:text-slate-700 flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-sm text-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none leading-relaxed transition"
              placeholder="Paste the competitor's title, bullets, description — anything visible on their listing."
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Input: <span className="font-mono text-slate-400">{text.length}</span> characters
            </p>
          </div>

          {/* Settings */}
          <div className="lg:col-span-4 bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
              <Settings className="w-4 h-4 text-orange-400" /> Analysis settings
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Top N per list</label>
              <div className="grid grid-cols-3 gap-1.5">
                {([5, 10, 20] as const).map((n) => (
                  <button
                    key={n}
                    onClick={() => update('topN', n)}
                    className={`py-1.5 text-xs font-bold rounded border transition ${
                      settings.topN === n
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Top {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Min word length</label>
                <span className="text-orange-400 font-mono font-bold text-xs">{settings.minWordLength}</span>
              </div>
              <input
                type="range" min={2} max={6}
                value={settings.minWordLength}
                onChange={(e) => update('minWordLength', Number(e.target.value))}
                className="w-full accent-orange-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">For 1-grams. Drop words shorter than this.</p>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group pt-2 border-t border-slate-800">
              <span className="relative">
                <input
                  type="checkbox"
                  checked={settings.removeStopWords}
                  onChange={(e) => update('removeStopWords', e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-4 h-4 rounded border border-slate-600 bg-slate-950 peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center">
                  {settings.removeStopWords && <Check className="w-3 h-3 text-white" />}
                </span>
              </span>
              <span className="text-sm text-slate-300 group-hover:text-white transition select-none">Remove stop words</span>
            </label>
          </div>
        </div>

        {/* ─── STATS SUMMARY ─── */}
        {result.hasInput && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBlock label="Total words"        value={result.totalWords.toLocaleString()}        sub="all tokens" />
              <StatBlock label="Unique keywords"    value={result.uniqueContentWords.toLocaleString()} sub="after filters" />
              <StatBlock label="Stop words removed" value={result.stopWordsRemoved.toLocaleString()}  sub="excluded" />
              <StatBlock label={`Top ${settings.topN} share`} value={`${result.topShare.toFixed(1)}%`} sub="of all words" />
            </div>
          </div>
        )}

        {/* ─── RESULTS GRID ─── */}
        {result.hasInput ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-12">
            <NgramColumn title="Single keywords"  subtitle="1-word" icon={<Hash className="w-3.5 h-3.5" />}        entries={result.oneGrams}   accent="orange" />
            <NgramColumn title="Phrases"          subtitle="2-word" icon={<TrendingUp className="w-3.5 h-3.5" />}  entries={result.twoGrams}   accent="amber" />
            <NgramColumn title="Long phrases"     subtitle="3-word" icon={<Search className="w-3.5 h-3.5" />}      entries={result.threeGrams} accent="sky" />
          </div>
        ) : (
          <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-12 text-center mb-12">
            <BarChart3 className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Paste competitor text above to see their keyword fingerprint.</p>
          </div>
        )}

        {/* ─── CREATOR FOOTER (single, at page level) ─── */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            <a href="http://www.instagram.com/smartrwl" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-pink-500 transition-colors" title="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a href="https://github.com/Smart-rwl/" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-white transition-colors" title="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   ANALYSIS ENGINE
═════════════════════════════════════════════ */

function analyzeText(rawText: string, s: AnalysisSettings): AnalysisResult {
  if (!rawText.trim()) return EMPTY_RESULT;

  let text = rawText.toLowerCase();

  // Strip possessive 's before punctuation handling
  text = text.replace(/['']s\b/gi, '');

  // Unicode-aware punctuation strip (preserves accented chars)
  text = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  const allWords = text.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = allWords.length;
  if (totalWords === 0) return EMPTY_RESULT;

  // Count stop words removed (for stats)
  const stopWordsRemoved = s.removeStopWords
    ? allWords.filter((w) => STOP_WORDS.has(w)).length
    : 0;

  // 1-gram: only content words (passes min length + stop filter)
  const contentWords = allWords.filter((w) => {
    if (w.length < s.minWordLength) return false;
    if (s.removeStopWords && STOP_WORDS.has(w)) return false;
    return true;
  });

  const oneGramMap = new Map<string, number>();
  for (const w of contentWords) {
    oneGramMap.set(w, (oneGramMap.get(w) ?? 0) + 1);
  }

  // 2-gram / 3-gram: bookend filter (no stop word at start or end)
  const twoGramMap  = countPhrases(allWords, 2, s.removeStopWords);
  const threeGramMap = countPhrases(allWords, 3, s.removeStopWords);

  const oneGrams   = mapToEntries(oneGramMap,   totalWords).slice(0, s.topN);
  const twoGrams   = mapToEntries(twoGramMap,   totalWords).slice(0, s.topN);
  const threeGrams = mapToEntries(threeGramMap, totalWords).slice(0, s.topN);

  const topShare = (oneGrams.reduce((sum, e) => sum + e.count, 0) / totalWords) * 100;

  return {
    totalWords,
    uniqueContentWords: oneGramMap.size,
    stopWordsRemoved,
    topShare,
    oneGrams,
    twoGrams,
    threeGrams,
    hasInput: true,
  };
}

function countPhrases(words: string[], n: number, filterStopBookends: boolean): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i <= words.length - n; i++) {
    const slice = words.slice(i, i + n);
    if (filterStopBookends && (STOP_WORDS.has(slice[0]) || STOP_WORDS.has(slice[n - 1]))) continue;
    // Also skip if any word is too short (length 1) — noise reduction
    if (slice.some((w) => w.length < 2)) continue;
    const phrase = slice.join(' ');
    map.set(phrase, (map.get(phrase) ?? 0) + 1);
  }
  return map;
}

function mapToEntries(map: Map<string, number>, totalWords: number): NgramEntry[] {
  return Array.from(map.entries())
    .map(([text, count]) => ({
      text,
      count,
      density: totalWords > 0 ? (count / totalWords) * 100 : 0,
    }))
    .filter((e) => e.count > 1 || totalWords < 50) // hide singletons in larger texts (noise)
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text));
}

const csvEscape = (s: string): string =>
  /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

function StatBlock({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}

function NgramColumn({
  title, subtitle, icon, entries, accent,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  entries: NgramEntry[];
  accent: 'orange' | 'amber' | 'sky';
}) {
  const accentConfig = {
    orange: { text: 'text-orange-400', bar: 'bg-orange-500/70', chip: 'bg-orange-500/10 border-orange-500/30 text-orange-300' },
    amber:  { text: 'text-amber-400',  bar: 'bg-amber-500/70',  chip: 'bg-amber-500/10 border-amber-500/30 text-amber-300' },
    sky:    { text: 'text-sky-400',    bar: 'bg-sky-500/70',    chip: 'bg-sky-500/10 border-sky-500/30 text-sky-300' },
  }[accent];

  const [copied, setCopied] = useState(false);
  const maxCount = entries.length > 0 ? entries[0].count : 1;

  const handleCopyList = async () => {
    if (entries.length === 0) return;
    const text = entries.map((e) => e.text).join(', ');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={accentConfig.text}>{icon}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{title}</h3>
            <p className="text-[10px] text-slate-500">{subtitle} · {entries.length} found</p>
          </div>
        </div>
        <button
          onClick={handleCopyList}
          disabled={entries.length === 0}
          className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded transition flex items-center gap-1 ${
            copied
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
          title="Copy as comma-separated list"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="p-6 text-center text-xs text-slate-500">
          <AlertTriangle className="w-4 h-4 mx-auto mb-1 text-slate-700" />
          No {subtitle.toLowerCase()} found at current settings.
        </div>
      ) : (
        <div className="divide-y divide-slate-800">
          {entries.map((entry, idx) => {
            const barPct = (entry.count / maxCount) * 100;
            return (
              <div key={idx} className="px-4 py-2.5 hover:bg-slate-800/40 transition-colors">
                <div className="grid grid-cols-[1fr_50px_50px] gap-3 items-center">
                  <div className="min-w-0">
                    <div className="text-sm text-slate-200 font-mono truncate" title={entry.text}>{entry.text}</div>
                    <div className="h-1 bg-slate-950 rounded-full mt-1.5 border border-slate-800 overflow-hidden">
                      <div className={`h-full ${accentConfig.bar} transition-all`} style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                  <div className={`text-sm font-mono font-bold text-right ${accentConfig.text}`}>{entry.count}</div>
                  <div className="text-[10px] text-slate-500 font-mono text-right">{entry.density.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}