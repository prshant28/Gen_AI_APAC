# Recall X247 — AI-powered Second Brain v2.0

## Overview
Recall X247 is an AI-powered productivity assistant designed as a "second brain." It uses a multi-agent AI system to capture knowledge, perform semantic recall, manage tasks, generate flashcards, schedule study sessions, and deliver AI-generated daily briefings. The project aims to provide comprehensive knowledge management and personal productivity enhancement, becoming a leading platform to help users manage information overload and optimize personal and professional growth.

## User Preferences
I prefer detailed explanations.
I want iterative development.
Ask before making major changes.

## Recent Fixes (Apr 29, 2026)
- **Capture page upgrades + dedicated `/capture` route:** `/capture` no longer redirects to `/library?tab=inbox` — the route in `src/App.tsx` now renders the full `<CapturePage />` directly (the standalone-vs-embedded variants share one component via the `embedded?:boolean` prop). The document upload pipeline was widened end-to-end: the file picker and drop zone in `src/pages/CapturePage.tsx` now accept `.pdf` (existing) plus `.txt`, `.md`, `.markdown`, the size cap was raised from 15 MB → 25 MB, and the staged-file card scrolls the "Run 7-Agent Capture Pipeline" button into view automatically (`runButtonRef.scrollIntoView({ block: 'center' })`) so users on shorter laptops can no longer "lose" the action button below the fold. Text files render an inline first-4 kB monospace preview (read via `FileReader.readAsText` on a sliced blob) instead of trying to iframe them. Backend `main.py /capture/upload` was rewritten to (a) explicitly enumerate accepted extensions and 400 anything else with a clear message, (b) 413 with "File too large (max 25 MB)" instead of a generic 500, (c) route text uploads through `capture(source_type='note', content=raw.decode('utf-8', errors='ignore')[:50000])` so they get the same 7-agent treatment as a quick note, and (d) override the auto-generated title with the filename for text files (PDFs already used embedded `/Title` metadata when available). Title fallbacks on both ends now strip `.pdf|.txt|.md|.markdown` from filenames. The source-type badge is only marked `pdf` when the original file was a PDF — text uploads stay tagged `note` so the inbox filter chips don't lie. Coordinator-side, `app/coordinator.py` SYSTEM_PROMPT was tightened with a "ONE agent per user turn unless explicitly asked for two" rule and a strict capture-confirmation format ("Saved <title> to your Inbox.") so chat-driven captures no longer auto-chain `CalendarAgent` / `TaskAgent` suggestions.
- **Inbox filters, search & pagination:** The Library Inbox is no longer a flat 50-item dump. `src/components/LibraryInboxTab.tsx` now renders a sticky filter toolbar with source-type chips (`All / Web / YouTube / PDF / Note`), date chips (`Any time / Today / This week`), a domain dropdown bound to the canonical `ALLOWED_DOMAINS` list, and a compact text search. Source + domain filters round-trip to the server (page-accurate), date + search filter the loaded page client-side over `title` / `summary`. A "Load more" button fetches the next page of 50 via the new `offset` query param; pagination dedupes pinned rows that can re-appear across pages and a `loadSeqRef` discards stale responses when filters change mid-flight. **Server-side search fallback:** when the loaded page is full (≥50 rows) AND the local search yields zero matches, a debounced (300ms) server query runs against the new `q=` param on `/memories`, which does a case-insensitive substring match across `title` + `summary` over a triple-wide candidate window — this lets users find captures buried far past page 1 without manually clicking Load more. The fallback uses its own `serverSearchSeqRef` to discard stale responses and a "Searching the rest of your inbox…" indicator (`state-inbox-server-searching`) covers the in-flight gap. All filter state is mirrored to the URL query string (`?tab=inbox&src=youtube&dom=AI&when=today&q=…`) so it survives Library tab switches AND full-page refreshes — `useSearchParams` + `setParams({ replace: true })` keeps the back button clean. Backend: `app/recall_agent.py` `list_memories` and `main.py GET /memories` now accept `source_type` (validated against `{youtube,web,pdf,note}` — bad values are silently ignored), `offset` (the Firestore over-fetch window widens by `safe_offset` so deep pages still see enough candidates after the in-memory user/unreviewed/archived filter), and `q` (substring match before the offset/limit slice). New test ids: `toolbar-inbox-filters`, `chip-src-{all,web,youtube,pdf,note}`, `chip-when-{any,today,week}`, `select-inbox-domain`, `input-inbox-search`, `button-clear-filters`, `button-load-more`, `state-inbox-no-matches`, `state-inbox-server-searching`.
- **Inbox Undo for Review/Archive:** Triaging a row in the Library Inbox now leaves a 5.5-second window to take it back. The global toast in `src/App.tsx` was extended with an optional `action` (`{ label, onClick, testId }`) — toasts with an action linger 5500ms (vs 3800ms otherwise) and render an inline UNDO button that dismisses optimistically, then runs the handler. `src/components/LibraryInboxTab.tsx` `handleReview` / `handleArchive` capture the row's `originalIndex` before removing it, fire `showToast(..., { onClick: () => restoreMemory(...) })`, and `restoreMemory` PATCHes `reviewed:false` (and `archived:false` for Archive) and re-inserts the row at its prior index. Multiple consecutive triages stack — each toast carries its own undo handler, so the queue is naturally per-action. If the user navigates away the local re-insert is a no-op but the server-side PATCH still revives the memory, so it reappears the next time the inbox loads. Test ids: `button-undo-review-<id>` and `button-undo-archive-<id>`.
- **Sidebar Inbox badge:** Brought back the unread-style numeric badge on the Library nav item so users can see waiting captures at a glance without opening the tab. Backend adds a tiny `GET /memories/inbox-count` (counts owned, non-trashed, non-archived, non-reviewed memories; capped at 500). The Sidebar in `src/App.tsx` fetches the count on mount, on window focus, on `visibilitychange`, and whenever an `inbox-count-refresh` custom event fires. `src/lib/apiFetch.ts` was extended to broadcast that event after every successful non-GET `/memories*` call, so capture / review / archive flows refresh the badge automatically without per-page wiring. The badge is a small red pill before the `⌘3` shortcut when expanded, and a tiny red dot pinned to the icon when the sidebar is collapsed; both are hidden when the count is 0.
- **Vendor-name leak guard:** Added `scripts/check-no-vendor-leaks.sh` (npm script `check:vendor-leaks`, also wired into `scripts/post-merge.sh` and registered as the `vendor-leaks` validation step). It ripgreps `src/` for third-party AI vendor names (Gemini/Whisper/Anthropic/Claude/OpenAI/GPT/Vertex AI and versioned model ids) and fails non-zero on any match outside the small allowlist (`Landing.tsx`, `SettingsPage.tsx`, `IntegrationsPage.tsx`, `src/agents/*`, `src/lib/gemini.ts`, `src/lib/liveClient.ts`). Locks in the brand-cohesion gain from Task #3 / #5 so future refactors can't quietly leak vendor names back into product copy.
- **Recall AI source-type intent:** `app/recall_agent.py` now detects when a user mentions a specific source (YouTube/web/note/PDF) in their query and returns ONLY items of that type. Previously, "What are the key points from my YouTube videos?" returned a "Building a Second Brain" note because tag-based search missed the intent. Tier 0 now hard-filters by `source_type` first, with fallback to general search if zero items match (handles false positives like "how to film a video for marketing").
- **Recall AI redesign (Apr 2026):** Backend `recall()` now (a) returns SHORT TL;DR answers (~50 words, max_tokens=160), (b) enriches sources with thumbnails / favicons / tags / key_points / relative dates, (c) returns up to 8 cards, (d) generates exactly 3 follow-up suggestions (AI-first, padded with deterministic fallbacks), (e) supports a `history` field with conversation turns. Short follow-ups (≤6 words containing markers like "more/tell/about/that") merge the last user turn into the search query across Tier 0/1/2/3 — so "Tell me more about that" actually finds the prior subject. Tier 3 AI scan is capped at 15 items / 80-char summaries to stay under OpenRouter token quotas; a final safety-net returns 6 most-recent memories if all tiers fail. Frontend `src/pages/RecallPage.tsx` was rewritten as a minimal-but-powerful single-column layout: collapsible Voice Recall card embedding `<LiveInlineGate>` (Gemini Live), 6 quick-prompt chips, recent-question chips, rich SourceCard (inline-playable YouTube banner, web favicon + host, tag pills, Open + Ask AI buttons), follow-up chips wired to `handleSend`, sticky composer with mic + send. Each `/recall` request includes the prior `messages` as `history`.

