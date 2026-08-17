import Link from 'next/link';
import Navbar from '@/components/Navbar';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl px-5 py-24 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-black text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-slate-400">Last updated: August 2026</p>

        <div className="prose prose-slate mt-10 max-w-none text-sm leading-relaxed text-slate-600">
          <h2 className="mt-8 text-lg font-bold text-slate-800">1. Acceptance</h2>
          <p>
            By creating an account or purchasing a ticket on Eventful, you agree to these Terms of
            Service. If you do not agree, do not use the platform.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">2. Accounts</h2>
          <p>
            You are responsible for keeping your account credentials secure. You must be at least 13
            years old to create an account. Accounts must not impersonate others or provide false
            information.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">3. Tickets &amp; payments</h2>
          <p>
            All ticket purchases are final unless the event is cancelled by the organiser. Refund
            policies are set per event by the organiser. Eventful is not liable for events that are
            cancelled, postponed, or changed by organisers.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">4. Creator responsibilities</h2>
          <p>
            Event creators are responsible for the accuracy of their event listings, for delivering
            the event as described, and for issuing refunds in accordance with their stated policy.
            Eventful reserves the right to remove any listing that violates these terms.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">5. Prohibited conduct</h2>
          <p>
            You may not use Eventful to resell tickets at inflated prices, create fraudulent events,
            or engage in any activity that is unlawful or harmful to others.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">6. Limitation of liability</h2>
          <p>
            Eventful provides the platform on an &quot;as is&quot; basis. We are not liable for any
            indirect, incidental, or consequential damages arising from use of the platform.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">7. Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of Eventful after changes are
            posted constitutes acceptance of the updated terms.
          </p>

          <h2 className="mt-8 text-lg font-bold text-slate-800">8. Contact</h2>
          <p>
            Questions about these terms? Email{' '}
            <a href="mailto:hello@useeventful.com" className="text-brand-600 hover:underline">
              hello@useeventful.com
            </a>.
          </p>
        </div>

        <div className="mt-12 border-t border-slate-100 pt-8 text-sm text-slate-400">
          <Link href="/" className="text-brand-600 hover:text-brand-500 font-semibold">← Back to Eventful</Link>
          {' · '}
          <Link href="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
        </div>
      </main>
    </div>
  );
}
