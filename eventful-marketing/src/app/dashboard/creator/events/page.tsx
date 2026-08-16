'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { CalendarIcon, PlusIcon, MapPointIcon, SearchIcon } from '@/components/icons';
import { useApiFetch } from '@/contexts/auth-context';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventRow {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  category: string;
  price: string;
  currency: string;
  capacity: number;
  ticketsSold: number;
  status: string;
  shareSlug: string;
  coverImageUrl?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TABS = ['All', 'On sale', 'Draft', 'Ended', 'Cancelled'] as const;
type Tab = typeof TABS[number];

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  ON_SALE:   { label: 'On sale',   cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  DRAFT:     { label: 'Draft',     cls: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-600',         dot: 'bg-red-400' },
  ENDED:     { label: 'Ended',     cls: 'bg-slate-100 text-slate-400',    dot: 'bg-slate-300' },
};

const CAT_COLOR: Record<string, string> = {
  CONCERT:  'bg-slate-200',
  THEATER:  'bg-slate-200',
  SPORTS:   'bg-slate-200',
  CULTURAL: 'bg-slate-200',
  OTHER:    'bg-slate-200',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
function tabToStatus(tab: Tab): string | null {
  if (tab === 'On sale')   return 'ON_SALE';
  if (tab === 'Draft')     return 'DRAFT';
  if (tab === 'Ended')     return 'ENDED';
  if (tab === 'Cancelled') return 'CANCELLED';
  return null;
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ ev }: { ev: EventRow }) {
  const st       = STATUS[ev.status] ?? STATUS.DRAFT;
  const catColor = CAT_COLOR[ev.category] ?? 'bg-slate-600';
  const sold     = ev.ticketsSold ?? 0;
  const cap      = ev.capacity ?? 0;
  const pct      = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
  const barColor = pct >= 90 ? 'bg-amber-500' : pct >= 60 ? 'bg-brand-500' : 'bg-emerald-500';
  const isFree   = Number(ev.price) === 0;
  const revenue  = isFree ? 'Free' : `${ev.currency} ${(Number(ev.price) * sold).toLocaleString()}`;

  return (
    <div className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-slate-200 hover:shadow-md">
      {/* Cover image / placeholder */}
      <div className={`relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl ${ev.coverImageUrl ? 'bg-slate-100' : catColor}`}>
        {ev.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ev.coverImageUrl} alt={ev.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CalendarIcon className="h-8 w-8 text-slate-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-extrabold text-slate-900">{ev.title}</p>
              <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPointIcon className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{ev.venue}</span>
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{fmtDate(ev.startsAt)}</p>
          </div>
          <p className="shrink-0 text-sm font-extrabold text-slate-800">{revenue}</p>
        </div>

        {/* Sales progress */}
        <div className="mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1 text-[10px] text-slate-400">{sold.toLocaleString()} / {cap.toLocaleString()} sold · {pct}%</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {ev.shareSlug && (
          <Link
            href={`/e/${ev.shareSlug}`}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
          >
            Preview
          </Link>
        )}
        <Link
          href={`/dashboard/creator/events/${ev.id}`}
          className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600 transition hover:bg-brand-100"
        >
          Manage
        </Link>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorEventsPage() {
  const apiFetch     = useApiFetch();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const activeTab    = (searchParams.get('tab') as Tab) ?? 'All';
  const [search, setSearch] = useState('');

  const { data: events = [], isLoading, isError } = useQuery<EventRow[]>({
    queryKey: ['creator-events', activeTab],
    queryFn: async () => {
      const statusFilter = tabToStatus(activeTab);
      const qs = statusFilter ? `?status=${statusFilter}&limit=100` : '?limit=100';
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL!}/creators/me/events${qs}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      return Array.isArray(data) ? data : (data.events ?? data.data ?? []);
    },
  });

  function setTab(tab: Tab) {
    const path = tab === 'All' ? '/dashboard/creator/events' : `/dashboard/creator/events?tab=${tab}`;
    router.push(path);
    setSearch('');
  }

  const filtered = search.trim()
    ? events.filter((e) =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.venue.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  const onSaleCount = events.filter((e) => e.status === 'ON_SALE').length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My Events</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isLoading ? '…' : `${events.length} event${events.length !== 1 ? 's' : ''}`}
            {!isLoading && onSaleCount > 0 && ` · ${onSaleCount} on sale`}
          </p>
        </div>
        <Link
          href="/dashboard/creator/events/new"
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
        >
          <PlusIcon className="h-4 w-4" />
          New event
        </Link>
      </div>

      {isError && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-600">
          Could not load events. Please refresh.
        </div>
      )}

      {/* Tabs + search row */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                activeTab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-4 rounded-2xl border border-slate-100 bg-white p-4">
              <div className="h-[88px] w-[88px] shrink-0 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-200" />
                <div className="h-3 w-1/3 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          {/* Duotone calendar icon */}
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
            <rect x="6" y="16" width="60" height="50" rx="10" fill="#F07200" fillOpacity="0.12"/>
            <rect x="6" y="16" width="60" height="50" rx="10" stroke="#F07200" strokeWidth="3.5"/>
            <rect x="6" y="16" width="60" height="20" rx="10" fill="#333333"/>
            <rect x="6" y="26" width="60" height="10" fill="#333333"/>
            <circle cx="22" cy="12" r="5" fill="#333333"/>
            <circle cx="50" cy="12" r="5" fill="#333333"/>
            <rect x="20" y="6" width="4" height="10" rx="2" fill="#333333"/>
            <rect x="48" y="6" width="4" height="10" rx="2" fill="#333333"/>
            <rect x="18" y="44" width="11" height="11" rx="3" fill="#F07200" fillOpacity="0.7"/>
            <rect x="33" y="44" width="11" height="11" rx="3" fill="#F07200" fillOpacity="0.45"/>
            <rect x="48" y="44" width="11" height="11" rx="3" fill="#F07200" fillOpacity="0.25"/>
          </svg>
          <p className="mt-4 text-sm font-semibold text-slate-500">
            {search ? 'No events match your search' : activeTab === 'All' ? 'No events yet' : `No ${activeTab.toLowerCase()} events`}
          </p>
          {activeTab === 'All' && !search && (
            <Link
              href="/dashboard/creator/events/new"
              className="mt-4 inline-block rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
            >
              Create your first event
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((ev) => <EventCard key={ev.id} ev={ev} />)}
        </div>
      )}
    </div>
  );
}
