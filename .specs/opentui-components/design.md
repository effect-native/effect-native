# @effect-native/opentui-components — Design

This document defines the technical architecture and implementation strategy for the OpenTUI Components **Registry**.

---

## Architecture Overview

This package follows the **Shadcn UI model**: a registry of styled source code components that users install into their projects via CLI. It is NOT a traditional NPM dependency.

### Layered Architecture

| Layer      | Package                             | Role                                       | Analogy                  |
| ---------- | ----------------------------------- | ------------------------------------------ | ------------------------ |
| Primitives | `@effect-native/opentui-base`       | Headless logic (focus, modality, keyboard) | Radix UI / Base UI       |
| Registry   | `@effect-native/opentui-components` | Styled source code distribution            | Shadcn UI                |
| Consumer   | User's project                      | Final application                          | Next.js app using Shadcn |

---

## Registry Structure

### Directory Layout

The registry follows Shadcn conventions with a `registry/` directory containing all component source code:

```
packages/opentui-components/
  registry/
    default/                      — Default style variant
      list/
        selectable-list.tsx       — SelectableList component
        list-logic.ts             — Pure state functions
      columns/
        generic-column-browser.tsx
        column-data-provider.ts
        column-state.ts
        column-layout.ts
      dialogs/
        context-menu.tsx
        deep-search.tsx
        search-provider.ts
        menu-helpers.ts
      files/
        file-browser.tsx
        file-data-provider.ts
        file-item.ts
        file-icons.ts
      lib/
        key-helpers.ts            — Shared key name normalization
        atoms/                    — effect-atom state atoms
          list-atoms.ts
          column-atoms.ts
      hooks/
        use-keyboard.ts           — Keyboard handling hook
        use-selectable-list.ts    — List state hook
      testing/
        tui-harness.ts
        terminal.ts
        key-codes.ts
        frame-capture.ts
        assertions.ts
  public/
    r/                            — Built registry JSON files (generated)
      registry.json               — Registry index
      selectable-list.json        — Individual component definitions
      generic-column-browser.json
      context-menu.json
      deep-search.json
      file-browser.json
      tui-harness.json
  registry.json                   — Source registry definition
  package.json
  AGENTS.md
  VT-HIG.md
```

### Registry JSON Schema

The root `registry.json` defines all available components:

**Registry Index Fields:**

- `$schema`: Points to Shadcn schema URL
- `name`: Registry namespace (e.g., "opentui")
- `homepage`: Documentation URL
- `items`: Array of registry item definitions

**Registry Item Fields (per component):**

- `name`: Unique identifier (e.g., "selectable-list")
- `type`: Item type (registry:component, registry:hook, registry:lib, registry:block)
- `title`: Human-readable name
- `description`: LLM-friendly description of purpose and usage
- `registryDependencies`: Other registry items required (e.g., ["@opentui/button"])
- `dependencies`: NPM packages required (e.g., ["@effect-native/opentui-base", "effect"])
- `files`: Array of file definitions with path and type
- `categories`: Organization tags (e.g., ["navigation", "list"])

### Component Categories

| Category   | Components                            |
| ---------- | ------------------------------------- |
| list       | selectable-list                       |
| navigation | generic-column-browser, file-browser  |
| dialog     | context-menu, deep-search             |
| testing    | tui-harness                           |
| lib        | key-helpers, list-logic, column-state |
| hooks      | use-keyboard, use-selectable-list     |

---

## Build Pipeline

### Registry Build Process

The build script transforms source registry into publishable JSON:

