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

// ─── Data ─────────────────────────────────────────────────────────────────────

async function fetchEvents(category?: string, q?: string, page = 1): Promise<ApiResponse> {
  try {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(page) });
    if (category) params.set('category', category);
    if (q) params.set('q', q);
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
  if (remaining <= 0) return { text: 'Sold out', cls: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-400' };
  if (remaining < 20) return { text: `${remaining} left`, cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' };
  return { text: 'Available', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
}

function buildHref(
  base: { category?: string; q?: string; page?: number },
  overrides: { category?: string | null; q?: string | null; page?: number },
): string {
  const p = new URLSearchParams();
  const cat = overrides.category !== undefined ? overrides.category : base.category;
  const query = overrides.q !== undefined ? overrides.q : base.q;
  const pg = overrides.page ?? 1;
  if (cat) p.set('category', cat);
  if (query) p.set('q', query);
  if (pg > 1) p.set('page', String(pg));
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
      {/* Image / gradient header */}
      <div className="relative h-44 overflow-hidden bg-brand-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        {catMeta && <catMeta.Icon className="pointer-events-none absolute right-4 bottom-4 h-20 w-20 text-white/[0.07]" />}

        {/* Date block — matches detail page design */}
        <div className="absolute left-4 top-4 select-none leading-none">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40">{weekday}</p>
          <p className="text-[48px] font-black leading-none text-white">{dayNum}</p>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/50">{month}</p>
        </div>

        {/* Category badge */}
        {catMeta && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 backdrop-blur-sm">
            <catMeta.Icon className="h-3 w-3 text-brand-400" />
            <span className="text-[10px] font-bold text-white/80">{catMeta.label}</span>
          </div>
        )}

        {/* Price badge bottom-right */}
        <div className={`absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
          isFree ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white backdrop-blur-sm'
        }`}>
          {isFree ? 'Free' : `${event.currency} ${Number(event.price).toLocaleString()}`}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-slackey text-sm leading-snug text-slate-900 transition group-hover:text-brand-600">
          {event.title}
        </h3>

        <div className="mt-2.5 space-y-1">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPointIcon className="h-3 w-3 shrink-0 text-slate-400" />
            <span className="truncate">{event.venue}</span>
          </p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarIcon className="h-3 w-3 shrink-0 text-slate-400" />
            {weekday}, {dayNum} {month} · {timeStr}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${avail.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${avail.dot}`} />
            {avail.text}
          </span>
        </div>

        {/* Border-only CTA */}
        <div className="mt-3 w-full rounded-xl border border-brand-200 py-2.5 text-center text-xs font-bold text-brand-600 transition group-hover:border-brand-500 group-hover:bg-brand-50">
          Get tickets
        </div>
      </div>
    </Link>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ category, q }: { category?: string; q?: string }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-28 text-center">
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-[28px] bg-brand-50" />
        {/* Duotone icon: outer shape brand-600, inner shadow slate-900 */}
        <svg viewBox="0 0 48 48" className="relative h-16 w-16">
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
        className="mt-6 rounded-full border-2 border-brand-200 px-6 py-2.5 text-sm font-bold text-brand-600 transition hover:border-brand-500 hover:bg-brand-50"
      >
        Clear filters
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const { category, q, page: pageStr } = await searchParams;
  const page       = Math.max(1, parseInt(pageStr ?? '1', 10));
  const { events, total } = await fetchEvents(category, q, page);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const base       = { category, q, page };

  // Visible page numbers (up to 5 around current)
  const pagesToShow: number[] = [];
  const start = Math.max(1, page - 2);
  const end   = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i++) pagesToShow.push(i);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-100 bg-white pt-20">
        <div className="mx-auto max-w-7xl px-6 py-5 lg:px-8">

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

            {/* Tab-style category filter */}
            <div className="flex items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
              <Link
                href={buildHref(base, { category: null, page: 1 })}
                className={`shrink-0 rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                  !category ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All events
              </Link>
              {CATEGORIES.map(({ value, label, Icon }) => (
                <Link
                  key={value}
                  href={buildHref(base, { category: value, page: 1 })}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                    category === value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${category === value ? 'text-brand-600' : 'text-slate-400'}`} />
                  {label}
                </Link>
              ))}
            </div>

            {/* Search row */}
            <form method="GET" action="/events" className="flex shrink-0 items-center gap-2">
              {category && <input type="hidden" name="category" value={category} />}
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  type="search"
                  defaultValue={q ?? ''}
                  placeholder="Search events…"
                  className="w-52 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
              >
                Search
              </button>
              {(category || q) && (
                <Link
                  href="/events"
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:text-red-500"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  Clear
                </Link>
              )}
            </form>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            {total > 0
              ? `${total.toLocaleString()} event${total === 1 ? '' : 's'} found`
              : "Discover what's happening near you"}
            {totalPages > 1 && ` · Page ${page} of ${totalPages}`}
          </p>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────────── */}
      <section className="flex-1 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.length > 0
              ? events.map((event) => <EventCard key={event.id} event={event} />)
              : <EmptyState category={category} q={q} />}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-1.5">
              {/* Prev */}
              {page > 1 ? (
                <Link
                  href={buildHref(base, { page: page - 1 })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
                >
                  ← Prev
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-300">
                  ← Prev
                </span>
              )}

              {/* Page numbers */}
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

              {/* Next */}
              {page < totalPages ? (
                <Link
                  href={buildHref(base, { page: page + 1 })}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
                >
                  Next →
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-300">
                  Next →
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-brand-950 py-8">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
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
