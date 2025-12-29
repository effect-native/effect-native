---
title: "Impl: Style Bridge"
status: in_progress
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/bridge/style-bridge.ts
  - path: packages-native/opentui-dom/src/bridge/tailwind-mapper.ts
done_when: |
  Unit tests pass for style extraction
  Tailwind classes map to TUI props
---

# Impl: Style Bridge

Implement the `StyleBridge` and `tailwind-mapper`.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/style-bridge.ts`
*   **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/tailwind-mapper.ts`
*   **Research:** `work/tui-browser/tui-dom-poc0/.research/css-mapping/tailwind-mapping-notes.md`

## Tasks
1. [x] Create package structure for `packages-native/opentui-dom`
2. [x] Port `tailwind-mapper.ts` (80/20 rule for classes)
3. [x] Port `style-bridge.ts` (Class extraction, data-attribute overrides)
4. [x] Write unit tests
5. [ ] Git commit changes

## Progress Log

### 2025-12-29 - Initial Implementation
- Created `packages-native/opentui-dom/` package structure
- Ported `tailwind-mapper.ts` with TuiStyleProps interface and mapping functions
- Ported `style-bridge.ts` with StyleBridge interface and data-attribute handling
- Created comprehensive unit tests for both modules
