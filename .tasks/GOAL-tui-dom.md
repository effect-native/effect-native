---
title: TUI DOM
status: planning
done_when: |
  Tom has created a new custom standalone miniapp.html
  Tom has run it with `pnpm run tui-dom miniapp.html`
  Tom has navigated to all elements with both keyboard and mouse
  Tom confirmed that all the form elements, dialogs, buttons, and all standard html controls work as expected
  Tom verified that everything in the miniapp.html is accessible regardless of the reasonable size of the terminal viewport
  Tom verified that the tailwind classes he used are respected
  Tom verified that the positioning and layout work as expected
  
blocked_by:
artifacts:
  - description: tui-dom script
    path: package.json
  - description: "@effect-native/opentui-dom package"
    path: packages-native/opentui-dom
  - description: "@effect-native/opentui-dom-testing-library package"
    path: packages-native/opentui-dom-testing-library
---

TUI apps use low level VT (Virtual Terminal) standards with byte streams for rendering and input.

opentui by sst is a higher level framework for building TUI apps by composing ui components.

@effect-native/opentui-dom shall be a bridge between opentui and any dom implementation.
*   **DOM Adapter:** Abstracts `happy-dom` (fast/local) and `puppeteer` (real browser).
*   **Style Bridge:** Maps computed CSS and Tailwind classes to TUI layouts (Yoga) and ANSI styling.
*   **Event Relay:** Translates TUI keyboard events into DOM events (`click`, `input`, `focus`, `keydown`) respecting VT-HIG and WAI-ARIA.
*   **Theme Map:** Automatically maps shadcn CSS variables to terminal-compatible ANSI colors.

@effect-native/opentui-dom-testing-library
*   Implements the standard `@testing-library` API (`render`, `screen`, `fireEvent`).
*   Allows writing **one test suite** that verifies behavior in both DOM (headless) and TUI (visual).
*   Includes PTY-based screenshot testing for visual verification.

---

# Extract packages & tests

The R&D phase is complete. See the work/tui-browser/tui-dom-poc0 project for all the details.

Now it's time to bring that stuff from the tui-dom-poc0 project into the effect-native repo and organize it all properly.
