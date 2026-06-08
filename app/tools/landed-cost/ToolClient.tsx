'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calculator,
  DollarSign,
  Package,
  Ship,
  ShieldCheck,
  Download,
  FileText,
  Percent,
  Coins,
  Scale,
  ChevronDown,
  RotateCcw,
  TrendingUp,
  Target,
  Plus,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ─────────────────────────────────────────────
   TYPES + CONSTANTS
───────────────────────────────────────────── */

type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AED';
type DutyBasis = 'CIF' | 'FOB';
type InsuranceMode = 'flat' | 'percent';

type Inputs = {
  productCost: number;
  quantity: number;
  shippingCost: number;
  customsDutyPercent: number;
  insuranceFlat: number;
  insurancePercent: number;
  insuranceMode: InsuranceMode;
  otherCosts: number;
  currency: CurrencyCode;
  dutyBasis: DutyBasis;
};

const DEFAULTS: Inputs = {
  productCost: 100,
  quantity: 100,
  shippingCost: 250,
  customsDutyPercent: 5,
  insuranceFlat: 50,
  insurancePercent: 0.5,
  insuranceMode: 'flat',
  otherCosts: 75,
  currency: 'USD',
  dutyBasis: 'CIF',
};

const CURRENCIES: { code: CurrencyCode; symbol: string; locale: string }[] = [
  { code: 'USD', symbol: '$',   locale: 'en-US' },
  { code: 'EUR', symbol: '€',   locale: 'de-DE' },
  { code: 'GBP', symbol: '£',   locale: 'en-GB' },
  { code: 'INR', symbol: '₹',   locale: 'en-IN' },
  { code: 'JPY', symbol: '¥',   locale: 'ja-JP' },
  { code: 'AED', symbol: 'AED', locale: 'en-AE' },
];

const STORAGE_KEY = 'landed-cost:state:v1';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

function fmtCurrency(n: number, code: CurrencyCode): string {
  const c = CURRENCIES.find((x) => x.code === code)!;
  try {
    return new Intl.NumberFormat(c.locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'JPY' ? 0 : 2,
    }).format(Number.isFinite(n) ? n : 0);
  } catch {
    return `${c.symbol}${(n ?? 0).toFixed(2)}`;
  }
}

/* ─────────────────────────────────────────────
   MATH
───────────────────────────────────────────── */

type Calc = {
  subtotal: number;
  insurance: number;
  dutyBase: number;
  dutyAmount: number;
  grandTotal: number;
  perUnit: number;
  breakdown: {
    product: number;
    shipping: number;
    duty: number;
    insurance: number;
    other: number;
  };
};

