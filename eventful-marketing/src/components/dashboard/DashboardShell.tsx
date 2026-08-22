'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useApiFetch } from '@/contexts/auth-context';
import {
  TicketIcon, CalendarIcon, ChartIcon, SettingsIcon,
  QrCodeIcon, UsersGroupIcon, MenuIcon, XIcon,
  PowerIcon, HomeIcon, BellIcon, TagPriceIcon, MailIcon,
  CheckCircleIcon, ShieldCheckIcon,
} from '@/components/icons';

// ─── Nav config ───────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  shortLabel: string; // used in bottom tab bar
  Icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const ATTENDEE_NAV: NavItem[] = [
  { href: '/dashboard',           label: 'My Tickets', shortLabel: 'Tickets',  Icon: TicketIcon,       exact: true },
  { href: '/events',               label: 'Discover',   shortLabel: 'Discover', Icon: HomeIcon },
  { href: '/dashboard/support',   label: 'Support',    shortLabel: 'Support',  Icon: CheckCircleIcon },
  { href: '/dashboard/settings',  label: 'Settings',   shortLabel: 'Settings', Icon: SettingsIcon },
];

const CREATOR_NAV: NavItem[] = [
  { href: '/dashboard/creator',              label: 'Overview',       shortLabel: 'Overview',   Icon: ChartIcon,        exact: true },
  { href: '/dashboard/creator/events',       label: 'My Events',      shortLabel: 'Events',     Icon: CalendarIcon },
  { href: '/dashboard/creator/discounts',    label: 'Discounts',      shortLabel: 'Discounts',  Icon: TagPriceIcon },
  { href: '/dashboard/creator/marketing',    label: 'Marketing',      shortLabel: 'Marketing',  Icon: MailIcon },
  { href: '/dashboard/creator/kyc',          label: 'Identity & KYC', shortLabel: 'KYC',        Icon: ShieldCheckIcon },
  { href: '/dashboard/creator/support',      label: 'Support',        shortLabel: 'Support',    Icon: CheckCircleIcon },
  { href: '/dashboard/creator/settings',     label: 'Settings',       shortLabel: 'Settings',   Icon: SettingsIcon },
];

const STAFF_NAV: NavItem[] = [
  { href: '/dashboard/staff',            label: 'Check-in',  shortLabel: 'Check-in',  Icon: QrCodeIcon,     exact: true },
  { href: '/dashboard/staff/attendees',  label: 'Attendees', shortLabel: 'Attendees', Icon: UsersGroupIcon },
];

// Bottom tab bar shows max 4 items (most important ones)
const CREATOR_TABS = CREATOR_NAV.slice(0, 4);
const ATTENDEE_TABS = ATTENDEE_NAV; // all 4 fit
const STAFF_TABS = STAFF_NAV;       // only 2

function getRole(path: string): 'creator' | 'staff' | 'attendee' {
  if (path.startsWith('/dashboard/creator')) return 'creator';
  if (path.startsWith('/dashboard/staff'))   return 'staff';
  return 'attendee';
}

function getRoleLabel(role: 'creator' | 'staff' | 'attendee') {
  if (role === 'creator') return 'Event Creator';
  if (role === 'staff')   return 'Door Staff';
  return 'Attendee';
}

function getNavItems(role: 'creator' | 'staff' | 'attendee') {
  if (role === 'creator') return CREATOR_NAV;
  if (role === 'staff')   return STAFF_NAV;
  return ATTENDEE_NAV;
}

function getTabItems(role: 'creator' | 'staff' | 'attendee') {
  if (role === 'creator') return CREATOR_TABS;
  if (role === 'staff')   return STAFF_TABS;
  return ATTENDEE_TABS;
}

function getInitial(name?: string | null) {
  return name ? name.charAt(0).toUpperCase() : 'U';
}

// ─── Verification banner ──────────────────────────────────────────────────────

