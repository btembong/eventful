/**
 * Eventful — Email templates.
 *
 * Design language: clean, ticket-first.
 *  • Orange accent bar at card top
 *  • White card on #F4F4F4 background
 *  • Table-based layout (Outlook-safe); inline styles only
 *  • Orange CTA buttons
 *  • Short, action-first copy
 */

const APP = () => process.env.APP_BASE_URL ?? 'http://localhost:3000';

// ── Brand tokens ──────────────────────────────────────────────────────────────
const ORANGE   = '#F07200';
const CHARCOAL = '#333333';
const BG       = '#F4F4F4';
const BORDER   = '#E8E8E8';
const TEXT     = '#1A1A1A';
const MUTED    = '#6B7280';

// ── Shell ─────────────────────────────────────────────────────────────────────

export function shell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Eventful</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};padding:48px 16px 64px;">
  <tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

    <!-- Orange accent bar -->
    <tr>
      <td height="4" style="background:${ORANGE};border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
    </tr>

    <!-- Logo row -->
    <tr>
      <td style="background:#ffffff;padding:22px 36px 20px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <span style="font-size:20px;font-weight:700;letter-spacing:-0.3px;color:${CHARCOAL};">event</span><span style="font-size:20px;font-weight:700;letter-spacing:-0.3px;color:${ORANGE};">ful</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="font-size:10px;font-weight:600;letter-spacing:1.6px;text-transform:uppercase;color:#AAAAAA;">your tickets, your events</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Thin rule -->
    <tr>
      <td style="background:#ffffff;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};padding:0 36px;">
        <div style="height:1px;background:${BORDER};"></div>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:#ffffff;padding:32px 36px 36px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
        ${body}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#F8F8F8;border:1px solid ${BORDER};border-top:none;border-radius:0 0 8px 8px;padding:20px 36px 24px;">
        <p style="margin:0 0 6px;font-size:11px;color:#AAAAAA;line-height:1.8;text-align:center;">
          <span style="font-weight:700;color:${CHARCOAL};">event</span><span style="font-weight:700;color:${ORANGE};">ful</span>
          &nbsp;·&nbsp;
          <a href="${APP()}" style="color:#AAAAAA;text-decoration:none;">eventful.app</a>
        </p>
        <p style="margin:0 0 8px;font-size:11px;color:#AAAAAA;text-align:center;">
          <a href="https://www.instagram.com/eventful" style="color:#AAAAAA;text-decoration:none;">Instagram</a>
          &nbsp;·&nbsp;
          <a href="https://www.facebook.com/eventful" style="color:#AAAAAA;text-decoration:none;">Facebook</a>
          &nbsp;·&nbsp;
          <a href="https://x.com/eventful" style="color:#AAAAAA;text-decoration:none;">X</a>
          &nbsp;·&nbsp; @eventful
        </p>
        <p style="margin:0;font-size:10px;color:#BBBBBB;text-align:center;">
          Sent because of your activity on Eventful. Reply to this email with any questions.
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Primitives ────────────────────────────────────────────────────────────────

export function label(text: string): string {
  return `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${ORANGE};">${text}</p>`;
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:${TEXT};letter-spacing:-0.4px;line-height:1.25;">${text}</h1>`;
}

export function p(text: string): string {
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#3D3D3D;">${text}</p>`;
}

export function pSmall(text: string): string {
  return `<p style="margin:0;font-size:12px;line-height:1.7;color:${MUTED};">${text}</p>`;
}

export function greeting(name: string): string {
  return `<p style="margin:0 0 24px;font-size:15px;color:#3D3D3D;">Hi <strong style="color:${TEXT};">${name}</strong>,</p>`;
}

export function divider(): string {
  return `<div style="height:1px;background:${BORDER};margin:28px 0;"></div>`;
}

/** Orange CTA button */
export function btn(text: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr>
      <td bgcolor="${ORANGE}" style="background:${ORANGE};border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.2px;border-radius:8px;">${text}</a>
      </td>
    </tr>
  </table>`;
}

/** Key / value data row */
export function row(labelText: string, value: string, last = false): string {
  return `<tr>
    <td style="padding:11px 0;${last ? '' : `border-bottom:1px solid ${BORDER};`}font-size:12px;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;color:${MUTED};width:36%;vertical-align:top;">${labelText}</td>
    <td style="padding:11px 0 11px 20px;${last ? '' : `border-bottom:1px solid ${BORDER};`}font-size:14px;font-weight:500;color:${TEXT};vertical-align:top;">${value}</td>
  </tr>`;
}

export function infoTable(rows: string[]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:4px 0 28px;">
    ${rows.join('')}
  </table>`;
}

