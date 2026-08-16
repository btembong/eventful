'use client';

import { useState, useEffect } from 'react';
import { ChartIcon, TicketIcon, TagPriceIcon, UsersGroupIcon, CalendarIcon, TrendUpIcon } from '@/components/icons';

interface DailyStat {
  date: string;
  revenue: number;
  tickets: number;
}

interface TopEvent {
  id: string;
  title: string;
  revenue: number;
  tickets: number;
  currency: string;
}

interface AnalyticsSummary {
  totalRevenue: number;
  totalTickets: number;
  totalEvents: number;
  totalAttendees: number;
  currency: string;
  revenueChange: number;
  ticketsChange: number;
  daily?: DailyStat[];
  topEvents?: TopEvent[];
}

function StatCard({ label, value, sub, icon: Icon, color, change }: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; change?: number;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {change !== undefined && (
          <span className={`text-xs font-bold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex justify-between">
        <div className="h-11 w-11 rounded-xl bg-slate-200" />
        <div className="h-4 w-12 rounded bg-slate-200" />
      </div>
      <div className="mt-4 h-7 w-2/3 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
    </div>
  );
}

// Simple bar chart using CSS
function RevenueChart({ daily }: { daily: DailyStat[] }) {
  if (!daily || daily.length === 0) return null;
  const max = Math.max(...daily.map((d) => d.revenue), 1);
  const last7 = daily.slice(-14);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Revenue over time</h3>
          <p className="text-xs text-slate-400">Last 14 days</p>
        </div>
        <TrendUpIcon className="h-5 w-5 text-emerald-500" />
      </div>
      <div className="flex h-32 items-end gap-1">
        {last7.map((d) => {
          const h = Math.max(4, Math.round((d.revenue / max) * 100));
          return (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center">
              <div
                className="w-full rounded-t-md bg-brand-500 transition-all group-hover:bg-brand-400"
                style={{ height: `${h}%` }}
              />
              <span className="mt-1 hidden text-[9px] text-slate-400 group-hover:block absolute -top-5 whitespace-nowrap">
                {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-slate-400">
        <span>{new Date(last7[0]?.date ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(last7[last7.length - 1]?.date ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data,    setData]    = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('Could not load analytics. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const kpis = data ? [
    { label: 'Total revenue',   value: `${data.currency} ${data.totalRevenue.toLocaleString()}`, sub: 'All-time earnings',  icon: TagPriceIcon,   color: 'bg-brand-600',   change: data.revenueChange },
    { label: 'Tickets sold',    value: data.totalTickets.toLocaleString(),                        sub: 'All-time',           icon: TicketIcon,     color: 'bg-slate-800',   change: data.ticketsChange },
    { label: 'Events created',  value: String(data.totalEvents),                                  sub: 'Published & draft',  icon: CalendarIcon,   color: 'bg-emerald-600' },
    { label: 'Total attendees', value: data.totalAttendees.toLocaleString(),                      sub: 'Unique check-ins',   icon: UsersGroupIcon, color: 'bg-amber-500' },
  ] : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Track your event revenue, ticket sales, and attendance.</p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>
      )}

      {/* KPI grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !kpis
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : kpis.map((k) => <StatCard key={k.label} {...k} />)
        }
      </div>

      {/* Charts row */}
      {!loading && data?.daily && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <RevenueChart daily={data.daily} />

          {/* Ticket sales chart */}
          {data.daily && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-900">Ticket sales</h3>
                <p className="text-xs text-slate-400">Last 14 days</p>
              </div>
              <div className="flex h-32 items-end gap-1">
                {data.daily.slice(-14).map((d) => {
                  const maxT = Math.max(...data.daily!.map((x) => x.tickets), 1);
                  const h = Math.max(4, Math.round((d.tickets / maxT) * 100));
                  return (
                    <div key={d.date} className="flex flex-1 flex-col items-center">
                      <div className="w-full rounded-t-md bg-emerald-500" style={{ height: `${h}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top events */}
      {!loading && data?.topEvents && data.topEvents.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">Top performing events</h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="divide-y divide-slate-100">
              {data.topEvents.map((ev, i) => (
                <div key={ev.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-500">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{ev.title}</p>
                    <p className="text-xs text-slate-400">{ev.tickets.toLocaleString()} tickets sold</p>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {ev.currency} {ev.revenue.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty state */}
      {!loading && !error && !data && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <ChartIcon className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No analytics data yet</p>
          <p className="mt-1 text-xs text-slate-400">Data appears once you publish events and sell tickets.</p>
        </div>
      )}
    </div>
  );
}
