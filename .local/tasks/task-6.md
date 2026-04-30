---
title: Show entity counts in the assistant's done chip (e.g. 'checked 3 memories, created 1 task')
---
# Show entity counts in the assistant's done chip

  ## What & Why
  Task #4 added an end-of-stream summary chip in Agent Hub that currently reads like `Done · Coordinator → Tasks · 2.4s`. The original task spec gave a richer example: `Done — checked 3 memories, created 1 task in 2.4s`. To keep scope tight, the first version showed the agent path instead of entity counts. Surfacing actual counts (memories recalled, tasks created, events scheduled, captures saved) would give users a one-glance audit trail that's even friendlier and more concrete.

  ## Done looks like
  - The completion chip on assistant messages reads in plain English with concrete counts, e.g. "Done — checked 3 memories, created 1 task · 2.4s".
  - Counts come from real per-step outputs (no fake numbers). When counts aren't available, fall back gracefully to the current friendly label path.
  - Still read-only, still uses friendly agent labels, still hides raw "FooAgent" / model names.

  ## Relevant files
  - `src/pages/AgentPage.tsx` — `CompletionSummary` component (currently shows status + agent path + duration).
  - `src/components/ActionResultCards.tsx` — already maps agents to verbs (Memory saved, Task created, Event scheduled). Reuse `ROUTE_MAP` or a similar mapping.
  - Backend: `workflow_complete` event payload may need a small enrichment (e.g. `step.entity_count` or a structured `output` field) so the frontend can show real numbers without parsing free-form summaries. Look in the FastAPI orchestrator that emits SSE events.