'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Swords,
  Trophy,
  TrendingUp,
  Target,
  Scale,
  Crown,
  Zap,
  BookOpen,
  Compass,
  Info,
  Skull,
  Crosshair,
  Banknote,
  Star,
  MessageSquare,
  Tag,
  ChevronDown,
  RotateCcw,
  Lightbulb,
  ArrowUp,
  Calculator,
  AlertTriangle,
  ShieldCheck,
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

const STORAGE_KEY = 'competitor-war-room:state:v1';

type BattleStatus = 'Dominating' | 'Winning' | 'Fighting' | 'Losing';
type Position = 'Premium Brand' | 'Overpriced' | 'Value Killer' | 'Budget Option' | 'Standard';

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

/* ─── Power score factors ─── */
const ratingPower = (rating: number): number => Math.pow(Math.max(0, Math.min(5, rating)), 3);
const reviewPower = (reviews: number): number => Math.log(Math.max(0, reviews) + 1) * 2;
const pricePower  = (price: number): number => (price > 0 ? 100 / price : 0);

const powerScore = (rating: number, reviews: number, price: number): number =>
  ratingPower(rating) * reviewPower(reviews) * pricePower(price);

/** What price would I need, given my rating/reviews, to beat the competitor's score by 5%? */
function calcPriceToWin(
  myRating: number, myReviews: number,
  compScore: number, costFloor: number,
): { rawPrice: number; clampedPrice: number; clamped: boolean; feasible: boolean } {
  const target = compScore * 1.05;
  const myFactor = ratingPower(myRating) * reviewPower(myReviews);
  if (target <= 0 || myFactor <= 0) {
    return { rawPrice: 0, clampedPrice: 0, clamped: false, feasible: false };
  }
  const raw = (myFactor * 100) / target;
  const floor = Math.max(costFloor * 1.01, 1); // never recommend below 1% above cost
  const clamped = Math.max(raw, floor);
  return {
    rawPrice: raw,
    clampedPrice: Math.round(clamped),
    clamped: raw < floor,
    feasible: raw > costFloor,
  };
}

function calcStatus(winProb: number): BattleStatus {
  if (winProb > 65) return 'Dominating';
  if (winProb > 50) return 'Winning';
  if (winProb > 40) return 'Fighting';
  return 'Losing';
}

