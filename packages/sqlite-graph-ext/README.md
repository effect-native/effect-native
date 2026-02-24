# @effect-native/sqlite-graph-ext

SQLite loadable extension for graph and set-based graph operations.

## Required init symbol

- `sqlite3_graph_ext_init`

## Current foundation status

This package starts with a stable TypeScript API surface for platform-aware path resolution and
Zig extension entrypoint scaffolding.

| Item                  | Status                                                 |
| --------------------- | ------------------------------------------------------ |
| init symbol           | exported                                               |
| `graph_ext_version()` | exported                                               |
| idset ops             | implemented                                            |
| traversal ops         | implemented (deterministic table-shaped text payloads) |
| ranked and diff ops   | implemented                                            |
| demo                  | tracked in sibling package                             |

## Supported platforms

- `darwin-aarch64`
- `darwin-x86_64`
- `linux-aarch64`
- `linux-x86_64`
- `win-x86_64`
- `win-i686`

## Output artifact names

- `lib/darwin-aarch64/sqlite3_graph_ext.dylib`
- `lib/darwin-x86_64/sqlite3_graph_ext.dylib`
- `lib/linux-aarch64/sqlite3_graph_ext.so`
- `lib/linux-x86_64/sqlite3_graph_ext.so`
- `lib/win-x86_64/sqlite3_graph_ext.dll`
- `lib/win-i686/sqlite3_graph_ext.dll`

## Build

```bash
cd packages/sqlite-graph-ext
bun run build
```

This runs:

- `zig build -Doptimize=ReleaseSafe`
- Copy the compiled extension from `zig-out/lib` into `lib/<platform>/sqlite3_graph_ext.*`

The build script is intended to be run in a dev shell that includes `zig`.
`flake.nix` includes `zig` in the default `devShell` for that workflow.

## Function output contract

Traversal and idset expansion functions return deterministic UTF-8 text payloads encoded as newline-separated rows:

- `idset_each(idset)` -> `"id\tord\n..."`
- `graph_out_many(...)` -> `"src\tdst\n..."`
- `graph_in_many(...)` -> `"dst\tsrc\n..."`
- `graph_out_idset(...)` -> `"src\tdst_set\n..."`
- `graph_in_idset(...)` -> `"dst\tsrc_set\n..."`

For every empty input set, these APIs return an empty string.
