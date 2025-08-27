import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as SqlClient from "@effect/sql/SqlClient"
import * as CrSql from "@effect-native/crsql"

// Test double: Records queries and returns predetermined responses
const makeFakeSqlClient = (responses: Record<string, unknown[]>) =>
  Effect.sync(() => {
    const queries: Array<{ sql: string; params?: readonly unknown[] }> = []
    
    return {
      queries,
      client: SqlClient.make({
        acquirer: Effect.succeed({
          execute: (sql: string, params?: readonly unknown[]) => 
            Effect.sync(() => {
              queries.push({ sql, params })
              const response = responses[sql.trim()]
              if (!response) throw new Error(`Unexpected query: ${sql}`)
              return response
            })
        })
      })
    }
  })

describe("CrSqlService", () => {
  it("getSiteIdHex executes site ID query and returns hex string", () =>
    Effect.gen(function* () {
      const fake = yield* makeFakeSqlClient({
        "SELECT hex(crsql_site_id()) AS site_id": [{ site_id: "A1B2C3D4E5F6789012345678ABCDEF90" }]
      })

      const service = yield* CrSql.CrSql.pipe(
        Effect.provideService(SqlClient.SqlClient, fake.client),
        Effect.provide(CrSql.layer)
      )

      const result = yield* service.getSiteIdHex

      assert.strictEqual(result, "A1B2C3D4E5F6789012345678ABCDEF90")
      assert.strictEqual(fake.queries.length, 1)
      assert.strictEqual(fake.queries[0].sql, "SELECT hex(crsql_site_id()) AS site_id")
    }))
})