---
title: "Impl: Style Bridge"
status: pending
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/bridge/style-bridge.ts
  - path: packages-native/opentui-dom/src/bridge/tailwind-mapper.ts
done_when: |
  Unit tests pass for style extraction
  Tailwind classes map to TUI props
---

# Impl: Style Bridge

Implement the `StyleBridge` and `tailwind-mapper`.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/style-bridge.ts`
*   **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/tailwind-mapper.ts`
*   **Research:** `work/tui-browser/tui-dom-poc0/.research/css-mapping/tailwind-mapping-notes.md`

## Tasks
1.  Port `tailwind-mapper.ts` (80/20 rule for classes).
2.  Port `style-bridge.ts` (Class extraction, data-attribute overrides).
