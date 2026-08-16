import 'dotenv/config';
import { PrismaClient, EventCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function slug(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  const rand = crypto.randomBytes(3).toString('hex');
  return `${base}-${rand}`;
}

function future(daysFromNow: number, hour = 20) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d;
}

interface EventSeed {
  title: string;
  category: EventCategory;
  venue: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  price: number;
  currency: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  defaultReminderOffsets: number[];
}

const events: EventSeed[] = [
  // ── CONCERTS ───────────────────────────────────────────────────────────────
  {
    title: 'Davido: Timeless World Tour – Douala',
    category: EventCategory.CONCERT,
    venue: 'Palais des Sports de Douala, Douala',
    startsAt: future(14, 20),
    endsAt:   future(14, 23),
    capacity: 15000,
    price: 15000,
    currency: 'XAF',
    description: 'Davido brings his Timeless World Tour to Cameroon. Expect all the hits — Unavailable, Fall, Assurance — plus surprise guests from the Afrobeats elite.',
    metadata: { lineup: ['Davido', 'Peruzzi', 'Dremo'], ageRestriction: 16, doors: future(14, 19).toISOString() },
    defaultReminderOffsets: [10080, 1440, 60],
  },
  {
    title: 'Burna Boy: African Giant Live',
    category: EventCategory.CONCERT,
    venue: 'Omnisports Stadium, Yaounde',
    startsAt: future(21, 21),
    endsAt:   future(21, 24),
    capacity: 20000,
    price: 20000,
    currency: 'XAF',
    description: 'Grammy-winning Afrofusion star Burna Boy headlines a massive show in the capital. Expect Ye, Last Last, and a full live band experience.',
    metadata: { lineup: ['Burna Boy', 'Fave'], ageRestriction: 16, doors: future(21, 20).toISOString() },
    defaultReminderOffsets: [10080, 1440, 60],
  },
  {
    title: 'Afrobeats Nuit – Douala All-Stars',
    category: EventCategory.CONCERT,
    venue: 'La Nouvelle Maison des Arts, Douala',
    startsAt: future(7, 22),
    endsAt:   future(8, 2),
    capacity: 800,
    price: 5000,
    currency: 'XAF',
    description: 'The biggest local Afrobeats night in Douala. Five emerging artists, one stage, all night long.',
    metadata: { lineup: ['Mr Leo', 'Locko', 'Daphne', 'Tenor', 'Charlotte Dipanda'], ageRestriction: 18 },
    defaultReminderOffsets: [1440, 60],
  },
  {
    title: 'Wizkid FC Live – Lagos to the World',
    category: EventCategory.CONCERT,
    venue: 'Palais des Sports de Douala, Douala',
    startsAt: future(35, 20),
    endsAt:   future(35, 23),
    capacity: 12000,
    price: 12000,
    currency: 'XAF',
    description: 'Star Boy Wizkid makes his Cameroon debut with a catalogue spanning Ojuelegba to Essence. A night that will not be forgotten.',
    metadata: { lineup: ['Wizkid', 'Tems'], ageRestriction: 16 },
    defaultReminderOffsets: [10080, 1440, 60],
  },
  {
    title: 'Gospel Praise Night – Yaounde 2025',
    category: EventCategory.CONCERT,
    venue: 'Cathedrale Notre-Dame des Victoires, Yaounde',
    startsAt: future(10, 18),
    endsAt:   future(10, 22),
    capacity: 3000,
    price: 0,
    currency: 'XAF',
    description: 'A free evening of worship featuring gospel choirs and soloists from across Cameroon.',
    metadata: { lineup: ['Cece Winans tribute choir', 'Grace Choir Yaounde', 'Pastor Chris Band'] },
    defaultReminderOffsets: [1440, 120],
  },

  // ── THEATER ────────────────────────────────────────────────────────────────
  {
    title: 'Le Manteau de l\'Exil — Theatre National',
    category: EventCategory.THEATER,
    venue: 'Theatre National, Yaounde',
    startsAt: future(5, 19),
    endsAt:   future(5, 21),
    capacity: 400,
    price: 8000,
    currency: 'XAF',
    description: 'Award-winning play exploring migration and identity, performed by Compagnie des Arts Vivants. A must-see for the Yaounde cultural season.',
    metadata: { runtimeMinutes: 110, hasSeating: true, intermissions: 1 },
    defaultReminderOffsets: [1440, 120],
  },
  {
    title: 'Shakespeare in Pidgin — A Midsummer Night Dream',
    category: EventCategory.THEATER,
    venue: 'Alliance Franco-Camerounaise, Douala',
    startsAt: future(12, 19),
    endsAt:   future(12, 21),
    capacity: 250,
    price: 5000,
    currency: 'XAF',
    description: 'The beloved comedy retold entirely in Cameroonian Pidgin English. Hilarious, poignant, and uniquely ours.',
    metadata: { runtimeMinutes: 95, hasSeating: true, intermissions: 1 },
    defaultReminderOffsets: [1440, 60],
  },
  {
    title: 'Nuit de la Comedie — Stand-Up Showcase',
    category: EventCategory.THEATER,
    venue: 'Salle Omnisports de Wembley, Douala',
    startsAt: future(9, 20),
    endsAt:   future(9, 23),
    capacity: 600,
    price: 6000,
    currency: 'XAF',
    description: 'Cameroon\'s hottest stand-up comedians take the stage for one outrageous evening. Strictly 18+.',
    metadata: { runtimeMinutes: 150, hasSeating: false, intermissions: 2 },
    defaultReminderOffsets: [1440, 60],
  },

  // ── SPORTS ─────────────────────────────────────────────────────────────────
  {
    title: 'Indomitable Lions vs Bafana Bafana — AFCON Qualifier',
    category: EventCategory.SPORTS,
    venue: 'Stade Ahmadou Ahidjo, Yaounde',
    startsAt: future(20, 16),
    endsAt:   future(20, 18),
    capacity: 38000,
    price: 5000,
    currency: 'XAF',
    description: 'Cameroon hosts South Africa in a crunch AFCON qualifier. Come out and roar with the Lions.',
    metadata: { homeTeam: 'Cameroon', awayTeam: 'South Africa', league: 'AFCON Qualifiers', sport: 'football' },
    defaultReminderOffsets: [1440, 120],
  },
  {
    title: 'MTN Basketball League Finals — Douala Derby',
    category: EventCategory.SPORTS,
    venue: 'Palais des Sports de Douala, Douala',
    startsAt: future(16, 18),
    endsAt:   future(16, 21),
    capacity: 5000,
    price: 3000,
    currency: 'XAF',
    description: 'The two Douala powerhouses meet in the national basketball finals. Fast, fierce, and unforgettable.',
    metadata: { homeTeam: 'FAP Douala', awayTeam: 'ASPAC Douala', league: 'MTN Elite One Basketball', sport: 'basketball' },
    defaultReminderOffsets: [1440, 60],
  },
  {
    title: 'Cameroon Open Tennis Championship',
    category: EventCategory.SPORTS,
    venue: 'Tennis Club de Yaounde, Yaounde',
    startsAt: future(30, 9),
    endsAt:   future(30, 18),
    capacity: 1000,
    price: 2000,
    currency: 'XAF',
    description: 'Three days of elite tennis with players from across West and Central Africa competing for the national title.',
    metadata: { homeTeam: 'Cameroon', awayTeam: 'West Africa All-Stars', sport: 'tennis', league: 'Cameroon Open' },
    defaultReminderOffsets: [1440, 60],
  },

  // ── CULTURAL ───────────────────────────────────────────────────────────────
  {
    title: 'FESTAC Douala — Festival of African Arts & Culture',
    category: EventCategory.CULTURAL,
    venue: 'Esplanade du Port, Douala',
    startsAt: future(25, 10),
    endsAt:   future(27, 22),
    capacity: 5000,
    price: 3000,
    currency: 'XAF',
    description: 'A three-day celebration of African arts, crafts, food, dance, and music. Free entry for children under 12.',
    metadata: { theme: 'Roots & Renaissance', dresscode: 'African traditional attire encouraged' },
    defaultReminderOffsets: [10080, 1440],
  },
  {
    title: 'Ngondo Festival 2025',
    category: EventCategory.CULTURAL,
    venue: 'Plage de Bojongo, Wouri, Douala',
    startsAt: future(40, 8),
    endsAt:   future(40, 18),
    capacity: 10000,
    price: 0,
    currency: 'XAF',
    description: 'The legendary Sawa cultural festival celebrating the Wouri river and Bassa/Beti heritage — canoe races, traditional dances, and royal processions.',
    metadata: { theme: 'Water & Ancestry', dresscode: 'Sawa traditional dress' },
    defaultReminderOffsets: [10080, 1440],
  },
  {
    title: 'Yaounde Fashion Week — AW 2025',
    category: EventCategory.CULTURAL,
    venue: 'Hilton Hotel Grand Ballroom, Yaounde',
    startsAt: future(18, 18),
    endsAt:   future(18, 22),
    capacity: 500,
    price: 25000,
    currency: 'XAF',
    description: 'The capital\'s premier fashion event showcasing emerging and established Cameroonian designers. Black-tie affair.',
    metadata: { theme: 'New Horizons', dresscode: 'Black tie / African formal' },
    defaultReminderOffsets: [1440, 120],
  },
  {
    title: 'Makossa Night — Legends Tribute',
    category: EventCategory.CULTURAL,
    venue: 'Institut Francais, Douala',
    startsAt: future(6, 20),
    endsAt:   future(6, 23),
    capacity: 350,
    price: 7000,
    currency: 'XAF',
    description: 'A tribute to Manu Dibango and the golden era of Makossa. Live orchestra, archival footage, and guest vocalists.',
    metadata: { theme: 'Makossa Legacy', dresscode: 'Smart casual' },
    defaultReminderOffsets: [1440, 60],
  },

  // ── OTHER ──────────────────────────────────────────────────────────────────
  {
    title: 'StartupCam Demo Day 2025',
    category: EventCategory.OTHER,
    venue: 'ActivSpaces, Douala',
    startsAt: future(11, 9),
    endsAt:   future(11, 17),
    capacity: 300,
    price: 0,
    currency: 'XAF',
    description: 'Cameroon\'s top tech startups pitch to investors and the public. Food, networking, and live demos.',
    metadata: { type: 'conference', topic: 'Tech & Entrepreneurship' },
    defaultReminderOffsets: [1440, 60],
  },
  {
    title: 'Street Food Festival — Douala Eats',
    category: EventCategory.OTHER,
    venue: 'Boulevard de la Liberte, Douala',
    startsAt: future(8, 12),
    endsAt:   future(8, 22),
    capacity: 2000,
    price: 1000,
    currency: 'XAF',
    description: 'Over 40 food vendors, cooking demos, cocktail bars, and live DJ sets. Celebrate Cameroonian cuisine.',
    metadata: { type: 'food festival', topic: 'Cameroonian Cuisine' },
    defaultReminderOffsets: [1440, 120],
  },
  {
    title: 'Photo Expo — Faces of Cameroon',
    category: EventCategory.OTHER,
    venue: 'Musee National, Yaounde',
    startsAt: future(3, 10),
    endsAt:   future(3, 18),
    capacity: 500,
    price: 0,
    currency: 'XAF',
    description: 'A free photography exhibition documenting everyday life across Cameroon\'s ten regions, shot by 20 young photographers.',
    metadata: { type: 'exhibition', topic: 'Photography & Documentary' },
    defaultReminderOffsets: [1440],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const now = new Date();

  const creator = await prisma.user.upsert({
    where: { email: 'creator@eventful.app' },
    update: { emailVerifiedAt: now },
    create: {
      email: 'creator@eventful.app',
      fullName: 'Demo Creator',
      passwordHash,
      roles: ['CREATOR'],
      emailVerifiedAt: now,
    },
  });

  await prisma.user.upsert({
    where: { email: 'attendee@eventful.app' },
    update: { emailVerifiedAt: now },
    create: {
      email: 'attendee@eventful.app',
      fullName: 'Demo Attendee',
      passwordHash,
      roles: ['EVENTEE'],
      emailVerifiedAt: now,
    },
  });

  console.log(`Creator: ${creator.id}`);

  let created = 0;
  for (const ev of events) {
    await prisma.event.create({
      data: {
        creatorId: creator.id,
        title: ev.title,
        description: ev.description,
        category: ev.category,
        venue: ev.venue,
        startsAt: ev.startsAt,
        endsAt: ev.endsAt,
        capacity: ev.capacity,
        price: ev.price,
        currency: ev.currency,
        shareSlug: slug(ev.title),
        metadata: ev.metadata,
        defaultReminderOffsets: ev.defaultReminderOffsets,
        isPublished: true,
        inDiscovery: true,
      },
    });
    console.log(`  + ${ev.category.padEnd(8)} ${ev.title}`);
    created++;
  }

  console.log(`\nSeeded ${created} events.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
