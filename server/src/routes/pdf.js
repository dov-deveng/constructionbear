import { Router } from 'express';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { requireAuth } from '../middleware/auth.js';
import { getDb } from '../db/schema.js';

const router = Router();

// ── Bear OS color palette ─────────────────────────────────────────────────
const ACCENT      = rgb(0.98, 0.45, 0.09);
const ACCENT_DARK = rgb(0.14, 0.18, 0.26);
const BLACK       = rgb(0.08, 0.08, 0.08);
const DARK        = rgb(0.18, 0.18, 0.18);
const MUTED       = rgb(0.45, 0.45, 0.45);
const LIGHT       = rgb(0.62, 0.62, 0.62);
const BORDER      = rgb(0.78, 0.78, 0.78);
const BG          = rgb(0.96, 0.96, 0.97);
const WHITE       = rgb(1, 1, 1);
const CELL_BG     = rgb(0.975, 0.975, 0.98);

// ── AIA-accurate palette ──────────────────────────────────────────────────
const AIA_BLUE = rgb(0.722, 0.800, 0.894);  // light blue cell headers
const AIA_BORD = rgb(0.627, 0.667, 0.749);  // table borders
const AIA_LOGO = rgb(0.87,  0.87,  0.87);   // logo placeholder fill
const AIA_MAR  = 40;                          // AIA page margin
const AIA_W    = 612 - AIA_MAR * 2;          // 532 — AIA content width

// ── Page constants ────────────────────────────────────────────────────────
const PAGE_W    = 612;
const PAGE_H    = 792;
const MARGIN    = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_H  = 48;
const BODY_TOP  = PAGE_H - MARGIN;
const BODY_BOT  = FOOTER_H + 12;

// ── AIA layout helpers ────────────────────────────────────────────────────

// Draw AIA document header: company info left, logo+title right.
// Returns y where table body should begin.
function aiaDocHeader(page, fonts, profile, titleText, titleSize, titleCentered = false) {
  const { regular, bold } = fonts;
  const NEAR_BLACK = rgb(0.08, 0.08, 0.08);
  const GRAY_MED   = rgb(0.38, 0.38, 0.38);

  let y = PAGE_H - AIA_MAR; // 752

  // ── company info (top-left) ──────────────────────────────────────────────
  const company = String(profile?.company_name || 'Your Company');
  page.drawText(company, { x: AIA_MAR, y, size: 12, font: bold, color: NEAR_BLACK });
  y -= 15;

  const cityLine = [profile?.city, profile?.state, profile?.zip].filter(Boolean).join(', ');
  const addrLine = [profile?.address, cityLine].filter(Boolean).join('\n');
  for (const part of addrLine.split('\n').filter(Boolean)) {
    page.drawText(String(part), { x: AIA_MAR, y, size: 8.5, font: regular, color: GRAY_MED });
    y -= 12;
  }
  if (profile?.phone) {
    page.drawText(String(profile.phone), { x: AIA_MAR, y, size: 8.5, font: regular, color: GRAY_MED });
    y -= 12;
  }
  if (profile?.email) {
    page.drawText(String(profile.email), { x: AIA_MAR, y, size: 8.5, font: regular, color: GRAY_MED });
    y -= 12;
  }

  // ── logo placeholder (top-right) ─────────────────────────────────────────
  const logoW = 110, logoH = 65;
  const logoX = PAGE_W - AIA_MAR - logoW;
  const logoBottomY = PAGE_H - AIA_MAR - logoH; // pdf-lib y = bottom-left of rect
  page.drawRectangle({
    x: logoX, y: logoBottomY, width: logoW, height: logoH,
    color: AIA_LOGO, borderColor: AIA_BORD, borderWidth: 0.75,
  });
  const logoLabel = '[LOGO]';
  const logoLabelW = regular.widthOfTextAtSize(logoLabel, 10);
  page.drawText(logoLabel, {
    x: logoX + (logoW - logoLabelW) / 2,
    y: logoBottomY + logoH / 2 - 5,
    size: 10, font: regular, color: rgb(0.55, 0.55, 0.55),
  });

  // ── document title ────────────────────────────────────────────────────────
  const titleY = logoBottomY - titleSize - 10;
  const titleW = bold.widthOfTextAtSize(titleText, titleSize);
  const titleX = titleCentered
    ? (PAGE_W - titleW) / 2
    : PAGE_W - AIA_MAR - titleW;
  page.drawText(titleText, { x: titleX, y: titleY, size: titleSize, font: bold, color: NEAR_BLACK });

  // body starts below lower of the two columns
  const bodyStart = Math.min(y, titleY) - 16;
  return bodyStart;
}

