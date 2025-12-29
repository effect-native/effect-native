---
title: "Package: @effect-native/opentui-dom"
status: pending
blocked_by:
  - .tasks/impl/dom-adapter.md
  - .tasks/impl/style-bridge.md
  - .tasks/impl/theme-map.md
  - .tasks/impl/event-relay.md
  - .tasks/impl/core-bridge.md
artifacts:
  - path: packages-native/opentui-dom
    description: The extracted bridge package
done_when: |
  package builds successfully
  all unit tests pass
  exports DOMAdapter, StyleBridge, EventRelay, DOMToTUIBridge
---

# Goal: Extract `@effect-native/opentui-dom`

Extract the core bridging logic from `tui-dom-poc0` into a standalone package.

## Context
*   **Source Code:** `work/tui-browser/tui-dom-poc0/src/bridge/` and `work/tui-browser/tui-dom-poc0/src/tui-renderer.ts`
*   **Design:** `work/effect-native/effect-native/.specs/tui-dom/design.md`
*   **Research:** `work/tui-browser/tui-dom-poc0/.research/opentui-dom/adapter-interface.md`

## Components
1.  **DOM Adapter:** Abstract over `happy-dom`.
2.  **Style Bridge:** Tailwind -> TUI mapping.
3.  **Theme Map:** CSS Vars -> ANSI colors.
4.  **Event Relay:** TUI Keypress -> DOM Event.
5.  **Core Bridge:** MutationObserver -> Renderable updates.