function calcPosition(myPrice: number, compPrice: number, myRating: number, compRating: number): Position {
  if (myPrice > compPrice && myRating >= compRating) return 'Premium Brand';
  if (myPrice > compPrice && myRating < compRating)  return 'Overpriced';
  if (myPrice < compPrice && myRating >= compRating) return 'Value Killer';
  if (myPrice < compPrice && myRating < compRating)  return 'Budget Option';
  return 'Standard';
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function CompetitorWarRoom() {
  // My product
  const [myPrice, setMyPrice]             = useState(25);
  const [myLandedCost, setMyLandedCost]   = useState(10);
  const [myRating, setMyRating]           = useState(4.4);
  const [myReviews, setMyReviews]         = useState(150);
  const [myDailySales, setMyDailySales]   = useState(20);

  // Competitor
  const [compPrice, setCompPrice]         = useState(29);
  const [compRating, setCompRating]       = useState(4.6);
  const [compReviews, setCompReviews]     = useState(2500);

  // Currency
  const [currency, setCurrency]           = useState<CurrencyCode>('INR');
  const [hydrated, setHydrated]           = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.myPrice       === 'number') setMyPrice(s.myPrice);
        if (typeof s.myLandedCost  === 'number') setMyLandedCost(s.myLandedCost);
        if (typeof s.myRating      === 'number') setMyRating(s.myRating);
        if (typeof s.myReviews     === 'number') setMyReviews(s.myReviews);
        if (typeof s.myDailySales  === 'number') setMyDailySales(s.myDailySales);
        if (typeof s.compPrice     === 'number') setCompPrice(s.compPrice);
        if (typeof s.compRating    === 'number') setCompRating(s.compRating);
        if (typeof s.compReviews   === 'number') setCompReviews(s.compReviews);
        if (typeof s.currency      === 'string') setCurrency(s.currency as CurrencyCode);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        myPrice, myLandedCost, myRating, myReviews, myDailySales,
        compPrice, compRating, compReviews, currency,
      }));
    } catch { /* ignore */ }
  }, [hydrated, myPrice, myLandedCost, myRating, myReviews, myDailySales,
      compPrice, compRating, compReviews, currency]);

  /* ── Compute ── */
  const m = useMemo(() => {
    const myScore   = powerScore(myRating, myReviews, myPrice);
    const compScore = powerScore(compRating, compReviews, compPrice);

    const total = myScore + compScore;
    const winProb = total > 0 ? (myScore / total) * 100 : 50;

    const status = calcStatus(winProb);
    const position = calcPosition(myPrice, compPrice, myRating, compRating);

    const priceWin = calcPriceToWin(myRating, myReviews, compScore, myLandedCost);

    // War economics
    const monthlyVol = myDailySales * 30;
    const currentMargin = myPrice - myLandedCost;
    const warMargin = priceWin.clampedPrice - myLandedCost;
    const marginSacrifice = Math.max(0, currentMargin - warMargin);
    const monthlyWarCost = marginSacrifice * monthlyVol;

    const liftNeededPct = warMargin > 0 && currentMargin > 0
      ? ((currentMargin / warMargin) - 1) * 100
      : Infinity;

    // Component factors (for breakdown UI)
    const factors = {
      mine: {
        rating: ratingPower(myRating),
        reviews: reviewPower(myReviews),
        price:  pricePower(myPrice),
      },
      comp: {
        rating: ratingPower(compRating),
        reviews: reviewPower(compReviews),
        price:  pricePower(compPrice),
      },
    };

    return {
      myScore, compScore,
      winProb, status, position,
      priceWin, monthlyWarCost, marginSacrifice, liftNeededPct,
      factors,
    };
  }, [myPrice, myLandedCost, myRating, myReviews, myDailySales, compPrice, compRating, compReviews]);

  /* ── Lever scenarios ── */
  const levers = useMemo(() => {
    const buildScenario = (label: string, hint: string, tweaks: { r?: number; rv?: number; p?: number }) => {
      const newRating  = Math.min(5, myRating + (tweaks.r ?? 0));
      const newReviews = Math.max(0, myReviews + (tweaks.rv ?? 0));
      const newPrice   = Math.max(myLandedCost * 1.01, myPrice + (tweaks.p ?? 0));
      const newScore   = powerScore(newRating, newReviews, newPrice);
      const total = newScore + m.compScore;
      const newWinProb = total > 0 ? (newScore / total) * 100 : 50;
      return {
        label, hint,
        newScore, newWinProb,
        delta: newWinProb - m.winProb,
      };
    };
    return [
      buildScenario('+0.2★ rating',     'Through product quality improvements',     { r: 0.2 }),
      buildScenario('2× reviews',       'Through review request campaigns',          { rv: myReviews }),
      buildScenario('−10% price drop',  'Discount or promo lever',                   { p: -myPrice * 0.10 }),
    ];
  }, [myRating, myReviews, myPrice, myLandedCost, m.compScore, m.winProb]);

  const fmt = (n: number) => formatCurrency(n, currency);

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setMyPrice(25); setMyLandedCost(10); setMyRating(4.4); setMyReviews(150); setMyDailySales(20);
    setCompPrice(29); setCompRating(4.6); setCompReviews(2500);
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
              <Swords className="w-8 h-8 text-orange-500" />
              Competitor War Room
            </h1>
            <p className="text-slate-400 mt-2">
              Calculate market power, find your winning price, and see which lever moves the needle.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <BattleBadge status={m.status} />
            <CurrencyPicker value={currency} onChange={setCurrency} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
              title="Reset all inputs"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ─── LEFT: INPUTS ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* My stats */}
            <div className="bg-slate-900 rounded-xl border-2 border-orange-500/30 p-6 relative">
              <div className="absolute -top-3 left-6 bg-orange-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                YOU
              </div>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Your price"   value={myPrice}      onChange={setMyPrice} accent="orange" />
                  <NumberField label="Unit cost"    value={myLandedCost} onChange={setMyLandedCost} accent="orange" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Rating (1-5)" value={myRating}    onChange={(n) => setMyRating(Math.min(5, n))} step={0.1} accent="orange" />
                  <NumberField label="Reviews"      value={myReviews}   onChange={setMyReviews} accent="orange" />
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <NumberField label="Daily sales (units)" value={myDailySales} onChange={setMyDailySales} accent="orange" />
                </div>
              </div>
            </div>

            {/* Competitor stats */}
            <div className="bg-slate-900 rounded-xl border-2 border-rose-500/30 p-6 relative">
              <div className="absolute -top-3 left-6 bg-rose-600 px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg">
                THEM
              </div>
              <div className="space-y-3 mt-2">
                <NumberField label="Competitor price" value={compPrice} onChange={setCompPrice} accent="rose" />
                <div className="grid grid-cols-2 gap-3">
                  <NumberField label="Rating (1-5)"   value={compRating}  onChange={(n) => setCompRating(Math.min(5, n))} step={0.1} accent="rose" />
                  <NumberField label="Reviews"        value={compReviews} onChange={setCompReviews} accent="rose" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: WAR ROOM ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Power tug-of-war */}
            <PowerBar
              winProb={m.winProb}
              myScore={m.myScore}
              compScore={m.compScore}
              position={m.position}
            />

            {/* Score breakdown */}
            <ScoreBreakdown
              factors={m.factors}
              myScore={m.myScore}
              compScore={m.compScore}
            />

            {/* Two-up: Price To Win + Cost of War */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <PriceToWinCard
                priceWin={m.priceWin}
                myPrice={myPrice}
                winProb={m.winProb}
                fmt={fmt}
              />
              <CostOfWarCard
                marginSacrifice={m.marginSacrifice}
                monthlyWarCost={m.monthlyWarCost}
                liftNeededPct={m.liftNeededPct}
                priceWin={m.priceWin}
                winProb={m.winProb}
                fmt={fmt}
              />
            </div>

            {/* Position-aware recommendation */}
            <PositionRecommendation
              position={m.position}
              winProb={m.winProb}
              priceWin={m.priceWin}
              myPrice={myPrice}
              compPrice={compPrice}
              fmt={fmt}
            />

            {/* Lever simulator */}
            <LeverSimulator levers={levers} currentWin={m.winProb} />

            {/* Strategy guide */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <GuideCard
                icon={<Compass className="w-5 h-5 text-orange-400" />}
                title="Why use this?"
                body={<>
                  Social proof isn't fair. A competitor with 2,500 reviews can charge more than you. This tool shows the <b>exact gap</b> you need to bridge — and the <b>cheapest lever</b> to do it.
                </>}
              />
              <GuideCard
                icon={<Crosshair className="w-5 h-5 text-orange-400" />}
                title="When to use?"
                body={<>
                  <b>Product launch:</b> find your entry price.<br />
                  <b>Sales slump:</b> see if competitor improved.<br />
                  <b>Ad spend spike:</b> check if win probability dropped.
                </>}
              />
              <GuideCard
                icon={<Info className="w-5 h-5 text-orange-400" />}
                title="The formula"
                body={<>
                  Power = rating³ × ln(reviews+1)×2 × (100/price).<br />
                  Rating weighs cubically — every star matters. Reviews diminish logarithmically. Price scales inversely.
                </>}
              />
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

function NumberField({
  label, value, onChange, step, accent = 'orange',
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  accent?: 'orange' | 'rose';
}) {
  const focusRing = accent === 'rose'
    ? 'focus:border-rose-500 focus:ring-rose-500/20'
    : 'focus:border-orange-500 focus:ring-orange-500/20';
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <input
        type="number"
        step={step ?? 1}
        min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value, 0))}
        className={`w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:ring-2 outline-none transition ${focusRing}`}
      />
    </div>
  );
}

