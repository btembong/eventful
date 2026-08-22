'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { TicketIcon, XIcon } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';

const NAV_LINKS = [
  { href: '/events',  label: 'Browse Events' },
  { href: '/create',  label: 'For Creators' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isLoaded } = useAuth();
  const isCreator    = user?.roles?.includes('CREATOR');
  const dashboardHref = isCreator ? '/dashboard/creator' : '/dashboard';

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add('overflow-locked');
    } else {
      document.body.classList.remove('overflow-locked');
    }
    return () => document.body.classList.remove('overflow-locked');
  }, [menuOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex justify-center">
        {/* Glass pill bar */}
        <div className="mx-4 mt-4 w-full max-w-5xl rounded-2xl border border-white/10 bg-brand-950/85 backdrop-blur-xl shadow-lg shadow-brand-950/30">
          <nav className="flex h-14 items-center justify-between px-5">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5">
              <TicketIcon className="h-7 w-7 text-brand-500" />
              <span className="text-lg font-medium tracking-tight text-white">
                event<span className="text-brand-500">ful</span>
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Desktop auth CTAs */}
            <div className="hidden items-center gap-2 md:flex">
              {isLoaded && user ? (
                <Link href={dashboardHref} className="btn-cartoon-on-dark px-4 py-2 text-sm">
                  Dashboard
                </Link>
              ) : isLoaded ? (
                <>
                  <Link href="/login" className="btn-ghost-on-dark px-4 py-2 text-sm">
                    Log in
                  </Link>
                  <Link href="/register" className="btn-cartoon-on-dark px-4 py-2 text-sm">
                    Get started
                  </Link>
                </>
              ) : null}
            </div>

            {/* Mobile hamburger */}
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 active:bg-white/20 md:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      {/* ── Full-screen mobile drawer ───────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel — slides in from right */}
      <aside
        className={`fixed right-0 top-0 z-[70] flex h-full w-[min(80vw,320px)] flex-col bg-brand-950 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Mobile navigation"
      >
        {/* Drawer header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={() => setMenuOpen(false)}>
            <TicketIcon className="h-6 w-6 text-brand-500" />
            <span className="text-base font-medium text-white">
              event<span className="text-brand-500">ful</span>
            </span>
          </Link>
          <button
            onClick={() => setMenuOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close menu"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links — large touch targets */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center rounded-2xl px-5 py-4 text-base font-semibold text-white/80 transition hover:bg-white/10 hover:text-white active:bg-white/20"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth CTAs pinned to bottom with safe-area */}
        <div
          className="shrink-0 space-y-2.5 border-t border-white/10 px-4 py-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {isLoaded && user ? (
            <Link
              href={dashboardHref}
              onClick={() => setMenuOpen(false)}
              className="btn-cartoon-on-dark w-full py-4 text-sm"
            >
              Go to Dashboard
            </Link>
          ) : isLoaded ? (
            <>
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="btn-ghost-on-dark w-full py-4 text-sm"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                className="btn-cartoon-on-dark w-full py-4 text-sm"
              >
                Get started free
              </Link>
            </>
          ) : null}
        </div>
      </aside>
    </>
  );
}
