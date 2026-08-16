'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth, useApiFetch } from '@/contexts/auth-context';
import { CalendarIcon, MapPointIcon, TicketIcon, XIcon, PlusIcon, CheckCircleIcon } from '@/components/icons';
import { toast } from '@/components/Toast';
import { uploadToCloudinary } from '@/lib/cloudinary';

// ─── Types ─────────────────────────────────────────────────────────────────

type Category    = string;
type TierType    = 'FREE' | 'PAID' | 'INVITE_ONLY';
type ScheduleTab = 'single' | 'recurring';

interface LineupMember {
  _id: string;
  title: string;       // group type: Artists, Speakers, etc.
  name: string;
  description: string;
  role: string;        // Headliner | Featured | Performer
  photoUrl: string;
  socialLink: string;
}

interface TierDraft {
  _id: string; name: string; type: TierType;
  price: string; currency: string; capacity: string;
  orderLimit: string; description: string; perks: string[]; inviteCode: string;
}

interface WizardData {
  // Step 1 — Details
  title: string; description: string; category: Category | '';
  country: string; venue: string; isVirtual: boolean; customUrl: string;
  eventFormat: string;
  scheduleTab: ScheduleTab; timezone: string;
  startsAt: string; endsAt: string;
  lineup: LineupMember[];
  // Social
  socialWebsite: string; socialInstagram: string;
  socialTwitter: string; socialFacebook: string;
  // Step 2 — Appearance
  coverImageUrl: string; theme: string;
  // Step 3 — Tickets
  capacity: string; tiers: TierDraft[];
}

const INIT: WizardData = {
  title: '', description: '', category: '',
  country: 'CM', venue: '', isVirtual: false, customUrl: '',
  eventFormat: '',
  scheduleTab: 'single', timezone: 'Africa/Douala',
  startsAt: '', endsAt: '', lineup: [],
  socialWebsite: '', socialInstagram: '', socialTwitter: '', socialFacebook: '',
  coverImageUrl: '', theme: 'classic',
  capacity: '', tiers: [],
};

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'MUSIC',                 label: 'Music' },
  { value: 'CONFERENCE',            label: 'Conference' },
  { value: 'WORKSHOP',              label: 'Workshops' },
  { value: 'NETWORKING',            label: 'Networking' },
  { value: 'VISUAL_ARTS',           label: 'Visual Arts' },
  { value: 'SPORTS',                label: 'Sports' },
  { value: 'SEMINAR',               label: 'Seminars' },
  { value: 'ONLINE_CLASS',          label: 'Online Classes' },
  { value: 'PERFORMING_ARTS',       label: 'Performing Arts' },
  { value: 'TRAVEL',                label: 'Travel and Outdoor' },
  { value: 'FESTIVAL',              label: 'Funfairs and Carnivals' },
  { value: 'GAMING',                label: 'Gaming' },
  { value: 'CHARITY',               label: 'Charity' },
  { value: 'FASHION',               label: 'Fashion' },
  { value: 'FOOD',                  label: 'Food & Drink' },
  { value: 'TECH',                  label: 'Technology' },
  { value: 'HEALTH',                label: 'Health & Wellness' },
  { value: 'COMEDY',                label: 'Comedy' },
  { value: 'FILM',                  label: 'Film' },
  { value: 'COMMUNITY',             label: 'Community' },
  { value: 'EDUCATION',             label: 'Education' },
  { value: 'WELLNESS',              label: 'Wellness' },
  { value: 'BOOKS',                 label: 'Books and Literature' },
  { value: 'GENDER_EQUALITY',       label: 'Gender and Equality' },
  { value: 'SHOPPING',              label: 'Shopping' },
  { value: 'EASTER',                label: 'Easter' },
  { value: 'CHRISTMAS',             label: 'Christmas' },
  { value: 'HIKING',                label: 'Hiking' },
  { value: 'KAYAKING',              label: 'Kayaking' },
  { value: 'DANCE',                 label: 'Dance' },
  { value: 'CHRISTIANITY',          label: 'Christianity' },
  { value: 'RAMADAN',               label: 'Ramadan' },
  { value: 'EID',                   label: 'Eid' },
  { value: 'ISLAM',                 label: 'Islam' },
  { value: 'PODCASTS',              label: 'Podcasts' },
  { value: 'IMPROV',                label: 'Improv' },
  { value: 'ENTREPRENEURSHIP',      label: 'Entrepreneurship' },
  { value: 'THEATRE',               label: 'Theatre' },
  { value: 'POETRY',                label: 'Poetry and Spoken Word' },
  { value: 'POLICY',                label: 'Policy and Elections' },
  { value: 'DEMOCRACY',             label: 'Democracy' },
  { value: 'OTHER',                 label: 'Other' },
];

const CATEGORIES_DEFAULT_SHOW = 12;

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
  { value: 'Africa/Douala',     label: '(UTC+01:00) West Central Africa' },
  { value: 'Africa/Lagos',      label: '(UTC+01:00) Lagos / Abuja' },
  { value: 'Africa/Nairobi',    label: '(UTC+03:00) Nairobi' },
  { value: 'Africa/Johannesburg', label: '(UTC+02:00) Johannesburg' },
  { value: 'Europe/London',     label: '(UTC+00:00) London' },
  { value: 'Europe/Paris',      label: '(UTC+01:00) Paris / Berlin' },
  { value: 'America/New_York',  label: '(UTC-05:00) New York' },
  { value: 'UTC',               label: '(UTC+00:00) UTC' },
];

const LINEUP_TITLES = ['Artists', 'Speakers', 'Headliners', 'Performers', 'DJs', 'MCs', 'Guests', 'Coaches'];
const LINEUP_ROLES  = ['Headliner', 'Featured', 'Performer'];

const WIZARD_STEPS = ['Details', 'Appearance', 'Tickets'];

