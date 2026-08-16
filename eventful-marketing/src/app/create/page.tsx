import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  CheckIcon, CheckCircleIcon, TicketIcon, ChartIcon, WalletIcon,
  QrCodeIcon, UsersGroupIcon, BellIcon, ShieldCheckIcon, LockIcon,
  CalendarIcon, TagPriceIcon, TrendUpIcon, ArrowRightIcon,
  MicrophoneIcon, BuildingsIcon, StarIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'For Event Creators — Eventful',
  description: 'Sell tickets, track revenue, manage door staff, and get paid — all from one platform built for professional event creators in Cameroon.',
};

// ─── Data ──────────────────────────────────────────────────────────────────

const PLATFORM_STATS = [
  { value: '850+',   label: 'Active creators' },
  { value: '200K+',  label: 'Tickets sold' },
  { value: 'XAF 2B+', label: 'Revenue processed' },
  { value: '40+',    label: 'Cities covered' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create your event',
    desc: 'Fill in your event details — title, venue, date, category, description, cover image. Set visibility to draft or publish immediately. Takes under 5 minutes.',
    tag: 'Event setup',
  },
  {
    step: '02',
    title: 'Set up ticket tiers',
    desc: 'Create multiple price tiers — VIP, Early Bird, General Admission. Set individual capacities, prices in XAF, and per-ticket limits. Tiers sell out independently.',
    tag: 'Ticketing',
  },
  {
    step: '03',
    title: 'Share your link',
    desc: 'Every event gets a clean, shareable URL (eventful.cm/e/your-event-name). Share it on WhatsApp, Instagram, or embed the buy button on your website.',
    tag: 'Distribution',
  },
  {
    step: '04',
    title: 'Track sales in real time',
    desc: 'Watch revenue tick up live. See which tiers are selling fastest, monitor attendance against capacity, and receive instant alerts when you hit milestones.',
    tag: 'Analytics',
  },
  {
    step: '05',
    title: 'Collect your payout',
    desc: 'Within 48 hours of your event ending, the net revenue (minus our 5% fee) lands in your MTN MoMo, Orange Money, or bank account. No manual withdrawal needed.',
    tag: 'Payout',
  },
];

