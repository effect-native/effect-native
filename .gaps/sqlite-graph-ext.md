# Gaps Snapshot: .ok/sqlite-graph-ext.ok.md

Captured: 2026-02-24 18:45:27 EST
Branch: feat/sqlite-graph-ext-accelerator
HEAD: 9bc952cd4eecebc909e3ace632110e0b83154e5e
Bun: 1.3.5
Node: v24.12.0
System: Darwin arm64

## Gates

- Gate 1 (package and workspace readiness): PASS
- Gate 2 (extension package contract): PASS
- Gate 3 (zig build/output contract): PASS
- Gate 4 (demo contract): PASS
- Gate 4B (demo DX clarity contract): PASS
- Gate 5 (cross-platform + hardening): PASS

## Gate Findings

- `packages/sqlite-graph-ext` and `packages/sqlite-graph-ext-demo` exist and include required files from the .ok gates.
- `packages/sqlite-graph-ext/src/extension.zig` contains required symbols including `sqlite3_graph_ext_init`, `graph_two_hop_counts`, and `ranked_diff`.
- Iterator outputs remain deterministic UTF-8 text payload contracts for idset/graph functions (`idset_each`, `graph_out_many`, `graph_in_many`, `graph_out_idset`, `graph_in_idset`, `graph_two_hop_counts`, `ranked_diff`).
- Demo now uses package-level Bun bootstrap helper (`@effect-native/sqlite-graph-ext/bun`, `withBunGraphRuntime`) and no longer inlines `setCustomSQLite` or `loadExtension` ritual code.
- DX comparison now uses one shared `recommendationInput` for extension and baseline paths and emits explicit `parity-check` output with `PARITY_CONFIRMED` / `MISMATCH_DETECTED` indicator.
- Demo scenario functions use consistent `Effect.fn` style; orchestration remains `Effect.gen`.
- Statement profiling remains centralized in one scenario context (`onStatement` hook + SQL wrapper).
- Seed fixtures are now named constants (`SOCIAL_EDGE_FIXTURES`, `FEED_RANKING_FIXTURES`) rather than giant inline SQL walls.
- Added Bun runtime helper module `packages/sqlite-graph-ext/src/bun.ts` and subpath export `@effect-native/sqlite-graph-ext/bun`.
- Added typed client decode-path tests in `packages/sqlite-graph-ext/test/client.decode-path.test.ts`.
- Existing cross-platform artifacts remain present for all six targets under `packages/sqlite-graph-ext/lib/*`.

## Prioritized work-order evidence

1. Keep demo DX contract (`Gate 4B`) green whenever demo/runtime abstractions change.
2. Keep Bun helper + typed client decode-path tests green alongside existing contract tests.
