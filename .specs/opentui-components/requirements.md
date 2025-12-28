# @effect-native/opentui-react — Requirements

This document defines atomic, testable requirements using EARS notation.

All requirements are derived from the **VT-HIG (Virtual Terminal Human Interface Guidelines)** specification.

---

## SelectableList Requirements

### FR-LIST-001: Item Rendering
The SelectableList shall render each item using a caller-provided render function.

### FR-LIST-002: Keyboard Navigation (Up)
**When** the user presses Arrow Up or `k`  
**Then** the SelectableList shall move the selection to the previous item.

### FR-LIST-003: Keyboard Navigation (Down)
**When** the user presses Arrow Down or `j`  
**Then** the SelectableList shall move the selection to the next item.

### FR-LIST-004: Selection Clamping
**While** the selection index exceeds the number of filtered items  
**Then** the SelectableList shall clamp the selection to the last available item.

### FR-LIST-005: Type-to-Filter Input
**When** the user types an alphanumeric character  
**Then** the SelectableList shall append the character to the filter query and filter items (case-insensitive).

### FR-LIST-006: Backspace Filter Editing
**When** the user presses Backspace and a filter query exists  
**Then** the SelectableList shall remove the last character from the filter query.

### FR-LIST-007: Escape Clears Filter
**When** the user presses Escape and a filter query exists  
**Then** the SelectableList shall clear the filter query and show all items.

### FR-LIST-008: Filter Query Display
**While** a filter query is active  
**Then** the SelectableList shall display the current filter query visibly.

### FR-LIST-009: Empty State
**While** no items match the current filter  
**Then** the SelectableList shall display an empty state message.

### FR-LIST-010: Enter Key Selection
**When** the user presses Enter on an item  
**Then** the SelectableList shall invoke the selection callback.

### FR-LIST-011: Mouse Click Selection
**When** the user clicks on an item  
**Then** the SelectableList shall invoke the click callback.

### FR-LIST-012: Scroll to Selection
**When** the selection changes  
**Then** the SelectableList shall scroll to keep the selected item visible.

### FR-LIST-013: Active State Control
**While** the component is inactive  
**Then** the SelectableList shall ignore keyboard input.

### FR-LIST-014: Visual Focus Indicator
**While** the component is active  
**Then** the SelectableList shall display a distinct visual indicator.

---

## GenericColumnBrowser Requirements

### FR-COL-001: Column Rendering
The GenericColumnBrowser shall render one column per level of the navigation path.

### FR-COL-002: Right Arrow Navigation
**When** the user presses Arrow Right or `l` on an item with children  
**Then** the GenericColumnBrowser shall push a new column showing that item's children.

### FR-COL-003: Left Arrow Navigation
**When** the user presses Arrow Left or `h` and more than one column is displayed  
**Then** the GenericColumnBrowser shall pop the rightmost column.

### FR-COL-004: Dot Navigation Item Skipping
**When** navigating via Arrow Right  
**Then** the GenericColumnBrowser shall skip dot-navigation items.

### FR-COL-005: Preview Pane for Items with Children
**While** the highlighted item has children  
**Then** the GenericColumnBrowser shall display a preview of those children.

### FR-COL-006: Preview Pane for Leaf Items
**While** the highlighted item has no children and content preview is available  
**Then** the GenericColumnBrowser shall display the content preview.

### FR-COL-007: Selection History Persistence
**When** the user navigates back to a previously visited column  
**Then** the GenericColumnBrowser shall restore the previously selected index.

### FR-COL-008: Multi-Select Toggle
**When** the user presses Space on an item  
**Then** the GenericColumnBrowser shall toggle that item's multi-selection state.

### FR-COL-009: Enter Key Context Menu
**When** the user presses Enter on an item  
**Then** the GenericColumnBrowser shall invoke the context callback with focused and selected items.

### FR-COL-010: Mouse Click on Folder
**When** the user clicks on an item with children  
**Then** the GenericColumnBrowser shall drill into that item.

