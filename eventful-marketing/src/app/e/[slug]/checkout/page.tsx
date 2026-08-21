'use client';

import { useState, useEffect, useRef, useCallback, use, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApiFetch } from '@/contexts/auth-context';
import { ThinkingOrb } from 'thinking-orbs';
import { toast } from '@/components/Toast';
import { TicketIcon, UserIcon, WalletIcon, CheckIcon } from '@/components/icons';

// ─── CSS animations ────────────────────────────────────────────────────────────

const ANIM_CSS = `
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(18px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes ticketPop {
    0%   { opacity: 0; transform: translateY(-16px) scale(0.96); }
    65%  { transform: translateY(3px) scale(1.01); }
    100% { opacity: 1; transform: none; }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%  { transform: translateX(-5px); }
    40%  { transform: translateX(5px); }
    60%  { transform: translateX(-4px); }
    80%  { transform: translateX(4px); }
  }
  @keyframes countPulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.4; }
  }
`;

// ─── Tier colour palette ────────────────────────────────────────────────────────

type TierPalette = {
  accent: string;
  iconBg: string;
  iconText: string;
  badge: string;
  badgeText: string;
  selectedBg: string;
  selectedBorder: string;
  priceText: string;
  label: string;
};

function getTierPalette(name: string, index: number): TierPalette {
  const n = name.toLowerCase();

  if (n.includes('vvip') || n.includes('diamond') || n.includes('platinum'))
    return { accent: 'border-l-brand-950', iconBg: 'bg-brand-950', iconText: 'text-white', badge: 'bg-brand-950', badgeText: 'text-white', selectedBg: 'bg-brand-950/5', selectedBorder: 'border-brand-700', priceText: 'text-brand-700', label: 'VVIP' };

  if (n.includes('vip') || n.includes('gold') || n.includes('premium'))
    return { accent: 'border-l-brand-600', iconBg: 'bg-brand-600', iconText: 'text-white', badge: 'bg-brand-600', badgeText: 'text-white', selectedBg: 'bg-brand-50', selectedBorder: 'border-brand-500', priceText: 'text-brand-600', label: 'VIP' };

  if (n.includes('free') || n.includes('compli'))
    return { accent: 'border-l-brand-400', iconBg: 'bg-brand-50', iconText: 'text-brand-600', badge: 'bg-brand-50', badgeText: 'text-brand-600', selectedBg: 'bg-brand-50/60', selectedBorder: 'border-brand-300', priceText: 'text-brand-600', label: 'Free' };

  if (n.includes('invite') || n.includes('backstage') || n.includes('press'))
    return { accent: 'border-l-brand-950', iconBg: 'bg-brand-950', iconText: 'text-brand-400', badge: 'bg-brand-950', badgeText: 'text-brand-300', selectedBg: 'bg-brand-950/5', selectedBorder: 'border-brand-950', priceText: 'text-brand-950', label: 'Invite' };

  const palettes: TierPalette[] = [
    { accent: 'border-l-brand-500', iconBg: 'bg-brand-100', iconText: 'text-brand-600', badge: 'bg-brand-50',  badgeText: 'text-brand-700', selectedBg: 'bg-brand-50/60',  selectedBorder: 'border-brand-400', priceText: 'text-brand-600', label: 'Standard'   },
    { accent: 'border-l-brand-400', iconBg: 'bg-brand-50',  iconText: 'text-brand-500', badge: 'bg-brand-50',  badgeText: 'text-brand-600', selectedBg: 'bg-brand-50/40',  selectedBorder: 'border-brand-300', priceText: 'text-brand-500', label: 'General'    },
    { accent: 'border-l-brand-600', iconBg: 'bg-brand-100', iconText: 'text-brand-700', badge: 'bg-brand-100', badgeText: 'text-brand-800', selectedBg: 'bg-brand-100/60', selectedBorder: 'border-brand-500', priceText: 'text-brand-700', label: 'Early Bird' },
  ];
  return palettes[index % palettes.length];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FEE_PCT      = 0.10;
const SEAT_HOLD_MS = 10 * 60 * 1000;

const COUNTRY_CODES = [
  { code: '+237', label: '🇨🇲 +237' },
  { code: '+234', label: '🇳🇬 +234' },
  { code: '+254', label: '🇰🇪 +254' },
  { code: '+233', label: '🇬🇭 +233' },
  { code: '+27',  label: '🇿🇦 +27'  },
  { code: '+1',   label: '🇺🇸 +1'   },
  { code: '+44',  label: '🇬🇧 +44'  },
];

type CheckoutStep = 'tickets' | 'contact' | 'payment';
const STEPS: CheckoutStep[] = ['tickets', 'contact', 'payment'];

interface Tier {
  id: string; name: string; type: 'FREE' | 'PAID' | 'INVITE_ONLY';
  price: string; currency: string; capacity: number; sold: number;
  orderLimit: number; description: string | null; perks: string[];
}

interface EventData {
  id: string; title: string; shareSlug: string;
  startsAt: string; venue: string; tiers: Tier[];
}

interface PromoResult {
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  discountAmount: number;
}

function fmtMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString()}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function calcOrder(tiers: Tier[], qty: Record<string, number>, promo: PromoResult | null) {
  const lines      = tiers.filter(t => (qty[t.id] ?? 0) > 0);
  const currency   = lines.find(t => t.type === 'PAID')?.currency ?? 'XAF';
  const subtotal   = lines.reduce((s, t) => s + (t.type === 'PAID' ? Number(t.price) * (qty[t.id] ?? 0) : 0), 0);
  const discount   = promo ? Math.min(promo.discountAmount, subtotal) : 0;
  const discounted = subtotal - discount;
  const fees       = Math.round(discounted * FEE_PCT);
  const total      = discounted + fees;
  const totalQty   = Object.values(qty).reduce((a, b) => a + b, 0);
  return { lines, currency, subtotal, discount, fees, total, totalQty };
}

