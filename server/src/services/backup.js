import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function runBackup() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/constructionbear.db');
  const backupPath = dbPath + '.backup';

  try {
    if (!fs.existsSync(dbPath)) {
      console.log('[backup] DB not found, skipping');
      return;
    }
    fs.copyFileSync(dbPath, backupPath);
    const stat = fs.statSync(backupPath);
    const kb = (stat.size / 1024).toFixed(1);
    console.log(`[backup] ${new Date().toISOString()} — constructionbear.db backed up (${kb} KB)`);
  } catch (err) {
    console.error('[backup] FAILED:', err.message);
  }
}
