import type { ComponentType } from 'react';
import Navbar from '@/components/Navbar';
import TicketCard from '@/components/TicketCard';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  TicketIcon,
  MusicNoteIcon,
  MaskIcon,
  BasketballIcon,
  BuildingsIcon,
  TagPriceIcon,
  ShieldCheckIcon,
  WalletIcon,
  QrCodeIcon,
} from '@/components/icons';

// ─── Category config (display labels mapped to API enum values) ───────────────

const CATEGORY_META: Array<{
  apiValue: string;
  name: string;
  Icon: ComponentType<{ className?: string }>;
  desc: string;
}> = [
  { apiValue: 'CONCERT',  name: 'Concerts', Icon: MusicNoteIcon,  desc: 'Live music, festivals' },
  { apiValue: 'THEATER',  name: 'Theater',  Icon: MaskIcon,       desc: 'Plays, musicals, shows' },
  { apiValue: 'SPORTS',   name: 'Sports',   Icon: BasketballIcon, desc: 'Football, basketball & more' },
  { apiValue: 'CULTURAL', name: 'Cultural', Icon: BuildingsIcon,  desc: 'Art, heritage, exhibitions' },
  { apiValue: 'OTHER',    name: 'Other',    Icon: TagPriceIcon,   desc: 'More great events' },
];

