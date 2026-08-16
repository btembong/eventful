import Link from 'next/link';
import {
  TicketIcon, CalendarIcon, MapPointIcon, TagPriceIcon,
  MusicNoteIcon, MaskIcon, BasketballIcon, BuildingsIcon,
} from '@/components/icons';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Event {
  id: string;
  title: string;
  category: string;
  venue: string;
  city: string;
  startsAt: string;
  price: string;
  currency: string;
  shareSlug: string;
  capacity: number;
  sold: number;
}

interface ApiResponse {
  events: Event[];
  total: number;
}

// ─── Data fetch ────────────────────────────────────────────────────────────

async function fetchEvents(): Promise<ApiResponse> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/events?limit=8&page=1`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return { events: [], total: 0 };
    const ct = res.headers.get('content-type');
    if (!ct?.includes('application/json')) return { events: [], total: 0 };
    return res.json();
  } catch {
    return { events: [], total: 0 };
  }
}

// ─── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'CONCERT',  label: 'Concerts',  Icon: MusicNoteIcon,  color: 'bg-brand-600',   href: '/events?category=CONCERT' },
  { value: 'THEATER',  label: 'Theater',   Icon: MaskIcon,       color: 'bg-purple-600',  href: '/events?category=THEATER' },
  { value: 'SPORTS',   label: 'Sports',    Icon: BasketballIcon, color: 'bg-emerald-600', href: '/events?category=SPORTS' },
  { value: 'CULTURAL', label: 'Cultural',  Icon: BuildingsIcon,  color: 'bg-amber-500',   href: '/events?category=CULTURAL' },
];

const CARD_GRADIENT: Record<string, string> = {
  CONCERT:  'from-brand-950 to-brand-600',
  THEATER:  'from-brand-950 to-brand-900',
  SPORTS:   'from-brand-900 to-brand-600',
  CULTURAL: 'from-brand-950 to-brand-900',
  OTHER:    'from-brand-900 to-brand-600',
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function availability(capacity: number, sold: number) {
  const r = capacity - sold;
  if (r <= 0) return { text: 'Sold out', cls: 'bg-slate-100 text-slate-400' };
  if (r < 20) return { text: `${r} left`,   cls: 'bg-amber-50 text-amber-700' };
  return     { text: 'Available',            cls: 'bg-emerald-50 text-emerald-700' };
}

// ─── Compact event card ─────────────────────────────────────────────────────

function EventCard({ event }: { event: Event }) {
  const grad  = CARD_GRADIENT[event.category] ?? 'from-brand-950 to-brand-600';
  const avail = availability(event.capacity, event.sold ?? 0);
  const isFree = Number(event.price) === 0;

  return (
    <Link
      href={`/e/${event.shareSlug}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-md hover:ring-brand-200"
    >
      <div className={`h-28 bg-gradient-to-br ${grad} flex items-center justify-center`}>
        <TicketIcon className="h-10 w-10 text-white/20" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-xs font-extrabold text-slate-900 group-hover:text-brand-600">{event.title}</h3>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
          <MapPointIcon className="h-3 w-3 text-slate-400" />
          {event.venue}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
          <CalendarIcon className="h-3 w-3 text-slate-400" />
          {fmtDate(event.startsAt)}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white ${isFree ? 'bg-brand-600' : 'bg-slate-900'}`}>
            {isFree ? 'Free' : `${event.currency} ${Number(event.price).toLocaleString()}`}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${avail.cls}`}>{avail.text}</span>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function DiscoverPage() {
  const { events } = await fetchEvents();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Discover events</h1>
        <p className="mt-1 text-sm text-slate-500">Find your next experience.</p>
      </div>

      {/* Category grid */}
      <section className="mb-10">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Browse by category</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map(({ label, Icon, color, href }) => (
            <Link
              key={label}
              href={href}
              className="group flex flex-col items-center justify-center gap-2 rounded-2xl py-6 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ background: '' }}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${color} shadow-sm`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-bold text-slate-700 group-hover:text-brand-600">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming events */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Upcoming events</h2>
          <Link href="/events" className="text-xs font-bold text-brand-600 hover:text-brand-500">See all →</Link>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
            <TicketIcon className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">No events available right now</p>
            <p className="mt-1 text-xs text-slate-400">Check back soon — new events are added regularly.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {events.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/events"
            className="inline-block rounded-full border-2 border-brand-200 px-8 py-2.5 text-sm font-bold text-brand-600 transition hover:border-brand-400 hover:bg-brand-50"
          >
            Browse all events
          </Link>
        </div>
      </section>
    </div>
  );
}