// ─── Countdown hook ─────────────────────────────────────────────────────────────

function useCountdown(deadlineMs: number | null): number | null {
  const [remaining, setRemaining] = useState<number | null>(
    deadlineMs ? Math.max(0, deadlineMs - Date.now()) : null,
  );
  useEffect(() => {
    if (!deadlineMs) return;
    const id = setInterval(() => setRemaining(Math.max(0, deadlineMs - Date.now())), 1000);
    return () => clearInterval(id);
  }, [deadlineMs]);
  return remaining;
}

// ─── Step bar ───────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Tickets', 'Contact', 'Payment'];
const STEP_ICONS  = [TicketIcon, UserIcon, WalletIcon];

function StepBar({ step }: { step: CheckoutStep }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const done    = i < idx;
        const current = i === idx;
        const StepIcon = STEP_ICONS[i];
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${
                done
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                  : current
                  ? 'border-2 border-brand-600 bg-white text-brand-600 shadow-sm shadow-brand-600/20'
                  : 'border-2 border-slate-200 bg-white text-slate-300'
              }`}>
                {done
                  ? <CheckIcon className="h-4 w-4" />
                  : <StepIcon className="h-4 w-4" />
                }
              </div>
              <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                done || current ? 'text-brand-600' : 'text-slate-300'
              }`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="relative mx-3 mb-5 h-px w-12 overflow-hidden rounded-full bg-slate-200 sm:w-24">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: i < idx ? '100%' : '0%' }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Promo code field ───────────────────────────────────────────────────────────

