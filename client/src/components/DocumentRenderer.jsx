import React from 'react';

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-bear-muted uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-bear-text leading-relaxed">{value}</p>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-bear-border last:border-0">
      <span className="text-xs text-bear-muted">{label}</span>
      <span className="text-xs font-medium text-bear-text">{value}</span>
    </div>
  );
}

function DocHeader({ badge, title, subtitle, number, date }) {
  return (
    <div className="border-b border-bear-border pb-4 mb-5">
      <div className="flex items-start justify-between mb-1">
        <span className="text-xs font-bold uppercase tracking-widest text-bear-accent">{badge}</span>
        {(number || date) && (
          <div className="text-right">
            {number && <p className="text-xs text-bear-muted">#{number}</p>}
            {date && <p className="text-xs text-bear-muted">{date}</p>}
          </div>
        )}
      </div>
      <h2 className="text-base font-bold text-bear-text mt-1">{title}</h2>
      {subtitle && <p className="text-xs text-bear-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

function RawTextFallback({ text }) {
  return <pre className="text-sm text-bear-text leading-relaxed whitespace-pre-wrap font-sans">{text}</pre>;
}

// --- Doc type renderers ---

function RFIRenderer({ c }) {
  return (
    <>
      <DocHeader badge="RFI" title={c.subject || 'Request for Information'} subtitle={c.project_name} number={c.rfi_number} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Addressed To" value={c.addressed_to} />
        <Field label="Submitted By" value={c.submitted_by} />
        <Field label="Date Needed" value={c.date_needed} />
        <Field label="Project" value={c.project_name} />
      </div>
      <Field label="Question / Request" value={c.question} />
      {c.response && <Field label="Response" value={c.response} />}
    </>
  );
}

function ChangeOrderRenderer({ c }) {
  return (
    <>
      <DocHeader badge="Change Order" title={c.description || 'Change Order'} subtitle={c.project_name} number={c.co_number} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Contractor" value={c.contractor} />
        <Field label="Owner" value={c.owner} />
        <Field label="Project" value={c.project_name} />
        <Field label="Reason" value={c.reason} />
      </div>
      <div className="bg-bear-surface border border-bear-border rounded-xl p-4 mt-2">
        <Row label="Cost Change" value={c.cost_change} />
        <Row label="Days Added" value={c.days_added} />
      </div>
    </>
  );
}

function SubmittalRenderer({ c }) {
  return (
    <>
      <DocHeader badge="Submittal" title={c.description || 'Submittal'} subtitle={c.project_name} number={c.submittal_number} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Spec Section" value={c.spec_section} />
        <Field label="Supplier" value={c.supplier} />
        <Field label="Submitted By" value={c.submitted_by} />
        <Field label="Revision" value={c.revision} />
      </div>
      <Field label="Description" value={c.description} />
    </>
  );
}

function LienWaiverRenderer({ c }) {
  const typeLabel = {
    conditional_progress: 'Conditional Waiver — Progress Payment',
    unconditional_progress: 'Unconditional Waiver — Progress Payment',
    conditional_final: 'Conditional Waiver — Final Payment',
    unconditional_final: 'Unconditional Waiver — Final Payment',
  }[c.type] || c.type || 'Lien Waiver';

  return (
    <>
      <DocHeader badge="Lien Waiver" title={typeLabel} subtitle={c.property_address} date={c.through_date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Claimant" value={c.claimant} />
        <Field label="Owner" value={c.owner} />
        <Field label="Property" value={c.property_address} />
        <Field label="Project" value={c.project_name} />
        <Field label="Through Date" value={c.through_date} />
        <Field label="Amount" value={c.amount} />
      </div>
    </>
  );
}

function PayAppRenderer({ c }) {
  return (
    <>
      <DocHeader badge="Pay Application" title={`Application #${c.application_number || '—'}`} subtitle={c.project_name} date={c.period_to} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Contractor" value={c.contractor} />
        <Field label="Owner" value={c.owner} />
        <Field label="Architect" value={c.architect} />
        <Field label="Period To" value={c.period_to} />
      </div>
      <div className="bg-bear-surface border border-bear-border rounded-xl p-4 mt-2">
        <Row label="Contract Amount" value={c.contract_amount} />
        <Row label="Work Completed" value={c.work_completed} />
        <Row label="Retainage %" value={c.retainage_percent} />
        <Row label="Previous Payments" value={c.previous_payments} />
      </div>
    </>
  );
}

function MeetingMinutesRenderer({ c }) {
  const attendees = Array.isArray(c.attendees) ? c.attendees.join(', ') : c.attendees;
  const agenda = Array.isArray(c.agenda_items) ? c.agenda_items.join('\n') : c.agenda_items;
  const actions = Array.isArray(c.action_items) ? c.action_items.join('\n') : c.action_items;

  return (
    <>
      <DocHeader badge="Meeting Minutes" title={c.project_name || 'Meeting Minutes'} subtitle={c.location} date={c.meeting_date} />
      <Field label="Attendees" value={attendees} />
      <Field label="Agenda" value={agenda} />
      {actions && <Field label="Action Items" value={actions} />}
      {c.next_meeting && <Field label="Next Meeting" value={c.next_meeting} />}
    </>
  );
}

function NTORenderer({ c }) {
  return (
    <>
      <DocHeader badge="Notice to Owner" title="Notice to Owner / Notice to Contractor" subtitle={c.property_address} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Owner" value={c.owner_name} />
        <Field label="Owner Address" value={c.owner_address} />
        <Field label="Contractor" value={c.contractor_name} />
        <Field label="Contractor Address" value={c.contractor_address} />
        {c.lender_name && <Field label="Lender" value={c.lender_name} />}
        <Field label="Property" value={c.property_address} />
      </div>
      <Field label="Services / Materials" value={c.services_description} />
    </>
  );
}

function SubcontractRenderer({ c }) {
  return (
    <>
      <DocHeader badge="Subcontract" title={c.project_name || 'Subcontract Agreement'} date={c.start_date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="General Contractor" value={c.general_contractor} />
        <Field label="Subcontractor" value={c.subcontractor} />
        <Field label="Start Date" value={c.start_date} />
        <Field label="Completion Date" value={c.completion_date} />
        <Field label="Contract Value" value={c.contract_value} />
        <Field label="Payment Terms" value={c.payment_terms} />
      </div>
      <Field label="Scope of Work" value={c.scope_of_work} />
      {c.insurance_requirements && <Field label="Insurance Requirements" value={c.insurance_requirements} />}
    </>
  );
}

function DailyReportRenderer({ c }) {
  const workers = Array.isArray(c.workers_on_site) ? c.workers_on_site.join(', ') : c.workers_on_site;
  return (
    <>
      <DocHeader badge="Daily Field Report" title={c.project_name || 'Daily Field Report'} subtitle={c.superintendent ? `Superintendent: ${c.superintendent}` : null} number={c.report_number} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Weather" value={c.weather} />
        <Field label="Temperature" value={c.temperature} />
        <Field label="Workers on Site" value={workers} />
        <Field label="Visitors" value={c.visitors} />
      </div>
      <Field label="Work Performed" value={c.work_performed} />
      {c.materials_delivered && <Field label="Materials Delivered" value={c.materials_delivered} />}
      {c.equipment_on_site && <Field label="Equipment on Site" value={c.equipment_on_site} />}
      {c.delays && <Field label="Delays / Issues" value={c.delays} />}
      {c.safety_incidents && <Field label="Safety Incidents" value={c.safety_incidents} />}
      {c.notes && <Field label="Notes" value={c.notes} />}
    </>
  );
}

function PunchListRenderer({ c }) {
  const items = Array.isArray(c.items)
    ? c.items
    : typeof c.items === 'string'
      ? c.items.split('\n').filter(Boolean)
      : [];
  return (
    <>
      <DocHeader badge="Punch List" title={c.project_name || 'Punch List'} subtitle={c.location} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Prepared By" value={c.prepared_by} />
        <Field label="Contractor" value={c.contractor} />
      </div>
      {items.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-bear-muted uppercase tracking-wider mb-2">Items</p>
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-bear-border last:border-0">
                <div className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border border-bear-border" />
                <span className="text-sm text-bear-text">{typeof item === 'object' ? item.description || JSON.stringify(item) : item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function InvoiceRenderer({ c }) {
  const lineItems = Array.isArray(c.line_items) ? c.line_items : [];
  return (
    <>
      <DocHeader badge="Invoice" title={`Invoice #${c.invoice_number || '—'}`} subtitle={c.project_name} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6 mb-4">
        <div>
          <p className="text-xs font-semibold text-bear-muted uppercase tracking-wider mb-1">Bill To</p>
          <p className="text-sm text-bear-text font-medium">{c.bill_to_name}</p>
          {c.bill_to_address && <p className="text-sm text-bear-muted">{c.bill_to_address}</p>}
        </div>
        <div className="text-right">
          {c.due_date && <><p className="text-xs text-bear-muted uppercase tracking-wider">Due Date</p><p className="text-sm text-bear-text">{c.due_date}</p></>}
          {c.payment_terms && <p className="text-xs text-bear-muted mt-1">{c.payment_terms}</p>}
        </div>
      </div>
      {lineItems.length > 0 && (
        <div className="mb-3">
          <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-bear-border">
            <span className="col-span-7 text-xs font-semibold text-bear-muted uppercase">Description</span>
            <span className="col-span-2 text-xs font-semibold text-bear-muted uppercase text-right">Qty</span>
            <span className="col-span-3 text-xs font-semibold text-bear-muted uppercase text-right">Amount</span>
          </div>
          {lineItems.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 py-2 border-b border-bear-border last:border-0">
              <span className="col-span-7 text-sm text-bear-text">{item.description || item}</span>
              <span className="col-span-2 text-sm text-bear-muted text-right">{item.quantity || ''}</span>
              <span className="col-span-3 text-sm text-bear-text text-right">{item.amount || ''}</span>
            </div>
          ))}
        </div>
      )}
      <div className="bg-bear-surface border border-bear-border rounded-xl p-4">
        {c.subtotal && <Row label="Subtotal" value={c.subtotal} />}
        {c.tax_amount && <Row label={`Tax${c.tax_rate ? ` (${c.tax_rate})` : ''}`} value={c.tax_amount} />}
        <Row label="Total" value={c.total} />
      </div>
      {c.notes && <Field label="Notes" value={c.notes} />}
    </>
  );
}

function TransmittalRenderer({ c }) {
  const items = Array.isArray(c.items)
    ? c.items
    : typeof c.items === 'string' ? c.items.split('\n').filter(Boolean) : [];
  return (
    <>
      <DocHeader badge="Transmittal" title={c.subject || 'Transmittal'} subtitle={c.project_name} number={c.transmittal_number} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="To" value={c.to_name} />
        <Field label="Company" value={c.to_company} />
        <Field label="From" value={c.from_name} />
        <Field label="Action Required" value={c.action_required} />
      </div>
      {items.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-bear-muted uppercase tracking-wider mb-2">Items Transmitted</p>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-bear-border last:border-0 text-sm text-bear-text">
              <span className="text-bear-muted">{i + 1}.</span>
              <span>{typeof item === 'object' ? item.description || JSON.stringify(item) : item}</span>
            </div>
          ))}
        </div>
      )}
      {c.notes && <Field label="Notes" value={c.notes} />}
    </>
  );
}

function SOVRenderer({ c }) {
  const items = Array.isArray(c.line_items) ? c.line_items : [];
  return (
    <>
      <DocHeader badge="Schedule of Values" title={c.project_name || 'Schedule of Values'} subtitle={c.contractor} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Owner" value={c.owner} />
        <Field label="Architect" value={c.architect} />
        <Field label="Contract #" value={c.contract_number} />
        <Field label="Contract Amount" value={c.contract_amount} />
      </div>
      {items.length > 0 && (
        <div className="mt-3">
          <div className="grid grid-cols-12 gap-2 py-1.5 border-b border-bear-border">
            <span className="col-span-1 text-xs font-semibold text-bear-muted uppercase">#</span>
            <span className="col-span-7 text-xs font-semibold text-bear-muted uppercase">Description</span>
            <span className="col-span-4 text-xs font-semibold text-bear-muted uppercase text-right">Scheduled Value</span>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 py-2 border-b border-bear-border last:border-0">
              <span className="col-span-1 text-sm text-bear-muted">{i + 1}</span>
              <span className="col-span-7 text-sm text-bear-text">{item.description || item}</span>
              <span className="col-span-4 text-sm text-bear-text text-right">{item.value || item.scheduled_value || ''}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function NTPRenderer({ c }) {
  return (
    <>
      <DocHeader badge="Notice to Proceed" title={c.project_name || 'Notice to Proceed'} subtitle={c.project_address} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Contractor" value={c.contractor_name} />
        <Field label="Owner" value={c.owner_name} />
        <Field label="Commencement Date" value={c.commencement_date} />
        <Field label="Completion Date" value={c.completion_date} />
      </div>
      {c.contract_amount && <Field label="Contract Amount" value={c.contract_amount} />}
    </>
  );
}

function SubstantialCompletionRenderer({ c }) {
  return (
    <>
      <DocHeader badge="Substantial Completion" title={c.project_name || 'Certificate of Substantial Completion'} subtitle={c.project_address} date={c.date_of_issuance} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Contractor" value={c.contractor} />
        <Field label="Owner" value={c.owner} />
        <Field label="Architect" value={c.architect} />
        <Field label="Date of Substantial Completion" value={c.date_of_substantial_completion} />
        <Field label="Warranty Start Date" value={c.warranty_start_date} />
      </div>
      {c.list_of_items && <Field label="Remaining Items" value={c.list_of_items} />}
    </>
  );
}

function WarrantyLetterRenderer({ c }) {
  return (
    <>
      <DocHeader badge="Warranty Letter" title={c.project_name || 'Warranty Letter'} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Contractor" value={c.contractor_name} />
        <Field label="Contractor Address" value={c.contractor_address} />
        <Field label="Owner" value={c.owner_name} />
        <Field label="Owner Address" value={c.owner_address} />
        <Field label="Warranty Period" value={c.warranty_period} />
        <Field label="Warranty Start" value={c.warranty_start_date} />
        <Field label="Warranty End" value={c.warranty_end_date} />
      </div>
      <Field label="Work Description" value={c.work_description} />
      {c.exclusions && <Field label="Exclusions" value={c.exclusions} />}
    </>
  );
}

function SubstitutionRequestRenderer({ c }) {
  return (
    <>
      <DocHeader badge="Substitution Request" title={c.project_name || 'Substitution Request'} subtitle={`Submitted by: ${c.submitted_by || '—'}`} number={c.request_number} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Specified Item" value={c.specified_item} />
        <Field label="Specified Manufacturer" value={c.specified_manufacturer} />
        <Field label="Proposed Item" value={c.proposed_item} />
        <Field label="Proposed Manufacturer" value={c.proposed_manufacturer} />
        <Field label="Cost Difference" value={c.cost_difference} />
        <Field label="Schedule Impact" value={c.schedule_impact} />
      </div>
      <Field label="Reason for Substitution" value={c.reason} />
      {c.attachments && <Field label="Attachments" value={c.attachments} />}
    </>
  );
}

function CloseoutChecklistRenderer({ c }) {
  const items = Array.isArray(c.items)
    ? c.items
    : typeof c.items === 'string' ? c.items.split('\n').filter(Boolean) : [];
  return (
    <>
      <DocHeader badge="Close-Out Checklist" title={c.project_name || 'Project Close-Out Checklist'} date={c.date} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Contractor" value={c.contractor} />
        <Field label="Owner" value={c.owner} />
        <Field label="Project Manager" value={c.project_manager} />
      </div>
      {items.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-bear-muted uppercase tracking-wider mb-2">Checklist Items</p>
          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-bear-border last:border-0">
                <div className="w-4 h-4 mt-0.5 flex-shrink-0 rounded border border-bear-border" />
                <span className="text-sm text-bear-text">{typeof item === 'object' ? item.description || JSON.stringify(item) : item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function CertifiedPayrollRenderer({ c }) {
  const employees = Array.isArray(c.employees) ? c.employees : [];
  return (
    <>
      <DocHeader badge="Certified Payroll" title={c.project_name || 'Certified Payroll Report'} subtitle={`Contractor: ${c.contractor || '—'}`} date={c.week_ending ? `Week ending ${c.week_ending}` : null} />
      <div className="grid grid-cols-2 gap-x-6">
        <Field label="Contractor" value={c.contractor} />
        <Field label="Project #" value={c.project_number} />
        <Field label="Payroll #" value={c.payroll_number} />
        <Field label="Week Ending" value={c.week_ending} />
      </div>
      {employees.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-bear-muted uppercase tracking-wider mb-2">Employees</p>
          {employees.map((emp, i) => (
            <div key={i} className="py-2 border-b border-bear-border last:border-0 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-bear-text">{emp.name || `Employee ${i + 1}`}</span>
                <span className="text-bear-muted">{emp.classification || ''}</span>
              </div>
              {(emp.hours || emp.rate || emp.gross) && (
                <div className="flex gap-4 mt-0.5 text-xs text-bear-muted">
                  {emp.hours && <span>Hours: {emp.hours}</span>}
                  {emp.rate && <span>Rate: {emp.rate}</span>}
                  {emp.gross && <span>Gross: {emp.gross}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// --- Upload renderer ---

function UploadRenderer({ c }) {
  const API_BASE = import.meta.env.VITE_API_URL || '/api';
  // Strip /api prefix since uploads are served from root
  const serverBase = API_BASE.replace(/\/api$/, '');
  const url = c.file_path ? `${serverBase}${c.file_path}` : null;
  return (
    <div className="space-y-3">
      <Row label="Original File" value={c.original_name || '—'} />
      <Row label="Size" value={c.size ? `${(c.size / 1024).toFixed(1)} KB` : '—'} />
      {url && (
        <div className="mt-4">
          <a href={url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-bear-accent hover:underline font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Open PDF
          </a>
          <iframe src={url} className="w-full mt-3 rounded-xl border border-bear-border" style={{ height: '70vh' }} title="PDF Preview" />
        </div>
      )}
    </div>
  );
}

// --- Main renderer ---

const RENDERERS = {
  rfi: RFIRenderer,
  change_order: ChangeOrderRenderer,
  submittal: SubmittalRenderer,
  lien_waiver: LienWaiverRenderer,
  pay_app: PayAppRenderer,
  meeting_minutes: MeetingMinutesRenderer,
  notice_to_owner: NTORenderer,
  subcontract: SubcontractRenderer,
  daily_report: DailyReportRenderer,
  punch_list: PunchListRenderer,
  invoice: InvoiceRenderer,
  transmittal: TransmittalRenderer,
  schedule_of_values: SOVRenderer,
  notice_to_proceed: NTPRenderer,
  substantial_completion: SubstantialCompletionRenderer,
  warranty_letter: WarrantyLetterRenderer,
  substitution_request: SubstitutionRequestRenderer,
  closeout_checklist: CloseoutChecklistRenderer,
  certified_payroll: CertifiedPayrollRenderer,
  upload: UploadRenderer,
};

export default function DocumentRenderer({ doc }) {
  const content = doc.content || {};

  // If content is plain text (AI-generated from chat), show as raw
  if (typeof content === 'string' || typeof content.text === 'string') {
    const text = typeof content === 'string' ? content : content.text;
    return (
      <div className="bg-bear-surface border border-bear-border rounded-2xl p-5">
        <RawTextFallback text={text} />
      </div>
    );
  }

  const Renderer = RENDERERS[doc.type];

  return (
    <div className="bg-bear-surface border border-bear-border rounded-2xl p-5">
      {Renderer ? <Renderer c={content} /> : <RawTextFallback text={JSON.stringify(content, null, 2)} />}
    </div>
  );
}
