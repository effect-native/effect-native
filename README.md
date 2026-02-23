# Effect Native

An ecosystem of native platform tools built on [Effect](https://effect.website).

| Status                                                                       | Package                                    | Purpose                                                                                         |
| ---------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| ![](https://img.shields.io/npm/v/note)                                       | note                                       | Create timestamped markdown notes from the command line                                         |
| ![](https://img.shields.io/npm/v/effect-native)                              | effect-native                              | Effect Native CLI that shrinks feedback loops for ultra extreme programmers                     |
| ![](https://img.shields.io/npm/v/@effect-native/bun-test)                    | @effect-native/bun-test                    | Helpers for testing every Effect with bun:test                                                  |
| ![](https://img.shields.io/npm/v/@effect-native/libsqlite)                   | @effect-native/libsqlite                   | Universal, version-pinned libsqlite3 that Just Works — prebuilt via Nix with per-platform paths |
| ![](https://img.shields.io/npm/v/@effect-native/libcrsql)                    | @effect-native/libcrsql                    | Absolute paths to cr-sqlite extension binaries for Node.js with optional Effect API             |
| ![](https://img.shields.io/npm/v/@effect-native/crsql)                       | @effect-native/crsql                       | CR-SQLite prepared statements and service for Effect SQL                                        |
| ![](https://img.shields.io/npm/v/@effect-native/debug)                       | @effect-native/debug                       | JS runtime debugger protocol abstraction                                                        |
| ![](https://img.shields.io/npm/v/@effect-native/schemas)                     | @effect-native/schemas                     | Reusable Effect Schema definitions for common data types                                        |
| ![](https://img.shields.io/npm/v/@effect-native/patterns)                    | @effect-native/patterns                    | Worked examples showing Effect module patterns (TypeId, dual, Equal.symbol, Hash.symbol)        |
| ![](https://img.shields.io/npm/v/@effect-native/fetch-hooks)                 | @effect-native/fetch-hooks                 | Fetch caching utilities for deterministic API replay                                            |
| ![](https://img.shields.io/npm/v/@effect-native/tui-testing-library)         | @effect-native/tui-testing-library         | PTY-based testing utilities for TUI applications with Ghostty WASM emulator                     |
| ![](https://img.shields.io/npm/v/@effect-native/opentui-dom)                 | @effect-native/opentui-dom                 | Effect-based DOM adapter interface for unified DOM access across environments                   |
| ![](https://img.shields.io/npm/v/@effect-native/opentui-dom-testing-library) | @effect-native/opentui-dom-testing-library | Testing utilities for rendering React components in happy-dom                                   |

## Roadmap

See [the Effect Native Project Board](https://github.com/orgs/effect-native/projects/1/views/1) to see what we're working on next.

## Development

`v4` is bun-first. Run commands directly with Bun on your host machine:

```bash
# Install dependencies
bun install --frozen-lockfile

# Run all checks
bun run ok

# Run tests
bun run test

# Build all packages
bun run build
```

Use Nix as an optional convenience when you want CI-like isolation:

```bash
nix develop --command bun install --frozen-lockfile
nix develop --command bun run ok
```

## License

MIT
