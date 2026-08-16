'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { TicketIcon } from '@/components/icons';

export default function EventPageNav() {
  const { user, isLoaded } = useAuth();

  const isCreator = user?.roles?.includes('CREATOR');
  const dashboardHref = isCreator ? '/dashboard/creator' : '/dashboard';

  return (
    <div className="flex items-center gap-3">
      {isLoaded && user && (
        <Link
          href={dashboardHref}
          className="rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Dashboard
        </Link>
      )}
      {isLoaded && !user && (
        <Link
          href="/login"
          className="rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-white/20"
        >
          Log in
        </Link>
      )}
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
          <TicketIcon className="h-4 w-4 text-white" />
        </span>
        <span className="text-sm font-bold text-white">eventful</span>
      </Link>
    </div>
  );
}
