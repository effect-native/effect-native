# @effect-native/opentui-react-* — Requirements

This document defines atomic, testable requirements using EARS notation for the OpenTUI React component packages.

---

## Package: @effect-native/opentui-react-list

### FR-LIST-001: Item Rendering
The SelectableList component shall render each item using a caller-provided render function.

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
**When** the user types an alphanumeric character (a-z, 0-9, `.`, `-`, `_`)  
**Then** the SelectableList shall append the character to the filter query and filter items to those containing the query (case-insensitive).

### FR-LIST-006: Backspace Filter Editing
**When** the user presses Backspace and a filter query exists  
**Then** the SelectableList shall remove the last character from the filter query and re-filter items.

### FR-LIST-007: Escape Clears Filter
**When** the user presses Escape and a filter query exists  
**Then** the SelectableList shall clear the filter query and show all items.

### FR-LIST-008: Filter Query Display
**While** a filter query is active  
**Then** the SelectableList shall display the current filter query in the component title.

### FR-LIST-009: Empty State
**While** no items match the current filter  
**Then** the SelectableList shall display an empty state message.

### FR-LIST-010: Enter Key Selection
**When** the user presses Enter on an item  
**Then** the SelectableList shall invoke the onSelect callback with the selected item.

### FR-LIST-011: Mouse Click Selection
**When** the user clicks on an item  
**Then** the SelectableList shall invoke the onItemClick callback with the item's index and the item.

### FR-LIST-012: Scroll to Selection
**When** the selection changes  
**Then** the SelectableList shall scroll to keep the selected item visible within the viewport.

### FR-LIST-013: Active State Control
**While** the `active` prop is false  
**Then** the SelectableList shall ignore keyboard input.

### FR-LIST-014: Visual Focus Indicator
**While** the `active` prop is true  
**Then** the SelectableList shall display a distinct border color to indicate focus.

---

## Package: @effect-native/opentui-react-columns

### FR-COL-001: Column Rendering
The GenericColumnBrowser shall render one column per level of the navigation path.

### FR-COL-002: Right Arrow Navigation
**When** the user presses Arrow Right or `l` on an item with children  
**Then** the GenericColumnBrowser shall push a new column showing that item's children.

### FR-COL-003: Left Arrow Navigation
**When** the user presses Arrow Left or `h` and more than one column is displayed  
**Then** the GenericColumnBrowser shall pop the rightmost column and move focus to the previous column.

### FR-COL-004: Dot Navigation Item Skipping
**When** navigating via Arrow Right  
**Then** the GenericColumnBrowser shall skip items identified as dot-navigation items (e.g., `.` and `..`).

### FR-COL-005: Preview Pane for Items with Children
**While** the highlighted item has children  
**Then** the GenericColumnBrowser shall display a preview pane showing those children.

### FR-COL-006: Preview Pane for Leaf Items
**While** the highlighted item has no children and content preview is available  
**Then** the GenericColumnBrowser shall display a preview pane showing the content.

### FR-COL-007: Selection History Persistence
**When** the user navigates back to a previously visited column  
**Then** the GenericColumnBrowser shall restore the previously selected index for that column.

### FR-COL-008: Multi-Select Toggle
**When** the user presses Space on an item  
**Then** the GenericColumnBrowser shall toggle that item's multi-selection state.

### FR-COL-009: Enter Key Context Menu
**When** the user presses Enter on an item and an onContextMenu callback is provided  
**Then** the GenericColumnBrowser shall invoke the callback with the focused item and all multi-selected items.

### FR-COL-010: Mouse Click on Folder
**When** the user clicks on an item with children  
**Then** the GenericColumnBrowser shall drill into that item (push a new column).

### FR-COL-011: Mouse Click on Leaf
**When** the user clicks on an item without children  
**Then** the GenericColumnBrowser shall select that item without pushing a new column.

### FR-COL-012: Adaptive Column Width
The GenericColumnBrowser shall calculate each column's width based on the maximum display width of its items, constrained by minimum and maximum width parameters.

### FR-COL-013: Horizontal Scroll for Many Columns
**While** the number of columns exceeds the maximum visible columns  
**Then** the GenericColumnBrowser shall offset column rendering to keep the active column visible.

### FR-COL-014: Data Provider Injection
The GenericColumnBrowser shall accept hierarchical data through an Effect-TS service interface that provides:
- Fetching children for a parent ID
- Checking if an item has children
- Extracting item ID and search text

### FR-COL-015: Active State Control
**While** the `active` prop is false  
**Then** the GenericColumnBrowser shall ignore keyboard input.

---

## Package: @effect-native/opentui-react-dialogs

### Context Menu Requirements

### FR-DLG-001: Menu Rendering
**While** the ContextMenu `isOpen` prop is true  
**Then** the ContextMenu shall render as a modal overlay with the provided menu items.

### FR-DLG-002: Menu Keyboard Navigation
**When** the user presses Arrow Up/Down or `j`/`k` in an open ContextMenu  
**Then** the ContextMenu shall move selection to the next/previous non-disabled item.

