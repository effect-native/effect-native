# @effect-native/sqlite-graph-ext

SQLite loadable extension for graph and set-based graph operations.

## Required init symbol

- `sqlite3_graph_ext_init`

## Current foundation status

This package ships:

- platform-aware native artifact resolution
- a typed Effect client (`createGraphExtClient`) for calling extension functions
- Effect Schema v4 payload codecs for deterministic text payload contracts
- Zig extension entrypoint scaffolding

| Item                  | Status                                                 |
| --------------------- | ------------------------------------------------------ |
| init symbol           | exported                                               |
| `graph_ext_version()` | exported                                               |
| idset ops             | implemented                                            |
| traversal ops         | implemented (deterministic table-shaped text payloads) |
| ranked and diff ops   | implemented                                            |
| TS typed client       | implemented                                            |
| Effect Schema codecs  | implemented                                            |
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
- Copy the compiled extension from `zig-out/lib` or `zig-out/bin` into `lib/<platform>/sqlite3_graph_ext.*`

The build script is intended to be run in a dev shell that includes `zig`.
`flake.nix` includes `zig` in the default `devShell` for that workflow.

## Zig unit tests

```bash
bun run test-zig
```

`src/extension.zig` includes native Zig unit tests for parser, identifier safety,
SQL literal/in-clause builders, and payload text helpers. The test script links
against the bundled `@effect-native/libsqlite` artifact for the current platform.

## Function output contract

Traversal and idset expansion functions return deterministic UTF-8 text payloads encoded as newline-separated rows:

- `idset_each(idset)` -> `"id\tord\n..."`
- `graph_out_many(...)` -> `"src\tdst\n..."`
- `graph_in_many(...)` -> `"dst\tsrc\n..."`
- `graph_out_idset(...)` -> `"src\tdst_set\n..."`
- `graph_in_idset(...)` -> `"dst\tsrc_set\n..."`

For every empty input set, these APIs return an empty string.

## TypeScript API highlights

- `createGraphExtClient(db)` returns typed Effect methods for extension operations
- `idsetFromValues`, `idsetIntersect`, `idsetDiff`, `idsetUnion` build composable SQL expressions
- payload decoders use Effect Schema v4 so app code does not hand-roll TSV parsing
