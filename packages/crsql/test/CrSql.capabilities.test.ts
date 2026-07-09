import { describe, expect, it } from "@effect-native/bun-test"
import { CrSql } from "@effect-native/crsql"
import * as CrSqliteExtension from "@effect-native/crsql/CrSqliteExtension"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import { Effect } from "effect"
import { SqlClient, SqlError } from "effect/unstable/sql"

describe("CrSql capability: unhex missing", () => {
  it.effect("preserves the SQL failure when unhex() is missing", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const loadedExtensionInfo = yield* CrSqliteExtension.loadLibCrSql
      const sqlWithoutUnhex = new Proxy(sql, {
        apply(target, thisArg, args) {
          if (Array.isArray(args[0]) && args[0].join("").includes("hex(unhex('00'))")) {
            return Effect.fail(
              new SqlError.SqlError({
                reason: new SqlError.UnknownError({
                  cause: "unhex unavailable",
                  message: "unhex unavailable"
                })
              })
            )
          }
          return Reflect.apply(target, thisArg, args)
        }
      })

      const error = yield* CrSql.fromSqliteClient({ loadedExtensionInfo, sql: sqlWithoutUnhex }).pipe(Effect.flip)

      expect(error._tag).toBe("UnhexUnavailable")
      expect(error.cause).toHaveProperty("_tag", "SqlError")
    }).pipe(Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))))
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
