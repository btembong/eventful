import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ShareRow from '@/components/ShareRow';
import CheckoutModal from './CheckoutModal';
import EventPageNav from './EventPageNav';
import {
  TicketIcon, CalendarIcon, ClockIcon, MapPointIcon,
  ArrowLeftIcon, UsersGroupIcon, MusicNoteIcon, MaskIcon,
  BasketballIcon, BuildingsIcon, TagPriceIcon, CheckCircleIcon,
  MicrophoneIcon,
} from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TierDetail {
  id: string;
  name: string;
  type: 'FREE' | 'PAID' | 'INVITE_ONLY';
  price: string;
  currency: string;
  capacity: number;
  sold: number;
  orderLimit: number;
  description: string | null;
  perks: string[];
  salesStart: string | null;
  salesEnd: string | null;
}

interface EventDetail {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  price: string;
  currency: string;
  shareSlug: string;
  capacity: number;
  isCancelled: boolean;
  metadata: Record<string, unknown> | null;
  creator: { id: string; fullName: string };
  _count: { tickets: number };
  tiers: TierDetail[];
  coverImageUrl?: string;
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, {
  label: string;
  plural: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = {
  CONCERT:  { label: 'Concert',  plural: 'Concerts',  Icon: MusicNoteIcon },
  THEATER:  { label: 'Theater',  plural: 'Theater',   Icon: MaskIcon },
  SPORTS:   { label: 'Sports',   plural: 'Sports',    Icon: BasketballIcon },
  CULTURAL: { label: 'Cultural', plural: 'Cultural',  Icon: BuildingsIcon },
  OTHER:    { label: 'Event',    plural: 'Other',     Icon: TagPriceIcon },
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchEvent(slug: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/events/slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 30 } },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const ct = res.headers.get('content-type');
    if (!ct?.includes('application/json')) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ─── Category-specific metadata sections ──────────────────────────────────────

// Lineup entry — either a plain string (legacy) or a rich object
type LineupEntry = string | { name: string; photoUrl?: string; role?: string };
function lineupName(e: LineupEntry)    { return typeof e === 'string' ? e : e.name; }
function lineupPhoto(e: LineupEntry)   { return typeof e === 'string' ? undefined : e.photoUrl; }
function lineupRole(e: LineupEntry)    { return typeof e === 'string' ? undefined : e.role; }

function ConcertMeta({ meta }: { meta: Record<string, unknown> }) {
  const lineup = meta.lineup as LineupEntry[] | undefined;
  const age    = meta.ageRestriction as number | undefined;
  const doors  = meta.doors as string | undefined;
  if (!lineup?.length) return null;
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
        <MicrophoneIcon className="h-3.5 w-3.5 text-brand-400" />
        Lineup
      </h2>
      <ul className="space-y-3">
        {lineup.map((entry, i) => {
          const name  = lineupName(entry);
          const photo = lineupPhoto(entry);
          const role  = lineupRole(entry);
          return (
            <li key={name + i} className="flex items-center gap-3">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={name} className={`h-10 w-10 shrink-0 rounded-full object-cover ring-2 ${i === 0 ? 'ring-brand-500' : 'ring-slate-200'}`} />
              ) : (
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                  i === 0 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <span className="font-semibold text-slate-900">{name}</span>
                {(role || i === 0) && (
                  <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                    {role ?? 'Headliner'}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {(doors || age) && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          {doors && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              <ClockIcon className="h-3.5 w-3.5 text-brand-400" />
              Doors open {fmtTime(doors)}
            </span>
          )}
          {age && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              Age {age}+ only
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SportsMeta({ meta }: { meta: Record<string, unknown> }) {
  const home   = meta.homeTeam as string | undefined;
  const away   = meta.awayTeam as string | undefined;
  const league = meta.league as string | undefined;
  const sport  = meta.sport as string | undefined;
  if (!home || !away) return null;
  return (
    <div>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Match Details</h2>
      <div className="grid grid-cols-3 items-center gap-4">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-black text-white">
            {home.slice(0, 2).toUpperCase()}
          </div>
          <p className="mt-2.5 text-sm font-bold text-slate-900">{home}</p>
          <p className="text-xs text-brand-500">Home</p>
        </div>
        <div className="text-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-black text-white">VS</span>
        </div>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-500">
            {away.slice(0, 2).toUpperCase()}
          </div>
          <p className="mt-2.5 text-sm font-bold text-slate-900">{away}</p>
          <p className="text-xs text-slate-400">Away</p>
        </div>
      </div>
      {(league || sport) && (
        <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
          {[league, sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : ''].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}

function TheaterMeta({ meta }: { meta: Record<string, unknown> }) {
  const runtime       = meta.runtimeMinutes as number | undefined;
  const hasSeating    = meta.hasSeating as boolean | undefined;
  const intermissions = meta.intermissions as number | undefined;
  if (!runtime) return null;
  const items = [
    { label: 'Runtime',       value: `${runtime} min` },
    { label: 'Seating',       value: hasSeating ? 'Reserved' : 'Standing' },
    ...(typeof intermissions === 'number' ? [{ label: 'Intermissions', value: String(intermissions) }] : []),
  ];
  return (
    <div>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Show Details</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CulturalMeta({ meta }: { meta: Record<string, unknown> }) {
  const theme     = meta.theme as string | undefined;
  const dresscode = meta.dresscode as string | undefined;
  if (!theme && !dresscode) return null;
  return (
    <div>
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Event Details</h2>
      <div className="space-y-3">
        {theme && (
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theme</p>
              <p className="mt-0.5 font-semibold text-slate-900">{theme}</p>
            </div>
          </div>
        )}
        {dresscode && (
          <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
            <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Dress Code</p>
              <p className="mt-0.5 font-semibold text-slate-900">{dresscode}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetadataSection({ event }: { event: EventDetail }) {
  if (!event.metadata) return null;
  const meta = event.metadata;
  let content: React.ReactNode = null;
  // Lineup for CONCERT is shown in the left column as cards — only show extra concert info here
  if (event.category === 'CONCERT') {
    const age  = meta.ageRestriction as number | undefined;
    const doors = meta.doors as string | undefined;
    if (age || doors) content = <ConcertMeta meta={{ ...meta, lineup: [] }} />;
  }
  if (event.category === 'SPORTS')   content = <SportsMeta meta={meta} />;
  if (event.category === 'THEATER')  content = <TheaterMeta meta={meta} />;
  if (event.category === 'CULTURAL') content = <CulturalMeta meta={meta} />;
  if (!content) return null;
  return <div className="mt-8 border-t border-slate-100 pt-8">{content}</div>;
}

// ─── Metadata export ──────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) return { title: 'Event not found' };
  const description = `${event.venue} · ${fmtDate(event.startsAt)} · ${
    Number(event.price) === 0 ? 'Free' : `${event.currency} ${Number(event.price).toLocaleString()}`
  }`;
  return {
    title: `${event.title} — Eventful`,
    description,
    openGraph: { type: 'website', title: event.title, description },
    twitter: { card: 'summary_large_image', title: event.title, description },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await fetchEvent(slug);
  if (!event) notFound();

  const catMeta   = CATEGORY_META[event.category] ?? CATEGORY_META.OTHER;
  const tickets   = event._count?.tickets ?? 0;
  const remaining = event.capacity - tickets;
  const soldPct   = Math.min(100, (tickets / event.capacity) * 100);
  const viewCount = Math.max(48, tickets * 3 + 57);

  const dateStr  = fmtDate(event.startsAt);
  const timeStr  = `${fmtTime(event.startsAt)} – ${fmtTime(event.endsAt)}`;

  const d       = new Date(event.startsAt);
  const dayNum  = d.getDate();
  const month   = d.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();

  // Price display
  const allFree = event.tiers.length > 0 && event.tiers.every(t => t.type === 'FREE');
  const minPaid = event.tiers.filter(t => t.type === 'PAID').sort((a, b) => Number(a.price) - Number(b.price))[0];
  const isFree  = allFree || Number(event.price) === 0;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Nav bar ────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/events" className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-brand-600">
            <ArrowLeftIcon className="h-4 w-4" />
            <span className="hidden sm:inline">All events</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M8 12a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v6a3 3 0 0 0 0 4v6a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-6a3 3 0 0 0 0-4v-6z" fill="#F07200"/>
              <rect x="13" y="18" width="14" height="4" rx="2" fill="white" opacity="0.9"/>
              <circle cx="13" cy="13" r="2.5" fill="white" opacity="0.85"/>
              <circle cx="27" cy="13" r="2.5" fill="white" opacity="0.85"/>
              <circle cx="13" cy="27" r="2.5" fill="white" opacity="0.85"/>
              <circle cx="27" cy="27" r="2.5" fill="white" opacity="0.85"/>
            </svg>
            <span className="text-sm font-extrabold text-slate-900">event<span className="text-brand-600">ful</span></span>
          </Link>
          <EventPageNav />
        </div>
      </div>

      {/* ── Dark hero banner ────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-brand-950">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-32 left-1/3 h-[400px] w-[400px] rounded-full bg-brand-500/10 blur-[100px]" />
        {/* Dot texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }}
        />
        {/* Large background category icon */}
        <div className="pointer-events-none absolute right-6 bottom-6 lg:right-16">
          <catMeta.Icon className="h-28 w-28 text-white/[0.04] lg:h-36 lg:w-36" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-white/30">
            <Link href="/events" className="transition hover:text-white/70">Events</Link>
            <span>/</span>
            <Link href={`/events?category=${event.category}`} className="transition hover:text-white/70">{catMeta.label}</Link>
            <span>/</span>
            <span className="line-clamp-1 max-w-[240px] text-white/50">{event.title}</span>
          </nav>

          {/* Badges */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-sm">
              <catMeta.Icon className="h-3.5 w-3.5" />
              {catMeta.label}
            </span>
            {event.isCancelled && (
              <span className="rounded-full bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-400">Cancelled</span>
            )}
          </div>

          {/* Title */}
          <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white lg:text-4xl">
            {event.title}
          </h1>

          {/* Organiser */}
          <p className="mt-3 text-sm text-white/40">
            by <span className="font-semibold text-white/70">{event.creator.fullName}</span>
          </p>

          {/* Meta pills */}
          <div className="mt-6 flex flex-wrap gap-2.5">
            {[
              { Icon: CalendarIcon,   text: fmtDateShort(event.startsAt) },
              { Icon: ClockIcon,      text: timeStr },
              { Icon: MapPointIcon,   text: event.venue },
              { Icon: UsersGroupIcon, text: `${event.capacity.toLocaleString()} capacity` },
            ].map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
                <Icon className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3-column layout: Poster · Info · Tickets ───────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">

          {/* ── Col 1: Poster + Lineup (wider, no text on placeholder) ──── */}
          <div className="w-full lg:w-[380px] lg:shrink-0">
            <div className="sticky top-20 space-y-5">

              {/* Cover image / clean placeholder */}
              {event.coverImageUrl ? (
                <div className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.coverImageUrl}
                    alt={event.title}
                    className="w-full object-cover"
                    style={{ aspectRatio: '4/5' }}
                  />
                </div>
              ) : (
                /* Clean placeholder — no text, no date */
                <div className="relative overflow-hidden rounded-2xl bg-brand-950 shadow-2xl" style={{ aspectRatio: '4/5' }}>
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.035]"
                    style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}
                  />
                  {/* Subtle ambient glow */}
                  <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
                  {/* Large watermark category icon centred */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <catMeta.Icon className="h-28 w-28 text-white/[0.06]" />
                  </div>
                </div>
              )}

              {/* ── Lineup cards ────────────────────────────────────────── */}
              {(() => {
                const lineup = event.metadata?.lineup as LineupEntry[] | undefined;
                if (!lineup?.length) return null;
                return (
                  <div>
                    <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      <MicrophoneIcon className="h-3.5 w-3.5 text-brand-400" />
                      Lineup
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {lineup.map((entry, i) => {
                        const name  = lineupName(entry);
                        const photo = lineupPhoto(entry);
                        const role  = lineupRole(entry);
                        return (
                          <div
                            key={name + i}
                            className="relative overflow-hidden rounded-xl bg-brand-950"
                            style={{ aspectRatio: '3/4' }}
                          >
                            {/* Background photo or dot texture */}
                            {photo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={photo} alt={name} className="absolute inset-0 h-full w-full object-cover" />
                            ) : (
                              <div
                                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                                style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '14px 14px' }}
                              />
                            )}
                            {/* Darken overlay when photo exists */}
                            {photo && <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/70" />}
                            {/* Headliner accent stripe */}
                            {i === 0 && <div className="absolute left-0 top-0 h-full w-1 bg-brand-500" />}
                            {/* Initials avatar (only shown when no photo) */}
                            {!photo && (
                              <div className="absolute left-0 right-0 top-5 flex justify-center">
                                <div className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-black text-white ${i === 0 ? 'bg-brand-600' : 'bg-slate-700'}`}>
                                  {name.slice(0, 1).toUpperCase()}
                                </div>
                              </div>
                            )}
                            {/* Name + role pinned to bottom */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-10">
                              <p className="truncate text-center text-xs font-bold text-white">{name}</p>
                              {(role || i === 0) && (
                                <p className="mt-0.5 text-center text-[9px] font-bold uppercase tracking-widest text-brand-400">
                                  {role ?? 'Headliner'}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* ── Col 2: Event meta + Description + Share ─────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Category badge */}
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-700">
                <catMeta.Icon className="h-3 w-3" />
                {catMeta.label}
              </span>
              {event.isCancelled && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-500">Cancelled</span>
              )}
            </div>

            {/* Date · Time · Venue · Capacity */}
            <div className="space-y-4">
              {[
                { Icon: CalendarIcon,   text: dateStr,                                       sub: 'Date' },
                { Icon: ClockIcon,      text: timeStr,                                       sub: 'Time' },
                { Icon: MapPointIcon,   text: event.venue,                                   sub: 'Venue' },
                { Icon: UsersGroupIcon, text: `${event.capacity.toLocaleString()} capacity`, sub: 'Capacity' },
              ].map(({ Icon, text, sub }) => (
                <div key={sub} className="flex items-center gap-4">
                  <Icon className="h-6 w-6 shrink-0 text-brand-500" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{sub}</p>
                    <p className="text-base font-semibold text-slate-900">{text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Price — only shown when there are NO tiers (fallback) */}
            {event.tiers.length === 0 && (
              <>
                <div className="my-7 border-t border-slate-100" />
                <div className="mb-2">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Price</p>
                  {Number(event.price) === 0 ? (
                    <span className="text-4xl font-extrabold text-brand-500">Free</span>
                  ) : (
                    <span className="text-4xl font-extrabold text-brand-500">
                      {event.currency} {Number(event.price).toLocaleString()}
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Description */}
            {event.description && (
              <div className="mt-7 mb-7">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">About</p>
                <p className="whitespace-pre-line leading-relaxed text-slate-600">{event.description}</p>
              </div>
            )}

            {/* Share */}
            <div className="border-t border-slate-100 pt-5">
              <ShareRow slug={event.shareSlug} title={event.title} />
            </div>

            {/* Category-specific metadata (sports matchup, theater details, etc.) */}
            <MetadataSection event={event} />
          </div>

          {/* ── Col 3: Ticket types + CTA ───────────────────────────────── */}
          <div className="w-full lg:w-[300px] lg:shrink-0">
            <div className="sticky top-20 space-y-4">

              {/* Ticket tiers */}
              {!event.isCancelled && event.tiers.length > 0 && (
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ticket types</p>
                  <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                    {event.tiers.map((tier) => {
                      const tierRemaining = tier.capacity - tier.sold;
                      const soldOut = tierRemaining <= 0;
                      return (
                        <div key={tier.id} className={`px-4 py-4 transition hover:bg-brand-50/40 ${soldOut ? 'opacity-50' : ''}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-900 truncate">{tier.name}</p>
                              {tier.description && (
                                <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{tier.description}</p>
                              )}
                              {tier.perks?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {tier.perks.slice(0, 3).map((p) => (
                                    <span key={p} className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-600">{p}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              {tier.type === 'FREE' ? (
                                <p className="text-sm font-extrabold text-brand-500">Free</p>
                              ) : tier.type === 'INVITE_ONLY' ? (
                                <p className="text-xs font-bold text-purple-600">Invite only</p>
                              ) : (
                                <p className="text-sm font-extrabold text-brand-500">
                                  {Number(tier.price).toLocaleString()}
                                  <span className="ml-1 text-[10px] font-normal text-slate-400">{tier.currency}</span>
                                </p>
                              )}
                              {soldOut ? (
                                <p className="text-[10px] font-bold text-red-400">Sold out</p>
                              ) : (
                                <p className="text-[10px] text-slate-400">{tierRemaining} left</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Capacity bar */}
              {!event.isCancelled && tickets > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400">
                    <span>{tickets.toLocaleString()} sold</span>
                    <span>{remaining.toLocaleString()} remaining</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all"
                      style={{ width: `${soldPct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* CTA */}
              {event.isCancelled ? (
                <div className="rounded-xl bg-red-50 py-4 text-center">
                  <p className="text-sm font-bold text-red-600">This event has been cancelled</p>
                </div>
              ) : remaining > 0 ? (
                <div className="space-y-2">
                  <CheckoutModal
                    shareSlug={event.shareSlug}
                    eventId={event.id}
                    eventTitle={event.title}
                    tiers={event.tiers}
                  />
                  <p className="text-center text-[11px] text-slate-400">Secure checkout · powered by Tranzak</p>
                </div>
              ) : (
                <div>
                  <div className="w-full rounded-xl bg-slate-100 py-4 text-center text-sm font-bold text-slate-500">Sold out</div>
                  <p className="mt-2 text-center text-[11px] text-slate-400">Join the waitlist to be notified</p>
                </div>
              )}

              {/* Social proof */}
              {!event.isCancelled && (
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
                  {viewCount} people viewed this today
                </p>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/events" className="flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-brand-600">
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to events
          </Link>
          <Link href="/" className="flex items-center gap-1.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600">
              <TicketIcon className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-xs font-bold text-slate-500">eventful</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
