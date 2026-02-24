import { describe, expect, it } from "@effect-native/bun-test"
import {
  GraphDialect,
  type GraphDialect as GraphDialectService,
  GraphSqlDialectError,
  makeGraphDb
} from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import { makeSpec, userNodeV1 } from "./_fixtures.js"

describe("GraphDb service + layer", () => {
  it.effect("ensure runs in one SQL transaction", () =>
    Effect.gen(function*() {
      const graph = makeGraphDb(makeSpec(userNodeV1(), { name: "tx-proof" }))

      let ensureCalls = 0

      const dialect: GraphDialectService = {
        planTable: (table) =>
          Effect.succeed({
            table,
            statements: [],
            incompatible: []
          }),
        ensureTable: (table) =>
          Effect.gen(function*() {
            const sql = yield* SqlClient.SqlClient
            ensureCalls = ensureCalls + 1

            const probeTableName = `__tx_probe_${ensureCalls}`
            yield* sql.unsafe(`CREATE TABLE ${probeTableName} (id TEXT PRIMARY KEY)`).pipe(
              Effect.asVoid,
              Effect.mapError((cause) =>
                new GraphSqlDialectError({
                  operation: "create-probe-table",
                  tableName: probeTableName,
                  detail: "unable to create probe table",
                  cause
                })
              )
            )

            if (ensureCalls === 2) {
              return yield* new GraphSqlDialectError({
                operation: "ensure-table",
                tableName: table.name,
                detail: "intentional failure"
              })
            }

            return {
              table,
              statements: [],
              incompatible: []
            }
          })
      }

      const program = Effect.gen(function*() {
        const db = yield* graph.GraphDb
        const result = yield* Effect.result(db.ensure)

        expect(result._tag).toBe("Failure")

        const sql = yield* SqlClient.SqlClient
        const probe = yield* sql.unsafe<{ readonly name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__tx_probe_1'"
        )

        expect(probe.length).toBe(0)
      })

      yield* program.pipe(
        Effect.provide(graph.layer),
        Effect.provide(Layer.succeed(GraphDialect, dialect)),
        Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
    }))
})
