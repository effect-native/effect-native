---
title: TodoMVC State Atoms
status: pending
done_when: bun test todomvc/src/atoms/*.test.ts
basis: |
  Not started.
blocked_by:
  - .tasks/impl/todomvc-scaffold.md
artifacts:
  - path: todomvc/src/atoms/todos.ts
    description: Todo list atom with CRUD operations
  - path: todomvc/src/atoms/filter.ts
    description: Filter state atom
  - path: todomvc/src/atoms/derived.ts
    description: Derived atoms (filteredTodos, activeCount, etc)
  - path: todomvc/src/atoms/todos.test.ts
    description: Unit tests for atom behavior
---

# Impl: TodoMVC State Atoms

## Objective

Implement the state management layer using effect-atom.

## Types

```ts
interface Todo {
  id: string
  text: string
  completed: boolean
}

type Filter = 'all' | 'active' | 'completed'
```

## Atoms

### todos.ts - Core State

```ts
import { Atom } from "@effect-atom/atom-react"

// Core todos list
export const todosAtom = Atom.make<Todo[]>([]).pipe(Atom.keepAlive)

// Actions (using Atom.fn or direct set)
export const addTodo = (text: string) => // ...
export const toggleTodo = (id: string) => // ...
export const editTodo = (id: string, text: string) => // ...
export const deleteTodo = (id: string) => // ...
export const toggleAll = () => // ...
export const clearCompleted = () => // ...
```

### filter.ts - Filter State

```ts
export const filterAtom = Atom.make<Filter>('all').pipe(Atom.keepAlive)
```

### derived.ts - Computed Values

```ts
// Filtered todos based on current filter
export const filteredTodosAtom = Atom.make((get) => {
  const todos = get(todosAtom)
  const filter = get(filterAtom)
  switch (filter) {
    case 'active': return todos.filter(t => !t.completed)
    case 'completed': return todos.filter(t => t.completed)
    default: return todos
  }
})

// Active items count
export const activeCountAtom = Atom.map(todosAtom, todos => 
  todos.filter(t => !t.completed).length
)

// Whether all todos are completed
export const allCompletedAtom = Atom.make((get) => {
  const todos = get(todosAtom)
  return todos.length > 0 && todos.every(t => t.completed)
})

// Whether any completed todos exist
export const hasCompletedAtom = Atom.map(todosAtom, todos =>
  todos.some(t => t.completed)
)
```

## Tests

Test cases for atoms:
- Adding a todo creates new item with unique id
- Toggling a todo flips completed state
- Editing a todo updates text
- Deleting a todo removes it from list
- Toggle all marks all as complete/incomplete
- Clear completed removes only completed todos
- Filter atom filters correctly for each state
- Derived atoms update when source changes

## Verification

```bash
bun test todomvc/src/atoms/*.test.ts
```
