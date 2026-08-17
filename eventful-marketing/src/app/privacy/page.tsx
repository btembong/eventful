import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-5 py-24 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: August 2026</p>

        <div className="prose prose-slate mt-10 max-w-none text-sm leading-relaxed text-slate-600">
          <h2 className="mt-8 text-lg font-bold text-slate-800">1. Information we collect</h2>
          <p>
            When you create an account, we collect your name, email address, and optionally your phone
            number. When you purchase a ticket, we process payment details through our payment partner
            Tranzak — we do not store card or mobile money credentials.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">2. How we use your information</h2>
          <p>
            We use your information to operate the platform — issuing tickets, sending event reminders,
            verifying check-ins, and communicating important account updates. We do not sell your personal
            data to third parties.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">3. Cookies &amp; tracking</h2>
          <p>
            Eventful uses authentication cookies to keep you signed in across sessions. We do not use
            third-party advertising trackers. Analytics are collected in aggregate form only.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">4. Data retention</h2>
          <p>
            Account data is retained for as long as your account is active. You may request deletion
            of your account and associated data by contacting us at{' '}
            <a href="mailto:hello@useeventful.com" className="text-brand-600 hover:underline">
              hello@useeventful.com
            </a>.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">5. Security</h2>
          <p>
            All data is transmitted over HTTPS. Passwords are hashed with bcrypt. Access tokens are
            short-lived (15 minutes) and refresh tokens are rotated on every use.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">6. Contact</h2>
          <p>
            For privacy questions, email us at{' '}
            <a href="mailto:hello@useeventful.com" className="text-brand-600 hover:underline">
              hello@useeventful.com
            </a>.
          </p>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 text-sm text-slate-400">
          <Link href="/" className="text-brand-600 hover:text-brand-500 font-semibold">← Back to Eventful</Link>
          {' · '}
          <Link href="/terms" className="hover:text-slate-600">Terms of Service</Link>
        </div>
      </main>
    </div>
  );
}
