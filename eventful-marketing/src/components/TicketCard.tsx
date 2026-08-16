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
  return (
    <div className={`relative flex w-[420px] overflow-visible ${className}`}>
      {/* Notch left */}
      <div className={`absolute -left-3.5 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full ${notchColor}`} />
      {/* Notch right */}
      <div className={`absolute -right-3.5 top-1/2 z-10 h-7 w-7 -translate-y-1/2 rounded-full ${notchColor}`} />

      {/* Ticket body */}
      <div className="flex w-full overflow-hidden rounded-2xl bg-brand-950 shadow-ticket">

        {/* Main section */}
        <div className="flex flex-1 flex-col justify-between p-7">
          {/* Category badge */}
          <span className="inline-flex w-fit items-center rounded-full bg-brand-900 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-300">
            {category}
          </span>

          {/* Event name */}
          <div className="mt-5">
            <h3 className="text-xl font-extrabold leading-tight text-white">{eventName}</h3>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-300/70">
              <MapPointIcon className="h-3.5 w-3.5 shrink-0 text-brand-400" />
              {venue}
            </p>
          </div>

          {/* Date + time + price */}
          <div className="mt-6 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600">Date &amp; Time</p>
              <p className="mt-1 text-sm font-bold text-white/80">{date}</p>
              <p className="text-sm text-brand-400/70">{time}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600">Price</p>
              <p className="mt-1 text-lg font-extrabold text-brand-300">{price}</p>
            </div>
          </div>
        </div>

        {/* Perforated divider */}
        <div className="relative flex w-px flex-col items-center">
          <div className="h-full w-px border-l-2 border-dashed border-brand-900" />
        </div>

        {/* Stub section */}
        <div className="flex w-28 flex-col items-center justify-between bg-brand-900 px-3 py-6">
          {/* QR placeholder */}
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-brand-950 p-1.5 ring-1 ring-brand-900">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <rect x="10" y="10" width="30" height="30" rx="3" fill="#A663CC" opacity="0.9"/>
              <rect x="15" y="15" width="20" height="20" rx="2" fill="#171123"/>
              <rect x="19" y="19" width="12" height="12" rx="1" fill="#c094e0"/>
              <rect x="60" y="10" width="30" height="30" rx="3" fill="#A663CC" opacity="0.9"/>
              <rect x="65" y="15" width="20" height="20" rx="2" fill="#171123"/>
              <rect x="69" y="19" width="12" height="12" rx="1" fill="#c094e0"/>
              <rect x="10" y="60" width="30" height="30" rx="3" fill="#A663CC" opacity="0.9"/>
              <rect x="15" y="65" width="20" height="20" rx="2" fill="#171123"/>
              <rect x="19" y="69" width="12" height="12" rx="1" fill="#c094e0"/>
              <rect x="50" y="50" width="8" height="8" rx="1" fill="#A663CC" opacity="0.7"/>
              <rect x="62" y="50" width="8" height="8" rx="1" fill="#A663CC" opacity="0.7"/>
              <rect x="74" y="50" width="16" height="8" rx="1" fill="#A663CC" opacity="0.7"/>
              <rect x="50" y="62" width="20" height="8" rx="1" fill="#A663CC" opacity="0.7"/>
              <rect x="74" y="62" width="16" height="8" rx="1" fill="#A663CC" opacity="0.7"/>
              <rect x="50" y="74" width="8" height="16" rx="1" fill="#A663CC" opacity="0.7"/>
              <rect x="62" y="74" width="28" height="8" rx="1" fill="#A663CC" opacity="0.7"/>
              <rect x="82" y="82" width="8" height="8" rx="1" fill="#A663CC" opacity="0.7"/>
            </svg>
          </div>

          {/* ADMIT ONE rotated text */}
          <div className="flex flex-1 items-center justify-center py-3">
            <p
              className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.25em] text-brand-600"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Admit One
            </p>
          </div>

          {/* Barcode-style lines */}
          <div className="flex h-8 w-16 items-end justify-center gap-px overflow-hidden rounded">
            {[3, 5, 2, 7, 4, 6, 3, 5, 2, 6, 4, 3, 7, 5, 4, 2].map((h, i) => (
              <div
                key={i}
                className="w-1 rounded-sm bg-brand-600"
                style={{ height: `${h * 4}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
