---
title: "Impl: DOM Adapter"
status: pending
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/adapter.ts
done_when: |
  Unit tests pass for DOMAdapter interface
  Happy-DOM implementation works
---

# Impl: DOM Adapter

Implement the `DOMAdapter` interface and the `HappyDOMAdapter` implementation.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/adapter.ts`
*   **Spec:** `work/tui-browser/tui-dom-poc0/.tasks/spec/opentui-dom-adapter.md`
*   **Design:** `work/effect-native/effect-native/.specs/tui-dom/design.md`

## Tasks
1.  Port `DOMAdapter` interface (Effect-based).
2.  Port `createTestAdapter` (Happy-DOM wrapper).
3.  Ensure `ElementRef` locator pattern is implemented.