function PromoField({
  eventId, subtotal, qty, tiers, onApply, onRemove, applied,
}: {
  eventId: string;
  subtotal: number;
  qty: Record<string, number>;
  tiers: Tier[];
  onApply: (r: PromoResult) => void;
  onRemove: () => void;
  applied: PromoResult | null;
}) {
  const apiFetch  = useApiFetch();
  const [code,    setCode]    = useState(applied?.code ?? '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  if (subtotal === 0) return null;

  if (applied) {
    return (
      <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-500">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-bold text-emerald-700">{applied.code}</span>
        </div>
        <button onClick={onRemove} className="text-[11px] font-bold text-emerald-600 underline hover:text-emerald-800">
          Remove
        </button>
      </div>
    );
  }

  async function apply() {
    if (!code.trim()) return;
    setError(''); setLoading(true);
    const orderAmount = tiers
      .filter(t => (qty[t.id] ?? 0) > 0)
      .reduce((sum, t) => sum + Number(t.price) * (qty[t.id] ?? 0), 0);
    const upperCode = code.trim().toUpperCase();
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/discounts/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: upperCode, orderAmount }),
      });
      const data = await res.json() as Omit<PromoResult, 'code'> & { message?: string };
      if (!res.ok) { setError(data.message ?? 'Invalid promo code'); return; }
      onApply({ ...data, code: upperCode });
    } catch {
      setError('Could not apply code. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && apply()}
          placeholder="Promo code"
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold uppercase text-slate-900 outline-none placeholder:font-normal placeholder:normal-case placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          onClick={apply}
          disabled={loading || !code.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-40"
        >
          {loading ? <ThinkingOrb state="breathing" size={20} theme="dark" /> : 'Apply'}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── Summary sidebar ─────────────────────────────────────────────────────────────

function Summary({
  event, tiers, qty, step, promo, seatCountdown, onPromoApply, onPromoRemove,
}: {
  event: EventData;
  tiers: Tier[];
  qty: Record<string, number>;
  step: CheckoutStep;
  promo: PromoResult | null;
  seatCountdown: number | null;
  onPromoApply: (r: PromoResult) => void;
  onPromoRemove: () => void;
}) {
  const { lines, currency, subtotal, discount, fees, total, totalQty } = calcOrder(tiers, qty, promo);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-xs font-extrabold uppercase tracking-widest text-slate-400">Order summary</h3>
      <p className="mb-0.5 text-sm font-bold text-slate-800">{event.title}</p>
      <p className="mb-5 text-xs text-slate-400">{fmtDate(event.startsAt)} · {event.venue}</p>

      {/* Seat hold countdown */}
      {seatCountdown !== null && seatCountdown > 0 && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
          <span style={{ animation: 'countPulse 2s ease-in-out infinite', display: 'inline-block' }}>⏱</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Seats held for</p>
            <p className="font-mono text-sm font-extrabold text-amber-800">
              {String(Math.floor(seatCountdown / 60000)).padStart(2, '0')}
              :{String(Math.floor((seatCountdown % 60000) / 1000)).padStart(2, '0')}
            </p>
          </div>
        </div>
      )}
      {seatCountdown === 0 && (
        <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5">
          <p className="text-xs font-bold text-red-600">Seat hold expired.</p>
          <p className="mt-0.5 text-[11px] text-red-500">Please go back and select seats again.</p>
        </div>
      )}

      {/* Ticket lines — mini ticket cards */}
      {lines.length === 0 ? (
        <p className="rounded-xl bg-slate-50 py-4 text-center text-xs text-slate-400">
          Select tickets to see your order
        </p>
      ) : (
        <div className="space-y-2">
          {lines.map((t) => {
            const q   = qty[t.id] ?? 0;
            const pal = getTierPalette(t.name, tiers.indexOf(t));
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-l-4 bg-slate-50 px-3 py-2.5 ${pal.accent}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800">{t.name}</p>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-px text-[9px] font-bold uppercase tracking-wide ${pal.badge} ${pal.badgeText}`}>
                    {q} × {pal.label}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-extrabold text-slate-900">
                  {t.type === 'FREE' ? 'Free' : fmtMoney(Number(t.price) * q, currency)}
                </span>
              </div>
            );
          })}

          {subtotal > 0 && (
            <>
              <div className="my-1 h-px bg-slate-100" />

              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M5.5 9.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5ZM5.5 7a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1H6A.5.5 0 0 1 5.5 7ZM8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Z" />
                    </svg>
                    Promo ({promo!.code})
                  </span>
                  <span className="font-semibold text-emerald-600">−{fmtMoney(discount, currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  Service fee
                  <span title="10% platform fee" className="inline-flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-slate-300 text-[9px]">i</span>
                </span>
                <span>{fmtMoney(fees, currency)}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Promo code — shown on payment step */}
      {step === 'payment' && (
        <PromoField
          eventId={event.id}
          subtotal={subtotal}
          qty={qty}
          tiers={tiers}
          onApply={onPromoApply}
          onRemove={onPromoRemove}
          applied={promo}
        />
      )}

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <span className="text-sm font-extrabold text-slate-900">Total</span>
        <span className="text-base font-extrabold text-slate-900">
          {lines.length === 0 ? '—'
            : subtotal === 0 ? `${totalQty} free ticket${totalQty > 1 ? 's' : ''}`
            : fmtMoney(total, currency)}
        </span>
      </div>
    </div>
  );
}

// ─── Release warning modal ───────────────────────────────────────────────────────

function ReleaseWarningModal({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onStay} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-amber-600">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5zM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75m0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5" clipRule="evenodd" />
          </svg>
        </div>
        <h3 className="mb-2 text-lg font-extrabold text-slate-900">Release your tickets?</h3>
        <p className="mb-6 text-sm text-slate-500">
          Going back will abandon your current order. Your selected tickets will be released and may become unavailable.
        </p>
        <div className="flex gap-3">
          <button onClick={onLeave}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
            Go back
          </button>
          <button onClick={onStay}
            className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-500">
            Continue payment
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading screen ──────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white">
      <ThinkingOrb state="breathing" size={64} theme="light" />
      <p className="text-sm font-medium text-slate-400">Loading event…</p>
    </div>
  );
}

// ─── Page export (Suspense wrapper for useSearchParams) ──────────────────────────

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CheckoutInner params={params} />
    </Suspense>
  );
}

// ─── Main checkout component ─────────────────────────────────────────────────────

function CheckoutInner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router   = useRouter();
  const apiFetch = useApiFetch();
  const searchParams = useSearchParams();

  // Pre-fill from TicketSelector URL params
  const initTierId   = searchParams.get('tier') ?? null;
  const initQtyNum   = Math.max(1, parseInt(searchParams.get('qty') ?? '1', 10) || 1);
  const initSeats    = (searchParams.get('seats') ?? '').split(',').filter(Boolean);
  const initSession  = searchParams.get('session') ?? null;

  const [event,   setEvent]   = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step,    setStep]    = useState<CheckoutStep>('tickets');
  const [animKey, setAnimKey] = useState(0);

  // Step 1 — pre-filled from TicketSelector URL
  const [qty, setQty] = useState<Record<string, number>>(
    initTierId ? { [initTierId]: initQtyNum } : {},
  );

  // Seat hold countdown — 10 min from page load if seats were pre-selected
  const [seatDeadline] = useState<number | null>(
    initSeats.length > 0 ? Date.now() + SEAT_HOLD_MS : null,
  );
  const seatCountdown = useCountdown(seatDeadline);

  // Step 2
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [phone,        setPhone]        = useState('');
  const [countryCode,  setCountryCode]  = useState('+237');

  // Invite codes keyed by tierId (for INVITE_ONLY tiers)
  const [inviteCodes, setInviteCodes] = useState<Record<string, string>>({});

  // Step 3 — supports sequential multi-tier payments
  const [paymentQueue,    setPaymentQueue]     = useState<Array<{ orderId: string; paymentUrl: string }>>([]);
  const [orderId,         setOrderId]          = useState<string | null>(null);
  const [paymentUrl,      setPaymentUrl]        = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired]   = useState(false);
  const [orderSuccess,    setOrderSuccess]      = useState(false);
  const [paidCount,       setPaidCount]         = useState(0); // how many payments done
  const [creating,        setCreating]          = useState(false);
  const [error,           setError]             = useState('');
  const [showRelease,     setShowRelease]       = useState(false);
  const [promo,           setPromo]             = useState<PromoResult | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch event
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/slug/${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEvent(d); })
      .finally(() => setLoading(false));
  }, [slug]);

  // Confetti burst on successful order
  useEffect(() => {
    if (!orderSuccess) return;
    import('canvas-confetti').then(m => {
      const fire = m.default;
      fire({ particleCount: 150, spread: 90, origin: { y: 0.55 }, colors: ['#F07200', '#333333', '#F0F0F0', '#FFB347', '#ffffff'], zIndex: 9999 });
      setTimeout(() => fire({ particleCount: 80, spread: 60, origin: { x: 0.15, y: 0.6 }, colors: ['#F07200', '#FFB347'], zIndex: 9999 }), 400);
      setTimeout(() => fire({ particleCount: 80, spread: 60, origin: { x: 0.85, y: 0.6 }, colors: ['#F07200', '#FFB347'], zIndex: 9999 }), 650);
    }).catch(() => { /* ignore if unavailable */ });
  }, [orderSuccess]);

  const tiers         = event?.tiers ?? [];
  const selectedTiers = tiers.filter(t => (qty[t.id] ?? 0) > 0);
  const { currency, subtotal, total, totalQty } = calcOrder(tiers, qty, promo);
  const inviteCodesMissing = selectedTiers.some(
    t => t.type === 'INVITE_ONLY' && !(inviteCodes[t.id]?.trim())
  );
  const canTickets = totalQty > 0 && !inviteCodesMissing;
  const canContact = !!(firstName.trim() && lastName.trim() &&
                     email.trim() && emailConfirm.trim() && email === emailConfirm);

  function goTo(s: CheckoutStep) {
    setStep(s);
    setAnimKey(k => k + 1);
    window.scrollTo(0, 0);
  }

  function handleBack() {
    if (step === 'payment' && orderId) { setShowRelease(true); return; }
    if (step === 'contact') goTo('tickets');
    else router.push(`/e/${slug}`);
  }

  const handleCreateOrder = useCallback(async () => {
    if (creating || !canContact || !event) return;
    setCreating(true); setError('');
    try {
      const queue: Array<{ orderId: string; paymentUrl: string }> = [];
      let firstFreeOrderId: string | null = null;
      let anyPaid = false;

      for (const tier of selectedTiers) {
        const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tierId:     tier.id,
            quantity:   qty[tier.id],
            buyerName:  `${firstName.trim()} ${lastName.trim()}`,
            buyerEmail: email.trim(),
            buyerPhone: phone.trim() ? `${countryCode}${phone.trim()}` : undefined,
            promoCode:  promo?.code,
            inviteCode: inviteCodes[tier.id] ?? undefined,
            ...(tier.id === initTierId && initSeats.length > 0 ? { seats: initSeats, sessionId: initSession } : {}),
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as { message?: string }).message ?? 'Failed to create order');
        }
        const d = await res.json() as { order?: { id?: string }; paymentRequired?: boolean; paymentUrl?: string };
        if (d.paymentRequired && d.paymentUrl && d.order?.id) {
          anyPaid = true;
          queue.push({ orderId: d.order.id, paymentUrl: d.paymentUrl });
        } else if (!anyPaid && d.order?.id) {
          firstFreeOrderId = d.order.id;
        }
      }

      if (anyPaid) {
        setPaymentQueue(queue);
        setOrderId(queue[0].orderId);
        setPaymentUrl(queue[0].paymentUrl);
        setPaymentRequired(true);
      } else {
        setOrderId(firstFreeOrderId);
        setPaymentRequired(false);
        setOrderSuccess(true);
      }
      goTo('payment');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating, canContact, event, selectedTiers, qty, firstName, lastName, email, phone, countryCode, promo, inviteCodes, apiFetch]);

  const handleCheckPayment = useCallback(async (retries = 0) => {
    if (!orderId) return;
    setError('');

    function confirmPaid() {
      const newQueue = paymentQueue.slice(1);
      setPaidCount(c => c + 1);
      if (newQueue.length > 0) {
        setPaymentQueue(newQueue);
        setOrderId(newQueue[0].orderId);
        setPaymentUrl(newQueue[0].paymentUrl);
        toast.success('Payment confirmed! Complete the next one.');
      } else {
        setOrderSuccess(true);
        toast.success('Payment confirmed! Your tickets are on the way.');
      }
    }

    function scheduleRetry() {
      if (retries < 5) {
        setTimeout(() => handleCheckPayment(retries + 1), 2500);
      } else {
        setError('Payment not confirmed yet. Please try again or click the button below.');
      }
    }

    try {
      // First attempt: call verify which talks to Tranzak directly; use its response
      if (retries === 0) {
        const vRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}/verify`, { method: 'POST' });
        if (vRes.ok) {
          const vData = await vRes.json() as { status?: string };
          if (vData.status === 'PAID') { confirmPaid(); return; }
        }
      }

      // Poll order status (also covers webhook-confirmed payments)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}`);
      if (res.ok) {
        const d = await res.json() as { status?: string };
        if (d.status === 'PAID') { confirmPaid(); } else { scheduleRetry(); }
      } else {
        scheduleRetry();
      }
    } catch {
      scheduleRetry();
    }
  }, [orderId, paymentQueue, apiFetch]);

  // Listen for payment-complete postMessage from /payment/return iframe page
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'tranzak-complete') handleCheckPayment();
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [handleCheckPayment]);

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-slate-500">Event not found.</p>
        <Link href="/events" className="text-sm font-semibold text-brand-600 hover:underline">Browse events</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-0">
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />

      {showRelease && (
        <ReleaseWarningModal
          onStay={() => setShowRelease(false)}
          onLeave={() => { setShowRelease(false); goTo('contact'); }}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">Checkout</h1>
              <p className="mt-0.5 max-w-[200px] truncate text-[11px] leading-none text-slate-400 sm:max-w-none">
                {event.title}
              </p>
            </div>
          </div>
          <Link href={`/e/${slug}`}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close checkout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </Link>
        </div>
      </div>

      {/* ── Step bar ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white py-5 shadow-sm">
        <div className="flex justify-center">
          <StepBar step={step} />
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* Left: step content — slides in on each step change */}
          <div
            key={animKey}
            className="min-w-0 flex-1"
            style={{ animation: 'slideInRight 0.28s ease both' }}
          >

            {/* ── Step 1: Tickets ──────────────────────────────────────────── */}
            {step === 'tickets' && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
                <h2 className="mb-1 text-xl font-extrabold text-slate-900">Choose your tickets</h2>
                <p className="mb-6 text-sm text-slate-400">{fmtDate(event.startsAt)} · {event.venue}</p>

                {tiers.length === 0 ? (
                  <p className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-400">
                    No tickets available for this event.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {tiers.map((tier, idx) => {
                      const remaining = tier.capacity - tier.sold;
                      const soldOut   = remaining <= 0;
                      const maxQty    = Math.min(tier.orderLimit, remaining);
                      const fee       = tier.type === 'PAID' ? Math.round(Number(tier.price) * FEE_PCT) : 0;
                      const count     = qty[tier.id] ?? 0;
                      const selected  = count > 0;
                      const pal       = getTierPalette(tier.name, idx);

                      return (
                        <div
                          key={tier.id}
                          className={`relative flex overflow-hidden rounded-xl border-2 border-l-4 transition-all ${pal.accent} ${
                            soldOut
                              ? 'border-slate-100 bg-slate-50 opacity-60'
                              : selected
                                ? `${pal.selectedBorder} ${pal.selectedBg} shadow-md`
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          {/* Icon column */}
                          <div className="flex w-16 shrink-0 flex-col items-center justify-start gap-2 border-r border-dashed border-slate-200 px-2 py-4 sm:w-20">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${pal.iconBg}`}>
                              <TicketIcon className={`h-5 w-5 ${pal.iconText}`} />
                            </div>
                            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide ${pal.badge} ${pal.badgeText}`}>
                              {pal.label}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex flex-1 flex-col justify-between gap-3 p-4 sm:flex-row sm:items-start">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-extrabold text-slate-900">{tier.name}</p>

                              {tier.type === 'FREE' ? (
                                <p className={`mt-0.5 text-base font-extrabold ${pal.priceText}`}>Free</p>
                              ) : tier.type === 'PAID' ? (
                                <div className="mt-0.5">
                                  <span className={`text-base font-extrabold ${pal.priceText}`}>
                                    {tier.currency} {(Number(tier.price) + fee).toLocaleString()}
                                  </span>
                                  <span className="ml-1.5 text-[11px] text-slate-400">
                                    incl. {tier.currency} {fee.toLocaleString()} fee
                                  </span>
                                </div>
                              ) : (
                                <p className="mt-0.5 text-xs font-bold text-fuchsia-600">Invite only</p>
                              )}

                              {tier.description && (
                                <p className="mt-2 text-xs leading-relaxed text-slate-500">{tier.description}</p>
                              )}

                              {tier.perks.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                  {tier.perks.map(perk => (
                                    <span key={perk} className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${pal.badge} ${pal.badgeText}`}>
                                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current">
                                        <path d="M10 3 5 8.5 2 5.5l-.8.8 3.8 3.8 5.8-6.3z" />
                                      </svg>
                                      {perk}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {remaining > 0 && remaining <= 10 && (
                                <p className="mt-2 flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                                    <path d="M8.22 1.754a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368L8.22 1.754Zm-1.763-.707a1.75 1.75 0 0 1 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-.25-5.25a.75.75 0 0 0-1.5 0v2.5a.75.75 0 0 0 1.5 0v-2.5Z" />
                                  </svg>
                                  Only {remaining} left!
                                </p>
                              )}

                              {/* Invite code input — shown inline when tier is selected */}
                              {tier.type === 'INVITE_ONLY' && count > 0 && (
                                <div className="mt-3">
                                  <input
                                    type="text"
                                    value={inviteCodes[tier.id] ?? ''}
                                    onChange={e => setInviteCodes(p => ({ ...p, [tier.id]: e.target.value }))}
                                    placeholder="Enter invite code"
                                    className="w-full rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-semibold text-fuchsia-900 outline-none placeholder:font-normal placeholder:text-fuchsia-400 focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-400/20"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Qty stepper */}
                            <div className="flex shrink-0 items-center">
                              {soldOut ? (
                                <span className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-400">Sold out</span>
                              ) : (
                                <div className="flex items-center overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => setQty(p => ({ ...p, [tier.id]: Math.max(0, (p[tier.id] ?? 0) - 1) }))}
                                    disabled={count === 0}
                                    className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                                  >
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                      <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                  <span className="w-8 text-center text-sm font-bold text-slate-900">{count}</span>
                                  <button
                                    type="button"
                                    onClick={() => setQty(p => ({ ...p, [tier.id]: Math.min(maxQty, (p[tier.id] ?? 0) + 1) }))}
                                    disabled={count >= maxQty}
                                    className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:bg-slate-50 disabled:opacity-30"
                                  >
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Selected check badge */}
                          {!soldOut && selected && (
                            <div className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full ${pal.iconBg}`}>
                              <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 fill-current ${pal.iconText}`}>
                                <path d="M10 3 5 8.5 2 5.5l-.8.8 3.8 3.8 5.8-6.3z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <button onClick={() => router.push(`/e/${slug}`)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                    Cancel
                  </button>
                  <button disabled={!canTickets} onClick={() => goTo('contact')}
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40">
                    Continue
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Contact ───────────────────────────────────────────── */}
            {step === 'contact' && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
                <h2 className="mb-1 text-xl font-extrabold text-slate-900">{"Who's coming?"}</h2>
                <p className="mb-6 text-sm text-slate-400">{"We'll send your tickets here — double-check your email!"}</p>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      { label: 'First name', value: firstName, set: setFirstName, placeholder: 'Ama',   autoComplete: 'given-name'  },
                      { label: 'Last name',  value: lastName,  set: setLastName,  placeholder: 'Mbeki', autoComplete: 'family-name' },
                    ].map(({ label, value, set: setter, placeholder, autoComplete }) => (
                      <div key={label}>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                          {label} <span className="text-brand-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={value}
                          placeholder={placeholder}
                          autoComplete={autoComplete}
                          onChange={e => setter(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Email address <span className="text-brand-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      placeholder="you@example.com"
                      autoComplete="email"
                      onChange={e => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Confirm email <span className="text-brand-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={emailConfirm}
                      placeholder="one more time, just to be sure"
                      autoComplete="email"
                      onChange={e => setEmailConfirm(e.target.value)}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500/20 ${
                        emailConfirm && email !== emailConfirm
                          ? 'border-red-300 bg-red-50 focus:border-red-400'
                          : 'border-slate-200 bg-white focus:border-brand-500'
                      }`}
                    />
                    {emailConfirm && email !== emailConfirm && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14ZM8 5a.75.75 0 0 0-.75.75v3a.75.75 0 0 0 1.5 0v-3A.75.75 0 0 0 8 5Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                        </svg>
                        Email addresses do not match
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">
                      Phone number <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={countryCode}
                        onChange={e => setCountryCode(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      >
                        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                      <input
                        type="tel"
                        value={phone}
                        placeholder="677 000 000"
                        onChange={e => setPhone(e.target.value)}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                  </div>

                  {/* Error — shakes on each new message */}
                  {error && (
                    <div
                      key={error}
                      style={{ animation: 'shake 0.4s ease' }}
                      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-red-400">
                        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button onClick={handleBack}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                    Back
                  </button>
                  <button
                    disabled={!canContact || creating}
                    onClick={handleCreateOrder}
                    className="flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {creating ? (
                      <>
                        <ThinkingOrb state="breathing" size={20} theme="dark" />
                        Processing…
                      </>
                    ) : (
                      <>
                        Continue
                        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                          <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Payment ───────────────────────────────────────────── */}
            {step === 'payment' && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
                <h2 className="mb-1 text-xl font-extrabold text-slate-900">
                  Payment{paymentQueue.length > 1 ? ` (${paidCount + 1} of ${paidCount + paymentQueue.length})` : ''}
                </h2>
                <p className="mb-6 text-sm text-slate-400">Complete your payment securely to confirm your tickets.</p>

                {/* Free — instant success */}
                {orderSuccess && !paymentRequired && (
                  <SuccessCard email={email} slug={slug} paid={false} />
                )}

                {/* Paid — confirmed after check */}
                {paymentRequired && orderSuccess && (
                  <SuccessCard email={email} slug={slug} paid />
                )}

                {/* Paid — show iframe */}
                {paymentRequired && !orderSuccess && paymentUrl && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-brand-500">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-medium text-brand-700">Secure payment powered by Tranzak. Do not close this page.</p>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
                      <iframe
                        ref={iframeRef}
                        src={paymentUrl}
                        title="Secure Payment"
                        className="h-[580px] w-full border-none"
                        sandbox="allow-forms allow-popups allow-scripts allow-same-origin allow-top-navigation-by-user-activation"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={handleBack}
                        className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
                        Back
                      </button>
                      <div className="flex items-center gap-3">
                        {error && (
                          <p className="max-w-[200px] text-right text-xs text-red-500">{error}</p>
                        )}
                        <button onClick={() => handleCheckPayment()}
                          className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                          </svg>
                          {"I've completed payment"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting for payment URL */}
                {paymentRequired && !paymentUrl && !orderSuccess && (
                  <div className="flex flex-col items-center gap-5 py-16">
                    <ThinkingOrb state="connecting" size={64} theme="light" />
                    <p className="text-sm font-medium text-slate-400">Preparing payment…</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Order summary */}
          <div className="w-full lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-8">
              <Summary
                event={event}
                tiers={tiers}
                qty={qty}
                step={step}
                promo={promo}
                seatCountdown={seatCountdown}
                onPromoApply={setPromo}
                onPromoRemove={() => setPromo(null)}
              />
              <div className="mt-4 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6A1.5 1.5 0 0 0 3 7.5v5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 6V4.5A3.5 3.5 0 0 0 8 1Zm2.5 5V4.5a2.5 2.5 0 0 0-5 0V6h5Z" clipRule="evenodd" />
                </svg>
                Secured by Eventful · SSL encrypted
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky total bar ──────────────────────────────────────────── */}
      {step !== 'payment' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 py-3 shadow-2xl backdrop-blur-sm lg:hidden">
          <div className="mx-auto max-w-5xl px-4">
            {totalQty > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">
                    {totalQty} ticket{totalQty !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm font-extrabold text-slate-900">
                    {subtotal === 0 ? 'Free' : fmtMoney(total, currency)}
                  </p>
                </div>
                {step === 'tickets' && (
                  <button
                    onClick={() => goTo('contact')}
                    disabled={!canTickets}
                    className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-500 disabled:opacity-40"
                  >
                    Continue →
                  </button>
                )}
                {step === 'contact' && (
                  <button
                    onClick={handleCreateOrder}
                    disabled={!canContact || creating}
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 disabled:opacity-40"
                  >
                    {creating && <ThinkingOrb state="breathing" size={20} theme="dark" />}
                    {creating ? 'Processing…' : 'Pay now'}
                  </button>
                )}
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400">Select tickets to continue</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Success card ─────────────────────────────────────────────────────────────

function SuccessCard({ email, slug, paid }: { email: string; slug: string; paid: boolean }) {
  return (
    <div
      className="flex flex-col items-center gap-5 rounded-2xl border border-brand-200 bg-brand-50 px-6 py-14 text-center"
      style={{ animation: 'ticketPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 shadow-sm shadow-brand-500/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 text-brand-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
        </svg>
      </div>
      <div>
        <p className="text-lg font-extrabold text-brand-900">
          {paid ? 'Payment confirmed! 🎉' : "You're in! 🎉"}
        </p>
        <p className="mt-1.5 text-sm text-brand-700">
          Your ticket{paid ? 's are' : ' is'} confirmed for <strong>{email}</strong>
        </p>
        <p className="mt-1 text-xs text-brand-500">Check your inbox (and spam folder) for your QR code.</p>
      </div>
      <Link
        href={`/e/${slug}`}
        className="mt-1 rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white shadow-sm shadow-brand-600/25 transition hover:bg-brand-500"
      >
        Back to event
      </Link>
    </div>
  );
}
