'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Rocket,
  Flame,
  Target,
  TrendingUp,
  DollarSign,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Swords,
  Trophy,
  Timer,
  Sprout,
  Store,
  ChevronDown,
  RotateCcw,
  Activity,
  Zap,
  Search,
  Info,
  Crown,
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

const MARKETPLACE_PRESETS: { label: string; fee: number; hint: string }[] = [
  { label: 'Amazon US', fee: 12,  hint: 'Avg US referral · 8–15%' },
  { label: 'Amazon IN', fee: 13,  hint: 'Avg India referral · 8–15%' },
  { label: 'Flipkart',  fee: 12,  hint: 'Avg commission · 5–25%' },
  { label: 'eBay',      fee: 12,  hint: 'Final value fee · ~10–13%' },
  { label: 'Etsy',      fee: 6.5, hint: 'Transaction · plus listing' },
];

const DURATION_PRESETS = [7, 14, 21, 30];

type RampPattern = 'frontload' | 'even' | 'slowramp';
const RAMP_PATTERNS: { value: RampPattern; label: string; hint: string }[] = [
  { value: 'frontload', label: 'Front-load',  hint: 'Heavy days 1-3, taper' },
  { value: 'even',      label: 'Even',        hint: 'Flat daily target' },
  { value: 'slowramp',  label: 'Slow ramp',   hint: 'Build gradually' },
];

const STORAGE_KEY = 'launch-simulator:state:v1';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const safeNum = (v: string | number, fallback = 0): number => {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) && n >= 0 ? n : fallback;
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

