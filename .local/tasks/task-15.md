---
title: Make sidebar icons all the same size and style
---
# Make sidebar icons visually consistent

## What & Why
The sidebar today has icons at four different sizes (11px, 13px, 14px, 15px), two different stroke weights, and only the "Pinned Essentials" group wraps icons in a colored tile. The result feels uneven. Pick one consistent visual treatment and apply it to every nav item so the sidebar looks intentional and calm.

## Done looks like
- Every functional nav icon in the sidebar renders at the same pixel size and the same stroke weight.
- Either every group uses the colored tile/box treatment, or none do — the sidebar reads as one unified system, not three.
- The collapse/expand chevron, group headers ("Workspace", etc.), workspace items (Projects, Focus, Calendar), flat nav (Learn, Discover, Insights), and footer items (Integrations, Settings, Sign Out) all visually match.
- Active vs. inactive states still read clearly (no regression on highlighting the current page).
- Collapsed-sidebar mode still aligns icons cleanly in their column.

## Out of scope
- Changing the sidebar's information architecture, ordering, or which items appear.
- Changing the logo, the user avatar, or the "System Ready" status pill.
- Replacing the icon library.

## Steps
1. **Pick the unified treatment** — Choose one icon size (recommend 16px), one stroke weight (recommend 1.75–2), and decide whether to keep the colored-tile container on all items or drop it from the pinned group. Keep whatever decision is made consistent through the whole sidebar.
2. **Apply the treatment everywhere** — Update the pinned essentials, group headers, workspace items, flat nav, and footer items so they all use the same icon size, stroke, color treatment, and (if any) container. Make sure the active-state styling still wins over the base style.
3. **Verify both expanded and collapsed sidebar states** — Walk through the sidebar in both widths and confirm icons line up vertically, sizes match, and nothing jumps when toggling.

## Relevant files
- `src/App.tsx:103-400`
- `src/index.css`
- `src/pages/pages.css`