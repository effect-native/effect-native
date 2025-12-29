---
title: "Impl: Core Bridge (DOMToTUI)"
status: pending
blocked_by:
  - .tasks/impl/dom-adapter.md
  - .tasks/impl/style-bridge.md
artifacts:
  - path: packages-native/opentui-dom/src/bridge/node-map.ts
  - path: packages-native/opentui-dom/src/tui-renderer.ts
done_when: |
  Unit tests pass for mutation handling
  DOM changes trigger TUI updates
---

# Impl: Core Bridge

Implement `NodeMap` and the main `DOMToTUIBridge` class.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/node-map.ts`
*   **Source:** `work/tui-browser/tui-dom-poc0/src/tui-renderer.ts` (Logic needs extraction)

## Tasks
1.  Port `node-map.ts` (WeakMap implementation).
2.  Implement `DOMToTUIBridge` class (MutationObserver loop).
3.  Wire up `StyleBridge` for attribute mutations.
