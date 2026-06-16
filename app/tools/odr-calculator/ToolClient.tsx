'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Clock,
  AlertTriangle,
  BookOpen,
  Activity,
  CheckCircle2,
  LifeBuoy,
  Ban,
  RotateCcw,
  LineChart,
  Zap,
  Info,
  TrendingDown,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES + CONSTANTS
───────────────────────────────────────────── */

type Status = 'safe' | 'caution' | 'atRisk' | 'unrecoverable';

type Inputs = {
  totalOrders: number;
  defects: number;
  dailyVelocity: number;
};

const DEFAULTS: Inputs = {
  totalOrders: 120,
  defects: 2,
  dailyVelocity: 5,
};

const STORAGE_KEY = 'account-health:state:v1';

// Amazon ODR policy thresholds
const ODR_LIMIT = 1.0;        // Amazon suspension threshold
const ODR_SAFE = 0.7;          // Comfortable margin
const ODR_TARGET = 0.9;        // Recovery target (below limit with buffer)
const GAUGE_MAX = 1.25;        // Gauge full scale (so 1% lands at 80% fill)
const UNRECOVERABLE_DAYS = 180; // Beyond ~6 months, file a POA

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const safeInt = (v: unknown): number => Math.round(safeNum(v));

/** Orders needed to dilute defects to a target ODR (assuming ZERO new defects). */
function ordersToTarget(defects: number, currentOrders: number, targetOdrPct: number): number {
  if (defects === 0) return 0;
  const targetRate = targetOdrPct / 100;
  const requiredTotal = defects / targetRate;
  return Math.max(0, Math.ceil(requiredTotal - currentOrders));
}

/* ─────────────────────────────────────────────
   MATH
───────────────────────────────────────────── */

type Metrics = {
  currentODR: number;
  gaugeFillPct: number;
  defectBuffer: number;
  ordersToSafe: number;        // To drop below 0.7%
  ordersBelowLimit: number;    // To drop below 0.9% target
  daysToSafe: number;
  daysBelowLimit: number;
  status: Status;
  defectRatePctPerDay: number; // Historical defect velocity
  underlyingDefectRate: number;  // Same as currentODR but framed as "rate" for context
};

