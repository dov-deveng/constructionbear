/**
 * AIA-format document templates for ConstructionBear.AI
 * Each template defines: fields, sections, standard language, and AIA form reference.
 * The bot collects the variable fields; the template provides structure and boilerplate.
 */

export const AIA_TEMPLATES = {

  // ── RFI — AIA G716 ─────────────────────────────────────────────────────────
  rfi: {
    type: 'rfi',
    label: 'Request for Information',
    aia_form: 'AIA G716',
    fields: {
      rfi_number:    { label: 'RFI No.',          required: true },
      date:          { label: 'Date',              required: true },
      project_name:  { label: 'Project Name',      required: true },
      project_number:{ label: 'Project No.',       required: false },
      owner:         { label: 'Owner',             required: false },
      contractor:    { label: 'Contractor',        required: false },
      architect:     { label: 'Architect',         required: false },
      addressed_to:  { label: 'Addressed To',      required: true },
      submitted_by:  { label: 'Submitted By',      required: true },
      subject:       { label: 'Subject',           required: true },
      question:      { label: 'Request / Question',required: true },
      date_needed:   { label: 'Response Needed By',required: false },
      response:      { label: 'Response',          required: false },
      attachments:   { label: 'Attachments',       required: false },
    },
    standard_language: {
      footer: 'This Request for Information is submitted in accordance with AIA Document G716.',
    },
  },

  // ── Submittal Cover Sheet ───────────────────────────────────────────────────
  submittal: {
    type: 'submittal',
    label: 'Submittal Cover Sheet',
    aia_form: 'Standard',
    fields: {
      submittal_number: { label: 'Submittal No.',    required: true },
      date:             { label: 'Date',             required: true },
      project_name:     { label: 'Project Name',     required: true },
      project_number:   { label: 'Project No.',      required: false },
      spec_section:     { label: 'Spec Section',     required: true },
      spec_title:       { label: 'Spec Title',       required: false },
      submitted_by:     { label: 'Submitted By',     required: true },
      submitted_to:     { label: 'Submitted To',     required: false },
      supplier:         { label: 'Supplier / Mfr.',  required: false },
      description:      { label: 'Description',      required: true },
      revision:         { label: 'Revision No.',     required: false },
      copies:           { label: 'No. of Copies',    required: false },
      action_required:  { label: 'Action Required',  required: false },
      action_taken:     { label: 'Action Taken',     required: false },
      notes:            { label: 'Notes',            required: false },
    },
    action_codes: [
      'Approved',
      'Approved as Noted',
      'Revise and Resubmit',
      'Rejected',
      'For Information Only',
    ],
  },

  // ── Change Order — AIA G701 ─────────────────────────────────────────────────
  change_order: {
    type: 'change_order',
    label: 'Change Order',
    aia_form: 'AIA G701',
    fields: {
      co_number:           { label: 'Change Order No.',         required: true },
      date:                { label: 'Date',                     required: true },
      project_name:        { label: 'Project',                  required: true },
      project_number:      { label: 'Project No.',              required: false },
      owner:               { label: 'Owner',                    required: false },
      architect:           { label: 'Architect',                required: false },
      contractor:          { label: 'Contractor',               required: true },
      contract_date:       { label: 'Contract Date',            required: false },
      description:         { label: 'Description of Change',    required: true },
      reason:              { label: 'Reason for Change',        required: false },
      original_contract:   { label: 'Original Contract Sum',    required: false },
      previous_cos:        { label: 'Net Changes by Prior COs', required: false },
      cost_change:         { label: 'Change in Contract Sum',   required: true },
      new_contract_sum:    { label: 'New Contract Sum',         required: false },
      days_added:          { label: 'Change in Contract Time',  required: false },
      new_completion_date: { label: 'New Substantial Completion Date', required: false },
    },
    standard_language: {
      agreement: 'The Owner, Architect, and Contractor agree to the following change to the Contract Documents:',
      footer: 'This Change Order is issued in accordance with AIA Document G701. The original Contract Sum, Contract Time, and Milestones set forth in the Agreement are changed as indicated.',
    },
  },

  // ── Construction Change Directive — AIA G714 ────────────────────────────────
  ccd: {
    type: 'ccd',
    label: 'Construction Change Directive',
    aia_form: 'AIA G714',
    fields: {
      ccd_number:      { label: 'CCD No.',              required: true },
      date:            { label: 'Date',                 required: true },
      project_name:    { label: 'Project',              required: true },
      project_number:  { label: 'Project No.',          required: false },
      owner:           { label: 'Owner',                required: false },
      architect:       { label: 'Architect',            required: false },
      contractor:      { label: 'Contractor',           required: true },
      contract_date:   { label: 'Contract Date',        required: false },
      description:     { label: 'Description of Work',  required: true },
      basis:           { label: 'Basis of Adjustment',  required: true },
      amount:          { label: 'Estimated Amount',     required: false },
      time_adjustment: { label: 'Time Adjustment',      required: false },
      method:          { label: 'Method of Determination', required: false },
    },
    basis_options: [
      'Mutual Agreement (lump sum)',
      'Unit Prices stated in the Contract',
      'Cost plus markup per Contract',
      'To be determined',
    ],
    standard_language: {
      directive: 'The Owner and Architect direct the Contractor to proceed with the following changes in the Work:',
      footer: 'Issued in accordance with AIA Document G714. This Construction Change Directive is not a Change Order. The Contractor must proceed with the directed changes.',
    },
  },

  // ── Application for Payment — AIA G702/G703 ─────────────────────────────────
  pay_app: {
    type: 'pay_app',
    label: 'Application for Payment',
    aia_form: 'AIA G702/G703',
    fields: {
      application_number:   { label: 'Application No.',            required: true },
      period_to:            { label: 'Period To',                  required: true },
      date:                 { label: 'Date',                       required: true },
      project_name:         { label: 'Project',                    required: true },
      project_number:       { label: 'Project No.',                required: false },
      owner:                { label: 'Owner',                      required: false },
      architect:            { label: 'Architect',                  required: false },
      contractor:           { label: 'Contractor',                 required: true },
      contract_date:        { label: 'Contract Date',              required: false },
      original_contract:    { label: 'Original Contract Sum',      required: true },
      net_changes:          { label: 'Net Change by Change Orders', required: false },
      contract_sum_to_date: { label: 'Contract Sum to Date',       required: false },
      work_completed:       { label: 'Total Completed & Stored',   required: true },
      retainage_percent:    { label: 'Retainage %',                required: false },
      retainage_amount:     { label: 'Retainage Amount',           required: false },
      total_earned:         { label: 'Total Earned Less Retainage',required: false },
      previous_payments:    { label: 'Less Previous Certificates', required: false },
      current_payment_due:  { label: 'Current Payment Due',        required: true },
      balance_to_finish:    { label: 'Balance to Finish',          required: false },
      schedule_of_values:   { label: 'Schedule of Values',         required: false },
    },
    standard_language: {
      certification: 'The undersigned Contractor certifies that to the best of the Contractor\'s knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents.',
      footer: 'AIA Document G702/G703. Application and Certificate for Payment.',
    },
  },

  // ── Lien Waivers (4 types) ──────────────────────────────────────────────────
  lien_waiver_conditional_progress: {
    type: 'lien_waiver',
    subtype: 'conditional_progress',
    label: 'Conditional Waiver and Release on Progress Payment',
    aia_form: 'Standard Form per FL Statute §713.20',
    fields: {
      claimant:         { label: 'Claimant (Company Name)',   required: true },
      owner:            { label: 'Owner',                     required: true },
      property_address: { label: 'Property Address',          required: true },
      project_name:     { label: 'Project Name',              required: false },
      through_date:     { label: 'Through Date',              required: true },
      amount:           { label: 'Payment Amount',            required: true },
      check_number:     { label: 'Check / ACH No.',           required: false },
      date:             { label: 'Date',                      required: true },
      signatory_name:   { label: 'Authorized Signature Name', required: true },
      signatory_title:  { label: 'Title',                     required: false },
    },
    standard_language: {
      waiver_text: 'This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job through the Through Date of this document. Rights based upon labor or service provided, or equipment or material delivered, after the Through Date of this document are not waived or released. This document is effective only on the claimant\'s receipt of payment from the financial institution on which the following check is drawn: Check No. {{check_number}}, Payable to {{claimant}}, Amount: {{amount}}.',
    },
  },

  lien_waiver_unconditional_progress: {
    type: 'lien_waiver',
    subtype: 'unconditional_progress',
    label: 'Unconditional Waiver and Release on Progress Payment',
    aia_form: 'Standard Form per FL Statute §713.20',
    fields: {
      claimant:         { label: 'Claimant (Company Name)',   required: true },
      owner:            { label: 'Owner',                     required: true },
      property_address: { label: 'Property Address',          required: true },
      project_name:     { label: 'Project Name',              required: false },
      through_date:     { label: 'Through Date',              required: true },
      amount:           { label: 'Payment Amount',            required: true },
      date:             { label: 'Date',                      required: true },
      signatory_name:   { label: 'Authorized Signature Name', required: true },
      signatory_title:  { label: 'Title',                     required: false },
    },
    standard_language: {
      waiver_text: 'This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job through the Through Date of this document. Rights based upon labor or service provided, or equipment or material delivered, after the Through Date of this document are not waived or released. The claimant has received the following payment: Amount: {{amount}}.',
    },
  },

  lien_waiver_conditional_final: {
    type: 'lien_waiver',
    subtype: 'conditional_final',
    label: 'Conditional Waiver and Release on Final Payment',
    aia_form: 'Standard Form per FL Statute §713.20',
    fields: {
      claimant:         { label: 'Claimant (Company Name)',   required: true },
      owner:            { label: 'Owner',                     required: true },
      property_address: { label: 'Property Address',          required: true },
      project_name:     { label: 'Project Name',              required: false },
      amount:           { label: 'Final Payment Amount',       required: true },
      check_number:     { label: 'Check / ACH No.',           required: false },
      date:             { label: 'Date',                      required: true },
      signatory_name:   { label: 'Authorized Signature Name', required: true },
      signatory_title:  { label: 'Title',                     required: false },
    },
    standard_language: {
      waiver_text: 'This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job. This document is effective only on the claimant\'s receipt of payment from the financial institution on which the following check is drawn: Check No. {{check_number}}, Payable to {{claimant}}, Amount: {{amount}}.',
    },
  },

  lien_waiver_unconditional_final: {
    type: 'lien_waiver',
    subtype: 'unconditional_final',
    label: 'Unconditional Waiver and Release on Final Payment',
    aia_form: 'Standard Form per FL Statute §713.20',
    fields: {
      claimant:         { label: 'Claimant (Company Name)',   required: true },
      owner:            { label: 'Owner',                     required: true },
      property_address: { label: 'Property Address',          required: true },
      project_name:     { label: 'Project Name',              required: false },
      amount:           { label: 'Final Payment Amount',       required: true },
      date:             { label: 'Date',                      required: true },
      signatory_name:   { label: 'Authorized Signature Name', required: true },
      signatory_title:  { label: 'Title',                     required: false },
    },
    standard_language: {
      waiver_text: 'This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job. The claimant has received the following final payment in full: Amount: {{amount}}.',
    },
  },

  // ── Transmittal ─────────────────────────────────────────────────────────────
  transmittal: {
    type: 'transmittal',
    label: 'Transmittal',
    aia_form: 'Standard',
    fields: {
      transmittal_number: { label: 'Transmittal No.',   required: true },
      date:               { label: 'Date',              required: true },
      project_name:       { label: 'Project',           required: true },
      project_number:     { label: 'Project No.',       required: false },
      to_name:            { label: 'To',                required: true },
      to_company:         { label: 'To Company',        required: false },
      to_email:           { label: 'To Email',          required: false },
      from_name:          { label: 'From',              required: true },
      from_company:       { label: 'From Company',      required: false },
      subject:            { label: 'Subject',           required: true },
      items:              { label: 'Items Transmitted', required: true },
      action_required:    { label: 'Action Required',   required: false },
      notes:              { label: 'Notes / Remarks',   required: false },
    },
    action_options: [
      'For Approval',
      'For Review and Comment',
      'Approved as Submitted',
      'Approved as Noted',
      'For Your Use',
      'For Information Only',
      'As Requested',
    ],
  },

  // ── Meeting Minutes ─────────────────────────────────────────────────────────
  meeting_minutes: {
    type: 'meeting_minutes',
    label: 'Meeting Minutes',
    aia_form: 'Standard',
    fields: {
      meeting_number:  { label: 'Meeting No.',       required: false },
      meeting_date:    { label: 'Date',              required: true },
      meeting_time:    { label: 'Time',              required: false },
      location:        { label: 'Location',          required: false },
      project_name:    { label: 'Project',           required: true },
      project_number:  { label: 'Project No.',       required: false },
      prepared_by:     { label: 'Prepared By',       required: false },
      attendees:       { label: 'Attendees',         required: true },
      agenda_items:    { label: 'Discussion Items',  required: true },
      action_items:    { label: 'Action Items',      required: false },
      decisions:       { label: 'Decisions Made',    required: false },
      next_meeting:    { label: 'Next Meeting',      required: false },
      distribution:    { label: 'Distribution',      required: false },
    },
  },

  // ── Daily Field Report ──────────────────────────────────────────────────────
  daily_report: {
    type: 'daily_report',
    label: 'Daily Field Report',
    aia_form: 'Standard',
    fields: {
      report_number:       { label: 'Report No.',          required: false },
      date:                { label: 'Date',                required: true },
      project_name:        { label: 'Project',             required: true },
      project_number:      { label: 'Project No.',         required: false },
      superintendent:      { label: 'Superintendent',      required: false },
      weather:             { label: 'Weather Conditions',  required: false },
      temperature:         { label: 'Temperature (°F)',    required: false },
      workers_on_site:     { label: 'Workers on Site',     required: false },
      work_performed:      { label: 'Work Performed',      required: true },
      materials_delivered: { label: 'Materials Delivered', required: false },
      equipment_on_site:   { label: 'Equipment on Site',   required: false },
      subcontractors:      { label: 'Subcontractors',      required: false },
      visitors:            { label: 'Visitors',            required: false },
      delays:              { label: 'Delays / Issues',     required: false },
      safety_incidents:    { label: 'Safety Incidents',    required: false },
      notes:               { label: 'Additional Notes',    required: false },
    },
  },

  // ── Punch List ──────────────────────────────────────────────────────────────
  punch_list: {
    type: 'punch_list',
    label: 'Punch List',
    aia_form: 'Standard',
    fields: {
      date:          { label: 'Date',           required: true },
      project_name:  { label: 'Project',        required: true },
      project_number:{ label: 'Project No.',    required: false },
      prepared_by:   { label: 'Prepared By',    required: false },
      contractor:    { label: 'Contractor',     required: false },
      location:      { label: 'Area / Location',required: false },
      items:         { label: 'Punch Items',    required: true },
      due_date:      { label: 'Due Date',       required: false },
      notes:         { label: 'Notes',          required: false },
    },
  },

  // ── Notice to Proceed ────────────────────────────────────────────────────────
  notice_to_proceed: {
    type: 'notice_to_proceed',
    label: 'Notice to Proceed',
    aia_form: 'Standard',
    fields: {
      date:               { label: 'Date',                   required: true },
      project_name:       { label: 'Project',                required: true },
      project_number:     { label: 'Project No.',            required: false },
      project_address:    { label: 'Project Address',        required: false },
      owner_name:         { label: 'Owner',                  required: false },
      contractor_name:    { label: 'Contractor',             required: true },
      contractor_address: { label: 'Contractor Address',     required: false },
      contract_amount:    { label: 'Contract Amount',        required: false },
      commencement_date:  { label: 'Commencement Date',      required: true },
      completion_date:    { label: 'Required Completion Date',required: false },
      contract_days:      { label: 'Contract Duration (days)',required: false },
    },
    standard_language: {
      body: 'You are hereby notified to commence work under the above-referenced Contract on the Commencement Date stated above. You are to prosecute the Work continuously and diligently and to complete the Work no later than the date stated above.',
      footer: 'Time is of the essence with respect to this Contract.',
    },
  },

  // ── Substantial Completion Certificate ──────────────────────────────────────
  substantial_completion: {
    type: 'substantial_completion',
    label: 'Certificate of Substantial Completion',
    aia_form: 'AIA G704',
    fields: {
      date_of_issuance:             { label: 'Date of Issuance',                   required: true },
      project_name:                 { label: 'Project',                            required: true },
      project_number:               { label: 'Project No.',                        required: false },
      project_address:              { label: 'Project Address',                    required: false },
      owner:                        { label: 'Owner',                              required: false },
      architect:                    { label: 'Architect',                          required: false },
      contractor:                   { label: 'Contractor',                         required: true },
      contract_date:                { label: 'Contract Date',                      required: false },
      date_of_substantial_completion:{ label: 'Date of Substantial Completion',    required: true },
      list_of_items:                { label: 'List of Items to Complete / Correct',required: false },
      warranty_start_date:          { label: 'Warranty Start Date',                required: false },
      owner_occupancy_date:         { label: 'Owner Occupancy Date',               required: false },
    },
    standard_language: {
      definition: 'Substantial Completion is the stage in the progress of the Work when the Work or designated portion thereof is sufficiently complete in accordance with the Contract Documents so that the Owner can occupy or utilize the Work for its intended use.',
      footer: 'Issued in accordance with AIA Document G704.',
    },
  },

  // ── Request for Proposal (RFP) ───────────────────────────────────────────────
  rfp: {
    type: 'rfp',
    label: 'Request for Proposal',
    aia_form: 'Standard',
    fields: {
      rfp_number:      { label: 'RFP No.',              required: true },
      date:            { label: 'Date',                 required: true },
      project_name:    { label: 'Project',              required: true },
      project_number:  { label: 'Project No.',          required: false },
      owner:           { label: 'Owner',                required: false },
      architect:       { label: 'Architect / Issuer',   required: false },
      addressed_to:    { label: 'Addressed To',         required: true },
      description:     { label: 'Scope of Proposal',    required: true },
      inclusions:      { label: 'Inclusions',           required: false },
      exclusions:      { label: 'Exclusions',           required: false },
      response_due:    { label: 'Proposal Due Date',    required: true },
      questions_due:   { label: 'Questions Due By',     required: false },
      contact:         { label: 'Contact / Submit To',  required: false },
      attachments:     { label: 'Attachments',          required: false },
      notes:           { label: 'Notes',                required: false },
    },
    standard_language: {
      instructions: 'Please provide a written proposal for the above-referenced scope of work. Include all labor, materials, equipment, and applicable taxes. Proposals received after the due date will not be considered.',
    },
  },

  // ── Subcontract Agreement (short form) ───────────────────────────────────────
  subcontract: {
    type: 'subcontract',
    label: 'Subcontract Agreement',
    aia_form: 'Short Form',
    fields: {
      date:                  { label: 'Agreement Date',         required: true },
      project_name:          { label: 'Project',                required: true },
      project_address:       { label: 'Project Address',        required: false },
      general_contractor:    { label: 'General Contractor',     required: true },
      gc_address:            { label: 'GC Address',             required: false },
      gc_license:            { label: 'GC License No.',         required: false },
      subcontractor:         { label: 'Subcontractor',          required: true },
      sub_address:           { label: 'Sub Address',            required: false },
      sub_license:           { label: 'Sub License No.',        required: false },
      scope_of_work:         { label: 'Scope of Work',          required: true },
      contract_value:        { label: 'Subcontract Amount',     required: true },
      payment_terms:         { label: 'Payment Terms',          required: false },
      start_date:            { label: 'Start Date',             required: false },
      completion_date:       { label: 'Completion Date',        required: false },
      retainage:             { label: 'Retainage %',            required: false },
      insurance_requirements:{ label: 'Insurance Requirements', required: false },
      special_conditions:    { label: 'Special Conditions',     required: false },
    },
    standard_language: {
      scope_note: 'The Subcontractor shall furnish all labor, materials, tools, equipment, and supervision necessary to complete the Scope of Work described herein.',
      payment_note: 'Payment shall be made within 30 days of receipt of a proper invoice, subject to retainage withheld per the terms above.',
      change_note: 'No changes to the Scope of Work shall be made without a written Change Order signed by both parties.',
      insurance_note: 'The Subcontractor shall maintain General Liability ($1M/$2M), Workers\' Compensation, and Automobile Liability insurance throughout the duration of the project, naming the General Contractor and Owner as additional insureds.',
    },
  },

  // ── Change Order Log ─────────────────────────────────────────────────────────
  change_order_log: {
    type: 'change_order_log',
    label: 'Change Order Log',
    aia_form: 'Standard',
    fields: {
      date:           { label: 'Date Prepared',  required: true },
      project_name:   { label: 'Project',        required: true },
      project_number: { label: 'Project No.',    required: false },
      contractor:     { label: 'Contractor',     required: false },
      owner:          { label: 'Owner',          required: false },
      entries:        { label: 'Change Orders',  required: true },
    },
    entry_fields: {
      co_number:   'CO No.',
      date:        'Date',
      description: 'Description',
      amount:      'Amount',
      days_added:  'Days Added',
      status:      'Status',
    },
    status_options: ['Pending', 'Approved', 'Rejected', 'In Review'],
  },

  // ── Submittal Log ───────────────────────────────────────────────────────────
  submittal_log: {
    type: 'submittal_log',
    label: 'Submittal Log',
    aia_form: 'Standard',
    fields: {
      date:           { label: 'Date Prepared',  required: true },
      project_name:   { label: 'Project',        required: true },
      project_number: { label: 'Project No.',    required: false },
      contractor:     { label: 'Contractor',     required: false },
      entries:        { label: 'Submittals',     required: true },
    },
    entry_fields: {
      submittal_number: 'No.',
      spec_section:     'Spec Section',
      description:      'Description',
      submitted_by:     'Submitted By',
      date_submitted:   'Date Submitted',
      date_returned:    'Date Returned',
      action:           'Action',
      revision:         'Rev.',
      notes:            'Notes',
    },
  },

  // ── RFI Log ─────────────────────────────────────────────────────────────────
  rfi_log: {
    type: 'rfi_log',
    label: 'RFI Log',
    aia_form: 'Standard',
    fields: {
      date:           { label: 'Date Prepared',  required: true },
      project_name:   { label: 'Project',        required: true },
      project_number: { label: 'Project No.',    required: false },
      contractor:     { label: 'Contractor',     required: false },
      entries:        { label: 'RFIs',           required: true },
    },
    entry_fields: {
      rfi_number:    'RFI No.',
      date_issued:   'Date Issued',
      subject:       'Subject',
      addressed_to:  'To',
      date_needed:   'Response Needed',
      date_received: 'Date Received',
      status:        'Status',
      notes:         'Notes',
    },
    status_options: ['Open', 'Answered', 'Closed', 'Pending'],
  },

  // ── Certificate of Insurance (COI) Request ──────────────────────────────────
  coi: {
    type: 'coi',
    label: 'Certificate of Insurance',
    aia_form: 'ACORD 25',
    fields: {
      date:                { label: 'Date',                    required: true },
      project_name:        { label: 'Project',                 required: true },
      insured:             { label: 'Insured (Sub / Vendor)',  required: true },
      insured_address:     { label: 'Insured Address',         required: false },
      insurance_agent:     { label: 'Insurance Agent',         required: false },
      agent_phone:         { label: 'Agent Phone',             required: false },
      certificate_holder:  { label: 'Certificate Holder',      required: true },
      holder_address:      { label: 'Holder Address',          required: false },
      gl_insurer:          { label: 'GL Insurer',              required: false },
      gl_policy_number:    { label: 'GL Policy No.',           required: false },
      gl_effective:        { label: 'GL Effective Date',       required: false },
      gl_expiration:       { label: 'GL Expiration Date',      required: false },
      gl_each_occurrence:  { label: 'Each Occurrence Limit',   required: false },
      gl_aggregate:        { label: 'General Aggregate',       required: false },
      wc_insurer:          { label: 'WC Insurer',              required: false },
      wc_policy_number:    { label: 'WC Policy No.',           required: false },
      wc_expiration:       { label: 'WC Expiration Date',      required: false },
      additional_insured:  { label: 'Additional Insured',      required: false },
      description:         { label: 'Description / Project',   required: false },
    },
    standard_language: {
      disclaimer: 'This certificate is issued as a matter of information only and confers no rights upon the certificate holder. This certificate does not affirmatively or negatively amend, extend or alter the coverage afforded by the policies listed herein.',
    },
  },

  // ── Visitor's Waiver ─────────────────────────────────────────────────────────
  visitor_waiver: {
    type: 'visitor_waiver',
    label: "Visitor's Waiver and Release",
    aia_form: 'Standard',
    fields: {
      date:            { label: 'Date',             required: true },
      project_name:    { label: 'Project Name',     required: true },
      project_address: { label: 'Project Address',  required: true },
      company_name:    { label: 'Company Name',     required: true },
      visitor_name:    { label: 'Visitor Name',     required: false },
      visitor_company: { label: 'Visitor Company',  required: false },
      host:            { label: 'Host / Escort',    required: false },
      purpose:         { label: 'Purpose of Visit', required: false },
    },
    standard_language: {
      waiver_text: 'I, the undersigned, acknowledge that I am visiting an active construction site and understand that there are inherent risks and hazards associated with being on a construction site, including but not limited to: falling objects, uneven surfaces, construction equipment, and other hazards. I agree to follow all safety rules and regulations, wear appropriate personal protective equipment (PPE) as directed, and remain with my authorized escort at all times. In consideration of being permitted to enter the construction site, I hereby release, discharge, and covenant not to sue the General Contractor, Owner, and their respective officers, employees, agents, and insurers from any and all claims, demands, or causes of action arising out of or relating to my presence on the construction site.',
      ppe_note: 'Required PPE: Hard hat, safety vest, closed-toe shoes. Additional PPE may be required based on site conditions.',
    },
  },

  // ── Notice to Neighbors ──────────────────────────────────────────────────────
  notice_to_neighbors: {
    type: 'notice_to_neighbors',
    label: 'Notice to Neighbors',
    aia_form: 'Standard',
    fields: {
      date:             { label: 'Date',                required: true },
      project_name:     { label: 'Project Name',        required: true },
      project_address:  { label: 'Project Address',     required: true },
      company_name:     { label: 'Your Company Name',   required: true },
      company_phone:    { label: 'Company Phone',       required: false },
      company_email:    { label: 'Company Email',       required: false },
      project_manager:  { label: 'Project Manager',     required: false },
      work_description: { label: 'Description of Work', required: true },
      start_date:       { label: 'Start Date',          required: true },
      end_date:         { label: 'Estimated End Date',  required: false },
      work_hours:       { label: 'Work Hours',          required: false },
      noise_dates:      { label: 'High-Noise Activity Dates', required: false },
      special_notes:    { label: 'Special Notes',       required: false },
    },
    standard_language: {
      intro: 'We are writing to inform you of upcoming construction activity near your property. We understand that construction can be disruptive and we appreciate your patience. We are committed to completing the work as efficiently as possible while minimizing inconvenience to the surrounding community.',
      contact_note: 'If you have any questions or concerns, please do not hesitate to contact our project team using the information above.',
    },
  },

  // ── Parking Pass ─────────────────────────────────────────────────────────────
  parking_pass: {
    type: 'parking_pass',
    label: 'Construction Parking Pass',
    aia_form: 'Standard',
    fields: {
      pass_number:     { label: 'Pass No.',           required: false },
      date:            { label: 'Issue Date',         required: true },
      expiration_date: { label: 'Expiration Date',    required: false },
      project_name:    { label: 'Project Name',       required: true },
      project_address: { label: 'Project Address',    required: true },
      company_name:    { label: 'Company',            required: false },
      vehicle_make:    { label: 'Vehicle Make/Model', required: false },
      vehicle_color:   { label: 'Vehicle Color',      required: false },
      license_plate:   { label: 'License Plate',      required: false },
      holder_name:     { label: 'Pass Holder Name',   required: false },
      authorized_area: { label: 'Authorized Area',    required: false },
      issued_by:       { label: 'Issued By',          required: false },
    },
    standard_language: {
      instructions: 'This pass must be displayed on the vehicle dashboard at all times. This pass is non-transferable. Unauthorized vehicles will be towed at owner\'s expense.',
    },
  },

};

// All template keys, for enumeration
export const TEMPLATE_TYPES = Object.keys(AIA_TEMPLATES);

// Get template by doc type (handles lien waiver subtypes)
export function getTemplate(docType, subtype = null) {
  if (docType === 'lien_waiver' && subtype) {
    return AIA_TEMPLATES[`lien_waiver_${subtype}`] || AIA_TEMPLATES.lien_waiver_conditional_progress;
  }
  return AIA_TEMPLATES[docType] || null;
}
