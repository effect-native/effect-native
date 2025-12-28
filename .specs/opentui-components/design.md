# @effect-native/opentui-react — Design

This document defines the technical architecture and implementation strategy for the OpenTUI React components package.

---

## Package Structure

Single package under `packages/`:

| Package | Directory | Description |
|---------|-----------|-------------|
| @effect-native/opentui-react | packages/opentui-react | VT-HIG compliant TUI components + testing harness |

### Package Layout

```
packages/opentui-react/
  src/
    index.ts              — Public API exports
    internal/             — Private implementation details
    list/
      SelectableList.tsx  — Main list component
      listLogic.ts        — Pure state functions
    columns/
      GenericColumnBrowser.tsx
      ColumnDataProvider.ts
      columnState.ts
      columnLayout.ts
    dialogs/
      ContextMenu.tsx
      DeepSearch.tsx
      SearchProvider.ts
      menuHelpers.ts
    files/
      FileBrowser.tsx
      FileDataProvider.ts
      FileItem.ts
      fileIcons.ts
    testing/              — Subpath export: @effect-native/opentui-react/testing
      index.ts
      Terminal.ts
      TuiHarness.ts
      KeyCodes.ts
      FrameCapture.ts
      Assertions.ts
    keyHelpers.ts         — Shared key name normalization
  AGENTS.md               — Agent instructions (included in npm package)
  VT-HIG.md               — VT-HIG specification (included in npm package)
  package.json
```

### Agent Documentation Files

The package includes documentation files specifically for AI agents working with the codebase:

**AGENTS.md** — Instructions for AI agents on:
- How to use each component (SelectableList, GenericColumnBrowser, etc.)
- How to implement custom data providers via Effect-TS services
- How to write tests using the testing harness
- Common patterns and idioms
- What NOT to do (anti-patterns)

**VT-HIG.md** — The VT-HIG specification containing:
- Keyboard contracts (universal keys, list keys, navigation)
- TUI patterns (navigation, input, feedback, safety)
- Accessibility guidelines
- Signal handling expectations
- Redraw strategies
- Portability requirements
- Anti-patterns to avoid

These files are included in the npm package (via package.json "files" array) so agents working in downstream projects that depend on this package can access the context directly from node_modules.

### Normative Reference: VT-HIG

All component behavior, specs, and tests are written against the **VT-HIG (Virtual Terminal Human Interface Guidelines)** specification. The VT-HIG serves as the authoritative reference for:

- **Keyboard contracts**: Universal keys (Esc, Ctrl+C, ?, /), list keys (j/k, arrows, Enter, type-to-filter)
- **Navigation patterns**: Drill-in (Enter), back (Esc/q), focus indication, pane cycling (Tab)
- **Input modes**: Normal vs Insert, cancel (Esc) vs interrupt (Ctrl+C)
- **Feedback**: Status line for non-modal confirmations, persistent errors, progress indicators
- **Safety**: Dry-run previews, destructive action confirmation, undo when feasible
- **Accessibility**: Screen reader compatibility, low-vision support, motor/fatigue considerations
- **Signal handling**: SIGWINCH (reflow), SIGINT (cancel), SIGTERM (cleanup), SIGHUP (disconnect)
- **Redraw strategy**: Full redraw for uncertainty, surgical updates for known changes
- **Portability**: Minimum substrate (ASCII, no mouse, no color dependency) vs enhanced features

Tests verify VT-HIG compliance by asserting expected keyboard behavior and UI patterns.

### Subpath Exports

The package.json exports field provides:
- Main export: `@effect-native/opentui-react` — all components
- Testing subpath: `@effect-native/opentui-react/testing` — PTY test harness (Bun-only)

---

## Module: list/SelectableList

### Module Organization

| Module | Purpose |
|--------|---------|
| SelectableList | Main React component |
| listLogic | Pure state management functions |
| keyHelpers | Key name normalization utilities |

### Data Models

**ListState** — Internal state for list filtering and selection
- allItems: Array of all items (generic type T)
- filteredItems: Array of items matching current filter
- filterQuery: Current filter string
- selectedIndex: Index within filteredItems

