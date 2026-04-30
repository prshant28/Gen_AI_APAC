---
title: Make briefing checkboxes safe when used on multiple devices
---
# Concurrent-safe action item toggles

  ## What & Why
  Action item completion state is stored in a single Firestore document per user (`briefing_action_state/{uid}`) and updated with a read-modify-write. If the user toggles items on two devices at once (or two browser tabs), one update can clobber the other.

  ## Done looks like
  - Toggling an action uses an atomic operation (Firestore `ArrayUnion` / `ArrayRemove` or a transaction) so concurrent toggles never lose updates.
  - Optional: a small client-side reconciliation on focus to refresh state.

  ## Relevant files
  - `app/briefing_agent.py` (`toggle_action_item`, `_load_completed`)
  - `app/db.py` (mock client may need matching helpers)