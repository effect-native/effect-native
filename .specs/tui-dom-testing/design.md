# Design: TUI DOM Testing

## Architecture Overview

The testing ecosystem is divided into two distinct layers, each serving a specific verification purpose. This separation of concerns allows for robust testing of both the visual output and the logical application state.

### Layer 1: TUI Testing Library (Visual Verification)
This layer operates as a "Black Box" tester. It spawns the application process in a real Pseudo-Terminal (PTY) and verifies the actual bytes rendered to the screen. It is framework-agnostic and verifies what the user sees.

**Core Components:**
*   **PTY Manager:** Handles process spawning, resizing, and signal sending via Bun's native PTY capabilities.
*   **ANSI Parser:** A state machine that consumes the raw byte stream from standard output and interprets ANSI escape sequences (cursor movement, colors, clear screen).
*   **Virtual Screen Buffer:** An in-memory 2D grid representing the current state of the terminal. It maintains the character and style attributes for every cell.
*   **Interaction Simulator:** Sends raw keystrokes and control sequences to the process's standard input.

### Layer 2: OpenTUI DOM Testing Library (Logical Verification)
This layer operates as a "White Box" tester. It runs within the test process using a virtual DOM (`happy-dom`). It verifies the component tree, state changes, and event handling logic without the overhead of a full PTY or rendering engine.

**Core Components:**
*   **Virtual Environment:** Initializes `happy-dom` with a simulated window and document.
*   **Render Orchestrator:** Mounts React components into the virtual document and initializes the `opentui-dom` bridge components (NodeMap, EventRelay) in-memory.
*   **Query Engine:** Exposes standard DOM queries (by text, role, testId) bound to the virtual container.
*   **Event Simulator:** Dispatches synthetic DOM events that precisely mimic how the `opentui-dom` EventRelay translates terminal input into DOM actions.

---

## Data Models

### Screen Cell (Visual Layer)
Represents a single unit on the terminal grid.
*   **Character:** The grapheme displayed in the cell.
*   **Foreground Color:** ANSI color code or RGB value.
*   **Background Color:** ANSI color code or RGB value.
*   **Attributes:** Boolean flags for styles (Bold, Dim, Italic, Underline, Strikethrough, Inverse, Hidden).

### Virtual Screen (Visual Layer)
Represents the state of the terminal.
*   **Grid:** A two-dimensional array of Screen Cells (Rows x Columns).
*   **Cursor:** Current row and column position.
*   **Dimensions:** Width and height of the viewport.

### Render Result (Logical Layer)
The object returned after mounting a component.
*   **Container:** The DOM element containing the mounted component.
*   **Unmount:** Function to cleanup resources.
*   **Debug:** Utility to print the current DOM structure.
*   **Queries:** Bound functions to find elements within the container.

---

## API Signatures

### TUI Testing Library (Visual)

| Functionality | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- |
| **Spawn** | Starts a process in a PTY. | Command string, Arguments array, Options (env, dimensions) | Test Instance (includes screen, user, process control) |
| **Screen Capture** | Returns the current state of the terminal. | None | Snapshot object (text content, style grid) |
| **Wait For** | Awaits a specific condition in the output. | Predicate function or Text string, Timeout | Promise resolving when condition is met |
| **User Input** | Sends input to the process. | Text string or Key combination | Promise resolving after write |

### OpenTUI DOM Testing Library (Logical)

| Functionality | Description | Inputs | Outputs |
| :--- | :--- | :--- | :--- |
| **Render** | Mounts a component for testing. | React Element, Render Options | Render Result (queries, unmount) |
| **Fire Event** | Simulates user interaction. | Target Element, Event Type (e.g., keyDown) | Boolean (event handled status) |
| **Wait For** | Awaits async DOM updates. | Callback function | Promise resolving when callback succeeds |
| **Cleanup** | Cleans up the virtual environment. | None | Void |

---

## Algorithms

### ANSI Parsing & Screen Reconstruction
The parser functions as a stream processor. It reads the raw output buffer byte-by-byte.
1.  **Text Processing:** Printable characters are written to the current cursor position in the Virtual Screen Buffer, overwriting existing content. The cursor advances.
2.  **Control Sequence Processing:** When an Escape character is detected, the parser enters a state to accumulate the sequence.
    *   **Cursor Moves:** Updates the internal cursor coordinates (Up, Down, Left, Right, Set Position).
    *   **Erase:** Clears cells in the buffer (Line, Screen) by resetting them to empty/default style.
    *   **SGR (Select Graphic Rendition):** Updates the "current style" state (Color, Bold, etc.). Subsequent text writes use this style.
3.  **Line Wrapping:** If text exceeds the column width, the cursor moves to the start of the next line (scrolling the buffer if necessary).

### Event Simulation (The "FireEvent" Logic)
The logical library must simulate interactions exactly as the `opentui-dom` EventRelay handles them.
1.  **Key Press:** Instead of just firing a generic event, the simulator constructs a specific sequence.
    *   Example: "Enter" on a Button.
    *   Step 1: Dispatch `keydown` (Enter).
    *   Step 2: Check if `preventDefault` was called.
    *   Step 3: If not prevented, dispatch `click`.
2.  **Focus Navigation:** Simulating "Tab".
    *   Step 1: Query all focusable elements in the DOM.
    *   Step 2: Find the currently focused element index.
    *   Step 3: Calculate the next index (wrapping around).
    *   Step 4: Call `.focus()` on the next element.

### Async Synchronization
`happy-dom` uses an asynchronous batching mechanism for MutationObservers. The testing library's `waitFor` and `act` utilities must account for this.
*   **Mechanism:** When a test action triggers a state change, the resulting DOM updates are not immediate.
*   **Strategy:** The utilities will flush the microtask queue and use `setImmediate` or short timeouts to allow the MutationObserver batches to process before running assertions.

---

## Error Handling Strategy

### Visual Layer
*   **Process Exit:** If the spawned process exits unexpectedly during a test, the test should fail immediately with the exit code and stderr output.
*   **Timeout:** If `waitFor` exceeds the timeout duration without the condition being met, throw a descriptive error including the last captured frame of the terminal output for debugging.

### Logical Layer
*   **Element Not Found:** Standard `@testing-library` error messages should be preserved, printing the DOM tree to help locate the issue.
*   **Multiple Elements:** If a query finds multiple matches when one was expected, list the matching elements.

---

## Test Strategy

### Unit Testing the Libraries
*   **Parser Tests:** Feed raw ANSI strings into the parser and verify the resulting Screen Buffer grid matches the expected state (colors, positions).
*   **Event Tests:** Verify that `fireEvent` helpers dispatch the correct sequence of DOM events with the correct properties (bubbles, cancelable).

### Integration Testing (The "Miniapp")
*   Use the **Logical Library** to test the `miniapp` components individually (e.g., verifying the Form component updates state correctly).
*   Use the **Visual Library** to test the `miniapp` end-to-end. Spawn the app, navigate via keyboard, and verify the terminal output looks correct (e.g., "Submit" button turns green when focused).
