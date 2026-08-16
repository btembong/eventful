'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL!;
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : ''; }

export default function AnnounceButton({ eventId }: { eventId: string }) {
  const [open,    setOpen]    = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/creators/me/events/${eventId}/announce`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ ok: true, text: data.message ?? 'Announcement sent!' });
        setSubject('');
        setMessage('');
      } else {
        setResult({ ok: false, text: data.error ?? 'Failed to send announcement.' });
      }
    } catch {
      setResult({ ok: false, text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20';

  return (
    <>
      <button
        onClick={() => { setOpen(true); setResult(null); }}
        className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
      >
        Announce
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900">Announce to attendees</h3>
            <p className="mt-1 text-sm text-slate-500">
              Send an email to all confirmed ticket holders for this event.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Subject</label>
                <input
                  className={inputCls}
                  placeholder="Important update about your ticket"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={150}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">Message</label>
                <textarea
                  className={`${inputCls} min-h-[120px] resize-y`}
                  placeholder="Write your message here…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                />
                <p className="mt-1 text-right text-[11px] text-slate-400">{message.length}/2000</p>
              </div>

              {result && (
                <p className={`text-sm font-semibold ${result.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                  {result.text}
                </p>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={loading || !subject.trim() || !message.trim()}
                className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
