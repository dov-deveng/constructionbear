# BEAR-PROGRESS.md

## Current Status
Phase: 0 — Mobile Optimization + PWA
Step completed: 0 of 8 (not started — awaiting go)
Last updated: 2026-03-13

---

## Phase 0 — Mobile Optimization + PWA

Phase 0 must be confirmed working on a real iPhone before Phase 1 begins.

### Steps
- [ ] Step 1 — Viewport and input fixes (prevent zoom on focus)
- [ ] Step 2 — PWA manifest (installable from Safari)
- [ ] Step 3 — Service worker (offline shell, network-first API)
- [ ] Step 4 — Chat interface mobile layout (fixed input, dvh, safe-area, auto-scroll)
- [ ] Step 5 — Touch targets (44x44px minimum everywhere)
- [ ] Step 6 — Document preview mobile (scrollable, sticky buttons)
- [ ] Step 7 — Performance (lazy images, <3s LTE, no console.log)
- [ ] Step 8 — Safe area insets global (notch / Dynamic Island)

### Definition of Done
- Installable from Safari via Add to Home Screen
- Opens full screen with no browser chrome
- Chat input stays above keyboard when typing on iPhone
- No zoom on any input field tap
- Document preview readable and scrollable on iPhone
- Every button tappable without precision
- App loads under 3 seconds on LTE
- Confirmed by Dov on real iPhone before Phase 1 begins

---

## Phase 1 — Conversation Engine (pending Phase 0 confirmation)

### Step 1 — Strip markdown + fix tone ✅ (2026-03-13)
- Removed filler openers ("Got it", "Happy to help", etc.)
- Added explicit no-markdown rule to system prompt
- Added transition examples to guide Bear's voice
- Files: `server/src/services/ai.js`

### Step 2 — Context and contact auto-use (in progress)
- Known contacts now auto-filled during document collection
- Project assumption bug fixed — Bear must confirm project
- Project creation fixed for users without company_id
- extractCollectedFields: Haiku call extracts already-answered fields per turn
- detectCollectionSession: now scans user messages (not Bear phrases)
- buildFieldsStateInjection: shows Bear exactly what it has and what's missing
- Strict schema rule: Bear only asks for fields in current document's schema
- Files: `server/src/services/ai.js`, `server/src/routes/chat.js`

### Step 3 — Verify context pulling on doc 3-4 ⬜

---

## Completed Phases
None confirmed yet.

---

## Prior Work (pre-MVP-PLAN framework)
- RFI, Submittal, Change Order, Invoice PDF renderers
- Memory system (chat_memory + summary injection)
- Profile auto-population
- Project/contact auto-save from chat
- Guest session flow + SaveGateModal
- Paywall (SubscriptionModal, free doc limit)
- Image upload + markup editor
- Document attachments (multi-page PDF)
- Mobile UI (prior pass)
- Google OAuth redirect flow
- Persistent in-progress chats
- Coming soon landing page + waitlist
