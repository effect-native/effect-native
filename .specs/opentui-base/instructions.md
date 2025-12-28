# @effect-native/opentui-base — Instructions

## Context

We are creating a new package `@effect-native/opentui-base` to serve as the "headless" primitive layer for TUI applications. This package acts as the **Radix UI / Base UI equivalent** for the terminal, enabling a downstream "Shadcn-like" registry (`@effect-native/opentui-components`) to distribute styled, copy-pasteable components without duplicating low-level logic.

Currently, developers building TUI applications with `@opentui/react` must implement complex interaction patterns from scratch:
- Focus management and modal layering
- Keyboard navigation with vim-style and arrow key bindings
- Mouse click handling
- Selection state (single and multi-select)
- Type-to-filter and search
- Scroll viewport management

The `brancher-tui` project has implemented these patterns but they are tightly coupled to the file browser use case. This package extracts the generic primitives.

## User Story

As a developer building TUI interfaces with `@opentui/react`, I want a set of **headless, unstyled primitives** (Listbox, Menu, Dialog, Combobox) that match the API patterns of standard web primitives, so that I can:
1. Easily adapt Shadcn/web component patterns to the terminal
2. Build robust TUI applications with consistent keyboard/mouse interaction
3. Focus on styling and business logic rather than low-level interaction code

## High-Level Goals

- **Package Creation:** Establish `@effect-native/opentui-base` in the monorepo under `packages-native/`
- **Base UI API Parity:** Implement primitives with APIs inspired by `@refs/base-ui`:
  - **Listbox:** Selection logic for navigable lists (single/multi-select, keyboard nav, scroll)
  - **Menu:** Context menus and dropdowns with keyboard shortcuts
  - **Dialog:** Modal handling with focus trapping
  - **Combobox:** Search/filtering with async result loading
  - **ScrollArea:** Viewport scrolling management
  - **Separator:** Visual dividers
- **Compound Component Pattern:** Use the Base UI compound component pattern (Root, Trigger, Content, Item, etc.)
- **VT-HIG Strictness:** Enforce VT-HIG compliance at the primitive level
- **Registry Ready:** Expose the slots, refs, and render props needed by downstream styled components

## Normative References

- **VT-HIG (Virtual Terminal Human Interface Guidelines):** Keyboard contracts, TUI patterns, accessibility
- **Base UI Documentation:** API patterns and compound component structure
- **Shadcn Registry Spec:** How primitives are consumed by registry components

## Out of Scope

- **Visual Styling:** No borders, colors, or ASCII art (belongs in `opentui-components` registry)
- **Registry Implementation:** Building `registry.json` or CLI tools (belongs in `opentui-components`)
- **Data Fetching:** No direct file system or network code; strict UI logic only
- **Platform-Specific Code:** All primitives are platform-agnostic (Node/Bun/etc via OpenTUI)
- **Higher-Level Widgets:** Tables, Trees, Forms (unless strictly composed from primitives)