1. **Parse** `registry.json` source definition
2. **Read** each referenced file from `registry/` directory
3. **Transform** import paths (replace `@/registry` with user's configured paths)
4. **Generate** individual `[component-name].json` files in `public/r/`
5. **Generate** `public/r/registry.json` index

### Build Script Integration

The package.json includes a build script using `shadcn build`:

**Build Command:** `pnpm registry:build`

This runs `shadcn build` which:

- Reads `registry.json`
- Outputs to `public/r/` by default
- Validates schema compliance

### Hosting

The `public/r/` directory is deployed to a static host (e.g., `https://opentui.dev/r/`).

Users install via:

- `npx shadcn add https://opentui.dev/r/selectable-list.json`
- Or with namespace: `npx shadcn add @opentui/selectable-list`

---

## Package Structure (NPM)

While the registry is source-code-based, we still publish an NPM package for:

1. The `@effect-native/opentui-base` headless primitives (required dependency)
2. TypeScript types for IDE support
3. AGENTS.md and VT-HIG.md documentation

### NPM Package Layout

```
packages/opentui-components/
  dist/                           — Compiled types (for IDE support only)
  AGENTS.md
  VT-HIG.md
  package.json
```

The NPM package is minimal — the real value is in the registry.

---

## Subpath Exports (NPM Package)

For users who prefer NPM over registry installation:

| Subpath                                     | Description                  | Platform |
| ------------------------------------------- | ---------------------------- | -------- |
| `@effect-native/opentui-components`         | Re-exports from opentui-base | Any      |
| `@effect-native/opentui-components/bun`     | Pre-configured for Bun       | Bun      |
| `@effect-native/opentui-components/node`    | Pre-configured for Node      | Node     |
| `@effect-native/opentui-components/testing` | PTY test harness             | Bun      |

---

## Package Layout (Original Design — Retained for Reference)

```
packages/opentui-react/
  src/
    index.ts              — Main export (platform-agnostic)
    bun.ts                — Bun platform export
    node.ts               — Node platform export
    testing.ts            — Testing harness export (Bun-only)
    internal/             — Private implementation details
    atoms/                — effect-atom state atoms
      listAtoms.ts        — Selection, filter state
      columnAtoms.ts      — Browser state, history
      registrySetup.ts    — Default registry configuration
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
    platform/
      bun/
        BunFileBrowser.tsx   — Pre-configured with BunFileSystem
        layers.ts            — Bun-specific layers
      node/
        NodeFileBrowser.tsx  — Pre-configured with NodeFileSystem
        layers.ts            — Node-specific layers
    testing/
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

### Subpath Exports

The package.json exports field provides:

| Subpath                                | Description                                   | Platform |
| -------------------------------------- | --------------------------------------------- | -------- |
| `@effect-native/opentui-react`         | Core components, requires manual layer config | Any      |
| `@effect-native/opentui-react/bun`     | Pre-configured for Bun, includes testing      | Bun      |
| `@effect-native/opentui-react/node`    | Pre-configured for Node                       | Node     |
| `@effect-native/opentui-react/testing` | PTY test harness                              | Bun      |

### Zero-Config Platform Usage

Users importing from `/bun` or `/node` get components that "just work" without any Effect-TS knowledge:

- **Bun users**: Import from `@effect-native/opentui-react/bun` — FileBrowser, SelectableList, and all components are pre-configured with BunFileSystem layer
- **Node users**: Import from `@effect-native/opentui-react/node` — FileBrowser, SelectableList, and all components are pre-configured with NodeFileSystem layer
- **Advanced users**: Import from `@effect-native/opentui-react` (main export) — Must provide FileSystem layer manually via Effect context

---

## Reactive State with effect-atom

### Overview

All components use effect-atom internally for reactive state management. This provides:

- Fine-grained reactivity without prop drilling
- Effect-TS integration for advanced users
- Zero-config operation for basic users (atoms are pre-configured)

### Architecture

The atoms/ directory contains state atoms for each component domain:

- **listAtoms**: Selection index, filter query, filtered items cache
- **columnAtoms**: Browser state, column history, drilled-down IDs, multi-selection set
- **registrySetup**: Default registry configuration for standalone usage

### Consumer Experience

**Basic users** (importing from /bun or /node):

- Components work immediately with internal atom state
- No need to understand Effect-TS or effect-atom
- State is managed internally, exposed only via callbacks (onSelect, onSelectionChange, etc.)

**Intermediate users** (controlled components):

- Pass controlled props (selectedIndex, etc.) to override internal state
- Components become "controlled" in React parlance
- Still no Effect-TS knowledge required

**Advanced users** (effect-atom integration):

- Import atoms directly to build custom state flows
- Compose with application-level atom registry
- Use Effect-TS to orchestrate complex state transitions
- Access internal reactive state for debugging or extension

### Atom Design Principles

1. **Internal by default**: Atoms are implementation details, not public API
2. **Escapable**: Advanced users can access atoms when needed
3. **Composable**: Atoms can be combined into larger state graphs
4. **Testable**: Atom state can be inspected in tests without rendering

---

## Module: list/SelectableList

### Module Organization

| Module         | Purpose                          |
| -------------- | -------------------------------- |
| SelectableList | Main React component             |
| listLogic      | Pure state management functions  |
| keyHelpers     | Key name normalization utilities |

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

## Module: columns/GenericColumnBrowser

### Module Organization

| Module               | Purpose                                   |
| -------------------- | ----------------------------------------- |
| GenericColumnBrowser | Main React component                      |
| ColumnDataProvider   | Effect service interface for data sources |
| columnState          | Pure state management functions           |
| columnLayout         | Width calculation and scroll offset logic |

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

The ColumnDataProvider is defined as an Effect Context.Tag. Users provide the service via Layer.

ColumnDataProvider service shape (all methods operating on generic item type T):

- fetchItems: Given parentId (string or null), returns array of T
- getItemId: Given item, returns unique string ID
- getSearchText: Given item, returns filterable text string
- hasChildren: Given item, returns boolean indicating if drillable
- isDotNavItem (optional): Given item, returns boolean for dot-navigation items
- getDisplayWidth (optional): Given item, returns number for custom width calculation
- getContentPreview (optional): Given item, returns string content or null

The component accepts a `runSync` prop or uses React context to run Effect programs synchronously for data fetching during render.

---

## Module: dialogs/ContextMenu and DeepSearch

### Module Organization

| Module         | Purpose                             |
| -------------- | ----------------------------------- |
| ContextMenu    | Modal menu component                |
| DeepSearch     | Search overlay component            |
| SearchProvider | Effect service interface for search |
| menuHelpers    | Menu item utilities                 |

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

## Module: files/FileBrowser

### Module Organization

| Module           | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| FileBrowser      | Main file browser component                        |
| FileDataProvider | ColumnDataProvider implementation using FileSystem |
| FileItem         | Data type for file entries                         |
| fileIcons        | Icon/indicator utilities                           |

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

## Module: testing/ (PTY Test Harness)

### Overview

A PTY-based testing harness for TUI applications. Unlike OpenTUI's built-in test utilities (which mock the renderer internals), this package spawns real processes with a pseudo-terminal attached, enabling true end-to-end testing of any TUI application.

This package is Bun-specific, using Bun's native PTY support via `Bun.spawn({ terminal: ... })` and `new Bun.Terminal()`.

### Module Organization

| Module       | Purpose                                                            |
| ------------ | ------------------------------------------------------------------ |
| Terminal     | Wrapper around Bun.Terminal with Effect integration                |
| TuiHarness   | High-level test harness for spawning and interacting with TUI apps |
| KeyCodes     | ANSI escape sequences for keyboard input                           |
| FrameCapture | Utilities for capturing and comparing terminal frames              |
| Assertions   | Test assertion helpers for terminal content                        |

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

### End-to-End Tests (testing/)

Full application tests using the /testing subpath:

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

### @effect-native/opentui-react (main export)

Platform-agnostic components requiring manual layer configuration:

- SelectableList component and SelectableListProps type
- GenericColumnBrowser component and GenericColumnBrowserProps type
- ContextMenu component, ContextMenuProps type, MenuItem type
- DeepSearch component, DeepSearchProps type
- FileBrowser component (requires FileSystem layer), FileBrowserProps type
- FileItem type, FileDataProvider layer
- ColumnDataProvider service tag and service interface type
- SearchProvider service tag and service interface type
- List logic functions (createListState, applyFilter, etc.)
- Column state and layout functions
- Key helper functions (isUpKey, isDownKey, etc.)
- File icon utilities
- Menu helper functions

### @effect-native/opentui-react/bun

Everything from main export, pre-configured for Bun runtime:

- All components work without manual layer setup
- FileBrowser uses BunFileSystem automatically
- Includes Bun-specific layers and configuration

### @effect-native/opentui-react/node

Everything from main export, pre-configured for Node runtime:

- All components work without manual layer setup
- FileBrowser uses NodeFileSystem automatically
- Includes Node-specific layers and configuration

### @effect-native/opentui-react/testing

PTY-based testing harness (Bun-only):

- Terminal service and make function
- TuiHarness service with spawn, pressKey, typeText, etc.
- TuiHarnessConfig and TerminalConfig types
- CapturedFrame type
- KeyCodes constants (ARROW_UP, ESCAPE, etc.)
- KeyInput type
- Frame utilities (stripAnsi, parseRows, diffFrames, findText)
- Assertion helpers (assertContains, assertRowEquals, etc.)
- Error types (SpawnError, TimeoutError)
