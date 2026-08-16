'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL!;
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : ''; }

interface AdminEvent {
  id: string;
  title: string;
  category: string;
  venue: string;
  startsAt: string;
  price: string;
  currency: string;
  isCancelled: boolean;
  createdAt: string;
  shareSlug: string;
  creator: { id: string; fullName: string; email: string };
  _count: { tickets: number };
}

export default function AdminEventsPage() {
  const [events,    setEvents]    = useState<AdminEvent[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [q,         setQ]         = useState('');
  const [loading,   setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reasonMap, setReasonMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) params.set('q', q);
    try {
      const res = await fetch(`${API}/admin/events?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  async function cancel(eventId: string) {
    const reason = reasonMap[eventId]?.trim();
    if (!confirm(`Cancel this event?${reason ? `\nReason: ${reason}` : ''}`)) return;
    setCancelling(eventId);
    await fetch(`${API}/admin/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    await load();
    setCancelling(null);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold text-slate-900">Events <span className="ml-2 text-sm font-normal text-slate-400">({total.toLocaleString()})</span></h1>
        <input
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          placeholder="Search title or venue…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      <div className="space-y-3">
        {loading && <p className="py-8 text-center text-sm text-slate-400 animate-pulse">Loading…</p>}
        {!loading && events.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No events found.</p>}
        {events.map((ev) => (
          <div key={ev.id} className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 ${ev.isCancelled ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900">{ev.title}</p>
                  {ev.isCancelled && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Cancelled</span>}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{ev.category}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{ev.venue} · {new Date(ev.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="mt-0.5 text-xs text-slate-400">By <span className="font-semibold text-slate-600">{ev.creator.fullName}</span> ({ev.creator.email})</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{ev._count.tickets} tickets</p>
                  <p className="text-xs text-slate-400">{ev.currency} {parseFloat(ev.price).toLocaleString()}</p>
                </div>
                {!ev.isCancelled && (
                  <div className="flex items-center gap-2">
                    <input
                      className="w-36 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:border-red-300"
                      placeholder="Reason (optional)"
                      value={reasonMap[ev.id] ?? ''}
                      onChange={(e) => setReasonMap((m) => ({ ...m, [ev.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => cancel(ev.id)}
                      disabled={cancelling === ev.id}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                    >
                      {cancelling === ev.id ? '…' : 'Cancel event'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {total > 20 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-400">Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
