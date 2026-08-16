'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, MailIcon, BellIcon, UsersGroupIcon, XIcon, CheckCircleIcon } from '@/components/icons';
import { toast } from '@/components/Toast';
import { ThinkingOrb } from 'thinking-orbs';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EventOption {
  id: string;
  title: string;
  startsAt: string;
  _count?: { tickets: number };
}

interface Announcement {
  id: string;
  eventId: string;
  eventTitle: string;
  subject: string;
  body: string;
  recipientCount: number;
  sentAt: string;
  status: 'SENT' | 'FAILED';
}

const TOKEN = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
const API   = process.env.NEXT_PUBLIC_API_URL;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Compose modal ────────────────────────────────────────────────────────────

function ComposeModal({ events, onClose, onSent }: {
  events: EventOption[];
  onClose: () => void;
  onSent: (a: Announcement) => void;
}) {
  const [eventId,  setEventId]  = useState(events[0]?.id ?? '');
  const [subject,  setSubject]  = useState('');
  const [body,     setBody]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [preview,  setPreview]  = useState(false);
  const [error,    setError]    = useState('');

  const selectedEvent = events.find(e => e.id === eventId);
  const recipientCount = selectedEvent?._count?.tickets ?? 0;

  async function send() {
    if (!subject.trim()) { setError('Subject is required'); return; }
    if (!body.trim())    { setError('Message body is required'); return; }
    if (!eventId)        { setError('Select an event'); return; }
    setError(''); setSending(true);
    try {
      const res = await fetch(`${API}/creators/me/announcements`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ eventId, subject: subject.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to send announcement'); return; }
      onSent(data);
      toast.success(`Announcement sent to ${recipientCount} attendee${recipientCount !== 1 ? 's' : ''}`);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:px-4">
      <div className="w-full max-w-2xl rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">New announcement</h2>
            <p className="mt-0.5 text-sm text-slate-400">Send an email to all ticket holders of an event.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {preview ? (
          /* Preview pane */
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">To</p>
              <p className="text-sm text-slate-700">
                {recipientCount} attendee{recipientCount !== 1 ? 's' : ''} of <strong>{selectedEvent?.title}</strong>
              </p>
              <div className="my-3 h-px bg-slate-200" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Subject</p>
              <p className="text-sm font-semibold text-slate-900">{subject}</p>
              <div className="my-3 h-px bg-slate-200" />
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2">Message</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{body}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPreview(false)} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Edit
              </button>
              <button onClick={send} disabled={sending} className="flex min-w-[140px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">
                {sending ? <><ThinkingOrb state="breathing" size={20} theme="dark" /> Sending…</> : 'Send now'}
              </button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        ) : (
          /* Compose form */
          <div className="space-y-4">
            {/* Event selector */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Event *</label>
              <div className="relative">
                <select
                  value={eventId}
                  onChange={e => setEventId(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 pr-8"
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} — {fmtDate(ev.startsAt)}
                    </option>
                  ))}
                </select>
                <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06" clipRule="evenodd" />
                </svg>
              </div>
              {selectedEvent && (
                <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <UsersGroupIcon className="h-3 w-3" />
                  {recipientCount} ticket holder{recipientCount !== 1 ? 's' : ''} will receive this
                </p>
              )}
            </div>

            {/* Subject */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Important update about your ticket"
                maxLength={150}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
              <p className="mt-1 text-right text-[11px] text-slate-400">{subject.length}/150</p>
            </div>

            {/* Body */}
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Message *</label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Hey! Just wanted to let you know..."
                rows={7}
                maxLength={2000}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[11px] text-slate-400">
                  Tip: include your event name and date for clarity.
                </p>
                <p className="text-[11px] text-slate-400">{body.length}/2000</p>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!subject.trim() || !body.trim()) { setError('Subject and message are required'); return; }
                  setError(''); setPreview(true);
                }}
                className="flex-1 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
              >
                Preview &amp; send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [events,        setEvents]        = useState<EventOption[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showCompose,   setShowCompose]   = useState(false);

  useEffect(() => {
    const token = TOKEN();
    if (!token) { setLoading(false); return; }

    Promise.all([
      fetch(`${API}/creators/me/events`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(d => setEvents(Array.isArray(d) ? d : (d.events ?? []))),
      fetch(`${API}/creators/me/announcements`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(d => setAnnouncements(Array.isArray(d) ? d : (d.announcements ?? []))),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalReach = announcements.reduce((s, a) => s + a.recipientCount, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Marketing</h1>
          <p className="mt-1 text-sm text-slate-500">
            Send announcements and updates directly to your ticket holders.
          </p>
        </div>
        {events.length > 0 && (
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
          >
            <PlusIcon className="h-4 w-4" />
            New announcement
          </button>
        )}
      </div>

      {/* Stats */}
      {announcements.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Announcements sent', value: announcements.length, Icon: MailIcon },
            { label: 'Total reach',        value: totalReach,           Icon: UsersGroupIcon },
            { label: 'Events covered',     value: new Set(announcements.map(a => a.eventId)).size, Icon: BellIcon },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-3.5 w-3.5 text-brand-400" />
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
              </div>
              <p className="text-2xl font-extrabold text-slate-900">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Announcement history */}
      {loading ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <ThinkingOrb state="breathing" size={64} theme="light" />
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <MailIcon className="h-14 w-14 text-brand-500" />
          <p className="mt-5 text-base font-extrabold text-slate-900">No events yet</p>
          <p className="mt-1 text-sm text-slate-400">Create an event first to send announcements to attendees.</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <MailIcon className="h-14 w-14 text-brand-500" />
          <p className="mt-5 text-base font-extrabold text-slate-900">No announcements yet</p>
          <p className="mt-1 text-sm text-slate-400">Send an update to all ticket holders of any of your events.</p>
          <button
            onClick={() => setShowCompose(true)}
            className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
          >
            Send first announcement
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Sent announcements</p>
          </div>
          <div className="divide-y divide-slate-100">
            {announcements.map(a => (
              <div key={a.id} className="px-5 py-4 transition hover:bg-slate-50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{a.subject}</p>
                      {a.status === 'SENT' ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircleIcon className="h-3 w-3" /> Sent
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-500">Failed</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {a.eventTitle} · {a.recipientCount} recipient{a.recipientCount !== 1 ? 's' : ''} · {fmtDateTime(a.sentAt)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{a.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCompose && (
        <ComposeModal
          events={events}
          onClose={() => setShowCompose(false)}
          onSent={a => setAnnouncements(prev => [a, ...prev])}
        />
      )}
    </div>
  );
}
