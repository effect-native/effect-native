---
title: "Impl: Render Helper"
status: done
blocked_by: []
artifacts:
  - path: packages-native/opentui-dom-testing-library/src/render.ts
  - path: packages-native/opentui-dom-testing-library/src/screen.ts
  - path: packages-native/opentui-dom-testing-library/src/queries.ts
  - path: packages-native/opentui-dom-testing-library/src/setup.ts
  - path: packages-native/opentui-dom-testing-library/src/index.ts
done_when: |
  render() function mounts React component
  Returns screen object
---

# Impl: Render Helper

Port the `render()` function from `tui-dom-poc0`.

## Context
*   **Source:** `work/tui-browser/tui-dom-poc0/src/testing/render.ts`
*   **Source:** `work/tui-browser/tui-dom-poc0/src/testing/screen.ts`

## Status: DONE

### Completed Tasks
1.  ✅ Created package structure at `packages-native/opentui-dom-testing-library/`
2.  ✅ Ported `render.ts` - the function that mounts React components
3.  ✅ Ported `screen.ts` - the screen object for queries
4.  ✅ Ported `queries.ts` - all query functions (getBy, queryBy, findBy, etc.)
5.  ✅ Created `setup.ts` - happy-dom global environment setup
6.  ✅ Created comprehensive unit tests (50 tests passing)
7.  ✅ Type checking passes

### Implementation Details

The package provides a testing library similar to `@testing-library/react` but uses `happy-dom` instead of jsdom.

**Key exports:**
- `setupHappyDom()` - Registers happy-dom globals (window, document, etc.)
- `render(ui, options?)` - Mounts a React component, returns queries and utilities
- `cleanup()` - Unmounts all mounted components
- `screen` - Lazy proxy for querying document.body
- All query variants: `getBy*`, `getAllBy*`, `queryBy*`, `queryAllBy*`, `findBy*`, `findAllBy*`
- Query types: `Text`, `Role`, `TestId`, `LabelText`

**Usage:**
```ts
import { setupHappyDom, render, screen, cleanup } from "@effect-native/opentui-dom-testing-library"

// Call once before tests
setupHappyDom()

// In tests:
const { getByText, rerender, unmount } = render(<MyComponent />)
expect(getByText("Hello")).toBeDefined()

// Or use screen:
render(<MyComponent />)
expect(screen.getByRole("button")).toBeDefined()

// Clean up after tests
cleanup()
```

### Basis
- Ported from `work/tui-browser/tui-dom-poc0/src/testing/render.ts`
- Ported from `work/tui-browser/tui-dom-poc0/src/testing/screen.ts`
- Ported from `work/tui-browser/tui-dom-poc0/src/testing/queries.ts`
- Uses `@happy-dom/global-registrator` for DOM environment
