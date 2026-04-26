exports.handler = async (event) => {
  console.log("🚀 Function triggered");

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed",
    };
  }

  try {
    const data = JSON.parse(event.body);
    console.log("📥 Incoming data:", data);

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error("❌ Missing environment variables");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing environment variables" }),
      };
    }

    // Detectar tipo de formulario
    const isPartner = data.form_source === "partner";

    const table = isPartner ? "partners" : "leads";

    console.log("📌 Inserting into table:", table);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(isPartner
        ? {
            full_name: data.name || null,
            email: data.email || null,
            phone: data.phone || null,
            company_name: data.company || null,
            provided_services: data.service || null,
            additional_info: data.message || null,
            form_source: data.form_source || null,
            next_action: "review",
            raw_submission: data,
          }
        : {
            name: data.name || null,
            email: data.email || null,
            phone: data.phone || null,
            company: data.company || null,
            service: data.service || null,
            message: data.message || null,
            form_source: data.form_source || null,
            lead_type: data.lead_type || "quick",
            next_action: "contact",
            quote_details: data.quote_details || null,
          }),
    });

    const text = await response.text();

    console.log("📡 Supabase response status:", response.status);
    console.log("📡 Supabase response body:", text);

    if (!response.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Supabase error",
          details: text,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (error) {
    console.error("🔥 Function crash:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error",
        details: error.message,
      }),
    };
  }
};
