# @effect-native/sqlite-graph-ext-demo

Minimal Bun single-file Effect v4 demo for the graph extension.

## What it demonstrates

- Custom `libsqlite` bootstrapping for Bun
- `sqlite3_graph_ext_init` extension loading with embedded fallback
- three scenario entry points:
  - ranking
  - delta
  - resolution
- per-scenario statement count and elapsed timing output

## Run

```bash
bun run run
```
