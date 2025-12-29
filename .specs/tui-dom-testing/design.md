# Design: TUI DOM Testing

## 1. Architecture Overview

The testing ecosystem consists of two distinct layers:
1.  **Visual Verification (`@effect-native/tui-testing-library`)**: A "Black Box" testing tool that spawns TUI processes in a real Pseudo-Terminal (PTY), captures their output, and verifies the visual result (text, colors, layout).
2.  **Logic Verification (Integration Pattern)**: A "White Box" pattern using existing tools (`@testing-library/react`, `happy-dom`) to test component logic and DOM state in-memory, without spawning processes.

This document focuses on the design of the **Visual Verification** layer, while defining the pattern for how it coexists with Logic Verification.

### System Diagram

```mermaid
graph TD
    subgraph "Visual Verification (Black Box)"
        Test[Test Runner] -->|Effect| TuiLib[@effect-native/tui-testing-library]
        TuiLib -->|Spawn PTY| AppProcess[Target App Process]
        AppProcess -->|Stdout (ANSI)| AnsiParser[ANSI Parser]
        AnsiParser -->|Update| VirtualScreen[Virtual Screen Buffer]
        TuiLib -->|Query| VirtualScreen
        TuiLib -->|Stdin (Input)| AppProcess
    end

    subgraph "Logic Verification (White Box)"
        UnitTest[Unit Test] -->|Render| ReactLib[@testing-library/react]
        ReactLib -->|Mount| HappyDOM[Happy-DOM]
        HappyDOM -->|Events| Component[React Component]
    end
```

## 2. Data Models

### Screen Cell
Represents a single character cell in the terminal grid.
*   **Character**: The string content (grapheme).
*   **Foreground Color**: ANSI color code or RGB value.
*   **Background Color**: ANSI color code or RGB value.
*   **Attributes**: Boolean flags for Bold, Dim, Italic, Underline, Strikethrough, Inverse.

### Virtual Screen Buffer
Represents the state of the terminal display.
*   **Grid**: A 2D matrix of Screen Cells (Rows x Columns).
*   **Cursor**: Current X and Y coordinates.
*   **Dimensions**: Width and Height of the viewport.
*   **History**: (Optional) Scrollback buffer.

### Test Session
Represents a running test instance.
*   **Process ID**: The PID of the spawned process.
*   **IO Channels**: Handles for writing to Stdin and reading from Stdout.
*   **Screen State**: The current Virtual Screen Buffer.

## 3. API Signatures

The library exposes an Effect-based API.

### `TuiTest` Service
The main entry point for the library.

*   **`spawn`**: Starts a new TUI process.
    *   **Input**: Command string, Arguments array, Options (Environment variables, Terminal dimensions).
    *   **Output**: An Effect that yields a `TestSession`.

### `TestSession` Interface
Operations available on a running app.

*   **`sendText`**: Types text into the terminal.
    *   **Input**: String to type.
    *   **Output**: Effect<void>.
*   **`sendKey`**: Sends a specific key code or control sequence (e.g., Enter, UpArrow, Ctrl+C).
    *   **Input**: Key identifier.
    *   **Output**: Effect<void>.
*   **`waitFor`**: Suspends execution until a visual condition is met.
    *   **Input**: Predicate function (ScreenBuffer -> Boolean) or Search String.
    *   **Output**: Effect<void> (fails on timeout).
*   **`capture`**: Returns the current state of the screen.
    *   **Input**: None.
    *   **Output**: Effect<ScreenBuffer>.
*   **`terminate`**: Kills the process.
    *   **Input**: Signal (optional).
    *   **Output**: Effect<void>.

### `ScreenBuffer` Interface
Methods to inspect the visual state.

*   **`getText`**: Returns the plain text content of the screen (stripping ANSI).
    *   **Input**: Optional region (start row, end row).
    *   **Output**: String.
*   **`getCell`**: Returns style information for a specific coordinate.
    *   **Input**: Row, Column.
    *   **Output**: ScreenCell.
*   **`includes`**: Checks if text exists on screen.
    *   **Input**: String or RegExp.
    *   **Output**: Boolean.

## 4. Module Architecture

### `src/`
*   **`index.ts`**: Public exports.
*   **`TestSession.ts`**: Definition of the TestSession interface and implementation.
*   **`TuiTest.ts`**: Service definition and Layer construction.

### `src/internal/`
*   **`bun-pty.ts`**: Wrapper around Bun's native `Bun.spawn` with `terminal` options. Handles low-level stream management.
*   **`ansi-parser.ts`**: State machine that consumes raw byte streams and updates the Screen Buffer. Handles CSI (Control Sequence Introducer) and SGR (Select Graphic Rendition) codes.
*   **`screen-buffer.ts`**: Implementation of the grid data structure and query logic.

## 5. Algorithms

### ANSI Parsing Strategy
The parser acts as a streaming state machine.
1.  **Ingest**: Read chunks of data from the PTY stdout stream.
2.  **Scan**: Iterate through bytes looking for Escape characters (`0x1B`).
3.  **Buffer**: If an incomplete escape sequence is found at the end of a chunk, buffer it until the next chunk arrives.
4.  **Decode**:
    *   **Text**: Write printable characters to the current Cursor X,Y in the Grid. Increment Cursor X. Wrap if necessary.
    *   **CSI Codes**: Parse sequences like `ESC [ <n> ; <m> H` (Move Cursor) or `ESC [ <n> m` (Set Style). Update Cursor position or current Style state accordingly.
    *   **Control Chars**: Handle `\n` (Line Feed), `\r` (Carriage Return), `\b` (Backspace).
5.  **Update**: Mutate the Virtual Screen Buffer in place.

### Wait Strategy
To handle the asynchronous nature of TUI rendering:
1.  The `waitFor` effect enters a polling loop.
2.  It checks the Predicate against the current Screen Buffer.
3.  If false, it yields to the scheduler (Effect.sleep) for a short interval.
4.  It repeats until the Predicate is true or a global timeout is reached.
5.  On timeout, it produces a detailed Failure containing the last frame of the Screen Buffer for debugging.

## 6. Error Handling

*   **Spawn Errors**: If the command cannot be found or fails to start, the `spawn` effect fails with a typed `SpawnError`.
*   **Timeout Errors**: If `waitFor` exceeds its duration, it fails with a `TimeoutError` containing the visual diff.
*   **Parse Errors**: Malformed ANSI sequences are generally ignored or logged (graceful degradation), mimicking real terminal behavior.

## 7. Integration Pattern (DOM/React)

Instead of a monolithic wrapper, we define a usage pattern for testing `opentui-dom` apps:

**Pattern: The Dual-Test Approach**

1.  **Unit/Logic Tests (White Box)**
    *   **Tooling**: `@testing-library/react`, `happy-dom`.
    *   **Scope**: Component logic, state changes, event handling.
    *   **Method**: Render component to in-memory DOM. Fire synthetic events. Assert on DOM structure (ARIA roles, text content).
    *   **Benefit**: Fast, deterministic, no process overhead.

2.  **Visual/E2E Tests (Black Box)**
    *   **Tooling**: `@effect-native/tui-testing-library`.
    *   **Scope**: Final rendering, layout, ANSI colors, CLI arguments.
    *   **Method**: Build the app. Spawn it via `TuiTest`. Send keystrokes. Assert on screen content.
    *   **Benefit**: Verifies the actual user experience, catches rendering glitches.
