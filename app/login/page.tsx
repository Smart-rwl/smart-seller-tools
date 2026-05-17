// app/login/page.tsx
'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ────────────────────────────────────────────────
   Status state — one source of truth replaces
   the loading / errorMsg / "is this success?" mess
──────────────────────────────────────────────── */

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting'; via: 'password' | 'google' | 'magic' | 'reset' }
  | { kind: 'error'; message: string }
  | { kind: 'info'; message: string };

type Mode = 'password' | 'magic';

const DEFAULT_REDIRECT = '/dashboard';

/**
 * Validate that a `?next=` path is safe to redirect to.
 * Must be an internal path — no protocol-relative URLs, no external origins,
 * no backslash tricks. Anything fishy falls back to the default.
 */
function safeNextPath(raw: string | null): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_REDIRECT;
  if (raw.length > 500) return DEFAULT_REDIRECT;
  if (!raw.startsWith('/')) return DEFAULT_REDIRECT;
  // Protocol-relative // and backslash escapes
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_REDIRECT;
  try {
    // Resolve against a dummy origin; if the URL ends up pointing elsewhere
    // (e.g. somebody passed `/\\evil.com`), reject it.
    const url = new URL(raw, 'http://localhost');
    if (url.origin !== 'http://localhost') return DEFAULT_REDIRECT;
    // Never bounce back to login itself — would loop
    if (url.pathname === '/login') return DEFAULT_REDIRECT;
    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

/* ────────────────────────────────────────────────
   Default export — Suspense boundary
   useSearchParams() can't be prerendered at build time,
   so the inner component is deferred to a runtime render.
──────────────────────────────────────────────── */

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 20% 0%, rgba(249,115,22,0.12) 0%, transparent 60%), radial-gradient(50% 40% at 100% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)',
        }}
      />
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl border border-orange-800/40 bg-orange-500/10" />
            <div className="mx-auto h-6 w-32 rounded bg-slate-800" />
            <div className="mx-auto mt-2 h-4 w-48 rounded bg-slate-900" />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="h-10 w-full rounded-lg bg-slate-800" />
            <div className="my-5 h-px w-full bg-slate-800" />
            <div className="space-y-4">
              <div className="h-4 w-16 rounded bg-slate-800" />
              <div className="h-10 w-full rounded-lg bg-slate-950" />
              <div className="h-4 w-20 rounded bg-slate-800" />
              <div className="h-10 w-full rounded-lg bg-slate-950" />
              <div className="h-10 w-full rounded-lg bg-orange-600/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Resolve where to send the user after a successful login.
  // Sanitised against open-redirect attacks.
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get('next')),
    [searchParams]
  );

  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const emailRef = useRef<HTMLInputElement>(null);
  // Guard against the double-redirect on mount (getSession + onAuthStateChange)
  const hasRedirectedRef = useRef(false);

  /* ── Auth bootstrap ── */

  useEffect(() => {
    // Focus email on mount — first thing a user does
    emailRef.current?.focus();

    const redirectIfAuthed = (session: unknown) => {
      if (!session || hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      router.replace(nextPath);
      router.refresh();
    };

    supabase.auth.getSession().then(({ data }) => {
      redirectIfAuthed(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectIfAuthed(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, nextPath]);

  /* ── Helpers ── */

  const setError = (message: string) =>
    setStatus({ kind: 'error', message });
  const setInfo = (message: string) =>
    setStatus({ kind: 'info', message });

  const isSubmitting = status.kind === 'submitting';

  /* ── Handlers ── */

  const handlePasswordLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;

      if (!email.trim()) {
        setError('Enter your email to continue.');
        emailRef.current?.focus();
        return;
      }
      if (!password) {
        setError('Enter your password.');
        return;
      }

      setStatus({ kind: 'submitting', via: 'password' });
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setError(humanizeAuthError(error.message));
        return;
      }
      // Redirect handled by onAuthStateChange listener.
      // We leave status in 'submitting' so the button doesn't flicker.
    },
    [email, password, isSubmitting]
  );

  const handleMagicLink = useCallback(async () => {
    if (isSubmitting) return;
    if (!email.trim()) {
      setError('Enter your email to receive a magic link.');
      emailRef.current?.focus();
      return;
    }

    setStatus({ kind: 'submitting', via: 'magic' });
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      setError(humanizeAuthError(error.message));
      return;
    }
    setInfo(`Check ${email.trim()} for a sign-in link.`);
  }, [email, isSubmitting, nextPath]);

  const handleGoogleLogin = useCallback(async () => {
    if (isSubmitting) return;
    setStatus({ kind: 'submitting', via: 'google' });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      setError(humanizeAuthError(error.message));
    }
    // On success the browser navigates away to Google, so no reset needed.
  }, [isSubmitting, nextPath]);

  const handleForgotPassword = useCallback(async () => {
    if (isSubmitting) return;
    if (!email.trim()) {
      setError('Enter your email first, then click "Forgot password".');
      emailRef.current?.focus();
      return;
    }

    setStatus({ kind: 'submitting', via: 'reset' });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(humanizeAuthError(error.message));
      return;
    }
    setInfo(`Password reset link sent to ${email.trim()}.`);
  }, [email, isSubmitting]);

  // Caps Lock indicator on the password field
  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const on = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLockOn(Boolean(on));
  };

  /* ────────────────────────────────────────────────
     Render
  ──────────────────────────────────────────────── */

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-slate-200">
      {/* Atmospheric background — same vibe as dashboard */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 50% at 20% 0%, rgba(249,115,22,0.12) 0%, transparent 60%), radial-gradient(50% 40% at 100% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[260px]"
        style={{
          background:
            'radial-gradient(closest-side, rgba(255,255,255,0.05), transparent 70%)',
          maskImage:
            'radial-gradient(120% 100% at 50% 0%, black 50%, transparent 90%)',
        }}
      />

      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Brand mark + heading */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-orange-800/40 bg-orange-500/10">
              <Sparkles className="h-6 w-6 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-400">
              Sign in to your SmartRwl account.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/40 backdrop-blur">
            {/* Status banner */}
            <div role="status" aria-live="polite" className="min-h-[0]">
              {status.kind === 'error' && (
                <StatusBanner tone="error" icon={<AlertCircle className="h-4 w-4" />}>
                  {status.message}
                </StatusBanner>
              )}
              {status.kind === 'info' && (
                <StatusBanner tone="info" icon={<CheckCircle2 className="h-4 w-4" />}>
                  {status.message}
                </StatusBanner>
              )}
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status.kind === 'submitting' && status.via === 'google' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleLogo />
              )}
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-800" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                or
              </span>
              <span className="h-px flex-1 bg-slate-800" />
            </div>

            {/* Mode tabs */}
            <div className="mb-5 flex rounded-lg border border-slate-800 bg-slate-950 p-1">
              <ModeTab active={mode === 'password'} onClick={() => setMode('password')}>
                Password
              </ModeTab>
              <ModeTab active={mode === 'magic'} onClick={() => setMode('magic')}>
                Magic link
              </ModeTab>
            </div>

            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <Field
                  label="Email"
                  icon={<Mail className="h-3.5 w-3.5" />}
                  htmlFor="email"
                >
                  <input
                    ref={emailRef}
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </Field>

                <div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <label
                      htmlFor="password"
                      className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      <Lock className="h-3 w-3" />
                      Password
                    </label>
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={handleForgotPassword}
                      className="text-[11px] text-orange-400 transition hover:text-orange-300 hover:underline"
                    >
                      {status.kind === 'submitting' && status.via === 'reset'
                        ? 'Sending…'
                        : 'Forgot?'}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={handlePasswordKey}
                      onKeyUp={handlePasswordKey}
                      placeholder="••••••••"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 pr-20 text-sm text-white placeholder:text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded px-2 py-1 text-[11px] text-slate-400 transition hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {capsLockOn && (
                    <p className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-400">
                      <AlertCircle className="h-3 w-3" />
                      Caps Lock is on
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status.kind === 'submitting' && status.via === 'password' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <Field
                  label="Email"
                  icon={<Mail className="h-3.5 w-3.5" />}
                  htmlFor="magic-email"
                >
                  <input
                    ref={emailRef}
                    id="magic-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </Field>
                <p className="text-[11px] text-slate-500">
                  We&apos;ll email you a one-time link. No password needed.
                </p>
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status.kind === 'submitting' && status.via === 'magic' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending link…
                    </>
                  ) : (
                    <>
                      Send magic link <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <a
              href="/signup"
              className="font-medium text-orange-400 transition hover:text-orange-300 hover:underline"
            >
              Sign up
            </a>
          </p>

          <p className="mt-4 text-center text-[11px] text-slate-600">
            Protected by Supabase Auth. By signing in you agree to the{' '}
            <a href="/terms" className="hover:text-slate-400 hover:underline">
              terms
            </a>{' '}
            and{' '}
            <a href="/privacy" className="hover:text-slate-400 hover:underline">
              privacy policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Sub-components
──────────────────────────────────────────────── */

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
        active ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  icon,
  children,
}: {
  label: string;
  htmlFor: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"
      >
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function StatusBanner({
  tone,
  icon,
  children,
}: {
  tone: 'error' | 'info';
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const palette =
    tone === 'error'
      ? 'border-red-900/50 bg-red-950/40 text-red-300'
      : 'border-emerald-900/50 bg-emerald-950/40 text-emerald-300';
  return (
    <div
      className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-xs ${palette}`}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function GoogleLogo() {
  // Official-style Google G mark (compact, brand-compliant)
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   Auth error translation — Supabase messages are
   often cryptic. Map the common ones to plain English.
──────────────────────────────────────────────── */

function humanizeAuthError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials'))
    return 'Email or password is incorrect.';
  if (m.includes('email not confirmed'))
    return 'Please confirm your email — check your inbox for the verification link.';
  if (m.includes('rate limit'))
    return 'Too many attempts. Wait a moment and try again.';
  if (m.includes('user not found'))
    return 'No account with that email. Want to sign up instead?';
  if (m.includes('network') || m.includes('fetch'))
    return 'Network error — check your connection and try again.';
  if (m.includes('password should be at least'))
    return 'Password must be at least 6 characters.';
  return raw;
}