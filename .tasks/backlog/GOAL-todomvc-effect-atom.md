---
title: TodoMVC with Effect-Atom + React + Effect
status: pending
done_when: |
  all criteria met:
  - pnpm install succeeds in todomvc/
  - pnpm dev starts the app
  - pnpm test passes all TodoMVC spec tests
  - app implements standard TodoMVC functionality using effect-atom
basis: |
  Not started. Submodule added at todomvc/.
blocked_by: []
artifacts:
  - path: todomvc/
    description: Git submodule containing the effect-atom TodoMVC implementation
---

# GOAL: TodoMVC with Effect-Atom + React + Effect

## Summary

Build a TodoMVC application using:

- **effect-atom** (`@effect-atom/atom-react`) for state management
- **React** for the UI layer
- **Effect** for structured effects and services

This serves as:

1. A real-world example of effect-atom usage
2. A debuggable target application for the debug POC demo
3. A contribution to the TodoMVC ecosystem

## Repository

- **Location**: `todomvc/` (git submodule)
- **Remote**: `https://github.com/effect-native/todomvc.git`

## Why TodoMVC?

TodoMVC is the canonical example app for demonstrating state management libraries. Having an effect-atom implementation:

- Makes effect-atom approachable for new users
- Provides a standard, well-understood codebase for debugging demos
- Allows comparison with other state management approaches

## Functional Requirements

Standard TodoMVC spec (https://github.com/tastejs/todomvc):

1. **Add todos**: Enter text, press Enter to add
2. **Complete todos**: Click checkbox to toggle complete
3. **Edit todos**: Double-click to edit, Enter to save, Escape to cancel
4. **Delete todos**: Click X button to remove
5. **Filter todos**: All, Active, Completed filters
6. **Clear completed**: Button to remove all completed todos
7. **Toggle all**: Checkbox to complete/uncomplete all
8. **Counter**: Shows count of active items
9. **Persistence**: Todos survive page refresh (localStorage)

## Technical Requirements

### Stack

- React 19+ (with modern patterns, no forwardRef)
- effect-atom for state management
- Effect for services (persistence layer)
- TypeScript strict mode
- Vite for dev/build

### State Structure

Using effect-atom patterns:

```ts
// Todo type
interface Todo {
  id: string
  text: string
  completed: boolean
}

// State atoms
const todosAtom = Atom.make<Todo[]>([]).pipe(Atom.keepAlive)
const filterAtom = Atom.make<"all" | "active" | "completed">("all")

// Derived atoms
const filteredTodosAtom = Atom.make((get) => {
  const todos = get(todosAtom)
  const filter = get(filterAtom)
  // filter logic
})

const activeCountAtom = Atom.map(todosAtom, (todos) => todos.filter((t) => !t.completed).length)
```

### Persistence Layer

Using Effect Service pattern:

```ts
class TodoStorage extends Effect.Service<TodoStorage>()("TodoStorage", {
  effect: Effect.gen(function*() {
    const load = Effect.try(() => {
      const json = localStorage.getItem("todos")
      return json ? JSON.parse(json) : []
    })

    const save = (todos: Todo[]) =>
      Effect.try(() => {
        localStorage.setItem("todos", JSON.stringify(todos))
      })

    return { load, save } as const
  })
}) {}
```

## Subtasks

### Research

- `.tasks/research/todomvc-spec.md` - Review TodoMVC spec requirements

### Implementation (in order)

- `.tasks/impl/todomvc-scaffold.md` - Project setup (Vite, React, deps)
- `.tasks/impl/todomvc-atoms.md` - State atoms and derived state
- `.tasks/impl/todomvc-storage.md` - Effect Service for persistence
- `.tasks/impl/todomvc-ui.md` - React components
- `.tasks/impl/todomvc-tests.md` - Test suite

## Definition of Done

1. `pnpm install` succeeds
2. `pnpm dev` starts development server
3. `pnpm test` passes TodoMVC spec tests
4. App matches TodoMVC styling (CSS from todomvc-app-css)
5. State persists across page refresh
6. Code demonstrates effect-atom best practices

## Notes

- Use `Atom.kvs` for localStorage integration (see effect-atom README)
- Use `useAtom`, `useAtomValue`, `useAtomSet` hooks appropriately
- Consider `Atom.family` for individual todo editing state
