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

read
@work/effect-native/effect-native/.tasks/AGENTS.md
@work/effect-native/effect-native/.specs/AGENTS.md

then create and wire up the necessary blockers and subtasks and such necessary to complete GOAL-tui-dom and update GOAL-tui-dom.md

## files in work/tui-browser/tui-dom-poc0

While `packages/opentui-dom` contains the implementation code, the R-STATE contains critical context, specifications, research, and integration tests located outside that directory. Ignoring these files would result in a package that lacks defined requirements, misses known edge cases, and fails to integrate with the broader ecosystem.

Here are specific file paths outside of `packages/opentui-dom` that provide essential value:

### 1. Specifications and Requirements
These files define *what* the package must do. Without them, the implementation lacks success criteria.
*   **`work/work/tui-browser/tui-dom-poc0/.tasks/GOAL-400-opentui-dom.md`**
    *   **Value:** Defines the high-level vision, architecture, API surface, and success criteria for the package. It explicitly lists the subtasks required to consider the package complete.
*   **`work/work/tui-browser/tui-dom-poc0/.tasks/spec/opentui-dom-adapter.md`**
    *   **Value:** Contains the TDD specification for the `DOMAdapter` interface, including error handling types and the locator pattern (`ElementRef`) requirements which are not yet fully visible in the implementation code.

### 2. Research and Architecture
These files explain *why* specific technical decisions were made, preventing the re-discovery of solved problems.
*   **`work/work/tui-browser/tui-dom-poc0/.research/opentui-dom/adapter-interface.md`**
    *   **Value:** Details the design of the Effect-based API and the abstraction strategy for handling both synchronous (Happy-DOM) and asynchronous (Puppeteer) environments.
*   **`work/work/tui-browser/tui-dom-poc0/.research/dom-sync-patterns.md`**
    *   **Value:** Analyzes the differences between MutationObserver (Happy-DOM) and CDP events (Puppeteer), providing the logic behind the `MutationStream` interface design used in `opentui-dom`.
*   **`work/work/tui-browser/tui-dom-poc0/.research/happy-dom/api-inventory.md`**
    *   **Value:** Validates which DOM APIs are actually supported by the underlying engine, ensuring `opentui-dom` doesn't rely on unimplemented features.

### 3. Integration Proofs (Consumer Context)
The `opentui-dom` package is a library; these files represent the *consumers* of that library. They validate that the package solves real-world problems.
*   **`work/work/tui-browser/tui-dom-poc0/poc/form-demo.tsx`**
    *   **Value:** The "Capstone" demo. It validates that the `EventRelay` and `NodeMap` (components of `opentui-dom`) correctly handle complex interactions like focus trapping, radio groups, and scrolling in a real React application.
*   **`work/work/tui-browser/tui-dom-poc0/poc/todomvc/run-tui.ts`**
    *   **Value:** Demonstrates the initialization pattern for the runtime. It shows how `createEventRelay` and `createNodeMap` are instantiated and attached in a production-like CLI entry point.
*   **`work/work/tui-browser/tui-dom-poc0/poc/shadcn/button-demo.tsx`**
    *   **Value:** Validates the `style-bridge` and `tailwind-mapper` logic by showing how specific Tailwind classes (like `bg-primary`) must map to visual TUI outputs.

### 4. Legacy/Reference Implementation
The `src/` directory contains the original code that is being extracted. It holds edge-case handling that might be missed during a rewrite.
*   **`work/work/tui-browser/tui-dom-poc0/src/bridge/event-relay.ts`**
    *   **Value:** Contains specific fixes for radio group navigation (roving tabindex) and accesskey handling that were debugged in previous goals (GOAL-230, GOAL-240). Ignoring this risks regressing on known bugs.
*   **`work/work/tui-browser/tui-dom-poc0/src/bridge/style-bridge.ts`**
    *   **Value:** Contains the logic for mapping CSS variables (like `--background`) to hex codes, which is critical for supporting shadcn themes.

