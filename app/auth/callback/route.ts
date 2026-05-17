// app/auth/callback/route.ts
//
// Handles the redirect from OAuth providers and magic-link emails.
// Exchanges the auth code for a session, then bounces to ?next= (with the
// same safety check used in the login page).

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const DEFAULT_REDIRECT = '/dashboard';

function safeNextPath(raw: string | null): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_REDIRECT;
  if (raw.length > 500) return DEFAULT_REDIRECT;
  if (!raw.startsWith('/')) return DEFAULT_REDIRECT;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_REDIRECT;
  try {
    const url = new URL(raw, 'http://localhost');
    if (url.origin !== 'http://localhost') return DEFAULT_REDIRECT;
    if (url.pathname === '/login') return DEFAULT_REDIRECT;
    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));

  if (!code) {
    // No code in the URL — send back to login with an error hint
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  // We need to build a response we can mutate cookies on
  let res = NextResponse.redirect(`${origin}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  return res;
}