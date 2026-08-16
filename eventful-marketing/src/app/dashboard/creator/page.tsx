'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useAuth, useApiFetch } from '@/contexts/auth-context';
import {
  CalendarIcon, TicketIcon, TagPriceIcon,
  UsersGroupIcon, PlusIcon, ArrowRightIcon,
} from '@/components/icons';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventRow {
  id: string;
  title: string;
  startsAt: string;
  capacity: number;
  ticketsSold: number;
  revenue: number;
  currency: string;
  status: string;
  isCancelled?: boolean;
}

interface Analytics {
  totalRevenue: number;
  totalTicketsSold: number;
  activeEvents: number;
  checkedIn: number;
  currency?: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}


function fmtMoney(n: number, currency = 'XAF') {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${currency} ${(n / 1_000).toFixed(0)}K`;
  return `${currency} ${n.toLocaleString()}`;
}

function deriveStatus(ev: EventRow) {
  if (ev.isCancelled || ev.status === 'CANCELLED') return { label: 'Cancelled', dot: 'bg-red-400' };
  if (new Date(ev.startsAt) < new Date())          return { label: 'Ended',     dot: 'bg-slate-300' };
  if (ev.status === 'DRAFT')                       return { label: 'Draft',     dot: 'bg-slate-400' };
  return { label: 'On sale', dot: 'bg-emerald-500' };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorOverview() {
  const { user } = useAuth();
  const apiFetch = useApiFetch();

  const firstName = (() => {
    const name = user?.fullName ?? (
      typeof window !== 'undefined'
        ? (() => { try { return JSON.parse(localStorage.getItem('user') || '{}').fullName; } catch { return ''; } })()
        : ''
    );
    return name?.split(' ')[0] || '';
  })();

  const { data: analytics, isLoading: loadingKpi } = useQuery<Analytics>({
    queryKey: ['creator-analytics'],
    queryFn: () => apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/analytics`).then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); }),
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery<EventRow[]>({
    queryKey: ['creator-events-recent'],
    queryFn: () => apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/events?limit=5`).then(async r => {
      if (!r.ok) throw new Error('Failed');
      const d = await r.json();
      return Array.isArray(d) ? d : (d.events ?? d.data ?? []);
    }),
  });

  const kpis = [
    {
      label: 'Revenue',
      value: analytics ? fmtMoney(analytics.totalRevenue, analytics.currency ?? 'XAF') : null,
      sub: 'lifetime earnings',
      Icon: TagPriceIcon,
    },
    {
      label: 'Tickets sold',
      value: analytics ? analytics.totalTicketsSold.toLocaleString() : null,
      sub: 'all time',
      Icon: TicketIcon,
    },
    {
      label: 'Active events',
      value: analytics ? String(analytics.activeEvents) : null,
      sub: 'on sale now',
      Icon: CalendarIcon,
    },
    {
      label: 'Checked in',
      value: analytics ? analytics.checkedIn.toLocaleString() : null,
      sub: 'total attendees',
      Icon: UsersGroupIcon,
    },
  ];

  const TABS = ['All', 'On sale', 'Draft', 'Ended', 'Cancelled'] as const;
  type Tab = typeof TABS[number];
  const [activeTab, setActiveTab] = useState<Tab>('All');

  function filterEvents(evs: EventRow[]): EventRow[] {
    if (activeTab === 'All')       return evs;
    if (activeTab === 'On sale')   return evs.filter((e) => !e.isCancelled && e.status !== 'CANCELLED' && e.status !== 'DRAFT' && new Date(e.startsAt) >= new Date());
    if (activeTab === 'Draft')     return evs.filter((e) => e.status === 'DRAFT');
    if (activeTab === 'Ended')     return evs.filter((e) => !e.isCancelled && e.status !== 'CANCELLED' && new Date(e.startsAt) < new Date());
    if (activeTab === 'Cancelled') return evs.filter((e) => e.isCancelled || e.status === 'CANCELLED');
    return evs;
  }

  const visibleEvents = filterEvents(events);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">

      {/* ── Hero banner ───────────────────────────────────────────────────── */}
      <div className="mb-10 relative overflow-hidden rounded-2xl bg-brand-950 px-8 py-9 min-h-[148px]">
        {/* Text */}
        <div className="relative z-10 max-w-sm">
          <p className="text-sm font-medium text-brand-300">{greeting()}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-white">
            {firstName}
          </h1>
          <p className="mt-2 text-sm text-brand-200/60">Here&apos;s how your events are doing today.</p>
          <Link
            href="/dashboard/creator/events/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-950 transition hover:bg-brand-100"
          >
            <PlusIcon className="h-4 w-4" />
            New event
          </Link>
        </div>

        {/* Illustration — fades in from right */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-56 select-none">
          <Image
            src="/illustrations/signup.png"
            alt=""
            fill
            sizes="224px"
            className="object-cover object-left opacity-90"
            priority
          />
        </div>
        {/* Gradient fade overlay so illustration blends with the dark bg */}
        <div className="pointer-events-none absolute right-44 top-0 h-full w-28 bg-gradient-to-r from-brand-950 to-transparent" />
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────────── */}
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, sub, Icon }) => (
          <div key={label} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50">
                <Icon className="h-5 w-5 text-brand-500" />
              </div>
            </div>
            {loadingKpi || value === null ? (
              <>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </>
            ) : (
              <>
                <p className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
                <p className="text-[11px] font-medium text-slate-400">{sub}</p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Recent events ────────────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recent events</h2>
          <Link
            href="/dashboard/creator/events"
            className="flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-500"
          >
            View all <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 rounded-lg px-4 py-1.5 text-xs font-bold transition ${
                activeTab === tab
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab}
              {tab !== 'All' && !loadingEvents && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activeTab === tab ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-500'
                }`}>
                  {filterEvents(events).length === visibleEvents.length && tab === activeTab
                    ? visibleEvents.length
                    : filterEvents(events.filter((e) => {
                        if (tab === 'On sale')   return !e.isCancelled && e.status !== 'CANCELLED' && e.status !== 'DRAFT' && new Date(e.startsAt) >= new Date();
                        if (tab === 'Draft')     return e.status === 'DRAFT';
                        if (tab === 'Ended')     return !e.isCancelled && e.status !== 'CANCELLED' && new Date(e.startsAt) < new Date();
                        if (tab === 'Cancelled') return e.isCancelled || e.status === 'CANCELLED';
                        return true;
                      })).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
          {loadingEvents ? (
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : visibleEvents.length === 0 ? (
            <div className="flex flex-col items-center py-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-950">
                <CalendarIcon className="h-7 w-7 text-brand-500" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">
                {events.length === 0 ? 'No events yet' : `No ${activeTab.toLowerCase()} events`}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {events.length === 0 ? 'Create your first event to start selling tickets.' : 'Try a different tab.'}
              </p>
              {events.length === 0 && (
                <Link
                  href="/dashboard/creator/events/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
                >
                  <PlusIcon className="h-4 w-4" />
                  Create event
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {visibleEvents.map((ev) => {
                const st   = deriveStatus(ev);
                const sold = ev.ticketsSold ?? 0;
                const pct  = ev.capacity > 0 ? Math.min(100, Math.round((sold / ev.capacity) * 100)) : 0;
                return (
                  <div key={ev.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">

                    {/* Calendar icon block */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-950">
                      <CalendarIcon className="h-6 w-6 text-brand-500" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{ev.title}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          st.label === 'On sale'   ? 'bg-brand-50 text-brand-600' :
                          st.label === 'Draft'     ? 'bg-slate-100 text-slate-500' :
                          st.label === 'Ended'     ? 'bg-slate-100 text-slate-400' :
                          'bg-red-50 text-red-500'
                        }`}>{st.label}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">{sold} / {ev.capacity}</span>
                        </div>
                      </div>
                    </div>

                    {/* Manage */}
                    <Link
                      href={`/dashboard/creator/events/${ev.id}`}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                    >
                      Manage →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
