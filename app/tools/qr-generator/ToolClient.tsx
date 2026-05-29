'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Download,
  Image as ImageIcon,
  Link as LinkIcon,
  Settings,
  Palette,
  Share2,
  BookOpen,
  MousePointerClick,
  Wifi,
  Mail,
  Phone,
  MessageSquare,
  Type,
  Copy,
  Check,
  X,
  AlertTriangle,
  Ruler,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   TYPES & CONSTANTS
───────────────────────────────────────────── */
type DataType = 'url' | 'text' | 'wifi' | 'email' | 'phone' | 'sms';
type ErrorLevel = 'L' | 'M' | 'Q' | 'H';
type WifiSecurity = 'WPA' | 'WEP' | 'nopass';

const DATA_TYPES: { value: DataType; label: string; icon: typeof LinkIcon }[] = [
  { value: 'url',   label: 'URL',   icon: LinkIcon },
  { value: 'text',  label: 'Text',  icon: Type },
  { value: 'wifi',  label: 'WiFi',  icon: Wifi },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'sms',   label: 'SMS',   icon: MessageSquare },
];

const ERROR_LEVELS: {
  value: ErrorLevel;
  label: string;
  pct: number;
  sub: string;
  logoSafe: boolean;
}[] = [
  { value: 'L', label: 'Low',      pct: 7,  sub: 'Densest · no logo',        logoSafe: false },
  { value: 'M', label: 'Medium',   pct: 15, sub: 'Small logo OK',            logoSafe: false },
  { value: 'Q', label: 'Quartile', pct: 25, sub: 'Logo-safe',                logoSafe: true  },
  { value: 'H', label: 'High',     pct: 30, sub: 'Max protection · for logos', logoSafe: true },
];

const DISPLAY_SIZE = 280;        // QR preview rendered at this size
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const STORAGE_KEY = 'smart-qr-architect:state:v1';

