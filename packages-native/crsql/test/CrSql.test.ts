import * as Reactivity from "@effect/experimental/Reactivity"
import * as SqlClient from "@effect/sql/SqlClient"
import type * as Connection from "@effect/sql/SqlConnection"
import type * as SqlError from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import { layer as withLayer } from "@effect/vitest"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as assert from "node:assert"
import * as CrSql from "../src/index.js"

// Build a SqlClient layer with pattern-based response matching
// Matches queries based on SQL patterns and parameters rather than exact SQL
const makeTestSqlClientLayer = (seed: Record<string, ReadonlyArray<object>>) =>
  Layer.scopedContext(Effect.gen(function*() {
    const connection: Connection.Connection = {
      execute: (
        sql: string,
        params: ReadonlyArray<any>,
        transformRows?: (rows: ReadonlyArray<any>) => ReadonlyArray<any>
      ) =>
        Effect.sync(() => {
          let rows: ReadonlyArray<object> = []

          // Pattern-based matching for different query types
          if (sql.includes("crsql_site_id()")) {
            rows = seed.crsql_site_id || []
          } else if (sql.includes("crsql_db_version()")) {
            rows = seed.db_version || []
          } else if (sql.includes("FROM crsql_changes")) {
            // For pullChanges, differentiate by the 'since' parameter and exclusions
            const sinceParam = params?.[0] || "0"

            if (sql.includes("NOT IN")) {
              // excludeSites variant
              const key = `crsql_changes:since=${sinceParam}:excludes`
              rows = seed[key] || []
            } else {
              // normal variant
              const key = `crsql_changes:since=${sinceParam}`
              rows = seed[key] || seed["crsql_changes:default"] || []
            }
          } else if (sql.includes("INSERT INTO crsql_changes")) {
            // For applyChanges INSERT operations
            rows = seed.insert_crsql_changes || []
          } else if (sql.includes("INSERT OR REPLACE INTO crsql_tracked_peers")) {
            // For setPeerVersion operations - just return success
            rows = []
          } else if (sql.includes("FROM crsql_tracked_peers")) {
            // For getPeerVersion operations - return from seed data
            const siteIdParam = params?.[0] || ""
            const key = `peer_version:${siteIdParam}`
            rows = seed[key] || []
          }

          return transformRows ? transformRows(rows) : rows
        }),
      executeRaw: () => Effect.succeed([]),
      executeStream: () => Stream.empty as Stream.Stream<unknown, SqlError.SqlError>,
      executeValues: () => Effect.succeed([]),
      executeUnprepared: () => Effect.succeed([])
    }

    const client = yield* SqlClient.make({
      acquirer: Effect.succeed(connection),
      compiler: Statement.makeCompilerSqlite(),
      spanAttributes: []
    }).pipe(Effect.provide(Reactivity.layer))

    return Context.make(SqlClient.SqlClient, client)
  }))

