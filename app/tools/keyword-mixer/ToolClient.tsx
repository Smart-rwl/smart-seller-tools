'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shuffle,
  Copy,
  Trash2,
  Settings,
  CheckCircle2,
  BookOpen,
  Search,
  Target,
  Zap,
  Download,
  RotateCcw,
  AlertTriangle,
  Check,
  ChevronDown,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
type MatchType = 'broad' | 'phrase' | 'exact';
const MATCH_TYPES: { id: MatchType; label: string; example: string; hint: string }[] = [
  { id: 'broad',  label: 'Broad',  example: 'red shoes',     hint: 'Widest reach · cheapest CPC' },
  { id: 'phrase', label: 'Phrase', example: '"red shoes"',   hint: 'Match the phrase as substring' },
  { id: 'exact',  label: 'Exact',  example: '[red shoes]',   hint: 'Match the exact phrase only' },
];

type CopyFormat = 'newline' | 'comma' | 'space';
const COPY_FORMATS: { id: CopyFormat; label: string; hint: string }[] = [
  { id: 'newline', label: 'Newlines',     hint: 'For Amazon / Google bulk upload' },
  { id: 'comma',   label: 'Commas',       hint: 'For comma-separated fields' },
  { id: 'space',   label: 'Spaces',       hint: 'For inline use' },
];

type PermOrder = 'standard' | 'all';

const PREVIEW_LIMIT = 200;
const WARN_AT = 10_000;
const HARD_CAP = 100_000;

const STORAGE_KEY = 'ppc-campaign-architect:state:v1';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const parseLines = (s: string): string[] =>
  s.split('\n').map((x) => x.trim()).filter(Boolean);

const wrap = (phrase: string, t: MatchType): string => {
  switch (t) {
    case 'phrase': return `"${phrase}"`;
    case 'exact':  return `[${phrase}]`;
    default:       return phrase;
  }
};

/** All 6 orderings of [a, b, c] */
const ALL_ORDERINGS: ((a: string, b: string, c: string) => string[])[] = [
  (a, b, c) => [a, b, c],
  (a, b, c) => [a, c, b],
  (a, b, c) => [b, a, c],
  (a, b, c) => [b, c, a],
  (a, b, c) => [c, a, b],
  (a, b, c) => [c, b, a],
];

