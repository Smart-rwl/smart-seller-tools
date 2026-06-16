// app/tools/cbm-calculator/ToolClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  BarChart3,
  BookOpen,
  Container as ContainerIcon,
  Download,
  Info,
  PackageCheck,
  Plus,
  Scale,
  Settings,
  Trash2,
  Truck,
  RotateCcw,
  Layers,
  Weight,
  Box,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   Types & data
──────────────────────────────────────────────── */

type CargoItem = {
  id: number;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number; // per carton, kg
  qty: number;
};

type ContainerType = {
  name: string;
  nominalCbm: number;
  loadableCbm: number;
  maxWeightKg: number;
};

const CONTAINERS: ContainerType[] = [
  { name: '20ft Standard',  nominalCbm: 33.2, loadableCbm: 28, maxWeightKg: 25000 },
  { name: '40ft Standard',  nominalCbm: 67.7, loadableCbm: 58, maxWeightKg: 27600 },
  { name: '40ft High Cube', nominalCbm: 76.3, loadableCbm: 65, maxWeightKg: 28600 },
];

type Divisor = {
  id: string;
  label: string;
  shortLabel: string;
  ratio: number; // kg per m³ (break-even density)
  hint: string;
};

const DIVISORS: Divisor[] = [
  { id: 'air-iata',       label: 'Air freight (IATA 1:6000)',  shortLabel: 'Air IATA',     ratio: 166.67, hint: 'International air cargo standard.' },
  { id: 'express',        label: 'Express courier (1:5000)',   shortLabel: 'Express',      ratio: 200,    hint: 'DHL, FedEx, UPS, Aramex, BlueDart.' },
  { id: 'india-domestic', label: 'India domestic (1:5000)',    shortLabel: 'India dom.',   ratio: 200,    hint: 'Delhivery, Shiprocket, XpressBees.' },
  { id: 'sea-lcl',        label: 'Sea LCL (1:1000)',           shortLabel: 'Sea LCL',      ratio: 1000,   hint: 'Less-than-container-load ocean freight.' },
];

const DEFAULT_ITEMS: CargoItem[] = [
  { id: 1, name: 'Master Carton A', length: 50, width: 40, height: 30, weight: 12, qty: 100 },
];

const STORAGE_KEY = 'cbm-calculator:state:v1';

const safeNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const safeInt = (v: unknown): number => Math.round(safeNum(v));

const CBM_TO_CFT = 35.3147;

/* ════════════════════════════════════════════════
   Component
════════════════════════════════════════════════ */