async function fetchCategoryCounts(): Promise<Record<string, number>> {
  try {
    const results = await Promise.all(
      CATEGORY_META.map(async ({ apiValue }) => {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/events?category=${apiValue}&limit=1`,
          { next: { revalidate: 60 } },
        );
        if (!res.ok) return { apiValue, total: 0 };
        const data = await res.json();
        return { apiValue, total: (data as { total: number }).total };
      }),
    );
    return Object.fromEntries(results.map(({ apiValue, total }) => [apiValue, total]));
  } catch {
    return {};
  }
}

const STATS = [
  { value: '12,000+', label: 'Events listed' },
  { value: '850+',    label: 'Active creators' },
  { value: '200K+',   label: 'Tickets sold' },
  { value: '40+',     label: 'Cities covered' },
  { value: '< 45s',   label: 'Avg. checkout time' },
];

const LIVE_EVENTS = [
  { name: 'Afro Beats Fest',     city: 'Douala',      status: 'Selling fast' },
  { name: 'Théâtre du Pays',     city: 'Yaoundé',     status: '23 left' },
  { name: 'Kinshasa Jazz Week',  city: 'Kinshasa',    status: 'On sale' },
  { name: 'FESPAM 2026',         city: 'Brazzaville', status: 'Sold out' },
  { name: 'Lagos Theater Night', city: 'Lagos',       status: 'On sale' },
  { name: 'Nairobi Sound Fest',  city: 'Nairobi',     status: 'Selling fast' },
];

const TRUSTED_BY = [
  'Yaoundé Festival', 'Douala Jazz Week', 'CHAN 2026', 'Lagos Theater Night', 'Kinshasa Pride Fest', 'Afro Beats Tour',
];

const HOW_EVENTEE = [
  {
    step: '01',
    title: 'Discover',
    desc: 'Browse events by category, date, or city. Find what excites you.',
  },
  {
    step: '02',
    title: 'Buy instantly',
    desc: 'Secure checkout powered by Tranzak. Pay with card or mobile money.',
  },
  {
    step: '03',
    title: 'Show up proud',
    desc: 'Your QR ticket arrives instantly. Walk in, get scanned, enjoy the show.',
  },
];

const HOW_CREATOR = [
  {
    step: '01',
    title: 'Create your event',
    desc: 'Set up your event in minutes — venue, capacity, price, reminders, everything.',
  },
  {
    step: '02',
    title: 'Sell & share',
    desc: 'Get a beautiful shareable link. Payments land straight to your account.',
  },
  {
    step: '03',
    title: 'Track everything',
    desc: 'Real-time attendee counts, revenue, and check-in rates from one dashboard.',
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const categoryCounts = await fetchCategoryCounts();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden bg-white pt-28">
        {/* Subtle dot grid */}
        <div className="hero-grid absolute inset-0 opacity-40" />
        {/* Soft gradient orbs */}
        <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-brand-300/15 blur-[120px]" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-[400px] w-[400px] rounded-full bg-brand-400/10 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Left — copy */}
            <div>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-600">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                Live events near you
              </div>

              <h1 className="mt-6 font-slackey text-5xl leading-[1.08] tracking-tight text-slate-900 lg:text-6xl xl:text-7xl">
                One platform for every{' '}
                <span className="gradient-text">great event.</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-500">
                Concerts. Theater. Sports. Festivals. Buy tickets in seconds, get a signed QR ticket, walk in — no printouts, no hassle.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/events" className="btn-primary text-base px-8 py-3.5">
                  Browse events
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/create" className="rounded-full border-2 border-brand-200 bg-white px-8 py-3.5 text-base font-bold text-brand-600 transition hover:bg-brand-50 hover:-translate-y-0.5">
                  Host an event
                </Link>
              </div>

              {/* Trust row */}
              <div className="mt-12 flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['bg-brand-400', 'bg-brand-300', 'bg-brand-500', 'bg-brand-600'].map((bg, i) => (
                    <div key={i} className={`h-8 w-8 rounded-full border-2 border-white ${bg} flex items-center justify-center text-xs font-bold text-white`}>
                      {['A', 'K', 'M', 'T'][i]}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-slate-400">
                  <span className="font-semibold text-slate-700">200,000+</span> tickets sold this year
                </p>
              </div>

              {/* Live event ticker */}
              <div className="mt-8">
                <div className="mb-2.5 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live on Eventful</span>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {LIVE_EVENTS.map((ev) => (
                    <div key={ev.name} className="flex-none rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                      <p className="text-xs font-bold text-slate-800 whitespace-nowrap">{ev.name}</p>
                      <p className="text-[10px] text-slate-400">
                        {ev.city} ·{' '}
                        <span className={ev.status === 'Sold out' ? 'text-red-400 font-semibold' : 'text-brand-500 font-semibold'}>
                          {ev.status}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — stacked tickets */}
            <div className="flex items-center justify-center py-16">
              <div className="relative" style={{ width: '480px', height: '440px' }}>
                {/* Back ticket — very subtle tilt, peeking behind */}
                <div className="absolute top-10 left-6" style={{ transform: 'rotate(4deg)', opacity: 0.65 }}>
                  <TicketCard
                    eventName="Lagos Theater Night"
                    category="Theater"
                    venue="National Theater"
                    date="Sep 5, 2026"
                    time="6:30 PM"
                    price="XAF 8,000"
                  />
                </div>

                {/* Front ticket — slight counter-tilt, floating */}
                <div className="absolute top-0 left-0" style={{ transform: 'rotate(-2deg)' }}>
                  <div className="animate-float">
                    <TicketCard
                      eventName="Afro Beats Summer Fest"
                      category="Concert"
                      venue="Grand Arena, Lagos"
                      date="Aug 30, 2026"
                      time="7:00 PM"
                      price="XAF 15,000"
                    />
                  </div>
                </div>

                {/* Check-in badge */}
                <div className="absolute -bottom-4 right-8 z-20 flex items-center gap-2.5 rounded-2xl border border-brand-200 bg-white px-4 py-2.5 shadow-lg">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600">
                    <CheckCircleIcon className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-brand-600">Checked in</p>
                    <p className="text-xs text-slate-400">QR verified • just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="relative z-10 bg-brand-950">
        <div className="mx-auto max-w-6xl px-6 py-14 lg:px-8">
          <dl className="grid grid-cols-2 gap-8 sm:grid-cols-5">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <dt className="text-3xl font-extrabold tracking-tight text-brand-500">{value}</dt>
                <dd className="mt-1 text-sm font-medium text-white/40">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Trusted by ───────────────────────────────────────────────────── */}
      <section className="bg-brand-950 border-t border-white/5 pb-14">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-white/20 mb-8">
            Trusted by event organisers across Central Africa
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-5">
            {TRUSTED_BY.map((name) => (
              <span key={name} className="text-sm font-extrabold tracking-tight text-white/20 hover:text-white/50 transition cursor-default">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Category grid ────────────────────────────────────────────────── */}
      <section className="bg-brand-950 py-28">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-white">
              Whatever moves you
            </h2>
            <p className="mt-4 text-lg text-white/40">
              From sold-out arenas to intimate gallery nights — there&apos;s something for everyone.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {CATEGORY_META.map(({ apiValue, name, Icon, desc }) => {
              const count = categoryCounts[apiValue];
              return (
                <Link
                  key={apiValue}
                  href={`/events?category=${apiValue}`}
                  className="group flex flex-col items-center gap-5 rounded-3xl bg-white/5 px-4 py-8 text-center ring-1 ring-white/10 transition duration-300 hover:-translate-y-2 hover:bg-white/10 hover:ring-brand-500/50"
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-white/50 ring-1 ring-white/10 transition duration-300 group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                    <Icon className="h-10 w-10" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-base font-extrabold text-white">{name}</p>
                    <p className="text-xs leading-relaxed text-white/40">{desc}</p>
                  </div>
                  {count != null && count > 0 ? (
                    <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-bold text-brand-400 ring-1 ring-brand-500/30 transition duration-300 group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                      {count.toLocaleString()} events
                    </span>
                  ) : (
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/20">
                      Coming soon
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link href="/events" className="inline-flex items-center gap-2 text-sm font-bold text-brand-400 hover:text-brand-300 transition">
              See all events <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── For Eventees ─────────────────────────────────────────────────── */}
      <section className="bg-white py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-600">
                For attendees
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900">
                From discovery to door in minutes.
              </h2>
              <p className="mt-4 text-lg text-slate-500">
                No more lost printouts or screenshotted PDFs. Your signed QR ticket lives on your phone, ready to scan.
              </p>
              <div className="mt-10 space-y-8">
                {HOW_EVENTEE.map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-black text-brand-600">
                      {step}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900">{title}</p>
                      <p className="mt-1 text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Link href="/events" className="btn-primary">
                  Find your next event
                </Link>
              </div>
            </div>

            {/* Ticket image */}
            <div className="flex justify-center">
              <div className="relative w-72">
                {/* Glow behind ticket */}
                <div className="pointer-events-none absolute inset-0 -z-10 scale-110 rounded-[40px] bg-brand-400/25 blur-3xl" />
                <Image
                  src="/ticket.png"
                  alt="Eventful ticket"
                  width={480}
                  height={680}
                  className="w-full rounded-3xl drop-shadow-2xl"
                />
                {/* QR verified badge */}
                <div className="absolute -bottom-4 -right-4 flex items-center gap-2 rounded-2xl border border-brand-100 bg-white px-3 py-2 shadow-lg shadow-brand-200/40">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600">
                    <CheckCircleIcon className="h-3 w-3 text-white" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold text-brand-600">QR verified</p>
                    <p className="text-[9px] text-slate-400">just now · door scanner</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Creators ─────────────────────────────────────────────────── */}
      <section className="bg-brand-950 py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Creator dashboard mockup */}
            <div className="order-2 lg:order-1">
              <div className="rounded-2xl border border-white/10 bg-brand-900 p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/60">Event Dashboard</p>
                  <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-bold text-brand-300">● Live</span>
                </div>
                <p className="mt-2 text-xl font-bold text-white">Afro Beats Summer Fest</p>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Tickets Sold', value: '847', sub: 'of 1,000', color: 'text-brand-300' },
                    { label: 'Revenue', value: 'XAF 12.7M', sub: '+3% today', color: 'text-brand-300' },
                    { label: 'Check-ins', value: '612', sub: '72% rate', color: 'text-brand-400' },
                  ].map(({ label, value, sub, color }) => (
                    <div key={label} className="rounded-xl bg-white/5 p-4">
                      <p className="text-xs text-white/40">{label}</p>
                      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-white/30">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Capacity bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs text-white/50">
                    <span>Capacity</span>
                    <span>84.7%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-400" style={{ width: '84.7%' }} />
                  </div>
                </div>

                {/* Recent sales */}
                <div className="mt-5 space-y-2">
                  {[
                    { name: 'Amaka O.', time: '2 min ago', amount: 'XAF 15,000' },
                    { name: 'Kwame A.', time: '7 min ago', amount: 'XAF 15,000' },
                    { name: 'Tunde B.', time: '14 min ago', amount: 'XAF 30,000' },
                  ].map(({ name, time, amount }) => (
                    <div key={name} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-brand-200">
                          {name[0]}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white/80">{name}</p>
                          <p className="text-xs text-white/30">{time}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-brand-300">{amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Copy */}
            <div className="order-1 lg:order-2">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/60">
                For creators
              </span>
              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-white">
                Sell out your next show. Track every seat.
              </h2>
              <p className="mt-4 text-lg text-white/50">
                Create an event in minutes. Share a link. Watch tickets sell — and revenue land in your account automatically.
              </p>
              <div className="mt-10 space-y-8">
                {HOW_CREATOR.map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-900 text-sm font-black text-brand-400">
                      {step}
                    </span>
                    <div>
                      <p className="font-bold text-white">{title}</p>
                      <p className="mt-1 text-white/50">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Link href="/create" className="btn-primary">
                  Start selling tickets
                </Link>
              </div>

              {/* Creator testimonial */}
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm italic leading-relaxed text-white/60">
                  &ldquo;Sold 1,400 tickets in under 4 hours. The real-time dashboard kept our whole team calm on the day.&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">A</div>
                  <div>
                    <p className="text-xs font-bold text-white">Aurélien N.</p>
                    <p className="text-[10px] text-white/30">Yaoundé Jazz Festival · 2026</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Staff ────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="rounded-3xl bg-slate-50 px-8 py-16 lg:px-16">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-600">
                  For door staff
                </span>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
                  Run the door like a pro.
                </h2>
                <p className="mt-4 text-lg text-slate-500">
                  Scan QR codes instantly. Real-time validation — no app install needed.
                  Forged tickets are rejected automatically.
                </p>
                <ul className="mt-8 space-y-4">
                  {[
                    'HMAC-signed QR codes — impossible to forge or replay',
                    'Works on any smartphone camera',
                    'Instant green/red visual feedback',
                    'Already-checked-in tickets automatically blocked',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100">
                        <CheckCircleIcon className="h-4 w-4 text-brand-600" />
                      </span>
                      <span className="text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Staff scan UI mockup */}
              <div className="flex justify-center">
                <div className="w-64 rounded-3xl border-4 border-slate-200 bg-white p-6 shadow-xl">
                  <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400">Door Scanner</p>
                  <div className="mt-4 overflow-hidden rounded-2xl bg-slate-900 p-4">
                    <div className="relative flex h-40 items-center justify-center rounded-xl bg-slate-800">
                      {/* Scan frame corners */}
                      <div className="absolute left-3 top-3 h-6 w-6 rounded-tl-lg border-l-2 border-t-2 border-brand-500" />
                      <div className="absolute right-3 top-3 h-6 w-6 rounded-tr-lg border-r-2 border-t-2 border-brand-500" />
                      <div className="absolute bottom-3 left-3 h-6 w-6 rounded-bl-lg border-b-2 border-l-2 border-brand-500" />
                      <div className="absolute bottom-3 right-3 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-brand-500" />
                      {/* Scan line */}
                      <div className="absolute inset-x-4 h-0.5 bg-brand-400/60 shadow-lg shadow-brand-400" style={{ top: '40%' }} />
                      <p className="text-xs text-white/30">Point camera at ticket QR</p>
                    </div>
                  </div>
                  {/* Success state */}
                  <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600">
                      <CheckCircleIcon className="h-7 w-7 text-white" />
                    </div>
                    <p className="mt-2 text-sm font-bold text-brand-600">Valid Ticket</p>
                    <p className="text-xs text-brand-500">Amaka O. · Floor Section</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust & Security ─────────────────────────────────────────────── */}
      <section className="border-t border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <p className="mb-12 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
            Built for trust at scale
          </p>
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              {
                Icon: ShieldCheckIcon,
                title: 'HMAC-signed QR tickets',
                desc: 'Every ticket is cryptographically signed. Forgeries are impossible — even screenshots fail at the door.',
              },
              {
                Icon: WalletIcon,
                title: 'PCI-safe payments',
                desc: 'Payments processed by Tranzak — the most trusted payment rail in Central Africa. We never store card data.',
              },
              {
                Icon: QrCodeIcon,
                title: 'Instant door verification',
                desc: 'Real-time green/red scan result. Already-checked-in tickets are blocked automatically — no double entry.',
              },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-950 py-24">
        {/* Glow orbs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-brand-600/10 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h2 className="text-4xl font-extrabold tracking-tight text-white">
            Ready to make it happen?
          </h2>
          <p className="mt-4 text-xl text-white/50">
            Whether you&apos;re discovering your next favourite night or selling out your next show — Eventful is built for you.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/events" className="rounded-full bg-brand-500 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-brand-500/30 transition hover:bg-brand-400 hover:-translate-y-0.5">
              Browse events
            </Link>
            <Link href="/register" className="rounded-full border-2 border-white/20 bg-white/5 px-8 py-3.5 text-base font-bold text-white backdrop-blur-sm transition hover:bg-white/10 hover:-translate-y-0.5">
              Create an account
            </Link>
            <a href="mailto:enterprise@eventful.cm" className="rounded-full border border-white/10 px-8 py-3.5 text-base font-medium text-white/40 transition hover:text-white/70 hover:border-white/20">
              Talk to sales →
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-brand-950">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="col-span-full lg:col-span-1">
              <div className="flex items-center gap-2">
                <TicketIcon className="h-6 w-6 text-brand-500" />
                <span className="text-base font-medium text-white">event<span className="text-brand-500">ful</span></span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/40">
                The modern event ticketing platform built for Africa and beyond.
              </p>
            </div>

            {[
              {
                heading: 'Discover',
                links: ['Browse Events', 'Concerts', 'Theater', 'Sports', 'Cultural'],
              },
              {
                heading: 'Creators',
                links: ['Create Event', 'Dashboard', 'Analytics', 'Payouts'],
              },
              {
                heading: 'Company',
                links: ['About', 'Blog', 'Careers', 'Help Centre', 'Privacy'],
              },
            ].map(({ heading, links }) => (
              <div key={heading}>
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/30">{heading}</h3>
                <ul className="mt-4 space-y-3">
                  {links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-white/50 transition hover:text-white">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 border-t border-white/10 pt-8 text-center text-xs text-white/20">
            &copy; {new Date().getFullYear()} Eventful. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