function joinClean(parts: string[]): string {
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function PPCCampaignArchitect() {
  const [colA, setColA] = useState('');
  const [colB, setColB] = useState('');
  const [colC, setColC] = useState('');
  const [matchType, setMatchType] = useState<MatchType>('broad');
  const [permOrder, setPermOrder] = useState<PermOrder>('standard');
  const [dedupe, setDedupe] = useState(true);
  const [copyFormat, setCopyFormat] = useState<CopyFormat>('newline');
  const [generated, setGenerated] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.colA       === 'string') setColA(s.colA);
        if (typeof s.colB       === 'string') setColB(s.colB);
        if (typeof s.colC       === 'string') setColC(s.colC);
        if (typeof s.matchType  === 'string') setMatchType(s.matchType as MatchType);
        if (typeof s.permOrder  === 'string') setPermOrder(s.permOrder as PermOrder);
        if (typeof s.dedupe     === 'boolean') setDedupe(s.dedupe);
        if (typeof s.copyFormat === 'string') setCopyFormat(s.copyFormat as CopyFormat);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist (inputs only) ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        colA, colB, colC, matchType, permOrder, dedupe, copyFormat,
      }));
    } catch { /* ignore */ }
  }, [hydrated, colA, colB, colC, matchType, permOrder, dedupe, copyFormat]);

  /* ── Live count (before generating) ── */
  const stats = useMemo(() => {
    const a = parseLines(colA), b = parseLines(colB), c = parseLines(colC);
    const nA = a.length, nB = b.length, nC = c.length;
    const empty = nA + nB + nC === 0;
    const base = empty ? 0 : Math.max(1, nA) * Math.max(1, nB) * Math.max(1, nC);
    const multiplier = permOrder === 'all' ? 6 : 1;
    const raw = base * multiplier;
    return { nA, nB, nC, base, raw, multiplier, exceedsHardCap: raw > HARD_CAP };
  }, [colA, colB, colC, permOrder]);

  /* ── Generation engine ── */
  const generate = useCallback((): string[] => {
    if (stats.exceedsHardCap) return [];
    const a = parseLines(colA), b = parseLines(colB), c = parseLines(colC);
    if (a.length + b.length + c.length === 0) return [];

    const safeA = a.length ? a : [''];
    const safeB = b.length ? b : [''];
    const safeC = c.length ? c : [''];

    const orderings = permOrder === 'all' ? ALL_ORDERINGS : [ALL_ORDERINGS[0]];
    const output: string[] = [];
    const seen = dedupe ? new Set<string>() : null;

    for (const aVal of safeA) {
      for (const bVal of safeB) {
        for (const cVal of safeC) {
          for (const orderFn of orderings) {
            const phrase = joinClean(orderFn(aVal, bVal, cVal));
            if (!phrase) continue;
            const wrapped = wrap(phrase, matchType);
            if (seen) {
              if (seen.has(wrapped)) continue;
              seen.add(wrapped);
            }
            output.push(wrapped);
          }
        }
      }
    }
    return output;
  }, [colA, colB, colC, matchType, permOrder, dedupe, stats.exceedsHardCap]);

  /* ── Auto-generate for small inputs, manual for large ── */
  useEffect(() => {
    if (stats.raw > 0 && stats.raw < 1000) {
      setGenerated(generate());
    } else if (stats.raw === 0) {
      setGenerated([]);
    }
    // For raw >= 1000, wait for explicit Generate click
  }, [stats.raw, generate]);

  const handleGenerate = () => {
    if (stats.exceedsHardCap) return;
    setGenerated(generate());
  };

  const clearAll = () => {
    setColA(''); setColB(''); setColC('');
    setGenerated([]);
  };

  const resetAll = () => {
    if (!confirm('Reset all inputs and settings?')) return;
    clearAll();
    setMatchType('broad');
    setPermOrder('standard');
    setDedupe(true);
    setCopyFormat('newline');
  };

  /* ── Formatting helpers ── */
  const formatList = (arr: string[]): string => {
    const sep = copyFormat === 'newline' ? '\n' : copyFormat === 'comma' ? ', ' : ' ';
    return arr.join(sep);
  };

  const handleCopy = async () => {
    if (generated.length === 0) return;
    const text = formatList(generated);
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

  const handleDownload = () => {
    if (generated.length === 0) return;
    const text = generated.join('\n'); // CSV always newline-separated
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-${matchType}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ── Preview ── */
  const previewText = useMemo(
    () => formatList(generated.slice(0, PREVIEW_LIMIT)),
    [generated, copyFormat],
  );
  const overflow = Math.max(0, generated.length - PREVIEW_LIMIT);

  const showWarn = stats.raw >= WARN_AT && !stats.exceedsHardCap;
  const showHardCap = stats.exceedsHardCap;
  const showManualGenerateHint = stats.raw >= 1000 && stats.raw <= HARD_CAP && generated.length === 0;

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
              <Shuffle className="w-8 h-8 text-orange-500" />
              PPC Campaign Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Generate thousands of Amazon & Google keyword variations from three seed lists.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <CountBadge stats={stats} permOrder={permOrder} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">

          {/* ─── LEFT: COLUMNS + OUTPUT ─── */}
          <div className="lg:col-span-9 space-y-5">

            {/* Three input columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputColumn
                label="A · Prefix / Seed"
                value={colA}
                onChange={setColA}
                placeholder={`Nike\nAdidas\nrunning`}
                accent="orange"
                count={stats.nA}
              />
              <InputColumn
                label="B · Core / Product"
                value={colB}
                onChange={setColB}
                placeholder={`shoes\nsneakers\ntrainers`}
                accent="amber"
                count={stats.nB}
              />
              <InputColumn
                label="C · Suffix / Modifier"
                value={colC}
                onChange={setColC}
                placeholder={`men\nwomen\nsale`}
                accent="sky"
                count={stats.nC}
              />
            </div>

            {/* Warning bar */}
            {showHardCap && (
              <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-200/90 leading-relaxed">
                  <b className="text-rose-300">Too many combinations.</b> {stats.raw.toLocaleString()} exceeds the {HARD_CAP.toLocaleString()} hard cap. Reduce inputs or switch off "All orderings".
                </div>
              </div>
            )}
            {showWarn && !showHardCap && (
              <div className="bg-amber-950/25 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  Heads up — <b>{stats.raw.toLocaleString()}</b> combinations is a lot. Generation runs in your browser; use the Download button afterward rather than copying massive output to clipboard.
                </div>
              </div>
            )}
            {showManualGenerateHint && (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300 leading-relaxed">
                  Click <b>Generate</b> to build {stats.raw.toLocaleString()} keywords. (Under 1,000 generates automatically.)
                </div>
              </div>
            )}

            {/* Output area */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">
                    Generated keywords
                    <span className="ml-2 text-orange-400 font-mono">{generated.length.toLocaleString()}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {generated.length > 0 && (
                    <>
                      <CopyFormatPicker value={copyFormat} onChange={setCopyFormat} />
                      <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition font-bold ${
                          copied
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? 'Copied' : 'Copy all'}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-bold"
                      >
                        <Download className="w-3 h-3" /> CSV
                      </button>
                    </>
                  )}
                </div>
              </div>
              <textarea
                readOnly
                value={previewText}
                className="w-full h-40 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-orange-200 focus:outline-none resize-none"
                placeholder="Fill the columns above to generate keyword variations..."
              />
              {overflow > 0 && (
                <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-orange-400" />
                  Preview shows first {PREVIEW_LIMIT.toLocaleString()} of {generated.length.toLocaleString()}. Use <b>CSV</b> to download all.
                </p>
              )}
            </div>
          </div>

          {/* ─── RIGHT: CONTROLS (sticky) ─── */}
          <div className="lg:col-span-3">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-5 lg:sticky lg:top-6">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <Settings className="w-4 h-4 text-orange-400" /> Configuration
              </h3>

              {/* Match type */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">
                  Match type
                </label>
                <div className="space-y-1.5">
                  {MATCH_TYPES.map((t) => {
                    const active = matchType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setMatchType(t.id)}
                        className={`w-full px-3 py-2 rounded text-xs text-left border transition-all ${
                          active
                            ? 'bg-orange-500/15 border-orange-500/40 text-orange-300'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                        title={t.hint}
                      >
                        <div className="font-bold flex items-center justify-between">
                          {t.label}
                          <span className="font-mono opacity-60">{t.example}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permutation order */}
              <div className="pt-3 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">
                  Orderings
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setPermOrder('standard')}
                    className={`py-1.5 text-[11px] font-bold rounded border transition ${
                      permOrder === 'standard'
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    A→B→C
                  </button>
                  <button
                    onClick={() => setPermOrder('all')}
                    className={`py-1.5 text-[11px] font-bold rounded border transition ${
                      permOrder === 'all'
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All 6 (×6)
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  {permOrder === 'standard'
                    ? 'Single ordering: "nike shoes men"'
                    : 'All 6 orderings + variants like "shoes nike men"'}
                </p>
              </div>

              {/* Dedupe toggle */}
              <div className="pt-3 border-t border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <span className="relative">
                    <input
                      type="checkbox"
                      checked={dedupe}
                      onChange={(e) => setDedupe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <span className="w-4 h-4 rounded border border-slate-600 bg-slate-950 peer-checked:bg-orange-500 peer-checked:border-orange-500 transition-all flex items-center justify-center">
                      {dedupe && <Check className="w-3 h-3 text-white" />}
                    </span>
                  </span>
                  <span className="text-sm text-slate-300 group-hover:text-white transition select-none">Deduplicate results</span>
                </label>
              </div>

              {/* Generate */}
              <button
                onClick={handleGenerate}
                disabled={stats.raw === 0 || stats.exceedsHardCap}
                className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg shadow-lg shadow-orange-900/20 disabled:shadow-none disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" /> Generate
              </button>

              <button
                onClick={clearAll}
                disabled={!colA && !colB && !colC && generated.length === 0}
                className="w-full py-2 bg-transparent border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 font-medium rounded-lg transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            PPC Strategy Guide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<Search className="w-5 h-5 text-orange-400" />}
              title="Broad vs Phrase vs Exact"
              body={<>
                <b>Broad:</b> cheapest CPC, but irrelevant clicks slip in.<br />
                <b>Phrase:</b> middle ground — phrase order matters.<br />
                <b>Exact:</b> highest intent, lowest waste. Bid high on proven keywords.
              </>}
            />
            <GuideCard
              icon={<Target className="w-5 h-5 text-orange-400" />}
              title="Use ALL orderings sparingly"
              body={<>
                6× multiplier catches search variants like "shoes nike men", but most are low-volume. Use for top-funnel discovery campaigns, not for refined Exact-match lists.
              </>}
            />
            <GuideCard
              icon={<Zap className="w-5 h-5 text-orange-400" />}
              title="Negative-keyword lists"
              body={<>
                Put unwanted modifiers in Col A: "free", "cheap", "used". Generate the list, then upload as <b>Negative Exact</b> in your campaign to block bad traffic.
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
   SUB-COMPONENTS
═════════════════════════════════════════════ */

function InputColumn({
  label, value, onChange, placeholder, accent, count,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  accent: 'orange' | 'amber' | 'sky';
  count: number;
}) {
  const accentMap = {
    orange: { text: 'text-orange-400', border: 'focus:border-orange-500', ring: 'focus:ring-orange-500/20' },
    amber:  { text: 'text-amber-400',  border: 'focus:border-amber-500',  ring: 'focus:ring-amber-500/20' },
    sky:    { text: 'text-sky-400',    border: 'focus:border-sky-500',    ring: 'focus:ring-sky-500/20' },
  }[accent];
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col h-[360px]">
      <div className="flex justify-between items-center mb-3">
        <label className={`text-xs font-bold uppercase tracking-wider ${accentMap.text}`}>
          {label}
        </label>
        <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
          {count}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex-1 w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm font-mono text-slate-200 focus:ring-2 outline-none resize-none transition ${accentMap.border} ${accentMap.ring}`}
        placeholder={placeholder}
      />
    </div>
  );
}

function CountBadge({
  stats, permOrder,
}: {
  stats: { nA: number; nB: number; nC: number; base: number; raw: number; multiplier: number; exceedsHardCap: boolean };
  permOrder: PermOrder;
}) {
  const tone =
    stats.exceedsHardCap ? { bg: 'bg-rose-500/10',   border: 'border-rose-500/30',   text: 'text-rose-400' }
    : stats.raw >= WARN_AT ? { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-400' }
    : { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${tone.bg} ${tone.border}`}>
      <Target className={`w-3.5 h-3.5 ${tone.text}`} />
      <span className={`text-xs font-mono font-bold ${tone.text}`}>
        {Math.max(1, stats.nA)} × {Math.max(1, stats.nB)} × {Math.max(1, stats.nC)}
        {permOrder === 'all' && <span className="opacity-70"> × 6</span>}
        {' = '}
        <span className="text-white">{stats.raw.toLocaleString()}</span>
      </span>
    </div>
  );
}

function CopyFormatPicker({
  value, onChange,
}: { value: CopyFormat; onChange: (v: CopyFormat) => void }) {
  const [open, setOpen] = useState(false);
  const current = COPY_FORMATS.find((f) => f.id === value)!;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition font-bold"
      >
        {current.label} <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-10 py-1 min-w-[160px]">
          {COPY_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => { onChange(f.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition ${f.id === value ? 'text-orange-400' : 'text-slate-300'}`}
            >
              <div className="font-bold">{f.label}</div>
              <div className="text-[10px] text-slate-500">{f.hint}</div>
            </button>
          ))}
        </div>
      )}
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