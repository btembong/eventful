'use client';

import { useState } from 'react';
import { ShieldCheckIcon, UserIcon, CalendarIcon, CheckIcon, XIcon } from '@/components/icons';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Applicant {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  orgName: string;
  orgType: 'INDIVIDUAL' | 'COMPANY' | 'NGO';
  orgPhone: string;
  orgWebsite?: string;
  orgDescription: string;
  kycDocType: string;
  kycDocUrl: string;
  payoutType: 'MTN_MOMO' | 'ORANGE_MONEY' | 'BANK_TRANSFER';
  payoutNumber: string;
  payoutBankName?: string;
  creatorAppliedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK: Applicant[] = [
  {
    id: 'u1', fullName: 'Amara Concerts SARL', email: 'amara@concerts.cm', phone: '+237 677 111 222',
    orgName: 'Amara Concerts', orgType: 'COMPANY', orgPhone: '+237 233 111 222',
    orgWebsite: 'https://instagram.com/amaraconcerts',
    orgDescription: 'We organize music concerts and cultural festivals in the Central and Littoral regions. Our flagship event is the annual Douala Jazz Festival, running since 2018.',
    kycDocType: 'Business Certificate', kycDocUrl: 'https://cdn.eventful.cm/kyc/amara-rc.pdf',
    payoutType: 'MTN_MOMO', payoutNumber: '+237 677 111 222',
    creatorAppliedAt: new Date(Date.now() - 2 * 86400_000).toISOString(),
    status: 'PENDING',
  },
  {
    id: 'u2', fullName: 'Brice Mvondo', email: 'brice.mvondo@gmail.com', phone: '+237 699 333 444',
    orgName: 'Mvondo Events', orgType: 'INDIVIDUAL', orgPhone: '+237 699 333 444',
    orgDescription: 'Freelance event promoter based in Yaounde, specializing in theater productions and comedy shows. 5+ years experience.',
    kycDocType: 'National ID', kycDocUrl: 'https://cdn.eventful.cm/kyc/brice-id.jpg',
    payoutType: 'ORANGE_MONEY', payoutNumber: '+237 699 333 444',
    creatorAppliedAt: new Date(Date.now() - 1 * 86400_000).toISOString(),
    status: 'PENDING',
  },
  {
    id: 'u3', fullName: 'FESTAC Foundation', email: 'info@festac.cm', phone: '+237 222 555 666',
    orgName: 'FESTAC Foundation', orgType: 'NGO', orgPhone: '+237 222 555 666',
    orgWebsite: 'https://festac.cm',
    orgDescription: 'Non-profit foundation organizing the Festival of African Arts and Culture (FESTAC) annually in Douala. Government accredited since 2010.',
    kycDocType: 'NGO Certificate', kycDocUrl: 'https://cdn.eventful.cm/kyc/festac-cert.pdf',
    payoutType: 'BANK_TRANSFER', payoutNumber: '00011 00001 12345678901', payoutBankName: 'Afriland First Bank',
    creatorAppliedAt: new Date(Date.now() - 4 * 86400_000).toISOString(),
    status: 'PENDING',
  },
];

const ORG_TYPE_LABEL: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  COMPANY:    'Company',
  NGO:        'NGO / Non-profit',
};

