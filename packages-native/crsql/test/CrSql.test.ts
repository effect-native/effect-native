import * as CrSqlPackage from "@effect-native/crsql"
import * as SqlClient from "@effect/sql/SqlClient"
import * as Statement from "@effect/sql/Statement"
import type { SqlError } from "@effect/sql/SqlError"
import type { Connection } from "@effect/sql/SqlConnection"
import * as Reactivity from "@effect/experimental/Reactivity"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"

// Test double: Records queries and returns predetermined responses
const makeFakeSqlClient = (responses: Record<string, unknown[]>) =>
  Effect.gen(function* () {
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
      executeStream: () => Stream.empty as Stream.Stream<any, SqlError>,
      executeValues: () => Effect.succeed([]) as Effect.Effect<ReadonlyArray<ReadonlyArray<Statement.Primitive>>, SqlError>,
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
    return Effect.gen(function* () {
      const fake = yield* makeFakeSqlClient({
        "SELECT hex(crsql_site_id()) AS site_id": [{ site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }]
      })

      // Build a test program with the fake SqlClient
      const program = Effect.gen(function* () {
        const service = yield* CrSqlPackage.CrSql.CrSql
        return yield* service.getSiteIdHex
      })

      // Provide the layers and run the program
      const crsqlLayer = Layer.provideMerge(
        CrSqlPackage.CrSql.layer,
        Layer.succeed(SqlClient.SqlClient, fake.client)
      )

      const result = yield* Effect.provide(program, crsqlLayer)

      assert.strictEqual(result, "A1B2C3D4E5F6789012345678ABCDEF90")
      assert.strictEqual(fake.queries.length, 1)
      assert.strictEqual(fake.queries[0].sql, "SELECT hex(crsql_site_id()) AS site_id")
      assert.deepStrictEqual(fake.queries[0].params, [])
    })
  })
})
