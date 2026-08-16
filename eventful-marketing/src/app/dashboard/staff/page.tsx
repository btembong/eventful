'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCodeIcon, CalendarIcon, MapPointIcon, UsersGroupIcon } from '@/components/icons';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface ApiEvent {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  capacity: number;
}

interface FeedEntry {
  id: string;
  ticketId: string;
  checkedInAt: string;
  status: 'success' | 'already_used' | 'invalid';
}

// ─── Config ─────────────────────────────────────────────────────────────────

const FEED_CONFIG = {
  success:      { label: 'Checked in',   cls: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  already_used: { label: 'Already used', cls: 'bg-amber-50 text-amber-700',     bar: 'bg-amber-400' },
  invalid:      { label: 'Invalid',      cls: 'bg-red-50 text-red-600',         bar: 'bg-red-400' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ─── SSE hook ──────────────────────────────────────────────────────────────

/**
 * Connects to the SSE endpoint using fetch (not EventSource) so we can
 * send the Authorization header. Calls onCheckin for each check-in event.
 */
function useLiveFeed(
  eventId: string | null,
  onCheckin: (data: { ticketId: string; checkedInAt: string }) => void,
) {
  const [connected, setConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const token = getToken();
    if (!token) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setConnected(false);

    async function stream() {
      try {
        const res = await fetch(`${API}/creators/me/events/${eventId}/live`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) return;

        setConnected(true);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          // Parse complete SSE messages (delimited by \n\n)
          const parts = buf.split('\n\n');
          buf = parts.pop() ?? '';

          for (const part of parts) {
            const lines = part.split('\n');
            let eventType = 'message';
            let data = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) eventType = line.slice(7).trim();
              if (line.startsWith('data: ')) data = line.slice(6).trim();
            }
            if (eventType === 'checkin' && data) {
              try {
                onCheckin(JSON.parse(data));
              } catch { /* ignore malformed */ }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        // Connection dropped — retry after 3s
        await new Promise((r) => setTimeout(r, 3000));
        if (!ctrl.signal.aborted) stream();
      } finally {
        setConnected(false);
      }
    }

    stream();

    return () => {
      ctrl.abort();
      abortRef.current = null;
    };
  }, [eventId, onCheckin]);

  return connected;
}

// ─── Scan result overlay ───────────────────────────────────────────────────

function ScanResult({
  status, ticketId, onDismiss,
}: {
  status: FeedEntry['status'] | null;
  ticketId: string;
  onDismiss: () => void;
}) {
  if (!status) return null;

  const config = {
    success:      { emoji: '✅', title: 'Welcome in!',        sub: ticketId, bg: 'bg-emerald-500' },
    already_used: { emoji: '⚠️', title: 'Already checked in', sub: ticketId, bg: 'bg-amber-500' },
    invalid:      { emoji: '❌', title: 'Invalid ticket',     sub: ticketId, bg: 'bg-red-500' },
  }[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onDismiss}>
      <div className={`${config.bg} flex w-72 flex-col items-center rounded-3xl p-8 text-white shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <span className="text-6xl">{config.emoji}</span>
        <p className="mt-4 text-xl font-extrabold">{config.title}</p>
        <p className="mt-1 break-all text-center text-xs opacity-80">{config.sub}</p>
        <button onClick={onDismiss} className="mt-6 rounded-xl bg-white/20 px-6 py-2.5 text-sm font-bold transition hover:bg-white/30">
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ─── Event selector ────────────────────────────────────────────────────────

function EventSelector({ onSelect }: { onSelect: (ev: ApiEvent) => void }) {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    const token = getToken();
    fetch(`${API}/creators/me/events`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        // API returns array of events (or { data: [] })
        const list: ApiEvent[] = Array.isArray(data) ? data : (data.data ?? []);
        setEvents(list);
      })
      .catch(() => setError('Failed to load events. Make sure you are logged in.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Check-in</h1>
        <p className="mt-1 text-sm text-slate-500">Select an event to start scanning tickets.</p>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          No events found. Create an event first.
        </div>
      )}

      <div className="space-y-3">
        {events.map((ev) => (
          <button
            key={ev.id}
            onClick={() => onSelect(ev)}
            className="group w-full overflow-hidden rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-brand-200"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600">
                <QrCodeIcon className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900 group-hover:text-brand-600">{ev.title}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPointIcon className="h-3 w-3 text-slate-400" />
                    {ev.venue}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <CalendarIcon className="h-3 w-3 text-slate-400" />
                    {fmtDate(ev.startsAt)}
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-brand-500 transition group-hover:translate-x-0.5">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function StaffCheckIn() {
  const [selectedEvent, setSelectedEvent] = useState<ApiEvent | null>(null);
  const [manualRef, setManualRef]         = useState('');
  const [feed, setFeed]                   = useState<FeedEntry[]>([]);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [scanResult, setScanResult]       = useState<{ status: FeedEntry['status']; ticketId: string } | null>(null);

  // Stable callback ref so useLiveFeed's useEffect doesn't re-run on every render
  const onCheckin = useCallback((data: { ticketId: string; checkedInAt: string }) => {
    const entry: FeedEntry = {
      id: `sse-${Date.now()}`,
      ticketId: data.ticketId,
      checkedInAt: data.checkedInAt,
      status: 'success',
    };
    setFeed((prev) => [entry, ...prev.slice(0, 49)]);
    setCheckedInCount((n) => n + 1);
  }, []);

  const connected = useLiveFeed(selectedEvent?.id ?? null, onCheckin);

  // Reset state when switching events
  function selectEvent(ev: ApiEvent) {
    setFeed([]);
    setCheckedInCount(0);
    setScanResult(null);
    setSelectedEvent(ev);
  }

  async function handleCheckin(qrPayload: string) {
    if (!selectedEvent) return;
    const token = getToken();
    try {
      const res = await fetch(`${API}/events/${selectedEvent.id}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ qrPayload }),
      });
      const body = await res.json();
      if (res.ok) {
        const status: FeedEntry['status'] = body.alreadyCheckedIn ? 'already_used' : 'success';
        setScanResult({ status, ticketId: body.ticket?.id ?? qrPayload });
        // SSE will add the entry for successful new check-ins; add manually for already_used
        if (body.alreadyCheckedIn) {
          setFeed((prev) => [{
            id: `manual-${Date.now()}`,
            ticketId: body.ticket?.id ?? qrPayload,
            checkedInAt: new Date().toISOString(),
            status: 'already_used',
          }, ...prev.slice(0, 49)]);
        }
      } else {
        setScanResult({ status: 'invalid', ticketId: qrPayload });
        setFeed((prev) => [{
          id: `err-${Date.now()}`,
          ticketId: qrPayload,
          checkedInAt: new Date().toISOString(),
          status: 'invalid',
        }, ...prev.slice(0, 49)]);
      }
    } catch {
      setScanResult({ status: 'invalid', ticketId: qrPayload });
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualRef.trim()) return;
    handleCheckin(manualRef.trim());
    setManualRef('');
  }

  if (!selectedEvent) {
    return <EventSelector onSelect={selectEvent} />;
  }

  const pct = selectedEvent.capacity > 0
    ? Math.min(100, Math.round((checkedInCount / selectedEvent.capacity) * 100))
    : 0;

  return (
    <>
      {scanResult && (
        <ScanResult
          status={scanResult.status}
          ticketId={scanResult.ticketId}
          onDismiss={() => setScanResult(null)}
        />
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Now checking in</p>
            <h1 className="mt-1 truncate text-xl font-extrabold text-slate-900">{selectedEvent.title}</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
              <MapPointIcon className="h-3.5 w-3.5 text-slate-400" />
              {selectedEvent.venue}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* Live indicator */}
            <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
              {connected ? 'Live' : 'Connecting…'}
            </span>
            <button
              onClick={() => setSelectedEvent(null)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 transition hover:border-brand-300 hover:text-brand-600"
            >
              Change event
            </button>
          </div>
        </div>

        {/* Capacity progress */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
                <UsersGroupIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-slate-900">{checkedInCount.toLocaleString()}</p>
                <p className="text-xs text-slate-500">of {selectedEvent.capacity.toLocaleString()} checked in</p>
              </div>
            </div>
            <p className="text-3xl font-extrabold text-brand-600">{pct}%</p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* QR scan area */}
        <div className="mb-6 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-100">
            <QrCodeIcon className="h-10 w-10 text-brand-600" />
          </div>
          <p className="mt-4 text-sm font-extrabold text-brand-900">Point camera at ticket QR code</p>
          <p className="mt-1 text-xs text-brand-500">QR scanning requires device camera access</p>
        </div>

        {/* Manual entry */}
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Manual QR payload / ticket ID</p>
          <form onSubmit={handleManualSubmit} className="flex gap-3">
            <input
              value={manualRef}
              onChange={(e) => setManualRef(e.target.value)}
              placeholder="Paste QR payload or ticket ID"
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
            <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
              Check in
            </button>
          </form>
        </div>

        {/* Live feed */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Live check-in feed</p>
            {feed.length > 0 && (
              <span className="text-xs text-slate-400">{feed.length} scan{feed.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {feed.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-100">
              <p className="text-sm text-slate-400">
                {connected ? 'Waiting for first scan…' : 'Connecting to live stream…'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="divide-y divide-slate-100">
                {feed.map((entry) => {
                  const cfg = FEED_CONFIG[entry.status];
                  return (
                    <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={`h-8 w-1 shrink-0 rounded-full ${cfg.bar}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-bold text-slate-700">{entry.ticketId}</p>
                        <p className="text-[10px] text-slate-400">{fmtTime(entry.checkedInAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
