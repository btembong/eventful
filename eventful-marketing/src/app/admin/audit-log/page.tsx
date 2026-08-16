'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL!;
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : ''; }

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  meta: Record<string, unknown> | null;
  actor: { id: string; email: string; fullName: string } | null;
}

const ACTION_COLOR: Record<string, string> = {
  'payment.verified':      'bg-emerald-50 text-emerald-700',
  'ticket.checked_in':     'bg-brand-50 text-brand-600',
  'event.cancelled':       'bg-red-50 text-red-600',
  'user.deleted':          'bg-red-50 text-red-600',
  'admin.user.banned':     'bg-orange-50 text-orange-700',
  'admin.event.cancelled': 'bg-orange-50 text-orange-700',
};

export default function AdminAuditLogPage() {
  const [logs,    setLogs]    = useState<AuditEntry[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [action,  setAction]  = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (action) params.set('action', action);
    try {
      const res = await fetch(`${API}/admin/audit-log?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, action]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold text-slate-900">Audit log <span className="ml-2 text-sm font-normal text-slate-400">({total.toLocaleString()} entries)</span></h1>
        <input
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          placeholder="Filter by action, e.g. payment.verified"
          value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {loading && <p className="py-8 text-center text-sm text-slate-400 animate-pulse">Loading…</p>}
        {!loading && logs.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No entries found.</p>}
        <div className="divide-y divide-slate-50">
          {logs.map((log) => (
            <div key={log.id} className="px-5 py-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${ACTION_COLOR[log.action] ?? 'bg-slate-100 text-slate-600'}`}>
                  {log.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-600">
                    <span className="font-mono text-[11px] text-slate-400">{log.entityType}:{log.entityId.slice(0, 8)}…</span>
                    {log.actor && <> · <span className="font-semibold">{log.actor.fullName}</span> ({log.actor.email})</>}
                    {!log.actor && <> · <span className="italic text-slate-400">system</span></>}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {new Date(log.createdAt).toLocaleString('en-GB')}
                  </p>
                </div>
                {log.meta && (
                  <button
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className="shrink-0 text-[11px] font-bold text-slate-400 hover:text-brand-600"
                  >
                    {expanded === log.id ? 'hide' : 'meta'}
                  </button>
                )}
              </div>
              {expanded === log.id && log.meta && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-3 text-[11px] text-slate-600">
                  {JSON.stringify(log.meta, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>

      {total > 30 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-400">Page {page} · {total} total</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold disabled:opacity-40">← Prev</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page * 30 >= total} className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