/** Notice strip */
export function notice(text: string, type: 'info' | 'warning' | 'error'): string {
  const map = {
    info:    { bg: '#FFF7ED', left: ORANGE,    color: '#92400E' },
    warning: { bg: '#FFF7ED', left: ORANGE,    color: '#92400E' },
    error:   { bg: '#FEE9E7', left: '#DC2626', color: '#7F1D1D' },
  };
  const s = map[type];
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
    <tr>
      <td style="background:${s.bg};border-left:3px solid ${s.left};border-radius:0 4px 4px 0;padding:12px 16px;font-size:13px;line-height:1.55;color:${s.color};">${text}</td>
    </tr>
  </table>`;
}

/** Centered QR code block */
export function qrBlock(qrImageUrl: string, bookingId: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
    <tr>
      <td align="center">
        <div style="display:inline-block;border:2px solid ${BORDER};border-radius:12px;padding:16px;background:#FAFAFA;">
          <img src="${qrImageUrl}" width="190" height="190" alt="Entry QR code" style="display:block;border-radius:4px;">
          <p style="margin:10px 0 0;font-size:10px;color:#AAAAAA;text-align:center;font-family:monospace;letter-spacing:0.08em;">${bookingId}</p>
        </div>
        <p style="margin:10px 0 0;font-size:12px;color:${MUTED};">Present this QR code at the door</p>
      </td>
    </tr>
  </table>`;
}

