import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db;

export function getDb() {
  if (!db) {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/constructionbear.db');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function generateCompanyCode(db) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (db.prepare('SELECT id FROM companies WHERE code = ?').get(code));
  return code;
}

export function ensureUserCompany(db, userId, email) {
  const user = db.prepare('SELECT company_id, email FROM users WHERE id = ?').get(userId);
  if (user?.company_id) return user.company_id;

  const companyId = uuidv4();
  const code = generateCompanyCode(db);
  const name = user?.email || email || 'My Company';

  db.prepare('INSERT INTO companies (id, name, code, owner_id) VALUES (?, ?, ?, ?)').run(companyId, name, code, userId);
  db.prepare('UPDATE users SET company_id = ? WHERE id = ?').run(companyId, userId);
  return companyId;
}

function initSchema(db) {
  db.exec(`
    -- Companies
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      owner_id TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      google_id TEXT UNIQUE,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_token_expires INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    );

    -- Company profiles (one per user)
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      company_name TEXT,
      owner_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      license_number TEXT,
      logo_path TEXT,
      onboarding_complete INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Subscriptions
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      status TEXT DEFAULT 'free',
      current_period_end INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Documents
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      project_name TEXT,
      status TEXT DEFAULT 'draft',
      content_json TEXT NOT NULL,
      template_used TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Document templates (generated once per user per doc type)
    CREATE TABLE IF NOT EXISTS doc_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      doc_type TEXT NOT NULL,
      template_json TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(user_id, doc_type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Chat memory (compressed per user)
    CREATE TABLE IF NOT EXISTS chat_memory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      summary TEXT,
      message_count INTEGER DEFAULT 0,
      last_updated INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Chat messages (full history for UI display)
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      client_name TEXT,
      client_contact TEXT,
      client_email TEXT,
      client_phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      gc_name TEXT,
      gc_contact TEXT,
      gc_email TEXT,
      gc_phone TEXT,
      architect_name TEXT,
      architect_contact TEXT,
      architect_email TEXT,
      contract_value REAL,
      start_date TEXT,
      end_date TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Contacts
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      role TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      project_id TEXT,
      notes TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    -- Add project_id to documents if not exists
    CREATE TABLE IF NOT EXISTS documents_new (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      project_name TEXT,
      status TEXT DEFAULT 'draft',
      content_json TEXT NOT NULL,
      template_used TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_companies_code ON companies(code);
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
    CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
    CREATE INDEX IF NOT EXISTS idx_contacts_project_id ON contacts(project_id);
  `);

  // Add project_id column to documents if it doesn't exist yet
  try {
    db.exec(`ALTER TABLE documents ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL`);
  } catch {
    // Column already exists, ignore
  }

  // company_id columns — migrate existing tables
  const companyMigrations = [
    `ALTER TABLE users ADD COLUMN company_id TEXT`,
    `ALTER TABLE projects ADD COLUMN company_id TEXT`,
    `ALTER TABLE contacts ADD COLUMN company_id TEXT`,
    `ALTER TABLE documents ADD COLUMN company_id TEXT`,
    `ALTER TABLE doc_templates ADD COLUMN company_id TEXT`,
  ];
  for (const sql of companyMigrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id)`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id)`); } catch {}
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id)`); } catch {}

  // Add is_admin column to users if it doesn't exist yet
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
  } catch { /* already exists */ }

  // Add plan column to subscriptions (free | pro | business)
  try {
    db.exec(`ALTER TABLE subscriptions ADD COLUMN plan TEXT DEFAULT 'free'`);
  } catch { /* already exists */ }

  // Markups table
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS markups (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'note',
        field_ref TEXT,
        content TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_markups_document_id ON markups(document_id);
    `);
  } catch {
    // already exists
  }

  // Add last_active column to users (updated on each authenticated request)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN last_active INTEGER`);
  } catch {
    // Column already exists, ignore
  }

  // Chat sessions — one record per generated document, links to messages
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        company_id TEXT,
        project_id TEXT,
        document_id TEXT,
        document_type TEXT NOT NULL,
        title TEXT NOT NULL,
        project_name TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_company_id ON chat_sessions(company_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at);
    `);
  } catch {
    // already exists
  }

  // Add session_id to chat_messages
  try {
    db.exec(`ALTER TABLE chat_messages ADD COLUMN session_id TEXT REFERENCES chat_sessions(id) ON DELETE SET NULL`);
  } catch {
    // column already exists
  }

  // Drop dead documents_new table (was never used)
  try { db.exec(`DROP TABLE IF EXISTS documents_new`); } catch {}

  // Document numbering sequences — atomic per project per doc type
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_sequences (
        project_id TEXT NOT NULL,
        doc_type TEXT NOT NULL,
        last_number INTEGER DEFAULT 0,
        PRIMARY KEY (project_id, doc_type)
      );
    `);
  } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE documents ADD COLUMN doc_number TEXT`); } catch {}

  // Backfill company_id on orphaned records (legacy data before multi-company migration)
  // For each user with a company_id, stamp their untagged records
  try {
    db.exec(`
      UPDATE projects SET company_id = (SELECT company_id FROM users WHERE users.id = projects.user_id)
      WHERE company_id IS NULL AND user_id IN (SELECT id FROM users WHERE company_id IS NOT NULL);

      UPDATE contacts SET company_id = (SELECT company_id FROM users WHERE users.id = contacts.user_id)
      WHERE company_id IS NULL AND user_id IN (SELECT id FROM users WHERE company_id IS NOT NULL);

      UPDATE documents SET company_id = (SELECT company_id FROM users WHERE users.id = documents.user_id)
      WHERE company_id IS NULL AND user_id IN (SELECT id FROM users WHERE company_id IS NOT NULL);

      UPDATE doc_templates SET company_id = (SELECT company_id FROM users WHERE users.id = doc_templates.user_id)
      WHERE company_id IS NULL AND user_id IN (SELECT id FROM users WHERE company_id IS NOT NULL);
    `);
  } catch (err) {
    console.error('[schema] backfill error:', err.message);
  }

  // project_contacts junction table — contact can have different roles on different projects
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS project_contacts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        contact_id TEXT NOT NULL,
        company_id TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at INTEGER DEFAULT (unixepoch()),
        UNIQUE(project_id, contact_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_project_contacts_project ON project_contacts(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_contacts_contact ON project_contacts(contact_id);
    `);
  } catch { /* already exists */ }

  // Soft delete columns
  try { db.exec(`ALTER TABLE contacts ADD COLUMN deleted_at INTEGER`); } catch {}
  try { db.exec(`ALTER TABLE projects ADD COLUMN deleted_at INTEGER`); } catch {}

  // Per-seat billing columns on companies
  const companyBillingMigrations = [
    `ALTER TABLE companies ADD COLUMN seats INTEGER DEFAULT 1`,
    `ALTER TABLE companies ADD COLUMN plan TEXT DEFAULT 'free'`,
    `ALTER TABLE companies ADD COLUMN stripe_customer_id TEXT`,
    `ALTER TABLE companies ADD COLUMN stripe_subscription_id TEXT`,
  ];
  for (const sql of companyBillingMigrations) {
    try { db.exec(sql); } catch { /* already exists */ }
  }
  // Backfill seats = actual member count for existing companies
  try {
    db.exec(`UPDATE companies SET seats = (SELECT COUNT(*) FROM users WHERE users.company_id = companies.id) WHERE seats IS NULL OR seats = 0`);
  } catch { /* ignore */ }

  // Promote ADMIN_EMAIL to admin if set
  if (process.env.ADMIN_EMAIL) {
    db.prepare(`UPDATE users SET is_admin = 1 WHERE email = ? COLLATE NOCASE`).run(process.env.ADMIN_EMAIL);
  }

  // Document attachments — images appended as PDF pages
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_attachments (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        company_id TEXT,
        file_path TEXT NOT NULL,
        original_filename TEXT,
        caption_label TEXT,
        page_order INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_doc_attachments_doc ON document_attachments(document_id);
    `);
  } catch { /* already exists */ }
}
