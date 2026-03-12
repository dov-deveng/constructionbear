# BEAR-PROGRESS.md — ConstructionBear.AI Fix Log

---

## 2026-03-12 — App Branch + Separate Vercel Deployment

| Item | Detail |
|------|--------|
| `app` branch | Created from main, `client/vercel.json` = SPA-only routing |
| Vercel project | `constructionbear-app` |
| App URL | `constructionbear-app.vercel.app` — auto-deploys from `app` branch |
| Landing URL | `constructionbear.dev` — auto-deploys from `main` branch |
| Workflow | Feature work on `app` branch → push → auto-deploys to constructionbear-app.vercel.app |

---

## 2026-03-12 — Coming Soon Landing Page

### Files created / modified
| File | Change |
|------|--------|
| `landing/index.html` | Standalone coming soon page — Bear City illustrated scene, email capture card |
| `client/public/landing.html` | Copy of landing page served statically by Vercel |
| `client/vercel.json` | Updated rewrites: `/` → landing, `/app` + `/app/*` → React SPA |
| `client/src/App.jsx` | Added `basename="/app"` to BrowserRouter |
| `server/src/routes/waitlist.js` | POST /waitlist, GET /waitlist/stats, GET /waitlist/admin |
| `server/src/db/schema.js` | Added `waitlist` table (id, email, created_at, ip_address) |
| `server/src/index.js` | Wired up waitlistRouter + /admin/waitlist redirect |

### What's live
- `constructionbear.dev/` → Bear City coming soon page with email capture
- `constructionbear.dev/app` → Full React application
- `POST /waitlist` → save email, return 409 on duplicate
- `GET /waitlist/stats?key=BEAR_API_KEY` → total/today/week JSON
- `GET /waitlist/admin?key=BEAR_API_KEY` → HTML admin table
- `GET /admin/waitlist?key=BEAR_API_KEY` → same admin table (redirect)

---

## 2026-03-12

### RFI Template Rebuild — match reference PDF (session 10)

**Reference:** `RFI 002 - Coral Ridge Renovation.pdf`

| Section | Change |
|---------|--------|
| Header grid Row 2 | "Drawing ID" → "Reference Drawing" |
| Added: Cost Impact row | "No anticipated cost impact" or "May impact cost — details below" |
| Added: Addressed To block | name, company, email; additional recipient; CC — all in one block |
| Added: Due Date / Priority row | Urgent = 3 days, Routine = 14 days; urgency auto-detected from conversation |
| Response block | Light green header (AIA_GREEN) — matches reference exactly |
| Responding party row | Light green header — matches reference |
| Schema updated | 20 fields: project_location, project_id, reference_drawing, spec_section, cost_impact, cost_impact_details, addressed_to_company, addressed_to_email, additional_recipient, additional_recipient_company, cc, is_urgent, due_date |
| Conversation flow | 11-step ordered collection in system prompt; urgency auto-detected; submitted_by/date/rfi_number auto-filled |

**Files changed:**
- `server/src/routes/pdf.js` — full RFI case rebuild
- `server/src/services/ai.js` — RFI schema + RFI conversation flow prompt

---

### SS3 / SS7 Gap Fixes — SaveGateModal + Guest Header (session 10)

**Gaps found vs. original spec and fixed:**

| Gap | Fix |
|-----|-----|
| Screen 2 had only company name field | Added role dropdown, company type dropdown, phone, license number, address + "Skip for now" link |
| Password min was 6 chars (spec: 8) | Fixed to 8 chars with updated placeholder |
| Screen 1 headline was off-spec | Changed to "Your document is ready." per spec |
| Screen 2 "Save" button text off-spec | Changed to "Save and Go to Dashboard" per spec |
| Screen 1 missing "Already have an account? Sign in" | Added — navigates to /login |
| "Get Started" in guest header navigated to /register | Fixed — now focuses chat textarea instead |
| role + company_type not in profiles table | Added ALTER TABLE migration in schema.js |
| Profile PUT route didn't accept role/company_type | Added both fields to whitelist |

**Files changed:**
- `client/src/components/SaveGateModal.jsx` — full Screen 2 rebuild + Screen 1 copy fixes
- `client/src/screens/GuestShell.jsx` — Get Started focuses textarea
- `server/src/db/schema.js` — migration adds role + company_type to profiles
- `server/src/routes/profile.js` — whitelist updated

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

### Task 11 — Persistent In-Progress Chats (commit `2d4c4bc`)
- **DB:** `status` column on `chat_sessions` ('in_progress'|'completed', default 'completed'). `partial_doc_type` for type hint before doc generated.
- **Server:** `POST /chat/sessions/checkpoint` — saves untagged messages as in_progress session. `DELETE /chat/sessions/:id` (in_progress only). `GET /chat/sessions` returns `{ sessions, inProgressSessions }`. `POST /chat/message` accepts `session_id` to resume — loads context from session, saves messages there, updates session on doc completion.
- **Store:** `inProgressSessions`, `resumedSession` state. `startNewChat()` checkpoints before clearing. `openSession()`: in_progress → `resumedSession` (input allowed), completed → `activeSession` (read-only). `deleteSession()`.
- **Sidebar:** Amber "In Progress" section above Recent. Shows doc type badge, project name, "Resume · time". Delete icon with inline confirm/cancel.
- **ChatScreen:** `resumedSession` header shows "Resuming chat" in amber. Normal input area active during resume.

