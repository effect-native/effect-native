---
title: "Impl: Core Bridge (DOMToTUI)"
status: complete
blocked_by:
  - .tasks/impl/dom-adapter.md
  - .tasks/impl/style-bridge.md
artifacts:
  - path: packages-native/opentui-dom/src/bridge/node-map.ts
  - path: packages-native/opentui-dom/src/bridge/dom-to-tui-bridge.ts
  - path: packages-native/opentui-dom/test/dom-to-tui-bridge.test.ts
done_when: |
  Unit tests pass for mutation handling
  DOM changes trigger TUI updates
---

# Impl: Core Bridge

Implement `NodeMap` and the main `DOMToTUIBridge` class.

## Context

- **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/bridge/node-map.ts`
- **Source:** `work/tui-browser/tui-dom-poc0/src/tui-renderer.ts` (Logic needs extraction)

## Tasks

1. [x] Port `node-map.ts` (WeakMap implementation) - ALREADY DONE
2. [x] Implement `DOMToTUIBridge` class (MutationObserver loop)
3. [x] Wire up `StyleBridge` for attribute mutations
4. [x] Write unit tests for mutation handling

## Basis

- NodeMap already exists at `packages-native/opentui-dom/src/bridge/node-map.ts`
- StyleBridge exists at `packages-native/opentui-dom/src/bridge/style-bridge.ts`
- EventRelay exists at `packages-native/opentui-dom/src/bridge/event-relay.ts`
- TailwindMapper exists at `packages-native/opentui-dom/src/bridge/tailwind-mapper.ts`
- DOMAdapter exists at `packages-native/opentui-dom/src/DOMAdapter.ts`

## Implementation Summary

### `DOMToTUIBridge` (`dom-to-tui-bridge.ts`)

Core bridge that observes DOM mutations via MutationObserver and syncs to TUI Renderables:

**Features:**

- Observes childList, characterData, and attributes mutations
- Creates TUI Renderables (via RenderableFactory) for new DOM nodes
- Updates existing Renderables when DOM nodes change (text content, attributes)
- Removes Renderables when DOM nodes are removed
- Applies styles via StyleBridge for className/data-tui-* attribute changes
- Accepts custom `window` parameter for MutationObserver (for happy-dom compatibility)

**API:**

```ts
interface DOMToTUIBridge {
  observe(container: Element): void
  disconnect(): void
  readonly nodeMap: NodeMap
  processExistingChildren(container: Element): void
}

function createDOMToTUIBridge(options: DOMToTUIBridgeOptions): DOMToTUIBridge
```

**Options:**

- `factory`: RenderableFactory - creates box/text renderables
- `root`: TUIContainer - root container for elements
- `window?`: WindowLike - for MutationObserver constructor (defaults to globalThis)
- `nodeMap?`: NodeMap - custom instance (defaults to new)
- `styleBridge?`: StyleBridge - custom instance (defaults to new)
- `debug?`: boolean - enable logging

### Unit Tests (19 tests, all passing)

- observe() starts observing mutations
- observe() handles multiple observations by disconnecting previous
- disconnect() stops observing
- disconnect() is safe to call multiple times
- childList: creates box for elements
- childList: creates text for text nodes
- childList: skips empty text nodes
- childList: removes renderables on node removal
- childList: handles nested structures
- childList: handles element with text content
- characterData: updates text content
- attributes: re-applies styles on class change
- attributes: re-applies styles on data-tui-* change
- nodeMap: provides access
- nodeMap: allows reverse lookup
- processExistingChildren: processes pre-existing children
- processExistingChildren: doesn't duplicate
- style: applies tailwind classes
- style: applies data-tui-* attributes

## Status: COMPLETE

All unit tests pass (194 total in opentui-dom package).
