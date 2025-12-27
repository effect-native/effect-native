# @effect-native/opentui-react-* — Instructions

## Context

The brancher-tui project at `b-rancher/brancher-tui/brancher/` contains a sophisticated terminal UI implementation built on `@opentui/react`. The key component is a Miller columns browser (`demo-column-browser.tsx`) with:

1. **GenericColumnBrowser** — A reusable data-agnostic column browser component
2. **SelectableList** — VT-HIG compliant list with type-to-filter
3. **Task management** — YAML frontmatter parsing for `.tasks/` folders
4. **Action scripts** — Custom action loading from `.brancher/actions/`
5. **Modal dialogs** — Context menus, deep search, feedback forms

These components have been built incrementally and are tightly coupled to the file browser use case. The patterns are generally reusable but need extraction into focused packages.

## User Story

As a developer building terminal UIs with `@opentui/react`, I want pre-built components for common patterns like column browsers, selectable lists, and modal dialogs, so that I can compose them into custom applications without reimplementing navigation and keyboard handling.

## High-Level Goals

Extract the brancher-tui patterns into multiple focused packages:

1. **@effect-native/opentui-react-list** — VT-HIG compliant selectable list with type-to-filter
2. **@effect-native/opentui-react-columns** — Generic Miller columns browser component
3. **@effect-native/opentui-react-dialogs** — Modal overlay components (menus, search, forms)
4. **@effect-native/action-scripts** — Custom action script discovery and execution (no OpenTUI dep)
5. **@effect-native/opentui-react-task-graph** — DAG-based task viewing (goals, blockers, entrypoints)

Each package should:
- Be independently installable
- Have clear peer dependencies on `@opentui/react` and `react` (except action-scripts)
- Follow the `@effect-native/*` package conventions
- Provide TypeScript types for all public APIs

## Out of Scope

- File system operations (use `@effect/platform` FileSystem)
- File browser specifics (demo app concern, not library)
- Bun-specific APIs in core packages (keep portable)
- Dark/light theme support (OpenTUI concern)
- Mouse/touch input (keyboard-first TUI)
- Testing utilities (separate package later)

## Source References

- Column browser: `work/b-rancher/brancher-tui/brancher/demo-column-browser.tsx`
- Generic browser: `work/b-rancher/brancher-tui/brancher/src/components/GenericColumnBrowser.tsx`
- Selectable list: `work/b-rancher/brancher-tui/brancher/src/components/SelectableList.tsx`
- List logic: `work/b-rancher/brancher-tui/brancher/src/selectableListLogic.ts`
- Context menu: `work/b-rancher/brancher-tui/brancher/src/components/ContextMenu.tsx`
- Deep search: `work/b-rancher/brancher-tui/brancher/src/components/DeepSearch.tsx`
- Action scripts: `work/b-rancher/brancher-tui/brancher/src/components/actionScripts.ts`
- DAG view: `work/b-rancher/brancher-tui/brancher/src/components/DAGColumnView.tsx`

## Dependencies Analysis

```
@effect-native/opentui-react-list (no internal deps, peer: @opentui/react)
       |
       v
@effect-native/opentui-react-columns (uses opentui-react-list, peer: @opentui/react)
       |
       v
@effect-native/opentui-react-dialogs (uses opentui-react-list logic, peer: @opentui/react)
       |
       v
@effect-native/action-scripts (standalone, no OpenTUI dep, Bun-optional)
       |
       v
@effect-native/opentui-react-task-graph (uses opentui-react-columns, peer: @opentui/react)
```
