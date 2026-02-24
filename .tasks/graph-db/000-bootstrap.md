---
title: "graph-db/000: Bootstrap package"
status: pending
done_when: bun --filter @effect-native/graph-db test
basis: |
  Pending implementation.
blocked_by: []
artifacts:
  - path: packages/graph-db/package.json
    description: New workspace package definition.
  - path: packages/graph-db/tsconfig.json
    description: Composite tsconfig entry for source and tests.
  - path: packages/graph-db/src/index.ts
    description: Public root export file.
  - path: packages/graph-db/test/smoke.test.ts
    description: Trivial green test proving harness wiring.
---

# Goal

Create the `@effect-native/graph-db` package scaffold with build/test wiring and a trivial passing test.

# Scope

- Create package directory, tsconfig files, scripts, and exports.
- Wire root `tsconfig.json` references.
- Add one trivial test.

# Non-goals

- Implement Graph DB domain logic.

# Acceptance Criteria

- S1: Package exists under `packages/graph-db` with valid workspace scripts.
- S1: Public entrypoint compiles.
- E0: `bun --filter @effect-native/graph-db test` passes with at least one trivial test.

# Proof Steps

1. Run `bun --filter @effect-native/graph-db test`.
2. Run `bun --filter @effect-native/graph-db run check`.

