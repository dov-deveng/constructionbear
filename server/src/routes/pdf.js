import { Router } from 'express';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

// ── Color palette ────────────────────────────────────────────────────────────
const ACCENT      = rgb(0.98, 0.45, 0.09);   // bear orange
const ACCENT_DARK = rgb(0.14, 0.18, 0.26);   // dark navy header
const BLACK       = rgb(0.08, 0.08, 0.08);
const DARK        = rgb(0.18, 0.18, 0.18);
const MUTED       = rgb(0.45, 0.45, 0.45);
const LIGHT       = rgb(0.62, 0.62, 0.62);
const BORDER      = rgb(0.78, 0.78, 0.78);
const BG          = rgb(0.96, 0.96, 0.97);
const WHITE       = rgb(1, 1, 1);
const CELL_BG     = rgb(0.975, 0.975, 0.98);

// ── Page constants ────────────────────────────────────────────────────────────
const PAGE_W    = 612;
const PAGE_H    = 792;
const MARGIN    = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H  = 48;
const BODY_TOP  = PAGE_H - MARGIN;
const BODY_BOT  = FOOTER_H + 12;

// ── Layout engine ─────────────────────────────────────────────────────────────
class Doc {
  constructor(page, fonts) {
    this.page  = page;
    this.fonts = fonts;
    this.y     = BODY_TOP;
  }

  // ── primitives ──

  _text(str, x, y, size, font, color) {
    const s = String(str ?? '').slice(0, 200);
    if (!s) return;
    this.page.drawText(s, { x, y, size, font, color });
  }