### 5. Testing Infrastructure
*   **`work/work/tui-browser/tui-dom-poc0/src/testing/pty-screenshot.ts`**
    *   **Value:** `opentui-dom` relies on visual verification. This utility allows the package to be tested against real PTY output, ensuring the DOM-to-TUI mapping produces the correct visual result.

The actual implementation, specifications, and design patterns for the testing library currently reside in the root `src/testing/` directory and various documentation folders. Ignoring these would result in rewriting the entire testing library from scratch rather than migrating the existing, working code.

Here are the relevant files outside of `packages/opentui-dom` and their specific value:

### 1. Core Implementation (Critical)
These files contain the actual source code for the testing library that needs to be moved into the new package.

*   **`src/testing/index.ts`**
    *   **Value:** The main entry point exporting `render`, `screen`, `fireEvent`, and queries. It defines the public API surface of the library.
*   **`src/testing/render.ts`**
    *   **Value:** Contains the `render()` implementation that binds React, Happy-DOM, and the OpenTUI renderer together for testing.
*   **`src/testing/events.ts`**
    *   **Value:** Contains the `fireEvent` implementation which translates high-level user actions (like `click` or `type`) into the specific DOM events that the TUI bridge expects.
*   **`src/testing/queries.ts`** (and `src/testing/queries/*.ts`)
    *   **Value:** Implements the `@testing-library` query variants (`getBy`, `queryBy`, `findBy`) and types (`Text`, `Role`, `TestId`).
*   **`src/testing/async.ts`**
    *   **Value:** Implements `waitFor`, `waitForElementToBeRemoved`, and `act` which are essential for testing async TUI updates.
*   **`src/testing/screen.ts`**
    *   **Value:** Implements the global `screen` convenience object.

### 2. Specifications & TDD Context
These files define the expected behavior and API contract.

*   **`.tasks/GOAL-310-opentui-testing-library.md`**
    *   **Value:** The master definition for the library. It outlines the architecture, API surface, and success criteria.
*   **`.tasks/spec/testing-lib-render.md`**
    *   **Value:** Defines the contract for the `render()` function and cleanup.
*   **`.tasks/spec/testing-lib-queries.md`**
    *   **Value:** Defines the hierarchy and behavior of query functions.
*   **`.tasks/spec/testing-lib-events.md`**
    *   **Value:** Defines how `fireEvent` should simulate user interaction in a TUI context.
*   **`.tasks/spec/testing-lib-async.md`**
    *   **Value:** Defines the timing and polling behavior for async utilities.

### 3. Research & Design Patterns
These files explain *why* the code is written the way it is.

*   **`.research/testing-library/patterns.md`**
    *   **Value:** Analysis of `@testing-library/dom` patterns that were adapted for this project. Crucial for maintaining API compatibility/familiarity.
*   **`.research/opentui/testing-api-notes.md`**
    *   **Value:** Documentation on OpenTUI's internal testing capabilities (`createTestRenderer`, `mockInput`), which the new library wraps or interacts with.

### 4. Usage Examples (Integration Tests)
These files demonstrate how the library is currently used in practice.

*   **`poc/todomvc/todomvc.test.tsx`**
    *   **Value:** A comprehensive "real world" test suite using the library. It validates that `render`, `screen.getByRole`, and `fireEvent` work together to test a complex React component.
*   **`src/bridge/text-input.test.ts`**
    *   **Value:** Demonstrates testing interactive input components, validating the `fireEvent` logic for keystrokes.

### 5. PTY/Visual Verification (Advanced Testing)
*   **`src/testing/pty-screenshot.ts`**
    *   **Value:** Implements real PTY capture. While the DOM testing library focuses on logical assertions, this file contains the logic for "Visual Verification" (GOAL-270), which is often a companion to the logical testing library.
*   **`src/testing/ansi-parser.ts`**
    *   **Value:** Logic to parse ANSI output from the terminal, required if the testing library supports assertions on the rendered visual output (e.g., `expect(screen).toMatchVisualSnapshot()`).
