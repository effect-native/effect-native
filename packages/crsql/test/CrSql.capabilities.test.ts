import { describe, expect, it } from "@effect-native/bun-test"
import * as CrSqliteExtension from "@effect-native/crsql/CrSqliteExtension"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import { Effect } from "effect"

describe("CrSql capability: unhex missing", () => {
  // Removing a built-in SQLite function requires a purpose-built driver harness.
  it.todo("fails with UnhexUnavailable when unhex() is missing")
})

describe("CrSql capability: crsqlite missing", () => {
  it.effect("preserves the SQL failure when crsql_site_id() is missing", () =>
    Effect.gen(function*() {
      const error = yield* CrSqliteExtension.sqlExtInfo.pipe(Effect.flip)

      expect(error._tag).toBe("CrSqliteExtensionMissing")
      expect(error.cause).toBeDefined()
      expect(error.cause).toHaveProperty("_tag", "SqlError")
    }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))
})