// Draw AIA-style table sections: blue header row + white data row per section.
// sections = [{ headers: string[], values: string[], colWidths: number[], dataH?: number }]
// Returns new y after all sections are drawn.
function aiaBlock(page, fonts, y, sections) {
  const { regular, bold } = fonts;
  const NEAR_BLACK = rgb(0.08, 0.08, 0.08);
  const HDR_H = 18;

  for (const sec of sections) {
    const { headers, values, colWidths, dataH = 24 } = sec;
    if (y < 60 + HDR_H + dataH) break;

    // — header row (blue bg, bold label) —
    let cx = AIA_MAR;
    for (let i = 0; i < headers.length; i++) {
      page.drawRectangle({
        x: cx, y: y - HDR_H, width: colWidths[i], height: HDR_H,
        color: AIA_BLUE, borderColor: AIA_BORD, borderWidth: 0.5,
      });
      const hTxt = String(headers[i] || '');
      if (hTxt) {
        page.drawText(hTxt, { x: cx + 5, y: y - HDR_H + 5, size: 8.5, font: bold, color: NEAR_BLACK });
      }
      cx += colWidths[i];
    }
    y -= HDR_H;

    // — data row (white bg) —
    cx = AIA_MAR;
    for (let i = 0; i < colWidths.length; i++) {
      page.drawRectangle({
        x: cx, y: y - dataH, width: colWidths[i], height: dataH,
        color: WHITE, borderColor: AIA_BORD, borderWidth: 0.5,
      });
      const val = String(values?.[i] ?? '');
      if (val) {
        // word-wrap inside cell
        const innerW = colWidths[i] - 10;
        const words = val.split(' ');
        const lines = [];
        let cur = '';
        for (const w of words) {
          const test = cur ? cur + ' ' + w : w;
          if (regular.widthOfTextAtSize(test, 9.5) > innerW && cur) {
            lines.push(cur); cur = w;
          } else { cur = test; }
        }
        if (cur) lines.push(cur);
        const lineH = 13;
        const maxLines = Math.max(1, Math.floor((dataH - 8) / lineH));
        let ty = y - 11;
        for (const line of lines.slice(0, maxLines)) {
          page.drawText(line, { x: cx + 5, y: ty, size: 9.5, font: regular, color: NEAR_BLACK });
          ty -= lineH;
        }
      }
      cx += colWidths[i];
    }
    y -= dataH;
  }

  return y;
}

// ── Bear OS layout engine ─────────────────────────────────────────────────
class Doc {
  constructor(page, fonts) {
    this.page  = page;
    this.fonts = fonts;
    this.y     = BODY_TOP;
  }

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

  gap(n = 8) { this.y -= n; }

  sectionHeader(label) {
    if (this.y < BODY_BOT + 30) return;
    this.gap(6);
    this._rect(MARGIN, this.y - 2, CONTENT_W, 16, { fill: rgb(0.93, 0.94, 0.95), border: rgb(0.82, 0.84, 0.87), borderW: 0.5 });
    this._text(label.toUpperCase(), MARGIN + 6, this.y + 3, 7.5, this.fonts.bold, rgb(0.18, 0.18, 0.18));
    this.y -= 22;
  }

  rule(color = BORDER, thickness = 0.5) {
    this.gap(4);
    this._line(MARGIN, this.y, PAGE_W - MARGIN, this.y, thickness, color);
    this.gap(8);
  }

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

  cells(pairs, { cellH = 30, labelSize = 7, valueSize = 9.5 } = {}) {
    if (this.y < BODY_BOT + cellH) return;
    const n = pairs.length;
    const cellW = CONTENT_W / n;
    pairs.forEach(([label, value], i) => {
      this.cell(label, value ?? '', MARGIN + i * cellW, cellW, { labelSize, valueSize });
    });
    this.y -= cellH;
  }

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

