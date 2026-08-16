'use client';

import { useState } from 'react';
import { ShareIcon } from '@/components/icons';

interface Props {
  slug: string;
  title: string;
}

export default function ShareRow({ slug, title }: Props) {
  const [copied, setCopied] = useState(false);

  function getUrl() {
    // Always return an absolute URL — needed for WhatsApp to crawl OG tags
    if (typeof window === 'undefined') {
      return `https://eventful-livid.vercel.app/e/${slug}`;
    }
    return `${window.location.origin}/e/${slug}`;
  }

  function handleCopy() {
    navigator.clipboard.writeText(getUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  // Include full URL so WhatsApp crawler fetches the page and renders the OG preview card
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title}\n${getUrl()}`)}`;

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
        <ShareIcon className="h-3.5 w-3.5" />
        Share
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
        >
          {copied ? '✓ Copied!' : 'Copy link'}
        </button>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-center text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-600"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
