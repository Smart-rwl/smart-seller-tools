'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  Folder,
  CheckCircle2,
  Info,
} from 'lucide-react';
import ToolWorkspace from '@/app/components/ToolWorkspace';

/**
 * METADATA FOR AUTOMATION
 * The github-actions[bot] reads this block to update the README and Changelog.
 */
export const metadata = {
  title: "Amazon Bulk Image Downloader",
  description: "Bulk download and auto-rename product images from Amazon using ASINs or URLs.",
  version: "1.2.0",
  status: "Stable",
  platform: "Amazon"
};

export default function AmazonBulkImageDownloader() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [rawData, setRawData] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  /* ---------- CSV UPLOAD ---------- */
  const handleCSV = async (file: File) => {
    const text = await file.text();
    setRawData(text.replace(/,/g, '\t'));
  };

  /* ---------- PARSE (UX ONLY) ---------- */
  const parsed = useMemo(() => {
    const lines = rawData.trim().split('\n').filter(Boolean);
    let asinCount = 0;
    let imageCount = 0;
    let invalid = 0;

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const images = parts.slice(1).filter(u => u.startsWith('http'));
      asinCount++;
      imageCount += images.length;
      if (images.length === 0) invalid++;
    });

    return { asinCount, imageCount, invalid };
  }, [rawData]);

  const isBlocked = loading || parsed.imageCount === 0;

  /* ---------- DOWNLOAD (UNCHANGED BACKEND) ---------- */
  const handleDownload = async () => {
    setLoading(true);
    setProgress(30);

    const res = await fetch('/api/amazon-bulk-image-dwn-tool', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawData }),
    });

    setProgress(70);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'amazon-images.zip';
    a.click();

    URL.revokeObjectURL(url);
    setProgress(100);
    setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 800);
  };

  /* ---------- LEFT PANEL (ACTION) ---------- */
  const leftPanel = (
    <>
      {/* Upload */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="bg-slate-900 border border-slate-800 rounded-xl p-5 cursor-pointer hover:border-indigo-500 transition"
      >
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Upload className="w-4 h-4" />
            Upload or Drag CSV
          </span>
          <span className="text-xs text-slate-500">.csv</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          hidden
          onChange={e => e.target.files && handleCSV(e.target.files[0])}
        />
      </div>

      {/* Textarea */}
      <textarea
        rows={10}
        value={rawData}
        onChange={e => setRawData(e.target.value)}
        placeholder="ASIN https://image1.jpg https://image2.jpg"
        className="w-full bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm font-mono text-white placeholder-slate-600 focus:border-indigo-500 outline-none"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <Stat label="ASINs" value={parsed.asinCount} />
        <Stat label="Images" value={parsed.imageCount} />
        <Stat label="Issues" value={parsed.invalid} warn />
      </div>

      {parsed.invalid > 0 && (
        <div className="flex gap-2 bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-3 text-sm text-yellow-300">
          <AlertTriangle className="w-4 h-4 mt-0.5" />
          Some ASINs have no valid image URLs.
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* CTA */}
      <button
        disabled={isBlocked}
        onClick={handleDownload}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold disabled:opacity-40"
      >
        <Download className="w-4 h-4" />
        {loading ? 'Processing Images…' : 'Download ZIP'}
      </button>
    </>
  );

  /* ---------- RIGHT PANEL (GUIDANCE) ---------- */
  const rightPanel = (
    <>
      <InfoCard
        title="How it works"
        points={[
          'Upload CSV or paste ASIN-wise image URLs',
          'Tool renames images automatically',
          'Clean ZIP is generated for download',
        ]}
      />

      <InfoCard
        title="ZIP Structure"
        icon={<Folder className="w-4 h-4" />}
      >
        <pre className="text-xs text-slate-400 mt-2">
{`ASIN/
 ├─ ASIN.MAIN.jpg
 ├─ ASIN.PT01.jpg
 ├─ ASIN.PT02.jpg`}
        </pre>
      </InfoCard>

      <InfoCard
        title="Limits"
        points={[
          'Free: up to 100 images per run',
          'Pro: higher limits & history',
        ]}
      />

      <InfoCard
        title="Why this tool exists"
        points={[
          'Manual image downloads waste hours',
          'Naming mistakes break listings',
          'This tool eliminates both',
        ]}
      />
    </>
  );

  return (
    <ToolWorkspace
      title="Amazon Bulk Image Downloader"
      subtitle="Download, rename, and organize Amazon images at scale."
      left={leftPanel}
      right={rightPanel}
    />
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function Stat({ label, value, warn }: any) {
  return (
    <div className={`rounded-xl border border-slate-800 p-4 ${
      warn ? 'bg-yellow-900/20 border-yellow-900/40' : 'bg-slate-900'
    }`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function InfoCard({
  title,
  points,
  icon,
  children,
}: {
  title: string;
  points?: string[];
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <h3 className="text-xs font-bold uppercase text-indigo-400 mb-3 flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {points && (
        <ul className="space-y-2 text-xs text-slate-400">
          {points.map(p => (
            <li key={p} className="flex gap-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5" />
              {p}
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
