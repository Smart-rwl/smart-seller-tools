'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Code2,
  Smartphone,
  Monitor,
  Bold,
  List,
  Eraser,
  Copy,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Info,
  Sparkles,
  RotateCcw,
  Check,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Type,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const ALLOWED_TAGS = new Set(['b', 'strong', 'br', 'p', 'ul', 'li', 'em', 'i']);
const MAX_CHARS = 2000;
const STORAGE_KEY = 'amazon-html:state:v1';

const EXAMPLE_INPUT = `Premium Stainless Steel Water Bottle — 32 oz Insulated Tumbler

*Double-wall vacuum insulation* keeps drinks cold for 24 hours or hot for 12 hours.

<b>Key features:</b>
<ul>
<li>BPA-free, food-grade stainless steel construction</li>
<li>Leak-proof flip-top lid with built-in carrying handle</li>
<li>Fits most car cup holders and backpack pockets</li>
<li>Easy-grip powder-coated exterior in 6 colors</li>
</ul>

Perfect for *gym workouts*, *hiking trips*, *office use*, and *daily hydration*. Backed by our lifetime warranty.`;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/** Lightweight markdown: *bold* → <b>bold</b>, newlines → <br>. */
function markdownToHtml(text: string): string {
  return text
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>') // asterisks → bold (single line only)
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br>\n');
}

/**
 * Sanitize HTML to Amazon-allowed tag set.
 * Strips disallowed tags entirely; strips attributes from allowed tags.
 * Returns sanitized HTML and a list of stripped tag names.
 */
function sanitize(html: string): { clean: string; stripped: Map<string, number> } {
  const stripped = new Map<string, number>();

  const clean = html.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9]*)(?:\s[^>]*)?\s*\/?>/g,
    (match, tagRaw) => {
      const tag = tagRaw.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        stripped.set(tag, (stripped.get(tag) ?? 0) + 1);
        return '';
      }
      // Allowed tag — strip attributes
      const isClosing = match.startsWith('</');
      const isSelfClose = match.endsWith('/>') || tag === 'br';
      if (isClosing) return `</${tag}>`;
      if (isSelfClose) return `<${tag}>`; // <br>, etc. normalized
      return `<${tag}>`;
    },
  );

  return { clean, stripped };
}

/** Clean whitespace without destroying paragraph structure. */
function cleanWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')        // collapse spaces+tabs only
    .replace(/\n{3,}/g, '\n\n')     // max 2 consecutive newlines
    .split('\n').map((l) => l.replace(/^ +| +$/g, '')).join('\n')
    .trim();
}