function BattleBadge({ status }: { status: BattleStatus }) {
  const config = {
    Dominating: { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   icon: <Crown className="w-4 h-4" /> },
    Winning:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <Trophy className="w-4 h-4" /> },
    Fighting:   { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  icon: <Swords className="w-4 h-4" /> },
    Losing:     { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400 animate-pulse',    icon: <Skull className="w-4 h-4" /> },
  }[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border}`}>
      <span className={config.text}>{config.icon}</span>
      <span className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>{status}</span>
    </div>
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
   POWER BAR (tug of war)
───────────────────────────────────────────── */
function PowerBar({
  winProb, myScore, compScore, position,
}: {
  winProb: number; myScore: number; compScore: number; position: Position;
}) {
  const posStyle = {
    'Premium Brand':  'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'Overpriced':     'bg-rose-500/10 text-rose-400 border-rose-500/30',
    'Value Killer':   'bg-orange-500/10 text-orange-400 border-orange-500/30',
    'Budget Option':  'bg-slate-500/10 text-slate-300 border-slate-500/30',
    'Standard':       'bg-slate-500/10 text-slate-300 border-slate-500/30',
  }[position];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Scale className="w-4 h-4 text-orange-400" /> Market power split
        </h2>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${posStyle}`}>
          {position}
        </span>
      </div>

      {/* Tug of war */}
      <div className="relative h-14 bg-slate-950 rounded-full border border-slate-700 flex overflow-hidden">
        <div
          className={`h-full flex items-center justify-start pl-5 text-lg font-black italic transition-all duration-500 ${
            winProb > 50 ? 'bg-orange-600 text-white' : 'bg-orange-600/40 text-orange-200'
          }`}
          style={{ width: `${Math.max(2, Math.min(98, winProb))}%` }}
        >
          YOU {winProb.toFixed(0)}%
        </div>
        <div className={`flex-1 h-full flex items-center justify-end pr-5 text-lg font-black italic ${
          winProb < 50 ? 'bg-rose-700 text-white' : 'bg-rose-700/30 text-rose-300'
        }`}>
          {(100 - winProb).toFixed(0)}% THEM
        </div>
        {/* Center line */}
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/40 z-10 -translate-x-px" />
      </div>

      <div className="flex justify-between text-[11px] text-slate-500 mt-3">
        <span>Your score: <span className="font-mono text-orange-400 font-bold">{myScore.toFixed(0)}</span></span>
        <span>Center = 50/50</span>
        <span>Their score: <span className="font-mono text-rose-400 font-bold">{compScore.toFixed(0)}</span></span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCORE BREAKDOWN
