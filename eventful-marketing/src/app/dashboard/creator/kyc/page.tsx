'use client';

import { useState, useEffect } from 'react';
import { useApiFetch } from '@/contexts/auth-context';
import {
  ShieldCheckIcon, UserIcon, LockIcon, CheckIcon,
  WalletIcon, ArrowRightIcon,
} from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type KycStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

interface KycData {
  kycStatus: KycStatus;
  kycSubmittedAt?: string;
  kycReviewedAt?: string;
  kycRejectedReason?: string;
  kycDateOfBirth?: string;
  kycAddress?: string;
  kycDocType?: string;
  kycIdNumber?: string;
  kycDocUrl?: string;
  kycDocBackUrl?: string;
  payoutType?: string;
  payoutNumber?: string;
  payoutBankName?: string;
  payoutAccountHolder?: string;
  payoutBranch?: string;
}

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Personal',  Icon: UserIcon },
  { label: 'Identity',  Icon: ShieldCheckIcon },
  { label: 'Payout',    Icon: WalletIcon },
];

const DOC_TYPES = [
  { value: 'NATIONAL_ID',      label: 'National ID Card' },
  { value: 'PASSPORT',         label: 'Passport' },
  { value: 'DRIVERS_LICENSE',  label: 'Driver\'s License' },
];

