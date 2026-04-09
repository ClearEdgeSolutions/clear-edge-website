const { google } = require("googleapis");

exports.handler = async (event) => {
  const data = new URLSearchParams(event.body);

  const values = [[
    data.get("name"),
    data.get("email"),
    data.get("phone"),
    data.get("company"),
    data.get("service"),
    data.get("message"),
    new Date().toISOString(),
    "New"
  ]];

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: "1LTbFOiz6vfIJkvolRO_JYHyRIPwnmYXMAyTHQs80jWg",
    range: "Leads!A:H",
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  return { statusCode: 200 };
};
