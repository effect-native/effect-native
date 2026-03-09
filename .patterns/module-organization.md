# Module Organization Patterns - Effect Native

## Overview

Use the repository's actual package layout and export style. This repo is a monorepo under `packages/`, not `packages-native/`, and its modules target Effect v4 conventions.

## Package Layout

Each package lives under `packages/<name>/` and usually follows this shape:

```text
packages/<name>/
├── src/
│   ├── index.ts
│   ├── <PublicModule>.ts
│   └── internal/
│       └── <private-helper>.ts
├── test/
├── package.json
└── tsconfig.json
```

- Put public modules in `packages/<name>/src/`.
- Put private helpers in `packages/<name>/src/internal/`.
- Keep native assets, demos, and generated output in the package that owns them.
- Never introduce new references to `packages-native/`; the workspace layout is `packages/*`.

## Public Exports

Follow the package's existing export strategy instead of inventing a new one.

- If the package has a hand-authored `src/index.ts`, update it directly.
- If the package relies on code generation for exports, preserve that workflow and rerun codegen.
- Re-export public surface area from `src/index.ts`; do not leak `src/internal/*` from package entrypoints.

Examples from this repo:

```typescript
// packages/crsql/src/index.ts
export * as CrSql from "./CrSql.js"
export * as CrSqlErrors from "./CrSqlErrors.js"
export * as CrSqlSchema from "./CrSqlSchema.js"

// packages/graph-db/src/index.ts
export * as GraphDialectSqlite from "./ensure/GraphDialectSqlite.js"
export * from "./errors.js"
export * from "./GraphDb.js"
```

## Internal Modules

Keep shared private details in `src/internal/` and import them only from sibling public modules.

```typescript
// packages/crsql/src/internal/MaybeEffect.ts
import * as Effect from "effect/Effect"

export type MaybeEffect<A, E = never, R = never> = Effect.Effect<A, E, R> | A

export function MaybeEffect(self: null | undefined): null
export function MaybeEffect<A, E = never, R = never>(self: MaybeEffect<A, E, R>): Effect.Effect<A, E, R>
export function MaybeEffect<A, E = never, R = never>(self: MaybeEffect<A, E, R> | null | undefined) {
  if (self == null) {
    return null
  }
  return Effect.isEffect(self) ? self : Effect.succeed(self)
}
```

- Keep internal helpers small and narrowly scoped.
- Promote a helper to a public module only when another package or users need it.

## Module Shape

Prefer a shallow module structure: imports, exported types, exported errors/services, exported functions.

```typescript
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as ServiceMap from "effect/ServiceMap"

export class ExampleError extends Data.TaggedError("ExampleError")<{
  message: string
}> {}

export interface ExampleService {
  readonly load: (id: string) => Effect.Effect<string, ExampleError>
}

export const Example = ServiceMap.Service<ExampleService>("@effect-native/example/Example")

export const load = Effect.fn("@effect-native/example/load")(function*(id: string) {
  if (id.length === 0) {
    return yield* new ExampleError({ message: "empty id" })
  }
  return id
})
```

- Prefer `ServiceMap.Service` for services.
- Prefer `Effect.fn("name")` for reusable public effectful functions.
- Prefer `Effect.fnUntraced` only for internal or hot-path helpers.
- Keep control flow explicit with `return yield*` for terminal failures.

## Naming Conventions

- Use `PascalCase` for modules, services, schemas, and error classes.
- Use verbs for effectful operations: `loadExtension`, `fromSqlClient`, `setPeerVersion`.
- Use `get*`, `set*`, `is*`, and `from*` prefixes consistently.
- Use package-qualified names for traced functions when the function is part of a public API, for example `"@effect-native/crsql/CrSql#applyChanges"`.

## Nested Directories

Use nested directories only when they represent a stable public subdomain.

```typescript
// packages/graph-db/src/ensure/index.ts
export * as GraphDialectSqlite from "./GraphDialectSqlite.js"
```

- Good: focused subdomains such as `ensure/`.
- Bad: extra nesting that only hides a single file or adds indirection.

## Documentation and Source Locality

- Keep JSDoc with the exported symbol it documents.
- Keep related types, errors, and helpers close together when they change in lockstep.
- Avoid centralizing package behavior in large catch-all files when a sibling module keeps the design flatter.

## Success Criteria

- Public APIs live in `packages/*/src/` and are exported from package entrypoints.
- Private details stay in `packages/*/src/internal/`.
- New docs and examples reference `packages/`, never `packages-native/`.
- Module examples use Effect v4 patterns already used in this repo.
- Structure stays shallow, discoverable, and consistent with neighboring packages.
