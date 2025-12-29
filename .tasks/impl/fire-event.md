---
title: "Impl: Fire Event"
status: done
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom-testing-library/src/events.ts
  - path: packages-native/opentui-dom-testing-library/test/events.test.ts
done_when: |
  fireEvent.keyDown works
  fireEvent.click works
---

# Impl: Fire Event

Port the `fireEvent` utilities.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/src/testing/events.ts`

## Tasks
1.  [x] Port `events.ts`.
2.  [x] Ensure key codes match what `EventRelay` expects.

## Completed

### Implementation
Ported fire event utilities from `work/tui-browser/tui-dom-poc0/src/testing/events.ts` to `packages-native/opentui-dom-testing-library/src/events.ts`.

### Key Features
- **`fireEvent.keyDown(element, keyOrInit, modifiers?)`** - Dispatches keydown events
  - Supports string key: `fireEvent.keyDown(el, 'Enter')`
  - Supports init object: `fireEvent.keyDown(el, { key: 'Enter', ctrlKey: true })`
  - Supports modifiers: `fireEvent.keyDown(el, 'c', { ctrl: true })`
  
- **`fireEvent.click(element)`** - TUI-style click (Enter keypress + click event)
  - Matches EventRelay behavior where Enter key triggers click

- **Additional utilities:**
  - `fireEvent.keyUp` - Keyup events
  - `fireEvent.keyPress` - keydown + keyup combo
  - `fireEvent.type` - Type text with special keys like `{enter}`, `{backspace}`
  - `fireEvent.tab` - Tab navigation between focusable elements
  - `fireEvent.focus` / `fireEvent.blur` - Focus management
  - `fireEvent.change` - Input value changes (React-compatible)
  - `fireEvent.dblClick` - Double-click
  - `fireEvent.scroll` - Scroll events

- **`createEvent`** - Low-level event creation utilities

### Key Code Compatibility
Key codes match EventRelay expectations:
- Arrow keys: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`
- Special keys: `Enter`, `Tab`, `Escape`, `Backspace`, `Delete`, `Home`, `End`, `PageUp`, `PageDown`
- Letters: `KeyA`-`KeyZ` (code format)
- Numbers: `Digit0`-`Digit9` (code format)

### Test Results
All 26 tests pass:
- keyDown: 6 tests (string key, init object, letter codes, number codes, modifiers, arrow keys)
- keyUp: 1 test
- keyPress: 1 test
- click: 2 tests (event order, handler triggering)
- focus/blur: 2 tests
- change: 2 tests
- type: 3 tests (characters, special keys, backspace)
- tab: 3 tests (forward, backward, wrap)
- dblClick: 1 test
- scroll: 1 test
- createEvent: 4 tests

### Files Created/Modified
- `packages-native/opentui-dom-testing-library/src/events.ts` - Main implementation
- `packages-native/opentui-dom-testing-library/src/index.ts` - Updated exports
- `packages-native/opentui-dom-testing-library/test/events.test.ts` - Unit tests
- `packages-native/opentui-dom-testing-library/vitest.config.ts` - Added happy-dom environment
