'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Barcode,
  Copy,
  Trash2,
  Save,
  BookOpen,
  Tag,
  Box,
  Layers,
  Plus,
  X,
  Hash,
  Check,
  Download,
  Search,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  Zap,
  ArrowUp,
  ArrowDown,
  Pencil,
  Wand2,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES & CONSTANTS
───────────────────────────────────────────── */
type ShortenMode = 'full' | 'first2' | 'first3' | 'first4' | 'smart' | 'none';

type Attribute = {
  id: string;
  label: string;
  value: string;
  shorten: ShortenMode;
};

type SkuRecord = {
  id: number;
  sku: string;
  desc: string;
  createdAt: number;
};

type PersistedState = {
  prefix: string;
  prefixShorten: ShortenMode;
  attributes: Attribute[];
  separator: string;
  counterEnabled: boolean;
  counterPad: number;
  counterStart: number;
  history: SkuRecord[];
};

const STORAGE_KEY = 'inventory-architect:state:v2';

const SHORTEN_LABELS: Record<ShortenMode, string> = {
  full:   'Full',
  first2: 'First 2',
  first3: 'First 3',
  first4: 'First 4',
  smart:  'Smart',
  none:   'Raw',
};

const SMART_MAP: Record<string, string> = {
  // Sizes
  EXTRASMALL: 'XS', XSMALL: 'XS', XS: 'XS',
  SMALL: 'S', S: 'S',
  MEDIUM: 'M', M: 'M', MED: 'M',
  LARGE: 'L', L: 'L',
  EXTRALARGE: 'XL', XLARGE: 'XL', XL: 'XL',
  XXLARGE: 'XXL', XXL: 'XXL', '2XL': 'XXL',
  XXXL: 'XXXL', '3XL': 'XXXL',
  // Colors
  BLACK: 'BLK', WHITE: 'WHT',
  RED: 'RED', BLUE: 'BLU', GREEN: 'GRN', YELLOW: 'YLW',
  ORANGE: 'ORG', PURPLE: 'PRP', PINK: 'PNK', BROWN: 'BRN',
  GRAY: 'GRY', GREY: 'GRY', SILVER: 'SLV', GOLD: 'GLD',
  NAVY: 'NVY', BEIGE: 'BGE', CREAM: 'CRM',
  // Materials
  COTTON: 'COT', POLYESTER: 'POL', WOOL: 'WOL', LEATHER: 'LTH',
  DENIM: 'DNM', SILK: 'SLK', LINEN: 'LIN',
};

const PART_COLORS = [
  { bg: 'bg-indigo-500/10',  text: 'text-indigo-300',  ring: 'ring-indigo-500/30',  dot: 'bg-indigo-500'  },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-300', ring: 'ring-emerald-500/30', dot: 'bg-emerald-500' },
  { bg: 'bg-sky-500/10',     text: 'text-sky-300',     ring: 'ring-sky-500/30',     dot: 'bg-sky-500'     },
  { bg: 'bg-amber-500/10',   text: 'text-amber-300',   ring: 'ring-amber-500/30',   dot: 'bg-amber-500'   },
  { bg: 'bg-rose-500/10',    text: 'text-rose-300',    ring: 'ring-rose-500/30',    dot: 'bg-rose-500'    },
  { bg: 'bg-violet-500/10',  text: 'text-violet-300',  ring: 'ring-violet-500/30',  dot: 'bg-violet-500'  },
  { bg: 'bg-cyan-500/10',    text: 'text-cyan-300',    ring: 'ring-cyan-500/30',    dot: 'bg-cyan-500'    },
  { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-300', ring: 'ring-fuchsia-500/30', dot: 'bg-fuchsia-500' },
  { bg: 'bg-lime-500/10',    text: 'text-lime-300',    ring: 'ring-lime-500/30',    dot: 'bg-lime-500'    },
];

const SAFE_LENGTH = 20;
const MAX_ATTRIBUTES = 8;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function clean(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function applyShorten(value: string, mode: ShortenMode): string {
  const c = clean(value);
  if (!c) return '';
  switch (mode) {
    case 'first2': return c.substring(0, 2);
    case 'first3': return c.substring(0, 3);
    case 'first4': return c.substring(0, 4);
    case 'smart':  return SMART_MAP[c] ?? c.substring(0, 3);
    case 'none':   return value.replace(/\s+/g, '').toUpperCase();
    case 'full':
    default:       return c;
  }
}

function padCounter(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/** Cross-product of arrays: [[a,b],[c,d]] -> [[a,c],[a,d],[b,c],[b,d]] */
function crossProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<T[][]>(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]],
  );
}