**SelectableListProps** — Component props
- items: Source array of items
- selectedIndex: Controlled selection index
- active: Whether component handles keyboard input
- title: Optional title for the list box
- emptyMessage: Message when no items match filter
- getKey: Function to extract unique key from item
- getSearchText: Function to extract filterable text from item
- renderItem: Function to render item content (receives item, isHighlighted)
- onSelect: Callback when Enter pressed on item
- onSelectionChange: Callback when selection moves (index, item)
- onItemClick: Callback when item clicked (index, item)

### Key Helper Functions

The keyHelpers module normalizes OpenTUI key names across terminals:
- isUpKey: Matches "up", "arrowup", "k"
- isDownKey: Matches "down", "arrowdown", "j"
- isLeftKey: Matches "left", "arrowleft", "h"
- isRightKey: Matches "right", "arrowright", "l"
- isPrintableChar: Matches alphanumeric and allowed punctuation

### List Logic Functions

Pure functions operating on ListState:
- createListState: Initialize state from items array
- applyFilter: Filter items by query, reset selection to 0
- clearFilter: Remove filter, show all items
- typeChar: Append character to filter query
- backspace: Remove last character from filter query
- moveUp: Decrement selectedIndex (clamped to 0)
- moveDown: Increment selectedIndex (clamped to length-1)
- getSelectedItem: Return item at selectedIndex
- updateItems: Replace items array, reapply current filter

### Component Behavior

SelectableList renders a bordered box containing a scrollbox of items. The component:
1. Maintains internal filterQuery state
2. Computes filteredItems from items prop and filterQuery
3. Clamps selectedIndex prop to valid range for filteredItems
4. Registers keyboard handler via useKeyboard hook (only when active)
5. Scrolls to keep selected item visible via getScrollTopForSelection utility
6. Displays filter query in title when active

Keyboard handling priority:
1. Navigation keys (up/down) — call onSelectionChange
2. Enter — call onSelect with current item
3. Escape — clear filter if present
4. Backspace — remove last filter character
5. Printable characters — append to filter

Mouse handling:
- Each item box has onMouseDown handler calling onItemClick

---

## Package: @effect-native/opentui-react-columns

### Module Organization

| Module | Purpose |
|--------|---------|
| GenericColumnBrowser | Main React component |
| ColumnDataProvider | Effect service interface for data sources |
| columnState | Pure state management functions |
| columnLayout | Width calculation and scroll offset logic |

### Data Models

**ColumnData** — State for a single column
- parentId: ID of parent item (null for root)
- selectedIndex: Currently selected index in this column

**BrowserState** — Full browser state
- columns: Array of ColumnData
- activeColumnIndex: Index of focused column
- drilledDownIds: Array of item IDs that have been drilled into
- previewId: ID of item being previewed
- selectionHistory: Map from parentId to last selected index
- selectedIds: Set of multi-selected item IDs

**ColumnDataProvider** — Effect service tag for data injection

The service interface provides:
- fetchItems: Given parentId (or null for root), return array of items
- getItemId: Extract unique ID from item
- getSearchText: Extract filterable text from item
- hasChildren: Check if item can be drilled into
- isDotNavItem: Optional check if item is dot-navigation (skipped on arrow-right)
- getDisplayWidth: Optional custom width calculation
- getContentPreview: Optional content preview for leaf items

**GenericColumnBrowserProps** — Component props
- dataProvider: ColumnDataProvider service instance
- active: Whether component handles keyboard input
- minColumnWidth: Minimum column width (default 15)
- maxColumnWidth: Maximum column width (default 50)
- previewMinWidth: Minimum preview pane width (default 40)
- getColumnTitle: Function to generate column title from parentId
- renderItem: Function to render item (item, isHighlighted, isDrilledDown, isMultiSelected)
- onDrillDown: Callback when drilling into item
- onActivate: Callback when activating leaf item
- onContextMenu: Callback for Enter key (focusedItem, selectedItems)

### Column State Functions

