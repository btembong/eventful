'use client';

import { use, useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  type LegacyColumnDef as ColumnDef,
} from '@tanstack/react-table/legacy';
import { flexRender } from '@tanstack/react-table';
import type { SortingState } from '@tanstack/table-core';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  CalendarIcon, MapPointIcon, TicketIcon, TagPriceIcon,
  QrCodeIcon, ChartIcon, UsersGroupIcon, SettingsIcon,
  ShareIcon, PencilIcon, SearchIcon,
  DotsHorizontalIcon, WalletIcon, ArrowLeftIcon,
  PlusIcon, XIcon,
} from '@/components/icons';
import { toast } from '@/components/Toast';
import { useApiFetch } from '@/contexts/auth-context';
import { uploadToCloudinary } from '@/lib/cloudinary';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EventDetail {
  id: string;
  title: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  category: string;
  price: string;
  currency: string;
  capacity: number;
  isCancelled: boolean;
  isPublished: boolean;
  inDiscovery: boolean;
  shareSlug: string;
  description?: string;
  coverImageUrl?: string;
  defaultReminderOffsets?: number[];
  _count?: { tickets: number };
}

interface EventStats {
  capacity: number;
  capacityRemaining: number;
  ticketsSold: number;
  checkedIn: number;
  pendingPayment: number;
  cancelled: number;
  refunded: number;
  checkInRate: number;
  revenue: number;
  currency: string;
}

interface Attendee {
  id: string;
  name: string;
  email: string;
  ticketRef: string;
  purchasedAt: string;
  status: 'VALID' | 'USED' | 'CANCELLED';
  qty: number;
  amount: number;
  currency: string;
}

interface TicketType {
  id: string;
  name: string;
  price: number;
  currency: string;
  capacity: number;
  sold: number;
  type: 'FREE' | 'PAID' | 'INVITE';
  description?: string;
}

interface LineupMember {
  _id: string;
  title: string;
  name: string;
  description: string;
  role: string;
  photoUrl: string;
  socialLink: string;
}

// ─── Tabs config ────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview',   label: 'Event Setup',  Icon: CalendarIcon },
  { key: 'tickets',    label: 'Tickets',       Icon: TicketIcon },
  { key: 'attendees',  label: 'Attendees',     Icon: UsersGroupIcon },
  { key: 'finance',    label: 'Finance',       Icon: WalletIcon },
  { key: 'reports',    label: 'Reports',       Icon: ChartIcon },
  { key: 'settings',   label: 'Settings',      Icon: SettingsIcon },
] as const;

type TabKey = typeof TABS[number]['key'];

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_FORMATS = [
  'Conference', 'Concert / Gig', 'Festival', 'Workshop', 'Seminar',
  'Networking Event', 'Exhibition', 'Hackathon', 'Class / Course',
  'Sports Event', 'Party / Social', 'Charity / Fundraiser', 'Other',
];

const COUNTRIES = [
  { value: 'CM', label: 'Cameroon' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'SN', label: 'Senegal' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'ET', label: 'Ethiopia' },
  { value: 'UG', label: 'Uganda' },
  { value: 'RW', label: 'Rwanda' },
  { value: 'CD', label: 'DR Congo' },
  { value: 'MA', label: 'Morocco' },
  { value: 'EG', label: 'Egypt' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'FR', label: 'France' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'OTHER', label: 'Other' },
];

const TIMEZONES = [
  { value: 'Africa/Douala',        label: '(UTC+01:00) West Central Africa' },
  { value: 'Africa/Lagos',         label: '(UTC+01:00) Lagos / Abuja' },
  { value: 'Africa/Nairobi',       label: '(UTC+03:00) Nairobi' },
  { value: 'Africa/Johannesburg',  label: '(UTC+02:00) Johannesburg' },
  { value: 'Europe/London',        label: '(UTC+00:00) London' },
  { value: 'Europe/Paris',         label: '(UTC+01:00) Paris / Berlin' },
  { value: 'America/New_York',     label: '(UTC-05:00) New York' },
  { value: 'UTC',                  label: '(UTC+00:00) UTC' },
];

const LINEUP_TITLES = ['Artists', 'Speakers', 'Headliners', 'Performers', 'DJs', 'MCs', 'Guests', 'Coaches'];
const LINEUP_ROLES  = ['Headliner', 'Featured', 'Performer'];

const REMINDER_OPTIONS = [
  { label: '1 week before',  minutes: 10080 },
  { label: '1 day before',   minutes: 1440 },
  { label: '2 hours before', minutes: 120 },
];

const CURRENCIES = ['XAF', 'NGN', 'GHS', 'KES', 'USD', 'EUR', 'GBP'];

// ─── API helpers ─────────────────────────────────────────────────────────────

function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null; }

function authHeaders(): Record<string, string> {
  const token = getToken();
  const base: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) base['Authorization'] = `Bearer ${token}`;
  return base;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

function deriveStatus(event: EventDetail): string {
  if (event.isCancelled) return 'Cancelled';
  if (new Date(event.endsAt) < new Date()) return 'Ended';
  return 'On sale';
}

const MOCK_ATTENDEES: Attendee[] = [
  { id: 'a1', name: 'Amara Nkosi',   email: 'amara@example.com',  ticketRef: 'TK-00142', purchasedAt: new Date(Date.now() - 2 * 86400_000).toISOString(), status: 'VALID',     qty: 2, amount: 30000, currency: 'XAF' },
  { id: 'a2', name: 'Brice Mvondo',  email: 'brice@example.com',  ticketRef: 'TK-00143', purchasedAt: new Date(Date.now() - 1 * 86400_000).toISOString(), status: 'VALID',     qty: 1, amount: 15000, currency: 'XAF' },
  { id: 'a3', name: 'Chioma Okafor', email: 'chioma@example.com', ticketRef: 'TK-00144', purchasedAt: new Date(Date.now() - 3 * 86400_000).toISOString(), status: 'USED',      qty: 3, amount: 45000, currency: 'XAF' },
  { id: 'a4', name: 'Dieudonne Fon', email: 'dieudo@example.com', ticketRef: 'TK-00145', purchasedAt: new Date(Date.now() - 4 * 86400_000).toISOString(), status: 'VALID',     qty: 1, amount: 15000, currency: 'XAF' },
  { id: 'a5', name: 'Emeka Obi',     email: 'emeka@example.com',  ticketRef: 'TK-00146', purchasedAt: new Date(Date.now() - 5 * 86400_000).toISOString(), status: 'CANCELLED', qty: 2, amount: 0,     currency: 'XAF' },
  { id: 'a6', name: 'Fatou Diallo',  email: 'fatou@example.com',  ticketRef: 'TK-00147', purchasedAt: new Date(Date.now() - 6 * 86400_000).toISOString(), status: 'VALID',     qty: 1, amount: 15000, currency: 'XAF' },
];