  _line(x1, y1, x2, y2, thickness = 0.5, color = BORDER) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness, color });
  }

  _rect(x, y, w, h, { fill, border, borderW = 0.5 } = {}) {
    const opts = { x, y, width: w, height: h };
    if (fill)   opts.color = fill;
    if (border) { opts.borderColor = border; opts.borderWidth = borderW; }
    this.page.drawRectangle(opts);
  }

  // wrap text into lines fitting maxW
  _wrap(str, size, font, maxW) {
    const words = String(str ?? '').split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (font.widthOfTextAtSize(test, size) > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ── spacing ──
  gap(n = 8) { this.y -= n; }

  // ── section heading ──
  sectionHeader(label) {
    if (this.y < BODY_BOT + 30) return;
    this.gap(6);
    this._rect(MARGIN, this.y - 2, CONTENT_W, 16, { fill: ACCENT_DARK });
    this._text(label.toUpperCase(), MARGIN + 6, this.y + 3, 7.5, this.fonts.bold, WHITE);
    this.y -= 22;
  }

  // ── divider line ──
  rule(color = BORDER, thickness = 0.5) {
    this.gap(4);
    this._line(MARGIN, this.y, PAGE_W - MARGIN, this.y, thickness, color);
    this.gap(8);
  }

  // ── inline text ──
  text(str, { x = MARGIN, size = 10, font = 'regular', color = BLACK } = {}) {
    if (this.y < BODY_BOT) return;
    const f = this.fonts[font];
    const lines = this._wrap(str, size, f, CONTENT_W - (x - MARGIN));
    for (const line of lines) {
      if (this.y < BODY_BOT) break;
      this._text(line, x, this.y, size, f, color);
      this.y -= (size + 4);
    }
  }

  // ── boxed cell: label + value ──
  cell(label, value, x, cellW, { labelSize = 7, valueSize = 9.5 } = {}) {
    if (!value && value !== 0) value = '';
    const cellH = 30;
    const f = this.fonts;

    this._rect(x, this.y - cellH, cellW, cellH, { fill: CELL_BG, border: BORDER });
    this._text(label.toUpperCase(), x + 4, this.y - 10, labelSize, f.bold, LIGHT);

    const valStr = String(value).slice(0, 60);
    this._text(valStr, x + 4, this.y - 22, valueSize, f.regular, DARK);
    return cellH;
  }

  // ── row of equal-width cells ──
  cells(pairs, { cellH = 30, labelSize = 7, valueSize = 9.5 } = {}) {
    if (this.y < BODY_BOT + cellH) return;
    const n = pairs.length;
    const cellW = CONTENT_W / n;
    pairs.forEach(([label, value], i) => {
      this.cell(label, value ?? '', MARGIN + i * cellW, cellW, { labelSize, valueSize });
    });
    this.y -= cellH;
  }

  // ── two cells per row, configurable split ──
  cells2(pairs, split = 0.5) {
    const leftW  = CONTENT_W * split;
    const rightW = CONTENT_W * (1 - split);
    for (let i = 0; i < pairs.length; i += 2) {
      if (this.y < BODY_BOT + 30) break;
      const [lLabel, lVal] = pairs[i]     || ['', ''];
      const [rLabel, rVal] = pairs[i + 1] || ['', ''];
      this.cell(lLabel, lVal, MARGIN,         leftW);
      this.cell(rLabel, rVal, MARGIN + leftW, rightW);
      this.y -= 30;
    }
  }

  // ── tall text cell (multiline content) ──
  textCell(label, value, { minH = 50 } = {}) {
    if (!value) return;
    const f = this.fonts;
    const innerW = CONTENT_W - 8;
    const lines = this._wrap(String(value), 9.5, f.regular, innerW);
    const cellH = Math.max(minH, lines.length * 14 + 18);
    if (this.y < BODY_BOT + cellH) return;
    this._rect(MARGIN, this.y - cellH, CONTENT_W, cellH, { fill: CELL_BG, border: BORDER });
    this._text(label.toUpperCase(), MARGIN + 4, this.y - 10, 7, f.bold, LIGHT);
    let ty = this.y - 22;
    for (const line of lines) {
      if (ty < this.y - cellH + 4) break;
      this._text(line, MARGIN + 4, ty, 9.5, f.regular, DARK);
      ty -= 14;
    }
    this.y -= cellH;
  }

  // ── financial summary box (right-aligned values) ──
  summaryBox(rows) {
    const validRows = rows.filter(([, v]) => v != null && v !== '');
    if (!validRows.length) return;
    const rowH  = 22;
    const boxH  = validRows.length * rowH + 12;
    const boxX  = MARGIN + CONTENT_W * 0.5;
    const boxW  = CONTENT_W * 0.5;
    if (this.y < BODY_BOT + boxH) return;
    this._rect(boxX, this.y - boxH, boxW, boxH, { fill: BG, border: BORDER });
    let ry = this.y - 16;
    for (const [label, value] of validRows) {
      this._text(label, boxX + 8, ry, 8.5, this.fonts.regular, MUTED);
      const vStr = String(value ?? '—');
      const vW   = this.fonts.bold.widthOfTextAtSize(vStr, 9);
      this._text(vStr, boxX + boxW - 8 - vW, ry, 9, this.fonts.bold, BLACK);
      ry -= rowH;
    }
    this.y -= boxH + 4;
  }

  // ── table with header row ──
  table(headers, rows, colWidths) {
    const f = this.fonts;
    const rowH = 18;
    const totalW = colWidths.reduce((a, b) => a + b, 0);

    // header
    if (this.y < BODY_BOT + rowH * 2) return;
    this._rect(MARGIN, this.y - rowH, totalW, rowH, { fill: ACCENT_DARK });
    let hx = MARGIN;
    headers.forEach((h, i) => {
      this._text(h.toUpperCase(), hx + 4, this.y - 12, 7, f.bold, WHITE);
      hx += colWidths[i];
    });
    this.y -= rowH;

    // data rows
    for (const row of rows) {
      if (this.y < BODY_BOT + rowH) break;
      const isOdd = rows.indexOf(row) % 2 === 0;
      this._rect(MARGIN, this.y - rowH, totalW, rowH, { fill: isOdd ? CELL_BG : WHITE, border: BORDER, borderW: 0.3 });
      let rx = MARGIN;
      row.forEach((cell, i) => {
        const txt = String(cell ?? '').slice(0, 40);
        this._text(txt, rx + 4, this.y - 12, 8.5, f.regular, DARK);
        rx += colWidths[i];
      });
      this.y -= rowH;
    }
    this.gap(6);
  }

  // ── signature block ──
  signatureBlock(signers) {
    const colW = CONTENT_W / signers.length;
    const sigH = 36;
    if (this.y < BODY_BOT + sigH + 20) return;
    this.gap(8);
    this.rule();
    this._text('SIGNATURES', MARGIN, this.y, 7, this.fonts.bold, LIGHT);
    this.y -= 12;
    signers.forEach((signer, i) => {
      const x = MARGIN + i * colW;
      this._line(x, this.y - sigH, x + colW - 12, this.y - sigH, 0.5, DARK);
      this._text(signer, x, this.y - sigH - 10, 7.5, this.fonts.regular, MUTED);
    });
    this.y -= sigH + 20;
  }

  // ── checklist items ──
  checklistItems(items) {
    for (const item of items) {
      if (this.y < BODY_BOT + 16) break;
      const txt = typeof item === 'object' ? item.description || JSON.stringify(item) : String(item);
      this._rect(MARGIN, this.y - 8, 8, 8, { border: BORDER });
      this.text(txt.slice(0, 100), { x: MARGIN + 14, size: 9, color: DARK });
      this.gap(2);
    }
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
    daily_report: 'DAILY FIELD REPORT',
    punch_list: 'PUNCH LIST',
    invoice: 'INVOICE',
    transmittal: 'TRANSMITTAL',
    schedule_of_values: 'SCHEDULE OF VALUES',
    notice_to_proceed: 'NOTICE TO PROCEED',
    substantial_completion: 'CERTIFICATE OF SUBSTANTIAL COMPLETION',
    warranty_letter: 'WARRANTY LETTER',
    substitution_request: 'SUBSTITUTION REQUEST',
    closeout_checklist: 'PROJECT CLOSE-OUT CHECKLIST',
    certified_payroll: 'CERTIFIED PAYROLL REPORT',
    upload: 'UPLOADED DOCUMENT',
    other: 'DOCUMENT',
  }[type] || 'DOCUMENT';
}

async function renderDoc(doc, profile) {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts   = { regular, bold };

  const c = typeof doc.content === 'string'
    ? { text: doc.content }
    : (doc.content?.text !== undefined ? doc.content : doc.content || {});

  const d = new Doc(page, fonts);

  // ── HEADER BAND ────────────────────────────────────────────────────────────
  const HEADER_H = 64;
  d._rect(0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, { fill: ACCENT_DARK });

  // Company name + info (left)
  const company = profile?.company_name || 'Your Company';
  d._text(company, MARGIN, PAGE_H - 22, 13, bold, WHITE);
  const addrParts = [profile?.address, profile?.city, profile?.state, profile?.zip].filter(Boolean);
  if (addrParts.length) d._text(addrParts.join(', '), MARGIN, PAGE_H - 35, 7.5, regular, rgb(0.75, 0.78, 0.85));
  const contactParts = [profile?.phone, profile?.email].filter(Boolean);
  if (contactParts.length) d._text(contactParts.join('   |   '), MARGIN, PAGE_H - 46, 7.5, regular, rgb(0.75, 0.78, 0.85));
  if (profile?.license_number) d._text(`License: ${profile.license_number}`, MARGIN, PAGE_H - 57, 7, regular, rgb(0.65, 0.68, 0.75));

  // Doc type badge (right side of header)
  const typeTitle = buildTitle(doc.type);
  const ttW = bold.widthOfTextAtSize(typeTitle, 9);
  d._rect(PAGE_W - MARGIN - ttW - 20, PAGE_H - HEADER_H + 10, ttW + 20, 20, { fill: ACCENT });
  d._text(typeTitle, PAGE_W - MARGIN - ttW - 10, PAGE_H - HEADER_H + 18, 9, bold, WHITE);

  d.y = PAGE_H - HEADER_H - 10;

  // ── DOCUMENT TITLE ROW ────────────────────────────────────────────────────
  d._text(doc.title.slice(0, 70), MARGIN, d.y, 14, bold, BLACK);
  d.y -= 16;
  const projectName = doc.project_name || c.project_name;
  if (projectName) {
    d._text(`Project: ${projectName}`, MARGIN, d.y, 8.5, regular, MUTED);
    d.y -= 12;
  }
  d._line(MARGIN, d.y, PAGE_W - MARGIN, d.y, 1.5, ACCENT);
  d.y -= 12;

  // ── BODY by doc type ─────────────────────────────────────────────────────
  if (c.text) {
    // Plain text fallback — wrap nicely
    d.sectionHeader('Document Content');
    for (const line of c.text.split('\n')) {
      if (d.y < BODY_BOT) break;
      d.text(line, { size: 9.5, color: DARK });
    }
  } else {
    switch (doc.type) {

      case 'rfi':
        d.sectionHeader('Request Details');
        d.cells([['RFI #', c.rfi_number], ['Date', c.date], ['Date Needed', c.date_needed], ['Project', c.project_name]]);
        d.cells2([['Addressed To', c.addressed_to], ['Submitted By', c.submitted_by]]);
        d.gap(4);
        d.sectionHeader('Question / Request');
        d.textCell('Question', c.question, { minH: 60 });
        if (c.response) { d.gap(6); d.sectionHeader('Response'); d.textCell('Response', c.response, { minH: 50 }); }
        d.signatureBlock(['Submitted By / Date', 'Responded By / Date']);
        break;

      case 'change_order':
        d.sectionHeader('Change Order Information');
        d.cells([['CO #', c.co_number], ['Date', c.date], ['Contractor', c.contractor], ['Owner', c.owner]]);
        d.gap(4);
        d.sectionHeader('Description of Change');
        d.textCell('Description', c.description, { minH: 55 });
        d.textCell('Reason / Justification', c.reason, { minH: 40 });
        d.gap(8);
        d.sectionHeader('Financial & Schedule Impact');
        d.summaryBox([['Contract Sum Before Change', '—'], ['Amount of Change Order', c.cost_change], ['New Contract Sum', '—'], ['Days Added to Contract', c.days_added]]);
        d.signatureBlock(['Contractor Signature / Date', 'Owner Signature / Date', 'Architect Signature / Date']);
        break;

      case 'submittal':
        d.sectionHeader('Submittal Information');
        d.cells([['Submittal #', c.submittal_number], ['Date', c.date], ['Spec Section', c.spec_section], ['Revision', c.revision]]);
        d.cells2([['Supplier / Manufacturer', c.supplier], ['Submitted By', c.submitted_by]]);
        d.gap(4);
        d.sectionHeader('Description');
        d.textCell('Description of Submittal', c.description, { minH: 70 });
        d.gap(8);
        d.sectionHeader('Action');
        d.cells([['Action', ''], ['Reviewed By', ''], ['Date Returned', ''], ['Re-submittal Required', '']]);
        d.signatureBlock(['Submitted By / Date', 'Reviewed By / Date']);
        break;

      case 'lien_waiver': {
        const lwLabel = {
          conditional_progress:   'CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT',
          unconditional_progress: 'UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT',
          conditional_final:      'CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT',
          unconditional_final:    'UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT',
        }[c.type] || 'LIEN WAIVER';
        d._text(lwLabel, MARGIN, d.y, 8, bold, ACCENT_DARK);
        d.y -= 14;
        d.rule(BORDER, 0.5);
        d.cells2([['Claimant (Company / Individual)', c.claimant], ['Owner', c.owner]]);
        d.cells2([['Property Address', c.property_address], ['Project Name', c.project_name]]);
        d.cells([['Through Date', c.through_date], ['Amount', c.amount]]);
        d.gap(8);
        d.sectionHeader('Waiver Statement');
        const stmt = c.type?.includes('unconditional')
          ? 'The undersigned has been paid in full for all labor, services, equipment, or materials furnished to the above-referenced project and waives and releases any and all claims, demands, or liens against the property.'
          : 'Upon receipt of payment of the sum stated above, the undersigned waives and releases any and all claims, demands, or liens against the property for the period through the date stated above.';
        d.textCell('', stmt, { minH: 50 });
        d.signatureBlock(['Claimant Signature', 'Title', 'Date']);
        break;
      }

      case 'pay_app':
        d.sectionHeader('Project & Contract Information');
        d.cells([['Application #', c.application_number], ['Period To', c.period_to], ['Architect', c.architect], ['Contract Date', '']]);
        d.cells2([['Contractor', c.contractor], ['Owner', c.owner]]);
        d.gap(6);
        d.sectionHeader('Summary of Work Completed (G702)');
        d.summaryBox([
          ['1. Original Contract Sum',                c.contract_amount],
          ['2. Net Change by Change Orders',           ''],
          ['3. Contract Sum to Date',                  c.contract_amount],
          ['4. Total Completed & Stored to Date',      c.work_completed],
          [`5. Retainage (${c.retainage_percent || '10'}%)`, ''],
          ['6. Total Earned Less Retainage',           ''],
          ['7. Less Previous Certificates for Payment', c.previous_payments],
          ['8. Current Payment Due',                   ''],
          ['9. Balance to Finish Including Retainage', ''],
        ]);
        d.signatureBlock(['Contractor Signature / Date', 'Architect Certification / Date']);
        break;

      case 'meeting_minutes':
        d.sectionHeader('Meeting Information');
        d.cells([['Date', c.meeting_date], ['Location', c.location], ['Next Meeting', c.next_meeting]]);
        d.gap(4);
        d.sectionHeader('Attendees');
        d.textCell('', Array.isArray(c.attendees) ? c.attendees.join('\n') : c.attendees, { minH: 40 });
        d.gap(4);
        d.sectionHeader('Agenda / Discussion');
        d.textCell('', Array.isArray(c.agenda_items) ? c.agenda_items.map((a, i) => `${i + 1}. ${a}`).join('\n') : c.agenda_items, { minH: 70 });
        if (c.action_items) {
          d.gap(4);
          d.sectionHeader('Action Items');
          d.textCell('', Array.isArray(c.action_items) ? c.action_items.map((a, i) => `${i + 1}. ${a}`).join('\n') : c.action_items, { minH: 50 });
        }
        break;

      case 'notice_to_owner':
        d.sectionHeader('Owner / Property Information');
        d.cells2([['Owner Name', c.owner_name], ['Owner Address', c.owner_address]]);
        d.cells2([['Property Address', c.property_address], ['Lender (if any)', c.lender_name]]);
        d.gap(4);
        d.sectionHeader('Contractor / Claimant Information');
        d.cells2([['Contractor / Company Name', c.contractor_name], ['Contractor Address', c.contractor_address]]);
        d.cells([['Date', c.date]]);
        d.gap(4);
        d.sectionHeader('Nature of Services / Materials');
        d.textCell('Services and/or Materials to be Furnished', c.services_description, { minH: 60 });
        d.gap(8);
        d.text('NOTICE: Florida law prescribes the serving of this notice. It is not a lien, cloud, or encumbrance on real property. It is a notice that the person or firm named herein has furnished or will furnish labor, services, or materials as described herein.', { size: 7.5, color: MUTED });
        d.signatureBlock(['Claimant Signature / Date']);
        break;

      case 'subcontract':
        d.sectionHeader('Parties');
        d.cells2([['General Contractor', c.general_contractor], ['Subcontractor', c.subcontractor]]);
        d.sectionHeader('Contract Terms');
        d.cells([['Contract Value', c.contract_value], ['Start Date', c.start_date], ['Completion Date', c.completion_date], ['Payment Terms', c.payment_terms]]);
        d.gap(4);
        d.sectionHeader('Scope of Work');
        d.textCell('', c.scope_of_work, { minH: 80 });
        if (c.insurance_requirements) { d.gap(4); d.sectionHeader('Insurance Requirements'); d.textCell('', c.insurance_requirements, { minH: 40 }); }
        d.signatureBlock(['General Contractor Signature / Date', 'Subcontractor Signature / Date']);
        break;

      case 'daily_report':
        d.sectionHeader('Site Conditions');
        d.cells([['Superintendent', c.superintendent], ['Report #', c.report_number], ['Weather', c.weather], ['Temperature', c.temperature]]);
        d.cells2([['Workers on Site', Array.isArray(c.workers_on_site) ? c.workers_on_site.join(', ') : c.workers_on_site], ['Visitors', c.visitors]]);
        d.gap(4);
        d.sectionHeader('Work Performed Today');
        d.textCell('', c.work_performed, { minH: 80 });
        if (c.materials_delivered) { d.gap(4); d.sectionHeader('Materials Delivered'); d.textCell('', c.materials_delivered, { minH: 35 }); }
        if (c.equipment_on_site)   { d.gap(4); d.sectionHeader('Equipment on Site');   d.textCell('', c.equipment_on_site, { minH: 30 }); }
        if (c.delays)              { d.gap(4); d.sectionHeader('Delays / Issues');      d.textCell('', c.delays, { minH: 35 }); }
        if (c.safety_incidents)    { d.gap(4); d.sectionHeader('Safety Incidents');     d.textCell('', c.safety_incidents, { minH: 35 }); }
        if (c.notes)               { d.gap(4); d.sectionHeader('Notes');                d.textCell('', c.notes, { minH: 35 }); }
        d.signatureBlock(['Superintendent Signature / Date']);
        break;

      case 'punch_list': {
        d.sectionHeader('Punch List Information');
        d.cells2([['Prepared By', c.prepared_by], ['Contractor', c.contractor]]);
        d.cells([['Location / Area', c.location]]);
        d.gap(6);
        d.sectionHeader('Items');
        const punchItems = Array.isArray(c.items) ? c.items : (c.items || '').split('\n').filter(Boolean);
        d.checklistItems(punchItems);
        d.signatureBlock(['Prepared By / Date', 'Contractor Acknowledgment / Date']);
        break;
      }

      case 'invoice': {
        d.sectionHeader('Invoice Details');
        d.cells([['Invoice #', c.invoice_number], ['Date', c.date], ['Due Date', c.due_date], ['Terms', c.payment_terms]]);
        d.cells2([['Bill To', c.bill_to_name], ['Address', c.bill_to_address]]);
        d.gap(6);
        d.sectionHeader('Line Items');
        const liRows = (Array.isArray(c.line_items) ? c.line_items : []).map(i =>
          typeof i === 'object' ? [i.description || '', i.quantity || '', i.unit_price || '', i.amount || ''] : [String(i), '', '', '']
        );
        d.table(['Description', 'Qty', 'Unit Price', 'Amount'], liRows, [280, 60, 80, 96]);
        d.summaryBox([['Subtotal', c.subtotal], [`Tax (${c.tax_rate || ''})`, c.tax_amount], ['Total Due', c.total]].filter(r => r[1]));
        if (c.notes) { d.gap(4); d.sectionHeader('Notes'); d.textCell('', c.notes, { minH: 35 }); }
        break;
      }

      case 'transmittal': {
        d.sectionHeader('Transmittal Information');
        d.cells([['Transmittal #', c.transmittal_number], ['Date', c.date], ['Action Required', c.action_required]]);
        d.cells2([['To', c.to_name], ['Company', c.to_company]]);
        d.cells([['From', c.from_name], ['Subject', c.subject]]);
        d.gap(6);
        d.sectionHeader('Items Transmitted');
        const txItems = Array.isArray(c.items) ? c.items : (c.items || '').split('\n').filter(Boolean);
        d.table(['#', 'Description', 'Copies'], txItems.map((it, i) => [i + 1, typeof it === 'object' ? it.description || JSON.stringify(it) : it, '']), [30, 400, 86]);
        if (c.notes) { d.gap(4); d.sectionHeader('Notes'); d.textCell('', c.notes, { minH: 35 }); }
        break;
      }

      case 'schedule_of_values': {
        d.sectionHeader('Project Information');
        d.cells2([['Contractor', c.contractor], ['Owner', c.owner]]);
        d.cells2([['Architect', c.architect], ['Contract #', c.contract_number]]);
        d.cells([['Contract Amount', c.contract_amount]]);
        d.gap(6);
        d.sectionHeader('Schedule of Values');
        const sovRows = (Array.isArray(c.line_items) ? c.line_items : []).map((it, i) => [
          i + 1,
          typeof it === 'object' ? it.description || '' : String(it),
          typeof it === 'object' ? it.value || it.scheduled_value || '' : '',
        ]);
        d.table(['#', 'Description of Work', 'Scheduled Value'], sovRows, [30, 370, 116]);
        break;
      }

      case 'notice_to_proceed':
        d.sectionHeader('Parties & Project');
        d.cells2([['Owner', c.owner_name], ['Contractor', c.contractor_name]]);
        d.cells2([['Contractor Address', c.contractor_address], ['Project Address', c.project_address]]);
        d.gap(4);
        d.sectionHeader('Contract Terms');
        d.cells([['Commencement Date', c.commencement_date], ['Completion Date', c.completion_date]]);
        if (c.contract_amount) d.summaryBox([['Contract Amount', c.contract_amount]]);
        d.gap(8);
        d.textCell('Notice', `You are hereby authorized and directed to commence work on the above-referenced project on ${c.commencement_date || '___________'}. Work shall be completed no later than ${c.completion_date || '___________'}.`, { minH: 50 });
        d.signatureBlock(['Owner Authorized Signature / Date', 'Contractor Acknowledgment / Date']);
        break;

      case 'substantial_completion':
        d.sectionHeader('Project Information');
        d.cells2([['Contractor', c.contractor], ['Owner', c.owner]]);
        d.cells([['Architect', c.architect], ['Project Address', c.project_address]]);
        d.gap(4);
        d.sectionHeader('Completion Dates');
        d.cells([['Date of Issuance', c.date_of_issuance], ['Date of Substantial Completion', c.date_of_substantial_completion], ['Warranty Start Date', c.warranty_start_date]]);
        if (c.list_of_items) { d.gap(4); d.sectionHeader('Remaining Items (Punch List)'); d.textCell('', c.list_of_items, { minH: 60 }); }
        d.signatureBlock(['Contractor Signature / Date', 'Owner Signature / Date', 'Architect Signature / Date']);
        break;

      case 'warranty_letter':
        d.sectionHeader('Parties');
        d.cells2([['Contractor', c.contractor_name], ['Contractor Address', c.contractor_address]]);
        d.cells2([['Owner', c.owner_name], ['Owner Address', c.owner_address]]);
        d.gap(4);
        d.sectionHeader('Warranty Terms');
        d.cells([['Warranty Period', c.warranty_period], ['Start Date', c.warranty_start_date], ['End Date', c.warranty_end_date]]);
        d.gap(4);
        d.sectionHeader('Work Covered');
        d.textCell('', c.work_description, { minH: 70 });
        if (c.exclusions) { d.gap(4); d.sectionHeader('Exclusions'); d.textCell('', c.exclusions, { minH: 40 }); }
        d.signatureBlock(['Contractor Authorized Signature / Date']);
        break;

      case 'substitution_request':
        d.sectionHeader('Request Information');
        d.cells([['Request #', c.request_number], ['Date', c.date], ['Submitted By', c.submitted_by]]);
        d.gap(4);
        d.sectionHeader('Specified vs. Proposed');
        d.cells2([['Specified Item', c.specified_item], ['Proposed Item', c.proposed_item]]);
        d.cells2([['Specified Manufacturer', c.specified_manufacturer], ['Proposed Manufacturer', c.proposed_manufacturer]]);
        d.cells2([['Cost Difference', c.cost_difference], ['Schedule Impact', c.schedule_impact]]);
        d.gap(4);
        d.sectionHeader('Reason for Substitution');
        d.textCell('', c.reason, { minH: 60 });
        if (c.attachments) { d.gap(4); d.sectionHeader('Attachments'); d.textCell('', c.attachments, { minH: 30 }); }
        d.signatureBlock(['Submitted By / Date', 'Approved By / Date']);
        break;

      case 'closeout_checklist': {
        d.sectionHeader('Project Information');
        d.cells2([['Contractor', c.contractor], ['Owner', c.owner]]);
        d.cells([['Project Manager', c.project_manager]]);
        d.gap(6);
        d.sectionHeader('Close-Out Items');
        const clItems = Array.isArray(c.items) ? c.items : (c.items || '').split('\n').filter(Boolean);
        d.checklistItems(clItems);
        d.signatureBlock(['Contractor Signature / Date', 'Owner Acceptance / Date']);
        break;
      }

      case 'certified_payroll': {
        d.sectionHeader('Payroll Information');
        d.cells([['Contractor', c.contractor], ['Project #', c.project_number], ['Payroll #', c.payroll_number], ['Week Ending', c.week_ending]]);
        d.gap(6);
        d.sectionHeader('Employee Hours & Wages');
        const empRows = (Array.isArray(c.employees) ? c.employees : []).map(e => [
          e.name || '', e.classification || '', e.hours || '', e.rate || '', e.gross || ''
        ]);
        d.table(['Employee Name', 'Classification', 'Hours', 'Rate', 'Gross Pay'], empRows, [160, 130, 60, 60, 106]);
        d.gap(8);
        d.textCell('Statement of Compliance', 'I, the undersigned, do hereby certify that the wage information contained herein is correct and complete, that wages paid to each worker are not less than the applicable prevailing wage rate for the classification of work performed, and that the work has been performed in accordance with applicable requirements.', { minH: 55 });
        d.signatureBlock(['Contractor / Authorized Agent Signature', 'Title', 'Date']);
        break;
      }

      default:
        d.sectionHeader('Document Content');
        d.text(JSON.stringify(c, null, 2).slice(0, 800), { size: 8.5, color: DARK });
    }
  }

  // ── FOOTER ────────────────────────────────────────────────────────────────
  const fy = FOOTER_H - 10;
  d._rect(0, 0, PAGE_W, FOOTER_H, { fill: ACCENT_DARK });
  d._text('ConstructionBear.AI', MARGIN, fy, 7.5, bold, rgb(0.65, 0.68, 0.75));
  d._text(`Generated: ${new Date().toLocaleDateString()}`, MARGIN + 120, fy, 7.5, regular, rgb(0.55, 0.58, 0.65));
  d._text(`${buildTitle(doc.type)}  |  ${doc.title}`, PAGE_W - MARGIN - 200, fy, 7, regular, rgb(0.55, 0.58, 0.65));

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
