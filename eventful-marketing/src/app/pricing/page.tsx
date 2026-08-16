import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import {
  CheckIcon, TicketIcon, ChartIcon, UsersGroupIcon,
  ShieldCheckIcon, WalletIcon, BellIcon, QrCodeIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'Pricing — Eventful',
  description: 'Simple, transparent pricing. Free for attendees. 5% fee per paid ticket for creators. No monthly subscriptions.',
};

// ─── Data ──────────────────────────────────────────────────────────────────

const ATTENDEE_FEATURES = [
  'Buy tickets instantly',
  'QR ticket on your phone',
  'SMS & email reminders',
  'Discover events near you',
  'Refund requests',
  'Order history',
];

const CREATOR_FREE = [
  'Unlimited free events',
  'Up to 5 paid events per month',
  'QR check-in tools',
  'Basic analytics',
  'Email support',
];

const CREATOR_PRO = [
  'Everything in Starter',
  'Unlimited paid events',
  'Advanced analytics & reports',
  'Priority payout (24 h)',
  'Webhooks & API access',
  'CSV/XLSX export',
  'Broadcast announcements to attendees',
  'Dedicated account manager',
  'Custom payout schedule',
  'Priority support',
];

const FAQS = [
  {
    q: 'When do I get paid?',
    a: 'Payouts are processed within 48 hours of your event ending. Pro creators get priority 24-hour payouts. Funds are transferred directly to your MTN MoMo, Orange Money, or bank account.',
  },
  {
    q: 'What is the 5% platform fee?',
    a: 'Eventful charges a 5% fee on each paid ticket sale. This fee is deducted from the payout, not added to the ticket price. Free events never incur any fees.',
  },
  {
    q: 'Are there any setup or monthly fees?',
    a: 'No. There are no setup fees, monthly subscriptions, or hidden charges. You only pay when you sell a paid ticket.',
  },
  {
    q: 'Can I refund attendees?',
    a: 'Yes. You can issue full or partial refunds from your creator dashboard. Refunds are processed within 3–5 business days back to the original payment method.',
  },
  {
    q: 'How do I receive payouts?',
    a: 'You set up your preferred payout method (MTN MoMo, Orange Money, or bank transfer) during the creator application. You can update it any time in Settings.',
  },
  {
    q: 'Is there a minimum payout amount?',
    a: 'The minimum payout amount is XAF 5,000. Balances below this threshold are rolled over to the next payout cycle.',
  },
];

// ─── Components ────────────────────────────────────────────────────────────

function FeatureRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100">
        <CheckIcon className="h-3 w-3 text-brand-600" />
      </span>
      <span className="text-sm text-slate-700">{text}</span>
    </li>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-slate-100 py-5 last:border-0">
      <p className="text-sm font-bold text-slate-900">{q}</p>
      <p className="mt-1.5 text-sm text-slate-500">{a}</p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="bg-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 text-center px-4">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-bold text-brand-600">
            <CheckIcon className="h-3.5 w-3.5" />
            Transparent, no-surprise pricing
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Pay only when<br />you sell tickets
          </h1>
          <p className="mt-4 text-lg text-slate-500">
            Eventful is free for attendees. Creators pay a simple 5% fee per paid ticket sold —
            no monthly subscriptions, no setup fees, no hidden costs.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Attendee — Free */}
            <div className="flex flex-col rounded-3xl bg-slate-50 p-8 ring-1 ring-slate-200">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200">
                <TicketIcon className="h-5 w-5 text-slate-600" />
              </div>
              <p className="mt-5 text-lg font-extrabold text-slate-900">Attendee</p>
              <p className="mt-1 text-sm text-slate-500">For event-goers who want to discover and attend events.</p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-extrabold text-slate-900">Free</span>
                <span className="mb-1 text-sm text-slate-400">forever</span>
              </div>
              <Link
                href="/signup"
                className="mt-6 block w-full rounded-xl border-2 border-slate-300 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-brand-400 hover:text-brand-600"
              >
                Create free account
              </Link>
              <ul className="mt-8 space-y-3">
                {ATTENDEE_FEATURES.map((f) => <FeatureRow key={f} text={f} />)}
              </ul>
            </div>

            {/* Creator Starter */}
            <div className="flex flex-col rounded-3xl bg-white p-8 ring-2 ring-brand-200 relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100">
                <ChartIcon className="h-5 w-5 text-brand-600" />
              </div>
              <p className="mt-5 text-lg font-extrabold text-slate-900">Creator</p>
              <p className="mt-1 text-sm text-slate-500">For independent organisers and growing event businesses.</p>
              <div className="mt-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">5%</span>
                  <span className="mb-1 text-sm text-slate-400">per paid ticket</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Free for free events. No monthly fee.</p>
              </div>
              <Link
                href="/become-creator"
                className="mt-6 block w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
              >
                Apply as Creator →
              </Link>
              <ul className="mt-8 space-y-3">
                {CREATOR_FREE.map((f) => <FeatureRow key={f} text={f} />)}
              </ul>
            </div>

            {/* Enterprise */}
            <div className="flex flex-col rounded-3xl bg-brand-950 p-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600">
                <UsersGroupIcon className="h-5 w-5 text-white" />
              </div>
              <p className="mt-5 text-lg font-extrabold text-white">Enterprise</p>
              <p className="mt-1 text-sm text-white/50">For large event companies, stadiums, and festival organisers.</p>
              <div className="mt-6">
                <span className="text-2xl font-extrabold text-white">Custom pricing</span>
                <p className="mt-1 text-xs text-white/40">Volume discounts available</p>
              </div>
              <a
                href="mailto:enterprise@eventful.cm"
                className="mt-6 block w-full rounded-xl border-2 border-white/20 py-3 text-center text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10"
              >
                Contact sales
              </a>
              <ul className="mt-8 space-y-3">
                {CREATOR_PRO.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600">
                      <CheckIcon className="h-3 w-3 text-brand-300" />
                    </span>
                    <span className="text-sm text-white/70">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-8 text-center text-xl font-extrabold text-slate-900">Full feature comparison</h2>
          <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-2/5">Feature</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Attendee</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-brand-600">Creator</th>
                  <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {[
                  { feature: 'Browse & buy tickets',         attendee: true,      creator: true,       enterprise: true },
                  { feature: 'QR ticket on phone',           attendee: true,      creator: true,       enterprise: true },
                  { feature: 'Email & SMS reminders',        attendee: true,      creator: true,       enterprise: true },
                  { feature: 'Refund requests',              attendee: true,      creator: true,       enterprise: true },
                  { feature: 'Create free events',           attendee: false,     creator: true,       enterprise: true },
                  { feature: 'Create paid events',           attendee: false,     creator: '5% fee',   enterprise: 'Custom' },
                  { feature: 'QR check-in tools',            attendee: false,     creator: true,       enterprise: true },
                  { feature: 'Real-time analytics',          attendee: false,     creator: 'Basic',    enterprise: 'Advanced' },
                  { feature: 'Broadcast to attendees',       attendee: false,     creator: true,       enterprise: true },
                  { feature: 'Webhook integrations',         attendee: false,     creator: true,       enterprise: true },
                  { feature: 'CSV / XLSX export',            attendee: false,     creator: true,       enterprise: true },
                  { feature: 'Payout timeline',              attendee: false,     creator: '48 h',     enterprise: '24 h' },
                  { feature: 'Team & staff access',          attendee: false,     creator: true,       enterprise: true },
                  { feature: 'API access',                   attendee: false,     creator: false,      enterprise: true },
                  { feature: 'Dedicated account manager',    attendee: false,     creator: false,      enterprise: true },
                  { feature: 'Custom payout schedule',       attendee: false,     creator: false,      enterprise: true },
                  { feature: 'Volume fee discounts',         attendee: false,     creator: false,      enterprise: true },
                ].map(({ feature, attendee, creator, enterprise }, i) => {
                  const cell = (val: boolean | string) => {
                    if (val === true)  return <span className="flex justify-center"><CheckIcon className="h-4 w-4 text-brand-500" /></span>;
                    if (val === false) return <span className="block text-center text-slate-300">—</span>;
                    return <span className="block text-center text-xs font-semibold text-slate-700">{val}</span>;
                  };
                  return (
                    <tr key={feature} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="px-6 py-3.5 text-sm font-medium text-slate-700">{feature}</td>
                      <td className="px-6 py-3.5">{cell(attendee)}</td>
                      <td className="px-6 py-3.5 bg-brand-50/30">{cell(creator)}</td>
                      <td className="px-6 py-3.5">{cell(enterprise)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How it works for creators */}
      <section className="border-t border-slate-100 bg-slate-50 px-4 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">How creator payouts work</h2>
            <p className="mt-2 text-slate-500">From ticket sale to your account in 4 steps.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { step: '01', icon: TicketIcon, title: 'Attendee pays',     desc: 'Ticket buyer pays via MTN MoMo, Orange Money, or card through Tranzak.' },
              { step: '02', icon: ShieldCheckIcon, title: 'We verify',    desc: 'Eventful confirms the payment and issues the QR ticket automatically.' },
              { step: '03', icon: WalletIcon, title: '5% fee deducted',   desc: 'Our platform fee is deducted from the gross amount. The rest is yours.' },
              { step: '04', icon: BellIcon, title: 'You get paid',         desc: 'Within 48 h of the event ending, funds hit your MoMo or bank account.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-[11px] font-extrabold text-brand-600 bg-brand-50 rounded-full px-2 py-0.5">{step}</span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100">
                    <Icon className="h-4.5 w-4.5 text-brand-600" />
                  </div>
                </div>
                <p className="text-sm font-extrabold text-slate-900">{title}</p>
                <p className="mt-1 text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">Everything you need to run great events</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: QrCodeIcon,      title: 'QR check-in',       desc: 'Door staff scan tickets instantly with any smartphone — no extra hardware needed.' },
              { icon: ChartIcon,       title: 'Real-time analytics', desc: 'Live revenue, sales velocity, and attendance dashboards. Know your numbers instantly.' },
              { icon: BellIcon,        title: 'Email & SMS reminders', desc: 'Automated reminders go out to attendees 24 h and 2 h before the event.' },
              { icon: ShieldCheckIcon, title: 'Webhook integrations', desc: 'Receive real-time HTTP callbacks for ticket sales, check-ins, and cancellations.' },
              { icon: WalletIcon,      title: 'Mobile money payouts', desc: 'MTN MoMo and Orange Money payouts supported natively — no bank account required.' },
              { icon: UsersGroupIcon,  title: 'Team access',         desc: 'Add door staff and co-organisers to your events with role-based permissions.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 mb-4">
                  <Icon className="h-5 w-5 text-brand-600" />
                </div>
                <p className="text-sm font-extrabold text-slate-900">{title}</p>
                <p className="mt-1 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee calculator */}
      <section className="border-t border-slate-100 bg-brand-950 px-4 py-20">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl font-extrabold text-white">Simple fee calculation</h2>
          <p className="mt-2 text-white/50">See exactly how much you keep per ticket.</p>
          <div className="mt-10 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-3.5 text-xs font-bold text-white/40 uppercase tracking-wider">Ticket price</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-white/40 uppercase tracking-wider">Platform fee (5%)</th>
                  <th className="px-5 py-3.5 text-xs font-bold text-white/40 uppercase tracking-wider">You receive</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {[
                  ['XAF 2,000',   'XAF 100',    'XAF 1,900'],
                  ['XAF 5,000',   'XAF 250',    'XAF 4,750'],
                  ['XAF 15,000',  'XAF 750',    'XAF 14,250'],
                  ['XAF 50,000',  'XAF 2,500',  'XAF 47,500'],
                  ['XAF 100,000', 'XAF 5,000',  'XAF 95,000'],
                ].map(([price, fee, net]) => (
                  <tr key={price}>
                    <td className="px-5 py-3.5 font-mono text-sm text-white">{price}</td>
                    <td className="px-5 py-3.5 font-mono text-sm text-red-400">{fee}</td>
                    <td className="px-5 py-3.5 font-mono text-sm font-bold text-brand-400">{net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Creator testimonial */}
      <section className="border-t border-slate-100 bg-white px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl bg-brand-950 px-8 py-10 text-center">
            <p className="text-lg font-medium italic leading-relaxed text-white/70">
              &ldquo;Sold 1,400 tickets in under 4 hours. The dashboard showed me real-time revenue as it came in — I&apos;ve never felt so in control of an event.&rdquo;
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">A</div>
              <div className="text-left">
                <p className="text-sm font-bold text-white">Aurélien N.</p>
                <p className="text-xs text-white/30">Yaoundé Jazz Festival · 1,400 tickets · XAF 21M revenue</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-2xl font-extrabold text-slate-900 text-center">Frequently asked questions</h2>
          <p className="mb-10 text-center text-slate-500">Have more questions? Email us at <a href="mailto:support@eventful.cm" className="text-brand-600 hover:underline">support@eventful.cm</a></p>
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 px-6">
            {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-50 px-4 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
            <TicketIcon className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Start selling tickets today</h2>
          <p className="mt-2 text-slate-500">
            Apply as a creator, publish your first event in minutes, and start collecting revenue.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/become-creator"
              className="rounded-xl bg-brand-600 px-8 py-3.5 text-sm font-extrabold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500"
            >
              Apply as a Creator →
            </Link>
            <Link
              href="/events"
              className="rounded-xl border-2 border-slate-200 px-8 py-3.5 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
            >
              Browse events
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-400">
        <p>
          &copy; {new Date().getFullYear()} Eventful.&nbsp;
          <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
          &nbsp;·&nbsp;
          <Link href="/terms" className="hover:text-slate-600">Terms</Link>
          &nbsp;·&nbsp;
          <Link href="/contact" className="hover:text-slate-600">Contact</Link>
        </p>
      </footer>
    </div>
  );
}
