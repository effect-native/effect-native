import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"

const DbMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

layer(DbMem)((it) => {
  it.scoped("fractAsOrdered creates fractindex view", () =>
    Effect.gen(function*() {
      const sql = yield* SqlClient.SqlClient
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      // Minimal table with an order column
      yield* sql`CREATE TABLE fi_items (id TEXT PRIMARY KEY, ord TEXT NOT NULL DEFAULT '')`
      yield* crsql.fractAsOrdered("fi_items", "ord")
      // The extension creates a helper view named {table}_fractindex
      const [exists] = yield* sql<{ n: number }>`
        SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'fi_items_fractindex'
      `
      assert.strictEqual(exists.n, 1)
    }))

  it.todo("fractKeyBetween: generate key between two existing ordered keys")
})
