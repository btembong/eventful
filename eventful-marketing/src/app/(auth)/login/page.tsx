'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeOffIcon } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();

  const [email,          setEmail]          = useState('');
  const [password,       setPassword]       = useState('');
  const [showPw,         setShowPw]         = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [errors,         setErrors]         = useState<Record<string, string>>({});
  const [unverified,     setUnverified]     = useState(false);
  const [resendLoading,  setResendLoading]  = useState(false);
  const [resendMsg,      setResendMsg]      = useState('');

  async function handleResend() {
    setResendLoading(true);
    setResendMsg('');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendMsg('Verification email sent — check your inbox.');
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!email.trim())    e.email    = 'Email is required';
    if (!password.trim()) e.password = 'Password is required';
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 403) {
          setUnverified(true);
          return;
        }
        setErrors({ form: data.message ?? 'Invalid email or password.' });
        return;
      }

      localStorage.setItem('access_token',  data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user',          JSON.stringify(data.user));
      // Mirror tokens to cookies so Next.js middleware can validate auth server-side
      document.cookie = `access_token=${data.accessToken}; path=/; max-age=${15 * 60}; SameSite=Lax`;
      document.cookie = `refresh_token=${data.refreshToken}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;

      // Route based on role
      const roles: string[] = data.user?.roles ?? [];
      if (roles.includes('CREATOR')) {
        router.push('/dashboard/creator');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100 lg:grid lg:grid-cols-2">

        {/* Left — image panel */}
        <div className="relative hidden overflow-hidden bg-brand-950 lg:block">
          <Image
            src="/illustrations/signup.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        {/* Right — form */}
        <div className="p-8 sm:p-10">
          <h1 className="text-xl font-extrabold text-slate-900">Sign in to Eventful</h1>
          <p className="mt-1 text-sm text-slate-500">
            No account yet?{' '}
            <Link href="/signup" className="font-bold text-brand-600 hover:text-brand-500">Create one free</Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>

            {errors.form && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errors.form}</div>
            )}

            {unverified && (
              <div className="rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-800">
                <p className="font-semibold text-brand-700">Email not verified</p>
                <p className="mt-0.5 text-xs text-brand-600">
                  Check your inbox for the activation link, or{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="font-bold underline hover:text-brand-900 disabled:opacity-50"
                  >
                    {resendLoading ? 'sending…' : 'resend it'}
                  </button>.
                </p>
                {resendMsg && <p className="mt-1 text-xs text-brand-600 font-semibold">{resendMsg}</p>}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Email address</label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                  errors.email
                    ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-200 bg-slate-50 focus:border-brand-500 focus:bg-white focus:ring-brand-500/20'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-500">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
                    errors.password
                      ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200'
                      : 'border-slate-200 bg-slate-50 focus:border-brand-500 focus:bg-white focus:ring-brand-500/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOffIcon className="h-4.5 w-4.5" /> : <EyeIcon className="h-4.5 w-4.5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cartoon w-full py-3 text-sm disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <p className="text-xs text-slate-400">Want to host events?</p>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Link
            href="/become-creator"
            className="block w-full rounded-xl border-2 border-brand-200 py-3 text-center text-sm font-bold text-brand-600 transition hover:border-brand-400 hover:bg-brand-50"
          >
            Apply as a Creator
          </Link>
        </div>
      </div>
    </div>
  );
}
