import { z } from 'zod';

// Per-category metadata schemas validated before every write to Event.metadata.
// Never write Event.metadata without running metadataSchemaByCategory[event.category].parse(metadata).

// Lineup member — accepts either a plain string (legacy) or a rich object
const lineupMemberSchema = z.union([
  z.string(),
  z.object({
    name:     z.string().min(1),
    photoUrl: z.string().optional(),
    role:     z.string().optional(),
  }),
]);

const concertSchema = z.object({
  lineup: z.array(lineupMemberSchema).min(0).optional(),
  ageRestriction: z.number().int().min(0).optional(),
  doors: z.string().optional(),
});

const theaterSchema = z.object({
  lineup: z.array(lineupMemberSchema).min(0).optional(),
  runtimeMinutes: z.number().int().positive().optional(),
  hasSeating: z.boolean().default(true),
  seatingChart: z.string().url().optional(),
  intermissions: z.number().int().min(0).default(0),
});

const sportsSchema = z.object({
  lineup: z.array(lineupMemberSchema).min(0).optional(),
  homeTeam: z.string().optional(),
  awayTeam: z.string().optional(),
  league: z.string().optional(),
  sport: z.string().optional(),
});

const culturalSchema = z.object({
  lineup: z.array(lineupMemberSchema).min(0).optional(),
  theme: z.string().optional(),
  dresscode: z.string().optional(),
});

const otherSchema = z.record(z.unknown()); // free-form for uncategorised events

export const metadataSchemaByCategory = {
  CONCERT: concertSchema,
  THEATER: theaterSchema,
  SPORTS: sportsSchema,
  CULTURAL: culturalSchema,
  OTHER: otherSchema,
} as const;

export type EventCategory = keyof typeof metadataSchemaByCategory;
export type ConcertMetadata = z.infer<typeof concertSchema>;
export type TheaterMetadata = z.infer<typeof theaterSchema>;
export type SportsMetadata = z.infer<typeof sportsSchema>;
export type CulturalMetadata = z.infer<typeof culturalSchema>;
