// app/tools/amazon-image-tool/ToolClient.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cpu,
  Download,
  FileImage,
  FileType,
  Images,
  Info,
  Layers,
  Maximize,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   Data
──────────────────────────────────────────────── */

type Variant = { code: string; label: string };

const IMAGE_VARIANTS: Variant[] = [
  { code: 'MAIN', label: 'Main (white BG)' },
  { code: 'PT01', label: 'PT01 — Side / angle' },
  { code: 'PT02', label: 'PT02 — Lifestyle' },
  { code: 'PT03', label: 'PT03 — Interior' },
  { code: 'PT04', label: 'PT04 — Use case' },
  { code: 'PT05', label: 'PT05 — Dimensions' },
  { code: 'PT06', label: 'PT06 — Packaging' },
  { code: 'PT07', label: 'PT07 — Infographic' },
  { code: 'PT08', label: 'PT08 — Swatch / color' },
  { code: 'PT09', label: 'PT09 — Extra' },
  { code: 'PT10', label: 'PT10 — Extra' },
  { code: 'SWCH', label: 'SWCH — Color swatch' },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ASIN_PATTERN = /^B[0-9A-Z]{9}$/i;

type ParsedAsins = {
  valid: string[];
  invalid: string[];
  duplicates: number;
};

type StatusKind = 'idle' | 'info' | 'success' | 'error';
type Status = { kind: StatusKind; message: string };

/* ────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────── */

function parseAsins(input: string): ParsedAsins {
  const tokens = input
    .split(/[\n,\t;]+/)
    .map((t) => t.trim().replace(/\s+/g, ''))
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;

  for (const t of tokens) {
    const upper = t.toUpperCase();
    if (seen.has(upper)) {
      duplicates++;
      continue;
    }
    seen.add(upper);
    if (ASIN_PATTERN.test(upper)) valid.push(upper);
    else invalid.push(upper);
  }
  return { valid, invalid, duplicates };
}

function sanitizeExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot === -1 || dot === filename.length - 1) return 'jpg';
  return filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
}

/* ────────────────────────────────────────────────
   Master file slot — one per variant
──────────────────────────────────────────────── */

type MasterSlot = {
  variant: string;
  file: File | null;
  previewUrl: string | null;
  dims: { w: number; h: number } | null;
  warning: string | null;
};

function emptySlot(variant: string): MasterSlot {
  return { variant, file: null, previewUrl: null, dims: null, warning: null };
}

/* ────────────────────────────────────────────────
   Component
──────────────────────────────────────────────── */

