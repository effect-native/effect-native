---
title: TUI DOM
status: ready_for_review
done_when: |
  Tom has created a new custom standalone miniapp.html
  Tom has run it with `pnpm run tui-dom miniapp.html`
  Tom has navigated to all elements with both keyboard and mouse
  Tom confirmed that all the form elements, dialogs, buttons, and all standard html controls work as expected
  Tom verified that everything in the miniapp.html is accessible regardless of the reasonable size of the terminal viewport
  Tom verified that the tailwind classes he used are respected
  Tom verified that the positioning and layout work as expected
blocked_by:
  # Implementation (complete)
  - .tasks/GOAL-opentui-dom-package.md
  - .tasks/GOAL-tui-testing-lib.md
  - .tasks/GOAL-opentui-dom-testing-lib.md
  - .tasks/GOAL-tui-miniapp.md
  # QA (pending - assigned to Bramwell)
  - .tasks/qa/opentui-dom-package.md
  - .tasks/qa/tui-testing-library-package.md
  - .tasks/qa/opentui-dom-testing-library-package.md
  - .tasks/qa/miniapp-interactive.md
  - .tasks/qa/miniapp-visual-layout.md
  - .tasks/qa/miniapp-accessibility.md
basis: |
  Implementation complete:
  - GOAL-opentui-dom-package.md: 182 tests (25+57+37+44+19)
  - GOAL-tui-testing-lib.md: 55 tests (18+16+21)
  - GOAL-opentui-dom-testing-lib.md: 76 tests (50+26)
  - GOAL-tui-miniapp.md: 12 integration tests
  
  Packages created:
  - packages-native/opentui-dom
  - packages-native/tui-testing-library  
  - packages-native/opentui-dom-testing-library
  
  Awaiting QA from Bramwell (6 QA tasks in .tasks/qa/)
artifacts:
  - path: .specs/tui-dom/instructions.md
  - path: .specs/tui-dom/requirements.md
  - path: .specs/tui-dom/design.md
  - path: .specs/tui-dom/plan.md
  - path: .specs/tui-dom-testing/instructions.md
  - path: .specs/tui-dom-testing/requirements.md
  - path: .specs/tui-dom-testing/design.md
  - path: .specs/tui-dom-testing/plan.md
  - description: tui-dom script
    path: package.json
  - description: "@effect-native/opentui-dom package"
    path: packages-native/opentui-dom
  - description: "@effect-native/opentui-dom-testing-library package"
    path: packages-native/opentui-dom-testing-library
---

# Goal: TUI DOM

Enable developers to build TUI applications using standard Web technologies: HTML, CSS (Tailwind), and React components (specifically shadcn/ui).

This goal orchestrates the extraction of the `tui-dom-poc0` proof-of-concept into production-ready packages within the `effect-native` repository.

## Sub-Goals

1.  **`@effect-native/opentui-dom`**: The core bridge package.
2.  **`@effect-native/tui-testing-library`**: Low-level PTY testing infrastructure.
3.  **`@effect-native/opentui-dom-testing-library`**: High-level DOM testing wrapper.
4.  **Miniapp Validation**: A standalone demo app proving the stack works.
