'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PaymentReturnInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // If loaded inside the checkout iframe, notify the parent page
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'tranzak-complete', orderId }, '*');
    } else {
      // Direct browser navigation — redirect to order confirmation
      if (orderId) window.location.href = `/orders/${orderId}`;
    }
  }, [orderId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7 text-brand-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-600">Payment complete — returning to your tickets…</p>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense>
      <PaymentReturnInner />
    </Suspense>
  );
}