export default function CbmCalculator() {
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm');
  const [items, setItems] = useState<CargoItem[]>(DEFAULT_ITEMS);
  const [selectedContainer, setSelectedContainer] = useState<string>('20ft Standard');
  const [divisorId, setDivisorId] = useState<string>('air-iata');
  const [useLoadableCbm, setUseLoadableCbm] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  /* Hydrate */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.unit) setUnit(s.unit);
        if (Array.isArray(s.items) && s.items.length > 0) {
          setItems(s.items.map((it: Partial<CargoItem>, i: number) => ({
            id: typeof it.id === 'number' ? it.id : Date.now() + i,
            name: typeof it.name === 'string' ? it.name : `Carton ${i + 1}`,
            length: safeNum(it.length),
            width: safeNum(it.width),
            height: safeNum(it.height),
            weight: safeNum(it.weight),
            qty: safeInt(it.qty),
          })));
        }
        if (s.selectedContainer) setSelectedContainer(s.selectedContainer);
        if (s.divisorId) setDivisorId(s.divisorId);
        if (typeof s.useLoadableCbm === 'boolean') setUseLoadableCbm(s.useLoadableCbm);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* Persist */
  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        unit, items, selectedContainer, divisorId, useLoadableCbm,
      }));
    } catch { /* ignore */ }
  }, [hydrated, unit, items, selectedContainer, divisorId, useLoadableCbm]);

  /* Derived */
  const divisor = useMemo(
    () => DIVISORS.find((d) => d.id === divisorId) ?? DIVISORS[0],
    [divisorId],
  );
  const container = useMemo(
    () => CONTAINERS.find((c) => c.name === selectedContainer) ?? CONTAINERS[0],
    [selectedContainer],
  );

  const itemMetrics = useMemo(() => {
    const unitToMeters = unit === 'cm' ? 0.01 : 0.0254;
    return items.map((item) => {
      const l = item.length * unitToMeters;
      const w = item.width * unitToMeters;
      const h = item.height * unitToMeters;
      const cbmPerCarton = l * w * h;
      const totalCbm = cbmPerCarton * item.qty;
      const totalWeight = item.weight * item.qty;
      const volumetricWeight = totalCbm * divisor.ratio;
      const chargeableWeight = Math.max(totalWeight, volumetricWeight);
      return { id: item.id, cbmPerCarton, totalCbm, totalWeight, volumetricWeight, chargeableWeight };
    });
  }, [items, unit, divisor]);

  const totals = useMemo(() => {
    const totalCbm        = itemMetrics.reduce((s, m) => s + m.totalCbm, 0);
    const totalWeight     = itemMetrics.reduce((s, m) => s + m.totalWeight, 0);
    const totalVolumetric = itemMetrics.reduce((s, m) => s + m.volumetricWeight, 0);
    const totalChargeable = Math.max(totalWeight, totalVolumetric);
    const totalCartons    = items.reduce((s, i) => s + i.qty, 0);
    const containerCapacity = useLoadableCbm ? container.loadableCbm : container.nominalCbm;
    const volumeUtilPct   = (totalCbm / containerCapacity) * 100;
    const weightUtilPct   = (totalWeight / container.maxWeightKg) * 100;

    // Density (kg/m³)
    const density = totalCbm > 0 ? totalWeight / totalCbm : 0;
    // Billing dominance: volumetric vs gross
    const billedByWeight = totalWeight >= totalVolumetric && totalWeight > 0;
    const billedByVolume = !billedByWeight && totalCbm > 0;

    return {
      totalCbm, totalWeight, totalVolumetric, totalChargeable, totalCartons,
      volumeUtilPct: Number.isFinite(volumeUtilPct) ? volumeUtilPct : 0,
      weightUtilPct: Number.isFinite(weightUtilPct) ? weightUtilPct : 0,
      bottleneck: volumeUtilPct > weightUtilPct ? ('volume' as const) : ('weight' as const),
      density,
      billedByWeight,
      billedByVolume,
    };
  }, [itemMetrics, items, container, useLoadableCbm]);

  // Recommended container — smallest single container that fits
  const recommendedContainer = useMemo(() => {
    const sorted = [...CONTAINERS].sort((a, b) =>
      useLoadableCbm ? a.loadableCbm - b.loadableCbm : a.nominalCbm - b.nominalCbm,
    );
    for (const c of sorted) {
      const cap = useLoadableCbm ? c.loadableCbm : c.nominalCbm;
      if (totals.totalCbm <= cap && totals.totalWeight <= c.maxWeightKg) return c;
    }
    return null;
  }, [totals, useLoadableCbm]);

  // Multi-container split when no single container fits
  const multiContainerPlan = useMemo(() => {
    if (recommendedContainer || totals.totalCbm === 0) return null;
    const largest = CONTAINERS[CONTAINERS.length - 1];
    const cap = useLoadableCbm ? largest.loadableCbm : largest.nominalCbm;
    const byVolume = Math.ceil(totals.totalCbm / cap);
    const byWeight = Math.ceil(totals.totalWeight / largest.maxWeightKg);
    const count = Math.max(byVolume, byWeight);
    const perContainerCbm = totals.totalCbm / count;
    const perContainerWeight = totals.totalWeight / count;
    return {
      container: largest,
      count,
      perContainerCbm,
      perContainerWeight,
      volUtil: (perContainerCbm / cap) * 100,
      wtUtil: (perContainerWeight / largest.maxWeightKg) * 100,
    };
  }, [recommendedContainer, totals.totalCbm, totals.totalWeight, useLoadableCbm]);

  /* Actions */
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: `Carton ${prev.length + 1}`,
        length: 0, width: 0, height: 0, weight: 0, qty: 1,
      },
    ]);

  const removeItem = (id: number) => {
    if (items.length > 1) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = <K extends keyof CargoItem>(id: number, field: K, val: CargoItem[K]) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: val } : i)));

  const resetAll = () => {
    if (!confirm('Reset all cartons and settings to defaults?')) return;
    setUnit('cm');
    setItems(DEFAULT_ITEMS.map((it) => ({ ...it, id: Date.now() })));
    setSelectedContainer('20ft Standard');
    setDivisorId('air-iata');
    setUseLoadableCbm(true);
  };

  const exportCsv = () => {
    const headers = [
      'Name', `L (${unit})`, `W (${unit})`, `H (${unit})`, 'Kg/carton', 'Qty',
      'CBM/carton', 'Total CBM', 'Gross kg', `Volumetric kg (${divisor.label})`, 'Chargeable kg',
    ];
    const rows = items.map((item, i) => {
      const m = itemMetrics[i];
      return [
        item.name, item.length, item.width, item.height, item.weight, item.qty,
        m.cbmPerCarton.toFixed(4), m.totalCbm.toFixed(3),
        m.totalWeight.toFixed(1), m.volumetricWeight.toFixed(1), m.chargeableWeight.toFixed(1),
      ];
    });
    const totalsRow = [
      'TOTAL', '', '', '', '', totals.totalCartons,
      '', totals.totalCbm.toFixed(3),
      totals.totalWeight.toFixed(1),
      totals.totalVolumetric.toFixed(1),
      totals.totalChargeable.toFixed(1),
    ];
    const csv = [headers, ...rows, totalsRow]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cbm-manifest-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* Render */
  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 md:p-12">
      <div className="mx-auto max-w-7xl">

        {/* ─── HEADER ─── */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <ContainerIcon className="h-8 w-8 text-orange-500" />
              Logistics Optimization Engine
            </h1>
            <p className="mt-2 text-slate-400">
              Multi-SKU CBM calculator with container fit, volumetric pricing across carriers, and CSV export.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">
              {(['cm', 'inch'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  aria-pressed={unit === u}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    unit === u ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {u === 'cm' ? 'Metric (cm)' : 'Imperial (in)'}
                </button>
              ))}
            </div>
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-12">

          {/* ─── LEFT: MANIFEST + CONTROLS ─── */}
          <div className="space-y-6 lg:col-span-7">

            {/* Manifest */}
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 px-6 py-4">
                <h3 className="flex items-center gap-2 font-bold text-white text-sm">
                  <PackageCheck className="h-4 w-4 text-orange-400" /> Shipment manifest
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportCsv}
                    disabled={totals.totalCbm === 0}
                    className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Download className="h-3 w-3" /> Export CSV
                  </button>
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-xs text-white transition hover:bg-orange-500"
                  >
                    <Plus className="h-3 w-3" /> Add carton
                  </button>
                </div>
              </div>
              <div className="space-y-3 p-4">
                {items.map((item, i) => (
                  <ManifestRow
                    key={item.id}
                    item={item}
                    cbmPerCarton={itemMetrics[i]?.cbmPerCarton ?? 0}
                    totalCbm={itemMetrics[i]?.totalCbm ?? 0}
                    canRemove={items.length > 1}
                    onChange={updateItem}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </div>
              <div className="px-4 pb-4 pt-1 flex gap-2 items-center text-[10px] text-slate-500">
                <Info className="h-3 w-3 shrink-0" />
                <span>Dimensions in {unit === 'cm' ? 'centimeters' : 'inches'}. Weight in <b className="text-slate-400">kilograms</b> (international shipping standard).</span>
              </div>
            </div>

            {/* Carrier / volumetric */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                <Truck className="h-4 w-4 text-orange-400" /> Volumetric weight divisor
              </h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {DIVISORS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDivisorId(d.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      divisorId === d.id
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{d.label}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{d.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Container picker */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <Settings className="h-4 w-4 text-slate-400" /> Target container
                </h3>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
                  <input
                    type="checkbox"
                    checked={useLoadableCbm}
                    onChange={(e) => setUseLoadableCbm(e.target.checked)}
                    className="accent-orange-500"
                  />
                  Use realistic loadable CBM
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {CONTAINERS.map((c) => {
                  const cap = useLoadableCbm ? c.loadableCbm : c.nominalCbm;
                  const isSelected = selectedContainer === c.name;
                  const isRecommended = recommendedContainer?.name === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setSelectedContainer(c.name)}
                      className={`relative rounded-lg border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {isRecommended && (
                        <span className="absolute -top-1.5 right-2 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white shadow">
                          ✓ Best fit
                        </span>
                      )}
                      <div className="mb-1 text-xs font-bold">{c.name}</div>
                      <div className="text-[10px] opacity-70">
                        Cap: <span className="font-mono">{cap}</span> m³ · <span className="font-mono">{c.maxWeightKg / 1000}</span> t
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Multi-container split note */}
              {multiContainerPlan && (
                <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                  <p className="text-xs font-bold text-rose-300 mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Exceeds single container — split required
                  </p>
                  <div className="grid grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Containers needed</div>
                      <div className="font-mono font-bold text-white text-sm mt-0.5">
                        {multiContainerPlan.count}× {multiContainerPlan.container.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Per-container vol</div>
                      <div className="font-mono font-bold text-white text-sm mt-0.5">
                        {multiContainerPlan.perContainerCbm.toFixed(1)} m³ <span className="text-slate-500 text-[10px]">({multiContainerPlan.volUtil.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Per-container wt</div>
                      <div className="font-mono font-bold text-white text-sm mt-0.5">
                        {(multiContainerPlan.perContainerWeight / 1000).toFixed(1)} t <span className="text-slate-500 text-[10px]">({multiContainerPlan.wtUtil.toFixed(0)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {recommendedContainer && recommendedContainer.name !== selectedContainer && (
                <p className="mt-3 text-[11px] text-emerald-400">
                  ↳ Smallest container that fits this shipment:{' '}
                  <button
                    onClick={() => setSelectedContainer(recommendedContainer.name)}
                    className="font-bold underline-offset-2 hover:underline"
                  >
                    {recommendedContainer.name}
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* ─── RIGHT: ANALYTICS ─── */}
          <div className="space-y-6 lg:col-span-5">

            {/* Headline */}
            <div className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-900/40 to-slate-900 p-8 shadow-2xl">
              <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
                <Anchor className="h-32 w-32 text-white" />
              </div>
              <div className="relative z-10">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-300">
                  Total shipment volume
                </p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-6xl font-extrabold text-white tabular-nums">
                    {totals.totalCbm.toFixed(2)}
                  </span>
                  <span className="text-xl text-orange-300">m³</span>
                  {totals.totalCbm > 0 && (
                    <span className="text-[10px] text-orange-200/60 font-mono ml-1">
                      = {(totals.totalCbm * CBM_TO_CFT).toFixed(0)} CFT
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-orange-200/70">
                  {totals.totalCartons.toLocaleString('en-IN')} cartons across {items.length} SKU{items.length === 1 ? '' : 's'}
                </p>

                <div className="mt-8 grid grid-cols-2 gap-8 border-t border-white/10 pt-6">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-orange-300">
                      <Scale className="h-4 w-4" /> Gross weight
                    </div>
                    <p className="font-mono text-2xl font-bold text-white tabular-nums">
                      {totals.totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      <span className="ml-1 text-sm">kg</span>
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-orange-300">
                      <Truck className="h-4 w-4" /> Chargeable
                    </div>
                    <p className="font-mono text-2xl font-bold text-white tabular-nums">
                      {totals.totalChargeable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      <span className="ml-1 text-sm">kg</span>
                    </p>
                    <p className="mt-0.5 text-[10px] text-orange-200/60">
                      Higher of gross vs volumetric
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing dominance insight (NEW) */}
            {totals.totalCbm > 0 && (
              <BillingInsight
                density={totals.density}
                breakEven={divisor.ratio}
                carrierLabel={divisor.shortLabel}
                billedByWeight={totals.billedByWeight}
                billedByVolume={totals.billedByVolume}
                grossWeight={totals.totalWeight}
                volumetricWeight={totals.totalVolumetric}
              />
            )}

            {/* Volume utilization */}
            <UtilizationCard
              icon={<Box className="h-4 w-4" />}
              title="Volume utilization"
              subtitle={`${selectedContainer} · ${useLoadableCbm ? 'loadable' : 'nominal'} CBM (${(useLoadableCbm ? container.loadableCbm : container.nominalCbm).toFixed(1)} m³)`}
              percent={totals.volumeUtilPct}
              bottleneck={totals.bottleneck === 'volume'}
            />

            {/* Weight utilization */}
            <UtilizationCard
              icon={<Weight className="h-4 w-4" />}
              title="Weight utilization"
              subtitle={`${selectedContainer} · max ${(container.maxWeightKg / 1000).toFixed(1)} t`}
              percent={totals.weightUtilPct}
              bottleneck={totals.bottleneck === 'weight'}
            />
          </div>
        </div>

        {/* GUIDE */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
            <BookOpen className="h-6 w-6 text-orange-500" />
            Optimization guide
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <GuideCard tone="orange" icon={<BarChart3 className="h-5 w-5 text-orange-400" />} title="Why calculate CBM?">
              Sea LCL forwarders charge by CBM. For FCL you pay a flat rate, so aim for 85–95% utilization to minimize cost per unit. Below that you&apos;re paying for air.
            </GuideCard>
            <GuideCard tone="emerald" icon={<Truck className="h-5 w-5 text-emerald-400" />} title="Volumetric vs gross">
              Air and express carriers bill the <b>higher</b> of gross weight and volumetric. A feather pillow ships as if it weighed 30 kg. The carrier selector above changes the divisor — they don&apos;t all use the same ratio.
            </GuideCard>
            <GuideCard tone="slate" icon={<Info className="h-5 w-5 text-slate-300" />} title="Loadable vs nominal CBM">
              A 20ft has 33.2 m³ on paper but you rarely stuff more than ~28 m³ once you account for stacking gaps, pallets, and dunnage. The &ldquo;Use realistic loadable CBM&rdquo; toggle gives you the honest number.
            </GuideCard>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   BILLING INSIGHT (NEW)
════════════════════════════════════════════════ */

function BillingInsight({
  density, breakEven, carrierLabel, billedByWeight, billedByVolume, grossWeight, volumetricWeight,
}: {
  density: number;
  breakEven: number;
  carrierLabel: string;
  billedByWeight: boolean;
  billedByVolume: boolean;
  grossWeight: number;
  volumetricWeight: number;
}) {
  // Scale the density spectrum bar — break-even sits at 50%
  // We render 0 → 2× break-even, so break-even is at 50%
  const maxDensity = breakEven * 2;
  const densityPct = Math.min((density / maxDensity) * 100, 100);

  // Tone based on which side we're on
  const verdict = billedByWeight
    ? { label: 'BILLED BY WEIGHT', tone: 'rose' as const, icon: <Weight className="w-4 h-4" /> }
    : billedByVolume
      ? { label: 'BILLED BY VOLUME', tone: 'sky' as const, icon: <Box className="w-4 h-4" /> }
      : { label: 'NO CARGO', tone: 'slate' as const, icon: <Info className="w-4 h-4" /> };

  const toneClass = {
    rose:  { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-300', fill: 'bg-rose-500' },
    sky:   { border: 'border-sky-500/30',  bg: 'bg-sky-500/10',  text: 'text-sky-300',  fill: 'bg-sky-500' },
    slate: { border: 'border-slate-700',   bg: 'bg-slate-900',   text: 'text-slate-400',fill: 'bg-slate-500' },
  }[verdict.tone];

  // Density classification
  const densityLabel =
    density < 150 ? 'Light cargo'
    : density < 500 ? 'Medium density'
    : density < 1000 ? 'Dense cargo'
    : 'Very dense';

  return (
    <div className={`rounded-xl border ${toneClass.border} ${toneClass.bg} p-5`}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
          <span className={toneClass.text}>{verdict.icon}</span>
          Billing dominance
        </h3>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${toneClass.text} ${toneClass.bg} border ${toneClass.border}`}>
          {verdict.label}
        </span>
      </div>

      {/* Density spectrum bar */}
      <div className="relative h-6 bg-slate-950 rounded-md overflow-hidden border border-slate-800 mb-2">
        {/* Volume-billed region (left side, sky tint) */}
        <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-sky-500/10" />
        {/* Weight-billed region (right side, rose tint) */}
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-rose-500/10" />
        {/* Break-even line at 50% */}
        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/40" />
        {/* Actual density marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${toneClass.fill} border-2 border-slate-950 shadow-lg transition-all duration-500`}
          style={{ left: `calc(${densityPct}% - 6px)` }}
        />
      </div>

      <div className="flex justify-between text-[10px] mb-3">
        <span className="text-sky-300 font-bold uppercase tracking-wider">Volume</span>
        <span className="text-slate-400 font-mono">Break-even: {breakEven.toFixed(0)} kg/m³</span>
        <span className="text-rose-300 font-bold uppercase tracking-wider">Weight</span>
      </div>

      {/* Density + carrier context */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-md bg-slate-950 border border-slate-800 p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Your density</div>
          <div className="font-mono font-bold text-white text-sm mt-0.5">
            {density.toFixed(0)} <span className="text-slate-500 text-[10px]">kg/m³</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{densityLabel}</div>
        </div>
        <div className="rounded-md bg-slate-950 border border-slate-800 p-2.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Carrier ({carrierLabel})</div>
          <div className="font-mono font-bold text-white text-sm mt-0.5">
            {breakEven.toFixed(0)} <span className="text-slate-500 text-[10px]">kg/m³</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Break-even point</div>
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        {billedByWeight ? (
          <>Your cargo is <b className="text-white">denser</b> than the carrier&apos;s break-even ({density.toFixed(0)} vs {breakEven.toFixed(0)} kg/m³), so you&apos;ll pay on <b className="text-rose-300">gross weight</b> ({grossWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg). Volumetric weight ({volumetricWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg) is irrelevant here.</>
        ) : billedByVolume ? (
          <>Your cargo is <b className="text-white">lighter</b> than the carrier&apos;s break-even ({density.toFixed(0)} vs {breakEven.toFixed(0)} kg/m³), so you&apos;ll pay on <b className="text-sky-300">volumetric weight</b> ({volumetricWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg). To reduce bills, denser packing or switching to sea LCL would help.</>
        ) : (
          <>Add cargo to see billing breakdown.</>
        )}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════
   MANIFEST ROW
════════════════════════════════════════════════ */

function ManifestRow({
  item, cbmPerCarton, totalCbm, canRemove, onChange, onRemove,
}: {
  item: CargoItem;
  cbmPerCarton: number;
  totalCbm: number;
  canRemove: boolean;
  onChange: <K extends keyof CargoItem>(id: number, field: K, val: CargoItem[K]) => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex flex-col items-start gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center">
      <div className="w-full md:w-48">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Carton / SKU</span>
          {canRemove && (
            <button
              onClick={onRemove}
              className="cursor-pointer text-slate-500 hover:text-rose-400 md:hidden"
              aria-label="Remove"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <input
          type="text"
          value={item.name}
          onChange={(e) => onChange(item.id, 'name', e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
        />
      </div>
      <div className="grid flex-1 grid-cols-5 gap-2">
        <DimInput label="L"      value={item.length} onChange={(v) => onChange(item.id, 'length', v)} />
        <DimInput label="W"      value={item.width}  onChange={(v) => onChange(item.id, 'width', v)} />
        <DimInput label="H"      value={item.height} onChange={(v) => onChange(item.id, 'height', v)} />
        <DimInput label="kg/box" value={item.weight} onChange={(v) => onChange(item.id, 'weight', v)} />
        <div>
          <label className="mb-1 block text-[10px] font-bold text-orange-400">Qty</label>
          <input
            type="number"
            min={0}
            step={1}
            value={item.qty === 0 ? '' : item.qty}
            onChange={(e) => onChange(item.id, 'qty', safeInt(e.target.value))}
            className="w-full rounded border border-orange-500/40 bg-orange-500/10 p-1.5 text-center text-sm font-bold text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
          />
        </div>
      </div>
      <div className="hidden md:flex md:flex-col md:items-end md:gap-1 md:pr-2 md:text-right">
        <div className="text-[10px] text-slate-500">CBM</div>
        <div className="font-mono text-xs text-orange-300">{totalCbm.toFixed(3)}</div>
        <div className="text-[9px] text-slate-600">
          ({cbmPerCarton.toFixed(4)} × {item.qty})
        </div>
      </div>
      {canRemove && (
        <button
          onClick={onRemove}
          className="hidden p-2 text-slate-600 hover:text-rose-400 transition md:block"
          aria-label="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DimInput({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-slate-500">{label}</label>
      <input
        type="number"
        min={0}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-center text-sm text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
      />
    </div>
  );
}

/* ════════════════════════════════════════════════
   UTILIZATION CARD
════════════════════════════════════════════════ */

function UtilizationCard({
  icon, title, subtitle, percent, bottleneck,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  percent: number;
  bottleneck: boolean;
}) {
  const tone =
    percent > 100 ? 'rose' : percent >= 85 ? 'emerald' : percent >= 65 ? 'orange' : 'slate';
  const barColor = {
    rose:    'bg-rose-500',
    emerald: 'bg-emerald-500',
    orange:  'bg-orange-500',
    slate:   'bg-slate-500',
  }[tone];
  const textColor = {
    rose:    'text-rose-400',
    emerald: 'text-emerald-400',
    orange:  'text-orange-400',
    slate:   'text-slate-400',
  }[tone];
  const advice =
    percent > 100
      ? `Overloaded — needs ~${Math.ceil(percent / 100)} of this container or a larger size.`
      : percent >= 85
        ? 'Optimal load — container is filled efficiently.'
        : percent >= 65
          ? 'Reasonable load, but you could fit more before this dimension is the bottleneck.'
          : 'Under-utilized on this axis — you are paying for air.';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-end justify-between flex-wrap gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <span className={textColor}>{icon}</span>
            {title}
            {bottleneck && (
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-orange-300">
                Bottleneck
              </span>
            )}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`font-mono text-2xl font-bold ${textColor} tabular-nums`}>{percent.toFixed(1)}%</div>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
        <div
          className={`h-full transition-all duration-700 ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
        <div
          className="absolute inset-y-0 w-px bg-white/30"
          style={{ left: '85%' }}
          title="85% — optimal-load marker"
        />
      </div>
      <p className={`mt-3 text-xs ${textColor}`}>{advice}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════
   GUIDE CARD + FOOTER
════════════════════════════════════════════════ */

function GuideCard({
  tone, icon, title, children,
}: {
  tone: 'orange' | 'emerald' | 'slate';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const bg = {
    orange:  'bg-orange-500/10 border-orange-500/30',
    emerald: 'bg-emerald-500/10 border-emerald-500/30',
    slate:   'bg-slate-500/10 border-slate-500/30',
  }[tone];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg border ${bg}`}>
        {icon}
      </div>
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
        <a href="http://www.instagram.com/smartrwl" target="_blank" rel="noopener noreferrer" className="text-slate-600 transition-colors hover:text-pink-500" title="Instagram" aria-label="Instagram">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
        <a href="https://github.com/Smart-rwl/" target="_blank" rel="noopener noreferrer" className="text-slate-600 transition-colors hover:text-white" title="GitHub" aria-label="GitHub">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      </div>
    </div>
  );
}