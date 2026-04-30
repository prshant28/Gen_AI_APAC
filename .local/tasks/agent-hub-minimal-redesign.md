# Agent Hub Minimal Redesign

## What & Why
The Agent Hub page is overwhelming. Users land on a wall of cards — Mission Control with latency / success-rate / tokens, Live Agent Pipeline visualizer, Workflow Templates grid, Live Voice & Video card, an Agent Registry sidebar with tier filters and exposed model names (`gemini-2.0-flash`), a Tool Call Inspector, a History panel and a duplicate "Chats" pill at the bottom. It looks like an engineering dashboard, not a premium AI assistant, and a regular user has no idea what to do.

Strip it down to a clean, conversation-first experience (think ChatGPT / Claude calmness, not "command center"), and remove all places across the app where the underlying AI provider / model / transport ("Powered by Google Gemini 2.0 · Multi-agent · Real-time SSE", `gemini-2.0-flash`, "Gemini Live", "OpenAI Whisper", etc.) leaks into the UI for end users. The user's brand language ("Neural AI", "Recall X247", agent role labels like "RecallAgent") stays — only third-party API and model names go.

## Done looks like
- Opening the Agent Hub feels calm and obvious: a clear header, a friendly welcome / suggestion area, a chat thread, and an input box. No metric cards, no pipeline visualizer card, no tool inspector, no model names, no acronyms (SSE, API, etc.) visible.
- New users immediately understand "this is where I talk to my AI assistant" without having to read any explanation.
- A single, obvious place to access past chats (no duplicate "Chats" entry points).
- During an active reply, progress is shown subtly inline with the assistant message (e.g. a quiet "Thinking…" / step ticker), not as a giant separate visualizer card above the chat.
- The Live Voice / Video capability is reachable from one small, unobtrusive control in the input area (mic / video icon) rather than as its own large collapsible card.
- Workflow templates are reduced to a small set of suggestion chips that appear only in the empty state and disappear once the conversation begins.
- Nowhere in the user-facing app does the UI mention "Gemini", "GPT", "OpenAI", "Whisper", "Anthropic", "Claude", "SSE", "WebSocket", or specific model identifiers. Settings page (where the user pastes their own API keys) is the only place these terms are allowed, because the user is configuring those keys themselves.
- Page passes a "show this to a non-technical friend" test: they can tell what the app does and how to use it within a few seconds.

## Out of scope
- Backend / agent orchestration logic. This is purely a UI / IA cleanup — the same agents, the same streaming, the same tools keep working underneath.
- Removing capabilities. Voice, history, templates, agent step details all stay accessible — they're just demoted from huge cards to subtle controls / inline elements.
- Marketing copy on the public Landing page (`src/pages/Landing.tsx`). That page is a sales page where listing models can be appropriate. Only touch Landing if a model name appears in a way that's clearly user-confusing inside the product itself; otherwise leave Landing alone.
- The Settings page sections that exist specifically to configure third-party API keys (`Google Gemini Key`, `OpenAI / Fallback Key` rows). Those rows must keep their real names so the user knows which key they're pasting.
- Any visual redesign of other top-level pages (Capture, Tasks, Calendar, etc.). Only the small "Powered by …" / model-name leaks inside them are touched.

## Steps
1. **Redesign Agent Hub layout to conversation-first.** Rebuild `src/pages/AgentPage.tsx` so the page is essentially: compact header (title + small status dot + New chat + History buttons) → conversation area (welcome state with a short, plain-English intro and 3–4 suggestion chips, or the message thread once a conversation starts) → input box with inline mic / live-mode control. Remove the Mission Control stats strip, the standalone Live Agent Pipeline card, the standalone Live Voice & Video card, the right-hand sidebar with Agents / History / Inspector tabs, the Quick Access link list, and the bottom "Powered by …" / tokens / calls footer. Keep all underlying state and streaming logic — only the rendering changes.

