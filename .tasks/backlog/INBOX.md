$WRAPPER_REPO/work/tui-browser/tui-dom-poc0

@effect-native/opentui-dom
@effect-native/opentui-dom-testing-library

@effect-native/opentui-base
@effect-native/opentui-components

@effect-native/tui-todomvc
@effect-native/tui-llm-debugger

**`@effect-native/opentui-dom`** (The Bridge)

- **Role:** The universal adapter between DOM and TUI.
- **Capabilities:**
- **DOM Adapter:** Abstracts `happy-dom` (fast/local) and `puppeteer` (real browser).
- **Style Bridge:** Maps computed CSS and Tailwind classes to TUI layouts (Yoga) and ANSI styling.
- **Event Relay:** Translates TUI keyboard events into DOM events (`click`, `input`, `focus`, `keydown`) respecting VT-HIG and WAI-ARIA.
- **Theme Map:** Automatically maps shadcn CSS variables to terminal-compatible ANSI colors.

**`@effect-native/opentui-testing-library`** (The Quality Gate)

- **Role:** Testing infrastructure.
- **Capabilities:**
- Implements the standard `@testing-library` API (`render`, `screen`, `fireEvent`).
- Allows writing **one test suite** that verifies behavior in both DOM (headless) and TUI (visual).
- Includes PTY-based screenshot testing for visual verification.
