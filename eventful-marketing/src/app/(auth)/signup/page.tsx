'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EyeIcon, EyeOffIcon, TicketIcon, MailIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

// ─── Input helper ──────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Input({
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-300 focus:ring-2',
        error
          ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
          : 'border-slate-200 bg-white focus:border-brand-500 focus:ring-brand-500/15',
        props.className,
      )}
    />
  );
}

// ─── Password strength indicator ──────────────────────────────────────────────

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)            score++;
  if (/[A-Z]/.test(pw))          score++;
  if (/[a-z]/.test(pw))          score++;
  if (/[0-9]/.test(pw))          score++;
  if (/[^A-Za-z0-9]/.test(pw))   score++;
  if (score <= 2) return { score, label: 'Weak',   color: 'bg-red-400' };
  if (score === 3) return { score, label: 'Fair',   color: 'bg-brand-400' };
  if (score === 4) return { score, label: 'Good',   color: 'bg-brand-500' };
  return              { score, label: 'Strong', color: 'bg-brand-600' };
}

function PasswordStrength({ password }: { password: string }) {
  const { score, label, color } = getStrength(password);
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? color : 'bg-slate-100'}`}
          />
        ))}
      </div>
      <p className={`mt-1 text-[11px] font-semibold ${score <= 2 ? 'text-red-400' : score === 3 ? 'text-brand-400' : 'text-brand-600'}`}>
        {label}
        {score < 5 && (
          <span className="ml-1 font-normal text-slate-400">
            — add {[
              !(/[A-Z]/.test(password)) && 'uppercase',
              !(/[a-z]/.test(password)) && 'lowercase',
              !(/[0-9]/.test(password)) && 'a number',
              !(/[^A-Za-z0-9]/.test(password)) && 'a symbol',
              password.length < 8 && '8+ chars',
            ].filter(Boolean).join(', ')}
          </span>
        )}
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [phone,         setPhone]         = useState('');
  const [password,      setPassword]      = useState('');
  const [confirm,       setConfirm]       = useState('');
  const [showPw,        setShowPw]        = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [success,       setSuccess]       = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg,     setResendMsg]     = useState('');

  function validate() {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Name is required';

    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';

    // Phone — optional, but if provided must be a valid international number
    const phoneTrimmed = phone.trim();
    if (phoneTrimmed) {
      const phoneDigits = phoneTrimmed.replace(/[\s\-().]/g, '');
      if (!/^\+?[1-9]\d{6,14}$/.test(phoneDigits)) {
        e.phone = 'Enter a valid phone number (e.g. +237 6XX XXX XXX)';
      }
    }

    // Strong password: min 8 chars, uppercase, lowercase, digit, special char
    if (!password) {
      e.password = 'Password is required';
    } else if (password.length < 8) {
      e.password = 'At least 8 characters required';
    } else if (!/[A-Z]/.test(password)) {
      e.password = 'Must include at least one uppercase letter (A–Z)';
    } else if (!/[a-z]/.test(password)) {
      e.password = 'Must include at least one lowercase letter (a–z)';
    } else if (!/[0-9]/.test(password)) {
      e.password = 'Must include at least one number (0–9)';
    } else if (!/[^A-Za-z0-9]/.test(password)) {
      e.password = 'Must include at least one special character (!@#$%…)';
    }

    if (confirm !== password) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrors({ form: data.message ?? 'Registration failed.' }); return; }
      setSuccess(true);
    } catch {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    setResendMsg('');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResendMsg('Verification email resent — check your inbox.');
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  // ── Success / email check screen ────────────────────────────────────────────

  if (success) {
    return (
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-100 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
          <MailIcon className="h-8 w-8 text-brand-600" />
        </div>
        <h2 className="mt-5 text-xl font-extrabold text-slate-900">Check your email</h2>
        <p className="mt-2 text-sm text-slate-500">
          We sent a verification link to{' '}
          <span className="font-semibold text-slate-700">{email}</span>.
          Click it to activate your account.
        </p>
        <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Didn&apos;t receive it? Check spam, or{' '}
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="font-bold text-brand-600 hover:text-brand-500 disabled:opacity-50"
          >
            {resendLoading ? 'Sending…' : 'resend the email'}
          </button>.
          {resendMsg && <p className="mt-1 font-medium text-brand-600">{resendMsg}</p>}
        </div>
        <Link
          href="/login"
          className="mt-6 block w-full rounded-xl bg-brand-600 py-3 text-sm font-extrabold text-white transition hover:bg-brand-500"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-4xl">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-200/60 ring-1 ring-slate-100 lg:grid lg:grid-cols-2">

        {/* ── Left — illustration panel ──────────────────────────────────────── */}
        <div className="relative hidden overflow-hidden bg-brand-950 lg:block">
          <Image
            src="/illustrations/signup.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
          />
        </div>

        {/* ── Right — form ──────────────────────────────────────────────────── */}
        <div className="flex flex-col justify-center p-8 sm:p-10">

          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600">
              <TicketIcon className="h-4 w-4 text-white" />
            </span>
            <span className="text-base font-extrabold tracking-tight text-slate-900">eventful</span>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Already have one?{' '}
            <Link href="/login" className="font-bold text-brand-600 hover:text-brand-500">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>

            {errors.form && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{errors.form}</div>
            )}

            <Field label="Full name *" error={errors.fullName}>
              <Input
                type="text"
                autoComplete="name"
                placeholder="Amara Nkosi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={errors.fullName}
              />
            </Field>

            <Field label="Email address *" error={errors.email}>
              <Input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
              />
            </Field>

            <Field
              label="Phone number"
              hint="Optional — for SMS event reminders"
              error={errors.phone}
            >
              <Input
                type="tel"
                autoComplete="tel"
                placeholder="+237 6XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
              />
            </Field>

            <Field label="Password *" error={errors.password}>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Min 8 chars, uppercase, number, symbol"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <PasswordStrength password={password} />
              )}
            </Field>

            <Field label="Confirm password *" error={errors.confirm}>
              <Input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                error={errors.confirm}
              />
            </Field>

            <p className="text-xs text-slate-400">
              By signing up you agree to our{' '}
              <Link href="/terms" className="text-brand-600 hover:underline">Terms</Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-brand-600 hover:underline">Privacy Policy</Link>.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-extrabold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500 disabled:opacity-50"
            >
              {loading ? 'Creating account…' : 'Create account →'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <p className="text-xs text-slate-400">Are you an event organiser?</p>
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
