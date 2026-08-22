'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailIcon, CheckIcon } from '@/components/icons';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setError('');
    setLoading(true);

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      });
      // Always show success — no user enumeration
      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold text-slate-900">Check your inbox</h1>
        <p className="mt-2 text-sm text-slate-500">
          If <strong>{email}</strong> is registered, we've sent a password reset link. It expires in <strong>15 minutes</strong>.
        </p>
        <p className="mt-4 text-xs text-slate-400">Didn't receive it? Check your spam folder.</p>
        <Link href="/login" className="mt-6 inline-block text-sm font-bold text-brand-600 hover:text-brand-500">
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100">
        <MailIcon className="h-6 w-6 text-brand-600" />
      </div>
      <h1 className="text-xl font-extrabold text-slate-900">Forgot your password?</h1>
      <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send a reset link.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
        {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Email address</label>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-cartoon w-full py-3 text-sm disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <Link href="/login" className="mt-6 block text-center text-sm font-semibold text-slate-500 hover:text-brand-600">
        ← Back to sign in
      </Link>
    </div>
  );
}
