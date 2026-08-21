'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TicketIcon, CheckIcon, UserIcon, CalendarIcon, LockIcon,
} from '@/components/icons';

// ─── Types ─────────────────────────────────────────────────────────────────

type OrgType = 'INDIVIDUAL' | 'COMPANY' | 'NGO';

interface FormData {
  // Step 1 — account
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  // Step 2 — organizer profile
  orgName: string;
  orgType: OrgType | '';
  orgPhone: string;
  orgWebsite: string;
  orgDescription: string;
  // Step 3 — agreement
  agreedToTerms: boolean;
  agreedToFees: boolean;
}

const INIT: FormData = {
  fullName: '', email: '', phone: '', password: '', confirmPassword: '',
  orgName: '', orgType: '', orgPhone: '', orgWebsite: '', orgDescription: '',
  agreedToTerms: false, agreedToFees: false,
};

const STEPS = [
  { label: 'Account', icon: UserIcon },
  { label: 'Profile', icon: CalendarIcon },
  { label: 'Agree',   icon: LockIcon },
];

// ─── Reusable field ────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    err
      ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-200'
      : 'border-slate-200 bg-slate-50 focus:border-brand-500 focus:bg-white focus:ring-brand-500/20'
  }`;

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label>
      {children}
      {hint  && !error && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Step components ───────────────────────────────────────────────────────

function Step1Account({ d, set, errs }: { d: FormData; set: (k: keyof FormData, v: string | boolean) => void; errs: Partial<Record<keyof FormData, string>> }) {
  const [showPw, setShowPw] = useState(false);
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-600">
        Already have an Eventful account?{' '}
        <Link href="/login" className="font-bold underline">Sign in first</Link>, then come back here to apply.
      </div>
      <Field label="Full name *" error={errs.fullName}>
        <input className={inputCls(errs.fullName)} placeholder="Amara Nkosi" value={d.fullName} onChange={(e) => set('fullName', e.target.value)} />
      </Field>
      <Field label="Email address *" error={errs.email}>
        <input type="email" className={inputCls(errs.email)} placeholder="you@example.com" value={d.email} onChange={(e) => set('email', e.target.value)} />
      </Field>
      <Field label="Phone number *" error={errs.phone} hint="Required for creator accounts — used for payout and support contact">
        <input type="tel" className={inputCls(errs.phone)} placeholder="+237 6XX XXX XXX" value={d.phone} onChange={(e) => set('phone', e.target.value)} />
      </Field>
      <Field label="Password *" error={errs.password}>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            className={inputCls(errs.password)}
            placeholder="At least 8 characters"
            value={d.password}
            onChange={(e) => set('password', e.target.value)}
          />
          <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600">
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>
      </Field>
      <Field label="Confirm password *" error={errs.confirmPassword}>
        <input type={showPw ? 'text' : 'password'} className={inputCls(errs.confirmPassword)} placeholder="Repeat your password" value={d.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />
      </Field>
    </div>
  );
}

function Step2Profile({ d, set, errs }: { d: FormData; set: (k: keyof FormData, v: string | boolean) => void; errs: Partial<Record<keyof FormData, string>> }) {
  const ORG_TYPES: { value: OrgType; label: string; emoji: string; desc: string }[] = [
    { value: 'INDIVIDUAL', label: 'Individual',   emoji: '👤', desc: 'Solo organiser or freelancer' },
    { value: 'COMPANY',    label: 'Company',       emoji: '🏢', desc: 'Registered business or agency' },
    { value: 'NGO',        label: 'NGO / Non-profit', emoji: '🤝', desc: 'Foundation or cultural org' },
  ];
  return (
    <div className="space-y-5">
      <Field label="Organization / Brand name *" error={errs.orgName} hint="This appears publicly on your event listings">
        <input className={inputCls(errs.orgName)} placeholder="e.g. Douala Concerts SARL" value={d.orgName} onChange={(e) => set('orgName', e.target.value)} />
      </Field>

      <Field label="Organization type *" error={errs.orgType}>
        <div className="grid grid-cols-3 gap-3">
          {ORG_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set('orgType', t.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-center transition ${
                d.orgType === t.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-brand-200'
              }`}
            >
              <span className="text-2xl">{t.emoji}</span>
              <span className={`text-xs font-bold ${d.orgType === t.value ? 'text-brand-600' : 'text-slate-700'}`}>{t.label}</span>
              <span className="text-[10px] text-slate-400">{t.desc}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Organizer phone *" error={errs.orgPhone} hint="Business/contact number (may differ from your account phone)">
        <input type="tel" className={inputCls(errs.orgPhone)} placeholder="+237 2XX XXX XXX" value={d.orgPhone} onChange={(e) => set('orgPhone', e.target.value)} />
      </Field>

      <Field label="Website or social media" hint="Optional — helps us verify your identity">
        <input className={inputCls()} placeholder="https://instagram.com/yourpage" value={d.orgWebsite} onChange={(e) => set('orgWebsite', e.target.value)} />
      </Field>

      <Field label="About your organization *" error={errs.orgDescription} hint="Tell us what kind of events you plan to host (min. 50 characters)">
        <textarea
          className={`${inputCls(errs.orgDescription)} min-h-[100px] resize-y`}
          placeholder="We organize music concerts and cultural festivals in the Central and Littoral regions of Cameroon…"
          value={d.orgDescription}
          onChange={(e) => set('orgDescription', e.target.value)}
        />
        <p className="mt-1 text-right text-[10px] text-slate-400">{d.orgDescription.length} / 50 min</p>
      </Field>
    </div>
  );
}

