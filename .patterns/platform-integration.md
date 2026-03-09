# Platform Integration Patterns - Effect Native

## Overview

This repo wraps native and runtime-specific capabilities behind small Effect v4 services and layers. Keep platform details explicit, typed, and isolated from higher-level package logic.

## Native Asset Packaging

Platform-specific binaries belong in the package that owns them.

```text
packages/libsqlite/lib/<platform>/...
packages/libcrsql/lib/<platform>/...
packages/sqlite-graph-ext/lib/<platform>/...
```

- Keep packaged binaries under `packages/`, never `packages-native/`.
- Resolve platform-specific paths in a small package-local module, then expose them through an Effect service or accessor.
- Let unsupported platforms fail with a typed error instead of silently skipping features.

## Service Boundary Pattern

Expose only the capability the higher-level package actually needs.

```typescript
import * as Effect from "effect/Effect"
import * as ServiceMap from "effect/ServiceMap"
import type { SqlError } from "effect/unstable/sql"
import { SqlClient } from "effect/unstable/sql"

export interface SqliteClient extends SqlClient.SqlClient {
  readonly loadExtension: (path: string) => Effect.Effect<void, SqlError.SqlError>
}

export const SqliteClient = ServiceMap.Service<SqliteClient>(
  "@effect-native/crsql/SqliteClient"
)
```

- Depend on the smallest useful interface.
- Keep platform-specific adapter code near the package that needs it.
- Do not leak driver-specific implementation details across package boundaries.

## Layer Pattern

Provide runtime-specific implementations with layers.

```typescript
import { LibSqlite } from "@effect-native/libsqlite/effect"
import * as Layer from "effect/Layer"

export const LibSqliteLive = Layer.sync(LibSqlite, () => ({
  path: getLibSqlitePathSync()
}))
```

Use `Layer.sync`, `Layer.effect`, or `Layer.succeed` based on the initialization cost and failure mode.

## Error Translation Pattern

Translate platform failures into structured domain errors as soon as they cross the boundary.

```typescript
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"

export class PlatformNotSupportedError extends Data.TaggedError("PlatformNotSupportedError")<{
  readonly platform: string
  readonly help: string
}> {}

export const getLibSqlitePath = Effect.try({
  try: () => getLibSqlitePathSync(),
  catch: () =>
    new PlatformNotSupportedError({
      platform: `${process.platform}-${process.arch}`,
      help: "Open an issue if this platform needs support."
    })
})
```

- Convert thrown or untyped errors with `Effect.try` / `Effect.tryPromise`.
- Include actionable context such as platform, path, module, method, or driver capability.
- Do not swallow missing native dependencies, ABI mismatches, or extension load failures.

## Capability Narrowing Pattern

Validate optional runtime capabilities once, then expose a narrowed service.

```typescript
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { SqlClient } from "effect/unstable/sql"

export class SqliteClientError extends Data.TaggedError("SqliteClientError")<{
  cause: unknown
}> {}

export const fromSqlClient = Effect.fn("@effect-native/crsql/SqlClient#from")(
  function*(sql: SqlClient.SqlClient | SqliteClient) {
    if (!("loadExtension" in sql) || typeof sql.loadExtension !== "function") {
      return yield* new SqliteClientError({ cause: "SqlClient missing loadExtension method" })
    }
    return sql
  }
)
```

- Fail loudly when a required capability is missing.
- Keep the guard close to the integration point.
- Reuse the narrowed service everywhere else instead of repeating feature detection.

## Layer Composition Pattern

Compose the high-level package layer from its lower-level platform pieces.

```typescript
export class CrSql extends ServiceMap.Service<CrSql>()("CrSql", {
  make: makeCrSql
}) {
  static Default = Layer.effect(CrSql, CrSql.make).pipe(
    Layer.provide(CrSqliteExtension.ExtInfoLoaded.Default)
  )
}
```

- Keep package entry layers close to the main service.
- Provide prerequisite layers explicitly.
- Prefer composition over conditional runtime branching.

## Resource Management Pattern

Use scope-aware finalization for native handles, servers, connections, and extensions.

```typescript
const acquireServer = Effect.fn("acquireServer")(function*() {
  const server = createServer()

  yield* Effect.addFinalizer(() =>
    Effect.promise(() =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()))
      })
    )
  )

  return server
})
```

- Finalize native resources in the same module that acquires them.
- Prefer scoped cleanup over ad-hoc shutdown flags.
- If cleanup can fail, model that failure explicitly or document why it is intentionally ignored.

## Testing Platform Integrations

Test the real integration when it is core behavior. Mock only the narrow service boundary when you need focused unit tests.

```typescript
import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"

describe("SqliteClient adapter", () => {
  it.effect("rejects base clients that cannot load extensions", () =>
    Effect.gen(function*() {
      const exit = yield* Effect.exit(fromSqlClient(fakeSqlClient))
      expect(exit._tag).toBe("Failure")
    }))
})
```

- Use the real native driver for integration coverage unless the pattern doc explicitly calls for a unit seam.
- Keep mocks tiny and capability-based.
- Do not introduce feature-detection branches merely to make tests pass.

## Success Criteria

- Platform-specific files and binaries stay under `packages/<owner>/`.
- High-level packages depend on small capability services, not concrete runtimes.
- External failures are translated into typed errors with useful context.
- Layers compose explicit dependencies instead of hiding them behind runtime checks.
- Tests either exercise the real integration or mock a narrow service boundary without weakening failure visibility.
