import { google } from 'googleapis';

/**
 * Appends a waitlist lead to a Google Sheet.
 * Fire-and-forget — call without await.
 * Requires env vars: GOOGLE_SHEETS_ID, GOOGLE_SERVICE_ACCOUNT_JSON
 */
export async function backupLeadToSheet(name, email, createdAt) {
  try {
    const sheetsId = process.env.GOOGLE_SHEETS_ID;
    const saJson   = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!sheetsId || !saJson) return; // silently skip if not configured

    const credentials = JSON.parse(saJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const timestamp = new Date().toISOString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetsId,
      range: 'Sheet1!A:D',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[name, email, createdAt, timestamp]],
      },
    });
  } catch (err) {
    console.error('[sheets-backup] Failed to backup lead:', err.message);
  }
}
