---
title: Show users where their old links now live with a friendly redirect banner
---
# Show users where their old links now live with a friendly redirect banner

  ## What & Why
  Old routes (`/notes`, `/habits`, `/timeline`, etc.) now silently redirect into the new Library / Focus / Learn / Insights hubs with a tab pre-selected. Users who bookmarked the old URLs will land on the new page without any explanation of *why* the URL changed. A one-time banner ("Notes is now part of Library") would smooth the transition.

  ## Done looks like
  - After a redirect from a legacy route, a dismissible banner appears on the destination hub explaining the merge
  - The banner remembers it was dismissed (localStorage) and never appears again
  - No banner appears on direct visits to the new hubs

  ## Relevant files
  - `src/App.tsx` (Navigate redirects at the bottom of the Routes block)
  - `src/components/TabbedPage.tsx` (good place to render the banner)
  - `src/pages/LibraryPage.tsx`, `FocusPage.tsx`, `LearnPage.tsx`, `InsightsPage.tsx`