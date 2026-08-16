'use client';

import { useState } from 'react';

export default function TicketQuantity() {
  const [qty, setQty] = useState(1);
  return (
    <div>
      <p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-slate-400">Quantity</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={qty <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          −
        </button>
        <span className="w-6 text-center text-lg font-extrabold text-slate-900">{qty}</span>
        <button
          type="button"
          onClick={() => setQty((q) => Math.min(10, q + 1))}
          disabled={qty >= 10}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
        <span className="text-sm text-slate-400">ticket{qty > 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
