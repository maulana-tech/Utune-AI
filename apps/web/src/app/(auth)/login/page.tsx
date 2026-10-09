'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Search, Map, Sparkles, Star, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { ensureWorkspaceProvisioned } from './actions';

/* ── Left panel — branding cover ─────────────────────────── */
function CoverPanel() {
  const features = [
    { icon: Search,   label: 'Search 10M+ businesses by industry & location' },
    { icon: Map,      label: 'Every lead pinned on a real interactive map' },
    { icon: Star,     label: 'AI review analysis — know your prospect first' },
    { icon: Sparkles, label: 'Personalized cold emails from real pain points' },
  ];

  return (
    <div className="relative hidden lg:flex lg:flex-col lg:justify-between bg-[#0f1115] p-10 text-white overflow-hidden">
      {/* subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* top: logo */}
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
          <Search className="size-3.5 text-white" />
        </div>
        <span className="font-display text-[15px] tracking-tight">uTune AI</span>
      </div>

      {/* middle: headline */}
      <div className="relative z-10 my-auto">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          AI-powered B2B prospecting
        </div>
        <h2 className="font-display text-[clamp(28px,3vw,40px)] leading-[1.1] text-white">
          Find millions of
          <br />
          <span className="text-white/60">B2B leads on a map</span>
        </h2>
        <p className="mt-4 max-w-[340px] text-[13.5px] leading-relaxed text-white/50">
          Search by industry and location, enrich with AI insights, and close deals faster — all from one platform.
        </p>

        {/* feature list */}
        <ul className="mt-8 space-y-3">
          {features.map((f) => (
            <li key={f.label} className="flex items-center gap-3 text-[12.5px] text-white/60">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/8">
                <f.icon className="size-3.5 text-white/70" />
              </div>
              {f.label}
            </li>
          ))}
        </ul>
      </div>

      {/* bottom: social proof */}
      <div className="relative z-10 flex items-center gap-4 text-[11px] text-white/30">
        <span>10M+ businesses</span>
        <span className="h-3 w-px bg-white/15" />
        <span>50K+ cities</span>
        <span className="h-3 w-px bg-white/15" />
        <span>Team FTune</span>
      </div>
    </div>
  );
}

/* ── Login form ───────────────────────────────────────────── */
function LoginForm() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [info, setInfo]         = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [mode, setMode]         = useState<'signin' | 'signup'>('signin');

  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get('redirectTo') || '/dashboard';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    if (mode === 'signin') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Provision workspace if first login (idempotent)
      const { success, error: provisionError } = await ensureWorkspaceProvisioned();
      if (!success && provisionError) {
        console.warn('[login] Workspace provision warning:', provisionError);
        // Don't block login — getWorkspaceId will handle it as fallback
      }

      router.push(redirectTo);
      router.refresh();
    } else {
      // The confirmation link must land on /auth/callback, which exchanges the code for a session.
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      setInfo('Check your email to confirm your account.');
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
      {/* back button — top left */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-[12px] text-[#9aa0aa] hover:text-[#0f1115] transition-colors self-start"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </Link>

      {/* mobile logo */}
      <div className="mb-10 flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f1115]">
          <Search className="size-3.5 text-white" />
        </div>
        <span className="font-display text-[15px] tracking-tight text-[#0f1115]">uTune AI</span>
      </div>

      <div className="w-full max-w-[360px]">
        {/* heading */}
        <div className="mb-8">
          <h1 className="font-display text-[clamp(22px,2.4vw,28px)] leading-snug text-[#0f1115]">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="mt-1.5 text-[13px] text-[#6b7180]">
            {mode === 'signin'
              ? 'Sign in to your workspace to continue.'
              : 'Start finding leads in under 2 minutes.'}
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[12px] font-medium text-[#3b3f48]">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-[#e8e6df] bg-white px-3.5 py-2.5 text-[13.5px] text-[#0f1115] placeholder:text-[#c0bdb5] outline-none transition focus:border-[#0f1115] focus:ring-2 focus:ring-[#0f1115]/8"
            />
          </div>

          {/* password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[12px] font-medium text-[#3b3f48]">
                Password
              </label>
              {mode === 'signin' && (
                <button
                  type="button"
                  className="text-[11px] text-[#9aa0aa] hover:text-[#0f1115] transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-[#e8e6df] bg-white px-3.5 py-2.5 pr-10 text-[13.5px] text-[#0f1115] placeholder:text-[#c0bdb5] outline-none transition focus:border-[#0f1115] focus:ring-2 focus:ring-[#0f1115]/8"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa0aa] hover:text-[#3b3f48] transition-colors"
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* feedback */}
          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-600">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] text-emerald-700">
              {info}
            </div>
          )}

          {/* submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#0f1115] px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? 'Loading…'
              : mode === 'signin'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>

        {/* divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#e8e6df]" />
          <span className="text-[11px] text-[#9aa0aa]">or</span>
          <div className="h-px flex-1 bg-[#e8e6df]" />
        </div>

        {/* toggle mode */}
        <p className="text-center text-[12.5px] text-[#6b7180]">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null); }}
            className="font-medium text-[#0f1115] underline underline-offset-2 hover:opacity-70 transition-opacity"
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <CoverPanel />
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-6 text-[13px] text-[#9aa0aa]">
            Loading…
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