const FEATURES = [
  {
    tag: 'Event management',
    headline: 'Everything about your event, in one place.',
    body: 'Create, edit, cancel, and reschedule events with full metadata support — venue coordinates, age restrictions, dress code, performer info, and per-category custom fields. Set visibility to public or private. Publish instantly or schedule for later. Manage multiple co-organisers with role-based access.',
    bullets: [
      'Rich event metadata per category (Concert, Theater, Sports, Cultural)',
      'Draft → Published → Cancelled lifecycle',
      'Co-organiser access with permission controls',
      'Event cancellation with automatic attendee notification',
      'Shareable slug URL for every event',
    ],
    visual: 'event-management',
    dark: false,
  },
  {
    tag: 'Ticketing & pricing',
    headline: 'Multiple tiers. Smart capacity. Zero hassle.',
    body: 'Configure as many ticket tiers as you need — Early Bird, VIP Tables, General Admission, Backstage Pass. Each tier has its own price, capacity, and per-order limit. Tickets are issued instantly after payment with a HMAC-signed QR code unique to each attendee.',
    bullets: [
      'Unlimited ticket tiers per event',
      'Per-tier capacity caps — sell out independently',
      'Per-order purchase limits to prevent scalping',
      'Free and paid tickets on the same event',
      'HMAC-signed QR codes — cannot be forged',
    ],
    visual: 'ticketing',
    dark: true,
  },
  {
    tag: 'Payments',
    headline: 'MTN MoMo. Orange Money. Cards. All built in.',
    body: 'Eventful uses Tranzak to process payments — the most trusted payment aggregator in Central Africa. Attendees pay with what they already have on their phone. No card required. No friction. Average checkout time under 45 seconds.',
    bullets: [
      'MTN Mobile Money — instant push prompt',
      'Orange Money — seamless USSD flow',
      'Card payments via Tranzak',
      'Payment verification via signed webhooks',
      'Full refund processing from your dashboard',
    ],
    visual: 'payments',
    dark: false,
  },
  {
    tag: 'Real-time analytics',
    headline: 'Know your numbers the moment they change.',
    body: 'Your creator dashboard updates live — no refresh needed. Track daily ticket sales, revenue by tier, check-in velocity, and audience geography. Export any dataset to CSV or XLSX for your finance team or sponsors.',
    bullets: [
      'Live revenue and ticket sales charts',
      'Tier-by-tier sales breakdown',
      'Check-in rate and time-of-arrival heatmap',
      'CSV / XLSX export for reporting',
      'Automated payout receipts with fee breakdown',
    ],
    visual: 'analytics',
    dark: true,
  },
  {
    tag: 'QR check-in',
    headline: 'Fast, secure door management. No hardware.',
    body: 'Assign door staff to your events from the dashboard. They scan QR codes using any smartphone camera — no dedicated scanner needed. Each scan validates the ticket in real time against the server, preventing duplicates instantly. You see the live check-in count on your overview.',
    bullets: [
      'Assign unlimited door staff per event',
      'Real-time server-side validation on every scan',
      'Duplicate scan rejection — cannot reuse a ticket',
      'Live check-in counter visible to the creator',
      'Offline-tolerant: queues scans if network drops',
    ],
    visual: 'checkin',
    dark: false,
  },
  {
    tag: 'Team management',
    headline: 'Run large events with your whole team.',
    body: 'Add co-organisers and door staff to individual events. Each role has scoped permissions — staff can scan tickets but cannot see revenue. Creators can manage events but cannot alter payout settings. Full audit trail for every action taken.',
    bullets: [
      'Creator, Co-organiser, and Door Staff roles',
      'Per-event team membership — not platform-wide',
      'Scoped permissions per role',
      'Complete audit log for accountability',
      'Invite by email — no separate account needed',
    ],
    visual: 'team',
    dark: true,
  },
];

const INTEGRATIONS = [
  {
    name: 'Webhooks',
    icon: LockIcon,
    desc: 'Receive signed HTTP callbacks for ticket.paid, ticket.checked_in, ticket.cancelled, and event.cancelled. Build integrations with your CRM, ERP, or custom backend.',
  },
  {
    name: 'API Keys',
    icon: ShieldCheckIcon,
    desc: 'Scoped API keys let your servers read events, pull ticket data, or trigger actions — without sharing your login. Fine-grained permission model per key.',
  },
  {
    name: 'Email reminders',
    icon: BellIcon,
    desc: 'Automated emails go out at 24 h and 2 h before your event. Includes the QR ticket inline. Powered by Brevo — deliverability-focused, not spam.',
  },
  {
    name: 'Broadcast',
    icon: MicrophoneIcon,
    desc: 'Send a custom announcement to all ticket holders at once — lineup updates, venue changes, pre-event info. Delivered by email and SMS simultaneously.',
  },
];

const TESTIMONIALS = [
  {
    quote: 'We sold 3,200 tickets for the Davido show in under 6 hours. The check-in line moved faster than any event we have done before — staff just scanned phones.',
    name: 'Lionel Kamgaing',
    role: 'Promoter, Douala Concerts SARL',
    initials: 'LK',
    color: 'bg-brand-600',
    events: '12 events · XAF 48M revenue',
  },
  {
    quote: 'The payout hit my MTN account the day after the festival ended. No follow-up emails, no waiting. That alone made me switch from our previous provider.',
    name: 'Awa Ngono',
    role: 'Director, Ngondo Cultural Foundation',
    initials: 'AN',
    color: 'bg-emerald-700',
    events: '5 events · 9,000 attendees',
  },
  {
    quote: 'I set up early-bird pricing that converted to VIP automatically once the first 200 sold. Eventful handled all of that logic — I just set the rules.',
    name: 'Patrick Essono',
    role: 'Independent Music Promoter',
    initials: 'PE',
    color: 'bg-amber-700',
    events: '8 events · 15,000 tickets',
  },
];

