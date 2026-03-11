# BEAR-PROGRESS.md — ConstructionBear.AI Fix Log

---

## 2026-03-11

### RFI PDF Renderer Fix (commit `6133d09`)
- **Problem:** RFI PDF output was raw JSON instead of structured AIA layout. `c.text` check bypassed the switch-case renderer. Template vars like `{{client_phone}}` appeared verbatim.
- **Fix:** Added `STRUCTURED_TYPES` set — 18 doc types always use switch layout regardless of `.text` field. Added `stripTemplateVars()`. Fixed content parsing to handle double-encoded JSON. Expanded RFI field name fallbacks (`from_contact_name`, `from_name`, `from_company`, etc.). Uploaded images embedded as page 2 via pdf-lib.
- **Files:** `server/src/routes/pdf.js`

---

### Task 1 — Free Plan Enforcement (commit `ad3d674`)
- **Server:** `chat.js` checks company plan before auto-saving a generated doc. Free users with ≥1 doc get `paywallRequired: true` in response — doc is not saved.
- **Client:** `send()` and "Start New Chat" button both call `canCreateDoc()` first. Non-dismissable `SubscriptionModal` (no "Maybe later", backdrop click blocked) shows on paywall trigger. Displays current plan badge, feature list, Pro price ($19.99/seat/mo), Upgrade Now button.
- **Files:** `server/src/routes/chat.js`, `client/src/components/SubscriptionModal.jsx`, `client/src/screens/ChatScreen.jsx`

### Task 2 — Project Auto-Save from Chat (commit `ad3d674`)
- **Fix:** When AI generates a doc with a `project_name`, the chat route now auto-creates the project in DB if it doesn't exist yet (name + company_id + user_id). Previously only looked up existing projects.
- **Result:** Create RFI for "Sunset Tower" → "Sunset Tower" appears in Settings > Projects immediately.
- **Files:** `server/src/routes/chat.js`

### Task 3 — Clear Account Script (commit `ad3d674`)
- **Script:** `server/scripts/clear-account.js <email>` — deletes all documents, sequences, project_contacts, contacts, projects, chat sessions, messages, memory, doc templates for one user. Preserves user row, company, profile.
- **To run on Railway:** `railway run node server/scripts/clear-account.js dov@doveandbearinc.com`
- **Note:** Local DB is empty (Railway holds production data). Script verified syntactically correct.
- **Files:** `scripts/clear-account.js`, `server/scripts/clear-account.js`
