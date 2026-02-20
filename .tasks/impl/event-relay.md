---
title: "Impl: Event Relay"
status: done
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/bridge/event-relay.ts
  - path: packages-native/opentui-dom/src/bridge/node-map.ts
  - path: packages-native/opentui-dom/test/event-relay.test.ts
done_when: |
  Unit tests pass for event translation
  Focus navigation logic works
---

# Impl: Event Relay

Implement the `EventRelay` to translate TUI input to DOM events.

## Context

- **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/event-relay.ts`
- **Fixes:** Ensure fixes for Radio Groups (roving tabindex) and Accesskeys from `tui-dom-poc0` are included.

## Tasks

1. [x] Port `event-relay.ts`.
2. [x] Implement `activateFocusTrap` / `deactivateFocusTrap`.
3. [x] Implement `scrollIntoView` logic.
4. [x] Write unit tests for event translation and focus navigation.

## Implementation Summary

### Files Created/Modified

- `packages-native/opentui-dom/src/bridge/event-relay.ts` - Main event relay implementation
- `packages-native/opentui-dom/src/bridge/node-map.ts` - DOM<->TUI renderable mapping
- `packages-native/opentui-dom/test/event-relay.test.ts` - Unit tests (44 tests, all passing)
- `packages-native/opentui-dom/src/index.ts` - Updated exports

### Features Implemented

1. **Event Translation**: TUI KeyEvent -> DOM KeyboardEvent, MouseEvent, InputEvent
2. **Focus Navigation**: Tab/Shift+Tab navigation with wrap-around
3. **Focus Trap**: Modal dialogs can trap focus with Escape release
4. **Radio Groups**: Roving tabindex pattern with arrow key navigation
5. **Accesskeys**: Alt/Option+key focuses/clicks elements with accesskey attribute
6. **Text Input**: Character insertion, backspace, readline shortcuts (Ctrl+A/E/F/B/D/W/U/K, Alt+F/B/D)
7. **Scroll Into View**: Auto-scroll when focusing elements outside viewport

### Test Coverage

- 44 unit tests covering:
  - attach/detach lifecycle
  - event translation (enter, space, arrows, modifiers)
  - Tab/Shift+Tab focus navigation
  - focus trap activation/deactivation
  - radio group roving tabindex
  - accesskey support (option and meta modifiers)
  - text input handling
  - readline shortcuts
  - scroll into view
  - preventDefault integration

## Basis

- Ported from `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/event-relay.ts`
- All fixes from POC preserved including radio group handling and accesskey support
- Fixed `Node.DOCUMENT_POSITION_*` constants for happy-dom compatibility (use numeric values directly)
