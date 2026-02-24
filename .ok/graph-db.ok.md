# @effect-native/graph-db Definition of Done

## STATE

### S0: Baseline

- `packages/graph-db` does not exist.
- No Graph DB service exists in this monorepo.

### S1: Public API and Packaging

- `packages/graph-db` is scaffolded as a workspace package.
- Public API exports:
  - `makeGraphDb(spec)` returning `{ GraphDb, layer }`
  - `GraphDialect` service
  - schema/spec/types/errors modules required by implementation
- `makeGraphDb(spec).layer` requires:
  - `SqlClient.SqlClient` from `effect/unstable/sql/SqlClient`
  - `GraphDialect`
- `GraphDb` service exposes:
  - `ensure`
  - `node.put / node.get / node.queryById`
  - `edge.put / edge.out / edge.in`

### S2: Runtime Behavior

- Ensure system is expand-only and driver-agnostic:
  - creates missing tables
  - adds missing columns
  - adds missing non-unique indexes
  - returns incompatible plans for destructive needs
- SQLite dialect supports qualified table names (`schema.table`) for introspection.
- Node repo:
  - encodes domain to row
  - inserts/upserts
  - decodes row to domain
  - decode failures surface as typed errors
- Edge repo:
  - deterministic edge id
  - no duplicates by PK
  - `out` / `in` traversal behaves as expected
- CRR mode planning rules:
  - no secondary unique indexes
  - no checked foreign keys
  - alter operations can be wrapped with CR-SQLite begin/commit markers in plan output

### S3: Developer Guidance

- `packages/graph-db/docs/v4-notes.md` contains v4 migration guardrails with do/don't examples.
- `packages/graph-db/README.md` provides copy/paste setup and usage examples.

### E0: Evidence Gates

Pass when all are true:

1. `bun --filter @effect-native/graph-db test`
2. `bun --filter @effect-native/graph-db run check`
3. `bun run lint-fix`

---

## TRUTH

### T0: Known Facts

- Repository is Bun workspace with `packages/*`.
- Effect v4 beta is in use (`effect` and `@effect/*` are aligned in this repo).
- Existing code uses `ServiceMap.Service` and `effect/unstable/sql`.
- `@effect-native/bun-test` is the normative test harness in project patterns.
- `@effect/sql-sqlite-bun` is already used by `packages/crsql` tests.

### Assumptions

- `@effect/sql-sqlite-bun` can be used for `:memory:` tests in `graph-db`.
- Effect v4 APIs in this workspace support planned `ServiceMap` and SQL imports.
- CR-SQLite extension is optional for this package; CRR mode can be validated by plan-level tests if extension is absent.

---

## GAP

### R0: Risks / Obstacles

- Effect v4 yieldable/service changes can cause type churn.
- `effect/unstable/sql` API surface may evolve; keep unstable imports internal.
- SQLite schema introspection and qualified table handling can be error-prone.
- CRR compatibility rules must prevent accidental emission of incompatible DDL.

### G0: Missing Artifacts vs Target

- Missing package scaffold and exports (`S1`).
- Missing graph spec, schema plan, dialect, and errors (`S1`, `S2`).
- Missing ensure implementation and tests for expand-only DDL (`S2`).
- Missing node/edge repos and traversal/roundtrip tests (`S2`).
- Missing CRR plan behavior and tests (`S2`).
- Missing v4 notes and README examples (`S3`).

---

## WORK

### W0: Methods and Proofs

W0 follows incremental slices tracked in `.tasks/graph-db/`:

1. `000-bootstrap`
2. `010-v4-migration-guardrails`
3. `020-core-types-and-errors`
4. `030-service-and-layer`
5. `040-sqlite-dialect`
6. `050-cr-sqlite-mode`
7. `060-repos-nodes`
8. `070-repos-edges`
9. `080-docs-and-examples`

Proof method:

- Red/Green tests per slice.
- Small commits after each completed slice.
- Final evidence run meets `E0`.
