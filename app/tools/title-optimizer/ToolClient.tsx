'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Smartphone,
  Monitor,
  Type,
  Trash2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Search,
  Undo2,
  RotateCcw,
  Check,
  ShieldAlert,
  Target,
  Star,
  Sparkles,
  Info,
  ChevronDown,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const MAX_MOBILE = 80;

type CategoryPreset = { label: string; limit: number; hint: string };
const CATEGORY_PRESETS: CategoryPreset[] = [
  { label: 'Standard',  limit: 200, hint: 'Most Amazon categories' },
  { label: 'Books',     limit: 200, hint: 'Books & media' },
  { label: 'Vehicles',  limit: 500, hint: 'Automotive parts' },
  { label: 'Strict',    limit: 150, hint: 'Some apparel / beauty' },
];

const MINOR_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet',
  'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'if',
  'via', 'per', 'vs', 'from', 'with',
]);

/** Promotional terms Amazon flags or risks suppression. */
const PROMO_TERMS: { term: string; tone: 'critical' | 'warning'; reason: string }[] = [
  { term: 'best seller',    tone: 'critical', reason: 'Promotional ranking claim — banned in titles' },
  { term: 'bestseller',     tone: 'critical', reason: 'Promotional ranking claim — banned in titles' },
  { term: '#1',             tone: 'critical', reason: 'Ranking claim — banned' },
  { term: 'free shipping',  tone: 'critical', reason: 'Shipping promo — banned in titles' },
  { term: 'on sale',        tone: 'critical', reason: 'Promotional — banned' },
  { term: 'discount',       tone: 'warning',  reason: 'Promotional language — risky' },
  { term: 'sale',           tone: 'warning',  reason: 'Promotional language — risky' },
  { term: 'cheap',          tone: 'warning',  reason: 'Promotional adjective — risky' },
  { term: 'hot',            tone: 'warning',  reason: 'Promotional adjective — risky' },
  { term: 'top rated',      tone: 'warning',  reason: 'Ranking claim — risky' },
  { term: 'amazing',        tone: 'warning',  reason: 'Promotional adjective — risky' },
];

/** Characters Amazon's parser rejects or strips in product titles. */
const FORBIDDEN_CHARS_PATTERN = /[\$!\?\*~\^¢£€]/g;

