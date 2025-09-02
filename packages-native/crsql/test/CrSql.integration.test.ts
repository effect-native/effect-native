/**
 * Integration tests for CR‑SQLite using @effect/sql-sqlite-node + @effect-native/libcrsql.
 *
 * These are pure Node tests; nix/CLI is no longer required.
 */

import * as CrSql from "@effect-native/crsql"
import { pathToCrSqliteExtension } from "@effect-native/libcrsql"
import * as LibCrSql from "@effect-native/libcrsql/effect"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, it, layer } from "@effect/vitest"
import { Effect, Layer, pipe } from "effect"
import * as Console from "effect/Console"
import * as Context from "effect/Context"


const makeNodeSqlite = (options: NodeSqlite.SqliteClient.SqliteClientConfig) =>
  pipe(
    NodeCrSqliteLayer,
    Effect.provide(NodeSqlite.SqliteClient.layer(options)),
    Effect.scoped
  )

const fkjdhfsdkjh = makeNodeSqlite({ filename: ":memory:" })

// Compose a Layer that opens an in-memory db and loads the CR-SQLite extension
const InMemorySqliteClient = NodeSqlite.SqliteClient.layer({ filename: ":memory:" }).pipe(
  (layer) => layer, //
  Layer.tap(
    (it) => Console.log("New in-memory SQLite DB for test", Context.get(it, NodeSqlite.SqliteClient.SqliteClient))
  ),
  // Console.log("New in-memory SQLite DB for test", )),
  Layer.map((context) => context),
  Layer.map((context) => context)
)

const LoadCrSqliteExtension = Layer.scopedDiscard(
  Effect.flatMap(NodeSqlite.SqliteClient.SqliteClient, (client) => client.loadExtension(pathToCrSqliteExtension))
)
const InMemorySqliteClientWithCr = Layer.mergeAll(
  InMemorySqliteClient
  // LoadCrSqliteExtension,
)

layer(InMemorySqliteClientWithCr)("CrSql basic with @effect/sql-sqlite-node", (it) => {
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
      // Ensure at least one CRR exists so crsql_changes is present
      yield* createTodosCrr
      const changes = yield* CrSql.CrSql.pullChanges("0")
      assert.strictEqual(changes.length, 0)
    }))
})

// Helpers for CRR setup used across tests
const createTodosCrr = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  // Basic CRR table: id as 16-byte BLOB primary key for deterministic hex pk
  yield* sql`CREATE TABLE IF NOT EXISTS todos (
    id BLOB NOT NULL PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    completed INTEGER NOT NULL DEFAULT 0
  )`
  yield* sql`SELECT crsql_as_crr('todos')`
})

layer(InMemorySqliteClientWithCr)("CrSql CRR + changes", (it) => {
  it.scoped("records changes after CRR table insert", () =>
    Effect.gen(function*() {
      yield* createTodosCrr

      const sql = yield* SqlClient.SqlClient
      const pk1 = "00112233445566778899AABBCCDDEEFF"
      const pk1buf = Buffer.from(pk1, "hex")
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${pk1buf}, 'Buy milk', 0)`

      const changes = yield* CrSql.CrSql.pullChanges("0")
      assert.ok(changes.length > 0)
      const forPk1 = changes.filter((c) => c.pk.toUpperCase() === pk1)
      assert.ok(forPk1.some((c) => c.cid === "content" && c.val === "Buy milk"))
      assert.ok(forPk1.some((c) => c.cid === "completed" && c.val === 0))
    }))

  it.scoped("pulls only newer changes since version", () =>
    Effect.gen(function*() {
      yield* createTodosCrr

      const sql = yield* SqlClient.SqlClient
      const pk1 = "00112233445566778899AABBCCDDEEFF"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${Buffer.from(pk1, "hex")}, 'Buy milk', 0)`
      const v1 = yield* CrSql.CrSql.getDbVersion

      const pk2 = "FFEEDDCCBBAA99887766554433221100"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${Buffer.from(pk2, "hex")}, 'Feed cat', 1)`

      const delta = yield* CrSql.CrSql.pullChanges(v1)
      assert.ok(delta.length > 0)
      const pks = new Set(delta.map((c) => c.pk.toUpperCase()))
      assert.ok(pks.has(pk2))
      assert.ok(!pks.has(pk1))
    }))

  it.scoped("excludes local site when requested", () =>
    Effect.gen(function*() {
      yield* createTodosCrr
      const sql = yield* SqlClient.SqlClient
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${Buffer.from("00112233445566778899AABBCCDDEEFF", "hex")}, 'Buy milk', 0)`
      const site = yield* CrSql.CrSql.getSiteIdHex
      const excluded = yield* CrSql.CrSql.pullChanges("0", [site])
      assert.strictEqual(excluded.length, 0)
    }))
})

