---
title: "Validation: TUI Miniapp"
status: pending
blocked_by:
  - .tasks/GOAL-opentui-dom-package.md
  - .tasks/impl/miniapp-implementation.md
artifacts:
  - path: miniapp.html
  - path: miniapp.tsx
done_when: |
  pnpm run tui-dom miniapp.html launches the app
  App is interactive and styled correctly
---

# Goal: TUI Miniapp Validation

Create a standalone `miniapp.html` that uses the extracted packages to render a functional application in the terminal.

## Context
*   **POC:** `work/tui-browser/tui-dom-poc0/poc/form-demo.tsx` (The Capstone demo)
*   **Requirements:** `work/effect-native/effect-native/.specs/tui-dom/requirements.md`

## Scope
*   Mouse and keyboard navigation.
*   Form elements, dialogs, buttons.
*   Tailwind styling.
