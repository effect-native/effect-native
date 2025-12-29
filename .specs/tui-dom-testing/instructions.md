# Instructions: TUI DOM Testing Library

## Context
We are extracting the testing infrastructure from the `tui-dom-poc0` proof-of-concept into a standalone package: `@effect-native/opentui-dom-testing-library`.

Currently, testing TUI applications often involves manually inspecting terminal output or writing fragile integration tests. We have proven in the POC that we can use `happy-dom` to simulate the DOM and `opentui` to render it, allowing us to apply the standard "Testing Library" philosophy to TUI development.

This package will allow developers to write tests that resemble how users interact with the TUI (keyboard navigation, reading text) rather than testing implementation details.

## User Story
As a TUI application developer, I want to write tests using the familiar `@testing-library` API (`render`, `screen`, `fireEvent`, `waitFor`), so that I can verify my application's behavior and accessibility without learning a proprietary TUI testing framework.

## High-Level Goals
1.  **Package Extraction**: Extract the testing logic from `tui-dom-poc0/src/testing/` into `@effect-native/opentui-dom-testing-library`.
2.  **Core API**: Implement the standard Testing Library API surface:
    *   `render(element)`: Mounts a React component into the TUI/DOM bridge.
    *   `screen`: Global convenience object for queries.
    *   `fireEvent`: Simulates user interaction (translating "click" to Enter key, "type" to keystrokes, etc.).
    *   `waitFor` / `act`: Handles async state updates and rendering cycles.
3.  **Queries**: Implement standard queries targeting the TUI context:
    *   `getByText` / `findByText`
    *   `getByRole` (mapping ARIA roles to TUI elements)
    *   `getByTestId`
4.  **Visual Verification**: Include the PTY-based screenshot utility (`pty-screenshot.ts`) to allow "visual" assertions against real terminal output (e.g., verifying layout and ANSI styling).
5.  **Environment Agnostic**: Ensure the library works primarily with `happy-dom` (fast, headless) but is architected to support `puppeteer` (true E2E) via the `DOMAdapter` pattern if needed.

## Out of Scope
*   Testing non-React TUI applications (this library is specifically for the `opentui-dom` React bridge).
*   Browser-based visual regression testing (we focus on Terminal visual regression).
*   Re-implementing `happy-dom` or `opentui` internals (we wrap them).
