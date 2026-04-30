---
title: Slim down the Live voice panel to match the new minimal style
---
# Slim down the Live voice panel to match the new minimal style

  ## What & Why
  The Agent Hub now opens the inline live-voice panel via a small radio icon next to the input — but the panel itself (`LiveInline` in `src/components/LiveChatPanel.tsx`) still has the older "command center" vibe: bright gradient header, three control buttons (mic / camera / screen share), plus an internal text input that overlaps the main chat input directly above it. That's confusing now that the parent input handles text and the voice panel only needs to handle voice.

  A focused tidy-up — drop the redundant text input inside the live panel, simplify the header to a single status row + start/stop button, and let the controls inherit the page's quieter palette — would make the experience feel like one cohesive surface instead of two stacked chat UIs.

  ## Done looks like
  - The inline live panel inside Agent Hub no longer has its own text input (text already lives in the main chat input).
  - The panel header is reduced to: small status dot, "Voice mode" label, and a single Start/End button.
  - Controls (mic/camera/screen) are quieter — neutral surface colors, smaller icons, no large gradient block.
  - The floating `LiveButton` / `LivePanel` variant used outside Agent Hub is unaffected (or polished separately).

  ## Relevant files
  - `src/components/LiveChatPanel.tsx` (LiveInline + LiveInlineGate)
  - `src/pages/AgentPage.tsx` (where LiveInlineGate is mounted)