function VerificationBanner() {
  const { user } = useAuth();
  const apiFetch = useApiFetch();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerifiedAt) return null;

  async function resend() {
    setSending(true);
    try {
      await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, { method: 'POST' });
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
      <MailIcon className="h-4 w-4 shrink-0 text-brand-500" />
      <span className="flex-1 text-xs sm:text-sm">
        Please verify your email address — check your inbox for a link from Eventful.
      </span>
      {sent ? (
        <span className="shrink-0 font-medium text-brand-600">Sent!</span>
      ) : (
        <button
          onClick={resend}
          disabled={sending}
          className="shrink-0 font-semibold underline underline-offset-2 hover:text-brand-900 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Resend'}
        </button>
      )}
    </div>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = getRole(pathname);
  const nav  = getNavItems(role);

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <div className="flex h-full flex-col bg-white border-r border-slate-100">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <Link href="/" className="flex items-center gap-2" onClick={onClose}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-950">
            <TicketIcon className="h-4 w-4 text-brand-500" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
            event<span className="text-brand-600">ful</span>
          </span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 lg:hidden">
            <XIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          Menu
        </p>
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.Icon className={`h-5 w-5 shrink-0 ${active ? 'text-brand-500' : 'text-slate-400'}`} />
                  {item.label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section: avatar + sign out + My Tickets */}
      <div className="shrink-0 border-t border-slate-100 px-3 py-3 space-y-0.5">
        {/* User card */}
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div suppressHydrationWarning className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-600">
            {getInitial(user?.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <p suppressHydrationWarning className="truncate text-sm font-semibold text-slate-900">
              {user?.fullName ?? ''}
            </p>
            <p className="text-xs text-slate-400">{getRoleLabel(role)}</p>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={() => logout()}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <PowerIcon className="h-5 w-5 shrink-0" />
          Sign out
        </button>

        {/* My Tickets — quick access */}
        <Link
          href="/dashboard/my-tickets"
          onClick={onClose}
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            pathname === '/dashboard/my-tickets'
              ? 'bg-brand-50 text-brand-600'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          <TicketIcon className={`h-5 w-5 shrink-0 ${pathname === '/dashboard/my-tickets' ? 'text-brand-500' : 'text-slate-400'}`} />
          My Tickets
        </Link>
      </div>
    </div>
  );
}

// ─── Mobile bottom tab bar ────────────────────────────────────────────────────

function BottomTabBar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = getRole(pathname);
  const tabs = getTabItems(role);

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex">
        {tabs.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition active:opacity-70 ${
                active ? 'text-brand-600' : 'text-slate-400'
              }`}
            >
              <item.Icon className={`h-6 w-6 ${active ? 'text-brand-500' : 'text-slate-400'}`} />
              <span className="text-[10px] font-bold tracking-wide">{item.shortLabel}</span>
              {active && (
                <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-brand-500"
                  style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const role = getRole(pathname);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile overlay drawer (for items not in bottom tab bar) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 shadow-2xl slide-in-right">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Mobile top bar — logo + notifications only (nav is in bottom bar) */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <Link href="/" className="flex items-center gap-1.5">
            <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <path d="M8 12a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v6a3 3 0 0 0 0 4v6a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-6a3 3 0 0 0 0-4v-6z" fill="#F07200"/>
              <rect x="13" y="18" width="14" height="4" rx="2" fill="white" opacity="0.9"/>
              <circle cx="13" cy="13" r="2.5" fill="white" opacity="0.85"/>
              <circle cx="27" cy="13" r="2.5" fill="white" opacity="0.85"/>
              <circle cx="13" cy="27" r="2.5" fill="white" opacity="0.85"/>
              <circle cx="27" cy="27" r="2.5" fill="white" opacity="0.85"/>
            </svg>
            <span className="text-base font-extrabold tracking-tight text-slate-900">
              event<span className="text-brand-600">ful</span>
            </span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Notifications */}
          <button className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 active:bg-slate-200">
            <BellIcon className="h-5 w-5" />
          </button>

          {/* More — opens drawer for items not in bottom tab */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 active:bg-slate-200"
            aria-label="More options"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Email verification banner */}
        <VerificationBanner />

        {/* Scrollable content — padded to clear the bottom tab bar */}
        <main className="flex-1 overflow-y-auto pb-tab-safe lg:pb-0">
          {children}
        </main>
      </div>

      {/* Bottom tab navigation (mobile only) */}
      <BottomTabBar />
    </div>
  );
}
