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
- Must use Effect v4 typed error models and explicit runtime boundaries for DB, extension loading, and profiling.

### Demo DX clarity contract

- Bootstrap path is one obvious ritual: resolve artifacts, configure SQLite, open DB, and load extension in a single runtime acquisition flow (no duplicated inline bootstrap sequences).
- DX comparison semantics stay fixed: one shared scenario input drives both extension and baseline runs, and output sections use explicit `with-extension-*` and `without-extension-*` labels.
- Effect style is consistent: scenario functions use one idiom (`Effect.fn`) and orchestration uses `Effect.gen`; avoid mixed per-scenario styles.
- Statement counting is centralized in one profiling surface (`onStatement` hook + SQL wrapper), not scattered manual increments.
- Seed data is readable: avoid giant inline SQL walls and repeated fixture literals; prefer named constants/fixtures reused by scenarios.

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
rg -n "withBunGraphRuntime|graph_ext_version|statement|two-hop|ranked_diff|idset_|recommendByTwoHop" packages/sqlite-graph-ext-demo/src/demo.ts
```

### Gate 4B: Demo DX clarity contract

```bash
rg -n "@effect-native/sqlite-graph-ext/bun|withBunGraphRuntime" packages/sqlite-graph-ext-demo/src/demo.ts
node -e "const fs=require('fs');const src=fs.readFileSync('packages/sqlite-graph-ext-demo/src/demo.ts','utf8');const count=(re)=>((src.match(re)||[]).length);if(count(/\\bsetCustomSQLite\\s*\\(/g)!==0)process.exit(1);if(count(/\\bloadExtension\\s*\\(/g)!==0)process.exit(1)"
rg -n "const recommendationInput =" packages/sqlite-graph-ext-demo/src/demo.ts
rg -n "recommendByTwoHop\(recommendationInput\)|runNaiveTwoHopWithoutExtension\(context, recommendationInput\)" packages/sqlite-graph-ext-demo/src/demo.ts
node -e "const fs=require('fs');const src=fs.readFileSync('packages/sqlite-graph-ext-demo/src/demo.ts','utf8');if(!src.includes('with-extension-summary')||!src.includes('without-extension-summary')||!src.includes('parity-check'))process.exit(1)"
node -e "const fs=require('fs');const src=fs.readFileSync('packages/sqlite-graph-ext-demo/src/demo.ts','utf8');if(!src.includes('PARITY_CONFIRMED')||!src.includes('MISMATCH_DETECTED'))process.exit(1)"
node -e "const fs=require('fs');const src=fs.readFileSync('packages/sqlite-graph-ext-demo/src/demo.ts','utf8');const scenarioDefs=(src.match(/const\\s+\\w+Scenario\\s*=\\s*Effect\\.fn\\(/g)||[]).length;if(scenarioDefs<3)process.exit(1);if(/const\\s+\\w+Scenario\\s*=\\s*Effect\\.gen\\(/.test(src))process.exit(1)"
node -e "const fs=require('fs');const src=fs.readFileSync('packages/sqlite-graph-ext-demo/src/demo.ts','utf8');const hits=(src.match(/statementCount\\.value\\s*\\+=\\s*1/g)||[]).length;if(hits!==2)process.exit(1)"
rg -n "SOCIAL_EDGE_TABLE|SOCIAL_EDGE_TYPE|SOCIAL_EDGE_FIXTURES|FEED_RANKING_FIXTURES" packages/sqlite-graph-ext-demo/src/demo.ts
node -e "const fs=require('fs');const lines=fs.readFileSync('packages/sqlite-graph-ext-demo/src/demo.ts','utf8').split(/\\r?\\n/);const tooWideInsert=lines.some((line)=>line.includes('INSERT INTO')&&line.length>220);if(tooWideInsert)process.exit(1)"
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
