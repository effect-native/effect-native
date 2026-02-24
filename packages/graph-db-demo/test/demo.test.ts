import { describe, expect, it } from "@effect-native/bun-test"
import * as Effect from "effect/Effect"
import { runGraphDbDemo } from "../src/scenario.js"

describe("graph-db-demo scenario", () => {
  it.effect("uses ensure, node ops, edge ops, and schema expansion in one flow", () =>
    Effect.gen(function*() {
      const report = yield* runGraphDbDemo

      expect(report.authoredByAda.includes("p:effect-graph")).toBe(true)
      expect(report.authoredIntoEffectGraph.includes("r:ada")).toBe(true)
      expect(report.missingPaperFound).toBe(false)
      expect(report.upgradedPaperVenue).toBe("ICSE 2026")
      expect(report.duplicateEdgeIdStable).toBe(true)
      expect(report.serializationFailureContext).toBe("edge.encode")
      expect(report.ensurePlanForPaperV2.some((statement) => statement.includes("ADD COLUMN"))).toBe(true)
    }))
})
