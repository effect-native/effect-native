# Plan: TUI DOM

This plan outlines the extraction and implementation of the `@effect-native/opentui-dom` package.

## Phase 1: Core Bridge Extraction

- [ ] **DOM Adapter**: Implement `HappyDOMAdapter` to abstract DOM operations. (Ref: `packages/opentui-dom/src/DOMAdapter.ts`, `packages/opentui-dom/src/TestAdapter.ts`)
- [ ] **Style Bridge**: Port Tailwind mapper and style extraction logic. (Ref: `packages/opentui-dom/src/bridge/style-bridge.ts`, `packages/opentui-dom/src/bridge/tailwind-mapper.ts`)
- [ ] **Theme Map**: Port color mapping logic. (Ref: `packages/opentui-dom/src/bridge/theme-map.ts`)
- [ ] **Node Map**: Port WeakMap logic for DOM<->TUI linking. (Ref: `packages/opentui-dom/src/bridge/node-map.ts`)
- [ ] **Event Relay**: Port input handling and focus management. (Ref: `packages/opentui-dom/src/bridge/event-relay.ts`)
- [ ] **Core Bridge**: Assemble the `DOMToTUIBridge` class. (Ref: `packages/opentui-dom/src/bridge/dom-to-tui-bridge.ts`)

## Phase 2: Package Assembly

- [ ] Create `packages/opentui-dom/package.json`.
- [ ] Export main entry point.
- [ ] Verify build.

## Phase 3: Validation

- [ ] Validate with Miniapp (See `.specs/tui-dom-testing/plan.md` for testing strategy).
