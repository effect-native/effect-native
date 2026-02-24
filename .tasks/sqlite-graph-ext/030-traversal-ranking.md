# 030 — Bulk traversal + ranking primitives

## Scope
- Implement:
  - `graph_out_many`, `graph_in_many`
  - `graph_out_idset`, `graph_in_idset`
  - `graph_two_hop_counts`
- Ensure SQL calls are set-based with no N+1 patterns.

## Non-goals
- Ranked diff operator.
- Effect demo application.
- Cross-platform packaging artifacts for Windows.

## Acceptance criteria
- Traversal functions return expected edges/sets for known fixtures.
- `graph_two_hop_counts` returns stable counts across repeated execution on fixed data.
- No per-node SQL loops in operator implementation.

## Proof steps

1. Implement set-based traversal with optional deleted edge handling.
2. Implement grouped idset-return variants.
3. Add end-to-end SQL fixtures for ranking primitives.

## done_when

```bash
rg -n "graph_out_many|graph_in_many|graph_out_idset|graph_in_idset|graph_two_hop_counts" packages/sqlite-graph-ext/src/extension.zig
```
