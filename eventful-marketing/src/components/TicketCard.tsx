import { MapPointIcon } from '@/components/icons';

interface TicketCardProps {
  eventName: string;
  category: string;
  venue: string;
  date: string;
  time: string;
  price: string;
  notchColor?: string;
  className?: string;
}

export default function TicketCard({
  eventName,
  category,
  venue,
  date,
  time,
  price,
  notchColor = 'bg-white',
  className = '',
}: TicketCardProps) {
  // Parse day + month from "Aug 30, 2026" → "30" + "AUG"
  const parts = date.split(' ');
  const dayNum = parts[1]?.replace(',', '') ?? '';
  const monthStr = (parts[0] ?? '').slice(0, 3).toUpperCase();

  return (
    <div className={`relative flex w-full max-w-[420px] overflow-visible ${className}`}>
      {/* Notch left */}
      <div className={`absolute -left-3.5 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full border-2 border-brand-950 ${notchColor}`} />
      {/* Notch right */}
      <div className={`absolute -right-3.5 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full border-2 border-brand-950 ${notchColor}`} />

      {/* Ticket body */}
      <div
        className="flex w-full overflow-hidden rounded-2xl border-2 border-brand-950 bg-white"
        style={{ boxShadow: '6px 6px 0 #333333' }}
      >
        {/* ── Main section ──────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col justify-between p-5">

          {/* Top: category badge + price */}
          <div className="flex items-start justify-between gap-2">
            <span className="inline-flex items-center rounded-lg border-2 border-brand-950 bg-brand-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-[2px_2px_0_#333333]">
              {category}
            </span>
            <span className="shrink-0 text-sm font-black text-brand-600">{price}</span>
          </div>

          {/* Event name + venue */}
          <div className="mt-4">
            <h3 className="font-slackey text-xl font-black leading-tight text-brand-950">
              {eventName}
            </h3>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <MapPointIcon className="h-3.5 w-3.5 shrink-0 text-brand-600" />
              {venue}
            </p>
          </div>

          {/* Date block + time */}
          <div className="mt-5 flex items-center gap-3">
            {/* Cartoon date square */}
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border-2 border-brand-950 bg-brand-50 shadow-[2px_2px_0_#333333]">
              <span className="text-[10px] font-black uppercase leading-none text-brand-600">{monthStr}</span>
              <span className="text-3xl font-black leading-none text-brand-950">{dayNum}</span>
            </div>
            <div>
              <p className="text-sm font-extrabold text-brand-950">{date}</p>
              <p className="text-sm font-medium text-slate-400">{time}</p>
            </div>
          </div>
        </div>

        {/* ── Perforated divider ────────────────────────────────────────── */}
        <div className="relative flex flex-col items-center py-3">
          <div className="h-full w-0 border-l-2 border-dashed border-slate-200" />
        </div>

        {/* ── Stub section (orange) ─────────────────────────────────────── */}
        <div className="flex w-28 flex-col items-center justify-between bg-brand-600 px-3 py-5">

          {/* QR code — white bg on orange */}
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-white bg-white p-1.5">
            <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
              {/* Top-left finder */}
              <rect x="10" y="10" width="30" height="30" rx="3" fill="#333333"/>
              <rect x="15" y="15" width="20" height="20" rx="2" fill="white"/>
              <rect x="19" y="19" width="12" height="12" rx="1" fill="#333333"/>
              {/* Top-right finder */}
              <rect x="60" y="10" width="30" height="30" rx="3" fill="#333333"/>
              <rect x="65" y="15" width="20" height="20" rx="2" fill="white"/>
              <rect x="69" y="19" width="12" height="12" rx="1" fill="#333333"/>
              {/* Bottom-left finder */}
              <rect x="10" y="60" width="30" height="30" rx="3" fill="#333333"/>
              <rect x="15" y="65" width="20" height="20" rx="2" fill="white"/>
              <rect x="19" y="69" width="12" height="12" rx="1" fill="#333333"/>
              {/* Data modules */}
              <rect x="50" y="50" width="8" height="8" rx="1" fill="#F07200" opacity="0.9"/>
              <rect x="62" y="50" width="8" height="8" rx="1" fill="#333333"/>
              <rect x="74" y="50" width="16" height="8" rx="1" fill="#F07200" opacity="0.8"/>
              <rect x="50" y="62" width="20" height="8" rx="1" fill="#333333"/>
              <rect x="74" y="62" width="16" height="8" rx="1" fill="#F07200" opacity="0.9"/>
              <rect x="50" y="74" width="8" height="16" rx="1" fill="#333333"/>
              <rect x="62" y="74" width="28" height="8" rx="1" fill="#F07200" opacity="0.7"/>
              <rect x="82" y="82" width="8" height="8" rx="1" fill="#333333"/>
            </svg>
          </div>

          {/* ADMIT ONE rotated */}
          <div className="flex flex-1 items-center justify-center py-3">
            <p
              className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.25em] text-white/70"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Admit One
            </p>
          </div>

          {/* Barcode — white bars on orange */}
          <div className="flex h-8 w-16 items-end justify-center gap-px overflow-hidden rounded">
            {[3, 5, 2, 7, 4, 6, 3, 5, 2, 6, 4, 3, 7, 5, 4, 2].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h * 4}px`, backgroundColor: i % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}
                className="w-1 rounded-sm"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
