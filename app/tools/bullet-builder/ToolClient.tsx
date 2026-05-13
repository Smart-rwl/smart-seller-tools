// app/tools/bullet-builder/ToolClient.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Hash,
  PenTool,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   Config & data
──────────────────────────────────────────────── */

const BULLET_COUNT = 5;
const BYTE_LIMIT_PER_BULLET = 500;
const BYTE_LIMIT_TOTAL = 2500;

/** Word-boundary matched. Each entry is a regex source fragment (escaped if needed). */
const BANNED_WORDS: { phrase: string; replacement: string }[] = [
  { phrase: 'guarantee', replacement: 'designed to last' },
  { phrase: 'warranty', replacement: 'built with quality materials' },
  { phrase: 'best seller', replacement: 'popular choice' },
  { phrase: 'free shipping', replacement: '' /* remove */ },
  { phrase: 'money back', replacement: '' },
  { phrase: 'satisfaction', replacement: '' },
  { phrase: 'promo', replacement: '' },
  { phrase: 'discount', replacement: '' },
  { phrase: 'sale', replacement: '' },
  { phrase: 'award winning', replacement: 'highly rated by buyers' },
  { phrase: 'fda approved', replacement: '' },
];

const POWER_WORDS = [
  'premium',
  'durable',
  'exclusive',
  'instant',
  'effortless',
  'upgrade',
  'protect',
  'proven',
  'crafted',
  'engineered',
  'reinforced',
  'precision',
];

const ICON_OPTIONS = [
  { value: '✅', label: 'Check ✅' },
  { value: '➤', label: 'Arrow ➤' },
  { value: '⭐', label: 'Star ⭐' },
  { value: '💎', label: 'Gem 💎' },
  { value: '🔥', label: 'Fire 🔥' },
  { value: '⚡', label: 'Bolt ⚡' },
];

const TEMPLATES = [
  {
    name: 'Benefit-led',
    bullets: [
      'STAYS COLD 24H: Double-wall vacuum insulation keeps drinks at temperature all day, even in a hot car.',
      'WONT TIP OVER: Weighted non-slip base sized to fit standard cup holders.',
      'LEAK-PROOF SEAL: Twist-lock lid passes shake tests so it travels safely in any bag.',
      'EASY TO CLEAN: Wide mouth opens fully for hand washing; lid is dishwasher safe.',
      'COMPLETE PACKAGE: Includes one bottle, two lids and a brush — ready to use out of the box.',
    ],
  },
  {
    name: 'Feature-led',
    bullets: [
      'MATERIAL: 18/8 food-grade stainless steel, BPA-free silicone gaskets.',
      'CAPACITY: 750 ml / 25 oz. Fits standard car cup holders.',
      'INSULATION: Vacuum double-wall, 24 hours cold / 12 hours hot.',
      'DIMENSIONS: 25.5 cm tall × 7.3 cm wide. Weight 320 g empty.',
      'IN THE BOX: 1 bottle, 1 standard lid, 1 sport lid, 1 cleaning brush.',
    ],
  },
  {
    name: 'Comparison',
    bullets: [
      'UNLIKE THIN COMPETITORS: Our 1.2mm steel wall holds temperature 40% longer than budget bottles.',
      'NO PLASTIC TASTE: 100% steel interior, never lined with painted plastic that wears off.',
      'BETTER GRIP: Textured matte finish that doesnt slip in sweaty hands like glossy bottles.',
      'WIDER MOUTH: Fits ice cubes that wont fit in narrow sport bottles.',
      'LIFETIME REFINISH: Industrial powder coat resists chips that ruin painted bottles in months.',
    ],
  },
];

/* ────────────────────────────────────────────────
   Unicode style maps
──────────────────────────────────────────────── */

type UnicodeStyle = 'plain' | 'bold' | 'italic' | 'bold-italic' | 'mono' | 'sans-bold';

const UNICODE_STYLES: { id: UnicodeStyle; label: string; sample: string }[] = [
  { id: 'plain', label: 'Plain', sample: 'KEY FEATURE' },
  { id: 'sans-bold', label: 'Sans bold', sample: '𝗞𝗘𝗬 𝗙𝗘𝗔𝗧𝗨𝗥𝗘' },
  { id: 'bold', label: 'Serif bold', sample: '𝐊𝐄𝐘 𝐅𝐄𝐀𝐓𝐔𝐑𝐄' },
  { id: 'italic', label: 'Italic', sample: '𝐾𝐸𝑌 𝐹𝐸𝐴𝑇𝑈𝑅𝐸' },
  { id: 'bold-italic', label: 'Bold italic', sample: '𝑲𝑬𝒀 𝑭𝑬𝑨𝑻𝑼𝑹𝑬' },
  { id: 'mono', label: 'Monospace', sample: '𝙺𝙴𝚈 𝙵𝙴𝙰𝚃𝚄𝚁𝙴' },
];

