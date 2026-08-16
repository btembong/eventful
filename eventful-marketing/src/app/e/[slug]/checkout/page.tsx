'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApiFetch } from '@/contexts/auth-context';
import { ThinkingOrb } from 'thinking-orbs';
import { toast } from '@/components/Toast';
import { TicketIcon } from '@/components/icons';

// ─── Tier colour palette ──────────────────────────────────────────────────────

type TierPalette = {
  accent: string;   // left border
  iconBg: string;   // icon circle bg
  iconText: string; // icon colour
  badge: string;    // name badge
  badgeText: string;
  selectedBg: string;
  selectedBorder: string;
  priceText: string;
  label: string;    // tier label shown in badge
};

function getTierPalette(name: string, index: number): TierPalette {
  const n = name.toLowerCase();

  // VVIP / Diamond / Platinum — darkest brand shade
  if (n.includes('vvip') || n.includes('diamond') || n.includes('platinum'))
    return { accent: 'border-l-brand-700', iconBg: 'bg-brand-950', iconText: 'text-white', badge: 'bg-brand-950', badgeText: 'text-white', selectedBg: 'bg-brand-950/5', selectedBorder: 'border-brand-700', priceText: 'text-brand-700', label: 'VVIP' };

  // VIP / Gold / Premium — strong brand orange
  if (n.includes('vip') || n.includes('gold') || n.includes('premium'))
    return { accent: 'border-l-brand-600', iconBg: 'bg-brand-600', iconText: 'text-white', badge: 'bg-brand-600', badgeText: 'text-white', selectedBg: 'bg-brand-50', selectedBorder: 'border-brand-500', priceText: 'text-brand-600', label: 'VIP' };

  // Free / Complimentary — light brand tint
  if (n.includes('free') || n.includes('compli') || n.includes('compl'))
    return { accent: 'border-l-brand-300', iconBg: 'bg-brand-50', iconText: 'text-brand-600', badge: 'bg-brand-50', badgeText: 'text-brand-600', selectedBg: 'bg-brand-50/60', selectedBorder: 'border-brand-300', priceText: 'text-brand-600', label: 'Free' };

  // Invite / Backstage / Press — charcoal brand
  if (n.includes('invite') || n.includes('backstage') || n.includes('press'))
    return { accent: 'border-l-brand-950', iconBg: 'bg-brand-950', iconText: 'text-brand-400', badge: 'bg-brand-950', badgeText: 'text-brand-300', selectedBg: 'bg-brand-950/5', selectedBorder: 'border-brand-950', priceText: 'text-brand-950', label: 'Invite' };

  // Cycling shades for everything else
  const palettes: TierPalette[] = [
    { accent: 'border-l-brand-500', iconBg: 'bg-brand-100', iconText: 'text-brand-600', badge: 'bg-brand-50', badgeText: 'text-brand-700', selectedBg: 'bg-brand-50/60', selectedBorder: 'border-brand-400', priceText: 'text-brand-600', label: 'Standard' },
    { accent: 'border-l-brand-400', iconBg: 'bg-brand-50', iconText: 'text-brand-500', badge: 'bg-brand-50', badgeText: 'text-brand-600', selectedBg: 'bg-brand-50/40', selectedBorder: 'border-brand-300', priceText: 'text-brand-500', label: 'General' },
    { accent: 'border-l-brand-600', iconBg: 'bg-brand-100', iconText: 'text-brand-700', badge: 'bg-brand-100', badgeText: 'text-brand-800', selectedBg: 'bg-brand-100/60', selectedBorder: 'border-brand-500', priceText: 'text-brand-700', label: 'Early Bird' },
  ];
  return palettes[index % palettes.length];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FEE_PCT = 0.10;

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
const STEP_LABELS = ['Tickets', 'Contact', 'Payment'];

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

// ─── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ step }: { step: CheckoutStep }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const done    = i < idx;
        const current = i === idx;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold transition-all ${
                done    ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30' :
                current ? 'border-2 border-brand-600 bg-white text-brand-600 shadow-sm shadow-brand-600/20' :
                          'border-2 border-slate-200 bg-white text-slate-300'
              }`}>
                {done ? (
                  <svg viewBox="0 0 12 12" className="h-3 w-3 fill-white">
                    <path d="M10 3 5 8.5 2 5.5l-.8.8 3.8 3.8 5.8-6.3z" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`mt-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                done || current ? 'text-brand-600' : 'text-slate-300'
              }`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-4 mb-5 h-px w-16 sm:w-28 transition-colors ${i < idx ? 'bg-brand-600' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Promo code field ─────────────────────────────────────────────────────────

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
          {loading
            ? <ThinkingOrb state="breathing" size={20} theme="dark" />
            : 'Apply'}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

// ─── Summary sidebar ──────────────────────────────────────────────────────────

function Summary({ event, tiers, qty, step, promo, onPromoApply, onPromoRemove }: {
  event: EventData;
  tiers: Tier[];
  qty: Record<string, number>;
  step: CheckoutStep;
  promo: PromoResult | null;
  onPromoApply: (r: PromoResult) => void;
  onPromoRemove: () => void;
}) {
  const lines    = tiers.filter(t => (qty[t.id] ?? 0) > 0);
  const subtotal = lines.reduce((s, t) => s + (t.type === 'PAID' ? Number(t.price) * (qty[t.id] ?? 0) : 0), 0);
  const discount = promo ? Math.min(promo.discountAmount, subtotal) : 0;
  const discounted = subtotal - discount;
  const fees     = Math.round(discounted * FEE_PCT);
  const total    = discounted + fees;
  const currency = lines.find(t => t.type === 'PAID')?.currency ?? 'XAF';
  const totalQty = Object.values(qty).reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-extrabold uppercase tracking-wide text-slate-400">Order summary</h3>
      <p className="mb-0.5 text-sm font-bold text-slate-800">{event.title}</p>
      <p className="mb-5 text-xs text-slate-400">{fmtDate(event.startsAt)} · {event.venue}</p>

      {lines.length === 0 ? (
        <p className="rounded-xl bg-slate-50 py-4 text-center text-xs text-slate-400">
          Select tickets to see your order
        </p>
      ) : (
        <div className="space-y-2.5">
          {lines.map(t => {
            const q = qty[t.id] ?? 0;
            return (
              <div key={t.id} className="flex items-start justify-between gap-2 text-sm">
                <span className="text-slate-600">{q} × {t.name}</span>
                <span className="shrink-0 font-semibold text-slate-900">
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

      {/* Promo code input — show on payment step for paid orders */}
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

      <div className="mt-4 border-t border-slate-100 pt-4 flex items-center justify-between">
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

// ─── Release warning modal ────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router   = useRouter();
  const apiFetch = useApiFetch();

  const [event,   setEvent]   = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step,    setStep]    = useState<CheckoutStep>('tickets');

  // Step 1
  const [qty, setQty] = useState<Record<string, number>>({});

  // Step 2
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [phone,        setPhone]        = useState('');
  const [countryCode,  setCountryCode]  = useState('+237');

  // Step 3
  const [orderId,         setOrderId]        = useState<string | null>(null);
  const [paymentUrl,      setPaymentUrl]      = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [orderSuccess,    setOrderSuccess]    = useState(false);
  const [creating,        setCreating]        = useState(false);
  const [error,           setError]           = useState('');
  const [showRelease,     setShowRelease]     = useState(false);
  const [promo,           setPromo]           = useState<PromoResult | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/slug/${encodeURIComponent(slug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEvent(d); })
      .finally(() => setLoading(false));
  }, [slug]);

  const tiers         = event?.tiers ?? [];
  const selectedTiers = tiers.filter(t => (qty[t.id] ?? 0) > 0);
  const totalQty      = Object.values(qty).reduce((a, b) => a + b, 0);
  const canTickets    = totalQty > 0;
  const canContact    = firstName.trim() && lastName.trim() &&
                        email.trim() && emailConfirm.trim() && email === emailConfirm;

  function goTo(s: CheckoutStep) { setStep(s); window.scrollTo(0, 0); }

  function handleBack() {
    if (step === 'payment' && orderId) { setShowRelease(true); return; }
    if (step === 'contact') goTo('tickets');
    else router.push(`/e/${slug}`);
  }

  const handleCreateOrder = useCallback(async () => {
    if (creating || !canContact || !event) return;
    setCreating(true); setError('');
    try {
      let firstPaymentUrl: string | null = null;
      let firstOrderId:    string | null = null;
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
          }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error((d as { message?: string }).message ?? 'Failed to create order');
        }
        const d = await res.json() as { order?: { id?: string }; paymentRequired?: boolean; paymentUrl?: string };
        if (!firstOrderId) firstOrderId = d.order?.id ?? null;
        if (d.paymentRequired && !firstPaymentUrl) { anyPaid = true; firstPaymentUrl = d.paymentUrl ?? null; }
      }

      setOrderId(firstOrderId);
      setPaymentUrl(firstPaymentUrl);
      setPaymentRequired(anyPaid);
      if (!anyPaid) setOrderSuccess(true);
      goTo('payment');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating, canContact, event, selectedTiers, qty, firstName, lastName, email, phone, countryCode, promo, apiFetch]);

  const handleCheckPayment = useCallback(async () => {
    if (!orderId) return;
    setError('');
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${orderId}`);
      if (res.ok) {
        const d = await res.json() as { status?: string };
        if (d.status === 'PAID') {
          setOrderSuccess(true);
          toast.success('Payment confirmed! Your tickets are on the way.');
        } else {
          setError('Payment not confirmed yet. Please complete payment and try again.');
        }
      }
    } catch {}
  }, [orderId, apiFetch]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-white">
        <ThinkingOrb state="breathing" size={64} theme="light" />
        <p className="text-sm font-medium text-slate-400">Loading event…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-slate-500">Event not found.</p>
        <Link href="/events" className="text-sm font-semibold text-brand-600 hover:underline">Browse events</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {showRelease && (
        <ReleaseWarningModal
          onStay={() => setShowRelease(false)}
          onLeave={() => { setShowRelease(false); goTo('contact'); }}
        />
      )}

      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/e/${slug}`}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Back to event">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">Checkout</h1>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5 truncate max-w-[200px] sm:max-w-none">{event.title}</p>
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

      {/* Step bar */}
      <div className="border-b border-slate-200 bg-white py-5 shadow-sm">
        <div className="flex justify-center"><StepBar step={step} /></div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* Left: step content */}
          <div className="min-w-0 flex-1">

            {/* ── Tickets ─────────────────────────────────────────── */}
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
                          {/* Left icon column */}
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
                            </div>

                            {/* Qty stepper */}
                            <div className="flex shrink-0 items-center gap-0">
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
                              <svg viewBox="0 0 12 12" className={`h-2.5 w-2.5 ${pal.iconText}`} fill="currentColor">
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

            {/* ── Contact ──────────────────────────────────────────── */}
            {step === 'contact' && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
                <h2 className="mb-1 text-xl font-extrabold text-slate-900">Contact information</h2>
                <p className="mb-6 text-sm text-slate-400">Your ticket confirmation will be sent to this email address.</p>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {[
                      { label: 'First name', value: firstName, set: setFirstName, placeholder: 'Ama', autoComplete: 'given-name' },
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
                      placeholder="you@example.com"
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
                    <label className="mb-1.5 block text-xs font-bold text-slate-700">Phone number <span className="text-slate-400 font-normal">(optional)</span></label>
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

                  {error && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
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

            {/* ── Payment ──────────────────────────────────────────── */}
            {step === 'payment' && (
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:p-8">
                <h2 className="mb-1 text-xl font-extrabold text-slate-900">Payment</h2>
                <p className="mb-6 text-sm text-slate-400">Complete your payment securely to confirm your tickets.</p>

                {/* Free — success */}
                {orderSuccess && !paymentRequired && (
                  <SuccessCard email={email} slug={slug} paid={false} />
                )}

                {/* Paid — confirmed */}
                {paymentRequired && orderSuccess && (
                  <SuccessCard email={email} slug={slug} paid />
                )}

                {/* Paid — iframe */}
                {paymentRequired && !orderSuccess && paymentUrl && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-blue-500">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs font-medium text-blue-700">Secure payment powered by Tranzak. Do not close this page.</p>
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
                        <button onClick={handleCheckPayment}
                          className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-5 py-2.5 text-sm font-bold text-brand-700 transition hover:bg-brand-100">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                          </svg>
                          I&apos;ve completed payment
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waiting for URL */}
                {paymentRequired && !paymentUrl && !orderSuccess && (
                  <div className="flex flex-col items-center gap-5 py-16">
                    <ThinkingOrb state="connecting" size={64} theme="light" />
                    <p className="text-sm font-medium text-slate-400">Preparing payment…</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div className="w-full lg:w-80 lg:shrink-0">
            <div className="lg:sticky lg:top-8">
              <Summary
                event={event}
                tiers={tiers}
                qty={qty}
                step={step}
                promo={promo}
                onPromoApply={setPromo}
                onPromoRemove={() => setPromo(null)}
              />

              {/* Security note */}
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
    </div>
  );
}

function SuccessCard({ email, slug, paid }: { email: string; slug: string; paid: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-8 w-8 text-emerald-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" />
        </svg>
      </div>
      <div>
        <p className="text-lg font-extrabold text-emerald-800">
          {paid ? 'Payment confirmed!' : "You're registered!"}
        </p>
        <p className="mt-1.5 text-sm text-emerald-600">
          Your tickets have been sent to <strong>{email}</strong>
        </p>
        <p className="mt-1 text-xs text-emerald-500">Check your inbox (and spam folder) for your QR code.</p>
      </div>
      <Link
        href={`/e/${slug}`}
        className="mt-1 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500"
      >
        Back to event
      </Link>
    </div>
  );
}