const testLayer = makeTestSqlClientLayer({
  // Core CR-SQLite function mocks
  "crsql_site_id": [
    { site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }
  ],
  "db_version": [
    { version: "42" }
  ],
  // pullChanges scenarios with different since values
  "crsql_changes:default": [
    {
      table: "todos",
      pk: "41424344",
      cid: "content",
      val: "Buy milk",
      val_type: "text",
      col_version: "1",
      db_version: "1",
      site_id: "A1B2C3D4E5F6789012345678ABCDEF90",
      cl: 0,
      seq: 0
    }
  ],
  "crsql_changes:since=0": [
    {
      table: "todos",
      pk: "41424344",
      cid: "content",
      val: "Buy milk",
      val_type: "text",
      col_version: "1",
      db_version: "1",
      site_id: "A1B2C3D4E5F6789012345678ABCDEF90",
      cl: 0,
      seq: 0
    },
    {
      table: "todos",
      pk: "45464748",
      cid: "completed",
      val: 1,
      val_type: "integer",
      col_version: "2",
      db_version: "2",
      site_id: "B2C3D4E5F6789012345678ABCDEF90A1",
      cl: 1,
      seq: 1
    }
  ],
  "crsql_changes:since=5": [
    {
      table: "todos",
      pk: "494A4B4C",
      cid: "content",
      val: "Walk dog",
      val_type: "text",
      col_version: "6",
      db_version: "6",
      site_id: "C3D4E5F6789012345678ABCDEF90A1B2",
      cl: 2,
      seq: 2
    }
  ],
  "crsql_changes:since=5:excludes": [
    {
      table: "todos",
      pk: "494A4B4C",
      cid: "content",
      val: "Walk dog",
      val_type: "text",
      col_version: "6",
      db_version: "6",
      site_id: "C3D4E5F6789012345678ABCDEF90A1B2",
      cl: 2,
      seq: 2
    }
  ],
  "insert_crsql_changes": [],
  "insert_peer_version": [],
  "peer_version:B2C3D4E5F6789012345678ABCDEF90A1": [
    { version: "25", seq: 1 }
  ]
})

withLayer(testLayer)("CrSql", (it) => {
  it.scoped("returns SiteIdHex for this database", () =>
    Effect.gen(function*() {
      const siteId = yield* CrSql.CrSql.getSiteIdHex
      assert.strictEqual(siteId, "A1B2C3D4E5F6789012345678ABCDEF90")
    }))

  it.scoped("returns the database version", () =>
    Effect.gen(function*() {
      const version = yield* CrSql.CrSql.getDbVersion
      assert.strictEqual(version, "42")
    }))

  it.scoped("pulls all changes from the database", () =>
    Effect.gen(function*() {
      const changes = yield* CrSql.CrSql.pullChanges()
      assert.strictEqual(changes.length, 2)
      assert.strictEqual(changes[0].table, "todos")
      assert.strictEqual(changes[0].pk, "41424344")
      assert.strictEqual(changes[1].table, "todos")
      assert.strictEqual(changes[1].pk, "45464748")
    }))

  it.scoped("pulls changes since a specific version", () =>
    Effect.gen(function*() {
      const changes = yield* CrSql.CrSql.pullChanges("5")
      assert.strictEqual(changes.length, 1)
      assert.strictEqual(changes[0].table, "todos")
      assert.strictEqual(changes[0].pk, "494A4B4C")
    }))

  it.scoped("applies a change to the database", () =>
    Effect.gen(function*() {
      const change: CrSql.schema.ChangeRowSerialized = {
        table: "todos",
        pk: "51525354",
        cid: "content",
        val: "Feed cat",
        val_type: "text",
        col_version: "7",
        db_version: "7",
        site_id: "D4E5F6789012345678ABCDEF90A1B2C3",
        cl: 3,
        seq: 3
      }
      yield* CrSql.CrSql.applyChanges([change])
      // Test succeeds if no error is thrown
    }))

  it.scoped("pulls changes excluding specific sites", () =>
    Effect.gen(function*() {
      const changes = yield* CrSql.CrSql.pullChanges("5", ["A1B2C3D4E5F6789012345678ABCDEF90"])
      assert.strictEqual(changes.length, 1)
      assert.strictEqual(changes[0].site_id, "C3D4E5F6789012345678ABCDEF90A1B2")
    }))

  it.scoped("retrieves version for a known peer", () =>
    Effect.gen(function*() {
      const result = yield* CrSql.CrSql.getPeerVersion("B2C3D4E5F6789012345678ABCDEF90A1")
      assert.deepEqual(result, { version: "25", seq: 1 })
    }))

  it.scoped("returns null for unknown peer", () =>
    Effect.gen(function*() {
      const result = yield* CrSql.CrSql.getPeerVersion("UNKNOWN012345678ABCDEF90A1B2C3D4")
      assert.strictEqual(result, null)
    }))
})
