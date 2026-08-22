'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ClockIcon, StarIcon, UsersGroupIcon, CheckCircleIcon,
  LockIcon, TicketIcon, CheckIcon, PlusIcon, MinusIcon,
  ChevronDownIcon, InfoIcon, MapPointIcon,
} from '@/components/icons';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectableTier {
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
  hasSeating?: boolean;
  seatRows?: number;
  seatCols?: number;
}

interface Props {
  eventId: string;
  shareSlug: string;
  tiers: SelectableTier[];
  coverImageUrl?: string;
  hasSeating: boolean;
}

// ─── Tier kind ────────────────────────────────────────────────────────────────

type TierKind = 'EARLY_BIRD' | 'VIP' | 'GROUP' | 'FREE' | 'INVITE_ONLY' | 'STANDARD';

function getTierKind(tier: SelectableTier): TierKind {
  if (tier.type === 'FREE')        return 'FREE';
  if (tier.type === 'INVITE_ONLY') return 'INVITE_ONLY';
  const n = tier.name.toLowerCase();
  if (n.includes('early'))                                               return 'EARLY_BIRD';
  if (n.includes('vip') || n.includes('premium') || n.includes('back')) return 'VIP';
  if (n.includes('group') || n.includes('team') || n.includes('table')) return 'GROUP';
  return 'STANDARD';
}

type KindConfig = {
  badge: string;
  badgeCls: string;
  cardBg: string;
  ringCls: string;
  Icon: React.FC<{ className?: string }>;
};

const KIND_CONFIG: Record<TierKind, KindConfig> = {
  EARLY_BIRD: {
    badge: 'Early Bird',
    badgeCls: 'border-2 border-brand-950 bg-brand-500 text-white',
    cardBg: 'bg-white',
    ringCls: 'ring-brand-500',
    Icon: ClockIcon,
  },
  VIP: {
    badge: 'VIP',
    badgeCls: 'border-2 border-brand-950 bg-brand-950 text-brand-400',
    cardBg: 'bg-white',
    ringCls: 'ring-slate-700',
    Icon: StarIcon,
  },
  GROUP: {
    badge: 'Group',
    badgeCls: 'border-2 border-brand-950 bg-white text-brand-950',
    cardBg: 'bg-white',
    ringCls: 'ring-brand-400',
    Icon: UsersGroupIcon,
  },
  FREE: {
    badge: 'Free entry',
    badgeCls: 'border-2 border-brand-950 bg-brand-500 text-white',
    cardBg: 'bg-white',
    ringCls: 'ring-brand-400',
    Icon: CheckCircleIcon,
  },
  INVITE_ONLY: {
    badge: 'Invite only',
    badgeCls: 'border-2 border-slate-300 bg-slate-100 text-slate-500',
    cardBg: 'bg-white',
    ringCls: 'ring-slate-300',
    Icon: LockIcon,
  },
  STANDARD: {
    badge: 'Standard',
    badgeCls: 'border-2 border-brand-950 bg-white text-brand-950',
    cardBg: 'bg-white',
    ringCls: 'ring-brand-400',
    Icon: TicketIcon,
  },
};

// ─── Seat map ─────────────────────────────────────────────────────────────────

type ApiSeatStatus = 'available' | 'held' | 'pending' | 'taken' | 'blocked';

