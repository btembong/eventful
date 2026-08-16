'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckIcon, MailIcon, XIcon } from '@/components/icons';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const token  = params.get('token');
  const email  = params.get('email') ?? '';

  const [state,   setState]   = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [message, setMessage] = useState('');
  const [resent,  setResent]  = useState(false);

  useEffect(() => {
    if (!token) { setState('no-token'); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setState('success');
        } else {
          setState('error');
          setMessage(data.message ?? 'Verification failed.');
        }
      })
      .catch(() => {
        setState('error');
        setMessage('Network error. Please try again.');
      });
  }, [token]);

  async function resend() {
    if (!email) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setResent(true);
  }

  if (state === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <p className="text-sm text-slate-500">Verifying your email…</p>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckIcon className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold text-slate-900">Email verified!</h1>
        <p className="mt-2 text-sm text-slate-500">Your account is now active. Sign in to start discovering events.</p>
        <Link href="/login" className="mt-6 inline-block rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-brand-500">
          Sign in →
        </Link>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <XIcon className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="mt-5 text-xl font-extrabold text-slate-900">Link expired</h1>
        <p className="mt-2 text-sm text-slate-500">{message || 'This verification link has expired or already been used.'}</p>
        {resent ? (
          <p className="mt-5 text-sm font-semibold text-emerald-600">A new link has been sent to your inbox.</p>
        ) : (
          <button onClick={resend} className="mt-5 rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-brand-500">
            Resend verification email
          </button>
        )}
      </div>
    );
  }

  // no-token — user landed here without a token
  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
        <MailIcon className="h-8 w-8 text-brand-600" />
      </div>
      <h1 className="mt-5 text-xl font-extrabold text-slate-900">Check your inbox</h1>
      <p className="mt-2 text-sm text-slate-500">
        We sent a verification link to your email address. Click it to activate your account.
      </p>
      <p className="mt-4 text-xs text-slate-400">Didn't receive it? Check your spam folder, or</p>
      {resent ? (
        <p className="mt-2 text-sm font-semibold text-emerald-600">A new link has been sent!</p>
      ) : (
        <button onClick={resend} className="mt-2 text-sm font-bold text-brand-600 hover:text-brand-500">
          resend the email
        </button>
      )}
    </div>
  );
}
