# BEAR-PROGRESS.md

## Current Status
Phase: 1 — Conversation Engine
Step completed: 1 of 3
Last updated: 2026-03-13

---

## Phase 1 — Conversation Engine

### Step 1 — Strip markdown from Bear responses + fix tone ✅
**Completed:** 2026-03-13
**Files changed:** `server/src/services/ai.js`

What changed in SYSTEM_PROMPT:
- Replaced tone section — removed "Happy to help", "Got it", "Understood", acknowledge-before-acting instruction
- Added explicit CRITICAL rule: no **, no *, no #, no -, no numbered lists, no headers in chat responses, ever
- Voice examples now match MVP-PLAN style — short, direct, no filler
- "Start collecting immediately, no preamble" replaces "acknowledge and confirm first"

### Step 2 — Cross-document memory (verify + harden) ⬜
Memory system exists (chat_memory table, summary injected into system prompt). Need to verify it's actually building context correctly across sessions and that Bear uses it to pull project/company info on doc 3-4 instead of asking again.

### Step 3 — Context pulling from prior docs on same project ⬜
Projects and contacts are already loaded into system prompt. Need to verify Bear references prior docs when same project is detected and confirms rather than re-asking.

---

## Phase Completion Gate
Phase 1 is done when:
- Bear never outputs markdown in chat (test manually)
- By doc 3-4, Bear is pulling company/project context automatically
- Dov confirms it works before we move to Phase 2

---

## Completed Phases
None yet.

---

## Prior Work (pre-MVP-PLAN framework)
See git log for full history. Key items already built:
- RFI, Submittal, Change Order, Invoice PDF renderers
- Memory system (chat_memory table + summary injection)
- Profile auto-population (company name, address, license, etc.)
- Project/contact auto-save from chat
- Guest session flow + SaveGateModal
- Paywall (SubscriptionModal, free doc limit enforcement)
- Image upload + markup editor
- Document attachments (multi-page PDF)
- Mobile UI optimization
- Google OAuth redirect flow
- Persistent in-progress chats
- Coming soon landing page + waitlist
- App branch → constructionbear-app.vercel.app
