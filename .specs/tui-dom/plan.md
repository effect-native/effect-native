# Plan: TUI DOM

This plan outlines the extraction and implementation of the `@effect-native/opentui-dom` package.

## Phase 1: Core Bridge Extraction
*   [ ] **DOM Adapter**: Implement `HappyDOMAdapter` to abstract DOM operations. (Ref: `.tasks/impl/dom-adapter.md`)
*   [ ] **Style Bridge**: Port Tailwind mapper and style extraction logic. (Ref: `.tasks/impl/style-bridge.md`)
*   [ ] **Theme Map**: Port color mapping logic. (Ref: `.tasks/impl/theme-map.md`)
*   [ ] **Node Map**: Port WeakMap logic for DOM<->TUI linking. (Ref: `.tasks/impl/core-bridge.md`)
*   [ ] **Event Relay**: Port input handling and focus management. (Ref: `.tasks/impl/event-relay.md`)
*   [ ] **Core Bridge**: Assemble the `DOMToTUIBridge` class. (Ref: `.tasks/impl/core-bridge.md`)

## Phase 2: Package Assembly
*   [ ] Create `packages-native/opentui-dom/package.json`.
*   [ ] Export main entry point.
*   [ ] Verify build.

## Phase 3: Validation
*   [ ] Validate with Miniapp (See `.specs/tui-dom-testing/plan.md` for testing strategy).
