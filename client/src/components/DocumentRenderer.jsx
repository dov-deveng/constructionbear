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
