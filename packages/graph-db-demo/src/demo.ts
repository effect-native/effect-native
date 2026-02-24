import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { runGraphDbDemo } from "./scenario.js"

const main = Effect.gen(function*() {
  const report = yield* runGraphDbDemo

  yield* Console.log("graph-db-demo: collaboration graph built from extracted snapshot data")
  yield* Console.log(`schema expansion statements: ${report.ensurePlanForPaperV2.length}`)
  yield* Console.log(`Ada authored: ${report.authoredByAda.join(", ")}`)
  yield* Console.log(`incoming authors for p:effect-graph: ${report.authoredIntoEffectGraph.join(", ")}`)
  yield* Console.log(`duplicate edge id stable: ${report.duplicateEdgeIdStable}`)
  yield* Console.log(`upgraded venue field: ${report.upgradedPaperVenue}`)
  yield* Console.log(`missing paper exists: ${report.missingPaperFound}`)
  yield* Console.log(`non-serializable props failure context: ${report.serializationFailureContext}`)
  yield* Console.log(JSON.stringify(report, null, 2))
})

void Effect.runPromise(main)
