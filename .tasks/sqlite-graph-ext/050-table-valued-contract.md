# 050 — Table-valued API contract cleanup

## Scope
- Decide and implement the table-valued contract for `idset_each`, `graph_out_many`, `graph_in_many`, `graph_out_idset`, and `graph_in_idset`.
- Keep set-returning behavior deterministic and stream-safe for large result sets.

## Non-goals
- Reworking core set representation format.
- Adding optional vector features in this cycle.

## Acceptance criteria
- Returned rows from traversal / idset iteration are emitted as real table rows (or API boundary is explicitly documented and locked).
- Order and grouping remain deterministic across repeated calls.

## done_when

```bash
rg -n "graph_out_many|graph_in_many|graph_out_idset|graph_in_idset|idset_each" packages/sqlite-graph-ext/src/extension.zig
```

