# ConstructionBear MVP — Full Build Plan

## North Star
A GC opens the app, has a natural conversation, gets a polished document, saves it, creates an account, and pays. No friction. No AI feel. No setup screens. The document quality sells the product.

---

## SECTION 1 — CONVERSATION ENGINE

**How Bear talks:**
Bear communicates in short, natural sentences. No bullet points, no dashes, no stars, no bold text, no numbered lists in chat responses. It reads like a real person who knows construction. It can ask two related questions in one message but never more than that. It never says "Great!" or "Certainly!" or "Of course!". It gets straight to the point.

**Memory and context:**
From the first message Bear has zero context. It asks what it needs. As documents are created it builds a profile — company info, project names, contacts, recurring document types. By the third or fourth document it should be pulling context automatically and confirming rather than asking. If a similar document already exists for the same project it should reference it and ask if that context applies.

**Locked documents:**
Once a document is previewed in chat the conversation is locked. No edits in free tier. The chat remains readable but input is disabled. A subtle prompt appears: "To edit this document, upgrade your account."

**Unsupported documents:**
If a user requests a document not in the supported 20, Bear responds naturally: "That one's coming soon — we're putting the finishing touches on it. In the meantime I can help you with..." and lists what's available.

---

## SECTION 2 — DOCUMENT SUITE (20 documents for launch)

Documents 1-4 are fully built. Documents 5-20 must be built to the same quality standard before launch.

1. RFI ✅
2. Submittal ✅
3. Change Order ✅
4. Invoice ✅
5. AIA Pay Application G702/G703
6. Conditional Lien Waiver
7. Unconditional Lien Waiver
8. Daily Field Report
9. Punch List
10. Notice to Proceed
11. Transmittal
12. Subcontract Agreement
13. Site Observation Report
14. Request for Proposal
15. Construction Change Directive
16. Work Order
17. Notice of Commencement
18. Warranty Letter
19. Bid Proposal
20. Backcharge Notice

---

## SECTION 3 — USER FLOW (the funnel)

**Step 1 — Land on app**
User hits the app. No login wall. Chat is open immediately. Bear waits for input.

**Step 2 — Document creation**
Bear has a natural conversation collecting what it needs. Company name, license, address, contact info are collected as part of the document requirements — not as a form, not as a setup screen. Bear asks for them naturally when building the first document.

**Step 3 — Preview in chat**
Document renders as a preview directly in the chat window. Clean, professional, full formatting. User can read it but cannot edit or download it.

**Step 4 — Save to Library**
User clicks "Save to Library." This triggers the account creation modal. Clean, minimal — name, email, password or Google sign in.

**Step 5 — First free document credited**
Account is created. The document they just made is saved. They have one more free document before paywall hits.

**Step 6 — Second document**
Bear now has context from the first — pulls company info and project names automatically. Document is created and previewed.

**Step 7 — Paywall**
When they click "Save to Library" on the second document, Stripe modal appears. No way around it.

**Step 8 — Paid account**
Full access unlocked. Document editing enabled. Full library access. All 20 document types available.

---

## SECTION 4 — DOCUMENT LIBRARY

**Search:**
Search-first system. Every document is indexed by project name, document type, date, and full content. Searching "Brickell RFI shop drawings" returns the exact document instantly. The search is so powerful that manual navigation becomes unnecessary.

**Manual navigation:**
Accessible as a secondary option. Bubbles for each document type. Bubbles for each job. Same visual style as what exists now. It exists for users who want to browse — but search is always the faster path.

**Organization:**
Documents are grouped visually by project on the library screen.

**Actions per document:**
- Download PDF
- Share via email directly from app
- View original chat that created it
- Edit (paid accounts only)

---

## SECTION 5 — PRICING

**Solo:** $29.99/month — 1 user, 100 documents/month

**Enterprise:** $129.99/month — 5 users included, $24.99 per additional user, unlimited documents

**Trial logic:**
- Guest (no account): 1 document, preview only, no download
- Free account: 2 documents total, preview and download
- After 2nd document save: hard Stripe paywall, no dismissal

---

## SECTION 6 — STRIPE INTEGRATION

Flows to build:
- Checkout session triggered on paywall
- Webhook to update is_subscribed on users table
- Subscription status checked on every document save
- Cancel flow with grace period
- Enterprise plan with per-seat billing above 5 users

---

## SECTION 7 — GOOGLE AUTH

- "Continue with Google" on account creation modal and sign in screen
- First-time Google users get natural company info collection in chat — Bear already has their name and email from Google so it only asks what's missing
- Google contact import optional, prompted after first document is saved

---

## SECTION 8 — DATA ARCHITECTURE

**Contacts linked to jobs:**
Every contact gets a project_id association. When Bear collects any name or contact during document creation it automatically creates or updates the contact record and links it to the active project.

**Search index:**
Full text search across documents table covering project name, document type, document content, contact names, and dates. SQLite FTS5 handles this natively.

**Session persistence:**
Every conversation is saved with a session_id. Recent tab shows last 10 conversations. Clicking one reopens the full chat history. Starting a new chat creates a new session.

---

## SECTION 9 — BUILD ORDER

Phases execute in strict order. Bear does not move to the next phase until the current one is confirmed working by Dov.

**Phase 1 — Conversation engine**
Remove all markdown from Bear's chat responses. Implement memory that builds across documents. Implement context pulling from prior documents on same project.

**Phase 2 — Guest flow + account creation modal**
Remove login wall from app entry. Implement guest sessions. Build account creation modal triggered by Save to Library. Credit first document on signup.

**Phase 3 — Document preview in chat**
Document renders inline in chat after generation. Chat locks after preview. Save to Library button appears below preview.

**Phase 4 — Document library + search**
Build library view with FTS5 full text search. Visual grouping by project. Manual navigation bubbles as secondary option. Per-document actions.

**Phase 5 — Stripe paywall**
Hard paywall after 2nd document save. Checkout session. Webhook. Subscription status on all saves. Both Solo and Enterprise plans.

**Phase 6 — Google auth**
Connect Google OAuth fully. First-time Google users get natural company info collection in chat.

**Phase 7 — Contacts linked to jobs**
Auto-associate contacts to projects during document creation. Contact search pulls project history.

**Phase 8 — Remaining 16 documents**
Build documents 5-20 to the same quality as RFI and Submittal. Implement unsupported document handling.

**Phase 9 — Bear personality pass**
Final pass on tone, response patterns, and conversation style before public launch.

---

## SECTION 10 — DEFINITION OF DONE

ConstructionBear MVP is ready to ship when:

- A GC with zero context can open the app and create a polished RFI in under 3 minutes
- The document looks indistinguishable from one made by a professional back office
- Stripe processes a real payment
- The library saves and retrieves documents reliably
- Google auth works
- Bear never produces markdown in chat
- No crashes on mobile
