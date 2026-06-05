'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Filter,
  Sparkles,
  RotateCcw,
  Wand2,
  Check,
  AlertTriangle,
  Info,
  Hash,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   STOP WORDS (expanded ~150)
───────────────────────────────────────────── */
const STOP_WORDS = new Set([
  // Articles
  'a', 'an', 'the',
  // Conjunctions
  'and', 'or', 'but', 'nor', 'so', 'yet', 'as',
  // Be / Have / Do verbs
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done',
  // Modals
  'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'against', 'into',
  'through', 'after', 'over', 'under', 'between', 'out', 'during', 'without',
  'before', 'above', 'below', 'around', 'among', 'from', 'up', 'down', 'off',
  'until', 'while', 'since', 'across', 'behind', 'beneath',
  // Determiners
  'this', 'that', 'these', 'those', 'all', 'any', 'both', 'each', 'every',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same',
  // Pronouns
  'it', 'its', 'itself',
  'they', 'them', 'their', 'theirs', 'themselves',
  'we', 'us', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'my', 'mine', 'me', 'myself',
  'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself',
  // Question words
  'which', 'who', 'whom', 'whose', 'what', 'where', 'when', 'why', 'how',
  // Misc
  'not', 'than', 'too', 'very', 'just', 'now', 'also', 'really',
  'like', 'into',
]);

const BYTE_LIMITS: { label: string; bytes: number; hint: string }[] = [
  { label: 'Standard', bytes: 249, hint: 'Most Amazon categories' },
  { label: 'Beauty',   bytes: 500, hint: 'Some Beauty / Health categories' },
  { label: 'Books',    bytes: 1000, hint: 'Books, Media, Software' },
];

const STORAGE_KEY = 'search-term-optimizer:state:v1';

const EXAMPLE_INPUT =
  `running shoes for men, men's running sneakers, best red shoe, shoes for running, athletic footwear,
red running shoes, sneakers for the gym, premium men's sneakers, durable running shoes
women's running shoes, comfortable trail shoes, jogging shoes for marathon, lightweight running shoe`;

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type FilterReason = 'stopword' | 'duplicate' | 'short' | 'custom';