// Map A-Z → offset code-points for each style block in the Mathematical Alphanumeric Symbols range.
// Returns null if no transform applies (digits, symbols, spaces are passed through).
function styleChar(ch: string, style: UnicodeStyle): string {
  if (style === 'plain') return ch;
  const code = ch.codePointAt(0)!;

  // Helper that maps a base letter range into a Unicode block by char offset
  const map = (
    base: number,
    lowerStart: number,
    upperStart: number,
    digitStart?: number
  ): string => {
    if (code >= 65 && code <= 90) return String.fromCodePoint(upperStart + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(lowerStart + (code - 97));
    if (digitStart && code >= 48 && code <= 57) return String.fromCodePoint(digitStart + (code - 48));
    return ch;
  };

  switch (style) {
    case 'bold':
      return map(0, 0x1d41a, 0x1d400, 0x1d7ce);
    case 'italic':
      // Italic 'h' (U+210E) is special-cased outside the block
      if (ch === 'h') return '\u210e';
      return map(0, 0x1d44e, 0x1d434);
    case 'bold-italic':
      return map(0, 0x1d482, 0x1d468);
    case 'sans-bold':
      return map(0, 0x1d5d4, 0x1d5ba, 0x1d7ec);
    case 'mono':
      return map(0, 0x1d68a, 0x1d670, 0x1d7f6);
    default:
      return ch;
  }
}

function stylize(text: string, style: UnicodeStyle): string {
  if (style === 'plain') return text;
  // Iterate by code point so we don't mangle surrogate pairs that are already there
  return Array.from(text)
    .map((ch) => styleChar(ch, style))
    .join('');
}

/** Apply unicode style ONLY to the header (text before the first colon). */
function stylizeHeader(text: string, style: UnicodeStyle): string {
  if (style === 'plain') return text;
  const colonIdx = text.indexOf(':');
  if (colonIdx === -1) return stylize(text, style);
  return stylize(text.slice(0, colonIdx), style) + text.slice(colonIdx);
}

/* ────────────────────────────────────────────────
   Matching helpers (word-boundary, not substring)
──────────────────────────────────────────────── */

function buildPhraseRegex(phrase: string): RegExp {
  // Escape for regex, then surround with word boundaries
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b doesn't always behave with multi-word phrases — use lookarounds
  return new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'gi');
}

const BANNED_REGEXES = BANNED_WORDS.map((b) => ({
  ...b,
  re: buildPhraseRegex(b.phrase),
}));

const POWER_REGEXES = POWER_WORDS.map((w) => buildPhraseRegex(w));

/* ────────────────────────────────────────────────
   Real syllable count (vowel groups)
──────────────────────────────────────────────── */

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return Math.max(1, w.length > 0 ? 1 : 0);
  // Remove silent e at end, count vowel groups
  const trimmed = w.replace(/e$/, '');
  const groups = trimmed.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

/* ────────────────────────────────────────────────
   Persistence
──────────────────────────────────────────────── */

const STORAGE_KEY = 'smartrwl:bullet-builder:v1';

function loadFromStorage(): { bullets: string[]; style: UnicodeStyle } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.bullets)) return null;
    return {
      bullets: parsed.bullets.slice(0, BULLET_COUNT),
      style: (parsed.style as UnicodeStyle) ?? 'plain',
    };
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────
   Component
──────────────────────────────────────────────── */

