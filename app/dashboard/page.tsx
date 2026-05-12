// app/dashboard/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  ChevronRight,
  Layers,
  LineChart,
  Package,
  Pin,
  Search,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

import { TOOLS } from '../config/tools.config';
import {
  useBlogPosts,
  useDashboardUser,
  useFavorites,
  useUsageStats,
  type BlogPost,
  type Tool,
  type ToolCategory,
  type UsageStats,
} from './_lib';

/* ────────────────────────────────────────────────
   Static data
──────────────────────────────────────────────── */

type CategoryFilter = ToolCategory | 'all' | 'pinned';

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pinned', label: 'Pinned' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'content', label: 'Content' },
  { id: 'finance', label: 'Finance' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'optimization', label: 'Optimization' },
  { id: 'utility', label: 'Utility' },
];

const SERVICES = [
  {
    title: 'Account Management',
    href: '/services/account-management',
    description: 'End-to-end Amazon & Flipkart account handling with weekly reports.',
    icon: Package,
    tag: 'Most popular',
  },
  {
    title: 'A+ Content Design',
    href: '/services/a-plus-content',
    description: 'High-conversion detail-page design with custom product photography.',
    icon: Sparkles,
    tag: 'Limited slots',
  },
  {
    title: 'Ads Optimization',
    href: '/services/ads-optimization',
    description: 'Cut ACOS 30–40% with managed Sponsored Ads campaigns.',
    icon: LineChart,
    tag: null as string | null,
  },
];

const CREATIVE_TIPS = [
  "Try A+ Content focused on 'durability' for your top SKU this week.",
  'Sponsored Brand video converts ~2× higher than image-only on mobile.',
  'Cross-list bestsellers on Flipkart — match Amazon pricing within 3%.',
  'Bundle slow-movers with bestsellers to lift sell-through.',
  'Refresh main image headline once every 90 days — CTR responds fast.',
];

/* ────────────────────────────────────────────────
   Page
──────────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: userLoading, displayName, avatarUrl } = useDashboardUser();
  const userId = user?.id;

  const { isFavorite, toggle: toggleFavorite } = useFavorites(userId);
  const stats = useUsageStats(userId);
  const { posts: blogPosts, loading: blogLoading } = useBlogPosts();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [launching, setLaunching] = useState<string | null>(null);

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (TOOLS as Tool[]).filter((t) => {
      if (category === 'pinned' && !isFavorite(t.slug)) return false;
      if (category !== 'all' && category !== 'pinned' && t.category !== category) return false;
      if (!q) return true;
      return (
        t.label.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false) ||
        (t.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false) ||
        t.slug.toLowerCase().includes(q)
      );
    });
  }, [query, category, isFavorite]);

  const pinnedTools = useMemo(
    () => (TOOLS as Tool[]).filter((t) => isFavorite(t.slug)),
    [isFavorite]
  );

  const launchTool = useCallback(
    async (slug: string) => {
      setLaunching(slug);
      await stats.trackUse(slug);
      router.push(`/tools/${slug}`);
    },
    [stats, router]
  );

  // ⌘K / Ctrl-K to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('dash-search')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (userLoading || !user) return <DashboardSkeleton />;

  const showPinnedSection = pinnedTools.length > 0 && category === 'all' && !query;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] text-zinc-100">
      <DashboardStyles />

      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-bg" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[480px] dot-grid opacity-60" />

      <DashHeader displayName={displayName} avatarUrl={avatarUrl} />

      <main className="relative mx-auto max-w-7xl px-6 pb-24 pt-10 lg:px-8">
        <Greeting
          displayName={displayName}
          todayCount={stats.today}
          weekCount={stats.week}
          style={{ animationDelay: '0.04s' }}
        />

        <div className="mt-12 anim-in" style={{ animationDelay: '0.1s' }}>
          <SearchBar
            query={query}
            setQuery={setQuery}
            category={category}
            setCategory={setCategory}
            totalTools={(TOOLS as Tool[]).length}
            pinnedCount={pinnedTools.length}
          />
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-12 lg:col-span-8">
            {showPinnedSection && (
              <ToolSection
                title="Pinned"
                icon={<Pin className="h-3 w-3" />}
                meta={`${pinnedTools.length} pinned`}
                tools={pinnedTools}
                isFavorite={isFavorite}
                toggleFavorite={toggleFavorite}
                launching={launching}
                onLaunch={launchTool}
                style={{ animationDelay: '0.15s' }}
              />
            )}

            <ToolSection
              title={query ? `Results for "${query}"` : 'All tools'}
              icon={<Layers className="h-3 w-3" />}
              meta={`${filteredTools.length} ${filteredTools.length === 1 ? 'tool' : 'tools'}`}
              tools={filteredTools}
              isFavorite={isFavorite}
              toggleFavorite={toggleFavorite}
              launching={launching}
              onLaunch={launchTool}
              style={{ animationDelay: '0.2s' }}
            />

            <ServicesSection style={{ animationDelay: '0.3s' }} />
          </div>

          <aside className="space-y-6 lg:col-span-4">
            <StatsCard stats={stats} style={{ animationDelay: '0.15s' }} />
            <CreativePulseCard style={{ animationDelay: '0.25s' }} />
            <BlogCard posts={blogPosts} loading={blogLoading} style={{ animationDelay: '0.35s' }} />
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Header
──────────────────────────────────────────────── */

