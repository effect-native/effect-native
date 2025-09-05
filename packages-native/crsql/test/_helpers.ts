import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { Effect } from "effect"
import { CrSql } from "@effect-native/crsql"

export const layerMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

export const ensureCrSqlLoaded = Effect.gen(function* () {
  const sql = yield* NodeSqlite.SqliteClient.SqliteClient
  return yield* CrSql.CrSql.fromSqliteClient({ sql })
})

export const createTodosCrr = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient
  yield* sql`CREATE TABLE IF NOT EXISTS todos (
    id BLOB NOT NULL PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0
  )`
  yield* sql`SELECT crsql_as_crr('todos')`
})

export const hexToBlob = (hex: string) => Buffer.from(hex, "hex")

// Intentionally no generic provide helpers; inline provisions in tests for clarity.
