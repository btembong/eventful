import Link from 'next/link';
import { TicketIcon } from '@/components/icons';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top bar */}
      <div className="flex h-16 shrink-0 items-center border-b border-slate-100 bg-white px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600">
            <TicketIcon className="h-4 w-4 text-white" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-slate-900">eventful</span>
        </Link>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Eventful. &nbsp;
        <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
        &nbsp;·&nbsp;
        <Link href="/terms" className="hover:text-slate-600">Terms</Link>
      </div>
    </div>
  );
}