/** Detect platform for shortcut label. */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform);
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AmazonHtmlEditor() {
  const [rawText, setRawText] = useState('');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [showShortcut, setShowShortcut] = useState('Ctrl');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Hydrate ── */
  useEffect(() => {
    setShowShortcut(isMac() ? '⌘' : 'Ctrl');
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.rawText === 'string') setRawText(s.rawText);
        if (typeof s.previewMode === 'string') setPreviewMode(s.previewMode as 'desktop' | 'mobile');
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rawText, previewMode }));
    } catch { /* ignore */ }
  }, [hydrated, rawText, previewMode]);

  /* ── Pipeline: raw → markdown → sanitize ── */
  const { renderedHtml, strippedTags, htmlForCopy } = useMemo(() => {
    if (!rawText.trim()) return { renderedHtml: '', strippedTags: new Map<string, number>(), htmlForCopy: '' };
    const md = markdownToHtml(rawText);
    const { clean, stripped } = sanitize(md);
    return { renderedHtml: clean, strippedTags: stripped, htmlForCopy: clean };
  }, [rawText]);

  /* ── Stats ── */
  const charCount = rawText.length;
  const wordCount = useMemo(
    () => rawText.trim().split(/\s+/).filter((w) => w.length > 0).length,
    [rawText],
  );
  const overLimit = charCount > MAX_CHARS;
  const limitProgress = Math.min(100, (charCount / MAX_CHARS) * 100);
  const totalStripped = useMemo(
    () => Array.from(strippedTags.values()).reduce((a, b) => a + b, 0),
    [strippedTags],
  );

  /* ── Cursor-aware insertions ── */
  const insertTag = useCallback((tagStart: string, tagEnd: string = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = rawText;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    const newText = before + tagStart + selection + tagEnd + after;
    setRawText(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + tagStart.length, start + tagStart.length + selection.length);
    }, 0);
  }, [rawText]);

  /** Smart list: wraps each selected line as its own <li>; falls back to template if no selection. */
  const insertList = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = rawText;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    let inserted: string;
    if (selection.trim()) {
      const lines = selection.split('\n').map((l) => l.trim()).filter(Boolean);
      inserted = '<ul>\n' + lines.map((l) => `  <li>${l}</li>`).join('\n') + '\n</ul>';
    } else {
      inserted = '<ul>\n  <li>First feature</li>\n  <li>Second feature</li>\n  <li>Third feature</li>\n</ul>';
    }

    const newText = before + inserted + after;
    setRawText(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + inserted.length, start + inserted.length);
    }, 0);
  }, [rawText]);

  /* ── Keyboard shortcuts on textarea ── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    if (e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertTag('<b>', '</b>');
    } else if (e.key.toLowerCase() === 'l') {
      e.preventDefault();
      insertList();
    }
  };

  /* ── Actions ── */
  const handleCopy = async () => {
    if (!htmlForCopy) return;
    try {
      await navigator.clipboard.writeText(htmlForCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = htmlForCopy;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  const handleClean = () => { setRawText(cleanWhitespace(rawText)); };
  const handleLoadExample = () => { setRawText(EXAMPLE_INPUT); };
  const handleResetAll = () => {
    if (!confirm('Clear the editor?')) return;
    setRawText('');
    setPreviewMode('desktop');
  };

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
              <Code2 className="w-8 h-8 text-orange-500" />
              Amazon HTML Architect
            </h1>
            <p className="text-slate-400 mt-2">
              Write Amazon-compliant product descriptions with live preview, sanitization, and validation.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ComplianceBadge stripped={totalStripped} overLimit={overLimit} />
            <button
              onClick={handleLoadExample}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-orange-400 hover:text-orange-300 transition"
            >
              <Sparkles className="w-3 h-3" /> Load example
            </button>
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

          {/* ─── LEFT: EDITOR ─── */}
          <div className="flex flex-col space-y-4">

            {/* Toolbar */}
            <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl flex items-center gap-1 flex-wrap">
              <ToolbarButton
                onClick={() => insertTag('<b>', '</b>')}
                title={`Bold (${showShortcut}+B)`}
                icon={<Bold className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={insertList}
                title={`List (${showShortcut}+L)`}
                icon={<List className="w-4 h-4" />}
              />
              <ToolbarButton
                onClick={() => insertTag('<br>\n')}
                title="Line break"
                label="BR"
              />
              <ToolbarButton
                onClick={() => insertTag('<p>', '</p>')}
                title="Paragraph"
                label="P"
              />
              <div className="w-px h-6 bg-slate-800 mx-1" />
              <ToolbarButton
                onClick={handleClean}
                title="Clean whitespace (preserves newlines)"
                icon={<Eraser className="w-4 h-4" />}
              />
              <div className="flex-1" />
              <span className="text-[10px] text-slate-500 font-mono mr-2 hidden sm:inline">
                {showShortcut}+B · {showShortcut}+L
              </span>
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-[460px] bg-slate-900 border border-slate-800 rounded-xl p-5 text-sm font-mono text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 resize-none leading-relaxed transition"
                placeholder={`Type your description. Markdown helpers:\n\n*bold text* → <b>bold text</b>\nNewlines → <br>\n\nOr type HTML tags directly. Disallowed tags get stripped.`}
              />
            </div>

            {/* Stats bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-4 flex-wrap mb-3">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3 h-3 text-orange-400" />
                  <span className={`text-sm font-mono font-bold ${overLimit ? 'text-rose-400' : 'text-white'}`}>
                    {charCount.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ {MAX_CHARS.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Type className="w-3 h-3 text-slate-500" />
                  <span className="text-sm font-mono font-bold text-slate-300">{wordCount}</span>
                  <span className="text-xs text-slate-500">words</span>
                </div>
                <div className="flex-1" />
                {totalStripped > 0 ? (
                  <span className="text-[11px] text-amber-400 flex items-center gap-1 font-bold">
                    <ShieldAlert className="w-3 h-3" /> {totalStripped} tag{totalStripped > 1 ? 's' : ''} stripped
                  </span>
                ) : rawText.trim() ? (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
                    <ShieldCheck className="w-3 h-3" /> Compliant
                  </span>
                ) : null}
              </div>

              {/* Char-count progress */}
              <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full transition-all duration-300 ${
                    overLimit ? 'bg-rose-500' : limitProgress >= 90 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${limitProgress}%` }}
                />
              </div>
              {overLimit && (
                <p className="text-[11px] text-rose-400 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Over by <b>{(charCount - MAX_CHARS).toLocaleString()}</b> chars. Amazon caps descriptions at {MAX_CHARS.toLocaleString()}.
                </p>
              )}
            </div>

            {/* Stripped-tag chips */}
            {totalStripped > 0 && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Tags removed</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(strippedTags.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([tag, count]) => (
                      <span
                        key={tag}
                        className="text-[11px] font-mono px-2 py-0.5 rounded border bg-amber-500/10 border-amber-500/30 text-amber-300"
                      >
                        &lt;{tag}&gt;{count > 1 && <span className="opacity-60 ml-1">× {count}</span>}
                      </span>
                    ))}
                </div>
                <p className="text-[11px] text-amber-200/80 mt-2 leading-relaxed">
                  These tags aren't allowed in Amazon descriptions and were removed from the output below.
                </p>
              </div>
            )}

            {/* HTML output */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Output HTML <span className="text-orange-400 font-normal">(what you paste into Amazon)</span>
                </span>
                <button
                  onClick={handleCopy}
                  disabled={!htmlForCopy}
                  className={`text-xs flex items-center gap-1.5 px-2.5 py-1 rounded transition font-bold disabled:opacity-30 disabled:cursor-not-allowed ${
                    copied
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="text-xs text-orange-300 font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-40 leading-relaxed">
                {htmlForCopy || <span className="text-slate-600 italic">Output will appear here…</span>}
              </pre>
            </div>
          </div>

          {/* ─── RIGHT: PREVIEW ─── */}
          <div className="flex flex-col">
            <PreviewPane
              html={renderedHtml}
              mode={previewMode}
              onModeChange={setPreviewMode}
            />
          </div>
        </div>

        {/* ─── GUIDE ─── */}
        <div className="border-t border-slate-800 pt-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-500" />
            HTML compliance guide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GuideCard
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              borderTone="emerald"
              title="Allowed tags"
              mono="<b>  <br>  <p>  <ul>  <li>  <strong>  <em>  <i>"
              body="Amazon allows basic formatting only. This tool also strips attributes from allowed tags — Amazon ignores them anyway."
            />
            <GuideCard
              icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
              borderTone="rose"
              title="Forbidden tags"
              mono="<h1>  <img>  <a>  <iframe>  <script>  <style>  <div>"
              body="Headings, images, links, scripts. Amazon strips these silently; this tool strips them up front so you see what really gets shown."
            />
            <GuideCard
              icon={<Info className="w-5 h-5 text-orange-400" />}
              borderTone="orange"
              title="Mobile optimization"
              mono=""
              body={<>Over 70% of buyers shop on mobile. Keep paragraphs to 2–3 lines. Use bullet points heavily — they survive small screens better than dense prose.</>}
            />
          </div>
        </div>

        {/* ─── CREATOR FOOTER (inside container) ─── */}
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

      {/* ─── PREVIEW STYLING (proper margins, no <br> no-op) ─── */}
      <style jsx global>{`
        .amazon-preview { color: #333333; line-height: 1.55; }
        .amazon-preview b, .amazon-preview strong { font-weight: 700; color: #111; }
        .amazon-preview em, .amazon-preview i { font-style: italic; }
        .amazon-preview p { margin: 0 0 12px 0; }
        .amazon-preview p:last-child { margin-bottom: 0; }
        .amazon-preview ul { list-style-type: disc; padding-left: 22px; margin: 0 0 12px 0; }
        .amazon-preview ul:last-child { margin-bottom: 0; }
        .amazon-preview li { margin-bottom: 4px; line-height: 1.5; }
      `}</style>
    </div>
  );
}

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

function ToolbarButton({
  onClick, title, icon, label,
}: {
  onClick: () => void;
  title: string;
  icon?: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-slate-800 rounded text-slate-300 hover:text-orange-400 transition flex items-center justify-center min-w-[34px] min-h-[34px]"
      title={title}
    >
      {icon}
      {label && <span className="text-xs font-mono font-bold">{label}</span>}
    </button>
  );
}

function ComplianceBadge({
  stripped, overLimit,
}: { stripped: number; overLimit: boolean }) {
  if (overLimit) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-rose-500/10 border-rose-500/30">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Over limit</span>
      </div>
    );
  }
  if (stripped > 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-amber-500/10 border-amber-500/30">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-amber-400">{stripped} stripped</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-emerald-500/10 border-emerald-500/30">
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Compliant</span>
    </div>
  );
}

function PreviewPane({
  html, mode, onModeChange,
}: {
  html: string;
  mode: 'desktop' | 'mobile';
  onModeChange: (m: 'desktop' | 'mobile') => void;
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col h-full max-h-[820px]">
      {/* Browser chrome */}
      <div className="bg-slate-100 border-b border-slate-200 p-3 flex justify-between items-center">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-rose-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex bg-slate-200 rounded-lg p-1 gap-1">
          <button
            onClick={() => onModeChange('desktop')}
            className={`p-1.5 rounded transition ${
              mode === 'desktop' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Desktop preview"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => onModeChange('mobile')}
            className={`p-1.5 rounded transition ${
              mode === 'mobile' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Mobile preview"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Amazon-style content */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className={`mx-auto transition-all duration-300 ${
          mode === 'mobile' ? 'max-w-[380px] border-x border-slate-100 min-h-full' : 'w-full'
        }`}>
          {/* Fake listing header */}
          <div className="border-b border-slate-100 p-4">
            <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
            <div className="h-7 w-3/4 bg-slate-100 rounded" />
          </div>

          <div className="p-6">
            <h3 className="text-[#c45500] font-bold text-lg mb-4 border-b border-slate-100 pb-2">
              Product Description
            </h3>
            {html ? (
              <div
                className="amazon-preview font-sans text-sm"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <p className="text-slate-300 italic text-center py-10 text-sm">Preview area — type in the editor to see output here.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideCard({
  icon, title, mono, body, borderTone,
}: {
  icon: React.ReactNode;
  title: string;
  mono: string;
  body: React.ReactNode;
  borderTone: 'emerald' | 'rose' | 'orange';
}) {
  const tone = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    rose:    'bg-rose-500/10 border-rose-500/20',
    orange:  'bg-orange-500/10 border-orange-500/20',
  }[borderTone];
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 border ${tone}`}>
        {icon}
      </div>
      <h3 className="font-bold text-white mb-2">{title}</h3>
      {mono && (
        <p className="text-xs text-slate-400 leading-relaxed font-mono break-words mb-2">
          {mono}
        </p>
      )}
      <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
    </div>
  );
}