───────────────────────────────────────────── */
function ScoreBreakdown({
  factors, myScore, compScore,
}: {
  factors: { mine: { rating: number; reviews: number; price: number }; comp: { rating: number; reviews: number; price: number } };
  myScore: number; compScore: number;
}) {
  const rows: {
    icon: React.ReactNode; label: string;
    mine: number; comp: number;
  }[] = [
    { icon: <Star className="w-3.5 h-3.5" />,          label: 'Rating power',  mine: factors.mine.rating,  comp: factors.comp.rating },
    { icon: <MessageSquare className="w-3.5 h-3.5" />, label: 'Review power',  mine: factors.mine.reviews, comp: factors.comp.reviews },
    { icon: <Tag className="w-3.5 h-3.5" />,           label: 'Price power',   mine: factors.mine.price,   comp: factors.comp.price },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Calculator className="w-4 h-4 text-orange-400" /> Score breakdown
        </h3>
        <span className="text-[11px] text-slate-500">Score = rating power × review power × price power</span>
      </div>

      <div className="space-y-4">
        {rows.map((r) => {
          const max = Math.max(r.mine, r.comp, 0.01);
          const mineWidth = (r.mine / max) * 100;
          const compWidth = (r.comp / max) * 100;
          const mineLeads = r.mine >= r.comp;
          return (
            <div key={r.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <span className="text-orange-400">{r.icon}</span>
                  {r.label}
                </span>
                <span className={`text-[10px] font-mono uppercase font-bold tracking-wider ${mineLeads ? 'text-orange-400' : 'text-rose-400'}`}>
                  {mineLeads ? 'You lead' : 'They lead'}
                </span>
              </div>

              {/* You row */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-orange-400 font-bold w-12 shrink-0">YOU</span>
                <div className="flex-1 h-4 bg-slate-950 rounded border border-slate-800 overflow-hidden">
                  <div className="h-full bg-orange-500/70 transition-all" style={{ width: `${mineWidth}%` }} />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-200 w-14 text-right">
                  {r.mine.toFixed(1)}
                </span>
              </div>

              {/* Them row */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-rose-400 font-bold w-12 shrink-0">THEM</span>
                <div className="flex-1 h-4 bg-slate-950 rounded border border-slate-800 overflow-hidden">
                  <div className="h-full bg-rose-500/70 transition-all" style={{ width: `${compWidth}%` }} />
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-200 w-14 text-right">
                  {r.comp.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 pt-3 border-t border-slate-800 flex justify-between text-xs">
        <span className="text-slate-400">Total score</span>
        <div className="font-mono">
          <span className="text-orange-400 font-bold">{myScore.toFixed(0)}</span>
          <span className="text-slate-600 mx-2">vs</span>
          <span className="text-rose-400 font-bold">{compScore.toFixed(0)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PRICE TO WIN
───────────────────────────────────────────── */
function PriceToWinCard({
  priceWin, myPrice, winProb, fmt,
}: {
  priceWin: { rawPrice: number; clampedPrice: number; clamped: boolean; feasible: boolean };
  myPrice: number;
  winProb: number;
  fmt: (n: number) => string;
}) {
  const alreadyWinning = winProb > 55 && priceWin.clampedPrice > myPrice;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.06] pointer-events-none">
        <Target className="w-28 h-28 text-orange-500" />
      </div>
      <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-widest relative">
        <Target className="w-4 h-4 text-orange-400" /> Price to win
      </h3>

      {alreadyWinning ? (
        <div className="relative">
          <div className="text-emerald-400 text-sm font-bold flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4" /> You're already winning on value
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            You could <b>raise</b> your price up to <span className="font-mono text-emerald-400 font-bold">{fmt(priceWin.clampedPrice)}</span> and still hold market power. Capture more margin.
          </p>
        </div>
      ) : !priceWin.feasible ? (
        <div className="relative">
          <div className="text-rose-400 text-sm font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Can't win on price alone
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Even at break-even (<span className="font-mono">{fmt(priceWin.clampedPrice)}</span>), the math says you'd lose. Their rating/reviews advantage is too large.
            <span className="block mt-1 text-orange-400">Fix this with reviews or rating — see lever simulator below.</span>
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="text-4xl font-black text-white font-mono mb-1">
            {fmt(priceWin.clampedPrice)}
          </div>
          {priceWin.clamped && (
            <div className="text-[10px] text-amber-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Clamped at break-even floor
            </div>
          )}
          <p className="text-xs text-slate-400 leading-relaxed">
            Drop to <span className="font-mono text-orange-300 font-bold">{fmt(priceWin.clampedPrice)}</span> to overtake their power score.
            {priceWin.clamped && (
              <span className="block mt-1 text-slate-500">
                (Raw math wants <span className="font-mono">{fmt(Math.round(priceWin.rawPrice))}</span> — below your cost.)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   COST OF WAR
───────────────────────────────────────────── */
function CostOfWarCard({
  marginSacrifice, monthlyWarCost, liftNeededPct, priceWin, winProb, fmt,
}: {
  marginSacrifice: number;
  monthlyWarCost: number;
  liftNeededPct: number;
  priceWin: { feasible: boolean; clampedPrice: number };
  winProb: number;
  fmt: (n: number) => string;
}) {
  const alreadyWinning = winProb > 55 && marginSacrifice <= 0;
  const showCost = monthlyWarCost > 0 && priceWin.feasible;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.06] pointer-events-none">
        <Banknote className="w-28 h-28 text-rose-500" />
      </div>
      <h3 className="text-xs font-bold text-slate-500 uppercase mb-4 flex items-center gap-2 tracking-widest relative">
        <Skull className="w-4 h-4 text-orange-400" /> Cost of war
      </h3>

      {alreadyWinning ? (
        <div className="relative">
          <div className="text-emerald-400 text-sm font-bold flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4" /> Zero sacrifice
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            No price drop required. You're winning without bleeding margin.
          </p>
        </div>
      ) : showCost ? (
        <div className="relative">
          <div className="text-4xl font-black text-rose-400 font-mono mb-1">
            −{fmt(monthlyWarCost)}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Monthly profit sacrifice (if volume stays flat). You'd lose <span className="font-mono text-rose-300">{fmt(marginSacrifice)}</span> margin per unit.
          </p>
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-orange-400" />
              Volume lift needed to break even
            </div>
            <div className="text-lg font-mono font-bold text-orange-400">
              +{Number.isFinite(liftNeededPct) ? liftNeededPct.toFixed(0) : '∞'}%
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="text-rose-400 text-sm font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" /> Price war isn't viable
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Required price drops you below break-even. Don't fight on price — invest in reviews or rating instead.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   POSITION-AWARE RECOMMENDATION
───────────────────────────────────────────── */
function PositionRecommendation({
  position, winProb, priceWin, myPrice, compPrice, fmt,
}: {
  position: Position;
  winProb: number;
  priceWin: { feasible: boolean; clampedPrice: number };
  myPrice: number;
  compPrice: number;
  fmt: (n: number) => string;
}) {
  const config: Record<Position, { tone: string; title: string; body: React.ReactNode }> = {
    'Premium Brand': {
      tone: 'border-emerald-500/30 bg-emerald-950/15',
      title: 'Defend your premium position',
      body: <>You charge more (<span className="font-mono">{fmt(myPrice)}</span> vs <span className="font-mono">{fmt(compPrice)}</span>) <i>and</i> have a better rating. Don't drop price — that signals weakness. Double down on quality cues, packaging, and brand polish to justify the premium.</>,
    },
    'Overpriced': {
      tone: 'border-rose-500/30 bg-rose-950/15',
      title: 'You\'re vulnerable',
      body: <>You charge more but have a <b>weaker</b> rating. Fix product quality or drop price to match — current position will erode steadily. The lever simulator below shows which improvement moves the needle most.</>,
    },
    'Value Killer': {
      tone: 'border-orange-500/30 bg-orange-950/15',
      title: 'Strong position — scale it',
      body: <>Lower price and equal-or-better rating. Push volume — every conversion is a win. Watch for the competitor to respond with price cuts or review campaigns.</>,
    },
    'Budget Option': {
      tone: 'border-slate-500/30 bg-slate-900',
      title: 'Race to the bottom — be careful',
      body: <>Lower price <b>and</b> lower rating. You compete only on cost. Use this position as a launching pad to build reviews quickly, then raise rating to flip into "Value Killer".</>,
    },
    'Standard': {
      tone: 'border-slate-500/30 bg-slate-900',
      title: 'Roughly matched',
      body: <>Prices similar and ratings similar. The fight is decided by reviews, listing quality, and ad spend. Check the lever simulator for the cheapest path forward.</>,
    },
  };
  const c = config[position];

  return (
    <div className={`rounded-xl border p-5 ${c.tone}`}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2 flex items-center gap-2">
        <Lightbulb className="w-3.5 h-3.5 text-orange-400" />
        {c.title}
      </h3>
      <p className="text-sm text-slate-300 leading-relaxed">{c.body}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LEVER SIMULATOR
───────────────────────────────────────────── */
function LeverSimulator({
  levers, currentWin,
}: {
  levers: { label: string; hint: string; newWinProb: number; delta: number }[];
  currentWin: number;
}) {
  // Find biggest mover for highlight
  const maxDelta = Math.max(...levers.map((l) => l.delta));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Zap className="w-4 h-4 text-orange-400" /> Improvement levers
        </h3>
        <span className="text-[11px] text-slate-500">
          From current <span className="font-mono text-orange-400">{currentWin.toFixed(0)}%</span>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {levers.map((l) => {
          const isWinner = l.delta === maxDelta && l.delta > 0.5;
          const positive = l.delta > 0;
          return (
            <div
              key={l.label}
              className={`rounded-lg border p-4 transition relative ${
                isWinner
                  ? 'bg-orange-500/10 border-orange-500/40'
                  : positive
                  ? 'bg-slate-950 border-slate-700'
                  : 'bg-slate-950 border-slate-800 opacity-70'
              }`}
            >
              {isWinner && (
                <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-widest bg-orange-500 text-white px-2 py-0.5 rounded-full">
                  Biggest mover
                </span>
              )}
              <div className="text-sm font-bold text-white mb-1">{l.label}</div>
              <div className="text-[10px] text-slate-500 mb-3">{l.hint}</div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${
                  positive ? (isWinner ? 'text-orange-400' : 'text-emerald-400') : 'text-slate-400'
                }`}>
                  {l.newWinProb.toFixed(0)}%
                </span>
                <span className={`text-xs font-mono font-bold flex items-center ${
                  positive ? 'text-emerald-400' : 'text-slate-500'
                }`}>
                  {positive && <ArrowUp className="w-3 h-3" />}
                  {positive ? '+' : ''}{l.delta.toFixed(0)} pts
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
        Each scenario adjusts a single lever and recomputes win probability. The "biggest mover" tag points to the cheapest path to higher win odds.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GUIDE CARD
───────────────────────────────────────────── */
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