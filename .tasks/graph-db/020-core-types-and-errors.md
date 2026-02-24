---
title: "graph-db/020: Core types and tagged errors"
status: complete
done_when: cd packages/graph-db && bun run check
basis: |
  Implemented and verified in this branch.
  Proof commands run:
  - bun run check (packages/graph-db)
  - bun test (packages/graph-db)
  - bun run lint-fix (workspace root)
blocked_by:
  - .tasks/graph-db/000-bootstrap.md
artifacts:
  - path: packages/graph-db/src/spec.ts
    description: GraphSpec / NodeDef / EdgeDef model.
  - path: packages/graph-db/src/SchemaPlan.ts
    description: Table/column/index plan model.
  - path: packages/graph-db/src/errors.ts
    description: Tagged graph-db errors.
---

# Goal

Define type-safe spec/plan models and typed errors for graph-db internals and public API.

# Scope

- Add `GraphSpec`, `NodeDef`, `EdgeDef`.
- Add `TableDef`, `ColumnDef`, `IndexDef`, `SchemaPlan`.
- Add tagged errors:
  - `GraphEnsureError`
  - `GraphInvariantError`
  - `GraphSqlDialectError`

# Non-goals

- SQL execution and repositories.

# Acceptance Criteria

- S1: public type exports exist and compile.
- S1: no `any` in public types.
- S2: errors are tagged and pattern-matchable by `_tag`.

# Proof Steps

1. Run `bun --filter @effect-native/graph-db run check`.
2. Verify exported type and error symbols in `src/index.ts`.
