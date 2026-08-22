'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, ClockIcon } from '@/components/icons';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Referral {
  name:      string;
  status:    string;
  appliedAt: string;
  credited:  boolean;
}

interface Stats {
  code:          string;
  ownerName:     string;
  totalEarnings: number;
  referrals:     Referral[];
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:  'Pending review',
  ACCEPTED: 'Accepted — awaiting payment',
  PAID:     'Paid — $30 credited!',
  REJECTED: 'Not accepted',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  PAID:     'bg-green-100 text-green-700',
  REJECTED: 'bg-slate-100 text-slate-500',
};

export default function ReferralStatsPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const [stats, setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/bootcamp/referral/stats/${code}`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setStats(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  const shareUrl  = typeof window !== 'undefined' ? `${window.location.origin}/bootcamp?ref=${code}` : `/bootcamp?ref=${code}`;

  function copyLink() {
    navigator.clipboard.writeText(shareUrl).catch(() => null);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-400">Loading…</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-5 text-center">
        <p className="text-4xl font-black text-slate-200">404</p>
        <p className="text-lg font-extrabold text-slate-900">Referral code not found</p>
        <p className="text-sm text-slate-500">This code doesn&apos;t exist or hasn&apos;t been activated yet.</p>
        <Link href="/bootcamp" className="rounded-xl border-2 border-brand-950 bg-brand-600 px-5 py-2.5 text-sm font-black text-white shadow-[3px_3px_0_#333333]">
          Apply to the bootcamp
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-xl px-5 sm:px-6">

        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/bootcamp" className="mb-4 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline">
            ← Bootcamp page
          </Link>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-brand-950 bg-brand-600 shadow-[3px_3px_0_#333333]">
            <span className="text-xl font-black text-white">$</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">{stats!.ownerName}</h1>
          <p className="mt-1 text-sm text-slate-500">Referral Dashboard</p>
        </div>

        {/* Earnings card */}
        <div className="mb-5 overflow-hidden rounded-2xl border-2 border-brand-950 bg-white" style={{ boxShadow: '5px 5px 0 #333333' }}>
          <div className="grid grid-cols-2 divide-x-2 divide-brand-950">
            <div className="px-6 py-5 text-center">
              <p className="text-4xl font-black text-brand-600">${stats!.totalEarnings}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Total earned</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-4xl font-black text-slate-900">{stats!.referrals.length}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Referrals</p>
            </div>
          </div>
        </div>

        {/* Share box */}
        <div className="mb-5 rounded-2xl border-2 border-green-400 bg-green-50 p-5" style={{ boxShadow: '4px 4px 0 #16a34a40' }}>
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-green-700">Your referral code</p>
          <div className="mb-3 rounded-xl border-2 border-green-300 bg-white py-3 text-center">
            <span className="font-mono text-2xl font-black tracking-[0.2em] text-green-700">{stats!.code}</span>
          </div>
          <p className="mb-3 text-xs text-green-800">Share this link — your code is pre-filled automatically:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 truncate rounded-xl border border-green-300 bg-white px-3 py-2 text-xs font-mono text-slate-600"
            />
            <button
              onClick={copyLink}
              className="shrink-0 rounded-xl border-2 border-brand-950 bg-brand-600 px-4 py-2 text-xs font-black text-white shadow-[2px_2px_0_#333333] transition hover:-translate-x-px hover:-translate-y-px"
            >
              Copy
            </button>
          </div>
          <p className="mt-3 text-xs text-green-700">
            You earn <strong>$30</strong> for every friend who applies and completes payment.
          </p>
        </div>

        {/* Referral list */}
        {stats!.referrals.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
            <p className="text-sm font-bold text-slate-400">No referrals yet</p>
            <p className="mt-1 text-xs text-slate-400">Share your link above to start earning.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border-2 border-brand-950 bg-white" style={{ boxShadow: '4px 4px 0 #333333' }}>
            <div className="border-b-2 border-brand-950 bg-brand-950 px-5 py-3">
              <p className="text-xs font-black uppercase tracking-widest text-white/60">Your referrals</p>
            </div>
            <div className="divide-y divide-slate-100">
              {stats!.referrals.map((r, i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    {r.credited
                      ? <CheckCircleIcon className="h-5 w-5 shrink-0 text-green-500" />
                      : <ClockIcon className="h-5 w-5 shrink-0 text-slate-300" />
                    }
                    <div>
                      <p className="text-sm font-bold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-400">Applied {new Date(r.appliedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-lg px-2.5 py-1 text-[10px] font-black ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.credited && <span className="text-xs font-extrabold text-green-600">+$30</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Questions? <a href="mailto:bootcamp@digostechnologies.com" className="text-brand-600 underline">bootcamp@digostechnologies.com</a>
        </p>
      </div>
    </div>
  );
}