function compute(i: Inputs): Calc {
  const subtotal = i.productCost * i.quantity;

  // Insurance: flat amount OR percent of (cost + freight)
  const insurance =
    i.insuranceMode === 'flat'
      ? i.insuranceFlat
      : (subtotal + i.shippingCost) * (i.insurancePercent / 100);

  // Duty base depends on basis: CIF includes freight + insurance; FOB is product only
  const dutyBase =
    i.dutyBasis === 'CIF'
      ? subtotal + i.shippingCost + insurance
      : subtotal;
  const dutyAmount = (dutyBase * i.customsDutyPercent) / 100;

  const grandTotal =
    subtotal + i.shippingCost + dutyAmount + insurance + i.otherCosts;
  const perUnit = i.quantity > 0 ? grandTotal / i.quantity : 0;

  return {
    subtotal,
    insurance,
    dutyBase,
    dutyAmount,
    grandTotal,
    perUnit,
    breakdown: {
      product: subtotal,
      shipping: i.shippingCost,
      duty: dutyAmount,
      insurance: insurance,
      other: i.otherCosts,
    },
  };
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */

export default function LandedCostCalculator() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [targetMargin, setTargetMargin] = useState<number>(30);
  const [hydrated, setHydrated] = useState(false);

  /* ── Hydrate ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.inputs) setInputs({ ...DEFAULTS, ...s.inputs });
        if (typeof s.targetMargin === 'number') setTargetMargin(s.targetMargin);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, targetMargin }));
    } catch { /* ignore */ }
  }, [hydrated, inputs, targetMargin]);

  const calc = useMemo(() => compute(inputs), [inputs]);
  const fmt = (n: number) => fmtCurrency(n, inputs.currency);

  /* ── Markup planner ── */
  const minSalePrice = useMemo(() => {
    const m = targetMargin / 100;
    if (m >= 1) return Infinity;
    return calc.perUnit / (1 - m);
  }, [calc.perUnit, targetMargin]);

  const markupAmount = Number.isFinite(minSalePrice) ? minSalePrice - calc.perUnit : 0;

  /* ── Handlers ── */
  const updateInput = <K extends keyof Inputs>(key: K, value: Inputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const resetAll = () => {
    if (!confirm('Reset all inputs to defaults?')) return;
    setInputs(DEFAULTS);
    setTargetMargin(30);
  };

  /* ── PDF ── */
  const generatePDF = () => {
    const doc = new jsPDF();
    const ref = `LC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    // Header band
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('Landed Cost Estimate', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(249, 115, 22); // orange-500
    doc.text(`Ref: ${ref}  ·  ${dateStr}`, 14, 30);

    // Reset text color for body
    doc.setTextColor(15, 23, 42);

    // Inputs table
    autoTable(doc, {
      startY: 50,
      head: [['Input parameter', 'Value']],
      body: [
        ['Unit cost', fmt(inputs.productCost)],
        ['Quantity', inputs.quantity.toString()],
        ['Shipping / freight', fmt(inputs.shippingCost)],
        ['Customs duty rate', `${inputs.customsDutyPercent}%`],
        ['Duty basis', inputs.dutyBasis === 'CIF' ? 'CIF (cost + freight + insurance)' : 'FOB (cost only)'],
        ['Insurance', inputs.insuranceMode === 'flat'
          ? fmt(inputs.insuranceFlat)
          : `${inputs.insurancePercent}% of CIF = ${fmt(calc.insurance)}`],
        ['Other costs', fmt(inputs.otherCosts)],
        ['Currency', inputs.currency],
      ],
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 70 },
        1: { halign: 'right', cellWidth: 110 },
      },
    });

    // Breakdown table
    const startY = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 110;
    const pct = (v: number) =>
      calc.grandTotal > 0 ? `${((v / calc.grandTotal) * 100).toFixed(1)}%` : '0%';

    autoTable(doc, {
      startY: startY + 10,
      head: [['Cost component', 'Amount', 'Share']],
      body: [
        ['Product subtotal', fmt(calc.subtotal), pct(calc.breakdown.product)],
        ['Shipping / freight', fmt(inputs.shippingCost), pct(calc.breakdown.shipping)],
        [`Duty (${inputs.customsDutyPercent}% ${inputs.dutyBasis})`, fmt(calc.dutyAmount), pct(calc.breakdown.duty)],
        ['Insurance', fmt(calc.insurance), pct(calc.breakdown.insurance)],
        ['Other costs', fmt(inputs.otherCosts), pct(calc.breakdown.other)],
      ],
      foot: [
        ['GRAND TOTAL', fmt(calc.grandTotal), '100%'],
        ['Per unit', fmt(calc.perUnit), ''],
      ],
      theme: 'grid',
      headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 11 },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 },
        1: { halign: 'right', cellWidth: 60 },
        2: { halign: 'right', cellWidth: 30 },
      },
    });

    // Markup section
    if (Number.isFinite(minSalePrice)) {
      const startY2 = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 200;
      autoTable(doc, {
        startY: startY2 + 10,
        head: [['Markup planner', 'Value']],
        body: [
          ['Target gross margin', `${targetMargin}%`],
          ['Minimum sale price (per unit)', fmt(minSalePrice)],
          ['Markup over landed cost', fmt(markupAmount)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
        bodyStyles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 100 },
          1: { halign: 'right', cellWidth: 80 },
        },
      });
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Generated by Smart Seller Tools · smartrwl · ${dateStr}`, 14, 285);

    doc.save(`landed-cost-${ref}.pdf`);
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 md:p-12">
      <div className="mx-auto max-w-6xl">

        {/* ─── HEADER ─── */}
        <div className="mb-10 flex flex-col items-start justify-between gap-4 border-b border-slate-800 pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Calculator className="h-8 w-8 text-orange-500" />
              Landed Cost Calculator
            </h1>
            <p className="mt-2 text-slate-400">
              Total import cost with shipping, duty (CIF or FOB basis), insurance, and other fees.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CurrencyPicker value={inputs.currency} onChange={(c) => updateInput('currency', c)} />
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button
              onClick={generatePDF}
              className="flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/15 px-3 py-2 text-xs font-bold text-orange-400 transition hover:bg-orange-500/25 hover:text-orange-300"
            >
              <FileText className="h-3.5 w-3.5" /> Download quote
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* ─── LEFT: INPUTS ─── */}
          <div className="space-y-6 lg:col-span-2">

            {/* Product details */}
            <Section icon={<Package className="h-4 w-4 text-emerald-400" />} title="Product details">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumericField
                  label="Unit cost"
                  value={inputs.productCost}
                  onChange={(v) => updateInput('productCost', v)}
                  prefix={CURRENCIES.find((c) => c.code === inputs.currency)!.symbol}
                  accent="emerald"
                />
                <NumericField
                  label="Quantity"
                  value={inputs.quantity}
                  onChange={(v) => updateInput('quantity', v)}
                  icon={<Package className="h-3.5 w-3.5" />}
                  accent="emerald"
                  integer
                />
              </div>
            </Section>

            {/* Logistics & taxes */}
            <Section icon={<Ship className="h-4 w-4 text-orange-400" />} title="Logistics & taxes">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <NumericField
                  label="Total shipping / freight"
                  value={inputs.shippingCost}
                  onChange={(v) => updateInput('shippingCost', v)}
                  prefix={CURRENCIES.find((c) => c.code === inputs.currency)!.symbol}
                  accent="orange"
                />
                <NumericField
                  label="Customs duty rate"
                  value={inputs.customsDutyPercent}
                  onChange={(v) => updateInput('customsDutyPercent', v)}
                  suffix="%"
                  accent="orange"
                />
              </div>

              {/* Duty basis toggle */}
              <div className="mt-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Duty assessed on
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <ToggleButton
                    active={inputs.dutyBasis === 'CIF'}
                    onClick={() => updateInput('dutyBasis', 'CIF')}
                    label="CIF"
                    hint="Cost + freight + insurance"
                  />
                  <ToggleButton
                    active={inputs.dutyBasis === 'FOB'}
                    onClick={() => updateInput('dutyBasis', 'FOB')}
                    label="FOB"
                    hint="Product cost only"
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Most countries (EU, India, UK) use CIF. US Customs uses transaction value (≈ FOB).
                </p>
              </div>

              {/* Insurance with mode toggle */}
              <div className="mt-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Insurance
                  </label>
                  <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5">
                    <button
                      onClick={() => updateInput('insuranceMode', 'flat')}
                      className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded transition ${
                        inputs.insuranceMode === 'flat'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Flat
                    </button>
                    <button
                      onClick={() => updateInput('insuranceMode', 'percent')}
                      className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded transition ${
                        inputs.insuranceMode === 'percent'
                          ? 'bg-orange-500/20 text-orange-300'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      % of CIF
                    </button>
                  </div>
                </div>
                {inputs.insuranceMode === 'flat' ? (
                  <NumericField
                    value={inputs.insuranceFlat}
                    onChange={(v) => updateInput('insuranceFlat', v)}
                    prefix={CURRENCIES.find((c) => c.code === inputs.currency)!.symbol}
                    accent="orange"
                    inline
                  />
                ) : (
                  <>
                    <NumericField
                      value={inputs.insurancePercent}
                      onChange={(v) => updateInput('insurancePercent', v)}
                      suffix="%"
                      accent="orange"
                      inline
                      step={0.01}
                    />
                    <p className="mt-1.5 text-[10px] text-slate-500 font-mono">
                      = {fmt(calc.insurance)} ({inputs.insurancePercent}% × {fmt(calc.subtotal + inputs.shippingCost)})
                    </p>
                  </>
                )}
                <p className="mt-1.5 text-[10px] text-slate-500">
                  Typical marine insurance: 0.3-1% of CIF value.
                </p>
              </div>
            </Section>

            {/* Other costs */}
            <Section icon={<Plus className="h-4 w-4 text-sky-400" />} title="Other costs">
              <NumericField
                label="Broker / handling / domestic freight / misc"
                value={inputs.otherCosts}
                onChange={(v) => updateInput('otherCosts', v)}
                prefix={CURRENCIES.find((c) => c.code === inputs.currency)!.symbol}
                accent="orange"
                hint="Customs broker fees, port handling, ATL/AD code charges, domestic freight from port to 3PL warehouse."
              />
            </Section>

            {/* Markup planner */}
            <Section icon={<Target className="h-4 w-4 text-amber-400" />} title="Markup planner">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Target gross margin
                  </label>
                  <span className="text-sm font-bold text-amber-400 font-mono">{targetMargin}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={1}
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(safeNum(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <ResultBox
                    label="Min sale price / unit"
                    value={Number.isFinite(minSalePrice) ? fmt(minSalePrice) : '—'}
                    tone="emerald"
                  />
                  <ResultBox
                    label="Markup over landed"
                    value={Number.isFinite(markupAmount) ? fmt(markupAmount) : '—'}
                    tone="amber"
                  />
                </div>
                <p className="mt-3 text-[10px] text-slate-500">
                  Margin is on sale price: <span className="font-mono">sale × (1 − margin) = landed cost</span>. So sale = landed / (1 − margin).
                </p>
              </div>
            </Section>
          </div>

          {/* ─── RIGHT: SUMMARY ─── */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <h2 className="mb-5 flex items-center gap-2 text-base font-bold text-white">
                <Coins className="h-5 w-5 text-orange-400" /> Cost breakdown
              </h2>

              {/* Line items with % */}
              <div className="space-y-2.5 text-sm">
                <SummaryLine
                  label="Product subtotal"
                  value={fmt(calc.subtotal)}
                  pct={percentOf(calc.breakdown.product, calc.grandTotal)}
                  dot="bg-orange-500"
                />
                <SummaryLine
                  label="Freight / shipping"
                  value={fmt(inputs.shippingCost)}
                  pct={percentOf(calc.breakdown.shipping, calc.grandTotal)}
                  dot="bg-sky-500"
                />
                <SummaryLine
                  label={`Duty (${inputs.customsDutyPercent}% on ${inputs.dutyBasis})`}
                  value={fmt(calc.dutyAmount)}
                  pct={percentOf(calc.breakdown.duty, calc.grandTotal)}
                  dot="bg-amber-500"
                />
                <SummaryLine
                  label="Insurance"
                  value={fmt(calc.insurance)}
                  pct={percentOf(calc.breakdown.insurance, calc.grandTotal)}
                  dot="bg-emerald-500"
                />
                <SummaryLine
                  label="Other costs"
                  value={fmt(inputs.otherCosts)}
                  pct={percentOf(calc.breakdown.other, calc.grandTotal)}
                  dot="bg-slate-500"
                />
              </div>

              <hr className="my-4 border-slate-800" />

              {/* Stacked bar */}
              {calc.grandTotal > 0 && (
                <div className="mb-4">
                  <BreakdownBar breakdown={calc.breakdown} grandTotal={calc.grandTotal} />
                </div>
              )}

              {/* Grand total */}
              <div className="flex items-center justify-between text-lg font-bold text-white">
                <span>Grand total</span>
                <span className="font-mono">{fmt(calc.grandTotal)}</span>
              </div>

              {/* Per unit */}
              <div className="mt-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-300">Landed cost / unit</span>
                  <span className="text-xl font-bold text-orange-400 font-mono">{fmt(calc.perUnit)}</span>
                </div>
              </div>

              {/* Min sale price */}
              {Number.isFinite(minSalePrice) && targetMargin > 0 && calc.perUnit > 0 && (
                <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Sell at ({targetMargin}%)
                    </span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">{fmt(minSalePrice)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={generatePDF}
                disabled={calc.grandTotal === 0}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                Save as PDF
              </button>
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

function percentOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function Section({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function NumericField({
  label, value, onChange, prefix, suffix, icon, accent = 'orange', hint, inline, integer, step,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  icon?: React.ReactNode;
  accent?: 'orange' | 'emerald';
  hint?: string;
  inline?: boolean;
  integer?: boolean;
  step?: number;
}) {
  const ring =
    accent === 'orange'
      ? 'focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
      : 'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

  const longPrefix = (prefix?.length ?? 0) > 1;

  return (
    <div>
      {label && !inline && (
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </label>
      )}
      <div className="relative">
        {prefix && (
          <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-slate-500 ${longPrefix ? 'text-xs' : ''}`}>
            {prefix}
          </span>
        )}
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            {icon}
          </span>
        )}
        <input
          type="number"
          min={0}
          step={step ?? (integer ? 1 : 0.01)}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(integer ? Math.round(safeNum(e.target.value)) : safeNum(e.target.value))}
          className={`w-full rounded border border-slate-700 bg-slate-950 py-2 font-mono text-white outline-none transition ${ring} ${
            (prefix || icon) ? (longPrefix ? 'pl-12' : 'pl-7') : 'pl-3'
          } ${suffix ? 'pr-7' : 'pr-3'}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">{hint}</p>}
    </div>
  );
}

function ToggleButton({
  active, onClick, label, hint,
}: { active: boolean; onClick: () => void; label: string; hint: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition ${
        active
          ? 'border-orange-500/50 bg-orange-500/10 text-orange-300'
          : 'border-slate-700 bg-slate-950 text-slate-500 hover:border-slate-600 hover:text-slate-300'
      }`}
    >
      <div className={`text-sm font-bold ${active ? 'text-orange-300' : 'text-slate-300'}`}>{label}</div>
      <div className="text-[10px] mt-0.5 leading-tight">{hint}</div>
    </button>
  );
}

function ResultBox({
  label, value, tone,
}: { label: string; value: string; tone: 'emerald' | 'amber' }) {
  const tones = {
    emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', label: 'text-emerald-300', value: 'text-emerald-400' },
    amber:   { border: 'border-amber-500/30',   bg: 'bg-amber-500/10',   label: 'text-amber-300',   value: 'text-amber-400' },
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${tones.border} ${tones.bg}`}>
      <div className={`text-[10px] font-bold uppercase tracking-wider ${tones.label}`}>{label}</div>
      <div className={`mt-0.5 text-base font-bold font-mono ${tones.value}`}>{value}</div>
    </div>
  );
}

function SummaryLine({
  label, value, pct, dot,
}: { label: string; value: string; pct: number; dot: string }) {
  return (
    <div className="flex items-center justify-between text-slate-300">
      <span className="flex items-center gap-2 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-center gap-2 font-mono shrink-0">
        <span className="text-[10px] text-slate-500">{pct.toFixed(0)}%</span>
        <span>{value}</span>
      </span>
    </div>
  );
}

function BreakdownBar({
  breakdown, grandTotal,
}: { breakdown: Calc['breakdown']; grandTotal: number }) {
  const segments = [
    { key: 'product',   value: breakdown.product,   color: 'bg-orange-500',  label: 'Product' },
    { key: 'shipping',  value: breakdown.shipping,  color: 'bg-sky-500',     label: 'Shipping' },
    { key: 'duty',      value: breakdown.duty,      color: 'bg-amber-500',   label: 'Duty' },
    { key: 'insurance', value: breakdown.insurance, color: 'bg-emerald-500', label: 'Insurance' },
    { key: 'other',     value: breakdown.other,     color: 'bg-slate-500',   label: 'Other' },
  ].filter((s) => s.value > 0);

  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
        Distribution
      </div>
      <div className="flex h-3 rounded-md overflow-hidden border border-slate-800 bg-slate-950">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.color} transition-all duration-500`}
            style={{ width: `${(s.value / grandTotal) * 100}%` }}
            title={`${s.label}: ${((s.value / grandTotal) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
    </div>
  );
}

function CurrencyPicker({
  value, onChange,
}: { value: CurrencyCode; onChange: (c: CurrencyCode) => void }) {
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
        className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 transition"
      >
        <span className="font-mono">{current.symbol}</span>
        <span className="font-bold">{current.code}</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-10 min-w-[120px] rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-2xl">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { onChange(c.code); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-slate-800 ${c.code === value ? 'text-orange-400' : 'text-slate-300'}`}
            >
              <span className="w-8 font-mono">{c.symbol}</span>
              <span className="font-bold">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}