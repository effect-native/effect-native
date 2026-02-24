# Gaps Snapshot: .ok/sqlite-graph-ext.ok.md

Captured: 2026-02-24 21:10:00 UTC
Branch: HEAD
HEAD: bace4beacc1fde95974a683010581e0d2aaf759b
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
- `packages/sqlite-graph-ext/build.zig` and `packages/sqlite-graph-ext/src/extension.zig` exist and expose `sqlite3_graph_ext_init` + `graph_ext_version` scaffolding.
- Demo imports and loads extension lifecycle using Bun embedding behavior (`setCustomSQLite`, `loadExtension`).
- Workspace root now references both new packages in `tsconfig.json`.
- `zig` binary is not present in the current environment (`zig_missing`), and extension artifacts are still absent from `packages/sqlite-graph-ext/lib/*`.
- `idset_*`, `graph_*`, `ranked_diff`, and real traversal primitives are still stubs/placeholders.
- Cross-platform shared objects/dlls are not yet emitted.

## Non-gated notes

- Existing Bun single-file embedding/loading pattern remains mirrored from `packages/examples-bun/libs/index.ts`.
- No prior attempt exists for this initiative in `.tasks/`.

## Prioritized work-order evidence

1. Implement `idset_*` algebra + deterministic iterator primitives.
2. Implement traversal and ranking SQL primitives.
3. Implement `ranked_diff`.
4. Add optional/aux APIs and compile pipelines in `build.zig` for all supported platforms.
5. Replace demo placeholder scenario SQL with real extension query shapes and per-scenario statement-count assertions.
