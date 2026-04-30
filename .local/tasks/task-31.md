---
title: E2E coverage for tray persistence + Resume + AI bundle preview
---
## What & Why
  The test runner kept hitting iteration limits during this task, so the most complex flow (tray persistence → reload → modal re-open → Resume click loads items) is currently only verified by intermediate runs that didn't reach the final assertion. We should add a focused, deterministic test so future regressions are caught — especially around the StrictMode-sensitive persistence pattern.

  ## Done looks like
  - A scripted Playwright test that:
    1. Seeds localStorage with `recall:capture:session:v1` containing 2 notes BEFORE app load.
    2. Logs in as guest, opens /library?tab=inbox, clicks button-open-capture.
    3. Asserts the "Unfinished session" banner with "2 items" appears.
    4. Clicks Resume and asserts the tray contains both notes.
    5. Also covers: per-item removal until empty correctly clears storage; Submit clears storage; AI bundle preview button hits /capture/session/preview and renders 3 folder-name chips when the AI succeeds (mock the endpoint).
  - Acceptance: test passes locally and in CI deterministically.

  ## Relevant files
  - `src/pages/CapturePage.tsx` (component under test)
  - (new) e2e test file under whatever test harness the repo uses