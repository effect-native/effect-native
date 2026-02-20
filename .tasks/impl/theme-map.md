---
title: "Impl: Theme Map"
status: done
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/bridge/theme-map.ts
  - path: packages-native/opentui-dom/test/theme-map.test.ts
done_when: |
  Unit tests pass for color conversion
  Can resolve shadcn CSS vars to hex
---

# Impl: Theme Map

Implement the `ThemeMap` for resolving shadcn CSS variables.

## Context

- **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/theme-map.ts`

## Tasks

1. [x] Port `theme-map.ts`.
2. [x] Ensure `oklch` to `hex` conversion works.
3. [x] Implement `lightTheme` and `darkTheme` defaults.
4. [x] Write unit tests for color conversion.

## Completion Summary

### Implemented

- **theme-map.ts** (`packages-native/opentui-dom/src/bridge/theme-map.ts`): Full port from tui-dom-poc0
  - `oklchToHex(l, c, h)`: Converts oklch color space to hex via oklab -> linear sRGB -> sRGB
  - `hslToHex(h, s, l)`: Converts HSL to hex
  - `cssColorToHex(cssValue)`: Parses CSS color strings (hex, oklch(), hsl())
  - `lightTheme` / `darkTheme`: Pre-computed shadcn default theme maps
  - Theme state management: `getThemeColor`, `getTheme`, `setThemeMode`, `getThemeMode`
  - Custom themes: `createTheme`, `applyTheme`
  - System preference detection: `detectSystemPreference`

### Tests

- **theme-map.test.ts** (`packages-native/opentui-dom/test/theme-map.test.ts`): 37 tests all passing
  - hslToHex: 8 tests (red, green, blue, white, black, gray, hue wrapping)
  - oklchToHex: 6 tests (white, black, gray, NaN hue, red-ish, blue-ish)
  - cssColorToHex: 9 tests (hex passthrough, 3-char expansion, oklch, oklch with alpha, hsl variants)
  - lightTheme/darkTheme: 6 tests (key presence, expected values)
  - Theme state management: 4 tests
  - createTheme/applyTheme: 3 tests
  - detectSystemPreference: 1 test

### Commit

`e28e1fc04` - feat(opentui-dom): implement theme-map for shadcn CSS variable resolution

## Basis

- Source file ported directly from `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/theme-map.ts`
- Package structure follows existing `@effect-native/*` patterns (e.g., `packages-native/schemas`)
- oklch conversion math uses standard oklab->sRGB matrix transformation
- All 37 unit tests pass (`npx vitest run test/theme-map.test.ts`)