function SeatMap({
  tier,
  selected,
  onToggle,
  maxSeats,
  seatStatuses,
  loading,
}: {
  tier: SelectableTier;
  selected: Set<string>;
  onToggle: (seat: string) => void;
  maxSeats: number;
  seatStatuses: Record<string, ApiSeatStatus>;
  loading: boolean;
}) {
  const rows = tier.seatRows ?? 8;
  const cols = tier.seatCols ?? 13;

  const rowLetters = useMemo(
    () => Array.from({ length: rows }, (_, i) => String.fromCharCode(65 + i)),
    [rows],
  );

  function handleClick(seat: string) {
    const status = seatStatuses[seat] ?? 'available';
    if (status !== 'available') return;
    if (!selected.has(seat) && selected.size >= maxSeats) return;
    onToggle(seat);
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-xs text-slate-400">
        Loading seat map…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <MapPointIcon className="h-3 w-3 text-brand-400" />
          Seat map
        </p>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
          selected.size === maxSeats
            ? 'bg-brand-600 text-white'
            : 'bg-slate-100 text-slate-600'
        }`}>
          {selected.size} / {maxSeats} selected
        </span>
      </div>

      {/* Stage */}
      <div className="mb-5 flex justify-center">
        <div className="flex h-8 w-3/4 items-center justify-center rounded-xl bg-brand-950 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 shadow-inner">
          Stage
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-1.5 overflow-x-auto pb-1">
        {rowLetters.map((row) => {
          const isPremium = row <= 'C';
          return (
            <div key={row} className="flex min-w-0 items-center gap-0.5">
              <span className={`w-4 shrink-0 text-center text-[9px] font-black ${isPremium ? 'text-brand-500' : 'text-slate-300'}`}>
                {row}
              </span>
              {Array.from({ length: cols }, (_, c) => {
                const seatId = `${row}${c + 1}`;
                const status: ApiSeatStatus = seatStatuses[seatId] ?? 'available';
                const unavail = status !== 'available';
                const chosen  = selected.has(seatId);
                const maxed   = !chosen && selected.size >= maxSeats;

                return (
                  <button
                    key={seatId}
                    type="button"
                    title={unavail ? status : chosen ? `Remove ${seatId}` : `Select ${seatId}`}
                    disabled={unavail || (maxed && !chosen)}
                    onClick={() => handleClick(seatId)}
                    className={[
                      'h-6 w-6 rounded-sm text-[7px] font-bold transition-all duration-150',
                      chosen
                        ? 'scale-110 bg-brand-600 text-white shadow-sm ring-2 ring-brand-400'
                        : status === 'taken'  ? 'cursor-not-allowed bg-slate-300 text-slate-400'
                        : status === 'held'   ? 'cursor-not-allowed bg-amber-200 text-amber-500'
                        : status === 'pending'? 'cursor-not-allowed bg-blue-100 text-blue-400'
                        : status === 'blocked'? 'cursor-not-allowed bg-red-100 text-red-300'
                        : isPremium && !maxed ? 'cursor-pointer bg-brand-100 text-brand-500 ring-1 ring-brand-200 hover:bg-brand-200'
                        : maxed               ? 'cursor-not-allowed bg-slate-100 opacity-40'
                        :                      'cursor-pointer bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-600',
                    ].join(' ')}
                  >
                    {c + 1}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3">
        {[
          { cls: 'bg-brand-100 ring-1 ring-brand-200', label: 'Premium (A–C)' },
          { cls: 'bg-white ring-1 ring-slate-200',      label: 'Available' },
          { cls: 'bg-brand-600',                        label: 'Your pick' },
          { cls: 'bg-slate-300',                        label: 'Taken' },
          { cls: 'bg-amber-200',                        label: 'Held' },
        ].map(({ cls, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`h-3.5 w-3.5 shrink-0 rounded-sm ${cls}`} />
            <span className="text-[10px] text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Ticket type explainer ────────────────────────────────────────────────────

const EXPLAINER: { Icon: React.FC<{ className?: string }>; name: string; desc: string }[] = [
  { Icon: ClockIcon,        name: 'Early Bird',    desc: 'Discounted price for fans who book early. Limited quantity — grab it before it sells out.' },
  { Icon: StarIcon,         name: 'VIP / Premium', desc: 'Elevated experience: premium seating, backstage access, or exclusive perks like meet & greet.' },
  { Icon: TicketIcon,       name: 'Standard',      desc: 'Regular general-admission or assigned-seat ticket at the full listed price.' },
  { Icon: UsersGroupIcon,   name: 'Group / Table', desc: 'Bulk ticket for groups or a reserved table. Usually comes with a group discount.' },
  { Icon: CheckCircleIcon,  name: 'Free entry',    desc: 'No payment needed. You still need a ticket to confirm attendance and pass door scanning.' },
  { Icon: LockIcon,         name: 'Invite only',   desc: 'Restricted — sent by the organiser directly. Not available for public purchase.' },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function TicketSelector({ eventId, shareSlug, tiers, coverImageUrl, hasSeating }: Props) {
  const router = useRouter();

  const [selectedTierId, setSelectedTierId] = useState<string | null>(
    tiers.length === 1 ? tiers[0].id : null,
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(tiers.map((t) => [t.id, 1])),
  );
  const [selectedSeats,  setSelectedSeats]  = useState<Set<string>>(new Set());
  const [seatStatuses,   setSeatStatuses]   = useState<Record<string, ApiSeatStatus>>({});
  const [loadingSeats,   setLoadingSeats]   = useState(false);
  const [reserving,      setReserving]      = useState(false);

  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? null;
  const qty = selectedTierId ? (quantities[selectedTierId] ?? 1) : 1;
  const maxQty = selectedTier
    ? Math.min(selectedTier.orderLimit || 10, selectedTier.capacity - selectedTier.sold)
    : 1;

  const needsSeats = !!(selectedTier?.hasSeating || (hasSeating && selectedTier && selectedTier.type !== 'INVITE_ONLY'));

  const fetchSeatMap = useCallback(async (tierId: string) => {
    setLoadingSeats(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/tiers/${tierId}/seats`);
      if (!res.ok) return;
      const data = await res.json() as { seats: Record<string, ApiSeatStatus> };
      setSeatStatuses(data.seats ?? {});
    } catch { /* ignore */ } finally {
      setLoadingSeats(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (needsSeats && selectedTierId) {
      fetchSeatMap(selectedTierId);
    } else {
      setSeatStatuses({});
    }
  }, [needsSeats, selectedTierId, fetchSeatMap]);

  function handleSelectTier(id: string) {
    if (id === selectedTierId) return;
    setSelectedTierId(id);
    setSelectedSeats(new Set());
    setSeatStatuses({});
  }

  function adjustQty(tierId: string, delta: number) {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return;
    const max = Math.min(tier.orderLimit || 10, tier.capacity - tier.sold);
    setQuantities((prev) => ({ ...prev, [tierId]: Math.max(1, Math.min(max, (prev[tierId] ?? 1) + delta)) }));
    setSelectedSeats(new Set());
  }

  function toggleSeat(seat: string) {
    setSelectedSeats((prev) => {
      const next = new Set(prev);
      next.has(seat) ? next.delete(seat) : next.add(seat);
      return next;
    });
  }

  const seatsReady  = !needsSeats || selectedSeats.size === qty;
  const canCheckout = !!selectedTier && selectedTier.type !== 'INVITE_ONLY' && seatsReady && !reserving;
  const totalPrice  = selectedTier?.type === 'PAID' ? Number(selectedTier.price) * qty : 0;

  async function handleGetTickets() {
    if (!selectedTier) return;
    if (needsSeats && selectedSeats.size > 0) {
      setReserving(true);
      try {
        const sessionId = crypto.randomUUID();
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/tiers/${selectedTier.id}/seats/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ seats: [...selectedSeats].sort(), sessionId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: string };
          alert(err.error ?? 'Some seats are no longer available. Please re-select.');
          setSelectedSeats(new Set());
          await fetchSeatMap(selectedTier.id);
          return;
        }
        const p = new URLSearchParams({ tier: selectedTier.id, qty: String(qty), seats: [...selectedSeats].sort().join(','), session: sessionId });
        router.push(`/e/${shareSlug}/checkout?${p.toString()}`);
      } finally {
        setReserving(false);
      }
    } else {
      const p = new URLSearchParams({ tier: selectedTier.id, qty: String(qty) });
      router.push(`/e/${shareSlug}/checkout?${p.toString()}`);
    }
  }

  return (
    <div className="space-y-3">

      {/* ── Section label ──────────────────────────────────────────────── */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Select ticket type
      </p>

      {/* ── Tier cards ─────────────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {tiers.map((tier) => {
          const kind      = getTierKind(tier);
          const cfg       = KIND_CONFIG[kind];
          const remaining = tier.capacity - tier.sold;
          const soldOut   = remaining <= 0;
          const now       = new Date();
          const saleOpen  = !tier.salesStart || new Date(tier.salesStart) <= now;
          const saleEnded = !!tier.salesEnd  && new Date(tier.salesEnd) < now;
          const unavail   = soldOut || saleEnded || !saleOpen || tier.type === 'INVITE_ONLY';
          const active    = selectedTierId === tier.id;

          return (
            <div key={tier.id}>
              <button
                type="button"
                disabled={unavail}
                onClick={() => !unavail && handleSelectTier(tier.id)}
                className={[
                  'w-full rounded-2xl border-2 text-left',
                  'transition-[transform,box-shadow] duration-[80ms] ease-[ease]',
                  active
                    ? 'border-brand-600 bg-brand-50'
                    : unavail
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-50'
                    : 'border-brand-950 bg-white hover:-translate-x-0.5 hover:-translate-y-0.5',
                ].join(' ')}
                style={
                  active
                    ? { boxShadow: '4px 4px 0 #F07200' }
                    : unavail
                    ? {}
                    : { boxShadow: '4px 4px 0 #333333' }
                }
              >
                <div className="flex items-stretch">

                  {/* Left: cover image / logo thumbnail */}
                  <div className="relative w-[72px] shrink-0 overflow-hidden rounded-l-[14px] bg-brand-950">
                    {coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <>
                        <div
                          className="absolute inset-0 opacity-[0.05]"
                          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '10px 10px' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <TicketIcon className="h-7 w-7 text-brand-500/40" />
                        </div>
                      </>
                    )}
                    {/* Selected overlay */}
                    {active && (
                      <div className="absolute inset-0 flex items-center justify-center bg-brand-600/80">
                        <CheckIcon className="h-7 w-7 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Right: info */}
                  <div className="flex flex-1 flex-col gap-1.5 p-3">
                    {/* Badge */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${cfg.badgeCls}`}>
                        <cfg.Icon className="h-3 w-3" />
                        {cfg.badge}
                      </span>
                      {kind === 'EARLY_BIRD' && !saleEnded && (
                        <span className="rounded-lg border border-brand-300 bg-brand-50 px-1.5 py-0.5 text-[9px] font-bold text-brand-600">
                          Limited time
                        </span>
                      )}
                    </div>

                    {/* Name + price */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-bold text-slate-900">{tier.name}</p>
                      <div className="shrink-0 text-right">
                        {tier.type === 'FREE' ? (
                          <p className="text-sm font-black text-brand-500">Free</p>
                        ) : tier.type === 'INVITE_ONLY' ? (
                          <p className="text-xs font-bold text-slate-400">Invite only</p>
                        ) : saleEnded ? (
                          <p className="text-xs font-bold text-red-400">Sale ended</p>
                        ) : !saleOpen ? (
                          <p className="text-xs font-bold text-slate-400">Coming soon</p>
                        ) : (
                          <>
                            <p className="text-sm font-black text-brand-600">{Number(tier.price).toLocaleString()}</p>
                            <p className="text-[9px] text-slate-400">{tier.currency}</p>
                          </>
                        )}
                        {soldOut ? (
                          <p className="mt-0.5 text-[9px] font-bold text-red-400">Sold out</p>
                        ) : remaining <= 20 ? (
                          <p className="mt-0.5 text-[9px] font-semibold text-brand-500">{remaining} left!</p>
                        ) : null}
                      </div>
                    </div>

                    {/* Description */}
                    {tier.description && (
                      <p className="text-[11px] leading-relaxed text-slate-500 line-clamp-2">{tier.description}</p>
                    )}

                    {/* Perks */}
                    {tier.perks?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tier.perks.slice(0, 3).map((p) => (
                          <span key={p} className="inline-flex items-center gap-0.5 rounded-lg border border-brand-300 bg-brand-50 px-2 py-0.5 text-[9px] font-bold text-brand-600">
                            <CheckIcon className="h-2.5 w-2.5 shrink-0" />
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity stepper — shown inline when selected, no seat map */}
                {active && !hasSeating && !unavail && (
                  <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
                    <span className="text-[11px] font-semibold text-slate-500">How many tickets?</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        disabled={qty <= 1}
                        onClick={(e) => { e.stopPropagation(); adjustQty(tier.id, -1); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-brand-950 bg-white text-brand-950 shadow-[2px_2px_0_#333333] transition-[transform,box-shadow] duration-[80ms] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_#333333] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                      >
                        <MinusIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-extrabold text-slate-900">{qty}</span>
                      <button
                        type="button"
                        disabled={qty >= maxQty}
                        onClick={(e) => { e.stopPropagation(); adjustQty(tier.id, 1); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-brand-950 bg-white text-brand-950 shadow-[2px_2px_0_#333333] transition-[transform,box-shadow] duration-[80ms] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_#333333] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:opacity-30 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Seat map ───────────────────────────────────────────────────── */}
      {needsSeats && selectedTier && (
        <div>
          <p className="mb-2 text-[11px] text-slate-500">
            Pick{' '}
            <span className="font-bold text-slate-800">{qty} seat{qty !== 1 ? 's' : ''}</span>
            {' '}on the map — premium rows (A–C) are closest to the stage.
          </p>
          <SeatMap tier={selectedTier} selected={selectedSeats} onToggle={toggleSeat} maxSeats={qty} seatStatuses={seatStatuses} loading={loadingSeats} />
        </div>
      )}

      {/* ── Ticket types explainer (collapsible) ───────────────────────── */}
      <details className="group rounded-xl border border-slate-100 bg-slate-50">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700">
          <span className="flex items-center gap-2">
            <InfoIcon className="h-3.5 w-3.5 text-slate-400" />
            About ticket types
          </span>
          <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3">
          {EXPLAINER.map(({ Icon, name, desc }) => (
            <div key={name} className="flex gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
              <div>
                <p className="text-xs font-bold text-slate-700">{name}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        disabled={!canCheckout}
        onClick={handleGetTickets}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
        style={{ border: '2px solid #333333', boxShadow: canCheckout ? '4px 4px 0 #333333' : 'none' }}
        whileHover={canCheckout ? { x: -1, y: -1, boxShadow: '5px 5px 0 #333333' } : {}}
        whileTap={canCheckout ? { x: 3, y: 3, boxShadow: '0 0 0 #333333' } : {}}
        transition={{ type: 'spring', stiffness: 500, damping: 22 }}
      >
        <LockIcon className="h-4 w-4 shrink-0" />
        {!selectedTier
          ? 'Select a ticket type'
          : needsSeats && !seatsReady
          ? `Choose ${qty - selectedSeats.size} more seat${qty - selectedSeats.size !== 1 ? 's' : ''}`
          : `Get ${qty > 1 ? `${qty} tickets` : 'ticket'}`
            + (totalPrice > 0 ? ` · ${totalPrice.toLocaleString()} ${selectedTier.currency}` : '')
        }
      </motion.button>

      <p className="text-center text-[11px] text-slate-400">
        Secure checkout · powered by Tranzak
      </p>
    </div>
  );
}
