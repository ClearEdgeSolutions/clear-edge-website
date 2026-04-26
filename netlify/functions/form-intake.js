exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return jsonResponse(500, {
        error: 'Missing Supabase environment variables. Add SUPABASE_URL and SUPABASE_KEY in Netlify.'
      });
    }

    const payload = JSON.parse(event.body || '{}');

    // Netlify honeypot: if a bot fills this field, ignore the submission.
    if (payload['bot-field']) {
      return jsonResponse(200, { success: true, ignored: true });
    }

    const formName = payload['form-name'] || payload.form_name || '';
    const formFamily = payload.form_family || detectFormFamily(formName);

    if (formFamily === 'partner_application') {
      const partnerRecord = buildPartnerRecord(payload);
      await insertIntoSupabase(SUPABASE_URL, SUPABASE_KEY, 'partners', partnerRecord);
      return jsonResponse(200, { success: true, table: 'partners', type: 'partner_application' });
    }

    if (formFamily === 'client_contact' || formFamily === 'client_quote') {
      const leadRecord = buildLeadRecord(payload, formFamily);
      await insertIntoSupabase(SUPABASE_URL, SUPABASE_KEY, 'leads', leadRecord);
      return jsonResponse(200, { success: true, table: 'leads', type: formFamily });
    }

    return jsonResponse(400, { error: `Unknown form family: ${formFamily || formName}` });
  } catch (error) {
    console.error('form-intake error:', error);
    return jsonResponse(500, { error: error.message || 'Unexpected error' });
  }
};

function detectFormFamily(formName) {
  if (formName === 'clear-edge-client-contact') return 'client_contact';
  if (formName === 'clear-edge-client-quote') return 'client_quote';
  if (formName === 'clear-edge-partner-application') return 'partner_application';
  return '';
}

function buildLeadRecord(payload, formFamily) {
  const name = firstValue(payload.name, payload.fullName, payload.partnerFullName);
  const service = firstValue(payload.service, payload.selected_service, payload.mainService, payload.service_display);
  const message = firstValue(
    payload.message,
    payload.projectDetails,
    payload.priorities,
    payload.deep_priorities,
    payload.post_priorities,
    payload.move_priorities,
    payload.commercial_priorities
  );

  return {
    name: clean(name),
    email: clean(payload.email),
    phone: clean(payload.phone),
    company: clean(payload.company),
    service: clean(service),
    message: clean(message),
    status: 'NEW',
    lead_type: clean(payload.lead_type || (formFamily === 'client_quote' ? 'ready_for_quote' : 'quick_sales_contact')),
    form_source: clean(payload.form_source),
    next_action: clean(payload.next_action || (formFamily === 'client_quote' ? 'contractor_pricing_and_quote_preparation' : 'sales_team_follow_up')),
    button_context: clean(payload.button_context),
    service_address_city: clean(payload.serviceAddressCity),
    property_type: clean(payload.propertyType || payload.propertyTypeOther),
    quote_details: payload
  };
}

function buildPartnerRecord(payload) {
  const type = clean(payload.applicationType || payload.applicant_type || 'partner_provider');
  const isCompany = type === 'company';

  return {
    status: 'NEW',
    type,
    company_name: clean(payload.companyName),
    full_name: clean(payload.fullName || payload.name),
    phone: clean(payload.phone),
    email: clean(payload.email),
    provided_services: toTextList(isCompany ? payload.companyServices : payload.individualServices, isCompany ? payload.companyServicesOther : payload.individualServicesOther),
    operation_areas: toTextList(isCompany ? payload.companyAreas : payload.individualAreas, isCompany ? payload.companyAreasOther : payload.individualAreasOther),
    years_experience: clean(isCompany ? payload.companyYears : payload.individualYears),
    own_supplies: clean(isCompany ? payload.companySupplies : payload.individualSupplies),
    insurance: clean(isCompany ? payload.companyInsurance : ''),
    work_experience: clean(payload.individualWorkHistory),
    additional_info: clean(isCompany ? payload.companyAdditionalInfo : payload.individualAdditionalInfo),
    form_source: clean(payload.form_source || 'learn_more_partner_application'),
    next_action: clean(payload.next_action || 'partner_review'),
    raw_submission: payload
  };
}

async function insertIntoSupabase(projectUrl, apiKey, tableName, record) {
  const response = await fetch(`${projectUrl.replace(/\/$/, '')}/rest/v1/${tableName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase insert failed for ${tableName}: ${response.status} ${body}`);
  }
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  };
}

function firstValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') || '';
}

function clean(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value === undefined || value === null ? '' : String(value).trim();
}

function toTextList(value, otherValue) {
  const values = Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
  if (otherValue) values.push(otherValue);
  return values.join(', ');
}
