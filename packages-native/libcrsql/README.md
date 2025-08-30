# @effect-native/libcrsql

Absolute paths to the cr-sqlite extension binaries for common desktop/server platforms, plus an optional Effect entrypoint.

Supported platforms (verified on release):
- macOS: darwin-aarch64, darwin-x86_64
- Linux: linux-aarch64, linux-x86_64
- Windows: win-x86_64, win-i686

## Install

pnpm add @effect-native/libcrsql

## Usage (no Effect)

import Database from "better-sqlite3"
import { pathToCrSqliteExtension, getCrSqliteExtensionPathSync } from "@effect-native/libcrsql"

const db = new Database(":memory:")
db.loadExtension(pathToCrSqliteExtension)
// or explicit
// db.loadExtension(getCrSqliteExtensionPathSync("linux-x86_64"))

## Absolute constants (no side effects)

import { linux_x86_64 } from "@effect-native/libcrsql/paths"
// linux_x86_64 is an absolute string like 
// /.../node_modules/@effect-native/libcrsql/lib/linux-x86_64/libcrsqlite.so

## Effect entrypoint (optional)

import { Effect } from "effect"
import { getCrSqliteExtensionPath } from "@effect-native/libcrsql/effect"

const program = getCrSqliteExtensionPath()
Effect.runPromise(program)

## Notes
- No network or postinstall scripts. Binaries are bundled in `lib/`.
- Android and iOS are out of scope for this release.
- Root and paths entrypoints have zero external runtime dependencies.
