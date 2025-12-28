# @effect-native/opentui-components — Requirements

This document defines atomic, testable requirements using EARS notation.

All requirements are derived from the **VT-HIG (Virtual Terminal Human Interface Guidelines)** specification.

**Note:** Base TUI primitive requirements (selection lists, menus, dialogs, search inputs, scroll viewports, separators) are defined in `@effect-native/opentui-base`. This document covers only registry distribution and composed widget requirements.

---

## Registry Requirements

### FR-REG-001: Registry JSON Schema Compliance
The registry shall publish a `registry.json` file conforming to the Shadcn registry schema (`https://ui.shadcn.com/schema/registry.json`).

### FR-REG-002: Registry Item Schema Compliance
Each component shall publish a `registry-item.json` file conforming to the Shadcn registry-item schema (`https://ui.shadcn.com/schema/registry-item.json`).

### FR-REG-003: Registry Endpoint
The registry shall be accessible via HTTP at a public URL (e.g., `https://opentui.dev/r/`).

### FR-REG-004: CLI Installation
**When** a user runs `npx shadcn add <component-url>`  
**Then** the component source files shall be copied into the user's project.

### FR-REG-005: Registry Dependencies Declaration
Each registry item shall declare its `registryDependencies` (other registry items it requires).

### FR-REG-006: NPM Dependencies Declaration
Each registry item shall declare its `dependencies` (npm packages it requires).

### FR-REG-007: Base Primitive Dependency
All styled components shall declare `@effect-native/opentui-base` as a dependency.

### FR-REG-008: File Type Classification
Each file in a registry item shall be classified by type:
- `registry:component` for React components
- `registry:hook` for custom hooks
- `registry:lib` for utility functions
- `registry:ui` for primitive UI components

### FR-REG-009: Flat Registry Structure
The registry shall use a flat structure with all items at the root level (no nested directories in the JSON payload).

### FR-REG-010: Registry Metadata
The registry shall include `name`, `homepage`, and `items` fields in the root `registry.json`.

### FR-REG-011: Component Categories
Each registry item shall specify `categories` for organization (e.g., `["navigation", "list"]`).

### FR-REG-012: Component Documentation
Each registry item shall include a `description` field suitable for LLM consumption.

---

## Column Browser Requirements

The column browser is a composed widget that uses base primitives to implement Miller column navigation.

### FR-COL-001: Column Rendering
The column browser shall render one column per level of the navigation path.

### FR-COL-002: Right Arrow Navigation
**When** the user presses Arrow Right or `l` on an item with children  
**Then** the column browser shall push a new column showing that item's children.

### FR-COL-003: Left Arrow Navigation
**When** the user presses Arrow Left or `h` and more than one column is displayed  
**Then** the column browser shall pop the rightmost column.

### FR-COL-004: Dot Navigation Item Skipping
**When** navigating via Arrow Right  
**Then** the column browser shall skip dot-navigation items.

### FR-COL-005: Preview Pane for Items with Children
**While** the highlighted item has children  
**Then** the column browser shall display a preview of those children.

### FR-COL-006: Preview Pane for Leaf Items
**While** the highlighted item has no children and content preview is available  
**Then** the column browser shall display the content preview.

### FR-COL-007: Selection History Persistence
**When** the user navigates back to a previously visited column  
**Then** the column browser shall restore the previously selected index.

### FR-COL-008: Multi-Select Toggle
**When** the user presses Space on an item  
**Then** the column browser shall toggle that item's multi-selection state.

### FR-COL-009: Enter Key Context Menu
**When** the user presses Enter on an item  
**Then** the column browser shall invoke the context callback with focused and selected items.

### FR-COL-010: Mouse Click on Folder
**When** the user clicks on an item with children  
**Then** the column browser shall drill into that item.

### FR-COL-011: Mouse Click on Leaf
**When** the user clicks on an item without children  
**Then** the column browser shall select that item.

### FR-COL-012: Adaptive Column Width
The column browser shall calculate each column's width based on content, within configured limits.

### FR-COL-013: Horizontal Scroll for Many Columns
**While** the number of columns exceeds the visible maximum  
**Then** the column browser shall scroll to keep the active column visible.

### FR-COL-014: Data Provider Injection
The column browser shall accept hierarchical data through a service interface.

### FR-COL-015: Active State Control
**While** the component is inactive  
**Then** the column browser shall ignore keyboard input.

---

## File Browser Requirements

The file browser is a domain-specific widget that composes the column browser with file system integration.