const STORAGE_KEY = 'listing-title:state:v1';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function toTitleCase(s: string): string {
  return s.toLowerCase().split(/(\s+)/).map((token, i) => {
    if (!token.trim()) return token; // preserve whitespace
    const isFirst = i === 0;
    if (!isFirst && MINOR_WORDS.has(token)) return token;
    // Capitalize first char (preserves apostrophes/hyphens position)
    return token.charAt(0).toUpperCase() + token.slice(1);
  }).join('');
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ListingTitleArchitect() {
  const [title, setTitle] = useState('');
  const [previousTitle, setPreviousTitle] = useState<string | null>(null);
  const [categoryLimit, setCategoryLimit] = useState(200);
  const [targetKeywords, setTargetKeywords] = useState('');
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.title           === 'string') setTitle(s.title);
        if (typeof s.categoryLimit   === 'number') setCategoryLimit(s.categoryLimit);
        if (typeof s.targetKeywords  === 'string') setTargetKeywords(s.targetKeywords);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        title, categoryLimit, targetKeywords,
      }));
    } catch { /* ignore */ }
  }, [hydrated, title, categoryLimit, targetKeywords]);

  /* ── Metrics ── */
  const charCount = title.length;
  const wordCount = useMemo(
    () => title.trim().split(/\s+/).filter((w) => w.length > 0).length,
    [title],
  );

  // Progress segments based on character count vs limits
  const mobileProgressPct = Math.min(100, (charCount / categoryLimit) * 100);

  const mobileStatus: 'good' | 'over-mobile' | 'over-limit' =
    charCount === 0 ? 'good'
    : charCount > categoryLimit ? 'over-limit'
    : charCount > MAX_MOBILE ? 'over-mobile'
    : 'good';

  /* ── TOS audit ── */
  const audit = useMemo(() => {
    const issues: { tone: 'critical' | 'warning'; text: React.ReactNode }[] = [];
    if (!title.trim()) return issues;

    // Over limit
    if (charCount > categoryLimit) {
      issues.push({
        tone: 'critical',
        text: <>Title is <b>{charCount - categoryLimit}</b> characters over the {categoryLimit}-char limit. Amazon may suppress the listing from search.</>,
      });
    }

    // Forbidden characters
    const matches = title.match(FORBIDDEN_CHARS_PATTERN);
    if (matches) {
      const unique = Array.from(new Set(matches));
      issues.push({
        tone: 'critical',
        text: <>Forbidden character{unique.length > 1 ? 's' : ''} found: <code className="bg-rose-500/20 px-1 rounded font-mono text-rose-200">{unique.join(' ')}</code> — strip these.</>,
      });
    }

    // All caps
    if (title.length >= 20 && title === title.toUpperCase() && /[A-Z]/.test(title)) {
      issues.push({
        tone: 'critical',
        text: <>Entire title is in <b>ALL CAPS</b>. Amazon flags this and may suppress the listing. Apply Title Case instead.</>,
      });
    }

    // Promotional terms
    const lower = ' ' + title.toLowerCase() + ' ';
    for (const p of PROMO_TERMS) {
      const padded = ' ' + p.term + ' ';
      if (lower.includes(padded) || lower.includes(' ' + p.term + ',') || title.toLowerCase().startsWith(p.term + ' ')) {
        issues.push({
          tone: p.tone,
          text: <>Term "<b>{p.term}</b>" detected — {p.reason}.</>,
        });
      }
    }

    // Duplicate consecutive words ("the the", "and and")
    const dupeMatch = title.toLowerCase().match(/\b(\w+)\s+\1\b/);
    if (dupeMatch) {
      issues.push({
        tone: 'warning',
        text: <>Duplicate consecutive word: "<b>{dupeMatch[1]}</b>". Likely a typo.</>,
      });
    }

    return issues;
  }, [title, charCount, categoryLimit]);

  /* ── Target keywords check ── */
  const keywordCheck = useMemo(() => {
    const list = targetKeywords
      .split(/[,\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
    if (list.length === 0) return [];
    const titleLower = title.toLowerCase();
    return list.map((kw) => ({
      keyword: kw,
      found: titleLower.includes(kw.toLowerCase()),
    }));
  }, [targetKeywords, title]);

  /* ── Actions ── */
  const handleTitleCase = () => {
    if (!title) return;
    setPreviousTitle(title);
    setTitle(toTitleCase(title));
  };

  const handleUpperCase = () => {
    if (!title) return;
    setPreviousTitle(title);
    setTitle(title.toUpperCase());
  };

  const handleUndo = () => {
    if (previousTitle === null) return;
    const restored = previousTitle;
    setPreviousTitle(title);
    setTitle(restored);
  };

  const handleCopy = async () => {
    if (!title) return;
    try {
      await navigator.clipboard.writeText(title);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = title;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  const handleClear = () => {
    if (!title) return;
    setPreviousTitle(title);
    setTitle('');
  };

  const resetAll = () => {
    if (!confirm('Reset all inputs?')) return;
    setTitle('');
    setPreviousTitle(null);
    setTargetKeywords('');
    setCategoryLimit(200);
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
              <Type className="w-8 h-8 text-orange-500" />
              Listing Title Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Optimize Amazon product titles for SEO, mobile truncation, and TOS compliance.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={mobileStatus} chars={charCount} limit={categoryLimit} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ─── LEFT: EDITOR ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Editor */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-36 bg-slate-950 border-0 p-5 text-lg text-white placeholder-slate-600 focus:ring-2 focus:ring-orange-500/30 outline-none resize-none leading-relaxed"
                placeholder="e.g. Nike Men's Air Zoom Pegasus 39 Running Shoes — Breathable Mesh, Cushioned Midsole, Anti-Slip Outsole"
              />

              {/* Toolbar */}
              <div className="p-3 flex flex-wrap gap-2 border-t border-slate-800">
                <button
                  onClick={handleTitleCase}
                  disabled={!title}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-700 disabled:cursor-not-allowed rounded text-xs font-bold text-slate-200 transition"
                >
                  Title Case
                </button>
                <button
                  onClick={handleUpperCase}
                  disabled={!title}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-700 disabled:cursor-not-allowed rounded text-xs font-bold text-slate-200 transition"
                >
                  UPPERCASE
                </button>
                <button
                  onClick={handleUndo}
                  disabled={previousTitle === null}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-700 disabled:cursor-not-allowed rounded text-xs font-bold text-orange-400 hover:text-orange-300 transition flex items-center gap-1.5"
                  title="Undo last transform"
                >
                  <Undo2 className="w-3 h-3" /> Undo
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleCopy}
                  disabled={!title}
                  className={`p-2 rounded transition disabled:opacity-30 disabled:cursor-not-allowed ${
                    copied
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="Copy"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleClear}
                  disabled={!title}
                  className="p-2 hover:bg-rose-500/15 disabled:opacity-30 disabled:cursor-not-allowed rounded text-slate-400 hover:text-rose-400 transition"
                  title="Clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual zone highlighting */}
            <ZoneVisualization title={title} mobileLimit={MAX_MOBILE} categoryLimit={categoryLimit} />

            {/* Stats + progress */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex justify-between items-end mb-4 flex-wrap gap-4">
                <div>
                  <span className={`text-5xl font-extrabold font-mono ${
                    mobileStatus === 'over-limit' ? 'text-rose-400'
                    : mobileStatus === 'over-mobile' ? 'text-sky-400'
                    : 'text-emerald-400'
                  }`}>{charCount}</span>
                  <span className="text-sm text-slate-500 ml-2 font-bold uppercase tracking-wider">chars</span>
                  <span className="text-xs text-slate-600 ml-3 font-mono">/ {categoryLimit}</span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-300 font-mono">{wordCount}</span>
                  <span className="text-xs text-slate-500 ml-1 font-bold uppercase">words</span>
                </div>
              </div>

              {/* Progress bar with mobile/desktop markers */}
              <div className="relative h-5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ease-out ${
                    mobileStatus === 'over-limit' ? 'bg-rose-500'
                    : mobileStatus === 'over-mobile' ? 'bg-sky-500'
                    : 'bg-emerald-500'
                  }`}
                  style={{ width: `${mobileProgressPct}%` }}
                />
                {/* Mobile cutoff marker */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/60 z-10"
                  style={{ left: `${(MAX_MOBILE / categoryLimit) * 100}%` }}
                  title="Mobile cutoff (80 chars)"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">
                <span>0</span>
                <span className="text-emerald-400" style={{ marginLeft: `${(MAX_MOBILE / categoryLimit) * 50}%` }}>Mobile cutoff</span>
                <span className="text-sky-400">Limit ({categoryLimit})</span>
              </div>
            </div>

            {/* Mobile preview with REAL truncation */}
            <MobilePreview title={title} />
          </div>

          {/* ─── RIGHT: PANELS ─── */}
          <div className="lg:col-span-4 space-y-5">

            {/* Category limit picker */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Category limit
              </h3>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                {CATEGORY_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setCategoryLimit(p.limit)}
                    title={p.hint}
                    className={`px-2 py-1.5 text-[11px] font-bold rounded border transition ${
                      categoryLimit === p.limit
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}<span className="opacity-60 ml-1 font-mono">{p.limit}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <input
                  type="number" min={50} max={1000}
                  value={categoryLimit}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 50 && v <= 1000) setCategoryLimit(v);
                  }}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded p-1.5 text-sm text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                />
                <span className="text-xs text-slate-500">chars</span>
              </div>
            </div>

            {/* Status cards */}
            <StatusCard
              active={mobileStatus === 'good'}
              icon={<Smartphone className="w-5 h-5" />}
              title="Mobile-optimized"
              body={`Keep your most important keywords in the first ${MAX_MOBILE} characters — that's all most mobile shoppers see.`}
              tone="emerald"
            />
            <StatusCard
              active={mobileStatus === 'over-mobile'}
              icon={<Monitor className="w-5 h-5" />}
              title="Desktop-only territory"
              body={`Chars beyond ${MAX_MOBILE} only show on desktop / full-listing view. Use for secondary keywords.`}
              tone="sky"
            />
            {mobileStatus === 'over-limit' && (
              <StatusCard
                active
                icon={<AlertTriangle className="w-5 h-5" />}
                title="Suppression risk"
                body={`Titles over ${categoryLimit} characters can be suppressed from search. Trim ${charCount - categoryLimit} chars.`}
                tone="rose"
              />
            )}

            {/* TOS Audit */}
            <AuditPanel issues={audit} hasTitle={title.length > 0} />

            {/* Target keywords */}
            <KeywordCheckPanel
              value={targetKeywords}
              onChange={setTargetKeywords}
              results={keywordCheck}
            />

            {/* Style guide */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase text-orange-300 mb-3 flex items-center gap-2 tracking-widest">
                <BookOpen className="w-3.5 h-3.5" /> Amazon style rules
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">✓</span> Brand name first</li>
                <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">✓</span> Capitalize the first letter of each major word</li>
                <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">✓</span> Use numerals ("3" not "Three")</li>
                <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">✓</span> Spell out measurements ("inches" not '"')</li>
                <li className="flex gap-2"><span className="text-rose-400 font-bold shrink-0">✕</span> No promotional language ("Best Seller", "Free", "Sale")</li>
                <li className="flex gap-2"><span className="text-rose-400 font-bold shrink-0">✕</span> No special chars: <span className="font-mono">$ ! ? * ~ ^</span></li>
                <li className="flex gap-2"><span className="text-rose-400 font-bold shrink-0">✕</span> No entire title in ALL CAPS</li>
              </ul>
            </div>
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

function StatusBadge({
  status, chars, limit,
}: { status: 'good' | 'over-mobile' | 'over-limit'; chars: number; limit: number }) {
  const config = {
    good:        { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <Check className="w-3.5 h-3.5" /> },
    'over-mobile': { bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-400',     icon: <Monitor className="w-3.5 h-3.5" /> },
    'over-limit':  { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400 animate-pulse', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  }[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border}`}>
      <span className={config.text}>{config.icon}</span>
      <span className={`text-xs font-mono font-bold ${config.text}`}>{chars} / {limit}</span>
    </div>
  );
}

function ZoneVisualization({
  title, mobileLimit, categoryLimit,
}: { title: string; mobileLimit: number; categoryLimit: number }) {
  if (!title) {
    return (
      <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-5 text-center text-xs text-slate-500">
        <Type className="w-6 h-6 mx-auto mb-1 text-slate-700" />
        Type a title above to see how it splits across mobile / desktop / over-limit zones.
      </div>
    );
  }

  const mobilePart = title.slice(0, mobileLimit);
  const desktopPart = title.slice(mobileLimit, categoryLimit);
  const overflowPart = title.slice(categoryLimit);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-orange-400" /> Zone preview
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"/> <span className="text-emerald-400">Mobile</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500"/> <span className="text-sky-400">Desktop</span></span>
          {overflowPart && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"/> <span className="text-rose-400">Over limit</span></span>}
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded p-3 font-mono text-sm leading-relaxed break-words">
        <span className="bg-emerald-500/20 text-emerald-100 px-0.5 rounded">{mobilePart}</span>
        {desktopPart && <span className="bg-sky-500/20 text-sky-100 px-0.5 rounded">{desktopPart}</span>}
        {overflowPart && <span className="bg-rose-500/30 text-rose-100 px-0.5 rounded">{overflowPart}</span>}
      </div>

      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        First <span className="font-mono text-emerald-400">{mobilePart.length}</span> chars show on mobile.
        {desktopPart && <> Next <span className="font-mono text-sky-400">{desktopPart.length}</span> show only on desktop.</>}
        {overflowPart && <> Last <span className="font-mono text-rose-400">{overflowPart.length}</span> may cause suppression.</>}
      </p>
    </div>
  );
}

function MobilePreview({ title }: { title: string }) {
  const truncated = title.length > MAX_MOBILE ? title.slice(0, MAX_MOBILE) + '…' : title;
  const wasTruncated = title.length > MAX_MOBILE;

  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
        <Smartphone className="w-3.5 h-3.5 text-orange-400" /> Mobile preview (real truncation at {MAX_MOBILE} chars)
      </h3>
      <div className="bg-white rounded-xl border-4 border-slate-800 overflow-hidden max-w-sm mx-auto shadow-2xl">
        <div className="bg-slate-100 border-b border-slate-200 p-2.5 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amazon Mobile App</span>
          <Smartphone className="w-3 h-3 text-slate-400" />
        </div>
        <div className="p-4 flex gap-3">
          <div className="w-24 h-24 bg-slate-200 rounded-lg shrink-0 flex items-center justify-center">
            <span className="text-[10px] text-slate-400">Image</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-gray-900 leading-snug font-sans break-words mb-1">
              {truncated || <span className="text-slate-400 italic">Your product title…</span>}
            </div>
            <div className="text-[10px] text-slate-500 mb-1">by Your Brand</div>
            <div className="flex items-center gap-1.5">
              <div className="flex text-amber-400 text-xs leading-none">★★★★☆</div>
              <span className="text-[10px] text-orange-600 font-medium">1,204</span>
            </div>
            <div className="text-base font-bold text-gray-900 mt-1.5">$XX.XX</div>
          </div>
        </div>
      </div>
      {wasTruncated && (
        <p className="text-[11px] text-slate-500 mt-2 text-center">
          Truncated at {MAX_MOBILE} chars · <span className="font-mono text-rose-400">{title.length - MAX_MOBILE}</span> chars hidden on mobile
        </p>
      )}
    </div>
  );
}

function StatusCard({
  active, icon, title, body, tone,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
  tone: 'emerald' | 'sky' | 'rose';
}) {
  const config = active
    ? {
        emerald: { bg: 'bg-emerald-950/25', border: 'border-emerald-500/30', text: 'text-emerald-400', body: 'text-emerald-200/90' },
        sky:     { bg: 'bg-sky-950/25',     border: 'border-sky-500/30',     text: 'text-sky-400',     body: 'text-sky-200/90' },
        rose:    { bg: 'bg-rose-950/25',    border: 'border-rose-500/30',    text: 'text-rose-400',    body: 'text-rose-200/90' },
      }[tone]
    : { bg: 'bg-slate-900', border: 'border-slate-800', text: 'text-slate-500', body: 'text-slate-500' };

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 ${config.bg} ${config.border}`}>
      <div className={`mt-0.5 ${config.text}`}>
        {active && tone !== 'rose' ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </div>
      <div>
        <h3 className={`font-bold text-sm ${config.text}`}>{title}</h3>
        <p className={`text-xs mt-1 leading-relaxed ${config.body}`}>{body}</p>
      </div>
    </div>
  );
}

function AuditPanel({
  issues, hasTitle,
}: {
  issues: { tone: 'critical' | 'warning'; text: React.ReactNode }[];
  hasTitle: boolean;
}) {
  if (!hasTitle) return null;

  if (issues.length === 0) {
    return (
      <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-emerald-300">No compliance issues</h3>
          <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
            No promotional terms, forbidden chars, or other suppression triggers detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2">
        <ShieldAlert className="w-3.5 h-3.5 text-orange-400" /> Compliance audit ({issues.length})
      </h3>
      {issues.map((iss, i) => {
        const isCritical = iss.tone === 'critical';
        return (
          <div
            key={i}
            className={`flex items-start gap-2 p-2.5 rounded border ${
              isCritical
                ? 'border-rose-500/30 bg-rose-950/15'
                : 'border-amber-500/30 bg-amber-950/15'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCritical ? 'text-rose-400' : 'text-amber-400'}`} />
            <div className={`text-xs leading-relaxed ${isCritical ? 'text-rose-200/90' : 'text-amber-200/90'}`}>
              {iss.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KeywordCheckPanel({
  value, onChange, results,
}: {
  value: string;
  onChange: (v: string) => void;
  results: { keyword: string; found: boolean }[];
}) {
  const foundCount = results.filter((r) => r.found).length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
        <Target className="w-3.5 h-3.5 text-orange-400" /> Target keywords
      </h3>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="running shoes, men, breathable, mesh"
        className="w-full h-16 bg-slate-950 border border-slate-700 rounded p-2 text-xs font-mono text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-none transition"
      />
      <p className="text-[10px] text-slate-500 mt-1">Comma- or newline-separated.</p>

      {results.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Coverage
            </span>
            <span className="text-[11px] font-mono">
              <span className={foundCount === results.length ? 'text-emerald-400' : 'text-orange-400'}>
                {foundCount}
              </span>
              <span className="text-slate-600"> / {results.length}</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {results.map((r, i) => (
              <span
                key={i}
                className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                  r.found
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-500 line-through'
                }`}
              >
                {r.found ? <Check className="w-2.5 h-2.5" /> : <span className="text-rose-400">✕</span>}
                {r.keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}