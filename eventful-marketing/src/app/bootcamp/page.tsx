'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

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

const START_DATE = new Date('2026-09-02T09:00:00');
const END_DATE   = 'October 30, 2026';

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
    week: 'Week 7–8',
    title: 'Backend & Databases',
    color: 'bg-brand-700',
    topics: ['Node.js & REST API design', 'PostgreSQL + Prisma ORM', 'Authentication (JWT, sessions)', 'Deploying to Render / Vercel'],
  },
  {
    week: 'Week 9',
    title: 'AI Tools & Capstone',
    color: 'bg-slate-900',
    topics: ['Building with AI (Claude, Copilot, Cursor)', 'Capstone project: full-stack app', 'Code review & portfolio polish', 'Demo day & certificates'],
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
    icon: '🌱',
  },
  {
    title: 'Career Switchers',
    desc: 'Ready to leave your current field? 9 focused weeks is all it takes to pivot into tech.',
    icon: '🔄',
  },
  {
    title: 'Self-Taught Devs',
    desc: 'Have some basics but lack structure? Fill the gaps and build real projects with guidance.',
    icon: '📚',
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
    // Simulate submission — replace with real endpoint (Formspree, API route, etc.)
    await new Promise(r => setTimeout(r, 1200));
    setSubmitting(false);
    setSubmitted(true);
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const totalFee = form.paymentPlan === 'full' ? '$250' : '$135 × 2 = $270';

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Sticky nav ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M8 12a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v6a3 3 0 0 0 0 4v6a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-6a3 3 0 0 0 0-4v-6z" fill="#F07200"/>
              <rect x="13" y="18" width="14" height="4" rx="2" fill="white" opacity="0.9"/>
            </svg>
            <span className="text-sm font-extrabold text-slate-900">event<span className="text-brand-600">ful</span></span>
            <span className="ml-1 hidden rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 sm:inline">Bootcamp</span>
          </Link>
          <div className="hidden items-center gap-6 text-sm font-semibold text-slate-500 sm:flex">
            <a href="#curriculum" className="transition hover:text-brand-600">Curriculum</a>
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

          {/* Social proof */}
          <p className="mt-6 text-xs text-white/30">
            Cohort limited to <strong className="text-white/60">20 students</strong> · Applications reviewed within 48 hrs
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

      {/* ── What you'll build ───────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
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
      <section id="curriculum" className="bg-slate-50 py-16 sm:py-24">
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

      {/* ── Who this is for ────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Who should apply</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">This bootcamp is for you if…</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {FOR_WHO.map(({ title, desc, icon }) => (
              <div key={title} className="rounded-2xl border-2 border-slate-200 bg-white p-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-brand-950 bg-brand-50 text-2xl shadow-[3px_3px_0_#333333]">
                  {icon}
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
            <a href="mailto:bootcamp@eventful.cm" className="font-semibold text-brand-600 underline underline-offset-2">Email us</a>
            {' '}or{' '}
            <a href="https://wa.me/237000000000" className="font-semibold text-brand-600 underline underline-offset-2">WhatsApp us</a>
          </p>
        </div>
      </section>

      {/* ── Registration + Consent form ─────────────────────────────────────── */}
      <section id="apply" className="bg-slate-50 py-16 sm:py-24">
        <div ref={formRef} className="mx-auto max-w-2xl px-5 sm:px-6">
          <div className="mb-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Apply now</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Reserve your seat</h2>
            <p className="mt-2 text-sm text-slate-500">Takes 2 minutes. Cohort limited to 20 students.</p>
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
                Questions? Email <a href="mailto:bootcamp@eventful.cm" className="text-brand-600 font-semibold">bootcamp@eventful.cm</a>
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
                    Your data is used solely to process your application and deliver the bootcamp. We do not share or sell your information to third parties. You may withdraw consent at any time by contacting bootcamp@eventful.cm.
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
              <p className="text-xs text-slate-400">September 2 – October 30, 2026 · Powered by Eventful</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold text-slate-400">
              <a href="#" className="transition hover:text-brand-600">Terms</a>
              <a href="#" className="transition hover:text-brand-600">Privacy</a>
              <a href="mailto:bootcamp@eventful.cm" className="transition hover:text-brand-600">Contact</a>
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
