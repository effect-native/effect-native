import { describe, expect, it } from "@effect-native/bun-test"
import { GraphDialect, GraphDialectSqlite, type TableDef } from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as SqlClient from "effect/unstable/sql/SqlClient"

describe("SQLite GraphDialect CRR planning", () => {
  it.effect("plan rejects secondary unique indexes in CRR mode", () =>
    Effect.gen(function*() {
      const dialect = yield* GraphDialect

      const table: TableDef = {
        name: "node_user",
        replication: "crr",
        columns: [
          { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
          { name: "name", sqlType: "TEXT", notNull: true }
        ],
        indexes: [
          { name: "node_user_name_unique", columns: ["name"], unique: true }
        ]
      }

      const plan = yield* dialect.planTable(table)

      expect(plan.incompatible.length).toBeGreaterThan(0)
      expect(plan.incompatible.some((issue) => issue.reason === "UniqueIndexForbiddenInCrr")).toBe(true)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          BunSqlite.SqliteClient.layer({ filename: ":memory:" }),
          GraphDialectSqlite.layer()
        )
      )
    ))

  it.effect("plan wraps alter statements with crsql begin/commit in CRR mode", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const dialect = yield* GraphDialect

      yield* sql.unsafe("CREATE TABLE node_user (id TEXT PRIMARY KEY NOT NULL)")

      const table: TableDef = {
        name: "node_user",
        replication: "crr",
        columns: [
          { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
          { name: "name", sqlType: "TEXT", notNull: true, defaultSql: "''" }
        ],
        indexes: []
      }

      const plan = yield* dialect.planTable(table)

      expect(plan.statements.length).toBeGreaterThan(0)
      expect(plan.statements.some((statement) => statement.includes("crsql_begin_alter"))).toBe(true)
      expect(plan.statements.some((statement) => statement.includes("ALTER TABLE"))).toBe(true)
      expect(plan.statements.some((statement) => statement.includes("crsql_commit_alter"))).toBe(true)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          BunSqlite.SqliteClient.layer({ filename: ":memory:" }),
          GraphDialectSqlite.layer()
        )
      )
    ))
})
