import * as CrSql from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as SqlClient from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import type { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import { assert, layer as withLayer } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import * as Context from "effect/Context"

// Build a SqlClient layer seeded with predefined responses
// TODO: Consider capturing prepared statement patterns or query signatures instead of exact SQL
// FIXME: Future improvement: normalize SQL whitespace or match on query structure/intent
const makeTestSqlClientLayer = (seed: Record<string, ReadonlyArray<unknown>>) =>
  Layer.scopedContext(Effect.gen(function*() {
    const responses = new Map<string, ReadonlyArray<unknown>>()
    // TODO: Could enhance with SQL parser or regex patterns to match query intent vs exact text
    for (const [k, v] of Object.entries(seed)) responses.set(k.trim(), v)

    const connection: Connection = {
      execute: (sql: string, _params, transformRows) =>
        Effect.sync(() => {
          const rows = responses.get(sql.trim()) ?? []
          return transformRows ? transformRows(rows as any) : rows
        }),
      executeRaw: () => Effect.succeed([]),
      executeStream: () => Stream.empty as Stream.Stream<unknown, SqlError>,
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

withLayer(
  CrSql.CrSql.Default.pipe(
    Layer.provide(
      makeTestSqlClientLayer({
        // TODO: For CR-SQLite, these SQL queries are part of the contract - document this decision
        // FIXME: Consider extracting SQL constants to a shared test fixture for consistency
        "SELECT hex(crsql_site_id()) AS site_id": [{ site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }],
        // TODO: Once we have more prepared statements, consider a query builder pattern
        "SELECT CAST(MAX(db_version) AS TEXT) as version FROM crsql_changes": [{ version: "42" }]
      })
    )
  )
)("CrSql", (it) => {
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
})