  table(headers, rows, colWidths) {
    const f = this.fonts;
    const rowH = 18;
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    if (this.y < BODY_BOT + rowH * 2) return;
    this._rect(MARGIN, this.y - rowH, totalW, rowH, { fill: rgb(0.93, 0.94, 0.95), border: rgb(0.82, 0.84, 0.87), borderW: 0.5 });
    let hx = MARGIN;
    headers.forEach((h, i) => {
      this._text(h.toUpperCase(), hx + 4, this.y - 12, 7, f.bold, rgb(0.18, 0.18, 0.18));
      hx += colWidths[i];
    });
    this.y -= rowH;
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

// ── AIA G702 / G703 two-page pay-app renderer ─────────────────────────────
async function renderPayApp(doc, profile) {
  const pdfDoc  = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts   = { regular, bold };
  const raw = doc.content;
  const c = (typeof raw === 'object' && raw !== null && !raw.text) ? raw : {};

  _drawG702(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts, doc, profile, c);
  if (Array.isArray(c.line_items) && c.line_items.length > 0) {
    _drawG703(pdfDoc.addPage([PAGE_W, PAGE_H]), fonts, doc, profile, c);
  }
  return pdfDoc.save();
}

function _drawG702(page, fonts, doc, profile, c) {
  const { regular, bold } = fonts;
  const M  = 36;
  const W  = PAGE_W - M * 2; // 540
  const NB = rgb(0.06, 0.06, 0.06);
  const parse$ = s => parseFloat(String(s ?? '').replace(/[^0-9.-]/g, '')) || 0;
  const fmt$   = n => n ? '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

  // ── Title ────────────────────────────────────────────────────────────────
  let y = PAGE_H - M; // 756
  page.drawText('APPLICATION AND CERTIFICATE FOR PAYMENT', { x: M, y, size: 11, font: bold, color: NB });
  const g2lbl = 'AIA DOCUMENT G702';
  page.drawText(g2lbl, { x: PAGE_W - M - bold.widthOfTextAtSize(g2lbl, 8), y, size: 8, font: bold, color: MUTED });
  y -= 14;
  page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1.0, color: AIA_BORD });
  y -= 8; // y ≈ 734

  // ── Info grid ────────────────────────────────────────────────────────────
  const LW = 296;
  const RX = M + LW + 4;
  const RW = W - LW - 4; // 240

  const infoBox = (bx, by, bw, bh, label, val1, val2) => {
    page.drawRectangle({ x: bx, y: by - bh, width: bw, height: bh, color: WHITE, borderColor: AIA_BORD, borderWidth: 0.5 });
    page.drawText(String(label), { x: bx + 3, y: by - 10, size: 7, font: bold, color: MUTED });
    if (val1) page.drawText(String(val1).slice(0, 50), { x: bx + 3, y: by - 22, size: 9, font: regular, color: NB });
    if (val2) page.drawText(String(val2).slice(0, 50), { x: bx + 3, y: by - 34, size: 8, font: regular, color: DARK });
  };
  const rowField = (by, label, val) => {
    page.drawRectangle({ x: RX, y: by - 18, width: RW, height: 18, color: WHITE, borderColor: AIA_BORD, borderWidth: 0.5 });
    page.drawText(String(label), { x: RX + 3, y: by - 13, size: 7, font: bold, color: MUTED });
    if (val) {
      const v = String(val).slice(0, 36);
      page.drawText(v, { x: RX + RW - regular.widthOfTextAtSize(v, 8.5) - 3, y: by - 13, size: 8.5, font: regular, color: NB });
    }
  };

  // Left: TO / FROM / CONTRACT FOR (heights 52 + 38 + 24 = 114)
  infoBox(M, y,       LW, 52, 'TO (OWNER):', c.owner || '', c.owner_address || '');
  infoBox(M, y - 52,  LW, 38, 'FROM (CONTRACTOR):', c.contractor || profile?.company_name || '');
  infoBox(M, y - 90,  LW, 24, 'CONTRACT FOR:', c.project_name || doc.title || '');

  // Right: 5 fields × 18px = 90px, then filler 24px
  rowField(y,       'PROJECT:',          c.project_name || '');
  rowField(y - 18,  'APPLICATION NO:',   String(c.application_number || ''));
  rowField(y - 36,  'APPLICATION DATE:', c.date || '');
  rowField(y - 54,  'PERIOD TO:',        c.period_to || '');
  rowField(y - 72,  'CONTRACT DATE:',    c.contract_date || '');
  page.drawRectangle({ x: RX, y: y - 114, width: RW, height: 24, color: rgb(0.97, 0.97, 0.97), borderColor: AIA_BORD, borderWidth: 0.5 });

