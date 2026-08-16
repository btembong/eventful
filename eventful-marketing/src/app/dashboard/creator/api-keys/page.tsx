'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, LockIcon, XIcon, EyeIcon, EyeOffIcon } from '@/components/icons';
import { toast } from '@/components/Toast';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;        // e.g. "evtf_live_abc1..."
  secret?: string;       // only returned on creation
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  expiresAt?: string;
}

const ALL_SCOPES = [
  { value: 'events:read',    label: 'Events — read' },
  { value: 'events:write',   label: 'Events — write' },
  { value: 'tickets:read',   label: 'Tickets — read' },
  { value: 'analytics:read', label: 'Analytics — read' },
  { value: 'webhooks:write', label: 'Webhooks — write' },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function NewKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (k: ApiKey) => void }) {
  const [name,    setName]    = useState('');
  const [scopes,  setScopes]  = useState<string[]>(['events:read']);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function toggleScope(s: string) {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function submit() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (scopes.length === 0) { setError('Select at least one scope'); return; }
    setError('');
    setLoading(true);
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api-keys`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), scopes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed to create key'); return; }
      onCreated(data);
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
        <h2 className="text-lg font-extrabold text-slate-900">Create API key</h2>
        <p className="mt-1 text-sm text-slate-500">
          The secret will only be shown <strong>once</strong>. Store it securely.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Key name *</label>
            <input
              type="text"
              placeholder="e.g. Production server, CI pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700">Scopes *</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ALL_SCOPES.map((s) => (
                <label
                  key={s.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition ${
                    scopes.includes(s.value) ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={scopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className={`text-xs font-bold font-mono ${scopes.includes(s.value) ? 'text-brand-600' : 'text-slate-600'}`}>
                    {s.label}
                  </span>
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
            {loading ? 'Creating…' : 'Create key'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SecretReveal({ secret }: { secret: string }) {
  const [visible, setVisible] = useState(true);
  const [copied,  setCopied]  = useState(false);

  function copy() {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-xs font-bold text-emerald-800 mb-2">API key created — copy it now. It won&apos;t be shown again.</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-xs font-mono text-slate-800 ring-1 ring-emerald-200">
          {visible ? secret : '•'.repeat(secret.length)}
        </code>
        <button
          onClick={() => setVisible((v) => !v)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-white"
        >
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function ApiKeysPage() {
  const [keys,     setKeys]     = useState<ApiKey[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showNew,  setShowNew]  = useState(false);
  const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { setLoading(false); return; }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api-keys`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setKeys(Array.isArray(data) ? data : (data.keys ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    const token = localStorage.getItem('access_token');
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api-keys/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch { toast.error('Failed to revoke key'); }
  }

  function handleCreated(k: ApiKey) {
    if (k.secret) setNewSecret({ id: k.id, secret: k.secret });
    setKeys((prev) => [{ ...k, secret: undefined }, ...prev]);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">API Keys</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use API keys to authenticate server-to-server requests to the Eventful API.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
        >
          <PlusIcon className="h-4 w-4" />
          New key
        </button>
      </div>

      {/* Newly created secret */}
      {newSecret && <SecretReveal secret={newSecret.secret} />}

      {/* Warning */}
      <div className="my-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <strong>Keep your keys secret.</strong> Never expose them in client-side code or public repositories.
        Rotate immediately if compromised.
      </div>

      {/* Keys list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200 font-mono" />
            </div>
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <LockIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No API keys yet</p>
          <p className="mt-1 text-xs text-slate-400">Create a key to integrate your server with the Eventful API.</p>
          <button
            onClick={() => setShowNew(true)}
            className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500"
          >
            Create your first key
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="divide-y divide-slate-100">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{k.name}</p>
                  <code className="text-xs font-mono text-slate-400">{k.prefix}••••••••</code>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 font-mono">{s}</span>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Created {fmtDate(k.createdAt)}
                    {k.lastUsedAt && ` · Last used ${fmtDate(k.lastUsedAt)}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="shrink-0 flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && (
        <NewKeyModal
          onClose={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
