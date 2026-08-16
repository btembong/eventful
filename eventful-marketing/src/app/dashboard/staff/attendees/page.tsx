import { UsersGroupIcon, QrCodeIcon, TicketIcon } from '@/components/icons';
import Link from 'next/link';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Attendee {
  id: string;
  name: string;
  email: string;
  ticketRef: string;
  qty: number;
  checkedInAt: string | null;
  status: 'VALID' | 'USED' | 'CANCELLED';
}

// ─── Mock data ─────────────────────────────────────────────────────────────

const MOCK: Attendee[] = [
  { id: 'a1', name: 'Amara Nkosi',      email: 'amara@example.com',    ticketRef: 'TK-00142', qty: 2, checkedInAt: new Date(Date.now() - 10 * 60_000).toISOString(), status: 'USED' },
  { id: 'a2', name: 'Brice Mvondo',     email: 'brice@example.com',    ticketRef: 'TK-00143', qty: 1, checkedInAt: new Date(Date.now() - 25 * 60_000).toISOString(), status: 'USED' },
  { id: 'a3', name: 'Chioma Okafor',    email: 'chioma@example.com',   ticketRef: 'TK-00144', qty: 3, checkedInAt: null, status: 'VALID' },
  { id: 'a4', name: 'Dieudonne Fon',    email: 'dieudo@example.com',   ticketRef: 'TK-00145', qty: 1, checkedInAt: null, status: 'VALID' },
  { id: 'a5', name: 'Emeka Obi',        email: 'emeka@example.com',    ticketRef: 'TK-00146', qty: 2, checkedInAt: null, status: 'CANCELLED' },
  { id: 'a6', name: 'Fatou Diallo',     email: 'fatou@example.com',    ticketRef: 'TK-00147', qty: 1, checkedInAt: new Date(Date.now() - 5 * 60_000).toISOString(),  status: 'USED' },
  { id: 'a7', name: 'Grace Eto',        email: 'grace@example.com',    ticketRef: 'TK-00148', qty: 1, checkedInAt: null, status: 'VALID' },
  { id: 'a8', name: 'Hassan Bello',     email: 'hassan@example.com',   ticketRef: 'TK-00149', qty: 2, checkedInAt: null, status: 'VALID' },
];

const STATUS_PILL: Record<string, { label: string; cls: string; dot: string }> = {
  VALID:     { label: 'Not arrived',  cls: 'bg-slate-100 text-slate-500',     dot: 'bg-slate-400' },
  USED:      { label: 'Checked in',   cls: 'bg-emerald-50 text-emerald-700',  dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled',    cls: 'bg-red-50 text-red-600',          dot: 'bg-red-400' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function StaffAttendeesPage() {
  const total      = MOCK.length;
  const checkedIn  = MOCK.filter((a) => a.status === 'USED').length;
  const notArrived = MOCK.filter((a) => a.status === 'VALID').length;
  const cancelled  = MOCK.filter((a) => a.status === 'CANCELLED').length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Attendees</h1>
          <p className="mt-1 text-sm text-slate-500">Davido Timeless World Tour — Douala</p>
        </div>
        <Link
          href="/dashboard/staff"
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
        >
          <QrCodeIcon className="h-4 w-4" />
          Scan tickets
        </Link>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Total',      value: total,      cls: 'text-slate-900', bg: 'bg-white' },
          { label: 'Checked in', value: checkedIn,  cls: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Not arrived',value: notArrived, cls: 'text-slate-600', bg: 'bg-slate-50' },
        ].map(({ label, value, cls, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 ring-1 ring-slate-100 text-center shadow-sm`}>
            <p className={`text-2xl font-extrabold ${cls}`}>{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>{checkedIn} checked in</span>
          <span className="font-bold text-brand-600">{Math.round((checkedIn / total) * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.round((checkedIn / total) * 100)}%` }}
          />
        </div>
      </div>

      {/* Attendee list */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {/* Table header */}
        <div className="hidden grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-slate-100 px-5 py-3 sm:grid">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Attendee</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ticket</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Checked in</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
        </div>

        <div className="divide-y divide-slate-100">
          {MOCK.map((a) => {
            const st = STATUS_PILL[a.status];
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid sm:grid-cols-[1fr_auto_auto_auto]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-extrabold text-brand-600">
                      {a.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{a.name}</p>
                      <p className="truncate text-xs text-slate-400">{a.email}</p>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-mono text-xs text-slate-600">{a.ticketRef}</p>
                  <p className="text-[10px] text-slate-400">×{a.qty}</p>
                </div>
                <p className="text-xs text-slate-500">
                  {a.checkedInAt ? fmtTime(a.checkedInAt) : '—'}
                </p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${st.cls}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {cancelled > 0 && (
        <p className="mt-4 text-center text-xs text-slate-400">{cancelled} cancelled ticket{cancelled > 1 ? 's' : ''} hidden</p>
      )}
    </div>
  );
}
