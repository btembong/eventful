'use client';

import { useState, useEffect } from 'react';
import { useApiFetch } from '@/contexts/auth-context';
import { toast } from '@/components/Toast';
import { ThinkingOrb } from 'thinking-orbs';
import { MailIcon, CheckCircleIcon, TicketIcon } from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface SupportMessage {
  id: string;
  body: string;
  fromCreator: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: TicketStatus;
  eventTitle: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
}

interface OrderOption {
  id: string;
  eventTitle: string;
  tierId: string;
  tierName: string;
}

const STATUS_STYLES: Record<TicketStatus, { label: string; bg: string; text: string }> = {
  OPEN:        { label: 'Open',        bg: 'bg-amber-50',   text: 'text-amber-700' },
  IN_PROGRESS: { label: 'In progress', bg: 'bg-brand-50',   text: 'text-brand-700' },
  RESOLVED:    { label: 'Resolved',    bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CLOSED:      { label: 'Closed',      bg: 'bg-slate-100',  text: 'text-slate-500' },
};

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── New ticket form ──────────────────────────────────────────────────────────

function NewTicketForm({ orders, onCreated }: {
  orders: OrderOption[];
  onCreated: (t: SupportTicket) => void;
}) {
  const apiFetch = useApiFetch();
  const [orderId,  setOrderId]  = useState(orders[0]?.id ?? '');
  const [subject,  setSubject]  = useState('');
  const [body,     setBody]     = useState('');
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState('');

  async function submit() {
    if (!subject.trim()) { setError('Subject is required'); return; }
    if (!body.trim())    { setError('Please describe your issue'); return; }
    if (!orderId)        { setError('Select your ticket/order'); return; }
    setError(''); setSending(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ orderId, subject: subject.trim(), body: body.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to submit'); return; }
      onCreated(data);
      toast.success('Support request submitted. The event organiser will reply soon.');
      setSubject(''); setBody(''); setOrderId(orders[0]?.id ?? '');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-extrabold text-slate-900">New support request</h2>
      <p className="mb-5 text-sm text-slate-400">The event organiser will receive your message and reply here.</p>

      <div className="space-y-4">
        {orders.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Event / ticket *</label>
            <div className="relative">
              <select
                value={orderId}
                onChange={e => setOrderId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-8 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              >
                {orders.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.eventTitle} — {o.tierName}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Subject *</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Can't find my ticket, Need to change name"
            maxLength={150}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">Message *</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Describe your issue…"
            rows={5}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={sending}
            className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {sending ? <><ThinkingOrb state="breathing" size={20} theme="dark" /> Sending…</> : 'Submit request'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({ ticket }: { ticket: SupportTicket }) {
  const [open, setOpen] = useState(false);
  const apiFetch = useApiFetch();
  const [reply,   setReply]   = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>(ticket.messages ?? []);
  const st = STATUS_STYLES[ticket.status];

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support/${ticket.id}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Failed to send'); return; }
      setMessages(prev => [...prev, data]);
      setReply('');
    } catch {
      toast.error('Network error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{ticket.subject}</p>
          <p className="mt-1 text-xs text-slate-400">{ticket.eventTitle} · {fmtRelative(ticket.updatedAt)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${st.bg} ${st.text}`}>{st.label}</span>
          <svg viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Messages */}
          <div className="space-y-3 px-5 py-4 max-h-80 overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.fromCreator ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.fromCreator
                    ? 'rounded-tl-sm bg-slate-100 text-slate-800'
                    : 'rounded-tr-sm bg-brand-600 text-white'
                }`}>
                  {msg.fromCreator && (
                    <p className="mb-1 text-[10px] font-bold text-slate-500">Organiser</p>
                  )}
                  <p>{msg.body}</p>
                  <p className={`mt-1.5 text-[10px] ${msg.fromCreator ? 'text-slate-400' : 'text-white/60'}`}>
                    {fmtRelative(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Reply */}
          {(ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS') && (
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendReply()}
                  placeholder="Add a message…"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !reply.trim()}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-40"
                >
                  {sending ? <ThinkingOrb state="breathing" size={20} theme="dark" /> : 'Send'}
                </button>
              </div>
            </div>
          )}
          {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="text-center text-xs text-slate-400">This ticket is {ticket.status.toLowerCase()}.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendeeSupportPage() {
  const apiFetch = useApiFetch();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [orders,  setOrders]  = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState<'new' | 'history'>('new');

  useEffect(() => {
    Promise.all([
      apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/support`).then(r => r.ok ? r.json() : [])
        .then(d => setTickets(Array.isArray(d) ? d : (d.tickets ?? []))),
      apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/mine`).then(r => r.ok ? r.json() : [])
        .then(d => {
          const raw = Array.isArray(d) ? d : (d.orders ?? []);
          setOrders(raw.map((o: { id: string; event?: { title?: string }; tier?: { name?: string } }) => ({
            id:         o.id,
            eventTitle: o.event?.title ?? 'Event',
            tierId:     '',
            tierName:   o.tier?.name ?? 'Ticket',
          })));
        }),
    ]).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Support</h1>
        <p className="mt-1 text-sm text-slate-500">Get help from event organisers for your tickets.</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex rounded-xl border border-slate-200 overflow-hidden">
        {([
          { key: 'new' as const,     label: 'New request' },
          { key: 'history' as const, label: `My requests${tickets.length > 0 ? ` (${tickets.length})` : ''}` },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-sm font-bold transition ${
              tab === key ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-4 py-20">
          <ThinkingOrb state="breathing" size={64} theme="light" />
          <p className="text-sm text-slate-400">Loading…</p>
        </div>
      ) : tab === 'new' ? (
        orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <TicketIcon className="h-14 w-14 text-brand-500" />
            <div>
              <p className="font-extrabold text-slate-900">No tickets purchased yet</p>
              <p className="mt-1 text-sm text-slate-400">Buy a ticket to an event to contact the organiser.</p>
            </div>
          </div>
        ) : (
          <NewTicketForm
            orders={orders}
            onCreated={t => { setTickets(prev => [t, ...prev]); setTab('history'); }}
          />
        )
      ) : (
        tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <MailIcon className="h-14 w-14 text-brand-500" />
            <div>
              <p className="font-extrabold text-slate-900">No support requests yet</p>
              <p className="mt-1 text-sm text-slate-400">Submit a request and organisers will respond here.</p>
            </div>
            <button onClick={() => setTab('new')} className="mt-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500">
              New request
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => <ThreadCard key={t.id} ticket={t} />)}
          </div>
        )
      )}
    </div>
  );
}
