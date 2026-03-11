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

---

### Task 4 — Mobile UI Optimization (commit `c234d01`)
- **CSS:** `.input-field` → `text-base` (16px) prevents iOS auto-zoom; `.btn-*` → `min-h-[44px]`; bubble text `15px`; added `.modal-overlay` + `.modal-sheet` for full-screen mobile modals; global media query enforces 44px on nav/header buttons
- **SubscriptionModal:** `fixed inset-0` overlay, bottom-sheet on mobile (rounded top, scrollable), non-dismissable variant unchanged
- **ChatScreen:** textarea `font-size: 16px`, send + attach buttons `w-11 h-11` (44px), hamburger `w-11 h-11`, header subtitle `hidden sm:block`
- **Files:** `client/src/index.css`, `client/src/components/SubscriptionModal.jsx`, `client/src/screens/ChatScreen.jsx`

### Task 5 — Google OAuth Redirect Flow (commit `c234d01`)
- **Server:** `GET /auth/google` builds OAuth URL via `google-auth-library` `OAuth2Client`, redirects to Google. `GET /auth/google/callback` exchanges code, creates/links user, issues JWT, redirects to `CLIENT_URL/?google_token=<jwt>`
- **Client:** AuthScreen handles `?google_token=` on mount (fetches user data, navigates). Always-visible styled white Google button with logo — no dependency on `window.google` script. One Tap hidden fallback retained. `?error=` param shows inline error.
- **Env:** `API_URL` and `GOOGLE_CLIENT_SECRET` placeholders in `.env` (fill in Railway vars)
- **Files:** `server/src/routes/auth.js`, `client/src/screens/AuthScreen.jsx`

### Task 6 — Document Grid Visual Refinement (commit `c234d01`)
- **Mobile grid:** 2-column `1fr 1fr`, gap 8px, padding 0 16px. Tiles: `height: 48px`, `font-size: 13px`, centered, overflow ellipsis, no hover effect (touch-only active state)
- **Active state:** `rgba(10,132,255,0.15)` bg, `#0A84FF` border, `scale(0.97)`
- **Shortened labels:** Pay App, Daily Report, NTP, CO Log, RFP, Substantial Comp., Cert. Payroll, Substitution, Closeout
- **Desktop:** unchanged flowing rows of 4/5
- **Files:** `client/src/screens/ChatScreen.jsx`
