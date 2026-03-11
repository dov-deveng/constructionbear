import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

function initSchema(db) {
  db.exec(`
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

  // Add is_admin column to users if it doesn't exist yet
  try {
    db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
  } catch {
    // Column already exists, ignore
  }

  // Add last_active column to users (updated on each authenticated request)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN last_active INTEGER`);
  } catch {
    // Column already exists, ignore
  }

  // Promote ADMIN_EMAIL to admin if set
  if (process.env.ADMIN_EMAIL) {
    db.prepare(`UPDATE users SET is_admin = 1 WHERE email = ? COLLATE NOCASE`).run(process.env.ADMIN_EMAIL);
  }
}
