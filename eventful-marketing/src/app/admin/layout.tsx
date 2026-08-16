import Link from 'next/link';
import { TicketIcon, ShieldCheckIcon } from '@/components/icons';

export const metadata = { title: 'Admin — Eventful' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Admin top bar */}
      <div className="flex h-14 shrink-0 items-center gap-6 border-b border-slate-200 bg-white px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
            <TicketIcon className="h-3.5 w-3.5 text-white" />
          </span>
          <span className="text-sm font-extrabold text-slate-900">eventful</span>
        </Link>
        <span className="h-4 w-px bg-slate-200" />
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-700">Admin</span>
        <nav className="flex items-center gap-4 text-xs font-semibold">
          <Link href="/admin" className="text-slate-600 hover:text-brand-600">Overview</Link>
          <Link href="/admin/creators" className="flex items-center gap-1.5 text-slate-600 hover:text-brand-600">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            Creators
          </Link>
          <Link href="/admin/users" className="text-slate-600 hover:text-brand-600">Users</Link>
          <Link href="/admin/events" className="text-slate-600 hover:text-brand-600">Events</Link>
          <Link href="/admin/audit-log" className="text-slate-600 hover:text-brand-600">Audit log</Link>
        </nav>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
