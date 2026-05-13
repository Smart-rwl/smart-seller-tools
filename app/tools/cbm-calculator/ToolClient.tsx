// app/tools/cbm-calculator/ToolClient.tsx
'use client';

import React, { useMemo, useState } from 'react';
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
  nominalCbm: number;   // marketing/spec figure
  loadableCbm: number;  // what you actually fit after stacking gaps + pallets
  maxWeightKg: number;
};

const CONTAINERS: ContainerType[] = [
  { name: '20ft Standard', nominalCbm: 33.2, loadableCbm: 28, maxWeightKg: 25000 },
  { name: '40ft Standard', nominalCbm: 67.7, loadableCbm: 58, maxWeightKg: 27600 },
  { name: '40ft High Cube', nominalCbm: 76.3, loadableCbm: 65, maxWeightKg: 28600 },
];

type Divisor = {
  id: string;
  label: string;
  ratio: number; // kg per CBM (i.e. CBM × ratio = volumetric kg)
  hint: string;
};

const DIVISORS: Divisor[] = [
  { id: 'air-iata', label: 'Air freight (IATA 1:6000)', ratio: 166.67, hint: 'International air cargo standard.' },
  { id: 'express', label: 'Express courier (1:5000)', ratio: 200, hint: 'DHL, FedEx, UPS, Aramex, BlueDart.' },
  { id: 'india-domestic', label: 'India domestic (1:5000)', ratio: 200, hint: 'Delhivery, Shiprocket, XpressBees.' },
  { id: 'sea-lcl', label: 'Sea LCL (1:1000)', ratio: 1000, hint: 'Less-than-container-load ocean freight.' },
];

const safeNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/* ────────────────────────────────────────────────
   Component
──────────────────────────────────────────────── */