const MOCK_TICKET_TYPES: TicketType[] = [
  { id: 't1', name: 'General Admission', price: 15000, currency: 'XAF', capacity: 4000, sold: 2897, type: 'PAID' },
  { id: 't2', name: 'VIP',               price: 45000, currency: 'XAF', capacity: 800,  sold: 312,  type: 'PAID' },
  { id: 't3', name: 'VVIP',              price: 90000, currency: 'XAF', capacity: 200,  sold: 38,   type: 'PAID', description: 'Backstage access included' },
];

const MOCK_REVENUE_SERIES = [
  { day: 'Mon', revenue: 1500000, tickets: 100 },
  { day: 'Tue', revenue: 3200000, tickets: 213 },
  { day: 'Wed', revenue: 2800000, tickets: 187 },
  { day: 'Thu', revenue: 5100000, tickets: 340 },
  { day: 'Fri', revenue: 7400000, tickets: 493 },
  { day: 'Sat', revenue: 12000000, tickets: 800 },
  { day: 'Sun', revenue: 16705000, tickets: 1114 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function fmtMoney(n: number, currency = 'XAF') {
  return `${currency} ${n.toLocaleString()}`;
}
function getTime12(isoDatetime: string): { time: string; ampm: 'AM' | 'PM' } {
  const t = isoDatetime.split('T')[1]?.slice(0, 5) ?? '';
  if (!t) return { time: '', ampm: 'AM' };
  const h = parseInt(t.split(':')[0], 10);
  const mm = t.split(':')[1] ?? '00';
  const ampm: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { time: `${String(h12).padStart(2, '0')}:${mm}`, ampm };
}
function buildIso(date: string, time12: string, ampm: 'AM' | 'PM'): string {
  if (!date) return '';
  if (!time12 || !time12.includes(':')) return `${date}T00:00`;
  const [hh, mm] = time12.split(':');
  let h = parseInt(hh, 10);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${date}T${String(h).padStart(2, '0')}:${mm ?? '00'}`;
}

// ─── Shared field UI ─────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

function Field({ label, required, error, children }: {
  label?: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-bold text-slate-600">
          {required && <span className="mr-0.5 text-brand-600">*</span>}{label}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function EditSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-5">
      <div>
        <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── DateTimeRow ─────────────────────────────────────────────────────────────

function DateTimeRow({ label, required, value, onChange, error }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void; error?: string;
}) {
  const dateVal = value.split('T')[0] ?? '';
  const { time: time12, ampm } = getTime12(value);

  function applyDate(d: string) { onChange(d ? buildIso(d, time12, ampm) : ''); }
  function applyTime(t: string, ap: 'AM' | 'PM') {
    if (!t) { onChange(dateVal ? `${dateVal}T00:00` : ''); return; }
    onChange(buildIso(dateVal, t, ap));
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-slate-600">
        {required && <span className="mr-0.5 text-brand-600">*</span>}{label}
      </p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <input type="date" className={`${inputCls} pl-9`} value={dateVal} onChange={(e) => applyDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 shrink-0 text-slate-300">
            <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
          </svg>
          <input type="text" placeholder="HH:MM" maxLength={5} value={time12}
            onChange={(e) => {
              let v = e.target.value.replace(/[^0-9:]/g, '');
              if (v.length === 2 && !v.includes(':')) v = `${v}:`;
              applyTime(v, ampm);
            }}
            className="w-14 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          {time12 && (
            <button type="button" onClick={() => applyTime('', ampm)} className="text-slate-300 hover:text-slate-500">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z" />
              </svg>
            </button>
          )}
        </div>
        <div className="relative">
          <select value={ampm} onChange={(e) => applyTime(time12, e.target.value as 'AM' | 'PM')}
            className="h-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 pr-7 text-sm font-semibold text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20">
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
          <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Lineup card (edit panel) ─────────────────────────────────────────────────

function EditLineupCard({ member, isEditing, onUpdate, onRemove, onSave, onEdit }: {
  member: LineupMember;
  isEditing: boolean;
  onUpdate: <K extends keyof LineupMember>(key: K, val: LineupMember[K]) => void;
  onRemove: () => void;
  onSave: () => void;
  onEdit: () => void;
}) {
  if (!isEditing) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
          {member.name ? member.name.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{member.name || 'Unnamed'}</p>
          <p className="text-xs text-slate-400">{member.title} · {member.role}</p>
        </div>
        <button type="button" onClick={onEdit} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50">Edit</button>
        <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500">
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 max-w-[220px]">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">Lineup Title</label>
          <select className={inputCls} value={member.title} onChange={(e) => onUpdate('title', e.target.value)}>
            {LINEUP_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button type="button" onClick={onRemove} className="mt-6 rounded-lg p-1.5 text-red-300 hover:bg-red-50 hover:text-red-500">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M16.5 4.478v.227a49 49 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A49 49 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a53 53 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951m-6.136-1.452a51 51 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a50 50 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452m-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.498.058z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600"><span className="mr-0.5 text-brand-600">*</span>Name</label>
        <input className={inputCls} placeholder="Name" value={member.name} onChange={(e) => onUpdate('name', e.target.value)} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-bold text-slate-600">Description</label>
        <input className={inputCls} placeholder="e.g. 2× Grammy award winning performer" value={member.description} onChange={(e) => onUpdate('description', e.target.value)} />
      </div>
      <div>
        <label className="mb-2 block text-xs font-bold text-slate-600">Role</label>
        <div className="flex flex-wrap gap-2">
          {LINEUP_ROLES.map((r) => (
            <button key={r} type="button" onClick={() => onUpdate('role', r)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${member.role === r ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}>
              {r === 'Headliner' && <span className="text-brand-600">★</span>}{r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" disabled={!member.name.trim()} onClick={onSave}
          className="rounded-xl bg-brand-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-40">
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Cover image upload (reusable in edit panel) ─────────────────────────────

function CoverImageUpload({ current, onChange }: { current: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error('Max file size is 2 MB'); return; }
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file, 'eventful/covers');
      onChange(url);
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {current ? (
        <div className="relative overflow-hidden rounded-xl" style={{ maxWidth: 240 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt="Cover" className="w-full rounded-xl object-cover" style={{ aspectRatio: '4/5' }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-black/40 opacity-0 transition hover:opacity-100">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-white/90 px-4 py-2 text-xs font-bold text-slate-900 shadow hover:bg-white">
              Change image
            </button>
            <button type="button" onClick={() => onChange('')}
              className="rounded-lg bg-red-500/80 px-4 py-2 text-xs font-bold text-white hover:bg-red-500">
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 py-10 transition ${
            dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              <p className="text-xs text-slate-400">Uploading…</p>
            </div>
          ) : (
            <>
              <svg className="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" opacity="0.15"/>
                <path d="M3 17l5-5 3 3 4-5 6 7H3z" fill="currentColor" opacity="0.5"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.7"/>
              </svg>
              <p className="text-sm text-slate-500">Drag image here or <span className="font-semibold text-brand-600">click to upload</span></p>
              <p className="text-xs text-slate-400">JPEG / PNG · max 2 MB</p>
            </>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ─── EditEventPanel ───────────────────────────────────────────────────────────

interface EditState {
  title: string; description: string; venue: string;
  country: string; isVirtual: boolean; eventFormat: string;
  timezone: string; startsAt: string; endsAt: string;
  capacity: string; price: string; currency: string;
  lineup: LineupMember[];
  socialWebsite: string; socialInstagram: string; socialTwitter: string; socialFacebook: string;
  coverImageUrl: string;
}

type EditTab = 'details' | 'appearance' | 'tickets';

function EditEventPanel({ event, onClose, onSaved }: { event: EventDetail; onClose: () => void; onSaved: () => void }) {
  const [editTab, setEditTab] = useState<EditTab>('details');

  const [form, setForm] = useState<EditState>({
    title:           event.title,
    description:     event.description ?? '',
    venue:           event.venue,
    country:         'CM',
    isVirtual:       false,
    eventFormat:     '',
    timezone:        'Africa/Douala',
    startsAt:        event.startsAt ? event.startsAt.replace('Z', '').slice(0, 16) : '',
    endsAt:          event.endsAt   ? event.endsAt.replace('Z', '').slice(0, 16) : '',
    capacity:        String(event.capacity),
    price:           String(event.price),
    currency:        event.currency,
    lineup:          [],
    socialWebsite:   '',
    socialInstagram: '',
    socialTwitter:   '',
    socialFacebook:  '',
    coverImageUrl:   event.coverImageUrl ?? '',
  });
  const [errors,        setErrors]        = useState<Partial<Record<keyof EditState, string>>>({});
  const [saving,        setSaving]        = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);

  function set<K extends keyof EditState>(k: K, v: EditState[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function addLineupMember() {
    const id = crypto.randomUUID();
    set('lineup', [...form.lineup, { _id: id, title: 'Artists', name: '', description: '', role: 'Performer', photoUrl: '', socialLink: '' }]);
    setEditingMember(id);
  }

  function updateMember<K extends keyof LineupMember>(id: string, key: K, val: LineupMember[K]) {
    set('lineup', form.lineup.map((m) => m._id === id ? { ...m, [key]: val } : m));
  }

  function removeMember(id: string) {
    set('lineup', form.lineup.filter((m) => m._id !== id));
    if (editingMember === id) setEditingMember(null);
  }

  async function handleLineupPhoto(id: string, file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error('Max file size is 2 MB'); return; }
    try {
      const url = await uploadToCloudinary(file, 'eventful/lineup');
      updateMember(id, 'photoUrl', url);
    } catch {
      toast.error('Upload failed');
    }
  }

  function validateDetails(): boolean {
    const e: Partial<Record<keyof EditState, string>> = {};
    if (!form.title.trim()) e.title = 'Event name is required';
    if (!form.venue.trim()) e.venue = 'Venue is required';
    if (!form.startsAt)     e.startsAt = 'Start date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function patchEvent(body: Record<string, unknown>) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error((err as { message?: string }).message ?? 'Failed to save');
      return false;
    }
    return true;
  }

  async function saveDetails() {
    if (!validateDetails()) return;
    setSaving(true);
    try {
      const startsAt = new Date(form.startsAt).toISOString();
      const endsAt   = form.endsAt
        ? new Date(form.endsAt).toISOString()
        : new Date(new Date(form.startsAt).getTime() + 3 * 60 * 60 * 1000).toISOString();

      const lineupMembers = form.lineup
        .filter((m) => m.name.trim())
        .map((m) => ({ name: m.name.trim(), photoUrl: m.photoUrl || undefined, role: m.role || undefined }));
      const metadata = lineupMembers.length > 0 ? { lineup: lineupMembers } : undefined;

      const body: Record<string, unknown> = {
        title:       form.title.trim(),
        description: form.description.trim(),
        venue:       form.venue.trim(),
        startsAt, endsAt,
        capacity:    Number(form.capacity) || event.capacity,
        price:       Number(form.price),
        currency:    form.currency,
      };
      if (metadata) body.metadata = metadata;

      if (await patchEvent(body)) { toast.success('Details saved'); onSaved(); }
    } finally {
      setSaving(false);
    }
  }

  async function saveAppearance() {
    setSaving(true);
    try {
      if (await patchEvent({ coverImageUrl: form.coverImageUrl || null })) {
        toast.success('Appearance saved');
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  const remaining = 75 - form.title.length;

  const EDIT_TABS: { key: EditTab; label: string }[] = [
    { key: 'details',    label: 'Details' },
    { key: 'appearance', label: 'Appearance' },
    { key: 'tickets',    label: 'Tickets' },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="sticky top-0 z-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-sm font-extrabold text-slate-900">Edit event</p>
          <button onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        {/* Tab bar */}
        <div className="flex border-t border-slate-100 px-4">
          {EDIT_TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setEditTab(key)}
              className={`relative -mb-px px-4 py-3 text-sm font-bold transition ${
                editTab === key
                  ? 'text-brand-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-brand-600 after:content-[\'\']'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Details ── */}
      {editTab === 'details' && (
        <div className="space-y-6">
          {/* Event details */}
          <EditSection title="Event details">
            <Field label="Event name" required error={errors.title}>
              <div className="relative">
                <input className={inputCls} maxLength={75} placeholder="e.g. Davido Timeless World Tour — Douala"
                  value={form.title} onChange={(e) => set('title', e.target.value)} />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${remaining < 10 ? 'text-red-400' : 'text-slate-300'}`}>{remaining}</span>
              </div>
            </Field>
            <Field label="Description">
              <textarea rows={6} className={`${inputCls} resize-none`} placeholder="Tell attendees what to expect…"
                value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </EditSection>

          {/* Location */}
          <EditSection title="Event location">
            <Field label="Country">
              <select className={inputCls} value={form.country} onChange={(e) => set('country', e.target.value)}>
                {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Location of event" required error={errors.venue}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <MapPointIcon className="h-4 w-4" />
                </span>
                <input className={`${inputCls} pl-9`} placeholder="Venue name or address"
                  value={form.venue} onChange={(e) => set('venue', e.target.value)} />
              </div>
            </Field>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="text-sm font-medium text-slate-700">This is a virtual event</span>
              <div onClick={() => set('isVirtual', !form.isVirtual)}
                className={`relative h-6 w-11 rounded-full transition-colors ${form.isVirtual ? 'bg-brand-600' : 'bg-slate-200'}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isVirtual ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </label>
          </EditSection>

          {/* Format */}
          <EditSection title="Event format" subtitle="What does your event feel like?">
            <select className={inputCls} value={form.eventFormat} onChange={(e) => set('eventFormat', e.target.value)}>
              <option value="">Select a format</option>
              {EVENT_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </EditSection>

          {/* Schedule */}
          <EditSection title="Event schedule" subtitle="Set the date and time.">
            <Field label="Timezone" required>
              <select className={inputCls} value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </Field>
            <DateTimeRow label="Start date" required value={form.startsAt} onChange={(v) => set('startsAt', v)} error={errors.startsAt} />
            <DateTimeRow label="End date" value={form.endsAt} onChange={(v) => set('endsAt', v)} />
          </EditSection>

          {/* Capacity & Pricing */}
          <EditSection title="Capacity & Pricing">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total capacity">
                <input type="number" min={1} className={inputCls} placeholder="e.g. 500"
                  value={form.capacity} onChange={(e) => set('capacity', e.target.value)} />
              </Field>
              <Field label="Base price">
                <div className="flex gap-2">
                  <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500">
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <input type="number" min={0} className={inputCls} placeholder="0"
                    value={form.price} onChange={(e) => set('price', e.target.value)} />
                </div>
              </Field>
            </div>
          </EditSection>

          {/* Lineup */}
          <EditSection title="Event Lineup" subtitle="Showcase speakers, headliners, artists of your event">
            <div className="space-y-4">
              {form.lineup.map((member) => (
                <div key={member._id}>
                  {editingMember === member._id ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 max-w-[220px]">
                          <label className="mb-1.5 block text-xs font-bold text-slate-600">Lineup Title</label>
                          <select className={inputCls} value={member.title} onChange={(e) => updateMember(member._id, 'title', e.target.value)}>
                            {LINEUP_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <button type="button" onClick={() => removeMember(member._id)} className="mt-6 rounded-lg p-1.5 text-red-300 hover:bg-red-50 hover:text-red-500">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M16.5 4.478v.227a49 49 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A49 49 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a53 53 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951m-6.136-1.452a51 51 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a50 50 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452m-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.498.058z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      {/* Photo upload */}
                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">Photo</label>
                        <div className="flex items-center gap-4">
                          {member.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={member.photoUrl} alt={member.name} className="h-16 w-16 rounded-xl object-cover ring-2 ring-brand-200" />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-600">
                              {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                            </div>
                          )}
                          <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:border-brand-300 hover:text-brand-600">
                            {member.photoUrl ? 'Change photo' : 'Upload photo'}
                            <input type="file" accept="image/jpeg,image/png" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLineupPhoto(member._id, f); }} />
                          </label>
                          {member.photoUrl && (
                            <button type="button" onClick={() => updateMember(member._id, 'photoUrl', '')}
                              className="text-xs font-semibold text-red-400 hover:text-red-600">Remove</button>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600"><span className="mr-0.5 text-brand-600">*</span>Name</label>
                        <input className={inputCls} placeholder="Name" value={member.name} onChange={(e) => updateMember(member._id, 'name', e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-600">Description</label>
                        <input className={inputCls} placeholder="e.g. 2× Grammy award winning performer" value={member.description} onChange={(e) => updateMember(member._id, 'description', e.target.value)} />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold text-slate-600">Role</label>
                        <div className="flex flex-wrap gap-2">
                          {LINEUP_ROLES.map((r) => (
                            <button key={r} type="button" onClick={() => updateMember(member._id, 'role', r)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${member.role === r ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'}`}>
                              {r === 'Headliner' && <span className="text-brand-600">★</span>}{r}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button type="button" disabled={!member.name.trim()} onClick={() => setEditingMember(null)}
                          className="rounded-xl bg-brand-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-40">
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <EditLineupCard
                      member={member}
                      isEditing={false}
                      onUpdate={(key, val) => updateMember(member._id, key, val)}
                      onRemove={() => removeMember(member._id)}
                      onSave={() => setEditingMember(null)}
                      onEdit={() => setEditingMember(member._id)}
                    />
                  )}
                </div>
              ))}
              <button type="button" onClick={addLineupMember}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-3.5 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50">
                <PlusIcon className="h-4 w-4" /> Add lineup member
              </button>
            </div>
          </EditSection>

          {/* Social Details */}
          <EditSection title="Social Details">
            <div className="space-y-3">
              <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </span>
                <input type="url" placeholder="https://yourwebsite.url/" className="flex-1 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" value={form.socialWebsite} onChange={(e) => set('socialWebsite', e.target.value)} />
              </div>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-slate-400">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </span>
                <input type="text" placeholder="Your Instagram handle" className="flex-1 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" value={form.socialInstagram} onChange={(e) => set('socialInstagram', e.target.value)} />
              </div>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-slate-400">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </span>
                <input type="text" placeholder="Your X (Twitter) handle" className="flex-1 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" value={form.socialTwitter} onChange={(e) => set('socialTwitter', e.target.value)} />
              </div>
              <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
                <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-slate-400">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </span>
                <input type="url" placeholder="Your Facebook URL" className="flex-1 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400" value={form.socialFacebook} onChange={(e) => set('socialFacebook', e.target.value)} />
              </div>
            </div>
          </EditSection>

          {/* Save details */}
          <div className="flex justify-end gap-3 pb-4">
            <button onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300">
              Cancel
            </button>
            <button onClick={saveDetails} disabled={saving}
              className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save details'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Appearance ── */}
      {editTab === 'appearance' && (
        <div className="space-y-6">
          <EditSection title="Event cover image" subtitle="Shown as the poster on the public event page. Portrait (4:5) or square recommended.">
            <CoverImageUpload
              current={form.coverImageUrl}
              onChange={(url) => set('coverImageUrl', url)}
            />
          </EditSection>

          <EditSection title="Event theme" subtitle="Choose a colour theme for your event page (coming soon).">
            <div className="flex flex-wrap gap-3">
              {['Default', 'Dark', 'Warm', 'Cool', 'Vibrant'].map((theme) => (
                <button key={theme} type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40"
                  disabled>
                  {theme}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400">Theme picker coming in a future update.</p>
          </EditSection>

          {/* Save appearance */}
          <div className="flex justify-end gap-3 pb-4">
            <button onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:border-slate-300">
              Cancel
            </button>
            <button onClick={saveAppearance} disabled={saving}
              className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save appearance'}
            </button>
          </div>
        </div>
      )}

      {/* ── Tab: Tickets ── */}
      {editTab === 'tickets' && (
        <TabTickets eventId={event.id} />
      )}
    </div>
  );
}

// ─── Small shared components ─────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
    </div>
  );
}

function CapBar({ sold, cap, currency, price }: { sold: number; cap: number; currency: string; price: number }) {
  const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : 0;
  const col = pct >= 90 ? 'bg-amber-500' : pct >= 60 ? 'bg-brand-500' : 'bg-emerald-500';
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Ticket capacity</h3>
        <span className="text-xs text-slate-400">{pct}% sold</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${col} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span><strong className="text-slate-900">{sold.toLocaleString()}</strong> sold</span>
        <span><strong className="text-slate-900">{(cap - sold).toLocaleString()}</strong> remaining of {cap.toLocaleString()}</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Total revenue potential: <strong className="text-slate-700">{fmtMoney(cap * price, currency)}</strong>
      </p>
    </div>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub: string }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition ${on ? 'border-brand-200 bg-brand-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <div className={`relative h-5 w-9 rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-slate-200'}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      <div>
        <p className={`text-xs font-bold ${on ? 'text-brand-600' : 'text-slate-700'}`}>{label}</p>
        <p className="text-[10px] text-slate-400">{sub}</p>
      </div>
    </button>
  );
}

// ─── Tab: Event Setup ────────────────────────────────────────────────────────

function TabOverview({ event, onRefresh }: { event: EventDetail; onRefresh: () => void }) {
  const [editOpen, setEditOpen] = useState(false);

  if (editOpen) {
    return <EditEventPanel event={event} onClose={() => setEditOpen(false)} onSaved={onRefresh} />;
  }

  return (
    <div className="space-y-6">
      {/* Event summary */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Event details</h3>
          <button onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-100">
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        <dl className="divide-y divide-slate-100">
          {[
            { label: 'Title',    value: event.title },
            { label: 'Date',     value: `${fmtDate(event.startsAt)} · ${fmtTime(event.startsAt)} – ${fmtTime(event.endsAt)}` },
            { label: 'Venue',    value: event.venue },
            { label: 'Category', value: event.category },
            { label: 'Status',   value: deriveStatus(event) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-baseline gap-4 py-3">
              <dt className="w-24 shrink-0 text-xs font-semibold text-slate-400">{label}</dt>
              <dd className="text-sm text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Description */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700">Description</h3>
          <button onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-100">
            <PencilIcon className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        <p className="whitespace-pre-line text-sm text-slate-600">{event.description ?? 'No description added.'}</p>
      </div>

      {/* Cover image */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700">Event cover image</h3>
            <p className="mt-0.5 text-xs text-slate-400">Shown as the poster on the public event page</p>
          </div>
          <button onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 transition hover:bg-brand-100">
            <PencilIcon className="h-3.5 w-3.5" />
            {event.coverImageUrl ? 'Change' : 'Upload'}
          </button>
        </div>
        {event.coverImageUrl ? (
          <div className="overflow-hidden rounded-xl" style={{ maxWidth: 180 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.coverImageUrl} alt="Cover" className="w-full object-cover" style={{ aspectRatio: '4/5' }} />
          </div>
        ) : (
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 transition hover:border-brand-300 hover:bg-brand-50"
            style={{ maxWidth: 180 }}
            onClick={() => setEditOpen(true)}
          >
            <svg className="h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" opacity="0.15"/>
              <path d="M3 17l5-5 3 3 4-5 6 7H3z" fill="currentColor" opacity="0.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.7"/>
            </svg>
            <p className="text-xs text-slate-400">No image</p>
          </div>
        )}
      </div>

      {/* Share links */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-4 text-sm font-bold text-slate-700">Share event</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'WhatsApp',  href: `https://wa.me/?text=${encodeURIComponent(`Check out this event: ${typeof window !== 'undefined' ? window.location.origin : ''}/e/${event.shareSlug}`)}` },
            { label: 'Twitter/X', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Going to: /e/${event.shareSlug}`)}` },
            { label: 'Copy link', href: '#' },
          ].map(({ label, href }) => (
            <a key={label} href={href}
              onClick={label === 'Copy link' ? (e) => { e.preventDefault(); navigator.clipboard.writeText(`${window.location.origin}/e/${event.shareSlug}`); } : undefined}
              target={label !== 'Copy link' ? '_blank' : undefined}
              rel="noreferrer"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-800">
              <ShareIcon className="h-3.5 w-3.5 text-slate-400" />
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TierFormModal ────────────────────────────────────────────────────────────

function TierFormModal({ eventId, tier, onClose, onSaved }: {
  eventId: string;
  tier: TicketType | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name,        setName]        = useState(tier?.name ?? '');
  const [type,        setType]        = useState<'FREE' | 'PAID' | 'INVITE'>(tier?.type ?? 'PAID');
  const [price,       setPrice]       = useState(String(tier?.price ?? ''));
  const [currency,    setCurrency]    = useState(tier?.currency ?? 'XAF');
  const [capacity,    setCapacity]    = useState(String(tier?.capacity ?? ''));
  const [description, setDescription] = useState(tier?.description ?? '');
  const [saving,      setSaving]      = useState(false);

  async function save() {
    if (!name.trim()) { toast.error('Ticket name is required'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name:        name.trim(),
        type,
        price:       type === 'FREE' ? 0 : Number(price),
        currency,
        capacity:    capacity ? Number(capacity) : undefined,
        description: description.trim() || undefined,
        isOnSale:    true,
      };
      const url    = tier
        ? `${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/tiers/${tier.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/tiers`;
      const method = tier ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { message?: string }).message ?? 'Failed to save tier');
        return;
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-extrabold text-slate-900">{tier ? 'Edit ticket type' : 'Add ticket type'}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-6">
          {/* Type picker */}
          <div className="grid grid-cols-3 gap-2">
            {(['FREE', 'PAID', 'INVITE'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`rounded-xl border py-2.5 text-xs font-bold transition ${type === t ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-600 hover:border-brand-200'}`}>
                {t === 'FREE' ? 'Free' : t === 'PAID' ? 'Paid' : 'Invite Only'}
              </button>
            ))}
          </div>
          <Field label="Ticket name" required>
            <input className={inputCls} placeholder="e.g. General Admission"
              value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {type === 'PAID' && (
            <Field label="Price" required>
              <div className="flex gap-2">
                <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500">
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input type="number" min={0} className={inputCls} placeholder="0"
                  value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </Field>
          )}
          <Field label="Quantity">
            <input type="number" min={1} className={inputCls} placeholder="Leave blank for unlimited"
              value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Optional details about this ticket"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>
        <div className="border-t border-slate-100 px-6 py-4">
          <button onClick={save} disabled={saving}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">
            {saving ? 'Saving…' : tier ? 'Save changes' : 'Create ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Tickets ────────────────────────────────────────────────────────────

function TabTickets({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [modalTier,  setModalTier]  = useState<TicketType | null | 'new'>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const { data: tiers = MOCK_TICKET_TYPES } = useQuery<TicketType[]>({
    queryKey: ['event-tiers', eventId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/tiers`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    initialData: MOCK_TICKET_TYPES,
  });

  async function deleteTier(tier: TicketType) {
    if (tier.sold > 0) { toast.error('Cannot delete a tier that has sold tickets.'); return; }
    if (!confirm(`Delete "${tier.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/tiers/${tier.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); toast.error((e as { message?: string }).message ?? 'Failed to delete'); return; }
      queryClient.invalidateQueries({ queryKey: ['event-tiers', eventId] });
      toast.success('Ticket type deleted');
    } catch { toast.error('Network error'); }
  }

  function onSaved() { queryClient.invalidateQueries({ queryKey: ['event-tiers', eventId] }); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{tiers.length} ticket type{tiers.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setModalTier('new')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-500">
          + Add ticket type
        </button>
      </div>

      {tiers.map((tier) => {
        const pct = tier.capacity > 0 ? Math.round((tier.sold / tier.capacity) * 100) : 0;
        const col = pct >= 90 ? 'bg-amber-500' : pct >= 60 ? 'bg-brand-500' : 'bg-emerald-500';
        return (
          <div key={tier.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-slate-900">{tier.name}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    tier.type === 'FREE' ? 'bg-emerald-50 text-emerald-700' :
                    tier.type === 'INVITE' ? 'bg-brand-50 text-brand-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {tier.type === 'FREE' ? 'Free' : tier.type === 'INVITE' ? 'Invite only' : `${tier.currency} ${tier.price.toLocaleString()}`}
                  </span>
                </div>
                {tier.description && <p className="mt-1 text-xs text-slate-400">{tier.description}</p>}
                <div className="mt-3">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>{tier.sold.toLocaleString()} sold</span>
                    <span>{tier.capacity.toLocaleString()} capacity · {pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${col}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setModalTier(tier)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-brand-300 hover:text-brand-600">
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === tier.id ? null : tier.id)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-brand-300 hover:text-brand-600">
                    <DotsHorizontalIcon className="h-3.5 w-3.5" />
                  </button>
                  {menuOpenId === tier.id && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                      <button
                        onClick={() => { setMenuOpenId(null); deleteTier(tier); }}
                        className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50">
                        Delete tier
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {tiers.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
          <TicketIcon className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-500">No ticket types yet</p>
          <button onClick={() => setModalTier('new')}
            className="mt-5 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500">
            Add your first ticket type
          </button>
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpenId && (
        <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
      )}

      {/* Tier form modal */}
      {modalTier !== null && (
        <TierFormModal
          eventId={eventId}
          tier={modalTier === 'new' ? null : modalTier}
          onClose={() => setModalTier(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

// ─── Tab: Attendees ──────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  VALID:     { label: 'Valid',      cls: 'bg-emerald-50 text-emerald-700' },
  USED:      { label: 'Checked in', cls: 'bg-brand-50 text-brand-600' },
  CANCELLED: { label: 'Cancelled',  cls: 'bg-red-50 text-red-600' },
};

function TabAttendees({ eventId }: { eventId: string }) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: attendees = MOCK_ATTENDEES } = useQuery<Attendee[]>({
    queryKey: ['event-attendees', eventId],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/events/${eventId}/attendees?limit=200`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any[] = Array.isArray(data) ? data : data.tickets ?? [];
      return raw.map((t) => ({
        id:          t.id,
        name:        t.eventee?.fullName ?? 'Guest',
        email:       t.eventee?.email   ?? '—',
        ticketRef:   `TK-${t.id.slice(0, 6).toUpperCase()}`,
        purchasedAt: t.purchasedAt,
        status:      t.status === 'CHECKED_IN' ? 'USED' : t.status === 'CANCELLED' ? 'CANCELLED' : 'VALID',
        qty:         1,
        amount:      0,
        currency:    'XAF',
      }));
    },
    initialData: MOCK_ATTENDEES,
  });

  const columns: ColumnDef<Attendee>[] = [
    {
      accessorKey: 'name',
      header: 'Attendee',
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-bold text-slate-900">{row.original.name}</p>
          <p className="text-xs text-slate-400">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'ticketRef',
      header: 'Ticket ref',
      cell: ({ getValue }) => <span className="font-mono text-xs text-slate-600">{String(getValue())}</span>,
    },
    {
      accessorKey: 'qty',
      header: 'Qty',
      cell: ({ getValue }) => <span className="text-sm font-bold text-slate-900">{String(getValue())}</span>,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-sm font-semibold text-slate-700">
          {row.original.amount > 0 ? fmtMoney(row.original.amount, row.original.currency) : 'Free'}
        </span>
      ),
    },
    {
      accessorKey: 'purchasedAt',
      header: 'Purchased',
      cell: ({ getValue }) => <span className="text-xs text-slate-500">{fmtDate(String(getValue()))}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => {
        const st = STATUS_PILL[String(getValue())] ?? STATUS_PILL.VALID;
        return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${st.cls}`}>{st.label}</span>;
      },
    },
  ];

  const table = useReactTable({
    data: attendees,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize: 20 } },
  });

  function exportCSV() {
    const rows = attendees.map((a) => [a.name, a.email, a.ticketRef, a.qty, a.amount, a.currency, a.status, a.purchasedAt].join(','));
    const csv  = ['Name,Email,Ticket Ref,Qty,Amount,Currency,Status,Purchased', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `attendees-${eventId}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} placeholder="Search attendees…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{table.getFilteredRowModel().rows.length} attendees</span>
          <button onClick={exportCSV} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-brand-300 hover:text-brand-600">
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} onClick={h.column.getToggleSortingHandler()}
                      className="cursor-pointer px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
            <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="text-xs font-bold text-brand-600 disabled:opacity-30">
              ← Prev
            </button>
            <span className="text-xs text-slate-400">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</span>
            <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="text-xs font-bold text-brand-600 disabled:opacity-30">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Finance ────────────────────────────────────────────────────────────

function TabFinance({ event, stats }: { event: EventDetail; stats: EventStats | undefined }) {
  const sold        = stats?.ticketsSold ?? event._count?.tickets ?? 0;
  const revenue     = stats?.revenue ?? 0;
  const checkedIn   = stats?.checkedIn ?? 0;
  const checkInRate = stats?.checkInRate ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total revenue"    value={fmtMoney(revenue, event.currency)}                                    icon={TagPriceIcon}  color="bg-brand-600" />
        <StatCard label="Tickets sold"     value={sold.toLocaleString()} sub={`of ${event.capacity.toLocaleString()}`}  icon={TicketIcon}    color="bg-brand-600" />
        <StatCard label="Check-in rate"    value={`${checkInRate}%`}     sub={`${checkedIn} scanned`}                   icon={QrCodeIcon}    color="bg-emerald-600" />
        <StatCard label="Avg. order value" value={fmtMoney(Math.round(revenue / (sold || 1)), event.currency)}          icon={WalletIcon}    color="bg-amber-500" />
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-5 text-sm font-bold text-slate-700">Revenue over time</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={MOCK_REVENUE_SERIES}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#9B93B8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#9B93B8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
            <Tooltip formatter={(v) => fmtMoney(Number(v), event.currency)} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            <Area type="monotone" dataKey="revenue" stroke="#7A7296" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand-900">Available for payout</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-900">{fmtMoney(Math.round(revenue * 0.9), event.currency)}</p>
            <p className="mt-0.5 text-xs text-brand-600">After 10% platform fee</p>
          </div>
          <button className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500">
            Request payout
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Reports ────────────────────────────────────────────────────────────

function TabReports({ event, stats }: { event: EventDetail; stats: EventStats | undefined }) {
  const sold      = stats?.ticketsSold ?? event._count?.tickets ?? 0;
  const checkedIn = stats?.checkedIn ?? 0;
  const cancelled = stats?.cancelled ?? 0;
  const valid     = Math.max(0, sold - checkedIn);

  const donutData = [
    { name: 'Checked in', value: checkedIn, fill: '#7A7296' },
    { name: 'Valid',       value: valid,     fill: '#C7C1D9' },
    { name: 'Cancelled',   value: cancelled, fill: '#fca5a5' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-5 text-sm font-bold text-slate-700">Ticket status breakdown</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {donutData.map(({ name, value, fill }) => (
            <div key={name} className="flex flex-col items-center rounded-xl border border-slate-100 p-4 text-center">
              <div className="h-2.5 w-2.5 rounded-full mb-2" style={{ background: fill }} />
              <p className="text-2xl font-extrabold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{name}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-5 text-sm font-bold text-slate-700">Tickets sold per day</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={MOCK_REVENUE_SERIES}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            <Bar dataKey="tickets" fill="#9B93B8" radius={[6, 6, 0, 0]} name="Tickets" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <CapBar sold={sold} cap={event.capacity} currency={event.currency} price={Number(event.price)} />
    </div>
  );
}

// ─── Staff Scanner Links ───────────────────────────────────────────────────────

interface ScannerToken { jti: string; label: string; expiresAt: string; }

function StaffLinksSection({ eventId }: { eventId: string }) {
  const apiFetch = useApiFetch();
  const [tokens,   setTokens]   = useState<ScannerToken[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [label,    setLabel]    = useState('Staff scanner');
  const [expiry,   setExpiry]   = useState<'1d'|'3d'|'7d'|'30d'>('1d');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/events/${eventId}/scanner-tokens`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setTokens(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function create() {
    setCreating(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/events/${eventId}/scanner-tokens`, {
        method: 'POST', body: JSON.stringify({ label: label.trim(), expiresIn: expiry }),
      });
      if (!res.ok) { toast.error('Failed to create link'); return; }
      const d = await res.json();
      setNewToken(d.token);
      setTokens(prev => [{ jti: d.jti, label: d.label, expiresAt: d.expiresAt }, ...prev]);
      setLabel('Staff scanner');
    } finally { setCreating(false); }
  }

  async function revoke(jti: string) {
    if (!confirm('Revoke this scanner link?')) return;
    await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/events/${eventId}/scanner-tokens/${jti}`, {
      method: 'DELETE',
    });
    setTokens(prev => prev.filter(t => t.jti !== jti));
    toast.success('Scanner link revoked');
  }

  function copyLink(token: string) {
    const url = `${baseUrl}/scan?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Scanner link copied!');
  }

  function shareWhatsApp(token: string) {
    const url = `${baseUrl}/scan?token=${token}`;
    const text = encodeURIComponent(`Ticket scanner link for the event 🎟\n${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
      <h3 className="mb-1 text-sm font-bold text-slate-700">Staff scanner links</h3>
      <p className="mb-5 text-xs text-slate-400">
        Generate a link your staff can open on any phone or tablet to scan tickets at the door — no login required.
      </p>

      {/* New link form */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Label</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Main entrance"
              maxLength={60}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Expires in</label>
            <select
              value={expiry}
              onChange={e => setExpiry(e.target.value as typeof expiry)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="1d">1 day</option>
              <option value="3d">3 days</option>
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
            </select>
          </div>
        </div>
        <button
          onClick={create}
          disabled={creating}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
        >
          {creating ? 'Generating…' : '+ Generate scanner link'}
        </button>
      </div>

      {/* Newly created link */}
      {newToken && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="mb-2 text-xs font-bold text-emerald-800">Link generated — share it with your staff</p>
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-emerald-200">
            <code className="flex-1 truncate text-xs text-slate-700">{baseUrl}/scan?token={newToken.slice(0, 30)}…</code>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copyLink(newToken)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-500"
            >
              {copied ? '✓ Copied!' : 'Copy link'}
            </button>
            <button
              onClick={() => shareWhatsApp(newToken)}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-green-300 hover:text-green-700"
            >
              Share on WhatsApp
            </button>
            <button onClick={() => setNewToken(null)} className="rounded-lg px-4 py-2 text-xs font-bold text-slate-500 transition hover:text-slate-700">Dismiss</button>
          </div>
        </div>
      )}

      {/* Active links */}
      <div>
        <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Active links</p>
        {loading ? (
          <div className="space-y-2">
            {[1,2].map(i => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : tokens.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">No active scanner links yet.</p>
        ) : (
          <div className="space-y-2">
            {tokens.map(t => (
              <div key={t.jti} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{t.label}</p>
                  <p className="text-xs text-slate-400">Expires {new Date(t.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <button
                  onClick={() => revoke(t.jti)}
                  className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Settings ───────────────────────────────────────────────────────────

function TabSettings({ event, onRefresh }: { event: EventDetail; onRefresh: () => void }) {
  const [confirming,    setConfirming]    = useState(false);
  const [offsets,       setOffsets]       = useState<number[]>(event.defaultReminderOffsets ?? [10080, 1440, 120]);
  const [savingRem,     setSavingRem]     = useState(false);
  const [confMsg,       setConfMsg]       = useState((event as EventDetail & { confirmationMessage?: string }).confirmationMessage ?? '');
  const [savingMsg,     setSavingMsg]     = useState(false);
  const queryClient = useQueryClient();

  function toggleOffset(minutes: number) {
    setOffsets((prev) => prev.includes(minutes) ? prev.filter((m) => m !== minutes) : [...prev, minutes]);
  }

  async function saveReminders() {
    setSavingRem(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ defaultReminderOffsets: offsets }),
      });
      if (!res.ok) { toast.error('Failed to save reminders'); return; }
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      toast.success('Reminder settings saved');
      onRefresh();
    } finally {
      setSavingRem(false);
    }
  }

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to cancel');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      setConfirming(false);
      onRefresh();
    },
  });

  async function saveConfirmationMessage() {
    setSavingMsg(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${event.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ confirmationMessage: confMsg.trim() || null }),
      });
      if (!res.ok) { toast.error('Failed to save message'); return; }
      queryClient.invalidateQueries({ queryKey: ['event', event.id] });
      toast.success('Confirmation message saved');
      onRefresh();
    } finally {
      setSavingMsg(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Staff scanner links */}
      <StaffLinksSection eventId={event.id} />

      {/* Ticket confirmation message */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-1 text-sm font-bold text-slate-700">Ticket confirmation message</h3>
        <p className="mb-4 text-xs text-slate-400">
          This message is included in every ticket confirmation email sent to buyers for this event.
          Use it for parking info, what to bring, dress code, gate times, etc.
        </p>
        <textarea
          value={confMsg}
          onChange={e => setConfMsg(e.target.value)}
          rows={5}
          maxLength={1000}
          placeholder="e.g. Please bring a valid ID. Gates open at 6pm. Free parking available on-site."
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-900 outline-none focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">{confMsg.length}/1000</p>
          <button
            onClick={saveConfirmationMessage}
            disabled={savingMsg}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50"
          >
            {savingMsg ? 'Saving…' : 'Save message'}
          </button>
        </div>
      </div>

      {/* Reminder defaults */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h3 className="mb-1 text-sm font-bold text-slate-700">Reminder defaults</h3>
        <p className="mb-4 text-xs text-slate-400">These will be sent to all ticket holders unless they set their own.</p>
        <div className="space-y-2">
          {REMINDER_OPTIONS.map(({ label, minutes }) => (
            <label key={label} className="flex items-center gap-3 rounded-xl border border-slate-100 px-4 py-3 cursor-pointer hover:border-brand-200">
              <input
                type="checkbox"
                checked={offsets.includes(minutes)}
                onChange={() => toggleOffset(minutes)}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={saveReminders} disabled={savingRem}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-500 disabled:opacity-50">
            {savingRem ? 'Saving…' : 'Save reminders'}
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
        <h3 className="mb-1 text-sm font-bold text-red-700">Danger zone</h3>
        <p className="mb-4 text-xs text-red-500">Cancelling will invalidate all tickets and notify attendees. This cannot be undone.</p>
        {!confirming ? (
          <button onClick={() => setConfirming(true)}
            className="rounded-xl border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-600 hover:text-white">
            Cancel this event
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-red-700">Are you sure? This cannot be undone.</p>
            <button onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50">
              {cancelMutation.isPending ? 'Cancelling…' : 'Yes, cancel event'}
            </button>
            <button onClick={() => setConfirming(false)} className="text-sm text-slate-500 hover:text-slate-700">
              Never mind
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

interface Props { params: Promise<{ id: string }> }

export default function CreatorEventDetail({ params }: Props) {
  return (
    <Suspense>
      <CreatorEventDetailContent params={params} />
    </Suspense>
  );
}

function CreatorEventDetailContent({ params }: Props) {
  const { id }       = use(params);
  const searchParams = useSearchParams();
  const router       = useRouter();
  const activeTab    = (searchParams.get('tab') as TabKey) ?? 'overview';

  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery<EventDetail>({
    queryKey: ['event', id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    refetchInterval: 30000, // refresh every 30s so ticket counts stay live
  });

  const { data: stats } = useQuery<EventStats>({
    queryKey: ['event-stats', id],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/creators/me/events/${id}/analytics`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!event,
    refetchInterval: 30000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (body: { isPublished?: boolean; inDiscovery?: boolean }) => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${id}`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['event', id] }),
  });

  function setTab(key: TabKey) {
    router.push(`/dashboard/creator/events/${id}?tab=${key}`, { scroll: false });
  }

  function onRefresh() { queryClient.invalidateQueries({ queryKey: ['event', id] }); }

  if (isLoading || !event) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-2/3 rounded-xl bg-slate-200" />
          <div className="h-12 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

      {/* Breadcrumb */}
      <div className="mb-5 flex items-center gap-2 text-xs text-slate-400">
        <Link href="/dashboard/creator/events" className="flex items-center gap-1.5 transition hover:text-brand-600">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          My Events
        </Link>
        <span>/</span>
        <span className="truncate text-slate-600">{event.title}</span>
      </div>

      {/* Draft banner */}
      {!event.isPublished && !event.isCancelled && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm0 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm1-5a1 1 0 0 1-2 0V8a1 1 0 0 1 2 0v3z"/>
              </svg>
            </span>
            <div>
              <p className="text-sm font-bold text-amber-800">This event is in draft</p>
              <p className="text-xs text-amber-600">Attendees cannot see or purchase tickets until you publish.</p>
            </div>
          </div>
          <button
            onClick={() => toggleMutation.mutate({ isPublished: true })}
            disabled={toggleMutation.isPending}
            className="shrink-0 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            {toggleMutation.isPending ? 'Publishing…' : 'Publish now →'}
          </button>
        </div>
      )}

      {/* Event header */}
      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
        <div className="mb-4 flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{event.title}</h1>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                {fmtDate(event.startsAt)} · {fmtTime(event.startsAt)}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <MapPointIcon className="h-3.5 w-3.5 text-slate-400" />
                {event.venue}
              </span>
            </div>
          </div>
          <Link
            href={`/e/${event.shareSlug}`}
            target="_blank"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-brand-300 hover:text-brand-600"
          >
            Preview →
          </Link>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-3">
          <Toggle
            on={!!event.isPublished}
            onChange={(v) => toggleMutation.mutate({ isPublished: v })}
            label="Publish event"
            sub={event.isPublished ? 'Live & accepting tickets' : 'Hidden from attendees'}
          />
          <Toggle
            on={!!event.inDiscovery}
            onChange={(v) => toggleMutation.mutate({ inDiscovery: v })}
            label="Add to Discovery"
            sub={event.inDiscovery ? 'Shown on the browse page' : 'Link-only access'}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-0.5 rounded-xl bg-slate-100 p-1">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                activeTab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon className={`h-3.5 w-3.5 ${activeTab === key ? 'text-brand-600' : 'text-slate-400'}`} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview'  && <TabOverview  event={event} onRefresh={onRefresh} />}
      {activeTab === 'tickets'   && <TabTickets   eventId={id} />}
      {activeTab === 'attendees' && <TabAttendees eventId={id} />}
      {activeTab === 'finance'   && <TabFinance   event={event} stats={stats} />}
      {activeTab === 'reports'   && <TabReports   event={event} stats={stats} />}
      {activeTab === 'settings'  && <TabSettings  event={event} onRefresh={onRefresh} />}
    </div>
  );
}
