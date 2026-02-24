# Gaps Snapshot: .ok/sqlite-graph-ext.ok.md

Captured: 2026-02-24 20:59:51 UTC
Branch: HEAD
HEAD: cc81076f3
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
- `idset_each`, `graph_*`, `ranked_diff`, and real traversal/ranking primitives are still stubs/placeholders.
- Cross-platform shared objects/dlls are not yet emitted.

## Non-gated notes

- Existing Bun single-file embedding/loading pattern remains mirrored from `packages/examples-bun/libs/index.ts`.
- `.tasks/` has the bootstrap → foundation → idset-core → traversal-ranking → demo-profile sequence.

## Prioritized work-order evidence

1. Implement `idset_*` algebra + deterministic iterator primitives.
1. Implement `idset_each` (iterator shape or compatibility shim).
2. Implement traversal and ranking SQL primitives.
3. Implement `ranked_diff`.
4. Add optional/aux APIs and compile pipelines in `build.zig` for all supported platforms.
5. Replace demo placeholder scenario SQL with real extension query shapes and per-scenario statement-count assertions.
