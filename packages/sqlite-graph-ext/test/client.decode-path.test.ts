import { describe, expect, it } from "@effect-native/bun-test"
import { Effect } from "effect"
import { createGraphExtClient, GraphExtDecodeError, idsetFromValues } from "../src/client.js"

describe("typed client decode path", () => {
  it.effect("graphOutMany decodes Uint8Array payload via schema", () =>
    Effect.gen(function*() {
      const sqlCalls: Array<{ sql: string; bindings: Array<unknown> }> = []

      const db = {
        query: (sql: string) => ({
          get: (...bindings: Array<unknown>) => {
            sqlCalls.push({ sql, bindings })
            return { payload: new TextEncoder().encode("alpha\tnode-1\n") }
          }
        })
      }

      const client = createGraphExtClient(db)
      const rows = yield* client.graphOutMany({
        edgeTable: "edges",
        edgeType: "follows",
        srcSet: idsetFromValues(["alpha"])
      })

      expect(rows).toEqual([{ src: "alpha", dst: "node-1" }])
      expect(sqlCalls).toHaveLength(1)
      expect(sqlCalls[0]?.sql).toContain("graph_out_many")
      expect(sqlCalls[0]?.bindings).toEqual(["edges", "follows", "alpha", ""])
    }))

  it.effect("graphOutMany returns GraphExtDecodeError when payload shape mismatches", () =>
    Effect.gen(function*() {
      const db = {
        query: () => ({
          get: () => ({ payload: "alpha-only\n" })
        })
      }

      const client = createGraphExtClient(db)
      const error = yield* client.graphOutMany({
        edgeTable: "edges",
        edgeType: "follows",
        srcSet: idsetFromValues(["alpha"])
      }).pipe(Effect.flip)

      expect(error).toBeInstanceOf(GraphExtDecodeError)
      if (!(error instanceof GraphExtDecodeError)) {
        throw new Error("expected GraphExtDecodeError")
      }

      expect(error.operation).toBe("graph_out_many")
      expect(error.payload).toContain("alpha-only")
    }))
})
