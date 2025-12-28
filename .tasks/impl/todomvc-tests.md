---
title: TodoMVC Test Suite
status: pending
done_when: cd todomvc && pnpm test
basis: |
  Not started.
blocked_by:
  - .tasks/impl/todomvc-ui.md
artifacts:
  - path: todomvc/src/atoms/todos.test.ts
    description: Unit tests for todo atoms
  - path: todomvc/tests/todomvc.spec.ts
    description: Integration tests for full app behavior
  - path: todomvc/vitest.config.ts
    description: Vitest configuration
---

# Impl: TodoMVC Test Suite

## Objective

Create comprehensive test coverage for the TodoMVC implementation.

## Test Structure

```
todomvc/
  src/
    atoms/
      todos.test.ts        # Atom unit tests
    services/
      TodoStorage.test.ts  # Storage service tests
  tests/
    todomvc.spec.ts        # Integration/E2E tests
```

## Unit Tests (atoms)

### todos.test.ts

```ts
import { describe, it, expect } from 'vitest'

describe('todosAtom', () => {
  it('starts empty', () => {
    // ...
  })
  
  it('adds a todo with unique id', () => {
    // ...
  })
  
  it('toggles todo completed state', () => {
    // ...
  })
  
  it('edits todo text', () => {
    // ...
  })
  
  it('deletes a todo', () => {
    // ...
  })
  
  it('toggles all todos complete when some incomplete', () => {
    // ...
  })
  
  it('toggles all todos incomplete when all complete', () => {
    // ...
  })
  
  it('clears only completed todos', () => {
    // ...
  })
})

describe('filteredTodosAtom', () => {
  it('returns all todos when filter is "all"', () => {})
  it('returns only active todos when filter is "active"', () => {})
  it('returns only completed todos when filter is "completed"', () => {})
})

describe('derived atoms', () => {
  it('activeCountAtom counts incomplete todos', () => {})
  it('allCompletedAtom is true when all complete', () => {})
  it('hasCompletedAtom is true when any complete', () => {})
})
```

## Integration Tests

### todomvc.spec.ts

Using vitest + @testing-library/react:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'

describe('TodoMVC', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  
  describe('No Todos', () => {
    it('hides main section when empty', () => {
      render(<App />)
      expect(screen.queryByRole('main')).not.toBeInTheDocument()
    })
    
    it('hides footer when empty', () => {
      render(<App />)
      expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
    })
  })
  
  describe('New Todo', () => {
    it('adds todo on Enter', async () => {
      render(<App />)
      const input = screen.getByPlaceholderText('What needs to be done?')
      await userEvent.type(input, 'Buy milk{Enter}')
      expect(screen.getByText('Buy milk')).toBeInTheDocument()
    })
    
    it('trims whitespace', async () => {
      render(<App />)
      const input = screen.getByPlaceholderText('What needs to be done?')
      await userEvent.type(input, '  Buy milk  {Enter}')
      expect(screen.getByText('Buy milk')).toBeInTheDocument()
    })
    
    it('ignores empty input', async () => {
      render(<App />)
      const input = screen.getByPlaceholderText('What needs to be done?')
      await userEvent.type(input, '   {Enter}')
      expect(screen.queryByRole('main')).not.toBeInTheDocument()
    })
  })
  
  describe('Mark All Complete', () => {
    it('marks all as complete', async () => {
      // Add todos first, then test toggle-all
    })
  })
  
  describe('Item', () => {
    it('shows todo text', () => {})
    it('toggles complete on checkbox click', () => {})
    it('shows destroy button on hover', () => {})
    it('deletes on destroy click', () => {})
  })
  
  describe('Editing', () => {
    it('enters edit mode on double-click', () => {})
    it('saves on Enter', () => {})
    it('cancels on Escape', () => {})
    it('saves on blur', () => {})
    it('deletes when cleared', () => {})
  })
  
  describe('Counter', () => {
    it('shows singular for 1 item', () => {})
    it('shows plural for multiple items', () => {})
    it('counts only active items', () => {})
  })
  
  describe('Clear Completed', () => {
    it('hidden when no completed', () => {})
    it('visible when completed exist', () => {})
    it('removes only completed items', () => {})
  })
  
  describe('Persistence', () => {
    it('loads todos from localStorage', () => {})
    it('saves todos to localStorage', () => {})
  })
  
  describe('Routing', () => {
    it('filters by hash route', () => {})
    it('highlights current filter', () => {})
  })
})
```

## Vitest Configuration

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts']
  }
})
```

## Test Setup

```ts
// tests/setup.ts
import '@testing-library/jest-dom'
```

## Verification

```bash
cd todomvc && pnpm test
# All tests pass
```
