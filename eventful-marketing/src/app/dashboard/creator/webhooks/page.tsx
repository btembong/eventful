'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, LockIcon, CheckCircleIcon, XIcon } from '@/components/icons';
import { toast } from '@/components/Toast';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  lastDeliveryAt?: string;
  lastDeliveryStatus?: number;
}

const ALLOWED_EVENTS = ['ticket.paid', 'ticket.checked_in', 'ticket.cancelled', 'event.cancelled'] as const;

function WebhookCard({ webhook, onToggle, onDelete }: {
  webhook: Webhook;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this webhook endpoint?')) return;
    setDeleting(true);
    const token = localStorage.getItem('access_token');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/webhooks/${webhook.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      onDelete(webhook.id);
    } catch {
      toast.error('Failed to delete webhook');
      setDeleting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full ${webhook.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <p className="truncate text-sm font-bold text-slate-900 font-mono">{webhook.url}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {webhook.events.map((e) => (
              <span key={e} className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                {e}
              </span>
            ))}
          </div>
          {webhook.lastDeliveryAt && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              Last delivery: {new Date(webhook.lastDeliveryAt).toLocaleString()} —
              <span className={webhook.lastDeliveryStatus === 200 ? ' text-emerald-600 font-bold' : ' text-red-500 font-bold'}>
                {' '}{webhook.lastDeliveryStatus ?? '—'}
              </span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => onToggle(webhook.id, !webhook.isActive)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              webhook.isActive
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            {webhook.isActive ? 'Pause' : 'Enable'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddWebhookModal({ onClose, onAdded }: { onClose: () => void; onAdded: (w: Webhook) => void }) {
  const [url,    setUrl]    = useState('');
  const [events, setEvents] = useState<string[]>(['ticket.paid']);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function toggleEvent(e: string) {
    setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  }

  async function submit() {
    if (!url.trim()) { setError('URL is required'); return; }
    if (events.length === 0) { setError('Select at least one event'); return; }
    setError('');
    setLoading(true);
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/webhooks`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: url.trim(), events }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to create webhook'); return; }
      onAdded(data);
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-extrabold text-slate-900">Add webhook endpoint</h2>
        <p className="mt-1 text-sm text-slate-500">Eventful will POST a signed JSON payload to this URL when events occur.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Endpoint URL *</label>
            <input
              type="url"
              placeholder="https://yourdomain.com/webhooks/eventful"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-mono outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700">Subscribe to events *</label>
            <div className="grid grid-cols-2 gap-2">
              {ALLOWED_EVENTS.map((e) => (
                <label key={e} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition ${events.includes(e) ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200'}`}>
                  <input
                    type="checkbox"
                    checked={events.includes(e)}
                    onChange={() => toggleEvent(e)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  <span className={`text-xs font-bold ${events.includes(e) ? 'text-brand-600' : 'text-slate-600'}`}>{e}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add endpoint'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/webhooks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setWebhooks(Array.isArray(data) ? data : (data.webhooks ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(id: string, active: boolean) {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/webhooks/${id}`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: active }),
      });
      if (res.ok) {
        setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, isActive: active } : w));
      }
    } catch {}
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Webhooks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Receive real-time HTTP callbacks when ticket and event events occur.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
        >
          <PlusIcon className="h-4 w-4" />
          Add endpoint
        </button>
      </div>

      {/* Info box */}
      <div className="mb-6 rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-900">
        <p className="font-bold mb-1">Webhook security</p>
        <p className="text-brand-600">
          Every request is signed with an <code className="rounded bg-brand-100 px-1 py-0.5 font-mono text-[11px]">X-Eventful-Signature</code> header (HMAC-SHA256).
          Verify this signature in your server to confirm the request came from Eventful.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="h-4 w-3/4 rounded bg-slate-200" />
              <div className="mt-2 flex gap-2">
                <div className="h-5 w-20 rounded-md bg-slate-200" />
                <div className="h-5 w-24 rounded-md bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <LockIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No webhook endpoints yet</p>
          <p className="mt-1 text-xs text-slate-400">Add an endpoint to receive real-time event notifications.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
          >
            Add your first endpoint
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((w) => (
            <WebhookCard
              key={w.id}
              webhook={w}
              onToggle={handleToggle}
              onDelete={(id) => setWebhooks((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddWebhookModal
          onClose={() => setShowAdd(false)}
          onAdded={(w) => setWebhooks((prev) => [w, ...prev])}
        />
      )}
    </div>
  );
}