const FAQS = [
  {
    q: 'How do I apply to become a creator?',
    a: 'Click "Apply as Creator" and complete the 5-step application: account details, organiser profile, identity document (KYC), payout account, and terms agreement. Applications are reviewed within 2 business days.',
  },
  {
    q: 'Can I publish a free event?',
    a: 'Yes. Free events incur zero fees. You can mix free and paid tiers on the same event — for example, a free general admission tier and a paid VIP tier.',
  },
  {
    q: 'What happens if I need to cancel an event?',
    a: 'You cancel from your dashboard with one click. Eventful automatically notifies all attendees by email. You are responsible for issuing refunds within 7 days — the platform assists with processing.',
  },
  {
    q: 'Can I sell tickets at the door?',
    a: 'Not yet via the platform — all sales are online. However, your door staff can use the check-in scanner to manually mark walk-in attendees as present.',
  },
  {
    q: 'Is there a limit on how many events I can create?',
    a: 'No. Once approved, you can create and publish unlimited events. There are no monthly caps, event caps, or storage limits.',
  },
  {
    q: 'Do you support multiple currencies?',
    a: 'Currently XAF (Central African Franc) is the supported currency for Cameroon-based events. Additional currencies are on the roadmap.',
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

// ─── Dashboard preview card ────────────────────────────────────────────────

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Glow */}
      <div className="absolute inset-0 rounded-3xl bg-brand-500/20 blur-3xl" />
      <div className="relative overflow-hidden rounded-3xl bg-brand-900 shadow-2xl ring-1 ring-white/10">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600">
              <TicketIcon className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-sm font-bold text-white">Creator dashboard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-white/40">Live</span>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-3 p-5">
          {[
            { label: 'Revenue',    value: 'XAF 14.2M', up: '+22%',  color: 'text-emerald-400' },
            { label: 'Tickets',    value: '3,247',      up: '+18%',  color: 'text-emerald-400' },
            { label: 'Check-ins',  value: '1,891',      up: '58.2%', color: 'text-amber-400' },
            { label: 'Events',     value: '4 active',   up: '',      color: 'text-brand-300' },
          ].map(({ label, value, up, color }) => (
            <div key={label} className="rounded-xl bg-white/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">{label}</p>
              <p className="mt-1.5 text-lg font-extrabold text-white">{value}</p>
              {up && <p className={`text-[10px] font-bold ${color}`}>{up}</p>}
            </div>
          ))}
        </div>

        {/* Mini chart bar */}
        <div className="px-5 pb-2">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">Tickets sold — last 7 days</p>
          <div className="flex h-14 items-end gap-1">
            {[40, 65, 50, 85, 70, 95, 72].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: `rgba(99,102,241,${0.4 + h / 200})` }} />
            ))}
          </div>
        </div>

        {/* Recent event row */}
        <div className="border-t border-white/10 px-5 py-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-white/30">Recent event</p>
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-emerald-500" />
            <div className="flex-1">
              <p className="text-xs font-bold text-white">Davido Timeless World Tour — Douala</p>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-[65%] rounded-full bg-brand-500" />
              </div>
            </div>
            <span className="text-[10px] font-bold text-brand-300">65%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature visual mocks ──────────────────────────────────────────────────