/** Build a daily-units array that sums to totalUnits, with the chosen ramp pattern. */
function buildDailyUnits(totalUnits: number, days: number, pattern: RampPattern): number[] {
  if (days <= 0 || totalUnits <= 0) return [];
  const weights: number[] = [];
  for (let i = 0; i < days; i++) {
    const t = days === 1 ? 0 : i / (days - 1); // 0 → 1
    let w: number;
    switch (pattern) {
      case 'frontload': w = 1.6 - t * 0.9;  break; // 1.6 → 0.7
      case 'even':      w = 1;              break;
      case 'slowramp':  w = 0.5 + t * 1.0;  break; // 0.5 → 1.5
    }
    weights.push(w);
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  // Allocate units proportionally and adjust rounding so sum matches totalUnits
  const raw = weights.map((w) => (w / sum) * totalUnits);
  const rounded = raw.map((v) => Math.floor(v));
  let allocated = rounded.reduce((a, b) => a + b, 0);
  // Distribute remainder to days with biggest fractional parts
  const remainders = raw.map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  let idx = 0;
  while (allocated < totalUnits && idx < remainders.length) {
    rounded[remainders[idx].i] += 1;
    allocated++;
    idx++;
  }
  return rounded;
}

function predictRank(velocityRatio: number, duration: number): { label: string; tone: 'good' | 'orange' | 'warning' | 'critical' } {
  // velocityRatio: yours / competitor's. duration: longer launches give slightly less ranking boost per day.
  if (velocityRatio >= 0.9 && duration <= 21) return { label: 'Top 3 (hero zone)', tone: 'good' };
  if (velocityRatio >= 0.9)                    return { label: 'Top 5',             tone: 'good' };
  if (velocityRatio >= 0.7)                    return { label: 'Top 10',            tone: 'orange' };
  if (velocityRatio >= 0.5)                    return { label: 'Page 1 (bottom)',   tone: 'orange' };
  if (velocityRatio >= 0.3)                    return { label: 'Page 2',            tone: 'warning' };
  return                                              { label: 'Page 3+',           tone: 'critical' };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function LaunchSimulator() {
  // Targets
  const [competitorDailySales, setCompetitorDailySales] = useState(30);
  const [kwSearchVolume, setKwSearchVolume]             = useState(5000);
  const [targetVelocityPct, setTargetVelocityPct]       = useState(80);

  // Pricing
  const [sellingPrice, setSellingPrice] = useState(25);
  const [launchPrice, setLaunchPrice]   = useState(19);
  const [landedCost, setLandedCost]     = useState(8);
  const [fbaFees, setFbaFees]           = useState(6);
  const [referralFeePct, setReferralFeePct] = useState(15);

  // Strategy
  const [targetAcos, setTargetAcos]     = useState(80);
  const [launchDuration, setLaunchDuration] = useState(14);
  const [rampPattern, setRampPattern]   = useState<RampPattern>('frontload');

  // Post-launch
  const [stabilizedAcos, setStabilizedAcos]   = useState(20);
  const [volumeRetentionPct, setVolumeRetentionPct] = useState(80);

  // Currency
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [hydrated, setHydrated] = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.competitorDailySales === 'number') setCompetitorDailySales(s.competitorDailySales);
        if (typeof s.kwSearchVolume       === 'number') setKwSearchVolume(s.kwSearchVolume);
        if (typeof s.targetVelocityPct    === 'number') setTargetVelocityPct(s.targetVelocityPct);
        if (typeof s.sellingPrice         === 'number') setSellingPrice(s.sellingPrice);
        if (typeof s.launchPrice          === 'number') setLaunchPrice(s.launchPrice);
        if (typeof s.landedCost           === 'number') setLandedCost(s.landedCost);
        if (typeof s.fbaFees              === 'number') setFbaFees(s.fbaFees);
        if (typeof s.referralFeePct       === 'number') setReferralFeePct(s.referralFeePct);
        if (typeof s.targetAcos           === 'number') setTargetAcos(s.targetAcos);
        if (typeof s.launchDuration       === 'number') setLaunchDuration(s.launchDuration);
        if (typeof s.stabilizedAcos       === 'number') setStabilizedAcos(s.stabilizedAcos);
        if (typeof s.volumeRetentionPct   === 'number') setVolumeRetentionPct(s.volumeRetentionPct);
        if (typeof s.rampPattern          === 'string') setRampPattern(s.rampPattern as RampPattern);
        if (typeof s.currency             === 'string') setCurrency(s.currency as CurrencyCode);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        competitorDailySales, kwSearchVolume, targetVelocityPct,
        sellingPrice, launchPrice, landedCost, fbaFees, referralFeePct,
        targetAcos, launchDuration, rampPattern,
        stabilizedAcos, volumeRetentionPct, currency,
      }));
    } catch { /* ignore */ }
  }, [hydrated, competitorDailySales, kwSearchVolume, targetVelocityPct,
      sellingPrice, launchPrice, landedCost, fbaFees, referralFeePct,
      targetAcos, launchDuration, rampPattern,
      stabilizedAcos, volumeRetentionPct, currency]);

  /* ── Compute ── */
  const m = useMemo(() => {
    // Target velocity
    const dailyTarget = Math.ceil(competitorDailySales * (targetVelocityPct / 100));
    const totalUnits = dailyTarget * launchDuration;
    const dailyUnitsArr = buildDailyUnits(totalUnits, launchDuration, rampPattern);

    // Per-unit launch economics
    const launchReferralFee = launchPrice * (referralFeePct / 100);
    const cpaLaunch = launchPrice * (targetAcos / 100); // Cost-per-acquisition under ACOS
    const launchUnitProfit = launchPrice - landedCost - fbaFees - launchReferralFee - cpaLaunch;

    // Launch totals
    const totalRevenue   = totalUnits * launchPrice;
    const totalLandedCost = totalUnits * landedCost;
    const totalFbaCost    = totalUnits * fbaFees;
    const totalReferralFee = totalUnits * launchReferralFee;
    const totalAdSpend    = totalUnits * cpaLaunch;

    const netResult = totalRevenue - totalLandedCost - totalFbaCost - totalReferralFee - totalAdSpend;
    const burn = netResult < 0 ? Math.abs(netResult) : 0;
    const burnLow  = burn * 0.75;
    const burnHigh = burn * 1.25;

    // Post-launch economics
    const stabilizedVolume = dailyTarget * (volumeRetentionPct / 100);
    const postReferralFee = sellingPrice * (referralFeePct / 100);
    const postAdSpendPerUnit = sellingPrice * (stabilizedAcos / 100);
    const postUnitProfit = sellingPrice - landedCost - fbaFees - postReferralFee - postAdSpendPerUnit;
    const dailyPostProfit = stabilizedVolume * postUnitProfit;
    const monthlyPostProfit = dailyPostProfit * 30;

    const paybackDays = dailyPostProfit > 0 ? Math.ceil(burn / dailyPostProfit) : Infinity;

    // Rank prediction
    const velocityRatio = competitorDailySales > 0 ? dailyTarget / competitorDailySales : 0;
    const rankPred = predictRank(velocityRatio, launchDuration);

    // Keyword feasibility (assuming 10% conversion rate from organic clicks)
    const dailyKwSearches = kwSearchVolume / 30;
    const maxOrganicDaily = dailyKwSearches * 0.10;
    const kwSufficient = dailyTarget <= maxOrganicDaily * 1.5; // some paid + organic
    const kwTight = dailyTarget <= maxOrganicDaily * 3;
    const kwFeasibility: 'sufficient' | 'tight' | 'insufficient' =
      kwSufficient ? 'sufficient' : kwTight ? 'tight' : 'insufficient';

    // Intensity
    let intensity: 'Aggressive' | 'Moderate' | 'Conservative';
    const priceDropPct = sellingPrice > 0 ? ((sellingPrice - launchPrice) / sellingPrice) * 100 : 0;
    const aggressiveSignals =
      (targetAcos >= 80 ? 1 : 0) +
      (priceDropPct >= 25 ? 1 : 0) +
      (targetVelocityPct >= 90 ? 1 : 0);
    if (aggressiveSignals >= 2) intensity = 'Aggressive';
    else if (targetAcos <= 40 && priceDropPct < 10 && targetVelocityPct < 70) intensity = 'Conservative';
    else intensity = 'Moderate';

    return {
      dailyTarget, totalUnits, dailyUnitsArr,
      launchUnitProfit, cpaLaunch,
      totalRevenue, totalLandedCost, totalFbaCost, totalReferralFee, totalAdSpend,
      burn, burnLow, burnHigh,
      stabilizedVolume, postUnitProfit, dailyPostProfit, monthlyPostProfit,
      paybackDays,
      velocityRatio, rankPred,
      maxOrganicDaily, kwFeasibility,
      intensity, priceDropPct,
    };
  }, [
    competitorDailySales, kwSearchVolume, targetVelocityPct,
    sellingPrice, launchPrice, landedCost, fbaFees, referralFeePct,
    targetAcos, launchDuration, rampPattern,
    stabilizedAcos, volumeRetentionPct,
  ]);

  const fmt = (n: number) => formatCurrency(n, currency);

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setCompetitorDailySales(30); setKwSearchVolume(5000); setTargetVelocityPct(80);
    setSellingPrice(25); setLaunchPrice(19); setLandedCost(8); setFbaFees(6);
    setReferralFeePct(15); setTargetAcos(80); setLaunchDuration(14);
    setRampPattern('frontload'); setStabilizedAcos(20); setVolumeRetentionPct(80);
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
              <Rocket className="w-8 h-8 text-orange-500" />
              The Launchpad
            </h1>
            <p className="text-slate-400 mt-2">
              Plan the burn budget and rank trajectory of a product launch.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <IntensityBadge intensity={m.intensity} />
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

            {/* Targets */}
            <Section icon={<Target className="w-4 h-4 text-orange-400" />} title="Ranking target">
              <NumberField label="Competitor daily sales" value={competitorDailySales} onChange={setCompetitorDailySales} hint="Velocity of Top-3 listing you want to beat" />
              <NumberField label="Main keyword volume / mo" value={kwSearchVolume} onChange={setKwSearchVolume} />
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target velocity</label>
                  <span className="text-orange-400 font-mono font-bold text-xs">
                    {targetVelocityPct}% · {Math.ceil(competitorDailySales * targetVelocityPct / 100)} /day
                  </span>
                </div>
                <input
                  type="range" min={30} max={130} step={5}
                  value={targetVelocityPct}
                  onChange={(e) => setTargetVelocityPct(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                  <span>Match below</span>
                  <span>Match</span>
                  <span>Outpace</span>
                </div>
              </div>
            </Section>

            {/* Strategy */}
            <Section icon={<Swords className="w-4 h-4 text-orange-400" />} title="Attack strategy">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Normal price" value={sellingPrice} onChange={setSellingPrice} />
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">Launch price</label>
                  <input
                    type="number" min={0}
                    value={launchPrice === 0 ? '' : launchPrice}
                    onChange={(e) => setLaunchPrice(safeNum(e.target.value))}
                    className="w-full bg-slate-950 border border-orange-500/40 rounded p-2 text-orange-300 font-bold focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Launch duration</label>
                  <span className="text-orange-400 font-mono font-bold text-xs">{launchDuration} days</span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {DURATION_PRESETS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setLaunchDuration(d)}
                      className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                        launchDuration === d
                          ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
                <input
                  type="range" min={3} max={30} step={1}
                  value={launchDuration}
                  onChange={(e) => setLaunchDuration(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max launch ACOS</label>
                  <span className="text-orange-400 font-mono font-bold text-xs">{targetAcos}%</span>
                </div>
                <input
                  type="range" min={20} max={200} step={5}
                  value={targetAcos}
                  onChange={(e) => setTargetAcos(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  100% = ads cost 100% of revenue (break-even on revenue, deep loss on cost).
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block tracking-wider">
                  Velocity ramp pattern
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {RAMP_PATTERNS.map((p) => {
                    const active = rampPattern === p.value;
                    return (
                      <button
                        key={p.value}
                        onClick={() => setRampPattern(p.value)}
                        title={p.hint}
                        className={`py-2 rounded border text-[10px] font-bold transition ${
                          active
                            ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  {RAMP_PATTERNS.find((p) => p.value === rampPattern)?.hint}
                </p>
              </div>
            </Section>

            {/* Costs */}
            <Section icon={<DollarSign className="w-4 h-4 text-orange-400" />} title="Per-unit costs">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Landed cost" value={landedCost} onChange={setLandedCost} />
                <NumberField label="FBA fees" value={fbaFees} onChange={setFbaFees} />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider flex items-center gap-1.5">
                  <Store className="w-3 h-3" /> Referral fee
                </label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {MARKETPLACE_PRESETS.map((p) => {
                    const active = Math.abs(referralFeePct - p.fee) < 0.1;
                    return (
                      <button
                        key={p.label}
                        onClick={() => setReferralFeePct(p.fee)}
                        title={p.hint}
                        className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                          active
                            ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                            : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={50} step={0.5}
                    value={referralFeePct === 0 ? '' : referralFeePct}
                    onChange={(e) => setReferralFeePct(safeNum(e.target.value))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  />
                  <span className="text-slate-500 font-mono text-sm">%</span>
                </div>
              </div>
            </Section>

            {/* Post-launch assumptions */}
            <Section icon={<Sprout className="w-4 h-4 text-orange-400" />} title="Post-launch assumptions">
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stabilized ACOS</label>
                  <span className="text-orange-400 font-mono font-bold text-xs">{stabilizedAcos}%</span>
                </div>
                <input
                  type="range" min={5} max={50} step={1}
                  value={stabilizedAcos}
                  onChange={(e) => setStabilizedAcos(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Blended ad spend % after launch settles.</p>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volume retention</label>
                  <span className="text-orange-400 font-mono font-bold text-xs">{volumeRetentionPct}%</span>
                </div>
                <input
                  type="range" min={30} max={120} step={5}
                  value={volumeRetentionPct}
                  onChange={(e) => setVolumeRetentionPct(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  % of launch velocity you keep after price returns to normal.
                </p>
              </div>
            </Section>
          </div>

          {/* ─── RIGHT: INTELLIGENCE ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Burn budget */}
            <BurnCard m={m} fmt={fmt} duration={launchDuration} />

            {/* Two-up: Rank prediction + Payback */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RankCard m={m} />
              <PaybackCard m={m} fmt={fmt} />
            </div>

            {/* Daily plan chart */}
            <DailyPlanChart m={m} fmt={fmt} />

            {/* Diagnostic */}
            <DiagnosticCard m={m} fmt={fmt} sellingPrice={sellingPrice} launchPrice={launchPrice} targetAcos={targetAcos} />
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
  label, value, onChange, hint,
}: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <input
        type="number" min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value, 0))}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
      />
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

function IntensityBadge({ intensity }: { intensity: 'Aggressive' | 'Moderate' | 'Conservative' }) {
  const c = {
    Aggressive:   { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400',    icon: <Flame className="w-3.5 h-3.5" /> },
    Moderate:     { bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-400',  icon: <Activity className="w-3.5 h-3.5" /> },
    Conservative: { bg: 'bg-slate-500/10',   border: 'border-slate-500/30',   text: 'text-slate-300',   icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  }[intensity];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${c.bg} ${c.border}`}>
      <span className={c.text}>{c.icon}</span>
      <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{intensity}</span>
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

function BurnCard({ m, fmt, duration }: { m: any; fmt: (n: number) => string; duration: number }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-7 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none">
        <Flame className="w-40 h-40 text-orange-500" />
      </div>
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between relative">
        <div className="min-w-0">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5 text-orange-400" /> Required launch budget
          </span>
          <div className="flex items-baseline gap-2 mt-2 flex-wrap">
            <span className="text-5xl md:text-6xl font-black text-white font-mono">{fmt(m.burn)}</span>
            <span className="text-sm text-slate-500">expected</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Range: <span className="font-mono text-emerald-400">{fmt(m.burnLow)}</span>
            <span className="text-slate-600 mx-1">to</span>
            <span className="font-mono text-rose-400">{fmt(m.burnHigh)}</span>
            <span className="text-slate-500"> · ±25% based on ACOS volatility</span>
          </div>
          <p className="text-xs text-slate-500 mt-3 max-w-md">
            Net cash outflow over the {duration}-day launch (revenue − COGS − FBA − referral fees − ad spend).
          </p>
        </div>

        <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 w-full md:w-72 space-y-2.5 shrink-0">
          <KvRow label="Total units" value={`${m.totalUnits.toLocaleString()}`} />
          <KvRow label="Daily target" value={`${m.dailyTarget}/day`} />
          <KvRow label="Total ad spend" value={fmt(m.totalAdSpend)} last />
        </div>
      </div>
    </div>
  );
}

function KvRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between items-center ${!last ? 'border-b border-white/10 pb-2' : ''}`}>
      <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">{label}</span>
      <span className="text-white font-mono font-bold">{value}</span>
    </div>
  );
}

function RankCard({ m }: { m: any }) {
  const toneConfig = {
    good:     { bg: 'bg-emerald-950/20', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: <Crown className="w-4 h-4" /> },
    orange:   { bg: 'bg-orange-950/20',  border: 'border-orange-500/30',  text: 'text-orange-400',  icon: <Trophy className="w-4 h-4" /> },
    warning:  { bg: 'bg-amber-950/20',   border: 'border-amber-500/30',   text: 'text-amber-400',   icon: <AlertTriangle className="w-4 h-4" /> },
    critical: { bg: 'bg-rose-950/20',    border: 'border-rose-500/30',    text: 'text-rose-400',    icon: <AlertTriangle className="w-4 h-4" /> },
  }[m.rankPred.tone as 'good' | 'orange' | 'warning' | 'critical'];

  const ratio = Math.min(100, Math.max(0, m.velocityRatio * 100));

  return (
    <div className={`rounded-xl border p-6 ${toneConfig.bg} ${toneConfig.border}`}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-orange-400" /> Predicted rank
      </h3>
      <div className={`text-3xl font-black ${toneConfig.text} flex items-center gap-2 mb-3`}>
        {toneConfig.icon}
        {m.rankPred.label}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[11px] font-mono">
          <span className="text-slate-400">Velocity vs competitor</span>
          <span className={toneConfig.text}>{ratio.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
          <div className={`h-full transition-all ${
            m.rankPred.tone === 'good' ? 'bg-emerald-500' :
            m.rankPred.tone === 'orange' ? 'bg-orange-500' :
            m.rankPred.tone === 'warning' ? 'bg-amber-500' :
            'bg-rose-500'
          }`} style={{ width: `${ratio}%` }} />
        </div>
      </div>
      <KeywordFeasibility feasibility={m.kwFeasibility} maxOrganic={m.maxOrganicDaily} dailyTarget={m.dailyTarget} />
    </div>
  );
}

function KeywordFeasibility({
  feasibility, maxOrganic, dailyTarget,
}: {
  feasibility: 'sufficient' | 'tight' | 'insufficient';
  maxOrganic: number;
  dailyTarget: number;
}) {
  const config = {
    sufficient:   { text: 'text-emerald-400', label: 'Keyword can sustain target' },
    tight:        { text: 'text-amber-400',   label: 'Keyword is tight — paid will dominate' },
    insufficient: { text: 'text-rose-400',    label: 'Keyword too small — diversify' },
  }[feasibility];

  return (
    <div className="mt-3 pt-3 border-t border-white/10 text-[11px]">
      <div className="flex items-center gap-1.5 mb-1">
        <Search className="w-3 h-3 text-slate-500" />
        <span className={`font-bold ${config.text}`}>{config.label}</span>
      </div>
      <p className="text-slate-500 leading-snug">
        Organic ceiling ≈ <span className="font-mono text-slate-300">{maxOrganic.toFixed(0)}/day</span> at 10% CVR. Your target: <span className="font-mono text-slate-300">{dailyTarget}/day</span>.
      </p>
    </div>
  );
}

function PaybackCard({ m, fmt }: { m: any; fmt: (n: number) => string }) {
  const paybackDisplay = Number.isFinite(m.paybackDays) ? `${m.paybackDays} days` : '∞';
  const paybackTone =
    !Number.isFinite(m.paybackDays) ? 'critical'
    : m.paybackDays <= 30 ? 'good'
    : m.paybackDays <= 90 ? 'orange'
    : 'warning';

  const toneText = {
    good: 'text-emerald-400',
    orange: 'text-orange-400',
    warning: 'text-amber-400',
    critical: 'text-rose-400',
  }[paybackTone];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none">
        <Timer className="w-28 h-28 text-emerald-500" />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2 relative">
        <Sprout className="w-3.5 h-3.5 text-orange-400" /> Post-launch payback
      </h3>

      <div className="relative">
        <div className={`text-4xl font-black font-mono mb-3 ${toneText}`}>
          {paybackDisplay}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-slate-800">
            <span className="text-slate-400">Daily profit (stabilized)</span>
            <span className="text-white font-mono font-bold">{fmt(m.dailyPostProfit)}</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-slate-400">Monthly profit</span>
            <span className="text-emerald-400 font-mono font-bold">{fmt(m.monthlyPostProfit)}</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 mt-3">
          Time to earn back the burn at your stabilized ACOS and retention assumptions.
        </p>
      </div>
    </div>
  );
}

function DailyPlanChart({ m, fmt }: { m: any; fmt: (n: number) => string }) {
  const days = m.dailyUnitsArr.length;
  if (days === 0) return null;
  const maxDaily = Math.max(...m.dailyUnitsArr, 1);

  // Cumulative for tooltip
  const cumulative: number[] = [];
  let running = 0;
  for (const u of m.dailyUnitsArr) {
    running += u;
    cumulative.push(running);
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-400" /> Daily launch plan
        </h3>
        <span className="text-[11px] text-slate-500">
          Total: <span className="font-mono text-orange-400 font-bold">{m.totalUnits.toLocaleString()}</span> units · Hover bars for detail
        </span>
      </div>

      <div className="flex items-end gap-1 h-32 border-b border-slate-700 pb-2">
        {m.dailyUnitsArr.map((u: number, i: number) => {
          const heightPct = (u / maxDaily) * 100;
          const dayAdSpend = u * m.cpaLaunch;
          return (
            <div key={i} className="flex-1 flex flex-col justify-end items-center group relative">
              <div
                className="w-full bg-orange-500/70 hover:bg-orange-400 rounded-t transition-colors"
                style={{ height: `${Math.max(2, heightPct)}%` }}
              />
              <span className="text-[9px] text-slate-600 mt-1.5">{i + 1}</span>

              {/* Tooltip */}
              <div className="absolute bottom-full mb-1 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                <div className="font-bold">Day {i + 1}</div>
                <div className="font-mono">{u} units</div>
                <div className="font-mono text-orange-400">{fmt(dayAdSpend)} ads</div>
                <div className="text-slate-400 font-mono">↳ {cumulative[i]} cumul.</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>Day 1</span>
        <span className="text-orange-400 font-bold">The "honeymoon" period</span>
        <span>Day {days}</span>
      </div>
    </div>
  );
}

function DiagnosticCard({
  m, fmt, sellingPrice, launchPrice, targetAcos,
}: {
  m: any; fmt: (n: number) => string;
  sellingPrice: number; launchPrice: number; targetAcos: number;
}) {
  const issues: { tone: 'warning' | 'critical' | 'info'; text: React.ReactNode }[] = [];

  if (m.launchUnitProfit < -launchPrice * 0.5) {
    issues.push({
      tone: 'critical',
      text: <>You're losing <b>{fmt(Math.abs(m.launchUnitProfit))}</b> per unit at this ACOS — more than 50% of revenue. Consider a softer launch (lower ACOS or higher launch price).</>,
    });
  }
  if (m.kwFeasibility === 'insufficient') {
    issues.push({
      tone: 'warning',
      text: <>This keyword's organic ceiling (~<b>{m.maxOrganicDaily.toFixed(0)}/day</b>) is well below your target (<b>{m.dailyTarget}/day</b>). Diversify across multiple keywords or expect paid traffic to do most of the work.</>,
    });
  }
  if (m.priceDropPct > 40) {
    issues.push({
      tone: 'warning',
      text: <>Discount is <b>{m.priceDropPct.toFixed(0)}%</b> — Amazon may use this lower price as your future "lowest price" reference. Plan how to reset expectations after launch.</>,
    });
  }
  if (m.paybackDays > 90 && Number.isFinite(m.paybackDays)) {
    issues.push({
      tone: 'warning',
      text: <>Payback is <b>{m.paybackDays} days</b> — long. Either reduce burn (lower ACOS / shorter duration) or ensure stabilized retention isn't optimistic.</>,
    });
  }
  if (!Number.isFinite(m.paybackDays)) {
    issues.push({
      tone: 'critical',
      text: <>Post-launch math shows <b>zero or negative daily profit</b>. Your stabilized ACOS plus normal price doesn't leave room. Adjust assumptions or pricing before launching.</>,
    });
  }

  if (issues.length === 0) {
    return (
      <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-emerald-300 mb-1">Plan looks healthy</div>
          <div className="text-xs text-emerald-200/90 leading-relaxed">
            Burn of <b>{fmt(m.burn)}</b> for projected <b>{m.rankPred.label}</b>, paid back in <b>{Number.isFinite(m.paybackDays) ? `${m.paybackDays} days` : '—'}</b>.
            {m.kwFeasibility === 'sufficient' && <> Keyword supports your target velocity organically.</>}
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