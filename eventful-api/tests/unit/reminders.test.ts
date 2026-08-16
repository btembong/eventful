// Pure logic tests for reminder scheduling math — no DB, no queues.
// Tests the delay calculation: delay = startsAt - offsetMinutes - now

describe('Reminder offset delay calculation', () => {
  const MINUTE = 60_000;
  const now = Date.now();

  function fireDelay(startsAtMs: number, offsetMinutes: number): number {
    return startsAtMs - offsetMinutes * MINUTE - now;
  }

  it('returns positive delay when reminder fires in the future', () => {
    const startsAt = now + 24 * 60 * MINUTE; // 24 hours from now
    const delay = fireDelay(startsAt, 60);    // remind 60 min before
    expect(delay).toBeGreaterThan(0);
    expect(delay).toBeCloseTo(23 * 60 * MINUTE, -3); // ~23 hours
  });

  it('returns 0 or negative when the reminder time has already passed', () => {
    const startsAt = now + 30 * MINUTE; // 30 min from now
    const delay = fireDelay(startsAt, 60); // remind 60 min before → already past
    expect(delay).toBeLessThanOrEqual(0);
  });

  it('returns exactly 0 when reminder fires right now', () => {
    const startsAt = now + 60 * MINUTE;
    const delay = fireDelay(startsAt, 60);
    // Within a few ms of 0
    expect(Math.abs(delay)).toBeLessThan(50);
  });

  it('larger offset produces an earlier (smaller) delay', () => {
    const startsAt = now + 10 * 60 * MINUTE; // 10 h from now
    const delay60  = fireDelay(startsAt, 60);  // 60 min before → fires in 9h
    const delay120 = fireDelay(startsAt, 120); // 2h before → fires in 8h
    expect(delay60).toBeGreaterThan(delay120);
  });
});

// ── humanOffset format (mirrors the reminderEmailHtml logic) ─────────────────

function humanOffset(offsetMinutes: number): string {
  if (offsetMinutes >= 1440) return `${Math.round(offsetMinutes / 1440)} day(s)`;
  if (offsetMinutes >= 60)   return `${Math.round(offsetMinutes / 60)} hour(s)`;
  return `${offsetMinutes} minute(s)`;
}

describe('humanOffset formatting', () => {
  it('formats minutes correctly', () => {
    expect(humanOffset(15)).toBe('15 minute(s)');
    expect(humanOffset(59)).toBe('59 minute(s)');
  });

  it('formats hours correctly', () => {
    expect(humanOffset(60)).toBe('1 hour(s)');
    expect(humanOffset(120)).toBe('2 hour(s)');
    expect(humanOffset(90)).toBe('2 hour(s)'); // Math.round(1.5)
  });

  it('formats days correctly', () => {
    expect(humanOffset(1440)).toBe('1 day(s)');
    expect(humanOffset(2880)).toBe('2 day(s)');
    expect(humanOffset(10080)).toBe('7 day(s)');
  });

  it('prefers days over hours for values >= 1440', () => {
    expect(humanOffset(1440)).not.toContain('hour');
  });
});
