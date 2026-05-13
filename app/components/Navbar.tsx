// app/components/Navbar.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings as SettingsIcon,
  Star,
  X,
  Zap,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import {
  TOOLS,
  TOOL_GROUPS,
  type Tool,
  type ToolCategory,
} from '../config/tools.config';
import { useFavorites } from '@/app/dashboard/_lib';

const CATEGORY_ORDER: ToolCategory[] = [
  'calculators',
  'finance',
  'listing',
  'operations',
  'assets',
];

/* ────────────────────────────────────────────────
   Navbar
──────────────────────────────────────────────── */

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);

  const toolsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const { isFavorite, toggle: toggleFavorite } = useFavorites(user?.id);

  // Auth: subscribe so login/logout anywhere updates the navbar live
  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (mounted) setUser(session?.user ?? null);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Click-outside for both popovers
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setIsUserOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Close everything on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setIsToolsOpen(false);
    setIsUserOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const linkClass = (href: string) => {
    const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return `text-sm font-medium px-3 py-1.5 rounded-md transition ${
      active ? 'text-orange-400' : 'text-zinc-400 hover:text-zinc-100'
    }`;
  };

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/[0.06] bg-[#09090b]/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-orange-500 to-orange-600 shadow-[0_0_20px_rgba(249,115,22,0.35)]">
            <span className="text-xs font-bold text-white">S</span>
          </div>
          <span className="text-[13px] font-medium text-zinc-100">Smart Seller</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 lg:flex">
          <Link href="/dashboard" className={linkClass('/dashboard')}>
            Dashboard
          </Link>

          {/* Tools mega-menu */}
          <div ref={toolsRef} className="relative">
            <button
              onClick={() => setIsToolsOpen((v) => !v)}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isToolsOpen || pathname?.startsWith('/tools')
                  ? 'text-orange-400'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
              aria-expanded={isToolsOpen}
              aria-haspopup="true"
            >
              Tools
              <ChevronDown
                className={`h-3 w-3 transition-transform ${
                  isToolsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isToolsOpen && (
              <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3">
                <div className="grid w-[860px] grid-cols-5 gap-x-2 rounded-xl border border-white/[0.08] bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-md">
                  {CATEGORY_ORDER.map((cat) => {
                    const tools = TOOLS.filter((t) => t.category === cat);
                    return (
                      <div key={cat} className="flex flex-col">
                        <div className="mb-2 px-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                          {TOOL_GROUPS[cat]}
                        </div>
                        <ul className="space-y-0.5">
                          {tools.map((tool) => (
                            <ToolMenuItem
                              key={tool.slug}
                              tool={tool}
                              currentPath={pathname}
                              isFavorite={isFavorite(tool.slug)}
                              onToggleFavorite={() => toggleFavorite(tool.slug)}
                            />
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-end px-1">
                  <Link
                    href="/tools"
                    className="text-[11px] text-zinc-500 transition hover:text-orange-400"
                  >
                    View all tools →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link href="/services" className={linkClass('/services')}>
            Services
          </Link>
          <Link href="/blog" className={linkClass('/blog')}>
            Blog
          </Link>
        </div>

        {/* Profile / Auth — desktop */}
        <div ref={userRef} className="relative hidden lg:block">
          {user ? (
            <>
              <button
                onClick={() => setIsUserOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full p-0.5 transition hover:bg-white/[0.04]"
                aria-expanded={isUserOpen}
              >
                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-zinc-800">
                  {user.user_metadata?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.user_metadata.avatar_url as string}
                      alt={user.email ?? 'user'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-medium text-zinc-300">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`h-3 w-3 text-zinc-500 transition-transform ${
                    isUserOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isUserOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-950/95 shadow-2xl backdrop-blur-md">
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Signed in as
                    </p>
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {user.email}
                    </p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/settings"
                      onClick={() => setIsUserOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.04] hover:text-zinc-100"
                    >
                      <SettingsIcon className="h-4 w-4 text-zinc-500" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-orange-400"
            >
              Log In
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="rounded-md p-2 text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-100 lg:hidden"
          onClick={() => setIsMobileOpen((v) => !v)}
          aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileOpen && (
        <div className="max-h-[85vh] overflow-y-auto border-t border-white/[0.06] bg-[#09090b] lg:hidden">
          <div className="space-y-6 px-4 pb-8 pt-4">
            <div className="space-y-1">
              <MobileNavLink
                href="/dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
                active={pathname === '/dashboard'}
              />
              <MobileNavLink
                href="/tools"
                icon={<Zap className="h-4 w-4" />}
                label="All Tools"
                active={pathname === '/tools'}
              />
              <MobileNavLink
                href="/services"
                icon={<Package className="h-4 w-4" />}
                label="Services"
                active={pathname?.startsWith('/services') ?? false}
              />
              <MobileNavLink
                href="/blog"
                icon={<BookOpen className="h-4 w-4" />}
                label="Blog"
                active={pathname?.startsWith('/blog') ?? false}
              />
            </div>

            {CATEGORY_ORDER.map((cat) => (
              <MobileToolSection
                key={cat}
                title={TOOL_GROUPS[cat]}
                tools={TOOLS.filter((t) => t.category === cat)}
                pathname={pathname}
                isFavorite={isFavorite}
                toggleFavorite={toggleFavorite}
              />
            ))}

            <div className="border-t border-white/[0.06] pt-4">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/[0.08] bg-zinc-800">
                      <span className="text-xs font-medium text-zinc-300">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">
                        {user.email}
                      </p>
                      <Link
                        href="/settings"
                        className="text-xs text-orange-400 hover:underline"
                      >
                        Manage account
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] py-2 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.04]"
                  >
                    <LogOut className="h-4 w-4" /> Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded-lg bg-orange-500 py-3 text-center text-sm font-bold text-white transition hover:bg-orange-400"
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────── */

function ToolMenuItem({
  tool,
  currentPath,
  isFavorite,
  onToggleFavorite,
}: {
  tool: Tool;
  currentPath: string | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const href = `/tools/${tool.slug}`;
  const isActive = currentPath === href;

  return (
    <li className="group/item relative">
      <Link
        href={href}
        className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition ${
          isActive
            ? 'bg-orange-500/10 text-orange-400'
            : 'text-zinc-300 hover:bg-white/[0.04] hover:text-zinc-100'
        }`}
      >
        <span className="truncate pr-5 text-[12.5px]">{tool.label}</span>
        <span className="flex shrink-0 items-center gap-1">
          {tool.isNew && (
            <span className="rounded bg-orange-500/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-orange-400">
              New
            </span>
          )}
          {tool.isPro && (
            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-amber-400">
              Pro
            </span>
          )}
        </span>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 transition ${
          isFavorite
            ? 'opacity-100'
            : 'opacity-0 group-hover/item:opacity-100 focus:opacity-100'
        }`}
        title={isFavorite ? 'Unpin' : 'Pin'}
        aria-label={isFavorite ? `Unpin ${tool.label}` : `Pin ${tool.label}`}
      >
        <Star
          className={`h-3 w-3 transition ${
            isFavorite
              ? 'fill-orange-400 text-orange-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        />
      </button>
    </li>
  );
}

function MobileNavLink({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-orange-500/10 text-orange-400'
          : 'text-zinc-300 hover:bg-white/[0.04]'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function MobileToolSection({
  title,
  tools,
  pathname,
  isFavorite,
  toggleFavorite,
}: {
  title: string;
  tools: Tool[];
  pathname: string | null;
  isFavorite: (slug: string) => boolean;
  toggleFavorite: (slug: string) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 border-b border-white/[0.06] px-2 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </h3>
      <div className="space-y-0.5">
        {tools.map((tool) => {
          const isActive = pathname === `/tools/${tool.slug}`;
          const fav = isFavorite(tool.slug);
          return (
            <div
              key={tool.slug}
              className="flex items-center justify-between gap-2 pr-1"
            >
              <Link
                href={`/tools/${tool.slug}`}
                className={`flex-1 truncate rounded-md px-2 py-1.5 text-sm transition ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'text-zinc-300 hover:bg-white/[0.04]'
                }`}
              >
                {tool.label}
              </Link>
              <button
                type="button"
                onClick={() => toggleFavorite(tool.slug)}
                className="rounded p-1.5"
                aria-label={fav ? `Unpin ${tool.label}` : `Pin ${tool.label}`}
              >
                <Star
                  className={`h-4 w-4 ${
                    fav ? 'fill-orange-400 text-orange-400' : 'text-zinc-500'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}