# Sidebar Simplify, Pages Merge & Theme Unify

## What & Why
The app currently exposes **21 nav items** across pinned, three collapsible groups, and footer — too many for users to understand what to use when. Several pages cover overlapping ground (Notes/Bookmarks live alongside Vault; Tasks and Habits both list daily things to do; Flashcards/Revisits/Study Plan are all spaced-repetition flavors; Timeline/Mind Graph/Analytics are three views of the same activity data). On top of that, styling is visibly inconsistent across pages — Dashboard uses its own `stat-card` glow classes, Settings uses fluid `clamp()` padding, the "Agent" family uses 14px card radius while Vault/Analytics/Timeline use 16px, and several pages define a local `const card` token instead of the shared `.view-card` class.

Goal: a noticeably lighter, easier-to-navigate app where every page feels like it belongs to the same product.

## Done looks like
- Sidebar shows roughly **9–10 items** instead of 21, organized so a new user can guess what each one does within seconds.
- Merged pages work as a single page with internal tabs/filters, no data or feature loss:
  - **Library** = Vault + Notes + Bookmarks (tabs: All / Notes / Bookmarks / Files)
  - **Focus** = Tasks + Habits (Habits as a "Daily rituals" section at the top of the Tasks list)
  - **Learn** = Flashcards + Revisits + Study Plan (tabs: Plan / Flashcards / Revisits)
  - **Insights** = Timeline + Mind Graph + Analytics (view switcher: Timeline / Graph / Analytics)
- **Pitch Deck** moved out of the sidebar footer into Settings (or removed entirely if not core).
- **Capture** stays reachable from the floating quick-capture button + a top-of-Library "Inbox" entry; standalone `/capture` sidebar item is removed.
- Old routes (`/notes`, `/bookmarks`, `/habits`, `/flashcards`, `/revisits`, `/plan`, `/timeline`, `/graph`, `/analytics`, `/capture`, `/deck`) **redirect** to the new merged pages with the correct tab/view pre-selected, so existing bookmarks and deep links keep working.
- Every page in the app shares **one consistent visual language**:
  - One card style (single radius, single border treatment, single shadow) used everywhere — no more local `const card` tokens drifting from the shared component.
  - One padding scale (no fluid `clamp()` outliers).
  - One page header pattern (icon + title + subtitle + optional right-side actions) used by all pages.
  - One set of buttons (primary / secondary / ghost) used everywhere — no more page-specific gradients except where it's a deliberate hero element.
  - Dashboard's bespoke `stat-card` glow classes replaced with the shared card so its tiles match Analytics and Vault.
- Light/dark mode both look clean and consistent across the merged + restyled pages.
- The merged sidebar groups remain collapsible, the command palette (`⌘K`) still finds every destination (including the sub-tabs of merged pages), and mobile sidebar still works.

## Out of scope
- Agent Hub redesign — that's already covered by Task #1 (Make Agent Hub minimal & hide AI provider names). This task **must not** rework Agent Hub's internal layout; it only ensures Agent Hub uses the same shared card / button / header primitives as the rest of the app once Task #1 lands.
- Backend / API changes. All merges are frontend route + UI consolidations over existing data sources.
- New features inside the merged pages (no new flashcard logic, no new analytics charts) — only consolidation and re-skinning of what's already there.
- Landing / Login / Auth pages — their darker "Neural OS" aesthetic stays as-is.

## Proposed final sidebar
**Pinned (4):**
1. Dashboard
2. Library *(was Vault + Notes + Bookmarks; quick-capture FAB feeds its Inbox tab)*
3. Recall AI
4. Agent Hub

**Workspace (3):**
5. Projects
6. Focus *(was Tasks + Habits)*
7. Calendar

**Learn (1):**
8. Learn *(was Flashcards + Revisits + Study Plan)*

**Discover (1):**
9. Discover

**Insights (1):**
10. Insights *(was Timeline + Mind Graph + Analytics)*

**Footer (2):**
- Integrations
- Settings *(Pitch Deck link lives inside Settings → About)*

## Steps
1. **Lock the design system primitives.** Pick the single canonical card (radius, border, shadow, padding), the single page-header component (icon + title + subtitle + actions slot), the single button set, and the single section/tab pattern. Document them as the source of truth so every merged page consumes them.

2. **Merge Library.** Combine Vault, Notes, and Bookmarks into one page with internal tabs (All / Notes / Bookmarks / Files / Inbox). Wire the existing Vault data view, the Notes editor, and the Bookmarks list under those tabs. Add redirects from `/notes`, `/bookmarks`, and `/capture` (Capture lands on the Inbox tab).

3. **Merge Focus.** Combine Tasks and Habits into one page. Habits become a "Daily rituals" section that sits above the Tasks list; tapping a habit still does what the Habits page does today. Add redirect from `/habits`.

4. **Merge Learn.** Combine Flashcards, Revisits, and Study Plan into one page with three tabs (Plan / Flashcards / Revisits). Preserve all existing functionality of each. Add redirects from `/flashcards`, `/revisits`, `/plan`.

5. **Merge Insights.** Combine Timeline, Mind Graph, and Analytics into one page with a view switcher (segmented control) at the top. Preserve all visualizations. Add redirects from `/timeline`, `/graph`, `/analytics`.

6. **Move Pitch Deck.** Pull `/deck` out of the sidebar footer. Add it as an entry inside Settings → About (or similar) and leave the route working so the existing deep link still opens the deck.

7. **Rebuild the sidebar.** Replace the current 21-item structure with the 10-item layout above. Update icons so each label has a clear, unambiguous icon. Make sure the collapse/expand state, mobile drawer, active-route highlighting, and ⌘K command palette all reflect the new structure (and the palette can still jump directly to a specific tab inside a merged page).

8. **Apply the unified theme to every page.** Replace local `const card` tokens with the shared card primitive. Remove Dashboard's bespoke `stat-card` glow variants in favor of the shared card. Drop the `clamp()` padding on Settings in favor of the standard scale. Standardize all page headers to the new header component. Audit each page for one-off gradients/colors that don't belong and bring them into the system. Verify in both light and dark mode.

9. **Manual + automated sweep.** Click through every sidebar item and every merged tab in light and dark mode, on desktop and mobile widths, to confirm no broken layouts, no orphaned routes, no dead links from in-app navigation (dashboard cards, recall actions, command palette), and that all redirects land on the right tab.

## Relevant files
- `src/App.tsx`
- `src/index.css`
- `src/pages/VaultPage.tsx`
- `src/pages/NotesPage.tsx`
- `src/pages/BookmarksPage.tsx`
- `src/pages/CapturePage.tsx`
- `src/pages/TasksPage.tsx`
- `src/pages/HabitsPage.tsx`
- `src/pages/FlashcardsPage.tsx`
- `src/pages/RevisitsPage.tsx`
- `src/pages/StudyPlanPage.tsx`
- `src/pages/DiscoverPage.tsx`
- `src/pages/TimelinePage.tsx`
- `src/pages/MindGraphPage.tsx`
- `src/pages/AnalyticsPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/DeckPage.tsx`
- `src/pages/IntegrationsPage.tsx`
- `src/components`
