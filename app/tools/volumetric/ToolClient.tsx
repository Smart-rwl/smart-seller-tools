'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  UploadCloud,
  Download,
  Database,
  Zap,
  Save,
  BookOpen,
  PieChart,
  Activity,
  Plus,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  X,
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

const STORAGE_KEY = 'bulk-scenario:state:v1';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type ProductRow = {
  id: string;
  sku: string;
  cost: number;
  price: number;
  monthlySales: number;
  fees: number;
};

type EditableField = 'sku' | 'cost' | 'price' | 'monthlySales' | 'fees';

type SortKey = 'sku' | 'currentProfit' | 'newProfit' | 'profitDiff' | 'profitDiffPct';
type SortDir = 'asc' | 'desc';

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

const newRowId = () => `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const generateInitialData = (): ProductRow[] => [
  { id: newRowId(), sku: 'WRL-HEADPHONE-01', cost: 500,  price: 1500, monthlySales: 120, fees: 400 },
  { id: newRowId(), sku: 'SMART-WATCH-X',    cost: 1200, price: 3500, monthlySales: 45,  fees: 800 },
  { id: newRowId(), sku: 'USB-C-CABLE-2M',   cost: 80,   price: 399,  monthlySales: 800, fees: 120 },
  { id: newRowId(), sku: 'GAMING-MOUSE-RGB', cost: 450,  price: 1200, monthlySales: 150, fees: 350 },
  { id: newRowId(), sku: 'LAPTOP-STAND-ALU', cost: 600,  price: 1800, monthlySales: 90,  fees: 500 },
];

/* ─── CSV parsing (no Papa Parse) ─── */
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let curr = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && line[i + 1] === '"') { curr += '"'; i++; continue; }
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { out.push(curr); curr = ''; continue; }
    curr += c;
  }
  out.push(curr);
  return out.map((s) => s.trim());
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const vals = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return row;
  });
}

const COL_KEYS = {
  sku:    ['sku', 'product', 'asin', 'item', 'name', 'product code'],
  cost:   ['cost', 'unit cost', 'unitcost', 'landed cost', 'cogs', 'buying cost'],
  price:  ['price', 'selling price', 'sell price', 'msrp', 'listing price'],
  volume: ['monthly sales', 'monthlysales', 'sales', 'units', 'volume', 'monthly volume', 'units sold'],
  fees:   ['fees', 'fee', 'marketplace fees', 'commission', 'platform fees'],
};

function pickField(row: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) if (row[k] !== undefined && row[k] !== '') return row[k];
  return undefined;
}

function rowsFromCsv(parsed: Record<string, string>[]): { rows: ProductRow[]; skipped: number } {
  let skipped = 0;
  const rows: ProductRow[] = [];
  for (const r of parsed) {
    const sku = pickField(r, COL_KEYS.sku);
    if (!sku) { skipped++; continue; }
    rows.push({
      id: newRowId(),
      sku: sku.trim(),
      cost:         safeNum(pickField(r, COL_KEYS.cost) ?? ''),
      price:        safeNum(pickField(r, COL_KEYS.price) ?? ''),
      monthlySales: safeNum(pickField(r, COL_KEYS.volume) ?? ''),
      fees:         safeNum(pickField(r, COL_KEYS.fees) ?? ''),
    });
  }
  return { rows, skipped };
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const csvEscape = (s: string): string =>
  /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function BulkScenarioPlanner() {
  const [products, setProducts] = useState<ProductRow[]>(generateInitialData());

  // Modifiers
  const [priceMod, setPriceMod]     = useState(0);
  const [costMod, setCostMod]       = useState(0);
  const [feeMod, setFeeMod]         = useState(0);
  const [volumeMod, setVolumeMod]   = useState(0);
  const [elasticity, setElasticity] = useState(1.5);

  // UI state
  const [currency, setCurrency]         = useState<CurrencyCode>('INR');
  const [sortKey, setSortKey]           = useState<SortKey>('profitDiff');
  const [sortDir, setSortDir]           = useState<SortDir>('desc');
  const [editingCell, setEditingCell]   = useState<{ rowId: string; field: EditableField } | null>(null);
  const [toast, setToast]               = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  const [hydrated, setHydrated]         = useState(false);

  const csvInputRef = useRef<HTMLInputElement>(null);

  /* ── Hydrate from localStorage ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.products) && s.products.length > 0) setProducts(s.products);
        if (typeof s.priceMod   === 'number') setPriceMod(s.priceMod);
        if (typeof s.costMod    === 'number') setCostMod(s.costMod);
        if (typeof s.feeMod     === 'number') setFeeMod(s.feeMod);
        if (typeof s.volumeMod  === 'number') setVolumeMod(s.volumeMod);
        if (typeof s.elasticity === 'number') setElasticity(s.elasticity);
        if (typeof s.currency   === 'string') setCurrency(s.currency as CurrencyCode);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        products, priceMod, costMod, feeMod, volumeMod, elasticity, currency,
      }));
    } catch { /* ignore */ }
  }, [hydrated, products, priceMod, costMod, feeMod, volumeMod, elasticity, currency]);

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Compute scenario ── */
  const analytics = useMemo(() => {
    let currentRevenue = 0, currentProfit = 0, newRevenue = 0, newProfit = 0;

    const rows = products.map((p) => {
      const curMargin = p.price - p.cost - p.fees;
      const curTotal = curMargin * p.monthlySales;

      const newPrice = p.price * (1 + priceMod / 100);
      const newCost  = p.cost  * (1 + costMod / 100);
      const newFees  = p.fees  * (1 + feeMod / 100);

      // Clean elasticity math: price up → volume down. volumeMod is the manual extra.
      const elasticityLiftPct = -priceMod * elasticity;
      const totalVolChangePct = elasticityLiftPct + volumeMod;
      const newVolume = Math.max(0, Math.round(p.monthlySales * (1 + totalVolChangePct / 100)));

      const newMargin = newPrice - newCost - newFees;
      const newTotal  = newMargin * newVolume;

      currentRevenue += p.price * p.monthlySales;
      currentProfit  += curTotal;
      newRevenue     += newPrice * newVolume;
      newProfit      += newTotal;

      return {
        ...p,
        newPrice, newCost, newFees, newVolume,
        curMargin, newMargin,
        curTotalProfit: curTotal,
        newTotalProfit: newTotal,
        profitDiff: newTotal - curTotal,
        profitDiffPct: curTotal !== 0 ? ((newTotal - curTotal) / Math.abs(curTotal)) * 100 : 0,
      };
    });

    const growth = currentProfit !== 0
      ? ((newProfit - currentProfit) / Math.abs(currentProfit)) * 100
      : 0;

    return { currentRevenue, currentProfit, newRevenue, newProfit, simulatedRows: rows, growth };
  }, [products, priceMod, costMod, feeMod, volumeMod, elasticity]);

  /* ── Sorted rows ── */
  const sortedRows = useMemo(() => {
    const copy = [...analytics.simulatedRows];
    copy.sort((a, b) => {
      const A = sortKey === 'sku' ? a.sku.toLowerCase() : (a as any)[sortKey] ?? 0;
      const B = sortKey === 'sku' ? b.sku.toLowerCase() : (b as any)[sortKey] ?? 0;
      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return copy;
  }, [analytics.simulatedRows, sortKey, sortDir]);

  /* ── Winners / Losers ── */
  const { winners, losers } = useMemo(() => {
    const sorted = [...analytics.simulatedRows].sort((a, b) => b.profitDiff - a.profitDiff);
    return {
      winners: sorted.filter((r) => r.profitDiff > 0).slice(0, 4),
      losers:  sorted.filter((r) => r.profitDiff < 0).slice(-4).reverse(),
    };
  }, [analytics.simulatedRows]);

  /* ── Row mutations ── */
  const updateField = useCallback((rowId: string, field: EditableField, value: string | number) => {
    setProducts((curr) => curr.map((p) => {
      if (p.id !== rowId) return p;
      if (field === 'sku') return { ...p, sku: String(value) };
      return { ...p, [field]: safeNum(value) };
    }));
  }, []);

  const addRow = () => {
    const r: ProductRow = { id: newRowId(), sku: 'NEW-SKU', cost: 0, price: 0, monthlySales: 0, fees: 0 };
    setProducts((curr) => [...curr, r]);
    setEditingCell({ rowId: r.id, field: 'sku' });
  };

  const deleteRow = (rowId: string) => {
    setProducts((curr) => curr.filter((p) => p.id !== rowId));
  };

  /* ── Sort toggle ── */
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir(key === 'sku' ? 'asc' : 'desc'); }
  };

  /* ── CSV import ── */
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result ?? '');
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setToast({ msg: 'CSV is empty or unreadable', kind: 'err' });
          return;
        }
        const { rows, skipped } = rowsFromCsv(parsed);
        if (rows.length === 0) {
          setToast({ msg: 'No valid rows — header must include SKU column', kind: 'err' });
          return;
        }
        setProducts(rows);
        setToast({
          msg: `Imported ${rows.length} SKU${rows.length > 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}`,
          kind: 'ok',
        });
      } catch (err) {
        setToast({ msg: `Parse error: ${err instanceof Error ? err.message : 'unknown'}`, kind: 'err' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* ── CSV export ── */
  const handleExport = () => {
    const headers = [
      'SKU', 'Cost', 'Price', 'Monthly Sales', 'Fees',
      'Projected Price', 'Projected Volume', 'Current Profit', 'Projected Profit', 'Profit Change',
    ];
    const rows = analytics.simulatedRows.map((r) => [
      csvEscape(r.sku),
      r.cost, r.price, r.monthlySales, r.fees,
      Math.round(r.newPrice), r.newVolume,
      Math.round(r.curTotalProfit), Math.round(r.newTotalProfit), Math.round(r.profitDiff),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    downloadCsv(`scenario-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setToast({ msg: `Exported ${rows.length} rows`, kind: 'ok' });
  };

  /* ── Save / Load (manual snapshots beyond auto-persist) ── */
  const saveSnapshot = () => {
    try {
      const snap = { products, priceMod, costMod, feeMod, volumeMod, elasticity, currency, savedAt: Date.now() };
      localStorage.setItem(`${STORAGE_KEY}:snapshot`, JSON.stringify(snap));
      setToast({ msg: 'Scenario saved', kind: 'ok' });
    } catch {
      setToast({ msg: 'Save failed (storage full?)', kind: 'err' });
    }
  };
  const loadSnapshot = () => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY}:snapshot`);
      if (!raw) { setToast({ msg: 'No saved scenario found', kind: 'err' }); return; }
      const s = JSON.parse(raw);
      if (Array.isArray(s.products)) setProducts(s.products);
      setPriceMod(s.priceMod ?? 0); setCostMod(s.costMod ?? 0);
      setFeeMod(s.feeMod ?? 0); setVolumeMod(s.volumeMod ?? 0);
      setElasticity(s.elasticity ?? 1.5);
      if (s.currency) setCurrency(s.currency);
      setToast({ msg: 'Scenario loaded', kind: 'ok' });
    } catch {
      setToast({ msg: 'Load failed', kind: 'err' });
    }
  };

  const resetModifiers = () => {
    setPriceMod(0); setCostMod(0); setFeeMod(0); setVolumeMod(0);
    setToast({ msg: 'Modifiers reset', kind: 'ok' });
  };

  const fmt = (n: number) => formatCurrency(n, currency);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-orange-500" />
              Scenario Planning Console
            </h1>
            <p className="text-slate-400 mt-1">Run "what-if" simulations on your entire product portfolio.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CurrencyPicker value={currency} onChange={setCurrency} />
            <button
              onClick={() => csvInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm border border-slate-800 text-slate-200 transition"
            >
              <UploadCloud className="w-4 h-4" /> Import CSV
            </button>
            <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleCsvUpload} />
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm border border-slate-800 text-slate-200 transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={loadSnapshot}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sm border border-slate-800 text-slate-200 transition"
              title="Load last saved scenario"
            >
              <BookOpen className="w-4 h-4" /> Load
            </button>
            <button
              onClick={saveSnapshot}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-bold transition shadow-lg shadow-orange-900/30"
            >
              <Save className="w-4 h-4" /> Save Scenario
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ─── LEFT: CONTROL PANEL ─── */}
          <div className="lg:col-span-4 space-y-6">

            {/* Modifiers */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-orange-400" /> Global modifiers
                </h2>
                <button
                  onClick={resetModifiers}
                  className="text-[11px] text-slate-500 hover:text-orange-400 flex items-center gap-1 transition"
                  title="Reset all modifiers to 0"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              </div>

              <div className="space-y-7">
                <ModifierSlider
                  label="Selling price"
                  value={priceMod} onChange={setPriceMod}
                  min={-50} max={50}
                  hint={priceMod === 0 ? 'No change' : priceMod < 0 ? 'Discount across portfolio' : 'Hike across portfolio'}
                />
                <ModifierSlider
                  label="Supplier cost"
                  value={costMod} onChange={setCostMod}
                  min={-30} max={50}
                  hint={costMod === 0 ? 'No change' : costMod < 0 ? 'Negotiated lower cost' : 'Cost increase'}
                  invertColor
                />
                <ModifierSlider
                  label="Marketplace fees"
                  value={feeMod} onChange={setFeeMod}
                  min={-20} max={50}
                  hint={feeMod === 0 ? 'No change' : 'Fee structure change'}
                  invertColor
                />
                <ModifierSlider
                  label="Manual volume lift"
                  value={volumeMod} onChange={setVolumeMod}
                  min={-50} max={100}
                  step={5}
                  hint="Marketing push, seasonality, etc. — on top of elasticity"
                />
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <label className="text-slate-400">Price elasticity</label>
                    <span className="font-mono font-bold text-white">{elasticity.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range" min={0.2} max={3.5} step={0.1}
                    value={elasticity}
                    onChange={(e) => setElasticity(Number(e.target.value))}
                    className="w-full accent-orange-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 mt-2">
                    Auto-applied. {priceMod !== 0 && (
                      <>Currently translates {priceMod > 0 ? '+' : ''}{priceMod}% price → {(-priceMod * elasticity).toFixed(0)}% volume.</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Impact summary */}
            <ImpactCard analytics={analytics} fmt={fmt} />

            {/* Winners / Losers diverging bars */}
            {(winners.length > 0 || losers.length > 0) && (
              <WinnersLosersChart winners={winners} losers={losers} fmt={fmt} />
            )}
          </div>

          {/* ─── RIGHT: SKU TABLE ─── */}
          <div className="lg:col-span-8">
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/30">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-orange-400" /> SKU analysis
                  <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full ml-1">
                    {products.length} {products.length === 1 ? 'SKU' : 'SKUs'}
                  </span>
                </h2>
                <button
                  onClick={addRow}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-lg font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add SKU
                </button>
              </div>

              <SkuTable
                rows={sortedRows}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                updateField={updateField}
                deleteRow={deleteRow}
                fmt={fmt}
              />

              {products.length === 0 && (
                <div className="p-12 text-center">
                  <Database className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 mb-4">No products loaded. Import a CSV or add one manually.</p>
                  <button
                    onClick={addRow}
                    className="text-xs px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-lg font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add first SKU
                  </button>
                </div>
              )}
            </div>

            {/* CSV format hint */}
            <p className="text-[11px] text-slate-600 mt-3 px-1">
              CSV import looks for columns: <span className="font-mono text-slate-500">sku, cost, price, monthly sales, fees</span> (any order, case-insensitive).
            </p>
          </div>
        </div>

        {/* ─── STRATEGY GUIDE ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-slate-800">
          <GuideCard
            icon={<Zap className="w-5 h-5 text-orange-400" />}
            title="Find the sweet spot"
            body={<>Lowering price 5% can lift volume 10% at 2.0× elasticity — yielding higher total profit despite lower margins. Slide and watch the green delta to find it.</>}
          />
          <GuideCard
            icon={<BookOpen className="w-5 h-5 text-orange-400" />}
            title="When to use this"
            body={<>
              <b>Before a sale:</b> simulate a 20% portfolio-wide discount.<br />
              <b>Fee hikes:</b> if the marketplace raises fees 2%, find out who breaks even.<br />
              <b>Currency shifts:</b> model 10% supplier cost moves.
            </>}
          />
          <GuideCard
            icon={<PieChart className="w-5 h-5 text-orange-400" />}
            title="Think portfolio, not SKU"
            body={<>One product losing money is fine if it drives traffic to higher-margin items. The <b>net total</b> on the impact card tells you whether the portfolio wins, not any single row.</>}
          />
        </div>

        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-2 text-sm font-medium z-50 animate-[slideIn_0.2s_ease-out] border ${
            toast.kind === 'ok'
              ? 'bg-slate-900 border-emerald-500/40 text-white shadow-emerald-900/30'
              : 'bg-slate-900 border-rose-500/40 text-white shadow-rose-900/30'
          }`}>
            {toast.kind === 'ok'
              ? <Check className="w-4 h-4 text-emerald-400" />
              : <AlertTriangle className="w-4 h-4 text-rose-400" />}
            {toast.msg}
          </div>
        )}
        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