### Task 10 — Compose Icon + Recent Chats (commit `82ca7df`)
- **ComposeButton.jsx:** Icon-only compose button using exact provided SVG. Transparent bg, hover/active opacity-70. Calls `startNewChat()` + `setView('chat')`.
- **All 7 screens updated:** ChatScreen (replaces text "New Chat" in activeSession header, always visible), LibraryScreen, ProjectsScreen, ContactsScreen, ProfileScreen, SettingsScreen, AdminScreen.
- **Sidebar Recent section:** Already fully functional — shows doc type badge, project name, and relative date. No backend changes needed.

### Task 9 — Pre-Upload Image Markup Editor (commit `97123c2`)
- **ImageMarkupEditor.jsx:** Full-screen canvas markup tool (z-[60], mounts above bottom sheet).
  - Tools: Draw (freehand pen), Arrow (with auto arrowhead), Text (tap to place floating input), Erase (destination-out composite)
  - Color picker: 7 presets (red, orange, yellow, green, blue, white, black). Active color indicated by size + white ring.
  - Thickness: 1–20 via +/− buttons. Erase multiplies thickness × 5.
  - Undo: history stack of `ImageData` snapshots; restores prior state on tap.
  - Done: `canvas.toBlob()` → JPEG blob passed to `onDone`. Cancel discards without modifying original.
- **ImageUploadSheet:** Thumbnails open markup editor on tap. Pencil icon overlay hint. `handleMarkupDone` replaces file at that index with marked-up `File` blob.
- **Files:** `client/src/components/ImageMarkupEditor.jsx` (new), `client/src/components/ImageUploadSheet.jsx`

### Task 8 — Image Upload Staging Bottom Sheet (commit `8d04872`)
- **ImageUploadSheet.jsx:** Dark bottom sheet sliding up from screen bottom (`#1C1C1E`, 20px top radius, animate-slide-up, z-50). Triggered by paperclip button in chat.
  - Horizontal thumbnail strip with remove-per-image buttons and pencil icon hint for markup.
  - Multi-select native image picker (no inline file-picker in chat anymore).
  - Description textarea (16px, auto-focus after images picked). Enter key sends.
  - Send button: uploads first image via `api.chatUpload`, sets `pendingAttachment`, sends combined description + filename message to Bear. Description-only path also supported.
- **ChatScreen:** Paperclip now calls `setShowUploadSheet(true)` instead of raw file input. `handleSheetSend` replaces `handleFileSelect`. `ImageUploadSheet` mounted as a portal-sibling when `showUploadSheet`.
- **Files:** `client/src/components/ImageUploadSheet.jsx` (new), `client/src/screens/ChatScreen.jsx`

### Task 7 — Multi-Page Image Attachments on Documents (commit `5ccefd3`)
- **DB:** `document_attachments` table — id, document_id, user_id, company_id, file_path, original_filename, caption_label, page_order, created_at. FK cascade on documents + users.
- **Server:** Full CRUD route at `/documents/:docId/attachments` (mergeParams). Multer stores files in `data/uploads/<userId>/attachments/`. Endpoints: GET list, POST upload (up to 20 images, 20MB each), GET file (thumbnail serving), PATCH caption/order, DELETE (unlinks disk + DB row).
- **PDF:** `renderDoc` loops `doc.attachments` array; each item becomes a full PDF page with gray 28px caption bar at bottom (`doc_number · date · label`). Legacy `c.attachment_url` fallback preserved if no DB attachments.
- **PDF route:** `GET /pdf/:id` now queries `document_attachments` and passes as `doc.attachments` before calling `renderDoc`.
- **Client API:** `getDocAttachments`, `addDocAttachments`, `updateDocAttachment`, `deleteDocAttachment` added to `client/src/api/index.js`.
- **AttachmentsPanel.jsx:** Grid of photo thumbnails with page number badges, inline caption inputs (auto-saved on blur), add/delete, empty-state drop zone.
- **ChatScreen:** Imports and renders `AttachmentsPanel` above "Start New Chat" button when `docJustGenerated && generatedDocId`. Added `generatedDocId` memo from last assistant message metadata.
- **Files:** `server/src/db/schema.js`, `server/src/routes/attachments.js` (new), `server/src/index.js`, `server/src/routes/pdf.js`, `client/src/api/index.js`, `client/src/components/AttachmentsPanel.jsx` (new), `client/src/screens/ChatScreen.jsx`

### Task 6 — Document Grid Visual Refinement (commit `c234d01`)
- **Mobile grid:** 2-column `1fr 1fr`, gap 8px, padding 0 16px. Tiles: `height: 48px`, `font-size: 13px`, centered, overflow ellipsis, no hover effect (touch-only active state)
- **Active state:** `rgba(10,132,255,0.15)` bg, `#0A84FF` border, `scale(0.97)`
- **Shortened labels:** Pay App, Daily Report, NTP, CO Log, RFP, Substantial Comp., Cert. Payroll, Substitution, Closeout
- **Desktop:** unchanged flowing rows of 4/5
- **Files:** `client/src/screens/ChatScreen.jsx`
