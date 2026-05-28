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
  ChevronDown,
  Image as ImageIcon,
  Layers,
  Clock,
  Shield,
  Globe,
  Settings2,
  Search,
  Hash,
} from 'lucide-react';
import ToolWorkspace from '@/app/components/ToolWorkspace';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
interface Marketplace {
  tld: string;
  flag: string;
  name: string;
  region: 'North America' | 'Europe' | 'Asia / Pacific' | 'MENA / LATAM';
  locale: string;
}

interface ParsedAsins {
  total: number;
  valid: string[];
  invalid: string[];
}

/* ─────────────────────────────────────────────
   MARKETPLACES
───────────────────────────────────────────── */
const MARKETPLACES: Marketplace[] = [
  // North America
  { tld: 'com',     flag: '🇺🇸', name: 'United States',   region: 'North America', locale: 'en-US' },
  { tld: 'ca',      flag: '🇨🇦', name: 'Canada',          region: 'North America', locale: 'en-CA' },
  { tld: 'com.mx',  flag: '🇲🇽', name: 'Mexico',          region: 'North America', locale: 'es-MX' },
  // Europe
  { tld: 'co.uk',   flag: '🇬🇧', name: 'United Kingdom',  region: 'Europe',        locale: 'en-GB' },
  { tld: 'de',      flag: '🇩🇪', name: 'Germany',         region: 'Europe',        locale: 'de-DE' },
  { tld: 'fr',      flag: '🇫🇷', name: 'France',          region: 'Europe',        locale: 'fr-FR' },
  { tld: 'it',      flag: '🇮🇹', name: 'Italy',           region: 'Europe',        locale: 'it-IT' },
  { tld: 'es',      flag: '🇪🇸', name: 'Spain',           region: 'Europe',        locale: 'es-ES' },
  { tld: 'nl',      flag: '🇳🇱', name: 'Netherlands',     region: 'Europe',        locale: 'nl-NL' },
  { tld: 'se',      flag: '🇸🇪', name: 'Sweden',          region: 'Europe',        locale: 'sv-SE' },
  { tld: 'pl',      flag: '🇵🇱', name: 'Poland',          region: 'Europe',        locale: 'pl-PL' },
  // Asia / Pacific
  { tld: 'in',      flag: '🇮🇳', name: 'India',           region: 'Asia / Pacific', locale: 'en-IN' },
  { tld: 'co.jp',   flag: '🇯🇵', name: 'Japan',           region: 'Asia / Pacific', locale: 'ja-JP' },
  { tld: 'sg',      flag: '🇸🇬', name: 'Singapore',       region: 'Asia / Pacific', locale: 'en-SG' },
  { tld: 'com.au',  flag: '🇦🇺', name: 'Australia',       region: 'Asia / Pacific', locale: 'en-AU' },
  // MENA / LATAM
  { tld: 'ae',      flag: '🇦🇪', name: 'UAE',             region: 'MENA / LATAM',  locale: 'en-AE' },
  { tld: 'sa',      flag: '🇸🇦', name: 'Saudi Arabia',    region: 'MENA / LATAM',  locale: 'ar-SA' },
  { tld: 'eg',      flag: '🇪🇬', name: 'Egypt',           region: 'MENA / LATAM',  locale: 'ar-EG' },
  { tld: 'com.tr',  flag: '🇹🇷', name: 'Turkey',          region: 'MENA / LATAM',  locale: 'tr-TR' },
  { tld: 'com.br',  flag: '🇧🇷', name: 'Brazil',          region: 'MENA / LATAM',  locale: 'pt-BR' },
];