function downloadCsv(rows: SkuRecord[]): void {
  const header = 'SKU,Description,Created At\n';
  const body = rows
    .map((r) => {
      const safeDesc = `"${r.desc.replace(/"/g, '""')}"`;
      const iso = new Date(r.createdAt).toISOString();
      return `${r.sku},${safeDesc},${iso}`;
    })
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `skus-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const newAttrId = () => `attr-${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_ATTRIBUTES: Attribute[] = [
  { id: newAttrId(), label: 'Product Type', value: '', shorten: 'first4' },
  { id: newAttrId(), label: 'Color',        value: '', shorten: 'smart'  },
  { id: newAttrId(), label: 'Size',         value: '', shorten: 'smart'  },
];

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function InventoryArchitect() {
  /* ── State ── */
  const [prefix, setPrefix] = useState('');
  const [prefixShorten, setPrefixShorten] = useState<ShortenMode>('first3');
  const [attributes, setAttributes] = useState<Attribute[]>(DEFAULT_ATTRIBUTES);
  const [separator, setSeparator] = useState('-');
  const [history, setHistory] = useState<SkuRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Sequential counter
  const [counterEnabled, setCounterEnabled] = useState(false);
  const [counterPad, setCounterPad] = useState(3);
  const [counterStart, setCounterStart] = useState(1);

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);

  // UI feedback
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  /* ── Load from localStorage on mount ── */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s: Partial<PersistedState> = JSON.parse(raw);
        if (typeof s.prefix === 'string') setPrefix(s.prefix);
        if (s.prefixShorten) setPrefixShorten(s.prefixShorten);
        if (Array.isArray(s.attributes) && s.attributes.length) setAttributes(s.attributes);
        if (typeof s.separator === 'string') setSeparator(s.separator);
        if (typeof s.counterEnabled === 'boolean') setCounterEnabled(s.counterEnabled);
        if (typeof s.counterPad === 'number') setCounterPad(s.counterPad);
        if (typeof s.counterStart === 'number') setCounterStart(s.counterStart);
        if (Array.isArray(s.history)) setHistory(s.history);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist on changes ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      const s: PersistedState = {
        prefix, prefixShorten, attributes, separator,
        counterEnabled, counterPad, counterStart, history,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch { /* ignore */ }
  }, [hydrated, prefix, prefixShorten, attributes, separator, counterEnabled, counterPad, counterStart, history]);

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Decomposed preview parts (single mode, first combination in bulk) ── */
  const decomposedParts = useMemo(() => {
    const parts: { label: string; raw: string; cleaned: string }[] = [];
    if (prefix.trim()) {
      const raw = bulkMode ? prefix.split(',')[0]?.trim() || '' : prefix;
      parts.push({ label: 'Prefix', raw, cleaned: applyShorten(raw, prefixShorten) });
    }
    for (const a of attributes) {
      if (a.value.trim()) {
        const raw = bulkMode ? a.value.split(',')[0]?.trim() || '' : a.value;
        parts.push({ label: a.label, raw, cleaned: applyShorten(raw, a.shorten) });
      }
    }
    return parts.filter((p) => p.cleaned.length > 0);
  }, [prefix, prefixShorten, attributes, bulkMode]);

  /* ── Final single-mode SKU preview ── */
  const previewSku = useMemo(() => {
    const base = decomposedParts.map((p) => p.cleaned).join(separator);
    if (counterEnabled && base) {
      return `${base}${separator}${padCounter(counterStart, counterPad)}`;
    }
    return base;
  }, [decomposedParts, separator, counterEnabled, counterPad, counterStart]);

  /* ── Bulk: per-attribute parsed value lists ── */
  const bulkLists = useMemo(() => {
    if (!bulkMode) return null;
    const prefixList = prefix.split(',').map((s) => s.trim()).filter(Boolean);
    const attrLists = attributes.map((a) => ({
      attr: a,
      values: a.value.split(',').map((s) => s.trim()).filter(Boolean),
    }));
    return { prefixList, attrLists };
  }, [bulkMode, prefix, attributes]);

  /* ── Bulk: how many combinations will we generate? ── */
  const bulkCount = useMemo(() => {
    if (!bulkLists) return 0;
    const dims: number[] = [];
    if (bulkLists.prefixList.length) dims.push(bulkLists.prefixList.length);
    for (const a of bulkLists.attrLists) {
      if (a.values.length > 0) dims.push(a.values.length);
    }
    if (dims.length === 0) return 0;
    return dims.reduce((a, b) => a * b, 1);
  }, [bulkLists]);

  /* ── Length warning ── */
  const isLong = previewSku.length > SAFE_LENGTH;

  /* ── Actions ── */
  const updateAttr = (id: string, patch: Partial<Attribute>) => {
    setAttributes((curr) => curr.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const addAttribute = () => {
    if (attributes.length >= MAX_ATTRIBUTES) return;
    setAttributes((curr) => [
      ...curr,
      { id: newAttrId(), label: `Attribute ${curr.length + 1}`, value: '', shorten: 'first3' },
    ]);
  };

  const removeAttribute = (id: string) => {
    setAttributes((curr) => curr.filter((a) => a.id !== id));
  };

  const moveAttribute = (id: string, dir: -1 | 1) => {
    setAttributes((curr) => {
      const i = curr.findIndex((a) => a.id === id);
      if (i < 0) return curr;
      const j = i + dir;
      if (j < 0 || j >= curr.length) return curr;
      const next = [...curr];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const clearAll = () => {
    setPrefix('');
    setAttributes((curr) => curr.map((a) => ({ ...a, value: '' })));
  };

  const saveSingle = () => {
    if (!previewSku) return;
    const desc = [prefix, ...attributes.map((a) => a.value)]
      .filter(Boolean).join(' ').trim();
    const rec: SkuRecord = {
      id: Date.now(),
      sku: previewSku,
      desc,
      createdAt: Date.now(),
    };
    setHistory((h) => [rec, ...h]);
    if (counterEnabled) setCounterStart((n) => n + 1);
    setAttributes((curr) => curr.map((a) => ({ ...a, value: '' })));
    setToast(`Saved ${previewSku}`);
  };

  const generateBulk = () => {
    if (!bulkLists || bulkCount === 0) return;

    // Build columns: each column is one dimension of values
    type Col = { label: string; values: string[]; shorten: ShortenMode };
    const cols: Col[] = [];
    if (bulkLists.prefixList.length) {
      cols.push({ label: 'Prefix', values: bulkLists.prefixList, shorten: prefixShorten });
    }
    for (const a of bulkLists.attrLists) {
      if (a.values.length > 0) {
        cols.push({ label: a.attr.label, values: a.values, shorten: a.attr.shorten });
      }
    }
    if (cols.length === 0) return;

    const combos = crossProduct(cols.map((c) => c.values));
    const newRecs: SkuRecord[] = [];
    let counter = counterStart;
    const stamp = Date.now();

    combos.forEach((combo, idx) => {
      const parts = combo.map((val, i) => applyShorten(val, cols[i].shorten)).filter(Boolean);
      let sku = parts.join(separator);
      if (counterEnabled) {
        sku = `${sku}${separator}${padCounter(counter, counterPad)}`;
        counter++;
      }
      const desc = combo.join(' ');
      newRecs.push({ id: stamp + idx, sku, desc, createdAt: stamp });
    });

    setHistory((h) => [...newRecs, ...h]);
    if (counterEnabled) setCounterStart(counter);
    setToast(`Generated ${newRecs.length} SKUs`);
  };

  const copyToClipboard = useCallback((text: string, id: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  const deleteFromHistory = (id: number) => {
    setHistory((h) => h.filter((r) => r.id !== id));
  };

  const clearHistory = () => {
    if (history.length === 0) return;
    if (confirm(`Delete all ${history.length} saved SKUs? This cannot be undone.`)) {
      setHistory([]);
    }
  };

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return history;
    return history.filter(
      (r) => r.sku.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q),
    );
  }, [history, historySearch]);

  /* ── Dynamic format display ── */
  const formatDisplay = useMemo(() => {
    const labels: string[] = [];
    if (prefix.trim()) labels.push('BRAND');
    for (const a of attributes) if (a.value.trim()) labels.push(a.label.toUpperCase().replace(/\s+/g, ''));
    if (counterEnabled) labels.push('###');
    return labels.length > 0 ? labels.join(separator || '·') : 'BRAND' + (separator || '·') + 'TYPE' + (separator || '·') + 'VAR';
  }, [prefix, attributes, separator, counterEnabled]);

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* ── HEADER ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Barcode className="w-8 h-8 text-indigo-500" />
              Inventory System Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Generate standardized, readable SKUs at scale — single or bulk variants, with smart shortening.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
              <Layers className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-mono text-slate-300">{formatDisplay}</span>
            </div>
            <div className="flex bg-slate-900 rounded-lg border border-slate-800 p-1">
              <button
                onClick={() => setBulkMode(false)}
                className={`px-3 py-1 text-xs font-bold rounded transition ${!bulkMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Single
              </button>
              <button
                onClick={() => setBulkMode(true)}
                className={`px-3 py-1 text-xs font-bold rounded transition flex items-center gap-1 ${bulkMode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Sparkles className="w-3 h-3" /> Bulk Variants
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ─── LEFT: BUILDER ─── */}
          <div className="lg:col-span-5 space-y-6">

            {/* Components card */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-blue-400" /> SKU Components
                </h3>
                {bulkMode && (
                  <div className="text-[10px] uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded">
                    Comma-separate for variants
                  </div>
                )}
              </div>

              {/* Prefix */}
              <FieldRow
                label="Brand / Category Prefix"
                colorIndex={0}
                value={prefix}
                onChange={setPrefix}
                shorten={prefixShorten}
                onShortenChange={setPrefixShorten}
                placeholder={bulkMode ? 'NIKE, ADIDAS' : 'e.g. NIKE'}
                bulkMode={bulkMode}
              />

              {/* Attributes */}
              <div className="space-y-3 mt-4">
                {attributes.map((attr, i) => (
                  <FieldRow
                    key={attr.id}
                    label={attr.label}
                    colorIndex={i + 1}
                    value={attr.value}
                    onChange={(v) => updateAttr(attr.id, { value: v })}
                    shorten={attr.shorten}
                    onShortenChange={(s) => updateAttr(attr.id, { shorten: s })}
                    placeholder={bulkMode ? 'value1, value2, value3' : `e.g. ${i === 0 ? 'SHIRT' : i === 1 ? 'RED' : 'LARGE'}`}
                    onRename={(newLabel) => updateAttr(attr.id, { label: newLabel })}
                    isEditingLabel={editingLabelId === attr.id}
                    onStartEdit={() => setEditingLabelId(attr.id)}
                    onEndEdit={() => setEditingLabelId(null)}
                    onMoveUp={() => moveAttribute(attr.id, -1)}
                    onMoveDown={() => moveAttribute(attr.id, 1)}
                    onRemove={attributes.length > 1 ? () => removeAttribute(attr.id) : undefined}
                    canMoveUp={i > 0}
                    canMoveDown={i < attributes.length - 1}
                    bulkMode={bulkMode}
                  />
                ))}

                {attributes.length < MAX_ATTRIBUTES && (
                  <button
                    onClick={addAttribute}
                    className="w-full py-2 px-3 border border-dashed border-slate-700 hover:border-indigo-500 hover:bg-indigo-500/5 rounded-lg text-slate-500 hover:text-indigo-300 text-sm flex items-center justify-center gap-2 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add attribute
                  </button>
                )}
              </div>

              {/* Separator */}
              <div className="mt-6 pt-4 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Separator</label>
                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                  {['-', '_', '/', '.', ''].map((sep) => (
                    <button
                      key={sep || 'none'}
                      onClick={() => setSeparator(sep)}
                      className={`flex-1 py-1.5 text-xs font-mono rounded transition ${separator === sep ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                    >
                      {sep === '' ? 'None' : sep}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sequential counter */}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Hash className="w-3 h-3" /> Sequential Counter
                  </label>
                  <Toggle checked={counterEnabled} onChange={setCounterEnabled} />
                </div>
                {counterEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Pad to</label>
                      <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                        {[2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setCounterPad(n)}
                            className={`flex-1 py-1 text-xs font-mono rounded transition ${counterPad === n ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Next #</label>
                      <input
                        type="number"
                        min={0}
                        value={counterStart}
                        onChange={(e) => setCounterStart(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-white font-mono text-center focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {bulkMode ? (
                <button
                  onClick={generateBulk}
                  disabled={bulkCount === 0}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Generate {bulkCount > 0 ? bulkCount : ''} SKU{bulkCount === 1 ? '' : 's'}
                </button>
              ) : (
                <button
                  onClick={saveSingle}
                  disabled={!previewSku}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-lg shadow-indigo-900/20 transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Save to List
                </button>
              )}
              <button
                onClick={clearAll}
                className="px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition"
                title="Clear inputs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── RIGHT: OUTPUT & HISTORY ─── */}
          <div className="lg:col-span-7 space-y-6">

            {/* Live Preview */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 rounded-xl border border-slate-800 p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.04] pointer-events-none">
                <Barcode className="w-48 h-48 text-white" />
              </div>

              <div className="flex items-center justify-between mb-4 relative">
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  {bulkMode ? 'Bulk Preview · First Variant' : 'Live Preview'}
                </p>
                {bulkMode && bulkCount > 0 && (
                  <span className="text-xs bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 px-2.5 py-1 rounded-full font-mono">
                    {bulkCount} combinations
                  </span>
                )}
                {!bulkMode && previewSku && isLong && (
                  <span className="text-xs bg-amber-500/15 border border-amber-500/30 text-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {previewSku.length} chars · long for labels
                  </span>
                )}
              </div>

              {previewSku ? (
                <div className="relative">
                  {/* Decomposed parts */}
                  {decomposedParts.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-6">
                      {decomposedParts.map((p, i) => {
                        const color = PART_COLORS[i % PART_COLORS.length];
                        return (
                          <React.Fragment key={i}>
                            <div className={`${color.bg} ${color.text} ring-1 ${color.ring} rounded-lg px-3 py-2 flex flex-col items-start`}>
                              <span className="text-[9px] uppercase tracking-widest opacity-70 mb-0.5">{p.label}</span>
                              <span className="font-mono font-bold text-sm">{p.cleaned}</span>
                            </div>
                            {i < decomposedParts.length - 1 && (
                              <span className="text-slate-600 font-mono font-bold">{separator || '·'}</span>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {counterEnabled && decomposedParts.length > 0 && (
                        <>
                          <span className="text-slate-600 font-mono font-bold">{separator || '·'}</span>
                          <div className="bg-slate-700/40 text-slate-300 ring-1 ring-slate-600/40 rounded-lg px-3 py-2 flex flex-col items-start">
                            <span className="text-[9px] uppercase tracking-widest opacity-70 mb-0.5">Counter</span>
                            <span className="font-mono font-bold text-sm">{padCounter(counterStart, counterPad)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Joined SKU */}
                  <div className="flex flex-col items-center gap-4">
                    <button
                      onClick={() => copyToClipboard(previewSku, -1)}
                      className="group relative text-4xl md:text-5xl font-mono font-black text-white tracking-tight hover:scale-[1.02] transition-transform cursor-pointer"
                      title="Click to copy"
                    >
                      {previewSku}
                      <span className="absolute -right-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition">
                        {copiedId === -1 ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-slate-500" />}
                      </span>
                    </button>
                    {!bulkMode && (
                      <button
                        onClick={saveSingle}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-sm font-bold shadow-lg shadow-emerald-900/20 transition"
                      >
                        <Save className="w-4 h-4" /> Save to List
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-slate-600">
                  <Wand2 className="w-8 h-8 mb-2 opacity-30" />
                  <div className="font-mono text-sm">Start typing to preview…</div>
                </div>
              )}
            </div>

            {/* History */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col h-[440px]">
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex justify-between items-center gap-3">
                <h3 className="font-bold text-white flex items-center gap-2 shrink-0">
                  <BookOpen className="w-4 h-4 text-slate-400" /> SKU Log
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">{history.length}</span>
                </h3>
                <div className="flex items-center gap-2 flex-1 max-w-[260px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Filter…"
                      className="w-full bg-slate-900 border border-slate-700 rounded pl-8 pr-2 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <button
                    onClick={() => downloadCsv(history)}
                    disabled={history.length === 0}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded text-slate-300 transition"
                    title="Export as CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={clearHistory}
                    disabled={history.length === 0}
                    className="p-1.5 bg-slate-800 hover:bg-rose-900/40 hover:text-rose-400 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-700 rounded text-slate-300 transition"
                    title="Clear all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-2">
                {filteredHistory.length > 0 ? (
                  <div className="space-y-1.5">
                    {filteredHistory.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 hover:bg-slate-800/60 rounded-lg group transition border border-transparent hover:border-slate-700/60">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-white font-bold text-lg truncate">{item.sku}</div>
                          <div className="text-xs text-slate-500 uppercase truncate">{item.desc || '—'}</div>
                        </div>
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                          <button
                            onClick={() => copyToClipboard(item.sku, item.id)}
                            className="p-2 text-slate-500 hover:text-white hover:bg-slate-700/60 rounded transition"
                            title="Copy SKU"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => deleteFromHistory(item.id)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-900/20 rounded transition"
                            title="Delete"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <Box className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">{history.length === 0 ? 'No SKUs saved yet.' : 'No matches.'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-2xl shadow-emerald-900/40 flex items-center gap-2 text-sm font-bold z-50 animate-[slideIn_0.2s_ease-out]">
            <Check className="w-4 h-4" />
            {toast}
          </div>
        )}

        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* ── CREATOR FOOTER ── */}
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
   SUB-COMPONENTS
───────────────────────────────────────────── */

interface FieldRowProps {
  label: string;
  colorIndex: number;
  value: string;
  onChange: (v: string) => void;
  shorten: ShortenMode;
  onShortenChange: (s: ShortenMode) => void;
  placeholder: string;
  bulkMode: boolean;
  // Optional (for attribute rows, not prefix)
  onRename?: (newLabel: string) => void;
  isEditingLabel?: boolean;
  onStartEdit?: () => void;
  onEndEdit?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

function FieldRow(props: FieldRowProps) {
  const color = PART_COLORS[props.colorIndex % PART_COLORS.length];
  const previewedValue = applyShorten(
    props.bulkMode ? props.value.split(',')[0]?.trim() || '' : props.value,
    props.shorten,
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1 group/label">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />
          {props.isEditingLabel && props.onRename ? (
            <input
              autoFocus
              type="text"
              defaultValue={props.label}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && props.onRename) props.onRename(v);
                props.onEndEdit?.();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') props.onEndEdit?.();
              }}
              className="text-xs font-bold text-white bg-slate-950 border border-indigo-500 rounded px-1.5 py-0.5 outline-none uppercase w-32"
            />
          ) : (
            <button
              onClick={() => props.onStartEdit?.()}
              disabled={!props.onRename}
              className="text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-slate-300 disabled:hover:text-slate-500 flex items-center gap-1 disabled:cursor-default"
            >
              {props.label}
              {props.onRename && (
                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover/label:opacity-60 transition" />
              )}
            </button>
          )}
          {previewedValue && (
            <span className={`text-[10px] font-mono ${color.text} ${color.bg} px-1.5 py-0.5 rounded`}>
              → {previewedValue}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ShortenPicker value={props.shorten} onChange={props.onShortenChange} />
          {props.onMoveUp && (
            <button
              onClick={props.onMoveUp}
              disabled={!props.canMoveUp}
              className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-default"
              title="Move up"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
          )}
          {props.onMoveDown && (
            <button
              onClick={props.onMoveDown}
              disabled={!props.canMoveDown}
              className="p-0.5 text-slate-600 hover:text-slate-300 disabled:opacity-30 disabled:cursor-default"
              title="Move down"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          )}
          {props.onRemove && (
            <button
              onClick={props.onRemove}
              className="p-0.5 text-slate-600 hover:text-rose-400"
              title="Remove attribute"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono uppercase focus:border-indigo-500 outline-none transition"
        placeholder={props.placeholder}
      />
    </div>
  );
}

interface ShortenPickerProps {
  value: ShortenMode;
  onChange: (s: ShortenMode) => void;
}

function ShortenPicker({ value, onChange }: ShortenPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center gap-1"
        title="Shortening mode"
      >
        {SHORTEN_LABELS[value]}
        <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl z-10 py-1 min-w-[110px]">
          {(Object.keys(SHORTEN_LABELS) as ShortenMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => { onChange(mode); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-slate-800 transition ${value === mode ? 'text-indigo-400' : 'text-slate-300'}`}
            >
              {SHORTEN_LABELS[mode]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  );
}