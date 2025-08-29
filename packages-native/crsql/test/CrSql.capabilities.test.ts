import * as CrSql from "@effect-native/crsql"
import * as CrSqlErrors from "@effect-native/crsql/errors"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as SqlClient from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import * as SqlErr from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import { assert, layer as withLayer } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import * as Context from "effect/Context"

const makeSqlClientLayerWithFailures = (opts: {
  failUnhex?: boolean
  failCrSqlSiteId?: boolean
}) =>
  Layer.scopedContext(
    Effect.gen(function*() {
      const connection: Connection = {
        execute: (sql: string, _params, transformRows) => {
          if (opts.failUnhex && sql.includes("unhex(")) {
            return Effect.fail(new SqlErr.SqlError({ cause: new Error("no such function: unhex") }))
          }
          if (opts.failCrSqlSiteId && sql.includes("crsql_site_id()")) {
            return Effect.fail(new SqlErr.SqlError({ cause: new Error("no such function: crsql_site_id") }))
          }
          const rows: ReadonlyArray<object> = []
          return Effect.succeed(transformRows ? transformRows(rows) : rows)
        },
        executeRaw: () => Effect.succeed([]),
        executeStream: () => Stream.empty,
        executeValues: () => Effect.succeed([]),
        executeUnprepared: () => Effect.succeed([])
      }

      const client = yield* SqlClient.make({
        acquirer: Effect.succeed(connection),
        compiler: Statement.makeCompilerSqlite(),
        spanAttributes: []
      }).pipe(Effect.provide(Reactivity.layer))

      return Context.make(SqlClient.SqlClient, client)
    })
  )

// Use withLayer suites so `it` is provided via @effect/vitest
withLayer(Layer.empty)("CrSql capability: unhex missing", (it) => {
  it.todo("fails with UnhexUnavailable when unhex() is missing", () =>
    Effect.gen(function*() {
      const acquire = CrSql.CrSql.pipe(
        Effect.provide(
          CrSql.CrSql.Default.pipe(
            Layer.provide(makeSqlClientLayerWithFailures({ failUnhex: true }))
          )
        )
      )
      const result = yield* Effect.either(acquire)
      assert.ok(result._tag === "Left")
      if (result._tag === "Left") {
        assert.ok(result.left instanceof CrSqlErrors.UnhexUnavailable)
      }
    }))
})

withLayer(Layer.empty)("CrSql capability: crsqlite missing", (it) => {
  it.todo(
    "fails with CrSqliteExtensionMissing when crsql_site_id() is missing",
    () =>
      Effect.gen(function*() {
        const acquire = CrSql.CrSql.pipe(
          Effect.provide(
            CrSql.CrSql.Default.pipe(
              Layer.provide(
                makeSqlClientLayerWithFailures({ failCrSqlSiteId: true })
              )
            )
          )
        )
        const result = yield* Effect.either(acquire)
        assert.ok(result._tag === "Left")
        if (result._tag === "Left") {
          assert.ok(
            result.left instanceof CrSqlErrors.CrSqliteExtensionMissing
          )
        }
      })
  )
})
