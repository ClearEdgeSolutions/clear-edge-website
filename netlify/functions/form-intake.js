exports.handler = async (event) => {
  const json = (statusCode, body) => ({
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  });

  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed" });

  try {
    const SUPABASE_URL = (process.env.SUPABASE_URL || "https://sjgrbcqgkxwvzetjhutf.supabase.co").replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
    const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

    if (!SUPABASE_KEY) {
      return json(500, {
        ok: false,
        error: "Missing Supabase key. Add SUPABASE_ANON_KEY in Netlify Environment variables."
      });
    }

    const input = JSON.parse(event.body || "{}");
    const allowedSources = ["client_contact", "client_quote", "partner_application"];

    const sourceType = allowedSources.includes(input.source_type) ? input.source_type : "client_contact";

    const record = {
      form_name: input.form_name || "unknown",
      source_type: sourceType,
      lead_type: input.lead_type || null,
      status: input.status || (sourceType === "partner_application" ? "NEW_APPLICATION" : "NEW"),
      name: input.name || null,
      email: input.email || null,
      phone: input.phone || null,
      service: input.service || null,
      message: input.message || null,
      page_path: input.page_path || null,
      language: input.language || null,
      user_agent: event.headers["user-agent"] || null,
      payload: input.payload || input
    };

    if (!record.name && !record.email && !record.phone) {
      return json(400, { ok: false, error: "Missing contact information." });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/website_submissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=representation"
      },
      body: JSON.stringify(record)
    });

    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }

    if (!response.ok) {
      return json(response.status, {
        ok: false,
        error: "Supabase insert failed",
        details: data
      });
    }

    return json(200, { ok: true, data });
  } catch (error) {
    return json(500, { ok: false, error: error.message });
  }
};
