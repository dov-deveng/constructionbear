# BEAR-PROGRESS.md

## Current Status
Phase: 0 — Mobile Optimization + PWA
Step completed: 8 of 8 — awaiting Dov confirmation on real iPhone
Last updated: 2026-03-13

---

## Phase 0 — Mobile Optimization + PWA

### Steps
- [x] Step 1 — Viewport: added `maximum-scale=1` to prevent iOS zoom on input tap
- [x] Step 2 — PWA manifest: `client/public/manifest.json` created, linked in index.html
- [x] Step 3 — Service worker: `client/public/sw.js` created, registered in index.html
- [x] Step 4 — Chat mobile layout: `100dvh` on html/body, `overscroll-behavior: none`, `-webkit-overflow-scrolling: touch`
- [x] Step 5 — Touch targets: global CSS covers all buttons via nav/header selectors, all btn-* classes min-h-[44px]
- [x] Step 6 — Document preview: PdfPreviewModal already has overflow-x-auto, safe-area bottom bar, constrained page widths
- [x] Step 7 — Performance: no console.log in production code, bear.png images have explicit sizing (no layout shift)
- [x] Step 8 — Safe area insets: global left/right on body, top handled per-component via .safe-top, .safe-bottom updated

### Files changed
- `client/index.html` — viewport maximum-scale=1, manifest link, apple-mobile-web-app-title fix, SW registration
- `client/public/manifest.json` — created
- `client/public/sw.js` — created
- `client/src/index.css` — 100dvh, overscroll-behavior: none, -webkit-overflow-scrolling: touch, safe area left/right on body

### Definition of Done — confirm on iPhone:
- [ ] Installable from Safari via Add to Home Screen
- [ ] Opens full screen with no browser chrome
- [ ] Chat input stays above keyboard when typing
- [ ] No zoom on any input field tap
- [ ] Document preview readable and scrollable
- [ ] Every button tappable without precision
- [ ] App loads under 3 seconds on LTE
- [ ] Confirmed by Dov before Phase 1 is marked complete

---

## Phase 1 — Conversation Engine (pending Phase 0 confirmation)

### Step 1 — Strip markdown + fix tone ✅ (2026-03-13)
- Files: `server/src/services/ai.js`

### Step 2 — Context and contact auto-use (in progress, needs testing)
- Known contacts auto-filled during document collection
- Project assumption bug fixed
- extractCollectedFields: Haiku call per turn extracts already-answered fields
- detectCollectionSession: scans user messages for doc type
- buildFieldsStateInjection: injects precise state (have/need) into system prompt
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
- Profile auto-population, project/contact auto-save
- Guest session flow + SaveGateModal
- Paywall (SubscriptionModal, free doc limit)
- Image upload + markup editor, document attachments
- Google OAuth redirect flow
- Persistent in-progress chats
- Coming soon landing page + waitlist
