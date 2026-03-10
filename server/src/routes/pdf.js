import { Router } from 'express';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

const ACCENT = rgb(0.98, 0.45, 0.09); // bear orange
const BLACK  = rgb(0.08, 0.08, 0.08);
const MUTED  = rgb(0.45, 0.45, 0.45);
const BORDER = rgb(0.88, 0.88, 0.88);
const BG     = rgb(0.97, 0.97, 0.97);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

function clamp(val) { return Math.min(Math.max(val, 0), 1); }

class PDFWriter {
  constructor(page, fonts, startY) {
    this.page = page;
    this.fonts = fonts;
    this.y = startY;
    this.margin = MARGIN;
  }

  gap(n = 8) { this.y -= n; }

  text(str, { x = this.margin, size = 11, font = 'regular', color = BLACK, maxWidth } = {}) {
    if (this.y < 60) return;
    const f = this.fonts[font];
    let s = String(str ?? '');
    if (maxWidth) {
      while (s.length > 0 && f.widthOfTextAtSize(s, size) > maxWidth) s = s.slice(0, -1);
    }
    this.page.drawText(s, { x, y: this.y, size, font: f, color });
    this.y -= (size + 5);
  }

  label(str) {
    this.text(str.toUpperCase(), { size: 8, font: 'bold', color: MUTED });
  }

  value(str) {
    this.text(String(str ?? '—'), { size: 11, font: 'regular', color: BLACK });
    this.gap(4);
  }

  field(label, value) {
    if (!value) return;
    this.label(label);
    this.value(value);
  }

  divider() {
    this.gap(4);
    this.page.drawLine({ start: { x: this.margin, y: this.y }, end: { x: PAGE_W - this.margin, y: this.y }, thickness: 0.5, color: BORDER });
    this.gap(10);
  }

  badge(str) {
    const f = this.fonts.bold;
    const size = 8;
    const w = f.widthOfTextAtSize(str, size) + 12;
    const h = 16;
    this.page.drawRectangle({ x: this.margin, y: this.y - 4, width: w, height: h, color: ACCENT, borderWidth: 0 });
    this.page.drawText(str, { x: this.margin + 6, y: this.y, size, font: f, color: rgb(1, 1, 1) });
    this.y -= (h + 6);
  }

  twoCol(pairs) {
    const colW = CONTENT_W / 2 - 8;
    const startY = this.y;
    let leftY = startY;
    let rightY = startY;
    pairs.forEach(([label, value], i) => {
      if (!value) return;
      const x = i % 2 === 0 ? this.margin : this.margin + colW + 16;
      const ref = i % 2 === 0 ? 'left' : 'right';
      const curY = ref === 'left' ? leftY : rightY;

      this.page.drawText(label.toUpperCase(), { x, y: curY, size: 8, font: this.fonts.bold, color: MUTED });
      const nextY = curY - 13;
      this.page.drawText(String(value), { x, y: nextY, size: 11, font: this.fonts.regular, color: BLACK });

      if (ref === 'left') leftY = nextY - 18;
      else rightY = nextY - 18;
    });
    this.y = Math.min(leftY, rightY) - 4;
  }

  summaryBox(rows) {
    const rowH = 24;
    const boxH = rows.length * rowH + 16;
    const boxY = this.y - boxH;
    this.page.drawRectangle({ x: this.margin, y: boxY, width: CONTENT_W, height: boxH, color: BG, borderColor: BORDER, borderWidth: 0.5 });
    let ry = this.y - 16;
    rows.forEach(([label, value]) => {
      this.page.drawText(label, { x: this.margin + 12, y: ry, size: 10, font: this.fonts.regular, color: MUTED });
      const vStr = String(value ?? '—');
      const vW = this.fonts.bold.widthOfTextAtSize(vStr, 10);
      this.page.drawText(vStr, { x: PAGE_W - this.margin - 12 - vW, y: ry, size: 10, font: this.fonts.bold, color: BLACK });
      ry -= rowH;
    });
    this.y = boxY - 12;
  }
}

function buildTitle(type) {
  return {
    rfi: 'REQUEST FOR INFORMATION',
    change_order: 'CHANGE ORDER',
    submittal: 'SUBMITTAL',
    lien_waiver: 'LIEN WAIVER',
    pay_app: 'PAY APPLICATION',
    meeting_minutes: 'MEETING MINUTES',
    notice_to_owner: 'NOTICE TO OWNER',
    subcontract: 'SUBCONTRACT AGREEMENT',
    other: 'DOCUMENT',
  }[type] || 'DOCUMENT';
}

