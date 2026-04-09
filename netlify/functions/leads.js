const { google } = require("googleapis");

// ── CONFIGURACIÓN ────────────────────────────────────────────
const SPREADSHEET_ID = "1LTbFOiz6vfIJkvolRO_JYHyRIPwnmYXMAyTHQs80jWg";
const SHEET_NAME     = "Lead Intake";
// ────────────────────────────────────────────────────────────

const HEADERS = [
  "Lead ID", "Timestamp", "Name", "Email", "Phone",
  "Service", "Company", "Message", "Status",
  "Rejection Reason", "Rejected At", "Notes"
];

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // ── 1. Parsear el form ───────────────────────────────────
    const data    = new URLSearchParams(event.body);
    const name    = data.get("name")    || "";
    const email   = data.get("email")   || "";
    const phone   = data.get("phone")   || "";
    const service = data.get("service") || "";
    const company = data.get("company") || "";
    const message = data.get("message") || "";

    // ── 2. Autenticar ────────────────────────────────────────
    const keyJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    keyJson.private_key = keyJson.private_key.replace(/\\n/g, "\n");

    const auth = new google.auth.GoogleAuth({
      credentials: keyJson,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ── 3. Leer filas existentes para generar Lead ID ────────
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const existingRows = readRes.data.values || [];

    // Si el sheet está vacío, crear headers
    if (existingRows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [HEADERS] },
      });
      existingRows.push(HEADERS);
    }

    // ── 4. Generar Lead ID (LEAD-001, LEAD-002, ...) ─────────
    const dataRows   = existingRows.length - 1; // sin contar header
    const nextNumber = dataRows + 1;
    const leadId     = "LEAD-" + String(nextNumber).padStart(3, "0");

    // ── 5. Timestamp en Eastern Time ─────────────────────────
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "2-digit", second: "2-digit",
      hour12: true,
    });

    // ── 6. Fila en orden exacto de HEADERS ───────────────────
    const newRow = [
      leadId,    // Lead ID
      timestamp, // Timestamp
      name,      // Name
      email,     // Email
      phone,     // Phone
      service,   // Service
      company,   // Company
      message,   // Message
      "NEW",     // Status
      "",        // Rejection Reason
      "",        // Rejected At
      "",        // Notes
    ];

    // ── 7. Escribir en el sheet ──────────────────────────────
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:L`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [newRow] },
    });

    console.log("✅ Lead guardado:", leadId, name, email);
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, leadId }),
    };

  } catch (err) {
    console.error("❌ leads.js error:", err.message);
    console.error(err.stack);
    // Siempre devolver 200 para que Netlify no deshabilite el webhook
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
