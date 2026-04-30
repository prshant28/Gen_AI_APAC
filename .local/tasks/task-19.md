---
title: Add a standalone Daily Briefing page with audio, timeline, action items, and history
---
# Standalone Daily Briefing page

## What & Why
The daily briefing is currently a small card at the top of the Dashboard, regenerated every 5 minutes and never persisted. Give it a real home: a dedicated page where users can read the full briefing, listen to it as audio, scrub through their day's timeline, see action items, jump to past briefings, and review weekly/monthly recaps. This becomes a daily ritual surface, not just a Dashboard widget.

## Done looks like
- A new route **`/briefing`** with a sidebar entry near the top of "Pinned Essentials" (icon + label "Daily Briefing").
- The page header shows the date, a time-aware greeting, and a "Listen" play button that plays the briefing as audio (text-to-speech of the briefing body + executive summary).
- **Today section** — The full AI-written briefing text (longer than the dashboard snippet), with paragraphs for: focus, what's new in your vault, what to revisit, what's at risk.
- **Action items panel** — A clean list of action items extracted from recent captures (the `action_items` already produced by the capture agent) with checkboxes the user can tick (state persists).
- **Today's timeline** — A vertical timeline mixing scheduled tasks, due habits, due revisits, and calendar events (if present), in chronological order.
- **Smart insights row** — The same Learning Velocity / Topic Lead / Next Revisit cards from Dashboard, larger and more readable.
- **Past briefings** — A scrollable history list of previous days' briefings (titles + dates), each opening that day's full briefing in the same layout.
- **Weekly recap** and **Monthly recap** tabs at the top of the page that show aggregated pulse deltas, top topics of the week/month, and a short AI-written recap.
- The Dashboard's existing briefing card stays, but gains a "Open full briefing →" link.
- Briefings are now persisted to a Firestore collection so they can be re-read; cache still applies but a saved copy exists for the day.

## Out of scope
- Push / email delivery of the briefing.
- A real podcast feed; audio is generated client-side via the browser's speech synthesis (or a simple TTS endpoint if one exists).
- Editing the briefing text.
- Major redesign of the Dashboard.

## Steps
1. **Persist briefings** — Add a Firestore collection (with in-memory fallback) that stores each generated briefing keyed by date, plus an endpoint to list past briefings and fetch one by date. Update the existing `/briefing` flow to write to this collection on generation.
2. **New route + sidebar entry** — Create `src/pages/DailyBriefingPage.tsx`, register the `/briefing` route, and add the nav entry in the sidebar (matching the unified icon style established in the sidebar-icons task).
3. **Today layout** — Build the page sections in order: header w/ greeting and Listen button, full briefing text, action-items panel, today's timeline, smart insights row.
4. **Audio playback** — Wire the Listen button to play the briefing body using the browser's speech synthesis; show play/pause/restart controls and a simple progress bar.
5. **Action items** — Surface the existing `action_items` from recent captures, render as checkboxes, persist completion state per user (Firestore field on the action item or a separate completed-items collection).
6. **Past briefings + Weekly/Monthly recap tabs** — Add the history list, make each entry openable, and add the weekly and monthly recap tabs that aggregate pulse data and call the LLM for a short recap text.
7. **Dashboard hand-off** — Keep the Dashboard briefing card; add an "Open full briefing →" link that navigates to `/briefing`.

## Relevant files
- `src/pages/DashboardPage.tsx`
- `src/App.tsx`
- `src/pages/pages.css`
- `app/capture_agent.py`
- `app/dashboard_agent.py`
- `main.py`
- `app/db.py`