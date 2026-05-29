'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  Package,
  Truck,
  BookOpen,
  Anchor,
  DollarSign,
  PieChart,
  AlertOctagon,
  ArrowRight,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CURRENCIES
───────────────────────────────────────────── */
type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';
const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const STORAGE_KEY = 'smart-restock:state:v1';

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
      currency: currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${c.symbol}${Math.round(n).toLocaleString()}`;
  }
};

const formatDate = (d: Date): string =>
  d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

const addDays = (base: Date, days: number): Date => {
  const d = new Date(base);
  d.setDate(d.getDate() + Math.floor(days));
  return d;
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function SmartRestockIntelligence() {
  /* ── Inputs ── */
  const [currentStock, setCurrentStock] = useState(500);
  const [inboundStock, setInboundStock] = useState(0);
  const [dailySales, setDailySales]     = useState(20);
  const [seasonality, setSeasonality]   = useState(0);

  const [leadTime, setLeadTime]           = useState(15);
  const [safetyDays, setSafetyDays]       = useState(7);
  const [orderInterval, setOrderInterval] = useState(30);
  const [simulateDelay, setSimulateDelay] = useState(false);
  const [moq, setMoq]                     = useState(0);

  const [unitCost, setUnitCost]         = useState(400);
  const [sellingPrice, setSellingPrice] = useState(1200);
  const [currency, setCurrency]         = useState<CurrencyCode>('INR');

  const [hydrated, setHydrated] = useState(false);

  /* ── Hydrate from localStorage ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.currentStock  === 'number') setCurrentStock(s.currentStock);
        if (typeof s.inboundStock  === 'number') setInboundStock(s.inboundStock);
        if (typeof s.dailySales    === 'number') setDailySales(s.dailySales);
        if (typeof s.seasonality   === 'number') setSeasonality(s.seasonality);
        if (typeof s.leadTime      === 'number') setLeadTime(s.leadTime);
        if (typeof s.safetyDays    === 'number') setSafetyDays(s.safetyDays);
        if (typeof s.orderInterval === 'number') setOrderInterval(s.orderInterval);
        if (typeof s.simulateDelay === 'boolean') setSimulateDelay(s.simulateDelay);
        if (typeof s.moq           === 'number') setMoq(s.moq);
        if (typeof s.unitCost      === 'number') setUnitCost(s.unitCost);
        if (typeof s.sellingPrice  === 'number') setSellingPrice(s.sellingPrice);
        if (typeof s.currency      === 'string') setCurrency(s.currency as CurrencyCode);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist to localStorage ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentStock, inboundStock, dailySales, seasonality,
        leadTime, safetyDays, orderInterval, simulateDelay, moq,
        unitCost, sellingPrice, currency,
      }));
    } catch { /* ignore */ }
  }, [hydrated, currentStock, inboundStock, dailySales, seasonality,
      leadTime, safetyDays, orderInterval, simulateDelay, moq,
      unitCost, sellingPrice, currency]);

  /* ── Compute everything ── */
  const m = useMemo(() => {
    const velocity = Math.max(0, dailySales * (1 + seasonality / 100));
    const totalStock = currentStock + inboundStock;

    const daysLeft = velocity > 0 ? totalStock / velocity : Infinity;
    const effectiveLeadTime = simulateDelay ? leadTime + 7 : leadTime;

    const safetyUnits = Math.ceil(velocity * safetyDays);
    const leadTimeDemand = Math.ceil(velocity * effectiveLeadTime);
    const rop = leadTimeDemand + safetyUnits;

    // Target stock after restock = ROP + order-interval cover
    const targetStockLevel = rop + Math.ceil(velocity * orderInterval);
    let orderQty = Math.max(0, targetStockLevel - totalStock);
    let moqApplied = false;
    if (moq > 0 && orderQty > 0 && orderQty < moq) {
      orderQty = moq;
      moqApplied = true;
    }
    orderQty = Math.ceil(orderQty);

    // Status
    let status: 'critical' | 'warning' | 'healthy' = 'healthy';
    if (totalStock <= safetyUnits) status = 'critical';
    else if (totalStock <= rop) status = 'warning';

    // Dates
    const today = new Date();
    const stockoutDate = Number.isFinite(daysLeft) ? addDays(today, daysLeft) : null;
    // Latest possible order date: leave enough time for lead time + a safety buffer
    const daysUntilOrderDeadline = Number.isFinite(daysLeft)
      ? Math.max(0, daysLeft - effectiveLeadTime - safetyDays)
      : Infinity;
    const orderByDate = Number.isFinite(daysUntilOrderDeadline)
      ? addDays(today, daysUntilOrderDeadline as number)
      : null;
    const isOverdue = Number.isFinite(daysUntilOrderDeadline) && daysUntilOrderDeadline === 0;

    // Capital
    const capitalRequired = orderQty * unitCost;
    const capitalInStock  = currentStock * unitCost;

    // Profit
    const marginPerUnit = sellingPrice - unitCost;
    const marginPct = sellingPrice > 0 ? (marginPerUnit / sellingPrice) * 100 : 0;
    const projectedProfit = orderQty * marginPerUnit;
    const roiPct = capitalRequired > 0 ? (projectedProfit / capitalRequired) * 100 : 0;

    // Revenue loss if stockout is unavoidable before restock arrives
    let revenueLoss = 0;
    let gapDays = 0;
    if (Number.isFinite(daysLeft) && daysLeft < effectiveLeadTime) {
      gapDays = effectiveLeadTime - daysLeft;
      revenueLoss = gapDays * velocity * sellingPrice;
    }

    return {
      velocity, totalStock, daysLeft, effectiveLeadTime,
      safetyUnits, rop, orderQty, moqApplied,
      status, stockoutDate, orderByDate, isOverdue, daysUntilOrderDeadline,
      capitalRequired, capitalInStock,
      marginPerUnit, marginPct, projectedProfit, roiPct,
      revenueLoss, gapDays,
    };
  }, [currentStock, inboundStock, dailySales, seasonality,
      leadTime, safetyDays, orderInterval, simulateDelay, moq,
      unitCost, sellingPrice]);

  const fmt = (n: number) => formatCurrency(n, currency);

  /* ── Reset ── */
  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults? This cannot be undone.')) return;
    setCurrentStock(500); setInboundStock(0); setDailySales(20); setSeasonality(0);
    setLeadTime(15); setSafetyDays(7); setOrderInterval(30); setSimulateDelay(false); setMoq(0);
    setUnitCost(400); setSellingPrice(1200);
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
              <Package className="w-8 h-8 text-orange-500" />
              Smart Restock Intelligence
            </h1>
            <p className="text-slate-400 mt-2">
              Prevent stockouts with safety stock, lead-time and seasonality risk analysis.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <HealthBadge status={m.status} />
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

          {/* ─── LEFT: CONTROL PANEL ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* 1. Sales velocity */}
            <Section icon={<TrendingUp className="w-4 h-4 text-orange-400" />} title="Sales velocity">
              <NumberField label="Avg daily sales (units)" value={dailySales} onChange={setDailySales} />
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">
                  Seasonality growth
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={-50} max={200} step={5}
                    value={seasonality}
                    onChange={(e) => setSeasonality(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <span className={`font-mono w-14 text-right ${seasonality > 0 ? 'text-orange-400' : seasonality < 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {seasonality > 0 ? '+' : ''}{seasonality}%
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Effective velocity: <span className="font-mono text-slate-300">{m.velocity.toFixed(1)}/day</span>
                </p>
              </div>
            </Section>

            {/* 2. Stock position */}
            <Section icon={<Package className="w-4 h-4 text-orange-400" />} title="Current position">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="On hand"  value={currentStock} onChange={setCurrentStock} />
                <NumberField label="Inbound"  value={inboundStock} onChange={setInboundStock} />
              </div>
              <NumberField
                label="Supplier MOQ"
                value={moq}
                onChange={setMoq}
                placeholder="0 = no minimum"
                hint="Minimum order qty enforced by your supplier"
              />
            </Section>

            {/* 3. Supply chain */}
            <Section icon={<Truck className="w-4 h-4 text-orange-400" />} title="Supply chain">
              <NumberField label="Lead time (days)" value={leadTime} onChange={setLeadTime} />
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Safety days"  value={safetyDays}    onChange={setSafetyDays} />
                <NumberField label="Order cycle"  value={orderInterval} onChange={setOrderInterval} />
              </div>

              {/* Simulation toggle */}
              <button
                onClick={() => setSimulateDelay(!simulateDelay)}
                className={`w-full mt-1 p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition text-left ${
                  simulateDelay
                    ? 'bg-rose-900/20 border-rose-500/40'
                    : 'bg-slate-950 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  simulateDelay ? 'bg-rose-500 border-rose-500' : 'border-slate-600'
                }`}>
                  {simulateDelay && <CheckCircle2 className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-bold block ${simulateDelay ? 'text-rose-300' : 'text-slate-300'}`}>
                    Simulate +7 day delay
                  </span>
                  <span className="text-[10px] text-slate-500">What if your supplier is late?</span>
                </div>
              </button>
            </Section>

            {/* 4. Financials */}
            <Section icon={<DollarSign className="w-4 h-4 text-orange-400" />} title="Financials">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Unit cost"     value={unitCost}     onChange={setUnitCost} />
                <NumberField label="Selling price" value={sellingPrice} onChange={setSellingPrice} />
              </div>
              {m.marginPerUnit > 0 && (
                <div className="text-[11px] text-slate-500 -mt-1">
                  Margin: <span className="text-emerald-400 font-mono">{fmt(m.marginPerUnit)}</span>
                  {' · '}
                  <span className="text-emerald-400 font-mono">{m.marginPct.toFixed(0)}%</span>
                </div>
              )}
              {m.marginPerUnit <= 0 && sellingPrice > 0 && (
                <div className="text-[11px] text-rose-400 -mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Selling price is below cost
                </div>
              )}
            </Section>
          </div>

          {/* ─── RIGHT: INTELLIGENCE PANEL ─── */}
          <div className="lg:col-span-8 space-y-6">

            {/* Main action */}
            <ActionCard m={m} currency={currency} fmt={fmt} simulateDelay={simulateDelay} leadTime={leadTime} />

            {/* Stock chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2 tracking-widest">
                  <CalendarDays className="w-4 h-4 text-orange-400" /> Stock projection
                </h3>
                <ChartLegend />
              </div>
              <StockChart
                totalStock={m.totalStock}
                velocity={m.velocity}
                rop={m.rop}
                safetyStock={m.safetyUnits}
                effectiveLeadTime={m.effectiveLeadTime}
                orderQty={m.orderQty}
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1">
                <span>Today</span>
                <span className="text-orange-400 font-mono">
                  Lead: {m.effectiveLeadTime}d{simulateDelay && ' (incl. +7 delay)'}
                </span>
                <span>{Math.max(60, m.effectiveLeadTime + 30)}d horizon</span>
              </div>
            </div>

            {/* Two-up: Risk + Capital */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Risk panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2 tracking-widest">
                  <AlertOctagon className="w-4 h-4 text-orange-400" /> Risk profile
                </h3>

                <Stat
                  label="Days of inventory"
                  value={Number.isFinite(m.daysLeft) ? `${Math.floor(m.daysLeft)} days` : '∞'}
                  tone={m.daysLeft < m.effectiveLeadTime ? 'critical' : m.daysLeft < m.rop / Math.max(m.velocity, 1) ? 'warning' : 'neutral'}
                />
                <Stat
                  label="Stockout date"
                  value={m.stockoutDate ? formatDate(m.stockoutDate) : '—'}
                  tone="neutral"
                />
                <Stat
                  label="Order by"
                  value={m.orderByDate ? formatDate(m.orderByDate) : '—'}
                  tone={m.isOverdue ? 'critical' : 'orange'}
                  badge={m.isOverdue ? 'OVERDUE' : undefined}
                />

                {m.revenueLoss > 0 && (
                  <div className="mt-3 p-3 bg-rose-900/20 border border-rose-500/30 rounded-lg flex items-start gap-2.5">
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-rose-200/90 leading-snug">
                      <span className="font-bold text-rose-300 block mb-0.5">Stockout inevitable</span>
                      You have <b>{Math.floor(m.daysLeft)} days</b> of stock, but lead time is <b>{m.effectiveLeadTime} days</b>.
                      <div className="mt-1 text-white">
                        Est. revenue lost: <span className="font-mono font-bold text-rose-300">{fmt(m.revenueLoss)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Capital efficiency */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase text-slate-500 mb-4 flex items-center gap-2 tracking-widest">
                  <PieChart className="w-4 h-4 text-orange-400" /> Capital efficiency
                </h3>

                <Stat label="Capital in stock"     value={fmt(m.capitalInStock)} tone="neutral" />
                <Stat label="Capital for next order" value={fmt(m.capitalRequired)} tone={m.orderQty > 0 ? 'orange' : 'neutral'} />
                <Stat label="Margin per unit"      value={`${fmt(m.marginPerUnit)} · ${m.marginPct.toFixed(0)}%`} tone={m.marginPerUnit > 0 ? 'good' : 'critical'} />

                {m.orderQty > 0 && m.marginPerUnit > 0 && (
                  <div className="mt-3 p-3 bg-emerald-900/15 border border-emerald-500/25 rounded-lg">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-300/80 mb-1 font-bold">
                      Projected on next order
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-300 font-mono">{fmt(m.projectedProfit)}</span>
                      <span className="text-xs text-emerald-400/70">profit</span>
                      <span className="ml-auto text-xs text-emerald-300 font-mono">
                        ROI {m.roiPct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostics */}
            <Diagnostics m={m} fmt={fmt} simulateDelay={simulateDelay} leadTime={leadTime} />
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            Inventory Strategy Guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<Anchor className="w-5 h-5 text-orange-400" />}
              title="Safety stock is insurance"
              body={
                <>
                  Never aim for zero — that's a stockout waiting for one bad week.
                  Safety stock buys you slack against supplier slips and demand spikes.
                  <span className="block mt-2"><b>Rule of thumb:</b> 7–14 days for local suppliers, 21–30 days for imports.</span>
                </>
              }
            />
            <GuideCard
              icon={<TrendingUp className="w-5 h-5 text-orange-400" />}
              title="Plan against next month, not last"
              body={
                <>
                  Reordering against last month's sales is how you run dry in December.
                  Use the seasonality slider to model the spike before it happens —
                  +30% to +50% is realistic for Q4 in most categories.
                </>
              }
            />
            <GuideCard
              icon={<Truck className="w-5 h-5 text-orange-400" />}
              title="ROP is a deadline, not a suggestion"
              body={
                <>
                  When stock hits the reorder point, you place the order <i>that day</i>.
                  Two days late = two days eaten from your safety buffer.
                  Set a calendar reminder around the "Order by" date.
                </>
              }
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
   SECTION CONTAINER
───────────────────────────────────────────── */
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
        {icon} {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NUMBER FIELD (NaN-safe)
───────────────────────────────────────────── */
function NumberField({
  label, value, onChange, placeholder, hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <input
        type="number"
        min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value, 0))}
        placeholder={placeholder ?? '0'}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
      />
      {hint && <p className="text-[10px] text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEALTH BADGE
───────────────────────────────────────────── */
function HealthBadge({ status }: { status: 'critical' | 'warning' | 'healthy' }) {
  const config = {
    healthy:  { dot: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Healthy' },
    warning:  { dot: 'bg-amber-500',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   label: 'Warning' },
    critical: { dot: 'bg-rose-500 animate-pulse', text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'Critical' },
  }[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bg} ${config.border}`}>
      <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
      <span className={`text-xs font-bold uppercase tracking-wider ${config.text}`}>{config.label}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CURRENCY PICKER
───────────────────────────────────────────── */
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
   ACTION CARD (top of right column)
───────────────────────────────────────────── */
function ActionCard({
  m, currency, fmt, simulateDelay, leadTime,
}: {
  m: ReturnType<any>;
  currency: CurrencyCode;
  fmt: (n: number) => string;
  simulateDelay: boolean;
  leadTime: number;
}) {
  const tone =
    m.status === 'critical' ? { bg: 'bg-rose-950/40',    border: 'border-rose-500/30',    accent: 'text-rose-400' }
    : m.status === 'warning' ? { bg: 'bg-amber-950/30',   border: 'border-amber-500/30',   accent: 'text-amber-400' }
    : { bg: 'bg-emerald-950/30', border: 'border-emerald-500/30', accent: 'text-emerald-400' };

  return (
    <div className={`rounded-xl border p-7 ${tone.bg} ${tone.border} shadow-2xl flex flex-col md:flex-row gap-6 items-stretch md:items-center justify-between`}>
      <div className="space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className={`w-5 h-5 ${tone.accent}`} />
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Recommended order</span>
          {m.moqApplied && (
            <span className="text-[9px] uppercase tracking-widest font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">
              MOQ
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-5xl md:text-6xl font-extrabold text-white tracking-tight">
            {m.orderQty.toLocaleString()}
          </span>
          <span className="text-xl font-medium text-slate-400">units</span>
        </div>
        {m.orderQty > 0 ? (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-white/10 text-sm text-slate-300">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              Capital: <span className="text-emerald-400 font-mono font-bold">{fmt(m.capitalRequired)}</span>
            </span>
            {m.orderByDate && (
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                m.isOverdue
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  : 'bg-slate-950/60 border-white/10 text-slate-300'
              }`}>
                <CalendarDays className="w-3.5 h-3.5 text-orange-400" />
                Order by <span className="font-bold">{m.isOverdue ? 'TODAY' : formatDate(m.orderByDate)}</span>
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 mt-1">No action required — you're above the reorder point.</p>
        )}
      </div>

      <div className="bg-slate-950/60 p-5 rounded-xl border border-white/10 w-full md:w-72 space-y-2.5 shrink-0">
        <KvRow label="Reorder point"  value={`${m.rop.toLocaleString()} units`} />
        <KvRow label="Safety stock"   value={`${m.safetyUnits.toLocaleString()} units`} />
        <KvRow label="Burn rate"      value={`${m.velocity.toFixed(1)} / day`} last />
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

/* ─────────────────────────────────────────────
   STAT ROW (used in side panels)
───────────────────────────────────────────── */
function Stat({
  label, value, tone = 'neutral', badge,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'orange' | 'good' | 'warning' | 'critical';
  badge?: string;
}) {
  const toneClass = {
    neutral:  'text-slate-200',
    orange:   'text-orange-300',
    good:     'text-emerald-300',
    warning:  'text-amber-300',
    critical: 'text-rose-300',
  }[tone];
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[9px] uppercase font-bold tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
        <span className={`font-mono font-bold ${toneClass}`}>{value}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STOCK CHART (the key visual)
───────────────────────────────────────────── */
function StockChart({
  totalStock, velocity, rop, safetyStock, effectiveLeadTime, orderQty,
}: {
  totalStock: number;
  velocity: number;
  rop: number;
  safetyStock: number;
  effectiveLeadTime: number;
  orderQty: number;
}) {
  // Horizon: enough to show depletion + restock + some buffer
  const daysToZero = velocity > 0 ? totalStock / velocity : 60;
  const daysAfterRestockToZero = velocity > 0 ? (Math.max(0, totalStock - velocity * effectiveLeadTime) + orderQty) / velocity : 60;
  const horizon = Math.max(
    60,
    Math.ceil(Math.max(daysToZero, effectiveLeadTime + daysAfterRestockToZero)),
  );
  const horizonCapped = Math.min(horizon, 180);

  // Geometry
  const W = 720, H = 240;
  const pad = { top: 14, right: 18, bottom: 28, left: 60 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  // Y scale
  const peakAfterRestock = Math.max(0, totalStock - velocity * effectiveLeadTime) + orderQty;
  const yMax = Math.max(totalStock, rop, peakAfterRestock, safetyStock) * 1.1 || 100;
  const xToPx = (d: number) => pad.left + (d / horizonCapped) * chartW;
  const yToPx = (v: number) => pad.top + (1 - v / yMax) * chartH;

  // Depletion path: from (0, totalStock) -> (daysToZero, 0)
  const dEnd = Math.min(daysToZero, horizonCapped);
  const yAtEnd = velocity > 0 ? Math.max(0, totalStock - velocity * dEnd) : totalStock;

  // Restock path: from (leadTime, peakAfterRestock) -> down at velocity until zero or horizon
  const restockStartY = peakAfterRestock;
  const restockEnd = effectiveLeadTime + (velocity > 0 ? restockStartY / velocity : 0);
  const restockEndClamped = Math.min(restockEnd, horizonCapped);
  const restockYAtEnd = velocity > 0 ? Math.max(0, restockStartY - velocity * (restockEndClamped - effectiveLeadTime)) : restockStartY;

  // Gap zone (when depletion hits 0 before restock arrives)
  const gapExists = daysToZero < effectiveLeadTime;

  // Y-axis ticks
  const tickValues = [0, Math.round(yMax * 0.25), Math.round(yMax * 0.5), Math.round(yMax * 0.75), Math.round(yMax)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ minHeight: 220 }}>
      {/* Background grid */}
      {tickValues.map((tv) => (
        <g key={tv}>
          <line
            x1={pad.left} x2={W - pad.right}
            y1={yToPx(tv)} y2={yToPx(tv)}
            stroke="#1e293b" strokeWidth={1} strokeDasharray={tv === 0 ? '0' : '3,4'}
          />
          <text x={pad.left - 8} y={yToPx(tv) + 3} fontSize={10} fill="#475569" textAnchor="end" fontFamily="ui-monospace, monospace">
            {tv}
          </text>
        </g>
      ))}

      {/* Risk zone shading */}
      {gapExists && (
        <rect
          x={xToPx(daysToZero)}
          y={pad.top}
          width={xToPx(effectiveLeadTime) - xToPx(daysToZero)}
          height={chartH}
          fill="rgba(244, 63, 94, 0.08)"
          stroke="rgba(244, 63, 94, 0.25)"
          strokeDasharray="3,3"
        />
      )}

      {/* Safety stock line */}
      {safetyStock > 0 && safetyStock < yMax && (
        <>
          <line
            x1={pad.left} x2={W - pad.right}
            y1={yToPx(safetyStock)} y2={yToPx(safetyStock)}
            stroke="#f43f5e" strokeWidth={1} strokeDasharray="4,4" opacity={0.6}
          />
          <text x={W - pad.right - 4} y={yToPx(safetyStock) - 4} fontSize={9} fill="#fb7185" textAnchor="end" fontFamily="ui-monospace, monospace">
            Safety {safetyStock}
          </text>
        </>
      )}

      {/* ROP line */}
      {rop > 0 && rop < yMax && (
        <>
          <line
            x1={pad.left} x2={W - pad.right}
            y1={yToPx(rop)} y2={yToPx(rop)}
            stroke="#fbbf24" strokeWidth={1} strokeDasharray="4,4" opacity={0.7}
          />
          <text x={W - pad.right - 4} y={yToPx(rop) - 4} fontSize={9} fill="#fbbf24" textAnchor="end" fontFamily="ui-monospace, monospace">
            ROP {rop}
          </text>
        </>
      )}

      {/* Lead-time vertical marker */}
      <line
        x1={xToPx(effectiveLeadTime)} x2={xToPx(effectiveLeadTime)}
        y1={pad.top} y2={H - pad.bottom}
        stroke="#f97316" strokeWidth={1} strokeDasharray="2,3" opacity={0.7}
      />
      <text x={xToPx(effectiveLeadTime)} y={pad.top - 2} fontSize={9} fill="#f97316" textAnchor="middle" fontFamily="ui-monospace, monospace">
        Lead
      </text>

      {/* Depletion line */}
      <line
        x1={xToPx(0)} y1={yToPx(totalStock)}
        x2={xToPx(dEnd)} y2={yToPx(yAtEnd)}
        stroke="#f97316" strokeWidth={2.5}
      />
      {/* Continue at zero past depletion if it ended before horizon */}
      {yAtEnd === 0 && dEnd < horizonCapped && (
        <line
          x1={xToPx(dEnd)} y1={yToPx(0)}
          x2={xToPx(horizonCapped)} y2={yToPx(0)}
          stroke="#f97316" strokeWidth={2.5} strokeDasharray="2,2" opacity={0.4}
        />
      )}

      {/* Stockout dot */}
      {yAtEnd === 0 && dEnd <= horizonCapped && (
        <>
          <circle cx={xToPx(dEnd)} cy={yToPx(0)} r={4} fill="#f43f5e" />
          <text x={xToPx(dEnd)} y={H - pad.bottom + 16} fontSize={9} fill="#fb7185" textAnchor="middle" fontFamily="ui-monospace, monospace">
            Stockout
          </text>
        </>
      )}

      {/* Restock line (if ordering) */}
      {orderQty > 0 && (
        <>
          {/* vertical jump at lead time */}
          <line
            x1={xToPx(effectiveLeadTime)} y1={yToPx(Math.max(0, totalStock - velocity * effectiveLeadTime))}
            x2={xToPx(effectiveLeadTime)} y2={yToPx(restockStartY)}
            stroke="#10b981" strokeWidth={2} strokeDasharray="4,3" opacity={0.7}
          />
          {/* depletion from restock peak */}
          <line
            x1={xToPx(effectiveLeadTime)} y1={yToPx(restockStartY)}
            x2={xToPx(restockEndClamped)} y2={yToPx(restockYAtEnd)}
            stroke="#10b981" strokeWidth={2.5} strokeDasharray="5,3"
          />
          {/* arrow head */}
          <circle cx={xToPx(effectiveLeadTime)} cy={yToPx(restockStartY)} r={3.5} fill="#10b981" />
        </>
      )}

      {/* Today dot */}
      <circle cx={xToPx(0)} cy={yToPx(totalStock)} r={4} fill="#f97316" stroke="#0a0f1a" strokeWidth={2} />
    </svg>
  );
}

function ChartLegend() {
  const items = [
    { color: '#f97316', label: 'Current path' },
    { color: '#10b981', label: 'After restock', dashed: true },
    { color: '#fbbf24', label: 'ROP', dashed: true },
    { color: '#f43f5e', label: 'Safety', dashed: true },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 font-mono">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-0.5"
            style={{
              backgroundImage: it.dashed
                ? `repeating-linear-gradient(90deg, ${it.color} 0 4px, transparent 4px 7px)`
                : undefined,
              backgroundColor: it.dashed ? 'transparent' : it.color,
            }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DIAGNOSTICS
───────────────────────────────────────────── */
function Diagnostics({
  m, fmt, simulateDelay, leadTime,
}: {
  m: any;
  fmt: (n: number) => string;
  simulateDelay: boolean;
  leadTime: number;
}) {
  if (m.status === 'critical') {
    return (
      <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-rose-300 mb-1">Urgent — stock at or below safety level</div>
          <div className="text-xs text-rose-200/90 leading-relaxed">
            You will likely stock out during lead time. Place an order for{' '}
            <span className="font-bold text-white">{m.orderQty.toLocaleString()} units</span>
            {' '}({fmt(m.capitalRequired)}) <span className="font-bold">today</span>.
            Consider air freight to compress lead time if possible.
            {m.revenueLoss > 0 && (
              <> Doing nothing for the next {Math.ceil(m.gapDays)} days costs ~<span className="text-rose-300 font-bold">{fmt(m.revenueLoss)}</span> in lost revenue.</>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (m.status === 'warning') {
    return (
      <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-5 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="text-sm font-bold text-amber-300 mb-1">Reorder point hit</div>
          <div className="text-xs text-amber-200/90 leading-relaxed">
            Place an order for <span className="font-bold text-white">{m.orderQty.toLocaleString()} units</span>
            {' '}({fmt(m.capitalRequired)})
            {m.orderByDate && <> by <span className="font-bold text-white">{formatDate(m.orderByDate)}</span></>}.
            Waiting longer eats into your {m.safetyUnits}-unit safety buffer.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-emerald-950/25 border border-emerald-500/30 rounded-xl p-5 flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-bold text-emerald-300 mb-1">Stock levels healthy</div>
        <div className="text-xs text-emerald-200/90 leading-relaxed">
          No action required.
          {m.orderByDate && <> Plan to reorder around <span className="font-bold text-white">{formatDate(m.orderByDate)}</span> ({Math.floor(m.daysUntilOrderDeadline)} days from now).</>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GUIDE CARD
───────────────────────────────────────────── */
function GuideCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className="bg-orange-500/10 border border-orange-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}