import { CrSql } from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { createTodosCrr, ensureCrSqlLoaded, hexToBlob } from "./_helpers"

layer(Layer.mergeAll(Reactivity.layer, Layer.scope))((it) => {
  it.scoped("applyChanges: exports from DB1 apply into DB2", () =>
    Effect.gen(function*() {
      // Single provided connections per DB to keep :memory: state
      const Db1 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

      const pkA = "00112233445566778899AABBCCDDEEFF"
      const pkB = "FFEEDDCCBBAA99887766554433221100"

      // DB1: create CRR, insert, then export (same connection)
      const exported = yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (${hexToBlob(pkA)}, 'Alpha', 0)`
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (${hexToBlob(pkB)}, 'Beta', 1)`
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.pullChanges("0")
      }).pipe(Effect.provide(Db1))
      assert.ok(exported.length > 0)

      // DB2: create CRR, apply, and verify (same connection)
      yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        yield* crsql.applyChanges(exported)

        const sql = yield* SqlClient.SqlClient
        const rowsA = yield* sql<{ content: string; completed: number }>`
          SELECT content, completed FROM todos WHERE id = ${hexToBlob(pkA)}
        `
        const rowsB = yield* sql<{ content: string; completed: number }>`
          SELECT content, completed FROM todos WHERE id = ${hexToBlob(pkB)}
        `
        assert.strictEqual(rowsA.length, 1)
        assert.strictEqual(rowsA[0].content, "Alpha")
        assert.strictEqual(rowsA[0].completed, 0)
        assert.strictEqual(rowsB.length, 1)
        assert.strictEqual(rowsB[0].content, "Beta")
        assert.strictEqual(rowsB[0].completed, 1)
      }).pipe(Effect.provide(Db2))
    }))

  it.scoped("tracked peers: set/get works across DBs", () =>
    Effect.gen(function*() {
      const Db1 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })

      // DB2: make one change
      const pk = "00112233445566778899AABBCCDDEEFF"
      yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO todos (id, content, completed) VALUES (${hexToBlob(pk)}, 'Gamma', 0)`
      }).pipe(Effect.provide(Db2))

      const site2 = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.getSiteIdHex
      }).pipe(Effect.provide(Db2))

      const v2 = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.getDbVersion
      }).pipe(Effect.provide(Db2))

      // DB1: record DB2's version
      yield* Effect.gen(function*() {
        yield* ensureCrSqlLoaded
        yield* createTodosCrr
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.setPeerVersion(site2, v2, 0)
      }).pipe(Effect.provide(Db1))

      // Validate tracked peer info in DB1
      const tracked = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        // Sanity check: table exists
        const sql = yield* SqlClient.SqlClient
        // Will error if table missing
        yield* sql`SELECT COUNT(*) AS n FROM crsql_tracked_peers`
        return yield* crsql.getPeerVersion(site2)
      }).pipe(Effect.provide(Db1))
      assert.deepEqual(tracked, { version: v2, seq: 0 })
    }))
})