async function renderDoc(doc, profile) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };

  const c = typeof doc.content === 'string'
    ? { text: doc.content }
    : (doc.content?.text !== undefined ? doc.content : doc.content || {});

  const w = new PDFWriter(page, fonts, PAGE_H - MARGIN);

  // Company header
  const company = profile?.company_name || 'Company Name';
  page.drawText(company, { x: MARGIN, y: w.y, size: 14, font: bold, color: BLACK });
  w.y -= 18;

  if (profile?.address) {
    page.drawText(`${profile.address}${profile.city ? ', ' + profile.city : ''}${profile.state ? ' ' + profile.state : ''}${profile.zip ? ' ' + profile.zip : ''}`, { x: MARGIN, y: w.y, size: 9, font: regular, color: MUTED });
    w.y -= 13;
  }
  if (profile?.phone || profile?.email) {
    const contact = [profile.phone, profile.email].filter(Boolean).join('  |  ');
    page.drawText(contact, { x: MARGIN, y: w.y, size: 9, font: regular, color: MUTED });
    w.y -= 13;
  }

  w.divider();
  w.badge(buildTitle(doc.type));
  w.gap(4);

  // Title + project
  page.drawText(doc.title, { x: MARGIN, y: w.y, size: 16, font: bold, color: BLACK, maxWidth: CONTENT_W });
  w.y -= 20;
  if (doc.project_name || c.project_name) {
    page.drawText(doc.project_name || c.project_name, { x: MARGIN, y: w.y, size: 10, font: regular, color: MUTED });
    w.y -= 16;
  }
  w.divider();

  // Content by type
  if (c.text) {
    // Plain text fallback
    const lines = c.text.split('\n');
    for (const line of lines) {
      if (w.y < 80) break;
      w.text(line.slice(0, 90), { size: 10 });
    }
  } else {
    switch (doc.type) {
      case 'rfi':
        w.twoCol([['Addressed To', c.addressed_to], ['Submitted By', c.submitted_by], ['Date', c.date], ['Date Needed', c.date_needed], ['RFI #', c.rfi_number], ['Project', c.project_name]]);
        w.gap(8);
        w.field('Question / Request', c.question);
        if (c.response) w.field('Response', c.response);
        break;

      case 'change_order':
        w.twoCol([['Contractor', c.contractor], ['Owner', c.owner], ['Date', c.date], ['CO #', c.co_number]]);
        w.gap(8);
        w.field('Description', c.description);
        w.field('Reason', c.reason);
        w.gap(4);
        w.summaryBox([['Cost Change', c.cost_change], ['Days Added', c.days_added]]);
        break;

      case 'submittal':
        w.twoCol([['Spec Section', c.spec_section], ['Supplier', c.supplier], ['Submitted By', c.submitted_by], ['Revision', c.revision], ['Date', c.date], ['Submittal #', c.submittal_number]]);
        w.gap(8);
        w.field('Description', c.description);
        break;

      case 'lien_waiver': {
        const typeLabel = {
          conditional_progress: 'Conditional Waiver — Progress Payment',
          unconditional_progress: 'Unconditional Waiver — Progress Payment',
          conditional_final: 'Conditional Waiver — Final Payment',
          unconditional_final: 'Unconditional Waiver — Final Payment',
        }[c.type] || c.type || '';
        if (typeLabel) w.field('Type', typeLabel);
        w.twoCol([['Claimant', c.claimant], ['Owner', c.owner], ['Property', c.property_address], ['Project', c.project_name], ['Through Date', c.through_date], ['Amount', c.amount]]);
        break;
      }

      case 'pay_app':
        w.twoCol([['Contractor', c.contractor], ['Owner', c.owner], ['Architect', c.architect], ['Period To', c.period_to]]);
        w.gap(8);
        w.summaryBox([['Contract Amount', c.contract_amount], ['Work Completed', c.work_completed], ['Retainage %', c.retainage_percent], ['Previous Payments', c.previous_payments]]);
        break;

      case 'meeting_minutes':
        w.field('Date', c.meeting_date);
        w.field('Location', c.location);
        w.field('Attendees', Array.isArray(c.attendees) ? c.attendees.join(', ') : c.attendees);
        w.gap(4);
        w.field('Agenda', Array.isArray(c.agenda_items) ? c.agenda_items.join('\n') : c.agenda_items);
        w.field('Action Items', Array.isArray(c.action_items) ? c.action_items.join('\n') : c.action_items);
        w.field('Next Meeting', c.next_meeting);
        break;

      case 'notice_to_owner':
        w.twoCol([['Owner', c.owner_name], ['Owner Address', c.owner_address], ['Contractor', c.contractor_name], ['Contractor Address', c.contractor_address], ['Property', c.property_address], ['Date', c.date]]);
        if (c.lender_name) w.field('Lender', c.lender_name);
        w.gap(4);
        w.field('Services / Materials', c.services_description);
        break;

      case 'subcontract':
        w.twoCol([['General Contractor', c.general_contractor], ['Subcontractor', c.subcontractor], ['Start Date', c.start_date], ['Completion Date', c.completion_date], ['Contract Value', c.contract_value], ['Payment Terms', c.payment_terms]]);
        w.gap(8);
        w.field('Scope of Work', c.scope_of_work);
        if (c.insurance_requirements) w.field('Insurance Requirements', c.insurance_requirements);
        break;

      default:
        w.text(JSON.stringify(c, null, 2).slice(0, 500), { size: 9 });
    }
  }

  // Footer
  const footerY = 36;
  page.drawLine({ start: { x: MARGIN, y: footerY + 14 }, end: { x: PAGE_W - MARGIN, y: footerY + 14 }, thickness: 0.5, color: BORDER });
  page.drawText(`Generated by ConstructionBear.AI  |  ${new Date().toLocaleDateString()}`, { x: MARGIN, y: footerY, size: 8, font: regular, color: MUTED });

  return pdfDoc.save();
}

// GET /pdf/:id — download PDF for a document
router.get('/:id', requireAuth, async (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  const parsedDoc = { ...doc, content: JSON.parse(doc.content_json) };

  try {
    const pdfBytes = await renderDoc(parsedDoc, profile);
    const filename = `${doc.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` });
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

export default router;
