'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL!;

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : ''; }

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20';

// ─── Section wrapper ─────────────────────────────────────────────────────────

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

// ─── Sessions panel ──────────────────────────────────────────────────────────

type Session = {
  jti: string;
  iat: number;
  exp: number;
};

function SessionsPanel() {
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [loading, setLoading]       = useState(true);
  const [revoking, setRevoking]     = useState<string | null>(null);
  const [currentJti, setCurrentJti] = useState<string>('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/sessions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions ?? data);

      // Decode current jti from access token
      const token = getToken();
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setCurrentJti(payload.jti ?? '');
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function revoke(jti: string) {
    setRevoking(jti);
    await fetch(`${API}/auth/sessions/${jti}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
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

  if (loading) {
    return <p className="text-sm text-slate-400 animate-pulse">Loading sessions…</p>;
  }

  return (
    <div className="space-y-3">
      {sessions.length === 0 && (
        <p className="text-sm text-slate-400">No active sessions found.</p>
      )}
      {sessions.map((s) => {
        const isCurrent = s.jti === currentJti;
        const issuedAt  = new Date(s.iat * 1000).toLocaleString();
        const expiresAt = new Date(s.exp * 1000).toLocaleString();
        return (
          <div key={s.jti} className={`flex items-start justify-between gap-4 rounded-xl border p-4 ${isCurrent ? 'border-brand-200 bg-brand-50' : 'border-slate-100 bg-white'}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  {isCurrent ? 'This device' : 'Other session'}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-600">Current</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">Issued {issuedAt} · Expires {expiresAt}</p>
              <p className="text-[11px] text-slate-300 font-mono mt-0.5">{s.jti.slice(0, 16)}…</p>
            </div>
            {!isCurrent && (
              <button
                onClick={() => revoke(s.jti)}
                disabled={revoking === s.jti}
                className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
              >
                {revoking === s.jti ? 'Revoking…' : 'Revoke'}
              </button>
            )}
          </div>
        );
      })}
      {otherSessions.length > 1 && (
        <button
          onClick={revokeAll}
          disabled={revoking === 'all'}
          className="mt-2 rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40"
        >
          {revoking === 'all' ? 'Revoking…' : `Revoke all other sessions (${otherSessions.length})`}
        </button>
      )}
    </div>
  );
}

// ─── Delete Account Modal ────────────────────────────────────────────────────

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <h3 className="text-lg font-extrabold text-slate-900">Delete account?</h3>
        <p className="mt-2 text-sm text-slate-500">
          This permanently scrubs your personal data. Your ticket history is retained for accounting. Type <strong>DELETE</strong> to confirm.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <input
          className={`${inputCls} mt-4`}
          placeholder="DELETE"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Profile state
  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [phone,       setPhone]       = useState('');
  const [profileMsg,  setProfileMsg]  = useState<{ ok: boolean; text: string } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password change state
  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [pwLoading,  setPwLoading]  = useState(false);
  const [pwMsg,      setPwMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  // Load user from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        setFullName(u.fullName ?? '');
        setEmail(u.email ?? '');
        setPhone(u.phone ?? '');
      }
    } catch {}
  }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch(`${API}/account`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() || undefined }),
      });
      if (!res.ok) { const d = await res.json(); setProfileMsg({ ok: false, text: d.message ?? 'Failed to save.' }); return; }
      const updated = await res.json();
      // Update localStorage
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        localStorage.setItem('user', JSON.stringify({ ...u, ...updated }));
      }
      setProfileMsg({ ok: true, text: 'Profile saved.' });
    } catch {
      setProfileMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 8) { setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Passwords do not match.' }); return; }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const res = await fetch(`${API}/auth/change-password`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (!res.ok) { const d = await res.json(); setPwMsg({ ok: false, text: d.message ?? 'Failed to change password.' }); return; }
      setPwMsg({ ok: true, text: 'Password updated successfully.' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      setPwMsg({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setPwLoading(false);
    }
  }

  const initial = fullName ? fullName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {showDeleteModal && <DeleteAccountModal onClose={() => setShowDeleteModal(false)} />}

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account preferences.</p>
      </div>

      <div className="space-y-6">

        {/* Profile */}
        <Section title="Profile">
          <form onSubmit={saveProfile} noValidate>
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-extrabold text-white">
                {initial}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{fullName || 'Your name'}</p>
                <p className="text-xs text-slate-400">{email}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
              </Field>
              <Field label="Email address">
                <input type="email" className={`${inputCls} cursor-not-allowed opacity-60`} value={email} readOnly title="Email cannot be changed" />
              </Field>
              <Field label="Phone number">
                <input type="tel" className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 6XX XXX XXX" />
              </Field>
            </div>
            {profileMsg && (
              <p className={`mt-3 text-sm ${profileMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{profileMsg.text}</p>
            )}
            <button
              type="submit"
              disabled={profileSaving}
              className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
            >
              {profileSaving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </Section>

        {/* Security */}
        <Section title="Security">
          <form onSubmit={changePassword} className="space-y-4" noValidate>
            <Field label="Current password">
              <input type="password" className={inputCls} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} placeholder="••••••••" />
            </Field>
            <Field label="New password">
              <input type="password" className={inputCls} value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="At least 8 characters" />
            </Field>
            <Field label="Confirm new password">
              <input type="password" className={inputCls} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="••••••••" />
            </Field>
            {pwMsg && (
              <p className={`text-sm ${pwMsg.ok ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg.text}</p>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {pwLoading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </Section>

        {/* Active sessions */}
        <Section title="Active sessions">
          <p className="mb-4 text-xs text-slate-400">These are all the devices currently signed in to your account. Revoke any you don't recognise.</p>
          <SessionsPanel />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <div className="space-y-4">
            {[
              { label: 'Ticket confirmations',  sub: 'Email me when I purchase a ticket',       checked: true },
              { label: 'Event reminders',        sub: '24h before an event I\'m attending',      checked: true },
              { label: 'New events nearby',      sub: 'Weekly digest of events in my city',      checked: false },
              { label: 'Promoter updates',       sub: 'News from event creators I follow',       checked: false },
            ].map(({ label, sub, checked }) => (
              <div key={label} className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={checked}
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-brand-600' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${checked ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
            ))}
          </div>
        </Section>

        {/* Data portability */}
        <Section title="Your data">
          <p className="mb-4 text-xs text-slate-400">Download all your personal data as a JSON file (GDPR right to portability).</p>
          <a
            href={`${API}/account/export`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Export my data
          </a>
        </Section>

        {/* Danger zone */}
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <h2 className="mb-1 text-sm font-bold text-red-700">Delete account</h2>
          <p className="mb-4 text-xs text-red-500">Permanently delete your account and scrub your personal data. This cannot be undone.</p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white"
          >
            Delete my account
          </button>
        </div>

      </div>
    </div>
  );
}