const PAYOUT_LABEL: Record<string, string> = {
  MTN_MOMO:      'MTN Mobile Money',
  ORANGE_MONEY:  'Orange Money',
  BANK_TRANSFER: 'Bank Transfer',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Applicant detail drawer ────────────────────────────────────────────────

function DetailPanel({
  applicant,
  onApprove,
  onReject,
  onClose,
}: {
  applicant: Applicant;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onClose: () => void;
}) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason]         = useState('');
  const [loading, setLoading]       = useState(false);

  async function approve() {
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/admin/${applicant.id}/review`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` },
        body:    JSON.stringify({ action: 'approve' }),
      });
      onApprove(applicant.id);
    } finally {
      setLoading(false);
    }
  }

  async function reject() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/admin/${applicant.id}/review`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` },
        body:    JSON.stringify({ action: 'reject', rejectedReason: reason.trim() }),
      });
      onReject(applicant.id, reason.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Application review</p>
            <h2 className="mt-0.5 text-lg font-extrabold text-slate-900">{applicant.fullName}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 p-6">

          {/* Personal */}
          <section>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Account</p>
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
              <Row label="Name"    value={applicant.fullName} />
              <Row label="Email"   value={applicant.email} />
              <Row label="Phone"   value={applicant.phone} />
              <Row label="Applied" value={fmtDate(applicant.creatorAppliedAt)} />
            </div>
          </section>

          {/* Org profile */}
          <section>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Organization</p>
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
              <Row label="Name"    value={applicant.orgName} />
              <Row label="Type"    value={ORG_TYPE_LABEL[applicant.orgType]} />
              <Row label="Phone"   value={applicant.orgPhone} />
              {applicant.orgWebsite && <Row label="Website" value={applicant.orgWebsite} link />}
            </div>
            <div className="mt-3 rounded-xl bg-slate-50 p-4">
              <p className="mb-1 text-xs font-bold text-slate-500">About</p>
              <p className="text-sm text-slate-700">{applicant.orgDescription}</p>
            </div>
          </section>

          {/* KYC */}
          <section>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Identity (KYC)</p>
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
              <Row label="Document type" value={applicant.kycDocType} />
              <Row label="Document URL"  value="View document" link href={applicant.kycDocUrl} />
            </div>
          </section>

          {/* Payout */}
          <section>
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Payout details</p>
            <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
              <Row label="Method"  value={PAYOUT_LABEL[applicant.payoutType]} />
              <Row label="Number"  value={applicant.payoutNumber} />
              {applicant.payoutBankName && <Row label="Bank" value={applicant.payoutBankName} />}
            </div>
          </section>
        </div>

        {/* Actions */}
        <div className="shrink-0 border-t border-slate-100 p-6 space-y-3">
          {rejectMode ? (
            <>
              <p className="text-xs font-bold text-red-600">Rejection reason (shown to applicant)</p>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. The uploaded ID document is unclear. Please resubmit a legible scan."
                className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200 min-h-[100px] resize-y"
              />
              <div className="flex gap-3">
                <button onClick={() => setRejectMode(false)} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button
                  onClick={reject}
                  disabled={!reason.trim() || loading}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {loading ? 'Rejecting…' : 'Confirm rejection'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setRejectMode(true)}
                className="flex-1 rounded-xl border-2 border-red-200 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
              >
                Reject
              </button>
              <button
                onClick={approve}
                disabled={loading}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {loading ? 'Approving…' : '✓ Approve'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, link, href }: { label: string; value: string; link?: boolean; href?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-xs text-slate-400 shrink-0">{label}</p>
      {link ? (
        <a href={href ?? value} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-600 hover:underline truncate">{value}</a>
      ) : (
        <p className="text-xs font-semibold text-slate-900 text-right">{value}</p>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function AdminCreatorsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>(MOCK);
  const [selected,   setSelected]   = useState<Applicant | null>(null);
  const [tab,        setTab]        = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  function handleApprove(id: string) {
    setApplicants((prev) => prev.map((a) => a.id === id ? { ...a, status: 'APPROVED' } : a));
    setSelected(null);
  }

  function handleReject(id: string, _reason: string) {
    setApplicants((prev) => prev.map((a) => a.id === id ? { ...a, status: 'REJECTED' } : a));
    setSelected(null);
  }

  const filtered = applicants.filter((a) => a.status === tab);
  const pendingCount = applicants.filter((a) => a.status === 'PENDING').length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <ShieldCheckIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Creator Applications</h1>
            <p className="text-sm text-slate-500">Review and approve event organizer applications.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-slate-100 p-1">
        {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((t) => {
          const count = applicants.filter((a) => a.status === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition ${
                tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'PENDING' && count > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-extrabold text-white">{count}</span>
              )}
              {t.charAt(0) + t.slice(1).toLowerCase()}
              {t !== 'PENDING' && <span className="text-slate-400">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldCheckIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No {tab.toLowerCase()} applications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelected(a)}
              className="group w-full overflow-hidden rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition hover:ring-brand-200 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-sm font-extrabold text-brand-600">
                  {a.fullName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="font-extrabold text-slate-900">{a.orgName}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {ORG_TYPE_LABEL[a.orgType]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{a.fullName} · {a.email}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                    <span>KYC: {a.kycDocType}</span>
                    <span>Payout: {PAYOUT_LABEL[a.payoutType]}</span>
                    <span>Applied {timeSince(a.creatorAppliedAt)}</span>
                  </div>
                </div>
                <span className="shrink-0 text-sm text-slate-300 group-hover:text-brand-500 transition">→</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          applicant={selected}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