function TicketingVisual() {
  const tiers = [
    { name: 'Early Bird',  price: 'XAF 8,000',  sold: 200, cap: 200, full: true },
    { name: 'General',     price: 'XAF 15,000', sold: 847, cap: 2000, full: false },
    { name: 'VIP Table',   price: 'XAF 80,000', sold: 12,  cap: 50,  full: false },
  ];
  return (
    <div className="rounded-2xl bg-brand-900/50 p-5 ring-1 ring-white/10">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-300">Ticket tiers</p>
      <div className="space-y-3">
        {tiers.map((t) => {
          const pct = Math.round((t.sold / t.cap) * 100);
          return (
            <div key={t.name} className="rounded-xl bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">{t.name}</span>
                  {t.full && <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">SOLD OUT</span>}
                </div>
                <span className="text-sm font-extrabold text-brand-300">{t.price}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full rounded-full ${t.full ? 'bg-amber-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-bold text-white/40">{t.sold}/{t.cap}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsVisual() {
  const bars = [28, 45, 62, 51, 88, 74, 91, 68, 52, 79, 95, 83, 71, 60];
  return (
    <div className="rounded-2xl bg-brand-900/50 p-5 ring-1 ring-white/10">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-300">Revenue — last 14 days</p>
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400">+34.2% vs last month</span>
      </div>
      <div className="flex h-24 items-end gap-1">
        {bars.map((h, i) => (
          <div
            key={i}
            className="group flex-1 rounded-t-sm"
            style={{ height: `${h}%`, background: `rgba(99,102,241,${0.3 + h / 150})` }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'Total revenue',  value: 'XAF 48.7M' },
          { label: 'Avg ticket',     value: 'XAF 15,000' },
          { label: 'Refund rate',    value: '1.2%' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-white/5 p-3 text-center">
            <p className="text-sm font-extrabold text-white">{value}</p>
            <p className="text-[10px] text-white/40">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckinVisual() {
  const scans = [
    { name: 'Amara Nkosi',  time: '19:02', status: 'ok' },
    { name: 'Bello Yusuf',  time: '19:03', status: 'ok' },
    { name: 'Scan error',   time: '19:03', status: 'dup' },
    { name: 'Grace Mbeki',  time: '19:04', status: 'ok' },
    { name: 'Kofi Asante',  time: '19:05', status: 'ok' },
  ];
  return (
    <div className="rounded-2xl bg-slate-900 p-5 ring-1 ring-slate-700">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Live check-in feed</p>
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          1,891 / 3,247
        </span>
      </div>
      <div className="space-y-2">
        {scans.map((s, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${s.status === 'dup' ? 'bg-red-500/10' : 'bg-white/5'}`}>
            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.status === 'dup' ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
              {s.status === 'ok'
                ? <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
                : <span className="text-[10px] font-extrabold text-red-400">DUP</span>
              }
            </div>
            <span className="flex-1 text-xs font-semibold text-white">{s.name}</span>
            <span className="text-[10px] text-slate-500">{s.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamVisual() {
  const members = [
    { name: 'You (Creator)',    role: 'Creator',       color: 'bg-brand-600', perms: ['Events', 'Revenue', 'Staff', 'Payouts'] },
    { name: 'Aminata Diallo',   role: 'Co-organiser',  color: 'bg-purple-700', perms: ['Events', 'Revenue'] },
    { name: 'Nji Emmanuel',     role: 'Door Staff',    color: 'bg-emerald-700', perms: ['Check-in'] },
    { name: 'Brice Fotso',      role: 'Door Staff',    color: 'bg-emerald-700', perms: ['Check-in'] },
  ];
  return (
    <div className="rounded-2xl bg-brand-900/50 p-5 ring-1 ring-white/10">
      <p className="mb-4 text-xs font-bold uppercase tracking-wider text-brand-300">Event team</p>
      <div className="space-y-2.5">
        {members.map((m) => (
          <div key={m.name} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.color} text-xs font-extrabold text-white`}>
              {m.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{m.name}</p>
              <p className="text-[10px] text-white/40">{m.role}</p>
            </div>
            <div className="flex gap-1">
              {m.perms.map((p) => (
                <span key={p} className="rounded-md bg-brand-600/50 px-1.5 py-0.5 text-[9px] font-bold text-brand-300">{p}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventManagementVisual() {
  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-extrabold text-slate-900">Davido Timeless World Tour</p>
          <p className="text-xs text-slate-400">Palais des Sports de Douala · Sat 14 Feb 2026</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">On sale</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-slate-100">
        {[
          { label: 'Category',    value: 'Concert' },
          { label: 'Capacity',    value: '5,000' },
          { label: 'Visibility',  value: 'Public' },
          { label: 'Co-hosts',    value: '2 added' },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="text-sm font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-100 px-5 py-3 flex gap-2">
        <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-600">Edit event</span>
        <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">Share link</span>
        <span className="rounded-lg bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600">Broadcast</span>
      </div>
    </div>
  );
}

function PaymentsVisual() {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-bold text-slate-500 mb-4">Attendee checkout — under 45 seconds</p>
        <div className="space-y-2.5">
          {[
            { method: 'MTN Mobile Money', emoji: '🟡', sub: 'Push prompt sent to +237 6XX XXX XXX', done: true },
            { method: 'Orange Money',     emoji: '🟠', sub: 'USSD flow initiated',                  done: false },
            { method: 'Card payment',     emoji: '💳', sub: 'Via Tranzak secure checkout',           done: false },
          ].map(({ method, emoji, sub, done }) => (
            <div key={method} className={`flex items-center gap-3 rounded-xl border-2 p-3 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
              <span className="text-xl">{emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${done ? 'text-emerald-800' : 'text-slate-700'}`}>{method}</p>
                <p className={`text-[11px] ${done ? 'text-emerald-600' : 'text-slate-400'}`}>{sub}</p>
              </div>
              {done && <CheckCircleIcon className="h-5 w-5 text-emerald-500 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4">
        <div>
          <p className="text-xs text-slate-400">Ticket issued</p>
          <p className="text-sm font-bold text-white">QR code sent to attendee</p>
        </div>
        <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
      </div>
    </div>
  );
}

// ─── Feature section ──────────────────────────────────────────────────────

function FeatureSection({
  tag, headline, body, bullets, visual, dark, flip,
}: {
  tag: string; headline: string; body: string; bullets: string[];
  visual: string; dark: boolean; flip: boolean;
}) {
  function Visual() {
    if (visual === 'event-management') return <EventManagementVisual />;
    if (visual === 'ticketing')        return <TicketingVisual />;
    if (visual === 'payments')         return <PaymentsVisual />;
    if (visual === 'analytics')        return <AnalyticsVisual />;
    if (visual === 'checkin')          return <CheckinVisual />;
    if (visual === 'team')             return <TeamVisual />;
    return null;
  }

  return (
    <section className={`py-20 px-4 ${dark ? 'bg-brand-950' : 'bg-white'}`}>
      <div className={`mx-auto max-w-6xl grid gap-12 lg:grid-cols-2 lg:items-center ${flip ? 'lg:gap-16' : ''}`}>
        <div className={flip ? 'lg:order-2' : ''}>
          {dark ? <DarkTag label={tag} /> : <SectionTag label={tag} />}
          <h2 className={`mt-5 text-3xl font-extrabold leading-tight tracking-tight ${dark ? 'text-white' : 'text-slate-900'} sm:text-4xl`}>
            {headline}
          </h2>
          <p className={`mt-4 text-base leading-relaxed ${dark ? 'text-white/50' : 'text-slate-500'}`}>{body}</p>
          <ul className="mt-6 space-y-3">
            {bullets.map((b) => <Bullet key={b} text={b} dark={dark} />)}
          </ul>
        </div>
        <div className={flip ? 'lg:order-1' : ''}>
          <Visual />
        </div>
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function CreatePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-950 pb-24 pt-28">
        {/* Background gradient blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-brand-600/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Left — copy */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-600/60 bg-brand-900/60 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                Professional event creators
              </span>
              <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
                Sell out every show.<br />
                <span className="text-brand-400">Get paid automatically.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-white/50 leading-relaxed">
                Eventful gives you ticketing, payments, analytics, QR check-in, team management, and payout — all from one platform built for Cameroon.
              </p>

              {/* Social proof stat row */}
              <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
                {PLATFORM_STATS.map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-xl font-extrabold text-white">{value}</p>
                    <p className="text-xs text-white/40">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/become-creator"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-extrabold text-white shadow-xl shadow-brand-600/30 transition hover:bg-brand-500 hover:-translate-y-0.5"
                >
                  Apply as Creator
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-white/15 px-7 py-3.5 text-sm font-bold text-white/80 transition hover:border-white/30 hover:text-white"
                >
                  See pricing
                </Link>
              </div>

              <p className="mt-5 text-xs text-white/25">
                Free to apply · 5% fee on paid tickets only · No monthly subscription
              </p>
            </div>

            {/* Right — dashboard preview */}
            <DashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Trust logos / category bar ─────────────────────────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50 py-10 px-4">
        <div className="mx-auto max-w-5xl">
          <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
            Platform built for every event type
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: '🎵', label: 'Concerts & Festivals' },
              { icon: '🎭', label: 'Theater & Shows' },
              { icon: '⚽', label: 'Sports Events' },
              { icon: '🏛', label: 'Cultural Events' },
              { icon: '🎓', label: 'Conferences' },
              { icon: '🍽', label: 'Galas & Dinners' },
              { icon: '🎨', label: 'Art Exhibitions' },
              { icon: '🕺', label: 'Club Nights' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 rounded-xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-100">
                <span className="text-lg">{icon}</span>
                <span className="text-xs font-bold text-slate-700">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="py-24 px-4 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <SectionTag label="How it works" />
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              From idea to sold-out show in 5 steps
            </h2>
            <p className="mt-3 text-slate-500">No training required. No complicated setup. Just publish and sell.</p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute left-[19px] top-8 bottom-8 w-px bg-slate-100 hidden sm:block" />

            <div className="space-y-8">
              {HOW_IT_WORKS.map(({ step, title, desc, tag }, i) => (
                <div key={step} className="relative flex gap-5">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${i < 2 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {step}
                    </div>
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[10px] font-bold text-brand-600">{tag}</span>
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 text-center">
            <Link
              href="/become-creator"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3.5 text-sm font-extrabold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
            >
              Start your application
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature sections (alternating) ─────────────────────────────────── */}
      {FEATURES.map((f, i) => (
        <FeatureSection
          key={f.tag}
          {...f}
          flip={i % 2 === 1}
        />
      ))}

      {/* ── Developer / integrations ────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 px-4 border-y border-slate-100">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <SectionTag label="Integrations & API" />
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
              Built for developers too.
            </h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              Automate your workflows, sync to your CRM, or build a fully custom checkout — the Eventful API gives you full programmatic access.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {INTEGRATIONS.map(({ name, icon: Icon, desc }) => (
              <div key={name} className="flex gap-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{name}</p>
                  <p className="mt-1 text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Code snippet teaser */}
          <div className="mt-8 overflow-hidden rounded-2xl bg-slate-900 p-6 shadow-sm">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Webhook payload — ticket.paid</p>
            <pre className="overflow-x-auto text-xs text-slate-300 leading-relaxed font-mono">{`POST https://yourdomain.com/webhooks/eventful
X-Eventful-Signature: sha256=...
Content-Type: application/json

{
  "event": "ticket.paid",
  "createdAt": "2026-02-14T19:03:42.000Z",
  "data": {
    "ticketId": "tk_01JK3...",
    "eventId":  "ev_01JK2...",
    "paymentId": "pm_01JK1...",
    "amount":    "15000",
    "currency":  "XAF",
    "paidAt":    "2026-02-14T19:03:41.000Z"
  }
}`}</pre>
          </div>
        </div>
      </section>

      {/* ── Pricing callout ─────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionTag label="Pricing" />
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
                One simple fee.<br />No surprises.
              </h2>
              <p className="mt-4 text-slate-500 leading-relaxed">
                We charge 5% on paid ticket sales only. That fee is deducted from your payout — not added to the ticket price.
                Free events are always free to list, no matter how many attendees.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  'No monthly subscription',
                  'No setup fee',
                  'No per-event fee',
                  'Free events always free',
                  'Transparent payout receipts',
                ].map((b) => <Bullet key={b} text={b} />)}
              </ul>
              <Link href="/pricing" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-500 transition">
                See full pricing breakdown
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl bg-slate-900 p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Fee breakdown — example event</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Ticket price',       value: 'XAF 15,000', cls: 'text-white' },
                  { label: 'Platform fee (5%)',   value: '− XAF 750',  cls: 'text-red-400' },
                  { label: 'You receive',          value: 'XAF 14,250', cls: 'text-emerald-400 font-extrabold text-lg' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <span className="text-sm text-slate-400">{label}</span>
                    <span className={`font-mono text-sm ${cls}`}>{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-white/5 px-4 py-3">
                <p className="text-[11px] text-slate-400">
                  On a 3,000-seat event at XAF 15,000: you keep <strong className="text-white">XAF 42,750,000</strong> after the 5% fee.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 px-4 border-y border-slate-100">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <SectionTag label="Creator stories" />
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">
              Built by creators, for creators.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map(({ quote, name, role, initials, color, events }) => (
              <div key={name} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4 text-amber-400" />
                  ))}
                </div>
                <p className="flex-1 text-sm text-slate-600 leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color} text-sm font-extrabold text-white`}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-400">{role}</p>
                    <p className="text-[11px] text-brand-600 font-bold mt-0.5">{events}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Enterprise ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 bg-white">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl bg-brand-950 p-10 lg:p-14">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <DarkTag label="Enterprise" />
                <h2 className="mt-5 text-3xl font-extrabold text-white leading-tight">
                  Running large-scale events or a venue?
                </h2>
                <p className="mt-4 text-white/50 leading-relaxed">
                  For stadium events, festival organisers, and multi-venue operators, we offer custom pricing, dedicated account management, SLA guarantees, and deep API integration support.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    'Volume discounts on the platform fee',
                    'Dedicated account manager',
                    'Custom payout schedules',
                    'Priority infrastructure and 99.9% SLA',
                    'Custom API integration support',
                    'White-label option for your brand',
                  ].map((b) => <Bullet key={b} text={b} dark />)}
                </ul>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href="mailto:enterprise@eventful.cm"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-extrabold text-brand-600 transition hover:bg-brand-50"
                  >
                    Contact our sales team
                  </a>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-white/15 px-7 py-3 text-sm font-bold text-white/80 transition hover:border-white/30"
                  >
                    Compare plans
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '50K+',   label: 'Largest single event', icon: UsersGroupIcon },
                  { value: '99.9%',  label: 'Platform uptime SLA',  icon: ShieldCheckIcon },
                  { value: '< 2 s',  label: 'QR scan validation',   icon: QrCodeIcon },
                  { value: '48 h',   label: 'Standard payout time', icon: WalletIcon },
                ].map(({ value, label, icon: Icon }) => (
                  <div key={label} className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
                    <Icon className="h-6 w-6 text-brand-400 mb-3" />
                    <p className="text-2xl font-extrabold text-white">{value}</p>
                    <p className="text-xs text-white/40 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 px-4 border-t border-slate-100">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">Frequently asked questions</h2>
            <p className="mt-2 text-slate-500">
              More questions? Email <a href="mailto:creators@eventful.cm" className="text-brand-600 hover:underline font-semibold">creators@eventful.cm</a>
            </p>
          </div>
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 divide-y divide-slate-100">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="px-6 py-5">
                <p className="text-sm font-bold text-slate-900">{q}</p>
                <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="bg-brand-950 py-24 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600">
            <TicketIcon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Ready to sell your first ticket?
          </h2>
          <p className="mt-4 text-white/40 max-w-lg mx-auto">
            Apply today, publish your first event in minutes, and start collecting revenue.
            Our team reviews applications within 2 business days.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/become-creator"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-brand-600/30 transition hover:bg-brand-500 hover:-translate-y-0.5"
            >
              Apply as a Creator
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/events"
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/15 px-8 py-4 text-base font-bold text-white/70 transition hover:border-white/30 hover:text-white"
            >
              Browse live events
            </Link>
          </div>
          <p className="mt-6 text-xs text-white/20">
            Free to apply · 5% fee on paid tickets only · MTN MoMo & Orange Money payouts
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-brand-950 border-t border-white/5 py-8 text-center text-xs text-white/20">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          <span>&copy; {new Date().getFullYear()} Eventful</span>
          <Link href="/privacy" className="hover:text-white/40 transition">Privacy</Link>
          <Link href="/terms" className="hover:text-white/40 transition">Terms</Link>
          <Link href="/pricing" className="hover:text-white/40 transition">Pricing</Link>
          <a href="mailto:creators@eventful.cm" className="hover:text-white/40 transition">creators@eventful.cm</a>
        </div>
      </footer>
    </div>
  );
}
