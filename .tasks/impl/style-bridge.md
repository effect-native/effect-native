---
title: "Impl: Style Bridge"
status: done
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/bridge/style-bridge.ts
  - path: packages-native/opentui-dom/src/bridge/tailwind-mapper.ts
  - path: packages-native/opentui-dom/test/style-bridge.test.ts
  - path: packages-native/opentui-dom/test/tailwind-mapper.test.ts
done_when: |
  Unit tests pass for style extraction
  Tailwind classes map to TUI props
basis: |
  57 unit tests pass (33 for tailwind-mapper, 24 for style-bridge)
  All done_when criteria met
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
5. [x] Git commit changes

## Progress Log

### 2025-12-29 - Implementation Complete
- Created `packages-native/opentui-dom/` package structure
- Ported `tailwind-mapper.ts` with TuiStyleProps interface and mapping functions:
  - Flex layout (direction, wrap, grow/shrink)
  - Alignment (justify-content, align-items, align-self)
  - Spacing (padding, margin, gap with px/py/mx/my shorthand)
  - Sizing (width, height, min/max variants, fractions)
  - Colors (full Tailwind palette: slate, gray, zinc, red, orange, yellow, green, blue, purple, pink, cyan)
  - Borders (style, width, color, sides)
  - Typography (bold, italic, underline, strikethrough)
  - Visibility (hidden, overflow)
  - Position (static, relative, absolute, top/right/bottom/left)
  - Z-index and opacity
- Ported `style-bridge.ts` with StyleBridge interface:
  - Extracts className from elements
  - Passes through tailwindToTui() for conversion
  - Handles data-tui-* attributes for direct property overrides
  - Maps shadcn theme classes (bg-background, text-foreground, etc.) to CSS variable defaults
  - Resolves CSS var() references
- Created comprehensive unit tests (57 tests total)
- Updated index.ts with module exports
- Fixed TypeScript issues with exactOptionalPropertyTypes
- Fixed pattern matching order for gap-x/gap-y classes
