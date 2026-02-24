# @effect-native/sqlite-graph-ext-demo

Console-first Bun + Effect v4 demo for social graph exploration with `@effect-native/sqlite-graph-ext`.

## What it demonstrates

- Loading custom `libsqlite` in Bun and loading the extension via `sqlite3_graph_ext_init`
- Using the typed TypeScript client (`createGraphExtClient`) instead of hand-rolled SQL + payload parsing in app code
- Effect Schema v4 decoding inside the package for payload contracts

## Scenarios

1. `recommendation DX comparison`
   - runs one high-level extension call (`graph.recommendByTwoHop`)
   - runs an equivalent raw CTE query without the extension abstraction
   - prints why the extension path is smaller, safer, and easier to reason about

2. `cohort neighborhood lens`
   - aggregates outbound follow sets with `graph_out_idset`
   - aggregates inbound supporter sets with `graph_in_idset`
   - computes overlap between two users with `idset_intersect` + `idset_each`

3. `creator momentum with ranked_diff`
   - compares ranking snapshots with `ranked_diff`
   - prints enters/exits/moves in a social-feed style report

Each scenario prints:

- result rows
- `statementCount=<N>`
- `elapsedMs=<N>`

## Run

```bash
bun run run
```
