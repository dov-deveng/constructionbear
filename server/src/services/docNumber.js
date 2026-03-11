import { getDb } from '../db/schema.js';

// Document type abbreviations
const DOC_TYPE_ABBREV = {
  rfi: 'RFI',
  submittal: 'SUB',
  change_order: 'CO',
  invoice: 'INV',
  pay_app: 'PAY',
  lien_waiver: 'LW',
  meeting_minutes: 'MM',
  daily_field_report: 'DFR',
  punch_list: 'PL',
  notice_to_proceed: 'NTP',
  transmittal: 'TX',
  rfp: 'RFP',
  change_directive: 'CCD',
  substantial_completion: 'SC',
  subcontract: 'SA',
  weekly_report: 'WR',
  schedule_of_values: 'SOV',
  certified_payroll: 'CPR',
  bid_proposal: 'BID',
  warranty: 'WRN',
  closeout: 'CLO',
  field_order: 'FO',
  visitor_log: 'VL',
  parking_permit: 'PP',
};

function projectPrefix(projectName) {
  if (!projectName) return 'GEN';
  return projectName.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'GEN';
}

/**
 * Atomically assign the next document number for a project + doc type.
 * Returns a string like "BEACHSIDE-RFI-0001".
 * Falls back to "DRAFT" if project_id is null (doc not linked to project).
 */
export function assignDocNumber(projectId, projectName, docType) {
  if (!projectId) return null;

  const db = getDb();
  const abbrev = DOC_TYPE_ABBREV[docType] || docType.toUpperCase().slice(0, 6);
  const prefix = projectPrefix(projectName);

  // Use a transaction to guarantee atomicity
  const assignNumber = db.transaction(() => {
    const existing = db.prepare('SELECT last_number FROM document_sequences WHERE project_id = ? AND doc_type = ?').get(projectId, docType);
    const next = (existing?.last_number || 0) + 1;

    if (existing) {
      db.prepare('UPDATE document_sequences SET last_number = ? WHERE project_id = ? AND doc_type = ?').run(next, projectId, docType);
    } else {
      db.prepare('INSERT INTO document_sequences (project_id, doc_type, last_number) VALUES (?, ?, ?)').run(projectId, docType, next);
    }

    return `${prefix}-${abbrev}-${String(next).padStart(4, '0')}`;
  });

  return assignNumber();
}
