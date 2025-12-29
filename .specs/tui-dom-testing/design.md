# Design: TUI DOM Testing

## System Overview

The `tui-dom-testing` system provides a layered approach to testing Terminal User Interface (TUI) applications. It separates the concern of "Visual Verification" (what the user sees) from "Logic Verification" (component state).

The core component is `@effect-native/tui-testing-library`, a framework-agnostic tool that treats a CLI application as a black box. It spawns the application in a real Pseudo-Terminal (PTY), captures the raw byte stream, and uses a high-fidelity Virtual Terminal (VT) parser to reconstruct the screen state for assertion.

## Architecture

### 1. The PTY Supervisor
This layer manages the lifecycle of the child process.
*   **Technology**: Relies on Bun's native PTY capabilities.
*   **Responsibilities**:
    *   Spawning the target process with specific terminal dimensions (rows/cols).
    *   Capturing standard output (stdout) as a raw byte stream.
    *   Injecting input (stdin) as keystrokes or control sequences.
    *   Handling process termination and signal propagation (SIGINT, SIGTERM).

### 2. The VT Engine (Virtual Terminal)
This layer parses the raw ANSI/VT escape sequences emitted by the application to maintain an accurate in-memory representation of the screen.
*   **Implementation Choice**: **libghostty-vt** (via FFI).
*   **Rationale**: We leverage the battle-tested, high-performance parser from the Ghostty terminal emulator to ensure "correctness by default." This avoids the pitfalls of ad-hoc regex parsing or incomplete JS implementations.
*   **Integration**:
    *   The library loads `libghostty-vt` as a shared object using Bun's FFI (Foreign Function Interface).
    *   Raw bytes from the PTY are passed directly to the native parser.
    *   The parser maintains the state machine (cursor position, modes, colors).
    *   The screen buffer is synchronized back to JavaScript for inspection.

### 3. The Screen Buffer Model
A framework-agnostic representation of the terminal screen at a specific moment in time.
*   **Structure**: A 2D grid of Cells.
*   **Cell Data**:
    *   **Char**: The grapheme cluster (character) displayed.
    *   **Style**: Foreground color, background color, bold, dim, italic, underline, etc.
    *   **Width**: Handling of wide characters (emoji, CJK).
*   **Cursor State**: Current X/Y coordinates and visibility.

### 4. The Assertion Layer
A high-level API for querying the Screen Buffer, inspired by the Testing Library philosophy.
*   **Queries**:
    *   Find text content within the buffer.
    *   Retrieve specific lines or regions.
    *   Inspect cell attributes (colors/styles) at specific coordinates.
*   **Wait Utilities**:
    *   Mechanisms to wait for the screen to stabilize (no new output for N ms).
    *   Mechanisms to wait for specific text to appear (handling async rendering).

## Data Flow

1.  **Test** sends input (e.g., "Tab" key).
2.  **PTY Supervisor** writes bytes to the child process stdin.
3.  **Child Process** (TUI App) processes input and writes ANSI sequences to stdout.
4.  **PTY Supervisor** captures stdout bytes.
5.  **VT Engine** parses bytes and updates the internal Screen Buffer state.
6.  **Test** queries the Screen Buffer to assert the expected visual outcome.

## Integration Patterns

### Pattern A: Visual Integration Testing
Used to verify the end-to-end user experience.
*   **Tool**: `@effect-native/tui-testing-library`.
*   **Method**: The test spawns the compiled CLI application.
*   **Verification**: Asserts that "pressing Down Arrow moves the selection highlight to the second item" by inspecting the colors and text in the Screen Buffer.

### Pattern B: Component Logic Testing
Used to verify the internal logic of React components and the DOM bridge.
*   **Tools**: `@testing-library/react`, `@testing-library/dom`, `happy-dom`.
*   **Method**: The test renders the React component tree into a `happy-dom` document in-memory.
*   **Verification**: Asserts that "clicking the button updates the React state" using standard DOM queries.
*   **Relationship**: This pattern does **not** use the PTY or VT Engine. It relies on the `opentui-dom` bridge correctly mapping DOM updates to TUI updates, which is verified separately by Pattern A.

## Module Design

### `TuiTest` (Class)
The main entry point for the testing library.
*   **Methods**:
    *   `spawn(command, args, options)`: Starts the PTY session.
    *   `screen`: Accessor for the current Screen Buffer.
    *   `keyboard`: Interface for sending keystrokes.
    *   `close()`: Terminates the session.

### `Screen` (Value Object)
Represents the state of the terminal.
*   **Methods**:
    *   `getText()`: Returns the plain text representation (stripping ANSI).
    *   `getCell(x, y)`: Returns the Cell object at coordinates.
    *   `find(text)`: Returns coordinates of text.

### `Keyboard` (Interface)
*   **Methods**:
    *   `press(key)`: Sends a key code.
    *   `type(text)`: Sends a sequence of characters.
    *   `send(bytes)`: Sends raw bytes.

## Error Handling Strategy
*   **Timeout**: Operations waiting for screen updates must timeout with descriptive errors (including a snapshot of the current screen state).
*   **Crash Detection**: If the child process exits unexpectedly, the test should fail immediately with the exit code and stderr output.
