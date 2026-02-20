---
title: "Validation: TUI Miniapp"
status: complete
blocked_by:
  - .tasks/GOAL-opentui-dom-package.md
  - .tasks/impl/miniapp-implementation.md
artifacts:
  - path: packages-native/opentui-dom/poc/miniapp.html
  - path: packages-native/opentui-dom/poc/miniapp.tsx
done_when: |
  pnpm run tui-dom miniapp.html launches the app
  App is interactive and styled correctly
basis: |
  All dependencies complete:
  - GOAL-opentui-dom-package.md: complete
  - miniapp-implementation.md: complete with 12 integration tests
  Miniapp at packages-native/opentui-dom/poc/miniapp.tsx
  Run with: cd packages-native/opentui-dom && pnpm tui-dom
---

# Goal: TUI Miniapp Validation

Create a standalone `miniapp.html` that uses the extracted packages to render a functional application in the terminal.

## Context

- **POC:** `work/tui-browser/tui-dom-poc0/poc/form-demo.tsx` (The Capstone demo)
- **Requirements:** `work/effect-native/effect-native/.specs/tui-dom/requirements.md`

## Scope

- Mouse and keyboard navigation.
- Form elements, dialogs, buttons.
- Tailwind styling.