export default function CbmCalculator() {
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm');
  const [items, setItems] = useState<CargoItem[]>([
    { id: 1, name: 'Master Carton A', length: 50, width: 40, height: 30, weight: 12, qty: 100 },
  ]);
  const [selectedContainer, setSelectedContainer] = useState<string>('20ft Standard');
  const [divisorId, setDivisorId] = useState<string>('air-iata');
  const [useLoadableCbm, setUseLoadableCbm] = useState(true);

  /* ── Derived ── */

  const divisor = useMemo(
    () => DIVISORS.find((d) => d.id === divisorId) ?? DIVISORS[0],
    [divisorId]
  );

  const container = useMemo(
    () => CONTAINERS.find((c) => c.name === selectedContainer) ?? CONTAINERS[0],
    [selectedContainer]
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
      return {
        id: item.id,
        cbmPerCarton,
        totalCbm,
        totalWeight,
        volumetricWeight,
        chargeableWeight,
      };
    });
  }, [items, unit, divisor]);

  const totals = useMemo(() => {
    const totalCbm = itemMetrics.reduce((s, m) => s + m.totalCbm, 0);
    const totalWeight = itemMetrics.reduce((s, m) => s + m.totalWeight, 0);
    const totalVolumetric = itemMetrics.reduce((s, m) => s + m.volumetricWeight, 0);
    const totalChargeable = Math.max(totalWeight, totalVolumetric);
    const totalCartons = items.reduce((s, i) => s + i.qty, 0);

    const containerCapacity = useLoadableCbm
      ? container.loadableCbm
      : container.nominalCbm;

    const volumeUtilPct = (totalCbm / containerCapacity) * 100;
    const weightUtilPct = (totalWeight / container.maxWeightKg) * 100;

    return {
      totalCbm,
      totalWeight,
      totalVolumetric,
      totalChargeable,
      totalCartons,
      volumeUtilPct: Number.isFinite(volumeUtilPct) ? volumeUtilPct : 0,
      weightUtilPct: Number.isFinite(weightUtilPct) ? weightUtilPct : 0,
      bottleneck:
        volumeUtilPct > weightUtilPct ? ('volume' as const) : ('weight' as const),
    };
  }, [itemMetrics, items, container, useLoadableCbm]);

  // Container suggestion — pick the smallest container that fits both constraints
  const recommendedContainer = useMemo(() => {
    const sorted = [...CONTAINERS].sort((a, b) =>
      useLoadableCbm
        ? a.loadableCbm - b.loadableCbm
        : a.nominalCbm - b.nominalCbm
    );
    for (const c of sorted) {
      const cap = useLoadableCbm ? c.loadableCbm : c.nominalCbm;
      if (totals.totalCbm <= cap && totals.totalWeight <= c.maxWeightKg) {
        return c;
      }
    }
    return null; // doesn't fit any single container
  }, [totals, useLoadableCbm]);

  /* ── Actions ── */

  const addItem = () =>
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: `Carton ${prev.length + 1}`,
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        qty: 1,
      },
    ]);

  const removeItem = (id: number) => {
    if (items.length > 1) setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = <K extends keyof CargoItem>(id: number, field: K, val: CargoItem[K]) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: val } : i)));

  const exportCsv = () => {
    const headers = [
      'Name',
      `L (${unit})`,
      `W (${unit})`,
      `H (${unit})`,
      'Kg/carton',
      'Qty',
      'CBM/carton',
      'Total CBM',
      'Gross kg',
      `Volumetric kg (${divisor.label})`,
      'Chargeable kg',
    ];
    const rows = items.map((item, i) => {
      const m = itemMetrics[i];
      return [
        item.name,
        item.length,
        item.width,
        item.height,
        item.weight,
        item.qty,
        m.cbmPerCarton.toFixed(4),
        m.totalCbm.toFixed(3),
        m.totalWeight.toFixed(1),
        m.volumetricWeight.toFixed(1),
        m.chargeableWeight.toFixed(1),
      ];
    });
    const totalsRow = [
      'TOTAL',
      '',
      '',
      '',
      '',
      totals.totalCartons,
      '',
      totals.totalCbm.toFixed(3),
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

  /* ── Render ── */

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 md:p-12">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <ContainerIcon className="h-8 w-8 text-orange-500" />
              Logistics Optimization Engine
            </h1>
            <p className="mt-2 text-slate-400">
              Multi-SKU CBM calculator with container fit, volumetric pricing across carriers, and
              CSV export.
            </p>
          </div>
          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1">
            {(['cm', 'inch'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                aria-pressed={unit === u}
                className={`rounded px-4 py-2 text-sm font-medium ${
                  unit === u
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {u === 'cm' ? 'Metric (cm / kg)' : 'Imperial (in / kg)'}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT — manifest */}
          <div className="space-y-6 lg:col-span-7">
            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 px-6 py-4">
                <h3 className="flex items-center gap-2 font-bold text-white">
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
                        ? 'border-orange-500 bg-orange-900/20 text-white'
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
              <div className="mb-4 flex items-center justify-between">
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
                  return (
                    <button
                      key={c.name}
                      onClick={() => setSelectedContainer(c.name)}
                      className={`rounded-lg border p-3 text-left transition-all ${
                        selectedContainer === c.name
                          ? 'border-orange-500 bg-orange-900/20 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="mb-1 text-xs font-bold">{c.name}</div>
                      <div className="text-[10px] opacity-70">
                        Cap: <span className="font-mono">{cap}</span> m³ ·{' '}
                        <span className="font-mono">{c.maxWeightKg / 1000}</span> t
                      </div>
                    </button>
                  );
                })}
              </div>
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
              {!recommendedContainer && totals.totalCbm > 0 && (
                <p className="mt-3 text-[11px] text-red-400">
                  ↳ This shipment exceeds even the largest single container — you&apos;ll need
                  multiple containers or to split the load.
                </p>
              )}
            </div>
          </div>

          {/* RIGHT — analytics */}
          <div className="space-y-6 lg:col-span-5">
            {/* Headline */}
            <div className="relative overflow-hidden rounded-2xl border border-orange-800/40 bg-gradient-to-br from-orange-900/50 to-slate-900 p-8 shadow-2xl">
              <div className="absolute right-4 top-4 opacity-10">
                <Anchor className="h-32 w-32 text-white" />
              </div>
              <div className="relative z-10">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-orange-300">
                  Total shipment volume
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-extrabold text-white">
                    {totals.totalCbm.toFixed(2)}
                  </span>
                  <span className="text-xl text-orange-300">m³</span>
                </div>
                <p className="mt-1 text-[11px] text-orange-200/70">
                  {totals.totalCartons.toLocaleString('en-IN')} cartons across {items.length} SKU
                  {items.length === 1 ? '' : 's'}
                </p>

                <div className="mt-8 grid grid-cols-2 gap-8 border-t border-white/10 pt-6">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-orange-300">
                      <Scale className="h-4 w-4" /> Gross weight
                    </div>
                    <p className="font-mono text-2xl font-bold text-white">
                      {totals.totalWeight.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      <span className="ml-1 text-sm">kg</span>
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-orange-300">
                      <Truck className="h-4 w-4" /> Chargeable
                    </div>
                    <p className="font-mono text-2xl font-bold text-white">
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

            {/* Volume utilization */}
            <UtilizationCard
              title="Volume utilization"
              subtitle={`${selectedContainer} · ${
                useLoadableCbm ? 'loadable' : 'nominal'
              } CBM (${(useLoadableCbm ? container.loadableCbm : container.nominalCbm).toFixed(1)} m³)`}
              percent={totals.volumeUtilPct}
              bottleneck={totals.bottleneck === 'volume'}
            />

            {/* Weight utilization */}
            <UtilizationCard
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
            <GuideCard
              tone="orange"
              icon={<BarChart3 className="h-5 w-5 text-orange-400" />}
              title="Why calculate CBM?"
            >
              Sea LCL forwarders charge by CBM. For FCL you pay a flat rate, so aim for 85–95%
              utilization to minimize cost per unit. Below that you&apos;re paying for air.
            </GuideCard>

            <GuideCard
              tone="emerald"
              icon={<Truck className="h-5 w-5 text-emerald-400" />}
              title="Volumetric vs gross"
            >
              Air and express carriers bill the <b>higher</b> of gross weight and volumetric. A
              feather pillow ships as if it weighed 30 kg. Switch the divisor above to match your
              carrier — they don&apos;t all use the same ratio.
            </GuideCard>

            <GuideCard
              tone="slate"
              icon={<Info className="h-5 w-5 text-slate-300" />}
              title="Loadable vs nominal CBM"
            >
              A 20ft has 33.2 m³ on paper but you rarely stuff more than ~28 m³ once you account
              for stacking gaps, pallets, and dunnage. The &ldquo;Use realistic loadable CBM&rdquo;
              toggle gives you the honest number.
            </GuideCard>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Manifest row
──────────────────────────────────────────────── */

function ManifestRow({
  item,
  cbmPerCarton,
  totalCbm,
  canRemove,
  onChange,
  onRemove,
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
              className="cursor-pointer text-slate-500 hover:text-red-400 md:hidden"
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
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white outline-none focus:border-orange-500"
        />
      </div>

      <div className="grid flex-1 grid-cols-5 gap-2">
        <DimInput
          label="L"
          value={item.length}
          onChange={(v) => onChange(item.id, 'length', v)}
        />
        <DimInput
          label="W"
          value={item.width}
          onChange={(v) => onChange(item.id, 'width', v)}
        />
        <DimInput
          label="H"
          value={item.height}
          onChange={(v) => onChange(item.id, 'height', v)}
        />
        <DimInput
          label="kg/box"
          value={item.weight}
          onChange={(v) => onChange(item.id, 'weight', v)}
        />
        <div>
          <label className="mb-1 block text-[10px] font-bold text-orange-400">Qty</label>
          <input
            type="number"
            min="0"
            value={item.qty}
            onChange={(e) =>
              onChange(item.id, 'qty', safeNum(e.target.value))
            }
            className="w-full rounded border border-orange-800 bg-orange-900/20 p-1.5 text-center text-sm font-bold text-white outline-none focus:border-orange-500"
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
          className="hidden p-2 text-slate-600 hover:text-red-400 md:block"
          aria-label="Remove"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function DimInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-slate-500">{label}</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-center text-sm text-white outline-none focus:border-orange-500"
      />
    </div>
  );
}

/* ────────────────────────────────────────────────
   Utilization card (reused for volume + weight)
──────────────────────────────────────────────── */

function UtilizationCard({
  title,
  subtitle,
  percent,
  bottleneck,
}: {
  title: string;
  subtitle: string;
  percent: number;
  bottleneck: boolean;
}) {
  const tone =
    percent > 100 ? 'red' : percent >= 85 ? 'emerald' : percent >= 65 ? 'orange' : 'slate';

  const barColor = {
    red: 'bg-red-500',
    emerald: 'bg-emerald-500',
    orange: 'bg-orange-500',
    slate: 'bg-slate-500',
  }[tone];

  const textColor = {
    red: 'text-red-400',
    emerald: 'text-emerald-400',
    orange: 'text-orange-400',
    slate: 'text-slate-400',
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
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            {title}
            {bottleneck && (
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-orange-300">
                Bottleneck
              </span>
            )}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`font-mono text-2xl font-bold ${textColor}`}>{percent.toFixed(1)}%</div>
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

/* ────────────────────────────────────────────────
   Guide card + Footer
──────────────────────────────────────────────── */

function GuideCard({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'orange' | 'emerald' | 'slate';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const bg = {
    orange: 'bg-orange-500/10',
    emerald: 'bg-emerald-500/10',
    slate: 'bg-slate-500/10',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
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