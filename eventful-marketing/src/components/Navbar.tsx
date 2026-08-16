'use client';

import Link from 'next/link';
import { useState } from 'react';
import { TicketIcon } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isLoaded } = useAuth();
  const isCreator = user?.roles?.includes('CREATOR');
  const dashboardHref = isCreator ? '/dashboard/creator' : '/dashboard';

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center">
      {/* Glass bar — centered, shorter width */}
      <div className="mx-4 mt-4 w-full max-w-5xl rounded-2xl border border-white/10 bg-brand-950/85 backdrop-blur-xl shadow-lg shadow-brand-950/30">
        <nav className="flex h-14 items-center justify-between px-5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <TicketIcon className="h-7 w-7 text-brand-500" />
            <span className="text-lg font-medium tracking-tight text-white">event<span className="text-brand-500">ful</span></span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            <Link href="/events" className="rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
              Browse Events
            </Link>
            <Link href="/create" className="rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
              For Creators
            </Link>
            <Link href="/pricing" className="rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
              Pricing
            </Link>
          </div>

          {/* Auth CTAs */}
          <div className="hidden items-center gap-2 md:flex">
            {isLoaded && user ? (
              <Link href={dashboardHref} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/40 transition hover:bg-brand-400">
                Dashboard
              </Link>
            ) : isLoaded ? (
              <>
                <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-white/70 transition hover:text-white">
                  Log in
                </Link>
                <Link href="/register" className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-500/40 transition hover:bg-brand-400">
                  Get started
                </Link>
              </>
            ) : null}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M6 18L18 6M6 6l12 12"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            )}
          </button>
        </nav>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-white/10 px-4 pb-4 pt-3 md:hidden">
            <Link href="/events" className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">Browse Events</Link>
            <Link href="/create" className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">For Creators</Link>
            <Link href="/pricing" className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">Pricing</Link>
            <div className="mt-2 flex gap-2">
              {isLoaded && user ? (
                <Link href={dashboardHref} className="flex-1 rounded-xl bg-brand-500 py-2.5 text-center text-sm font-semibold text-white">Dashboard</Link>
              ) : (
                <>
                  <Link href="/login" className="flex-1 rounded-xl border border-white/20 py-2.5 text-center text-sm font-medium text-white/80">Log in</Link>
                  <Link href="/register" className="flex-1 rounded-xl bg-brand-500 py-2.5 text-center text-sm font-semibold text-white">Get started</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
