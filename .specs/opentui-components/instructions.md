# @effect-native/opentui-react-* — Instructions

## Context

The brancher-tui project at `b-rancher/brancher-tui/brancher/` contains a sophisticated terminal UI implementation built on `@opentui/react`. The key component is a Miller columns browser (`demo-column-browser.tsx`) with:

1. **GenericColumnBrowser** — A reusable data-agnostic column browser component
2. **SelectableList** — VT-HIG compliant list with type-to-filter
3. **Task management** — YAML frontmatter parsing for `.tasks/` folders
4. **Modal dialogs** — Context menus, deep search, feedback forms

These components have been built incrementally and are tightly coupled to the file browser use case. The patterns are generally reusable but need extraction into focused packages.

## User Story

As a developer building terminal UIs with `@opentui/react`, I want pre-built components for common patterns like column browsers, selectable lists, and modal dialogs, so that I can compose them into custom applications without reimplementing navigation, keyboard handling, and mouse support.

## High-Level Goals

Extract the brancher-tui patterns into a single package:

**@effect-native/opentui-react** — VT-HIG compliant TUI components and testing utilities:
- SelectableList with type-to-filter
- GenericColumnBrowser (Miller columns) with Effect-TS dependency injection
- Modal dialogs (context menus, deep search)
- FileBrowser with `@effect/platform` FileSystem integration
- PTY-based testing harness for TUI applications (Bun-specific subpath export)

Each package should:
- Follow the `@effect-native/*` package conventions
- Provide TypeScript types for all public APIs
- Support both keyboard and mouse/touch input (mouse is not optional)

## In Scope

- `@effect/platform` integration for file system operations
- Mouse/touch support (required, not optional)
- Idiomatic Effect-TS dependency injection for data providers
- AGENTS.md and VT-HIG.md included in npm package for agent context

## Normative Reference

**VT-HIG (Virtual Terminal Human Interface Guidelines)** — All components, specs, and tests are written against the VT-HIG specification. The VT-HIG defines:
- Keyboard contracts (universal keys, list navigation, vim-style alternatives)
- TUI patterns (navigation, input, feedback, safety)
- Accessibility guidelines (screen reader, low-vision, motor/fatigue)
- Signal handling expectations (SIGWINCH, SIGINT, SIGTERM)
- Redraw strategies (full vs surgical)
- Portability requirements (minimum vs enhanced substrate)
- Anti-patterns to avoid

See: `work/vt-hig/vt_hig_cheat_sheet_html_react/index.tsx` and `work/vt-hig/VT-HIG v0.3.pdf`

## Agent Documentation

The npm package includes documentation files to help AI agents understand and use the package:

- **AGENTS.md** — Agent-specific instructions for using and extending the components
- **VT-HIG.md** — The VT-HIG specification that all components conform to

These files are included in the published package (not just the repo) so agents working in downstream projects can access the context they need.

## Out of Scope

- Bun-specific APIs in core UI packages (keep portable; tui-test is Bun-only by design)
- Dark/light theme support (OpenTUI concern)

## Source References

- Column browser: `work/b-rancher/brancher-tui/brancher/demo-column-browser.tsx`
- Generic browser: `work/b-rancher/brancher-tui/brancher/src/components/GenericColumnBrowser.tsx`
- Selectable list: `work/b-rancher/brancher-tui/brancher/src/components/SelectableList.tsx`
- List logic: `work/b-rancher/brancher-tui/brancher/src/selectableListLogic.ts`
- Context menu: `work/b-rancher/brancher-tui/brancher/src/components/ContextMenu.tsx`
- Deep search: `work/b-rancher/brancher-tui/brancher/src/components/DeepSearch.tsx`
- VT-HIG cheat sheet: `work/vt-hig/vt_hig_cheat_sheet_html_react/index.tsx`
- OpenTUI test utils: `refs/opentui/packages/react/src/test-utils.ts`
- OpenTUI core testing: `refs/opentui/packages/core/src/testing/`

## Dependencies Analysis

```
@effect-native/opentui-react (peer: @opentui/react, react, effect, @effect/platform)
    - SelectableList
    - GenericColumnBrowser (uses SelectableList)
    - ContextMenu, DeepSearch (use list logic)
    - FileBrowser (uses GenericColumnBrowser + @effect/platform FileSystem)
    - testing/ (PTY-based test harness, Bun-only, subpath: @effect-native/opentui-react/testing)
```

## Data Provider Pattern (opentui-react-columns)

The column browser accepts hierarchical data sources via Effect-TS dependency injection. This allows:
- File system browsers (via `@effect/platform` FileSystem)
- Database browsers
- API-backed tree explorers
- In-memory data structures

The data provider is expressed as an Effect service that implements a standard interface for fetching children, checking if an item has children, etc.
