---
title: "Impl: Theme Map"
status: pending
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/bridge/theme-map.ts
done_when: |
  Unit tests pass for color conversion
  Can resolve shadcn CSS vars to hex
---

# Impl: Theme Map

Implement the `ThemeMap` for resolving shadcn CSS variables.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/theme-map.ts`

## Tasks
1.  Port `theme-map.ts`.
2.  Ensure `oklch` to `hex` conversion works.
3.  Implement `lightTheme` and `darkTheme` defaults.