Pure functions for state management:
- createBrowserState: Initialize with single root column
- pushColumn: Add column for item's children, update drilledDownIds
- popColumn: Remove rightmost column, restore previous active
- updateSelection: Update selectedIndex for a column, record in history
- toggleMultiSelect: Toggle item ID in selectedIds set
- getActiveItem: Return item at activeColumnIndex's selectedIndex

### Column Layout Functions

- calculateColumnWidth: Given items array, compute width from max display width plus padding, clamped to min/max
- calculateScrollOffset: Given column count, active index, and max visible, compute offset to keep active visible
- getVisibleColumns: Slice columns array based on scroll offset

### Component Behavior

GenericColumnBrowser renders a horizontal flex container with:
1. Fixed-width column boxes (no flex-grow)
2. Flex-grow preview pane on the right

Column rendering loop:
- Slice columns from scrollOffset for visible columns
- For each column, render SelectableList with items from fetchItems(parentId)
- Pass column-specific callbacks for selection change and item click
- Only the active column receives active=true

Preview pane logic:
- If previewId item has children: render read-only list of children
- If previewId item has no children and getContentPreview returns content: render text
- Otherwise: no preview pane

Keyboard handling (via useKeyboard when active):
- Left arrow: popColumn if columns.length > 1
- Right arrow: pushColumn if active item hasChildren and not isDotNavItem
- Space: toggleMultiSelect for active item

Enter handling delegated to active SelectableList's onSelect, which calls onContextMenu or onActivate.

Mouse handling delegated to SelectableList's onItemClick:
- For items with children: pushColumn
- For leaf items: update selection, truncate columns after

### Effect Service Integration

The ColumnDataProvider is defined as an Effect Context.Tag. Users provide the service via Layer:

```
ColumnDataProvider service shape:
- fetchItems: (parentId: string | null) => T[]
- getItemId: (item: T) => string
- getSearchText: (item: T) => string
- hasChildren: (item: T) => boolean
- isDotNavItem?: (item: T) => boolean
- getDisplayWidth?: (item: T) => number
- getContentPreview?: (item: T) => string | null
```

The component accepts a `runSync` prop or uses React context to run Effect programs synchronously for data fetching during render.

---

## Package: @effect-native/opentui-react-dialogs

### Module Organization

| Module | Purpose |
|--------|---------|
| ContextMenu | Modal menu component |
| DeepSearch | Search overlay component |
| SearchProvider | Effect service interface for search |
| menuHelpers | Menu item utilities |

### Context Menu Data Models

**MenuItem** — Single menu entry
- id: Unique identifier
- label: Display text
- shortcut: Optional single-character shortcut
- disabled: Optional boolean to disable item

**ContextMenuProps** — Component props
- items: Array of MenuItem
- isOpen: Whether menu is visible
- title: Optional menu title
- onClose: Callback to close menu
- onSelect: Callback when item selected (receives MenuItem)

### Context Menu Behavior

ContextMenu renders an absolutely positioned box when isOpen is true. Dimensions calculated from item labels and shortcuts.

Keyboard handling:
- Up/down: Move selection, skipping disabled items
- Enter: Select current item if not disabled, call onSelect and onClose
- Shortcut key: Find matching non-disabled item, select it
- Escape: Call onClose

Mouse handling:
- Each item has onMouseDown that selects if not disabled

Initial selection set to first non-disabled item when menu opens.

### Deep Search Data Models

**SearchState** — Internal search state
- isActive: Whether search mode is active
- query: Current search query
- results: Array of result strings (paths)
- selectedIndex: Index within results
- isLoading: Whether search is in progress

**SearchProvider** — Effect service tag for search injection

The service interface provides:
- search: (query: string, rootPath: string) => Effect yielding string array of results

**DeepSearchProps** — Component props
- isOpen: Whether overlay is visible
- rootPath: Base path for search
- searchProvider: SearchProvider service instance
- onClose: Callback to close overlay
- onSelectResult: Callback when result selected (receives path string)

### Deep Search Behavior

DeepSearch renders an absolutely positioned overlay when isOpen is true. Contains:
1. Input line showing "/" prompt, query text, cursor indicator, loading spinner
2. Scrollable results list
3. Status line with result count and key hints

Query changes trigger debounced search (150ms delay). Search runs via SearchProvider service.

