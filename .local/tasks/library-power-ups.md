# Power up the Library

## What & Why
The Library is the main place users land to manage what they've captured, but it's mostly read-only one-item-at-a-time. There are no checkboxes, no way to save a filter as a smart collection, no global tag manager, no trash, no pinning in Vault, and no related-items panel. Add the missing power-user features so the Library feels like a real knowledge workspace.

## Done looks like

### Bulk actions (Vault, Files, Bookmarks, Notes)
- A "Select" mode reveals checkboxes on every item; an action bar appears with: **Delete**, **Move to Project**, **Add Tags**, **Remove Tags**, **Archive**, **Export selection**, and a select-all toggle.
- Bulk actions show a confirmation when destructive (delete / archive) and a toast on success/failure.

### Smart Collections / Saved Filters
- Users can save the current Vault filter combo (search query + domain + source + tags + sort) as a named "Smart Collection."
- Saved collections appear in the Library left rail (or a small chip strip) and one click re-applies the filter.
- Collections can be renamed and deleted.

### Global Tag Manager
- A new "Tags" tab (or a settings modal launched from anywhere in Library) lists every tag with its usage count.
- From here, users can **rename** a tag (cascades to all items), **merge** two tags into one, and **delete** a tag (with confirmation).

### Trash & Archive
- Deleting an item now sends it to **Trash** (recoverable for 30 days) instead of hard-deleting. Trash has its own tab with **Restore** and **Delete forever** actions.
- An **Archive** state hides items from the main views but keeps them searchable; bulk archive/unarchive is supported.

### Pinning in Vault
- A pin icon on each Vault card (already exists for Notes). Pinned memories sort to the top within their current view.

### Related-items panel
- When opening a memory's deep-dive view, show a "Related memories" panel populated by the existing knowledge-graph / embedding logic.

### Deep search
- The Library top search expands to also search the full extracted text of memories (PDF body, transcript), not just titles/summaries/tags. Results show a snippet with the matched phrase highlighted.

## Out of scope
- The grid/compact view toggle on Vault (handled in the separate Vault views task — this task should respect whatever toggle exists).
- Real-time multi-user collaboration / share links.
- Changing the Inbox (Capture) tab.

## Steps
1. **Bulk select & action bar** — Add a "Select" toggle that reveals checkboxes across Vault, Files, Bookmarks, and Notes. Build the floating action bar and wire it to existing per-item endpoints (extending them to accept arrays where needed).
2. **Trash + Archive states** — Add `archived` and `trashed_at` fields on the relevant records, switch the existing delete to soft-delete, and add the Trash tab with restore and purge actions. Add archive into the bulk action bar.
3. **Smart Collections** — Persist saved filter combos per user (Firestore + in-memory fallback). Add UI to save / list / apply / rename / delete collections from the Library.
4. **Global Tag Manager** — Build a Tags view that lists tags with counts and supports rename / merge / delete with cascading updates across all items.
5. **Pinning in Vault + Related-items panel** — Add a pin button to Vault cards (sort pinned to top); on the memory detail view, show a "Related memories" panel using existing graph/embedding helpers.
6. **Deep full-text search** — Extend the Library search to also query full extracted content; return matched snippets and surface them in the result rows.

## Relevant files
- `src/pages/LibraryPage.tsx`
- `src/pages/VaultPage.tsx`
- `src/pages/NotesPage.tsx`
- `src/pages/BookmarksPage.tsx`
- `src/pages/MemoryDetailPage.tsx`
- `src/components/TabbedPage.tsx`
- `src/pages/pages.css`
- `src/lib/types.ts`
- `main.py`
- `app/db.py`
- `app/capture_agent.py`
