# @effect-native/libsqlite

Universal, version‑pinned libsqlite3 that Just Works — prebuilt via Nix for macOS and Linux (glibc), with three usage styles.

## Install

```
bun add @effect-native/libsqlite@3.50
```

The npm version matches the bundled SQLite version (e.g., `3.50.2`). JS‑only fixes may use `-N` suffix (e.g., `3.50.2-1`).

## Usage

### 1) Typical Node/Bun — just a string path

```ts
import { pathToLibSqlite } from "@effect-native/libsqlite"
db.loadExtension(pathToLibSqlite)
```

### 2) Power user — static paths, zero logic

```ts
import { linux_x86_64 } from "@effect-native/libsqlite/paths"
db.loadExtension(linux_x86_64)
```

### 3) Effect user — idiomatic Effect API

```ts
import { getLibSqlitePath } from "@effect-native/libsqlite/effect"
import * as Effect from "effect/Effect"

const program = Effect.gen(function* () {
  const p = yield* getLibSqlitePath
  return p
})
```

## Platforms

- macOS: arm64, x86_64
- Linux (glibc): x86_64, aarch64

If you'd like musl or Windows support, please open an issue and we'll prioritize it. We actively want to support platforms you care about.

## Versioning

- Package version matches the bundled SQLite version.
- JS-only or packaging tweaks use a hyphenated suffix without changing SQLite (pre-release semantics):
  - Examples: `3.50.2-1`, `3.50.2-2`, …
- Tip: pre-release style version strings don’t satisfy ranges by default; use an exact version or a dist-tag.
  - Example: `pnpm add @effect-native/libsqlite@3.50.2-2` or maintain a `latest` dist-tag.
