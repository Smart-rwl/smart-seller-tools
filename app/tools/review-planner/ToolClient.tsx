'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Star,
  TrendingUp,
  Clock,
  AlertTriangle,
  Trophy,
  Target,
  BarChart3,
  Calendar,
  MessageSquare,
  DollarSign,
  Zap,
  Layers,
  Info,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CURRENCIES + CONSTANTS
───────────────────────────────────────────── */
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

type StrategyId = 'organic' | 'request' | 'insert' | 'vine' | 'custom';
const STRATEGIES: { id: StrategyId; label: string; costPerReview: number; hint: string }[] = [
  { id: 'organic', label: 'Organic',    costPerReview: 0,   hint: 'Wait for natural reviews. Free but slow.' },
  { id: 'request', label: 'Request',    costPerReview: 0.5, hint: 'Amazon "Request a Review" automation. Boosts rate ~2x.' },
  { id: 'insert',  label: 'Insert card', costPerReview: 2,  hint: 'Packaging insert (neutral wording only). Cheap & effective.' },
  { id: 'vine',    label: 'Amazon Vine', costPerReview: 7,  hint: '$200 flat for ~30 reviews. Strong for new products.' },
  { id: 'custom',  label: 'Custom',     costPerReview: 5,   hint: 'Enter your own cost' },
];

const STORAGE_KEY = 'review-architect:state:v1';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const safeNum = (v: string | number, fallback = 0, max = Infinity): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, max);
};