layer(InMemorySqliteClientWithCr)("CrSql end-to-end replication between two DBs", () => {
  it.scoped("exports from DB1 and applies to DB2", () =>
    Effect.gen(function*() {
      // DB1 layer
      const Db1 = InMemorySqliteClientWithCr
      // DB2 layer
      const Db2Mem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2 = Layer.mergeAll(Db2Mem, LoadCrSqliteExtension)

      // Prepare DB1: table + some data
      yield* createTodosCrr.pipe(Effect.provide(Db1))
      const pkA = "00112233445566778899AABBCCDDEEFF"
      const pkB = "FFEEDDCCBBAA99887766554433221100"
      yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${Buffer.from(pkA, "hex")}, 'Alpha', 0)`
        yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${Buffer.from(pkB, "hex")}, 'Beta', 1)`
      }).pipe(Effect.provide(Db1))

      // Export all changes from DB1
      const exported = yield* CrSql.CrSql.pullChanges("0").pipe(Effect.provide(Db1))
      assert.ok(exported.length > 0)

      // Prepare DB2: same table schema
      yield* createTodosCrr.pipe(Effect.provide(Db2))
      // Apply into DB2
      yield* CrSql.CrSql.applyChanges(exported).pipe(Effect.provide(Db2))

      // Verify rows exist in DB2 with correct values
      yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        const rowsA = yield* sql<{ content: string; completed: number }>`
          SELECT content, completed FROM todos WHERE id = ${Buffer.from(pkA, "hex")}
        `
        const rowsB = yield* sql<{ content: string; completed: number }>`
          SELECT content, completed FROM todos WHERE id = ${Buffer.from(pkB, "hex")}
        `
        assert.strictEqual(rowsA.length, 1)
        assert.strictEqual(rowsA[0].content, "Alpha")
        assert.strictEqual(rowsA[0].completed, 0)
        assert.strictEqual(rowsB.length, 1)
        assert.strictEqual(rowsB[0].content, "Beta")
        assert.strictEqual(rowsB[0].completed, 1)
      }).pipe(Effect.provide(Db2))
    }))

  it.scoped("tracks peer version across DBs", () =>
    Effect.gen(function*() {
      const Db1 = InMemorySqliteClientWithCr
      const Db2Mem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2 = Layer.mergeAll(Db2Mem, LoadCrSqliteExtension)

      // Setup DB2 and make a change so it has a version > 0
      yield* createTodosCrr.pipe(Effect.provide(Db2))
      const pk = "00112233445566778899AABBCCDDEEFF"
      yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${Buffer.from(pk, "hex")}, 'Gamma', 0)`
      }).pipe(Effect.provide(Db2))

      const site2 = yield* CrSql.CrSql.getSiteIdHex.pipe(Effect.provide(Db2))
      const v2 = yield* CrSql.CrSql.getDbVersion.pipe(Effect.provide(Db2))

      // Record DB2's version in DB1 tracked_peers
      yield* createTodosCrr.pipe(Effect.provide(Db1)) // ensure CRR exists so peer table exists
      yield* CrSql.CrSql.setPeerVersion(site2, v2, 0).pipe(Effect.provide(Db1))

      const tracked = yield* CrSql.CrSql.getPeerVersion(site2).pipe(Effect.provide(Db1))
      assert.deepEqual(tracked, { version: v2, seq: 0 })
    }))
})
