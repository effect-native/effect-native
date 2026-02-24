# Gaps Snapshot: .ok/sqlite-graph-ext.ok.md

Captured: 2026-02-24 21:35:14 UTC
Branch: feat/sqlite-graph-ext-accelerator
HEAD: d61a6ffc9
Bun: 1.3.9
Node: v24.3.0
System: darwin x64

## Gates

- Gate 1 (package and workspace readiness): PASS
- Gate 2 (extension package contract): PARTIAL
- Gate 3 (zig build/output contract): PARTIAL
- Gate 4 (demo contract): PARTIAL
- Gate 5 (cross-platform + hardening): PARTIAL

## Gate Findings

- `packages/sqlite-graph-ext` scaffold exists with `package.json`, `tsconfig` files, `README`, and platform path helpers.
- `packages/sqlite-graph-ext-demo` scaffold exists with `demo.ts` and package metadata.
- `packages/sqlite-graph-ext/build.zig` and `packages/sqlite-graph-ext/src/extension.zig` expose `sqlite3_graph_ext_init` + `graph_ext_version`.
- Core `idset_*` scalar ops are implemented with deterministic newline-delimited canonical set representation (`idset_add`, `idset_union`, `idset_intersect`, `idset_diff`, `idset_count`, `idset_contains`, `idset_hash`, `idset_empty`).
- Demo imports and loads extension lifecycle using Bun embedding behavior (`setCustomSQLite`, `loadExtension`).
- Workspace root now references both new packages in `tsconfig.json`.
- `zig` binary is not present in the current environment (`zig_missing`), and extension artifacts are still absent from `packages/sqlite-graph-ext/lib/*`.
- `idset_each` now emits a deterministic iterable payload (`id\tord` lines) from the canonical set.
- `graph_out_many`, `graph_in_many`, `graph_out_idset`, `graph_in_idset` are implemented as deterministic payload-returning functions (not true table-valued iterators).
- `graph_two_hop_counts`, `graph_two_hop_supporters`, and `ranked_diff` are now implemented.
- Demo scenarios now execute the ranking, SERP delta, and resolution query shapes.
- `vec_knn` and `vec_knn_idset` remain placeholders.
- Cross-platform shared objects/dlls are not yet emitted.

## Non-gated notes

- Existing Bun single-file embedding/loading pattern remains mirrored from `packages/examples-bun/libs/index.ts`.
- `.tasks/` has the bootstrap → foundation → idset-core → traversal-ranking → demo-profile sequence.

## Prioritized work-order evidence

1. Convert payload-style traversal and iterator functions to table-valued semantics (`idset_each`, `graph_*`) or document API boundary explicitly.
2. Add production-safe filtering support for traversal (`deleted_at` handling, safe where_sql governance).
3. Build and verify platform artifacts in `packages/sqlite-graph-ext/lib/*` for all supported OS/arch targets.
4. Add coverage for two-hop supporter support and ranked diff ordering/edge cases.
5. Update README/API docs with exact API contracts for the implemented payload formats.