### FR-DLG-003: Menu Item Selection
**When** the user presses Enter on a non-disabled menu item  
**Then** the ContextMenu shall invoke the onSelect callback and close the menu.

### FR-DLG-004: Menu Shortcut Keys
**When** the user presses a key matching a menu item's shortcut  
**Then** the ContextMenu shall select that item (if not disabled) and close the menu.

### FR-DLG-005: Menu Escape Close
**When** the user presses Escape in an open ContextMenu  
**Then** the ContextMenu shall close without invoking onSelect.

### FR-DLG-006: Disabled Item Skipping
**While** navigating menu items  
**Then** the ContextMenu shall skip items marked as disabled.

### FR-DLG-007: Menu Sizing
The ContextMenu shall calculate its width based on the maximum label and shortcut lengths.

### FR-DLG-008: Mouse Click on Menu Item
**When** the user clicks on a non-disabled menu item  
**Then** the ContextMenu shall select that item and close the menu.

### Deep Search Requirements

### FR-DLG-010: Search Overlay Rendering
**While** the DeepSearch `isOpen` prop is true  
**Then** the DeepSearch shall render as a modal overlay with a search input and results list.

### FR-DLG-011: Search Input
**When** the user types in the DeepSearch overlay  
**Then** the DeepSearch shall update the query and trigger a search after a debounce period.

### FR-DLG-012: Search Results Navigation
**When** the user presses Arrow Up/Down in the DeepSearch overlay  
**Then** the DeepSearch shall move selection through the search results.

### FR-DLG-013: Search Result Selection
**When** the user presses Enter on a search result  
**Then** the DeepSearch shall invoke the onSelectResult callback with the selected path and close the overlay.

### FR-DLG-014: Search Escape Close
**When** the user presses Escape in the DeepSearch overlay  
**Then** the DeepSearch shall close without invoking onSelectResult.

### FR-DLG-015: Search Loading Indicator
**While** a search is in progress  
**Then** the DeepSearch shall display a loading indicator.

### FR-DLG-016: Search Empty State
**While** no search results match the query  
**Then** the DeepSearch shall display an appropriate empty state message.

### FR-DLG-017: Search Provider Injection
The DeepSearch shall accept a search function through an Effect-TS service interface rather than hardcoding `fd` or `find` commands.

---

## Package: @effect-native/opentui-react-files

### FR-FILE-001: FileSystem Integration
The file browser shall use `@effect/platform` FileSystem service for all file system operations.

### FR-FILE-002: Directory Listing
**When** a directory is expanded  
**Then** the file browser shall fetch and display its contents using the FileSystem service.

### FR-FILE-003: File Type Icons
The file browser shall render distinct visual indicators for files versus directories.

### FR-FILE-004: Hidden File Filtering
The file browser shall support showing or hiding hidden files (those starting with `.`).

### FR-FILE-005: File Content Preview
**While** a file is highlighted  
**Then** the file browser shall display a preview of the file's content (if readable text).

### FR-FILE-006: Root Path Configuration
The file browser shall accept an initial root path and allow changing the root via navigation.

### FR-FILE-007: Path Display
The file browser shall display the current path in a status area.

### FR-FILE-008: Dot Navigation Items
The file browser shall include `.` (current directory) and `..` (parent directory) entries in directory listings.

### FR-FILE-009: Error Handling
**If** a file system operation fails (permission denied, not found, etc.)  
**Then** the file browser shall display an appropriate error message without crashing.

### FR-FILE-010: FileSystem Effect Provider
The file browser shall expose its data provider as an Effect Layer, allowing users to provide custom FileSystem implementations.

---

## Non-Functional Requirements

### NFR-001: Keyboard-First Accessibility
All components shall be fully operable via keyboard alone, with mouse support as an enhancement.

### NFR-002: Mouse Support Required
All interactive components shall respond to mouse click events for selection and activation.

### NFR-003: VT-HIG Compliance
All components shall follow VT-HIG patterns for navigation keys (j/k, h/l, arrows), type-to-filter, and escape behavior.

### NFR-004: Effect-TS Integration
All data providers and side-effectful operations shall be expressed as Effect services with proper dependency injection.

### NFR-005: No Bun-Specific APIs
Core packages shall not depend on Bun-specific APIs; runtime-specific functionality shall be isolated to optional layers.

### NFR-006: TypeScript Types
All packages shall export TypeScript types for all public APIs.

### NFR-007: Peer Dependencies
All packages shall declare `@opentui/react`, `react`, and `effect` as peer dependencies (not bundled).

### NFR-008: Portable Rendering
Components shall not assume specific terminal capabilities (truecolor, mouse reporting) in their core functionality; enhanced features shall degrade gracefully.

---

## Constraints

### CON-001: React Dependency
All UI components require React 18+ as a peer dependency.

### CON-002: OpenTUI Dependency
All UI components require `@opentui/react` as a peer dependency for terminal rendering.

### CON-003: Effect Version
All packages require Effect 3.x as a peer dependency.

### CON-004: No forwardRef
Components shall use React 19's ref-as-prop pattern rather than `React.forwardRef`.
