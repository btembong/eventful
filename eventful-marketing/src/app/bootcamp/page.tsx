'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  StarIcon, TrendUpIcon, CheckCircleIcon,
  ShieldCheckIcon, WalletIcon, ChartIcon, SettingsIcon,
  MailIcon, BuildingsIcon, UserCircleIcon,
} from '@/components/icons';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  background: string;
  goal: string;
  paymentPlan: 'full' | 'installment';
  paymentMethod: string;
  referral: string;
  consent: boolean;
  age: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const START_DATE       = new Date('2026-09-02T09:00:00');
const APP_CLOSE_DATE   = new Date('2026-08-25T23:59:59');
const API_URL          = process.env.NEXT_PUBLIC_API_URL ?? '';

const CURRICULUM = [
  {
    week: 'Week 1–2',
    title: 'Foundations',
    color: 'bg-slate-800',
    topics: ['HTML5 semantics & accessibility', 'CSS layout: Flexbox & Grid', 'Responsive design & mobile-first', 'Version control with Git & GitHub'],
  },
  {
    week: 'Week 3–4',
    title: 'JavaScript',
    color: 'bg-brand-600',
    topics: ['JS fundamentals: variables, loops, functions', 'DOM manipulation & events', 'Async JS: Promises, fetch, async/await', 'ES6+ modern syntax'],
  },
  {
    week: 'Week 5–6',
    title: 'React & Next.js',
    color: 'bg-slate-700',
    topics: ['React components, props & state', 'Hooks: useState, useEffect, useContext', 'Next.js App Router & server components', 'Styling with Tailwind CSS'],
  },
  {
    week: 'Week 7',
    title: 'Backend Engineering',
    color: 'bg-brand-700',
    topics: ['Node.js & Fastify REST API design', 'PostgreSQL + Prisma ORM', 'Authentication: JWT, refresh tokens, sessions', 'Middleware, error handling & rate limiting'],
  },
  {
    week: 'Week 8',
    title: 'Advanced Backend & Payments',
    color: 'bg-slate-800',
    topics: ['Redis caching & background job queues (BullMQ)', 'Payment integrations: Stripe, Mobile Money, webhooks', 'File uploads, email delivery (Brevo/Resend)', 'Deploying to Render + Vercel, CI/CD basics'],
  },
  {
    week: 'Week 9',
    title: 'AI Tools & Capstone',
    color: 'bg-slate-900',
    topics: ['Building with AI (Claude, Copilot, Cursor)', 'Capstone project: full-stack app with payments', 'Code review, security audit & portfolio polish', 'Demo day & certificates'],
  },
];

const SCHEDULE = [
  { day: 'Monday',    time: '7:00 – 9:00 PM WAT', type: 'Live Session',     note: 'New concepts + live coding' },
  { day: 'Wednesday', time: '7:00 – 9:00 PM WAT', type: 'Live Session',     note: 'Deep-dive + Q&A' },
  { day: 'Friday',    time: '7:00 – 9:00 PM WAT', type: 'Live Session',     note: 'Project workshop' },
  { day: 'Saturday',  time: '10:00 AM – 12:00 PM WAT', type: 'Office Hours', note: 'Optional 1-on-1 help' },
  { day: 'Sunday',    time: 'Async',              type: 'Self-Study',        note: 'Recordings + exercises' },
];

