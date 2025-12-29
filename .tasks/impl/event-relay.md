---
title: "Impl: Event Relay"
status: pending
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/bridge/event-relay.ts
done_when: |
  Unit tests pass for event translation
  Focus navigation logic works
---

# Impl: Event Relay

Implement the `EventRelay` to translate TUI input to DOM events.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/event-relay.ts`
*   **Fixes:** Ensure fixes for Radio Groups (roving tabindex) and Accesskeys from `tui-dom-poc0` are included.

## Tasks
1.  Port `event-relay.ts`.
2.  Implement `activateFocusTrap` / `deactivateFocusTrap`.
3.  Implement `scrollIntoView` logic.
