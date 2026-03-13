# BEAR-PROGRESS.md

## Current Status
Phase: 2 — Guest Flow + Account Creation ✅ (built, awaiting end-to-end confirmation)
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

## Completed Phases
- Phase 0 built (awaiting iPhone confirmation)
- Phase 1 built (awaiting Dov confirmation)

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
