import * as CrSql from "@effect-native/crsql"
import * as SqlClient from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import type { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Layer, Stream } from "effect"

// Test service interface - minimal and focused
interface TestSqlClient {
  readonly execute: <A>(query: string, result: A) => Effect.Effect<void>
  readonly client: SqlClient.SqlClient
}

const TestSqlClient = Context.GenericTag<TestSqlClient>("TestSqlClient")

// Clean test service implementation following Effect patterns
const TestSqlClientLive = Layer.sync(TestSqlClient, () => {
  const responses = new Map<string, unknown>()

  const connection: Connection = {
    execute: (sql: string, _params, _transformRows) =>
      Effect.sync(() => {
        const result = responses.get(sql.trim())
        if (result === undefined) {
          throw new Error(`No response configured for query: ${sql}`)
        }
        return result
      }),
    executeRaw: () => Effect.succeed([]),
    executeStream: () => Stream.empty as Stream.Stream<unknown, SqlError>,
    executeValues: () => Effect.succeed([]),
    executeUnprepared: () => Effect.succeed([])
  }

  const client = SqlClient.make({
    acquirer: Effect.succeed(connection),
    compiler: Statement.makeCompilerSqlite(),
    spanAttributes: []
  })

  return TestSqlClient.of({
    execute: <A>(query: string, result: A) =>
      Effect.sync(() => responses.set(query.trim(), result)),
    client
  })
})

describe("CrSql", () => {
  describe("getSiteIdHex", () => {
    it.scoped("returns a 32 character hex string", () =>
      Effect.gen(function*() {
        const testClient = yield* TestSqlClient
        yield* testClient.execute(
          "SELECT hex(crsql_site_id()) AS site_id",
          [{ site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }]
        )

        const crSql = yield* CrSql.CrSql
        const siteId = yield* crSql.getSiteIdHex

        assert.strictEqual(siteId.length, 32)
        assert.match(siteId, /^[0-9A-F]{32}$/)
      }).pipe(
        Effect.provide(Layer.mergeAll(
          TestSqlClientLive,
          CrSql.CrSql.Default.pipe(
            Layer.provide(Layer.effect(SqlClient.SqlClient, Effect.map(TestSqlClient, _ => _.client)))
          )
        ))
      )
    )
  })

  describe("getDbVersion", () => {
    it.scoped("fails with not implemented message", () =>
      Effect.gen(function*() {
        const crSql = yield* CrSql.CrSql
        const result = yield* Effect.flip(crSql.getDbVersion)

        assert.include(result._tag, "Die")
        assert.include(result.defect, "getDbVersion not implemented")
      }).pipe(
        Effect.provide(Layer.mergeAll(
          TestSqlClientLive,
          CrSql.CrSql.Default.pipe(
            Layer.provide(Layer.effect(SqlClient.SqlClient, Effect.map(TestSqlClient, _ => _.client)))
          )
        ))
      )
    )
  })
})