// ─── Shared UI ─────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

function Field({ label, required, error, hint, children }: {
  label?: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-bold text-slate-600">
          {required && <span className="mr-0.5 text-brand-600">*</span>}{label}
        </label>
      )}
      {hint && <p className="mb-1.5 text-xs text-slate-400">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function newTier(): TierDraft {
  return { _id: crypto.randomUUID(), name: '', type: 'PAID', price: '', currency: 'XAF', capacity: '', orderLimit: '10', description: '', perks: [], inviteCode: '' };
}

// ─── Ticket SVG ────────────────────────────────────────────────────────────

function TicketIllustration() {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="22" y="10" width="42" height="34" rx="6" fill="#FFE8E8" stroke="#FF6B6B" strokeWidth="1.5" opacity="0.6" transform="rotate(8 22 10)"/>
      <rect x="8" y="20" width="44" height="36" rx="6" fill="#FFF0E5" stroke="#F07200" strokeWidth="2"/>
      <circle cx="8" cy="38" r="4" fill="white"/>
      <circle cx="52" cy="38" r="4" fill="white"/>
      <path d="M30 30l2.4 4.9 5.4.8-3.9 3.8.9 5.4L30 42.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" fill="#F07200"/>
    </svg>
  );
}

// ─── Rich Text Editor ──────────────────────────────────────────────────────

function RichTextEditor({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);

  // Seed initial value once on mount only
  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = value;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(cmd: string, val?: string) {
    editorRef.current?.focus();
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false, val);
  }

  function handleLink() {
    const url = prompt('Enter URL:');
    if (url) exec('createLink', url);
  }

  const tools: { label: string; cmd?: () => void; title: string; cls?: string }[] = [
    { label: 'B',  title: 'Bold',          cmd: () => exec('bold'),             cls: 'font-black' },
    { label: 'I',  title: 'Italic',        cmd: () => exec('italic'),           cls: 'italic' },
    { label: 'S',  title: 'Strikethrough', cmd: () => exec('strikeThrough'),    cls: 'line-through' },
    { label: '🔗', title: 'Link',          cmd: handleLink },
    { label: 'H',  title: 'Heading',       cmd: () => exec('formatBlock', '<h3>') },
    { label: '"',  title: 'Blockquote',    cmd: () => exec('formatBlock', '<blockquote>') },
    { label: '{}', title: 'Code',          cmd: () => exec('formatBlock', '<pre>') },
    { label: '•',  title: 'Bullet list',   cmd: () => exec('insertUnorderedList') },
    { label: '1.', title: 'Numbered list', cmd: () => exec('insertOrderedList') },
    { label: '↩',  title: 'Undo',          cmd: () => exec('undo') },
    { label: '↪',  title: 'Redo',          cmd: () => exec('redo') },
  ];

  return (
    <div className={`overflow-hidden rounded-xl border transition ${focused ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-200'}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        {tools.map((t) => (
          <button key={t.title} type="button" title={t.title} onMouseDown={(e) => { e.preventDefault(); t.cmd?.(); }}
            className={`flex h-7 min-w-[28px] items-center justify-center rounded px-1.5 text-xs text-slate-600 hover:bg-slate-200 ${t.cls ?? ''}`}>
            {t.label}
          </button>
        ))}
      </div>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onInput={() => onChange(editorRef.current?.innerHTML ?? '')}
        data-placeholder={placeholder}
        className="min-h-[120px] px-4 py-3 text-sm text-slate-900 outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}

// ─── Time helpers ──────────────────────────────────────────────────────────

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

// ─── DateTimeRow ────────────────────────────────────────────────────────────

function DateTimeRow({ label, required, value, onChange, error }: {
  label: string; required?: boolean; value: string;
  onChange: (v: string) => void; error?: string;
}) {
  const dateVal = value.split('T')[0] ?? '';
  const { time: time12, ampm } = getTime12(value);

  function applyDate(newDate: string) {
    onChange(newDate ? buildIso(newDate, time12, ampm) : '');
  }
  function applyTime(newTime12: string, newAmpm: 'AM' | 'PM') {
    if (!newTime12) { onChange(dateVal ? `${dateVal}T00:00` : ''); return; }
    onChange(buildIso(dateVal, newTime12, newAmpm));
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-slate-600">
        {required && <span className="mr-0.5 text-brand-600">*</span>}{label}
      </p>
      <div className="flex gap-2">
        {/* Date */}
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <input type="date" className={`${inputCls} pl-9`} value={dateVal}
            onChange={(e) => applyDate(e.target.value)} />
        </div>
        {/* Time (12h) + clear */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 shrink-0 text-slate-300">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
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
            <button type="button" onClick={() => applyTime('', ampm)}
              className="text-slate-300 hover:text-slate-500">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z" />
              </svg>
            </button>
          )}
        </div>
        {/* AM/PM */}
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

// ─── LineupMemberCard ───────────────────────────────────────────────────────

function LineupMemberCard({
  member, isEditing, onUpdate, onRemove, onSave, onEdit,
}: {
  member: LineupMember;
  isEditing: boolean;
  onUpdate: <K extends keyof LineupMember>(key: K, val: LineupMember[K]) => void;
  onRemove: () => void;
  onSave: () => void;
  onEdit: () => void;
}) {
  const photoRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error('Max file size is 2 MB'); return; }
    try {
      const url = await uploadToCloudinary(file, 'eventful/lineup');
      onUpdate('photoUrl', url);
    } catch {
      toast.error('Photo upload failed. Please try again.');
    }
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.name} className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">
            {member.name ? member.name.charAt(0).toUpperCase() : '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{member.name || 'Unnamed'}</p>
          <p className="text-xs text-slate-400">{member.title} · {member.role}</p>
        </div>
        <button type="button" onClick={onEdit}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50">
          Edit
        </button>
        <button type="button" onClick={onRemove}
          className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500">
          <XIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Title row */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex-1">
          <label className="mb-1.5 block text-xs font-bold text-slate-600">
            <span className="mr-0.5 text-brand-600">*</span>Lineup Title
          </label>
          <div className="relative">
            <select className={`${inputCls} appearance-none pr-8`} value={member.title}
              onChange={(e) => onUpdate('title', e.target.value)}>
              {LINEUP_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <svg viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <button type="button" onClick={onRemove}
          className="mt-5 rounded-lg p-1.5 text-red-300 hover:bg-red-50 hover:text-red-500">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M16.5 4.478v.227a49 49 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A49 49 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a53 53 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951m-6.136-1.452a51 51 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a50 50 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452m-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.498.058z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Photo + fields */}
      <div className="flex gap-5">
        {/* Photo upload */}
        <div className="shrink-0">
          <input ref={photoRef} type="file" accept="image/jpeg,image/png" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <button type="button" onClick={() => photoRef.current?.click()}
            className="flex h-[140px] w-[120px] flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-brand-300 hover:bg-brand-50">
            {member.photoUrl ? (
              <img src={member.photoUrl} alt="Photo" className="h-full w-full object-cover" />
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-slate-400">
                  <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18zm2 13.5h16.5a.75.75 0 0 0 .75-.75V13.5l-4.439-4.439a.75.75 0 0 0-1.061 0l-4.5 4.5a.75.75 0 0 1-1.061 0l-1.939-1.939a.75.75 0 0 0-1.061 0l-3.439 3.44v2.189a.75.75 0 0 0 .75.75m7.5-12a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0" clipRule="evenodd" />
                </svg>
                <span className="text-center text-[11px] font-semibold text-brand-600">Click to upload</span>
              </>
            )}
          </button>
          <p className="mt-1.5 text-center text-[10px] leading-tight text-brand-600">
            * The maximum upload<br />file size is 2MB.
          </p>
        </div>

        {/* Fields */}
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">
              <span className="mr-0.5 text-brand-600">*</span>Name
            </label>
            <input className={inputCls} placeholder="Name" value={member.name}
              onChange={(e) => onUpdate('name', e.target.value)} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">Description</label>
            <input className={inputCls} placeholder="e.g 2x Grammy award winning Performer"
              value={member.description} onChange={(e) => onUpdate('description', e.target.value)} />
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-slate-600">Role</label>
            <div className="flex flex-wrap gap-2">
              {LINEUP_ROLES.map((r) => (
                <button key={r} type="button" onClick={() => onUpdate('role', r)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    member.role === r
                      ? 'border-brand-400 bg-brand-50 text-brand-600'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300'
                  }`}>
                  {r === 'Headliner' && <span className="text-brand-600">★</span>}
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Social link */}
          <div>
            {member.socialLink ? (
              <div className="relative">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                </svg>
                <input className={`${inputCls} pl-9`} placeholder="https://instagram.com/..."
                  value={member.socialLink.trim()}
                  onChange={(e) => onUpdate('socialLink', e.target.value)} />
              </div>
            ) : (
              <button type="button" onClick={() => onUpdate('socialLink', ' ')}
                className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-brand-600">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0" />
                </svg>
                add social link
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button type="button" disabled={!member.name.trim()} onClick={onSave}
          className="rounded-xl bg-brand-600 px-6 py-2 text-sm font-bold text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40">
          Save
        </button>
      </div>
    </div>
  );
}

