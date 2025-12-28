---
title: TodoMVC Storage Service
status: pending
done_when: bun test todomvc/src/services/*.test.ts
basis: |
  Not started.
blocked_by:
  - .tasks/impl/todomvc-atoms.md
artifacts:
  - path: todomvc/src/services/TodoStorage.ts
    description: Effect Service for localStorage persistence
  - path: todomvc/src/services/TodoStorage.test.ts
    description: Tests for storage service
  - path: todomvc/src/atoms/persisted.ts
    description: Atoms with persistence integration
---

# Impl: TodoMVC Storage Service

## Objective

Implement localStorage persistence using Effect Service pattern and effect-atom's `Atom.kvs` integration.

## Approach

Two options for persistence:

### Option A: Atom.kvs (Preferred)

Using effect-atom's built-in key-value store integration:

```ts
import { Atom } from "@effect-atom/atom-react"
import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Schema } from "effect"

const runtime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage)

const TodoSchema = Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  completed: Schema.Boolean
})

export const todosAtom = Atom.kvs({
  runtime,
  key: "todos-effect-atom",
  schema: Schema.Array(TodoSchema),
  defaultValue: () => []
})
```

### Option B: Custom Effect Service

If more control needed:

```ts
import { Effect, Schema } from "effect"

const TodoArraySchema = Schema.Array(Schema.Struct({
  id: Schema.String,
  text: Schema.String,
  completed: Schema.Boolean
}))

class TodoStorage extends Effect.Service<TodoStorage>()("TodoStorage", {
  effect: Effect.gen(function*() {
    const load = Effect.try({
      try: () => {
        const json = localStorage.getItem("todos-effect-atom")
        return json ? JSON.parse(json) : []
      },
      catch: () => new StorageError({ message: "Failed to load todos" })
    }).pipe(
      Effect.flatMap(data => Schema.decodeUnknown(TodoArraySchema)(data))
    )
    
    const save = (todos: Todo[]) => Effect.try({
      try: () => {
        localStorage.setItem("todos-effect-atom", JSON.stringify(todos))
      },
      catch: () => new StorageError({ message: "Failed to save todos" })
    })
    
    return { load, save } as const
  })
}) {}

class StorageError extends Data.TaggedError<StorageError>("StorageError")<{
  message: string
}> {}
```

## Integration with Atoms

```ts
// In persisted.ts
import { Atom, Result } from "@effect-atom/atom-react"

// Option A: Use Atom.kvs directly (handles persistence automatically)
export { todosAtom } from "./TodoStorage"

// Option B: Manual sync with Effect Service
export const todosAtom = Atom.make(
  Effect.gen(function*() {
    const storage = yield* TodoStorage
    return yield* storage.load
  })
).pipe(Atom.keepAlive)

// Persist on change
export const saveTodosEffect = (todos: Todo[]) =>
  Effect.gen(function*() {
    const storage = yield* TodoStorage
    yield* storage.save(todos)
  })
```

## Tests

- Load returns empty array when no data
- Load returns parsed todos when data exists
- Load handles invalid JSON gracefully
- Save persists todos to localStorage
- Atom.kvs round-trips data correctly
- Schema validation rejects invalid data

## Verification

```bash
bun test todomvc/src/services/*.test.ts
```

## Notes

- Use `todos-effect-atom` as localStorage key (namespaced per TodoMVC spec)
- Prefer Option A (Atom.kvs) for simplicity
- Fall back to Option B only if custom error handling needed
