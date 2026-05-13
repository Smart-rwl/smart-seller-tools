// app/tools/barcode-generator/ToolClient.tsx
'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Barcode from 'react-barcode';
import QRCode from 'react-qr-code';
import {
  AlertOctagon,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Copy,
  Download,
  Factory,
  FileText,
  Layers,
  Loader2,
  Move,
  Package,
  Plus,
  Printer,
  QrCode,
  Save,
  Settings,
  Trash2,
  Barcode as BarcodeIcon,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   Types & constants
──────────────────────────────────────────────── */

type Mode = 'fnsku' | 'qr';

type FnskuRow = {
  id: string;
  fnsku: string;
  title: string;
  condition: 'New' | 'Used' | 'Refurbished';
  expiryDate: string;       // YYYY-MM-DD or ''
  supplierCode: string;
  batchNumber: string;
  category: CategoryKey;
  quantity: number;
};

type QrRow = {
  id: string;
  data: string;       // URL or text
  label: string;      // shown above QR
  quantity: number;
};

type CategoryKey = 'general' | 'supplements' | 'food' | 'electronics' | 'beauty';

const CATEGORIES: { key: CategoryKey; label: string; requiresExpiry?: boolean; requiresBatch?: boolean }[] = [
  { key: 'general', label: 'General' },
  { key: 'supplements', label: 'Supplements', requiresExpiry: true, requiresBatch: true },
  { key: 'food', label: 'Food / Grocery', requiresExpiry: true, requiresBatch: true },
  { key: 'electronics', label: 'Electronics', requiresBatch: true },
  { key: 'beauty', label: 'Beauty / Topical', requiresExpiry: true },
];

type GridPresetKey = '30up' | '24up' | '20up' | '14up';
const GRID_PRESETS: Record<GridPresetKey, { cols: number; rows: number; label: string }> = {
  '30up': { cols: 3, rows: 10, label: '3 × 10  (30-up)' },
  '24up': { cols: 3, rows: 8, label: '3 × 8  (24-up)' },
  '20up': { cols: 4, rows: 5, label: '4 × 5  (20-up)' },
  '14up': { cols: 2, rows: 7, label: '2 × 7  (14-up)' },
};

type PageSize = 'a4' | 'a5' | 'letter';
const PAGE_DIMENSIONS_MM: Record<PageSize, [number, number]> = {
  a4: [210, 297],
  a5: [148, 210],
  letter: [215.9, 279.4],
};

const STORAGE_KEY = 'smartrwl:fba-labels:v1';

const FNSKU_PATTERN = /^X[0-9A-Z]{9}$/i;     // FNSKU: X + 9 alphanumeric
const ASIN_PATTERN = /^B[0-9A-Z]{9}$/i;       // ASIN starts with B
const TITLE_MAX = 80;

const safeNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const blankFnskuRow = (): FnskuRow => ({
  id: newId(),
  fnsku: '',
  title: '',
  condition: 'New',
  expiryDate: '',
  supplierCode: '',
  batchNumber: '',
  category: 'general',
  quantity: 30,
});

const blankQrRow = (): QrRow => ({
  id: newId(),
  data: '',
  label: '',
  quantity: 30,
});

/* ────────────────────────────────────────────────
   Compliance — pure, derived per row
──────────────────────────────────────────────── */

type Issue = { severity: 'error' | 'warning'; message: string };

function checkFnskuRow(row: FnskuRow): Issue[] {
  const issues: Issue[] = [];
  const v = row.fnsku.trim().toUpperCase();

  if (!v) {
    issues.push({ severity: 'error', message: 'FNSKU is required.' });
  } else if (ASIN_PATTERN.test(v) && !FNSKU_PATTERN.test(v)) {
    issues.push({
      severity: 'error',
      message: 'This looks like an ASIN (B0…). Printing ASINs causes commingling — use the FNSKU (X…).',
    });
  } else if (!FNSKU_PATTERN.test(v)) {
    issues.push({
      severity: 'warning',
      message: 'FNSKU should be X + 9 alphanumeric characters (e.g. X001234567).',
    });
  }

  if (!row.title.trim()) {
    issues.push({ severity: 'error', message: 'Title is required.' });
  } else if (row.title.length > TITLE_MAX) {
    issues.push({
      severity: 'warning',
      message: `Title is ${row.title.length} chars — Amazon truncates at ${TITLE_MAX}.`,
    });
  }

  if (row.quantity <= 0) {
    issues.push({ severity: 'warning', message: 'Quantity is 0 — this row will not print.' });
  }

  const cat = CATEGORIES.find((c) => c.key === row.category)!;
  if (cat.requiresExpiry && !row.expiryDate) {
    issues.push({
      severity: 'warning',
      message: `${cat.label} typically requires an expiry date.`,
    });
  }
  if (cat.requiresBatch && !row.batchNumber.trim()) {
    issues.push({
      severity: 'warning',
      message: `${cat.label} should include a batch / lot number.`,
    });
  }

  return issues;
}

function checkQrRow(row: QrRow): Issue[] {
  const issues: Issue[] = [];
  if (!row.data.trim()) {
    issues.push({ severity: 'error', message: 'QR code data is required.' });
  } else if (row.data.length > 2000) {
    issues.push({
      severity: 'warning',
      message: 'Long payloads make QR codes harder to scan — keep under 300 chars where possible.',
    });
  }
  if (row.quantity <= 0) {
    issues.push({ severity: 'warning', message: 'Quantity is 0 — this row will not print.' });
  }
  return issues;
}

/* ────────────────────────────────────────────────
   Print HTML builder (pure)
──────────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type PrintOptions = {
  pageSize: PageSize;
  cols: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapXMm: number;
  gapYMm: number;
};

function buildFnskuPageHtml(
  pageItems: FnskuRow[],
  svgFor: (value: string) => string,
  options: PrintOptions
): string {
  const labelHtml = pageItems
    .map((item) => {
      const svg = svgFor(item.fnsku.trim().toUpperCase());
      const expiry = item.expiryDate
        ? `<span class="exp">EXP ${escapeHtml(item.expiryDate)}</span>`
        : '';
      const batch = item.batchNumber.trim()
        ? `<div class="aux">LOT ${escapeHtml(item.batchNumber.trim())}</div>`
        : '';
      const supplier = item.supplierCode.trim()
        ? `<div class="aux">${escapeHtml(item.supplierCode.trim())}</div>`
        : '';
      return `
        <div class="label">
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="symbol">${svg}</div>
          <div class="meta">
            <span class="cond">${escapeHtml(item.condition)}</span>
            ${expiry}
          </div>
          ${batch}
          ${supplier}
        </div>
      `;
    })
    .join('');

  return buildPageHtml(labelHtml, options);
}

function buildQrPageHtml(
  pageItems: QrRow[],
  svgFor: (value: string) => string,
  options: PrintOptions
): string {
  const labelHtml = pageItems
    .map((item) => {
      const svg = svgFor(item.data);
      const label = item.label.trim()
        ? `<div class="title">${escapeHtml(item.label)}</div>`
        : '';
      return `
        <div class="label qr">
          ${label}
          <div class="symbol">${svg}</div>
        </div>
      `;
    })
    .join('');

  return buildPageHtml(labelHtml, options);
}

function buildPageHtml(innerHtml: string, options: PrintOptions): string {
  const { pageSize, cols, rows, marginTopMm, marginLeftMm, gapXMm, gapYMm } = options;
  const [w, h] = PAGE_DIMENSIONS_MM[pageSize];
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>FBA labels</title>
<style>
  @page { size: ${w}mm ${h}mm; margin: 0; }
  html, body { margin: 0; padding: 0; background: white; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #000; }
  .sheet {
    width: ${w}mm;
    min-height: ${h}mm;
    padding: ${marginTopMm}mm ${marginLeftMm}mm;
    box-sizing: border-box;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(${cols}, 1fr);
    grid-auto-rows: minmax(0, 1fr);
    column-gap: ${gapXMm}mm;
    row-gap: ${gapYMm}mm;
  }
  .label {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 1.5mm;
    box-sizing: border-box;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
    aspect-ratio: ${cols} / ${rows * 1.25};
  }
  .label .symbol { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 0; width: 100%; }
  .label .symbol svg { max-width: 100%; max-height: 100%; height: auto; }
  .label.qr .symbol svg { max-width: 75%; }
  .title {
    font-size: 7pt;
    line-height: 1.15;
    margin-bottom: 0.8mm;
    width: 100%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    word-break: break-word;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 6pt;
    font-weight: 700;
    margin-top: 0.6mm;
    text-transform: uppercase;
  }
  .aux { font-size: 5.5pt; color: #444; }
  @media screen {
    .label { outline: 0.2mm dashed #ddd; }
  }
</style>
</head>
<body>
  <div class="sheet"><div class="grid">${innerHtml}</div></div>
</body>
</html>`;
}

function expandFnsku(rows: FnskuRow[]): FnskuRow[] {
  const out: FnskuRow[] = [];
  for (const r of rows) {
    if (!r.fnsku.trim() || !r.title.trim()) continue;
    for (let i = 0; i < r.quantity; i++) out.push(r);
  }
  return out;
}

function expandQr(rows: QrRow[]): QrRow[] {
  const out: QrRow[] = [];
  for (const r of rows) {
    if (!r.data.trim()) continue;
    for (let i = 0; i < r.quantity; i++) out.push(r);
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/* ────────────────────────────────────────────────
   Component
──────────────────────────────────────────────── */

export default function BarcodeGenerator() {
  const [mode, setMode] = useState<Mode>('fnsku');
  const [fnskuRows, setFnskuRows] = useState<FnskuRow[]>(() => [
    {
      ...blankFnskuRow(),
      fnsku: 'X001234567',
      title: 'Wireless Headphones — Noise Cancelling — Black',
      category: 'electronics',
      batchNumber: 'BATCH-2024-Q1',
      supplierCode: 'FAC-A1',
      quantity: 30,
    },
  ]);
  const [qrRows, setQrRows] = useState<QrRow[]>(() => [
    {
      ...blankQrRow(),
      data: 'https://www.amazon.com/dp/B08N5WRWNW',
      label: 'Scan for product manual',
      quantity: 30,
    },
  ]);

  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [gridPreset, setGridPreset] = useState<GridPresetKey>('30up');
  const [marginTopMm, setMarginTopMm] = useState(10);
  const [marginLeftMm, setMarginLeftMm] = useState(5);
  const [gapXMm, setGapXMm] = useState(5);
  const [gapYMm, setGapYMm] = useState(5);

  const [busy, setBusy] = useState<'print' | 'pdf' | null>(null);
  const [saved, setSaved] = useState(false);

  /* ── Load + save persistence ── */

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.mode === 'fnsku' || parsed.mode === 'qr') setMode(parsed.mode);
      if (Array.isArray(parsed.fnskuRows) && parsed.fnskuRows.length) {
        setFnskuRows(parsed.fnskuRows);
      }
      if (Array.isArray(parsed.qrRows) && parsed.qrRows.length) {
        setQrRows(parsed.qrRows);
      }
      if (parsed.pageSize) setPageSize(parsed.pageSize);
      if (parsed.gridPreset) setGridPreset(parsed.gridPreset);
      if (typeof parsed.marginTopMm === 'number') setMarginTopMm(parsed.marginTopMm);
      if (typeof parsed.marginLeftMm === 'number') setMarginLeftMm(parsed.marginLeftMm);
      if (typeof parsed.gapXMm === 'number') setGapXMm(parsed.gapXMm);
      if (typeof parsed.gapYMm === 'number') setGapYMm(parsed.gapYMm);
    } catch {
      /* ignore */
    }
  }, []);

  // Auto-save (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            mode,
            fnskuRows,
            qrRows,
            pageSize,
            gridPreset,
            marginTopMm,
            marginLeftMm,
            gapXMm,
            gapYMm,
          })
        );
        setSaved(true);
        // Reset the badge after a short delay
        setTimeout(() => setSaved(false), 1200);
      } catch {
        /* quota — ignore */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [mode, fnskuRows, qrRows, pageSize, gridPreset, marginTopMm, marginLeftMm, gapXMm, gapYMm]);

  /* ── Derived ── */

  const grid = GRID_PRESETS[gridPreset];

  const fnskuIssues = useMemo(
    () => fnskuRows.map((r) => ({ id: r.id, issues: checkFnskuRow(r) })),
    [fnskuRows]
  );
  const qrIssues = useMemo(
    () => qrRows.map((r) => ({ id: r.id, issues: checkQrRow(r) })),
    [qrRows]
  );

  const totalLabels = useMemo(() => {
    if (mode === 'fnsku') {
      return fnskuRows.reduce(
        (s, r) => s + (r.fnsku.trim() && r.title.trim() ? r.quantity : 0),
        0
      );
    }
    return qrRows.reduce((s, r) => s + (r.data.trim() ? r.quantity : 0), 0);
  }, [mode, fnskuRows, qrRows]);

  const totalPages = Math.max(1, Math.ceil(totalLabels / (grid.cols * grid.rows)));

  // Unique symbol values used across rows — we render one barcode per unique value
  // into a hidden subtree, then re-use the serialized SVG across copies.
  const uniqueSymbols = useMemo(() => {
    if (mode === 'fnsku') {
      const set = new Set<string>();
      for (const r of fnskuRows) {
        const v = r.fnsku.trim().toUpperCase();
        if (v) set.add(v);
      }
      return Array.from(set);
    }
    const set = new Set<string>();
    for (const r of qrRows) {
      if (r.data.trim()) set.add(r.data);
    }
    return Array.from(set);
  }, [mode, fnskuRows, qrRows]);

  /* ── Row actions ── */

  const updateFnsku = useCallback(<K extends keyof FnskuRow>(id: string, field: K, value: FnskuRow[K]) => {
    setFnskuRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);
  const updateQr = useCallback(<K extends keyof QrRow>(id: string, field: K, value: QrRow[K]) => {
    setQrRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }, []);

  const addFnsku = () => setFnskuRows((p) => [...p, blankFnskuRow()]);
  const addQr = () => setQrRows((p) => [...p, blankQrRow()]);

  const duplicateFnsku = (id: string) =>
    setFnskuRows((p) => {
      const idx = p.findIndex((r) => r.id === id);
      if (idx === -1) return p;
      const copy = { ...p[idx], id: newId() };
      return [...p.slice(0, idx + 1), copy, ...p.slice(idx + 1)];
    });
  const duplicateQr = (id: string) =>
    setQrRows((p) => {
      const idx = p.findIndex((r) => r.id === id);
      if (idx === -1) return p;
      const copy = { ...p[idx], id: newId() };
      return [...p.slice(0, idx + 1), copy, ...p.slice(idx + 1)];
    });

  const removeFnsku = (id: string) =>
    setFnskuRows((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));
  const removeQr = (id: string) =>
    setQrRows((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));

  /* ── SVG harvest ── */

  // We keep refs to containers holding the rendered Barcode / QRCode SVGs.
  // serializeSymbol(value) returns the SVG outerHTML for embedding into print/PDF.
  const symbolRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const serializeSymbol = useCallback((value: string): string => {
    const node = symbolRefs.current.get(value);
    const svg = node?.querySelector('svg');
    if (!svg) return '';
    // Clone to avoid mutating the live tree
    const clone = svg.cloneNode(true) as SVGElement;
    // Ensure xmlns is on the root SVG
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }
    return new XMLSerializer().serializeToString(clone);
  }, []);

  /* ── Print + PDF ── */

  const printOptions: PrintOptions = {
    pageSize,
    cols: grid.cols,
    rows: grid.rows,
    marginTopMm,
    marginLeftMm,
    gapXMm,
    gapYMm,
  };

  const handlePrint = async () => {
    if (totalLabels === 0) return;
    setBusy('print');
    try {
      const win = window.open('', '_blank', 'width=900,height=900');
      if (!win) {
        alert('Pop-up blocked. Allow pop-ups for this site to print.');
        return;
      }

      // Build all pages into a single HTML doc (CSS handles pagination via page-break)
      const labels =
        mode === 'fnsku' ? expandFnsku(fnskuRows) : expandQr(qrRows);

      const labelsPerPage = grid.cols * grid.rows;
      const pages = chunk(labels, labelsPerPage);

      const pageHtmls = pages
        .map((pageItems) => {
          if (mode === 'fnsku') {
            return buildFnskuPageHtml(
              pageItems as FnskuRow[],
              (v) => serializeSymbol(v.trim().toUpperCase()),
              printOptions
            );
          }
          return buildQrPageHtml(
            pageItems as QrRow[],
            (v) => serializeSymbol(v),
            printOptions
          );
        })
        .map((html) => {
          // Strip the wrapping <html><body> from each page and keep just the .sheet
          const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
          return match ? match[1] : html;
        })
        .join('<div style="page-break-after: always;"></div>');

      // Take the <style> block from the first page builder output
      const styleMatch = buildPageHtml('', printOptions).match(/<style[\s\S]*?<\/style>/);
      const styleBlock = styleMatch ? styleMatch[0] : '';

      const fullHtml = `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><title>FBA labels</title>
${styleBlock}
</head><body>${pageHtmls}</body></html>`;

      win.document.open();
      win.document.write(fullHtml);
      win.document.close();

      // Wait for content paint
      await new Promise((r) => setTimeout(r, 350));
      win.focus();
      win.print();
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadPdf = async () => {
    if (totalLabels === 0) return;
    setBusy('pdf');
    try {
      const [{ default: html2canvas }, jspdfMod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const JsPdf = (jspdfMod as { jsPDF: typeof import('jspdf').jsPDF }).jsPDF ??
        (jspdfMod as { default: typeof import('jspdf').jsPDF }).default;

      const [pageWmm, pageHmm] = PAGE_DIMENSIONS_MM[pageSize];
      const pdf = new JsPdf({
        unit: 'mm',
        format: [pageWmm, pageHmm],
        orientation: 'portrait',
      });

      const labels =
        mode === 'fnsku' ? expandFnsku(fnskuRows) : expandQr(qrRows);
      const labelsPerPage = grid.cols * grid.rows;
      const pages = chunk(labels, labelsPerPage);

      // Render each page into an offscreen container, html2canvas it, add to PDF
      for (let i = 0; i < pages.length; i++) {
        const html =
          mode === 'fnsku'
            ? buildFnskuPageHtml(
                pages[i] as FnskuRow[],
                (v) => serializeSymbol(v.trim().toUpperCase()),
                printOptions
              )
            : buildQrPageHtml(
                pages[i] as QrRow[],
                (v) => serializeSymbol(v),
                printOptions
              );

        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.left = '-99999px';
        container.style.top = '0';
        container.style.width = `${pageWmm}mm`;
        container.style.background = 'white';
        container.innerHTML = html;
        document.body.appendChild(container);

        try {
          // Target the .sheet inside the constructed HTML
          const sheet = container.querySelector('.sheet') as HTMLElement | null;
          const target = sheet ?? container;
          const canvas = await html2canvas(target, {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
          });
          const imgData = canvas.toDataURL('image/png');
          if (i > 0) pdf.addPage([pageWmm, pageHmm], 'portrait');
          pdf.addImage(imgData, 'PNG', 0, 0, pageWmm, pageHmm);
        } finally {
          document.body.removeChild(container);
        }
      }

      pdf.save(`fba-labels-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Could not generate the PDF. See console for details.');
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadSvg = () => {
    // Download a single SVG for the FIRST row of the current mode
    const firstValue =
      mode === 'fnsku'
        ? fnskuRows[0]?.fnsku.trim().toUpperCase()
        : qrRows[0]?.data;
    if (!firstValue) return;
    const svgString = serializeSymbol(firstValue);
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(firstValue || 'label').replace(/[^A-Z0-9]/gi, '_')}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ────────────────────────────────────────────────
     Render
  ──────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 md:p-12">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <BarcodeIcon className="h-8 w-8 text-orange-500" />
              FBA Label Architect
            </h1>
            <p className="mt-2 text-slate-400">
              Batch-print barcode or QR labels with live Amazon compliance checks.
            </p>
            {saved && (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                <Save className="h-3 w-3" /> Auto-saved
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadSvg}
              disabled={!!busy || totalLabels === 0}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" /> SVG
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={!!busy || totalLabels === 0}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === 'pdf' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              PDF
            </button>
            <button
              onClick={handlePrint}
              disabled={!!busy || totalLabels === 0}
              className="flex items-center gap-2 rounded-lg bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy === 'print' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Print {totalLabels > 0 ? `(${totalLabels} labels · ${totalPages} pg)` : ''}
            </button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex w-fit rounded-lg border border-slate-800 bg-slate-900 p-1">
          <ModeButton active={mode === 'fnsku'} onClick={() => setMode('fnsku')} icon={<BarcodeIcon className="h-4 w-4" />}>
            FNSKU mode
          </ModeButton>
          <ModeButton active={mode === 'qr'} onClick={() => setMode('qr')} icon={<QrCode className="h-4 w-4" />}>
            QR mode
          </ModeButton>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT — config */}
          <div className="space-y-6 lg:col-span-5">
            {mode === 'fnsku' ? (
              <FnskuList
                rows={fnskuRows}
                issuesByRow={Object.fromEntries(fnskuIssues.map((r) => [r.id, r.issues]))}
                onUpdate={updateFnsku}
                onAdd={addFnsku}
                onDuplicate={duplicateFnsku}
                onRemove={removeFnsku}
              />
            ) : (
              <QrList
                rows={qrRows}
                issuesByRow={Object.fromEntries(qrIssues.map((r) => [r.id, r.issues]))}
                onUpdate={updateQr}
                onAdd={addQr}
                onDuplicate={duplicateQr}
                onRemove={removeQr}
              />
            )}

            <PaperPanel
              pageSize={pageSize}
              setPageSize={setPageSize}
              gridPreset={gridPreset}
              setGridPreset={setGridPreset}
              marginTopMm={marginTopMm}
              setMarginTopMm={setMarginTopMm}
              marginLeftMm={marginLeftMm}
              setMarginLeftMm={setMarginLeftMm}
              gapXMm={gapXMm}
              setGapXMm={setGapXMm}
              gapYMm={gapYMm}
              setGapYMm={setGapYMm}
            />
          </div>

          {/* RIGHT — preview */}
          <div className="lg:col-span-7">
            <Preview
              mode={mode}
              fnskuRows={fnskuRows}
              qrRows={qrRows}
              pageSize={pageSize}
              cols={grid.cols}
              rows={grid.rows}
              marginTopMm={marginTopMm}
              marginLeftMm={marginLeftMm}
              gapXMm={gapXMm}
              gapYMm={gapYMm}
              totalLabels={totalLabels}
              totalPages={totalPages}
            />
          </div>
        </div>

        {/* GUIDE */}
        <Guide />

        {/* Hidden SVG renderers — one per unique symbol value */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: -99999,
            top: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {uniqueSymbols.map((v) => (
            <div
              key={v}
              ref={(el) => {
                if (el) symbolRefs.current.set(v, el);
                else symbolRefs.current.delete(v);
              }}
            >
              {mode === 'fnsku' ? (
                <Barcode
                  value={v}
                  format="CODE128"
                  width={1.5}
                  height={50}
                  fontSize={11}
                  displayValue
                  margin={0}
                />
              ) : (
                <QRCode value={v} size={120} />
              )}
            </div>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────── */

function ModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
        active
          ? 'bg-orange-600 text-white'
          : 'text-slate-400 hover:text-white'
      }`}
    >
      {icon} {children}
    </button>
  );
}

function FnskuList({
  rows,
  issuesByRow,
  onUpdate,
  onAdd,
  onDuplicate,
  onRemove,
}: {
  rows: FnskuRow[];
  issuesByRow: Record<string, Issue[]>;
  onUpdate: <K extends keyof FnskuRow>(id: string, field: K, value: FnskuRow[K]) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Layers className="h-4 w-4 text-orange-400" /> Label batch
          <span className="text-xs font-normal text-slate-500">
            ({rows.length} SKU{rows.length === 1 ? '' : 's'})
          </span>
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-xs text-white transition hover:bg-orange-500"
        >
          <Plus className="h-3 w-3" /> Add SKU
        </button>
      </div>

      <div className="space-y-3 p-4">
        {rows.map((row) => (
          <FnskuRowEditor
            key={row.id}
            row={row}
            issues={issuesByRow[row.id] ?? []}
            canRemove={rows.length > 1}
            onUpdate={onUpdate}
            onDuplicate={() => onDuplicate(row.id)}
            onRemove={() => onRemove(row.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FnskuRowEditor({
  row,
  issues,
  canRemove,
  onUpdate,
  onDuplicate,
  onRemove,
}: {
  row: FnskuRow;
  issues: Issue[];
  canRemove: boolean;
  onUpdate: <K extends keyof FnskuRow>(id: string, field: K, value: FnskuRow[K]) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const hasError = issues.some((i) => i.severity === 'error');
  return (
    <div
      className={`rounded-lg border bg-slate-950 p-4 transition ${
        hasError ? 'border-red-900/50' : 'border-slate-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="FNSKU">
              <input
                type="text"
                value={row.fnsku}
                onChange={(e) => onUpdate(row.id, 'fnsku', e.target.value)}
                placeholder="X001234567"
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 font-mono text-sm uppercase text-white outline-none focus:border-orange-500"
                spellCheck={false}
              />
            </FieldLabel>
            <FieldLabel label="Quantity">
              <input
                type="number"
                min="0"
                value={row.quantity}
                onChange={(e) => onUpdate(row.id, 'quantity', safeNum(e.target.value))}
                className="w-full rounded border border-orange-800 bg-orange-900/20 p-2 text-center font-mono text-sm font-bold text-white outline-none focus:border-orange-500"
              />
            </FieldLabel>
          </div>

          <FieldLabel label={`Title (${row.title.length}/${TITLE_MAX})`}>
            <input
              type="text"
              value={row.title}
              onChange={(e) => onUpdate(row.id, 'title', e.target.value)}
              className={`w-full rounded border bg-slate-900 p-2 text-sm text-white outline-none focus:border-orange-500 ${
                row.title.length > TITLE_MAX ? 'border-amber-700' : 'border-slate-700'
              }`}
            />
          </FieldLabel>

          <div className="grid grid-cols-2 gap-3">
            <FieldLabel label="Condition">
              <select
                value={row.condition}
                onChange={(e) => onUpdate(row.id, 'condition', e.target.value as FnskuRow['condition'])}
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white outline-none focus:border-orange-500"
              >
                <option>New</option>
                <option>Used</option>
                <option>Refurbished</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Category">
              <select
                value={row.category}
                onChange={(e) => onUpdate(row.id, 'category', e.target.value as CategoryKey)}
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white outline-none focus:border-orange-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FieldLabel>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FieldLabel label="Expiry" icon={<CalendarClock className="h-3 w-3" />}>
              <input
                type="date"
                value={row.expiryDate}
                onChange={(e) => onUpdate(row.id, 'expiryDate', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-white outline-none focus:border-orange-500"
              />
            </FieldLabel>
            <FieldLabel label="Lot / batch">
              <input
                type="text"
                value={row.batchNumber}
                onChange={(e) => onUpdate(row.id, 'batchNumber', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-white outline-none focus:border-orange-500"
              />
            </FieldLabel>
            <FieldLabel label="Supplier" icon={<Factory className="h-3 w-3" />}>
              <input
                type="text"
                value={row.supplierCode}
                onChange={(e) => onUpdate(row.id, 'supplierCode', e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-white outline-none focus:border-orange-500"
              />
            </FieldLabel>
          </div>

          {issues.length > 0 && <IssueList issues={issues} />}
        </div>

        <div className="flex flex-col gap-1">
          <button
            onClick={onDuplicate}
            className="rounded border border-slate-800 p-2 text-slate-400 transition hover:text-orange-400"
            aria-label="Duplicate row"
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            disabled={!canRemove}
            className="rounded border border-slate-800 p-2 text-slate-400 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Remove row"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function QrList({
  rows,
  issuesByRow,
  onUpdate,
  onAdd,
  onDuplicate,
  onRemove,
}: {
  rows: QrRow[];
  issuesByRow: Record<string, Issue[]>;
  onUpdate: <K extends keyof QrRow>(id: string, field: K, value: QrRow[K]) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-800/50 px-5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <QrCode className="h-4 w-4 text-orange-400" /> QR batch
          <span className="text-xs font-normal text-slate-500">
            ({rows.length} item{rows.length === 1 ? '' : 's'})
          </span>
        </h3>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1.5 text-xs text-white transition hover:bg-orange-500"
        >
          <Plus className="h-3 w-3" /> Add QR
        </button>
      </div>

      <div className="space-y-3 p-4">
        {rows.map((row) => {
          const issues = issuesByRow[row.id] ?? [];
          const hasError = issues.some((i) => i.severity === 'error');
          return (
            <div
              key={row.id}
              className={`rounded-lg border bg-slate-950 p-4 ${
                hasError ? 'border-red-900/50' : 'border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-3">
                  <FieldLabel label="QR data (URL or text)">
                    <textarea
                      value={row.data}
                      onChange={(e) => onUpdate(row.id, 'data', e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded border border-slate-700 bg-slate-900 p-2 font-mono text-xs text-white outline-none focus:border-orange-500"
                      placeholder="https://example.com/product"
                    />
                  </FieldLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <FieldLabel label="Label (optional, above QR)">
                      <input
                        type="text"
                        value={row.label}
                        onChange={(e) => onUpdate(row.id, 'label', e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm text-white outline-none focus:border-orange-500"
                      />
                    </FieldLabel>
                    <FieldLabel label="Quantity">
                      <input
                        type="number"
                        min="0"
                        value={row.quantity}
                        onChange={(e) => onUpdate(row.id, 'quantity', safeNum(e.target.value))}
                        className="w-full rounded border border-orange-800 bg-orange-900/20 p-2 text-center font-mono text-sm font-bold text-white outline-none focus:border-orange-500"
                      />
                    </FieldLabel>
                  </div>
                  {issues.length > 0 && <IssueList issues={issues} />}
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onDuplicate(row.id)}
                    className="rounded border border-slate-800 p-2 text-slate-400 transition hover:text-orange-400"
                    aria-label="Duplicate"
                    title="Duplicate"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onRemove(row.id)}
                    disabled={rows.length <= 1}
                    className="rounded border border-slate-800 p-2 text-slate-400 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Remove"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  return (
    <ul className="space-y-1">
      {issues.map((iss, i) => (
        <li
          key={i}
          className={`flex items-start gap-2 rounded p-2 text-[11px] ${
            iss.severity === 'error'
              ? 'bg-red-900/20 text-red-300'
              : 'bg-amber-900/20 text-amber-300'
          }`}
        >
          <AlertOctagon className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{iss.message}</span>
        </li>
      ))}
    </ul>
  );
}

function PaperPanel({
  pageSize,
  setPageSize,
  gridPreset,
  setGridPreset,
  marginTopMm,
  setMarginTopMm,
  marginLeftMm,
  setMarginLeftMm,
  gapXMm,
  setGapXMm,
  gapYMm,
  setGapYMm,
}: {
  pageSize: PageSize;
  setPageSize: (v: PageSize) => void;
  gridPreset: GridPresetKey;
  setGridPreset: (v: GridPresetKey) => void;
  marginTopMm: number;
  setMarginTopMm: (v: number) => void;
  marginLeftMm: number;
  setMarginLeftMm: (v: number) => void;
  gapXMm: number;
  setGapXMm: (v: number) => void;
  gapYMm: number;
  setGapYMm: (v: number) => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="flex items-center gap-2 text-sm font-bold text-white">
        <Move className="h-4 w-4 text-orange-400" /> Paper &amp; layout
      </h3>

      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Paper size
        </label>
        <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-1">
          {(['a4', 'a5', 'letter'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setPageSize(s)}
              className={`flex-1 rounded py-1.5 text-xs font-medium uppercase ${
                pageSize === s ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Grid layout
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(GRID_PRESETS) as GridPresetKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setGridPreset(k)}
              className={`rounded border py-2 text-xs font-medium ${
                gridPreset === k
                  ? 'border-orange-500 bg-orange-900/30 text-orange-300'
                  : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
              }`}
            >
              {GRID_PRESETS[k].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 border-t border-slate-800 pt-4">
        <MmInput label="Top" value={marginTopMm} onChange={setMarginTopMm} />
        <MmInput label="Left" value={marginLeftMm} onChange={setMarginLeftMm} />
        <MmInput label="Gap X" value={gapXMm} onChange={setGapXMm} />
        <MmInput label="Gap Y" value={gapYMm} onChange={setGapYMm} />
      </div>
    </div>
  );
}

function MmInput({
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
      <label className="mb-1 block text-[10px] text-slate-500">{label} (mm)</label>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(safeNum(e.target.value))}
        className="w-full rounded border border-slate-700 bg-slate-950 p-1 text-center text-sm text-white outline-none focus:border-orange-500"
      />
    </div>
  );
}

/* ────────────────────────────────────────────────
   Preview
──────────────────────────────────────────────── */

function Preview({
  mode,
  fnskuRows,
  qrRows,
  pageSize,
  cols,
  rows,
  marginTopMm,
  marginLeftMm,
  gapXMm,
  gapYMm,
  totalLabels,
  totalPages,
}: {
  mode: Mode;
  fnskuRows: FnskuRow[];
  qrRows: QrRow[];
  pageSize: PageSize;
  cols: number;
  rows: number;
  marginTopMm: number;
  marginLeftMm: number;
  gapXMm: number;
  gapYMm: number;
  totalLabels: number;
  totalPages: number;
}) {
  const [pageWmm, pageHmm] = PAGE_DIMENSIONS_MM[pageSize];

  // Expand into a flat list and only show the first page for preview perf
  const labelsPerPage = cols * rows;
  const labels =
    mode === 'fnsku'
      ? expandFnsku(fnskuRows).slice(0, labelsPerPage)
      : expandQr(qrRows).slice(0, labelsPerPage);

  return (
    <div className="rounded-xl border-4 border-slate-800 bg-slate-200 p-4 shadow-inner">
      <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <FileText className="h-3 w-3" />
          {pageWmm} × {pageHmm} mm preview · showing page 1 of {totalPages}
        </div>
        <div>{totalLabels} labels total</div>
      </div>

      <div className="flex justify-center overflow-auto">
        <div
          className="relative bg-white shadow-2xl"
          style={{
            width: `${pageWmm}mm`,
            minHeight: `${pageHmm}mm`,
            padding: `${marginTopMm}mm ${marginLeftMm}mm`,
            boxSizing: 'border-box',
          }}
        >
          {labels.length === 0 ? (
            <div className="flex h-[200mm] items-center justify-center text-sm text-slate-400">
              Add a SKU with a non-zero quantity to see the preview.
            </div>
          ) : (
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridAutoRows: `minmax(0, 1fr)`,
                columnGap: `${gapXMm}mm`,
                rowGap: `${gapYMm}mm`,
              }}
            >
              {labels.map((item, i) =>
                mode === 'fnsku' ? (
                  <FnskuLabelTile key={i} row={item as FnskuRow} />
                ) : (
                  <QrLabelTile key={i} row={item as QrRow} />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FnskuLabelTile({ row }: { row: FnskuRow }) {
  const v = row.fnsku.trim().toUpperCase();
  return (
    <div className="flex flex-col items-center justify-center overflow-hidden border border-dashed border-gray-300 p-1 text-center">
      <div className="line-clamp-2 text-[7pt] leading-tight text-black">{row.title}</div>
      {v && (
        <div className="my-1 w-full">
          <Barcode
            value={v}
            format="CODE128"
            width={1.2}
            height={32}
            fontSize={9}
            displayValue
            margin={0}
          />
        </div>
      )}
      <div className="flex w-full justify-between text-[6pt] font-bold uppercase text-black">
        <span>{row.condition}</span>
        {row.expiryDate && <span>EXP {row.expiryDate}</span>}
      </div>
      {row.batchNumber && (
        <div className="text-[5.5pt] text-gray-500">LOT {row.batchNumber}</div>
      )}
      {row.supplierCode && (
        <div className="text-[5.5pt] text-gray-500">{row.supplierCode}</div>
      )}
    </div>
  );
}

function QrLabelTile({ row }: { row: QrRow }) {
  return (
    <div className="flex flex-col items-center justify-center overflow-hidden border border-dashed border-gray-300 p-1 text-center">
      {row.label && (
        <div className="line-clamp-1 text-[7pt] leading-tight text-black">{row.label}</div>
      )}
      <div className="my-1 flex h-[60%] w-full items-center justify-center">
        <div style={{ width: '70%', maxWidth: '60px' }}>
          {row.data && <QRCode value={row.data} size={64} style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Guide + Footer
──────────────────────────────────────────────── */

function Guide() {
  return (
    <div className="mt-12 border-t border-slate-800 pt-10">
      <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
        <BookOpen className="h-6 w-6 text-orange-500" />
        FBA labelling strategy
      </h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <GuideCard accent="orange" icon={<Package className="h-5 w-5 text-orange-400" />} title="The commingling trap">
          <b>Never print ASIN (B0…) on FBA labels.</b> Amazon treats ASIN inventory as fungible — a
          hijacker&apos;s fake could ship to your customer. Always use FNSKU (X…). The compliance
          panel flags this live.
        </GuideCard>
        <GuideCard accent="emerald" icon={<Factory className="h-5 w-5 text-emerald-400" />} title="Lot &amp; supplier tracking">
          Print batch / lot numbers and supplier codes onto labels themselves. When a quality issue
          surfaces 6 months later, you can identify the affected production run without digging
          through inventory records.
        </GuideCard>
        <GuideCard accent="slate" icon={<Settings className="h-5 w-5 text-slate-300" />} title="Save your scenarios">
          This tool auto-saves your batch and paper settings to your browser. Configure your usual
          30-up sheet once, come back tomorrow and your full SKU list is still there.
        </GuideCard>
      </div>
    </div>
  );
}

function GuideCard({
  accent,
  icon,
  title,
  children,
}: {
  accent: 'orange' | 'emerald' | 'slate';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const bg = {
    orange: 'bg-orange-500/10',
    emerald: 'bg-emerald-500/10',
    slate: 'bg-slate-500/10',
  }[accent];
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
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