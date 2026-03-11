#!/usr/bin/env node
/**
 * clear-account.js — wipe all generated data for one user account.
 * Leaves the user row, company, and company profile intact.
 *
 * Usage:  node scripts/clear-account.js dov@doveandbearinc.com
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/clear-account.js <email>');
  process.exit(1);
}

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/constructionbear.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = OFF'); // allow cascade-free deletes in correct order

const user = db.prepare('SELECT id, company_id, email FROM users WHERE email = ? COLLATE NOCASE').get(email);
if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

console.log(`Clearing data for: ${user.email} (user_id=${user.id}, company_id=${user.company_id || 'none'})`);

const userId = user.id;
const companyId = user.company_id;

// Documents
const docs = db.prepare('SELECT COUNT(*) as n FROM documents WHERE user_id = ?').get(userId);
db.prepare('DELETE FROM documents WHERE user_id = ?').run(userId);
console.log(`  Deleted ${docs.n} document(s)`);

// Document sequences (linked to projects, cleared below)
const seqCount = companyId
  ? db.prepare('SELECT COUNT(*) as n FROM document_sequences WHERE project_id IN (SELECT id FROM projects WHERE company_id = ?)').get(companyId).n
  : 0;
if (companyId) {
  db.prepare('DELETE FROM document_sequences WHERE project_id IN (SELECT id FROM projects WHERE company_id = ?)').run(companyId);
}
console.log(`  Deleted ${seqCount} document sequence(s)`);

// project_contacts junction
const pcCount = companyId
  ? db.prepare('SELECT COUNT(*) as n FROM project_contacts WHERE company_id = ?').get(companyId).n
  : 0;
if (companyId) {
  db.prepare('DELETE FROM project_contacts WHERE company_id = ?').run(companyId);
}
console.log(`  Deleted ${pcCount} project_contact link(s)`);

// Contacts
const contacts = db.prepare('SELECT COUNT(*) as n FROM contacts WHERE user_id = ?').get(userId);
db.prepare('DELETE FROM contacts WHERE user_id = ?').run(userId);
console.log(`  Deleted ${contacts.n} contact(s)`);

// Projects (company-scoped so shared projects are also cleared)
const projects = companyId
  ? db.prepare('SELECT COUNT(*) as n FROM projects WHERE company_id = ?').get(companyId)
  : { n: 0 };
if (companyId) {
  db.prepare('DELETE FROM projects WHERE company_id = ?').run(companyId);
} else {
  db.prepare('DELETE FROM projects WHERE user_id = ?').run(userId);
}
console.log(`  Deleted ${projects.n} project(s)`);

// Chat sessions
const sessions = db.prepare('SELECT COUNT(*) as n FROM chat_sessions WHERE user_id = ?').get(userId);
db.prepare('DELETE FROM chat_sessions WHERE user_id = ?').run(userId);
console.log(`  Deleted ${sessions.n} chat session(s)`);

// Chat messages
const msgs = db.prepare('SELECT COUNT(*) as n FROM chat_messages WHERE user_id = ?').get(userId);
db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
console.log(`  Deleted ${msgs.n} chat message(s)`);

// Chat memory
db.prepare('DELETE FROM chat_memory WHERE user_id = ?').run(userId);
console.log('  Cleared chat memory');

// Doc templates (AI-cached, safe to wipe)
const tmpl = db.prepare('SELECT COUNT(*) as n FROM doc_templates WHERE user_id = ?').get(userId);
db.prepare('DELETE FROM doc_templates WHERE user_id = ?').run(userId);
console.log(`  Deleted ${tmpl.n} doc template(s)`);

db.pragma('foreign_keys = ON');
db.close();
console.log('\nDone. Account is clean. User, company, and profile preserved.');
