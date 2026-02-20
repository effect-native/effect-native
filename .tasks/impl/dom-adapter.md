---
title: "Impl: DOM Adapter"
status: done
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom/src/DOMAdapter.ts
  - path: packages-native/opentui-dom/src/TestAdapter.ts
  - path: packages-native/opentui-dom/src/index.ts
  - path: packages-native/opentui-dom/test/DOMAdapter.test.ts
done_when: |
  Unit tests pass for DOMAdapter interface
  Happy-DOM implementation works
---

# Impl: DOM Adapter

Implement the `DOMAdapter` interface and the `HappyDOMAdapter` implementation.

## Context

- **Source:** `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/adapter.ts`
- **Spec:** `work/tui-browser/tui-dom-poc0/.tasks/spec/opentui-dom-adapter.md`
- **Design:** `work/effect-native/effect-native/.specs/tui-dom/design.md`

## Tasks

1. [x] Port `DOMAdapter` interface (Effect-based).
2. [x] Port `createTestAdapter` (Happy-DOM wrapper).
3. [x] Ensure `ElementRef` locator pattern is implemented.
4. [x] Write unit tests.

## Implementation Summary

### Files Created

1. **`packages-native/opentui-dom/src/DOMAdapter.ts`**
   - `ElementRef` interface - lazy locator pattern with selector, parent, and index
   - `ref()` and `refNth()` factory functions for creating element refs
   - Error types: `ElementNotFoundError`, `MultipleElementsError`, `AdapterError`
   - `MutationRecord`, `MutationObserverInit`, `MutationStream` interfaces
   - `DOMAdapter` interface with Effect-based methods
   - `DOMAdapterService` - Effect Context tag for service injection
   - `resolveRef()` and `generateSelector()` helper functions

2. **`packages-native/opentui-dom/src/TestAdapter.ts`**
   - `createTestAdapter()` - Creates a Layer with Happy-DOM backed DOMAdapter
   - `setTestHTML()`, `resetTestEnv()`, `getTestWindow()` utilities
   - All adapter methods implemented using `Effect.tryPromise`
   - Proper Happy-DOM type compatibility

3. **`packages-native/opentui-dom/src/index.ts`**
   - Barrel export of DOMAdapter and TestAdapter modules

4. **`packages-native/opentui-dom/test/DOMAdapter.test.ts`**
   - 25 test cases covering:
     - ElementRef creation with `ref()` and `refNth()`
     - Error type construction and properties
     - All DOMAdapter interface methods
     - Scoped queries with parent refs
     - Indexed queries with refNth
     - MutationStream interface

### Package Configuration

- Added `vitest.config.ts` with `sequence.concurrent: false` to avoid shared state issues
- Updated tsconfig files following existing package patterns
- Added `happy-dom` as devDependency

## Test Results

```
✓ test/DOMAdapter.test.ts (25 tests) 166ms
  ✓ ElementRef > ref() > creates ref with selector
  ✓ ElementRef > ref() > creates ref with parent
  ✓ ElementRef > refNth() > creates indexed ref
  ✓ ElementRef > refNth() > creates indexed ref with parent
  ✓ Error Types > ElementNotFoundError has correct tag and selector
  ✓ Error Types > MultipleElementsError has correct tag, selector, and count
  ✓ Error Types > AdapterError has correct tag and message
  ✓ DOMAdapter > document > returns Effect with Document
  ✓ DOMAdapter > exists() > returns true/false for existing/missing elements
  ✓ DOMAdapter > count() > returns number of matching elements
  ✓ DOMAdapter > textContent() > returns text content
  ✓ DOMAdapter > getAttribute() > returns attribute values
  ✓ DOMAdapter > getValue() > returns input value
  ✓ DOMAdapter > fill() > sets input value
  ✓ DOMAdapter > focus() and blur() > manages focus
  ✓ DOMAdapter > click() > triggers click events
  ✓ DOMAdapter > dispatchEvent() > dispatches custom events
  ✓ DOMAdapter > observeMutations() > returns MutationStream interface
  ✓ DOMAdapter > scoped queries > finds elements within parent scope
  ✓ DOMAdapter > indexed queries > selects nth matching element
```

## Basis

- Ported from: `work/tui-browser/tui-dom-poc0/packages/opentui-dom/src/adapter.ts`
- Using Effect patterns from existing `@effect-native` packages
- Happy-DOM for test DOM implementation
- Effect `Context.Tag` for service injection
- Effect `Data.TaggedError` for typed errors
