---
title: Add Library Inbox tab — let users review pending captures in one place
---
# Add Library Inbox tab — let users review pending captures in one place

  ## What & Why
  The new Library hub now has an "Inbox" tab that simply embeds the existing CapturePage. A true Inbox should show *recent or pending* captures (recently saved, AI-pending, or unreviewed memories) so users can triage them without re-running the capture flow. Today the tab is functionally a duplicate of the floating Capture flow.

  ## Done looks like
  - Library → Inbox lists the most recent captured items chronologically with quick "review", "tag", "archive" actions
  - A small "+ Capture" button still lets users add a new item from the Inbox
  - Empty state is informative ("All caught up — nothing to review")

  ## Relevant files
  - `src/pages/LibraryPage.tsx` (currently renders `<CapturePage embedded />` for the inbox tab)
  - `src/pages/CapturePage.tsx` (current capture form, can stay reachable via FAB)
  - `/memories?limit=…&unreviewed=true` style endpoint in `main.py` may need adding