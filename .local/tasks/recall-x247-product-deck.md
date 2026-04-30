# Recall X247 Product Deck

## What & Why
Create a complete, polished slide deck (light theme) that introduces **Recall X247** to a brand-new user. The deck should walk through the problem, the product, the new-user journey (what they explore first), every major feature area, recent enhancements, and the roadmap / what's next. The goal is a single self-contained presentation that can be used for product demos, onboarding walkthroughs, or investor/stakeholder updates.

## Done looks like
- A new slide deck artifact opens in the workspace and renders cleanly end to end.
- Uses a **light theme** (white / off-white background, dark readable text, one accent color used consistently for highlights, charts, and CTAs).
- Covers the full story a new user needs:
  1. Title / hero slide ("Recall X247 — your AI second brain")
  2. The problem (information overload, lost notes, learning without execution, forgetting, no daily focus, fragmented tools)
  3. The solution in one line + a visual of the core loop: Capture → Recall → Act → Review
  4. Who it's for (Founders, Researchers, Operators — the three personas from the landing page)
  5. New user journey — a numbered walkthrough of what a first-time user sees and does (Sign up → Land on Dashboard → Capture first item → Ask the Agent → Get a daily Briefing → Review Inbox)
  6. Feature deep-dives, one slide each:
     - Knowledge Capture (YouTube, web articles, PDFs, notes, voice memo)
     - Neural Recall (3-tier semantic search with cited sources)
     - Tasks & Projects (priority, due dates, linked to memories)
     - Calendar & Study Scheduling (events, study sessions, ICS / Google import)
     - Flashcards & Spaced Repetition
     - Daily Briefing & Learning Analytics (streaks, velocity, domain radar)
     - Agent Hub (multi-agent chat with live streaming + workflow trace)
     - Knowledge Graph / Timeline / Workspace views
  7. Inbox & Review workflow (waiting count, filters, undo, search across full inbox)
  8. Recent enhancements (a "What's new" slide summarizing themes from the active task list — e.g., morning briefing email + weekend skip, voice mode polish, inbox bulk-undo & full-search, mobile layout improvements, vendor-name leak guards, per-tab view memory)
  9. What's next / roadmap (near-term, mid-term, longer-term buckets)
  10. Architecture at a glance (frontend pages, multi-agent orchestrator, SSE streaming, knowledge vault) — kept simple and visual, not a wall of text
  11. Closing slide — call to action ("Try Recall X247" / next steps)
- Each slide has a clear headline, 3–6 short bullets max (no walls of text), and uses simple icons or shape accents where it helps comprehension.
- Speaker notes on each content slide so the presenter knows what to say.
- Visual consistency: same font hierarchy, same accent color, same slide layout family across the whole deck.

## Out of scope
- No video, animation, or audio narration.
- No exporting to PowerPoint / PDF unless explicitly asked later.
- No changes to the actual Recall X247 app code — this task only produces the slide deck artifact.
- No dark-theme variant.

## Steps
1. **Set up the deck and theme** — Create a new slides artifact, configure a light theme (white background, dark text, single accent color), pick a clean readable font pairing, and define a reusable layout family (title, section divider, content with bullets, content with visual, two-column, closing).
2. **Write the narrative slides** — Title, problem, solution loop, target personas, and the new-user journey walkthrough. Keep each slide tight (headline + 3–6 bullets) and add speaker notes.
3. **Build the feature deep-dive slides** — One slide per feature area listed in "Done looks like" (Capture, Recall, Tasks, Calendar, Flashcards, Briefing & Analytics, Agent Hub, Graph / Timeline / Workspace, Inbox & Review). Use consistent layout, short bullets, and a small visual cue per slide.
4. **Add the "What's new" and roadmap slides** — Summarize recent enhancement themes (drawn from the current active task list) and lay out near-term / mid-term / longer-term roadmap buckets.
5. **Add architecture-at-a-glance and closing slides** — A simple visual of Frontend ↔ Multi-agent orchestrator ↔ Knowledge vault with SSE streaming, then a closing CTA slide.
6. **Polish pass** — Verify light-theme consistency, fix overflowing text, ensure every slide has a headline + speaker notes, and confirm the deck reads cleanly start-to-finish.

## Relevant files
- `README.md`
- `replit.md`
- `docs/RECALL_PLAN_MEMORY_SYSTEM.md`
- `src/pages/Landing.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/CapturePage.tsx`
- `src/pages/RecallPage.tsx`
- `src/pages/TasksPage.tsx`
- `src/pages/CalendarPage.tsx`
- `src/pages/FlashcardsPage.tsx`
- `src/pages/AgentPage.tsx`
