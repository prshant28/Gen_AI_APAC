---
title: Update the in-app onboarding tour to match the new sidebar
---
# Update the in-app onboarding tour to match the new sidebar

  ## What & Why
  `OnboardingTour` still references the old sidebar items (Vault, Notes, Bookmarks, Tasks, Habits, Flashcards, Timeline, Mind Graph, Analytics, Pitch Deck) which no longer appear at the top level. New users running the tour will be pointed at items that don't exist in the nav, breaking the highlight overlays and confusing the narrative.

  ## Done looks like
  - The tour highlights the new top-level items: Dashboard, Library, Recall AI, Agent Hub, Workspace (Projects/Focus/Calendar), Learn, Discover, Insights, Integrations, Settings
  - Steps that referred to merged sub-pages (Notes, Tasks, Timeline, etc.) explain they now live as tabs inside the new hubs
  - The tour completes without orphaned/missing element targets

  ## Relevant files
  - `src/components/OnboardingTour.tsx`
  - `src/App.tsx` (PINNED_NAV / NAV_GROUPS / FLAT_NAV definitions for reference)