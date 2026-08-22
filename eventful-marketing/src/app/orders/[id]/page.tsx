'use client';

import { use, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { TicketIcon, CalendarIcon, MapPointIcon } from '@/components/icons';
import { ThinkingOrb } from 'thinking-orbs';

function GuestAccountAd({ email, name }: { email?: string; name?: string }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('guest_ad_dismissed')) {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  const params = new URLSearchParams();
  if (email) params.set('email', email);
  if (name)  params.set('name', name);

  return (
    <div className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-extrabold text-brand-900">Save your tickets — create a free account</p>
          <p className="mt-1 text-xs text-brand-700">Never lose your tickets in your inbox again.</p>
        </div>
        <button
          onClick={() => {
            localStorage.setItem('guest_ad_dismissed', '1');
            setDismissed(true);
          }}
          className="shrink-0 text-xs text-brand-400 hover:text-brand-600"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <ul className="mt-4 space-y-2">
        {[
          'View all your tickets in one place',
          'Faster checkout — details pre-filled next time',
          'Event reminders before your events',
          'Earn rewards by referring friends',
          'Self-serve refund requests',
        ].map((b) => (
          <li key={b} className="flex items-center gap-2 text-xs text-brand-800">
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[9px] font-extrabold text-white">✓</span>
            {b}
          </li>
        ))}
      </ul>
      <Link
        href={`/register?${params.toString()}`}
        className="mt-5 flex w-full items-center justify-center rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-500"
      >
        Create free account →
      </Link>
      <p className="mt-2 text-center text-[11px] text-brand-500">Already have an account? <Link href="/login" className="font-bold underline">Sign in</Link></p>
    </div>
  );
}

interface Order {
  id: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  totalAmount: string;
  currency: string;
  quantity: number;
  createdAt: string;
  buyerName?: string;
  buyerEmail?: string;
  event?: { title: string; startsAt: string; venue: string; shareSlug: string };
  tier?: { name: string; type: string };
  tickets?: { id: string; status: string }[];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder]     = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified]   = useState(false);
  const [notFound, setNotFound]   = useState(false);
  const [isGuest, setIsGuest]     = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`);
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    if (res.ok) setOrder(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setIsGuest(!localStorage.getItem('access_token'));
  }, []);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}/verify`, { method: 'POST' });
      await load();
      setVerified(true);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <ThinkingOrb state="breathing" size={64} theme="light" />
    </div>
  );

  if (notFound) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-xl font-extrabold text-slate-900">Order not found</p>
      <p className="text-sm text-slate-400">Check the link in your email.</p>
      <Link href="/events" className="mt-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-500">
        Browse events
      </Link>
    </div>
  );

  if (!order) return null;

  const isPaid      = order.status === 'PAID';
  const isPending   = order.status === 'PENDING';
  const isCancelled = order.status === 'CANCELLED';
  const price       = Number(order.totalAmount);

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-lg">

        {/* Status badge */}
        <div className={`mb-6 flex items-center gap-3 rounded-2xl px-5 py-4 ${
          isPaid      ? 'bg-brand-50 border border-brand-200' :
          isPending   ? 'bg-amber-50 border border-amber-200' :
                        'bg-red-50 border border-red-200'
        }`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isPaid ? 'bg-brand-600' : isPending ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            <TicketIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className={`text-sm font-extrabold ${
              isPaid ? 'text-brand-900' : isPending ? 'text-amber-900' : 'text-red-900'
            }`}>
              {isPaid ? 'Payment confirmed!' : isPending ? 'Payment pending' : 'Order cancelled'}
            </p>
            <p className={`text-xs ${
              isPaid ? 'text-brand-600' : isPending ? 'text-amber-600' : 'text-red-500'
            }`}>
              {isPaid
                ? 'Your tickets are confirmed. Check your email for the receipt.'
                : isPending
                  ? 'We are waiting to confirm your payment.'
                  : 'This order has been cancelled.'}
            </p>
          </div>
        </div>

        {/* Order card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">

          {/* Event info */}
          {order.event && (
            <div className="border-b border-slate-100 bg-brand-950 px-6 py-5">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-400">Event</p>
              <p className="mt-1 text-lg font-extrabold text-white">{order.event.title}</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  {fmtDate(order.event.startsAt)} · {fmtTime(order.event.startsAt)}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <MapPointIcon className="h-3.5 w-3.5 shrink-0" />
                  {order.event.venue}
                </div>
              </div>
            </div>
          )}

          {/* Order details */}
          <div className="divide-y divide-slate-100 px-6">
            {[
              { label: 'Order ID',   value: order.id.split('-')[0].toUpperCase() },
              { label: 'Tier',       value: order.tier?.name ?? '—' },
              { label: 'Quantity',   value: `${order.quantity} ticket${order.quantity !== 1 ? 's' : ''}` },
              { label: 'Amount',     value: price === 0 ? 'Free' : `${order.currency} ${price.toLocaleString()}` },
              { label: 'Status',     value: order.status },
              ...(order.buyerName  ? [{ label: 'Name',  value: order.buyerName  }] : []),
              ...(order.buyerEmail ? [{ label: 'Email', value: order.buyerEmail }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <p className="text-xs font-semibold text-slate-400">{label}</p>
                <p className="text-right text-xs font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5">
            {isPending && (
              <>
                <button
                  onClick={handleVerify}
                  disabled={verifying}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
                >
                  {verifying ? <ThinkingOrb state="breathing" size={20} theme="dark" /> : null}
                  {verifying ? 'Checking payment…' : 'Check payment status'}
                </button>
                {verified && order.status !== 'PAID' && (
                  <p className="text-center text-xs text-amber-600">
                    Payment not confirmed yet. If you completed payment, please wait a few minutes and try again.
                  </p>
                )}
              </>
            )}
            {isPaid && order.event && (
              <Link
                href={`/e/${order.event.shareSlug}`}
                className="flex w-full items-center justify-center rounded-xl border border-brand-200 py-3 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
              >
                Back to event
              </Link>
            )}
            {isCancelled && (
              <Link
                href="/events"
                className="flex w-full items-center justify-center rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-500"
              >
                Browse other events
              </Link>
            )}
          </div>
        </div>

        {isPaid && isGuest && (
          <GuestAccountAd email={order.buyerEmail} name={order.buyerName} />
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Tickets are emailed to the address provided at checkout.
          {' '}
          <Link href="/support" className="text-brand-600 hover:underline">Need help?</Link>
        </p>
      </div>
    </div>
  );
}