export default function BulkAssetManager() {
  const [slots, setSlots] = useState<MasterSlot[]>([emptySlot('MAIN')]);
  const [asinsInput, setAsinsInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: 'idle', message: '' });
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const parsed = useMemo(() => parseAsins(asinsInput), [asinsInput]);

  // Free blob URLs when slots change or the component unmounts
  useEffect(() => {
    return () => {
      slots.forEach((s) => {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // unmount only — per-replace cleanup handled in updateSlot

  // ── Slot mutations ──

  const updateSlot = useCallback((index: number, next: Partial<MasterSlot>) => {
    setSlots((prev) => {
      const copy = [...prev];
      const old = copy[index];
      // If we're replacing the file/preview, free the previous blob URL
      if ('previewUrl' in next && old.previewUrl && old.previewUrl !== next.previewUrl) {
        URL.revokeObjectURL(old.previewUrl);
      }
      copy[index] = { ...old, ...next };
      return copy;
    });
  }, []);

  const acceptFile = useCallback(
    (index: number, file: File) => {
      // Type guard
      if (!file.type.startsWith('image/')) {
        setStatus({ kind: 'error', message: 'Only image files are allowed.' });
        return;
      }
      if (file.size > MAX_FILE_BYTES) {
        setStatus({
          kind: 'error',
          message: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is 10 MB.`,
        });
        return;
      }

      const url = URL.createObjectURL(file);
      // Race-safe: we capture this slot's variant and check it's still us when onload fires
      const slotVariant = slots[index]?.variant;

      const img = new window.Image();
      img.onload = () => {
        const dims = { w: img.width, h: img.height };
        const warning =
          img.width < 1000 && img.height < 1000
            ? 'Below 1000px — zoom on Amazon will be disabled.'
            : null;

        setSlots((prev) => {
          // Find the current index of the slot we started loading for
          const i = prev.findIndex((s) => s.variant === slotVariant);
          if (i === -1) {
            // Slot was removed — revoke and abort
            URL.revokeObjectURL(url);
            return prev;
          }
          // If the slot has since received a newer file, ignore this onload
          if (prev[i].previewUrl !== url) return prev;
          const copy = [...prev];
          copy[i] = { ...copy[i], dims, warning };
          return copy;
        });
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;

      updateSlot(index, { file, previewUrl: url, dims: null, warning: null });
      setStatus({ kind: 'idle', message: '' });
    },
    [slots, updateSlot]
  );

  const clearSlot = useCallback(
    (index: number) => {
      const old = slots[index];
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      updateSlot(index, { file: null, previewUrl: null, dims: null, warning: null });
    },
    [slots, updateSlot]
  );

  const addSlot = useCallback(() => {
    setSlots((prev) => {
      const used = new Set(prev.map((s) => s.variant));
      const next = IMAGE_VARIANTS.find((v) => !used.has(v.code))?.code;
      if (!next) return prev;
      return [...prev, emptySlot(next)];
    });
  }, []);

  const removeSlot = useCallback(
    (index: number) => {
      const old = slots[index];
      if (old?.previewUrl) URL.revokeObjectURL(old.previewUrl);
      setSlots((prev) => prev.filter((_, i) => i !== index));
    },
    [slots]
  );

  const changeVariant = useCallback(
    (index: number, code: string) => {
      setSlots((prev) => {
        // Prevent assigning a variant already used by another slot
        if (prev.some((s, i) => i !== index && s.variant === code)) return prev;
        const copy = [...prev];
        copy[index] = { ...copy[index], variant: code };
        return copy;
      });
    },
    []
  );

  // ── Drag & drop ──

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };
  const onDragLeave = () => setDragOverIdx(null);
  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(index, file);
  };

  // ── Generate ──

  const handleGenerate = async () => {
    const slotsWithFiles = slots.filter((s) => s.file);
    if (slotsWithFiles.length === 0) {
      setStatus({ kind: 'error', message: 'Upload at least one master image.' });
      return;
    }
    if (parsed.valid.length === 0) {
      setStatus({
        kind: 'error',
        message:
          parsed.invalid.length > 0
            ? 'No valid ASINs found. Each must start with B followed by 9 alphanumeric chars.'
            : 'Paste at least one ASIN below.',
      });
      return;
    }

    setIsLoading(true);
    setProgress(0);
    setStatus({
      kind: 'info',
      message: `Reading ${slotsWithFiles.length} master image${slotsWithFiles.length === 1 ? '' : 's'}…`,
    });

    try {
      const zip = new JSZip();

      // Read each master file ONCE as ArrayBuffer (much faster than letting JSZip
      // re-read the Blob 500 times during generateAsync)
      const fileBuffers = await Promise.all(
        slotsWithFiles.map(async (s) => ({
          variant: s.variant,
          ext: sanitizeExt(s.file!.name),
          buffer: await s.file!.arrayBuffer(),
        }))
      );

      setStatus({
        kind: 'info',
        message: `Building ${parsed.valid.length * slotsWithFiles.length} files…`,
      });

      for (const asin of parsed.valid) {
        for (const fb of fileBuffers) {
          zip.file(`${asin}.${fb.variant}.${fb.ext}`, fb.buffer);
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        setProgress(meta.percent);
      });

      const stamp = new Date().toISOString().slice(0, 10);
      const variantTag =
        slotsWithFiles.length === 1 ? `-${slotsWithFiles[0].variant}` : `-${slotsWithFiles.length}variants`;
      saveAs(blob, `amazon-assets${variantTag}-${stamp}.zip`);

      const totalFiles = parsed.valid.length * slotsWithFiles.length;
      setStatus({
        kind: 'success',
        message: `Bundled ${totalFiles} file${totalFiles === 1 ? '' : 's'} across ${parsed.valid.length} ASIN${parsed.valid.length === 1 ? '' : 's'}.`,
      });
    } catch (e) {
      console.error(e);
      setStatus({ kind: 'error', message: 'Failed to build the ZIP. See console for details.' });
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // ── Derived UI bits ──

  const firstFilledSlot = slots.find((s) => s.file);
  const previewFilename =
    firstFilledSlot && parsed.valid[0]
      ? `${parsed.valid[0]}.${firstFilledSlot.variant}.${sanitizeExt(firstFilledSlot.file!.name)}`
      : `ASIN.${slots[0]?.variant ?? 'MAIN'}.${firstFilledSlot ? sanitizeExt(firstFilledSlot.file!.name) : 'jpg'}`;

  const canAddSlot = slots.length < IMAGE_VARIANTS.length;
  const totalFiles = parsed.valid.length * slots.filter((s) => s.file).length;

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-sans text-slate-200 md:p-12">
      <div className="mx-auto max-w-7xl">
        {/* HEADER */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 border-b border-slate-800 pb-8 md:flex-row md:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <Images className="h-8 w-8 text-orange-500" />
              Bulk Asset Command Center
            </h1>
            <p className="mt-2 text-slate-400">
              Replicate master images across many ASINs with Amazon&apos;s naming convention. Multi-variant in one run.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-400">
            <Layers className="h-4 w-4 text-emerald-500" />
            <span>
              Output:{' '}
              <span className="font-mono text-slate-200">
                {totalFiles > 0 ? `${totalFiles} files` : '— files'}
              </span>
            </span>
          </div>
        </div>

        <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* LEFT: master files (variants) */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                  <UploadCloud className="h-4 w-4 text-orange-400" /> Master assets
                </h3>
                <button
                  onClick={addSlot}
                  disabled={!canAddSlot}
                  className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  + Add variant
                </button>
              </div>

              <div className="space-y-4">
                {slots.map((slot, i) => (
                  <MasterSlotCard
                    key={`${slot.variant}-${i}`}
                    slot={slot}
                    index={i}
                    canRemove={slots.length > 1}
                    isDragOver={dragOverIdx === i}
                    onDragOver={(e) => onDragOver(e, i)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, i)}
                    onPickFile={(file) => acceptFile(i, file)}
                    onClearFile={() => clearSlot(i)}
                    onChangeVariant={(code) => changeVariant(i, code)}
                    onRemove={() => removeSlot(i)}
                    takenVariants={new Set(slots.filter((_, j) => j !== i).map((s) => s.variant))}
                  />
                ))}
              </div>
            </div>

            {/* Quick reference */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white">
                <Cpu className="h-4 w-4 text-orange-400" /> Naming convention
              </h3>
              <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-300">
                {previewFilename}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                Amazon uses <code className="text-slate-300">ASIN.VARIANT.ext</code>. MAIN is the hero image,
                PT01–PT08 are the lifestyle / detail shots, SWCH is the color swatch.
              </p>
            </div>
          </div>

          {/* RIGHT: ASINs + generate */}
          <div className="space-y-6 lg:col-span-7">
            <div className="flex h-[400px] flex-col rounded-xl border border-slate-800 bg-slate-900">
              <div className="flex items-center justify-between rounded-t-lg border-b border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Target ASINs
                  </span>
                  {parsed.valid.length > 0 && (
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] text-orange-300">
                      {parsed.valid.length} valid
                    </span>
                  )}
                  {parsed.duplicates > 0 && (
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                      {parsed.duplicates} duplicate{parsed.duplicates === 1 ? '' : 's'} removed
                    </span>
                  )}
                  {parsed.invalid.length > 0 && (
                    <span
                      className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300"
                      title={`Invalid: ${parsed.invalid.slice(0, 5).join(', ')}${parsed.invalid.length > 5 ? '…' : ''}`}
                    >
                      {parsed.invalid.length} invalid
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setAsinsInput('')}
                  className="text-slate-500 transition hover:text-white"
                  aria-label="Clear ASINs"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <textarea
                value={asinsInput}
                onChange={(e) => setAsinsInput(e.target.value)}
                className="w-full flex-1 resize-none border-none bg-slate-900 p-4 font-mono text-sm leading-relaxed text-slate-300 outline-none placeholder:text-slate-700 focus:ring-0"
                placeholder={'Paste ASINs (one per line, comma, or tab):\nB08XXXXXXX\nB09XXXXXXX\nB07XXXXXXX'}
                spellCheck={false}
                autoComplete="off"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-lg border-t border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-500">
                  Preview:{' '}
                  <span className="font-mono text-slate-300">{previewFilename}</span>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-bold text-white transition ${
                    isLoading
                      ? 'cursor-wait bg-slate-700'
                      : 'bg-orange-600 shadow-lg shadow-orange-900/30 hover:bg-orange-500'
                  }`}
                >
                  {isLoading ? (
                    <>
                      Zipping… {progress > 0 && <span className="font-mono">{Math.round(progress)}%</span>}
                    </>
                  ) : (
                    <>
                      Generate &amp; Download
                      <Download className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Status */}
            {status.kind !== 'idle' && status.message && (
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 ${
                  status.kind === 'success'
                    ? 'border-emerald-900 bg-emerald-950/30 text-emerald-400'
                    : status.kind === 'error'
                      ? 'border-red-900 bg-red-950/30 text-red-400'
                      : 'border-orange-900 bg-orange-950/30 text-orange-300'
                }`}
                role="status"
                aria-live="polite"
              >
                {status.kind === 'success' && <CheckCircle2 className="h-5 w-5" />}
                {status.kind === 'error' && <AlertTriangle className="h-5 w-5" />}
                {status.kind === 'info' && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                <span className="text-sm font-medium">{status.message}</span>
              </div>
            )}

            {/* Invalid ASIN preview if any */}
            {parsed.invalid.length > 0 && (
              <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-xs text-red-300">
                <p className="mb-2 font-bold">
                  {parsed.invalid.length} entr{parsed.invalid.length === 1 ? 'y' : 'ies'} won&apos;t match
                  Amazon&apos;s ASIN format (B + 9 alphanumeric):
                </p>
                <p className="font-mono text-red-400/80">
                  {parsed.invalid.slice(0, 8).join(', ')}
                  {parsed.invalid.length > 8 && ` … +${parsed.invalid.length - 8} more`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* GUIDE */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
            <BookOpen className="h-6 w-6 text-orange-500" />
            Workflow guide
          </h2>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <GuideCard
              accent="emerald"
              icon={<Info className="h-5 w-5 text-emerald-400" />}
              title="When to use this"
            >
              Perfect for <b>variation listings</b>. If 50 shirts (different sizes / colors) all share
              the same sizing chart on PT05, this tool clones that chart 50 times with the correct ASIN
              prefix in seconds.
            </GuideCard>
            <GuideCard
              accent="orange"
              icon={<Layers className="h-5 w-5 text-orange-400" />}
              title="Multi-variant in one run"
            >
              Upload your MAIN, PT01, and PT02 once → add 100 ASINs → get a ZIP with{' '}
              <span className="font-mono text-slate-200">300 files</span>, all correctly named. No more
              one-zip-per-slot.
            </GuideCard>
            <GuideCard
              accent="blue"
              icon={<UploadCloud className="h-5 w-5 text-blue-400" />}
              title="Bulk upload"
            >
              Extract the ZIP, then go to{' '}
              <b>Catalog &gt; Upload Images &gt; Bulk Image Upload</b> in Seller Central and drag-drop
              the files in.
            </GuideCard>
          </div>
        </div>

        {/* CREATOR FOOTER */}
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
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Master slot card
──────────────────────────────────────────────── */

function MasterSlotCard({
  slot,
  index,
  canRemove,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onPickFile,
  onClearFile,
  onChangeVariant,
  onRemove,
  takenVariants,
}: {
  slot: MasterSlot;
  index: number;
  canRemove: boolean;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onPickFile: (f: File) => void;
  onClearFile: () => void;
  onChangeVariant: (code: string) => void;
  onRemove: () => void;
  takenVariants: Set<string>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center gap-2">
        <select
          value={slot.variant}
          onChange={(e) => onChangeVariant(e.target.value)}
          className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-orange-500"
          aria-label={`Variant for slot ${index + 1}`}
        >
          {IMAGE_VARIANTS.map((v) => (
            <option key={v.code} value={v.code} disabled={takenVariants.has(v.code)}>
              {v.label}
            </option>
          ))}
        </select>
        {canRemove && (
          <button
            onClick={onRemove}
            className="rounded-md border border-slate-800 p-2 text-slate-500 transition hover:border-red-900 hover:text-red-400"
            aria-label="Remove this variant slot"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <label
        htmlFor={`slot-file-${index}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
          isDragOver
            ? 'border-orange-500 bg-orange-500/10'
            : slot.file
              ? 'border-emerald-500/40 bg-emerald-900/10'
              : 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800'
        }`}
      >
        {slot.previewUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slot.previewUrl}
              alt={`${slot.variant} preview`}
              className="h-28 rounded object-contain shadow-lg"
            />
            {slot.warning && (
              <div className="absolute -bottom-2 -right-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                <AlertTriangle className="h-3 w-3" /> Low res
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 text-center">
            <FileImage className="mb-2 h-8 w-8 text-slate-500" />
            <p className="text-xs text-slate-400">
              <span className="font-bold text-white">Click or drop</span> an image
            </p>
            <p className="mt-1 text-[10px] text-slate-600">JPG or PNG · max 10 MB</p>
          </div>
        )}
        <input
          id={`slot-file-${index}`}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPickFile(f);
            // Reset so re-selecting the same file fires onChange again
            if (inputRef.current) inputRef.current.value = '';
          }}
        />
      </label>

      {slot.file && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 truncate rounded border border-slate-800 bg-slate-950 p-2">
            <FileType className="h-3 w-3 shrink-0 text-slate-500" />
            <span className="truncate text-slate-300">{slot.file.name}</span>
          </div>
          <div
            className={`flex items-center gap-2 rounded border bg-slate-950 p-2 ${
              slot.warning
                ? 'border-red-900/50 text-red-400'
                : 'border-emerald-900/50 text-emerald-400'
            }`}
          >
            <Maximize className="h-3 w-3" />
            <span>{slot.dims ? `${slot.dims.w} × ${slot.dims.h}` : 'Reading…'}</span>
          </div>
          <button
            onClick={onClearFile}
            className="col-span-2 rounded border border-slate-800 px-2 py-1 text-[11px] text-slate-500 transition hover:border-red-900/50 hover:text-red-400"
          >
            Remove file
          </button>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Guide card
──────────────────────────────────────────────── */

function GuideCard({
  accent,
  icon,
  title,
  children,
}: {
  accent: 'emerald' | 'orange' | 'blue';
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  const bg =
    accent === 'emerald'
      ? 'bg-emerald-500/10'
      : accent === 'orange'
        ? 'bg-orange-500/10'
        : 'bg-blue-500/10';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
      <h3 className="mb-2 font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">{children}</p>
    </div>
  );
}