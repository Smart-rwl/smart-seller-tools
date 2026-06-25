// app/tools/page.tsx
'use client';

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Zap,
  Search,
  X,
  Star,
  Clock,
  ArrowUpRight,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { TOOLS, TOOL_GROUPS, type ToolCategory } from '../config/tools.config';


/* ─────────────────────────────────────────────
   CONFIG
───────────────────────────────────────────── */
const GROUP_ORDER: ToolCategory[] = [
  'calculators',
  'finance',
  'listing',
  'operations',
  'assets',
];

const PINS_KEY    = 'smart-seller-tools:pinned:v1';
const RECENTS_KEY = 'smart-seller-tools:recents:v1';
const MAX_RECENTS = 6;
const QUERY_DEBOUNCE_MS = 200;

type GroupKey = ToolCategory | 'all';


/* Suspense wrapper because useSearchParams() requires it */
export default function ToolsIndexPage() {
  return (
    <Suspense fallback={<div className="pt-24 px-4 text-slate-500">Loading…</div>}>
      <ToolsIndexInner />
    </Suspense>
  );
}



function ToolsIndexInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /* ── State ── */
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [activeGroup, setActiveGroup] = useState<GroupKey>(() => {
    const cat = searchParams.get('cat');
    if (!cat) return 'all';
    if (cat === 'all' || GROUP_ORDER.includes(cat as ToolCategory)) return cat as GroupKey;
    return 'all';
  });
  const [pinned, setPinned] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  /* ── Load pins & recents from localStorage ── */
  useEffect(() => {
    try {
      const p = localStorage.getItem(PINS_KEY);
      if (p) setPinned(new Set(JSON.parse(p)));
      const r = localStorage.getItem(RECENTS_KEY);
      if (r) setRecents(JSON.parse(r));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  /* ── Sync filters → URL (debounced for typing) ── */
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      const q = query.trim();
      if (q) params.set('q', q);
      if (activeGroup !== 'all') params.set('cat', activeGroup);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, QUERY_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, activeGroup, pathname, router]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inEditable =
        target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        );

      // ⌘K / Ctrl+K → focus search
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // "/" → focus search (only when not typing in another field)
      if (e.key === '/' && !inEditable) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Escape → if search focused, clear or blur
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        if (query) setQuery('');
        else searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [query]);

  /* ── Pinning ── */
  const togglePin = useCallback((slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPinned((curr) => {
      const next = new Set(curr);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  /* ── Log to recents when a tool is opened ── */
  const logRecent = useCallback((slug: string) => {
    setRecents((curr) => {
      const next = [slug, ...curr.filter((s) => s !== slug)].slice(0, MAX_RECENTS);
      try {
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  /* ── Counts per category ── */
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: TOOLS.length };
    for (const t of TOOLS) c[t.category] = (c[t.category] || 0) + 1;
    return c;
  }, []);

  /* ── Filter + sort (pinned first, then priority, then alpha) ── */
  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const matchesGroup = activeGroup === 'all' || tool.category === activeGroup;
      const matchesSearch =
        !q ||
        tool.label.toLowerCase().includes(q) ||
        tool.slug.toLowerCase().includes(q) ||
        (tool.description?.toLowerCase().includes(q) ?? false) ||
        (tool.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false);
      return matchesGroup && matchesSearch;
    }).sort((a, b) => {
      const aPin = pinned.has(a.slug) ? 1 : 0;
      const bPin = pinned.has(b.slug) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      const pa = a.priority ?? 999;
      const pb = b.priority ?? 999;
      if (pa !== pb) return pa - pb;
      return a.label.localeCompare(b.label);
    });
  }, [query, activeGroup, pinned]);

  /* ── Recent tools (resolve slugs → tool objects, drop any deleted) ── */
  const recentTools = useMemo(() => {
    const map = new Map(TOOLS.map((t) => [t.slug, t]));
    return recents.map((slug) => map.get(slug)).filter((t): t is typeof TOOLS[number] => Boolean(t));
  }, [recents]);

  const showRecents =
    hydrated &&
    recentTools.length > 0 &&
    !query.trim() &&
    activeGroup === 'all';

  const hasActiveFilters = query.trim().length > 0 || activeGroup !== 'all';

  const clearFilters = () => {
    setQuery('');
    setActiveGroup('all');
    searchInputRef.current?.focus();
  };

  /* ─────────────────────────────────────────
     RENDER
  ───────────────────────────────────────── */
  return (
    <div className="pt-24 pb-12 px-4 md:px-8 bg-slate-950 text-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* ─── HEADER ─── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Smart Seller Toolbox
            </h1>
            <p className="text-sm md:text-base text-slate-400 mt-2 max-w-2xl">
              All your calculators, listing helpers, and operational tools in one control center.
            </p>
          </div>

          {/* Search */}
          <div className="w-full md:w-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search tools — PPC, FNSKU, keyword…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 pl-9 pr-24 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
                spellCheck={false}
                autoComplete="off"
              />
              {query ? (
                <button
                  onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">
                  {isMac ? '⌘K' : 'Ctrl K'}
                </kbd>
              )}
            </div>
          </div>
        </div>

        {/* ─── CATEGORY TABS ─── */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton
            label="All tools"
            count={counts.all}
            active={activeGroup === 'all'}
            onClick={() => setActiveGroup('all')}
          />
          {GROUP_ORDER.map((groupId) => (
            <TabButton
              key={groupId}
              label={TOOL_GROUPS[groupId]}
              count={counts[groupId] ?? 0}
              active={activeGroup === groupId}
              onClick={() => setActiveGroup(groupId)}
            />
          ))}
          {pinned.size > 0 && (
            <span className="ml-auto self-center inline-flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
              <Star className="w-3 h-3 fill-current" />
              {pinned.size} pinned
            </span>
          )}
        </div>

        {/* ─── RECENTLY USED ─── */}
        {showRecents && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Recently used
              </h2>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {recentTools.slice(0, 6).map((tool) => {
                const Icon = tool.icon ?? Zap;
                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    onClick={() => logRecent(tool.slug)}
                    className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-orange-500/50 transition px-3 py-2.5"
                  >
                    <div className="w-7 h-7 rounded-md bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-orange-400" />
                    </div>
                    <span className="text-sm text-slate-200 truncate flex-1">{tool.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-orange-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── RESULT COUNT ─── */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-slate-500">
            {filteredTools.length === TOOLS.length ? (
              <>Showing all <span className="text-slate-300 font-medium">{TOOLS.length}</span> tools</>
            ) : (
              <>
                Showing <span className="text-slate-300 font-medium">{filteredTools.length}</span> of{' '}
                <span className="text-slate-300 font-medium">{TOOLS.length}</span> tools
              </>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1.5 transition"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </div>

        {/* ─── TOOL GRID / EMPTY STATE ─── */}
        {filteredTools.length === 0 ? (
          <EmptyState
            query={query}
            activeGroup={activeGroup}
            hasFilters={hasActiveFilters}
            onClear={clearFilters}
          />
        ) : (
          <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool, i) => {
              const Icon = tool.icon ?? Zap;
              const isPinned = pinned.has(tool.slug);
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  onClick={() => logRecent(tool.slug)}
                  style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}
                  className={`group relative rounded-xl border bg-slate-900/70 hover:bg-slate-900 transition-all p-4 flex flex-col justify-between shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:shadow-orange-900/30 animate-[cardIn_0.4s_ease-out_both] ${
                    isPinned
                      ? 'border-amber-500/40 hover:border-amber-500/60 ring-1 ring-amber-500/10'
                      : 'border-slate-800 hover:border-orange-500/70'
                  }`}
                >
                  {/* Pin button */}
                  <button
                    onClick={(e) => togglePin(tool.slug, e)}
                    className={`absolute top-2.5 right-2.5 p-1.5 rounded-md transition ${
                      isPinned
                        ? 'text-amber-400 hover:bg-amber-500/15'
                        : 'text-slate-700 hover:text-amber-400 hover:bg-slate-800 opacity-0 group-hover:opacity-100 focus:opacity-100'
                    }`}
                    aria-label={isPinned ? `Unpin ${tool.label}` : `Pin ${tool.label}`}
                    title={isPinned ? 'Unpin' : 'Pin to top'}
                  >
                    <Star className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
                  </button>

                  <div>
                    <div className="flex items-start gap-2.5 min-w-0 pr-7 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:bg-orange-500/15 transition-colors">
                        <Icon className="w-4 h-4 text-orange-400" />
                      </div>
                      <h2 className="font-semibold text-sm md:text-base text-slate-50 group-hover:text-white truncate pt-1">
                        {tool.label}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                      {tool.isNew && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                          NEW
                        </span>
                      )}
                      {tool.isPro && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                          PRO
                        </span>
                      )}
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        {TOOL_GROUPS[tool.category]}
                      </span>
                    </div>

                    {tool.description && (
                      <p className="text-xs md:text-sm text-slate-400 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono opacity-70 truncate max-w-[60%]">/{tool.slug}</span>
                    <span className="inline-flex items-center gap-1 text-orange-400 transition-transform group-hover:translate-x-0.5">
                      Open tool
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ─── KEYBOARD HINT (footer of grid) ─── */}
        {filteredTools.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-[11px] text-slate-600">
              Press{' '}
              <kbd className="font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">/</kbd>{' '}
              to search,{' '}
              <kbd className="font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">{isMac ? '⌘K' : 'Ctrl K'}</kbd>{' '}
              to focus, or click ★ on any card to pin
            </p>
          </div>
        )}

        {/* ─── CREATOR FOOTER ─── */}
        <div className="mt-16 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-pink-500 transition-colors"
              title="Instagram"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a
              href="https://github.com/Smart-rwl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-white transition-colors"
              title="GitHub"
              aria-label="GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Card entrance animation */}
      <style jsx global>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 text-xs md:text-sm px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-orange-600 border-orange-500 text-white shadow-sm shadow-orange-900/30'
          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
      }`}
    >
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
            active ? 'bg-white/15 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({
  query,
  activeGroup,
  hasFilters,
  onClear,
}: {
  query: string;
  activeGroup: GroupKey;
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="mt-12 mb-8 flex flex-col items-center justify-center text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
        <Sparkles className="w-6 h-6 text-slate-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-200 mb-1">
        No tools match these filters
      </h3>
      <p className="text-sm text-slate-500 max-w-md mb-5">
        {query.trim() ? (
          <>
            Nothing found for <span className="text-slate-300 font-mono">&quot;{query.trim()}&quot;</span>
            {activeGroup !== 'all' && (
              <>
                {' '}in <strong className="text-slate-300">{TOOL_GROUPS[activeGroup as ToolCategory]}</strong>
              </>
            )}.
          </>
        ) : (
          <>
            No tools in <strong className="text-slate-300">{TOOL_GROUPS[activeGroup as ToolCategory]}</strong> yet.
          </>
        )}
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-2 text-sm bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-orange-900/30"
        >
          <X className="w-3.5 h-3.5" /> Clear all filters
        </button>
      )}
    </div>
  );

  
}