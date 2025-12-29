# Instructions: TUI DOM Testing Libraries

## Context
To support the `tui-dom` ecosystem, we need a robust testing infrastructure that mirrors the standard web development experience. Developers rely on the `@testing-library` family of packages to write maintainable, user-centric tests. We will replicate this architecture for TUI applications, splitting the logic into a core DOM library and a React-specific wrapper.

This infrastructure allows developers to test TUI applications in a headless environment (using `happy-dom`) while retaining the ability to verify visual output via PTY screenshots.

## User Story
As a TUI application developer, I want to write tests using familiar API patterns (`render`, `screen`, `fireEvent`, `waitFor`) so that I can verify my application's logic and accessibility without learning a completely new testing paradigm.

## High-Level Goals

### 1. @effect-native/opentui-dom-testing-library
Create the core, framework-agnostic library (analogous to `@testing-library/dom`). This package interacts directly with the DOM nodes managed by `opentui-dom`.

*   **Queries**: Implement standard queries (`getByText`, `getByRole`, `getByTestId`, etc.) that work against the DOM but respect TUI visibility and semantics.
*   **Events**: Implement `fireEvent` to simulate TUI-specific interactions.
    *   *Note*: In TUI, "click" is often "Enter" or "Space". The library must bridge high-level intent to the correct keyboard events handled by `EventRelay`.
*   **Async Utilities**: Implement `waitFor`, `waitForElementToBeRemoved`, and `act` to handle the asynchronous nature of TUI rendering and `happy-dom` mutation batching.
*   **Visual Verification**: Include utilities for PTY-based screenshot capture and assertion (e.g., `expect(screen).toMatchVisualSnapshot()`) to verify the actual terminal output.

### 2. @effect-native/opentui-dom-react-testing-library
Create the React wrapper (analogous to `@testing-library/react`).

*   **Render**: Implement a `render(ui, options)` function that:
    *   Creates a `happy-dom` environment.
    *   Initializes the `opentui` renderer and `opentui-dom` bridge.
    *   Mounts the React component.
    *   Returns the core library's queries bound to the container.
*   **Lifecycle**: Handle automatic cleanup (unmounting, destroying renderers) after tests.
*   **Re-exports**: Re-export all queries and utilities from the core library for convenience.

## Out of Scope
*   Testing raw `opentui` renderables directly (tests should assert on the DOM state or the final visual output).
*   Browser-based visual regression (we focus on Terminal visual regression via PTY).
