# Requirements: TUI DOM Testing

## 1. Functional Requirements (FR)

### Package: `@effect-native/tui-testing-library`

**Goal:** Framework-agnostic "Black Box" testing of CLI/TUI applications via PTY.

- **FR-1.1 (Process Spawning):** The System shall spawn a target application process attached to a pseudo-terminal (PTY) with configurable dimensions (rows/cols).
- **FR-1.2 (Screen Capture):** The System shall capture the raw standard output (stdout) stream from the PTY.
- **FR-1.3 (ANSI Parsing):** The System shall parse ANSI escape sequences (cursor movement, colors, styles, clear screen) to maintain an in-memory 2D grid representing the terminal screen state.
- **FR-1.4 (Input Simulation):** The System shall provide methods to send keystrokes, text strings, and control sequences (e.g., Ctrl+C) to the PTY's standard input (stdin).
- **FR-1.5 (Visual Assertions):** The System shall provide assertions to verify that specific text exists on the screen, optionally validating its style (color, bold) and position.
- **FR-1.6 (Stability):** The System shall provide `waitFor` utilities to await screen stability (no output for N ms) or specific text appearance before asserting.

### Package: `@effect-native/opentui-dom-testing-library`

**Goal:** "White Box" testing of React/DOM TUI applications using standard web testing patterns.

- **FR-2.1 (Environment):** The System shall use `happy-dom` as the exclusive DOM implementation for rendering and interaction.
- **FR-2.2 (Render Helper):** The `render` function shall mount a React component into a `happy-dom` document and initialize the `opentui-dom` bridge (NodeMap, EventRelay) in-memory.
- **FR-2.3 (Queries):** The System shall export standard `@testing-library` queries (`getByText`, `getByRole`, `findBy*`) bound to the rendered `happy-dom` container.
- **FR-2.4 (Event Simulation):** The `fireEvent` utility shall dispatch DOM events (e.g., `keydown`, `click`, `focus`) that accurately mimic how the `opentui-dom` EventRelay translates terminal input.
- **FR-2.5 (Async Handling):** The `waitFor` utility shall handle the asynchronous nature of `happy-dom`'s MutationObserver batching to ensure assertions run after DOM updates are processed.
- **FR-2.6 (Cleanup):** The `cleanup` function shall unmount the React tree and dispose of the `happy-dom` window and `opentui` renderer to prevent memory leaks.

## 2. Non-Functional Requirements (NFR)

- **NFR-1 (Performance):** The `opentui-dom-testing-library` tests shall run in-process without spawning external binaries (unlike the PTY library), ensuring fast execution for unit tests.
- **NFR-2 (API Compatibility):** The API surface shall match `@testing-library/react` as closely as possible to reduce the learning curve for React developers.

## 3. Constraints

- **C-1 (Virtual DOM Only):** The System shall **only** support `happy-dom` (or similar synchronous virtual DOMs). Support for asynchronous remote DOMs (like Puppeteer/CDP) is an **explicit non-goal**.
- **C-2 (Platform):** The PTY functionality relies on Bun's native `Bun.spawn({ terminal: ... })` API and is constrained to platforms supported by Bun.
