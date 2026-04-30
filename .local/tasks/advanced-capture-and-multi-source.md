# Advanced Capture page + supercharge Multi-Source sessions

## What & Why
The Capture page already supports 8 sources and a multi-source "session tray," but it's missing several things that would make capturing feel effortless: pasting many URLs at once, dragging a screenshot in for OCR, warning about duplicates before save, reusable capture templates, and a richer multi-source tray that lets users reorder items, edit each one, and treat the whole bundle as a "research session" with an AI-written overview. Make the page feel like a pro inbox, not just a form.

## Done looks like

### Capture page improvements (single capture)
- **Batch URL paste** — Paste a block of text containing many URLs (newline / comma / space separated); the page detects each URL, lets the user confirm the list, and queues them for capture one after another with a small progress strip.
- **Screenshot / image capture with OCR** — A new "Image" source where the user can drop or paste an image (or use the system clipboard). The image is sent through OCR, the extracted text becomes the captured content, and the image is stored as the thumbnail. Falls back gracefully if OCR is unavailable.
- **Duplicate warning before save** — Before committing a capture, the page checks against the vault (by URL or content fingerprint) and shows an inline "Looks like you already captured this on {date} — open it / save anyway / cancel" prompt. Today the dedup check happens after save; move it earlier.
- **AI-suggested destination** — On the preview panel, suggest 1–3 likely projects/folders for this capture based on its content and tags, with one click to assign. Falls back to manual selection.
- **Capture templates** — A small "Templates" menu with a few starter templates (Meeting Note, Article + My Take, Code Snippet + Why-it-matters, Book Quote + Reflection). Selecting a template prefills the note input and tags. Users can save the current draft as a new template.
- **Quality / metadata strip on the preview** — Show estimated read time, word count, language, and a confidence badge from the Guardian agent.

### Multi-Source Capture Session improvements
- **Reorder & edit items in the tray** — Drag-to-reorder; click any staged item to edit its text, caption, or remove it.
- **Per-item source labels** — Each tray item shows its type icon, a one-line summary, and an edit/delete control.
- **AI bundle overview** — Once 2+ items are in the tray, generate a short AI-written "what this session is about" summary the user can preview before saving. This becomes the default folder description.
- **Smarter folder naming** — When in `auto` folder mode, propose 3 folder name options instead of one, plus a "rename later" option.
- **Save as Research Session artifact** — When the bundle is saved, also create a single "session" record that links all items together so the user can revisit the whole bundle as one unit later.
- **Resume an in-progress session** — If the user navigates away with items in the tray, prompt to resume on next visit (persist tray to localStorage).
- **Quick-add via clipboard / drag** — Anywhere on the Capture page while in Session mode, dropping a file or pasting a URL/text adds it to the tray.

## Out of scope
- A real browser extension (out of scope; we'll just expose a clean intake endpoint that an extension could call later).
- Recurring/scheduled captures (defer to a future task).
- Replacing the 7-agent pipeline visualization itself.
- Backend rewrites of the capture pipeline; reuse existing endpoints where possible and only add new endpoints when needed (OCR, dedup-check, suggest-destination, session record).

## Steps
1. **Batch URL paste flow** — Detect multiple URLs from a paste, render a confirmable list, and run them through the existing single-capture path one at a time with a progress indicator.
2. **Image source + OCR** — Add an "Image" source tab with drop/paste support, wire it to a new OCR endpoint on the backend (use a sensible Python OCR library or LLM vision call), store the extracted text as the capture body and the image as the thumbnail.
3. **Pre-save duplicate check** — Add a backend endpoint that, given a URL or content fingerprint, returns matching memories. Call it from the Capture page before showing the save button and surface the inline warning.
4. **AI-suggested destination + capture templates** — Add a "suggest folder" backend call (reuse the auto-tag / capture-agent context). Build a small templates menu in the UI with starter templates and a "save current as template" action (persist to localStorage; backend persistence is fine but not required).
5. **Multi-Source tray overhaul** — Make tray items reorderable and editable, persist the tray to localStorage so it survives navigation, and show per-item controls clearly.
6. **AI bundle overview + multi-name suggestions + Session record** — When 2+ items exist, call the backend for a bundle summary and 3 folder-name options. On save, write a single "research session" record linking all items, and surface it on the success screen with a "view session" link.
7. **Polish** — Add the metadata strip (read time, word count, language, guardian confidence) to the preview; quick-add via paste/drag while in Session mode; success/error toasts everywhere.

## Relevant files
- `src/pages/CapturePage.tsx`
- `src/pages/pages.css`
- `app/capture_agent.py`
- `app/coordinator.py`
- `main.py`
- `app/db.py`