Keyboard handling:
- Up/down: Move through results
- Enter: Select current result, call onSelectResult and onClose
- Backspace: Remove last query character
- Printable chars: Append to query
- Escape: Call onClose

### Menu Helper Functions

Utility functions for building common menu configurations:
- buildFileMenuItems: Returns menu items appropriate for file/directory context
- buildBatchMenuItems: Returns menu items for multi-selection operations

---

## Package: @effect-native/opentui-react-files

### Module Organization

| Module | Purpose |
|--------|---------|
| FileBrowser | Main file browser component |
| FileDataProvider | ColumnDataProvider implementation using FileSystem |
| FileItem | Data type for file entries |
| fileIcons | Icon/indicator utilities |

### Data Models

**FileItem** — Represents a file system entry
- path: Absolute path
- name: Display name (basename)
- isDirectory: Whether entry is a directory
- isHidden: Whether name starts with "."
- isDotNav: Whether this is "." or ".." entry

**FileBrowserProps** — Component props
- rootPath: Initial root directory path
- showHidden: Whether to show hidden files (default false)
- active: Whether component handles keyboard input
- onActivate: Callback when file is activated (Enter on file)
- onPathChange: Callback when current path changes

### FileDataProvider Implementation

FileDataProvider implements the ColumnDataProvider interface using @effect/platform FileSystem:

- fetchItems: Calls FileSystem.readDirectory, maps entries to FileItem array, prepends "." and ".." entries, filters hidden based on showHidden
- getItemId: Returns item.path
- getSearchText: Returns item.name
- hasChildren: Returns item.isDirectory
- isDotNavItem: Returns item.isDotNav
- getDisplayWidth: Returns item.name.length plus icon width
- getContentPreview: For files, reads first N bytes via FileSystem.readFileString with size limit

### FileSystem Layer

The package exports a Layer that provides FileDataProvider given a FileSystem service. Users compose with platform-specific FileSystem (NodeFileSystem, BunFileSystem, etc.).

Layer composition example (prose):
- User provides FileSystem layer from @effect/platform-node or @effect/platform-bun
- Package provides FileDataProvider layer that requires FileSystem
- FileBrowser component runs effects using the composed layer

### File Icon Logic

The fileIcons module provides indicator characters based on file type:
- Directory: "/" suffix or folder icon
- Executable: "*" suffix
- Symlink: "@" suffix
- Regular file: no suffix

Icon selection based on FileItem properties, with graceful fallback to ASCII indicators for terminal compatibility.

### Component Behavior

FileBrowser composes GenericColumnBrowser with FileDataProvider:
1. Creates FileDataProvider layer from props (rootPath, showHidden)
2. Provides ColumnDataProvider service to GenericColumnBrowser
3. Handles onActivate to open files (delegates to prop callback)
4. Handles onPathChange when navigation changes current directory

The component manages rootPath state internally, updating when user navigates to ".." from root or uses "Set as Root" action.

---

## Package: @effect-native/tui-test

### Overview

A PTY-based testing harness for TUI applications. Unlike OpenTUI's built-in test utilities (which mock the renderer internals), this package spawns real processes with a pseudo-terminal attached, enabling true end-to-end testing of any TUI application.

This package is Bun-specific, using Bun's native PTY support via `Bun.spawn({ terminal: ... })` and `new Bun.Terminal()`.

### Module Organization

| Module | Purpose |
|--------|---------|
| Terminal | Wrapper around Bun.Terminal with Effect integration |
| TuiHarness | High-level test harness for spawning and interacting with TUI apps |
| KeyCodes | ANSI escape sequences for keyboard input |
| FrameCapture | Utilities for capturing and comparing terminal frames |
| Assertions | Test assertion helpers for terminal content |

### Data Models

**TerminalConfig** — Configuration for terminal dimensions and behavior
- cols: Number of columns (default 80)
- rows: Number of rows (default 24)
- name: Terminal type for TERM env var (default "xterm-256color")

**TuiHarnessConfig** — Configuration for test harness
- command: Command array to spawn (e.g., ["bun", "run", "my-tui.ts"])
- cwd: Working directory for the process
- env: Additional environment variables
- terminal: TerminalConfig options

