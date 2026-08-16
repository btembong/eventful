import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  CheckIcon, CheckCircleIcon, QrCodeIcon, ShieldCheckIcon,
  UsersGroupIcon, LockIcon, ChartIcon, BellIcon, ClockIcon,
  TicketIcon, ArrowRightIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'For Door Staff — Eventful',
  description: 'Scan tickets in under a second. No app install. Forge-proof HMAC validation. Real-time check-in sync for your event team.',
};

// ─── Data ──────────────────────────────────────────────────────────────────

const PLATFORM_STATS = [
  { value: '2M+',    label: 'Tickets scanned' },
  { value: '<1s',    label: 'Validation time' },
  { value: '0',      label: 'Hardware required' },
  { value: '100%',   label: 'Browser-based' },
];

const FEATURES = [
  {
    tag: 'Instant scanning',
    headline: 'Open a link. Scan every ticket. Done.',
    body: "Your event creator adds you to the event. You receive a secure link — no download, no account creation, no app store. Open it in any modern smartphone browser. The scanner activates immediately. Point it at a QR code and you'll see the result in under a second.",
    bullets: [
      'Works on iOS Safari, Android Chrome — no dedicated hardware',
      'Large pass/fail overlay — readable across a crowded entrance',
      'Audible beep on success, buzz on reject — no need to look at screen',
      'Handles bad lighting, worn tickets, and screen brightness variations',
      'Multiple staff can scan simultaneously — no coordination needed',
    ],
    visual: 'scanner',
    dark: false,
  },
  {
    tag: 'Security',
    headline: 'Every QR is HMAC-signed. Fakes are rejected instantly.',
    body: 'Eventful tickets are not just images — every QR code encodes a cryptographic signature tied to the specific ticket, attendee, and event. When you scan, the server verifies the signature in real time. A screenshot, photocopy, or edited ticket will fail the HMAC check immediately, not after a slow lookup.',
    bullets: [
      'HMAC-SHA256 signature on every QR payload',
      'Server-side verification — no client trust required',
      'Replay attack protection — used tickets are permanently flagged',
      'Duplicate detection: second scan of same ticket shows red instantly',
      'Tamper-evident — any edit to the QR breaks the signature',
    ],
    visual: 'security',
    dark: true,
  },
  {
    tag: 'Live sync',
    headline: "Every scan appears on the creator's dashboard in real time.",
    body: 'Staff scans are not batched or delayed. The moment you validate a ticket, the check-in count on the creator\'s overview increments live. The creator can monitor doors from their phone across the venue, watch for anomalies, and send broadcast messages to all staff simultaneously.',
    bullets: [
      'Live check-in counter visible to all creator-role users',
      'Scan log: who scanned which ticket, at what time',
      'Staff activity visible per device — identify slow lanes',
      'Creator can pause a staff member\'s access in real time',
      'End-of-event attendance report generated automatically',
    ],
    visual: 'sync',
    dark: false,
  },
  {
    tag: 'Offline resilience',
    headline: 'Network drops. Scanning keeps going.',
    body: "Events happen in venues with patchy mobile data. Eventful's scanner queues scans locally when the connection drops and silently syncs them the moment connectivity is restored. You will never see a scan blocked by a network timeout.",
    bullets: [
      'Offline scan queue — works without internet after initial load',
      'Auto-sync when connection restores — zero data loss',
      'Visual indicator when offline mode is active',
      'Duplicate check works locally for recently scanned tickets',
      'Full sync log reviewed by creator after the event',
    ],
    visual: 'offline',
    dark: true,
  },
];

