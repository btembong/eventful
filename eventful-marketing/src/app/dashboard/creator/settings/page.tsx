'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, LockIcon, XIcon, EyeIcon, EyeOffIcon, WalletIcon, ChartIcon, TicketIcon, TagPriceIcon, UsersGroupIcon, CalendarIcon, TrendUpIcon, CheckCircleIcon, ClockIcon } from '@/components/icons';
import { toast } from '@/components/Toast';

const API = process.env.NEXT_PUBLIC_API_URL!;

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : '';
}

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'General' | 'Analytics' | 'Payouts' | 'Webhooks' | 'API Keys';
const TABS: Tab[] = ['General', 'Analytics', 'Payouts', 'Webhooks', 'API Keys'];

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: GENERAL
// ═══════════════════════════════════════════════════════════════════════════════

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-5 text-sm font-bold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">{label}</label>
      {children}
    </div>
  );
}

type Session = { jti: string; iat: number; exp: number };

function SessionsPanel() {
  const [sessions,    setSessions]    = useState<Session[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [revoking,    setRevoking]    = useState<string | null>(null);
  const [currentJti,  setCurrentJti]  = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/sessions`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? data);
      try {
        const payload = JSON.parse(atob(getToken().split('.')[1]));
        setCurrentJti(payload.jti ?? '');
      } catch {}
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function revoke(jti: string) {
    setRevoking(jti);
    await fetch(`${API}/auth/sessions/${jti}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
    await fetchSessions();
    setRevoking(null);
  }

  async function revokeAll() {
    setRevoking('all');
    await fetch(`${API}/auth/sessions`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ exceptJti: currentJti }),
    });
    await fetchSessions();
    setRevoking(null);
  }

  const otherSessions = sessions.filter((s) => s.jti !== currentJti);

  if (loading) return <p className="animate-pulse text-sm text-slate-400">Loading sessions…</p>;

  return (
    <div className="space-y-3">
      {sessions.length === 0 && <p className="text-sm text-slate-400">No active sessions found.</p>}
      {sessions.map((s) => {
        const isCurrent = s.jti === currentJti;
        return (
          <div key={s.jti} className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${isCurrent ? 'border-brand-200 bg-brand-50' : 'border-slate-100 bg-white'}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{isCurrent ? 'This device' : 'Other session'}</span>
                {isCurrent && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-600">Current</span>}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Issued {new Date(s.iat * 1000).toLocaleString()} · Expires {new Date(s.exp * 1000).toLocaleString()}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-300">{s.jti.slice(0, 16)}…</p>
            </div>
            {!isCurrent && (
              <button onClick={() => revoke(s.jti)} disabled={revoking === s.jti} className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40">
                {revoking === s.jti ? 'Revoking…' : 'Revoke'}
              </button>
            )}
          </div>
        );
      })}
      {otherSessions.length > 1 && (
        <button onClick={revokeAll} disabled={revoking === 'all'} className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40">
          {revoking === 'all' ? 'Revoking…' : `Revoke all other sessions (${otherSessions.length})`}
        </button>
      )}
    </div>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleDelete() {
    if (confirm !== 'DELETE') { setError('Type DELETE to confirm'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Failed'); return; }
      localStorage.clear();
      window.location.href = '/';
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h3 className="text-lg font-extrabold text-slate-900">Delete account?</h3>
        <p className="mt-2 text-sm text-slate-500">This permanently scrubs your personal data. Type <strong>DELETE</strong> to confirm.</p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <input className={`${inputCls} mt-4`} placeholder="DELETE" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50">
            {loading ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TabGeneral() {
  const [showDelete,    setShowDelete]    = useState(false);
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [phone,         setPhone]         = useState('');
  const [profileMsg,    setProfileMsg]    = useState<{ ok: boolean; text: string } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentPw,     setCurrentPw]     = useState('');
  const [newPw,         setNewPw]         = useState('');
  const [confirmPw,     setConfirmPw]     = useState('');
  const [pwLoading,     setPwLoading]     = useState(false);
  const [pwMsg,         setPwMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) { const u = JSON.parse(raw); setFullName(u.fullName ?? ''); setEmail(u.email ?? ''); setPhone(u.phone ?? ''); }
    } catch {}
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true); setProfileMsg(null);
    try {
      const res = await fetch(`${API}/account`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() || undefined }),
      });
      if (!res.ok) { const d = await res.json(); setProfileMsg({ ok: false, text: d.message ?? 'Failed.' }); return; }
      const updated = await res.json();
      const raw = localStorage.getItem('user');
      if (raw) localStorage.setItem('user', JSON.stringify({ ...JSON.parse(raw), ...updated }));
      setProfileMsg({ ok: true, text: 'Profile saved.' });
    } catch { setProfileMsg({ ok: false, text: 'Network error.' }); }
    finally { setProfileSaving(false); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return; }
    setPwLoading(true); setPwMsg(null);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!res.ok) { const d = await res.json(); setPwMsg({ ok: false, text: d.message ?? 'Failed.' }); return; }
      setPwMsg({ ok: true, text: 'Password updated.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch { setPwMsg({ ok: false, text: 'Network error.' }); }
    finally { setPwLoading(false); }
  }

  const initial = fullName ? fullName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="space-y-6">
      {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}

      <Section title="Profile">
        <form onSubmit={saveProfile} noValidate>
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-extrabold text-white">{initial}</div>
            <div><p className="text-sm font-bold text-slate-900">{fullName || 'Your name'}</p><p className="text-xs text-slate-400">{email}</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" /></Field>
            <Field label="Email address"><input type="email" className={`${inputCls} cursor-not-allowed opacity-60`} value={email} readOnly title="Email cannot be changed" /></Field>
            <Field label="Phone number"><input type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" /></Field>
          </div>
          {profileMsg && <p className={`mt-3 text-sm ${profileMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{profileMsg.text}</p>}
          <button type="submit" disabled={profileSaving} className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">
            {profileSaving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </Section>

      <Section title="Security">
        <form onSubmit={changePassword} className="space-y-4" noValidate>
          <Field label="Current password"><input type="password" className={inputCls} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" /></Field>
          <Field label="New password"><input type="password" className={inputCls} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters" /></Field>
          <Field label="Confirm new password"><input type="password" className={inputCls} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" /></Field>
          {pwMsg && <p className={`text-sm ${pwMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg.text}</p>}
          <button type="submit" disabled={pwLoading} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50">
            {pwLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </Section>

      <Section title="Active sessions">
        <p className="mb-4 text-xs text-slate-400">All devices signed in to your account. Revoke any you don&apos;t recognise.</p>
        <SessionsPanel />
      </Section>

      <Section title="Notifications">
        <div className="space-y-4">
          {[
            { label: 'Ticket confirmations', sub: 'Email me when I purchase a ticket',   checked: true },
            { label: 'Event reminders',       sub: '24h before an event I\'m attending', checked: true },
            { label: 'New events nearby',     sub: 'Weekly digest of events in my city', checked: false },
            { label: 'Promoter updates',      sub: 'News from event creators I follow',  checked: false },
          ].map(({ label, sub, checked }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-semibold text-slate-900">{label}</p><p className="text-xs text-slate-400">{sub}</p></div>
              <button role="switch" aria-checked={checked} className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      <VerificationSection />

      <Section title="Your data">
        <p className="mb-4 text-xs text-slate-400">Download all your personal data as a JSON file (GDPR right to portability).</p>
        <a href={`${API}/account/export`} target="_blank" rel="noopener noreferrer" className="inline-block rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
          Export my data
        </a>
      </Section>

      <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
        <h2 className="mb-1 text-sm font-bold text-red-700">Delete account</h2>
        <p className="mb-4 text-xs text-red-500">Permanently delete your account and scrub your personal data. This cannot be undone.</p>
        <button onClick={() => setShowDelete(true)} className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white">
          Delete my account
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: GENERAL — Verification section (KYC)
// ═══════════════════════════════════════════════════════════════════════════════

const KYC_DOC_TYPES = [
  { value: 'NATIONAL_ID',  label: 'National ID card' },
  { value: 'PASSPORT',     label: 'Passport' },
  { value: 'DRIVERS_LICENSE', label: "Driver's licence" },
  { value: 'BUSINESS_REG', label: 'Business registration' },
];

function VerificationSection() {
  const [kycDocType, setKycDocType] = useState('');
  const [kycDocUrl,  setKycDocUrl]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/creators/me/profile`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setKycDocType(d.kycDocType ?? ''); setKycDocUrl(d.kycDocUrl ?? ''); } })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!kycDocType || !kycDocUrl.trim()) { setMsg({ ok: false, text: 'Both document type and URL/reference are required.' }); return; }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/creators/me/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ kycDocType, kycDocUrl: kycDocUrl.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setMsg({ ok: false, text: d.message ?? 'Failed to save.' }); return; }
      setMsg({ ok: true, text: 'Verification details saved. Our team will review shortly.' });
    } catch { setMsg({ ok: false, text: 'Network error.' }); }
    finally { setSaving(false); }
  }

  return (
    <Section title="Identity verification">
      <p className="mb-5 text-xs text-slate-400">
        Required before your first payout. Upload a government-issued document. Our team reviews submissions within 1–2 business days.
      </p>
      <form onSubmit={save} className="space-y-4" noValidate>
        <Field label="Document type">
          <div className="relative">
            <select
              value={kycDocType}
              onChange={e => setKycDocType(e.target.value)}
              className={inputCls}
            >
              <option value="">Select document type…</option>
              {KYC_DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Document URL / reference">
          <input
            type="text"
            className={inputCls}
            value={kycDocUrl}
            onChange={e => setKycDocUrl(e.target.value)}
            placeholder="https://drive.google.com/... or document reference number"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Share a secure link to a scanned copy (Google Drive, Dropbox, etc.) or enter your document reference number.
          </p>
        </Field>
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button type="submit" disabled={saving} className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save verification details'}
        </button>
      </form>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════

interface DailyStat { date: string; revenue: number; tickets: number; }
interface TopEvent  { id: string; title: string; revenue: number; tickets: number; currency: string; }
interface AnalyticsSummary {
  totalRevenue: number; totalTickets: number; totalEvents: number; totalAttendees: number;
  currency: string; revenueChange: number; ticketsChange: number;
  daily?: DailyStat[]; topEvents?: TopEvent[];
}

function AnalyticsStatCard({ label, value, sub, icon: Icon, color, change }: {
  label: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string }>; color: string; change?: number;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}><Icon className="h-5 w-5 text-white" /></div>
        {change !== undefined && <span className={`text-xs font-bold ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{change >= 0 ? '+' : ''}{change.toFixed(1)}%</span>}
      </div>
      <p className="mt-4 text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function RevenueBar({ daily }: { daily: DailyStat[] }) {
  if (!daily || daily.length === 0) return null;
  const last14 = daily.slice(-14);
  const max = Math.max(...last14.map((d) => d.revenue), 1);
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <div><h3 className="text-sm font-bold text-slate-900">Revenue over time</h3><p className="text-xs text-slate-400">Last 14 days</p></div>
        <TrendUpIcon className="h-5 w-5 text-emerald-500" />
      </div>
      <div className="flex h-32 items-end gap-1">
        {last14.map((d) => {
          const h = Math.max(4, Math.round((d.revenue / max) * 100));
          return (
            <div key={d.date} className="group relative flex flex-1 flex-col items-center">
              <span className="absolute -top-5 hidden whitespace-nowrap text-[9px] text-slate-400 group-hover:block">
                {new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <div className="w-full rounded-t-md bg-brand-500 transition-all group-hover:bg-brand-400" style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-slate-400">
        <span>{new Date(last14[0]?.date ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(last14[last14.length - 1]?.date ?? '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  );
}

function TabAnalytics() {
  const [data,    setData]    = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch(`${API}/creators/me/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const kpis = data ? [
    { label: 'Total revenue',   value: `${data.currency} ${data.totalRevenue.toLocaleString()}`, sub: 'All-time',          icon: TagPriceIcon,   color: 'bg-brand-600',   change: data.revenueChange },
    { label: 'Tickets sold',    value: data.totalTickets.toLocaleString(),                        sub: 'All-time',          icon: TicketIcon,     color: 'bg-slate-800',   change: data.ticketsChange },
    { label: 'Events created',  value: String(data.totalEvents),                                  sub: 'Published & draft', icon: CalendarIcon,   color: 'bg-emerald-600' },
    { label: 'Total attendees', value: data.totalAttendees.toLocaleString(),                      sub: 'Unique check-ins',  icon: UsersGroupIcon, color: 'bg-amber-500'   },
  ] : null;

  return (
    <div className="space-y-8">
      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !kpis
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="h-11 w-11 rounded-xl bg-slate-200" />
                <div className="mt-4 h-7 w-2/3 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
              </div>
            ))
          : kpis.map((k) => <AnalyticsStatCard key={k.label} {...k} />)
        }
      </div>

      {!loading && data?.daily && (
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueBar daily={data.daily} />
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <div className="mb-4"><h3 className="text-sm font-bold text-slate-900">Ticket sales</h3><p className="text-xs text-slate-400">Last 14 days</p></div>
            <div className="flex h-32 items-end gap-1">
              {data.daily.slice(-14).map((d) => {
                const maxT = Math.max(...data.daily!.map((x) => x.tickets), 1);
                const h = Math.max(4, Math.round((d.tickets / maxT) * 100));
                return <div key={d.date} className="flex flex-1 flex-col items-center"><div className="w-full rounded-t-md bg-emerald-500" style={{ height: `${h}%` }} /></div>;
              })}
            </div>
          </div>
        </div>
      )}

      {!loading && data?.topEvents && data.topEvents.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Top performing events</h2>
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <div className="divide-y divide-slate-100">
              {data.topEvents.map((ev, i) => (
                <div key={ev.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-extrabold text-slate-500">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{ev.title}</p>
                    <p className="text-xs text-slate-400">{ev.tickets.toLocaleString()} tickets sold</p>
                  </div>
                  <p className="text-sm font-extrabold text-slate-900">{ev.currency} {ev.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!loading && !error && !data && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
          <ChartIcon className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No analytics data yet</p>
          <p className="mt-1 text-xs text-slate-400">Data appears once you publish events and sell tickets.</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: PAYOUTS
// ═══════════════════════════════════════════════════════════════════════════════

interface Payout {
  id: string; amount: number; currency: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  method: string; accountNumber: string; createdAt: string; eventTitle?: string;
}
interface PayoutSummary { totalPaid: number; totalPending: number; currency: string; payouts: Payout[]; }

const PAYOUT_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  PAID:       { label: 'Paid',       cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PENDING:    { label: 'Pending',    cls: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500'   },
  PROCESSING: { label: 'Processing', cls: 'bg-blue-50 text-blue-700',       dot: 'bg-blue-500'    },
  FAILED:     { label: 'Failed',     cls: 'bg-red-50 text-red-600',         dot: 'bg-red-400'     },
};

const PAYOUT_METHODS = [
  { value: 'MTN_MOMO',       label: 'MTN Mobile Money' },
  { value: 'ORANGE_MONEY',   label: 'Orange Money' },
  { value: 'BANK_TRANSFER',  label: 'Bank transfer' },
];

function PayoutAccountSection() {
  const [payoutType,     setPayoutType]     = useState('');
  const [payoutNumber,   setPayoutNumber]   = useState('');
  const [payoutBankName, setPayoutBankName] = useState('');
  const [saving,         setSaving]         = useState(false);
  const [msg,            setMsg]            = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch(`${API}/creators/me/profile`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setPayoutType(d.payoutType ?? '');
          setPayoutNumber(d.payoutNumber ?? '');
          setPayoutBankName(d.payoutBankName ?? '');
        }
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!payoutType)               { setMsg({ ok: false, text: 'Select a payout method.' }); return; }
    if (!payoutNumber.trim())      { setMsg({ ok: false, text: 'Account number is required.' }); return; }
    if (payoutType === 'BANK_TRANSFER' && !payoutBankName.trim()) {
      setMsg({ ok: false, text: 'Bank name is required for bank transfers.' }); return;
    }
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`${API}/creators/me/profile`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutType,
          payoutNumber: payoutNumber.trim(),
          payoutBankName: payoutBankName.trim() || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); setMsg({ ok: false, text: d.message ?? 'Failed to save.' }); return; }
      setMsg({ ok: true, text: 'Payout account saved.' });
    } catch { setMsg({ ok: false, text: 'Network error.' }); }
    finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h2 className="mb-1 text-sm font-bold text-slate-700">Payout account</h2>
      <p className="mb-5 text-xs text-slate-400">Where we send your earnings after each event. Must be verified before first payout.</p>
      <form onSubmit={save} className="space-y-4" noValidate>
        <Field label="Payout method">
          <div className="relative">
            <select value={payoutType} onChange={e => setPayoutType(e.target.value)} className={inputCls}>
              <option value="">Select method…</option>
              {PAYOUT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </Field>
        <Field label={payoutType === 'BANK_TRANSFER' ? 'Account number' : 'Mobile number'}>
          <input
            type="text"
            className={inputCls}
            value={payoutNumber}
            onChange={e => setPayoutNumber(e.target.value)}
            placeholder={payoutType === 'BANK_TRANSFER' ? 'e.g. 00123456789' : 'e.g. +237 6XX XXX XXX'}
          />
        </Field>
        {payoutType === 'BANK_TRANSFER' && (
          <Field label="Bank name">
            <input
              type="text"
              className={inputCls}
              value={payoutBankName}
              onChange={e => setPayoutBankName(e.target.value)}
              placeholder="e.g. Afriland First Bank"
            />
          </Field>
        )}
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
        <button type="submit" disabled={saving} className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save payout account'}
        </button>
      </form>
    </div>
  );
}

function TabPayouts() {
  const [data,    setData]    = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch(`${API}/creators/me/payouts`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(setData)
      .catch(() => setError('Could not load payouts.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PayoutAccountSection />

      <p className="text-sm text-slate-500">Revenue is transferred to your registered account within 48 hours of each event ending.</p>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">{error}</div>}

      {/* Summary */}
      {(loading || data) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {loading ? (
            [0, 1].map((i) => <div key={i} className="animate-pulse flex gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100"><div className="h-12 w-12 shrink-0 rounded-xl bg-slate-200" /><div className="flex-1 space-y-2"><div className="h-3 w-1/2 rounded bg-slate-200" /><div className="h-6 w-3/4 rounded bg-slate-200" /></div></div>)
          ) : data ? (
            <>
              <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600"><CheckCircleIcon className="h-6 w-6 text-white" /></div>
                <div><p className="text-xs font-semibold text-slate-500">Total paid out</p><p className="text-2xl font-extrabold text-slate-900">{data.currency} {data.totalPaid.toLocaleString()}</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500"><ClockIcon className="h-6 w-6 text-white" /></div>
                <div><p className="text-xs font-semibold text-slate-500">Pending</p><p className="text-2xl font-extrabold text-slate-900">{data.currency} {data.totalPending.toLocaleString()}</p></div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* History */}
      <section>
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Payout history</h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 space-y-2"><div className="h-4 w-1/2 rounded bg-slate-200" /><div className="h-3 w-1/3 rounded bg-slate-200" /></div>
                  <div className="h-5 w-16 rounded-full bg-slate-200" />
                  <div className="h-5 w-24 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          ) : !data || data.payouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <WalletIcon className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-500">No payouts yet</p>
              <p className="mt-1 text-xs text-slate-400">Payouts appear after your events end and tickets are verified.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.payouts.map((p) => {
                const st = PAYOUT_STATUS[p.status] ?? PAYOUT_STATUS.PENDING;
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{p.eventTitle ?? 'Payout'}</p>
                      <p className="text-xs text-slate-400">{p.method} · {p.accountNumber} · {fmtDate(p.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${st.cls}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />{st.label}
                    </span>
                    <p className="shrink-0 text-sm font-extrabold text-slate-900">{data.currency} {p.amount.toLocaleString()}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
        <p className="mb-1 font-bold text-slate-900">Payout schedule</p>
        <p>Revenue processed within <strong>48 hours</strong> of an event ending. A <strong>5% platform fee</strong> is deducted before transfer.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: WEBHOOKS
// ═══════════════════════════════════════════════════════════════════════════════

interface Webhook {
  id: string; url: string; events: string[]; isActive: boolean;
  createdAt: string; lastDeliveryAt?: string; lastDeliveryStatus?: number;
}

const ALLOWED_EVENTS = ['ticket.paid', 'ticket.checked_in', 'ticket.cancelled', 'event.cancelled'] as const;

function WebhookCard({ webhook, onToggle, onDelete }: { webhook: Webhook; onToggle: (id: string, a: boolean) => void; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm('Delete this webhook endpoint?')) return;
    setDeleting(true);
    try {
      await fetch(`${API}/creators/me/webhooks/${webhook.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      onDelete(webhook.id);
    } catch { toast.error('Failed to delete webhook'); setDeleting(false); }
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full ${webhook.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <p className="truncate font-mono text-sm font-bold text-slate-900">{webhook.url}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {webhook.events.map((e) => <span key={e} className="rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">{e}</span>)}
          </div>
          {webhook.lastDeliveryAt && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              Last delivery: {new Date(webhook.lastDeliveryAt).toLocaleString()} —
              <span className={webhook.lastDeliveryStatus === 200 ? ' font-bold text-emerald-600' : ' font-bold text-red-500'}> {webhook.lastDeliveryStatus ?? '—'}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={() => onToggle(webhook.id, !webhook.isActive)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${webhook.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
            {webhook.isActive ? 'Pause' : 'Enable'}
          </button>
          <button onClick={handleDelete} disabled={deleting} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AddWebhookModal({ onClose, onAdded }: { onClose: () => void; onAdded: (w: Webhook) => void }) {
  const [url,     setUrl]     = useState('');
  const [events,  setEvents]  = useState<string[]>(['ticket.paid']);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function toggleEvent(e: string) { setEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]); }

  async function submit() {
    if (!url.trim()) { setError('URL is required'); return; }
    if (events.length === 0) { setError('Select at least one event'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/creators/me/webhooks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), events }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed'); return; }
      onAdded(data); onClose();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-extrabold text-slate-900">Add webhook endpoint</h2>
        <p className="mt-1 text-sm text-slate-500">Eventful will POST a signed JSON payload to this URL when events occur.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Endpoint URL *</label>
            <input type="url" placeholder="https://yourdomain.com/webhooks/eventful" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700">Subscribe to events *</label>
            <div className="grid grid-cols-2 gap-2">
              {ALLOWED_EVENTS.map((e) => (
                <label key={e} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition ${events.includes(e) ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200'}`}>
                  <input type="checkbox" checked={events.includes(e)} onChange={() => toggleEvent(e)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                  <span className={`text-xs font-bold ${events.includes(e) ? 'text-brand-600' : 'text-slate-600'}`}>{e}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300">Cancel</button>
          <button onClick={submit} disabled={loading} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">{loading ? 'Adding…' : 'Add endpoint'}</button>
        </div>
      </div>
    </div>
  );
}

function TabWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch(`${API}/creators/me/webhooks`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setWebhooks(Array.isArray(data) ? data : (data.webhooks ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(id: string, active: boolean) {
    try {
      const res = await fetch(`${API}/creators/me/webhooks/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: active }),
      });
      if (res.ok) setWebhooks((prev) => prev.map((w) => w.id === id ? { ...w, isActive: active } : w));
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Receive real-time HTTP callbacks when ticket and event actions occur.</p>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-500">
          <PlusIcon className="h-4 w-4" /> Add endpoint
        </button>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50 px-5 py-4 text-sm text-brand-900">
        <p className="mb-1 font-bold">Webhook security</p>
        <p className="text-brand-600">Every request is signed with an <code className="rounded bg-brand-100 px-1 py-0.5 font-mono text-[11px]">X-Eventful-Signature</code> header (HMAC-SHA256). Verify this in your server.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className="h-4 w-3/4 rounded bg-slate-200" /><div className="mt-2 flex gap-2"><div className="h-5 w-20 rounded-md bg-slate-200" /><div className="h-5 w-24 rounded-md bg-slate-200" /></div></div>)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <LockIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No webhook endpoints yet</p>
          <p className="mt-1 text-xs text-slate-400">Add an endpoint to receive real-time notifications.</p>
          <button onClick={() => setShowAdd(true)} className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500">Add your first endpoint</button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((w) => <WebhookCard key={w.id} webhook={w} onToggle={handleToggle} onDelete={(id) => setWebhooks((prev) => prev.filter((x) => x.id !== id))} />)}
        </div>
      )}

      {showAdd && <AddWebhookModal onClose={() => setShowAdd(false)} onAdded={(w) => setWebhooks((prev) => [w, ...prev])} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: API KEYS
// ═══════════════════════════════════════════════════════════════════════════════

interface ApiKey {
  id: string; name: string; prefix: string; secret?: string;
  scopes: string[]; createdAt: string; lastUsedAt?: string;
}

const ALL_SCOPES = [
  { value: 'events:read',    label: 'Events — read'    },
  { value: 'events:write',   label: 'Events — write'   },
  { value: 'tickets:read',   label: 'Tickets — read'   },
  { value: 'analytics:read', label: 'Analytics — read' },
  { value: 'webhooks:write', label: 'Webhooks — write' },
];

function SecretReveal({ secret }: { secret: string }) {
  const [visible, setVisible] = useState(true);
  const [copied,  setCopied]  = useState(false);

  function copy() { navigator.clipboard.writeText(secret).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="mb-2 text-xs font-bold text-emerald-800">API key created — copy it now. It won&apos;t be shown again.</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-xs text-slate-800 ring-1 ring-emerald-200">{visible ? secret : '•'.repeat(secret.length)}</code>
        <button onClick={() => setVisible((v) => !v)} className="rounded-lg p-2 text-slate-500 transition hover:bg-white">{visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}</button>
        <button onClick={copy} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">{copied ? 'Copied!' : 'Copy'}</button>
      </div>
    </div>
  );
}

function NewKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (k: ApiKey) => void }) {
  const [name,    setName]    = useState('');
  const [scopes,  setScopes]  = useState<string[]>(['events:read']);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function toggleScope(s: string) { setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]); }

  async function submit() {
    if (!name.trim()) { setError('Name is required'); return; }
    if (scopes.length === 0) { setError('Select at least one scope'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api-keys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message ?? 'Failed'); return; }
      onCreated(data); onClose();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-extrabold text-slate-900">Create API key</h2>
        <p className="mt-1 text-sm text-slate-500">The secret will only be shown <strong>once</strong>. Store it securely.</p>
        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">Key name *</label>
            <input type="text" placeholder="e.g. Production server" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-slate-700">Scopes *</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ALL_SCOPES.map((s) => (
                <label key={s.value} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 transition ${scopes.includes(s.value) ? 'border-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200'}`}>
                  <input type="checkbox" checked={scopes.includes(s.value)} onChange={() => toggleScope(s.value)} className="h-4 w-4 rounded border-slate-300 text-brand-600" />
                  <span className={`font-mono text-xs font-bold ${scopes.includes(s.value) ? 'text-brand-600' : 'text-slate-600'}`}>{s.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300">Cancel</button>
          <button onClick={submit} disabled={loading} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">{loading ? 'Creating…' : 'Create key'}</button>
        </div>
      </div>
    </div>
  );
}

function TabApiKeys() {
  const [keys,      setKeys]      = useState<ApiKey[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    fetch(`${API}/api-keys`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setKeys(Array.isArray(data) ? data : (data.keys ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await fetch(`${API}/api-keys/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` } });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch { toast.error('Failed to revoke key'); }
  }

  function handleCreated(k: ApiKey) {
    if (k.secret) setNewSecret(k.secret);
    setKeys((prev) => [{ ...k, secret: undefined }, ...prev]);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Use API keys to authenticate server-to-server requests to the Eventful API.</p>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-500">
          <PlusIcon className="h-4 w-4" /> New key
        </button>
      </div>

      {newSecret && <SecretReveal secret={newSecret} />}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <strong>Keep your keys secret.</strong> Never expose them in client-side code or public repositories. Rotate immediately if compromised.
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="animate-pulse rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100"><div className="h-4 w-1/3 rounded bg-slate-200" /><div className="mt-2 h-3 w-1/2 rounded bg-slate-200" /></div>)}
        </div>
      ) : keys.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <LockIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No API keys yet</p>
          <p className="mt-1 text-xs text-slate-400">Create a key to integrate your server with the Eventful API.</p>
          <button onClick={() => setShowNew(true)} className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500">Create your first key</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
          <div className="divide-y divide-slate-100">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{k.name}</p>
                  <code className="font-mono text-xs text-slate-400">{k.prefix}••••••••</code>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {k.scopes.map((s) => <span key={s} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-500">{s}</span>)}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">Created {fmtDate(k.createdAt)}{k.lastUsedAt && ` · Last used ${fmtDate(k.lastUsedAt)}`}</p>
                </div>
                <button onClick={() => handleRevoke(k.id)} className="shrink-0 flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50">
                  <XIcon className="h-3.5 w-3.5" /> Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNew && <NewKeyModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════════

const TAB_ICONS: Record<Tab, React.ComponentType<{ className?: string }>> = {
  General:    LockIcon,
  Analytics:  ChartIcon,
  Payouts:    WalletIcon,
  Webhooks:   LockIcon,
  'API Keys': LockIcon,
};

export default function CreatorSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('General');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your account, analytics, payouts, and developer integrations.</p>
      </div>

      {/* Tab bar */}
      <div className="mb-8 flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap transition ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${activeTab === tab ? 'text-brand-500' : 'text-slate-400'}`} />
              {tab}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'General'    && <TabGeneral />}
      {activeTab === 'Analytics'  && <TabAnalytics />}
      {activeTab === 'Payouts'    && <TabPayouts />}
      {activeTab === 'Webhooks'   && <TabWebhooks />}
      {activeTab === 'API Keys'   && <TabApiKeys />}
    </div>
  );
}
