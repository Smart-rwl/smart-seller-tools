// app/dashboard/_lib.ts
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { LucideIcon } from 'lucide-react';

/* ────────────────────────────────────────────────
   TYPES — these mirror the recommended shape for
   your config/tools.config.ts. Existing tools with
   only { slug, label } still work; the extras just
   make the UI richer when present.
──────────────────────────────────────────────── */

export type ToolCategory =
  | 'analytics'
  | 'content'
  | 'finance'
  | 'logistics'
  | 'optimization'
  | 'utility';

export type Tool = {
  slug: string;
  label: string;
  description?: string;
  category?: ToolCategory;
  icon?: LucideIcon;
  keywords?: string[];
  isNew?: boolean;
  isPro?: boolean;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  category?: string;
  readMinutes: number;
  publishedAt: string; // ISO
};

export type UsageStats = {
  total: number;
  week: number;
  today: number;
  daily: number[]; // last 7 days, oldest → newest
  topTools: { slug: string; count: number }[];
};

/* ────────────────────────────────────────────────
   useDashboardUser — auth state + display fields
──────────────────────────────────────────────── */

export function useDashboardUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Redirect to login once we know there's no user
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [loading, user, router]);

  const displayName = useMemo(() => {
    if (!user) return '';
    const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
    return (
      meta.name ||
      meta.full_name ||
      meta.preferred_username ||
      user.email?.split('@')[0] ||
      'there'
    );
  }, [user]);

  const avatarUrl = useMemo<string | null>(() => {
    const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
    return meta.avatar_url || meta.picture || null;
  }, [user]);

  return { user, loading, displayName, avatarUrl };
}

/* ────────────────────────────────────────────────
   useFavorites — pinned tools, Supabase + localStorage
   Optimistic UI: state updates immediately,
   sync to DB happens in the background.
──────────────────────────────────────────────── */

const FAVORITES_KEY = 'smartrwl:favorites:v1';

function readLocalFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

function writeLocalFavorites(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...set]));
  } catch {
    /* quota or disabled — ignore */
  }
}

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<Set<string>>(() => readLocalFavorites());

  // Hydrate from Supabase when we know the user
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('tool_slug')
        .eq('user_id', userId);

      if (cancelled || error || !data) return;
      const set = new Set(data.map((r) => r.tool_slug as string));
      setFavorites(set);
      writeLocalFavorites(set);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggle = useCallback(
    async (slug: string) => {
      let wasFavorite = false;
      setFavorites((prev) => {
        const next = new Set(prev);
        wasFavorite = next.has(slug);
        if (wasFavorite) next.delete(slug);
        else next.add(slug);
        writeLocalFavorites(next);
        return next;
      });

      if (!userId) return;
      if (wasFavorite) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('tool_slug', slug);
      } else {
        await supabase
          .from('user_favorites')
          .upsert({ user_id: userId, tool_slug: slug }, { onConflict: 'user_id,tool_slug' });
      }
    },
    [userId]
  );

  const isFavorite = useCallback((slug: string) => favorites.has(slug), [favorites]);

  return { favorites, isFavorite, toggle };
}

/* ────────────────────────────────────────────────
   useUsageStats — counts + 7-day sparkline + top tools
──────────────────────────────────────────────── */

const LEGACY_USAGE_KEY = 'toolUsageCount';

function startOfDay(d: Date) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

export function useUsageStats(userId: string | undefined) {
  const [stats, setStats] = useState<UsageStats>({
    total: 0,
    week: 0,
    today: 0,
    daily: [0, 0, 0, 0, 0, 0, 0],
    topTools: [],
  });
  const [loaded, setLoaded] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      // Pre-auth fallback to legacy counter
      const legacy =
        typeof window !== 'undefined'
          ? Number(localStorage.getItem(LEGACY_USAGE_KEY)) || 0
          : 0;
      setStats((p) => ({ ...p, total: legacy }));
      setLoaded(true);
      return;
    }

    const sevenDaysAgo = startOfDay(new Date(Date.now() - 6 * 86_400_000)).toISOString();

    const [totalRes, recentRes] = await Promise.all([
      supabase
        .from('tool_usage')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('tool_usage')
        .select('tool_slug, used_at')
        .eq('user_id', userId)
        .gte('used_at', sevenDaysAgo)
        .order('used_at', { ascending: false })
        .limit(500),
    ]);

    const total = totalRes.count ?? 0;
    const recent = recentRes.data ?? [];

    const today = startOfDay(new Date()).getTime();
    const daily = [0, 0, 0, 0, 0, 0, 0]; // 0 = 6 days ago, 6 = today
    const slugCounts: Record<string, number> = {};
    let todayCount = 0;

    for (const row of recent as { tool_slug: string; used_at: string }[]) {
      const day = startOfDay(new Date(row.used_at)).getTime();
      const diffDays = Math.round((today - day) / 86_400_000);
      if (diffDays >= 0 && diffDays < 7) daily[6 - diffDays]++;
      if (diffDays === 0) todayCount++;
      slugCounts[row.tool_slug] = (slugCounts[row.tool_slug] ?? 0) + 1;
    }

    const topTools = Object.entries(slugCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([slug, count]) => ({ slug, count }));

    setStats({ total, week: recent.length, today: todayCount, daily, topTools });
    setLoaded(true);
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const trackUse = useCallback(
    async (slug: string) => {
      if (!userId) {
        if (typeof window !== 'undefined') {
          const next = (Number(localStorage.getItem(LEGACY_USAGE_KEY)) || 0) + 1;
          localStorage.setItem(LEGACY_USAGE_KEY, String(next));
        }
        return;
      }
      // Fire-and-forget — don't block navigation
      void supabase
        .from('tool_usage')
        .insert({ user_id: userId, tool_slug: slug })
        .then(() => fetchStats());
    },
    [userId, fetchStats]
  );

  return { ...stats, loaded, trackUse };
}

/* ────────────────────────────────────────────────
   useBlogPosts — fetch from /api/blog-posts
──────────────────────────────────────────────── */

export function useBlogPosts() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/blog-posts', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = (await res.json()) as { posts?: BlogPost[] };
        if (cancelled) return;
        setPosts(Array.isArray(json.posts) ? json.posts : []);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load posts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { posts, loading, error };
}