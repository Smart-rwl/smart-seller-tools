// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Modern @supabase/ssr API. getAll/setAll batches the refreshed
        // cookies into a single response, which fixes a class of session
        // refresh bugs the older get/set/remove signature was prone to.
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror onto the request so any downstream reads in this same
          // pass see the refreshed values…
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // …and rebuild the response so the browser receives them.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validates the JWT against Supabase — don't replace with getSession()
  // in middleware, which only reads cookies without validation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  /* ────────────────────────────────────────────────
     Route classification
     - /tools (index, exact match) is PUBLIC
     - /tools/* (any child) is GATED
     - /dashboard, /account, and tool APIs are GATED
     - everything else (services, blog, marketing) is PUBLIC by default
  ──────────────────────────────────────────────── */

  const isProtectedRoute =
    // /tools/* but NOT /tools itself
    path.startsWith('/tools/') ||
    // /dashboard and any sub-routes
    path === '/dashboard' ||
    path.startsWith('/dashboard/') ||
    // /account and any sub-routes
    path === '/account' ||
    path.startsWith('/account/') ||
    // Tool APIs, with a small public allowlist
    (path.startsWith('/api/') && !isPublicApi(path));

  // 1. Not logged in, hitting a protected route → /login with ?next=
  if (!user && isProtectedRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Already logged in, visiting /login or /signup → wherever ?next= said,
  //    or /dashboard as the fallback. Validates next to prevent open-redirect.
  if (user && (path === '/login' || path === '/signup')) {
    const requestedNext = request.nextUrl.searchParams.get('next');
    const target = isSafeInternalPath(requestedNext) ? requestedNext : '/dashboard';
    const homeUrl = new URL(target, request.url);
    return NextResponse.redirect(homeUrl);
  }

  return response;
}

/* ────────────────────────────────────────────────
   Helpers
──────────────────────────────────────────────── */

/** APIs that stay public (no auth required). */
function isPublicApi(path: string): boolean {
  const PUBLIC_API_PREFIXES = ['/api/public', '/api/blog-posts'];
  return PUBLIC_API_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

/**
 * Open-redirect protection for `?next=` values.
 * Must be an internal path: leading slash, no protocol-relative `//`, no
 * backslash escapes, no loop back to /login or /signup.
 */
function isSafeInternalPath(raw: string | null): raw is string {
  if (!raw || typeof raw !== 'string') return false;
  if (raw.length > 500) return false;
  if (!raw.startsWith('/')) return false;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return false;
  if (raw.startsWith('/login') || raw.startsWith('/signup')) return false;
  return true;
}

/* ────────────────────────────────────────────────
   Matcher — exclude static + image assets so middleware
   doesn't run on every file request.
──────────────────────────────────────────────── */

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)',
  ],
};