function Step3Agreement({ d, set }: { d: FormData; set: (k: keyof FormData, v: string | boolean) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600 space-y-3">
        <p className="font-bold text-sm text-slate-900">Creator Terms of Service — Summary</p>
        <p><strong>Revenue share:</strong> Eventful charges a <strong>5% platform fee</strong> on each paid ticket sale. Free events are always free to list.</p>
        <p><strong>Payouts:</strong> Revenue is transferred to your registered payout account within 48 hours of the event ending, minus the platform fee.</p>
        <p><strong>Cancellations:</strong> If you cancel an event, you are responsible for issuing refunds to all ticket holders within 7 days. Eventful will assist with processing.</p>
        <p><strong>Prohibited content:</strong> You may not list events that are illegal, discriminatory, or violate Eventful&apos;s community guidelines.</p>
        <p><strong>Tax obligations:</strong> You are solely responsible for any VAT, withholding tax, or other applicable taxes on your earnings.</p>
        <p><strong>Verification:</strong> You may be asked to verify your identity and add payout details before your first withdrawal. This is done securely inside your dashboard.</p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={d.agreedToTerms}
          onChange={(e) => set('agreedToTerms', e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-slate-700">
          I have read and agree to the <Link href="/terms" className="font-bold text-brand-600 hover:underline">Creator Terms of Service</Link> and <Link href="/privacy" className="font-bold text-brand-600 hover:underline">Privacy Policy</Link>.
        </span>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={d.agreedToFees}
          onChange={(e) => set('agreedToFees', e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-slate-700">
          I understand that Eventful charges a <strong>5% fee</strong> per paid ticket and that I am responsible for all applicable taxes on my earnings.
        </span>
      </label>

      <div className="rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
        After submission your application will be reviewed by our team within <strong>2 business days</strong>. You will receive an email confirmation at the address provided.
      </div>
    </div>
  );
}

// ─── Validators ────────────────────────────────────────────────────────────

function validate(step: number, d: FormData): Partial<Record<keyof FormData, string>> {
  const e: Partial<Record<keyof FormData, string>> = {};
  if (step === 0) {
    if (!d.fullName.trim())       e.fullName        = 'Name is required';
    if (!d.email.trim())          e.email           = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(d.email)) e.email = 'Enter a valid email';
    if (!d.phone.trim())          e.phone           = 'Phone is required for creator accounts';
    if (d.password.length < 8)   e.password        = 'Minimum 8 characters';
    if (d.confirmPassword !== d.password) e.confirmPassword = 'Passwords do not match';
  }
  if (step === 1) {
    if (!d.orgName.trim())        e.orgName         = 'Organization name is required';
    if (!d.orgType)               e.orgType         = 'Select an organization type';
    if (!d.orgPhone.trim())       e.orgPhone        = 'Organization phone is required';
    if (d.orgDescription.length < 50) e.orgDescription = 'Please write at least 50 characters';
  }
  return e;
}

// ─── Success screen ────────────────────────────────────────────────────────

function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
        <CheckIcon className="h-10 w-10 text-brand-600" />
      </div>
      <h2 className="mt-6 text-2xl font-extrabold text-slate-900">You&apos;re approved!</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        Your creator account is ready. We sent a verification link to{' '}
        <span className="font-semibold text-slate-700">{email}</span>.
        Click it to activate your account and start creating events.
      </p>
      <div className="mt-8 space-y-3 rounded-2xl bg-slate-50 p-6 text-left text-sm text-slate-600 w-full max-w-sm">
        <p className="font-bold text-slate-900">What happens next?</p>
        <div className="flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-extrabold text-brand-600">1</span>
          <p>Click the link in your email to activate your account.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-extrabold text-brand-600">2</span>
          <p>Sign in and go to your <strong>Creator Dashboard</strong> to create your first event.</p>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-extrabold text-brand-600">3</span>
          <p>When you&apos;re ready to withdraw earnings, complete a quick identity check in Settings.</p>
        </div>
      </div>
      <Link href="/login" className="mt-8 rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-brand-500">
        Go to sign in
      </Link>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────

export default function BecomeCreatorPage() {
  const [step,    setStep]    = useState(0);
  const [data,    setData]    = useState<FormData>(INIT);
  const [errors,  setErrors]  = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [apiErr,  setApiErr]  = useState('');

  function set(k: keyof FormData, v: string | boolean) {
    setData((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => { const e = { ...prev }; delete e[k]; return e; });
  }

  function next() {
    const errs = validate(step, data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep((s) => s + 1);
    setErrors({});
  }

  function back() { setStep((s) => s - 1); }

  async function submit() {
    if (!data.agreedToTerms || !data.agreedToFees) {
      setErrors({ agreedToTerms: 'You must agree to both statements above' });
      return;
    }
    setLoading(true);
    setApiErr('');

    try {
      // Step 1: register account
      const regRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fullName: data.fullName.trim(),
          email:    data.email.trim(),
          phone:    data.phone.trim(),
          password: data.password,
        }),
      });

      const regData = await regRes.json().catch(() => ({}));
      if (!regRes.ok) {
        setApiErr(regData.message ?? 'Registration failed. This email may already be registered.');
        return;
      }

      // Don't store tokens — user must verify email before they can sign in
      const token: string = regData.accessToken;

      // Step 2: submit creator application
      const appRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/apply`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          orgName:        data.orgName.trim(),
          orgType:        data.orgType,
          orgPhone:       data.orgPhone.trim(),
          orgWebsite:     data.orgWebsite.trim() || undefined,
          orgDescription: data.orgDescription.trim(),
        }),
      });

      if (!appRes.ok) {
        const err = await appRes.json().catch(() => ({}));
        setApiErr(err.message ?? 'Application submission failed. Please try again.');
        return;
      }

      setDone(true);
    } catch {
      setApiErr('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-lg bg-white rounded-3xl shadow-xl ring-1 ring-slate-100 p-8">
        <SuccessScreen email={data.email} />
      </div>
    );
  }

  const isLast = step === STEPS.length - 1;

  return (
    <div className="mx-auto w-full max-w-2xl">

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600">
          <TicketIcon className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Become an Event Creator</h1>
        <p className="mt-1 text-sm text-slate-500">Step {step + 1} of {STEPS.length} — {STEPS[step].label}</p>
      </div>

      {/* Step indicator */}
      <div className="mb-8 flex items-center">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex flex-1 items-center">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
                i < step  ? 'bg-brand-600' :
                i === step ? 'bg-brand-600 ring-4 ring-brand-600/20' :
                'bg-slate-100'
              }`}>
                {i < step
                  ? <CheckIcon className="h-4 w-4 text-white" />
                  : <Icon className={`h-4 w-4 ${i === step ? 'text-white' : 'text-slate-400'}`} />
                }
              </div>
              <span className={`ml-1.5 hidden text-[11px] font-bold sm:block ${i === step ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className={`mx-2 h-px flex-1 ${i < step ? 'bg-brand-600' : 'bg-slate-200'}`} />}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
        {step === 0 && <Step1Account   d={data} set={set} errs={errors} />}
        {step === 1 && <Step2Profile   d={data} set={set} errs={errors} />}
        {step === 2 && <Step3Agreement d={data} set={set} />}

        {apiErr && (
          <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{apiErr}</div>
        )}
      </div>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={isLast ? submit : next}
          disabled={loading}
          className="rounded-xl bg-brand-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? 'Submitting…' : isLast ? 'Submit application' : 'Continue →'}
        </button>
      </div>

      {/* Already have account */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-brand-600 hover:text-brand-500">Sign in</Link>
      </p>
    </div>
  );
}