const TESTIMONIALS = [
  {
    quote: "I was scanning at the Douala Jazz Festival gate — the QR reader on my phone handled everything. Someone tried to use a screenshot from a friend and it rejected it immediately. No argument, just red screen.",
    name: 'Rodrigue Fouda',
    role: 'Door Security, Douala Jazz Festival',
    initials: 'RF',
    color: 'bg-brand-600',
    stat: '1,200 tickets · 4 staff · 0 issues',
  },
  {
    quote: "I've worked doors for six years — usually we have a handheld scanner that someone forgot to charge. With Eventful I just use my own phone. The link came 20 minutes before doors opened and I was set.",
    name: 'Blanche Nkemdirim',
    role: 'Event Volunteer, Yaoundé Cultural Week',
    initials: 'BN',
    color: 'bg-emerald-700',
    stat: '430 tickets · 2 staff · 18 min setup',
  },
  {
    quote: "The creator could see every scan from backstage in real time. When one of our lanes slowed down she radioed us immediately. Having that visibility completely changed how we managed crowd flow.",
    name: 'Ernest Tchamo',
    role: 'Head of Operations, Ngondo Sports Day',
    initials: 'ET',
    color: 'bg-amber-700',
    stat: '3,800 tickets · 12 staff · live dashboard',
  },
];

const FAQS = [
  {
    q: 'Do I need to create an Eventful account as door staff?',
    a: 'No. Your creator sends you a secure event-specific link. You open it in your browser and the scanner is ready. No registration, no password, no download required.',
  },
  {
    q: 'What phone do I need?',
    a: 'Any modern smartphone with a camera will work. iOS 14+ (Safari) and Android 8+ (Chrome) are supported. No special permissions beyond camera access are required.',
  },
  {
    q: 'What happens if someone tries to use a fake ticket?',
    a: "The scan result will show a large red 'Invalid ticket' screen immediately. The QR signature verification happens on the server in under 200 ms — before the attendee can react. Staff do not need to make a judgment call.",
  },
  {
    q: 'What if someone shows the same ticket twice?',
    a: "The server permanently flags a ticket as used on the first successful scan. Any subsequent scan of the same QR — same phone or different — returns a red 'Already checked in' result with the original scan timestamp.",
  },
  {
    q: 'Can multiple staff scan at the same time?',
    a: 'Yes. There is no coordination needed. Each staff member operates an independent session. Duplicate checks are server-side so two staff scanning simultaneously at different gates cannot both admit the same ticket.',
  },
  {
    q: 'What if the Wi-Fi at the venue is bad?',
    a: 'The scanner queues scans locally and syncs when connectivity returns. Recent scans are cached in the browser so duplicate detection still works offline for tickets already scanned in that session.',
  },
];

// ─── Reusable components ───────────────────────────────────────────────────

function SectionTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-600">
      {label}
    </span>
  );
}

function DarkTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-600/50 bg-brand-900/50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-300">
      {label}
    </span>
  );
}

function Bullet({ text, dark }: { text: string; dark?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-brand-600' : 'bg-brand-100'}`}>
        <CheckIcon className={`h-3 w-3 ${dark ? 'text-brand-300' : 'text-brand-600'}`} />
      </span>
      <span className={`text-sm ${dark ? 'text-white/70' : 'text-slate-600'}`}>{text}</span>
    </li>
  );
}

// ─── Visual mocks ──────────────────────────────────────────────────────────

