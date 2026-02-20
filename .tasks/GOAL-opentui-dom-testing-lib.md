---
title: "Package: @effect-native/opentui-dom-testing-library"
status: complete
blocked_by:
  - .tasks/GOAL-opentui-dom-package.md
  - .tasks/GOAL-tui-testing-lib.md
  - .tasks/impl/render-helper.md
  - .tasks/impl/fire-event.md
artifacts:
  - path: packages-native/opentui-dom-testing-library
    description: High-level DOM testing wrapper
done_when: |
  package builds successfully
  can render a React component to happy-dom
  can query elements via screen
  can fire events that simulate TUI input
basis: |
  All impl tasks and dependencies complete:
  - GOAL-opentui-dom-package.md: complete
  - GOAL-tui-testing-lib.md: complete
  - render-helper.md: 50 tests passing
  - fire-event.md: 26 tests passing
  Package provides render(), screen, fireEvent utilities
---

# Goal: Create `@effect-native/opentui-dom-testing-library`

Create a convenience wrapper for testing `opentui-dom` applications using standard `@testing-library` patterns.

## Context

- **Design:** `work/effect-native/effect-native/.specs/tui-dom-testing/design.md`
- **Source:** `work/tui-browser/tui-dom-poc0/src/testing/` (Existing implementation to port)

## Components

1. **Render Helper:** Mounts React, inits Bridge, returns `screen`.
2. **Fire Event:** Dispatches DOM events simulating TUI input.
