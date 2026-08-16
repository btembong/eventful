import PDFDocument from 'pdfkit';

export interface TicketPdfParams {
  fullName:            string;
  eventTitle:          string;
  venue:               string;
  startsAt:            Date;
  price:               string;
  currency:            string;
  ticketId:            string;
  qrPngBuffer:         Buffer;
  confirmationMessage?: string;
}

/**
 * Generate a PDF ticket and return it as a Buffer.
 */
export async function generateTicketPdf(params: TicketPdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const orange  = '#F07200';
    const charcoal = '#333333';
    const gray    = '#6b7280';
    const light   = '#f0f0f0';

    const W = doc.page.width;

    // ── Header bar ──────────────────────────────────────────────────────────
    doc.rect(0, 0, W, 70).fill(charcoal);
    doc.fillColor(orange).fontSize(18).font('Helvetica-Bold')
       .text('Eventful', 40, 18);
    doc.fillColor('#aaaaaa').fontSize(10).font('Helvetica')
       .text('EVENT TICKET', 40, 42);

    // ── Orange event title band ──────────────────────────────────────────────
    doc.rect(0, 70, W, 60).fill(orange);
    doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold')
       .text(params.eventTitle, 40, 80, { width: W - 80, ellipsis: true });

    const when = params.startsAt.toLocaleString('en-GB', {
      weekday: 'short', year: 'numeric', month: 'short',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    doc.fillColor('#fff3e0').fontSize(9).font('Helvetica')
       .text(when, 40, 102, { width: W - 80 });

    // ── QR code (right column) ───────────────────────────────────────────────
    const qrSize = 120;
    const qrX = W - 40 - qrSize;
    const qrY = 145;
    doc.rect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16).fill(light);
    doc.image(params.qrPngBuffer, qrX, qrY, { width: qrSize, height: qrSize });
    doc.fillColor(gray).fontSize(7).font('Helvetica')
       .text('Scan at entry', qrX - 8, qrY + qrSize + 10, { width: qrSize + 16, align: 'center' });

    // ── Details (left column) ────────────────────────────────────────────────
    const colW = qrX - 60;
    let y = 145;

    const row = (label: string, value: string) => {
      doc.fillColor(gray).fontSize(8).font('Helvetica')
         .text(label.toUpperCase(), 40, y, { width: colW });
      doc.fillColor(charcoal).fontSize(10).font('Helvetica-Bold')
         .text(value, 40, y + 12, { width: colW });
      y += 38;
    };

    row('Attendee',   params.fullName);
    row('Venue',      params.venue);
    row('Amount paid', params.price === '0' ? 'Free' : `${params.currency} ${Number(params.price).toLocaleString()}`);

    // ── Divider ──────────────────────────────────────────────────────────────
    const divY = Math.max(y, qrY + qrSize + 40) + 10;
    doc.moveTo(40, divY).lineTo(W - 40, divY).strokeColor(light).lineWidth(1).stroke();

    // ── Ticket ID ────────────────────────────────────────────────────────────
    doc.fillColor(gray).fontSize(8).font('Helvetica')
       .text('TICKET ID', 40, divY + 12);
    doc.fillColor(charcoal).fontSize(8).font('Helvetica')
       .text(params.ticketId, 40, divY + 24, { width: W - 80 });

    // ── Confirmation message ──────────────────────────────────────────────────
    if (params.confirmationMessage) {
      const msgY = divY + 52;
      doc.rect(32, msgY, W - 64, 1).fill(orange);
      doc.fillColor(orange).fontSize(8).font('Helvetica-Bold')
         .text('FROM THE ORGANISER', 40, msgY + 8);
      doc.fillColor(charcoal).fontSize(9).font('Helvetica')
         .text(params.confirmationMessage, 40, msgY + 22, { width: W - 80 });
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 36;
    doc.rect(0, footerY, W, 36).fill('#f9f9f9');
    doc.fillColor('#9ca3af').fontSize(8).font('Helvetica')
       .text('Keep this ticket safe. The QR code is your entry pass.', 40, footerY + 12, {
         width: W - 80, align: 'center',
       });

    doc.end();
  });
}
