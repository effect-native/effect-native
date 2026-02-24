---
title: "graph-db/040: SQLite dialect (expand-only ensure)"
status: complete
done_when: cd packages/graph-db && bun test test/sqlite-dialect.ensure.test.ts
basis: |
  Implemented and verified in this branch.
  Proof commands run:
  - bun run check (packages/graph-db)
  - bun test (packages/graph-db)
  - bun run lint-fix (workspace root)
blocked_by:
  - .tasks/graph-db/030-service-and-layer.md
artifacts:
  - path: packages/graph-db/src/GraphDialect.ts
    description: GraphDialect service interface.
  - path: packages/graph-db/src/ensure/GraphDialectSqlite.ts
    description: SQLite introspection, planning, and ensure execution.
  - path: packages/graph-db/test/sqlite-dialect.ensure.test.ts
    description: Ensure create/add-column/add-index tests.
---

# Goal

Implement SQLite dialect planning and expand-only ensure behavior.

# Scope

- Introspect existing tables/columns/indexes.
- Create missing tables.
- Add missing columns.
- Add missing non-unique indexes.
- Report incompatible/destructive needs in plan.

# Non-goals

- PostgreSQL dialect.
- Destructive migration execution.

# Acceptance Criteria

- S2: create table if missing.
- S2: add column for expand-only changes.
- S2: add non-unique indexes.
- S2: destructive changes produce incompatible plan entries (typed failure at execution boundary).

# Proof Steps

1. Use in-memory SQLite tests.
2. Run `bun --filter @effect-native/graph-db test test/sqlite-dialect.ensure.test.ts`.