**CapturedFrame** — A snapshot of terminal state
- content: Raw terminal buffer as string (with ANSI codes stripped)
- rawContent: Raw terminal buffer with ANSI codes preserved
- timestamp: Time of capture
- rows: Array of row strings for line-by-line comparison

**KeyInput** — Represents a key press
- Can be a simple string character
- Can be a named key from KeyCodes (ARROW_UP, ESCAPE, etc.)
- Can include modifiers (ctrl, meta, shift)

### Terminal Module

Wraps Bun.Terminal with Effect-based lifecycle management:

**Terminal.make** — Creates a new Terminal as an Effect resource
- Accepts TerminalConfig
- Returns Scope-managed terminal that auto-closes on scope finalization
- Captures output via data callback into internal buffer

**Terminal.write** — Write data to terminal input
- Accepts string or Buffer
- Returns Effect that completes when write is acknowledged

**Terminal.resize** — Resize terminal dimensions
- Updates cols/rows
- Sends SIGWINCH equivalent to child process

**Terminal.captureFrame** — Capture current terminal state
- Returns CapturedFrame with parsed content
- Strips ANSI escape codes for content comparison
- Preserves raw content for debugging

**Terminal.waitForContent** — Wait for specific content to appear
- Accepts predicate function or regex
- Returns Effect that completes when content matches or times out
- Useful for waiting for TUI to render expected state

### TuiHarness Module

High-level harness for test scenarios:

**TuiHarness.spawn** — Spawn a TUI application
- Accepts TuiHarnessConfig
- Creates Terminal, spawns process attached to it
- Returns harness object with interaction methods

**TuiHarness.pressKey** — Send a key press
- Accepts KeyInput (character, named key, or with modifiers)
- Encodes to appropriate ANSI sequence
- Handles Kitty keyboard protocol for enhanced key reporting

**TuiHarness.typeText** — Type a string of characters
- Sends each character sequentially
- Optional delay between characters for realistic typing

**TuiHarness.pressArrow** — Send arrow key
- Direction: up, down, left, right
- Optional modifiers

**TuiHarness.pressEnter** — Send Enter/Return key

**TuiHarness.pressEscape** — Send Escape key

**TuiHarness.waitForFrame** — Wait for terminal to stabilize
- Waits for no new output for specified duration
- Returns captured frame

**TuiHarness.expectContent** — Assert terminal contains text
- Searches captured frame for expected content
- Throws test assertion error if not found

**TuiHarness.close** — Terminate process and close terminal

### KeyCodes Module

ANSI escape sequences for special keys:

- Control keys: RETURN, TAB, BACKSPACE, DELETE, ESCAPE
- Arrow keys: ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT
- Navigation: HOME, END, PAGE_UP, PAGE_DOWN
- Function keys: F1 through F12

Modifier encoding functions:
- encodeWithModifiers: Add shift/ctrl/meta to key sequence
- encodeKittySequence: Kitty keyboard protocol format

### FrameCapture Module

Utilities for terminal frame analysis:

**stripAnsi** — Remove ANSI escape codes from string

**parseRows** — Split frame content into array of row strings

**diffFrames** — Compare two frames, return differences
- Useful for debugging test failures
- Shows which rows changed

**findText** — Search for text in frame
- Returns position (row, col) if found
- Returns null if not found

### Assertions Module

Test assertion helpers designed for use with vitest or similar:

**assertContains** — Assert frame contains text
- Throws with helpful message showing frame content on failure

**assertRowEquals** — Assert specific row matches expected
- Zero-indexed row number
- Exact match comparison

**assertRowContains** — Assert row contains substring

**assertCursorAt** — Assert cursor position (if detectable)

**assertNotContains** — Assert frame does not contain text

### Effect Integration

All operations return Effect types for composability:

- Terminal lifecycle managed via Effect.acquireRelease
- Timeouts via Effect.timeout
- Errors modeled as tagged errors (SpawnError, TimeoutError, etc.)
- Test harness operations are Effects that can be composed

