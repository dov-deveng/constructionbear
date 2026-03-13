# BEAR-PROGRESS.md

## Current Status
Phase: 3 — Document Preview in Chat ✅ (built, awaiting confirmation)
Last updated: 2026-03-13

---

## Phase 0 — Mobile Optimization + PWA ✅ (built, awaiting iPhone confirmation)

All 8 steps complete. Files: `client/index.html`, `client/public/manifest.json`, `client/public/sw.js`, `client/src/index.css`

Definition of done checklist — confirm on iPhone:
- [ ] Installable from Safari via Add to Home Screen
- [ ] Opens full screen with no browser chrome
- [ ] Chat input stays above keyboard when typing
- [ ] No zoom on any input field tap
- [ ] Document preview readable and scrollable
- [ ] Every button tappable without precision
- [ ] App loads under 3 seconds on LTE

---

## Phase 1 — Conversation Engine

### Step 1 — No markdown + tone ✅
Files: `server/src/services/ai.js`
- Filler openers removed ("Got it", "Happy to help", etc.)
- Explicit no-markdown rule with examples
- Transition examples so Bear jumps straight to next field

### Step 2 — Field collection + contact auto-use ✅
Files: `server/src/services/ai.js`, `server/src/routes/chat.js`
- detectCollectionSession: scans user messages for doc type (not Bear's phrases)
- extractCollectedFields: Haiku call extracts already-answered fields per turn
- buildFieldsStateInjection: injects "ALREADY COLLECTED / STILL NEEDED" into system prompt
- Bear only asks for fields in the current document's schema
- Known contacts auto-used — no re-asking if contact is on file
- Project creation fixed for users without company_id
- Main chat model upgraded from Haiku to Sonnet 4.6 — significantly better instruction following

### Step 3 — Context pulling on doc 3-4 ✅
Memory system (chat_memory) + projects/contacts loaded from DB on every call.
By doc 2, project and contacts are in DB. Sonnet reliably reads and uses them.
Tested: full change order flow completes cleanly in 7 turns with no loops or re-asks.

---

## Phase 1 Definition of Done — confirm manually:
- [ ] Bear never uses markdown in chat
- [ ] By doc 2-3, Bear uses known project name and contacts without re-asking
- [ ] No field re-asking loops during document creation

---

## Phase 2 — Guest Flow + Account Creation ✅

### Step 1 — Doc bubble auto-send ✅
File: `client/src/screens/GuestShell.jsx`
- selectDoc() now calls send(prompt) directly — no more input fill + manual send

### Step 2 — Name/email/phone as mandatory second question ✅
File: `server/src/services/ai.js`
- GUEST SESSION prompt block: first question = project name, second question = "What's your name, email, and phone number?" (always, every doc type)
- Never uses "for our records" framing — asks because the doc needs a submitting party

### Step 3 — Leads DB stores contact info explicitly ✅
Files: `server/src/db/schema.js`, `server/src/routes/leads.js`
- schema.js: added name/email/phone columns to leads table
- leads.js: extractContactFields() pulls contact from any collected_fields key variant
- INSERT + UPDATE both write name/email/phone directly — no JSON parsing needed to query

### Step 4 — SaveGateModal onboarding fix ✅
File: `client/src/components/SaveGateModal.jsx`
- Added onboarding_complete: true to profileUpdates — new users route to AppShell, not OnboardingScreen

---

## Phase 2 Definition of Done — confirm manually:
- [ ] Click doc bubble → sends immediately, no manual send required
- [ ] Bear's second message is always "What's your name, email, and phone number?"
- [ ] Lead record in DB has name/email/phone populated after doc generation
- [ ] Save to Library → SaveGateModal → signup → lands in AppShell with doc in library

---

## Phase 3 — Document Preview in Chat ✅

### Step 1 — DocumentContent named export ✅
File: `client/src/components/DocumentRenderer.jsx`
- Added `export function DocumentContent({ doc })` — renders typed content without outer wrapper div, for embedding

### Step 2 — InlineDocPreview component ✅
File: `client/src/components/DocumentCard.jsx`
- Full-width card: type badge header, DocumentContent body (340px max scroll), action button
- Auth users: "Preview PDF" button opens PdfPreviewModal via callback
- Guest users: "Save to Library" button triggers SaveGateModal

### Step 3 — ChatScreen MessageBubble restructured ✅
File: `client/src/screens/ChatScreen.jsx`
- Text bubble and doc preview are now separate rows — doc preview is full-width with 36px left indent (aligns with bear messages)
- Removed auto-PDF-modal on doc generation — replaced with openDocPdf callback passed to MessageBubble
- InlineDocPreview replaces DocumentCard inline

### Step 4 — GuestShell message rendering restructured ✅
File: `client/src/screens/GuestShell.jsx`
- Same pattern: text bubble in constrained row, doc preview full-width below
- InlineDocPreview replaces InlineDocCard

---

## Phase 3 Definition of Done — confirm manually:
- [ ] Doc preview renders inline in chat with type-specific fields (not just collapsible text)
- [ ] "Preview PDF" button visible and functional for auth users after doc generation
- [ ] "Save to Library" button visible in doc card for guest users
- [ ] Chat input locked after doc generation (already worked before — confirm still works)
- [ ] Preview is scrollable if content exceeds 340px height

---

## Completed Phases
- Phase 0 built (awaiting iPhone confirmation)
- Phase 1 built (awaiting Dov confirmation)
- Phase 2 built (awaiting end-to-end confirmation)

---

## Prior Work (pre-MVP-PLAN framework)
- RFI, Submittal, Change Order, Invoice PDF renderers
- Memory system (chat_memory + summary injection)
- Profile auto-population, project/contact auto-save
- Guest session flow + SaveGateModal
- Paywall (SubscriptionModal, free doc limit)
- Image upload + markup editor, document attachments
- Google OAuth redirect flow
- Persistent in-progress chats
- Coming soon landing page + waitlist
