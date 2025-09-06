import { CrSql } from "@effect-native/crsql"
import * as NodeSqlite from "@effect/sql-sqlite-node"
import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import path from "node:path"

function dbFile(name: string) {
  const base = process.cwd()
  return path.join(base, "scratchpad", `whole-crr-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}.db`)
}

function maxVersionAndSeq(
  changes: ReadonlyArray<{
    db_version: string
    seq: number
  }>
) {
  const maxV = changes.reduce((m, c) => Math.max(m, Number(c.db_version)), 0)
  const maxVStr = String(maxV)
  const maxSeq = changes
    .filter((c) => c.db_version === maxVStr)
    .reduce((m, c) => Math.max(m, c.seq), 0)
  return { version: maxVStr, seq: maxSeq }
}

describe("Whole CRR Sync via crsql_changes + crsql_tracked_peers", () => {
  it.scoped("first sync A→B and cursor update", () =>
    Effect.gen(function*() {
      const layerA = NodeSqlite.SqliteClient.layer({ filename: dbFile("A1") })
      const layerB = NodeSqlite.SqliteClient.layer({ filename: dbFile("B1") })

      // Get B's site id first (used for exclude when pulling from A)
      const siteB = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        return yield* crsql.getSiteIdHex
      }).pipe(Effect.provide(layerB))

      // A: init schema, insert, export changes excluding B
      const fromA = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.sql`CREATE TABLE items (
          id BLOB NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        const id1 = "AAAABBBBCCCCDDDDEEEEFFFF00001111"
        const id2 = "11110000FFFFEEEEDDDDCCCCBBBBAAAA"
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id1}), 'one')`
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id2}), 'two')`
        const siteA = yield* crsql.getSiteIdHex
        const changes = yield* crsql.pullChanges("0", [siteB])
        return { changes, siteA, id1, id2 }
      }).pipe(Effect.provide(layerA))

      // B: init schema, apply, verify, update cursor
      yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.sql`CREATE TABLE items (
          id BLOB NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        yield* crsql.applyChanges(fromA.changes)
        const rowsB = yield* crsql.sql<{ id: string; text: string }>`
          SELECT hex(id) as id, text FROM items ORDER BY text
        `
        assert.deepEqual(rowsB, [
          { id: fromA.id1, text: "one" },
          { id: fromA.id2, text: "two" }
        ])
        const { seq, version } = maxVersionAndSeq(fromA.changes)
        yield* crsql.setPeerVersion({ siteId: fromA.siteA, version, seq })
        const cursor = yield* crsql.getPeerVersion(fromA.siteA)
        assert.ok(cursor !== null && cursor.version === version)
      }).pipe(Effect.provide(layerB))
    }))

  it.scoped("incremental sync A→B using tracked cursor", () =>
    Effect.gen(function*() {
      const layerA = NodeSqlite.SqliteClient.layer({ filename: dbFile("A2") })
      const layerB = NodeSqlite.SqliteClient.layer({ filename: dbFile("B2") })

      // B's site id (exclude)
      const siteB = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        return yield* crsql.getSiteIdHex
      }).pipe(Effect.provide(layerB))

      // A: initial write and export
      const first = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.sql`CREATE TABLE items (
          id BLOB NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        const id1 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id1}), 'first')`
        const siteA = yield* crsql.getSiteIdHex
        const changes = yield* crsql.pullChanges("0", [siteB])
        return { changes, siteA }
      }).pipe(Effect.provide(layerA))

      // B: apply first, store cursor
      yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.sql`CREATE TABLE items (
          id BLOB NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        yield* crsql.applyChanges(first.changes)
        const { seq, version } = maxVersionAndSeq(first.changes)
        yield* crsql.setPeerVersion({ siteId: first.siteA, version, seq })
      }).pipe(Effect.provide(layerB))

      // A: new change and export since stored cursor
      const next = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        const id2 = "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id2}), 'second')`
        const since = maxVersionAndSeq(first.changes).version
        const changes = yield* crsql.pullChanges(since, [siteB])
        return { changes }
      }).pipe(Effect.provide(layerA))

      // B: apply next and verify
      yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.applyChanges(next.changes)
        const rows = yield* crsql.sql<{ t: string }>`SELECT text as t FROM items ORDER BY t`
        assert.deepEqual(rows.map((r) => r.t), ["first", "second"])
      }).pipe(Effect.provide(layerB))
    }))

  it.scoped("two-way sync A⇄B with exclusion prevents echo", () =>
    Effect.gen(function*() {
      const layerA = NodeSqlite.SqliteClient.layer({ filename: dbFile("A3") })
      const layerB = NodeSqlite.SqliteClient.layer({ filename: dbFile("B3") })

      // Site ids and schema init
      const siteA = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.sql`CREATE TABLE items (
          id BLOB NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        return yield* crsql.getSiteIdHex
      }).pipe(Effect.provide(layerA))
      const siteB = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.sql`CREATE TABLE items (
          id BLOB NOT NULL PRIMARY KEY,
          text TEXT NOT NULL DEFAULT ''
        )`
        yield* crsql.asCrr("items")
        return yield* crsql.getSiteIdHex
      }).pipe(Effect.provide(layerB))

      // A writes and B syncs
      const a1 = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        const id1 = "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id1}), 'fromA')`
        const changes = yield* crsql.pullChanges("0", [siteB])
        return changes
      }).pipe(Effect.provide(layerA))
      yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.applyChanges(a1)
        const { seq, version } = maxVersionAndSeq(a1)
        yield* crsql.setPeerVersion({ siteId: siteA, version, seq })
      }).pipe(Effect.provide(layerB))

      // B writes and A syncs (exclude siteA, so A doesn't re-receive its own changes)
      const b1 = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        const id2 = "DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"
        yield* crsql.sql`INSERT INTO items (id, text) VALUES (unhex(${id2}), 'fromB')`
        const changes = yield* crsql.pullChanges("0", [siteA])
        return changes
      }).pipe(Effect.provide(layerB))
      yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        yield* crsql.applyChanges(b1)
      }).pipe(Effect.provide(layerA))

      // Verify convergence
      const rowsA = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        const rows = yield* crsql.sql<{ t: string }>`SELECT text as t FROM items ORDER BY t`
        return rows.map((r) => r.t)
      }).pipe(Effect.provide(layerA))
      const rowsB = yield* Effect.gen(function*() {
        const sql = yield* NodeSqlite.SqliteClient.SqliteClient
        const crsql = yield* CrSql.CrSql.fromSqliteClient({ sql })
        const rows = yield* crsql.sql<{ t: string }>`SELECT text as t FROM items ORDER BY t`
        return rows.map((r) => r.t)
      }).pipe(Effect.provide(layerB))
      assert.deepEqual(rowsA, ["fromA", "fromB"])
      assert.deepEqual(rowsB, ["fromA", "fromB"])
    }))
})