  y -= 114;
  y -= 4;
  page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 0.75, color: AIA_BORD });
  y -= 8; // y ≈ 608

  // ── Lower section ────────────────────────────────────────────────────────
  const lowerY = y;
  const LCW = 268;
  const RSX = M + LCW + 4;
  const RSW = W - LCW - 4;

  // LEFT: Contractor's Application
  let ly = lowerY;
  page.drawRectangle({ x: M, y: ly - 16, width: LCW, height: 16, color: AIA_BLUE, borderColor: AIA_BORD, borderWidth: 0.5 });
  page.drawText("CONTRACTOR'S APPLICATION FOR PAYMENT", { x: M + 4, y: ly - 11, size: 7.5, font: bold, color: NB });
  ly -= 16;

  // Change orders mini-table
  const coW = [30, 70, 84, 84];
  const coH  = ['NO.', 'DATE', 'ADDITIONS', 'DEDUCTIONS'];
  let cx = M;
  for (let i = 0; i < 4; i++) {
    page.drawRectangle({ x: cx, y: ly - 13, width: coW[i], height: 13, color: AIA_BLUE, borderColor: AIA_BORD, borderWidth: 0.3 });
    page.drawText(coH[i], { x: cx + 2, y: ly - 9, size: 6.5, font: bold, color: NB });
    cx += coW[i];
  }
  ly -= 13;
  const coItems = Array.isArray(c.change_orders) ? c.change_orders : [];
  for (let r = 0; r < 5; r++) {
    const co = coItems[r] || {};
    const shade = r % 2 === 0 ? rgb(0.97, 0.97, 0.98) : WHITE;
    cx = M;
    const rv = [co.number || '', co.date || '',
      co.additions ? fmt$(parse$(co.additions)) : '',
      co.deductions ? fmt$(parse$(co.deductions)) : ''];
    for (let i = 0; i < 4; i++) {
      page.drawRectangle({ x: cx, y: ly - 13, width: coW[i], height: 13, color: shade, borderColor: AIA_BORD, borderWidth: 0.25 });
      if (rv[i]) page.drawText(String(rv[i]).slice(0, 13), { x: cx + 2, y: ly - 9, size: 7.5, font: regular, color: NB });
      cx += coW[i];
    }
    ly -= 13;
  }
  // Totals row
  cx = M;
  page.drawRectangle({ x: cx, y: ly - 13, width: coW[0] + coW[1], height: 13, color: AIA_BLUE, borderColor: AIA_BORD, borderWidth: 0.3 });
  page.drawText('TOTALS', { x: cx + 2, y: ly - 9, size: 7, font: bold, color: NB });
  cx += coW[0] + coW[1];
  for (let i = 2; i < 4; i++) {
    page.drawRectangle({ x: cx, y: ly - 13, width: coW[i], height: 13, color: WHITE, borderColor: AIA_BORD, borderWidth: 0.3 });
    cx += coW[i];
  }
  ly -= 13;
  ly -= 6;

  // Contractor certification
  const certLines = [
    "The undersigned Contractor certifies that to the best of the Contractor's",
    'knowledge, information and belief the Work covered by this Application for',
    'Payment has been completed in accordance with the Contract Documents, that',
    'all amounts have been paid by the Contractor for Work for which previous',
    'Certificates for Payment were issued and payments received from the Owner,',
    'and that current payment shown herein is now due.',
  ];
  for (const ln of certLines) {
    page.drawText(ln, { x: M + 2, y: ly, size: 7, font: regular, color: DARK });
    ly -= 10;
  }
  ly -= 8;
  page.drawLine({ start: { x: M, y: ly }, end: { x: M + 120, y: ly }, thickness: 0.5, color: DARK });
  page.drawLine({ start: { x: M + 140, y: ly }, end: { x: M + 240, y: ly }, thickness: 0.5, color: DARK });
  page.drawText('By:', { x: M, y: ly + 3, size: 7, font: regular, color: MUTED });
  page.drawText('Date:', { x: M + 130, y: ly + 3, size: 7, font: regular, color: MUTED });
  ly -= 14;
  page.drawText(`State of: ${c.state || '_________________'}`, { x: M, y: ly, size: 7.5, font: regular, color: DARK });
  ly -= 11;
  page.drawText('Subscribed and sworn to before me this _____ day of ___________, 20___', { x: M, y: ly, size: 7, font: regular, color: DARK });
  ly -= 10;
  page.drawText('Notary Public:', { x: M, y: ly, size: 7, font: regular, color: DARK });
  page.drawLine({ start: { x: M + 70, y: ly }, end: { x: M + 240, y: ly }, thickness: 0.4, color: DARK });
  ly -= 10;
  page.drawText('My Commission Expires:', { x: M, y: ly, size: 7, font: regular, color: DARK });
  page.drawLine({ start: { x: M + 104, y: ly }, end: { x: M + 240, y: ly }, thickness: 0.4, color: DARK });

  // RIGHT: Summary lines 1-9
  let ry = lowerY;
  page.drawRectangle({ x: RSX, y: ry - 16, width: RSW, height: 16, color: AIA_BLUE, borderColor: AIA_BORD, borderWidth: 0.5 });
  page.drawText('SUMMARY OF WORK COMPLETED', { x: RSX + 4, y: ry - 11, size: 7.5, font: bold, color: NB });
  ry -= 16;

  const sumRow = (num, label, val, hi = false) => {
    const rh = 22;
    const fill = hi ? rgb(0.91, 0.95, 1.0) : (num % 2 === 0 ? rgb(0.97, 0.97, 0.98) : WHITE);
    page.drawRectangle({ x: RSX, y: ry - rh, width: RSW, height: rh, color: fill, borderColor: AIA_BORD, borderWidth: 0.3 });
    page.drawText(`${num ? num + '. ' : '   '}${label}`, { x: RSX + 4, y: ry - rh + 7, size: 7.5, font: hi ? bold : regular, color: NB });
    if (val) {
      const v = String(val);
      const vW = (hi ? bold : regular).widthOfTextAtSize(v, 9);
      page.drawText(v, { x: RSX + RSW - vW - 4, y: ry - rh + 7, size: 9, font: hi ? bold : regular, color: NB });
    }
    ry -= rh;
  };

  const orig     = parse$(c.contract_amount);
  const wkComp   = parse$(c.work_completed);
  const prevPay  = parse$(c.previous_payments);
  const retPct   = parse$(c.retainage_percent) || 10;
  const retAmt   = wkComp * (retPct / 100);
  const earnLess = wkComp - retAmt;
  const currDue  = earnLess - prevPay;
  const balance  = orig - earnLess;

  sumRow(1, 'Original Contract Sum',                  orig    ? fmt$(orig)    : '');
  sumRow(2, 'Net Change by Change Orders',             fmt$(0));
  sumRow(3, 'Contract Sum to Date',                    orig    ? fmt$(orig)    : '');
  sumRow(4, 'Total Completed & Stored to Date',        wkComp  ? fmt$(wkComp) : '');
  sumRow(5, `Retainage (${retPct}%)`,                  retAmt  ? fmt$(retAmt) : '');
  sumRow(6, 'Total Earned Less Retainage',             earnLess ? fmt$(earnLess) : '');
  sumRow(7, 'Less Previous Certificates for Payment',  prevPay ? fmt$(prevPay) : '');
  sumRow(8, 'CURRENT PAYMENT DUE',                     currDue > 0 ? fmt$(currDue) : '', true);
  sumRow(9, 'Balance to Finish, Including Retainage',  balance > 0 ? fmt$(balance) : '');
  ry -= 8;

  // Architect Certification block
  page.drawRectangle({ x: RSX, y: ry - 14, width: RSW, height: 14, color: AIA_BLUE, borderColor: AIA_BORD, borderWidth: 0.5 });
  page.drawText("ARCHITECT'S CERTIFICATION", { x: RSX + 4, y: ry - 10, size: 7.5, font: bold, color: NB });
  ry -= 14;
  const archCert = [
    'In accordance with the Contract Documents, based on on-site observations',
    "and the data comprising this Application, the Architect certifies to the Owner",
    "that the Work has progressed to the point indicated and the quality of the",
    'Work is in accordance with the Contract Documents.',
  ];
  for (const ln of archCert) {
    if (ry < 60) break;
    page.drawText(ln, { x: RSX + 4, y: ry - 10, size: 7, font: regular, color: DARK });
    ry -= 11;
  }
  ry -= 8;
  if (ry > 60) {
    page.drawRectangle({ x: RSX, y: ry - 24, width: RSW, height: 24, color: rgb(0.91, 0.95, 1.0), borderColor: AIA_BORD, borderWidth: 0.5 });
    page.drawText('AMOUNT CERTIFIED:', { x: RSX + 4, y: ry - 15, size: 8, font: bold, color: NB });
    if (currDue > 0) {
      const amtTxt = fmt$(currDue);
      page.drawText(amtTxt, { x: RSX + RSW - bold.widthOfTextAtSize(amtTxt, 10) - 4, y: ry - 15, size: 10, font: bold, color: NB });
    }
    ry -= 32;
  }
  if (ry > 40) {
    if (c.architect) page.drawText(`ARCHITECT: ${c.architect}`, { x: RSX + 4, y: ry - 10, size: 8, font: regular, color: DARK });
    ry -= 16;
    const le = RSX + RSW * 0.55;
    page.drawLine({ start: { x: RSX + 4, y: ry }, end: { x: le, y: ry }, thickness: 0.5, color: DARK });
    page.drawText('By:', { x: RSX + 4, y: ry + 4, size: 7, font: regular, color: MUTED });
    page.drawText('Date:', { x: le + 8, y: ry + 4, size: 7, font: regular, color: MUTED });
    page.drawLine({ start: { x: le + 32, y: ry }, end: { x: RSX + RSW, y: ry }, thickness: 0.5, color: DARK });
  }

  // Footer
  const ft = 'AIA Document G702 — Application and Certificate for Payment  |  Powered by ConstructionBear.AI';
  page.drawText(ft, { x: (PAGE_W - regular.widthOfTextAtSize(ft, 7)) / 2, y: 18, size: 7, font: regular, color: MUTED });
}

