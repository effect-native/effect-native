# SQLite Graph Accelerator + Effect v4 Demo (Evergreen Stateless)

Captured: 2026-02-24

## Mission

- Ship a stateless SQLite loadable extension that accelerates graph+pipeline workloads.
- Ship a minimal single-file Bun + Effect v4 demo that loads the extension and executes the 3 canonical scenarios.
- Preserve vanilla SQLite compatibility and CRR-safe constraints.
- Keep the extension build artifacts portable (macOS, Linux, Windows; x64 + arm64 where feasible).

## Non-negotiable constraints

- No daemon. No background service. No persistent process other than the host app.
- No assumptions that require CRR-unsafe schema guarantees.
- Deterministic SQL behavior for all public functions.
- Portable loading contract with `sqlite3_graph_ext_init` init symbol.
- Semantically stable and documented API, including version function.

## Public API surface contract (must be present)

- `graph_ext_version() -> TEXT`
- `idset_empty() -> BLOB`
- `idset_add(idset BLOB, id TEXT|INT) -> BLOB`
- `idset_union(a BLOB, b BLOB) -> BLOB`
- `idset_intersect(a BLOB, b BLOB) -> BLOB`
- `idset_diff(a BLOB, b BLOB) -> BLOB`
- `idset_count(idset BLOB) -> INT`
- `idset_contains(idset BLOB, id TEXT|INT) -> INT`
- `idset_hash(idset BLOB) -> TEXT`
- `idset_each(idset BLOB) -> TEXT` payload encoded as row-per-line TSV (`id\tord`, including deterministic `ord`)
- `graph_out_many(edge_table TEXT, edge_type TEXT, src_set BLOB, where_sql TEXT|NULL) -> TEXT` payload encoded as row-per-line TSV (`src\tdst`)
- `graph_in_many(edge_table TEXT, edge_type TEXT, dst_set BLOB, where_sql TEXT|NULL) -> TEXT` payload encoded as row-per-line TSV (`dst\tsrc`)
- `graph_out_idset(edge_table TEXT, edge_type TEXT, src_set BLOB) -> TEXT` payload encoded as row-per-line TSV (`src\tdst_set`)
- `graph_in_idset(edge_table TEXT, edge_type TEXT, dst_set BLOB) -> TEXT` payload encoded as row-per-line TSV (`dst\tsrc_set`)
- `graph_two_hop_counts(edge_table TEXT, hop1_edge_type TEXT, hop2_edge_type TEXT, start_set BLOB) -> TEXT` payload encoded as row-per-line TSV (`dst\tsupport_count INT`)
- `ranked_diff(old_serp_id, new_serp_id, table TEXT) -> TEXT` payload encoded as row-per-line TSV (`item\told_rank\tnew_rank\tdelta_rank\tstatus`)
- Optional:
  - `graph_two_hop_supporters(...) -> TEXT` payload encoded as row-per-line TSV (`dst\tsupporters_set`)
  - `vec_knn`, `vec_knn_idset` when sqlite-vec is available.

## Effect v4 demo contract

- Package path: `packages/sqlite-graph-ext-demo/src/demo.ts`
- Demonstrate three scenarios:
  - two-hop ranking
  - SERP ranked delta
  - idset intersection resolution
- Must print:
  - scenario result rows
  - statement count per scenario
  - elapsed milliseconds per scenario
- Must load `libsqlite` from embedded artifact or on-disk fallback.
- Must load extension with init symbol `sqlite3_graph_ext_init`.
- Must use Effect v4 typed error models and layers for DB, extension loading, and profiling.

## Performance gates

### P0

- FoF-like ranking: ≤ 3 SQL statements for traversal+count stage plus ≤ 1 hydration statement per node kind.
- No per-node SQL loops.

### P1

- `idset_union/intersect/diff` must stream large sets safely and avoid pathological memory growth.

### P2

- Stable deterministic output for the same input and stable `ord` ordering from `idset_each`.

## Gates and proof commands

### Gate 1: Package and workspace readiness

```bash
test -d packages/sqlite-graph-ext
test -d packages/sqlite-graph-ext-demo
node -e "const fs=require('fs');const p=require('./package.json'); const ws=Array.isArray(p.workspaces)?p.workspaces:[]; if(!ws.includes('packages/*')) process.exit(1)"
```

### Gate 2: Extension package contract

```bash
test -f packages/sqlite-graph-ext/package.json
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('packages/sqlite-graph-ext/package.json','utf8')); if(typeof p.name!=='string' || !p.name.includes('sqlite-graph-ext')) process.exit(1); if(!Array.isArray(p.workspaces) && !p.private) process.exit(1)"
test -f packages/sqlite-graph-ext/README.md
```

### Gate 3: Zig build/output contract

```bash
test -f packages/sqlite-graph-ext/build.zig
test -f packages/sqlite-graph-ext/src/extension.zig
rg -n "sqlite3_graph_ext_init|graph_ext_version|idset_empty|graph_two_hop_counts|ranked_diff" packages/sqlite-graph-ext/src/extension.zig
```

### Gate 4: Demo contract

```bash
test -f packages/sqlite-graph-ext-demo/src/demo.ts
rg -n "setCustomSQLite|loadExtension|graph_ext_version|statement|two-hop|ranked_diff|idset_" packages/sqlite-graph-ext-demo/src/demo.ts
```

### Gate 5: Cross-platform and optional feature hardening

```bash
rg -n "graph_ext_version\\(|sqlite3_graph_ext_init|idset_each|graph_out_many|graph_in_many|graph_two_hop_counts|ranked_diff" packages/sqlite-graph-ext/src
test -f packages/sqlite-graph-ext-demo/README.md
test -f .gaps/sqlite-graph-ext.md
```

## Continuous-loop requirement

- `.gaps/sqlite-graph-ext.md` must be refreshed from this file after every batch.
- `.tasks/work-orders.md` should list current closing work (prefer ≤5 active tasks).
- After each accepted batch, rerun Gate checks and overwrite `.gaps/sqlite-graph-ext.md`.
