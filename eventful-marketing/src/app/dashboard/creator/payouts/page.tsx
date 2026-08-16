'use client';

import { useState, useEffect } from 'react';
import { WalletIcon, CheckCircleIcon, ClockIcon } from '@/components/icons';

interface Payout {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  method: string;
  accountNumber: string;
  createdAt: string;
  paidAt?: string;
  eventTitle?: string;
}

interface PayoutSummary {
  totalPaid: number;
  totalPending: number;
  currency: string;
  payouts: Payout[];
}

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  PAID:       { label: 'Paid',       cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PENDING:    { label: 'Pending',    cls: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500' },
  PROCESSING: { label: 'Processing', cls: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500' },
  FAILED:     { label: 'Failed',     cls: 'bg-red-50 text-red-600',         dot: 'bg-red-400' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PayoutsPage() {
  const [data,    setData]    = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/payouts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('Could not load payouts. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Payouts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Revenue is transferred to your registered account within 48 hours of each event ending.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>
      )}

      {/* Summary cards */}
      {!loading && data && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total paid out</p>
              <p className="text-2xl font-extrabold text-slate-900">{data.currency} {data.totalPaid.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Pending</p>
              <p className="text-2xl font-extrabold text-slate-900">{data.currency} {data.totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse flex gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="h-12 w-12 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 rounded bg-slate-200" />
                <div className="h-6 w-3/4 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payout history */}
      <section>
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Payout history</h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 rounded bg-slate-200" />
                    <div className="h-3 w-1/3 rounded bg-slate-200" />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-slate-200" />
                  <div className="h-5 w-24 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : !data || data.payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <WalletIcon className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-500">No payouts yet</p>
              <p className="mt-1 text-xs text-slate-400">Payouts appear after your events end and tickets are verified.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.payouts.map((p) => {
                const st = STATUS_MAP[p.status] ?? STATUS_MAP.PENDING;
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {p.eventTitle ?? 'Payout'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {p.method} · {p.accountNumber} · {fmtDate(p.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${st.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                    <p className="shrink-0 text-sm font-extrabold text-slate-900">
                      {data.currency} {p.amount.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Info box */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <p className="font-bold text-slate-900 mb-1">Payout schedule</p>
        <p>Revenue is processed within <strong>48 hours</strong> of an event ending. A <strong>5% platform fee</strong> is deducted before transfer. To update your payout account, go to <a href="/dashboard/settings" className="font-bold text-brand-600 hover:underline">Settings</a>.</p>
      </div>
    </div>
  );
}
