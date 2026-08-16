'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TicketIcon, CalendarIcon, MapPointIcon, ArrowLeftIcon, CheckCircleIcon, QrCodeIcon,
} from '@/components/icons';
import { toast } from '@/components/Toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketDetail {
  id: string;
  status: 'VALID' | 'USED' | 'CANCELLED' | 'PAID';
  purchasedAt?: string;
  checkedInAt?: string;
  event: {
    id: string;
    title: string;
    venue: string;
    startsAt: string;
    category: string;
    shareSlug: string;
    coverImageUrl?: string | null;
  };
  tier?: { name: string; price: string; currency: string };
  order?: { quantity: number; totalAmount: string; currency: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const CAT_GRADIENT: Record<string, string> = {
  CONCERT:  'from-brand-950 via-brand-900 to-brand-600',
  THEATER:  'from-slate-900 via-slate-800 to-slate-600',
  SPORTS:   'from-slate-900 via-slate-800 to-brand-800',
  CULTURAL: 'from-brand-950 via-slate-800 to-slate-700',
  OTHER:    'from-slate-900 via-slate-800 to-slate-600',
};

// ─── Printable ticket (captured by html2canvas) ───────────────────────────────

function PrintableTicket({
  ticket, qrSrc, cardRef,
}: { ticket: TicketDetail; qrSrc: string; cardRef: React.RefObject<HTMLDivElement> }) {
  const isFree = !ticket.tier || Number(ticket.tier.price) === 0;
  const price  = isFree ? 'Free' : `${ticket.tier!.currency} ${Number(ticket.tier!.price).toLocaleString()}`;

  return (
    <div ref={cardRef} style={{ width: 360, background: '#ffffff', borderRadius: 20, overflow: 'hidden', fontFamily: 'sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', gap: 12, padding: '16px 16px 14px', background: '#333333', alignItems: 'flex-start' }}>
        {ticket.event.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ticket.event.coverImageUrl} alt="" width={72} height={72} style={{ borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: 10, background: 'linear-gradient(135deg,#F07200,#333)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#ffffff', lineHeight: 1.3 }}>{ticket.event.title}</p>
          {ticket.tier && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#F07200', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ticket.tier.name}</p>}
          <p style={{ margin: '4px 0 0', fontSize: 10, color: '#aaa' }}>{fmtDate(ticket.event.startsAt)} | {fmtTime(ticket.event.startsAt)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: '#aaa' }}>{ticket.event.venue}</p>
        </div>
      </div>

      {/* Tear line */}
      <div style={{ position: 'relative', height: 20, background: '#f8f8f8', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: -10, width: 20, height: 20, borderRadius: '50%', background: '#ffffff' }} />
        <div style={{ flex: 1, borderTop: '1.5px dashed #e2e8f0', margin: '0 14px' }} />
        <div style={{ position: 'absolute', right: -10, width: 20, height: 20, borderRadius: '50%', background: '#ffffff' }} />
      </div>

      {/* QR section */}
      <div style={{ padding: '16px 20px 12px', textAlign: 'center', background: '#ffffff' }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {ticket.order?.quantity ?? 1} Ticket{(ticket.order?.quantity ?? 1) > 1 ? 's' : ''}
        </p>
        {ticket.tier && (
          <p style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 800, color: '#333333', letterSpacing: '0.06em' }}>
            {ticket.tier.name.toUpperCase()}
          </p>
        )}
        <div style={{ display: 'inline-block', border: '2px solid #f0f0f0', borderRadius: 12, padding: 10, marginBottom: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt="QR" width={160} height={160} crossOrigin="anonymous" />
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 9, fontWeight: 700, color: '#333', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          BOOKING ID: {ticket.id.split('-')[0].toUpperCase()}
        </p>
      </div>

      {/* Tear line 2 */}
      <div style={{ position: 'relative', height: 20, background: '#f8f8f8', display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: -10, width: 20, height: 20, borderRadius: '50%', background: '#ffffff' }} />
        <div style={{ flex: 1, borderTop: '1.5px dashed #e2e8f0', margin: '0 14px' }} />
        <div style={{ position: 'absolute', right: -10, width: 20, height: 20, borderRadius: '50%', background: '#ffffff' }} />
      </div>

      {/* Price breakdown */}
      <div style={{ padding: '12px 20px 8px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: '#888' }}>Ticket price ({ticket.order?.quantity ?? 1})</span>
          <span style={{ fontSize: 11, color: '#333', fontWeight: 600 }}>{price}</span>
        </div>
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>Total Amount</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#F07200' }}>
            {ticket.order ? `${ticket.order.currency} ${Number(ticket.order.totalAmount).toLocaleString()}` : price}
          </span>
        </div>
      </div>

      {/* Brand footer */}
      <div style={{ padding: '10px 20px 14px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          {/* Ticket icon as filled path — html2canvas renders fill reliably */}
          <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path fill="#F07200" d="M2 9a3 3 0 0 1 0-6v-1a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v1a3 3 0 0 1 0 6v6a3 3 0 0 1 0 6v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1a3 3 0 0 1 0-6V9z"/>
          </svg>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#F07200', letterSpacing: '0.1em' }}>EVENTFUL</span>
        </div>
        <p style={{ margin: '3px 0 0', fontSize: 9, color: '#bbb' }}>your tickets, your events</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">
      <div className="h-32 w-full bg-slate-200" />
      <div className="h-5 bg-slate-50" />
      <div className="flex flex-col items-center gap-4 px-6 py-8">
        <div className="h-[200px] w-[200px] rounded-2xl bg-slate-200" />
        <div className="h-3 w-2/3 rounded bg-slate-200" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TicketQrPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const token   = getToken();
  const cardRef = useRef<HTMLDivElement | null>(null);

  const [ticket,      setTicket]      = useState<TicketDetail | null>(null);
  const [qrSrc,       setQrSrc]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [downloading, setDownloading] = useState<'pdf' | 'png' | null>(null);

  // Fetch ticket + QR
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    const headers = { Authorization: `Bearer ${token}` };
    let objectUrl = '';

    Promise.all([
      fetch(`${API}/eventees/me/tickets/${id}`, { headers }).then(r => {
        if (!r.ok) throw new Error('Ticket not found');
        return r.json() as Promise<TicketDetail>;
      }),
      fetch(`${API}/eventees/me/tickets/${id}/qr`, { headers }).then(async r => {
        if (!r.ok) return '';
        const blob = await r.blob();
        objectUrl  = URL.createObjectURL(blob);
        return objectUrl;
      }),
    ])
      .then(([t, qr]) => { setTicket(t); setQrSrc(qr); })
      .catch(e => setError(e.message ?? 'Could not load ticket'))
      .finally(() => setLoading(false));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function downloadPng() {
    if (!cardRef.current || !ticket) return;
    setDownloading('png');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const link   = document.createElement('a');
      link.href     = canvas.toDataURL('image/png');
      link.download = `ticket-${ticket.id.slice(0, 8)}.png`;
      link.click();
      toast.success('Ticket image downloaded');
    } catch { toast.error('Could not generate image'); }
    finally { setDownloading(null); }
  }

  async function downloadPdf() {
    if (!cardRef.current || !ticket) return;
    setDownloading('pdf');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF }       = await import('jspdf');
      const canvas  = await html2canvas(cardRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const w = canvas.width / 3;
      const h = canvas.height / 3;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [w, h] });
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`ticket-${ticket.id.slice(0, 8)}.pdf`);
      toast.success('Ticket PDF downloaded');
    } catch { toast.error('Could not generate PDF'); }
    finally { setDownloading(null); }
  }

  const isValid = ticket?.status === 'VALID' || ticket?.status === 'PAID';
  const isUsed  = ticket?.status === 'USED';
  const canDownload = isValid && !!qrSrc;
  const grad    = CAT_GRADIENT[ticket?.event.category ?? ''] ?? CAT_GRADIENT.OTHER;
  const price   = ticket ? Number(ticket.tier?.price ?? ticket.order?.totalAmount ?? 0) : 0;
  const currency = ticket?.tier?.currency ?? ticket?.order?.currency ?? 'XAF';

  return (
    <div className="mx-auto max-w-sm px-4 py-8">

      {/* Back */}
      <Link href="/dashboard/my-tickets" className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-800">
        <ArrowLeftIcon className="h-4 w-4" />
        My Tickets
      </Link>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-10 text-center">
          <TicketIcon className="mx-auto h-10 w-10 text-red-300" />
          <p className="mt-3 text-sm font-bold text-red-700">{error}</p>
        </div>
      ) : loading ? (
        <SkeletonCard />
      ) : ticket ? (
        <>
          {/* ── Visible M-Ticket card ─────────────────────────────────────── */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-100">

            {/* Header — cover image + info */}
            <div className="relative flex gap-3 bg-brand-950 p-4">
              {/* Side watermark */}
              <div className="absolute right-0 top-0 bottom-0 w-6 flex items-center justify-center">
                <span className="text-[8px] font-bold tracking-[0.25em] text-white/20 uppercase"
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                  Eventful
                </span>
              </div>

              {/* Cover image or gradient thumbnail */}
              <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl">
                {ticket.event.coverImageUrl ? (
                  <Image src={ticket.event.coverImageUrl} alt={ticket.event.title} fill className="object-cover" sizes="72px" />
                ) : (
                  <div className={`h-full w-full bg-gradient-to-br ${grad} flex items-center justify-center`}>
                    <TicketIcon className="h-7 w-7 text-white/60" />
                  </div>
                )}
              </div>

              {/* Event meta */}
              <div className="min-w-0 flex-1 pr-5">
                <h1 className="line-clamp-2 text-sm font-extrabold leading-tight text-white">{ticket.event.title}</h1>
                {ticket.tier && (
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-brand-400">{ticket.tier.name}</p>
                )}
                <div className="mt-1.5 space-y-0.5">
                  <p className="flex items-center gap-1 text-[10px] text-white/50">
                    <CalendarIcon className="h-2.5 w-2.5 shrink-0" />
                    {fmtDate(ticket.event.startsAt)} | {fmtTime(ticket.event.startsAt)}
                  </p>
                  <p className="flex items-center gap-1 text-[10px] text-white/50">
                    <MapPointIcon className="h-2.5 w-2.5 shrink-0" />
                    {ticket.event.venue}
                  </p>
                </div>
              </div>
            </div>

            {/* Tear line 1 */}
            <div className="relative flex h-5 items-center bg-slate-50">
              <div className="absolute -left-2.5 h-5 w-5 rounded-full bg-white ring-1 ring-slate-100" />
              <div className="w-full border-t-2 border-dashed border-slate-200" />
              <div className="absolute -right-2.5 h-5 w-5 rounded-full bg-white ring-1 ring-slate-100" />
            </div>

            {/* QR section */}
            <div className="flex flex-col items-center px-6 py-6">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {ticket.order?.quantity ?? 1} Ticket{(ticket.order?.quantity ?? 1) > 1 ? 's' : ''}
              </p>

              {ticket.tier && (
                <p className="mt-1 text-lg font-extrabold tracking-widest text-slate-900 uppercase">
                  {ticket.tier.name}
                </p>
              )}

              <div className="mt-4">
                {isUsed ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <CheckCircleIcon className="h-16 w-16 text-slate-300" />
                    <p className="text-sm font-bold text-slate-500">Already checked in</p>
                    {ticket.checkedInAt && (
                      <p className="text-xs text-slate-400">{new Date(ticket.checkedInAt).toLocaleString('en-GB')}</p>
                    )}
                  </div>
                ) : ticket.status === 'CANCELLED' ? (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <TicketIcon className="h-16 w-16 text-red-200" />
                    <p className="text-sm font-bold text-red-500">Ticket cancelled</p>
                  </div>
                ) : qrSrc ? (
                  <div className="rounded-2xl border-2 border-slate-100 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrSrc} alt="Ticket QR code" width={200} height={200} className="h-[200px] w-[200px]" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <QrCodeIcon className="h-12 w-12 text-slate-300" />
                    <p className="text-xs text-slate-400">QR not available</p>
                  </div>
                )}
              </div>

              {isValid && (
                <>
                  <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">Present at the door</p>
                  <p className="mt-1 font-mono text-[10px] font-bold tracking-widest text-slate-900 uppercase">
                    BOOKING ID: {ticket.id.split('-')[0].toUpperCase()}
                  </p>
                </>
              )}
            </div>

            {/* Tear line 2 */}
            <div className="relative flex h-5 items-center bg-slate-50">
              <div className="absolute -left-2.5 h-5 w-5 rounded-full bg-white ring-1 ring-slate-100" />
              <div className="w-full border-t-2 border-dashed border-slate-200" />
              <div className="absolute -right-2.5 h-5 w-5 rounded-full bg-white ring-1 ring-slate-100" />
            </div>

            {/* Price breakdown */}
            <div className="px-6 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Ticket price ({ticket.order?.quantity ?? 1})</span>
                <span className="font-semibold text-slate-700">
                  {price === 0 ? 'Free' : `${currency} ${price.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <span className="text-sm font-bold text-slate-700">Total Amount</span>
                <span className="text-sm font-extrabold text-brand-600">
                  {ticket.order
                    ? `${ticket.order.currency} ${Number(ticket.order.totalAmount).toLocaleString()}`
                    : price === 0 ? 'Free' : `${currency} ${price.toLocaleString()}`
                  }
                </span>
              </div>
            </div>

            {/* Brand footer */}
            <div className="flex flex-col items-center border-t border-slate-100 py-4">
              <div className="flex items-center gap-1.5">
                <TicketIcon className="h-4 w-4 text-brand-500" />
                <span className="text-[11px] font-extrabold tracking-widest text-brand-600 uppercase">Eventful</span>
              </div>
              <p className="mt-0.5 text-[9px] text-slate-300">your tickets, your events</p>
            </div>
          </div>

          {/* Download buttons */}
          {canDownload && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={downloadPng}
                disabled={!!downloading}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-600 disabled:opacity-50"
              >
                {downloading === 'png' ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                  </svg>
                )}
                Save as PNG
              </button>
              <button
                onClick={downloadPdf}
                disabled={!!downloading}
                className="flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-xs font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-500 disabled:opacity-50"
              >
                {downloading === 'pdf' ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/>
                  </svg>
                )}
                Save as PDF
              </button>
            </div>
          )}

          {/* Hidden printable */}
          {canDownload && (
            <div className="pointer-events-none fixed left-[-9999px] top-0 opacity-0" aria-hidden="true">
              <PrintableTicket ticket={ticket} qrSrc={qrSrc} cardRef={cardRef} />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