// ─── Step 1 — Details ──────────────────────────────────────────────────────

function Step1({
  data, set, errors, userName,
}: {
  data: WizardData;
  set: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
  errors: Partial<Record<keyof WizardData, string>>;
  userName: string;
}) {
  const [showAllCats,    setShowAllCats]    = useState(false);
  const [editingMember,  setEditingMember]  = useState<string | null>(null);
  const visibleCats = showAllCats ? CATEGORIES : CATEGORIES.slice(0, CATEGORIES_DEFAULT_SHOW);

  const remaining = 75 - data.title.length;

  function addLineupMember() {
    const id = crypto.randomUUID();
    set('lineup', [...data.lineup, {
      _id: id, title: 'Artists', name: '', description: '', role: 'Performer', photoUrl: '', socialLink: '',
    }]);
    setEditingMember(id);
  }

  function updateMember<K extends keyof LineupMember>(id: string, key: K, val: LineupMember[K]) {
    set('lineup', data.lineup.map((m) => m._id === id ? { ...m, [key]: val } : m));
  }

  function removeMember(id: string) {
    set('lineup', data.lineup.filter((m) => m._id !== id));
    if (editingMember === id) setEditingMember(null);
  }

  return (
    <div className="space-y-8">

      {/* Greeting */}
      <div>
        <p className="text-xl font-extrabold text-slate-900">Hi {userName},</p>
        <p className="mt-0.5 text-sm text-slate-500">Let&apos;s start with the basics.</p>
      </div>

      {/* ── Event details ── */}
      <div className="space-y-5">
        <SectionHeader title="Event details" />

        <Field label="Event name" required error={errors.title}>
          <div className="relative">
            <input className={inputCls} maxLength={75} placeholder="e.g. Davido Timeless World Tour — Douala"
              value={data.title} onChange={(e) => set('title', e.target.value)} />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${remaining < 10 ? 'text-red-400' : 'text-slate-300'}`}>{remaining}</span>
          </div>
        </Field>

        <Field label="Description" required error={errors.description}>
          <RichTextEditor
            value={data.description}
            onChange={(v) => set('description', v)}
            placeholder="Tell attendees what to expect…"
          />
        </Field>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* ── Event location ── */}
      <div className="space-y-4">
        <SectionHeader title="Event location" />

        <Field label="Country">
          <select className={inputCls} value={data.country} onChange={(e) => set('country', e.target.value)}>
            {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>

        <Field label="Location of event" required error={errors.venue}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
              <MapPointIcon className="h-4 w-4" />
            </span>
            <input className={`${inputCls} pl-9`} placeholder="Venue name or address"
              value={data.venue} onChange={(e) => set('venue', e.target.value)} />
          </div>
        </Field>

        {/* Virtual toggle */}
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm font-medium text-slate-700">This is a virtual event</span>
          <div
            onClick={() => set('isVirtual', !data.isVirtual)}
            className={`relative h-6 w-11 rounded-full transition-colors ${data.isVirtual ? 'bg-brand-600' : 'bg-slate-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${data.isVirtual ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </label>

        {/* Custom URL */}
        <Field label="Use custom URL">
          <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
            <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-xs text-slate-400 whitespace-nowrap">
              eventful.com/e/
            </span>
            <input
              className="flex-1 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="your-event-slug"
              value={data.customUrl}
              onChange={(e) => set('customUrl', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
            />
          </div>
        </Field>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* ── Event format ── */}
      <div>
        <SectionHeader title="Event format" subtitle="What does your event feel like?" />
        <select className={inputCls} value={data.eventFormat} onChange={(e) => set('eventFormat', e.target.value)}>
          <option value="">Select a format</option>
          {EVENT_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* ── Event category ── */}
      <div>
        <SectionHeader title="Event Category" subtitle="Choose the category that best describe your event." />
        {errors.category && <p className="mb-2 text-xs text-red-500">{errors.category}</p>}

        {/* Selected chip above */}
        {data.category && (
          <div className="mb-3 flex flex-wrap gap-2">
            {(() => {
              const sel = CATEGORIES.find((c) => c.value === data.category);
              return sel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-400 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600">
                  {sel.label}
                  <button type="button" onClick={() => set('category', '')}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-brand-100">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94z" />
                    </svg>
                  </button>
                </span>
              ) : null;
            })()}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {visibleCats.filter((c) => c.value !== data.category).map((c) => (
            <button key={c.value} type="button" onClick={() => set('category', c.value)}
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-600">
              {c.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowAllCats((v) => !v)}
          className="mt-3 text-xs font-semibold text-brand-600 hover:underline">
          {showAllCats ? 'See less' : 'See more'}
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* ── Event schedule ── */}
      <div>
        <SectionHeader title="Event schedule" subtitle="Set the frequency, date and time." />

        {/* Tab switcher — outline style matching reference */}
        <div className="mb-5 flex gap-2">
          {(['single', 'recurring'] as ScheduleTab[]).map((tab) => (
            <button key={tab} type="button" onClick={() => set('scheduleTab', tab)}
              className={`rounded-xl border px-5 py-2 text-sm font-bold transition ${
                data.scheduleTab === tab
                  ? 'border-brand-400 text-brand-600'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}>
              {tab === 'single' ? 'Single Event' : 'Recurring Event'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <Field label="Choose a time zone" required>
            <select className={inputCls} value={data.timezone} onChange={(e) => set('timezone', e.target.value)}>
              {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
          </Field>

          <DateTimeRow label="Start date" required value={data.startsAt}
            onChange={(v) => set('startsAt', v)} error={errors.startsAt} />

          <DateTimeRow label="End date" value={data.endsAt}
            onChange={(v) => set('endsAt', v)} />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* ── Event Lineup ── */}
      <div>
        <SectionHeader title="Event Lineup" subtitle="Showcase speakers, headliners, artists of your event" />

        <div className="space-y-4">
          {data.lineup.map((member) => (
            <LineupMemberCard
              key={member._id}
              member={member}
              isEditing={editingMember === member._id}
              onUpdate={(key, val) => updateMember(member._id, key, val)}
              onRemove={() => removeMember(member._id)}
              onSave={() => setEditingMember(null)}
              onEdit={() => setEditingMember(member._id)}
            />
          ))}

          <button type="button" onClick={addLineupMember}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-3.5 text-sm font-semibold text-brand-600 transition hover:border-brand-300 hover:bg-brand-50">
            <PlusIcon className="h-4 w-4" /> Add lineup
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100" />

      {/* ── Social Details ── */}
      <div>
        <SectionHeader title="Social Details" />
        <div className="space-y-3">
          {/* Website */}
          <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
            <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
              </svg>
            </span>
            <input type="url" placeholder="https://yourwebsite.url/"
              className="flex-1 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              value={data.socialWebsite} onChange={(e) => set('socialWebsite', e.target.value)} />
          </div>

          {/* Instagram */}
          <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
            <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-slate-400">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </span>
            <input type="text" placeholder="Your Instagram Handle"
              className="flex-1 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              value={data.socialInstagram} onChange={(e) => set('socialInstagram', e.target.value)} />
          </div>

          {/* X / Twitter */}
          <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
            <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-slate-400">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </span>
            <input type="text" placeholder="Your X(Twitter) Handle"
              className="flex-1 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              value={data.socialTwitter} onChange={(e) => set('socialTwitter', e.target.value)} />
          </div>

          {/* Facebook */}
          <div className="flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
            <span className="flex w-11 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-slate-400">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </span>
            <input type="url" placeholder="Your Facebook URL"
              className="flex-1 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              value={data.socialFacebook} onChange={(e) => set('socialFacebook', e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 — Appearance ──────────────────────────────────────────────────

const THEMES = [
  { value: 'classic', label: 'Classic' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'bold',    label: 'Bold' },
];

function Step2({
  data, set,
}: {
  data: WizardData;
  set: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
}) {
  const [preview, setPreview] = useState(data.coverImageUrl || '');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleUrl(url: string) { set('coverImageUrl', url); setPreview(url); }

  async function handleFile(file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error('File must be under 2 MB'); return; }
    try {
      const url = await uploadToCloudinary(file, 'eventful/covers');
      handleUrl(url);
    } catch {
      toast.error('Image upload failed. Please try again.');
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">

      {/* ── Left: Image ── */}
      <div>
        <SectionHeader title="Image" subtitle="Upload a JPEG or PNG image like your event poster" />

        {/* Tip */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          <span className="shrink-0 text-orange-400">ⓘ</span>
          For the best look, use a portrait (4:5) or square image.
        </div>

        {/* Drop zone / preview */}
        {preview ? (
          <div className="relative overflow-hidden rounded-2xl bg-slate-100" style={{ aspectRatio: '4/3' }}>
            <Image src={preview} alt="Cover" fill className="object-cover" onError={() => setPreview('')} />
            <button type="button" onClick={() => handleUrl('')}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 transition ${
              dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-brand-50'
            }`}
            style={{ minHeight: 160 }}
          >
            {/* Image icon */}
            <svg className="h-10 w-10 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="3" fill="currentColor" opacity="0.15"/>
              <path d="M3 17l5-5 3 3 4-5 6 7H3z" fill="currentColor" opacity="0.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity="0.7"/>
            </svg>
            <p className="text-sm text-slate-500">
              Drag an image here or{' '}
              <span className="font-semibold text-brand-600">click to upload</span>
            </p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        <p className="mt-2 text-xs text-slate-400">The maximum upload file size is 2MB.</p>
      </div>

      {/* ── Right: Theme ── */}
      <div>
        <div className="flex items-center justify-between">
          <SectionHeader title="Theme" subtitle="Choose a layout for your event page." />
          <button type="button" className="mb-5 flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand-600">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
            Preview theme
          </button>
        </div>

        <div className="space-y-2">
          {THEMES.map((t) => (
            <button key={t.value} type="button" onClick={() => set('theme', t.value)}
              className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
                data.theme === t.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-200'
              }`}>
              {/* Theme icon */}
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                data.theme === t.value ? 'bg-brand-100' : 'bg-slate-200'
              }`}>
                <svg viewBox="0 0 24 24" className={`h-7 w-7 ${data.theme === t.value ? 'text-brand-600' : 'text-slate-500'}`} fill="currentColor">
                  <rect x="3" y="3" width="8" height="8" rx="1" opacity="0.7"/>
                  <rect x="13" y="3" width="8" height="8" rx="1" opacity="0.4"/>
                  <rect x="3" y="13" width="8" height="8" rx="1" opacity="0.4"/>
                  <rect x="13" y="13" width="8" height="8" rx="1" opacity="0.7"/>
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-400">Theme</p>
                <p className="text-sm font-bold text-slate-800">{t.label}</p>
              </div>
              {data.theme === t.value && (
                <CheckCircleIcon className="ml-auto h-5 w-5 text-brand-600" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tier presets ───────────────────────────────────────────────────────────

const TIER_PRESETS = [
  { label: 'VVIP',    emoji: '👑', bg: 'bg-slate-900',   text: 'text-white',        border: 'border-slate-900'  },
  { label: 'VIP',     emoji: '⭐', bg: 'bg-brand-600',   text: 'text-white',        border: 'border-brand-600'  },
  { label: 'Classic', emoji: '🎫', bg: 'bg-slate-100',   text: 'text-slate-700',    border: 'border-slate-200'  },
  { label: 'Custom',  emoji: '✏️', bg: 'bg-white',       text: 'text-slate-500',    border: 'border-slate-300'  },
] as const;

// ─── Tier modal ────────────────────────────────────────────────────────────

function TierModal({ initial, onSave, onClose }: { initial?: TierDraft; onSave: (t: TierDraft) => void; onClose: () => void }) {
  const [tier, setTier] = useState<TierDraft>(initial ?? newTier());
  const [perkInput, setPerkInput] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof TierDraft, string>>>({});
  const [modalStep, setModalStep] = useState<0 | 1>(initial ? 1 : 0);
  const [ticketKind, setTicketKind] = useState<'single' | 'group'>('single');

  function setF<K extends keyof TierDraft>(k: K, v: TierDraft[K]) {
    setTier((p) => ({ ...p, [k]: v }));
    setErrors((p) => { const e = { ...p }; delete e[k]; return e; });
  }

  function addPerk() { if (!perkInput.trim()) return; setF('perks', [...tier.perks, perkInput.trim()]); setPerkInput(''); }

  function save() {
    const errs: Partial<Record<keyof TierDraft, string>> = {};
    if (!tier.name.trim()) errs.name = 'Name is required';
    if (tier.type === 'PAID' && (!tier.price || Number(tier.price) <= 0)) errs.price = 'Enter a price > 0';
    if (!tier.capacity || Number(tier.capacity) < 1) errs.capacity = 'Capacity must be ≥ 1';
    if (tier.type === 'INVITE_ONLY' && !tier.inviteCode.trim()) errs.inviteCode = 'Invite code required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSave(tier);
  }

  // ── Step 0 — ticket kind selector ───────────────────────────────────────
  if (modalStep === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md rounded-3xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Create ticket</h3>
              <p className="text-xs text-slate-400">Choose the ticket format</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <XIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Kind selector */}
          <div className="grid grid-cols-2 gap-3 p-6">
            {/* Single */}
            <button
              type="button"
              onClick={() => { setTicketKind('single'); setModalStep(1); }}
              className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50"
            >
              <span className="text-5xl leading-none transition group-hover:scale-110">🎫</span>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Single</p>
                <p className="mt-0.5 text-xs text-slate-400">One ticket per person</p>
              </div>
            </button>

            {/* Group */}
            <button
              type="button"
              onClick={() => { setTicketKind('group'); setModalStep(1); }}
              className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-slate-200 bg-slate-50 p-6 text-center transition hover:border-brand-400 hover:bg-brand-50"
            >
              <span className="text-5xl leading-none transition group-hover:scale-110">🎟️</span>
              <div>
                <p className="text-sm font-extrabold text-slate-900">Group</p>
                <p className="mt-0.5 text-xs text-slate-400">One ticket, multiple people</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 1 — ticket form ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 flex items-center gap-2 border-b border-slate-100 bg-white px-6 py-4">
          {!initial && (
            <button
              type="button"
              onClick={() => setModalStep(0)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10" clipRule="evenodd"/>
              </svg>
            </button>
          )}
          <div className="flex-1">
            <h3 className="text-base font-extrabold text-slate-900">
              {initial ? 'Edit ticket' : `${ticketKind === 'group' ? '🎟️ Group' : '🎫 Single'} ticket`}
            </h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">

          {/* Quick presets (only when creating) */}
          {!initial && (
            <div>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick presets</p>
              <div className="flex flex-wrap gap-2">
                {TIER_PRESETS.map(({ label, emoji, bg, text, border }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => label !== 'Custom' && setF('name', label)}
                    className={`inline-flex items-center gap-2 rounded-xl border-2 px-3.5 py-2 text-sm font-bold transition hover:scale-105 active:scale-95 ${bg} ${text} ${border} ${tier.name === label ? 'ring-2 ring-brand-400 ring-offset-1' : ''}`}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ticket pricing type */}
          <Field label="Ticket type">
            <div className="grid grid-cols-3 gap-2">
              {(['FREE', 'PAID', 'INVITE_ONLY'] as TierType[]).map((t) => (
                <button key={t} type="button" onClick={() => setF('type', t)}
                  className={`rounded-xl border-2 py-2.5 text-xs font-bold transition ${tier.type === t ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-500 hover:border-brand-200'}`}>
                  {t === 'FREE' ? 'Free' : t === 'PAID' ? 'Paid' : 'Invite only'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Ticket name" required error={errors.name}>
            <input className={inputCls} maxLength={75} placeholder="e.g. VIP, Early Bird, General"
              value={tier.name} onChange={(e) => setF('name', e.target.value)} />
          </Field>

          {tier.type !== 'FREE' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price" required error={errors.price}>
                <input type="number" min="0" className={inputCls} placeholder="e.g. 5000"
                  value={tier.price} onChange={(e) => setF('price', e.target.value)} />
              </Field>
              <Field label="Currency">
                <select className={inputCls} value={tier.currency} onChange={(e) => setF('currency', e.target.value)}>
                  <option value="XAF">XAF — CFA Franc</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="NGN">NGN</option>
                </select>
              </Field>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quantity" required error={errors.capacity} hint="Total tickets in this tier">
              <input type="number" min="1" className={inputCls} placeholder="e.g. 500"
                value={tier.capacity} onChange={(e) => setF('capacity', e.target.value)} />
            </Field>
            <Field label="Max per order" hint="Per buyer limit">
              <input type="number" min="1" max="20" className={inputCls} placeholder="10"
                value={tier.orderLimit} onChange={(e) => setF('orderLimit', e.target.value)} />
            </Field>
          </div>

          {tier.type === 'INVITE_ONLY' && (
            <Field label="Invite code" required error={errors.inviteCode}>
              <input className={inputCls} placeholder="e.g. VIP2025"
                value={tier.inviteCode} onChange={(e) => setF('inviteCode', e.target.value)} />
            </Field>
          )}

          <Field label="Description" hint="Shown to buyers (max 280 chars)">
            <textarea className={`${inputCls} min-h-[72px] resize-none`} maxLength={280} placeholder="What's included?"
              value={tier.description} onChange={(e) => setF('description', e.target.value)} />
          </Field>

          <Field label="Perks">
            <div className="space-y-2">
              {tier.perks.map((p, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600">
                  <span className="flex-1">{p}</span>
                  <button type="button" onClick={() => setF('perks', tier.perks.filter((_, j) => j !== i))}>
                    <XIcon className="h-3.5 w-3.5 text-brand-400 hover:text-brand-600" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input className={`${inputCls} flex-1`} placeholder="e.g. Free drink voucher"
                  value={perkInput} onChange={(e) => setPerkInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPerk())} />
                <button type="button" onClick={addPerk}
                  className="rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 hover:border-brand-300 hover:text-brand-600">
                  Add
                </button>
              </div>
            </div>
          </Field>
        </div>

        <div className="sticky bottom-0 border-t border-slate-100 bg-white p-6">
          <button type="button" onClick={save}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-500">
            {initial ? 'Save changes' : 'Create ticket'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 — Tickets ─────────────────────────────────────────────────────

function Step3({
  data, set, errors,
}: {
  data: WizardData;
  set: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
  errors: Partial<Record<keyof WizardData, string>>;
}) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<TierDraft | undefined>();

  function upsertTier(t: TierDraft) {
    const exists = data.tiers.find((x) => x._id === t._id);
    set('tiers', exists ? data.tiers.map((x) => x._id === t._id ? t : x) : [...data.tiers, t]);
    setShowModal(false); setEditing(undefined);
  }

  const typeColor: Record<TierType, string> = { FREE: 'bg-emerald-50 text-emerald-700', PAID: 'bg-brand-50 text-brand-600', INVITE_ONLY: 'bg-purple-50 text-purple-700' };

  return (
    <>
      {/* Section header */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-semibold text-brand-600 whitespace-nowrap">Ticket details</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* Capacity */}
      <div className="mb-6">
        <Field label="Total event capacity" required error={errors.capacity} hint="Maximum tickets across all tiers">
          <input type="number" min="1" className={inputCls} placeholder="e.g. 5000"
            value={data.capacity} onChange={(e) => set('capacity', e.target.value)} />
        </Field>
      </div>

      {/* Fee info */}
      <div className="mb-6 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        We only charge a service fee on paid tickets. For more details, check our{' '}
        <span className="cursor-pointer font-medium text-brand-600 hover:underline">pricing page</span>.
      </div>

      {/* Tiers list / empty state */}
      {data.tiers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-slate-50 py-16 text-center">
          <TicketIllustration />
          <div>
            <p className="text-base font-bold text-slate-800">Create your first ticket</p>
            <p className="mt-1 text-sm text-slate-500">Set up paid and free tickets so people can attend your event.</p>
          </div>
          <button type="button" onClick={() => { setEditing(undefined); setShowModal(true); }}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-500">
            <PlusIcon className="h-4 w-4" /> Create ticket
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.tiers.map((t) => (
            <div key={t._id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50">
                <TicketIcon className="h-5 w-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold text-slate-900">{t.name}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${typeColor[t.type]}`}>
                    {t.type === 'INVITE_ONLY' ? 'Invite' : t.type}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">
                  {t.type === 'FREE' ? 'Free' : `${parseInt(t.price || '0').toLocaleString()} ${t.currency}`}
                  {' · '}{t.capacity} tickets{' · '}max {t.orderLimit}/order
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => { setEditing(t); setShowModal(true); }}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Edit</button>
                <button type="button" onClick={() => set('tiers', data.tiers.filter((x) => x._id !== t._id))}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-50">Remove</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => { setEditing(undefined); setShowModal(true); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-3.5 text-sm font-semibold text-slate-400 transition hover:border-brand-300 hover:text-brand-600">
            <PlusIcon className="h-4 w-4" /> Add another ticket
          </button>
        </div>
      )}

      {showModal && <TierModal initial={editing} onSave={upsertTier} onClose={() => { setShowModal(false); setEditing(undefined); }} />}
    </>
  );
}

// ─── Step 4 — Publish ─────────────────────────────────────────────────────

function Step4({ data }: { data: WizardData }) {
  const cat = CATEGORIES.find((c) => c.value === data.category);
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">Review your event before publishing.</p>
      <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
        {data.coverImageUrl ? (
          <div className="relative h-48 bg-slate-100"><Image src={data.coverImageUrl} alt="Cover" fill className="object-cover" onError={() => {}} /></div>
        ) : (
          <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-900 to-brand-950">
            <span className="text-3xl font-extrabold text-white/30">{cat?.label?.slice(0, 2).toUpperCase() ?? '✨'}</span>
          </div>
        )}
        <div className="bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-extrabold text-slate-900">{data.title || 'Untitled Event'}</h2>
            <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-600">{cat?.label ?? data.category}</span>
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-slate-500">
            <div className="flex items-center gap-2"><CalendarIcon className="h-3.5 w-3.5 text-slate-300" />
              {data.startsAt ? new Date(data.startsAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
            </div>
            <div className="flex items-center gap-2"><MapPointIcon className="h-3.5 w-3.5 text-slate-300" />
              {data.venue || '—'}
            </div>
            <div className="flex items-center gap-2"><TicketIcon className="h-3.5 w-3.5 text-slate-300" />
              {data.tiers.length === 0 ? `${data.capacity || '—'} capacity` : `${data.tiers.length} tier${data.tiers.length > 1 ? 's' : ''} · ${data.capacity} total capacity`}
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500 space-y-2">
        <p><span className="font-semibold text-slate-700">Save as draft</span> — Only you can see it. Edit and publish whenever ready.</p>
        <p><span className="font-semibold text-slate-700">Publish</span> — Goes live immediately. Buyers can purchase right away.</p>
      </div>
    </div>
  );
}

// ─── Validation ────────────────────────────────────────────────────────────

function validateStep(step: number, data: WizardData): Partial<Record<keyof WizardData, string>> {
  const err: Partial<Record<keyof WizardData, string>> = {};
  if (step === 0) {
    if (!data.title.trim())       err.title       = 'Event name is required';
    if (!data.category)           err.category    = 'Select a category';
    if (!data.description.trim()) err.description = 'Description is required';
    if (!data.venue.trim())       err.venue       = 'Venue is required';
    if (!data.startsAt)           err.startsAt    = 'Start date is required';
  }
  if (step === 2) {
    if (!data.capacity || Number(data.capacity) < 1) err.capacity = 'Capacity must be at least 1';
  }
  return err;
}

// ─── Category mapping (wizard → API enum) ──────────────────────────────────
// API only accepts: CONCERT | THEATER | SPORTS | CULTURAL | OTHER

const API_CATEGORY: Record<string, string> = {
  MUSIC:            'CONCERT',
  FESTIVAL:         'CONCERT',
  CONCERT:          'CONCERT',
  PERFORMING_ARTS:  'THEATER',
  THEATRE:          'THEATER',
  COMEDY:           'THEATER',
  FILM:             'THEATER',
  IMPROV:           'THEATER',
  SPORTS:           'SPORTS',
  HIKING:           'SPORTS',
  KAYAKING:         'SPORTS',
  DANCE:            'CULTURAL',
  VISUAL_ARTS:      'CULTURAL',
  CULTURAL:         'CULTURAL',
  FASHION:          'CULTURAL',
  COMMUNITY:        'CULTURAL',
  BOOKS:            'CULTURAL',
  GENDER_EQUALITY:  'CULTURAL',
  EASTER:           'CULTURAL',
  CHRISTMAS:        'CULTURAL',
  CHRISTIANITY:     'CULTURAL',
  RAMADAN:          'CULTURAL',
  EID:              'CULTURAL',
  ISLAM:            'CULTURAL',
  POETRY:           'CULTURAL',
};

function toApiCategory(cat: string): string {
  return API_CATEGORY[cat] ?? 'OTHER';
}

// ─── Page ──────────────────────────────────────────────────────────────────

const STEP_TITLES    = ['Create your event', 'Add a cover image', 'Set up tickets', 'Review & publish'];
const STEP_SUBTITLES = ['Tell people what your event is about.', 'A great image helps your event stand out.', 'Create tickets for your attendees.', 'Almost there — review before going live.'];

export default function NewEventPage() {
  const router    = useRouter();
  const apiFetch  = useApiFetch();
  const { user }  = useAuth();
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';
  const [step, setStep]       = useState(0);
  const [data, setData]       = useState<WizardData>(INIT);
  const [errors, setErrors]   = useState<Partial<Record<keyof WizardData, string>>>({});
  const [loading, setLoading] = useState(false);

  function set<K extends keyof WizardData>(k: K, v: WizardData[K]) {
    setData((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => { const e = { ...prev } as Record<string, string>; delete e[k as string]; return e as Partial<Record<keyof WizardData, string>>; });
  }

  function next() {
    const errs = validateStep(step, data);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep((s) => Math.min(s + 1, 3));
    setErrors({});
  }

  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function submit(publish: boolean) {
    setLoading(true);
    try {
      const eventRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:         data.title,
          description:   data.description,
          category:      toApiCategory(data.category),
          venue:         data.venue,
          startsAt:      new Date(data.startsAt).toISOString(),
          endsAt:        data.endsAt
            ? new Date(data.endsAt).toISOString()
            : new Date(new Date(data.startsAt).getTime() + 3 * 60 * 60 * 1000).toISOString(),
          capacity:      Number(data.capacity) || 1000,
          price:         0,
          currency:      'XAF',
          coverImageUrl: data.coverImageUrl || undefined,
          metadata:      (() => {
            const lineup = data.lineup
              .filter((m) => m.name.trim())
              .map((m) => ({ name: m.name.trim(), photoUrl: m.photoUrl || undefined, role: m.role || undefined }));
            return lineup.length > 0 ? { lineup } : undefined;
          })(),
        }),
      });
      if (!eventRes.ok) { const e = await eventRes.json().catch(() => ({})); toast.error(e.message ?? 'Failed to create event.'); return; }
      const created = await eventRes.json();
      const eventId = created.id ?? created.data?.id;

      for (const tier of data.tiers) {
        await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}/tiers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: tier.name, type: tier.type,
            price: tier.type === 'FREE' ? 0 : Number(tier.price),
            currency: tier.currency, capacity: Number(tier.capacity),
            orderLimit: Number(tier.orderLimit) || 10,
            description: tier.description || undefined,
            perks: tier.perks, inviteCode: tier.inviteCode || undefined,
          }),
        });
      }

      if (publish) {
        await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/events/${eventId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPublished: true }),
        });
      }
      router.push(`/dashboard/creator/events/${eventId}`);
    } catch { toast.error('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  const indicatorStep = Math.min(step, 2);

  return (
    <div className="min-h-screen bg-white">

      {/* ── Step indicator bar ─────────────────────────────────────────────── */}
      <div className="border-b border-slate-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center">
          {WIZARD_STEPS.map((label, i) => {
            const done    = indicatorStep > i;
            const current = indicatorStep === i && step < 3;
            return (
              <div key={label} className="flex flex-1 items-center">
                <div className="flex items-center gap-2 shrink-0">
                  {done
                    ? <CheckCircleIcon className="h-5 w-5 text-brand-600" />
                    : <div className={`h-2.5 w-2.5 rounded-full border-2 ${current ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white'}`} />}
                  <span className={`text-sm font-bold ${done || current ? 'text-brand-600' : 'text-slate-400'}`}>{label}</span>
                </div>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={`mx-4 h-px flex-1 ${done ? 'bg-brand-600' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          {step > 0 && (
            <button type="button" onClick={back} className="mb-4 flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
              ← Back
            </button>
          )}
          {step === 0 && (
            <Link href="/dashboard/creator/events" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
              ← My Events
            </Link>
          )}
          <h1 className="text-2xl font-extrabold text-slate-900">{STEP_TITLES[step]}</h1>
          <p className="mt-1 text-sm text-slate-500">{STEP_SUBTITLES[step]}</p>
        </div>

        {/* Steps 0, 3 in a card; steps 1 (Appearance) and 2 (Tickets) open */}
        {step === 0 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <Step1 data={data} set={set} errors={errors} userName={firstName} />
          </div>
        )}
        {step === 1 && <Step2 data={data} set={set} />}
        {step === 2 && <Step3 data={data} set={set} errors={errors} />}
        {step === 3 && (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
            <Step4 data={data} />
          </div>
        )}

        {/* ── Nav buttons ─────────────────────────────────────────────────── */}
        <div className="mt-8 flex items-center gap-3">
          {/* Appearance step */}
          {step === 1 ? (
            <>
              <button type="button" onClick={next}
                className="text-sm font-semibold text-slate-400 transition hover:text-slate-600">
                Skip for now
              </button>
              <button type="button" onClick={next}
                className="ml-auto rounded-xl bg-brand-600 px-8 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-500">
                Save and Continue
              </button>
            </>
          ) : step === 2 ? (
            // Tickets step
            <div className="ml-auto flex gap-3">
              <button type="button" onClick={next}
                className="rounded-xl bg-slate-100 px-6 py-2.5 text-sm font-bold text-slate-500 transition hover:bg-slate-200">
                Do it later
              </button>
              <button type="button" onClick={next}
                className="rounded-xl bg-brand-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-500">
                Continue
              </button>
            </div>
          ) : step === 3 ? (
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={() => submit(false)} disabled={loading}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:border-slate-300 disabled:opacity-50">
                {loading ? 'Saving…' : 'Save draft'}
              </button>
              <button type="button" onClick={() => submit(true)} disabled={loading}
                className="rounded-xl bg-brand-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                {loading ? 'Publishing…' : 'Publish event'}
              </button>
            </div>
          ) : (
            // Step 0 — Details
            <button type="button" onClick={next}
              className="ml-auto rounded-xl bg-brand-600 px-8 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-500">
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
