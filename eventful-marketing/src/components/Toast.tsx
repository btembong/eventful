'use client';

import { useState, useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

type Listener = (item: ToastItem) => void;

// ─── Global singleton emitter ─────────────────────────────────────────────────
// Usable from any file — no hook / context needed.

const listeners: Listener[] = [];

function emit(message: string, kind: ToastKind) {
  const item: ToastItem = { id: Math.random().toString(36).slice(2), message, kind };
  listeners.forEach((fn) => fn(item));
}

export const toast = {
  success: (message: string) => emit(message, 'success'),
  error:   (message: string) => emit(message, 'error'),
  info:    (message: string) => emit(message, 'info'),
  warning: (message: string) => emit(message, 'warning'),
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-500">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16m3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-red-500">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0m-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5m0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-brand-500">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0m-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0M9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-amber-500">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625zM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5m0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2" clipRule="evenodd" />
    </svg>
  ),
};

const BG: Record<ToastKind, string> = {
  success: 'border-emerald-100 bg-emerald-50',
  error:   'border-red-100 bg-red-50',
  info:    'border-brand-100 bg-brand-50',
  warning: 'border-amber-100 bg-amber-50',
};

// ─── Single toast chip ────────────────────────────────────────────────────────

function ToastChip({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    timer.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(item.id), 300);
    }, 4500);
    return () => clearTimeout(timer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setVisible(false);
    setTimeout(() => onDismiss(item.id), 300);
  }

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 shadow-lg transition-all duration-300 ${BG[item.kind]} ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      }`}
      style={{ minWidth: 280, maxWidth: 400 }}
    >
      <span className="mt-0.5 shrink-0">{ICONS[item.kind]}</span>
      <p className="flex-1 text-sm font-medium text-slate-800 leading-snug">{item.message}</p>
      <button onClick={dismiss} className="shrink-0 rounded-lg p-0.5 text-slate-400 transition hover:text-slate-700">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z" />
        </svg>
      </button>
    </div>
  );
}

// ─── Provider — mounts once in the layout ────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler: Listener = (item) => {
      setToasts((prev) => [...prev.slice(-4), item]);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastChip item={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </>
  );
}