export default function BulletBuilder() {
  const [bullets, setBullets] = useState<string[]>(() => new Array(BULLET_COUNT).fill(''));
  const [selectedIcon, setSelectedIcon] = useState('✅');
  const [headerStyle, setHeaderStyle] = useState<UnicodeStyle>('plain');
  const [showPreview, setShowPreview] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle');
  const [history, setHistory] = useState<string[][]>([]);

  // Load from storage on mount
  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      setBullets(saved.bullets);
      setHeaderStyle(saved.style);
    }
  }, []);

  // Auto-save (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ bullets, style: headerStyle })
        );
      } catch {
        /* quota exceeded — ignore */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [bullets, headerStyle]);

  // Auto-clear reset confirmation
  useEffect(() => {
    if (!confirmReset) return;
    const t = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(t);
  }, [confirmReset]);

  /* ── Analytics (memoized, not effect-based) ── */

  const metrics = useMemo(() => {
    let totalBytes = 0;
    const bannedHits: { phrase: string; bullet: number; replacement: string }[] = [];
    const powerHitsSet = new Set<string>();
    let totalWords = 0;
    let totalSentences = 0;
    let totalSyllables = 0;

    bullets.forEach((text, idx) => {
      if (!text) return;

      totalBytes += new TextEncoder().encode(text).length;

      BANNED_REGEXES.forEach((b) => {
        if (b.re.test(text)) {
          bannedHits.push({ phrase: b.phrase, bullet: idx, replacement: b.replacement });
          b.re.lastIndex = 0; // reset for next call
        }
      });

      POWER_REGEXES.forEach((re, i) => {
        if (re.test(text)) {
          powerHitsSet.add(POWER_WORDS[i]);
          re.lastIndex = 0;
        }
      });

      const words = text.split(/\s+/).filter(Boolean);
      const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
      totalWords += words.length;
      totalSentences += sentences.length;
      totalSyllables += words.reduce((sum, w) => sum + countSyllables(w), 0);
    });

    // Flesch Reading Ease (real formula now, real syllable counts)
    let readability = 0;
    if (totalWords > 0 && totalSentences > 0) {
      readability =
        206.835 -
        1.015 * (totalWords / totalSentences) -
        84.6 * (totalSyllables / totalWords);
    }
    readability = Math.max(0, Math.min(100, Math.round(readability)));

    const avgWordsPerSentence =
      totalSentences > 0 ? totalWords / totalSentences : 0;

    return {
      totalBytes,
      bannedHits,
      uniquePowerWords: Array.from(powerHitsSet),
      readability,
      avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    };
  }, [bullets]);

  /* ── Actions ── */

  const pushHistory = () => {
    setHistory((h) => [...h.slice(-9), [...bullets]]);
  };

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setBullets(last);
      return h.slice(0, -1);
    });
  };

  const updateBullet = (i: number, value: string) => {
    setBullets((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  const moveBullet = (from: number, dir: -1 | 1) => {
    const to = from + dir;
    if (to < 0 || to >= BULLET_COUNT) return;
    pushHistory();
    setBullets((prev) => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const applyIconPrefix = () => {
    pushHistory();
    setBullets((prev) =>
      prev.map((b) => {
        // Strip any leading icon/emoji and whitespace before reapplying
        const clean = b.replace(
          /^[\u2700-\u27BF\u2600-\u26FF\uE000-\uF8FF\uD83C-\uDBFF\uDC00-\uDFFF➤]+\s*/,
          ''
        );
        return clean.trim() ? `${selectedIcon} ${clean}` : '';
      })
    );
  };

  const capitalizeHeaders = () => {
    pushHistory();
    setBullets((prev) =>
      prev.map((b) => {
        const idx = b.indexOf(':');
        if (idx === -1) return b;
        return b.slice(0, idx).toUpperCase() + b.slice(idx);
      })
    );
  };

  const applyTemplate = (templateBullets: string[]) => {
    pushHistory();
    setBullets(templateBullets.slice(0, BULLET_COUNT));
  };

  const requestReset = () => {
    if (confirmReset) {
      pushHistory();
      setBullets(new Array(BULLET_COUNT).fill(''));
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
    }
  };

  const copyAll = async () => {
    // Always copy the stylized version that the user actually sees previewed
    const out = bullets
      .map((b) => (b.trim() ? stylizeHeader(b, headerStyle) : ''))
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(out);
      setCopyState('ok');
      setTimeout(() => setCopyState('idle'), 1800);
    } catch {
      setCopyState('error');
      setTimeout(() => setCopyState('idle'), 2400);
    }
  };

  /* ── Render ── */

  const hasContent = bullets.some((b) => b.trim().length > 0);

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 md:p-12">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Sparkles className="h-8 w-8 text-orange-500" />
              Bullet Builder
            </h1>
            <p className="mt-2 text-slate-400">
              5-bullet editor with policy scanner, unicode formatting, and byte-aware limits.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={undo}
              disabled={history.length === 0}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-400 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              title="Undo last action"
            >
              <RotateCcw className="h-4 w-4" /> Undo
            </button>
            <button
              onClick={requestReset}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                confirmReset
                  ? 'border-red-700 bg-red-950/40 text-red-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Trash2 className="h-4 w-4" />
              {confirmReset ? 'Really reset?' : 'Reset'}
            </button>
            <button
              onClick={copyAll}
              disabled={!hasContent}
              className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
                copyState === 'ok'
                  ? 'bg-emerald-600 shadow-emerald-900/30'
                  : copyState === 'error'
                    ? 'bg-red-600 shadow-red-900/30'
                    : 'bg-orange-600 shadow-orange-900/30 hover:bg-orange-500'
              }`}
            >
              {copyState === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Copied
                </>
              ) : copyState === 'error' ? (
                <>
                  <AlertTriangle className="h-4 w-4" /> Failed
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy all
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT — editor */}
          <div className="space-y-6 lg:col-span-8">
            {/* Toolbar */}
            <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
              {/* Row 1 — icon prefix + caps + preview toggle */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 p-1">
                  <select
                    value={selectedIcon}
                    onChange={(e) => setSelectedIcon(e.target.value)}
                    className="cursor-pointer bg-transparent p-1 text-sm text-white outline-none"
                    aria-label="Icon prefix"
                  >
                    {ICON_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={applyIconPrefix}
                  className="text-xs font-bold text-orange-400 transition hover:text-orange-300"
                >
                  + Apply icons
                </button>

                <span className="h-6 w-px bg-slate-800" />

                <button
                  onClick={capitalizeHeaders}
                  className="flex items-center gap-2 text-xs font-bold text-slate-300 transition hover:text-white"
                >
                  <Wand2 className="h-3 w-3 text-purple-400" />
                  CAPS headers
                </button>

                <span className="ml-auto" />

                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className="flex items-center gap-1.5 rounded-md border border-slate-800 px-2.5 py-1 text-[11px] text-slate-400 transition hover:text-white"
                >
                  {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showPreview ? 'Hide preview' : 'Show preview'}
                </button>
              </div>

              {/* Row 2 — unicode header style picker */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Header style (text before the first colon)
                  </span>
                  {headerStyle !== 'plain' && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      Affects SEO &amp; accessibility — see warning below
                    </span>
                  )}
                </div>
                <div className="hide-scrollbar flex gap-2 overflow-x-auto">
                  {UNICODE_STYLES.map((s) => {
                    const active = headerStyle === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setHeaderStyle(s.id)}
                        className={`group shrink-0 rounded-lg border px-3 py-2 text-left transition ${
                          active
                            ? 'border-orange-500/40 bg-orange-500/10'
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                          {s.label}
                        </div>
                        <div
                          className={`text-sm ${
                            active ? 'text-orange-300' : 'text-slate-200'
                          }`}
                        >
                          {s.sample}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 3 — templates */}
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Start from template:
                </span>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    onClick={() => applyTemplate(t.bullets)}
                    className="rounded-full border border-slate-800 px-3 py-1 text-[11px] text-slate-300 transition hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Unicode warning */}
            {headerStyle !== 'plain' && (
              <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-xs leading-relaxed text-amber-200">
                <p className="mb-1 font-bold">A note on unicode headers</p>
                <p>
                  These characters look like bold/italic but they&apos;re Mathematical Alphanumeric
                  Symbols. Amazon&apos;s search index may not match them against keyword searches the
                  same way as plain letters, and screen readers can mispronounce them. Use sparingly
                  for visual hooks — never for primary keywords.
                </p>
              </div>
            )}

            {/* Bullet inputs */}
            <div className="space-y-4">
              {bullets.map((text, i) => (
                <BulletRow
                  key={i}
                  index={i}
                  text={text}
                  onChange={(v) => updateBullet(i, v)}
                  onMoveUp={() => moveBullet(i, -1)}
                  onMoveDown={() => moveBullet(i, 1)}
                  canMoveUp={i > 0}
                  canMoveDown={i < BULLET_COUNT - 1}
                  showPreview={showPreview}
                  headerStyle={headerStyle}
                />
              ))}
            </div>
          </div>

          {/* RIGHT — intelligence panel */}
          <div className="space-y-6 lg:col-span-4">
            <PolicyCard hits={metrics.bannedHits} bullets={bullets} setBullets={setBullets} />
            <ContentQualityCard metrics={metrics} />
            <FormattingTipCard />
          </div>
        </div>

        {/* GUIDE */}
        <Guide />

        {/* CREATOR FOOTER */}
        <Footer />
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Bullet row
──────────────────────────────────────────────── */

function BulletRow({
  index,
  text,
  onChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  showPreview,
  headerStyle,
}: {
  index: number;
  text: string;
  onChange: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  showPreview: boolean;
  headerStyle: UnicodeStyle;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bytes = useMemo(() => new TextEncoder().encode(text).length, [text]);
  const overLimit = bytes > BYTE_LIMIT_PER_BULLET;
  const filled = text.trim().length > 0;
  const preview = stylizeHeader(text, headerStyle);
  const showPreviewBox = showPreview && filled && headerStyle !== 'plain';

  return (
    <div className="group relative">
      <div className="mb-1 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-600">0{index + 1}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {filled ? 'Bullet' : 'Empty slot'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[10px] ${overLimit ? 'text-red-500' : 'text-slate-600'}`}
          >
            {bytes} / {BYTE_LIMIT_PER_BULLET} bytes
          </span>
          <div className="flex">
            <button
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="rounded p-1 text-slate-600 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="rounded p-1 text-slate-600 transition hover:text-slate-300 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={`w-full resize-none rounded-lg border bg-slate-900 p-4 text-sm leading-relaxed text-slate-200 transition focus:outline-none focus:ring-1 ${
          overLimit
            ? 'border-red-900/50 focus:ring-red-500'
            : 'border-slate-800 focus:border-orange-500 focus:ring-orange-500'
        }`}
        placeholder="HEADER: describe the key feature and the benefit to the customer..."
        spellCheck
      />

      {showPreviewBox && (
        <div className="mt-2 rounded-md border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-slate-300">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-slate-600">
            Preview
          </div>
          {preview}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Sidebar cards
──────────────────────────────────────────────── */

function PolicyCard({
  hits,
  bullets,
  setBullets,
}: {
  hits: { phrase: string; bullet: number; replacement: string }[];
  bullets: string[];
  setBullets: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const clean = hits.length === 0;

  const applyReplacement = (h: { phrase: string; bullet: number; replacement: string }) => {
    setBullets((prev) => {
      const next = [...prev];
      const re = buildPhraseRegex(h.phrase);
      next[h.bullet] = next[h.bullet]
        .replace(re, h.replacement)
        .replace(/\s{2,}/g, ' ')
        .trim();
      return next;
    });
  };

  return (
    <div
      className={`rounded-xl border p-5 ${
        clean
          ? 'border-emerald-900 bg-emerald-950/20'
          : 'border-red-900 bg-red-950/20'
      }`}
    >
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
        {clean ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
        Policy compliance
      </h3>
      {clean ? (
        <p className="text-xs text-emerald-400">
          No restricted phrases detected. Listing is safe from keyword-based suppression.
        </p>
      ) : (
        <div>
          <p className="mb-3 text-xs text-red-300">
            Detected phrases Amazon may flag for suppression:
          </p>
          <div className="space-y-2">
            {hits.map((h, i) => (
              <div
                key={`${h.phrase}-${h.bullet}-${i}`}
                className="flex items-center justify-between rounded border border-red-900/50 bg-red-950/40 px-2 py-1.5"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-red-200">&ldquo;{h.phrase}&rdquo;</span>
                  <span className="ml-2 text-[10px] text-red-400/70">
                    bullet 0{h.bullet + 1}
                  </span>
                </div>
                {h.replacement && (
                  <button
                    onClick={() => applyReplacement(h)}
                    className="shrink-0 rounded border border-red-800 px-2 py-0.5 text-[10px] text-red-200 transition hover:bg-red-800/40"
                    title={`Replace with "${h.replacement}"`}
                  >
                    Suggest fix →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentQualityCard({
  metrics,
}: {
  metrics: {
    totalBytes: number;
    uniquePowerWords: string[];
    readability: number;
    avgWordsPerSentence: number;
  };
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-400">
        <Search className="h-4 w-4" />
        Content quality
      </h3>

      <div className="space-y-4">
        {/* Readability */}
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-slate-500">Flesch reading ease</span>
            <span
              className={`font-bold ${
                metrics.readability >= 60 ? 'text-emerald-400' : 'text-orange-400'
              }`}
            >
              {metrics.readability}/100
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                metrics.readability >= 60 ? 'bg-emerald-500' : 'bg-orange-500'
              }`}
              style={{ width: `${metrics.readability}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Target 60+. Avg {metrics.avgWordsPerSentence} words per sentence.
          </p>
        </div>

        {/* Power words */}
        <div>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="text-slate-500">Power words used</span>
            <span className="font-mono font-bold text-white">
              {metrics.uniquePowerWords.length}
            </span>
          </div>
          {metrics.uniquePowerWords.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {metrics.uniquePowerWords.map((w) => (
                <span
                  key={w}
                  className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-300"
                >
                  {w}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-slate-500">
              Try &ldquo;premium&rdquo;, &ldquo;durable&rdquo;, &ldquo;crafted&rdquo;…
            </p>
          )}
        </div>

        {/* Total bytes */}
        <div className="border-t border-slate-800 pt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-slate-500">Total byte count</span>
            <span
              className={`font-mono font-bold ${
                metrics.totalBytes > BYTE_LIMIT_TOTAL ? 'text-red-400' : 'text-slate-300'
              }`}
            >
              {metrics.totalBytes} / {BYTE_LIMIT_TOTAL}
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            Amazon indexes the first ~1000 bytes most heavily — front-load your keywords.
          </p>
        </div>
      </div>
    </div>
  );
}

function FormattingTipCard() {
  return (
    <div className="rounded-xl border border-orange-900/50 bg-orange-900/10 p-5">
      <div className="flex gap-3">
        <Hash className="h-5 w-5 shrink-0 text-orange-400" />
        <div>
          <h4 className="mb-1 text-xs font-bold uppercase text-orange-300">Formatting strategy</h4>
          <p className="text-xs leading-relaxed text-slate-400">
            Capitalize the first phrase before the colon (&ldquo;
            <b>LONG BATTERY LIFE:</b>&rdquo;). It acts as a visual hook so shoppers can scan all 5
            bullets in under 2 seconds on mobile.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Guide + Footer
──────────────────────────────────────────────── */

function Guide() {
  return (
    <div className="border-t border-slate-800 pt-10">
      <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
        <BookOpen className="h-6 w-6 text-orange-500" />
        Optimization guide
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <GuideCard
          accent="orange"
          icon={<PenTool className="h-5 w-5 text-orange-400" />}
          title="Structure is the win"
        >
          Skip walls of text. Use:{' '}
          <b>[HEADER IN CAPS]:</b> [benefit] + [feature].
          <br />
          <br />
          <i>Example:</i> <b>24H INSULATION:</b> Keep drinks cold all day with double-wall vacuum
          steel.
        </GuideCard>

        <GuideCard
          accent="red"
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
          title="Avoid subjective claims"
        >
          Amazon suppresses listings using <b>&ldquo;best seller&rdquo;</b>,{' '}
          <b>&ldquo;guarantee&rdquo;</b>, <b>&ldquo;FDA approved&rdquo;</b>. Stick to factual data
          — sizes, materials, hours, watts.
        </GuideCard>

        <GuideCard
          accent="emerald"
          icon={<Search className="h-5 w-5 text-emerald-400" />}
          title="The byte limit trap"
        >
          Amazon counts <b>bytes</b>, not characters.
          <br />
          Standard text: 1 char = 1 byte. Emojis (🔥) = <b>4 bytes each</b>. Unicode bold = 4 bytes
          per character. This tool counts bytes so your listing isn&apos;t silently truncated.
        </GuideCard>
      </div>
    </div>
  );
}

function GuideCard({
  accent,
  icon,
  title,
  children,
}: {
  accent: 'orange' | 'red' | 'emerald';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const bg =
    accent === 'orange'
      ? 'bg-orange-500/10'
      : accent === 'red'
        ? 'bg-red-500/10'
        : 'bg-emerald-500/10';
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
      <h3 className="mb-2 font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}

function Footer() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
      <p className="text-sm font-medium text-slate-500">Created by SmartRwl</p>
      <div className="flex space-x-4">
        <a
          href="http://www.instagram.com/smartrwl"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 transition-colors hover:text-pink-500"
          title="Instagram"
          aria-label="Instagram"
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
        <a
          href="https://github.com/Smart-rwl/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-600 transition-colors hover:text-white"
          title="GitHub"
          aria-label="GitHub"
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
  );
}