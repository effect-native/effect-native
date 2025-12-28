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

Extract the brancher-tui patterns into multiple focused packages:

1. **@effect-native/opentui-react-list** — VT-HIG compliant selectable list with type-to-filter
2. **@effect-native/opentui-react-columns** — Generic Miller columns browser component with Effect-TS dependency injection for hierarchical data sources
3. **@effect-native/opentui-react-dialogs** — Modal overlay components (menus, search, forms)
4. **@effect-native/opentui-react-files** — File browser built on opentui-react-columns with `@effect/platform` FileSystem integration
5. **@effect-native/tui-test** — PTY-based testing harness for TUI applications (Bun-specific)

Each package should:
- Be independently installable
- Have clear peer dependencies on `@opentui/react` and `react`
- Follow the `@effect-native/*` package conventions
- Provide TypeScript types for all public APIs
- Support both keyboard and mouse/touch input (mouse is not optional)

## In Scope

- `@effect/platform` integration for file system operations
- File browser specifics in dedicated `opentui-react-files` package
- Mouse/touch support (required, not optional)
- Idiomatic Effect-TS dependency injection for data providers

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
@effect-native/opentui-react-list (no internal deps, peer: @opentui/react, effect)
       |
       v
@effect-native/opentui-react-columns (uses opentui-react-list, peer: @opentui/react, effect)
       |                              (Effect-TS dependency injection for data providers)
       v
@effect-native/opentui-react-dialogs (uses opentui-react-list logic, peer: @opentui/react)
       |
       v
@effect-native/opentui-react-files (uses opentui-react-columns, peer: @opentui/react, @effect/platform)
                                   (provides FileSystem-based data provider)

@effect-native/tui-test (standalone, Bun-only, peer: effect)
                        (uses Bun.Terminal PTY for end-to-end TUI testing)
```

## Data Provider Pattern (opentui-react-columns)

The column browser accepts hierarchical data sources via Effect-TS dependency injection. This allows:
- File system browsers (via `@effect/platform` FileSystem)
- Database browsers
- API-backed tree explorers
- In-memory data structures

The data provider is expressed as an Effect service that implements a standard interface for fetching children, checking if an item has children, etc.