function computeMetrics(i: Inputs): Metrics {
  const currentODR = i.totalOrders > 0 ? (i.defects / i.totalOrders) * 100 : 0;

  // Gauge fill: linear 0 to GAUGE_MAX (so 1% lands at 80%, matching marker)
  const gaugeFillPct = Math.min((currentODR / GAUGE_MAX) * 100, 100);

  // Defect buffer: how many more defects until you hit 1.0% exactly
  // (We use ceil(orders × 0.01) - defects so 1 defect on 100 orders shows 0 buffer)
  const maxDefectsAt1Pct = Math.floor(i.totalOrders * 0.01);
  const defectBuffer = Math.max(0, maxDefectsAt1Pct - i.defects);

  // Recovery: two targets
  const ordersToSafe = currentODR > ODR_SAFE ? ordersToTarget(i.defects, i.totalOrders, ODR_SAFE) : 0;
  const ordersBelowLimit = currentODR > ODR_LIMIT ? ordersToTarget(i.defects, i.totalOrders, ODR_TARGET) : 0;

  const daysToSafe = i.dailyVelocity > 0 ? Math.ceil(ordersToSafe / i.dailyVelocity) : 0;
  const daysBelowLimit = i.dailyVelocity > 0 ? Math.ceil(ordersBelowLimit / i.dailyVelocity) : 0;

  // Underlying defect rate context — assumes 60-day window
  const defectRatePctPerDay = i.totalOrders > 0 ? (i.defects / 60) : 0;

  // Status mapping
  let status: Status;
  if (currentODR < ODR_SAFE) {
    status = 'safe';
  } else if (currentODR < ODR_LIMIT) {
    status = 'caution';
  } else {
    // Above 1% — check if natural recovery is feasible
    if (i.dailyVelocity === 0 || daysBelowLimit > UNRECOVERABLE_DAYS) {
      status = 'unrecoverable';
    } else {
      status = 'atRisk';
    }
  }

  return {
    currentODR,
    gaugeFillPct,
    defectBuffer,
    ordersToSafe,
    ordersBelowLimit,
    daysToSafe,
    daysBelowLimit,
    status,
    defectRatePctPerDay,
    underlyingDefectRate: currentODR,
  };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function AccountHealthIntelligence() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  /* Hydrate */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.inputs) setInputs({ ...DEFAULTS, ...s.inputs });
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* Persist */
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs }));
    } catch { /* ignore */ }
  }, [hydrated, inputs]);

  const metrics = useMemo(() => computeMetrics(inputs), [inputs]);

  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((p) => ({ ...p, [key]: value }));

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULTS);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              {metrics.status === 'safe' ? (
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-8 h-8 text-rose-400" />
              )}
              Account Health Intelligence
            </h1>
            <p className="text-slate-400 mt-2">
              Order Defect Rate (ODR) simulator with suspension prevention and recovery projection.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusChip status={metrics.status} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">

          {/* ─── LEFT: CONFIG ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* 60-day data inputs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                <BookOpen className="w-4 h-4 text-sky-400" /> 60-day data
              </h3>
              <div className="space-y-4">
                <IntField
                  label="Total orders (60 days)"
                  value={inputs.totalOrders}
                  onChange={(v) => update('totalOrders', v)}
                />
                <IntField
                  label="Defects (neg + A-to-Z claims)"
                  value={inputs.defects}
                  onChange={(v) => update('defects', v)}
                  warningStyle
                />
                <div className="h-px bg-slate-800 my-2" />
                <IntField
                  label="Avg daily sales (current)"
                  value={inputs.dailyVelocity}
                  onChange={(v) => update('dailyVelocity', v)}
                  hint="Used to calculate recovery time."
                />
              </div>
            </div>

            {/* Defect fragility matrix (NEW) */}
            <FragilityMatrix inputs={inputs} currentStatus={metrics.status} />

            {/* Policy limit info */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
              <h4 className="text-amber-300 font-bold flex items-center gap-2 mb-2 text-sm">
                <AlertTriangle className="w-4 h-4" /> Policy limit
              </h4>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                Amazon suspends accounts with ODR above <b className="text-white font-mono">1%</b>. The window is rolling 60 days — defects drop off automatically after 60 days, but new defects accumulate continuously.
              </p>
            </div>

            {/* Underlying defect rate disclosure */}
            {inputs.totalOrders > 0 && inputs.defects > 0 && (
              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[10px] text-slate-500 leading-relaxed flex gap-2">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Your historical defect rate is <b className="text-slate-300 font-mono">{metrics.underlyingDefectRate.toFixed(2)}%</b> — roughly <b className="text-slate-300 font-mono">{metrics.defectRatePctPerDay.toFixed(2)}</b> defects/day. Dilution math below assumes you stop generating new defects starting today. If the root cause isn&apos;t fixed, the recovery never completes.
                </span>
              </div>
            )}
          </div>

          {/* ─── RIGHT: INTELLIGENCE ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* ODR Gauge Dashboard */}
            <OdrGauge metrics={metrics} />

            {/* Safety buffer + recovery plan grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SafetyBufferCard
                buffer={metrics.defectBuffer}
                status={metrics.status}
              />
              <RecoveryCard
                metrics={metrics}
                dailyVelocity={inputs.dailyVelocity}
              />
            </div>

            {/* Recovery projection chart (NEW) */}
            {metrics.currentODR > ODR_SAFE && inputs.defects > 0 && (
              <RecoveryProjectionChart
                inputs={inputs}
                metrics={metrics}
              />
            )}

            {/* Action guide */}
            {metrics.status !== 'safe' && (
              <ActionGuide
                status={metrics.status}
                ordersBelowLimit={metrics.ordersBelowLimit}
                ordersToSafe={metrics.ordersToSafe}
              />
            )}
          </div>
        </div>

        {/* ─── FOOTER ─── */}
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

function StatusChip({ status }: { status: Status }) {
  const config = {
    safe:          { label: 'SAFE',          tone: 'emerald', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    caution:       { label: 'CAUTION',       tone: 'amber',   icon: <Activity className="w-3.5 h-3.5" /> },
    atRisk:        { label: 'AT RISK',       tone: 'rose',    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    unrecoverable: { label: 'UNRECOVERABLE', tone: 'rose',    icon: <Ban className="w-3.5 h-3.5" /> },
  }[status];

  const toneClass = {
    emerald: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    amber:   'bg-amber-500/15 border-amber-500/40 text-amber-300',
    rose:    'bg-rose-500/15 border-rose-500/40 text-rose-300',
  }[config.tone];

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border font-bold uppercase tracking-wider text-xs ${toneClass}`}>
      {config.icon}
      <span>Status: {config.label}</span>
    </div>
  );
}

function IntField({
  label, value, onChange, hint, warningStyle,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  warningStyle?: boolean;
}) {
  const focusBorder = warningStyle ? 'focus:border-rose-500' : 'focus:border-orange-500';
  const focusRing = warningStyle ? 'focus:ring-rose-500/20' : 'focus:ring-orange-500/20';
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <input
        type="number"
        min={0}
        step={1}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeInt(e.target.value))}
        className={`w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm outline-none ${focusBorder} focus:ring-2 ${focusRing} transition`}
      />
      {hint && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{hint}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ODR Gauge
───────────────────────────────────────────── */

function OdrGauge({ metrics }: { metrics: Metrics }) {
  const tone = {
    safe:          { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', fill: 'bg-emerald-500' },
    caution:       { border: 'border-amber-500/30',   bg: 'bg-amber-950/20',   fill: 'bg-amber-500' },
    atRisk:        { border: 'border-rose-500/30',    bg: 'bg-rose-950/20',    fill: 'bg-rose-500' },
    unrecoverable: { border: 'border-rose-500/40',    bg: 'bg-rose-950/30',    fill: 'bg-rose-600' },
  }[metrics.status];

  // 1% threshold marker at exactly 80% (since 1.0 / 1.25 = 0.8)
  const limitMarkerPct = (ODR_LIMIT / GAUGE_MAX) * 100;
  const safeMarkerPct = (ODR_SAFE / GAUGE_MAX) * 100;

  return (
    <div className={`rounded-xl border p-8 shadow-2xl relative overflow-hidden ${tone.border} ${tone.bg}`}>
      <div className="flex flex-col md:flex-row gap-8 items-center justify-between relative z-10">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Current ODR</span>
          <div className="font-mono text-6xl font-extrabold text-white tabular-nums">
            {metrics.currentODR.toFixed(2)}%
          </div>
          <p className="text-sm text-slate-400">
            Target: <span className="text-white font-mono">&lt; {ODR_LIMIT.toFixed(2)}%</span>
          </p>
        </div>

        {/* Visual gauge */}
        <div className="flex-1 w-full md:max-w-sm">
          <div className="h-4 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
            <div
              className={`h-full transition-all duration-700 ${tone.fill}`}
              style={{ width: `${metrics.gaugeFillPct}%` }}
            />
            {/* Safe threshold (0.7%) marker */}
            <div
              className="absolute top-0 bottom-0 w-px bg-emerald-300/60 z-10"
              style={{ left: `${safeMarkerPct}%` }}
              title={`${ODR_SAFE}% safe threshold`}
            />
            {/* 1% limit marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
              style={{ left: `${limitMarkerPct}%` }}
              title={`${ODR_LIMIT}% suspension threshold`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-wider">
            <span>0%</span>
            <span className="text-emerald-300" style={{ marginLeft: `${safeMarkerPct - 8}%` }}>{ODR_SAFE}% safe</span>
            <span className="text-white">{ODR_LIMIT}% limit</span>
            <span>{GAUGE_MAX}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Safety Buffer Card
───────────────────────────────────────────── */

function SafetyBufferCard({
  buffer, status,
}: { buffer: number; status: Status }) {
  const isBreached = status === 'atRisk' || status === 'unrecoverable';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
      <div className="absolute right-0 top-0 opacity-[0.07] p-4 pointer-events-none">
        <LifeBuoy className="w-24 h-24 text-orange-500" />
      </div>
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-orange-400" /> Safety buffer
      </h3>

      {isBreached ? (
        <div className="relative z-10">
          <div className="text-rose-400 font-black text-2xl mb-2">BREACHED</div>
          <p className="text-xs text-rose-200/80 leading-relaxed">
            You&apos;re currently above the 1% suspension threshold. Stop the bleeding first — every new defect makes recovery harder.
          </p>
        </div>
      ) : (
        <div className="relative z-10">
          <div className="font-mono text-5xl font-black text-white mb-2 tabular-nums">{buffer}</div>
          <p className="text-xs text-slate-400 leading-relaxed">
            You can absorb <b className="text-white font-mono">{buffer}</b> {buffer === 1 ? 'more defect' : 'more defects'} before ODR hits the 1% threshold.
            {buffer === 0 && (
              <span className="block mt-2 text-amber-300 font-bold">⚠ One more defect tips you over.</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Recovery Card
───────────────────────────────────────────── */

function RecoveryCard({
  metrics, dailyVelocity,
}: { metrics: Metrics; dailyVelocity: number }) {
  // Determine which target to show based on status
  const showSafe = metrics.status === 'caution' && metrics.ordersToSafe > 0;
  const showLimit = (metrics.status === 'atRisk' || metrics.status === 'unrecoverable') && metrics.ordersBelowLimit > 0;

  if (!showSafe && !showLimit) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 flex flex-col justify-center items-center text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
        <h3 className="text-sm font-bold text-white">All systems green</h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">Your ODR is healthy. No dilution needed.</p>
      </div>
    );
  }

  const ordersNeeded = showSafe ? metrics.ordersToSafe : metrics.ordersBelowLimit;
  const daysNeeded = showSafe ? metrics.daysToSafe : metrics.daysBelowLimit;
  const targetPct = showSafe ? ODR_SAFE : ODR_TARGET;
  const targetLabel = showSafe ? 'back to safe zone' : `below ${ODR_TARGET}% target`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-orange-400" /> Recovery plan
      </h3>
      <div className="space-y-4">
        <div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono text-4xl font-bold text-white tabular-nums">{ordersNeeded.toLocaleString()}</span>
            <span className="text-sm text-slate-400">clean orders needed</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            To dilute ODR {targetLabel} (target <span className="font-mono text-slate-300">{targetPct.toFixed(1)}%</span>).
          </p>
        </div>
        <div className="pt-4 border-t border-slate-800">
          {dailyVelocity > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="font-mono text-base text-orange-400 font-bold">
                  {daysNeeded.toLocaleString()} days
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                At your current pace of <span className="font-mono text-slate-300">{dailyVelocity}</span> orders/day.
              </p>
            </>
          ) : (
            <p className="text-[10px] text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" />
              Set daily sales velocity to estimate timeline.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Defect Fragility Matrix (NEW)
───────────────────────────────────────────── */

function FragilityMatrix({
  inputs, currentStatus,
}: { inputs: Inputs; currentStatus: Status }) {
  const rows = [0, 1, 2, 3].map((extra) => {
    const newDefects = inputs.defects + extra;
    const newODR = inputs.totalOrders > 0 ? (newDefects / inputs.totalOrders) * 100 : 0;
    let status: Status;
    if (newODR < ODR_SAFE) status = 'safe';
    else if (newODR < ODR_LIMIT) status = 'caution';
    else status = 'atRisk';
    return { extra, newDefects, newODR, status };
  });

  // Find the first row that pushes into atRisk
  const firstBreachIdx = rows.findIndex((r) => r.status === 'atRisk');

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
      <h3 className="text-white font-bold flex items-center gap-2 mb-1 text-sm">
        <Zap className="w-4 h-4 text-orange-400" /> Fragility test
      </h3>
      <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
        How brittle is your current position? Each row shows the resulting ODR if you receive more defects.
      </p>
      <div className="space-y-1.5">
        {rows.map((row, i) => {
          const toneClass = {
            safe:          'bg-emerald-500/5 border-emerald-500/20',
            caution:       'bg-amber-500/10 border-amber-500/30',
            atRisk:        'bg-rose-500/10 border-rose-500/30',
            unrecoverable: 'bg-rose-500/10 border-rose-500/30',
          }[row.status];
          const textTone = {
            safe:          'text-emerald-300',
            caution:       'text-amber-300',
            atRisk:        'text-rose-300',
            unrecoverable: 'text-rose-300',
          }[row.status];
          const isBreachRow = i === firstBreachIdx;
          return (
            <div
              key={row.extra}
              className={`flex items-center justify-between gap-2 rounded border px-3 py-1.5 text-xs ${toneClass}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-slate-400 w-12 shrink-0">
                  {row.extra === 0 ? 'Now' : `+${row.extra}`}
                </span>
                <span className="font-mono text-white text-sm font-bold tabular-nums">
                  {row.newODR.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isBreachRow && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-rose-300 bg-rose-500/20 px-1.5 py-0.5 rounded">
                    Breach
                  </span>
                )}
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textTone}`}>
                  {row.status === 'atRisk' ? 'AT RISK' : row.status === 'caution' ? 'CAUTION' : 'SAFE'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {firstBreachIdx > 0 && currentStatus !== 'atRisk' && currentStatus !== 'unrecoverable' && (
        <p className="text-[10px] text-amber-200/80 mt-2.5 leading-relaxed">
          <b className="text-amber-300">{firstBreachIdx} {firstBreachIdx === 1 ? 'defect' : 'defects'}</b> {firstBreachIdx === 1 ? 'tips' : 'tip'} you into suspension territory. Stay vigilant.
        </p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Recovery Projection Chart (NEW)
───────────────────────────────────────────── */

function RecoveryProjectionChart({
  inputs, metrics,
}: { inputs: Inputs; metrics: Metrics }) {
  // Chart range: enough orders to comfortably show drop below 0.7%
  const targetOrders = Math.max(metrics.ordersToSafe, metrics.ordersBelowLimit, 50);
  const xMax = Math.ceil(targetOrders * 1.4 / 10) * 10; // round up to nearest 10
  const yMax = Math.max(metrics.currentODR * 1.15, 1.5);

  const W = 720, H = 240;
  const pad = { top: 20, right: 18, bottom: 36, left: 56 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const xToPx = (x: number) => pad.left + (x / xMax) * chartW;
  const yToPx = (y: number) => pad.top + chartH - (y / yMax) * chartH;

  // Build curve: at each step, ODR = defects / (totalOrders + step) × 100
  const steps = 40;
  const points = Array.from({ length: steps + 1 }, (_, i) => {
    const x = (i / steps) * xMax;
    const y = (inputs.defects / (inputs.totalOrders + x)) * 100;
    return { x, y };
  });
  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToPx(p.x)} ${yToPx(p.y)}`)
    .join(' ');

  // Find crossover at 0.9% target
  const crossoverX = inputs.defects / 0.009 - inputs.totalOrders;
  const crossoverVisible = crossoverX > 0 && crossoverX <= xMax;

  // Find crossover at 0.7% safe threshold
  const safeCrossX = inputs.defects / 0.007 - inputs.totalOrders;
  const safeCrossVisible = safeCrossX > 0 && safeCrossX <= xMax;

  // Y-axis ticks
  const yTicks = [0, 0.3, 0.6, 0.9, 1.2, 1.5].filter((t) => t <= yMax);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <LineChart className="w-4 h-4 text-orange-400" /> Recovery projection
        </h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-orange-500/60" />
            <span className="text-slate-400">ODR curve</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-px bg-rose-400" />
            <span className="text-slate-400">1% limit</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-px bg-emerald-400" />
            <span className="text-slate-400">0.7% safe</span>
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minHeight: 220 }}>
        {/* Danger zone (above 1%) — rose tint */}
        <rect
          x={pad.left} y={pad.top}
          width={chartW} height={Math.max(0, yToPx(ODR_LIMIT) - pad.top)}
          fill="#f43f5e" fillOpacity={0.04}
        />
        {/* Caution zone (0.7% – 1%) — amber tint */}
        <rect
          x={pad.left} y={yToPx(ODR_LIMIT)}
          width={chartW} height={Math.max(0, yToPx(ODR_SAFE) - yToPx(ODR_LIMIT))}
          fill="#f59e0b" fillOpacity={0.04}
        />
        {/* Safe zone (below 0.7%) — emerald tint */}
        <rect
          x={pad.left} y={yToPx(ODR_SAFE)}
          width={chartW} height={Math.max(0, pad.top + chartH - yToPx(ODR_SAFE))}
          fill="#10b981" fillOpacity={0.04}
        />

        {/* Y-axis grid */}
        {yTicks.map((tv) => (
          <g key={tv}>
            <line
              x1={pad.left} x2={W - pad.right}
              y1={yToPx(tv)} y2={yToPx(tv)}
              stroke="#1e293b" strokeWidth={1} strokeDasharray="3,4"
            />
            <text
              x={pad.left - 6} y={yToPx(tv) + 3}
              fontSize={10} fill="#475569" textAnchor="end"
              fontFamily="ui-monospace, monospace"
            >
              {tv.toFixed(1)}%
            </text>
          </g>
        ))}

        {/* 1% limit line (rose) */}
        <line
          x1={pad.left} x2={W - pad.right}
          y1={yToPx(ODR_LIMIT)} y2={yToPx(ODR_LIMIT)}
          stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.8}
        />
        <text
          x={W - pad.right - 4} y={yToPx(ODR_LIMIT) - 4}
          fontSize={9} fill="#f43f5e" textAnchor="end"
          fontWeight="bold" fontFamily="ui-monospace, monospace"
        >
          1% suspension
        </text>

        {/* 0.7% safe line (emerald) */}
        <line
          x1={pad.left} x2={W - pad.right}
          y1={yToPx(ODR_SAFE)} y2={yToPx(ODR_SAFE)}
          stroke="#10b981" strokeWidth={1.5} strokeDasharray="4,4" opacity={0.8}
        />
        <text
          x={W - pad.right - 4} y={yToPx(ODR_SAFE) - 4}
          fontSize={9} fill="#10b981" textAnchor="end"
          fontWeight="bold" fontFamily="ui-monospace, monospace"
        >
          0.7% safe zone
        </text>

        {/* Filled area under curve */}
        <path
          d={`${pathD} L ${xToPx(xMax)} ${yToPx(0)} L ${xToPx(0)} ${yToPx(0)} Z`}
          fill="#f97316" fillOpacity={0.12}
        />

        {/* ODR curve */}
        <path d={pathD} fill="none" stroke="#f97316" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Crossover marker at 0.9% target */}
        {crossoverVisible && (
          <g>
            <line
              x1={xToPx(crossoverX)} x2={xToPx(crossoverX)}
              y1={pad.top} y2={H - pad.bottom}
              stroke="#10b981" strokeWidth={1.5} strokeDasharray="3,3"
            />
            <circle
              cx={xToPx(crossoverX)} cy={yToPx(ODR_TARGET)}
              r={4} fill="#10b981" stroke="#0a0f1a" strokeWidth={1.5}
            />
            <text
              x={xToPx(crossoverX)} y={pad.top - 6}
              fontSize={10} fill="#10b981" textAnchor="middle"
              fontWeight="bold" fontFamily="ui-monospace, monospace"
            >
              {Math.ceil(crossoverX).toLocaleString()} orders
            </text>
          </g>
        )}

        {/* Current position marker */}
        <circle
          cx={xToPx(0)} cy={yToPx(metrics.currentODR)}
          r={5} fill="#f97316" stroke="#0a0f1a" strokeWidth={2}
        />

        {/* X-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const x = frac * xMax;
          return (
            <text
              key={frac}
              x={xToPx(x)} y={H - pad.bottom + 16}
              fontSize={10} fill="#64748b" textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              {Math.round(x).toLocaleString()}
            </text>
          );
        })}
        <text
          x={pad.left + chartW / 2} y={H - 4}
          fontSize={9} fill="#475569" textAnchor="middle"
          fontFamily="ui-monospace, monospace"
        >
          ADDITIONAL CLEAN ORDERS
        </text>
      </svg>

      <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
        Orange line = projected ODR as you add clean orders. {crossoverVisible ? (
          <>You drop below the <b className="text-emerald-300">{ODR_TARGET}% target</b> at <b className="font-mono text-white">{Math.ceil(crossoverX).toLocaleString()} additional orders</b>. {safeCrossVisible && <>Solidly safe zone (&lt; 0.7%) reached at <b className="font-mono text-white">{Math.ceil(safeCrossX).toLocaleString()}</b>.</>}</>
        ) : (
          <>You&apos;re already below the 0.9% target — focus on staying clean.</>
        )}
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Action Guide
───────────────────────────────────────────── */

function ActionGuide({
  status, ordersBelowLimit, ordersToSafe,
}: {
  status: Status;
  ordersBelowLimit: number;
  ordersToSafe: number;
}) {
  if (status === 'unrecoverable') {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6">
        <h3 className="text-xs font-bold uppercase text-rose-300 mb-3 tracking-widest flex items-center gap-2">
          <Ban className="w-4 h-4" /> Critical: file a Plan of Action
        </h3>
        <div className="space-y-2 text-sm text-rose-100/90 leading-relaxed">
          <p>
            Natural dilution is too slow — you&apos;d need <b className="font-mono text-white">{ordersBelowLimit.toLocaleString()}</b> clean orders, which exceeds the realistic Amazon review window.
          </p>
          <p className="pl-4 border-l-2 border-rose-500/40">
            <b className="text-rose-200">→ Prepare a Plan of Action (POA):</b> identify the root cause of defects (listing accuracy, packaging, shipping carrier, product quality), document the corrective action, and the safeguards to prevent recurrence. Submit via Account Health Dashboard.
          </p>
          <p className="pl-4 border-l-2 border-rose-500/40">
            <b className="text-rose-200">→ Don&apos;t wait for suspension</b> — proactive POAs are reviewed more favorably than reactive ones.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'atRisk') {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-6">
        <h3 className="text-xs font-bold uppercase text-rose-300 mb-3 tracking-widest flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> At risk: dilute and fix root cause
        </h3>
        <div className="space-y-2 text-sm text-rose-100/90 leading-relaxed">
          <p>
            <b className="text-rose-200">→ Run a Lightning Deal or coupon immediately.</b> Goal: order volume, not profit. Get {ordersBelowLimit.toLocaleString()} clean orders ASAP.
          </p>
          <p>
            <b className="text-rose-200">→ Audit your defect sources.</b> Check the last 60 days&apos; negative feedback and A-to-Z claims. Are they about delivery? Product quality? Listing mismatches? Fix the source.
          </p>
          <p>
            <b className="text-rose-200">→ Prepare a POA</b> in case the dilution plan takes too long.
          </p>
        </div>
      </div>
    );
  }

  // status === 'caution'
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
      <h3 className="text-xs font-bold uppercase text-amber-300 mb-3 tracking-widest flex items-center gap-2">
        <Activity className="w-4 h-4" /> Caution: preventive action
      </h3>
      <div className="space-y-2 text-sm text-amber-100/90 leading-relaxed">
        <p>
          You&apos;re close to the 1% threshold but not over it yet. <b className="text-amber-200 font-mono">{ordersToSafe.toLocaleString()} clean orders</b> will return you to the safe zone (&lt; 0.7%).
        </p>
        <p>
          <b className="text-amber-200">→ Watch every order carefully.</b> Each new defect tightens the noose. Reach out to customers who left negative feedback — many will revise if you address their concern personally.
        </p>
        <p>
          <b className="text-amber-200">→ Don&apos;t take new risk.</b> Hold off on new SKU launches or aggressive scaling until you&apos;re back in safe territory.
        </p>
      </div>
    </div>
  );
}