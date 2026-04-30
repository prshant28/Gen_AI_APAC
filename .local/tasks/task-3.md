---
title: Hide AI provider names from the rest of the app
---
# Hide AI provider names from the rest of the app

  ## What & Why
  The current task scrubbed provider/model leaks from the in-product surfaces (Agent Hub, Recall, Memory Detail, Deck, Capture, Live voice panel). A few user-facing places still mention specific AI vendors, which sits between marketing copy and product copy and could confuse some users:
  - The dashboard / power hub page may still surface "7 AI Agents · Multi-model engine" style chips that reference provider names.
  - The Capture page tags voice with neutral copy now, but tooltips and ingest descriptions across other pages may still reference Whisper / Gemini.
  - The Integrations page lists "OpenAI API" as a card — fine since it IS configuring OpenAI, but the description copy could be reviewed for tone consistency.

  A pass to audit every remaining string ('Gemini', 'GPT', 'OpenAI', 'Whisper', 'Anthropic', 'Claude', 'SSE', 'WebSocket') outside Landing and Settings → API Keys would finish the job and keep the product feeling brand-cohesive.

  ## Done looks like
  - A ripgrep for any of those provider terms across `src/` returns hits only in:
    - `src/pages/Landing.tsx` (marketing site)
    - `src/pages/SettingsPage.tsx` API key rows (where the user pastes the key)
    - `src/pages/IntegrationsPage.tsx` integration card titles
    - backend code under `src/agents/*.ts` and `src/lib/gemini.ts` (internal)
  - Every other in-product page reads cleanly without surfacing third-party brand names.

  ## Relevant files
  - `src/pages/DashboardPage.tsx`
  - `src/pages/IntegrationsPage.tsx`
  - `src/pages/CapturePage.tsx`
  - ripgrep starter: `rg -n "Gemini|Whisper|Anthropic|Claude|OpenAI|GPT" src/ --glob '!Landing.tsx' --glob '!SettingsPage.tsx'`