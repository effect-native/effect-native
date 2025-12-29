---
title: "Impl: Fire Event"
status: pending
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom-testing-library/src/events.ts
done_when: |
  fireEvent.keyDown works
  fireEvent.click works
---

# Impl: Fire Event

Port the `fireEvent` utilities.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/src/testing/events.ts`

## Tasks
1.  Port `events.ts`.
2.  Ensure key codes match what `EventRelay` expects.