const TECH_STACK = [
  // Frontend
  { name: 'HTML5',       bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-300',  abbr: 'HT', tier: 'Frontend' },
  { name: 'CSS3',        bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300',    abbr: 'CS', tier: 'Frontend' },
  { name: 'JavaScript',  bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-300',  abbr: 'JS', tier: 'Frontend' },
  { name: 'React',       bg: 'bg-cyan-100',    text: 'text-cyan-700',    border: 'border-cyan-300',    abbr: 'Re', tier: 'Frontend' },
  { name: 'Next.js',     bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300',   abbr: 'Nx', tier: 'Frontend' },
  { name: 'Tailwind',    bg: 'bg-teal-100',    text: 'text-teal-700',    border: 'border-teal-300',    abbr: 'Tw', tier: 'Frontend' },
  // Backend
  { name: 'Node.js',     bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-300',   abbr: 'No', tier: 'Backend' },
  { name: 'Fastify',     bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300',   abbr: 'Fa', tier: 'Backend' },
  { name: 'PostgreSQL',  bg: 'bg-indigo-100',  text: 'text-indigo-700',  border: 'border-indigo-300',  abbr: 'PG', tier: 'Backend' },
  { name: 'Prisma ORM',  bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-300',  abbr: 'Pr', tier: 'Backend' },
  { name: 'Redis',       bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300',     abbr: 'Rd', tier: 'Backend' },
  { name: 'BullMQ',      bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-300',  abbr: 'BQ', tier: 'Backend' },
  // Payments
  { name: 'Stripe',      bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-300',  abbr: 'St', tier: 'Payments' },
  { name: 'Mobile Money',bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-300',  abbr: 'MM', tier: 'Payments' },
  { name: 'Webhooks',    bg: 'bg-pink-100',    text: 'text-pink-700',    border: 'border-pink-300',    abbr: 'Wh', tier: 'Payments' },
  // DevOps & Tools
  { name: 'Git',         bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300',     abbr: 'Gi', tier: 'DevOps' },
  { name: 'Docker',      bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300',    abbr: 'Do', tier: 'DevOps' },
  { name: 'VS Code',     bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300',    abbr: 'VS', tier: 'DevOps' },
  { name: 'Vercel',      bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-300',   abbr: 'Ve', tier: 'DevOps' },
  { name: 'Render',      bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-300',   abbr: 'Rn', tier: 'DevOps' },
  { name: 'Claude AI',   bg: 'bg-brand-50',    text: 'text-brand-700',   border: 'border-brand-300',   abbr: 'AI', tier: 'DevOps' },
];

const TECH_TIERS = ['Frontend', 'Backend', 'Payments', 'DevOps'] as const;

const ADVANCED_BACKEND = [
  {
    category: 'API Design',
    Icon: BuildingsIcon,
    skills: ['RESTful route design & versioning', 'Request validation with Zod', 'Rate limiting & throttling', 'Pagination, filtering & sorting', 'Error handling middleware'],
  },
  {
    category: 'Auth & Security',
    Icon: ShieldCheckIcon,
    skills: ['JWT access + refresh token rotation', 'Password hashing with bcrypt', 'Role-based access control (RBAC)', 'CORS, Helmet & XSS prevention', 'Audit logging for sensitive actions'],
  },
  {
    category: 'Performance',
    Icon: ChartIcon,
    skills: ['Redis caching layer (TTL strategies)', 'Background job queues with BullMQ', 'Database indexing & query optimization', 'Connection pooling with Prisma', 'Lazy loading & code splitting'],
  },
  {
    category: 'Payment Engineering',
    Icon: WalletIcon,
    skills: ['Stripe checkout & webhook verification', 'Mobile Money (MTN, Orange) API flows', 'Idempotency keys & duplicate prevention', 'Payment state machine design', 'Refund & dispute handling'],
  },
  {
    category: 'DevOps & CI/CD',
    Icon: SettingsIcon,
    skills: ['Docker containers & docker-compose', 'Environment management (.env, secrets)', 'Render & Vercel deployment pipelines', 'Health checks & graceful shutdown', 'Logging & error monitoring (Sentry)'],
  },
  {
    category: 'Data & Emails',
    Icon: MailIcon,
    skills: ['Relational schema design with Prisma', 'Database migrations & seeding', 'Transactional email via Brevo/Resend', 'File uploads to cloud storage (S3)', 'CSV export & data aggregation'],
  },
];

const PAYMENT_GATEWAYS = [
  {
    name: 'Stripe',
    region: 'Global',
    logo: 'https://logo.clearbit.com/stripe.com',
    logoBg: 'bg-violet-50',
    color: 'bg-violet-50 border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
    what: ['Checkout Sessions', 'Payment Intents', 'Webhooks & event verification', 'Refunds & disputes', 'Subscription billing'],
  },
  {
    name: 'MTN Mobile Money',
    region: 'West & Central Africa',
    logo: 'https://logo.clearbit.com/mtn.com',
    logoBg: 'bg-yellow-50',
    color: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    what: ['Collection API (request to pay)', 'Disbursement API (payouts)', 'Sandbox testing environment', 'Webhook callbacks', 'Idempotency & retry logic'],
  },
  {
    name: 'Orange Money',
    region: 'Central Africa',
    logo: 'https://logo.clearbit.com/orange.com',
    logoBg: 'bg-orange-50',
    color: 'bg-orange-50 border-orange-200',
    badge: 'bg-orange-100 text-orange-700',
    what: ['Payment initiation API', 'Status polling & webhooks', 'Merchant portal integration', 'Token-based auth flow', 'Error handling & fallbacks'],
  },
  {
    name: 'PayPal',
    region: 'Global',
    logo: 'https://logo.clearbit.com/paypal.com',
    logoBg: 'bg-blue-50',
    color: 'bg-blue-50 border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    what: ['Orders API (v2)', 'Smart Payment Buttons', 'Webhook verification', 'Refund automation', 'Sandbox & live environments'],
  },
];

const OUTCOMES = [
  {
    Icon: UserCircleIcon,
    iconBg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    title: 'Junior Developer',
    desc: 'Land a junior front-end or full-stack role at a local tech company or startup. Average junior salaries in Cameroon range from 150k–400k XAF/month.',
    tags: ['Job-ready portfolio', 'GitHub profile', 'Interview prep'],
  },
  {
    Icon: TrendUpIcon,
    iconBg: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
    title: 'Freelance Developer',
    desc: 'Take on client projects from Upwork, LinkedIn, or your own network. Build websites, dashboards, and MVPs for $500–$3,000+ per project.',
    tags: ['3 portfolio projects', 'Client skills', 'Remote-ready'],
  },
  {
    Icon: StarIcon,
    iconBg: 'bg-brand-50 border-brand-200',
    iconColor: 'text-brand-600',
    title: 'Build Your Own Product',
    desc: 'Have a startup idea? You will have every technical skill needed to build it yourself — from the database to the deployed app.',
    tags: ['Full-stack skills', 'AI tools', 'Capstone project'],
  },
];

const PROJECTS = [
  {
    num: '01',
    name: 'Personal Portfolio',
    desc: 'A responsive, animated personal site that you\'ll use to land your first job or freelance client.',
    stack: ['HTML', 'CSS', 'JavaScript'],
    week: 'Week 2',
  },
  {
    num: '02',
    name: 'Task Manager App',
    desc: 'A full React app with local state, user auth, CRUD operations, and a clean Tailwind UI.',
    stack: ['React', 'Tailwind', 'LocalStorage'],
    week: 'Week 6',
  },
  {
    num: '03',
    name: 'Full-Stack Capstone',
    desc: 'Your own idea, built from scratch: database, API, frontend, auth, and deployed live to the web.',
    stack: ['Next.js', 'Postgres', 'Prisma', 'Vercel'],
    week: 'Week 9',
  },
];

const FOR_WHO = [
  {
    title: 'Complete Beginners',
    desc: 'Never written a line of code? Perfect. We start from zero and take you to job-ready.',
    Icon: StarIcon,
  },
  {
    title: 'Career Switchers',
    desc: 'Ready to leave your current field? 9 focused weeks is all it takes to pivot into tech.',
    Icon: TrendUpIcon,
  },
  {
    title: 'Self-Taught Devs',
    desc: 'Have some basics but lack structure? Fill the gaps and build real projects with guidance.',
    Icon: CheckCircleIcon,
  },
];

const FAQS = [
  {
    q: 'Do I need any prior experience?',
    a: 'No. The bootcamp starts from absolute basics — HTML, CSS, and how the web works. If you can use a browser, you can join.',
  },
  {
    q: 'How much time do I need per week?',
    a: 'Plan for 15–20 hours per week: live sessions (6 hrs), recorded content review (4 hrs), and hands-on project work (5–10 hrs). It is intensive by design.',
  },
  {
    q: 'Are sessions live or recorded?',
    a: 'Both. Live sessions run Monday, Wednesday, and Friday (2 hours each). All sessions are recorded and available within 24 hours so you never fall behind.',
  },
  {
    q: 'What if I fall behind?',
    a: 'You have direct access to the instructor via WhatsApp and a private Discord community. No one gets left behind — we check in weekly with every student.',
  },
  {
    q: 'Will I get a certificate?',
    a: 'Yes. Students who complete all projects and the capstone receive a signed certificate of completion on Demo Day, October 30.',
  },
  {
    q: 'What equipment do I need?',
    a: 'A laptop (Windows, Mac, or Linux — minimum 4GB RAM), a stable internet connection, and VS Code (free). We\'ll help you set everything up on Day 1.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'Full refund if you withdraw before September 5. 50% refund between September 6–12. No refund after September 12 — but you keep lifetime access to all materials.',
  },
  {
    q: 'Can I pay in installments?',
    a: 'Yes. Choose 2 installments of $135 each: the first due at registration, the second by September 16. Full payment ($250) saves you $20.',
  },
];

const PAYMENT_METHODS = ['MTN Mobile Money', 'Orange Money', 'Credit / Debit Card (Stripe)', 'PayPal'];

// ─── Countdown ──────────────────────────────────────────────────────────────────

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(target.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  const total = Math.max(0, diff);
  const d = Math.floor(total / 86_400_000);
  const h = Math.floor((total % 86_400_000) / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1_000);
  return { d, h, m, s, started: diff <= 0 };
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[56px] rounded-xl border-2 border-brand-950 bg-white px-3 py-2 text-center shadow-[3px_3px_0_#333333]">
        <span className="text-2xl font-black tabular-nums text-brand-950">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-white/50">{label}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-bold text-slate-900">{q}</span>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand-950 bg-brand-600 text-white transition-transform ${open ? 'rotate-45' : ''}`} style={{ fontSize: 14 }}>+</span>
      </button>
      {open && (
        <p className="pb-4 text-sm leading-relaxed text-slate-500">{a}</p>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function BootcampPage() {
  const formRef  = useRef<HTMLDivElement>(null);
  const { d, h, m, s, started } = useCountdown(START_DATE);

  // Live seat counter
  const [seats, setSeats] = useState<{ applied: number; total: number; remaining: number } | null>(null);
  useEffect(() => {
    fetch(`${API_URL}/bootcamp/stats`)
      .then(r => r.json())
      .then(setSeats)
      .catch(() => null);
  }, []);

  // Application close countdown
  const appClosed = APP_CLOSE_DATE.getTime() < Date.now();

  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', phone: '', country: '',
    background: '', goal: '', paymentPlan: 'full',
    paymentMethod: '', referral: '', consent: false, age: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.fullName.trim())    e.fullName    = 'Full name is required';
    if (!form.email.match(/.+@.+\..+/)) e.email = 'Valid email required';
    if (!form.phone.trim())       e.phone       = 'Phone number is required';
    if (!form.country.trim())     e.country     = 'Country is required';
    if (!form.background)         e.background  = 'Please select your background';
    if (!form.paymentMethod)      e.paymentMethod = 'Select a payment method';
    if (!form.consent)            e.consent     = 'You must accept the terms';
    if (!form.age)                e.age         = 'You must confirm your age';
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/bootcamp/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName:      form.fullName,
          email:         form.email,
          phone:         form.phone,
          country:       form.country,
          background:    form.background,
          goal:          form.goal || undefined,
          paymentPlan:   form.paymentPlan === 'full' ? 'FULL' : 'INSTALLMENT',
          paymentMethod: form.paymentMethod,
          referral:      form.referral || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setErrors({ email: 'An application with this email already exists for this cohort.' });
        return;
      }
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Submission failed');
      setSubmitted(true);
      // Refresh seat count
      fetch(`${API_URL}/bootcamp/stats`).then(r => r.json()).then(setSeats).catch(() => null);
    } catch {
      setErrors({ consent: 'Submission failed — WhatsApp us at +237 690 07 505 or email bootcamp@digostechnologies.com.' });
    } finally {
      setSubmitting(false);
    }
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const totalFee = form.paymentPlan === 'full' ? '$250' : '$135 × 2 = $270';

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Announcement banner ─────────────────────────────────────────────── */}
      <div className="relative z-50 bg-brand-600 py-2.5 text-center text-xs font-bold text-white">
        {appClosed ? (
          <span>Applications for this cohort are now closed. Join the waitlist for the next cohort.</span>
        ) : (
          <span>
            Applications close <strong>Aug 25</strong>
            {seats !== null && seats.remaining > 0 && (
              <> &nbsp;&middot;&nbsp; <strong className="text-brand-100">{seats.remaining} seat{seats.remaining !== 1 ? 's' : ''} remaining</strong></>
            )}
            {seats !== null && seats.remaining === 0 && (
              <> &nbsp;&middot;&nbsp; <strong className="text-red-200">Cohort is full — join waitlist</strong></>
            )}
            &nbsp;&middot;&nbsp;
            <button onClick={scrollToForm} className="underline underline-offset-2 opacity-90 hover:opacity-100">Apply now</button>
          </span>
        )}
      </div>

      {/* ── Sticky nav ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-brand-950 bg-brand-600 shadow-[2px_2px_0_#333333]">
              <span className="text-xs font-black text-white">DT</span>
            </div>
            <span className="text-sm font-extrabold text-slate-900">Digos<span className="text-brand-600"> Technologies</span></span>
            <span className="ml-1 hidden rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 sm:inline">Bootcamp</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-semibold text-slate-500 sm:flex">
            <a href="#curriculum" className="transition hover:text-brand-600">Curriculum</a>
            <a href="#instructor" className="transition hover:text-brand-600">Instructor</a>
            <a href="#pricing" className="transition hover:text-brand-600">Pricing</a>
            <a href="#faq" className="transition hover:text-brand-600">FAQ</a>
          </div>
          <button
            onClick={scrollToForm}
            className="rounded-xl border-2 border-brand-950 bg-brand-600 px-5 py-2 text-sm font-black text-white transition active:translate-x-[2px] active:translate-y-[2px]"
            style={{ boxShadow: '3px 3px 0 #333333' }}
          >
            Apply now
          </button>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-950 py-20 sm:py-28">
        {/* Dot texture */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        {/* Glow */}
        <div className="pointer-events-none absolute -top-20 left-1/4 h-[400px] w-[400px] rounded-full bg-brand-500/15 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white/70">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-400" />
            September 2 – October 30, 2026 · 9 Weeks · Live &amp; Online
          </div>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            The Intensive<br />
            <span className="text-brand-400">Web Development</span><br />
            Bootcamp
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            Go from zero to full-stack developer in 9 focused weeks. Build 3 real projects, learn with AI tools, and land your first dev role or freelance client — backed by a community that shows up for you.
          </p>

          {/* Countdown */}
          <div className="mt-10">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">
              {started ? 'Bootcamp in progress' : 'Bootcamp starts in'}
            </p>
            {!started && (
              <div className="flex items-start justify-center gap-3">
                <CountUnit value={d} label="Days" />
                <span className="mt-2 text-2xl font-black text-white/30">:</span>
                <CountUnit value={h} label="Hrs" />
                <span className="mt-2 text-2xl font-black text-white/30">:</span>
                <CountUnit value={m} label="Min" />
                <span className="mt-2 text-2xl font-black text-white/30">:</span>
                <CountUnit value={s} label="Sec" />
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={scrollToForm}
              className="rounded-2xl border-2 border-brand-950 bg-brand-600 px-8 py-4 text-base font-black text-white transition hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1"
              style={{ boxShadow: '5px 5px 0 #333333' }}
            >
              Reserve my seat — $250
            </button>
            <a href="#curriculum" className="rounded-2xl border-2 border-white/30 px-8 py-4 text-base font-black text-white/80 transition hover:border-white/60">
              See curriculum
            </a>
          </div>

          {/* Social proof / seats */}
          <p className="mt-6 text-xs text-white/30">
            {seats !== null ? (
              <>
                <strong className="text-white/60">{seats.applied}</strong> of{' '}
                <strong className="text-white/60">{seats.total}</strong> seats filled
                {seats.remaining > 0 && <> · <strong className="text-brand-300">{seats.remaining} left</strong></>}
              </>
            ) : (
              <>Cohort limited to <strong className="text-white/60">20 students</strong> · Applications reviewed within 48 hrs</>
            )}
          </p>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <section className="border-b border-slate-100 bg-brand-50 py-6">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { value: '9 weeks',  label: 'Intensive programme' },
              { value: '60+ hrs',  label: 'Of live instruction' },
              { value: '3',        label: 'Real-world projects' },
              { value: '$250',     label: 'All-in fee (full pay)' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-black text-brand-600 sm:text-3xl">{value}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Instructor ─────────────────────────────────────────────────────── */}
      <section id="instructor" className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Your Instructor</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Learn from a working developer</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border-2 border-brand-950 bg-white" style={{ boxShadow: '6px 6px 0 #333333' }}>
            <div className="grid gap-0 sm:grid-cols-[280px_1fr]">
              {/* Photo / avatar */}
              <div className="flex flex-col items-center justify-center gap-4 border-b-2 border-brand-950 bg-brand-50 px-8 py-10 sm:border-b-0 sm:border-r-2">
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-2 border-brand-950 bg-brand-600 shadow-[4px_4px_0_#333333]">
                  <span className="text-4xl font-black text-white">DT</span>
                </div>
                <div className="text-center">
                  <p className="text-base font-black text-slate-900">Instructor</p>
                  <p className="text-sm text-brand-600 font-semibold">Digos Technologies</p>
                </div>
                <div className="flex gap-2">
                  <a
                    href="https://wa.me/23769007505"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border-2 border-brand-950 bg-green-500 px-3 py-1.5 text-[11px] font-black text-white shadow-[2px_2px_0_#333333]"
                  >
                    WhatsApp
                  </a>
                  <a
                    href="mailto:bootcamp@digostechnologies.com"
                    className="rounded-lg border-2 border-brand-950 bg-white px-3 py-1.5 text-[11px] font-black text-slate-900 shadow-[2px_2px_0_#333333]"
                  >
                    Email
                  </a>
                </div>
              </div>

              {/* Bio */}
              <div className="px-8 py-8">
                <div className="mb-5 flex flex-wrap gap-2">
                  {['Full-Stack Developer', '5+ Years Experience', 'React & Next.js', 'Node.js & PostgreSQL'].map(tag => (
                    <span key={tag} className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">{tag}</span>
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-slate-600">
                  Our lead instructor has spent over five years building production web applications for clients across Africa and beyond. With deep expertise in the modern JavaScript ecosystem — React, Next.js, Node.js, and PostgreSQL — they have shipped real products used by thousands of people.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Teaching philosophy: no hand-holding, no shortcuts. You will understand <em>why</em> every line of code works, not just copy-paste it. Every concept is grounded in real-world use cases because that is what makes developers hire-ready.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-100 pt-5">
                  {[
                    { value: '5+', label: 'Years shipping code' },
                    { value: '30+', label: 'Projects delivered' },
                    { value: '100%', label: 'Practitioner-taught' },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="text-xl font-black text-brand-600">{value}</p>
                      <p className="text-[11px] text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What you'll build ───────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Projects</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">What you&apos;ll actually build</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
              No toy exercises. Three production-quality projects that go straight into your portfolio.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {PROJECTS.map((p) => (
              <div key={p.num} className="rounded-2xl border-2 border-brand-950 bg-white p-6" style={{ boxShadow: '5px 5px 0 #333333' }}>
                <div className="mb-4 flex items-start justify-between">
                  <span className="text-4xl font-black text-brand-100">{p.num}</span>
                  <span className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-600">{p.week}</span>
                </div>
                <h3 className="text-lg font-extrabold text-slate-900">{p.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.stack.map(t => (
                    <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Curriculum ─────────────────────────────────────────────────────── */}
      <section id="curriculum" className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">9-Week Curriculum</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Your week-by-week roadmap</h2>
          </div>
          <div className="space-y-4">
            {CURRICULUM.map((block, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border-2 border-brand-950 bg-white" style={{ boxShadow: '4px 4px 0 #333333' }}>
                <div className={`${block.color} flex items-center justify-between px-5 py-3`}>
                  <span className="text-xs font-black uppercase tracking-widest text-white/70">{block.week}</span>
                  <span className="text-sm font-extrabold text-white">{block.title}</span>
                </div>
                <div className="grid gap-x-6 gap-y-2 px-5 py-4 sm:grid-cols-2">
                  {block.topics.map(t => (
                    <div key={t} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Daily schedule ─────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Weekly Schedule</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">What your week looks like</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-500">
              Structured enough to make progress. Flexible enough to keep your life.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border-2 border-brand-950 bg-white" style={{ boxShadow: '5px 5px 0 #333333' }}>
            {SCHEDULE.map((row, i) => (
              <div
                key={row.day}
                className={`grid grid-cols-[100px_1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[140px_1fr_120px_auto] ${i < SCHEDULE.length - 1 ? 'border-b border-slate-100' : ''}`}
              >
                <p className="text-sm font-extrabold text-slate-900">{row.day}</p>
                <p className="hidden text-sm text-slate-500 sm:block">{row.time}</p>
                <span className={`hidden rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-widest sm:inline-block ${
                  row.type === 'Live Session'  ? 'bg-brand-100 text-brand-700' :
                  row.type === 'Office Hours' ? 'bg-green-100 text-green-700' :
                                                'bg-slate-100 text-slate-600'
                }`}>{row.type}</span>
                <p className="text-xs text-slate-400">{row.note}</p>
                {/* Mobile time */}
                <p className="text-xs text-slate-400 sm:hidden col-start-2">{row.time}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-400">All times in West Africa Time (WAT, UTC+1). Sessions recorded and available within 24 hrs.</p>
        </div>
      </section>

      {/* ── Tech stack ─────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Tools & Technologies</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">The modern stack you&apos;ll master</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              Every tool here is used in production today. You graduate with a full-stack, payment-ready skillset.
            </p>
          </div>
          <div className="space-y-6">
            {TECH_TIERS.map(tier => (
              <div key={tier}>
                <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-slate-400">{tier}</p>
                <div className="flex flex-wrap gap-2.5">
                  {TECH_STACK.filter(t => t.tier === tier).map(({ name, bg, text, border, abbr }) => (
                    <div
                      key={name}
                      className={`flex items-center gap-2.5 rounded-2xl border-2 ${border} ${bg} px-4 py-2.5`}
                      style={{ boxShadow: '3px 3px 0 #33333318' }}
                    >
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 bg-white/60 text-[10px] font-black ${text}`}>
                        {abbr}
                      </div>
                      <span className={`text-sm font-bold ${text}`}>{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border-2 border-brand-200 bg-brand-50 px-5 py-4 text-center">
            <p className="text-sm text-brand-800">
              <strong>Including AI tools:</strong> you will code alongside Claude AI, GitHub Copilot, and Cursor — the tools that make modern developers 2–3× more productive.
            </p>
          </div>
        </div>
      </section>

      {/* ── Advanced Backend Engineering ────────────────────────────────────── */}
      <section className="bg-brand-950 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400">Advanced Concepts</p>
            <h2 className="mt-2 text-3xl font-black text-white">Backend engineering — the real stuff</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">
              Most bootcamps stop at &quot;make a CRUD app.&quot; We go further — production patterns used by real engineering teams.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ADVANCED_BACKEND.map((block) => (
              <div key={block.category} className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/[0.08] transition">
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                    <block.Icon className="h-4 w-4 text-brand-300" />
                  </div>
                  <p className="text-sm font-extrabold text-white">{block.category}</p>
                </div>
                <ul className="space-y-1.5">
                  {block.skills.map(skill => (
                    <li key={skill} className="flex items-start gap-2 text-xs text-white/60">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Payment Integrations ────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Payment Engineering</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Build apps that actually take money</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              Payment integration is the highest-value backend skill in Africa right now. You will build and ship real payment flows — not just read about them.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {PAYMENT_GATEWAYS.map((gw) => (
              <div key={gw.name} className={`rounded-2xl border-2 ${gw.color} bg-white p-6`} style={{ boxShadow: '4px 4px 0 #33333318' }}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 ${gw.logoBg} p-1.5`}>
                      <img
                        src={gw.logo}
                        alt={gw.name}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">{gw.name}</h3>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black ${gw.badge}`}>{gw.region}</span>
                </div>
                <ul className="space-y-1.5">
                  {gw.what.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border-2 border-brand-950 bg-slate-900 px-6 py-5" style={{ boxShadow: '5px 5px 0 #333333' }}>
            <div className="grid gap-4 sm:grid-cols-3 text-center">
              {[
                { label: 'Idempotency', desc: 'Never double-charge. Learn how to make payment requests safe to retry.' },
                { label: 'Webhooks', desc: 'Verify and process async payment events from all major gateways.' },
                { label: 'Test → Live', desc: 'Move from sandbox to production safely with proper env config.' },
              ].map(({ label, desc }) => (
                <div key={label}>
                  <p className="text-sm font-extrabold text-brand-400">{label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Who this is for ────────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Who should apply</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">This bootcamp is for you if…</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {FOR_WHO.map(({ title, desc, Icon }) => (
              <div key={title} className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-brand-950 bg-brand-50 shadow-[3px_3px_0_#333333]">
                  <Icon className="h-7 w-7 text-brand-600" />
                </div>
                <h3 className="font-extrabold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            <strong>Not for you if:</strong> you&apos;re looking for a passive course to watch at your own pace with no accountability. This is an active, live, high-intensity programme.
          </div>
        </div>
      </section>

      {/* ── Career outcomes ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">After Graduation</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Three paths out of Demo Day</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
              Every graduate leaves with a production-deployed project, a live portfolio, and the skills for one of these three tracks.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {OUTCOMES.map((o) => (
              <div key={o.title} className="rounded-2xl border-2 border-brand-950 bg-white p-6" style={{ boxShadow: '5px 5px 0 #333333' }}>
                <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${o.iconBg} shadow-[2px_2px_0_#33333320]`}>
                  <o.Icon className={`h-6 w-6 ${o.iconColor}`} />
                </div>
                <h3 className="mt-3 text-lg font-extrabold text-slate-900">{o.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{o.desc}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {o.tags.map(t => (
                    <span key={t} className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-brand-950 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400">Pricing &amp; Payment</p>
            <h2 className="mt-2 text-3xl font-black text-white">Simple, transparent pricing</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/50">
              One cohort, one fee. Choose how you pay.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Full pay */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-brand-400 bg-white p-7" style={{ boxShadow: '6px 6px 0 #F07200' }}>
              <div className="absolute right-4 top-4 rounded-lg border-2 border-brand-950 bg-brand-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-[2px_2px_0_#333333]">
                Best value
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Pay in full</p>
              <p className="mt-3 text-5xl font-black text-slate-900">$250</p>
              <p className="mt-1 text-sm text-slate-400">One payment, done.</p>
              <ul className="mt-5 space-y-2.5">
                {['Save $20 vs installments', '9 weeks full access', '3 guided projects', 'Certificate of completion', 'Lifetime access to recordings', 'Private Discord + WhatsApp group'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xs font-black">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            {/* Installments */}
            <div className="rounded-2xl border-2 border-white/20 bg-white/5 p-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/60">2 Installments</p>
              <p className="mt-3 text-5xl font-black text-white">$135<span className="text-xl text-white/40"> × 2</span></p>
              <p className="mt-1 text-sm text-white/40">Split across the first 2 weeks.</p>
              <ul className="mt-5 space-y-2.5">
                {[
                  'Installment 1: $135 at registration',
                  'Installment 2: $135 by September 16',
                  '9 weeks full access',
                  '3 guided projects',
                  'Certificate of completion',
                  'Lifetime access to recordings',
                ].map((f, i) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${i < 2 ? 'font-semibold text-brand-300' : 'text-white/60'}`}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/60 text-xs font-black">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Payment methods */}
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/40">We accept</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map(m => (
                <span key={m} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/70">{m}</span>
              ))}
            </div>
            <p className="mt-3 text-xs text-white/30">
              Payment instructions are sent by email after your application is accepted. Spot is reserved only after payment confirmation.
            </p>
          </div>

          {/* Refund policy callout */}
          <div className="mt-6 rounded-2xl border-2 border-amber-400/40 bg-amber-500/10 px-5 py-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl">🔒</span>
              <div>
                <p className="text-sm font-extrabold text-amber-300">Refund Policy — No risk to apply</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-200/70">
                  <strong className="text-amber-200">Full refund</strong> if you withdraw before September 5 &nbsp;·&nbsp;
                  <strong className="text-amber-200">50% refund</strong> between September 6–12 &nbsp;·&nbsp;
                  <strong className="text-amber-200">No refund</strong> after September 12, but you keep lifetime access to all recordings and materials.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">FAQ</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Frequently asked questions</h2>
          </div>
          <div className="rounded-2xl border-2 border-brand-950 bg-white px-6" style={{ boxShadow: '5px 5px 0 #333333' }}>
            {FAQS.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
          </div>
          <p className="mt-6 text-center text-sm text-slate-400">
            Still have questions?{' '}
            <a href="mailto:bootcamp@digostechnologies.com" className="font-semibold text-brand-600 underline underline-offset-2">Email us</a>
            {' '}or{' '}
            <a href="https://wa.me/23769007505" className="font-semibold text-brand-600 underline underline-offset-2">WhatsApp us</a>
          </p>
        </div>
      </section>

      {/* ── Registration + Consent form ─────────────────────────────────────── */}
      <section id="apply" className="bg-slate-50 py-16 sm:py-24">
        <div ref={formRef} className="mx-auto max-w-2xl px-5 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Apply now</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Reserve your seat</h2>
            <p className="mt-2 text-sm text-slate-500">
              Takes 2 minutes. Cohort limited to{' '}
              {seats !== null ? (
                <strong>{seats.remaining > 0 ? `${seats.remaining} seats remaining` : 'no seats — join waitlist'}</strong>
              ) : (
                '20 students'
              )}.
            </p>
          </div>

          {submitted ? (
            <div className="rounded-2xl border-2 border-brand-950 bg-white p-10 text-center" style={{ boxShadow: '6px 6px 0 #333333' }}>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-brand-950 bg-brand-600 text-3xl shadow-[3px_3px_0_#333333]">
                🎉
              </div>
              <h3 className="mt-5 text-xl font-black text-slate-900">Application received!</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                We&apos;ll review your application and email you within 48 hours with next steps and payment instructions. Check your spam folder just in case.
              </p>
              <p className="mt-4 text-xs text-slate-400">
                Questions? Email <a href="mailto:bootcamp@digostechnologies.com" className="text-brand-600 font-semibold">bootcamp@digostechnologies.com</a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="overflow-hidden rounded-2xl border-2 border-brand-950 bg-white" style={{ boxShadow: '6px 6px 0 #333333' }}>

                {/* Section: Personal info */}
                <div className="border-b-2 border-slate-100 bg-brand-950 px-6 py-3">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60">01 — Personal Information</p>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  <Field label="Full name" error={errors.fullName} required>
                    <input
                      type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                      placeholder="Aurélien Nguetsa"
                      className={input(!!errors.fullName)}
                    />
                  </Field>
                  <Field label="Email address" error={errors.email} required>
                    <input
                      type="email" value={form.email} onChange={e => set('email', e.target.value)}
                      placeholder="you@example.com"
                      className={input(!!errors.email)}
                    />
                  </Field>
                  <Field label="Phone / WhatsApp" error={errors.phone} required>
                    <input
                      type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                      placeholder="+237 6XX XXX XXX"
                      className={input(!!errors.phone)}
                    />
                  </Field>
                  <Field label="Country" error={errors.country} required>
                    <input
                      type="text" value={form.country} onChange={e => set('country', e.target.value)}
                      placeholder="Cameroon"
                      className={input(!!errors.country)}
                    />
                  </Field>
                </div>

                {/* Section: Background */}
                <div className="border-y-2 border-slate-100 bg-brand-950 px-6 py-3">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60">02 — Your Background</p>
                </div>
                <div className="grid gap-4 p-6 sm:grid-cols-2">
                  <Field label="Coding experience" error={errors.background} required className="sm:col-span-2">
                    <select value={form.background} onChange={e => set('background', e.target.value)} className={input(!!errors.background)}>
                      <option value="">Select your level…</option>
                      <option value="zero">Complete beginner — never coded</option>
                      <option value="basics">Know some HTML/CSS basics</option>
                      <option value="js">Comfortable with JS, learning more</option>
                      <option value="other">Know another language, new to web</option>
                    </select>
                  </Field>
                  <Field label="Your main goal (optional)" className="sm:col-span-2">
                    <textarea
                      value={form.goal}
                      onChange={e => set('goal', e.target.value)}
                      placeholder="e.g. Get a junior dev job, build my startup, freelance…"
                      rows={2}
                      className={input(false) + ' resize-none'}
                    />
                  </Field>
                </div>

                {/* Section: Payment */}
                <div className="border-y-2 border-slate-100 bg-brand-950 px-6 py-3">
                  <p className="text-xs font-black uppercase tracking-widest text-white/60">03 — Payment</p>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-bold text-slate-700">Payment plan <span className="text-red-500">*</span></p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        { value: 'full',        label: 'Pay in full',     amount: '$250',      note: 'Save $20' },
                        { value: 'installment', label: '2 Installments',  amount: '$135 × 2',  note: '$135 due today' },
                      ] as const).map(opt => (
                        <label key={opt.value} className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition ${form.paymentPlan === opt.value ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white hover:border-brand-300'}`}>
                          <input type="radio" name="plan" value={opt.value} checked={form.paymentPlan === opt.value} onChange={() => set('paymentPlan', opt.value)} className="accent-brand-600" />
                          <div>
                            <p className="text-sm font-extrabold text-slate-900">{opt.label} — <span className="text-brand-600">{opt.amount}</span></p>
                            <p className="text-[10px] text-slate-400">{opt.note}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <Field label="Preferred payment method" error={errors.paymentMethod} required>
                    <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)} className={input(!!errors.paymentMethod)}>
                      <option value="">Select method…</option>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                  <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                    <strong>Due today: {form.paymentPlan === 'full' ? '$250' : '$135'}</strong><br />
                    <span className="text-xs text-brand-600">Payment instructions will be emailed after your application is accepted. Your seat is reserved upon payment confirmation.</span>
                  </div>
                </div>

                {/* Section: Referral */}
                <div className="border-y-2 border-slate-100 px-6 py-3">
                  <Field label="How did you hear about this bootcamp? (optional)" className="py-2">
                    <input
                      type="text" value={form.referral} onChange={e => set('referral', e.target.value)}
                      placeholder="e.g. Twitter, a friend, Instagram…"
                      className={input(false)}
                    />
                  </Field>
                </div>

                {/* Section: Consent */}
                <div className="border-t-2 border-slate-100 bg-slate-50 px-6 py-5 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Consent &amp; Agreement</p>
                  <ConsentBox
                    checked={form.age}
                    onChange={v => set('age', v)}
                    error={errors.age}
                  >
                    I confirm that I am at least <strong>16 years old</strong> (or have parental consent if under 18).
                  </ConsentBox>
                  <ConsentBox
                    checked={form.consent}
                    onChange={v => set('consent', v)}
                    error={errors.consent}
                  >
                    I have read and agree to the{' '}
                    <a href="#" className="font-semibold text-brand-600 underline underline-offset-2">Terms &amp; Conditions</a>{' '}
                    and{' '}
                    <a href="#" className="font-semibold text-brand-600 underline underline-offset-2">Refund Policy</a>.{' '}
                    I understand this is an intensive programme requiring 15–20 hrs/week of commitment.
                  </ConsentBox>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    Your data is used solely to process your application and deliver the bootcamp. We do not share or sell your information to third parties. You may withdraw consent at any time by contacting bootcamp@digostechnologies.com.
                  </p>
                </div>

                {/* Submit */}
                <div className="px-6 pb-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl border-2 border-brand-950 bg-brand-600 py-4 text-base font-black text-white transition hover:-translate-x-0.5 hover:-translate-y-0.5 disabled:opacity-60 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                    style={{ boxShadow: '5px 5px 0 #333333' }}
                  >
                    {submitting ? 'Submitting…' : `Apply & reserve my seat — ${totalFee}`}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white py-8">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-sm font-extrabold text-slate-900">The Intensive Web Development Bootcamp</p>
              <p className="text-xs text-slate-400">September 2 – October 30, 2026 · Digos Technologies</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-slate-400">
              <a href="#" className="transition hover:text-brand-600">Terms</a>
              <a href="#" className="transition hover:text-brand-600">Privacy</a>
              <a href="mailto:bootcamp@digostechnologies.com" className="transition hover:text-brand-600">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, error, required, children, className = '',
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-bold text-slate-700">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function ConsentBox({
  checked, onChange, error, children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
        />
        <span className="text-xs leading-relaxed text-slate-600">{children}</span>
      </label>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function input(hasError: boolean) {
  return `w-full rounded-xl border-2 ${hasError ? 'border-red-400' : 'border-slate-200'} bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100`;
}