## System Architecture
The application employs a multi-agent AI architecture with a central orchestrator.

### UI/UX Decisions
The design system features dark glassmorphism with a neural theme, utilizing CSS custom properties for extensive theming. It supports responsive layouts, a light/dark theme toggle, and premium styling elements. The sidebar is redesigned for clarity, featuring pinned "ESSENTIALS" and collapsible groups for WORKSPACE, LEARN & GROW, and INSIGHTS. Onboarding includes an actionable "PICK ONE TO START" tour and a dismissible "GET FAMILIAR" checklist on the dashboard. All UI strings and decorative emojis have been replaced with lucide icons or plain text. The Advanced Dashboard is redesigned with stat cards at the top, unified section headers, and derived "Smart Insights." The Neural Recall Empty State features a two-column rich landing with prompt sections, recent questions history, and a "Your knowledge" panel.

### Technical Implementations
- **Frontend:** Built with React, TypeScript, and Vite.
- **Backend:** Developed with Python and FastAPI.
- **Multi-Agent System:** An Orchestrator dispatches tasks to specialized sub-agents via OpenAI function calling, managed by a `WorkflowEngine`.
- **Live Voice/Video Brain:** Real-time bidirectional conversation with Google Gemini Live API, integrated within the Agent Hub.
- **Plan Generator:** A 4-agent pipeline creates structured plans for various goals.
- **Workspace Agent:** Manages backend-persisted projects with items, tasks, and folders, including AI-driven organization.
- **Discover Multi-Agent UX:** Enhances content discovery by visualizing content search, fetching, and ranking.
- **Project Insights and Task Breakdown:** `insight_agent` suggests actions, and `plan_agent` breaks down tasks into micro-plans.
- **Workspace Recall:** Searches across items, tasks, memories, and projects to synthesize cited answers.
- **Anti-clutter Dedup:** Content-hash-based deduplication for notes.
- **Revisit Reminders:** Firestore-backed CRUD system with frequency math and Smart AI planning.
- **Advanced Dashboard:** Aggregates time-aware greeting, knowledge pulse, activity heatmap, capture streaks, top tags, and a "pick-up" feature.
- **Folder Timeline:** Derives per-folder activity feeds with bidirectional linking.
- **Reusable Agent Visualization:** Component to render agent pipeline states and timings.
- **Real-time Communication:** Server-Sent Events (SSE) for streaming AI responses.
- **Knowledge Capture:** AI-analyzes content from YouTube, web pages, and PDFs.
- **Semantic Recall:** Features a 3-tier semantic search.
- **Spaced Repetition:** Integrated into Flashcards.
- **Voice Capture:** Transcribes audio uploads.
- **Shareable Memories:** Generates public, read-only views.
- **Auto-tagging:** AI suggests and merges tags.
- **SPA Deep-Link Hardening:** HTTP middleware serves `index.html` for SPA routes, handling API and static asset exceptions.
- **Firestore Persistence Strategy:** Prioritizes explicit credentials, then Application Default Credentials, with an in-memory mock as a fallback for development.
- **Daily Briefing:** AI-generated briefing grounded in recent memories and user stats. An opt-in scheduler (off by default) auto-delivers each morning's briefing at the user's chosen local hour as an in-app banner (and, when the browser allows, a system notification) so the user never has to open the page. Settings live in `briefing_settings` (per-user toggle / hour / tz offset); the latest unseen briefing is mirrored to `briefing_notifications` and the frontend `BriefingNotifier` polls `/briefing/notification` every 60s.
- **Per-User Data Scoping:** Multi-tenant isolation across all collections using `X-User-Id` header for data filtering and persistence.