type Settings = {
  removeStopWords: boolean;
  removeDuplicates: boolean;
  removeSpecialChars: boolean;
  lowercase: boolean;
  minWordLength: number;
  byteLimit: number;
  customRemove: string;
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function SearchTermOptimizer() {
  const [input, setInput] = useState('');
  const [settings, setSettings] = useState<Settings>({
    removeStopWords: true,
    removeDuplicates: true,
    removeSpecialChars: true,
    lowercase: true,
    minWordLength: 2,
    byteLimit: 249,
    customRemove: '',
  });
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.input === 'string') setInput(s.input);
        if (s.settings && typeof s.settings === 'object') {
          setSettings((prev) => ({ ...prev, ...s.settings }));
        }
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ input, settings }));
    } catch { /* ignore */ }
  }, [hydrated, input, settings]);

  /* ── Process keywords ── */
  const result = useMemo(() => processKeywords(input, settings), [input, settings]);

  /* ── Copy ── */
  const handleCopy = async () => {
    if (!result.output) return;
    try {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = result.output;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  /* ── Status thresholds — percentage of limit ── */
  const usagePct = settings.byteLimit > 0 ? (result.byteCount / settings.byteLimit) * 100 : 0;
  const status: 'good' | 'warning' | 'critical' =
    usagePct >= 100 ? 'critical' : usagePct >= 90 ? 'warning' : 'good';

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const resetAll = () => {
    setInput('');
    setSettings({
      removeStopWords: true,
      removeDuplicates: true,
      removeSpecialChars: true,
      lowercase: true,
      minWordLength: 2,
      byteLimit: 249,
      customRemove: '',
    });
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Filter className="w-8 h-8 text-orange-500" />
              Search Term Optimizer
            </h1>
            <p className="text-slate-400 mt-2">
              Strip junk and duplicates from Amazon backend keywords. Stay under your byte limit.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <LimitBadge status={status} bytes={result.byteCount} limit={settings.byteLimit} />
            <button
              onClick={() => setInput(EXAMPLE_INPUT)}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-orange-400 hover:text-orange-300 transition"
              title="Load example input"
            >
              <Wand2 className="w-3 h-3" /> Load example
            </button>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ─── LEFT: INPUT + SETTINGS ─── */}
          <div className="lg:col-span-5 space-y-6">

            {/* Input */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex flex-col h-[380px]">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Raw keywords (paste here)
                </label>
                <button
                  onClick={() => setInput('')}
                  disabled={!input}
                  className="text-xs text-slate-400 hover:text-rose-400 disabled:text-slate-700 disabled:hover:text-slate-700 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-sm text-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none leading-relaxed transition"
                placeholder={`Paste your keyword research...\nAny separator works: commas, newlines, spaces.\n\ne.g. running shoes, shoes for men, athletic footwear`}
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Input: <span className="font-mono text-slate-400">{input.length}</span> chars
              </p>
            </div>

            {/* Settings */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-5">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-orange-400" /> Optimization filters
              </h3>

              {/* Byte-limit presets */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider flex items-center gap-1.5">
                  <Hash className="w-3 h-3" /> Byte limit
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {BYTE_LIMITS.map((p) => (
                    <button
                      key={p.bytes}
                      onClick={() => update('byteLimit', p.bytes)}
                      title={p.hint}
                      className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                        settings.byteLimit === p.bytes
                          ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p.label} ({p.bytes})
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={10} max={5000}
                    value={settings.byteLimit}
                    onChange={(e) => update('byteLimit', Math.max(10, Number(e.target.value) || 249))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  />
                  <span className="text-slate-500 text-xs font-mono">bytes</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                <Toggle label="Remove duplicates" checked={settings.removeDuplicates}    onChange={(v) => update('removeDuplicates', v)} />
                <Toggle label="Remove stop words" checked={settings.removeStopWords}     onChange={(v) => update('removeStopWords', v)} />
                <Toggle label="Strip punctuation" checked={settings.removeSpecialChars}  onChange={(v) => update('removeSpecialChars', v)} />
                <Toggle label="Force lowercase"   checked={settings.lowercase}           onChange={(v) => update('lowercase', v)} />
              </div>

              {/* Min word length */}
              <div className="pt-3 border-t border-slate-800">
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Minimum word length</label>
                  <span className="text-orange-400 font-mono font-bold text-xs">{settings.minWordLength}</span>
                </div>
                <input
                  type="range" min={0} max={5}
                  value={settings.minWordLength}
                  onChange={(e) => update('minWordLength', Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {settings.minWordLength === 0 ? 'Keep all words' : `Drop words shorter than ${settings.minWordLength} chars (cuts orphan "s", "x", etc.)`}
                </p>
              </div>

              {/* Advanced */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-slate-400 hover:text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1.5 transition"
                >
                  <Sparkles className="w-3 h-3" />
                  Advanced {showAdvanced ? '▲' : '▼'}
                </button>
                {showAdvanced && (
                  <div className="mt-3">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">
                      Also remove these words
                    </label>
                    <textarea
                      value={settings.customRemove}
                      onChange={(e) => update('customRemove', e.target.value)}
                      placeholder="One per line or comma-separated&#10;e.g. brand, item, new, hot"
                      className="w-full h-20 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none transition"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Custom additions to the filter — your category's junk words.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: OUTPUT + METRICS ─── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Metrics + progress */}
            <MetricsCard
              status={status}
              bytes={result.byteCount}
              limit={settings.byteLimit}
              words={result.wordCount}
              removed={result.removedTotal}
              usagePct={usagePct}
            />

            {/* Output */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 h-[280px] flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">Optimized output</span>
                </div>
                <button
                  onClick={handleCopy}
                  disabled={!result.output}
                  className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded transition font-bold disabled:opacity-40 disabled:cursor-not-allowed ${
                    copied
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy result'}
                </button>
              </div>
              <textarea
                readOnly
                value={result.output}
                className={`flex-1 w-full bg-slate-950 border rounded-lg p-3.5 text-sm font-mono focus:outline-none resize-none leading-relaxed ${
                  status === 'critical'
                    ? 'border-rose-500/30 text-rose-200'
                    : status === 'warning'
                    ? 'border-amber-500/30 text-amber-200'
                    : 'border-slate-800 text-orange-200'
                }`}
                placeholder="Optimized keywords will appear here..."
              />
              {status === 'critical' && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-2">
                  <AlertCircle className="w-3 h-3" />
                  Over limit by <b>{result.byteCount - settings.byteLimit} bytes</b>. Trim or raise the limit.
                </p>
              )}
            </div>

            {/* Filtered words breakdown */}
            {result.hasInput && (
              <FilteredBreakdown
                stopRemoved={result.stopRemoved}
                duplicatesRemoved={result.duplicatesRemoved}
                shortRemoved={result.shortRemoved}
                customRemoved={result.customRemoved}
              />
            )}
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            SEO Best Practices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<Scissors className="w-5 h-5 text-orange-400" />}
              title="No commas needed"
              body={<>
                Amazon's search engine treats spaces as separators. Commas just waste bytes.
                <span className="block mt-2 font-mono text-[11px] text-slate-500">
                  "shoe, red, running" = 18 bytes &nbsp; vs &nbsp; "shoe red running" = 16 bytes
                </span>
              </>}
            />
            <GuideCard
              icon={<Eraser className="w-5 h-5 text-orange-400" />}
              title="Stop words are ignored"
              body={<>
                Words like "a", "the", "for", "with" are ignored by Amazon's A9 ranking algorithm.
                Removing them makes byte room for high-value terms — "premium", "durable", "waterproof".
              </>}
            />
            <GuideCard
              icon={<Hash className="w-5 h-5 text-orange-400" />}
              title="Bytes ≠ characters"
              body={<>
                Amazon limits by <b>bytes</b>, not characters. Standard letters are 1 byte. Accented characters (é, ñ) are 2. Emojis can be 3-4. This tool counts bytes correctly via TextEncoder.
              </>}
            />
          </div>
        </div>

        {/* ─── CREATOR FOOTER ─── */}
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
   PROCESSING ENGINE
═════════════════════════════════════════════ */
type ProcessResult = {
  output: string;
  byteCount: number;
  wordCount: number;
  removedTotal: number;
  stopRemoved: Map<string, number>;
  duplicatesRemoved: Map<string, number>;
  shortRemoved: Map<string, number>;
  customRemoved: Map<string, number>;
  hasInput: boolean;
};

function processKeywords(input: string, s: Settings): ProcessResult {
  const empty: ProcessResult = {
    output: '', byteCount: 0, wordCount: 0, removedTotal: 0,
    stopRemoved: new Map(), duplicatesRemoved: new Map(),
    shortRemoved: new Map(), customRemoved: new Map(),
    hasInput: false,
  };
  if (!input.trim()) return empty;

  let text = input;

  // 1. Lowercase
  if (s.lowercase) text = text.toLowerCase();

  // 2. Possessive 's preprocessing — strip BEFORE punctuation handling
  //    Handles both straight ' and curly ' apostrophes
  text = text.replace(/['']s\b/gi, '');

  // 3. Strip punctuation but preserve unicode letters/numbers
  if (s.removeSpecialChars) {
    text = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ');
  }

  // 4. Tokenize
  const allWords = text.split(/\s+/).filter((w) => w.length > 0);

  // 5. Parse custom remove list
  const customSet = new Set<string>(
    s.customRemove
      .split(/[,\n]/)
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean),
  );

  // 6. Filter — track removals by reason
  const stopRemoved = new Map<string, number>();
  const duplicatesRemoved = new Map<string, number>();
  const shortRemoved = new Map<string, number>();
  const customRemoved = new Map<string, number>();
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const w of allWords) {
    // Short word filter
    if (s.minWordLength > 0 && w.length < s.minWordLength) {
      shortRemoved.set(w, (shortRemoved.get(w) ?? 0) + 1);
      continue;
    }
    // Stop word filter
    if (s.removeStopWords && STOP_WORDS.has(w)) {
      stopRemoved.set(w, (stopRemoved.get(w) ?? 0) + 1);
      continue;
    }
    // Custom remove
    if (customSet.has(w)) {
      customRemoved.set(w, (customRemoved.get(w) ?? 0) + 1);
      continue;
    }
    // Duplicate filter
    if (s.removeDuplicates && seen.has(w)) {
      duplicatesRemoved.set(w, (duplicatesRemoved.get(w) ?? 0) + 1);
      continue;
    }
    seen.add(w);
    kept.push(w);
  }

  const output = kept.join(' ');
  const byteCount = new TextEncoder().encode(output).length;

  const sumMap = (m: Map<string, number>) =>
    Array.from(m.values()).reduce((a, b) => a + b, 0);
  const removedTotal =
    sumMap(stopRemoved) + sumMap(duplicatesRemoved) + sumMap(shortRemoved) + sumMap(customRemoved);

  return {
    output,
    byteCount,
    wordCount: kept.length,
    removedTotal,
    stopRemoved, duplicatesRemoved, shortRemoved, customRemoved,
    hasInput: true,
  };
}

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

function LimitBadge({
  status, bytes, limit,
}: { status: 'good' | 'warning' | 'critical'; bytes: number; limit: number }) {
  const c = {
    good:     { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <Check className="w-3.5 h-3.5" /> },
    warning:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    critical: { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400 animate-pulse', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  }[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
      <span className={c.text}>{c.icon}</span>
      <span className={`text-xs font-mono font-bold ${c.text}`}>
        {bytes} / {limit}
      </span>
    </div>
  );
}

function Toggle({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <span className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="w-4 h-4 rounded border border-slate-600 bg-slate-950 peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center">
          {checked && <Check className="w-3 h-3 text-white" />}
        </span>
      </span>
      <span className="text-sm text-slate-400 group-hover:text-white transition select-none">{label}</span>
    </label>
  );
}

function MetricsCard({
  status, bytes, limit, words, removed, usagePct,
}: {
  status: 'good' | 'warning' | 'critical';
  bytes: number; limit: number;
  words: number; removed: number;
  usagePct: number;
}) {
  const tone = {
    good:     { bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', text: 'text-emerald-400', barFill: 'bg-emerald-500' },
    warning:  { bg: 'bg-amber-950/20',   border: 'border-amber-500/30',   text: 'text-amber-400',   barFill: 'bg-amber-500' },
    critical: { bg: 'bg-rose-950/20',    border: 'border-rose-500/30',    text: 'text-rose-400',    barFill: 'bg-rose-500' },
  }[status];

  return (
    <div className={`rounded-xl border p-5 transition-colors duration-300 ${tone.bg} ${tone.border}`}>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Byte usage</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-4xl font-extrabold font-mono ${tone.text}`}>{bytes}</span>
            <span className="text-sm text-slate-500 font-mono">/ {limit}</span>
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <span className="text-xs text-slate-500 block mb-1 uppercase font-bold tracking-wider">Words</span>
            <span className="text-2xl font-bold text-white font-mono">{words}</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block mb-1 uppercase font-bold tracking-wider">Removed</span>
            <span className="text-2xl font-bold text-slate-300 font-mono">{removed}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 relative">
          <div
            className={`h-full ${tone.barFill} transition-all duration-300`}
            style={{ width: `${Math.min(100, usagePct)}%` }}
          />
          {/* 90% warning marker */}
          <div className="absolute top-0 bottom-0 w-px bg-amber-400/40" style={{ left: '90%' }} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 font-mono mt-1.5">
          <span>0</span>
          <span className="text-amber-500/70">90% warn</span>
          <span>limit</span>
        </div>
      </div>
    </div>
  );
}

function FilteredBreakdown({
  stopRemoved, duplicatesRemoved, shortRemoved, customRemoved,
}: {
  stopRemoved: Map<string, number>;
  duplicatesRemoved: Map<string, number>;
  shortRemoved: Map<string, number>;
  customRemoved: Map<string, number>;
}) {
  const sumMap = (m: Map<string, number>) => Array.from(m.values()).reduce((a, b) => a + b, 0);
  const total = sumMap(stopRemoved) + sumMap(duplicatesRemoved) + sumMap(shortRemoved) + sumMap(customRemoved);
  if (total === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-orange-400" /> What was filtered
        </h3>
        <span className="text-[11px] text-slate-500">
          <span className="font-mono text-orange-400">{total}</span> total removed
        </span>
      </div>

      <div className="space-y-3">
        <ChipGroup
          label="Stop words"
          color="amber"
          map={stopRemoved}
        />
        <ChipGroup
          label="Duplicates"
          color="orange"
          map={duplicatesRemoved}
        />
        <ChipGroup
          label="Too short"
          color="slate"
          map={shortRemoved}
        />
        <ChipGroup
          label="Custom removals"
          color="rose"
          map={customRemoved}
        />
      </div>
    </div>
  );
}

function ChipGroup({
  label, color, map,
}: {
  label: string;
  color: 'amber' | 'orange' | 'slate' | 'rose';
  map: Map<string, number>;
}) {
  if (map.size === 0) return null;
  const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);

  const colorMap = {
    amber:  { tag: 'bg-amber-500/10 border-amber-500/30 text-amber-300',   label: 'text-amber-400' },
    orange: { tag: 'bg-orange-500/10 border-orange-500/30 text-orange-300', label: 'text-orange-400' },
    slate:  { tag: 'bg-slate-800 border-slate-700 text-slate-300',          label: 'text-slate-400' },
    rose:   { tag: 'bg-rose-500/10 border-rose-500/30 text-rose-300',       label: 'text-rose-400' },
  }[color];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-widest ${colorMap.label}`}>
          {label}
        </span>
        <span className="text-[10px] text-slate-600 font-mono">({total})</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map(([word, count]) => (
          <span
            key={word}
            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${colorMap.tag}`}
          >
            {word}{count > 1 && <span className="opacity-60 ml-1">× {count}</span>}
          </span>
        ))}
      </div>
    </div>
  );
}

function GuideCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className="bg-orange-500/10 border border-orange-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}