### FR-FILE-001: FileSystem Integration
The file browser shall use a file system service for all operations.

### FR-FILE-002: Directory Listing
**When** a directory is expanded  
**Then** the file browser shall fetch and display its contents.

### FR-FILE-003: File Type Icons
The file browser shall render distinct visual indicators for files versus directories.

### FR-FILE-004: Hidden File Filtering
The file browser shall support showing or hiding hidden files.

### FR-FILE-005: File Content Preview
**While** a file is highlighted  
**Then** the file browser shall display a content preview if available.

### FR-FILE-006: Root Path Configuration
The file browser shall accept an initial root path and support changing it via navigation.

### FR-FILE-007: Path Display
The file browser shall display the current path.

### FR-FILE-008: Dot Navigation Items
The file browser shall include `.` and `..` entries in directory listings.

### FR-FILE-009: Error Handling
**If** a file system operation fails  
**Then** the file browser shall display an error message without crashing.

---

## Testing Harness Requirements

### FR-TEST-001: PTY Spawn
The testing harness shall spawn a subprocess with a pseudo-terminal attached.

### FR-TEST-002: Terminal Dimensions
**When** creating a terminal  
**Then** the testing harness shall allow configuration of columns and rows.

### FR-TEST-003: Key Press Simulation
**When** pressKey is called  
**Then** the testing harness shall write the appropriate escape sequence to the terminal.

### FR-TEST-004: Arrow Key Support
The testing harness shall support sending arrow keys with optional modifiers.

### FR-TEST-005: Special Key Support
The testing harness shall support sending Enter, Escape, Tab, Backspace, Delete, Home, End, and function keys.

### FR-TEST-006: Modifier Key Support
The testing harness shall support ctrl, meta/alt, and shift modifiers.

### FR-TEST-007: Text Typing
**When** typeText is called  
**Then** the testing harness shall send each character sequentially.

### FR-TEST-008: Frame Capture
The testing harness shall capture the terminal buffer with escape codes stripped.

### FR-TEST-009: Raw Frame Capture
The testing harness shall optionally capture frames with escape codes preserved.

### FR-TEST-010: Content Waiting
**When** waitForContent is called with a predicate  
**Then** the testing harness shall poll until the predicate matches or timeout.

### FR-TEST-011: Frame Stabilization
**When** waitForFrame is called  
**Then** the testing harness shall wait until no new output for a specified duration.

### FR-TEST-012: Content Assertion
The testing harness shall provide assertion helpers for terminal content.

### FR-TEST-013: Row-Level Assertions
The testing harness shall support assertions on specific terminal rows.

### FR-TEST-014: Process Exit Handling
**When** the spawned process exits  
**Then** the testing harness shall capture the exit code.

### FR-TEST-015: Terminal Resize
**When** resize is called  
**Then** the testing harness shall update dimensions and signal the child process.

### FR-TEST-016: Frame Diffing
The testing harness shall provide a function to diff two captured frames.

---

## Platform Export Requirements

### FR-PLAT-001: Main Export Platform-Agnostic
The main registry export shall not include platform-specific code.

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
The registry shall include AGENTS.md with instructions for AI agents.

### FR-DOC-002: VT-HIG.md in Package
The registry shall include VT-HIG.md with the specification.

### FR-DOC-003: Package Files Configuration
The documentation files shall be included in the published registry.

---

## Non-Functional Requirements

### NFR-001: VT-HIG Compliance
All styled components shall follow VT-HIG patterns.

### NFR-002: Base Primitive Usage
Styled components shall build on `@effect-native/opentui-base` primitives.

### NFR-003: Platform-Specific Code Isolation
Platform-specific code shall be isolated to subpath exports.

### NFR-004: TypeScript Types
All exports shall include TypeScript types.

### NFR-005: Portable Rendering
Components shall not assume specific terminal capabilities; enhanced features shall degrade gracefully.

### NFR-006: Zero-Friction Default Usage
Platform subpath imports shall work without touching Effect-TS or service configuration.

### NFR-007: Effect-Atom Interoperability
Components shall expose atoms for advanced integration.

---

## Constraints

### CON-001: React Dependency
UI components require React 18+.

### CON-002: OpenTUI Dependency
UI components require @opentui/react.

### CON-003: Base Dependency
UI components require @effect-native/opentui-base.

### CON-004: Effect Version
All packages require Effect 3.x.

### CON-005: No forwardRef
Components shall use React 19's ref-as-prop pattern.

### CON-006: Bun Runtime for Testing
The testing harness requires Bun runtime.
