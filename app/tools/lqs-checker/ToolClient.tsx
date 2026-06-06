'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Zap,
  RotateCcw,
  Eye,
  EyeOff,
  Target,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES + CONFIG
───────────────────────────────────────────── */
type Category = 'content' | 'media' | 'reviews';

type AuditItem = {
  id: string;
  label: string;
  weight: number;
  category: Category;
  checked: boolean;
  tip: string;
};

type CategoryConfig = {
  label: string;
  icon: React.ReactNode;
  accent: 'orange' | 'amber' | 'sky';
};

const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  content: { label: 'SEO & Content',      icon: <Type className="w-4 h-4" />,       accent: 'orange' },
  media:   { label: 'Visuals & Media',    icon: <ImageIcon className="w-4 h-4" />,  accent: 'amber' },
  reviews: { label: 'Conversion & Proof', icon: <Star className="w-4 h-4" />,       accent: 'sky' },
};

const ACCENT_STYLES = {
  orange: {
    iconText: 'text-orange-400',
    checkedBg: 'bg-orange-500/10',
    checkedBorder: 'border-orange-500/40',
    checkedText: 'text-orange-100',
    fillBg: 'bg-orange-500',
    pillBg: 'bg-orange-500/10 border-orange-500/30 text-orange-300',
  },
  amber: {
    iconText: 'text-amber-400',
    checkedBg: 'bg-amber-500/10',
    checkedBorder: 'border-amber-500/40',
    checkedText: 'text-amber-100',
    fillBg: 'bg-amber-500',
    pillBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  },
  sky: {
    iconText: 'text-sky-400',
    checkedBg: 'bg-sky-500/10',
    checkedBorder: 'border-sky-500/40',
    checkedText: 'text-sky-100',
    fillBg: 'bg-sky-500',
    pillBg: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  },
};

const INITIAL_ITEMS: AuditItem[] = [
  // Content (40 pts total)
  { id: 'title',     label: 'Title 60-200 chars · brand first',         weight: 15, category: 'content', checked: false, tip: 'Lead with the brand name, then primary keywords. Stay between 60-200 chars; some categories cap lower.' },
  { id: 'bullets',   label: '5 bullet points covering benefits',         weight: 15, category: 'content', checked: false, tip: 'Lead each bullet with a benefit, not just a feature spec. Capitalize the opening phrase.' },
  { id: 'backend',   label: 'Backend search terms filled (~249 bytes)',  weight: 10, category: 'content', checked: false, tip: 'Use the hidden 249-byte field for keywords that don\'t fit in the title or bullets. The Search Term Optimizer tool helps.' },

  // Media (40 pts total)
  { id: 'images',    label: '7+ high-res images (1500px+)',              weight: 10, category: 'media',   checked: false, tip: 'Use every image slot. 1500px+ enables Amazon\'s zoom feature, which improves conversion.' },
  { id: 'whitebg',   label: 'Main image: pure white BG, fills 85%+',     weight: 5,  category: 'media',   checked: false, tip: 'Strict requirement. White must be #FFFFFF (no light gray). Product fills 85% of the frame.' },
  { id: 'lifestyle', label: 'Lifestyle / in-use images present',         weight: 5,  category: 'media',   checked: false, tip: 'Show the product being used in context. Lifestyle shots drive conversion more than studio shots.' },
  { id: 'video',     label: 'Product video uploaded',                    weight: 10, category: 'media',   checked: false, tip: 'Videos lift conversion ~20% and reduce bounce. Keep under 60 seconds; lead with key benefits.' },
  { id: 'aplus',     label: 'A+ Content / Enhanced Brand Content',       weight: 10, category: 'media',   checked: false, tip: 'Requires Brand Registry. Replaces the plain description area with rich modules — a major conversion lever.' },

  // Reviews (20 pts total)
  { id: 'rating',    label: '4.0+ star rating',                          weight: 10, category: 'reviews', checked: false, tip: 'Below 4 stars cuts conversion sharply. Use the Reputation ROI Engine to plan acquisition.' },
  { id: 'count',     label: '15+ review count',                          weight: 5,  category: 'reviews', checked: false, tip: 'Builds initial trust signal. Vine and request-a-review tools accelerate this.' },
  { id: 'prime',     label: 'Prime eligible (FBA)',                      weight: 5,  category: 'reviews', checked: false, tip: 'FBA listings rank and convert better than FBM. Prime badge is a major buying-decision factor.' },
];