const formatCurrency = (n: number, currency: CurrencyCode): string => {
  const c = CURRENCIES.find((x) => x.code === currency)!;
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${c.symbol}${Math.round(n).toLocaleString()}`;
  }
};

/**
 * Reviews needed to move from currentRating → targetRating, given that
 * each new review averages `newReviewRating` stars.
 *
 * Derivation:
 *   target = (current_sum + n × newRating) / (totalReviews + n)
 *   ⇒ n = (target × totalReviews − currentSum) / (newRating − target)
 *
 * Returns Infinity when newRating ≤ target (impossible) or target ≤ current (already there).
 */
function reviewsNeeded(
  currentRating: number, totalReviews: number,
  targetRating: number, newReviewRating: number,
): number {
  if (targetRating <= currentRating) return 0;
  if (newReviewRating <= targetRating) return Infinity;
  const currentSum = currentRating * totalReviews;
  const n = (targetRating * totalReviews - currentSum) / (newReviewRating - targetRating);
  return Math.max(0, Math.ceil(n));
}

/** Conversion boost from rating improvement — diminishing returns, capped at 35%. */
function conversionBoostPct(gapStars: number): number {
  const raw = Math.max(0, gapStars) * 25; // 25% per full star, linear
  return Math.min(35, raw);
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ReviewArchitect() {
  // Status
  const [currentRating, setCurrentRating] = useState(4.2);
  const [totalReviews, setTotalReviews]   = useState(120);
  const [targetRating, setTargetRating]   = useState(4.5);

  // Velocity
  const [dailySales, setDailySales]     = useState(20);
  const [reviewRate, setReviewRate]     = useState(2.5);
  const [newReviewRating, setNewReviewRating] = useState(4.8);

  // Strategy + financials
  const [strategy, setStrategy]         = useState<StrategyId>('insert');
  const [costPerReview, setCostPerReview] = useState(2);
  const [avgOrderValue, setAvgOrderValue] = useState(25);

  // Currency
  const [currency, setCurrency]         = useState<CurrencyCode>('USD');
  const [hydrated, setHydrated]         = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.currentRating    === 'number') setCurrentRating(s.currentRating);
        if (typeof s.totalReviews     === 'number') setTotalReviews(s.totalReviews);
        if (typeof s.targetRating     === 'number') setTargetRating(s.targetRating);
        if (typeof s.dailySales       === 'number') setDailySales(s.dailySales);
        if (typeof s.reviewRate       === 'number') setReviewRate(s.reviewRate);
        if (typeof s.newReviewRating  === 'number') setNewReviewRating(s.newReviewRating);
        if (typeof s.strategy         === 'string') setStrategy(s.strategy as StrategyId);
        if (typeof s.costPerReview    === 'number') setCostPerReview(s.costPerReview);
        if (typeof s.avgOrderValue    === 'number') setAvgOrderValue(s.avgOrderValue);
        if (typeof s.currency         === 'string') setCurrency(s.currency as CurrencyCode);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentRating, totalReviews, targetRating,
        dailySales, reviewRate, newReviewRating,
        strategy, costPerReview, avgOrderValue, currency,
      }));
    } catch { /* ignore */ }
  }, [hydrated, currentRating, totalReviews, targetRating,
      dailySales, reviewRate, newReviewRating,
      strategy, costPerReview, avgOrderValue, currency]);

  /* ── Strategy ↔ cost sync ── */
  const handleStrategyChange = (s: StrategyId) => {
    setStrategy(s);
    if (s !== 'custom') {
      const preset = STRATEGIES.find((x) => x.id === s)!;
      setCostPerReview(preset.costPerReview);
    }
  };

  /* ── Compute ── */
  const m = useMemo(() => {
    const neededReviews = reviewsNeeded(currentRating, totalReviews, targetRating, newReviewRating);
    const isImpossible = !Number.isFinite(neededReviews);
    const gap = Math.max(0, targetRating - currentRating);

    // Time + sales required
    const reviewsPerDay = dailySales * (reviewRate / 100);
    const daysNeeded = !isImpossible && reviewsPerDay > 0
      ? Math.ceil(neededReviews / reviewsPerDay)
      : Infinity;
    const salesNeeded = !isImpossible && reviewRate > 0
      ? Math.ceil(neededReviews * (100 / reviewRate))
      : Infinity;

    // Conversion lift / financial impact
    const boostPct = conversionBoostPct(gap);
    const monthlyRevenue = dailySales * 30 * avgOrderValue;
    const monthlyLift = monthlyRevenue * (boostPct / 100);
    const annualLift = monthlyLift * 12;

    // Cost (clamped at zero so impossible cases don't show negative)
    const recoveryCost = !isImpossible ? neededReviews * costPerReview : 0;

    // Proper ROI: (gain − cost) / cost × 100
    const roi = recoveryCost > 0 ? ((annualLift - recoveryCost) / recoveryCost) * 100 : 0;

    // Progress (where current sits between 1 and target, expressed as %)
    const progressDenom = Math.max(0.01, targetRating - 1);
    const progressPct = Math.max(0, Math.min(100, ((currentRating - 1) / progressDenom) * 100));

    return {
      neededReviews, isImpossible, gap,
      daysNeeded, salesNeeded,
      boostPct, monthlyLift, annualLift,
      recoveryCost, roi,
      progressPct,
    };
  }, [currentRating, totalReviews, targetRating, newReviewRating,
      dailySales, reviewRate, costPerReview, avgOrderValue]);

  const fmt = (n: number) => formatCurrency(n, currency);

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setCurrentRating(4.2); setTotalReviews(120); setTargetRating(4.5);
    setDailySales(20); setReviewRate(2.5); setNewReviewRating(4.8);
    setStrategy('insert'); setCostPerReview(2); setAvgOrderValue(25);
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
              <Star className="w-8 h-8 text-amber-400 fill-amber-400/40" />
              Reputation ROI Engine
            </h1>
            <p className="text-slate-400 mt-2">
              Calculate the path, cost, and payoff of improving your rating.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800">
              <Target className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-slate-400">Goal:</span>
              <span className="text-sm font-bold text-white">{targetRating}</span>
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            </div>
            <CurrencyPicker value={currency} onChange={setCurrency} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ─── LEFT: INPUTS ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Current status */}
            <Section icon={<BarChart3 className="w-4 h-4 text-orange-400" />} title="Current status">
              <RatingSlider
                label="Current rating"
                value={currentRating}
                onChange={(n) => setCurrentRating(Math.min(5, Math.max(1, n)))}
                min={1} max={5}
                accent="amber"
              />
              <NumberField label="Total review count" value={totalReviews} onChange={setTotalReviews} />
              <RatingSlider
                label="Target rating"
                value={targetRating}
                onChange={(n) => setTargetRating(Math.min(4.95, Math.max(currentRating + 0.05, n)))}
                min={Math.max(1.1, currentRating + 0.05)} max={4.95}
                accent="orange"
              />
            </Section>

            {/* Velocity */}
            <Section icon={<TrendingUp className="w-4 h-4 text-orange-400" />} title="Velocity & quality">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Daily sales"     value={dailySales} onChange={setDailySales} />
                <NumberField label="Review rate %"   value={reviewRate} onChange={setReviewRate} step={0.1} />
              </div>
              <RatingSlider
                label="Expected new review rating"
                value={newReviewRating}
                onChange={(n) => setNewReviewRating(Math.min(5, Math.max(1, n)))}
                min={1} max={5}
                accent="amber"
                hint="What stars do you expect each NEW review to give? 4.8 is realistic for a decent product; 5.0 is fantasy."
              />
            </Section>

            {/* Strategy */}
            <Section icon={<Layers className="w-4 h-4 text-orange-400" />} title="Strategy & cost">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block tracking-wider">Acquisition strategy</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  {STRATEGIES.slice(0, 3).map((s) => (
                    <StrategyChip
                      key={s.id}
                      active={strategy === s.id}
                      label={s.label}
                      onClick={() => handleStrategyChange(s.id)}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-2">
                  {STRATEGIES.slice(3).map((s) => (
                    <StrategyChip
                      key={s.id}
                      active={strategy === s.id}
                      label={s.label}
                      onClick={() => handleStrategyChange(s.id)}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {STRATEGIES.find((s) => s.id === strategy)?.hint}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Cost / review"
                  value={costPerReview}
                  onChange={(n) => { setCostPerReview(n); setStrategy('custom'); }}
                  step={0.5}
                />
                <NumberField label="Avg order value" value={avgOrderValue} onChange={setAvgOrderValue} />
              </div>
            </Section>
          </div>

          {/* ─── RIGHT: INTELLIGENCE ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Recovery path hero */}
            <RecoveryPathCard m={m} currentRating={currentRating} targetRating={targetRating} newReviewRating={newReviewRating} />

            {/* Sensitivity chart */}
            <SensitivityChart
              currentRating={currentRating}
              totalReviews={totalReviews}
              targetRating={targetRating}
              newReviewRating={newReviewRating}
              currentNeeded={m.neededReviews}
            />

            {/* Financial impact 3-up */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FinancialCard
                label="Est. monthly lift"
                value={`+${fmt(m.monthlyLift)}`}
                sub={`From ${m.boostPct.toFixed(1)}% conversion boost`}
                tone="good"
                icon={<DollarSign className="w-5 h-5" />}
              />
              <FinancialCard
                label="Recovery cost"
                value={fmt(m.recoveryCost)}
                sub={m.isImpossible ? 'Strategy infeasible' : `${m.neededReviews.toLocaleString()} reviews × ${fmt(costPerReview)}`}
                tone="neutral"
                icon={<Layers className="w-5 h-5" />}
              />
              <FinancialCard
                label="Annualized ROI"
                value={m.recoveryCost > 0 && !m.isImpossible ? `${m.roi >= 0 ? '+' : ''}${m.roi.toFixed(0)}%` : '—'}
                sub={m.recoveryCost === 0 ? 'Free strategy' : m.roi > 200 ? 'Excellent payback' : m.roi > 50 ? 'Solid payback' : 'Marginal payback'}
                tone={m.roi > 100 ? 'good' : m.roi > 0 ? 'orange' : 'critical'}
                icon={<Zap className="w-5 h-5" />}
              />
            </div>

            {/* Reality check 2-up */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RealityCheckCard
                label="Sales required"
                icon={<TrendingUp className="w-5 h-5 text-orange-400" />}
                value={Number.isFinite(m.salesNeeded) ? m.salesNeeded.toLocaleString() : '∞'}
                sub={`At ${reviewRate}% review rate, this many orders generates ${m.isImpossible ? '∞' : m.neededReviews.toLocaleString()} new reviews.`}
              />
              <RealityCheckCard
                label="Wait time"
                icon={<Clock className="w-5 h-5 text-orange-400" />}
                value={Number.isFinite(m.daysNeeded) ? (
                  m.daysNeeded < 60
                    ? <>{m.daysNeeded} <span className="text-base font-medium text-slate-500">days</span></>
                    : <>{(m.daysNeeded / 30).toFixed(1)} <span className="text-base font-medium text-slate-500">months</span></>
                ) : '∞'}
                sub="Organic velocity only. Strategies below speed this up substantially."
              />
            </div>

            {/* Diagnostic */}
            <DiagnosticCard
              m={m}
              currentRating={currentRating}
              targetRating={targetRating}
              newReviewRating={newReviewRating}
              totalReviews={totalReviews}
              fmt={fmt}
            />

            {/* Strategy guide */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex gap-4">
              <MessageSquare className="w-5 h-5 text-orange-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-orange-300 font-bold text-sm mb-2">How to speed this up</h4>
                <ul className="text-xs text-slate-400 leading-relaxed list-disc pl-4 space-y-1.5">
                  <li><b className="text-slate-300">Amazon Vine:</b> ~30 reviews in 2–3 weeks; cost ~{fmt(200)}.</li>
                  <li><b className="text-slate-300">Request-a-Review:</b> tools that click the button on every order — review rate jumps from ~2% to ~4-5%.</li>
                  <li><b className="text-slate-300">Insert cards:</b> packaging ask for honest feedback. <em>Neutral wording only</em> — never request "5 stars" specifically (TOS violation).</li>
                  <li><b className="text-slate-300">Address negative reviews:</b> respond publicly, fix the issue, and quality issues will resolve themselves over time.</li>
                </ul>
              </div>
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">{icon} {title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function NumberField({
  label, value, onChange, step,
}: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <input
        type="number" min={0} step={step ?? 1}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value, 0))}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
      />
    </div>
  );
}

function RatingSlider({
  label, value, onChange, min, max, accent, hint,
}: {
  label: string; value: number; onChange: (n: number) => void;
  min: number; max: number;
  accent: 'amber' | 'orange';
  hint?: string;
}) {
  const accentClass = accent === 'amber' ? 'accent-amber-400' : 'accent-orange-500';
  const valueClass = accent === 'amber' ? 'text-amber-400' : 'text-orange-400';
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
        <span className={`font-mono font-bold flex items-center gap-1 ${valueClass}`}>
          {value.toFixed(1)}
          <Star className="w-3 h-3 fill-current" />
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full ${accentClass}`}
      />
      {hint && <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">{hint}</p>}
    </div>
  );
}

function StrategyChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`py-1.5 text-[10px] font-bold rounded border transition ${
        active
          ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function CurrencyPicker({ value, onChange }: { value: CurrencyCode; onChange: (c: CurrencyCode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const current = CURRENCIES.find((c) => c.code === value)!;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-200 transition"
      >
        <span className="font-mono">{current.symbol}</span>
        <span className="font-bold">{current.code}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-10 py-1 min-w-[120px]">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-800 transition flex items-center gap-2 ${c.code === value ? 'text-orange-400' : 'text-slate-300'}`}
            >
              <span className="font-mono w-8">{c.symbol}</span>
              <span className="font-bold">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   RECOVERY PATH HERO
───────────────────────────────────────────── */
function RecoveryPathCard({
  m, currentRating, targetRating, newReviewRating,
}: {
  m: any; currentRating: number; targetRating: number; newReviewRating: number;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-7 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
        <Trophy className="w-40 h-40 text-amber-400" />
      </div>

      <div className="relative">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-orange-400" /> The recovery path
        </h2>

        {m.isImpossible ? (
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-10 h-10 text-rose-400 shrink-0" />
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Target unreachable</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                With incoming reviews averaging <b className="text-amber-400">{newReviewRating.toFixed(1)}★</b>, the math caps out below
                <b className="text-orange-400"> {targetRating.toFixed(1)}★</b> — every new review pulls the average toward {newReviewRating.toFixed(1)}, not above it.
                <span className="block mt-2 text-orange-300">
                  Fix: raise "expected new review rating" or lower the target.
                </span>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div>
                <span className="text-5xl font-black text-white font-mono">{m.neededReviews.toLocaleString()}</span>
                <p className="text-sm text-amber-400 font-bold mt-1 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  new reviews @ {newReviewRating.toFixed(1)}★ avg
                </p>
              </div>
              <div className="h-14 w-px bg-slate-800 hidden md:block self-start mt-2" />
              <div>
                <span className="text-5xl font-black text-white font-mono">
                  {Number.isFinite(m.daysNeeded) ? m.daysNeeded.toLocaleString() : '∞'}
                </span>
                <p className="text-sm text-orange-400 font-bold mt-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  days at current velocity
                </p>
              </div>
            </div>

            {/* Real progress bar */}
            <div className="mt-7">
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span>Current: <span className="font-mono text-white">{currentRating.toFixed(1)}★</span></span>
                <span className="text-orange-400">Gap: <span className="font-mono">{m.gap.toFixed(1)}★</span></span>
                <span>Target: <span className="font-mono text-white">{targetRating.toFixed(1)}★</span></span>
              </div>
              <div className="h-3 bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                  style={{ width: `${m.progressPct}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/60"
                  style={{ left: `${m.progressPct}%` }}
                  title="You are here"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                {m.neededReviews.toLocaleString()} new reviews at {newReviewRating.toFixed(1)}★ avg will close the {m.gap.toFixed(1)}★ gap.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SENSITIVITY CHART (SVG)
───────────────────────────────────────────── */
function SensitivityChart({
  currentRating, totalReviews, targetRating, newReviewRating, currentNeeded,
}: {
  currentRating: number; totalReviews: number;
  targetRating: number; newReviewRating: number;
  currentNeeded: number;
}) {
  // Generate curve from currentRating+0.05 to newReviewRating-0.02
  const xMin = currentRating + 0.05;
  const xMax = Math.min(5, newReviewRating - 0.02);

  const W = 720, H = 220;
  const pad = { top: 16, right: 18, bottom: 32, left: 56 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  if (xMax <= xMin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-widest flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Sensitivity: reviews needed vs target rating
        </h3>
        <p className="text-sm text-slate-500 py-6 text-center">
          Increase your "expected new review rating" above {currentRating.toFixed(1)}★ to see the curve.
        </p>
      </div>
    );
  }

  const N = 100;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const x = xMin + (xMax - xMin) * (i / N);
    const y = reviewsNeeded(currentRating, totalReviews, x, newReviewRating);
    if (Number.isFinite(y)) points.push({ x, y });
  }
  if (points.length === 0) return null;

  // Cap Y at 10× current to keep the chart readable when curve goes asymptotic
  const yCap = Math.max(currentNeeded * 10, 50);
  const yMax = Math.min(yCap, Math.max(...points.map((p) => p.y)) * 1.05);

  const xToPx = (x: number) => pad.left + ((x - xMin) / (xMax - xMin)) * chartW;
  const yToPx = (y: number) => pad.top + (1 - Math.min(y, yMax) / yMax) * chartH;

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(p.x)} ${yToPx(p.y)}`)
    .join(' ');

  // Y axis ticks
  const yTicks = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), Math.round(yMax)];
  // X axis ticks
  const xTicks: number[] = [];
  for (let i = 0; i <= 5; i++) xTicks.push(xMin + ((xMax - xMin) * i) / 5);

  const targetX = Math.max(xMin, Math.min(xMax, targetRating));
  const targetY = Math.min(currentNeeded, yMax);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" /> Sensitivity: reviews needed vs target
        </h3>
        <span className="text-[11px] text-slate-500">
          Asymptotes at <span className="font-mono text-amber-400">{newReviewRating.toFixed(1)}★</span> (new-review average)
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 200 }}>
        {/* Grid */}
        {yTicks.map((tv) => (
          <g key={tv}>
            <line x1={pad.left} x2={W - pad.right} y1={yToPx(tv)} y2={yToPx(tv)}
              stroke="#1e293b" strokeWidth={1} strokeDasharray={tv === 0 ? '0' : '3,4'} />
            <text x={pad.left - 6} y={yToPx(tv) + 3} fontSize={10} fill="#475569" textAnchor="end" fontFamily="ui-monospace, monospace">
              {tv.toLocaleString()}
            </text>
          </g>
        ))}

        {/* Curve */}
        <path d={pathD} fill="none" stroke="#f97316" strokeWidth={2.5} />

        {/* Filled area below curve (subtle) */}
        <path d={`${pathD} L ${xToPx(xMax)} ${yToPx(0)} L ${xToPx(xMin)} ${yToPx(0)} Z`} fill="#f97316" fillOpacity={0.08} />

        {/* Target marker */}
        <line x1={xToPx(targetX)} x2={xToPx(targetX)} y1={pad.top} y2={H - pad.bottom}
          stroke="#fbbf24" strokeWidth={1} strokeDasharray="3,3" opacity={0.7} />
        <circle cx={xToPx(targetX)} cy={yToPx(targetY)} r={5} fill="#fbbf24" stroke="#0a0f1a" strokeWidth={2} />
        <text x={xToPx(targetX)} y={Math.max(pad.top + 10, yToPx(targetY) - 8)}
          fontSize={10} fill="#fbbf24" textAnchor="middle" fontFamily="ui-monospace, monospace" fontWeight="bold">
          {Number.isFinite(currentNeeded) ? `${currentNeeded.toLocaleString()} @ ${targetRating.toFixed(1)}★` : '—'}
        </text>

        {/* X axis labels */}
        {xTicks.map((x, i) => (
          <text key={i} x={xToPx(x)} y={H - pad.bottom + 16}
            fontSize={10} fill="#64748b" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {x.toFixed(1)}★
          </text>
        ))}
      </svg>

      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
        As your target approaches the asymptote (incoming review average), the reviews-needed curve goes vertical — small target gains cost a lot of reviews near the top.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FINANCIAL CARDS + REALITY CHECK
───────────────────────────────────────────── */
function FinancialCard({
  label, value, sub, tone, icon,
}: {
  label: string; value: string; sub: string;
  tone: 'good' | 'orange' | 'neutral' | 'critical';
  icon: React.ReactNode;
}) {
  const config = {
    good:     { bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
    orange:   { bg: 'bg-orange-950/15',  border: 'border-orange-500/30',  text: 'text-orange-400' },
    neutral:  { bg: 'bg-slate-900',      border: 'border-slate-800',      text: 'text-slate-300' },
    critical: { bg: 'bg-rose-950/20',    border: 'border-rose-500/30',    text: 'text-rose-400' },
  }[tone];
  return (
    <div className={`rounded-xl border p-5 relative overflow-hidden ${config.bg} ${config.border}`}>
      <div className={`absolute top-2 right-2 opacity-10 ${config.text}`}>{icon}</div>
      <span className={`text-[10px] font-bold uppercase tracking-widest block mb-2 ${config.text}`}>{label}</span>
      <div className="text-2xl font-black text-white font-mono mb-1">{value}</div>
      <p className="text-[10px] text-slate-400 leading-tight">{sub}</p>
    </div>
  );
}

function RealityCheckCard({
  label, icon, value, sub,
}: {
  label: string; icon: React.ReactNode;
  value: React.ReactNode; sub: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</h3>
        {icon}
      </div>
      <div className="text-3xl font-black text-white font-mono mb-2">{value}</div>
      <p className="text-xs text-slate-500 leading-relaxed">{sub}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DIAGNOSTIC
───────────────────────────────────────────── */
function DiagnosticCard({
  m, currentRating, targetRating, newReviewRating, totalReviews, fmt,
}: {
  m: any; currentRating: number; targetRating: number; newReviewRating: number; totalReviews: number;
  fmt: (n: number) => string;
}) {
  const issues: { tone: 'warning' | 'critical' | 'info'; text: React.ReactNode }[] = [];

  if (m.isImpossible) {
    issues.push({
      tone: 'critical',
      text: <>Target {targetRating.toFixed(1)}★ is at or above the expected new-review rating ({newReviewRating.toFixed(1)}★). Each new review pulls average <i>toward</i> {newReviewRating.toFixed(1)}, never above. Lower target or raise quality.</>,
    });
  }

  if (totalReviews > 1000 && m.neededReviews > totalReviews * 0.5 && !m.isImpossible) {
    issues.push({
      tone: 'warning',
      text: <>With <b>{totalReviews.toLocaleString()}</b> existing reviews, moving the average is slow. You'd need <b>{m.neededReviews.toLocaleString()}</b> new reviews — {((m.neededReviews / totalReviews) * 100).toFixed(0)}% of your current base. Consider focusing on quality of new reviews rather than chasing average upward.</>,
    });
  }

  if (!m.isImpossible && m.roi < 0 && m.recoveryCost > 0) {
    issues.push({
      tone: 'warning',
      text: <>Recovery cost ({fmt(m.recoveryCost)}) exceeds expected annual lift ({fmt(m.annualLift)}). This strategy doesn't pay back within a year — switch to a cheaper acquisition method or reconsider the target.</>,
    });
  }

  if (!m.isImpossible && Number.isFinite(m.daysNeeded) && m.daysNeeded > 365) {
    issues.push({
      tone: 'warning',
      text: <>Organic timeline is over a year. The numbers will look very different in 12 months — paid review acquisition (Vine, request-button automation) is almost certainly worth it here.</>,
    });
  }

  if (issues.length === 0) {
    return (
      <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-emerald-300 mb-1">Plan checks out</div>
          <div className="text-xs text-emerald-200/90 leading-relaxed">
            {m.neededReviews > 0 ? (
              <>Targeting {targetRating.toFixed(1)}★ requires <b>{m.neededReviews.toLocaleString()}</b> new {newReviewRating.toFixed(1)}★-avg reviews.
              At {fmt(m.recoveryCost)} cost and {fmt(m.monthlyLift)}/mo lift, ROI is <b>{m.roi.toFixed(0)}%</b> annualized.</>
            ) : (
              <>You're already at or above the target rating. No reviews needed — defend the position.</>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-1">
        <Info className="w-3.5 h-3.5 text-orange-400" /> Plan diagnostics ({issues.length})
      </h3>
      {issues.map((iss, i) => {
        const toneConfig = {
          critical: 'border-rose-500/30 bg-rose-950/15 text-rose-300',
          warning:  'border-amber-500/30 bg-amber-950/15 text-amber-200',
          info:     'border-slate-700 bg-slate-950 text-slate-300',
        }[iss.tone];
        const icon = iss.tone === 'critical'
          ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />;
        return (
          <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${toneConfig}`}>
            {icon}
            <div className="text-xs leading-relaxed">{iss.text}</div>
          </div>
        );
      })}
    </div>
  );
}