const ASIN_REGEX = /^[A-Z0-9]{10}$/i;
const STORAGE_KEY = 'amazon-asin-tool:marketplace';

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AmazonAsinToImages() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [rawAsins, setRawAsins] = useState('');
  const [marketplace, setMarketplace] = useState<Marketplace>(MARKETPLACES[0]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchMarket, setSearchMarket] = useState('');
  const [includeVariants, setIncludeVariants] = useState(true);
  const [hiRes, setHiRes] = useState(true);
  const [maxPerAsin, setMaxPerAsin] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [done, setDone] = useState(false);

  /* ── Persist marketplace choice ── */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = MARKETPLACES.find((m) => m.tld === saved);
        if (found) setMarketplace(found);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, marketplace.tld); } catch { /* ignore */ }
  }, [marketplace]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropdownOpen]);

  /* ── FILE UPLOAD ── */
  const handleFile = async (file: File) => {
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
    setRawAsins(text);
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
    if (file) handleFile(file);
  };

  /* ── PARSE ASINS ── */
  const parsed = useMemo<ParsedAsins>(() => {
    if (!rawAsins?.trim()) return { total: 0, valid: [], invalid: [] };
    // Split on commas, whitespace, newlines, tabs, semicolons
    const tokens = rawAsins
      .replace(/["']/g, '')
      .split(/[\s,;|]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);

    const seen = new Set<string>();
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (ASIN_REGEX.test(t)) valid.push(t);
      else invalid.push(t);
    }
    return { total: tokens.length, valid, invalid };
  }, [rawAsins]);

  const isBlocked = loading || parsed.valid.length === 0;

  /* ── DOWNLOAD ── */
  const handleDownload = async () => {
    try {
      setLoading(true);
      setDone(false);
      setProgress(10);
      setProgressLabel('Resolving ASINs…');
      controllerRef.current = new AbortController();

      const res = await fetch('/api/amazon-asin-to-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/zip, application/json',
        },
        body: JSON.stringify({
          asins: parsed.valid,
          marketplace: marketplace.tld,
          locale: marketplace.locale,
          options: {
            includeVariants,
            hiRes,
            maxPerAsin: maxPerAsin ? parseInt(maxPerAsin, 10) : undefined,
          },
        }),
        signal: controllerRef.current.signal,
      });

      setProgress(45);
      setProgressLabel('Fetching product images…');

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (!res.ok || contentType.includes('application/json')) {
        let message = `Server error (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) message = j.error;
        } catch { /* not JSON */ }
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
      a.download = `amazon-${marketplace.tld}-images.zip`;
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

  /* ── Filter marketplaces by search ── */
  const filteredMarkets = useMemo(() => {
    const q = searchMarket.trim().toLowerCase();
    if (!q) return MARKETPLACES;
    return MARKETPLACES.filter(
      (m) => m.name.toLowerCase().includes(q) || m.tld.toLowerCase().includes(q)
    );
  }, [searchMarket]);

  const groupedMarkets = useMemo(() => {
    const groups: Record<string, Marketplace[]> = {};
    for (const m of filteredMarkets) {
      if (!groups[m.region]) groups[m.region] = [];
      groups[m.region].push(m);
    }
    return groups;
  }, [filteredMarkets]);

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
        @keyframes dropdownIn {
          from { opacity:0; transform:translateY(-6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .asin-card { animation: fadeSlideUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
        .progress-pulse { animation: progressPulse 1.2s ease-in-out infinite; }
        .spin-slow { animation: spinSlow 1.5s linear infinite; }
        .check-pop { animation: checkPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
        .dropdown-in { animation: dropdownIn 0.18s cubic-bezier(0.22,1,0.36,1) both; }
        .drop-zone-inner:hover { border-color: #f97316 !important; background: rgba(249,115,22,0.04) !important; }
        .row-item:hover { background: rgba(249,115,22,0.04) !important; border-color: rgba(249,115,22,0.2) !important; }
        .market-item:hover { background: rgba(249,115,22,0.06) !important; }
        .option-row:hover { background: rgba(249,115,22,0.03) !important; }
      `}</style>

      {/* ── MARKETPLACE SELECTOR ── */}
      <div ref={dropdownRef} className="asin-card" style={{ position: 'relative', animationDelay: '0.02s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Globe size={11} color="#475569" />
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#475569' }}>
            MARKETPLACE
          </span>
        </div>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#0a0f1a',
            border: `1.5px solid ${dropdownOpen ? '#f97316' : '#1e293b'}`,
            borderRadius: 12,
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{marketplace.flag}</span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: '0.82rem', color: '#e2e8f0' }}>
                {marketplace.name}
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.65rem', color: '#475569' }}>
                amazon.{marketplace.tld}
              </span>
            </span>
          </span>
          <ChevronDown size={14} color="#475569" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>

        {dropdownOpen && (
          <div
            className="dropdown-in"
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
              background: '#0a0f1a',
              border: '1.5px solid #1e293b',
              borderRadius: 12,
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              maxHeight: 320, overflow: 'hidden',
              zIndex: 50,
              display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ position: 'relative', padding: 10, borderBottom: '1px solid #1e293b' }}>
              <Search size={12} color="#475569" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                autoFocus
                value={searchMarket}
                onChange={(e) => setSearchMarket(e.target.value)}
                placeholder="Search country or TLD…"
                style={{
                  width: '100%',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  padding: '7px 10px 7px 28px',
                  fontFamily: "'Outfit',sans-serif",
                  fontSize: '0.78rem',
                  color: '#e2e8f0',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 260 }}>
              {Object.keys(groupedMarkets).length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.7rem', color: '#475569' }}>
                  No matches
                </div>
              ) : (
                Object.entries(groupedMarkets).map(([region, items]) => (
                  <div key={region}>
                    <div style={{
                      padding: '8px 14px 4px',
                      fontFamily: "'Outfit',sans-serif",
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      color: '#334155',
                      background: '#0a0f1a',
                      position: 'sticky',
                      top: 0,
                    }}>
                      {region.toUpperCase()}
                    </div>
                    {items.map((m) => {
                      const selected = m.tld === marketplace.tld;
                      return (
                        <button
                          key={m.tld}
                          className="market-item"
                          onClick={() => { setMarketplace(m); setDropdownOpen(false); setSearchMarket(''); }}
                          style={{
                            width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 14px',
                            background: selected ? 'rgba(249,115,22,0.08)' : 'transparent',
                            border: 'none',
                            borderLeft: selected ? '2px solid #f97316' : '2px solid transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{m.flag}</span>
                            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.78rem', color: selected ? '#f97316' : '#e2e8f0' }}>
                              {m.name}
                            </span>
                          </span>
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.65rem', color: '#475569' }}>
                            .{m.tld}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── ASIN INPUT ── */}
      <div className="asin-card" style={{ animationDelay: '0.06s', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Hash size={11} color="#475569" />
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#475569' }}>
              ASINS
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {rawAsins && (
              <button
                onClick={() => { setRawAsins(''); setDone(false); }}
                style={{ background: '#1e293b', border: 'none', borderRadius: 6, padding: '3px 5px', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center' }}
                title="Clear"
                aria-label="Clear ASINs"
              >
                <X size={11} />
              </button>
            )}
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.62rem', color: '#334155', background: '#0f172a', padding: '3px 8px', borderRadius: 6, border: '1px solid #1e293b' }}>
              10 chars · A-Z 0-9
            </span>
          </div>
        </div>
        <textarea
          rows={6}
          value={rawAsins}
          onChange={(e) => { setRawAsins(e.target.value); setDone(false); }}
          placeholder={'B08N5WRWNW\nB09X7DKTLP, B0CR4N9KQM\nB07FZ8S74R B0CHX1W1XY'}
          style={{
            width: '100%',
            background: '#0a0f1a',
            border: '1.5px solid #1e293b',
            borderRadius: 14,
            padding: '14px 16px',
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: '0.78rem',
            color: '#e2e8f0',
            resize: 'vertical',
            outline: 'none',
            lineHeight: 1.8,
            letterSpacing: '0.02em',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#f97316')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
        />
      </div>

      {/* ── DROP ZONE (compact) ── */}
      <div
        ref={dropRef}
        className="drop-zone-inner asin-card"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragOver ? '#f97316' : '#1e293b'}`,
          borderRadius: 12,
          padding: '12px 16px',
          cursor: 'pointer',
          background: dragOver ? 'rgba(249,115,22,0.05)' : '#0a0f1a',
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: 12,
          animationDelay: '0.1s',
        }}
      >
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: dragOver ? 'rgba(249,115,22,0.15)' : '#0f172a',
          border: `1px solid ${dragOver ? '#f97316' : '#1e293b'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 0.2s',
        }}>
          <Upload size={14} color={dragOver ? '#f97316' : '#475569'} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, color: '#94a3b8', fontSize: '0.78rem' }}>
            {dragOver ? 'Drop your file here' : 'Or upload a CSV / TSV / TXT file'}
          </p>
          <p style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#334155', fontSize: '0.62rem' }}>
            One ASIN per line, or comma-separated
          </p>
        </div>
        <input ref={fileInputRef} type="file" accept=".csv,.tsv,.txt" hidden onChange={(e) => e.target.files && handleFile(e.target.files[0])} />
      </div>

      {/* ── OPTIONS ── */}
      <div className="asin-card" style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 14, padding: '14px 16px', animationDelay: '0.14s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Settings2 size={11} color="#475569" />
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', color: '#475569' }}>
            OPTIONS
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'Include variant images', sub: 'PT01 – PT08 alt angles', checked: includeVariants, onChange: () => setIncludeVariants((v) => !v) },
            { label: 'Hi-res (max resolution)', sub: 'Strip Amazon size suffix _SL1500_, etc.', checked: hiRes, onChange: () => setHiRes((v) => !v) },
          ].map((opt) => (
            <label
              key={opt.label}
              className="option-row"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.8rem', fontWeight: 500, color: '#e2e8f0' }}>
                  {opt.label}
                </span>
                <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.62rem', color: '#475569' }}>
                  {opt.sub}
                </span>
              </div>
              <div
                onClick={opt.onChange}
                style={{
                  width: 32, height: 18, borderRadius: 99,
                  background: opt.checked ? '#f97316' : '#1e293b',
                  position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                  boxShadow: opt.checked ? '0 0 10px rgba(249,115,22,0.4)' : 'none',
                }}
              >
                <div style={{
                  position: 'absolute', top: 2, left: opt.checked ? 16 : 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
            </label>
          ))}

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 10px', marginTop: 2,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.8rem', fontWeight: 500, color: '#e2e8f0' }}>
                Max images per ASIN
              </span>
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.62rem', color: '#475569' }}>
                Leave empty for all available
              </span>
            </div>
            <input
              type="number"
              min={1}
              max={20}
              value={maxPerAsin}
              onChange={(e) => setMaxPerAsin(e.target.value)}
              placeholder="∞"
              style={{
                width: 60,
                background: '#0f172a',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: '6px 10px',
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: '0.78rem',
                color: '#e2e8f0',
                outline: 'none',
                textAlign: 'center',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#f97316')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#1e293b')}
            />
          </div>
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="asin-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, animationDelay: '0.18s' }}>
        {[
          { label: 'Detected', value: parsed.total, icon: <Hash size={13} />, color: '#94a3b8', warn: false },
          { label: 'Valid', value: parsed.valid.length, icon: <CheckCircle2 size={13} />, color: '#10b981', warn: false },
          { label: 'Invalid', value: parsed.invalid.length, icon: <AlertTriangle size={13} />, color: '#fbbf24', warn: parsed.invalid.length > 0 },
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
      {parsed.invalid.length > 0 && (
        <div className="asin-card" style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 12, padding: '12px 14px', animationDelay: '0.22s',
        }}>
          <AlertTriangle size={14} color="#fbbf24" style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.78rem', color: '#fbbf24', lineHeight: 1.5 }}>
              {parsed.invalid.length} entr{parsed.invalid.length > 1 ? 'ies are' : 'y is'} not a valid 10-character ASIN and will be skipped.
            </span>
            {parsed.invalid.length <= 5 && (
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.68rem', color: '#a16207' }}>
                {parsed.invalid.join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── PROGRESS BAR ── */}
      {loading && (
        <div className="asin-card" style={{ animationDelay: '0.0s' }}>
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
        className="asin-card"
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
          animationDelay: '0.26s',
        }}
      >
        {loading ? (
          <>
            <Archive size={16} className="spin-slow" />
            Fetching & zipping…
          </>
        ) : done ? (
          <>
            <CheckCircle2 size={16} className="check-pop" />
            Downloaded Successfully
          </>
        ) : (
          <>
            <Download size={16} />
            Fetch & Download ZIP
            {parsed.valid.length > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 99, padding: '2px 8px', fontSize: '0.72rem', fontWeight: 800 }}>
                {parsed.valid.length} ASIN{parsed.valid.length > 1 ? 's' : ''}
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
      {/* Marketplace summary */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.04), rgba(56,189,248,0.04))',
        border: '1.5px solid #1e293b',
        borderRadius: 16, padding: 20,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -30, right: -30,
          fontSize: '7rem', opacity: 0.08, lineHeight: 1, userSelect: 'none',
        }}>
          {marketplace.flag}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, position: 'relative' }}>
          <div style={{ background: '#f9731615', borderRadius: 8, padding: 6 }}>
            <Globe size={13} color="#f97316" />
          </div>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', color: '#475569' }}>
            TARGET MARKETPLACE
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, position: 'relative' }}>
          <span style={{ fontSize: '2rem', lineHeight: 1 }}>{marketplace.flag}</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#e2e8f0' }}>
              {marketplace.name}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.75rem', color: '#f97316' }}>
              amazon.{marketplace.tld}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, position: 'relative' }}>
          <div style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 9, padding: '8px 10px' }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', color: '#334155', marginBottom: 3 }}>
              LOCALE
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.78rem', color: '#94a3b8' }}>
              {marketplace.locale}
            </div>
          </div>
          <div style={{ flex: 1, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 9, padding: '8px 10px' }}>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', color: '#334155', marginBottom: 3 }}>
              REGION
            </div>
            <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: '0.74rem', color: '#94a3b8' }}>
              {marketplace.region}
            </div>
          </div>
        </div>
      </div>

      {/* Live preview */}
      {parsed.valid.length > 0 && (
        <div style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 16, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: '#f9731615', borderRadius: 8, padding: 6 }}>
                <Layers size={13} color="#f97316" />
              </div>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.1em', color: '#475569' }}>LIVE PREVIEW</span>
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.62rem', color: '#334155', background: '#0f172a', padding: '3px 8px', borderRadius: 6, border: '1px solid #1e293b' }}>
              {parsed.valid.length} valid
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {parsed.valid.slice(0, 10).map((asin, i) => (
              <div key={i} className="row-item" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#0f172a', border: '1px solid #1e293b', borderRadius: 9,
                padding: '8px 12px', transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#f97316', fontSize: '0.74rem', fontWeight: 500 }}>
                    {asin}
                  </span>
                </div>
                <a
                  href={`https://www.amazon.${marketplace.tld}/dp/${asin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: '#38bdf810', border: '1px solid #38bdf820', borderRadius: 99,
                    padding: '2px 8px', textDecoration: 'none',
                  }}
                >
                  <FileImage size={10} color="#38bdf8" />
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#38bdf8', fontSize: '0.62rem' }}>
                    view
                  </span>
                </a>
              </div>
            ))}
            {parsed.valid.length > 10 && (
              <p style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#334155', fontSize: '0.62rem', textAlign: 'center', paddingTop: 4 }}>
                +{parsed.valid.length - 10} more ASINs…
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
          <span style={{ color: '#f97316' }}>amazon-{marketplace.tld}-images.zip</span><br />
          <span style={{ color: '#334155' }}>├─ </span><span style={{ color: '#38bdf8' }}>B08N5WRWNW/</span><br />
          <span style={{ color: '#334155' }}>│  ├─ </span><span style={{ color: '#94a3b8' }}>B08N5WRWNW.MAIN.jpg</span><br />
          <span style={{ color: '#334155' }}>│  ├─ </span><span style={{ color: '#94a3b8' }}>B08N5WRWNW.PT01.jpg</span><br />
          <span style={{ color: '#334155' }}>│  └─ </span><span style={{ color: '#94a3b8' }}>B08N5WRWNW.PT02.jpg</span><br />
          <span style={{ color: '#334155' }}>├─ </span><span style={{ color: '#38bdf8' }}>B09X7DKTLP/</span><br />
          <span style={{ color: '#334155' }}>│  └─ </span><span style={{ color: '#94a3b8' }}>B09X7DKTLP.MAIN.jpg</span><br />
          <span style={{ color: '#334155' }}>├─ </span><span style={{ color: '#94a3b8' }}>manifest.json</span>
          <span style={{ color: '#334155' }}> (ASIN → image map)</span><br />
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
          items: [
            'Paste ASINs or upload a CSV / TXT file',
            'Pick the marketplace (US, UK, IN, AE, etc.)',
            'We fetch each PDP and pull all listing images',
            'You get a clean ZIP — folder per ASIN, Amazon-standard filenames',
          ],
        },
        {
          icon: <Clock size={13} color="#a78bfa" />,
          bg: '#a78bfa15', border: '#a78bfa20',
          title: 'Limits & speed',
          items: [
            'Free: up to 25 ASINs per run',
            'Best-effort fetch — large batches may take 30–60s',
            'Rate-limited to stay friendly with Amazon',
            'Cached for 24h — re-runs are instant',
          ],
        },
        {
          icon: <Shield size={13} color="#10b981" />,
          bg: '#10b98115', border: '#10b98120',
          title: 'Why this tool',
          items: [
            'No more right-click → save-image for every angle',
            'Filenames match Amazon\'s standard (.MAIN, .PT01…)',
            'Hi-res by default — strips _SL1500_ size suffixes',
            'For sellers downloading their own listing assets',
          ],
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
      title="Amazon ASIN to Images"
      subtitle="Paste ASINs, pick a marketplace, and grab every PDP image — auto-renamed, hi-res, zipped. No URLs required."
      left={leftPanel}
      right={rightPanel}
    />
  );
}