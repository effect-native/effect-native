---
title: "Impl: Miniapp Implementation"
status: complete
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/poc/miniapp.tsx
  - path: packages-native/opentui-dom/poc/miniapp.html
  - path: packages-native/opentui-dom/test/miniapp.test.ts
done_when: |
  Miniapp runs and demonstrates all features
---

# Impl: Miniapp Implementation

Create the validation app.

## Context
*   **Reference:** `work/tui-browser/tui-dom-poc0/poc/form-demo.tsx`

## Tasks
1. [x] Create `miniapp.tsx` using @effect-native/opentui-dom components.
2. [x] Create `miniapp.html` entry point.
3. [x] Ensure it uses the new `@effect-native/opentui-dom` package.
4. [x] Write basic tests.
5. [x] Update package.json with `tui-dom` script.

## Implementation Summary

### Files Created

1. **`packages-native/opentui-dom/poc/miniapp.tsx`**
   - Full interactive TUI form demo
   - Uses `@effect-native/opentui-dom` package (createEventRelay, createNodeMap)
   - Demonstrates:
     - Text inputs (Name, Email)
     - Textarea (Comments)
     - Checkboxes (Newsletter, Terms)
     - Radio group with roving tabindex (Priority: Low/Medium/High)
     - Select dropdown (Country)
     - Dialog/modal with focus trapping
     - Submit/Reset buttons with accesskeys

2. **`packages-native/opentui-dom/poc/miniapp.html`**
   - HTML reference design for the TUI miniapp
   - Styled to match TUI appearance
   - Includes interactive JavaScript for preview

3. **`packages-native/opentui-dom/test/miniapp.test.ts`**
   - 12 tests covering:
     - NodeMap bidirectional mapping
     - EventRelay Tab/Shift+Tab navigation
     - Text input handling
     - Accesskey shortcuts
     - Focus trap activation/deactivation
     - Checkbox toggle with Space
     - Radio group arrow navigation
   - All tests pass

### Package.json Updates

Added to `packages-native/opentui-dom/package.json`:
- Script: `"tui-dom": "bun run poc/miniapp.tsx"`
- DevDependencies: `@opentui/core`, `react`, `react-dom`, `@types/react`, `@types/react-dom`

## Keyboard Controls

| Key | Action |
|-----|--------|
| Tab / Shift+Tab | Navigate between elements |
| Space | Toggle checkbox, check radio, activate button |
| Enter | Activate button, confirm dialog |
| Arrow Up/Down | Navigate radio group or select options |
| Backspace | Delete character in text fields |
| Alt+N | Focus Name input |
| Alt+E | Focus Email input |
| Alt+D | Open dialog |
| Alt+S | Submit form |
| Alt+R | Reset form |
| Escape | Close dialog |
| Ctrl+C | Exit |

## Running the Miniapp

```bash
cd packages-native/opentui-dom
pnpm tui-dom
```

Or directly:
```bash
bun run poc/miniapp.tsx
```

## Test Results

```
 ✓ test/miniapp.test.ts (12 tests) 15ms
   ✓ NodeMap > maps DOM nodes to renderables bidirectionally
   ✓ NodeMap > handles multiple elements
   ✓ EventRelay > attaches and detaches from renderer
   ✓ EventRelay > handles Tab navigation between form elements
   ✓ EventRelay > handles Shift+Tab for reverse navigation
   ✓ EventRelay > handles text input in form fields
   ✓ EventRelay > handles accesskey shortcuts
   ✓ Focus Trap > constrains Tab navigation to dialog when active
   ✓ Focus Trap > releases focus trap on Escape
   ✓ Form Controls > handles checkbox toggle with Space
   ✓ Form Controls > handles radio group arrow navigation
   ✓ Form Controls > handles select navigation with Arrow keys
```

## Basis

- Followed pattern from `work/tui-browser/tui-dom-poc0/poc/form-demo.tsx`
- Used requirements from `.specs/tui-dom/requirements.md`
- Integrated with existing `@effect-native/opentui-dom` bridge components:
  - `createEventRelay` - keyboard event relay from TUI to DOM
  - `createNodeMap` - bidirectional DOM<->Renderable mapping
