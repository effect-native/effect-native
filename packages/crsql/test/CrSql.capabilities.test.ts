import { describe, expect, it } from "@effect-native/bun-test"
import * as CrSqliteExtension from "@effect-native/crsql/CrSqliteExtension"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import { Effect } from "effect"

/**
 * Capability Tests (Deferred for v0.0.0)
 *
 * These tests require purpose-built harnesses that run SQLite under
 * constrained environments (e.g., with `unhex()` removed or the
 * CR-SQLite extension unavailable). Standing up those matrices is out of
 * scope for the v0.0.0 release, so we explicitly mark these as TODO.
 *
 * Rationale: We follow a fail-fast policy at runtime, but creating
 * synthetic environments in CI to remove capabilities is non-trivial and
 * better handled as a dedicated follow-up in a future minor version.
 */

describe("CrSql capability: unhex missing", () => {
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
