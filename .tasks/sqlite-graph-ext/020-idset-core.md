# 020 — Implement idset core + iterator

## Scope
- Implement stable `idset_*` scalar operations and `idset_each` table iterator.
- Define deterministic blob format and stable ordering guarantee.
- Add property and golden tests for set algebra and iteration order.

## Non-goals
- Traversal operators.
- Two-hop ranking math.
- SERP diff operator.

## Acceptance criteria
- All required `idset_*` functions and `idset_each` exist.
- `idset_empty`, `idset_count`, `idset_contains`, `idset_hash` are correct.
- Iteration order is deterministic under repeated runs.

## Proof steps

1. Add core idset representation and scalar UDFs.
2. Add table-valued iterator for rows `(id, ord)`.
3. Add tests for union/intersect/diff algebra and deterministic ordering.

## done_when

```bash
rg -n "idset_empty|idset_add|idset_union|idset_intersect|idset_diff|idset_count|idset_contains|idset_hash|idset_each" packages/sqlite-graph-ext/src/extension.zig
```
