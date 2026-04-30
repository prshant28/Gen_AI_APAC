---
title: Match the floating voice button's panel to the new slim Voice mode style
---
# Match the floating voice button's panel to the new slim Voice mode style

  ## What & Why
  We slimmed down only the inline Voice mode panel inside Agent Hub. The floating "talk live" panel that opens from the global LiveButton (visible on most other pages via LivePanel in src/components/LiveChatPanel.tsx, lines 30-405) still uses the older heavy treatment: bright gradient header, "Live Voice with Brain" title, large icon block, redundant text input, brighter mic/cam/screen buttons. The two panels now feel like they're from different products.

  ## Done looks like
  - Floating LivePanel header reduced to the same status-dot + "Voice mode" + Start/End row pattern
  - Redundant text-input row removed (the floating panel can keep its own input only if there's a clear reason — by default, drop it)
  - Mic/camera/screen controls use the quiet neutral surface
  - Manual check that the panel still ends the session cleanly when closed (same teardown bug we fixed for inline applies here)

  ## Relevant files
  - `src/components/LiveChatPanel.tsx` (floating LivePanel at lines 30–405; mirror the LiveInline rewrite from lines 460+)
  - `src/components/LiveButton.tsx` (host of the floating panel — verify open/close still wires correctly)