/** Orange event banner (event title + date + venue) */
export function eventBanner(title: string, when: string, venue: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:-32px -36px 32px;width:calc(100% + 72px);">
    <tr>
      <td style="background:${ORANGE};padding:20px 36px;text-align:center;">
        <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">${title}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#FFE0B2;">${when}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#FFE0B2;">${venue}</p>
      </td>
    </tr>
  </table>`;
}

// ── Templates ─────────────────────────────────────────────────────────────────

/** Ticket purchase confirmation — sent immediately after payment */
export function tplReceipt(opts: {
  fullName: string;
  eventTitle: string;
  venue: string;
  startsAt: Date;
  price: string;
  currency: string;
  ticketId: string;
  qrImageUrl: string;
  confirmationMessage?: string;
}): string {
  const when   = opts.startsAt.toLocaleString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const amount = opts.price === '0' ? 'Free' : `${opts.currency} ${Number(opts.price).toLocaleString()}`;
  const shortId = opts.ticketId.split('-')[0].toUpperCase();

  return shell(
    eventBanner(opts.eventTitle, when, opts.venue) +
    greeting(opts.fullName) +
    label('Booking confirmed') +
    h1('You\'re going!') +
    p('Your ticket has been confirmed. Your entry QR code is below — a PDF copy is attached to this email.') +
    qrBlock(opts.qrImageUrl, shortId) +
    infoTable([
      row('Event',        opts.eventTitle),
      row('Date &amp; time', when),
      row('Venue',        opts.venue),
      row('Amount paid',  `<strong style="color:${ORANGE};">${amount}</strong>`),
      row('Ticket ID',    `<span style="font-family:monospace;font-size:12px;">${opts.ticketId}</span>`, true),
    ]) +
    (opts.confirmationMessage
      ? notice(`<strong>Message from the organiser:</strong><br>${opts.confirmationMessage.replace(/\n/g, '<br>')}`, 'info')
      : '') +
    divider() +
    pSmall('Keep this email safe — the QR code is your entry pass. For any issues, reply to this email.')
  );
}

/** Event reminder — sent N hours/days before the event */
export function tplReminder(opts: {
  fullName: string;
  eventTitle: string;
  venue: string;
  startsAt: Date;
  offsetMinutes: number;
  ticketId: string;
  qrImageUrl: string;
}): string {
  const humanOffset =
    opts.offsetMinutes >= 1440
      ? `${Math.round(opts.offsetMinutes / 1440)} day${Math.round(opts.offsetMinutes / 1440) !== 1 ? 's' : ''}`
      : opts.offsetMinutes >= 60
        ? `${Math.round(opts.offsetMinutes / 60)} hour${Math.round(opts.offsetMinutes / 60) !== 1 ? 's' : ''}`
        : `${opts.offsetMinutes} minutes`;

  const when    = opts.startsAt.toLocaleString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const shortId = opts.ticketId.split('-')[0].toUpperCase();

  return shell(
    // Countdown band
    `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:-32px -36px 32px;width:calc(100% + 72px);">
      <tr>
        <td style="background:${CHARCOAL};padding:20px 36px;text-align:center;">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#888;">Starting in</p>
          <p style="margin:6px 0 0;font-size:30px;font-weight:800;color:${ORANGE};">${humanOffset}</p>
          <p style="margin:8px 0 0;font-size:16px;font-weight:600;color:#ffffff;">${opts.eventTitle}</p>
        </td>
      </tr>
    </table>` +
    greeting(opts.fullName) +
    label('Event reminder') +
    h1('Don\'t forget — you\'re going!') +
    p('Your event is coming up soon. Your QR entry code is below — have it ready at the door.') +
    qrBlock(opts.qrImageUrl, shortId) +
    infoTable([
      row('Date &amp; time', `<strong>${when}</strong>`),
      row('Venue', opts.venue, true),
    ]) +
    divider() +
    pSmall('See you there! If plans change, contact the event organiser directly.')
  );
}

/** Organiser broadcast to all attendees of an event */
export function tplBroadcast(opts: {
  fullName: string;
  eventTitle: string;
  message: string;
}): string {
  return shell(
    greeting(opts.fullName) +
    label('Message from the organiser') +
    h1(`Update: ${opts.eventTitle}`) +
    p('The organiser of your upcoming event has sent you a message:') +
    `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#FFF7ED;border-left:3px solid ${ORANGE};border-radius:0 6px 6px 0;padding:16px 20px;font-size:14px;line-height:1.65;color:#3D3D3D;">
          ${opts.message.replace(/\n/g, '<br>')}
        </td>
      </tr>
    </table>` +
    btn('View my ticket', `${APP()}/dashboard/my-tickets`) +
    divider() +
    pSmall('You received this because you hold a ticket for this event. For queries, reply to this email.')
  );
}

/** Email address verification — sent on registration */
export function tplVerifyEmail(opts: { fullName: string; verifyUrl: string }): string {
  return shell(
    greeting(opts.fullName) +
    label('Action required') +
    h1('Verify your email address') +
    p('Thanks for joining Eventful! Click the button below to verify your email and activate your account. This link expires in <strong>24 hours</strong>.') +
    btn('Verify my email', opts.verifyUrl) +
    divider() +
    p('If you didn\'t create an Eventful account, you can safely ignore this email — nothing will change.') +
    pSmall('For security, never share this link with anyone.')
  );
}

/** Bootcamp application — welcome + next steps */
export function tplBootcampWelcome(opts: {
  fullName:      string;
  paymentPlan:   'FULL' | 'INSTALLMENT';
  paymentMethod: string;
  cohort:        string;
}): string {
  const amountDue  = opts.paymentPlan === 'FULL' ? '$250' : '$135 (first installment)';
  const totalCost  = opts.paymentPlan === 'FULL' ? '$250' : '$270 ($135 × 2)';
  const deadline   = opts.paymentPlan === 'INSTALLMENT' ? ' The second instalment of $135 is due by <strong>September 16</strong>.' : '';
  return shell(
    greeting(opts.fullName) +
    label('Bootcamp · Cohort ' + opts.cohort) +
    h1('Your application is in!') +
    p('Thank you for applying to the <strong>Intensive Web Development Bootcamp</strong> (September 2 – October 30, 2026). We\'ve received your application and will review it within <strong>48 hours</strong>.') +
    `<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-collapse:collapse;">
      <tr><td style="padding:12px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${MUTED};">Payment plan</td><td style="padding:12px 0;border-bottom:1px solid ${BORDER};font-size:14px;font-weight:700;color:${TEXT};text-align:right;">${opts.paymentPlan === 'FULL' ? 'Pay in full' : '2 Installments'} — ${totalCost}</td></tr>
      <tr><td style="padding:12px 0;border-bottom:1px solid ${BORDER};font-size:14px;color:${MUTED};">Due today</td><td style="padding:12px 0;border-bottom:1px solid ${BORDER};font-size:14px;font-weight:700;color:${ORANGE};text-align:right;">${amountDue}</td></tr>
      <tr><td style="padding:12px 0;font-size:14px;color:${MUTED};">Payment method</td><td style="padding:12px 0;font-size:14px;font-weight:600;color:${TEXT};text-align:right;">${opts.paymentMethod}</td></tr>
    </table>` +
    p('Once your application is accepted, we\'ll send you payment instructions via a separate email. Your seat is only reserved once payment is confirmed.' + deadline) +
    h1('What happens next?') +
    `<ol style="margin:0 0 20px 0;padding-left:20px;font-size:15px;line-height:1.8;color:${TEXT};">
      <li>We review your application (within 48 hrs)</li>
      <li>You receive an acceptance email with payment instructions</li>
      <li>You complete payment to lock in your seat</li>
      <li>You receive your onboarding kit &amp; Discord invite before September 2</li>
    </ol>` +
    divider() +
    p('Questions? Reply to this email or reach us on WhatsApp: <a href="https://wa.me/23769007505" style="color:${ORANGE};font-weight:600;">+237 690 07 505</a>') +
    pSmall('Digos Technologies · Bootcamp Division · bootcamp@digostechnologies.com')
  );
}

/** Password reset link — expires in 15 minutes */
export function tplPasswordReset(opts: { fullName: string; resetUrl: string }): string {
  return shell(
    greeting(opts.fullName) +
    label('Security') +
    h1('Reset your password') +
    p('We received a request to reset your Eventful password. Click the button below to choose a new one. This link expires in <strong>15 minutes</strong> and can only be used once.') +
    btn('Reset my password', opts.resetUrl) +
    divider() +
    p('If you didn\'t request this, you can safely ignore this email — your password won\'t change.') +
    pSmall('Never share this link. Eventful staff will never ask for it.')
  );
}
