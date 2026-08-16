'use client';

import Link from 'next/link';

export interface CheckoutTier {
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
}

interface CheckoutModalProps {
  shareSlug: string;
  eventId: string;
  eventTitle: string;
  tiers: CheckoutTier[];
}

export default function CheckoutModal({ shareSlug }: CheckoutModalProps) {
  return (
    <Link
      href={`/e/${shareSlug}/checkout`}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-4 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition hover:-translate-y-0.5 hover:bg-brand-500 active:translate-y-0"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V12.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25m3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3z" clipRule="evenodd" />
      </svg>
      Get tickets
    </Link>
  );
}
