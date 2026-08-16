import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL!;

interface Stats {
  totalUsers: number;
  totalCreators: number;
  totalEvents: number;
  totalTicketsSold: number;
  totalRevenue: number;
  pendingCreatorApplications: number;
}

async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch(`${API}/admin/stats`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function KPI({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:ring-brand-200">
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-600">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminOverview() {
  const stats = await fetchStats();

  const kpis = stats ? [
    { label: 'Total users',              value: stats.totalUsers.toLocaleString(),          href: '/admin/users' },
    { label: 'Creators',                 value: stats.totalCreators.toLocaleString(),       href: '/admin/users?role=CREATOR' },
    { label: 'Events',                   value: stats.totalEvents.toLocaleString(),         href: '/admin/events' },
    { label: 'Tickets sold',             value: stats.totalTicketsSold.toLocaleString() },
    { label: 'Platform revenue (XAF)',   value: `XAF ${stats.totalRevenue.toLocaleString()}` },
    { label: 'Pending applications',     value: stats.pendingCreatorApplications.toLocaleString(), sub: 'awaiting review', href: '/admin/creators' },
  ] : [];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-extrabold text-slate-900">Platform overview</h1>
      <p className="mb-8 text-sm text-slate-500">Live stats — refreshed on each page load.</p>

      {!stats && (
        <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Could not load stats — API may be offline or authentication is required.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => <KPI key={k.label} {...k} />)}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Creator applications', desc: 'Review and approve creator KYC submissions.', href: '/admin/creators' },
          { title: 'User management',      desc: 'Search, view, and ban platform users.',          href: '/admin/users' },
          { title: 'Event moderation',     desc: 'Review and force-cancel events if needed.',      href: '/admin/events' },
          { title: 'Audit log',            desc: 'Full platform action trail.',                    href: '/admin/audit-log' },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition hover:ring-brand-300 hover:shadow-md">
            <p className="text-sm font-bold text-slate-900">{card.title}</p>
            <p className="mt-1 text-xs text-slate-400">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
