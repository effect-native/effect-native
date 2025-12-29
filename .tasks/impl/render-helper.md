---
title: "Impl: Render Helper"
status: pending
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom-testing-library/src/render.ts
done_when: |
  render() function mounts React component
  Returns screen object
---

# Impl: Render Helper

Port the `render()` function from `tui-dom-poc0`.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/src/testing/render.ts`
*   **Source:** `work/tui-browser/tui-dom-poc0/src/testing/screen.ts`

## Tasks
1.  Port `render.ts`.
2.  Port `screen.ts`.
3.  Ensure it sets up `happy-dom` global environment correctly.
