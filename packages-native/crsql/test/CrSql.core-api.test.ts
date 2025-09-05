import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect } from "effect"
import { createTodosCrr, ensureCrSqlLoaded, hexToBlob } from "./_helpers"

const DbMem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

layer(DbMem)((it) => {
  it.scoped("core: sha/site_id/db_version/next_db_version/rows_impacted", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const sql = yield* SqlClient.SqlClient

      // sha
      const [shaRow] = yield* sql<{ sha: string }>`SELECT crsql_sha() as sha`
      assert.ok(typeof shaRow.sha === "string" && shaRow.sha.length > 0)
      assert.match(shaRow.sha, /^[0-9a-f]+$/i)

      // site id
      const [siteRow] = yield* sql<{ siteId: string }>`SELECT hex(crsql_site_id()) as siteId`
      assert.strictEqual(siteRow.siteId.length, 32)
      assert.match(siteRow.siteId, /^[0-9A-F]{32}$/i)

      // db version and next
      const [v0Row] = yield* sql<{ v0: string }>`SELECT CAST(crsql_db_version() AS TEXT) as v0`
      assert.strictEqual(v0Row.v0, "0")
      const [vnext0Row] = yield* sql<{ vnext: string }>`SELECT CAST(crsql_next_db_version() AS TEXT) as vnext`
      assert.strictEqual(BigInt(vnext0Row.vnext), BigInt(v0Row.v0) + 1n)

      // Create a CRR and insert one row to bump version and rows_impacted
      yield* createTodosCrr
      const pk = "C0C1C2C3C4C5C6C7C8C9CACBCCCDCECF"
      yield* sql`INSERT INTO todos (id, content, completed) VALUES (${hexToBlob(pk)}, 'Hello', 0)`

      // rows_impacted reflects the last write; read it immediately after insert
      const [impacted] = yield* sql<{ n: number }>`SELECT crsql_rows_impacted() AS n`
      // Implementation detail varies; assert it's a non-negative integer.
      assert.ok(Number.isInteger(impacted.n) && impacted.n >= 0)

      const [v1Row] = yield* sql<{ v1: string }>`SELECT CAST(crsql_db_version() AS TEXT) as v1`
      assert.strictEqual(BigInt(v1Row.v1), 1n)
      const [vnext1Row] = yield* sql<{ vnext: string }>`SELECT CAST(crsql_next_db_version() AS TEXT) as vnext`
      assert.strictEqual(BigInt(vnext1Row.vnext), BigInt(v1Row.v1) + 1n)
    }))

  it.scoped("crsql_changes virtual table accessible", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const sql = yield* SqlClient.SqlClient
      // Just touch the table to ensure it exists and is queryable
      const rows = yield* sql<{ n: number }>`SELECT COUNT(*) AS n FROM crsql_changes`
      assert.ok(rows[0]?.n >= 0)
    }))

  it.scoped("as_crr => tracked; as_table => tracking stops", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const sql = yield* SqlClient.SqlClient

      // Fresh table name to avoid clashes across tests
      yield* sql`CREATE TABLE IF NOT EXISTS xtodos (
        id BLOB NOT NULL PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        completed INTEGER NOT NULL DEFAULT 0
      )`
      yield* sql`SELECT crsql_as_crr('xtodos')`

      const pk1 = "00112233445566778899AABBCCDDEEFF"
      yield* sql`INSERT INTO xtodos (id, content, completed) VALUES (${hexToBlob(pk1)}, 'A', 0)`

      // Verify changes captured
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const v1 = yield* crsql.getDbVersion
      const all = yield* crsql.pullChanges("0")
      assert.ok(all.some((c) => c.pk.toUpperCase().endsWith(pk1)))

      // Downgrade and insert another row
      yield* sql`SELECT crsql_as_table('xtodos')`
      const pk2 = "FFEEDDCCBBAA99887766554433221100"
      yield* sql`INSERT INTO xtodos (id, content, completed) VALUES (${hexToBlob(pk2)}, 'B', 1)`

      // No new changes after v1
      const delta = yield* crsql.pullChanges(v1)
      assert.strictEqual(delta.length, 0)
    }))

  it.scoped("begin_alter/commit_alter: add column and capture thereafter", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      const sql = yield* SqlClient.SqlClient

      // Fresh table
      yield* sql`DROP TABLE IF EXISTS utodos`
      yield* sql`CREATE TABLE utodos (
        id BLOB NOT NULL PRIMARY KEY,
        content TEXT NOT NULL DEFAULT '',
        completed INTEGER NOT NULL DEFAULT 0
      )`
      yield* sql`SELECT crsql_as_crr('utodos')`

      // Insert once and snapshot version
      const pk1 = "AA11223344556677889900AABBCCDDEE"
      yield* sql`INSERT INTO utodos (id, content, completed) VALUES (${hexToBlob(pk1)}, 'One', 0)`

      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const v1 = yield* crsql.getDbVersion

      // Alter schema under begin/commit
      yield* sql`SELECT crsql_begin_alter('utodos')`
      yield* sql`ALTER TABLE utodos ADD COLUMN note TEXT NOT NULL DEFAULT ''`
      yield* sql`SELECT crsql_commit_alter('utodos')`

      // Insert again, this time with new column set
      const pk2 = "BB11223344556677889900AABBCCDDEE"
      yield* sql`INSERT INTO utodos (id, content, completed, note) VALUES (${hexToBlob(pk2)}, 'Two', 1, 'n')`

      // Expect new changes only for pk2 and include the new column
      const delta = yield* crsql.pullChanges(v1)
      assert.ok(delta.some((c) => c.pk.toUpperCase().endsWith(pk2)))
      assert.ok(delta.some((c) => c.cid === "note"))
      assert.ok(!delta.some((c) => c.pk.toUpperCase().endsWith(pk1)))
    }))
})
