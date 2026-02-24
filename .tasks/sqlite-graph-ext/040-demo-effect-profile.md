# 040 — Effect v4 single-file demo + profiling

## Scope
- Implement `packages/sqlite-graph-ext-demo/src/demo.ts` with Bun single-file loading behavior.
- Execute three canonical scenarios and print statement counts + elapsed timing.
- Wrap SQLite execution with scenario-scoped statement profiling.

## Non-goals
- Finalizing API docs.
- Optional vec helpers.
- Window-optimized bucket federation extension.

## Acceptance criteria
- `Database.setCustomSQLite` and `loadExtension(..., "sqlite3_graph_ext_init")` behavior matches the cr-sqlite embed pattern.
- Demo prints scenario outputs and statement totals.
- No per-node SQL loop appears in demo logic.

## Proof steps

1. Port the embed/load fallback pattern from `packages/examples-bun/libs/index.ts`.
2. Add Effect `Schema`/`Data.TaggedError` error types for extension loading and query failures.
3. Add statement counter layer for each scenario and print summary.

## done_when

```bash
test -f packages/sqlite-graph-ext-demo/src/demo.ts && rg -n "setCustomSQLite|loadExtension|sqlite3_graph_ext_init|graph_ext_version|statement count|statement_count|scenario" packages/sqlite-graph-ext-demo/src/demo.ts
```
