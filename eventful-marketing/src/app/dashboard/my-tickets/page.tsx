'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { TicketIcon, CalendarIcon, MapPointIcon, QrCodeIcon, TagPriceIcon, ShareIcon } from '@/components/icons';
import { toast } from '@/components/Toast';
import { useApiFetch } from '@/contexts/auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ticket {
  id: string;
  status: 'VALID' | 'USED' | 'CANCELLED' | 'PAID';
  event: {
    title: string;
    venue: string;
    startsAt: string;
    category: string;
    shareSlug: string;
    coverImageUrl?: string | null;
  };
  tier?: { name: string; price: string; currency: string };
  order?: { totalAmount: string; currency: string; quantity: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
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

// ─── Category gradient fallbacks ─────────────────────────────────────────────

const CAT_GRADIENT: Record<string, string> = {
  CONCERT:  'from-brand-950 via-brand-900 to-brand-600',
  THEATER:  'from-slate-900 via-slate-800 to-slate-600',
  SPORTS:   'from-slate-900 via-slate-800 to-brand-800',
  CULTURAL: 'from-brand-950 via-slate-800 to-slate-700',
  OTHER:    'from-slate-900 via-slate-800 to-slate-600',
};

// ─── Share panel ──────────────────────────────────────────────────────────────

function SharePanel({ ticketId }: { ticketId: string }) {
  const apiFetch = useApiFetch();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['referral', ticketId],
    queryFn: async () => {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/tickets/${ticketId}/referral`);
      if (!res.ok) throw new Error('Failed');
      return res.json() as Promise<{ referralLink: string; referredCount: number }>;
    },
    enabled: open,
  });

  return (
    <>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-brand-600 transition"
      >
        <ShareIcon className="h-3 w-3" />
        Share
      </button>
      {open && (
        <div className="absolute inset-x-0 bottom-full mb-2 z-10 mx-3 rounded-xl border border-slate-100 bg-white p-3 shadow-lg">
          {isLoading ? (
            <div className="h-6 animate-pulse rounded bg-slate-100" />
          ) : data ? (
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate font-mono text-[10px] text-slate-500">{data.referralLink}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(data.referralLink); toast.success('Copied!'); }}
                className="shrink-0 rounded-lg bg-brand-600 px-2.5 py-1 text-[10px] font-bold text-white"
              >
                Copy
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400">Could not load link.</p>
          )}
        </div>
      )}
    </>
  );
}

// ─── Ticket card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket }: { ticket: Ticket }) {
  const past    = isPast(ticket.event.startsAt);
  const until   = daysUntil(ticket.event.startsAt);
  const isValid = ticket.status === 'VALID' || ticket.status === 'PAID';
  const isUsed  = ticket.status === 'USED';
  const isCancelled = ticket.status === 'CANCELLED';
  const grad    = CAT_GRADIENT[ticket.event.category] ?? CAT_GRADIENT.OTHER;
  const price   = Number(ticket.tier?.price ?? ticket.order?.totalAmount ?? 0);
  const currency = ticket.tier?.currency ?? ticket.order?.currency ?? 'XAF';
  const shortId = ticket.id.split('-')[0].toUpperCase();

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100 shadow-sm transition ${past ? 'opacity-70' : 'hover:shadow-md hover:ring-brand-100'}`}>

      {/* Side edge label */}
      <div className="absolute right-0 top-0 bottom-0 w-5 flex items-center justify-center bg-slate-50 border-l border-dashed border-slate-200 z-10">
        <span className="text-[8px] font-bold tracking-[0.2em] text-slate-300 uppercase"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          Eventful
        </span>
      </div>

      {/* Cover image / gradient banner */}
      <div className="relative h-28 overflow-hidden mr-5">
        {ticket.event.coverImageUrl ? (
          <Image
            src={ticket.event.coverImageUrl}
            alt={ticket.event.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 300px"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${grad}`} />
        )}
        {/* Status badge over image */}
        <div className="absolute top-2 left-2">
          {isValid && !past && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[9px] font-bold text-white shadow">
              <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
              Valid
            </span>
          )}
          {isUsed && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-600 px-2 py-0.5 text-[9px] font-bold text-white shadow">
              Used
            </span>
          )}
          {isCancelled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white shadow">
              Cancelled
            </span>
          )}
        </div>
        {/* Countdown */}
        {until && isValid && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-bold text-white backdrop-blur-sm">
              {until}
            </span>
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
      <div className="flex flex-col flex-1 px-3 pt-3 pb-3 mr-5 gap-2">

        {/* Icon + title */}
        <div className="flex items-start gap-2">
          <TicketIcon className="h-7 w-7 text-brand-500 shrink-0 mt-0.5" />
          <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-tight">{ticket.event.title}</h3>
        </div>

        {/* Tier */}
        {ticket.tier && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">{ticket.tier.name}</p>
        )}

        {/* Date + venue */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <CalendarIcon className="h-3 w-3 shrink-0" />
            <span>{fmtDate(ticket.event.startsAt)} · {fmtTime(ticket.event.startsAt)}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <MapPointIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{ticket.event.venue}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-extrabold text-brand-700">
            {price === 0 ? 'Free' : `${currency} ${price.toLocaleString()}`}
          </span>
          <span className="font-mono text-[9px] text-slate-300">{shortId}</span>
        </div>

        {/* Action row */}
        <div className="relative flex items-center justify-between border-t border-dashed border-slate-100 pt-2 mt-auto">
          <SharePanel ticketId={ticket.id} />
          {isValid && (
            <Link
              href={`/dashboard/tickets/${ticket.id}`}
              className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-brand-500"
            >
              <QrCodeIcon className="h-3 w-3" />
              View QR
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-slate-100">
      <div className="h-28 w-full bg-slate-100" />
      <div className="border-t border-dashed border-slate-100" />
      <div className="space-y-3 px-3 py-3">
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded bg-slate-100" />
          <div className="h-4 flex-1 rounded bg-slate-100" />
        </div>
        <div className="h-3 w-1/2 rounded bg-slate-100" />
        <div className="h-3 w-2/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyTicketsPage() {
  const apiFetch = useApiFetch();

  const { data: tickets = [], isLoading, isError } = useQuery<Ticket[]>({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/eventees/me/tickets`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.tickets ?? []);
    },
  });

  const upcoming   = tickets.filter(t => (t.status === 'VALID' || t.status === 'PAID') && !isPast(t.event.startsAt));
  const past       = tickets.filter(t => t.status === 'USED' || isPast(t.event.startsAt));
  const totalSpent = tickets.reduce((sum, t) => sum + Number(t.order?.totalAmount ?? t.tier?.price ?? 0), 0);
  const currency   = tickets.find(t => t.order?.currency ?? t.tier?.currency)?.order?.currency ?? 'XAF';

  const stats = [
    { label: 'Upcoming',      value: upcoming.length,                        Icon: CalendarIcon },
    { label: 'Total tickets', value: tickets.length,                         Icon: TicketIcon   },
    { label: 'Total spent',   value: `${currency} ${totalSpent.toLocaleString()}`, Icon: TagPriceIcon },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">

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
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Upcoming</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard /><SkeletonCard />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
            <TicketIcon className="h-12 w-12 text-brand-400" />
            <p className="mt-4 text-sm font-extrabold text-slate-900">No upcoming tickets</p>
            <p className="mt-1 text-xs text-slate-400">Browse events to find something to attend.</p>
            <Link href="/events" className="mt-5 inline-block rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500">
              Browse events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {upcoming.map(t => <TicketCard key={t.id} ticket={t} />)}
          </div>
        )}
      </section>

      {/* Past */}
      {!isLoading && past.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Past events</h2>
          <div className="grid grid-cols-2 gap-3">
            {past.map(t => <TicketCard key={t.id} ticket={t} />)}
          </div>
        </section>
      )}
    </div>
  );
}