### FR-COL-011: Mouse Click on Leaf
**When** the user clicks on an item without children  
**Then** the GenericColumnBrowser shall select that item.

### FR-COL-012: Adaptive Column Width
The GenericColumnBrowser shall calculate each column's width based on content, within configured limits.

### FR-COL-013: Horizontal Scroll for Many Columns
**While** the number of columns exceeds the visible maximum  
**Then** the GenericColumnBrowser shall scroll to keep the active column visible.

### FR-COL-014: Data Provider Injection
The GenericColumnBrowser shall accept hierarchical data through a service interface.

### FR-COL-015: Active State Control
**While** the component is inactive  
**Then** the GenericColumnBrowser shall ignore keyboard input.

---

## Context Menu Requirements

### FR-DLG-001: Menu Rendering
**While** the menu is open  
**Then** the ContextMenu shall render as a modal overlay.

### FR-DLG-002: Menu Keyboard Navigation
**When** the user presses Arrow Up/Down or `j`/`k`  
**Then** the ContextMenu shall move selection to the next/previous non-disabled item.

### FR-DLG-003: Menu Item Selection
**When** the user presses Enter on a non-disabled item  
**Then** the ContextMenu shall invoke the selection callback and close.

### FR-DLG-004: Menu Shortcut Keys
**When** the user presses a key matching a menu item's shortcut  
**Then** the ContextMenu shall select that item and close.

### FR-DLG-005: Menu Escape Close
**When** the user presses Escape  
**Then** the ContextMenu shall close without selection.

### FR-DLG-006: Disabled Item Skipping
**While** navigating menu items  
**Then** the ContextMenu shall skip disabled items.

### FR-DLG-007: Mouse Click on Menu Item
**When** the user clicks on a non-disabled item  
**Then** the ContextMenu shall select that item and close.

---

## Deep Search Requirements

### FR-DLG-010: Search Overlay Rendering
**While** the search overlay is open  
**Then** the DeepSearch shall display a search input and results list.

### FR-DLG-011: Search Input
**When** the user types in the search overlay  
**Then** the DeepSearch shall update the query and trigger a search after debounce.

### FR-DLG-012: Search Results Navigation
**When** the user presses Arrow Up/Down  
**Then** the DeepSearch shall move selection through results.

### FR-DLG-013: Search Result Selection
**When** the user presses Enter on a result  
**Then** the DeepSearch shall invoke the selection callback and close.

### FR-DLG-014: Search Escape Close
**When** the user presses Escape  
**Then** the DeepSearch shall close without selection.

### FR-DLG-015: Search Loading Indicator
**While** a search is in progress  
**Then** the DeepSearch shall display a loading indicator.

### FR-DLG-016: Search Empty State
**While** no results match the query  
**Then** the DeepSearch shall display an empty state message.

### FR-DLG-017: Search Provider Injection
The DeepSearch shall accept a search function through a service interface.

---

## FileBrowser Requirements

### FR-FILE-001: FileSystem Integration
The FileBrowser shall use a file system service for all operations.

### FR-FILE-002: Directory Listing
**When** a directory is expanded  
**Then** the FileBrowser shall fetch and display its contents.

### FR-FILE-003: File Type Icons
The FileBrowser shall render distinct visual indicators for files versus directories.

### FR-FILE-004: Hidden File Filtering
The FileBrowser shall support showing or hiding hidden files.

### FR-FILE-005: File Content Preview
**While** a file is highlighted  
**Then** the FileBrowser shall display a content preview if available.

### FR-FILE-006: Root Path Configuration
The FileBrowser shall accept an initial root path and support changing it via navigation.

### FR-FILE-007: Path Display
The FileBrowser shall display the current path.

### FR-FILE-008: Dot Navigation Items
The FileBrowser shall include `.` and `..` entries in directory listings.

### FR-FILE-009: Error Handling
**If** a file system operation fails  
**Then** the FileBrowser shall display an error message without crashing.

---

## Testing Harness Requirements