### Example Usage Pattern (Prose)

A typical test scenario:
1. Create harness with spawn, specifying command and terminal size
2. Wait for initial render using waitForFrame or waitForContent
3. Assert initial state using expectContent
4. Send input using pressKey, typeText, pressArrow
5. Wait for UI update using waitForFrame
6. Assert updated state
7. Close harness (automatic via Effect scope or explicit)

### Platform Constraints

This package requires Bun runtime for:
- Bun.Terminal class
- Bun.spawn with terminal option
- Native PTY support

It cannot run on Node.js. For Node.js environments, users should use OpenTUI's built-in test utilities which mock at the renderer level.

---

## Error Handling Strategy

### List and Columns Packages

These packages do not perform I/O directly. Errors from data providers surface via Effect error channel. Components receiving errors should:
- Display error message in place of content
- Maintain last-known-good state where possible
- Never crash the render tree

### Dialogs Package

SearchProvider errors are caught and result in:
- Empty results array
- Error message displayed in status line
- isLoading set to false

### Files Package

FileSystem errors are modeled as PlatformError variants:
- NotFound: Directory does not exist
- PermissionDenied: Cannot read directory
- NotADirectory: Path is not a directory

Error handling approach:
- Wrap FileSystem calls in Effect.catchTag for specific error types
- Map to user-friendly error messages
- Display errors in preview pane or status area
- Allow retry via refresh action

---

## Test Strategy

### Unit Tests

Each package has unit tests for pure logic functions:
- listLogic: Filter application, navigation clamping, state transitions
- columnState: Push/pop columns, selection history, multi-select
- columnLayout: Width calculation, scroll offset computation
- keyHelpers: Key name normalization

### Component Tests (OpenTUI Test Utils)

React component tests using @opentui/react test utilities and @effect/vitest:
- testRender with mockInput for keyboard simulation
- mockMouse for click simulation
- captureCharFrame for frame assertions
- Selection state verification
- Callback invocation verification

OpenTUI's test utilities operate at the renderer level, mocking stdin/stdout without spawning a real PTY. This is fast and suitable for unit-level component testing.

### End-to-End Tests (tui-test)

Full application tests using @effect-native/tui-test:
- Spawn real TUI application with PTY attached
- Send actual key sequences through terminal
- Capture and assert on real terminal output
- Test full application behavior including startup, navigation, exit

This level of testing catches issues that component-level mocks might miss:
- Terminal escape sequence handling
- Process lifecycle (startup time, graceful exit)
- Real keyboard input processing
- Cross-component integration

### Integration Tests

FileBrowser integration tests:
- Use in-memory FileSystem implementation
- Verify directory listing, navigation, preview
- Error scenario coverage

---

## API Summary

### @effect-native/opentui-react-list

Exports:
- SelectableList component
- SelectableListProps type
- ListState type
- List logic functions (createListState, applyFilter, etc.)
- Key helper functions (isUpKey, isDownKey, etc.)

### @effect-native/opentui-react-columns

Exports:
- GenericColumnBrowser component
- GenericColumnBrowserProps type
- ColumnDataProvider service tag
- ColumnDataProvider.Service type (service interface)
- BrowserState type
- Column state functions
- Column layout functions

### @effect-native/opentui-react-dialogs

Exports:
- ContextMenu component
- ContextMenuProps type
- MenuItem type
- DeepSearch component
- DeepSearchProps type
- SearchProvider service tag
- SearchProvider.Service type
- Menu helper functions

### @effect-native/opentui-react-files

Exports:
- FileBrowser component
- FileBrowserProps type
- FileItem type
- FileDataProvider layer
- File icon utilities

### @effect-native/tui-test

Exports:
- Terminal service and make function
- TuiHarness service with spawn, pressKey, typeText, etc.
- TuiHarnessConfig and TerminalConfig types
- CapturedFrame type
- KeyCodes constants (ARROW_UP, ESCAPE, etc.)
- KeyInput type
- Frame utilities (stripAnsi, parseRows, diffFrames, findText)
- Assertion helpers (assertContains, assertRowEquals, etc.)
- Error types (SpawnError, TimeoutError)
