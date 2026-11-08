'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Map, Sparkles, Star, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { signInAction } from './actions';

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
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <div className="relative z-10 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur">
          <Search className="size-3.5 text-white" />
        </div>
        <span className="font-display text-[15px] tracking-tight">uTune AI</span>
      </div>
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
  const [showPw, setShowPw] = useState(false);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';
  const [state, action, pending] = useActionState(signInAction, null);

  return (
    <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-[12px] text-[#9aa0aa] hover:text-[#0f1115] transition-colors self-start"
      >
        <ArrowLeft className="size-3.5" />
        Back
      </Link>

      <div className="mb-10 flex items-center gap-2 lg:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f1115]">
          <Search className="size-3.5 text-white" />
        </div>
        <span className="font-display text-[15px] tracking-tight text-[#0f1115]">uTune AI</span>
      </div>

      <div className="w-full max-w-[360px]">
        <div className="mb-8">
          <h1 className="font-display text-[clamp(22px,2.4vw,28px)] leading-snug text-[#0f1115]">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[13px] text-[#6b7180]">
            Sign in to your workspace to continue.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-[12px] font-medium text-[#3b3f48]">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="your-username"
              required
              className="w-full rounded-xl border border-[#e8e6df] bg-white px-3.5 py-2.5 text-[13.5px] text-[#0f1115] placeholder:text-[#c0bdb5] outline-none transition focus:border-[#0f1115] focus:ring-2 focus:ring-[#0f1115]/8"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[12px] font-medium text-[#3b3f48]">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
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

          {state?.error && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-[12.5px] text-red-600">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-[#0f1115] px-4 py-2.5 text-[13.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? 'Loading…' : 'Sign in'}
          </button>
        </form>
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