### FR-TEST-001: PTY Spawn
The TuiHarness shall spawn a subprocess with a pseudo-terminal attached.

### FR-TEST-002: Terminal Dimensions
**When** creating a terminal  
**Then** the TuiHarness shall allow configuration of columns and rows.

### FR-TEST-003: Key Press Simulation
**When** pressKey is called  
**Then** the TuiHarness shall write the appropriate escape sequence to the terminal.

### FR-TEST-004: Arrow Key Support
The TuiHarness shall support sending arrow keys with optional modifiers.

### FR-TEST-005: Special Key Support
The TuiHarness shall support sending Enter, Escape, Tab, Backspace, Delete, Home, End, and function keys.

### FR-TEST-006: Modifier Key Support
The TuiHarness shall support ctrl, meta/alt, and shift modifiers.

### FR-TEST-007: Text Typing
**When** typeText is called  
**Then** the TuiHarness shall send each character sequentially.

### FR-TEST-008: Frame Capture
The TuiHarness shall capture the terminal buffer with escape codes stripped.

### FR-TEST-009: Raw Frame Capture
The TuiHarness shall optionally capture frames with escape codes preserved.

### FR-TEST-010: Content Waiting
**When** waitForContent is called with a predicate  
**Then** the TuiHarness shall poll until the predicate matches or timeout.

### FR-TEST-011: Frame Stabilization
**When** waitForFrame is called  
**Then** the TuiHarness shall wait until no new output for a specified duration.

### FR-TEST-012: Content Assertion
The TuiHarness shall provide assertion helpers for terminal content.

### FR-TEST-013: Row-Level Assertions
The TuiHarness shall support assertions on specific terminal rows.

### FR-TEST-014: Process Exit Handling
**When** the spawned process exits  
**Then** the TuiHarness shall capture the exit code.

### FR-TEST-015: Terminal Resize
**When** resize is called  
**Then** the TuiHarness shall update dimensions and signal the child process.

### FR-TEST-016: Frame Diffing
The TuiHarness shall provide a function to diff two captured frames.

---

## Platform Export Requirements

### FR-PLAT-001: Main Export Platform-Agnostic
The main export shall not include platform-specific code.

### FR-PLAT-002: Bun Subpath Export
The Bun subpath shall provide pre-configured components and testing harness.

### FR-PLAT-003: Node Subpath Export
The Node subpath shall provide pre-configured components.

### FR-PLAT-004: Zero-Config Usage
**When** importing from platform subpaths  
**Then** components shall work without manual configuration.

---

## Agent Documentation Requirements

### FR-DOC-001: AGENTS.md in Package
The package shall include AGENTS.md with instructions for AI agents.

### FR-DOC-002: VT-HIG.md in Package
The package shall include VT-HIG.md with the specification.

### FR-DOC-003: Package Files Configuration
The documentation files shall be included in the published npm package.

---

## Non-Functional Requirements

### NFR-001: Keyboard-First Accessibility
All components shall be fully operable via keyboard alone.

### NFR-002: Mouse Support Required
All interactive components shall respond to mouse events.

### NFR-003: VT-HIG Compliance
All components shall follow VT-HIG patterns.

### NFR-004: Platform-Specific Code Isolation
Platform-specific code shall be isolated to subpath exports.

### NFR-005: TypeScript Types
All exports shall include TypeScript types.

### NFR-006: Portable Rendering
Components shall not assume specific terminal capabilities; enhanced features shall degrade gracefully.

### NFR-007: Zero-Friction Default Usage
Platform subpath imports shall work without touching Effect-TS or service configuration.

### NFR-008: Effect-Atom Interoperability
Components shall expose atoms for advanced integration.

---

## Constraints

### CON-001: React Dependency
UI components require React 18+.

### CON-002: OpenTUI Dependency
UI components require @opentui/react.

### CON-003: Effect Version
All packages require Effect 3.x.

### CON-004: No forwardRef
Components shall use React 19's ref-as-prop pattern.

### CON-005: Bun Runtime for Testing
The testing harness requires Bun runtime.
