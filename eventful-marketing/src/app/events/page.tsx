import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  SearchIcon, CalendarIcon, MapPointIcon, TicketIcon,
  TagPriceIcon, MusicNoteIcon, MaskIcon, BasketballIcon, BuildingsIcon, XIcon,
} from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Event {
  id: string; title: string; category: string; venue: string;
  startsAt: string; price: string; currency: string;
  shareSlug: string; capacity: number; coverImageUrl?: string;
  _count?: { tickets: number };
}

interface ApiResponse { events: Event[]; total: number; page: number; limit: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'CONCERT',  label: 'Concert',  Icon: MusicNoteIcon },
  { value: 'THEATER',  label: 'Theater',  Icon: MaskIcon },
  { value: 'SPORTS',   label: 'Sports',   Icon: BasketballIcon },
  { value: 'CULTURAL', label: 'Cultural', Icon: BuildingsIcon },
  { value: 'OTHER',    label: 'Other',    Icon: TagPriceIcon },
];

const PAGE_SIZE = 12;

const COUNTRIES = [
  { value: 'CM', label: 'Cameroon' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'KE', label: 'Kenya' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'SN', label: 'Senegal' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'UG', label: 'Uganda' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'CD', label: 'DR Congo' },
  { value: 'CG', label: 'Republic of Congo' },
  { value: 'TG', label: 'Togo' },
  { value: 'BJ', label: 'Benin' },
  { value: 'ML', label: 'Mali' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'MG', label: 'Madagascar' },
  { value: 'MU', label: 'Mauritius' },
];

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchEvents(category?: string, q?: string, country?: string, page = 1): Promise<ApiResponse> {
  try {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
    if (category) params.set('category', category);
    if (q)        params.set('q', q);
    if (country)  params.set('country', country);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/events?${params.toString()}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return { events: [], total: 0, page: 1, limit: PAGE_SIZE };
    const ct = res.headers.get('content-type');
    if (!ct?.includes('application/json')) return { events: [], total: 0, page: 1, limit: PAGE_SIZE };
    return res.json();
  } catch {
    return { events: [], total: 0, page: 1, limit: PAGE_SIZE };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function availInfo(capacity: number, sold: number) {
  const remaining = capacity - sold;
  if (remaining <= 0) return { text: 'Sold out',        cls: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400' };
  if (remaining < 20) return { text: `${remaining} left`, cls: 'bg-brand-100 text-brand-700',  dot: 'bg-brand-500' };
  return                     { text: 'Available',        cls: 'bg-brand-100 text-brand-600',   dot: 'bg-brand-400' };
}

function buildHref(
  base: { category?: string; q?: string; country?: string; page?: number },
  overrides: { category?: string | null; q?: string | null; country?: string | null; page?: number },
): string {
  const p = new URLSearchParams();
  const cat     = overrides.category !== undefined ? overrides.category : base.category;
  const query   = overrides.q        !== undefined ? overrides.q        : base.q;
  const country = overrides.country  !== undefined ? overrides.country  : base.country;
  const pg      = overrides.page ?? 1;
  if (cat)     p.set('category', cat);
  if (query)   p.set('q', query);
  if (country) p.set('country', country);
  if (pg > 1)  p.set('page', String(pg));
  const qs = p.toString();
  return `/events${qs ? `?${qs}` : ''}`;
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  const catMeta = CATEGORIES.find((c) => c.value === event.category);
  const tickets = event._count?.tickets ?? 0;
  const avail   = availInfo(event.capacity, tickets);
  const isFree  = Number(event.price) === 0;
  const d       = new Date(event.startsAt);
  const dayNum  = d.getDate();
  const month   = d.toLocaleDateString('en-GB', { month: 'short' });
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'short' });
  const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <Link
      href={`/e/${event.shareSlug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand-100 hover:shadow-lg"
    >
      {/* Image / gradient header — compact on mobile (h-28), full on desktop (h-44) */}
      <div className="relative h-28 overflow-hidden bg-brand-950 sm:h-44">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        {catMeta && (
          <catMeta.Icon className="pointer-events-none absolute right-3 bottom-3 h-14 w-14 text-white/[0.07] sm:right-4 sm:bottom-4 sm:h-20 sm:w-20" />
        )}

        {/* Date block */}
        <div className="absolute left-3 top-3 select-none leading-none sm:left-4 sm:top-4">
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40 sm:text-[8px]">{weekday}</p>
          <p className="text-[32px] font-black leading-none text-white sm:text-[48px]">{dayNum}</p>
          <p className="text-[8px] font-black uppercase tracking-[0.15em] text-white/50 sm:text-[9px]">{month}</p>
        </div>

        {/* Category badge */}
        {catMeta && (
          <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 backdrop-blur-sm sm:right-3 sm:top-3 sm:gap-1.5 sm:px-2.5 sm:py-1">
            <catMeta.Icon className="h-2.5 w-2.5 text-brand-400 sm:h-3 sm:w-3" />
            <span className="text-[9px] font-bold text-white/80 sm:text-[10px]">{catMeta.label}</span>
          </div>
        )}

        {/* Price badge */}
        <div className={`absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-extrabold sm:bottom-3 sm:right-3 sm:px-2.5 sm:text-[10px] ${
          isFree ? 'bg-brand-600 text-white' : 'bg-white/10 text-white backdrop-blur-sm'
        }`}>
          {isFree ? 'Free' : `${event.currency} ${Number(event.price).toLocaleString()}`}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 font-slackey text-xs leading-snug text-slate-900 transition group-hover:text-brand-600 sm:text-sm">
          {event.title}
        </h3>

        {/* Venue — hidden on mobile to reduce height */}
        <p className="mt-1.5 hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
          <MapPointIcon className="h-3 w-3 shrink-0 text-slate-400" />
          <span className="truncate">{event.venue}</span>
        </p>

        {/* Date + time — always show */}
        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-500 sm:gap-1.5 sm:text-xs">
          <CalendarIcon className="h-2.5 w-2.5 shrink-0 text-slate-400 sm:h-3 sm:w-3" />
          <span className="truncate">{dayNum} {month} · {timeStr}</span>
        </p>

        {/* Availability */}
        <div className="mt-2 sm:mt-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold sm:px-2.5 sm:py-1 sm:text-[10px] ${avail.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} />
            {avail.text}
          </span>
        </div>

        {/* CTA */}
        <div className="mt-2 w-full rounded-xl border border-brand-200 py-2 text-center text-[10px] font-bold text-brand-600 transition group-hover:border-brand-500 group-hover:bg-brand-50 sm:mt-3 sm:py-2.5 sm:text-xs">
          Get tickets
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ category?: string; q?: string; country?: string; page?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const { category, q, country, page: pageStr } = await searchParams;
  const page       = Math.max(1, parseInt(pageStr ?? '1', 10));
  const { events, total } = await fetchEvents(category, q, country, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const base       = { category, q, country, page };

  const pagesToShow: number[] = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pagesToShow.push(i);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      {/* ── Sticky filter bar ────────────────────────────────────────────── */}
      {/*   pt-14 clears the fixed navbar. sticky top-14 pins the bar       */}
      {/*   right below the navbar as the user scrolls.                      */}
      <div className="sticky top-14 z-30 border-b border-slate-100 bg-white shadow-sm pt-[56px] -mt-[56px]">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4 lg:px-8">

          {/* Row 1: category chips (horizontal scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <Link
              href={buildHref(base, { category: null, page: 1 })}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                !category
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </Link>
            {CATEGORIES.map(({ value, label, Icon }) => (
              <Link
                key={value}
                href={buildHref(base, { category: value, page: 1 })}
                className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                  category === value
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className={`h-3 w-3 ${category === value ? 'text-white' : 'text-slate-400'}`} />
                {label}
              </Link>
            ))}
          </div>

          {/* Row 2: country picker + search + result count */}
          <div className="mt-3 flex items-center gap-2">
            <form method="GET" action="/events" className="flex flex-1 items-center gap-2 flex-wrap sm:flex-nowrap">
              {category && <input type="hidden" name="category" value={category} />}

              {/* ── Country selector ── */}
              <div className="relative shrink-0">
                <MapPointIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
                <select
                  name="country"
                  defaultValue={country ?? ''}
                  className="appearance-none rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 cursor-pointer w-full sm:w-auto"
                >
                  <option value="">Country</option>
                  {COUNTRIES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {/* Custom chevron */}
                <svg className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 12 12">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* ── Search ── */}
              <div className="relative flex-1 sm:flex-none">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  type="search"
                  defaultValue={q ?? ''}
                  placeholder="Search events…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 sm:w-48"
                />
              </div>

              <button
                type="submit"
                className="shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
              >
                Go
              </button>
              {(category || q || country) && (
                <Link
                  href="/events"
                  className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-brand-200 hover:text-brand-600"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </Link>
              )}
            </form>

            {/* Count — right-aligned */}
            <p className="shrink-0 text-xs text-slate-400">
              {total > 0 ? (
                <span><span className="font-semibold text-slate-700">{total.toLocaleString()}</span> found</span>
              ) : 'No events'}
              {totalPages > 1 && <span className="hidden sm:inline"> · p{page}/{totalPages}</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main layout — sidebar on desktop, full-width on mobile ───────── */}
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:flex lg:gap-8 lg:px-8">

        {/* Desktop category sidebar — sticky, always visible, no tab bar needed */}
        <aside className="hidden lg:block lg:w-44 lg:shrink-0">
          <div className="sticky top-[120px] py-8">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Categories</p>
            <nav className="space-y-0.5">
              <Link
                href={buildHref(base, { category: null, page: 1 })}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  !category ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <TicketIcon className={`h-4 w-4 shrink-0 ${!category ? 'text-brand-500' : 'text-slate-400'}`} />
                All events
                {!category && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
              </Link>
              {CATEGORIES.map(({ value, label, Icon }) => {
                const active = category === value;
                return (
                  <Link
                    key={value}
                    href={buildHref(base, { category: value, page: 1 })}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand-500' : 'text-slate-400'}`} />
                    {label}
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Event grid */}
        <section className="min-w-0 flex-1 py-6 sm:py-8">
          {/* 2-col on mobile, 2-col on sm, 3-col on lg (inside sidebar layout), 4-col on xl */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {events.length > 0
              ? events.map((event) => <EventCard key={event.id} event={event} />)
              : (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                  <div className="relative mb-5 flex h-24 w-24 items-center justify-center">
                    <div className="absolute inset-0 rounded-[24px] bg-brand-50" />
                    <svg viewBox="0 0 48 48" className="relative h-14 w-14">
                      <rect x="2" y="10" width="44" height="28" rx="6" fill="#F07200" opacity="0.15" />
                      <rect x="2" y="10" width="44" height="28" rx="6" fill="none" stroke="#F07200" strokeWidth="2.5" />
                      <circle cx="10" cy="24" r="4" fill="#333333" />
                      <circle cx="38" cy="24" r="4" fill="#333333" />
                      <rect x="14" y="18" width="20" height="12" rx="3" fill="#F07200" />
                      <line x1="14" y1="18" x2="14" y2="30" stroke="#333333" strokeWidth="1.5" strokeDasharray="3,2" />
                      <line x1="34" y1="18" x2="34" y2="30" stroke="#333333" strokeWidth="1.5" strokeDasharray="3,2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">No events found</h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-500">
                    {q
                      ? `No events match "${q}"`
                      : category
                      ? `No ${category.toLowerCase()} events right now`
                      : 'No events available at the moment'}
                    {' '}— check back soon.
                  </p>
                  <Link
                    href="/events"
                    className="mt-5 rounded-full border-2 border-brand-200 px-6 py-2.5 text-sm font-bold text-brand-600 transition hover:border-brand-500 hover:bg-brand-50"
                  >
                    Clear filters
                  </Link>
                </div>
              )
            }
          </div>

          {/* ── Pagination ──────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-1.5">
              {page > 1 ? (
                <Link
                  href={buildHref(base, { page: page - 1 })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 sm:px-4"
                >
                  ← <span className="hidden sm:inline">Prev</span>
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-300 sm:px-4">←</span>
              )}

              {start > 1 && (
                <>
                  <Link href={buildHref(base, { page: 1 })}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600">
                    1
                  </Link>
                  {start > 2 && <span className="px-1 text-slate-400">…</span>}
                </>
              )}

              {pagesToShow.map((pg) => (
                <Link
                  key={pg}
                  href={buildHref(base, { page: pg })}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition ${
                    pg === page
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  {pg}
                </Link>
              ))}

              {end < totalPages && (
                <>
                  {end < totalPages - 1 && <span className="px-1 text-slate-400">…</span>}
                  <Link href={buildHref(base, { page: totalPages })}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600">
                    {totalPages}
                  </Link>
                </>
              )}

              {page < totalPages ? (
                <Link
                  href={buildHref(base, { page: page + 1 })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 sm:px-4"
                >
                  <span className="hidden sm:inline">Next</span> →
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-300 sm:px-4">→</span>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-brand-950 py-8">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500">
                <TicketIcon className="h-4 w-4 text-white" />
              </span>
              <span className="text-sm font-bold text-white">eventful</span>
            </Link>
            <p className="text-xs text-white/30">
              &copy; {new Date().getFullYear()} Eventful. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
