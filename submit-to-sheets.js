const { google } = require("googleapis");

const SPREADSHEET_ID = "1LTbFOiz6vfIJkvolRO_JYHyRIPwnmYXMAyTHQs80jWg";
const SHEET_NAME     = "Lead Intake";   // nombre exacto de la pestaña

const HEADERS = [
  "Lead ID", "Timestamp", "Name", "Email", "Phone",
  "Service", "Company", "Message", "Status",
  "Rejection Reason", "Rejected At", "Notes"
];

exports.handler = async (event) => {
  // Solo aceptar POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // ── 1. Parsear el body del form ──────────────────────────
    const data    = new URLSearchParams(event.body);
    const name    = data.get("name")    || "";
    const email   = data.get("email")   || "";
    const phone   = data.get("phone")   || "";
    const service = data.get("service") || "";
    const company = data.get("company") || "";
    const message = data.get("message") || "";

    // ── 2. Autenticar con Service Account ───────────────────
    const keyJson = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    // Netlify a veces guarda \n como texto literal — esto lo corrige
    if (keyJson.private_key) {
      keyJson.private_key = keyJson.private_key.replace(/\\n/g, "\n");
    }
    const auth = new google.auth.GoogleAuth({
      credentials: keyJson,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    // ── 3. Leer el sheet para saber cuántas filas hay ────────
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    const existingRows = readRes.data.values || [];

    // Si el sheet está vacío, crear headers primero
    if (existingRows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [HEADERS] },
      });
      // Recargar después de crear headers
      existingRows.push(HEADERS); // fila 1 = headers
    }

    // ── 4. Generar Lead ID ───────────────────────────────────
    // existingRows incluye la fila de headers, así que datos reales = length - 1
    const dataRows   = existingRows.length - 1; // filas de datos (sin header)
    const nextNumber = dataRows + 1;
    const leadId     = "LEAD-" + String(nextNumber).padStart(3, "0");

    // ── 5. Timestamp legible en Eastern Time ─────────────────
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "numeric", day: "numeric",
      hour: "numeric", minute: "2-digit", second: "2-digit",
      hour12: true,
    });

    // ── 6. Construir la fila en el orden exacto de HEADERS ───
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

    // ── 7. Escribir la fila en el sheet ──────────────────────
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
    // Log detallado para debugging en Netlify
    console.error("❌ Error en submit-to-sheets:", err.message);
    console.error(err.stack);
    return {
      statusCode: 200, // ← devolvemos 200 aunque haya error interno
      // para que Netlify NO deshabilite el webhook por "error HTTP"
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
