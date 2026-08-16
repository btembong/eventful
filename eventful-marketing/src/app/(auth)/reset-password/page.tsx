'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LockIcon, CheckIcon, EyeIcon, EyeOffIcon } from '@/components/icons';

export default function ResetPasswordPage() {
  const params   = useSearchParams();
  const router   = useRouter();
  const token    = params.get('token') ?? '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!token) { setError('Invalid reset link. Please request a new one.'); return; }
    setError('');
    setLoading(true);

    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.message ?? 'Reset failed. The link may have expired.'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100 text-center">
        <h1 className="text-xl font-extrabold text-slate-900">Invalid link</h1>
        <p className="mt-2 text-sm text-slate-500">This reset link is missing or malformed.</p>
        <Link href="/forgot-password" className="mt-6 inline-block rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white">
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold text-slate-900">Password updated!</h1>
        <p className="mt-2 text-sm text-slate-500">All your sessions have been signed out. Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100">
        <LockIcon className="h-6 w-6 text-brand-600" />
      </div>
      <h1 className="text-xl font-extrabold text-slate-900">Set a new password</h1>
      <p className="mt-1 text-sm text-slate-500">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">New password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Confirm new password</label>
          <input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Password strength hint */}
        {password.length > 0 && (
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => {
              const score = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1;
              return <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? ['bg-red-400','bg-amber-400','bg-emerald-400','bg-emerald-500'][score-1] : 'bg-slate-100'}`} />;
            })}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-extrabold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
