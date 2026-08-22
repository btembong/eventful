'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, useApiFetch } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  background: string;
  goal: string | null;
  paymentPlan: 'FULL' | 'INSTALLMENT';
  paymentMethod: string;
  referral: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'PAID' | 'REJECTED';
  adminNotes: string | null;
  cohort: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700 border-amber-300',
  ACCEPTED: 'bg-blue-100 text-blue-700 border-blue-300',
  PAID:     'bg-green-100 text-green-700 border-green-300',
  REJECTED: 'bg-red-100 text-red-700 border-red-300',
};

const BG_LABELS: Record<string, string> = {
  zero:   'Complete beginner',
  basics: 'HTML/CSS basics',
  js:     'Knows JS',
  other:  'Another language',
};

export default function BootcampAdminPage() {
  const { user } = useAuth();
  const apiFetch = useApiFetch();
  const router = useRouter();

  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<{ applied: number; total: number; remaining: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selected, setSelected] = useState<Application | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');

  // Redirect non-admins
  useEffect(() => {
    if (user && !user.roles.includes('ADMIN')) router.replace('/');
  }, [user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterStatus ? `?status=${filterStatus}` : '';
      const [apps, st] = await Promise.all([
        apiFetch(`${API_URL}/bootcamp/applications${qs}`).then((r: Response) => r.json()),
        fetch(`${API_URL}/bootcamp/stats`).then((r: Response) => r.json()),
      ]);
      setApplications(Array.isArray(apps) ? apps : []);
      setStats(st);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function updateStatus(id: string, status: string) {
    setUpdating(true);
    setUpdateMsg('');
    try {
      const res = await apiFetch(`${API_URL}/bootcamp/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNotes: notesDraft || undefined }),
      });
      if (!res.ok) throw new Error('Failed');
      setUpdateMsg(`Status updated to ${status}`);
      setSelected(prev => prev ? { ...prev, status: status as Application['status'], adminNotes: notesDraft || prev.adminNotes } : prev);
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: status as Application['status'] } : a));
      if (status !== 'PENDING') fetchData();
    } catch {
      setUpdateMsg('Update failed — try again');
    } finally {
      setUpdating(false);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!user.roles.includes('ADMIN')) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Digos Technologies</p>
            <h1 className="text-xl font-black text-slate-900">Bootcamp Applications</h1>
          </div>
          {stats && (
            <div className="hidden items-center gap-6 sm:flex">
              <div className="text-center">
                <p className="text-2xl font-black text-brand-600">{stats.applied}</p>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Applied</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Total seats</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-black ${stats.remaining === 0 ? 'text-red-500' : 'text-green-600'}`}>{stats.remaining}</p>
                <p className="text-[10px] font-semibold uppercase text-slate-400">Remaining</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-500">Filter:</span>
          {['', 'PENDING', 'ACCEPTED', 'PAID', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                filterStatus === s
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
          <button
            onClick={fetchData}
            className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-brand-300"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">Loading applications…</div>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <p className="text-sm font-bold text-slate-400">No applications{filterStatus ? ` with status ${filterStatus}` : ''}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border-2 border-brand-950 bg-white" style={{ boxShadow: '4px 4px 0 #333333' }}>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-brand-950 bg-brand-950 text-left">
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Applicant</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Country</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Background</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Plan</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Method</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Status</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Applied</th>
                    <th className="px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white/60">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, i) => (
                    <tr
                      key={app.id}
                      className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'} hover:bg-brand-50 transition`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">{app.fullName}</p>
                        <p className="text-xs text-slate-400">{app.email}</p>
                        <p className="text-xs text-slate-400">{app.phone}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{app.country}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {BG_LABELS[app.background] ?? app.background}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${app.paymentPlan === 'FULL' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          {app.paymentPlan === 'FULL' ? '$250' : '$135×2'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{app.paymentMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-lg border px-2 py-0.5 text-[11px] font-black ${STATUS_COLORS[app.status]}`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelected(app); setNotesDraft(app.adminNotes ?? ''); setUpdateMsg(''); }}
                          className="rounded-lg border-2 border-brand-950 bg-white px-3 py-1 text-xs font-bold text-slate-900 shadow-[2px_2px_0_#333333] transition hover:-translate-x-px hover:-translate-y-px"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail drawer / modal ─────────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div
            className="relative h-full w-full max-w-md overflow-y-auto border-l-2 border-brand-950 bg-white p-6 shadow-[-6px_0_0_#333333]"
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setSelected(null)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-950 bg-white text-slate-700 shadow-[2px_2px_0_#333333]"
            >
              ✕
            </button>

            <p className="text-[10px] font-black uppercase tracking-widest text-brand-600">Application Detail</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{selected.fullName}</h2>

            <div className="mt-4 space-y-2 text-sm">
              <Row label="Email"    value={<a href={`mailto:${selected.email}`} className="text-brand-600 underline">{selected.email}</a>} />
              <Row label="Phone"    value={<a href={`https://wa.me/${selected.phone.replace(/\D/g,'')}`} className="text-green-600 underline">{selected.phone}</a>} />
              <Row label="Country"  value={selected.country} />
              <Row label="Background" value={BG_LABELS[selected.background] ?? selected.background} />
              <Row label="Plan"     value={selected.paymentPlan === 'FULL' ? 'Full — $250' : 'Installments — $135 × 2'} />
              <Row label="Method"   value={selected.paymentMethod} />
              <Row label="Cohort"   value={selected.cohort} />
              <Row label="Applied"  value={new Date(selected.createdAt).toLocaleString()} />
              {selected.referral && <Row label="Referral" value={selected.referral} />}
            </div>

            {selected.goal && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Goal</p>
                <p className="text-sm text-slate-700">{selected.goal}</p>
              </div>
            )}

            {/* Status badge */}
            <div className="mt-5 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Current status:</span>
              <span className={`rounded-lg border px-2.5 py-1 text-xs font-black ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
            </div>

            {/* Admin notes */}
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Admin notes (optional)</label>
              <textarea
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                rows={3}
                placeholder="Internal notes — not sent to applicant…"
                className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {selected.status !== 'ACCEPTED' && (
                <ActionBtn
                  label="Accept"
                  color="bg-blue-600 border-blue-900"
                  shadow="shadow-[3px_3px_0_#1e3a5f]"
                  disabled={updating}
                  onClick={() => updateStatus(selected.id, 'ACCEPTED')}
                />
              )}
              {selected.status !== 'PAID' && (
                <ActionBtn
                  label="Mark Paid"
                  color="bg-green-600 border-green-900"
                  shadow="shadow-[3px_3px_0_#14532d]"
                  disabled={updating}
                  onClick={() => updateStatus(selected.id, 'PAID')}
                />
              )}
              {selected.status !== 'REJECTED' && (
                <ActionBtn
                  label="Reject"
                  color="bg-red-500 border-red-900"
                  shadow="shadow-[3px_3px_0_#7f1d1d]"
                  disabled={updating}
                  onClick={() => updateStatus(selected.id, 'REJECTED')}
                />
              )}
              {selected.status !== 'PENDING' && (
                <ActionBtn
                  label="Set Pending"
                  color="bg-amber-500 border-amber-900"
                  shadow="shadow-[3px_3px_0_#78350f]"
                  disabled={updating}
                  onClick={() => updateStatus(selected.id, 'PENDING')}
                />
              )}
            </div>

            {updateMsg && (
              <p className={`mt-3 text-center text-xs font-bold ${updateMsg.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>
                {updateMsg}
              </p>
            )}

            <p className="mt-6 text-center text-[11px] text-slate-400">
              Accepting will automatically send the applicant their payment instructions by email.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-24 shrink-0 text-[11px] font-bold text-slate-400">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function ActionBtn({
  label, color, shadow, disabled, onClick,
}: {
  label: string;
  color: string;
  shadow: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border-2 ${color} ${shadow} py-2.5 text-sm font-black text-white transition hover:-translate-x-px hover:-translate-y-px disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0`}
    >
      {disabled ? '…' : label}
    </button>
  );
}