function _drawG703(page, fonts, doc, profile, c) {
  const { regular, bold } = fonts;
  const M  = 28;
  const W  = PAGE_W - M * 2; // 556
  const NB = rgb(0.06, 0.06, 0.06);
  const parse$ = s => parseFloat(String(s ?? '').replace(/[^0-9.-]/g, '')) || 0;
  const $k     = n => n ? '$' + Math.round(n).toLocaleString('en-US') : '';

  // Title
  let y = PAGE_H - M;
  page.drawText('CONTINUATION SHEET', { x: M, y, size: 11, font: bold, color: NB });
  const g3lbl = 'AIA DOCUMENT G703';
  page.drawText(g3lbl, { x: PAGE_W - M - bold.widthOfTextAtSize(g3lbl, 8), y, size: 8, font: bold, color: MUTED });
  y -= 12;
  page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 1.0, color: AIA_BORD });
  y -= 8;

  // App info
  for (const info of [
    `AIA Document G702, Application No: ${c.application_number || ''}   |   Date: ${c.date || ''}   |   Period To: ${c.period_to || ''}`,
    `Project: ${c.project_name || doc.title || ''}   |   Contractor: ${c.contractor || ''}`,
  ]) {
    page.drawText(info, { x: M, y, size: 8, font: regular, color: DARK });
    y -= 12;
  }
  y -= 4;

  // Column defs — total W = 556
  const cols = [
    { key: 'no',   hdr: ['ITEM', 'NO.'],               w: 24,  align: 'center' },
    { key: 'desc', hdr: ['DESCRIPTION OF WORK', ''],   w: 145, align: 'left'   },
    { key: 'sch',  hdr: ['SCHEDULED', 'VALUE (C)'],    w: 54,  align: 'right'  },
    { key: 'prev', hdr: ['WORK COMPL.', 'PREV (D)'],   w: 52,  align: 'right'  },
    { key: 'this', hdr: ['WORK COMPL.', 'THIS PD (E)'],w: 52,  align: 'right'  },
    { key: 'mats', hdr: ['MATERIALS', 'STORED (F)'],   w: 44,  align: 'right'  },
    { key: 'tot',  hdr: ['TOTAL COMPL.', '& STRD (G)'],w: 54,  align: 'right'  },
    { key: 'pct',  hdr: ['%', '(G/C)'],                w: 28,  align: 'right'  },
    { key: 'bal',  hdr: ['BALANCE', 'TO FINISH (H)'],  w: 52,  align: 'right'  },
    { key: 'ret',  hdr: ['RETAIN-', 'AGE (I)'],        w: 51,  align: 'right'  },
  ]; // 24+145+54+52+52+44+54+28+52+51 = 556 ✓

  // Header rows
  const hh = 24;
  let cxh = M;
  for (const col of cols) {
    page.drawRectangle({ x: cxh, y: y - hh, width: col.w, height: hh, color: AIA_BLUE, borderColor: AIA_BORD, borderWidth: 0.3 });
    page.drawText(col.hdr[0], { x: cxh + 2, y: y - 10, size: 6,   font: bold, color: NB });
    if (col.hdr[1]) page.drawText(col.hdr[1], { x: cxh + 2, y: y - 19, size: 5.5, font: bold, color: NB });
    cxh += col.w;
  }
  y -= hh;

  // Data rows
  const rowH = 15;
  const items = Array.isArray(c.line_items) ? c.line_items : [];
  let totSch = 0, totPrev = 0, totThis = 0, totMats = 0, totComp = 0, totBal = 0, totRet = 0;

  for (let r = 0; r < items.length; r++) {
    if (y < 50) break;
    const it  = items[r];
    const isO = typeof it === 'object' && it !== null;
    const sch  = parse$(isO ? (it.scheduled_value ?? it.value) : '');
    const prev = parse$(isO ? (it.prev_completed ?? it.previous) : '');
    const thisp= parse$(isO ? (it.this_period ?? it.this_application) : '');
    const mats = parse$(isO ? it.materials_stored : '');
    const tot  = prev + thisp + mats;
    const pct  = sch > 0 ? (tot / sch * 100).toFixed(1) : '';
    const bal  = sch - tot;
    const ret  = parse$(isO ? it.retainage : '');
    totSch += sch; totPrev += prev; totThis += thisp; totMats += mats;
    totComp += tot; totBal += bal; totRet += ret;

    const rv = {
      no:   isO ? String(it.item_no ?? it.no ?? r + 1) : String(r + 1),
      desc: isO ? String(it.description ?? '').slice(0, 44) : String(it).slice(0, 44),
      sch:  $k(sch), prev: $k(prev), this: $k(thisp), mats: $k(mats),
      tot:  $k(tot), pct: pct ? `${pct}%` : '', bal: $k(Math.max(0, bal)), ret: $k(ret),
    };
    const shade = r % 2 === 1 ? rgb(0.97, 0.97, 0.98) : WHITE;
    let cxr = M;
    for (const col of cols) {
      page.drawRectangle({ x: cxr, y: y - rowH, width: col.w, height: rowH, color: shade, borderColor: AIA_BORD, borderWidth: 0.25 });
      const v = rv[col.key];
      if (v) {
        const vW = regular.widthOfTextAtSize(v, 7.5);
        const tx = col.align === 'right'  ? cxr + col.w - vW - 2
                 : col.align === 'center' ? cxr + (col.w - vW) / 2
                 : cxr + 2;
        page.drawText(v, { x: tx, y: y - rowH + 4, size: 7.5, font: regular, color: NB });
      }
      cxr += col.w;
    }
    y -= rowH;
  }

  // TOTAL row
  if (y > 40) {
    const tv = {
      no: '', desc: 'TOTALS',
      sch:  $k(totSch), prev: $k(totPrev), this: $k(totThis), mats: $k(totMats),
      tot:  $k(totComp), pct: totSch > 0 ? `${(totComp/totSch*100).toFixed(1)}%` : '',
      bal:  $k(Math.max(0, totBal)), ret: $k(totRet),
    };
    let cxt = M;
    for (const col of cols) {
      page.drawRectangle({ x: cxt, y: y - rowH, width: col.w, height: rowH, color: AIA_BLUE, borderColor: AIA_BORD, borderWidth: 0.5 });
      const v = tv[col.key];
      if (v) {
        const vW = bold.widthOfTextAtSize(v, 8);
        const tx = col.align === 'right'  ? cxt + col.w - vW - 2
                 : col.align === 'center' ? cxt + (col.w - vW) / 2
                 : cxt + 2;
        page.drawText(v, { x: tx, y: y - rowH + 4, size: 8, font: bold, color: NB });
      }
      cxt += col.w;
    }
  }

  // Footer
  const ft = 'AIA Document G703 — Continuation Sheet  |  Powered by ConstructionBear.AI';
  page.drawText(ft, { x: (PAGE_W - regular.widthOfTextAtSize(ft, 7)) / 2, y: 18, size: 7, font: regular, color: MUTED });
}

