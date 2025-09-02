/**
 * Integration tests for CR‑SQLite using @effect/sql-sqlite-node + @effect-native/libcrsql.
 *
 * These are pure Node tests; nix/CLI is no longer required.
 */

import * as CrSql from "@effect-native/crsql"
import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
import { SqliteClient } from "@effect/sql-sqlite-node"
import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"

// Compose a Layer that opens an in-memory db and loads the CR-SQLite extension
const SqliteBase = SqliteClient.layer({ filename: ":memory:" })
const LoadCrSql = Layer.scopedDiscard(
  Effect.flatMap(SqliteClient.SqliteClient, (c) => c.loadExtension(pathToCrSqliteExtension))
)
const SqliteWithCr = Layer.mergeAll(
  SqliteBase,
  LoadCrSql.pipe(Layer.provide(SqliteBase))
)

layer(SqliteWithCr)("CrSql basic with @effect/sql-sqlite-node", (it) => {
  it.scoped("gets site ID from real CrSql service", () =>
    Effect.gen(function*() {
      const siteId = yield* CrSql.CrSql.getSiteIdHex
      assert.strictEqual(siteId.length, 32)
      assert.match(siteId, /^[0-9A-F]{32}$/i)
    }))

  it.scoped("gets database version from real CR-SQLite", () =>
    Effect.gen(function*() {
      const version = yield* CrSql.CrSql.getDbVersion
      assert.strictEqual(version, "0")
    }))

  it.scoped("pullChanges works with empty database", () =>
    Effect.gen(function*() {
      const changes = yield* CrSql.CrSql.pullChanges("0")
      assert.strictEqual(changes.length, 0)
    }))
})

// NOTE: Peer tracking tests rely on unhex() availability. The Node runner
// typically lacks unhex without extra extensions; those are validated via CLI.

// Tests always run in Node with the in-memory DB + CR-SQLite extension
