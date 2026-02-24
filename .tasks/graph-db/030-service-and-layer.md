---
title: "graph-db/030: GraphDb service and layer"
status: pending
done_when: bun --filter @effect-native/graph-db test test/service-and-layer.test.ts
basis: |
  Pending implementation.
blocked_by:
  - .tasks/graph-db/020-core-types-and-errors.md
artifacts:
  - path: packages/graph-db/src/GraphDb.ts
    description: `makeGraphDb(spec)` and service API.
  - path: packages/graph-db/test/service-and-layer.test.ts
    description: Layer build and transaction ensure tests.
---

# Goal

Implement `makeGraphDb(spec)` returning `{ GraphDb, layer }` with explicit dependency wiring.

# Scope

- ServiceMap service for `GraphDb`.
- `layer` created with `Layer.effect` and explicit dependencies.
- `ensure` executes in transaction through `sql.withTransaction`.

# Non-goals

- Full dialect behavior and complete repo operations.

# Acceptance Criteria

- S1: `makeGraphDb` returns service tag and layer.
- S1: layer requires `SqlClient.SqlClient` + `GraphDialect`.
- S2: `ensure` is transactional (`withTransaction`).

# Proof Steps

1. Add a test using a stub `SqlClient` that records `withTransaction` calls.
2. Run `bun --filter @effect-native/graph-db test test/service-and-layer.test.ts`.