2. **Make agent activity feel calm and inline.** When the assistant is replying, replace the big pipeline card with a subtle inline indicator inside the in-progress assistant bubble (e.g. a small "Thinking · CaptureAgent → RecallAgent" line that updates as steps complete). After completion, keep the existing step / action-result cards inside that message bubble so power users still see what happened, but no separate top-of-page visualizer.

3. **Single, simple history.** Replace the sidebar History tab + the bottom "Chats" pill with one History button in the header that opens a slide-in / dropdown panel listing past chats (title, time, message count, delete). Use the existing session storage code as-is. Remove the "Workflows" sub-tab and the Tool Call Inspector entirely from the user-facing UI.

4. **Demote workflow templates and voice.** Show the existing 6 workflow templates as small horizontal suggestion chips inside the empty state only (one row, plain labels, no agent-tag badges, no model colors). Hide them as soon as the user sends a first message. Move Live Voice / Video access to a single icon button next to the mic / send buttons in the input bar; clicking it expands the existing `LiveInlineGate` inline below the input (or in a small modal) without dominating the page.

5. **Strip third-party API and model names from in-product UI.** Remove or rename every user-facing string across the app that exposes the underlying provider, model id, or transport. Specifically: the "Powered by Google Gemini 2.0 · Multi-agent · Real-time SSE" footer in Agent Hub; the per-agent `model: 'gemini-2.0-flash'` / `gemini-embed` chips shown when an agent is expanded in the registry (the registry itself is being removed in step 1, but if any agent metadata surfaces elsewhere it must not show model ids); the "Connected · Gemini Live" status text and the "Gemini Live API key not configured" empty-state in `src/components/LiveChatPanel.tsx`; the "Gemini 2.0 + GPT" / "Multi-model engine" row in `src/pages/DeckPage.tsx`; the "Powered by RecallAgent" / "Powered by Neural AI" style taglines on `src/pages/MemoryDetailPage.tsx` and `src/pages/RecallPage.tsx` (keep neutral copy like "Searches X memories"); and any other in-product mention of Gemini / GPT / OpenAI / Whisper / Anthropic / Claude / SSE / WebSocket. Replace with neutral, brand-safe phrasing (e.g. "Voice ready", "Voice mode unavailable", "AI engine"). Leave the public Landing page and the Settings → API Keys rows alone (see Out of scope).

6. **Rewrite the welcome message and any tooltips/labels in plain language.** The current welcome message ("Hello! I'm the Neural AI Orchestrator — your central command for the 7-agent AI system…") is jargon-heavy. Replace with a short, human greeting that tells the user in 2–3 lines what they can do here ("Ask me to plan your day, find something you saved, capture a link, or schedule study time."), followed by the suggestion chips. Also audit button titles / aria-labels on the page for jargon ("Stop the active stream", "clears AI memory of this session", etc.) and rephrase in everyday language.

7. **Tighten the visual style to feel premium.** Reduce the number of accent gradients, glow shadows, and color-coded badges on the page. Use a consistent, restrained palette (one primary accent, neutral surfaces, generous whitespace). Make sure the page is readable and uncluttered on a 1280-wide screen and gracefully collapses on mobile (input pinned, chips wrap, history opens as a full-screen sheet). After the redesign, sanity-check via the running preview that the page renders cleanly with no layout overflow, the existing CSS classes used elsewhere (`agent-hub-v2`, `agent-body-grid`, `agent-main`, `agent-sidebar` in `src/pages/pages.css:3112+`) are either kept tidy or pruned of now-unused rules.

## Relevant files
- `src/pages/AgentPage.tsx`
- `src/pages/pages.css:3112-3406`
- `src/components/LiveChatPanel.tsx:230-240,640-650,785-795`
- `src/components/AgentPipeline.tsx`
- `src/components/ActionResultCards.tsx`
- `src/components/MarkdownMessage.tsx`
- `src/components/MessageToolbar.tsx`
- `src/pages/RecallPage.tsx:618-625`
- `src/pages/MemoryDetailPage.tsx:500-512`
- `src/pages/DeckPage.tsx:80-95`
- `src/pages/SettingsPage.tsx:100-200`
- `src/lib/types.ts`
