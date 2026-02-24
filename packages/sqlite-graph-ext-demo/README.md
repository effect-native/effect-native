# @effect-native/sqlite-graph-ext-demo

Console-first Bun + Effect v4 demo for social graph exploration with `@effect-native/sqlite-graph-ext`.

## What it demonstrates

- Loading custom `libsqlite` in Bun and loading the extension via `sqlite3_graph_ext_init`
- Parsing text payload contracts from graph/idset functions
- A non-trivial recommendation pipeline built from extension primitives

## Scenarios

1. `two-hop recommendation pipeline`
   - seeds a social follow graph
   - expands first-hop neighborhoods with `graph_out_many`
   - ranks second-hop candidates with `graph_two_hop_counts`
   - filters candidates with `idset_diff`, stabilizes order with `idset_each`, and fingerprints with `idset_hash`

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