function ModifierSlider({
  label, value, onChange, min, max, step = 1, hint, invertColor = false,
}: {
  label: string; value: number; onChange: (n: number) => void;
  min: number; max: number; step?: number; hint?: string; invertColor?: boolean;
}) {
  // For cost/fees, positive is bad (red); for price/volume, positive is good (green)
  const goodColor = 'text-emerald-400';
  const badColor = 'text-rose-400';
  const valueColor = value === 0 ? 'text-slate-500'
    : value > 0 ? (invertColor ? badColor : goodColor)
    : (invertColor ? goodColor : badColor);

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <label className="text-slate-400">{label}</label>
        <span className={`font-mono font-bold ${valueColor}`}>
          {value > 0 ? '+' : ''}{value}%
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-orange-500 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
      />
      {hint && <p className="text-[10px] text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
}

function ImpactCard({
  analytics, fmt,
}: {
  analytics: { currentProfit: number; newProfit: number; growth: number; currentRevenue: number; newRevenue: number };
  fmt: (n: number) => string;
}) {
  const positive = analytics.growth >= 0;
  const tone = positive
    ? { bg: 'bg-emerald-950/30',   border: 'border-emerald-500/30', accent: 'text-emerald-400' }
    : { bg: 'bg-rose-950/30',      border: 'border-rose-500/30',    accent: 'text-rose-400' };

  const revenueDelta = analytics.newRevenue - analytics.currentRevenue;

  return (
    <div className={`rounded-xl p-6 border transition-all ${tone.bg} ${tone.border}`}>
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2">Projected net change</h3>
      <div className="flex items-center gap-3">
        <span className={`text-4xl font-extrabold font-mono ${tone.accent}`}>
          {analytics.growth >= 0 ? '+' : ''}{analytics.growth.toFixed(1)}%
        </span>
        {positive
          ? <ArrowUpRight className="text-emerald-500 w-7 h-7" />
          : <ArrowDownRight className="text-rose-500 w-7 h-7" />}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Current profit</span>
          <span className="font-mono text-slate-200">{fmt(analytics.currentProfit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Projected profit</span>
          <span className={`font-mono font-bold ${tone.accent}`}>{fmt(analytics.newProfit)}</span>
        </div>
        <div className="flex justify-between pt-2 mt-2 border-t border-white/10">
          <span className="text-slate-500 text-xs">Revenue change</span>
          <span className={`font-mono text-xs ${revenueDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {revenueDelta >= 0 ? '+' : ''}{fmt(revenueDelta)}
          </span>
        </div>
      </div>
    </div>
  );
}

function WinnersLosersChart({
  winners, losers, fmt,
}: {
  winners: { id: string; sku: string; profitDiff: number }[];
  losers:  { id: string; sku: string; profitDiff: number }[];
  fmt: (n: number) => string;
}) {
  const allBars = [...winners, ...losers];
  const maxAbs = Math.max(1, ...allBars.map((r) => Math.abs(r.profitDiff)));
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-orange-400" /> Top movers
      </h3>

      {winners.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mb-2">Winners</div>
          <div className="space-y-1.5">
            {winners.map((r) => (
              <BarRow key={r.id} sku={r.sku} value={r.profitDiff} maxAbs={maxAbs} positive fmt={fmt} />
            ))}
          </div>
        </div>
      )}

      {losers.length > 0 && (
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-400/80 mb-2">Losers</div>
          <div className="space-y-1.5">
            {losers.map((r) => (
              <BarRow key={r.id} sku={r.sku} value={r.profitDiff} maxAbs={maxAbs} positive={false} fmt={fmt} />
            ))}
          </div>
        </div>
      )}

      {winners.length === 0 && losers.length === 0 && (
        <p className="text-[11px] text-slate-500">Move a slider to see who's affected.</p>
      )}
    </div>
  );
}

function BarRow({
  sku, value, maxAbs, positive, fmt,
}: {
  sku: string; value: number; maxAbs: number; positive: boolean; fmt: (n: number) => string;
}) {
  const pct = (Math.abs(value) / maxAbs) * 100;
  const fill = positive ? 'bg-emerald-500/60' : 'bg-rose-500/60';
  const text = positive ? 'text-emerald-300' : 'text-rose-300';

  return (
    <div className="grid grid-cols-[1fr_60px] gap-2 items-center">
      <div className="relative h-5 bg-slate-950 rounded border border-slate-800 overflow-hidden">
        <div className={`absolute top-0 left-0 bottom-0 ${fill}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center px-2 text-[11px] font-mono text-white truncate">
          {sku}
        </span>
      </div>
      <span className={`text-[11px] font-mono font-bold text-right ${text}`}>
        {value >= 0 ? '+' : ''}{fmt(value)}
      </span>
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
        className="flex items-center gap-2 text-sm px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-200 transition"
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
   TABLE + EDITABLE CELL
───────────────────────────────────────────── */
function SkuTable({
  rows, sortKey, sortDir, onSort, editingCell, setEditingCell, updateField, deleteRow, fmt,
}: {
  rows: any[];
  sortKey: SortKey; sortDir: SortDir;
  onSort: (k: SortKey) => void;
  editingCell: { rowId: string; field: EditableField } | null;
  setEditingCell: (c: { rowId: string; field: EditableField } | null) => void;
  updateField: (id: string, field: EditableField, value: string | number) => void;
  deleteRow: (id: string) => void;
  fmt: (n: number) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-400">
        <thead className="bg-slate-950 text-xs uppercase font-bold text-slate-500">
          <tr>
            <SortableTh label="SKU"            sortKey="sku"           current={sortKey} dir={sortDir} onSort={onSort} className="px-4 py-3" />
            <th className="px-4 py-3 text-right">Cost</th>
            <th className="px-4 py-3 text-right">Price</th>
            <th className="px-4 py-3 text-right">Volume</th>
            <th className="px-4 py-3 text-right">Fees</th>
            <SortableTh label="Projected"      sortKey="newProfit"     current={sortKey} dir={sortDir} onSort={onSort} className="px-4 py-3 text-right" align="right" />
            <SortableTh label="Δ"              sortKey="profitDiff"    current={sortKey} dir={sortDir} onSort={onSort} className="px-4 py-3 text-right" align="right" />
            <th className="px-2 py-3 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-800/40 transition group">
              <td className="px-4 py-2.5 font-medium">
                <EditableCell
                  rowId={row.id} field="sku" type="text" value={row.sku}
                  editingCell={editingCell} setEditingCell={setEditingCell}
                  updateField={updateField}
                  display={<span className="text-slate-200 font-mono text-xs">{row.sku}</span>}
                />
              </td>
              <td className="px-4 py-2.5 text-right">
                <EditableCell
                  rowId={row.id} field="cost" type="number" value={row.cost}
                  editingCell={editingCell} setEditingCell={setEditingCell}
                  updateField={updateField}
                  display={<span className="text-slate-400 font-mono text-xs">{fmt(row.cost)}</span>}
                />
              </td>
              <td className="px-4 py-2.5 text-right">
                <EditableCell
                  rowId={row.id} field="price" type="number" value={row.price}
                  editingCell={editingCell} setEditingCell={setEditingCell}
                  updateField={updateField}
                  display={<span className="text-slate-300 font-mono text-xs">{fmt(row.price)}</span>}
                />
              </td>
              <td className="px-4 py-2.5 text-right">
                <EditableCell
                  rowId={row.id} field="monthlySales" type="number" value={row.monthlySales}
                  editingCell={editingCell} setEditingCell={setEditingCell}
                  updateField={updateField}
                  display={
                    <span className="font-mono text-xs">
                      <span className="text-slate-500">{row.monthlySales}</span>
                      {row.newVolume !== row.monthlySales && (
                        <span className={`ml-1.5 ${row.newVolume > row.monthlySales ? 'text-emerald-400' : 'text-rose-400'}`}>
                          → {row.newVolume}
                        </span>
                      )}
                    </span>
                  }
                />
              </td>
              <td className="px-4 py-2.5 text-right">
                <EditableCell
                  rowId={row.id} field="fees" type="number" value={row.fees}
                  editingCell={editingCell} setEditingCell={setEditingCell}
                  updateField={updateField}
                  display={<span className="text-slate-400 font-mono text-xs">{fmt(row.fees)}</span>}
                />
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-xs">
                <div className={`font-bold ${row.newTotalProfit > row.curTotalProfit ? 'text-emerald-400' : row.newTotalProfit < row.curTotalProfit ? 'text-rose-400' : 'text-slate-200'}`}>
                  {fmt(row.newTotalProfit)}
                </div>
                <div className="text-[10px] text-slate-500">was {fmt(row.curTotalProfit)}</div>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className={`font-bold font-mono text-xs ${row.profitDiff > 0 ? 'text-emerald-400' : row.profitDiff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {row.profitDiff > 0 ? '+' : ''}{fmt(row.profitDiff)}
                </div>
                {row.curTotalProfit !== 0 && (
                  <div className={`text-[10px] ${row.profitDiff > 0 ? 'text-emerald-500/70' : row.profitDiff < 0 ? 'text-rose-500/70' : 'text-slate-600'}`}>
                    {row.profitDiff > 0 ? '+' : ''}{row.profitDiffPct.toFixed(0)}%
                  </div>
                )}
              </td>
              <td className="px-2 py-2.5 text-center">
                <button
                  onClick={() => deleteRow(row.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                  title={`Delete ${row.sku}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableTh({
  label, sortKey, current, dir, onSort, className = '', align = 'left',
}: {
  label: string; sortKey: SortKey;
  current: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void;
  className?: string; align?: 'left' | 'right';
}) {
  const isActive = sortKey === current;
  return (
    <th className={className}>
      <button
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 ${align === 'right' ? 'justify-end ml-auto' : ''} hover:text-orange-400 transition ${isActive ? 'text-orange-400' : ''}`}
      >
        {label}
        {isActive && (dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </button>
    </th>
  );
}

function EditableCell({
  rowId, field, type, value, editingCell, setEditingCell, updateField, display,
}: {
  rowId: string; field: EditableField;
  type: 'text' | 'number';
  value: string | number;
  editingCell: { rowId: string; field: EditableField } | null;
  setEditingCell: (c: { rowId: string; field: EditableField } | null) => void;
  updateField: (id: string, field: EditableField, value: string | number) => void;
  display: React.ReactNode;
}) {
  const isEditing = editingCell?.rowId === rowId && editingCell?.field === field;

  if (isEditing) {
    return (
      <input
        autoFocus
        type={type}
        defaultValue={type === 'number' && value === 0 ? '' : String(value)}
        onBlur={(e) => {
          updateField(rowId, field, type === 'number' ? safeNum(e.target.value) : e.target.value);
          setEditingCell(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') { setEditingCell(null); }
        }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-slate-950 border border-orange-500 rounded px-2 py-1 text-white font-mono text-xs text-right focus:outline-none focus:ring-2 focus:ring-orange-500/30"
      />
    );
  }

  return (
    <span
      onClick={() => setEditingCell({ rowId, field })}
      className="inline-block cursor-pointer hover:bg-orange-500/10 hover:ring-1 hover:ring-orange-500/30 px-1.5 py-0.5 rounded transition"
      title="Click to edit"
    >
      {display}
    </span>
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