function DashHeader({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.35)]">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium text-zinc-100">Smart Seller</span>
            <span className="font-mono-num text-[10px] text-zinc-600">v2.0</span>
          </div>
        </Link>

        <div className="hidden items-center gap-2 text-[11px] text-zinc-500 md:flex">
          <span>Press</span>
          <kbd className="font-mono-num rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-400">
            ⌘ K
          </kbd>
          <span>to search</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="relative rounded-md p-1.5 text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-300"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-orange-500" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-zinc-800">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] font-medium text-zinc-300">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ────────────────────────────────────────────────
   Greeting
──────────────────────────────────────────────── */

function Greeting({
  displayName,
  todayCount,
  weekCount,
  style,
}: {
  displayName: string;
  todayCount: number;
  weekCount: number;
  style?: React.CSSProperties;
}) {
  const hour = new Date().getHours();
  const phrase =
    hour < 5 ? 'Working late' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Late night grind';

  return (
    <div className="anim-in" style={style}>
      <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">{phrase}</p>
      <h1 className="text-4xl font-light leading-[1.05] tracking-tight md:text-5xl">
        <span className="text-zinc-100">Hello, </span>
        <span className="font-serif italic text-orange-400">{displayName}</span>
      </h1>
      <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="font-mono-num text-zinc-300">{todayCount}</span>
          <span>today</span>
        </span>
        <span className="text-zinc-700">·</span>
        <span>
          <span className="font-mono-num text-zinc-300">{weekCount}</span>
          <span className="ml-1">this week</span>
        </span>
        <span className="text-zinc-700">·</span>
        <span className="text-zinc-600">Let&apos;s ship something today.</span>
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Search bar + category pills
──────────────────────────────────────────────── */

function SearchBar({
  query,
  setQuery,
  category,
  setCategory,
  totalTools,
  pinnedCount,
}: {
  query: string;
  setQuery: (q: string) => void;
  category: CategoryFilter;
  setCategory: (c: CategoryFilter) => void;
  totalTools: number;
  pinnedCount: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm">
      <div className="flex items-center px-4">
        <Search className="h-4 w-4 shrink-0 text-zinc-500" />
        <input
          id="dash-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${totalTools} tools — try "ROI" or "image"`}
          className="flex-1 bg-transparent px-3 py-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="rounded px-2 py-1 text-[10px] text-zinc-500 transition hover:text-zinc-300"
          >
            Clear
          </button>
        )}
        <kbd className="font-mono-num ml-2 hidden rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-zinc-500 sm:inline-flex">
          ⌘ K
        </kbd>
      </div>

      <div className="hide-scrollbar flex gap-1 overflow-x-auto px-3 pb-3">
        {CATEGORIES.map((cat) => {
          if (cat.id === 'pinned' && pinnedCount === 0) return null;
          const active = category === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                active
                  ? 'bg-orange-500/10 text-orange-300 ring-1 ring-orange-500/20'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
              }`}
            >
              {cat.id === 'pinned' && <Pin className="h-2.5 w-2.5" />}
              {cat.label}
              {cat.id === 'pinned' && (
                <span className="font-mono-num text-[10px] opacity-70">{pinnedCount}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Tool sections + cards
──────────────────────────────────────────────── */

function ToolSection({
  title,
  icon,
  meta,
  tools,
  isFavorite,
  toggleFavorite,
  launching,
  onLaunch,
  style,
}: {
  title: string;
  icon: React.ReactNode;
  meta?: string;
  tools: Tool[];
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
  launching: string | null;
  onLaunch: (slug: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <section className="anim-in" style={style}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          {icon}
          {title}
        </h2>
        {meta && <span className="font-mono-num text-[11px] text-zinc-600">{meta}</span>}
      </div>

      {tools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] p-12 text-center">
          <p className="text-sm text-zinc-500">No tools match your filters.</p>
          <p className="mt-1 text-xs text-zinc-600">Try a different category or search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {tools.map((tool, i) => (
            <ToolCard
              key={tool.slug}
              tool={tool}
              isFavorite={isFavorite(tool.slug)}
              onToggleFavorite={() => toggleFavorite(tool.slug)}
              onLaunch={() => onLaunch(tool.slug)}
              launching={launching === tool.slug}
              style={{ animationDelay: `${0.04 * i}s` }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ToolCard({
  tool,
  isFavorite,
  onToggleFavorite,
  onLaunch,
  launching,
  style,
}: {
  tool: Tool;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onLaunch: () => void;
  launching: boolean;
  style?: React.CSSProperties;
}) {
  const Icon = tool.icon ?? Zap;

  return (
    <button
      onClick={onLaunch}
      disabled={launching}
      className="anim-in group relative cursor-pointer overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.04] disabled:opacity-50"
      style={style}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-orange-500/[0.04] to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="relative">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-orange-500/10 bg-orange-500/[0.06] transition group-hover:border-orange-500/20 group-hover:bg-orange-500/[0.12]">
            <Icon className="h-4 w-4 text-orange-400" />
          </div>
          <div className="flex items-center gap-1">
            {tool.isNew && (
              <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-orange-400">
                New
              </span>
            )}
            {tool.isPro && (
              <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-violet-400">
                Pro
              </span>
            )}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite();
                }
              }}
              className="-mr-1 cursor-pointer rounded p-1 transition hover:bg-white/5"
              title={isFavorite ? 'Unpin' : 'Pin'}
            >
              <Star
                className={`h-3 w-3 transition ${
                  isFavorite ? 'fill-orange-400 text-orange-400' : 'text-zinc-600 hover:text-zinc-400'
                }`}
              />
            </span>
          </div>
        </div>

        <h3 className="mb-1.5 line-clamp-1 text-sm font-medium text-zinc-100">{tool.label}</h3>
        <p className="line-clamp-2 min-h-[2rem] text-xs leading-relaxed text-zinc-500">
          {tool.description ?? 'Tap to open this tool.'}
        </p>

        <div className="mt-3 flex items-center justify-between border-t border-white/[0.04] pt-3">
          <span className="text-[10px] uppercase tracking-wider text-zinc-600">
            {tool.category ?? 'Tool'}
          </span>
          {launching ? (
            <span className="font-mono-num text-[10px] text-orange-400">opening…</span>
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-400" />
          )}
        </div>
      </div>
    </button>
  );
}

/* ────────────────────────────────────────────────
   Services
──────────────────────────────────────────────── */

function ServicesSection({ style }: { style?: React.CSSProperties }) {
  return (
    <section className="anim-in" style={style}>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          <Package className="h-3 w-3" />
          Done-for-you services
        </h2>
        <Link
          href="/services"
          className="flex items-center gap-1 text-[11px] text-zinc-500 transition hover:text-orange-400"
        >
          View all <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {SERVICES.map((svc) => (
          <Link
            key={svc.title}
            href={svc.href}
            className="group relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/[0.14]"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04]">
                <svc.icon className="h-3.5 w-3.5 text-zinc-400 transition group-hover:text-orange-400" />
              </div>
              {svc.tag && (
                <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-zinc-400">
                  {svc.tag}
                </span>
              )}
            </div>
            <h3 className="mb-1 text-sm font-medium text-zinc-100">{svc.title}</h3>
            <p className="text-xs leading-relaxed text-zinc-500">{svc.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Stats card — activity counter, sparkline, top tools
──────────────────────────────────────────────── */

function StatsCard({
  stats,
  style,
}: {
  stats: UsageStats & { loaded: boolean };
  style?: React.CSSProperties;
}) {
  const max = Math.max(...stats.daily, 1);

  // Build last-7-day labels ending today
  const labels: string[] = [];
  const today = new Date();
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    labels.push(dayNames[d.getDay()]);
  }

  return (
    <div
      className="anim-in relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5"
      style={style}
    >
      <div aria-hidden className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            <Activity className="h-3 w-3" />
            Activity
          </h3>
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
            <span className="pulse-soft h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>

        <div className="mb-5 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono-num text-4xl font-light text-zinc-100">{stats.week}</span>
            <span className="text-xs text-zinc-500">launches this week</span>
          </div>
          <div className="text-[11px] text-zinc-600">
            <span className="font-mono-num text-zinc-400">{stats.total}</span> all-time ·{' '}
            <span className="font-mono-num text-zinc-400">{stats.today}</span> today
          </div>
        </div>

        <div className="mb-1.5 flex h-16 items-end gap-1">
          {stats.daily.map((v, i) => {
            const isToday = i === stats.daily.length - 1;
            const heightPct = max > 0 ? (v / max) * 100 : 0;
            return (
              <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end">
                <div
                  className={`w-full rounded-sm transition-all ${
                    isToday
                      ? 'bg-orange-400'
                      : v > 0
                        ? 'bg-zinc-700 group-hover:bg-zinc-500'
                        : 'bg-zinc-800'
                  }`}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                  title={`${v} launches`}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between px-0.5 font-mono-num text-[9px] text-zinc-600">
          {labels.map((d, i) => (
            <span key={i} className={i === labels.length - 1 ? 'text-orange-400' : ''}>
              {d}
            </span>
          ))}
        </div>

        {stats.topTools.length > 0 && (
          <div className="mt-5 border-t border-white/[0.06] pt-5">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-zinc-600">Most used</p>
            <ul className="space-y-2">
              {stats.topTools.map((t, i) => {
                const tool = (TOOLS as Tool[]).find((x) => x.slug === t.slug);
                return (
                  <li key={t.slug} className="flex items-center justify-between text-xs">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="font-mono-num w-3 text-zinc-600">{i + 1}</span>
                      <span className="truncate text-zinc-300">{tool?.label ?? t.slug}</span>
                    </span>
                    <span className="font-mono-num text-zinc-500">{t.count}×</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Creative pulse — rotating tip
──────────────────────────────────────────────── */

function CreativePulseCard({ style }: { style?: React.CSSProperties }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * CREATIVE_TIPS.length));
  return (
    <div
      className="anim-in relative overflow-hidden rounded-2xl border border-orange-500/20 p-5"
      style={{
        ...style,
        background:
          'linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(249, 115, 22, 0.02))',
      }}
    >
      <div aria-hidden className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-orange-400">
            <Sparkles className="h-3 w-3" />
            Creative pulse
          </h3>
        </div>

        <p className="mb-4 font-serif text-base italic leading-relaxed text-zinc-200">
          “{CREATIVE_TIPS[i]}”
        </p>

        <button
          onClick={() => setI((i + 1) % CREATIVE_TIPS.length)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-orange-400 transition hover:text-orange-300"
        >
          Next idea <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Blog
──────────────────────────────────────────────── */

function BlogCard({
  posts,
  loading,
  style,
}: {
  posts: BlogPost[];
  loading: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className="anim-in rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5" style={style}>
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          <BookOpen className="h-3 w-3" />
          Insights
        </h3>
        <Link href="/blog" className="text-[11px] text-zinc-500 transition hover:text-orange-400">
          All posts
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/[0.04]" />
              <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/[0.02]" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-xs text-zinc-600">No posts yet — check back soon.</p>
      ) : (
        <ul className="space-y-3.5">
          {posts.slice(0, 4).map((post) => (
            <li key={post.id} className="group">
              <Link href={`/blog/${post.slug}`} className="block">
                <h4 className="line-clamp-2 text-[13px] font-medium leading-snug text-zinc-200 transition group-hover:text-orange-400">
                  {post.title}
                </h4>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-600">
                  <span className="font-mono-num">{post.readMinutes} min read</span>
                  {post.category && (
                    <>
                      <span>·</span>
                      <span className="uppercase tracking-wider">{post.category}</span>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────
   Skeleton (auth resolving)
──────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="h-14 border-b border-white/[0.06]" />
      <div className="mx-auto max-w-7xl px-6 pt-10 lg:px-8">
        <div className="mb-3 h-3 w-20 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-12 w-72 animate-pulse rounded bg-white/[0.04]" />
        <div className="mt-12 h-16 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="mt-12 grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-3 lg:col-span-8">
            <div className="h-4 w-24 animate-pulse rounded bg-white/[0.04]" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-white/[0.03]" />
              ))}
            </div>
          </div>
          <div className="col-span-12 lg:col-span-4">
            <div className="h-72 animate-pulse rounded-2xl bg-white/[0.03]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Inline styles (fonts + animation + textures)
──────────────────────────────────────────────── */

function DashboardStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');

      .font-serif { font-family: 'Instrument Serif', Georgia, serif; }
      .font-mono-num { font-family: 'JetBrains Mono', ui-monospace, monospace; font-variant-numeric: tabular-nums; }

      /* Body font applied via class on the root div if you want, or globally in layout.tsx */

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .anim-in {
        opacity: 0;
        animation: fadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      @keyframes pulseSoft {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.45; }
      }
      .pulse-soft { animation: pulseSoft 2s ease-in-out infinite; }

      .grid-bg {
        background-image:
          radial-gradient(ellipse at 15% 0%, rgba(249, 115, 22, 0.05), transparent 50%),
          radial-gradient(ellipse at 85% 0%, rgba(139, 92, 246, 0.03), transparent 40%);
      }

      .dot-grid {
        background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0);
        background-size: 24px 24px;
        mask-image: linear-gradient(to bottom, black, transparent);
        -webkit-mask-image: linear-gradient(to bottom, black, transparent);
      }

      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
  );
}