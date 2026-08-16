'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, TagPriceIcon, XIcon } from '@/components/icons';
import { toast } from '@/components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DiscountCode {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  maxUses: number | null;
  usedCount: number;
  minOrderAmount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  eventIds: string[];     // empty = all events
  createdAt: string;
}

interface EventOption {
  id: string;
  title: string;
}

const TOKEN = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
const API   = process.env.NEXT_PUBLIC_API_URL;

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function discountLabel(d: DiscountCode) {
  return d.type === 'PERCENT' ? `${d.value}% off` : `XAF ${d.value.toLocaleString()} off`;
}

// ─── Create/Edit modal ────────────────────────────────────────────────────────

function CodeModal({
  events,
  onClose,
  onSaved,
}: {
  events: EventOption[];
  onClose: () => void;
  onSaved: (d: DiscountCode) => void;
}) {
  const [code,        setCode]        = useState('');
  const [type,        setType]        = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [value,       setValue]       = useState('');
  const [maxUses,     setMaxUses]     = useState('');
  const [minOrder,    setMinOrder]    = useState('');
  const [expiresAt,   setExpiresAt]   = useState('');
  const [allEvents,   setAllEvents]   = useState(true);
  const [eventIds,    setEventIds]    = useState<string[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  function toggleEvent(id: string) {
    setEventIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    setCode(Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
  }

  async function submit() {
    if (!code.trim())   { setError('Code is required'); return; }
    if (!value.trim())  { setError('Discount value is required'); return; }
    const numVal = Number(value);
    if (isNaN(numVal) || numVal <= 0) { setError('Discount value must be a positive number'); return; }
    if (type === 'PERCENT' && numVal > 100) { setError('Percent discount cannot exceed 100'); return; }
    if (!allEvents && eventIds.length === 0) { setError('Select at least one event'); return; }

    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/creators/me/discounts`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:           code.trim().toUpperCase(),
          type,
          value:          numVal,
          maxUses:        maxUses ? Number(maxUses) : null,
          minOrderAmount: minOrder ? Number(minOrder) : null,
          expiresAt:      expiresAt || null,
          eventIds:       allEvents ? [] : eventIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to create discount code'); return; }
      onSaved(data);
      toast.success(`Discount code "${data.code}" created`);
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Create discount code</h2>
            <p className="mt-0.5 text-sm text-slate-400">Give your attendees a special price.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Code */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Code *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SUMMER20"
                maxLength={20}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono font-bold uppercase text-slate-900 outline-none placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
              <button
                type="button"
                onClick={generateCode}
                className="shrink-0 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Type + Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Discount type *</label>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                {(['PERCENT', 'FLAT'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex-1 py-2.5 text-xs font-bold transition ${
                      type === t
                        ? 'bg-brand-600 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'PERCENT' ? '% Off' : 'XAF Off'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Value * {type === 'PERCENT' ? '(%)' : '(XAF)'}
              </label>
              <input
                type="number"
                value={value}
                min={1}
                max={type === 'PERCENT' ? 100 : undefined}
                onChange={e => setValue(e.target.value)}
                placeholder={type === 'PERCENT' ? '20' : '5000'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Max uses</label>
              <input
                type="number"
                value={maxUses}
                min={1}
                onChange={e => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Min order (XAF)</label>
              <input
                type="number"
                value={minOrder}
                min={0}
                onChange={e => setMinOrder(e.target.value)}
                placeholder="No minimum"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Expires at</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Events scope */}
          {events.length > 0 && (
            <div>
              <label className="mb-2 block text-xs font-bold text-slate-700">Apply to</label>
              <div className="flex gap-3 mb-2">
                {(['all', 'specific'] as const).map(opt => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      checked={allEvents === (opt === 'all')}
                      onChange={() => setAllEvents(opt === 'all')}
                      className="text-brand-600"
                    />
                    <span className="text-sm text-slate-700">{opt === 'all' ? 'All my events' : 'Specific events'}</span>
                  </label>
                ))}
              </div>
              {!allEvents && (
                <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 p-3">
                  {events.map(ev => (
                    <label key={ev.id} className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={eventIds.includes(ev.id)}
                        onChange={() => toggleEvent(ev.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                      <span className="text-sm text-slate-700 truncate">{ev.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create code'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function CodeRow({ code, onToggle, onDelete }: {
  code: DiscountCode;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const usagePct = code.maxUses ? Math.round((code.usedCount / code.maxUses) * 100) : null;
  const expired  = code.expiresAt ? new Date(code.expiresAt) < new Date() : false;
  const status   = !code.isActive ? 'paused' : expired ? 'expired' : 'active';

  return (
    <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
      {/* Status dot */}
      <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${
        status === 'active' ? 'bg-emerald-500' : status === 'expired' ? 'bg-amber-400' : 'bg-slate-300'
      }`} />

      {/* Code + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-sm font-bold text-slate-900 font-mono">{code.code}</code>
          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
            code.type === 'PERCENT' ? 'bg-brand-50 text-brand-700' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {discountLabel(code)}
          </span>
          {code.minOrderAmount && (
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
              Min XAF {code.minOrderAmount.toLocaleString()}
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Used {code.usedCount}{code.maxUses ? `/${code.maxUses}` : ''} times
          {code.expiresAt ? ` · Expires ${fmtDate(code.expiresAt)}` : ' · No expiry'}
          {code.eventIds.length > 0 ? ` · ${code.eventIds.length} event${code.eventIds.length > 1 ? 's' : ''}` : ' · All events'}
        </p>
        {usagePct !== null && (
          <div className="mt-1.5 h-1 w-32 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 100 ? 'bg-red-400' : 'bg-brand-500'}`}
              style={{ width: `${Math.min(usagePct, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => onToggle(code.id, !code.isActive)}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            code.isActive
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {code.isActive ? 'Pause' : 'Enable'}
        </button>
        <button
          onClick={() => onDelete(code.id)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiscountsPage() {
  const [codes,   setCodes]   = useState<DiscountCode[]>([]);
  const [events,  setEvents]  = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const token = TOKEN();
    if (!token) { setLoading(false); return; }

    Promise.all([
      fetch(`${API}/creators/me/discounts`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(d => setCodes(Array.isArray(d) ? d : (d.codes ?? []))),
      fetch(`${API}/creators/me/events`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : [])
        .then(d => setEvents((Array.isArray(d) ? d : (d.events ?? [])).map((e: { id: string; title: string }) => ({ id: e.id, title: e.title })))),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(id: string, active: boolean) {
    try {
      const res = await fetch(`${API}/creators/me/discounts/${id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${TOKEN()}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: active }),
      });
      if (res.ok) {
        setCodes(prev => prev.map(c => c.id === id ? { ...c, isActive: active } : c));
      }
    } catch {}
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this discount code? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API}/creators/me/discounts/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${TOKEN()}` },
      });
      if (res.ok) {
        setCodes(prev => prev.filter(c => c.id !== id));
        toast.success('Discount code deleted');
      } else {
        toast.error('Failed to delete discount code');
      }
    } catch {
      toast.error('Network error');
    }
  }

  const active  = codes.filter(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date()));
  const inactive = codes.filter(c => !c.isActive || (c.expiresAt && new Date(c.expiresAt) <= new Date()));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Discount Codes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create promo codes that attendees enter at checkout to get a discount.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
        >
          <PlusIcon className="h-4 w-4" />
          New code
        </button>
      </div>

      {/* Stats row */}
      {codes.length > 0 && (
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: 'Total codes',    value: codes.length },
            { label: 'Active codes',   value: active.length },
            { label: 'Total uses',     value: codes.reduce((s, c) => s + c.usedCount, 0) },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Codes list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="h-4 w-1/4 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          {/* Coupon illustration — no circle, just the coupon shape itself */}
          <svg width="120" height="68" viewBox="0 0 120 68" fill="none" aria-hidden="true">
            {/* Coupon body — charcoal left stub + orange right section */}
            {/* Left stub (dark) */}
            <path
              d="M4 10 Q4 4 10 4 H44 V14 Q38 14 38 20 Q38 26 44 26 V42 Q38 42 38 48 Q38 54 44 54 V64 H10 Q4 64 4 58 Z"
              fill="#333333"
            />
            {/* Right section (orange) */}
            <path
              d="M44 4 H110 Q116 4 116 10 V58 Q116 64 110 64 H44 V54 Q50 54 50 48 Q50 42 44 42 V26 Q50 26 50 20 Q50 14 44 14 Z"
              fill="#F07200"
            />
            {/* Dashed perforation line */}
            <line x1="44" y1="8" x2="44" y2="60" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
            {/* % symbol inside right section */}
            <text x="80" y="38" textAnchor="middle" fontSize="22" fontWeight="800" fill="white" fontFamily="system-ui, sans-serif">%</text>
            {/* Stars / dots on left stub */}
            <circle cx="24" cy="28" r="3" fill="white" opacity="0.3" />
            <circle cx="24" cy="38" r="3" fill="white" opacity="0.15" />
          </svg>
          <p className="mt-5 text-base font-extrabold text-slate-900">No discount codes yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Create a code to offer your attendees a special price.
          </p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-6 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
          >
            Create your first code
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Active</p>
              </div>
              <div className="divide-y divide-slate-100">
                {active.map(c => (
                  <CodeRow key={c.id} code={c} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
              <div className="border-b border-slate-100 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Paused / Expired</p>
              </div>
              <div className="divide-y divide-slate-100 opacity-70">
                {inactive.map(c => (
                  <CodeRow key={c.id} code={c} onToggle={handleToggle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <CodeModal
          events={events}
          onClose={() => setShowNew(false)}
          onSaved={(d) => setCodes(prev => [d, ...prev])}
        />
      )}
    </div>
  );
}