function ScannerVisual() {
  const scans = [
    { name: 'Amara Nkosi',   time: '19:02:14', tier: 'General',   status: 'ok' },
    { name: 'Bello Yusuf',   time: '19:02:41', tier: 'VIP Table', status: 'ok' },
    { name: 'Scan #3',       time: '19:02:41', tier: '—',         status: 'dup' },
    { name: 'Grace Mbeki',   time: '19:03:07', tier: 'Early Bird',status: 'ok' },
    { name: 'Kofi Asante',   time: '19:03:22', tier: 'General',   status: 'ok' },
  ];
  return (
    <div className="space-y-4">
      {/* Phone mock */}
      <div className="mx-auto w-52 rounded-3xl bg-slate-900 p-3 ring-4 ring-slate-700">
        <div className="overflow-hidden rounded-2xl bg-black">
          <div className="relative flex h-44 items-center justify-center bg-slate-800">
            {/* Camera viewfinder */}
            <div className="absolute inset-4 rounded-xl ring-2 ring-white/20" />
            <div className="absolute left-4 top-4 h-5 w-5 rounded-tl-lg border-l-2 border-t-2 border-brand-400" />
            <div className="absolute right-4 top-4 h-5 w-5 rounded-tr-lg border-r-2 border-t-2 border-brand-400" />
            <div className="absolute bottom-4 left-4 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-brand-400" />
            <div className="absolute bottom-4 right-4 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-brand-400" />
            {/* Scan line */}
            <div className="absolute left-6 right-6 h-0.5 bg-brand-500/80 shadow-[0_0_8px_2px_rgba(99,102,241,0.5)]" style={{ top: '55%' }} />
            {/* QR mock */}
            <QrCodeIcon className="h-16 w-16 text-white/20" />
          </div>
          {/* Status bar */}
          <div className="flex items-center justify-between bg-slate-900 px-3 py-2">
            <p className="text-[10px] font-bold text-white/40">Scanning…</p>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
              <span className="text-[10px] text-brand-400">Live</span>
            </span>
          </div>
        </div>
      </div>
      {/* Recent scan list */}
      <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-slate-700">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent scans</p>
        <div className="space-y-2">
          {scans.map((s, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                s.status === 'ok' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {s.status === 'ok' ? '✓' : '✕'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">{s.name}</p>
                <p className="text-[10px] text-slate-400">{s.tier} · {s.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurityVisual() {
  return (
    <div className="space-y-4">
      {/* Valid ticket */}
      <div className="rounded-2xl bg-emerald-500/10 p-5 ring-1 ring-emerald-500/30">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20">
            <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-emerald-300">Valid ticket</p>
            <p className="text-[11px] text-emerald-400/60">HMAC verified · General Admission</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: 'Attendee',    value: 'Amara Nkosi' },
            { label: 'Ticket ID',   value: 'TKT-39F2A' },
            { label: 'Valid for',   value: 'Douala Jazz Fest' },
            { label: 'Signature',   value: '✓ Authentic' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-white/5 p-2.5">
              <p className="text-[10px] text-emerald-400/50">{label}</p>
              <p className="text-xs font-bold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fake / duplicate */}
      <div className="rounded-2xl bg-red-500/10 p-5 ring-1 ring-red-500/30">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20">
            <LockIcon className="h-5 w-5 text-red-400" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-red-300">Already checked in</p>
            <p className="text-[11px] text-red-400/60">First scan: 19:02:14 — replay blocked</p>
          </div>
        </div>
      </div>

      {/* Forged */}
      <div className="rounded-2xl bg-red-500/10 p-5 ring-1 ring-red-500/30">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/20">
            <ShieldCheckIcon className="h-5 w-5 text-red-400" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-red-300">Invalid ticket</p>
            <p className="text-[11px] text-red-400/60">HMAC signature mismatch — forged QR</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncVisual() {
  return (
    <div className="rounded-2xl bg-slate-900 p-5 ring-1 ring-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Creator overview · Live</p>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-400">Syncing</span>
        </span>
      </div>

      {/* Check-in KPIs */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Checked in',   value: '1,247', color: 'text-emerald-400' },
          { label: 'Remaining',    value: '753',   color: 'text-amber-400' },
          { label: 'Active staff', value: '4',     color: 'text-brand-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white/5 p-3 text-center">
            <p className={`text-lg font-extrabold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Staff activity */}
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Staff scan rate</p>
      {[
        { name: 'Gate A — Rodrigue', scans: 312, pct: 88 },
        { name: 'Gate B — Blanche',  scans: 287, pct: 81 },
        { name: 'Gate C — Ernest',   scans: 391, pct: 100 },
        { name: 'Gate D — Fatima',   scans: 257, pct: 73 },
      ].map(({ name, scans, pct }) => (
        <div key={name} className="mb-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/70">{name}</span>
            <span className="text-[11px] font-bold text-slate-400">{scans} scans</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OfflineVisual() {
  const queue = [
    { id: 'TKT-4A1F', status: 'queued', time: '21:14:02' },
    { id: 'TKT-7B3C', status: 'queued', time: '21:14:09' },
    { id: 'TKT-2D5E', status: 'queued', time: '21:14:17' },
    { id: 'TKT-9F6A', status: 'synced', time: '21:14:22' },
    { id: 'TKT-1C8D', status: 'synced', time: '21:14:22' },
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-brand-900/50 p-4 ring-1 ring-white/10">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20">
            <BellIcon className="h-4 w-4 text-amber-400" />
          </span>
          <div>
            <p className="text-sm font-bold text-white">Offline mode active</p>
            <p className="text-[11px] text-white/40">Scans queued locally · syncing when reconnected</p>
          </div>
        </div>
        <div className="space-y-2">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${item.status === 'synced' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span className="text-xs font-mono text-white/70">{item.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">{item.time}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  item.status === 'synced'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20">
            <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
          </span>
          <div>
            <p className="text-xs font-bold text-emerald-300">Connection restored</p>
            <p className="text-[11px] text-emerald-400/60">5 queued scans synced · 0 conflicts</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureVisual({ visual }: { visual: string }) {
  if (visual === 'scanner')  return <ScannerVisual />;
  if (visual === 'security') return <SecurityVisual />;
  if (visual === 'sync')     return <SyncVisual />;
  if (visual === 'offline')  return <OfflineVisual />;
  return null;
}

// ─── Feature section ───────────────────────────────────────────────────────

function FeatureSection({
  tag, headline, body, bullets, visual, dark, flip,
}: {
  tag: string; headline: string; body: string;
  bullets: string[]; visual: string; dark: boolean; flip?: boolean;
}) {
  return (
    <section className={dark ? 'bg-brand-950' : 'bg-white'}>
      <div className="mx-auto max-w-6xl px-6 py-24 lg:px-8">
        <div className={`grid gap-16 lg:grid-cols-2 lg:items-center ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>

          {/* Copy */}
          <div>
            {dark ? <DarkTag label={tag} /> : <SectionTag label={tag} />}
            <h2 className={`mt-5 text-4xl font-extrabold leading-tight tracking-tight ${dark ? 'text-white' : 'text-slate-900'}`}>
              {headline}
            </h2>
            <p className={`mt-5 text-base leading-relaxed ${dark ? 'text-white/50' : 'text-slate-500'}`}>
              {body}
            </p>
            <ul className="mt-8 space-y-3">
              {bullets.map((b) => <Bullet key={b} text={b} dark={dark} />)}
            </ul>
          </div>

          {/* Visual */}
          <div>
            <FeatureVisual visual={visual} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function StaffPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-950 pt-32 pb-24">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[160px]" />
        {/* Dot texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />

        <div className="relative mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Copy */}
            <div>
              <span className="inline-flex items-center rounded-full border border-brand-600/60 bg-brand-900/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-300">
                For door staff
              </span>
              <h1 className="mt-7 text-5xl font-extrabold leading-tight tracking-tight text-white lg:text-6xl">
                The fastest door<br />in the room.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-white/50">
                Scan any ticket in under a second — from your own smartphone. No hardware. No app store. No setup beyond opening a link. Forge-proof, replay-proof, and fully synced with the creator&apos;s dashboard.
              </p>

              {/* Platform stats */}
              <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                {PLATFORM_STATS.map(({ value, label }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                    <p className="text-2xl font-extrabold text-white">{value}</p>
                    <p className="mt-1 text-[11px] text-white/40">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="flex items-center gap-2 rounded-full bg-brand-600 px-8 py-3.5 text-sm font-bold text-white shadow-xl shadow-brand-600/25 transition hover:bg-brand-500 hover:-translate-y-0.5"
                >
                  Get access as staff
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/events"
                  className="flex items-center gap-2 rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
                >
                  Browse events
                </Link>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-brand-500/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl bg-brand-900 p-6 shadow-2xl ring-1 ring-white/10">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-brand-600">
                      <QrCodeIcon className="h-4 w-4 text-white" />
                    </span>
                    <span className="text-sm font-bold text-white">Eventful Scanner</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-white/40">Gate A — Live</span>
                  </div>
                </div>

                {/* Big pass */}
                <div className="my-5 flex items-center gap-4 rounded-2xl bg-emerald-500/10 p-5 ring-1 ring-emerald-500/30">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-3xl font-black text-emerald-400">
                    ✓
                  </span>
                  <div>
                    <p className="text-xl font-extrabold text-emerald-300">Valid</p>
                    <p className="text-sm font-semibold text-white">Amara Nkosi · VIP Table</p>
                    <p className="mt-0.5 text-[11px] text-emerald-400/60">Davido Timeless Tour · Douala</p>
                  </div>
                </div>

                {/* Counters */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Admitted',  value: '1,247', color: 'text-emerald-400' },
                    { label: 'Rejected',  value: '3',     color: 'text-red-400' },
                    { label: 'Remaining', value: '753',   color: 'text-amber-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl bg-white/5 p-3 text-center">
                      <p className={`text-lg font-extrabold ${color}`}>{value}</p>
                      <p className="text-[10px] text-slate-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="text-center">
            <SectionTag label="How it works" />
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900">
              Up and running in under 2 minutes.
            </h2>
            <p className="mt-4 text-lg text-slate-500">No training session. No IT department. Just three steps.</p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '01',
                Icon: UsersGroupIcon,
                title: 'Get added by the creator',
                desc: 'Your event creator adds your phone number or email to the event from their dashboard. You receive a secure staff access link — valid for that event only.',
              },
              {
                step: '02',
                Icon: QrCodeIcon,
                title: 'Open the scanner',
                desc: 'Click the link on your smartphone. Allow camera access. The scanner interface loads instantly — no app store, no download, no login required.',
              },
              {
                step: '03',
                Icon: CheckCircleIcon,
                title: 'Scan and admit',
                desc: 'Point at any Eventful QR code. You\'ll see a full-screen green pass or red reject result in under a second. That\'s the entire workflow.',
              },
            ].map(({ step, Icon, title, desc }) => (
              <div key={step} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-xs font-black text-brand-600">
                    {step}
                  </span>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
                    <Icon className="h-5 w-5 text-slate-500" />
                  </span>
                </div>
                <h3 className="mt-5 text-base font-extrabold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature sections ─────────────────────────────────────────── */}
      {FEATURES.map((f, i) => (
        <FeatureSection key={f.tag} {...f} flip={i % 2 !== 0} />
      ))}

      {/* ── Security deep-dive ───────────────────────────────────────── */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-brand-950 shadow-2xl">
            <div className="grid lg:grid-cols-2">
              {/* Copy */}
              <div className="p-10 lg:p-14">
                <DarkTag label="HMAC verification" />
                <h2 className="mt-6 text-3xl font-extrabold text-white">
                  Why screenshots and photocopies are useless.
                </h2>
                <p className="mt-4 text-white/50 leading-relaxed">
                  Every ticket QR encodes a JSON payload signed with a secret key unique to your platform instance. The signature covers the ticket ID, attendee ID, event ID, and a server-side timestamp. Changing any field — or just photographing and reprinting the code — breaks the signature. No human judgment is needed to catch it.
                </p>
                <div className="mt-8 space-y-3">
                  {[
                    'Screenshot of a friend\'s ticket → rejected (replay protection)',
                    'Edited QR with different seat → rejected (HMAC mismatch)',
                    'QR for a different event → rejected (event ID mismatch)',
                    'Expired or cancelled ticket → rejected (status check)',
                  ].map((s) => <Bullet key={s} text={s} dark />)}
                </div>
              </div>

              {/* Code block */}
              <div className="flex items-center bg-brand-900 p-8 lg:p-10">
                <pre className="w-full overflow-x-auto rounded-2xl bg-brand-950 p-5 text-[11px] leading-relaxed text-brand-200 ring-1 ring-white/10">{`// QR payload structure
{
  "ticketId":   "TKT-39F2A",
  "eventId":    "EVT-1B7D9",
  "attendeeId": "USR-C4E21",
  "issuedAt":   1712350800,
  "tier":       "VIP Table"
}

// HMAC-SHA256 signature
// key: process.env.QR_SECRET
// payload: JSON.stringify(above)

// On scan — server verifies:
// 1. Signature matches payload ✓
// 2. ticketId exists in DB    ✓
// 3. Status === 'VALID'       ✓
// 4. Not already checked in   ✓
// → Admit attendee`}</pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center">
            <SectionTag label="From door staff" />
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900">
              The team at the gate loves it too.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {TESTIMONIALS.map(({ quote, name, role, initials, color, stat }) => (
              <div key={name} className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50 p-7 shadow-sm">
                <div className="flex items-center gap-1.5 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69z"/>
                    </svg>
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-slate-600">&ldquo;{quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-200 pt-5">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${color}`}>
                    {initials}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-400">{role}</p>
                    <p className="mt-0.5 text-[10px] font-bold text-brand-600">{stat}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature grid ────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="text-center">
            <SectionTag label="Everything included" />
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900">
              Built for the venue, not the office.
            </h2>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: QrCodeIcon,      title: 'Instant QR scanning',       desc: 'Point any smartphone camera at a ticket. Validation result in under a second — no lag, no loading spinner.' },
              { Icon: ShieldCheckIcon, title: 'Forge-proof tickets',        desc: 'HMAC-SHA256 signatures on every QR. Screenshots, photocopies, and edited codes are rejected automatically.' },
              { Icon: CheckCircleIcon, title: 'Replay protection',          desc: 'Already-admitted tickets are permanently flagged. The second scan of a used ticket returns an instant red.' },
              { Icon: UsersGroupIcon,  title: 'No app install needed',      desc: 'Works in iOS Safari and Android Chrome directly. No Play Store, no App Store, no MDM required.' },
              { Icon: ChartIcon,       title: 'Live check-in dashboard',    desc: 'Every scan appears on the creator\'s overview in real time. Staff activity visible per gate and per device.' },
              { Icon: ClockIcon,       title: 'Offline-tolerant scanning',  desc: 'Scans are queued locally if the network drops and synced silently when connectivity returns. Zero data loss.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100">
                  <Icon className="h-5 w-5 text-brand-600" />
                </span>
                <h3 className="mt-5 font-extrabold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="text-center">
            <SectionTag label="FAQ" />
            <h2 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900">
              Common questions.
            </h2>
          </div>
          <div className="mt-14 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="px-7 py-6">
                <h3 className="font-extrabold text-slate-900">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="bg-brand-950 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-brand-900 p-4 mb-6">
            <TicketIcon className="h-8 w-8 text-brand-300" />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
            Ready to run the smoothest door at every event?
          </h2>
          <p className="mt-5 text-lg text-white/50 max-w-xl mx-auto">
            Get access as door staff — or tell your event creator to add you to their next event. Takes 30 seconds.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="flex items-center gap-2 rounded-full bg-brand-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-brand-600/30 transition hover:bg-brand-500 hover:-translate-y-0.5"
            >
              Get access
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/create"
              className="flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 text-base font-semibold text-white/70 transition hover:border-white/40 hover:text-white"
            >
              Creator? Start here
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-brand-950 border-t border-white/10 py-8 text-center text-xs text-white/20">
        &copy; {new Date().getFullYear()} Eventful. All rights reserved.
      </footer>
    </div>
  );
}
