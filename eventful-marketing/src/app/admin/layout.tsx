'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { TicketIcon, ShieldCheckIcon } from '@/components/icons';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready,    setReady]    = useState(false);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    try {
      const raw  = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      if (!user || !Array.isArray(user.roles) || !user.roles.includes('ADMIN')) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      setAdminName(user.fullName ?? user.email ?? 'Admin');
      setReady(true);
    } catch {
      router.replace('/login');
    }
  }, [router, pathname]);

  if (!ready) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm text-slate-400 animate-pulse">Verifying access…</p>
    </div>
  );

  function signOut() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Admin top bar */}
      <div className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
            <TicketIcon className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-sm font-extrabold text-slate-900">eventful</span>
        </Link>
        <span className="h-4 w-px bg-slate-200" />
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700">Admin</span>
        <nav className="flex flex-1 items-center gap-4 text-xs font-semibold">
          <Link href="/admin" className="text-slate-600 hover:text-brand-600">Overview</Link>
          <Link href="/admin/creators" className="flex items-center gap-1.5 text-slate-600 hover:text-brand-600">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            Creators
          </Link>
          <Link href="/admin/users" className="text-slate-600 hover:text-brand-600">Users</Link>
          <Link href="/admin/events" className="text-slate-600 hover:text-brand-600">Events</Link>
          <Link href="/admin/audit-log" className="text-slate-600 hover:text-brand-600">Audit log</Link>
        </nav>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="font-semibold">{adminName}</span>
          <button onClick={signOut} className="rounded-lg border border-slate-200 px-3 py-1 font-bold text-slate-600 hover:bg-slate-50">
            Sign out
          </button>
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
