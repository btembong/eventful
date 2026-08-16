import crypto from 'crypto';
import QRCode from 'qrcode';
import env from '@/config/env';

// QR payload: HMAC-SHA256(ticketId:eventId, QR_SIGNING_SECRET)
// Never a raw ticket ID — prevents forged or replayed codes.

export const qrService = {
  sign(ticketId: string, eventId: string): string {
    const payload = `${ticketId}:${eventId}`;
    const sig = crypto.createHmac('sha256', env.QR_SIGNING_SECRET).update(payload).digest('hex');
    return `${payload}:${sig}`;
  },

  verify(qrPayload: string, expectedEventId: string): { valid: boolean; ticketId?: string } {
    const parts = qrPayload.split(':');
    if (parts.length !== 3) return { valid: false };

    const [ticketId, eventId, sig] = parts;

    if (eventId !== expectedEventId) return { valid: false };

    const expected = crypto
      .createHmac('sha256', env.QR_SIGNING_SECRET)
      .update(`${ticketId}:${eventId}`)
      .digest('hex');

    const valid = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    return valid ? { valid: true, ticketId } : { valid: false };
  },

  async generatePng(qrPayload: string): Promise<Buffer> {
    return QRCode.toBuffer(qrPayload, { type: 'png', width: 400 });
  },
};
