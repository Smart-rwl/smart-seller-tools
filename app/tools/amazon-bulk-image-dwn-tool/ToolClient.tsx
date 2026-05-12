'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  AlertTriangle,
  Folder,
  CheckCircle2,
  FileImage,
  Zap,
  Package,
  Archive,
  X,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  Clock,
  Shield,
} from 'lucide-react';
import ToolWorkspace from '@/app/components/ToolWorkspace';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface ParsedResult {
  asinCount: number;
  imageCount: number;
  invalid: number;
  rows: { asin: string; urls: string[] }[];
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AmazonBulkImageDownloader() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  const [rawData, setRawData] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState(false);
  const [, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  /* ── FILE UPLOAD ── */
  const handleCSV = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!/\.(csv|tsv|txt)$/.test(name)) {
      alert('Please upload a .csv, .tsv, or .txt file');
      return;
    }
    const text = await file.text();
    if (!text.trim()) {
      alert('File is empty');
      return;
    }
    // The parser & API both handle commas and whitespace; no need to mangle the text
    setRawData(text);
    setDone(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── DRAG & DROP ── */
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCSV(file);
  };

  /* ── PARSE (handles both CSV and TSV) ── */
  const parsed = useMemo<ParsedResult>(() => {
    if (!rawData?.trim()) return { asinCount: 0, imageCount: 0, invalid: 0, rows: [] };
    const lines = rawData.split(/\r?\n/).filter((l) => l.trim());
    const rows: { asin: string; urls: string[] }[] = [];
    let imageCount = 0;
    let invalid = 0;
    for (const line of lines) {
      // Skip header row
      if (/^["']?asin\b/i.test(line.trim())) continue;
      // Split on commas OR whitespace, strip quotes
      const parts = line.replace(/["']/g, '').split(/[,\s]+/).filter(Boolean);
      if (parts.length === 0) continue;
      const asin = parts[0] || '';
      // De-dupe and filter to http(s)
      const seen = new Set<string>();
      const urls: string[] = [];
      for (const p of parts.slice(1)) {
        if (!/^https?:\/\//i.test(p)) continue;
        if (seen.has(p)) continue;
        seen.add(p);
        urls.push(p);
      }
      imageCount += urls.length;
      if (urls.length === 0) invalid++;
      rows.push({ asin, urls });
    }
    return { asinCount: rows.length, imageCount, invalid, rows };
  }, [rawData]);

  const isBlocked = loading || parsed.imageCount === 0;

  /* ── DOWNLOAD ── */
  const handleDownload = async () => {
    try {
      setLoading(true);
      setDone(false);
      setProgress(10);
      setProgressLabel('Connecting…');

      controllerRef.current = new AbortController();
      const res = await fetch('/api/amazon-bulk-image-dwn-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/zip, application/json',
        },
        body: JSON.stringify({ rawData }),
        signal: controllerRef.current.signal,
      });

      setProgress(45);
      setProgressLabel('Fetching images…');

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      // Treat any JSON response (or any non-OK) as an error and surface the real message
      if (!res.ok || contentType.includes('application/json')) {
        let message = `Server error (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) message = j.error;
        } catch {
          /* response wasn't JSON — keep the generic message */
        }
        throw new Error(message);
      }

      if (!contentType.includes('application/zip')) {
        throw new Error(`Unexpected response type: ${contentType || 'unknown'}`);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) throw new Error('Empty file received');

      setProgress(85);
      setProgressLabel('Building ZIP…');

      const imageCount = res.headers.get('X-Image-Count');
      const errorCount = res.headers.get('X-Error-Count');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'amazon-images.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setProgress(100);
      setProgressLabel(
        errorCount && Number(errorCount) > 0
          ? `Done! ${imageCount} images (${errorCount} skipped)`
          : 'Done!'
      );
      setDone(true);
    } catch (error: unknown) {
      // Silently ignore user-initiated cancellation
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const msg = error instanceof Error ? error.message : 'Something went wrong while downloading';
      console.error(error);
      alert(msg);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setProgressLabel('');
      }, 1200);
    }
  };

  /* ── CLEANUP ── */
  useEffect(() => () => { controllerRef.current?.abort(); }, []);

  /* ─────────────────────────────────────────
     LEFT PANEL
  ───────────────────────────────────────── */
  const leftPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Outfit:wght@300;400;500;600;700;800&display=swap');

        @keyframes fadeSlideUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes progressPulse {
          0%,100% { opacity:1; }
          50%      { opacity:0.6; }
        }
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes checkPop {
          0%   { transform:scale(0); opacity:0; }
          70%  { transform:scale(1.2); opacity:1; }
          100% { transform:scale(1); opacity:1; }
        }
        .bulk-card { animation: fadeSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .progress-pulse { animation: progressPulse 1.2s ease-in-out infinite; }
        .spin-slow { animation: spinSlow 1.5s linear infinite; }
        .check-pop { animation: checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .drop-zone-inner:hover { border-color: #f97316 !important; background: rgba(249,115,22,0.04) !important; }
        .row-item:hover { background: rgba(249,115,22,0.04) !important; border-color: rgba(249,115,22,0.2) !important; }
      `}</style>

      {/* ── DROP ZONE ── */}
      <div
        ref={dropRef}
        className="drop-zone-inner bulk-card"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#f97316' : '#1e293b'}`,
          borderRadius: 16,
          padding: '24px 20px',
          cursor: 'pointer',
          background: dragOver ? 'rgba(249,115,22,0.05)' : '#0a0f1a',
          transition: 'all 0.2s',
          textAlign: 'center',
          animationDelay: '0.05s',
        }}
      >
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: dragOver ? 'rgba(249,115,22,0.15)' : '#0f172a',
          border: `1px solid ${dragOver ? '#f97316' : '#1e293b'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 12px',
          transition: 'all 0.2s',
        }}>
          <Upload size={18} color={dragOver ? '#f97316' : '#475569'} />
        </div>
        <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, color: '#94a3b8', fontSize: '0.85rem', marginBottom: 4 }}>
          {dragOver ? 'Drop your file here' : 'Upload or drag a CSV / TSV / TXT file'}
        </p>
        <p style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#334155', fontSize: '0.68rem' }}>
          ASIN + image URLs per row
        </p>
        <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => e.target.files && handleCSV(e.target.files[0])} />
      </div>

      {/* ── TEXTAREA ── */}
      <div className="bulk-card" style={{ animationDelay: '0.1s', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {rawData && (
            <button
              onClick={() => { setRawData(''); setDone(false); }}
              style={{ background: '#1e293b', border: 'none', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}
              title="Clear"
              aria-label="Clear input"
            >
              <X size={12} />
            </button>
          )}
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.62rem', color: '#334155', background: '#0f172a', padding: '3px 8px', borderRadius: 6, border: '1px solid #1e293b' }}>
            ASIN  URL1  URL2…
          </span>
        </div>
        <textarea
          rows={9}
          value={rawData}
          onChange={(e) => { setRawData(e.target.value); setDone(false); }}
          placeholder={'B08N5WRWNW https://m.media-amazon.com/images/I/img1.jpg https://m.media-amazon.com/images/I/img2.jpg\nB09X7DKTLP https://m.media-amazon.com/images/I/img3.jpg'}
          style={{
            width: '100%',
            background: '#0a0f1a',
            border: '1.5px solid #1e293b',
            borderRadius: 14,
            padding: '14px 14px 14px 16px',
            paddingTop: 40,
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: '0.75rem',
            color: '#94a3b8',
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.7,
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#f97316')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        />
      </div>

      {/* ── STATS ROW ── */}
      <div className="bulk-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, animationDelay: '0.15s' }}>
        {[
          { label: 'ASINs', value: parsed.asinCount, icon: <Package size={13} />, color: '#f97316', warn: false },
          { label: 'Images', value: parsed.imageCount, icon: <ImageIcon size={13} />, color: '#38bdf8', warn: false },
          { label: 'Issues', value: parsed.invalid, icon: <AlertTriangle size={13} />, color: '#fbbf24', warn: parsed.invalid > 0 },
        ].map((s) => (
          <div key={s.label} style={{
            background: s.warn && s.value > 0 ? 'rgba(251,191,36,0.05)' : '#0a0f1a',
            border: `1.5px solid ${s.warn && s.value > 0 ? 'rgba(251,191,36,0.25)' : '#1e293b'}`,
            borderRadius: 12, padding: '12px 14px',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: s.color }}>{s.icon}
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#334155' }}>{s.label}</span>
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '1.3rem', fontWeight: 600, color: s.warn && s.value > 0 ? '#fbbf24' : '#e2e8f0', lineHeight: 1 }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── WARNING ── */}
      {parsed.invalid > 0 && (
        <div className="bulk-card" style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 12, padding: '12px 14px', animationDelay: '0.2s',
        }}>
          <AlertTriangle size={14} color="#fbbf24" style={{ marginTop: 1, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.78rem', color: '#fbbf24', lineHeight: 1.5 }}>
            {parsed.invalid} row{parsed.invalid > 1 ? 's have' : ' has'} no valid image URLs and will be skipped.
          </span>
        </div>
      )}

      {/* ── PROGRESS BAR ── */}
      {loading && (
        <div className="bulk-card" style={{ animationDelay: '0.0s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="progress-pulse" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.7rem', color: '#f97316' }}>
              {progressLabel}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.7rem', color: '#334155' }}>{progress}%</span>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 99, height: 6, overflow: 'hidden', border: '1px solid #1e293b' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, #f97316, #fb923c)',
              width: `${progress}%`,
              transition: 'width 0.4s ease',
              boxShadow: '0 0 10px rgba(249,115,22,0.5)',
            }} />
          </div>
        </div>
      )}

      {/* ── DOWNLOAD BUTTON ── */}
      <button
        className="bulk-card"
        disabled={isBlocked}
        onClick={handleDownload}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: done ? 'linear-gradient(135deg,#059669,#10b981)' :
            isBlocked ? '#0f172a' : 'linear-gradient(135deg,#ea580c,#f97316)',
          border: `1.5px solid ${done ? '#059669' : isBlocked ? '#1e293b' : '#f97316'}`,
          color: isBlocked && !done ? '#334155' : '#fff',
          padding: '14px 24px',
          borderRadius: 14,
          fontFamily: "'Outfit',sans-serif",
          fontSize: '0.9rem',
          fontWeight: 700,
          cursor: isBlocked ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          boxShadow: done ? '0 0 24px rgba(16,185,129,0.3)' : isBlocked ? 'none' : '0 0 24px rgba(249,115,22,0.25)',
          animationDelay: '0.25s',
        }}
      >
        {loading ? (
          <>
            <Archive size={16} className="spin-slow" />
            Building ZIP…
          </>
        ) : done ? (
          <>
            <CheckCircle2 size={16} className="check-pop" />
            Downloaded Successfully
          </>
        ) : (
          <>
            <Download size={16} />
            Download ZIP
            {parsed.imageCount > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                {parsed.imageCount} imgs
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );

  /* ─────────────────────────────────────────
     RIGHT PANEL
  ───────────────────────────────────────── */
  const rightPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Live preview */}
      {parsed.rows.length > 0 && (
        <div style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: '#f9731615', borderRadius: 8, padding: 6 }}>
                <Layers size={13} color="#f97316" />
              </div>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', color: '#475569' }}>LIVE PREVIEW</span>
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.62rem', color: '#334155', background: '#0f172a', padding: '3px 8px', borderRadius: 6, border: '1px solid #1e293b' }}>
              {parsed.rows.length} rows
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {parsed.rows.slice(0, 8).map((row, i) => (
              <div key={i} className="row-item" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#0f172a', border: '1px solid #1e293b', borderRadius: 9,
                padding: '8px 12px', transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: row.urls.length > 0 ? '#f97316' : '#334155', fontSize: '0.72rem', fontWeight: 500 }}>
                    {row.asin || '???'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {row.urls.length > 0 ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#10b98110', border: '1px solid #10b98120', borderRadius: 99, padding: '2px 8px' }}>
                      <FileImage size={10} color="#10b981" />
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#10b981', fontSize: '0.62rem' }}>{row.urls.length}</span>
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#ef444410', border: '1px solid #ef444420', borderRadius: 99, padding: '2px 8px' }}>
                      <AlertTriangle size={10} color="#ef4444" />
                      <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#ef4444', fontSize: '0.62rem' }}>no URLs</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
            {parsed.rows.length > 8 && (
              <p style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#334155', fontSize: '0.62rem', textAlign: 'center', paddingTop: 4 }}>
                +{parsed.rows.length - 8} more rows…
              </p>
            )}
          </div>
        </div>
      )}

      {/* ZIP structure */}
      <div style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ background: '#38bdf815', borderRadius: 8, padding: 6 }}>
            <Folder size={13} color="#38bdf8" />
          </div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', color: '#475569' }}>ZIP STRUCTURE</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.72rem', color: '#475569', background: '#0f172a', borderRadius: 10, padding: '14px 16px', lineHeight: 2, border: '1px solid #1e293b' }}>
          <span style={{ color: '#f97316' }}>amazon-images.zip</span><br />
          <span style={{ color: '#334155' }}>├─ </span><span style={{ color: '#38bdf8' }}>B08N5WRWNW/</span><br />
          <span style={{ color: '#334155' }}>│  ├─ </span><span style={{ color: '#94a3b8' }}>B08N5WRWNW.MAIN.jpg</span><br />
          <span style={{ color: '#334155' }}>│  ├─ </span><span style={{ color: '#94a3b8' }}>B08N5WRWNW.PT01.jpg</span><br />
          <span style={{ color: '#334155' }}>│  ├─ </span><span style={{ color: '#94a3b8' }}>B08N5WRWNW.PT02.jpg</span><br />
          <span style={{ color: '#334155' }}>│  └─ </span><span style={{ color: '#94a3b8' }}>B08N5WRWNW.PT03.jpg</span><br />
          <span style={{ color: '#334155' }}>├─ </span><span style={{ color: '#38bdf8' }}>B09X7DKTLP/</span><br />
          <span style={{ color: '#334155' }}>│  └─ </span><span style={{ color: '#94a3b8' }}>B09X7DKTLP.MAIN.jpg</span><br />
          <span style={{ color: '#334155' }}>└─ </span><span style={{ color: '#94a3b8' }}>error-report.txt</span>
          <span style={{ color: '#334155' }}> (if any failures)</span>
        </div>
      </div>

      {/* Feature cards */}
      {[
        {
          icon: <Zap size={13} color="#f97316" />,
          bg: '#f9731615', border: '#f9731620',
          title: 'How it works',
          items: ['Upload CSV/TSV or paste ASIN + image URLs', 'Tool renames images to Amazon standard', 'Clean ZIP downloaded in one click'],
        },
        {
          icon: <Clock size={13} color="#a78bfa" />,
          bg: '#a78bfa15', border: '#a78bfa20',
          title: 'Limits',
          items: ['Free: up to 100 images per run', 'Pro: higher limits & history', 'Supports all Amazon CDN URL formats'],
        },
        {
          icon: <Shield size={13} color="#10b981" />,
          bg: '#10b98115', border: '#10b98120',
          title: 'Why this tool',
          items: ['Manual downloads waste hours per SKU', 'Wrong file names break listings', 'This tool eliminates both problems'],
        },
      ].map((card) => (
        <div key={card.title} style={{ background: '#0a0f1a', border: `1.5px solid ${card.border}`, borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ background: card.bg, borderRadius: 8, padding: 6 }}>{card.icon}</div>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', color: '#475569' }}>
              {card.title.toUpperCase()}
            </span>
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {card.items.map((item) => (
              <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <ChevronRight size={12} color="#334155" style={{ marginTop: 3, flexShrink: 0 }} />
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );

  return (
    <ToolWorkspace
      title="Amazon Bulk Image Downloader"
      subtitle="Download, auto-rename, and organize Amazon product images at scale — one ZIP, zero manual work."
      left={leftPanel}
      right={rightPanel}
    />
  );
}