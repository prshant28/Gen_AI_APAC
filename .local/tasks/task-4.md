---
title: Add an end-of-stream summary so users know the assistant has finished
---
# Add an end-of-stream summary so users know the assistant has finished

  ## What & Why
  The new Agent Hub shows an inline "Thinking · Coordinator → Capture" ticker while the assistant is replying, but as soon as the final answer arrives the ticker simply disappears. On longer multi-step replies it would be reassuring (and faster to scan) to keep a one-line summary at the top or bottom of the final assistant bubble: e.g. "Done — checked 3 memories, created 1 task in 2.4s." This makes it obvious the workflow finished and gives the user a quick audit trail without expanding any details.

  Today the per-step results are already rendered via `ActionResultCards` below the final reply, but there's no overall "completed" badge or duration shown next to the message timestamp.

  ## Done looks like
  - Each completed assistant message shows a compact summary chip (icon + short text + total duration) above or below the markdown body, summarising what just happened in plain English.
  - The summary uses friendly agent labels (Coordinator, Capture, Recall, Tasks…), never raw "FooAgent" identifiers or model names.
  - The summary is read-only — clicking it doesn't expand anything (the existing toolbar export already handles drill-down).

  ## Relevant files
  - `src/pages/AgentPage.tsx` — final-message rendering block
  - `src/components/ActionResultCards.tsx` — already aggregates per-step results
  - `src/components/MessageToolbar.tsx` — existing meta row