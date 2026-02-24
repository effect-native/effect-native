---
title: "graph-db/070: Edge repository"
status: pending
done_when: bun --filter @effect-native/graph-db test test/edge-repo.traversal.test.ts
basis: |
  Pending implementation.
blocked_by:
  - .tasks/graph-db/060-repos-nodes.md
artifacts:
  - path: packages/graph-db/src/repos/edgeRepo.ts
    description: Edge put/out/in operations with deterministic id helper.
  - path: packages/graph-db/test/edge-repo.traversal.test.ts
    description: Traversal and duplicate prevention tests.
---

# Goal

Implement universal edge repository with deterministic IDs and traversal queries.

# Scope

- deterministic edge id helper
- `putEdge(edgeType, src, dst, props?)`
- `out(src, edgeType?)`
- `in(dst, edgeType?)`

# Non-goals

- Recursive graph traversals.

# Acceptance Criteria

- S2: out/in traversal returns expected edges.
- S2: duplicate inserts are prevented by deterministic PK.
- S1: edge API is reachable from `GraphDb` service.

# Proof Steps

1. Insert edge data and assert out/in query results.
2. Reinsert same logical edge and assert single row persists.
3. Run `bun --filter @effect-native/graph-db test test/edge-repo.traversal.test.ts`.

