# BEAR-PROGRESS.md

## Current Status
Phase: 1 — Conversation Engine (in progress — awaiting Dov confirmation)
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
- [ ] Confirmed by Dov before Phase 2 begins

---

## Completed Phases
- Phase 0 built (awaiting iPhone confirmation)

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
