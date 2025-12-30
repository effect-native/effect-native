# Instructions: TUI DOM Testing

## Context
Testing Terminal User Interfaces (TUIs) presents unique challenges. Developers need to verify two distinct aspects of their applications:
1.  **The Visual Output**: What the user actually sees in the terminal (ANSI escape sequences, colors, layout, cursor position).
2.  **The Application Logic**: The state and behavior of the underlying components (DOM structure, React state, event handling).

To address this, we are creating a layered testing ecosystem. We need a low-level library for verifying raw terminal output via PTY (Pseudo-Terminal) and a high-level library that bridges this with standard web testing patterns for our DOM-based TUI architecture.

## User Story
As a developer building TUI applications, I want to write tests that can verify my app's behavior at the terminal level (visual regression, interaction) and at the component level (DOM state), using familiar APIs like `@testing-library`.

## High-Level Goals

### 1. `@effect-native/tui-testing-library`
Create a framework-agnostic testing library for any CLI/TUI application.
*   **Core Technology**: Powered by Bun's native PTY support (`Bun.spawn({ terminal: ... })`).
*   **Capabilities**:
    *   Spawn processes in a real pseudo-terminal.
    *   Capture and parse raw ANSI output into a virtual screen buffer (2D grid of cells with style attributes).
    *   Send keystrokes and input to the running process.
    *   Provide assertions for visual state (e.g., `expect(screen).toContainText("Hello")`, check colors, verify cursor position).
*   **Independence**: This package must **not** depend on `opentui` or `react`. It should be usable for testing any TUI app (Rust, Go, Node, etc.).

### 2. `@effect-native/opentui-dom-testing-library`
Create a convenience wrapper specifically for testing applications built with `@effect-native/opentui-dom`.
*   **Dependencies**:
    *   `@effect-native/tui-testing-library` (for visual verification).
    *   `@testing-library/dom` and `@testing-library/react` (for component logic).
*   **Capabilities**:
    *   Export standard testing helpers: `render`, `screen`, `fireEvent`, `waitFor`.
    *   Bridge the gap between the "Virtual DOM" (happy-dom) and the "Visual Output" (PTY).
    *   Allow tests to assert against the DOM state (e.g., `getByRole('button')`) while verifying the resulting TUI output matches expectations.

## Out of Scope
*   Browser-based testing (Selenium/Playwright) - we are focused on terminal emulation.
*   Testing non-interactive CLI tools (stdout only) - while possible, the focus is on interactive TUIs.
