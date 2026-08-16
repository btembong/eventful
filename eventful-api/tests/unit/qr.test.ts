import { qrService } from '@/lib/qr';

const TICKET_ID = '11111111-1111-1111-1111-111111111111';
const EVENT_ID  = '22222222-2222-2222-2222-222222222222';
const OTHER_ID  = '33333333-3333-3333-3333-333333333333';

describe('qrService.sign', () => {
  it('produces a colon-delimited string with 3 segments', () => {
    const payload = qrService.sign(TICKET_ID, EVENT_ID);
    expect(payload.split(':').length).toBe(3);
  });

  it('embeds ticketId and eventId in the payload', () => {
    const payload = qrService.sign(TICKET_ID, EVENT_ID);
    const [t, e] = payload.split(':');
    expect(t).toBe(TICKET_ID);
    expect(e).toBe(EVENT_ID);
  });

  it('produces a deterministic signature (same inputs → same output)', () => {
    expect(qrService.sign(TICKET_ID, EVENT_ID)).toBe(qrService.sign(TICKET_ID, EVENT_ID));
  });

  it('produces a different signature for different ticketId', () => {
    expect(qrService.sign(TICKET_ID, EVENT_ID)).not.toBe(qrService.sign(OTHER_ID, EVENT_ID));
  });
});

describe('qrService.verify', () => {
  it('returns valid=true for a correctly signed payload', () => {
    const payload = qrService.sign(TICKET_ID, EVENT_ID);
    const result  = qrService.verify(payload, EVENT_ID);
    expect(result.valid).toBe(true);
    expect(result.ticketId).toBe(TICKET_ID);
  });

  it('returns valid=false when the expected eventId does not match', () => {
    const payload = qrService.sign(TICKET_ID, EVENT_ID);
    const result  = qrService.verify(payload, OTHER_ID);
    expect(result.valid).toBe(false);
    expect(result.ticketId).toBeUndefined();
  });

  it('returns valid=false for a tampered signature', () => {
    const payload = qrService.sign(TICKET_ID, EVENT_ID);
    const tampered = payload.slice(0, -4) + 'dead'; // corrupt last 4 hex chars
    const result   = qrService.verify(tampered, EVENT_ID);
    expect(result.valid).toBe(false);
  });

  it('returns valid=false for a payload with wrong number of segments', () => {
    expect(qrService.verify('only:two', EVENT_ID).valid).toBe(false);
    expect(qrService.verify('one', EVENT_ID).valid).toBe(false);
    expect(qrService.verify('a:b:c:d', EVENT_ID).valid).toBe(false);
  });

  it('returns valid=false for an empty string', () => {
    expect(qrService.verify('', EVENT_ID).valid).toBe(false);
  });
});
