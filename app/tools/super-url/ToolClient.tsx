'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Globe,
  Search,
  Store,
  Settings,
  AlertTriangle,
  Info,
  Sparkles,
  ShieldAlert,
  Tag,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   MARKETPLACES
───────────────────────────────────────────── */
type Marketplace = { code: string; host: string; flag: string; name: string; region: string };
const MARKETPLACES: Marketplace[] = [
  { code: 'US', host: 'www.amazon.com',    flag: '🇺🇸', name: 'United States',  region: 'Americas' },
  { code: 'CA', host: 'www.amazon.ca',     flag: '🇨🇦', name: 'Canada',         region: 'Americas' },
  { code: 'MX', host: 'www.amazon.com.mx', flag: '🇲🇽', name: 'Mexico',         region: 'Americas' },
  { code: 'BR', host: 'www.amazon.com.br', flag: '🇧🇷', name: 'Brazil',         region: 'Americas' },
  { code: 'UK', host: 'www.amazon.co.uk',  flag: '🇬🇧', name: 'United Kingdom', region: 'Europe' },
  { code: 'DE', host: 'www.amazon.de',     flag: '🇩🇪', name: 'Germany',        region: 'Europe' },
  { code: 'FR', host: 'www.amazon.fr',     flag: '🇫🇷', name: 'France',         region: 'Europe' },
  { code: 'IT', host: 'www.amazon.it',     flag: '🇮🇹', name: 'Italy',          region: 'Europe' },
  { code: 'ES', host: 'www.amazon.es',     flag: '🇪🇸', name: 'Spain',          region: 'Europe' },
  { code: 'NL', host: 'www.amazon.nl',     flag: '🇳🇱', name: 'Netherlands',    region: 'Europe' },
  { code: 'SE', host: 'www.amazon.se',     flag: '🇸🇪', name: 'Sweden',         region: 'Europe' },
  { code: 'PL', host: 'www.amazon.pl',     flag: '🇵🇱', name: 'Poland',         region: 'Europe' },
  { code: 'IN', host: 'www.amazon.in',     flag: '🇮🇳', name: 'India',          region: 'Asia-Pacific' },
  { code: 'JP', host: 'www.amazon.co.jp',  flag: '🇯🇵', name: 'Japan',          region: 'Asia-Pacific' },
  { code: 'SG', host: 'www.amazon.sg',     flag: '🇸🇬', name: 'Singapore',      region: 'Asia-Pacific' },
  { code: 'AU', host: 'www.amazon.com.au', flag: '🇦🇺', name: 'Australia',      region: 'Asia-Pacific' },
  { code: 'AE', host: 'www.amazon.ae',     flag: '🇦🇪', name: 'UAE',            region: 'MENA' },
  { code: 'SA', host: 'www.amazon.sa',     flag: '🇸🇦', name: 'Saudi Arabia',   region: 'MENA' },
  { code: 'EG', host: 'www.amazon.eg',     flag: '🇪🇬', name: 'Egypt',          region: 'MENA' },
  { code: 'TR', host: 'www.amazon.com.tr', flag: '🇹🇷', name: 'Turkey',         region: 'MENA' },
];

const STORAGE_KEY = 'super-url:state:v1';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type UrlCategory = 'ranking' | 'discovery' | 'operations';