async function renderDoc(doc, profile) {
  if (doc.type === 'pay_app') return renderPayApp(doc, profile);
  const pdfDoc  = await PDFDocument.create();
  const page    = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts   = { regular, bold };

  const c = typeof doc.content === 'string'
    ? { text: doc.content }
    : (doc.content?.text !== undefined ? doc.content : doc.content || {});

  const d = new Doc(page, fonts);

  // All types use clean AIA-style header — no dark bands on paper
  const isAIAType = true;

  if (!['rfi', 'submittal', 'invoice'].includes(doc.type)) {
    d.y = aiaDocHeader(page, fonts, profile, buildTitle(doc.type), 18, true) - 8;
  }

  // ── AIA header for invoice ───────────────────────────────────────────────
  if (doc.type === 'invoice') {
    d.y = aiaDocHeader(page, fonts, profile, 'INVOICE', 22, true) - 10;
  }

  // ── BODY by doc type ──────────────────────────────────────────────────────
  if (c.text) {
    d.sectionHeader('Document Content');
    for (const line of c.text.split('\n')) {
      if (d.y < BODY_BOT) break;
      d.text(line, { size: 9.5, color: DARK });
    }
  } else {
    switch (doc.type) {

      // ── RFI — AIA-accurate layout ──────────────────────────────────────────
      case 'rfi': {
        let y = aiaDocHeader(page, fonts, profile, 'Request For Information', 18, false);
        y -= 8;

        const W  = AIA_W; // 532
        const c3 = [Math.floor(W / 3), Math.floor(W / 3), W - 2 * Math.floor(W / 3)];
        const c2 = [Math.floor(W / 2), W - Math.floor(W / 2)];
        const c1 = [W];

        // Row 1+2: project info grid
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['Project Name', 'RFI Number', 'Date of Request'],
            values:  [c.project_name || '', c.rfi_number || '', c.date || ''],
            colWidths: c3, dataH: 24,
          },
          {
            headers: ['Project Location', 'Project ID', 'Drawing ID'],
            values:  [c.project_location || '', c.project_id || '', c.drawing_id || ''],
            colWidths: c3, dataH: 24,
          },
        ]);
        y -= 10;

        // Row 3: overview + spec section
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['RFI Overview', 'Section(s) Referenced'],
            values:  [c.overview || c.subject || '', c.sections_referenced || c.spec_section || ''],
            colWidths: c2, dataH: 50,
          },
        ]);
        y -= 10;

        // Row 4: request / clarification (tall)
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['Request / Clarification Required'],
            values:  [c.question || c.description || ''],
            colWidths: c1, dataH: 80,
          },
        ]);
        y -= 10;

        // Row 5: requesting party signature row
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['Name of Requesting Party', 'Signature', 'Date of Request'],
            values:  [c.submitted_by || c.requesting_party || '', '', c.date || ''],
            colWidths: c3, dataH: 28,
          },
        ]);
        y -= 10;

        // Row 6: response (tall, empty if no response yet)
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['Response'],
            values:  [c.response || ''],
            colWidths: c1, dataH: 80,
          },
        ]);
        y -= 10;

        // Row 7: responding party signature row
        aiaBlock(page, fonts, y, [
          {
            headers: ['Name of Responding Party', 'Signature', 'Date of Response'],
            values:  ['', '', ''],
            colWidths: c3, dataH: 28,
          },
        ]);
        break;
      }

      // ── SUBMITTAL — AIA-accurate layout ────────────────────────────────────
      case 'submittal': {
        let y = aiaDocHeader(page, fonts, profile, 'SUBMITTAL', 26, true);
        y -= 18;

        const W  = AIA_W; // 532
        // 4-col: project name wider, rest equal
        const c4 = [180, 112, 120, 120];
        const c2 = [Math.floor(W / 2), W - Math.floor(W / 2)];
        const c1 = [W];
        const c4sig = [133, 133, 133, 133];

        // Row 1: project info (4 cols)
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['Project Name', 'Submittal No.', 'Date', 'Spec Section'],
            values:  [c.project_name || '', c.submittal_number || '', c.date || '', c.spec_section || ''],
            colWidths: c4, dataH: 28,
          },
        ]);
        y -= 8;

        // Row 2: to / from
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['To', 'From'],
            values:  [c.addressed_to || c.to || 'Architect', c.submitted_by || c.from || ''],
            colWidths: c2, dataH: 28,
          },
        ]);
        y -= 8;

        // Row 3: description (tall)
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['Description'],
            values:  [c.description || ''],
            colWidths: c1, dataH: 65,
          },
        ]);
        y -= 8;

        // Row 4: contractor remarks (tall)
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['Contractor Remarks'],
            values:  [c.remarks || c.notes || ''],
            colWidths: c1, dataH: 65,
          },
        ]);
        y -= 8;

        // Row 5: action required / priority
        y = aiaBlock(page, fonts, y, [
          {
            headers: ['Action Required', 'Priority'],
            values:  [c.action || 'Review', c.priority || 'Routine'],
            colWidths: c2, dataH: 24,
          },
        ]);
        y -= 18;

        // Row 6: 4-col signature area (GC | Subcontractor | Architect | Consultant)
        const sigH = 100;
        const sigLabels = ['GC', 'Subcontractor', 'Architect', 'Consultant'];
        if (y > 60 + sigH) {
          let cx = AIA_MAR;
          for (let i = 0; i < 4; i++) {
            page.drawRectangle({
              x: cx, y: y - sigH, width: c4sig[i], height: sigH,
              color: WHITE, borderColor: AIA_BORD, borderWidth: 0.5,
            });
            cx += c4sig[i];
          }
          // centered label at bottom of each sig box
          cx = AIA_MAR;
          for (let i = 0; i < 4; i++) {
            const lw = regular.widthOfTextAtSize(sigLabels[i], 8.5);
            page.drawText(sigLabels[i], {
              x: cx + (c4sig[i] - lw) / 2, y: y - sigH + 6,
              size: 8.5, font: regular, color: rgb(0.4, 0.4, 0.4),
            });
            cx += c4sig[i];
          }
        }
        break;
      }

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

      case 'lien_waiver': {
        const lwLabel = {
          conditional_progress:   'CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT',
          unconditional_progress: 'UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT',
          conditional_final:      'CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT',
          unconditional_final:    'UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT',
        }[c.type] || 'LIEN WAIVER';
        d._text(lwLabel, MARGIN, d.y, 8.5, bold, BLACK);
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
        // Handled by renderPayApp (two-page G702/G703) — early return above
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

  // ── FOOTER — clean for all doc types ─────────────────────────────────────
  const footerText = 'Powered by Dove & Bear Inc.';
  const ftW = regular.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, {
    x: (PAGE_W - ftW) / 2, y: 18,
    size: 8, font: regular, color: rgb(0.5, 0.5, 0.5),
  });

  return pdfDoc.save();
}

// GET /pdf/:id — download PDF for a document
router.get('/:id', requireAuth, async (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(req.userId);
  const parsedContent = JSON.parse(doc.content_json);
  // Inject doc_number into content so it appears in type-specific number fields
  if (doc.doc_number) {
    const numFields = ['doc_number', 'rfi_number', 'submittal_number', 'co_number', 'invoice_number',
      'transmittal_number', 'report_number', 'payroll_number', 'application_number', 'ccd_number',
      'request_number', 'rfp_number', 'permit_number'];
    for (const f of numFields) {
      if (!(parsedContent[f])) parsedContent[f] = doc.doc_number;
    }
  }
  const parsedDoc = { ...doc, content: parsedContent };

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
