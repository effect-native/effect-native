---
title: "graph-db/060: Node repository"
status: pending
done_when: bun --filter @effect-native/graph-db test test/node-repo.roundtrip.test.ts
basis: |
  Pending implementation.
blocked_by:
  - .tasks/graph-db/040-sqlite-dialect.md
artifacts:
  - path: packages/graph-db/src/repos/nodeRepo.ts
    description: Node put/get/query operations.
  - path: packages/graph-db/test/node-repo.roundtrip.test.ts
    description: Node roundtrip and decode-error tests.
---

# Goal

Implement node repository with schema-driven encode/decode and typed failures.

# Scope

- `put(kind, value)`
- `get(kind, id)`
- `queryById(kind, id)`
- Domain/row schema transforms for encode/decode boundaries.

# Non-goals

- Complex query language.

# Acceptance Criteria

- S2: domain encode -> insert -> select -> decode roundtrip works.
- S2: decode/parsing failures surface typed errors (not thrown exceptions).
- S1: node API is reachable from `GraphDb` service.

# Proof Steps

1. Add roundtrip tests over in-memory SQLite.
2. Add malformed-row test asserting typed failure.
3. Run `bun --filter @effect-native/graph-db test test/node-repo.roundtrip.test.ts`.

