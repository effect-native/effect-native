import { describe, expect, it } from "@effect-native/bun-test"
import { GraphDialectSqlite, GraphInvariantError, makeGraphDb } from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { makeSpec, userNodeV1 } from "./_fixtures.js"

describe("edge repository", () => {
  it.effect("supports put, out, in, and deterministic id dedupe", () =>
    Effect.gen(function*() {
      const graph = makeGraphDb(makeSpec(userNodeV1(), { name: "edge-traversal" }))

      const program = Effect.gen(function*() {
        const db = yield* graph.GraphDb

        yield* db.ensure

        const id1 = yield* db.edge.put("follows", "u1", "u2", { since: 2025 })
        const id2 = yield* db.edge.put("follows", "u1", "u2", { since: 2025 })
        const id3 = yield* db.edge.put("follows", "u1", "u3")

        expect(id1).toBe(id2)
        expect(id3).not.toBe(id1)

        const outAll = yield* db.edge.out("u1")
        const outFollows = yield* db.edge.out("u1", "follows")
        const inU2 = yield* db.edge.in("u2")

        expect(outAll.length).toBe(2)
        expect(outFollows.length).toBe(2)
        expect(inU2.length).toBe(1)

        expect(outAll.some((edge) => edge.dst === "u2")).toBe(true)
        expect(outAll.some((edge) => edge.dst === "u3")).toBe(true)
      })

      yield* program.pipe(
        Effect.provide(graph.layer),
        Effect.provide(GraphDialectSqlite.layer()),
        Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
    }))

  it.effect("returns a typed failure when edge props are not JSON-serializable", () =>
    Effect.gen(function*() {
      const graph = makeGraphDb(makeSpec(userNodeV1(), { name: "edge-encode-failure" }))

      const circular: {
        self?: unknown
      } = {}
      circular.self = circular

      const program = Effect.gen(function*() {
        const db = yield* graph.GraphDb
        yield* db.ensure

        const exit = yield* Effect.exit(db.edge.put("follows", "u1", "u2", circular))

        expect(exit._tag).toBe("Failure")

        if (exit._tag !== "Failure") {
          return
        }

        const failReasons = exit.cause.reasons.filter(Cause.isFailReason)
        const invariantError = failReasons
          .map((reason) => reason.error)
          .find((error): error is GraphInvariantError => error instanceof GraphInvariantError)

        expect(invariantError).toBeDefined()
        expect(invariantError?.context).toBe("edge.encode")
      })

      yield* program.pipe(
        Effect.provide(graph.layer),
        Effect.provide(GraphDialectSqlite.layer()),
        Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
    }))
})
