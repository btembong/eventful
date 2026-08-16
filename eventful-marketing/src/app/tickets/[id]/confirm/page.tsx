'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { TicketIcon, CheckCircleIcon, ClockIcon, CalendarIcon, MapPointIcon } from '@/components/icons';

interface PaymentStatus {
  status: 'success' | 'pending' | 'failed';
  ticket?: {
    id: string;
    event: {
      title: string;
      venue: string;
      startsAt: string;
      shareSlug: string;
    };
    tier?: {
      name: string;
      price: string;
      currency: string;
    };
  };
  payment?: {
    id: string;
    amount: string;
    currency: string;
    paidAt?: string;
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function SuccessState({ data }: { data: PaymentStatus }) {
  const ticket = data.ticket;
  return (
    <div className="mx-auto max-w-md text-center">
      {/* Success animation */}
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircleIcon className="h-10 w-10 text-emerald-600" />
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900">Payment confirmed!</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your ticket has been issued and is ready to use.
        A receipt has been sent to your email.
      </p>

      {ticket && (
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 text-left">
          {/* Header */}
          <div className="bg-brand-950 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600">
                <TicketIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-white">{ticket.event.title}</p>
                {ticket.tier && <p className="text-xs text-white/50">{ticket.tier.name}</p>}
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex items-start gap-3 px-5 py-4">
              <CalendarIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-sm font-bold text-slate-900">{fmtDate(ticket.event.startsAt)}</p>
                <p className="text-xs text-slate-400">{fmtTime(ticket.event.startsAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4">
              <MapPointIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-sm font-bold text-slate-900">{ticket.event.venue}</p>
            </div>
            {data.payment && (
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm text-slate-500">Amount paid</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {data.payment.currency} {Number(data.payment.amount).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        <Link
          href={ticket ? `/dashboard/tickets/${ticket.id}` : '/dashboard'}
          className="w-full rounded-xl bg-brand-600 py-3 text-sm font-extrabold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
        >
          View QR ticket →
        </Link>
        <Link href="/dashboard" className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300">
          Go to My Tickets
        </Link>
      </div>
    </div>
  );
}

function PendingState() {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
        <ClockIcon className="h-10 w-10 text-amber-600" />
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900">Payment processing…</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your payment is being verified. This usually takes a few seconds.
        Please don&apos;t close this page.
      </p>
      <div className="mt-8 flex justify-center">
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-6 py-4 text-sm text-amber-700">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Checking payment status…
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-400">
        If the page doesn&apos;t update in 30 seconds, check your{' '}
        <Link href="/dashboard" className="font-bold text-brand-600 hover:underline">My Tickets</Link> page.
      </p>
    </div>
  );
}

function FailedState() {
  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <TicketIcon className="h-10 w-10 text-red-400" />
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900">Payment failed</h1>
      <p className="mt-2 text-sm text-slate-500">
        Your payment could not be processed. No charge was made.
        Please try again or use a different payment method.
      </p>
      <div className="mt-6 flex flex-col gap-3">
        <Link href="/events" className="w-full rounded-xl bg-brand-600 py-3 text-sm font-extrabold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500">
          Browse events
        </Link>
        <Link href="/dashboard" className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300">
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export default function PaymentConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data,    setData]    = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [polls,   setPolls]   = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }

    function poll() {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${id}/payment-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.ok ? r.json() : { status: 'failed' })
        .then((d: PaymentStatus) => {
          setData(d);
          setLoading(false);
          // Keep polling if pending (max 20 attempts = ~40s)
          if (d.status === 'pending') {
            setPolls((p) => p + 1);
          }
        })
        .catch(() => { setData({ status: 'failed' }); setLoading(false); });
    }

    poll();
  }, [id, polls]);

  // Auto-retry polling for pending status
  useEffect(() => {
    if (data?.status === 'pending' && polls < 20) {
      const t = setTimeout(() => setPolls((p) => p + 1), 2000);
      return () => clearTimeout(t);
    }
  }, [data, polls]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="flex h-16 items-center border-b border-slate-100 bg-white px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600">
            <TicketIcon className="h-4 w-4 text-white" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-900">eventful</span>
        </Link>
      </div>

      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        {loading ? (
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-100">
              <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-500">Verifying payment…</p>
          </div>
        ) : data?.status === 'success' ? (
          <SuccessState data={data} />
        ) : data?.status === 'pending' ? (
          <PendingState />
        ) : (
          <FailedState />
        )}
      </div>
    </div>
  );
}
