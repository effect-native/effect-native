# @effect-native/sqlite-graph-ext

SQLite loadable extension for graph and set-based graph operations.

## Required init symbol

- `sqlite3_graph_ext_init`

## Current foundation status

This package starts with a stable TypeScript API surface for platform-aware path resolution and
Zig extension entrypoint scaffolding.

| Item | Status |
| --- | --- |
| init symbol | exported |
| `graph_ext_version()` | exported |
| idset ops | scaffold stub |
| traversal ops | scaffold stub |
| demo | tracked in sibling package |

## Supported platforms

- `darwin-aarch64`
- `darwin-x86_64`
- `linux-aarch64`
- `linux-x86_64`
- `win-x86_64`
- `win-i686`

## Output artifact names

- `lib/sqlite3_graph_ext.dylib`
- `lib/sqlite3_graph_ext.so`
- `lib/sqlite3_graph_ext.dll`