const STORAGE_KEY = 'listing-auditor:state:v1';
const LAUNCH_READY_THRESHOLD = 80;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function parseRating(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const m = raw.match(/(\d+(?:\.\d+)?)/);
    if (m) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v)) return v;
    }
  }
  return null;
}

/* ─────────────────────────────────────────────
   INNER COMPONENT (consumes useSearchParams)
───────────────────────────────────────────── */
function AuditorContent() {
  const [items, setItems] = useState<AuditItem[]>(INITIAL_ITEMS);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [showAllMissing, setShowAllMissing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const searchParams = useSearchParams();

  /* ── Hydrate from localStorage ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.checked && typeof s.checked === 'object') {
          setItems((prev) =>
            prev.map((i) => ({ ...i, checked: !!s.checked[i.id] })),
          );
        }
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist checked state ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      const checked: Record<string, boolean> = {};
      items.forEach((i) => { checked[i.id] = i.checked; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ checked }));
    } catch { /* ignore */ }
  }, [hydrated, items]);

  /* ── Auto-fill from extension (URL ?auto_fill=...) ── */
  useEffect(() => {
    const autoFill = searchParams.get('auto_fill');
    if (!autoFill) return;

    try {
      const data = JSON.parse(decodeURIComponent(autoFill));
      setItems((prev) =>
        prev.map((item) => {
          switch (item.id) {
            case 'title':
              if (typeof data.title === 'string') {
                const len = data.title.length;
                return { ...item, checked: len >= 60 && len <= 200 };
              }
              return item;
            case 'bullets':
              if (typeof data.bullets === 'number') {
                return { ...item, checked: data.bullets >= 5 };
              }
              return item;
            case 'images':
              if (typeof data.images === 'number') {
                return { ...item, checked: data.images >= 7 };
              }
              return item;
            case 'video':
              if (typeof data.hasVideo === 'boolean') {
                return { ...item, checked: data.hasVideo };
              }
              return item;
            case 'rating': {
              const r = parseRating(data.rating);
              if (r !== null) return { ...item, checked: r >= 4.0 };
              return item;
            }
            case 'count':
              if (typeof data.reviewCount === 'number') {
                return { ...item, checked: data.reviewCount >= 15 };
              }
              return item;
            case 'prime':
              if (typeof data.isPrime === 'boolean') {
                return { ...item, checked: data.isPrime };
              }
              return item;
            default:
              return item;
          }
        }),
      );
      setIsAutoFilled(true);
    } catch (err) {
      console.error('Failed to parse auto_fill data:', err);
    }
  }, [searchParams]);

  /* ── Derived scoring ── */
  const { totalScore, byCategory, grade, status } = useMemo(() => {
    const total = items.reduce((sum, i) => (i.checked ? sum + i.weight : sum), 0);

    const byCat: Record<Category, { earned: number; max: number }> = {
      content: { earned: 0, max: 0 },
      media:   { earned: 0, max: 0 },
      reviews: { earned: 0, max: 0 },
    };
    items.forEach((i) => {
      byCat[i.category].max += i.weight;
      if (i.checked) byCat[i.category].earned += i.weight;
    });

    let g: string; let s: string;
    if (total >= 90) { g = 'A+'; s = 'Excellent'; }
    else if (total >= 80) { g = 'A'; s = 'Launch-ready'; }
    else if (total >= 70) { g = 'B'; s = 'Good'; }
    else if (total >= 50) { g = 'C'; s = 'Needs work'; }
    else { g = 'D'; s = 'Critical'; }

    return { totalScore: total, byCategory: byCat, grade: g, status: s };
  }, [items]);

  const missingItems = useMemo(
    () => items.filter((i) => !i.checked).sort((a, b) => b.weight - a.weight),
    [items],
  );

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  };

  const resetAll = () => {
    if (!confirm('Uncheck all items?')) return;
    setItems((prev) => prev.map((i) => ({ ...i, checked: false })));
    setIsAutoFilled(false);
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
              <Trophy className="w-8 h-8 text-amber-400" />
              Listing Quality Auditor
            </h1>
            <p className="text-slate-400 mt-2">
              Score your Amazon listing against 11 best-practice criteria across content, media, and reviews.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            {isAutoFilled && (
              <div className="flex items-center gap-2 bg-orange-500/10 px-3 py-2 rounded-lg border border-orange-500/30 text-xs text-orange-400">
                <Zap className="w-3.5 h-3.5" />
                <span className="font-bold uppercase tracking-wider">Auto-detected</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs text-slate-400">
              <BarChart3 className="w-3.5 h-3.5 text-orange-400" />
              <span>Best-practices scoring</span>
            </div>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ─── LEFT: CHECKLIST ─── */}
          <div className="lg:col-span-8 space-y-6">
            {(['content', 'media', 'reviews'] as Category[]).map((cat) => (
              <CategorySection
                key={cat}
                category={cat}
                config={CATEGORY_CONFIG[cat]}
                items={items.filter((i) => i.category === cat)}
                earned={byCategory[cat].earned}
                max={byCategory[cat].max}
                onToggle={toggleItem}
              />
            ))}
          </div>

          {/* ─── RIGHT: SCORECARD ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Score wheel */}
            <ScoreWheel score={totalScore} grade={grade} status={status} />

            {/* Category breakdown bars */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-orange-400" /> Category breakdown
              </h3>
              {(['content', 'media', 'reviews'] as Category[]).map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const styles = ACCENT_STYLES[cfg.accent];
                const { earned, max } = byCategory[cat];
                const pct = max > 0 ? (earned / max) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between items-center text-[11px] mb-1">
                      <span className={`font-bold ${styles.iconText}`}>{cfg.label}</span>
                      <span className="font-mono text-slate-300">
                        {earned}
                        <span className="text-slate-600"> / {max}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full ${styles.fillBg} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Priority Fixes */}
            <PriorityFixesPanel
              missing={missingItems}
              showAll={showAllMissing}
              onToggleShowAll={() => setShowAllMissing(!showAllMissing)}
            />
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            LQS Ranking Guide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<Type className="w-5 h-5 text-orange-400" />}
              accent="orange"
              title="Title strategy"
              body={<>Title is the #1 indexable signal. Lead with brand, then top 3 keywords in the first 80 chars (mobile-safe). Use the rest for secondary keywords and modifiers.</>}
            />
            <GuideCard
              icon={<ImageIcon className="w-5 h-5 text-amber-400" />}
              accent="amber"
              title="Image strategy"
              body={<>Customers can't touch the product — images are their only sensory input. Target: 1 main (white BG), 3 lifestyle, 2 infographic, 1 size/scale, 1 video.</>}
            />
            <GuideCard
              icon={<Video className="w-5 h-5 text-sky-400" />}
              accent="sky"
              title="Video is the unfair advantage"
              body={<>Listings with video convert ~20% better and keep visitors on the page longer. Dwell time is a strong signal — Amazon ranks better-engaging listings higher.</>}
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

/* ─────────────────────────────────────────────
   DEFAULT EXPORT (Suspense wrapper)
───────────────────────────────────────────── */
export default function SmartListingAuditor() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        Loading auditor…
      </div>
    }>
      <AuditorContent />
    </Suspense>
  );
}

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

function CategorySection({
  category, config, items, earned, max, onToggle,
}: {
  category: Category;
  config: CategoryConfig;
  items: AuditItem[];
  earned: number;
  max: number;
  onToggle: (id: string) => void;
}) {
  const styles = ACCENT_STYLES[config.accent];
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={styles.iconText}>{config.icon}</span>
          <h3 className="font-bold text-white text-sm">{config.label}</h3>
        </div>
        <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${styles.pillBg}`}>
          {earned} / {max} pts
        </span>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            accent={config.accent}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
}

function ChecklistItem({
  item, accent, onToggle,
}: {
  item: AuditItem;
  accent: 'orange' | 'amber' | 'sky';
  onToggle: (id: string) => void;
}) {
  const styles = ACCENT_STYLES[accent];
  const isHeavy = item.weight >= 10;
  return (
    <button
      onClick={() => onToggle(item.id)}
      className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 text-left group ${
        item.checked
          ? `${styles.checkedBg} ${styles.checkedBorder}`
          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
      }`}
      title={item.tip}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.checked
            ? `${styles.fillBg} border-transparent`
            : 'border-slate-600 group-hover:border-slate-400'
        }`}>
          {item.checked && <CheckCircle2 className="w-3 h-3 text-white" />}
        </div>
        <span className={`text-sm truncate ${item.checked ? `${styles.checkedText} font-medium` : 'text-slate-400'}`}>
          {item.label}
        </span>
      </div>
      <span className={`text-[10px] px-2 py-0.5 rounded font-mono shrink-0 ${
        item.checked
          ? styles.pillBg
          : isHeavy
            ? 'bg-slate-800 text-slate-300 border border-slate-700'
            : 'bg-slate-800 text-slate-500'
      }`}>
        +{item.weight}
      </span>
    </button>
  );
}

function ScoreWheel({ score, grade, status }: { score: number; grade: string; status: string }) {
  // r=70 → circumference ≈ 440
  const C = 440;
  const offset = C - (C * score) / 100;

  const tone =
    score >= 90 ? 'text-emerald-400'
    : score >= LAUNCH_READY_THRESHOLD ? 'text-orange-400'
    : score >= 50 ? 'text-amber-400'
    : 'text-rose-400';

  // Threshold marker position on circle (80% around)
  const thresholdAngle = (LAUNCH_READY_THRESHOLD / 100) * 360 - 90; // -90 because SVG starts at 3 o'clock
  const thresholdRad = (thresholdAngle * Math.PI) / 180;
  const tx = 80 + 70 * Math.cos(thresholdRad);
  const ty = 80 + 70 * Math.sin(thresholdRad);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-7 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 p-3 opacity-[0.04] pointer-events-none">
        <Trophy className="w-40 h-40 text-amber-400" />
      </div>

      <div className="relative z-10 text-center">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Quality Score</h3>

        <div className="relative w-40 h-40 flex items-center justify-center mx-auto mb-3">
          <svg className="w-full h-full" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" fill="transparent" className="text-slate-800" />
            {/* Progress arc (rotated -90 so it starts at top) */}
            <circle
              cx="80" cy="80" r="70"
              stroke="currentColor"
              strokeWidth="10"
              fill="transparent"
              strokeLinecap="round"
              className={`transition-all duration-1000 ease-out ${tone}`}
              strokeDasharray={C}
              strokeDashoffset={offset}
              transform="rotate(-90 80 80)"
            />
            {/* Launch-ready threshold marker */}
            <circle
              cx={tx} cy={ty} r="3"
              fill="#fbbf24"
              stroke="#0a0f1a"
              strokeWidth="1.5"
            >
              <title>Launch-ready: {LAUNCH_READY_THRESHOLD}+</title>
            </circle>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-5xl font-black text-white font-mono leading-none">{score}</span>
            <span className="text-[10px] text-slate-500 font-mono mt-1">/ 100</span>
          </div>
        </div>

        <div className={`text-4xl font-black mb-1 ${tone}`}>{grade}</div>
        <p className="text-sm text-slate-300 font-medium">{status}</p>

        <p className="text-[10px] text-slate-500 mt-3 flex items-center justify-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
          Launch-ready: {LAUNCH_READY_THRESHOLD}+ · Excellent: 90+
        </p>
      </div>
    </div>
  );
}

function PriorityFixesPanel({
  missing, showAll, onToggleShowAll,
}: {
  missing: AuditItem[];
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  if (missing.length === 0) {
    return (
      <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-6 flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
        <p className="text-sm text-emerald-300 font-bold">All criteria met</p>
        <p className="text-xs text-emerald-200/80 mt-1">Launch-ready listing. Drive traffic.</p>
      </div>
    );
  }

  const displayed = showAll ? missing : missing.slice(0, 4);
  const hidden = missing.length - displayed.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-widest">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" /> Priority Fixes
          <span className="text-orange-400 font-mono">({missing.length})</span>
        </h3>
        {missing.length > 4 && (
          <button
            onClick={onToggleShowAll}
            className="text-[10px] flex items-center gap-1 text-slate-400 hover:text-orange-400 font-bold uppercase tracking-wider transition"
          >
            {showAll
              ? <><EyeOff className="w-3 h-3" /> Top 4</>
              : <><Eye className="w-3 h-3" /> Show all ({hidden} more)</>}
          </button>
        )}
      </div>

      <ul className="space-y-3">
        {displayed.map((item) => {
          const cfg = CATEGORY_CONFIG[item.category];
          const styles = ACCENT_STYLES[cfg.accent];
          return (
            <li key={item.id} className="flex gap-3 items-start text-xs">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-slate-200 font-medium">{item.label}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0 rounded border ${styles.pillBg}`}>
                    +{item.weight}
                  </span>
                </div>
                <span className="text-slate-500 leading-snug">{item.tip}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function GuideCard({
  icon, title, body, accent,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  accent: 'orange' | 'amber' | 'sky';
}) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${styles.checkedBg} ${styles.checkedBorder}`}>
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}