const PAYOUT_TYPES = [
  { value: 'MTN_MOMO',      label: 'MTN Mobile Money' },
  { value: 'ORANGE_MONEY',  label: 'Orange Money' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

// ─── Reusable field ───────────────────────────────────────────────────────────

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-700">{label}</label>
      {children}
      {hint  && !error && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-300 focus:ring-2 ${
        error
          ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
          : 'border-slate-200 bg-slate-50 focus:border-brand-500 focus:bg-white focus:ring-brand-500/15'
      } ${props.className ?? ''}`}
    />
  );
}

// ─── Status screens ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: KycStatus }) {
  const map = {
    PENDING:   { label: 'Not started',    bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400' },
    SUBMITTED: { label: 'Under review',   bg: 'bg-brand-50',    text: 'text-brand-700',   dot: 'bg-brand-500' },
    APPROVED:  { label: 'Verified',       bg: 'bg-brand-100',   text: 'text-brand-800',   dot: 'bg-brand-600' },
    REJECTED:  { label: 'Action needed',  bg: 'bg-brand-50',    text: 'text-brand-900',   dot: 'bg-brand-600' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${s.bg} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function SubmittedScreen({ kycData }: { kycData: KycData }) {
  return (
    <div className="mx-auto max-w-lg text-center py-12 px-4">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
        <ShieldCheckIcon className="h-10 w-10 text-brand-600" />
      </div>
      <h2 className="mt-5 text-xl font-extrabold text-slate-900">Under review</h2>
      <p className="mt-2 text-sm text-slate-500">
        Your identity documents are being reviewed. This usually takes <strong>1–2 business days</strong>.
        We&apos;ll notify you by email once complete.
      </p>
      {kycData.kycSubmittedAt && (
        <p className="mt-3 text-xs text-slate-400">
          Submitted {new Date(kycData.kycSubmittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      )}
      <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 px-6 py-5 text-left space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">What happens next</p>
        {[
          'Admin reviews your ID document and payout details',
          'You receive an email confirmation when approved',
          'Payouts unlock immediately on approval',
        ].map((s) => (
          <div key={s} className="flex items-start gap-2 text-sm text-brand-800">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-600">
              <CheckIcon className="h-2.5 w-2.5 text-white" />
            </span>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApprovedScreen() {
  return (
    <div className="mx-auto max-w-lg text-center py-12 px-4">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-600">
        <CheckIcon className="h-10 w-10 text-white" />
      </div>
      <h2 className="mt-5 text-xl font-extrabold text-slate-900">Identity verified</h2>
      <p className="mt-2 text-sm text-slate-500">
        Your account is fully verified. Payouts are unlocked and will be processed within 48 hours of each event ending.
      </p>
      <a
        href="/dashboard/creator/payouts"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-500"
      >
        View payouts
        <ArrowRightIcon className="h-4 w-4" />
      </a>
    </div>
  );
}

function RejectedBanner({ reason, onResubmit }: { reason?: string; onResubmit: () => void }) {
  return (
    <div className="mb-6 rounded-2xl border-2 border-brand-300 bg-brand-50 px-5 py-4">
      <p className="text-sm font-extrabold text-brand-900">Application not approved</p>
      {reason && <p className="mt-1 text-sm text-brand-700">{reason}</p>}
      <p className="mt-2 text-xs text-brand-600">Please update your documents and re-submit.</p>
      <button
        onClick={onResubmit}
        className="mt-3 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-500"
      >
        Update & re-submit
      </button>
    </div>
  );
}

// ─── Step 1 — Personal info ───────────────────────────────────────────────────

function Step1Personal({
  dob, setDob, address, setAddress, errors,
}: {
  dob: string; setDob: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">We need a few personal details to verify your identity.</p>
      <Field label="Date of birth *" error={errors.dob}>
        <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} error={errors.dob} />
      </Field>
      <Field label="Home address *" hint="Full address including city and country" error={errors.address}>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main Street, Douala, Cameroon"
          rows={3}
          className={`w-full resize-none rounded-xl border px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-300 focus:ring-2 ${
            errors.address
              ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 bg-slate-50 focus:border-brand-500 focus:bg-white focus:ring-brand-500/15'
          }`}
        />
        {errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}
      </Field>
    </div>
  );
}

// ─── Step 2 — Identity document ───────────────────────────────────────────────

function Step2Identity({
  docType, setDocType, idNumber, setIdNumber,
  frontUrl, setFrontUrl, backUrl, setBackUrl, errors,
}: {
  docType: string; setDocType: (v: string) => void;
  idNumber: string; setIdNumber: (v: string) => void;
  frontUrl: string; setFrontUrl: (v: string) => void;
  backUrl: string; setBackUrl: (v: string) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Upload a government-issued ID to prove your identity.</p>

      <Field label="Document type *" error={errors.docType}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DOC_TYPES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDocType(d.value)}
              className={`rounded-xl border-2 px-3 py-3 text-xs font-bold text-center transition ${
                docType === d.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-600 hover:border-brand-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        {errors.docType && <p className="mt-1 text-xs text-red-500">{errors.docType}</p>}
      </Field>

      <Field label="ID / Document number *" error={errors.idNumber}>
        <Input
          placeholder="e.g. CM1234567890"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
          error={errors.idNumber}
        />
      </Field>

      <Field label="Front of document (URL) *" hint="Upload to a file host and paste the URL here" error={errors.frontUrl}>
        <Input
          placeholder="https://..."
          value={frontUrl}
          onChange={(e) => setFrontUrl(e.target.value)}
          error={errors.frontUrl}
        />
      </Field>

      {docType !== 'PASSPORT' && (
        <Field label="Back of document (URL)" hint="Required for National ID and Driver's License">
          <Input
            placeholder="https://..."
            value={backUrl}
            onChange={(e) => setBackUrl(e.target.value)}
          />
        </Field>
      )}

      <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-700">
        <strong>Privacy note:</strong> Document images are reviewed securely by our compliance team and are never shared with third parties.
      </div>
    </div>
  );
}

// ─── Step 3 — Payout details ──────────────────────────────────────────────────

function Step3Payout({
  payoutType, setPayoutType, payoutNumber, setPayoutNumber,
  bankName, setBankName, accountHolder, setAccountHolder,
  branch, setBranch, errors,
}: {
  payoutType: string; setPayoutType: (v: string) => void;
  payoutNumber: string; setPayoutNumber: (v: string) => void;
  bankName: string; setBankName: (v: string) => void;
  accountHolder: string; setAccountHolder: (v: string) => void;
  branch: string; setBranch: (v: string) => void;
  errors: Record<string, string>;
}) {
  const isBank = payoutType === 'BANK_TRANSFER';
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">Where should we send your event revenue?</p>

      <Field label="Payout method *" error={errors.payoutType}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PAYOUT_TYPES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPayoutType(p.value)}
              className={`rounded-xl border-2 px-3 py-3 text-xs font-bold text-center transition ${
                payoutType === p.value
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 text-slate-600 hover:border-brand-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {errors.payoutType && <p className="mt-1 text-xs text-red-500">{errors.payoutType}</p>}
      </Field>

      <Field
        label={isBank ? 'Account number *' : 'Mobile money number *'}
        error={errors.payoutNumber}
        hint={isBank ? 'Your bank account number' : 'e.g. +237 6XX XXX XXX'}
      >
        <Input
          placeholder={isBank ? 'Account number' : '+237 6XX XXX XXX'}
          value={payoutNumber}
          onChange={(e) => setPayoutNumber(e.target.value)}
          error={errors.payoutNumber}
        />
      </Field>

      <Field label="Account holder name *" error={errors.accountHolder}>
        <Input
          placeholder="Full legal name as on account"
          value={accountHolder}
          onChange={(e) => setAccountHolder(e.target.value)}
          error={errors.accountHolder}
        />
      </Field>

      {isBank && (
        <>
          <Field label="Bank name *" error={errors.bankName}>
            <Input
              placeholder="e.g. Afriland First Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              error={errors.bankName}
            />
          </Field>
          <Field label="Branch (optional)">
            <Input
              placeholder="e.g. Douala Akwa"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            />
          </Field>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KycPage() {
  const apiFetch = useApiFetch();
  const [kycData,  setKycData]  = useState<KycData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [step,     setStep]     = useState(0);
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  // Step 1
  const [dob,     setDob]     = useState('');
  const [address, setAddress] = useState('');
  // Step 2
  const [docType,  setDocType]  = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl,  setBackUrl]  = useState('');
  // Step 3
  const [payoutType,     setPayoutType]     = useState('');
  const [payoutNumber,   setPayoutNumber]   = useState('');
  const [bankName,       setBankName]       = useState('');
  const [accountHolder,  setAccountHolder]  = useState('');
  const [branch,         setBranch]         = useState('');

  useEffect(() => {
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/kyc`)
      .then((r) => r.ok ? r.json() : null)
      .then((d: KycData | null) => {
        if (d) {
          setKycData(d);
          // Pre-fill form with existing data
          if (d.kycDateOfBirth)    setDob(d.kycDateOfBirth);
          if (d.kycAddress)        setAddress(d.kycAddress);
          if (d.kycDocType)        setDocType(d.kycDocType);
          if (d.kycIdNumber)       setIdNumber(d.kycIdNumber);
          if (d.kycDocUrl)         setFrontUrl(d.kycDocUrl);
          if (d.kycDocBackUrl)     setBackUrl(d.kycDocBackUrl);
          if (d.payoutType)        setPayoutType(d.payoutType);
          if (d.payoutNumber)      setPayoutNumber(d.payoutNumber);
          if (d.payoutBankName)    setBankName(d.payoutBankName);
          if (d.payoutAccountHolder) setAccountHolder(d.payoutAccountHolder);
          if (d.payoutBranch)      setBranch(d.payoutBranch);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!dob)     e.dob     = 'Date of birth is required';
      if (!address.trim()) e.address = 'Address is required';
    }
    if (step === 1) {
      if (!docType)         e.docType  = 'Select a document type';
      if (!idNumber.trim()) e.idNumber = 'Document number is required';
      if (!frontUrl.trim()) e.frontUrl = 'Front image URL is required';
    }
    if (step === 2) {
      if (!payoutType)           e.payoutType    = 'Select a payout method';
      if (!payoutNumber.trim())  e.payoutNumber  = 'Account number is required';
      if (!accountHolder.trim()) e.accountHolder = 'Account holder name is required';
      if (payoutType === 'BANK_TRANSFER' && !bankName.trim()) e.bankName = 'Bank name is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleNext() {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    // Final submit
    setSaving(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/kyc`, {
        method: 'PUT',
        body: JSON.stringify({
          kycDateOfBirth:     dob,
          kycAddress:         address,
          kycDocType:         docType,
          kycIdNumber:        idNumber,
          kycDocUrl:          frontUrl,
          kycDocBackUrl:      backUrl || undefined,
          payoutType,
          payoutNumber,
          payoutBankName:     bankName || undefined,
          payoutAccountHolder: accountHolder,
          payoutBranch:       branch || undefined,
        }),
      });
      if (res.ok) {
        const updated: KycData = await res.json();
        setKycData(updated);
        setShowForm(false);
      } else {
        const d = await res.json().catch(() => ({}));
        setErrors({ form: d.message ?? 'Failed to submit. Please try again.' });
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 rounded-2xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const status = kycData?.kycStatus ?? 'PENDING';

  // Show read-only status screens for non-editable states
  if (status === 'SUBMITTED' && !showForm) return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader status={status} />
      <SubmittedScreen kycData={kycData!} />
    </div>
  );

  if (status === 'APPROVED') return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader status={status} />
      <ApprovedScreen />
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <PageHeader status={status} />

      {status === 'REJECTED' && !showForm && (
        <RejectedBanner
          reason={kycData?.kycRejectedReason}
          onResubmit={() => { setShowForm(true); setStep(0); }}
        />
      )}

      {/* Wizard */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {/* Step progress */}
        <div className="flex border-b border-slate-100">
          {STEPS.map((s, i) => {
            const done   = i < step;
            const active = i === step;
            return (
              <div
                key={s.label}
                className={`flex flex-1 flex-col items-center gap-1.5 py-4 text-xs font-bold transition ${
                  active ? 'bg-brand-50 text-brand-700' :
                  done   ? 'text-brand-500' :
                           'text-slate-400'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  done   ? 'bg-brand-600' :
                  active ? 'bg-brand-100' :
                           'bg-slate-100'
                }`}>
                  {done
                    ? <CheckIcon className="h-4 w-4 text-white" />
                    : <s.Icon className={`h-4 w-4 ${active ? 'text-brand-600' : 'text-slate-400'}`} />
                  }
                </div>
                <span className="hidden sm:block">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="p-6 sm:p-8">
          {errors.form && (
            <div className="mb-5 rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-700">
              {errors.form}
            </div>
          )}

          {step === 0 && (
            <Step1Personal dob={dob} setDob={setDob} address={address} setAddress={setAddress} errors={errors} />
          )}
          {step === 1 && (
            <Step2Identity
              docType={docType} setDocType={setDocType}
              idNumber={idNumber} setIdNumber={setIdNumber}
              frontUrl={frontUrl} setFrontUrl={setFrontUrl}
              backUrl={backUrl} setBackUrl={setBackUrl}
              errors={errors}
            />
          )}
          {step === 2 && (
            <Step3Payout
              payoutType={payoutType} setPayoutType={setPayoutType}
              payoutNumber={payoutNumber} setPayoutNumber={setPayoutNumber}
              bankName={bankName} setBankName={setBankName}
              accountHolder={accountHolder} setAccountHolder={setAccountHolder}
              branch={branch} setBranch={setBranch}
              errors={errors}
            />
          )}

          <div className="mt-8 flex items-center justify-between">
            {step > 0 ? (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Back
              </button>
            ) : <div />}

            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? 'Submitting…' :
               step < STEPS.length - 1 ? 'Next' :
               'Submit for review'}
              {!saving && <ArrowRightIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Your information is encrypted and stored securely. We only use it for identity verification and payouts.
      </p>
    </div>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────

function PageHeader({ status }: { status: KycStatus }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Identity & KYC</h1>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Complete identity verification to unlock payouts. Your data is processed securely.
      </p>
    </div>
  );
}
