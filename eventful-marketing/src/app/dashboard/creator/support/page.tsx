'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircleIcon, UsersGroupIcon } from '@/components/icons';
import { toast } from '@/components/Toast';
import { ThinkingOrb } from 'thinking-orbs';

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
  buyerName: string;
  buyerEmail: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
  _count?: { messages: number };
}

const TOKEN = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
const API   = process.env.NEXT_PUBLIC_API_URL;

const STATUS_STYLES: Record<TicketStatus, { label: string; bg: string; text: string }> = {
  OPEN:        { label: 'Open',        bg: 'bg-amber-50',   text: 'text-amber-700' },
  IN_PROGRESS: { label: 'In progress', bg: 'bg-brand-50',   text: 'text-brand-700' },
  RESOLVED:    { label: 'Resolved',    bg: 'bg-emerald-50', text: 'text-emerald-700' },
  CLOSED:      { label: 'Closed',      bg: 'bg-slate-100',  text: 'text-slate-500' },
};


function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Thread view ──────────────────────────────────────────────────────────────

function ThreadView({ ticket, onUpdate }: {
  ticket: SupportTicket;
  onUpdate: (t: SupportTicket) => void;
}) {
  const [reply,    setReply]   = useState('');
  const [sending,  setSending] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>(ticket.messages ?? []);

  const st = STATUS_STYLES[ticket.status];

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/creators/me/support/${ticket.id}/messages`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ body: reply.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message ?? 'Failed to send reply'); return; }
      setMessages(prev => [...prev, data]);
      setReply('');
      onUpdate({ ...ticket, status: 'IN_PROGRESS', messages: [...messages, data] });
    } catch {
      toast.error('Network error');
    } finally {
      setSending(false);
    }
  }

  async function changeStatus(status: TicketStatus) {
    try {
      const res = await fetch(`${API}/creators/me/support/${ticket.id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      });
      if (res.ok) {
        const updated = { ...ticket, status };
        onUpdate(updated);
        toast.success(`Ticket marked as ${STATUS_STYLES[status].label.toLowerCase()}`);
      }
    } catch {}
  }

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="shrink-0 border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-extrabold text-slate-900 leading-snug">{ticket.subject}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {ticket.buyerName} · {ticket.buyerEmail} · {ticket.eventTitle}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${st.bg} ${st.text}`}>
            {st.label}
          </span>
        </div>

        {/* Status actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(['IN_PROGRESS', 'RESOLVED', 'CLOSED'] as TicketStatus[])
            .filter(s => s !== ticket.status)
            .map(s => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-brand-300 hover:text-brand-600"
              >
                Mark as {STATUS_STYLES[s].label.toLowerCase()}
              </button>
            ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-5 py-5">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-slate-400">No messages yet.</p>
        ) : messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.fromCreator ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.fromCreator
                ? 'rounded-tr-sm bg-brand-600 text-white'
                : 'rounded-tl-sm bg-slate-100 text-slate-800'
            }`}>
              <p>{msg.body}</p>
              <p className={`mt-1.5 text-[10px] ${msg.fromCreator ? 'text-white/60' : 'text-slate-400'}`}>
                {fmtRelative(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply box */}
      {ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED' && (
        <div className="shrink-0 border-t border-slate-100 px-5 py-4">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Type your reply…"
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-40"
            >
              {sending ? <><ThinkingOrb state="breathing" size={20} theme="dark" /> Sending…</> : 'Send reply'}
            </button>
          </div>
        </div>
      )}
      {(ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') && (
        <div className="shrink-0 border-t border-slate-100 px-5 py-3">
          <p className="text-center text-xs text-slate-400">
            This ticket is {ticket.status.toLowerCase()}.{' '}
            {ticket.status === 'RESOLVED' && (
              <button onClick={() => changeStatus('OPEN')} className="font-semibold underline text-brand-500">
                Reopen
              </button>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [tickets,  setTickets]  = useState<SupportTicket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [filter,   setFilter]   = useState<TicketStatus | 'ALL'>('ALL');

  useEffect(() => {
    const token = TOKEN();
    if (!token) { setLoading(false); return; }
    fetch(`${API}/creators/me/support`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => setTickets(Array.isArray(d) ? d : (d.tickets ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUpdate = useCallback((updated: SupportTicket) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelected(updated);
  }, []);

  const filtered = filter === 'ALL'
    ? tickets
    : tickets.filter(t => t.status === filter);

  const openCount = tickets.filter(t => t.status === 'OPEN').length;

  return (
    <div className="flex h-full min-h-screen flex-col">
      <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Support inbox</h1>
            <p className="mt-1 text-sm text-slate-500">
              Attendee support requests for your events.
              {openCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {openCount} open
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="mt-4 flex gap-1 overflow-x-auto">
          {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                filter === f
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {f === 'ALL' ? 'All' : STATUS_STYLES[f].label}
              {f === 'OPEN' && openCount > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]">{openCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
          <ThinkingOrb state="breathing" size={64} theme="light" />
          <p className="text-sm text-slate-400">Loading tickets…</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 py-20 text-center">
          <UsersGroupIcon className="h-14 w-14 text-brand-500" />
          <div>
            <p className="text-base font-extrabold text-slate-900">No support tickets yet</p>
            <p className="mt-1 text-sm text-slate-400">When attendees send you questions, they&apos;ll appear here.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Ticket list */}
          <div className={`flex flex-col border-r border-slate-100 bg-white ${selected ? 'hidden lg:flex' : 'flex'} w-full lg:w-80 xl:w-96 shrink-0`}>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No tickets in this category.</p>
              ) : filtered.map(t => {
                const st = STATUS_STYLES[t.status];
                const isSelected = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`w-full text-left px-4 py-4 transition ${isSelected ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-bold truncate ${isSelected ? 'text-brand-700' : 'text-slate-900'}`}>
                        {t.subject}
                      </p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${st.bg} ${st.text}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 truncate">
                      {t.buyerName} · {t.eventTitle}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                      <ClockIcon className="h-3 w-3" />
                      {fmtRelative(t.updatedAt)}
                      {t._count && t._count.messages > 0 && (
                        <>
                          <span>·</span>
                          <UsersGroupIcon className="h-3 w-3" />
                          {t._count.messages} message{t._count.messages !== 1 ? 's' : ''}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thread panel */}
          {selected ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Mobile back */}
              <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-2 lg:hidden">
                <button
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600"
                >
                  ← Back to inbox
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ThreadView ticket={selected} onUpdate={handleUpdate} />
              </div>
            </div>
          ) : (
            <div className="hidden lg:flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <CheckCircleIcon className="h-10 w-10 text-slate-200" />
              <p className="text-sm text-slate-400">Select a ticket to view the conversation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
