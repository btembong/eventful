'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import jsQR from 'jsqr';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EventInfo {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  capacity: number;
}

interface TokenInfo {
  valid: boolean;
  label: string;
  expiresAt: string;
  event: EventInfo;
}

type ScanStatus = 'success' | 'already_used' | 'invalid';

interface VerificationResult {
  status: ScanStatus;
  ticketRef: string;
  attendeeName?: string;
  attendeeEmail?: string;
  checkedInAt?: string;
  firstCheckedInAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const PALETTE = {
  success:      { bg: 'bg-emerald-500',     ring: 'ring-emerald-400',   text: 'text-emerald-400',   light: 'bg-emerald-500/10',   label: 'Verified',      flash: 'rgba(16,185,129,0.25)' },
  already_used: { bg: 'bg-amber-500',       ring: 'ring-amber-400',     text: 'text-amber-400',     light: 'bg-amber-500/10',     label: 'Already Used',  flash: 'rgba(245,158,11,0.25)' },
  invalid:      { bg: 'bg-red-500',         ring: 'ring-red-400',       text: 'text-red-400',       light: 'bg-red-500/10',       label: 'Invalid',       flash: 'rgba(239,68,68,0.25)' },
};

// ─── Corner brackets SVG overlay ──────────────────────────────────────────────

function CornerBrackets({ active }: { active: boolean }) {
  const c = active ? '#F07200' : '#64748b';
  const s = 28;
  const t = 3;
  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      {/* Top-left */}
      <polyline points={`${s},${t} ${t},${t} ${t},${s}`} fill="none" stroke={c} strokeWidth="0.8" strokeLinecap="round" />
      {/* Top-right */}
      <polyline points={`${100-s},${t} ${100-t},${t} ${100-t},${s}`} fill="none" stroke={c} strokeWidth="0.8" strokeLinecap="round" />
      {/* Bottom-left */}
      <polyline points={`${s},${100-t} ${t},${100-t} ${t},${100-s}`} fill="none" stroke={c} strokeWidth="0.8" strokeLinecap="round" />
      {/* Bottom-right */}
      <polyline points={`${100-s},${100-t} ${100-t},${100-t} ${100-t},${100-s}`} fill="none" stroke={c} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

// ─── Camera scanner ────────────────────────────────────────────────────────────

function CameraScanner({
  onScan,
  disabled,
  flashStatus,
}: {
  onScan: (payload: string) => void;
  disabled: boolean;
  flashStatus: ScanStatus | null;
}) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const rafRef      = useRef<number | null>(null);
  const cooldownRef = useRef(false);
  const lastRef     = useRef('');

  const [started,  setStarted]  = useState(false);
  const [error,    setError]    = useState('');
  const [cameras,  setCameras]  = useState<{ id: string; label: string }[]>([]);
  const [camIdx,   setCamIdx]   = useState(0);

  const scanLoop = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) { rafRef.current = requestAnimationFrame(scanLoop); return; }
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { rafRef.current = requestAnimationFrame(scanLoop); return; }
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
    if (code && code.data && !cooldownRef.current && code.data !== lastRef.current && !disabled) {
      lastRef.current = code.data;
      cooldownRef.current = true;
      setTimeout(() => { cooldownRef.current = false; lastRef.current = ''; }, 3000);
      onScan(code.data);
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onScan, disabled]);

  async function startScanner(deviceId?: string) {
    setError('');
    try {
      // Enumerate cameras once
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevs = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ id: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 6)}` }));
      setCameras(videoDevs);

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStarted(true);
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.toLowerCase().includes('permission') ? 'Camera access denied. Tap to retry.' : 'Could not start camera.');
    }
  }

  function stopScanner() {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setStarted(false);
  }

  async function switchCamera() {
    if (cameras.length < 2) return;
    const next = (camIdx + 1) % cameras.length;
    setCamIdx(next);
    stopScanner();
    await startScanner(cameras[next]?.id);
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const flashColor = flashStatus ? PALETTE[flashStatus].flash : null;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-black ring-1 ring-slate-800">
      {/* Hidden canvas used by jsQR to read frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video viewport */}
      <div className="relative aspect-[4/3] w-full bg-slate-950">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />

        {/* Dim vignette overlay */}
        {started && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 100%)' }}
          />
        )}

        {/* Corner brackets */}
        {started && <CornerBrackets active={!disabled} />}

        {/* Sweep line */}
        {started && !disabled && (
          <div
            className="pointer-events-none absolute left-[8%] right-[8%]"
            style={{ height: 2, background: 'linear-gradient(90deg, transparent, #F07200, transparent)', animation: 'scanSweep 2s linear infinite' }}
          />
        )}

        {/* Result flash */}
        {flashColor && (
          <div
            key={flashColor + Date.now()}
            className="pointer-events-none absolute inset-0"
            style={{ backgroundColor: flashColor, animation: 'resultFlash 0.7s ease-out forwards' }}
          />
        )}

        {/* Pre-start state */}
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
              <svg className="h-10 w-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            {error && <p className="text-sm font-medium text-red-400">{error}</p>}
            <button
              onClick={() => startScanner()}
              className="rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-brand-500 active:scale-95"
            >
              {error ? 'Retry Camera' : 'Enable Camera'}
            </button>
          </div>
        )}
      </div>

      {/* Camera controls */}
      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${started ? 'bg-brand-500 animate-pulse' : 'bg-slate-600'}`} />
          <span className="text-xs font-medium text-slate-400">{started ? 'Live' : 'Camera off'}</span>
        </div>
        <div className="flex items-center gap-2">
          {cameras.length > 1 && started && (
            <button
              onClick={switchCamera}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-brand-600 hover:text-brand-400"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Flip
            </button>
          )}
          {started ? (
            <button
              onClick={stopScanner}
              className="rounded-lg border border-red-900 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-950"
            >
              Stop
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Manual entry ─────────────────────────────────────────────────────────────

function ManualEntry({ onScan, disabled }: { onScan: (payload: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onScan(value.trim());
    setValue('');
  }
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Paste QR payload or ticket ID…"
        className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="shrink-0 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 active:scale-95 disabled:opacity-40"
      >
        Check in
      </button>
    </form>
  );
}

// ─── Result panel ─────────────────────────────────────────────────────────────

function ResultPanel({
  result,
  scanning,
  onClear,
}: {
  result: VerificationResult | null;
  scanning: boolean;
  onClear: () => void;
}) {
  if (scanning) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-4 rounded-2xl bg-slate-900 ring-1 ring-slate-800">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
        <p className="text-sm font-medium text-slate-400">Verifying ticket…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-5 rounded-2xl bg-slate-900 ring-1 ring-slate-800">
        {/* Animated QR icon */}
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/10" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-500/10">
            <svg className="h-10 w-10 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-slate-300">Ready to scan</p>
          <p className="mt-1 text-sm text-slate-500">Point the camera at a ticket QR code</p>
        </div>
      </div>
    );
  }

  const p = PALETTE[result.status];
  const isSuccess = result.status === 'success';
  const isUsed    = result.status === 'already_used';

  return (
    <div className="flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl bg-slate-900 ring-1 ring-slate-800" style={{ animation: 'slideUp 0.3s ease-out' }}>
      {/* Status banner */}
      <div className={`px-6 py-8 text-center ${isSuccess ? 'bg-emerald-500/10' : isUsed ? 'bg-amber-500/10' : 'bg-red-500/10'}`}>
        {/* Icon */}
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ring-4 ${p.ring} bg-slate-900`}>
          {isSuccess ? (
            <svg className={`h-10 w-10 ${p.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : isUsed ? (
            <svg className={`h-10 w-10 ${p.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className={`h-10 w-10 ${p.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <h2 className={`text-2xl font-extrabold ${p.text}`}>
          {isSuccess ? 'Ticket Verified' : isUsed ? 'Already Checked In' : 'Invalid Ticket'}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {isSuccess ? 'Admit this guest' : isUsed ? 'This ticket was already scanned' : 'Do not admit — ticket not valid'}
        </p>
      </div>

      {/* Details */}
      <div className="flex-1 space-y-3 p-5">
        {/* Attendee */}
        {(result.attendeeName || result.attendeeEmail) && (
          <div className="rounded-xl bg-slate-800 px-4 py-3.5">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Attendee</p>
            {result.attendeeName  && <p className="text-base font-bold text-white">{result.attendeeName}</p>}
            {result.attendeeEmail && <p className="mt-0.5 text-xs text-slate-400">{result.attendeeEmail}</p>}
          </div>
        )}

        {/* Ticket ref */}
        <div className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
          <div>
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Ticket ID</p>
            <p className="font-mono text-xs font-bold text-slate-300">{result.ticketRef.slice(0, 18)}…</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${p.ring} ${p.light} ${p.text}`}>
            {p.label}
          </span>
        </div>

        {/* First check-in time */}
        {isUsed && result.firstCheckedInAt && (
          <p className="text-center text-xs text-slate-500">
            First admitted at <span className="font-semibold text-slate-400">{fmtShort(result.firstCheckedInAt)}</span>
          </p>
        )}
      </div>

      {/* Action */}
      <div className="border-t border-slate-800 px-5 py-4">
        <button
          onClick={onClear}
          className="w-full rounded-xl border border-slate-700 py-2.5 text-sm font-bold text-slate-400 transition hover:border-brand-600 hover:text-brand-400"
        >
          Scan next ticket
        </button>
      </div>
    </div>
  );
}

// ─── Recent scans strip ────────────────────────────────────────────────────────

function RecentScans({ scans }: { scans: VerificationResult[] }) {
  if (scans.length === 0) return null;
  return (
    <div className="rounded-2xl bg-slate-900 ring-1 ring-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Recent scans</p>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-400">{scans.length}</span>
      </div>
      <div className="max-h-52 divide-y divide-slate-800 overflow-y-auto">
        {scans.map((s, i) => {
          const p = PALETTE[s.status];
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${p.bg}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[11px] text-slate-400">{s.ticketRef.slice(0, 20)}</p>
                {s.attendeeName && <p className="truncate text-[11px] font-medium text-slate-300">{s.attendeeName}</p>}
              </div>
              <span className={`shrink-0 text-[10px] font-bold ${p.text}`}>{p.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Invalid token screen ──────────────────────────────────────────────────────

function InvalidToken() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/30">
        <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-extrabold text-white">Link expired or invalid</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-400">This scanner link is no longer valid. Ask the event organiser to generate a new one from their event dashboard.</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ScanPageInner() {
  const params = useSearchParams();
  const token  = params.get('token') ?? '';

  const [tokenInfo,   setTokenInfo]   = useState<TokenInfo | null>(null);
  const [tokenError,  setTokenError]  = useState(false);
  const [loading,     setLoading]     = useState(true);

  const [result,      setResult]      = useState<VerificationResult | null>(null);
  const [scanning,    setScanning]    = useState(false);
  const [checkedIn,   setCheckedIn]   = useState(0);
  const [recentScans, setRecentScans] = useState<VerificationResult[]>([]);
  const [flashStatus, setFlashStatus] = useState<ScanStatus | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) { setTokenError(true); setLoading(false); return; }
    fetch(`${API}/creators/scan/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: TokenInfo) => setTokenInfo(d))
      .catch(() => setTokenError(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleScan = useCallback(async (qrPayload: string) => {
    if (!tokenInfo || scanning) return;
    setScanning(true);
    try {
      const res = await fetch(`${API}/events/${tokenInfo.event.id}/checkin`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ qrPayload }),
      });
      const body = await res.json();

      let verif: VerificationResult;
      if (res.ok) {
        const alreadyUsed = body.alreadyCheckedIn === true;
        verif = {
          status:           alreadyUsed ? 'already_used' : 'success',
          ticketRef:        body.ticket?.id ?? qrPayload,
          attendeeName:     body.ticket?.order?.buyerName,
          attendeeEmail:    body.ticket?.order?.buyerEmail,
          checkedInAt:      body.ticket?.checkedInAt,
          firstCheckedInAt: alreadyUsed ? body.ticket?.checkedInAt : undefined,
        };
        if (!alreadyUsed) setCheckedIn(n => n + 1);
      } else {
        verif = { status: 'invalid', ticketRef: qrPayload };
      }

      setResult(verif);
      setRecentScans(prev => [verif, ...prev.slice(0, 19)]);

      // Flash overlay on camera
      setFlashStatus(verif.status);
      setTimeout(() => setFlashStatus(null), 800);

      // Auto-clear result after 6s
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      clearTimerRef.current = setTimeout(() => setResult(null), 6000);
    } catch {
      const verif: VerificationResult = { status: 'invalid', ticketRef: qrPayload };
      setResult(verif);
      setRecentScans(prev => [verif, ...prev.slice(0, 19)]);
    } finally {
      setScanning(false);
    }
  }, [tokenInfo, token, scanning]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (tokenError || !tokenInfo) return <InvalidToken />;

  const pct = tokenInfo.event.capacity > 0
    ? Math.min(100, Math.round((checkedIn / tokenInfo.event.capacity) * 100))
    : 0;

  return (
    <>
      {/* Keyframe animations */}
      <style>{`
        @keyframes scanSweep {
          0%   { top: 8%; }
          50%  { top: 88%; }
          100% { top: 8%; }
        }
        @keyframes resultFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-950 text-slate-100">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-4">
            {/* Logo mark + event */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-500">Ticket Scanner</p>
                <h1 className="truncate text-sm font-extrabold text-white">{tokenInfo.event.title}</h1>
                <p className="truncate text-[11px] text-slate-500">{tokenInfo.event.venue} · {fmtDate(tokenInfo.event.startsAt)}, {fmtTime(tokenInfo.event.startsAt)}</p>
              </div>
            </div>

            {/* Check-in counter */}
            <div className="shrink-0 text-right">
              <p className="text-3xl font-extrabold tabular-nums text-brand-400 leading-none">{checkedIn}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">checked in</p>
            </div>
          </div>

          {/* Progress bar */}
          {tokenInfo.event.capacity > 0 && (
            <div className="mx-auto mt-2.5 max-w-6xl">
              <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-right text-[10px] text-slate-600">
                {checkedIn} / {tokenInfo.event.capacity.toLocaleString()} · {pct}%
              </p>
            </div>
          )}
        </div>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_420px]">

            {/* Left — Camera */}
            <div className="space-y-4">
              <CameraScanner onScan={handleScan} disabled={scanning} flashStatus={flashStatus} />

              {/* Manual entry */}
              <div className="rounded-2xl bg-slate-900 px-4 py-4 ring-1 ring-slate-800">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Manual entry</p>
                <ManualEntry onScan={handleScan} disabled={scanning} />
              </div>

              {/* Scanner label */}
              <p className="text-center text-[11px] text-slate-600">
                Terminal: <span className="font-semibold text-slate-500">{tokenInfo.label}</span>
              </p>
            </div>

            {/* Right — Result + history */}
            <div className="space-y-4">
              <ResultPanel result={result} scanning={scanning} onClear={() => setResult(null)} />
              <RecentScans scans={recentScans} />
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
      </div>
    }>
      <ScanPageInner />
    </Suspense>
  );
}
