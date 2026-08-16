import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Event details';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface EventDetail {
  title: string;
  category: string;
  venue: string;
  startsAt: string;
  price: string;
  currency: string;
  creator: { fullName: string };
}

async function fetchEvent(slug: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/events/slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const CATEGORY_EMOJI: Record<string, string> = {
  CONCERT: '🎸', THEATER: '🎭', SPORTS: '⚽', CULTURAL: '🏛️', OTHER: '🎤',
};

export default async function Image({ params }: { params: { slug: string } }) {
  const event = await fetchEvent(params.slug);

  const title    = event?.title    ?? 'Event on Eventful';
  const venue    = event?.venue    ?? '';
  const category = event?.category ?? 'OTHER';
  const emoji    = CATEGORY_EMOJI[category] ?? '🎟️';
  const isFree   = !event || event.price === '0' || Number(event.price) === 0;
  const priceStr = isFree
    ? 'Free'
    : `${event!.currency} ${Number(event!.price).toLocaleString()}`;
  const dateStr  = event
    ? new Date(event.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0f0a2e 0%, #1e1452 50%, #0f0a2e 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background orb */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,84,252,0.3) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '60px',
            width: '350px',
            height: '350px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,84,252,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '60px 80px',
            width: '100%',
          }}
        >
          {/* Top — logo + category */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#6354fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                }}
              >
                🎟️
              </div>
              <span style={{ color: 'white', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>
                eventful
              </span>
            </div>
            <div
              style={{
                background: 'rgba(99,84,252,0.25)',
                border: '1px solid rgba(99,84,252,0.4)',
                borderRadius: '100px',
                padding: '8px 20px',
                color: '#a5a0ff',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>{emoji}</span>
              <span>{category.charAt(0) + category.slice(1).toLowerCase()}</span>
            </div>
          </div>

          {/* Middle — title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                fontSize: title.length > 40 ? '52px' : '64px',
                fontWeight: 900,
                color: 'white',
                lineHeight: 1.05,
                letterSpacing: '-2px',
                maxWidth: '900px',
              }}
            >
              {title}
            </div>
          </div>

          {/* Bottom — venue, date, price */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '32px' }}>
              {venue && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📍</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px' }}>{venue}</span>
                </div>
              )}
              {dateStr && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📅</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '18px' }}>{dateStr}</span>
                </div>
              )}
            </div>

            {/* Price pill */}
            <div
              style={{
                background: isFree ? 'rgba(34,197,94,0.2)' : 'rgba(99,84,252,0.3)',
                border: `1px solid ${isFree ? 'rgba(34,197,94,0.4)' : 'rgba(99,84,252,0.5)'}`,
                borderRadius: '100px',
                padding: '10px 28px',
                color: isFree ? '#86efac' : 'white',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              {priceStr}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
