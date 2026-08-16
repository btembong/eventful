'use client';

import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL!;
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : ''; }

interface User {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  creatorStatus: string;
  emailVerifiedAt: string | null;
  mfaEnabled: boolean;
  createdAt: string;
  deletedAt: string | null;
}

const ROLE_PILL: Record<string, string> = {
  ADMIN:   'bg-red-100 text-red-700',
  CREATOR: 'bg-brand-100 text-brand-600',
  EVENTEE: 'bg-slate-100 text-slate-600',
};

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [q,       setQ]       = useState('');
  const [loading, setLoading] = useState(true);
  const [banning, setBanning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) params.set('q', q);
    try {
      const res = await fetch(`${API}/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  async function ban(userId: string) {
    if (!confirm('Ban this user? They will lose access immediately.')) return;
    setBanning(userId);
    await fetch(`${API}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    await load();
    setBanning(null);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-extrabold text-slate-900">Users <span className="ml-2 text-sm font-normal text-slate-400">({total.toLocaleString()})</span></h1>
        <input
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          placeholder="Search by name or email…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">User</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Roles</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Joined</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400 animate-pulse">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400">No users found.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className={`transition hover:bg-slate-50 ${u.deletedAt ? 'opacity-50' : ''}`}>
                <td className="px-5 py-3">
                  <p className="font-semibold text-slate-900">{u.fullName}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                  {u.mfaEnabled && <span className="mt-0.5 inline-block rounded text-[10px] font-bold text-emerald-600">MFA on</span>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <span key={r} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROLE_PILL[r] ?? 'bg-slate-100 text-slate-500'}`}>{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  {u.deletedAt
                    ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">Banned</span>
                    : u.emailVerifiedAt
                    ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Verified</span>
                    : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Unverified</span>
                  }
                </td>
                <td className="px-5 py-3 text-xs text-slate-400">
                  {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3">
                  {!u.deletedAt && !u.roles.includes('ADMIN') && (
                    <button
                      onClick={() => ban(u.id)}
                      disabled={banning === u.id}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                    >
                      {banning === u.id ? '…' : 'Ban'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
