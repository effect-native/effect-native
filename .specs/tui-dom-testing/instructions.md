# Instructions: TUI DOM Testing Library

## Context
We are creating a testing infrastructure for TUI applications built with `@effect-native/opentui-dom`. Just as `@testing-library/dom` provides the foundation for testing web applications regardless of framework, we need a core library that allows testing TUI applications whether they are built with React, SolidJS, or vanilla HTML/JS.

Currently, our POC mixes React-specific rendering logic with generic DOM queries. We need to extract the framework-agnostic core into `@effect-native/opentui-dom-testing-library`.

## User Story
As a TUI application developer (using any framework), I want to write tests that interact with my app the way a user does—by finding text/content and simulating keyboard input—so that I can have confidence in my application's behavior without relying on implementation details.

## High-Level Goals
1.  **Framework-Agnostic Core**: Create `@effect-native/opentui-dom-testing-library` as the equivalent of `@testing-library/dom`.
    *   **Queries**: Implement standard queries (`getByText`, `getByRole`, `getByTestId`) that work against the DOM/Renderable tree.
    *   **Events**: Implement `fireEvent` to simulate TUI-specific user interactions (mapping high-level actions like "click" to TUI keyboard events like "Enter").
    *   **Async Utilities**: Provide `waitFor`, `findBy*`, and `waitForElementToBeRemoved` to handle async TUI rendering cycles.
    *   **Visual Verification**: Include utilities for PTY-based screenshot assertions (verifying actual terminal output, colors, and layout).

2.  **Architecture Separation**: Ensure the core library does *not* depend on React or any specific UI framework.
    *   It should operate on the `document` or `Renderable` tree provided by the runtime.
    *   It should support different DOM adapters (Happy-DOM, Puppeteer).

3.  **Framework Wrappers (Planning)**:
    *   Identify the need for `@effect-native/opentui-dom-react-testing-library` (equivalent to `@testing-library/react`) to handle component mounting/unmounting.
    *   Ensure the core library exposes the necessary hooks for these wrappers to be built.

## Out of Scope
*   Implementing the React-specific `render(<Component />)` function in the *core* package (this belongs in a React-specific package).
*   Testing internal state of frameworks (we test the DOM/TUI output, not the component state).