### Feature Specifications
- **Core AI Functionality:** Multi-agent orchestration and natural language processing.
- **Knowledge Management:** Capture, semantic search, memory vault, and mind graph.
- **Productivity Tools:** Task management, advanced calendar (month/agenda views, topic categorization, ICS import/export, Google/Apple/Outlook subscribe), flashcards with spaced repetition, study plan generation, markdown notes, bookmarks, and habits.
- **Advanced Workspace:** Workspace KPIs, Workspace Recall search, per-project analytics, project templates, Markdown export, drag-and-drop organization, task due-dates, and "generate flashcards" bridge.
- **Analytics:** Tracks learning velocity, domain expertise, and streaks.
- **User Management:** Profile management, security, and data export.
- **Integrations:** A catalog of third-party integrations.

## External Dependencies
- **AI Providers:** Google Gemini 2.0 Flash, OpenRouter.
- **Database:** Google Cloud Firestore.
- **Deployment:** Google Cloud Run.
- **APIs:** OpenAI-compatible API layer.
- **Third-party Services (Integrated):**
    - Google (Gmail, Calendar, Drive, Docs, Photos, Keep, YouTube)
    - Productivity (Notion, Obsidian, Evernote, Todoist, Trello)
    - Communication (Slack, Discord, Telegram, WhatsApp)
    - Developer (GitHub, GitLab, Linear, Jira)
    - Social (X, LinkedIn, Reddit)
    - Storage (Dropbox, OneDrive, S3)
    - Media (Spotify, Pocket, Instapaper)
    - AI/Automation (Chrome extension, Zapier, Make, OpenAI, Webhooks)