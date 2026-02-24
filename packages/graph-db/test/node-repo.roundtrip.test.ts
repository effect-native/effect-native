import { describe, expect, it } from "@effect-native/bun-test"
import { GraphDialectSqlite, makeGraphDb } from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as SqlClient from "effect/unstable/sql/SqlClient"
import { makeSpec, userNodeV1 } from "./_fixtures.js"

const hasTag = (value: unknown): value is { readonly _tag: string } =>
  typeof value === "object" && value !== null && "_tag" in value && typeof value["_tag"] === "string"

describe("node repository", () => {
  it.effect("roundtrips node encode -> insert -> select -> decode", () =>
    Effect.gen(function*() {
      const graph = makeGraphDb(makeSpec(userNodeV1(), { name: "node-roundtrip" }))

      const program = Effect.gen(function*() {
        const db = yield* graph.GraphDb

        yield* db.ensure
        yield* db.node.put("user", { id: "u1", name: "Ada", visits: 1 })

        const queried = yield* db.node.queryById("user", "u1")
        expect(Option.isSome(queried)).toBe(true)

        const loaded = yield* db.node.get("user", "u1")

        expect(loaded).toEqual({
          id: "u1",
          name: "Ada",
          visits: 1
        })
      })

      yield* program.pipe(
        Effect.provide(graph.layer),
        Effect.provide(GraphDialectSqlite.layer()),
        Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
    }))

  it.effect("surfaces schema parse errors in the typed error channel", () =>
    Effect.gen(function*() {
      const graph = makeGraphDb(makeSpec(userNodeV1(), { name: "node-parse-failure" }))

      const program = Effect.gen(function*() {
        const db = yield* graph.GraphDb
        const sql = yield* SqlClient.SqlClient

        yield* db.ensure
        yield* sql.unsafe("INSERT INTO node_user (id, name, visits) VALUES ('broken', 'Bad Row', 'not-a-number')")

        const result = yield* Effect.result(db.node.get("user", "broken"))
        expect(result._tag).toBe("Failure")
        if (result._tag === "Failure") {
          expect(hasTag(result.failure)).toBe(true)
        }
      })

      yield* program.pipe(
        Effect.provide(graph.layer),
        Effect.provide(GraphDialectSqlite.layer()),
        Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
    }))
})
