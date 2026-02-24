import { describe, expect, it } from "@effect-native/bun-test"
import { GraphDialectSqlite, makeGraphDb, nodeDef } from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import { makeSpec, userNodeV1, userNodeV2 } from "./_fixtures.js"

describe("SQLite GraphDialect ensure", () => {
  it.effect("creates tables, expands columns, and adds indexes", () =>
    Effect.gen(function*() {
      const graphV1 = makeGraphDb(makeSpec(userNodeV1(), { name: "v1" }))
      const graphV2 = makeGraphDb(makeSpec(userNodeV2(), { name: "v2" }))

      const program = Effect.gen(function*() {
        const dbV1 = yield* graphV1.GraphDb
        yield* dbV1.ensure

        const dbV2 = yield* graphV2.GraphDb
        yield* dbV2.ensure

        const sql = yield* SqlClient.SqlClient

        const columns = yield* sql.unsafe<{ readonly name: string }>("PRAGMA table_info('node_user')")
        const columnNames = columns.map((column) => column.name)
        expect(columnNames.includes("nickname")).toBe(true)

        const indexes = yield* sql.unsafe<{ readonly name: string }>("PRAGMA index_list('node_user')")
        const indexNames = indexes.map((index) => index.name)
        expect(indexNames.includes("node_user_name_idx")).toBe(true)
        expect(indexNames.includes("node_user_nickname_idx")).toBe(true)
      })

      yield* program.pipe(
        Effect.provide(graphV1.layer),
        Effect.provide(graphV2.layer),
        Effect.provide(GraphDialectSqlite.layer()),
        Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
    }))

  it.effect("fails loudly for incompatible destructive change", () =>
    Effect.gen(function*() {
      const graphV1 = makeGraphDb(makeSpec(userNodeV1(), { name: "baseline" }))

      const incompatibleNode = nodeDef({
        kind: "user",
        schema: Schema.Struct({
          id: Schema.String,
          name: Schema.String,
          visits: Schema.String
        }),
        columns: [
          { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
          { name: "name", sqlType: "TEXT", notNull: true },
          { name: "visits", sqlType: "TEXT", notNull: true }
        ]
      })

      const graphV2 = makeGraphDb(makeSpec(incompatibleNode, { name: "incompatible" }))

      const program = Effect.gen(function*() {
        const dbV1 = yield* graphV1.GraphDb
        yield* dbV1.ensure

        const dbV2 = yield* graphV2.GraphDb
        const result = yield* Effect.result(dbV2.ensure)

        expect(result._tag).toBe("Failure")
      })

      yield* program.pipe(
        Effect.provide(graphV1.layer),
        Effect.provide(graphV2.layer),
        Effect.provide(GraphDialectSqlite.layer()),
        Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
    }))
})
