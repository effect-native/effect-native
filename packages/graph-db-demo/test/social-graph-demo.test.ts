import { describe, expect, it } from "@effect-native/bun-test"
import * as GraphDb from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { defaultMediumShape, expectPhotoIds, runGraphDbDemo, runTinyFixtureQuery } from "../src/scenario.js"

describe("graph-db-demo social query", () => {
  it.effect("returns exact tiny-fixture ranking for photos liked by friends-of-friends", () =>
    Effect.gen(function*() {
      const tiny = yield* runTinyFixtureQuery(3)
      const ids = expectPhotoIds(tiny.recommendations)

      expect(ids).toEqual(["ph:00000", "ph:00001", "ph:00002"])
      expect(tiny.recommendations[0]?.likedByFriendOfFriendCount).toBe(2)
      expect(tiny.recommendations[1]?.likedByFriendOfFriendCount).toBe(2)
      expect(tiny.recommendations[2]?.likedByFriendOfFriendCount).toBe(1)
    }))

  it.effect("is deterministic across repeated medium-seed runs", () =>
    Effect.gen(function*() {
      const first = yield* runGraphDbDemo()
      const second = yield* runGraphDbDemo()

      const firstTop = first.topPhotos.map((row) => ({
        id: row.photoId,
        score: row.likedByFriendOfFriendCount
      }))
      const secondTop = second.topPhotos.map((row) => ({
        id: row.photoId,
        score: row.likedByFriendOfFriendCount
      }))

      expect(second.seed.seed).toBe(first.seed.seed)
      expect(second.seed.shape).toEqual(first.seed.shape)
      expect(secondTop).toEqual(firstTop)
    }))

  it.effect("runs medium stress query with non-zero traversal profile", () =>
    Effect.gen(function*() {
      const report = yield* runGraphDbDemo({
        shape: defaultMediumShape,
        limit: 10
      })

      expect(report.topPhotos.length).toBeGreaterThan(0)
      expect(report.profile.edgeOutCalls).toBeGreaterThan(0)
      expect(report.profile.rowsTraversed).toBeGreaterThan(0)
      expect(report.profile.elapsedMs).toBeGreaterThanOrEqual(0)
    }))

  it.effect("emits traversal, set-join, and batching affordance findings", () =>
    Effect.gen(function*() {
      const report = yield* runGraphDbDemo({
        shape: defaultMediumShape,
        limit: 10
      })

      const helperProposals = report.affordanceFindings.map((item) => item.proposedHelper).join(" | ")
      const extractionProposals = report.affordanceFindings
        .map((item) => item.proposedGraphDbExtraction)
        .join(" | ")

      expect(helperProposals.includes("twoHopOut")).toBe(true)
      expect(helperProposals.includes("selectDistinctDstBySrcSet")).toBe(true)
      expect(helperProposals.includes("getMany")).toBe(true)
      expect(extractionProposals.includes("GraphDb.edge.twoHopOut")).toBe(true)
      expect(extractionProposals.includes("GraphDb.query.selectDistinctDstBySrcSet")).toBe(true)
      expect(extractionProposals.includes("GraphDb.node.getMany")).toBe(true)
    }))

  it.effect("uses only public graph-db API primitives to run graph logic", () =>
    Effect.gen(function*() {
      const User = Schema.Struct({
        id: Schema.String,
        name: Schema.String
      })

      const graph = GraphDb.makeGraphDb({
        name: "public-api-only",
        nodes: [
          GraphDb.nodeDef({
            kind: "user",
            schema: User,
            columns: [
              { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
              { name: "name", sqlType: "TEXT", notNull: true }
            ]
          })
        ]
      })

      const program = Effect.gen(function*() {
        const db = yield* graph.GraphDb
        yield* db.ensure
        yield* db.node.put("user", { id: "u1", name: "Alice" })
        yield* db.node.put("user", { id: "u2", name: "Bob" })
        yield* db.edge.put("friend", "u1", "u2")
        const out = yield* db.edge.out("u1", "friend")
        expect(out.length).toBe(1)
      })

      yield* program.pipe(
        Effect.provide(graph.layer),
        Effect.provide(GraphDb.GraphDialectSqlite.layer()),
        Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
      )
    }))
})
