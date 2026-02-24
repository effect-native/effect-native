# Gaps Snapshot: .ok/sqlite-graph-ext.ok.md

Captured: 2026-02-24 17:28:22 EST
Branch: feat/sqlite-graph-ext-accelerator
HEAD: 5c632a2f456cfcb947484b06cc976ff993ad6aea
Bun: 1.3.5
Node: v24.12.0
System: Darwin arm64

## Gates

- Gate 1 (package and workspace readiness): PASS
- Gate 2 (extension package contract): PASS
- Gate 3 (zig build/output contract): PASS
- Gate 4 (demo contract): PASS
- Gate 5 (cross-platform + hardening): PASS

## Gate Findings

- `packages/sqlite-graph-ext` and `packages/sqlite-graph-ext-demo` exist and include required files from the .ok gates.
- `packages/sqlite-graph-ext/src/extension.zig` contains all required symbols, including `sqlite3_graph_ext_init` and all required function implementations.
- Iterator outputs are deterministic and consistently emitted as UTF-8 text payloads for idset/graph APIs (`idset_each`, `graph_out_many`, `graph_in_many`, `graph_out_idset`, `graph_in_idset`, `graph_two_hop_counts`, `ranked_diff`).
- `ranked_diff`, `graph_two_hop_counts`, and `graph_two_hop_supporters` now emit empty and non-empty payloads as text.
- Demo still follows the three-scenario flow and prints rows, `statementCount`, and `elapsedMs`.
- `packages/sqlite-graph-ext/lib` now contains built artifacts for all supported targets (`darwin-aarch64`, `darwin-x86_64`, `linux-aarch64`, `linux-x86_64`, `win-x86_64`, `win-i686`).
- Windows artifacts are produced under `zig-out/bin` by Zig (`sqlite3_graph_ext.dll` + import library), so `copy-graph-ext-artifacts.mjs` now searches both `zig-out/bin` and `zig-out/lib`.
- `vec_knn` and `vec_knn_idset` remain placeholders and are still optional in `.ok`.

## Prioritized work-order evidence

1. Keep extension artifacts and contract artifacts in sync when changing build/publish or extension code.
2. Continue normal regression checks from `.ok/sqlite-graph-ext.ok.md` on future batches: Gates 1-5 plus platform artifact checks and contract tests.
