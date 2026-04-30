# Add grid view and compact card view to the Vault

## What & Why
The Vault currently shows memories in one fixed card grid. Power users with hundreds of memories want to switch to a denser layout to scan more at a glance, and a list-style "row" layout for quick triage. Add a view toggle (grid / list) and a density toggle (comfortable / compact small-card) so users can pick what fits the moment.

## Done looks like
- A small toggle next to the Vault's sort dropdown lets users switch between **Grid view** and **List view**, and another control switches density between **Comfortable** and **Compact (small card)**.
- The user's choice persists across page reloads (localStorage is fine).
- **Grid + Comfortable** matches today's layout exactly (no regression).
- **Grid + Compact** shows smaller cards: smaller padding, smaller title/source-icon, summary clamped to 1 line (or hidden), tags truncated. About twice as many cards fit on screen.
- **List view** shows one memory per row with source icon, title, domain/tag chips, date, and the same per-item actions (flashcards, deep dive, delete) — useful for fast scanning.
- The toggle UI also appears (and works) on the Library → Vault tab and Library → Files tab, since both reuse `VaultPage`.
- All existing search / sort / domain-filter / source-filter behavior keeps working in every view mode.

## Out of scope
- Bulk selection / multi-select actions (handled in the separate Library power-ups task).
- New per-item actions or new fields on the memory model.
- Changing the Notes or Bookmarks tabs.

## Steps
1. **Build a small reusable view-mode toggle component** — Two segmented controls: one for Grid/List, one for Comfortable/Compact, using the icon set already in use on the page. Should be reusable later by other pages.
2. **Wire it into the Vault** — Add the toggle to the Vault header, store the user's choice (persist to localStorage keyed per page), and conditionally render the right layout.
3. **Add the new layouts** — Implement the Compact card style and the List row style in CSS alongside the existing Comfortable grid. Keep the existing layout untouched as the default. Make sure thumbnails (YouTube), source icons, tags, and per-item actions all behave correctly in every variant, including empty-state and loading skeletons.
4. **Verify it on the Library tabs** — Open Library → Vault and Library → Files to confirm the toggle is present and the chosen layout is respected (both pass through `VaultPage`).

## Relevant files
- `src/pages/VaultPage.tsx`
- `src/pages/pages.css`
- `src/pages/LibraryPage.tsx`
- `src/components/TabbedPage.tsx`
- `src/lib/types.ts:8-38`
