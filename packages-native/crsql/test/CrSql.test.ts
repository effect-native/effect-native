import * as CrSql from "@effect-native/crsql"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as SqlClient from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import type { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"

// Test double: Records queries and returns predetermined responses
const makeFakeSqlClient = (responses: Record<string, Array<unknown>>) =>
  Effect.gen(function*() {
    const queries: Array<{ sql: string; params: ReadonlyArray<Statement.Primitive> }> = []

    const connection: Connection = {
      execute: (sql: string, params: ReadonlyArray<Statement.Primitive>, _transformRows) =>
        Effect.sync(() => {
          queries.push({ sql, params })
          const response = responses[sql.trim()]
          if (!response) throw new Error(`Unexpected query: ${sql}`)
          return response
        }),
      executeRaw: (sql: string, params: ReadonlyArray<Statement.Primitive>) =>
        Effect.sync(() => {
          queries.push({ sql, params })
          const response = responses[sql.trim()]
          if (!response) throw new Error(`Unexpected query: ${sql}`)
          return response
        }),
      executeStream: () => Stream.empty as Stream.Stream<unknown, SqlError>,
      executeValues: () =>
        Effect.succeed([]) as Effect.Effect<ReadonlyArray<ReadonlyArray<Statement.Primitive>>, SqlError>,
      executeUnprepared: (sql: string, params: ReadonlyArray<Statement.Primitive>, _transformRows) =>
        Effect.sync(() => {
          queries.push({ sql, params })
          const response = responses[sql.trim()]
          if (!response) throw new Error(`Unexpected query: ${sql}`)
          return response
        })
    }

    const client = yield* SqlClient.make({
      acquirer: Effect.succeed(connection),
      compiler: Statement.makeCompilerSqlite(),
      spanAttributes: [["test", true]]
    }).pipe(Effect.provide(Reactivity.layer))

    return { queries, client }
  })

describe("CrSqlService", () => {
  it.scoped("getSiteIdHex executes site ID query and returns hex string", () => {
    return Effect.gen(function*() {
      const fake = yield* makeFakeSqlClient({
        "SELECT hex(crsql_site_id()) AS site_id": [{ site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }]
      })

      // Build a test program with the fake SqlClient
      const program = Effect.gen(function*() {
        const siteId = yield* CrSql.CrSql.getSiteIdHex
        return { siteId }
      })

      // Just-in-time: Provide SqlClient to CrSql layer when needed
      const crsqlLayer = CrSql.CrSql.Default.pipe(
        Layer.provide(Layer.succeed(SqlClient.SqlClient, fake.client))
      )

      const result = yield* Effect.provide(program, crsqlLayer)

      assert.strictEqual(result.siteId, "A1B2C3D4E5F6789012345678ABCDEF90")
      assert.strictEqual(fake.queries.length, 1)
      assert.strictEqual(fake.queries[0].sql, "SELECT hex(crsql_site_id()) AS site_id")
      assert.deepStrictEqual(fake.queries[0].params, [])
    })
  })
})