/* WiFi string escape per WiFi QR spec */
const wifiEscape = (s: string) => s.replace(/([\\;,":])/g, '\\$1');

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function SmartQRArchitect() {
  /* ── Data state per type ── */
  const [dataType, setDataType] = useState<DataType>('url');
  const [url, setUrl] = useState('https://smart-seller-tools.vercel.app/');
  const [text, setText] = useState('');
  const [wifi, setWifi] = useState({ ssid: '', password: '', security: 'WPA' as WifiSecurity, hidden: false });
  const [email, setEmail] = useState({ to: '', subject: '', body: '' });
  const [phone, setPhone] = useState('');
  const [sms, setSms] = useState({ number: '', message: '' });

  /* ── UTM (URL type only) ── */
  const [utm, setUtm] = useState({
    enabled: false,
    source: 'product_insert',
    medium: 'qr_code',
    campaign: '',
    term: '',
    content: '',
  });
  const [utmExpanded, setUtmExpanded] = useState(false);

  /* ── Visual settings ── */
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [errorLevel, setErrorLevel] = useState<ErrorLevel>('H');
  const [exportSize, setExportSize] = useState(1000);
  const [includeMargin, setIncludeMargin] = useState(true);

  /* ── Logo ── */
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoSize, setLogoSize] = useState(20); // % of QR size

  /* ── UI state ── */
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /* ── Hydrate persisted style settings only (not data) ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.fgColor) setFgColor(s.fgColor);
        if (s.bgColor) setBgColor(s.bgColor);
        if (s.errorLevel) setErrorLevel(s.errorLevel);
        if (typeof s.exportSize === 'number') setExportSize(s.exportSize);
        if (typeof s.includeMargin === 'boolean') setIncludeMargin(s.includeMargin);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        fgColor, bgColor, errorLevel, exportSize, includeMargin,
      }));
    } catch { /* ignore */ }
  }, [hydrated, fgColor, bgColor, errorLevel, exportSize, includeMargin]);

  /* ── Toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ── Compute the actual encoded value ── */
  const encodedValue = useMemo(() => {
    switch (dataType) {
      case 'url': {
        let u = url.trim();
        if (!u) return '';
        if (utm.enabled && /^https?:\/\//i.test(u)) {
          const params = new URLSearchParams();
          if (utm.source.trim())   params.set('utm_source',   utm.source.trim());
          if (utm.medium.trim())   params.set('utm_medium',   utm.medium.trim());
          if (utm.campaign.trim()) params.set('utm_campaign', utm.campaign.trim());
          if (utm.term.trim())     params.set('utm_term',     utm.term.trim());
          if (utm.content.trim())  params.set('utm_content',  utm.content.trim());
          const qs = params.toString();
          if (qs) u += (u.includes('?') ? '&' : '?') + qs;
        }
        return u;
      }
      case 'text':
        return text;
      case 'wifi': {
        if (!wifi.ssid) return '';
        const sec = wifi.security === 'nopass' ? 'nopass' : wifi.security;
        const pass = wifi.security === 'nopass' ? '' : wifi.password;
        let s = `WIFI:T:${sec};S:${wifiEscape(wifi.ssid)};`;
        if (pass) s += `P:${wifiEscape(pass)};`;
        if (wifi.hidden) s += 'H:true;';
        return s + ';';
      }
      case 'email': {
        if (!email.to) return '';
        const params = new URLSearchParams();
        if (email.subject.trim()) params.set('subject', email.subject.trim());
        if (email.body.trim()) params.set('body', email.body.trim());
        const qs = params.toString();
        return `mailto:${email.to.trim()}${qs ? '?' + qs : ''}`;
      }
      case 'phone':
        return phone.trim() ? `tel:${phone.trim()}` : '';
      case 'sms':
        if (!sms.number.trim()) return '';
        return `smsto:${sms.number.trim()}:${sms.message}`;
      default:
        return '';
    }
  }, [dataType, url, text, wifi, email, phone, sms, utm]);

  /* ── Validation / hints ── */
  const isValid = encodedValue.length > 0;
  const dataLength = encodedValue.length;
  const inchesAt300dpi = (exportSize / 300).toFixed(2);
  const cmAt300dpi = (exportSize / 300 * 2.54).toFixed(2);

  // Warn when logo size is too aggressive for the chosen error level
  const currentLevel = ERROR_LEVELS.find((l) => l.value === errorLevel)!;
  const logoTooLarge = logoUrl && logoSize > currentLevel.pct - 5;
  const logoNeedsHigherEcc = logoUrl && !currentLevel.logoSafe;

  /* ── Copy helpers ── */
  const copy = useCallback((value: string, key: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    });
  }, []);

  const copyImage = useCallback(async () => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('no blob'))), 'image/png'),
      );
      // Clipboard API for images (Chromium/Firefox)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setToast('QR copied to clipboard');
    } catch {
      setToast('Clipboard image not supported in this browser');
    }
  }, []);

  /* ── Logo upload ── */
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast('File must be an image');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setToast(`Logo over 2 MB (${(file.size / 1024 / 1024).toFixed(1)} MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setLogoUrl(ev.target.result as string);
    };
    reader.readAsDataURL(file);
    // reset input so the same file can be re-selected if cleared
    e.target.value = '';
  };

  const removeLogo = () => {
    setLogoUrl('');
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  /* ── Downloads ── */
  const downloadRaster = (format: 'png' | 'jpeg') => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL(`image/${format}`, format === 'jpeg' ? 0.92 : undefined);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${Date.now()}.${format === 'jpeg' ? 'jpg' : format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setToast(`Downloaded ${format === 'jpeg' ? 'JPG' : 'PNG'}`);
  };

  const downloadSvg = () => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return;
    // Clone + ensure namespace + dimensions
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    if (!clone.getAttribute('width')) clone.setAttribute('width', String(exportSize));
    if (!clone.getAttribute('height')) clone.setAttribute('height', String(exportSize));
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setToast('Downloaded SVG');
  };

  /* ── Image settings shared by canvas + svg ── */
  const imageSettings = logoUrl
    ? {
        src: logoUrl,
        height: exportSize * (logoSize / 100),
        width:  exportSize * (logoSize / 100),
        excavate: true,
      }
    : undefined;

  const displayImageSettings = logoUrl
    ? {
        src: logoUrl,
        height: DISPLAY_SIZE * (logoSize / 100),
        width:  DISPLAY_SIZE * (logoSize / 100),
        excavate: true,
      }
    : undefined;

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 border-b border-slate-800 pb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <QrCode className="w-8 h-8 text-orange-500" />
              Smart QR Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Create branded, trackable QR codes for packaging, marketing, and print.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadRaster('jpeg')}
              disabled={!isValid}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm border border-slate-700 transition"
            >
              <Download className="w-4 h-4" /> JPG
            </button>
            <button
              onClick={downloadSvg}
              disabled={!isValid}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm border border-slate-700 transition"
            >
              <Download className="w-4 h-4" /> SVG
            </button>
            <button
              onClick={() => downloadRaster('png')}
              disabled={!isValid}
              className="flex items-center gap-2 px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold transition shadow-lg shadow-orange-900/30"
            >
              <Download className="w-4 h-4" /> PNG
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">

          {/* ─── LEFT: CONFIG ─── */}
          <div className="lg:col-span-5 space-y-6">

            {/* Data type tabs */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                <Sparkles className="w-4 h-4 text-orange-400" /> What does it encode?
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {DATA_TYPES.map((dt) => {
                  const active = dt.value === dataType;
                  const Icon = dt.icon;
                  return (
                    <button
                      key={dt.value}
                      onClick={() => setDataType(dt.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border text-xs font-bold transition ${
                        active
                          ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-sm shadow-orange-900/20'
                          : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {dt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Per-type input + UTM */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                <LinkIcon className="w-4 h-4 text-orange-400" /> Destination
              </h3>

              {dataType === 'url' && (
                <div className="space-y-4">
                  <FieldLabel>Target URL</FieldLabel>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                    placeholder="https://example.com"
                  />

                  {/* UTM block */}
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Toggle
                        checked={utm.enabled}
                        onChange={(v) => setUtm((u) => ({ ...u, enabled: v }))}
                      />
                      <span className="text-sm font-bold text-slate-200">Add UTM tracking</span>
                    </label>

                    {utm.enabled && (
                      <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <UtmInput label="Source *"   value={utm.source}   placeholder="product_insert" onChange={(v) => setUtm((u) => ({ ...u, source: v }))} />
                          <UtmInput label="Medium *"   value={utm.medium}   placeholder="qr_code"        onChange={(v) => setUtm((u) => ({ ...u, medium: v }))} />
                        </div>
                        <UtmInput label="Campaign *" value={utm.campaign} placeholder="spring_launch_2025" onChange={(v) => setUtm((u) => ({ ...u, campaign: v }))} />

                        <button
                          onClick={() => setUtmExpanded((v) => !v)}
                          className="text-[11px] text-slate-500 hover:text-orange-400 flex items-center gap-1 transition"
                        >
                          {utmExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {utmExpanded ? 'Hide' : 'Add'} optional fields
                        </button>

                        {utmExpanded && (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <UtmInput label="Term"    value={utm.term}    placeholder="keyword"      onChange={(v) => setUtm((u) => ({ ...u, term: v }))} />
                            <UtmInput label="Content" value={utm.content} placeholder="variant_a"    onChange={(v) => setUtm((u) => ({ ...u, content: v }))} />
                          </div>
                        )}

                        {!/^https?:\/\//i.test(url.trim()) && (
                          <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            UTMs only work on http/https URLs
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {dataType === 'text' && (
                <div>
                  <FieldLabel>Plain text</FieldLabel>
                  <textarea
                    rows={5}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-y transition"
                    placeholder="Anything — a note, a code, ASCII art…"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">{text.length} chars</p>
                </div>
              )}

              {dataType === 'wifi' && (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Network name (SSID)</FieldLabel>
                    <input
                      value={wifi.ssid}
                      onChange={(e) => setWifi((w) => ({ ...w, ssid: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                      placeholder="MyHomeWiFi"
                    />
                  </div>
                  <div>
                    <FieldLabel>Security</FieldLabel>
                    <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-700">
                      {(['WPA', 'WEP', 'nopass'] as WifiSecurity[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setWifi((w) => ({ ...w, security: s }))}
                          className={`flex-1 py-1.5 text-xs font-mono rounded transition ${
                            wifi.security === s ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {s === 'nopass' ? 'None' : s}
                        </button>
                      ))}
                    </div>
                  </div>
                  {wifi.security !== 'nopass' && (
                    <div>
                      <FieldLabel>Password</FieldLabel>
                      <input
                        type="text"
                        value={wifi.password}
                        onChange={(e) => setWifi((w) => ({ ...w, password: e.target.value }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                        placeholder="••••••••"
                      />
                    </div>
                  )}
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={wifi.hidden}
                      onChange={(e) => setWifi((w) => ({ ...w, hidden: e.target.checked }))}
                      className="rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500"
                    />
                    Hidden network
                  </label>
                </div>
              )}

              {dataType === 'email' && (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Send to</FieldLabel>
                    <input
                      type="email"
                      value={email.to}
                      onChange={(e) => setEmail((m) => ({ ...m, to: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                      placeholder="hello@example.com"
                    />
                  </div>
                  <div>
                    <FieldLabel>Subject</FieldLabel>
                    <input
                      type="text"
                      value={email.subject}
                      onChange={(e) => setEmail((m) => ({ ...m, subject: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                      placeholder="(optional)"
                    />
                  </div>
                  <div>
                    <FieldLabel>Body</FieldLabel>
                    <textarea
                      rows={3}
                      value={email.body}
                      onChange={(e) => setEmail((m) => ({ ...m, body: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-y transition"
                      placeholder="(optional)"
                    />
                  </div>
                </div>
              )}

              {dataType === 'phone' && (
                <div>
                  <FieldLabel>Phone number</FieldLabel>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                    placeholder="+1 555 123 4567"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Include country code for international reach.</p>
                </div>
              )}

              {dataType === 'sms' && (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Phone number</FieldLabel>
                    <input
                      type="tel"
                      value={sms.number}
                      onChange={(e) => setSms((s) => ({ ...s, number: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white font-mono text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                      placeholder="+1 555 123 4567"
                    />
                  </div>
                  <div>
                    <FieldLabel>Pre-filled message</FieldLabel>
                    <textarea
                      rows={3}
                      value={sms.message}
                      onChange={(e) => setSms((s) => ({ ...s, message: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none resize-y transition"
                      placeholder="Hi, I'd like to know more about…"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Appearance */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                <Palette className="w-4 h-4 text-orange-400" /> Appearance
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ColorField label="Foreground" value={fgColor} onChange={setFgColor} />
                  <ColorField label="Background" value={bgColor} onChange={setBgColor} />
                </div>

                {/* Error correction */}
                <div>
                  <FieldLabel>Error correction</FieldLabel>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ERROR_LEVELS.map((lvl) => {
                      const active = lvl.value === errorLevel;
                      return (
                        <button
                          key={lvl.value}
                          onClick={() => setErrorLevel(lvl.value)}
                          title={lvl.sub}
                          className={`flex flex-col items-center py-2 rounded-md border text-[11px] font-bold transition ${
                            active
                              ? 'bg-orange-500/10 border-orange-500/40 text-orange-400'
                              : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-sm">{lvl.value}</span>
                          <span className="opacity-70">{lvl.pct}%</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">{currentLevel.sub}</p>
                </div>

                {/* Export resolution */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between">
                    <span>Export resolution</span>
                    <span className="font-mono normal-case text-slate-300">{exportSize} px</span>
                  </label>
                  <input
                    type="range"
                    min={200}
                    max={2000}
                    step={50}
                    value={exportSize}
                    onChange={(e) => setExportSize(Number(e.target.value))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                    <span>200</span>
                    <span className="text-orange-400">≈ {inchesAt300dpi}″ · {cmAt300dpi} cm at 300 DPI</span>
                    <span>2000</span>
                  </div>
                </div>

                {/* Quiet zone */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-bold text-slate-200">Quiet zone (margin)</span>
                    <p className="text-[11px] text-slate-500">Recommended for reliable scanning</p>
                  </div>
                  <Toggle checked={includeMargin} onChange={setIncludeMargin} />
                </label>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4 text-sm">
                <ImageIcon className="w-4 h-4 text-orange-400" /> Logo embed
              </h3>

              <div className="space-y-4">
                {!logoUrl ? (
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-orange-500/10 file:text-orange-400 file:cursor-pointer hover:file:bg-orange-500/20 transition"
                    />
                    <p className="text-[11px] text-slate-500 mt-2">PNG or SVG · max 2 MB · centered automatically</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-2 bg-slate-950 border border-slate-800 rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded border border-slate-700 bg-white p-1" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-300 truncate">Logo loaded</div>
                        <div className="text-[10px] text-slate-500">Embedded in QR center</div>
                      </div>
                      <button
                        onClick={removeLogo}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                        title="Remove logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 flex justify-between">
                        <span>Logo size</span>
                        <span className={`font-mono normal-case ${logoTooLarge ? 'text-amber-400' : 'text-slate-300'}`}>
                          {logoSize}%
                        </span>
                      </label>
                      <input
                        type="range"
                        min={10}
                        max={30}
                        value={logoSize}
                        onChange={(e) => setLogoSize(Number(e.target.value))}
                        className="w-full accent-orange-500"
                      />
                    </div>

                    {logoNeedsHigherEcc && (
                      <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-300">
                          Level <strong>{errorLevel}</strong> may not scan reliably with a logo.
                          <button
                            onClick={() => setErrorLevel('H')}
                            className="ml-1 text-amber-400 hover:text-amber-300 underline underline-offset-2"
                          >
                            Switch to H (recommended)
                          </button>
                        </div>
                      </div>
                    )}

                    {logoTooLarge && !logoNeedsHigherEcc && (
                      <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="text-[11px] text-amber-300">
                          Logo is close to the recovery limit for level <strong>{errorLevel}</strong>.
                          Test scan before printing.
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ─── RIGHT: PREVIEW ─── */}
          <div className="lg:col-span-7 flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 min-h-[500px] relative p-8">

            {/* QR canvas */}
            <div className="flex-1 flex items-center justify-center">
              {isValid ? (
                <div
                  ref={qrRef}
                  className="p-4 shadow-2xl rounded-lg transition-colors"
                  style={{ backgroundColor: bgColor }}
                >
                  <QRCodeCanvas
                    value={encodedValue}
                    size={exportSize}
                    fgColor={fgColor}
                    bgColor={bgColor}
                    level={errorLevel}
                    includeMargin={includeMargin}
                    imageSettings={imageSettings}
                    style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-600 text-center max-w-xs">
                  <QrCode className="w-20 h-20 opacity-20 mb-3" />
                  <p className="text-sm">Fill in the destination on the left to see your QR code.</p>
                </div>
              )}
            </div>

            {/* Hidden SVG used for SVG download */}
            <div ref={svgRef} className="hidden" aria-hidden>
              {isValid && (
                <QRCodeSVG
                  value={encodedValue}
                  size={exportSize}
                  fgColor={fgColor}
                  bgColor={bgColor}
                  level={errorLevel}
                  includeMargin={includeMargin}
                  imageSettings={imageSettings}
                />
              )}
            </div>

            {/* Encoded data box */}
            {isValid && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Encoded data · {dataLength} chars
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copy(encodedValue, 'data')}
                      className="text-[11px] flex items-center gap-1 text-slate-400 hover:text-orange-400 transition"
                    >
                      {copiedKey === 'data' ? (
                        <><Check className="w-3 h-3 text-emerald-400" /> Copied</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy</>
                      )}
                    </button>
                    <button
                      onClick={copyImage}
                      className="text-[11px] flex items-center gap-1 text-slate-400 hover:text-orange-400 transition"
                    >
                      <ImageIcon className="w-3 h-3" /> Copy image
                    </button>
                  </div>
                </div>
                <p className="text-xs font-mono text-orange-300 break-all bg-orange-500/5 p-2.5 rounded border border-orange-500/20 max-h-24 overflow-y-auto">
                  {encodedValue}
                </p>

                {/* Stats row */}
                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Settings className="w-3 h-3" />
                    Level <span className="text-slate-300 font-mono">{errorLevel}</span> · {currentLevel.pct}% recovery
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-3 h-3" />
                    <span className="text-slate-300 font-mono">{inchesAt300dpi}″</span> at 300 DPI
                  </span>
                  {dataType === 'url' && utm.enabled && (
                    <span className="flex items-center gap-1.5 text-orange-400">
                      <Share2 className="w-3 h-3" />
                      Trackable
                    </span>
                  )}
                  {logoUrl && (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <ImageIcon className="w-3 h-3" />
                      Logo embedded · {logoSize}%
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            Usage Guide
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<MousePointerClick className="w-5 h-5 text-orange-400" />}
              title="Why use UTM?"
              body={
                <>
                  Adding UTM parameters turns your URL into{' '}
                  <code className="bg-slate-950 px-1 py-0.5 rounded text-orange-300">?utm_source=…&utm_medium=…</code>.
                  In Google Analytics that lets you see exactly how many people scanned your packaging vs. clicked an ad.
                </>
              }
            />
            <GuideCard
              icon={<ImageIcon className="w-5 h-5 text-orange-400" />}
              title="Logo safety"
              body={
                <>
                  Level <b>H</b> (high) error correction lets up to ~30% of the code be damaged or covered and still scan.
                  That's what makes the centered logo possible. <b>Always test-scan</b> before printing thousands.
                </>
              }
            />
            <GuideCard
              icon={<Ruler className="w-5 h-5 text-orange-400" />}
              title="Print resolution"
              body={
                <>
                  For print, export at <b>1000 px+</b> and use the SVG when possible — it stays crisp at any size.
                  For email or web, 300 px is plenty. The minimum reliable physical size is roughly <b>2 cm × 2 cm</b>.
                </>
              }
            />
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 bg-slate-900 border border-orange-500/40 text-white px-4 py-2.5 rounded-lg shadow-2xl shadow-orange-900/30 flex items-center gap-2 text-sm font-medium z-50 animate-[slideIn_0.2s_ease-out]">
            <Check className="w-4 h-4 text-orange-400" />
            {toast}
          </div>
        )}
        <style>{`
          @keyframes slideIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

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

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-xs font-bold text-slate-500 uppercase mb-1 block tracking-wider">{children}</label>;
}

function UtmInput({
  label, value, placeholder, onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block tracking-wider">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 outline-none transition"
      />
    </div>
  );
}

function ColorField({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer bg-transparent border border-slate-700"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono focus:border-orange-500 outline-none transition uppercase"
        />
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition ${checked ? 'bg-orange-500' : 'bg-slate-700'}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

function GuideCard({
  icon, title, body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className="bg-orange-500/10 border border-orange-500/20 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}