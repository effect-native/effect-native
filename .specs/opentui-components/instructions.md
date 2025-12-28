# @effect-native/opentui-react — Instructions

## Context

The brancher-tui project contains a sophisticated terminal UI implementation built on `@opentui/react`. Key patterns include a Miller columns browser, selectable lists with type-to-filter, and modal dialogs. These components are tightly coupled to the file browser use case and need extraction into a reusable package.

Developers building terminal UIs currently must reimplement navigation, keyboard handling, and mouse support from scratch. There's no standard way to build hierarchical browsers or modal overlays that follow consistent interaction patterns.

## User Story

As a developer building terminal UIs with `@opentui/react`, I want pre-built components for common patterns like column browsers, selectable lists, and modal dialogs, so that I can compose them into custom applications without reimplementing navigation, keyboard handling, and mouse support.

## High-Level Goals

- Extract brancher-tui patterns into a reusable package
- Provide VT-HIG compliant components that work consistently across terminals
- Support both keyboard and mouse input (mouse is required, not optional)
- Enable file browsing with platform-specific file system integration
- Provide PTY-based testing utilities for TUI applications
- Make components work out-of-the-box without requiring Effect-TS knowledge
- Allow advanced users to integrate with their own effect-atom setup
- Include AGENTS.md and VT-HIG.md in the npm package for downstream agent context

## Normative Reference

All components, specs, and tests are written against the **VT-HIG (Virtual Terminal Human Interface Guidelines)** specification, which defines keyboard contracts, TUI patterns, accessibility guidelines, and portability requirements.

## Out of Scope

- Dark/light theme support (OpenTUI concern)
- Rich text editing (focus is navigation and selection)
- DAG/task graph visualization
- Custom action script execution
