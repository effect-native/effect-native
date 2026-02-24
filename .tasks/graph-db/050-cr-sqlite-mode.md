---
title: "graph-db/050: CR-SQLite mode planning rules"
status: complete
done_when: cd packages/graph-db && bun test test/sqlite-dialect.crr-plan.test.ts
basis: |
  Implemented and verified in this branch.
  Proof commands run:
  - bun run check (packages/graph-db)
  - bun test (packages/graph-db)
  - bun run lint-fix (workspace root)
blocked_by:
  - .tasks/graph-db/040-sqlite-dialect.md
artifacts:
  - path: packages/graph-db/src/ensure/GraphDialectSqlite.ts
    description: CRR planning behavior and typed extension errors.
  - path: packages/graph-db/test/sqlite-dialect.crr-plan.test.ts
    description: CRR plan assertions.
---

# Goal

Add CRR mode constraints to emitted schema plans with typed error surfaces.

# Scope

- Support `replication: "none" | "crr"` in spec/dialect planning.
- In `crr` mode:
  - block secondary unique indexes
  - avoid checked foreign keys
  - include begin/commit alter wrappers in plan when altering CRR tables
  - deterministic edge primary key strategy

# Non-goals

- End-to-end CR-SQLite extension integration.

# Acceptance Criteria

- S2: plan disallows secondary unique indexes in `crr`.
- S2: alter plan includes begin/commit wrapper statements when needed.
- S2: missing extension checks can surface typed `GraphSqlDialectError` (where extension-dependent paths are exercised).

# Proof Steps

1. Add plan-focused tests that inspect emitted SQL statements.
2. Run `bun --filter @effect-native/graph-db test test/sqlite-dialect.crr-plan.test.ts`.
