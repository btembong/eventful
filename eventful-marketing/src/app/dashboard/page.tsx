'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import {
  TicketIcon, CalendarIcon, MapPointIcon, QrCodeIcon, TagPriceIcon,
} from '@/components/icons';

const CAT_GRADIENT: Record<string, string> = {
  CONCERT:  'from-brand-950 via-brand-900 to-brand-600',
  THEATER:  'from-slate-900 via-slate-800 to-slate-600',
  SPORTS:   'from-slate-900 via-slate-800 to-brand-800',
  CULTURAL: 'from-brand-950 via-slate-800 to-slate-700',
  OTHER:    'from-slate-900 via-slate-800 to-slate-600',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  eventId: string;
  status: 'VALID' | 'USED' | 'CANCELLED' | 'PAID';
  event: {
    title: string;
    venue: string;
    startsAt: string;
    category: string;
    shareSlug: string;
    coverImageUrl?: string | null;
  };
  tier?: {
    name: string;
    price: string;
    currency: string;
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  VALID:     { label: 'Valid',     cls: 'bg-brand-50 text-brand-600',  dot: 'bg-brand-500' },
  PAID:      { label: 'Valid',     cls: 'bg-brand-50 text-brand-600',  dot: 'bg-brand-500' },
  USED:      { label: 'Used',      cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-600',      dot: 'bg-red-400'   },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function isPast(iso: string) { return new Date(iso) < new Date(); }
function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const d = Math.ceil(diff / 86_400_000);
  if (d <= 0) return null;
  return d === 1 ? 'Tomorrow' : `In ${d} days`;
}

// ─── Ticket stub ─────────────────────────────────────────────────────────────

function TicketStub({ ticket }: { ticket: Ticket }) {
  const st    = STATUS_MAP[ticket.status] ?? STATUS_MAP.VALID;
  const grad  = CAT_GRADIENT[ticket.event.category] ?? CAT_GRADIENT.OTHER;
  const past  = isPast(ticket.event.startsAt);
  const until = daysUntil(ticket.event.startsAt);
  const price = Number(ticket.tier?.price ?? 0);
  const isFree  = price === 0;
  const isValid = ticket.status === 'VALID' || ticket.status === 'PAID';

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100 shadow-sm transition ${past ? 'opacity-70' : 'hover:shadow-md hover:ring-brand-100'}`}>

      {/* Side watermark */}
      <div className="absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center bg-slate-50 border-l border-dashed border-slate-200 z-10">
        <span className="text-[8px] font-bold tracking-[0.2em] text-slate-300 uppercase"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Eventful
        </span>
      </div>

      {/* Cover image */}
      <div className="relative h-24 overflow-hidden mr-5">
        {ticket.event.coverImageUrl ? (
          <Image src={ticket.event.coverImageUrl} alt={ticket.event.title} fill className="object-cover" sizes="(max-width:640px) 50vw, 300px" />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${grad}`} />
        )}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold text-white shadow ${isValid ? 'bg-brand-600' : st.dot === 'bg-slate-400' ? 'bg-slate-600' : 'bg-red-500'}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            {st.label}
          </span>
        </div>
        {until && isValid && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">{until}</span>
          </div>
        )}
      </div>

      {/* Tear line */}
      <div className="relative flex items-center mr-5">
        <div className="absolute -left-2.5 h-5 w-5 rounded-full bg-slate-50 border border-slate-100" />
        <div className="flex-1 border-t border-dashed border-slate-200 mx-3" />
        <div className="absolute -right-2.5 h-5 w-5 rounded-full bg-slate-50 border border-slate-100" />
      </div>

      {/* Body */}
      <div className="flex flex-col px-3 pt-2.5 pb-3 mr-5 gap-1.5">
        <div className="flex items-start gap-1.5">
          <TicketIcon className="h-6 w-6 text-brand-500 shrink-0 mt-0.5" />
          <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-tight">{ticket.event.title}</h3>
        </div>
        {ticket.tier && <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">{ticket.tier.name}</p>}
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <CalendarIcon className="h-3 w-3 shrink-0" />
          <span>{fmtDate(ticket.event.startsAt)} · {fmtTime(ticket.event.startsAt)}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <MapPointIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">{ticket.event.venue}</span>
        </div>
        <span className="mt-0.5 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-extrabold text-brand-700 self-start">
          {isFree ? 'Free' : `${ticket.tier?.currency ?? 'XAF'} ${price.toLocaleString()}`}
        </span>

        {isValid && (
          <div className="flex justify-end border-t border-dashed border-slate-100 pt-2 mt-1">
            <Link href={`/dashboard/tickets/${ticket.id}`} className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-brand-500">
              <QrCodeIcon className="h-3 w-3" />
              View QR
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonStub() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
      <div className="h-1 w-full bg-slate-100" />
      <div className="flex gap-4 px-5 py-4">
        <div className="h-10 w-10 rounded-xl bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded-lg bg-slate-100" />
          <div className="h-2.5 w-1/2 rounded-lg bg-slate-100" />
          <div className="h-2.5 w-1/4 rounded-lg bg-slate-100" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendeeDashboard() {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => { setToken(getToken()); }, []);

  const { data: tickets = [], isLoading, isError } = useQuery<Ticket[]>({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/eventees/me/tickets`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.tickets ?? []);
    },
    enabled: !!token,
  });

  const upcoming   = tickets.filter((t) => (t.status === 'VALID' || t.status === 'PAID') && !isPast(t.event.startsAt));
  const past       = tickets.filter((t) => t.status === 'USED' || isPast(t.event.startsAt));
  const totalSpent = tickets.reduce((sum, t) => sum + Number(t.tier?.price ?? 0), 0);

  const stats = [
    { label: 'Upcoming',      value: upcoming.length,                            Icon: CalendarIcon  },
    { label: 'Total tickets', value: tickets.length,                             Icon: TicketIcon    },
    { label: 'Total spent',   value: `XAF ${totalSpent.toLocaleString()}`,       Icon: TagPriceIcon  },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">My Tickets</h1>
        <p className="mt-1 text-sm text-slate-400">All your event tickets in one place.</p>
      </div>

      {/* KPI strip */}
      {!isLoading && !isError && (
        <div className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-slate-100">
          {stats.map(({ label, value, Icon }) => (
            <div key={label} className="flex flex-col gap-2 bg-white px-5 py-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-400">{label}</p>
                <Icon className="h-3.5 w-3.5 text-slate-300" />
              </div>
              <p className="text-xl font-extrabold tracking-tight text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">
          Could not load your tickets. Please refresh.
        </div>
      )}

      {/* Upcoming */}
      <section className="mb-8">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Upcoming</h2>
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonStub />
            <SkeletonStub />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-white py-12 text-center">
            {/* Illustration accent */}
            <div className="pointer-events-none absolute right-0 top-0 h-full w-40 select-none opacity-30">
              <Image src="/illustrations/signup.png" alt="" fill className="object-cover object-left" />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                <TicketIcon className="h-6 w-6 text-slate-300" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">No upcoming events</p>
              <p className="mt-1 text-xs text-slate-400">Browse events and grab your first ticket.</p>
              <Link
                href="/events"
                className="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
              >
                Browse events
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {upcoming.map((t) => <TicketStub key={t.id} ticket={t} />)}
          </div>
        )}
      </section>

      {/* Past */}
      {!isLoading && past.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Past events</h2>
          <div className="grid grid-cols-2 gap-3">
            {past.map((t) => <TicketStub key={t.id} ticket={t} />)}
          </div>
        </section>
      )}
    </div>
  );
}
