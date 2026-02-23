import { layer } from "@effect-native/bun-test"
import { CrSql } from "@effect-native/crsql"
import * as CrSqliteExtension from "@effect-native/crsql/CrSqliteExtension"
import * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import { Effect } from "effect"
import * as Schema from "effect/Schema"
import * as assert from "node:assert"

const DbMem = BunSqlite.SqliteClient.layer({ filename: ":memory:" })

layer(DbMem)((it) => {
  it.effect("fromSqliteClient: accepts loadedExtensionInfo effect", () =>
    Effect.gen(function*() {
      // Ensure the CR-SQLite extension is actually loaded on this connection.
      // This fulfills the contract that callers providing loadedExtensionInfo
      // have already taken ownership of loading the native extension.
      const preloaded = yield* CrSqliteExtension.loadLibCrSql
      assert.ok(typeof preloaded.sha === "string" && preloaded.sha.length > 0)

      // Provide only the loading metadata via the loadedExtensionInfo effect.
      // fromSqliteClient will still verify the extension via sqlExtInfo and
      // merge both into the ExtInfoLoaded service.

      const info = Effect.succeed({
        loadedAt: new Date(),
        path: null
      }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(CrSqlSchema.ExtInfoLoaded)))

      yield* info

      const sql = yield* BunSqlite.SqliteClient.SqliteClient
      const crsql = yield* CrSql.fromSqliteClient({
        sql,
        loadedExtensionInfo: info
      })

      // Basic sanity: service works and queries extension state.
      const sha = yield* crsql.getSha
      assert.match(sha, /^[0-9a-f]+$/i)

      const siteId = yield* crsql.getSiteIdHex
      assert.strictEqual(siteId.length, 32)
      assert.match(siteId, /^[0-9A-F]{32}$/i)
    }))

  it.effect("ExtInfoLoaded decodeUnknown succeeds with encoded shape", () =>
    Effect.gen(function*() {
      const encoded = { path: null as string | null, loadedAt: new Date() }

      const typed = yield* Schema.decodeUnknownEffect(CrSqlSchema.ExtInfoLoaded)(encoded)
      const roundTripped = yield* Schema.encodeEffect(CrSqlSchema.ExtInfoLoaded)(typed)
      assert.strictEqual(roundTripped.path, null)
      assert.ok(roundTripped.loadedAt instanceof Date)
      assert.strictEqual(roundTripped.loadedAt.getTime(), encoded.loadedAt.getTime())
    }))

  it.effect("ExtInfoLoaded decodeUnknown fails for invalid shape", () =>
    Effect.gen(function*() {
      const bad = { path: 123 as unknown, loadedAt: new Date() }
      const res = yield* Schema.decodeUnknownEffect(CrSqlSchema.ExtInfoLoaded)(bad).pipe(Effect.result)
      assert.strictEqual(res._tag, "Failure")
    }))
})
