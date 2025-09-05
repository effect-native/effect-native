import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as SqlClient from "@effect/sql/SqlClient"
import { assert, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { createTodosCrr, ensureCrSqlLoaded, hexToBlob } from "./_helpers"

const layers = Layer.mergeAll(
  NodeSqlite.SqliteClient.layer({ filename: ":memory:" }),
  Reactivity.layer,
  Layer.scope
)

layer(layers)((it) => {
  it.scoped("CrSql basic (node): gets site id", () =>
    Effect.gen(function*() {
      const crsql = yield* CrSql.CrSql.fromSqliteClient({
        sql: yield* NodeSqlite.SqliteClient.make({ filename: ":memory:" })
      })
      const siteId = yield* crsql.getSiteIdHex
      assert.strictEqual(siteId.length, 32)
      assert.match(siteId, /^[0-9A-F]{32}$/i)
    }))

  it.scoped("CrSql basic (node): gets db version", () =>
    Effect.gen(function*() {
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const version = yield* crsql.getDbVersion
      assert.strictEqual(version, "0")
    }))

  it.scoped("CrSql basic (node): pullChanges empty", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      yield* createTodosCrr
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const changes = yield* crsql.pullChanges("0")
      assert.strictEqual(changes.length, 0)
    }))

  // Helpers for CRR setup used across tests
  it.scoped("CrSql CRR + changes: records after insert", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      yield* createTodosCrr
      const sql = yield* SqlClient.SqlClient
      const pk1 = "00112233445566778899AABBCCDDEEFF"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${hexToBlob(pk1)}, 'Buy milk', 0)`
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const changes = yield* crsql.pullChanges("0")
      assert.ok(changes.length > 0)
      const forPk1 = changes.filter((c) => c.pk.toUpperCase().endsWith(pk1))
      assert.ok(forPk1.some((c) => c.cid === "content" && c.val === "Buy milk"))
      assert.ok(forPk1.some((c) => c.cid === "completed" && c.val === 0))
    }))

  it.scoped("CrSql CRR + changes: delta since version", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      yield* createTodosCrr
      const sql = yield* SqlClient.SqlClient
      const pk1 = "00112233445566778899AABBCCDDEEFF"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${hexToBlob(pk1)}, 'Buy milk', 0)`
      const crsql1 = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const v1 = yield* crsql1.getDbVersion
      const pk2 = "FFEEDDCCBBAA99887766554433221100"
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${hexToBlob(pk2)}, 'Feed cat', 1)`
      const crsql2 = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const delta = yield* crsql2.pullChanges(v1)
      assert.ok(delta.length > 0)
      const hasPk2 = delta.some((c) => c.pk.toUpperCase().endsWith(pk2))
      const hasPk1 = delta.some((c) => c.pk.toUpperCase().endsWith(pk1))
      assert.ok(hasPk2)
      assert.ok(!hasPk1)
    }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))))

  it.scoped("CrSql CRR + changes: excludes local site", () =>
    Effect.gen(function*() {
      yield* ensureCrSqlLoaded
      yield* createTodosCrr
      const sql = yield* SqlClient.SqlClient
      yield* sql`INSERT INTO todos (id, content, completed)
                   VALUES (${hexToBlob("00112233445566778899AABBCCDDEEFF")}, 'Buy milk', 0)`
      const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
      const site = yield* crsql.getSiteIdHex
      const excluded = yield* crsql.pullChanges("0", [site])
      assert.strictEqual(excluded.length, 0)
    }).pipe(Effect.provide(NodeSqlite.SqliteClient.layer({ filename: ":memory:" }))))

  // Keep end-to-end apply across DBs covered by CrSql.apply.test.ts
  it.scoped.skip("CrSql end-to-end: exports from DB1 and applies to DB2", () =>
    Effect.gen(function*() {
      // DB1 layer
      const Db1 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      // DB2 layer
      const Db2Mem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2: Layer.Layer<NodeSqlite.SqliteClient.SqliteClient | SqlClient.SqlClient, never> = Layer.effect(
        NodeSqlite.SqliteClient.SqliteClient,
        Effect.gen(function*() {
          const client = yield* NodeSqlite.SqliteClient.SqliteClient
          const ext = yield* getCrSqliteExtensionPath()
          yield* client.loadExtension(ext).pipe(Effect.orDie)
          return client
        })
      ).pipe(Layer.provide(Db2Mem)) as unknown as Layer.Layer<
        NodeSqlite.SqliteClient.SqliteClient | SqlClient.SqlClient,
        never
      >

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
      const exported = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.pullChanges("0")
      }).pipe(Effect.provide(Db1))
      assert.ok(exported.length > 0)

      // Prepare DB2: same table schema
      yield* createTodosCrr.pipe(Effect.provide(Db2))
      // Apply into DB2
      yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.applyChanges(exported)
      }).pipe(Effect.provide(Db2))

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

  // Keep peer tracking flows covered by CrSql.peer.test.ts
  it.scoped.skip("CrSql end-to-end: tracks peer version across DBs", () =>
    Effect.gen(function*() {
      const Db1 = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2Mem = NodeSqlite.SqliteClient.layer({ filename: ":memory:" })
      const Db2: Layer.Layer<NodeSqlite.SqliteClient.SqliteClient | SqlClient.SqlClient, never> = Layer.effect(
        NodeSqlite.SqliteClient.SqliteClient,
        Effect.gen(function*() {
          const client = yield* NodeSqlite.SqliteClient.SqliteClient
          const ext = yield* getCrSqliteExtensionPath()
          yield* client.loadExtension(ext).pipe(Effect.orDie)
          return client
        })
      ).pipe(Layer.provide(Db2Mem)) as unknown as Layer.Layer<
        NodeSqlite.SqliteClient.SqliteClient | SqlClient.SqlClient,
        never
      >

      // Setup DB2 and make a change so it has a version > 0
      yield* createTodosCrr.pipe(Effect.provide(Db2))
      const pk = "00112233445566778899AABBCCDDEEFF"
      yield* Effect.gen(function*() {
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO todos (id, content, completed)
                     VALUES (${Buffer.from(pk, "hex")}, 'Gamma', 0)`
      }).pipe(Effect.provide(Db2))

      const site2 = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.getSiteIdHex
      }).pipe(Effect.provide(Db2))

      const v2 = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.getDbVersion
      }).pipe(Effect.provide(Db2))

      // Record DB2's version in DB1 tracked_peers
      yield* createTodosCrr.pipe(Effect.provide(Db1)) // ensure CRR exists so peer table exists
      yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.setPeerVersion(site2, v2, 0)
      }).pipe(Effect.provide(Db1))

      const tracked = yield* Effect.gen(function*() {
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql: yield* NodeSqlite.SqliteClient.SqliteClient })
        return yield* crsql.getPeerVersion(site2)
      }).pipe(Effect.provide(Db1))
      assert.deepEqual(tracked, { version: v2, seq: 0 })
    }))
})