type UrlEntry = {
  category: UrlCategory;
  type: string;
  desc: string;
  useCase: string;
  url: string;
  warning?: string;
  needs?: string[]; // What inputs this URL needs; undefined = always available
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */

/** Sanitize a string into a URL-safe slug. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')                  // strip accents
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')       // strip special chars
    .trim()
    .replace(/\s+/g, '-')               // spaces → dashes
    .replace(/-+/g, '-')                // collapse multi-dashes
    .replace(/^-+|-+$/g, '');           // strip leading/trailing dashes
}

/** ASINs are 10-char alphanumeric (often starting with B0). */
function isValidAsin(asin: string): boolean {
  return /^[A-Z0-9]{10}$/i.test(asin.trim());
}

const enc = (s: string) => encodeURIComponent(s.trim());

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function SuperUrlPage() {
  const [marketplaceCode, setMarketplaceCode] = useState('US');
  const [asin, setAsin] = useState('');
  const [brand, setBrand] = useState('');
  const [keywords, setKeywords] = useState('');
  const [generated, setGenerated] = useState<UrlEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const marketplace = useMemo(
    () => MARKETPLACES.find((m) => m.code === marketplaceCode) ?? MARKETPLACES[0],
    [marketplaceCode],
  );

  /* ── Hydrate ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.marketplaceCode === 'string') setMarketplaceCode(s.marketplaceCode);
        if (typeof s.asin             === 'string') setAsin(s.asin);
        if (typeof s.brand            === 'string') setBrand(s.brand);
        if (typeof s.keywords         === 'string') setKeywords(s.keywords);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Persist (inputs only — not generated URLs) ── */
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        marketplaceCode, asin, brand, keywords,
      }));
    } catch { /* ignore */ }
  }, [hydrated, marketplaceCode, asin, brand, keywords]);

  const asinTrim = asin.trim();
  const asinValid = isValidAsin(asinTrim);
  const canGenerate = asinValid;

  const validationMessage =
    asinTrim.length === 0 ? 'Enter an ASIN to generate URLs'
    : !asinValid ? 'ASIN must be 10 alphanumeric characters'
    : null;

  /* ─── URL generators ─── */
  const generateUrls = () => {
    if (!canGenerate) return;

    const host = marketplace.host;
    const out: UrlEntry[] = [];

    // 1. Canonical (slug-embedded dp URL)
    const slugSource = [brand, keywords].filter(Boolean).join(' ');
    const slug = slugify(slugSource);
    if (slug) {
      out.push({
        category: 'ranking',
        type: 'Canonical SEO URL',
        desc: 'Product page with keywords embedded in the slug.',
        useCase: 'External link-building, social posts, blog backlinks — Amazon and Google both read the slug for context.',
        url: `https://${host}/${slug}/dp/${asinTrim}`,
      });
    }

    // 2. Keyword search (classic 2-step launch URL)
    if (keywords.trim()) {
      out.push({
        category: 'ranking',
        type: 'Keyword Search (2-step)',
        desc: 'Lands the user on the search results for your keyword — they click your listing.',
        useCase: 'Launch campaigns where you want the click to register as a keyword-driven conversion. Send paid traffic here, not to /dp/.',
        url: `https://${host}/s?k=${enc(keywords)}`,
      });
    }

    // 3. Brand-filtered keyword search
    if (brand.trim() && keywords.trim()) {
      out.push({
        category: 'ranking',
        type: 'Brand-Filtered Search',
        desc: 'Keyword search results filtered to your brand only.',
        useCase: 'Brand-aware buyers landing pre-filtered to your products. Uses Amazon\'s p_4 brand filter (the correct field for brand filtering).',
        url: `https://${host}/s?k=${enc(keywords)}&rh=p_4%3A${enc(brand)}`,
      });
    }

    // 4. Brand storefront landing
    if (brand.trim()) {
      out.push({
        category: 'discovery',
        type: 'Brand Storefront',
        desc: 'Direct link to your brand\'s storefront landing.',
        useCase: 'Best for brand awareness traffic. Note: a complete storefront URL also needs a page ID (e.g. /stores/Brand/page/UUID). This is a best-effort entry point.',
        url: `https://${host}/stores/${enc(brand)}`,
      });
    }

    // 5. Plain product page
    out.push({
      category: 'discovery',
      type: 'Product Page (dp/)',
      desc: 'Standard Amazon product page.',
      useCase: 'Direct sharing — newsletters, email signatures, customer service. Doesn\'t carry keyword attribution.',
      url: `https://${host}/dp/${asinTrim}`,
    });

    // 6. Reviews page
    out.push({
      category: 'operations',
      type: 'Reviews Page',
      desc: 'All reviews for the product.',
      useCase: 'Monitoring & customer support — quick link for your team to check incoming reviews.',
      url: `https://${host}/product-reviews/${asinTrim}`,
    });

    // 7. Direct add-to-cart (with warning)
    out.push({
      category: 'operations',
      type: 'Direct Add-to-Cart',
      desc: 'Adds the product to the user\'s cart, then redirects to cart page.',
      useCase: 'Email/social funnels for repeat customers who know what they\'re buying.',
      warning: 'Heavy or automated use of this URL can be flagged as ranking manipulation under Amazon TOS. Don\'t use it for paid traffic or "incentivized" sales.',
      url: `https://${host}/gp/aws/cart/add.html?ASIN.1=${asinTrim}&Quantity.1=1`,
    });

    setGenerated(out);
  };

  /* ── Group by category ── */
  const grouped = useMemo(() => {
    const map: Record<UrlCategory, UrlEntry[]> = { ranking: [], discovery: [], operations: [] };
    generated.forEach((e) => map[e.category].push(e));
    return map;
  }, [generated]);

  const categoryMeta: Record<UrlCategory, { icon: React.ReactNode; label: string; sub: string }> = {
    ranking:    { icon: <Sparkles className="w-4 h-4" />, label: 'Ranking & SEO',    sub: 'Keyword-aware URLs for launch campaigns' },
    discovery:  { icon: <Store className="w-4 h-4" />,    label: 'Discovery',        sub: 'Brand & product landing pages' },
    operations: { icon: <Settings className="w-4 h-4" />, label: 'Operations',       sub: 'Internal team tools' },
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ─── HEADER ─── */}
        <div className="flex items-center gap-4">
          <Link
            href="/tools"
            className="p-2 hover:bg-slate-900 rounded-full transition-colors border border-slate-800"
            title="Back to tools"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2.5">
              <LinkIcon className="w-7 h-7 text-orange-500" />
              Super URL Builder
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              SEO-aware Amazon URLs for launch, brand, and ops — six variants per ASIN.
            </p>
          </div>
        </div>

        {/* ─── INPUT FORM ─── */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Marketplace */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block tracking-wider flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Marketplace
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-lg">
                  {marketplace.flag}
                </span>
                <select
                  className="w-full pl-11 pr-9 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-medium focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition appearance-none"
                  value={marketplaceCode}
                  onChange={(e) => setMarketplaceCode(e.target.value)}
                >
                  {['Americas', 'Europe', 'Asia-Pacific', 'MENA'].map((region) => (
                    <optgroup key={region} label={region}>
                      {MARKETPLACES.filter((m) => m.region === region).map((m) => (
                        <option key={m.code} value={m.code} className="bg-slate-900">
                          {m.flag} {m.name} ({m.host.replace('www.amazon.', 'amazon.')})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">▾</span>
              </div>
            </div>

            {/* ASIN */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block tracking-wider">
                ASIN <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="B0XXXXXXXX"
                value={asin}
                onChange={(e) => setAsin(e.target.value.toUpperCase())}
                maxLength={10}
                className={`w-full p-2.5 bg-slate-950 border rounded-lg text-sm text-white font-mono uppercase tracking-wider focus:ring-2 outline-none transition ${
                  asinTrim.length > 0 && !asinValid
                    ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/20'
                    : 'border-slate-700 focus:border-orange-500 focus:ring-orange-500/20'
                }`}
              />
              {validationMessage && (
                <p className={`text-[11px] mt-1 flex items-center gap-1 ${
                  asinValid || asinTrim.length === 0 ? 'text-slate-500' : 'text-rose-400'
                }`}>
                  {asinValid || asinTrim.length === 0
                    ? <Info className="w-3 h-3" />
                    : <AlertTriangle className="w-3 h-3" />}
                  {validationMessage}
                </p>
              )}
            </div>

            {/* Brand */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block tracking-wider">
                Brand name
              </label>
              <input
                type="text"
                placeholder="e.g. Nike"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
              />
            </div>

            {/* Keywords */}
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block tracking-wider">
                Target keywords
              </label>
              <input
                type="text"
                placeholder="e.g. running shoes men"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Used in the canonical slug, keyword search, and brand-filtered search URLs.
              </p>
            </div>
          </div>

          <button
            onClick={generateUrls}
            disabled={!canGenerate}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg transition-all disabled:cursor-not-allowed shadow-lg shadow-orange-900/20"
          >
            {canGenerate ? 'Generate URLs' : 'Enter a valid ASIN first'}
          </button>
        </div>

        {/* ─── RESULTS ─── */}
        {generated.length > 0 && (
          <div className="space-y-6 pt-2">
            {(['ranking', 'discovery', 'operations'] as UrlCategory[]).map((cat) =>
              grouped[cat].length > 0 ? (
                <section key={cat}>
                  <CategoryHeader meta={categoryMeta[cat]} count={grouped[cat].length} />
                  <div className="space-y-3 mt-3">
                    {grouped[cat].map((entry, i) => (
                      <UrlCard key={`${cat}-${i}`} data={entry} />
                    ))}
                  </div>
                </section>
              ) : null,
            )}

            {/* Summary bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 flex items-center gap-3 text-sm text-slate-400">
              <Sparkles className="w-4 h-4 text-orange-400" />
              Generated <span className="font-bold text-white">{generated.length}</span> URL{generated.length !== 1 ? 's' : ''} for ASIN <span className="font-mono text-orange-400">{asinTrim}</span> on <span className="text-white">{marketplace.flag} {marketplace.name}</span>.
            </div>
          </div>
        )}

        {/* ─── EMPTY STATE ─── */}
        {generated.length === 0 && asinValid && (
          <div className="bg-slate-900 border border-dashed border-slate-700 rounded-xl p-8 text-center">
            <LinkIcon className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Click "Generate URLs" to build your link set.</p>
          </div>
        )}

        {/* ─── CREATOR FOOTER (now at page level, not inside cards) ─── */}
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

/* ═════════════════════════════════════════════
   SUB-COMPONENTS
═════════════════════════════════════════════ */

function CategoryHeader({
  meta, count,
}: {
  meta: { icon: React.ReactNode; label: string; sub: string };
  count: number;
}) {
  return (
    <div className="flex items-center gap-3 px-1">
      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
        {meta.icon}
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">{meta.label}</h3>
          <span className="text-[11px] text-slate-500 font-mono">{count}</span>
        </div>
        <p className="text-[11px] text-slate-500">{meta.sub}</p>
      </div>
    </div>
  );
}

function UrlCard({ data }: { data: UrlEntry }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = data.url;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-orange-500/40 transition-colors">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-white">{data.type}</h4>
          <p className="text-xs text-slate-400 mt-0.5">{data.desc}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={copyToClipboard}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
              copied
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <a
            href={data.url}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-orange-500/15 border border-orange-500/30 text-orange-400 hover:bg-orange-500/25 transition-colors flex items-center gap-1.5 text-xs font-bold"
            title="Open in new tab"
          >
            <ExternalLink className="w-3 h-3" /> Open
          </a>
        </div>
      </div>

      {/* URL preview */}
      <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-lg text-xs font-mono text-slate-300 break-all">
        {data.url}
      </div>

      {/* Use case */}
      <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
        <Tag className="w-3 h-3 shrink-0 mt-0.5 text-orange-400" />
        <span><b className="text-slate-400">Best for:</b> {data.useCase}</span>
      </div>

      {/* TOS warning if applicable */}
      {data.warning && (
        <div className="mt-3 p-2.5 bg-rose-950/20 border border-rose-500/30 rounded-lg flex items-start gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
          <span className="text-[11px] text-rose-200/90 leading-relaxed">
            <b className="text-rose-300">Watch out:</b> {data.warning}
          </span>
        </div>
      )}
    </div>
  );
}