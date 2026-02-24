import { GraphDialect, GraphDialectSqlite, GraphInvariantError, makeGraphDb, nodeDef } from "@effect-native/graph-db"
import * as BunSqlite from "@effect/sql-sqlite-bun"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

const Researcher = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  focus: Schema.String
})

const PaperV1 = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  year: Schema.Number
})

const PaperV2 = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  year: Schema.Number,
  venue: Schema.String
})

const Snapshot = Schema.Struct({
  id: Schema.String,
  capturedAt: Schema.String,
  locator: Schema.String
})

const researcherNode = nodeDef({
  kind: "researcher",
  schema: Researcher,
  columns: [
    { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
    { name: "name", sqlType: "TEXT", notNull: true },
    { name: "focus", sqlType: "TEXT", notNull: true }
  ],
  indexes: [{ name: "node_researcher_name_idx", columns: ["name"] }]
})

const paperNodeV1 = nodeDef({
  kind: "paper",
  schema: PaperV1,
  columns: [
    { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
    { name: "title", sqlType: "TEXT", notNull: true },
    { name: "year", sqlType: "INTEGER", notNull: true }
  ],
  indexes: [{ name: "node_paper_year_idx", columns: ["year"] }]
})

const paperNodeV2 = nodeDef({
  kind: "paper",
  schema: PaperV2,
  columns: [
    { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
    { name: "title", sqlType: "TEXT", notNull: true },
    { name: "year", sqlType: "INTEGER", notNull: true },
    { name: "venue", sqlType: "TEXT", notNull: true, defaultSql: "'Unknown Venue'" }
  ],
  indexes: [{ name: "node_paper_year_idx", columns: ["year"] }]
})

const snapshotNode = nodeDef({
  kind: "snapshot",
  schema: Snapshot,
  columns: [
    { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
    { name: "capturedAt", sqlType: "TEXT", notNull: true },
    { name: "locator", sqlType: "TEXT", notNull: true }
  ]
})

const graphV1 = makeGraphDb({
  name: "demo-v1",
  nodes: [researcherNode, paperNodeV1, snapshotNode]
})

const graphV2 = makeGraphDb({
  name: "demo-v2",
  nodes: [researcherNode, paperNodeV2, snapshotNode]
})

const extractInvariantContext = (cause: Cause.Cause<unknown>): string | null => {
  const failReasons = cause.reasons.filter(Cause.isFailReason)

  for (const reason of failReasons) {
    if (reason.error instanceof GraphInvariantError) {
      return reason.error.context ?? null
    }
  }

  return null
}

export interface DemoReport {
  readonly ensurePlanForPaperV2: ReadonlyArray<string>
  readonly authoredByAda: ReadonlyArray<string>
  readonly authoredIntoEffectGraph: ReadonlyArray<string>
  readonly missingPaperFound: boolean
  readonly upgradedPaperVenue: string
  readonly duplicateEdgeIdStable: boolean
  readonly serializationFailureContext: string | null
}

const program = Effect.gen(function*() {
  const dbV1 = yield* graphV1.GraphDb
  const dbV2 = yield* graphV2.GraphDb
  const dialect = yield* GraphDialect

  yield* dbV1.ensure

  yield* dbV1.node.put("researcher", {
    id: "r:ada",
    name: "Ada",
    focus: "typed errors"
  })
  yield* dbV1.node.put("researcher", {
    id: "r:linus",
    name: "Linus",
    focus: "distributed systems"
  })
  yield* dbV1.node.put("paper", {
    id: "p:effect-graph",
    title: "Graph DB in Effect v4",
    year: 2026
  })
  yield* dbV1.node.put("paper", {
    id: "p:typed-errors",
    title: "Error Channels at Scale",
    year: 2025
  })
  yield* dbV1.node.put("snapshot", {
    id: "s:2026-02-24",
    capturedAt: "2026-02-24T00:00:00Z",
    locator: "s3://demo/snapshots/2026-02-24.sqlite"
  })

  const authoredEdgeId = yield* dbV1.edge.put("authored", "r:ada", "p:effect-graph", {
    role: "lead"
  })
  const duplicateEdgeId = yield* dbV1.edge.put("authored", "r:ada", "p:effect-graph", {
    role: "lead"
  })

  yield* dbV1.edge.put("authored", "r:linus", "p:typed-errors", {
    role: "coauthor"
  })
  yield* dbV1.edge.put("cites", "p:effect-graph", "p:typed-errors", {
    reason: "builds-on"
  })
  yield* dbV1.edge.put("extracted_from", "p:effect-graph", "s:2026-02-24", {
    confidence: 0.99
  })

  const authoredByAda = yield* dbV1.edge.out("r:ada", "authored")
  const authoredIntoEffectGraph = yield* dbV1.edge.in("p:effect-graph", "authored")

  const paperPlan = yield* dialect.planTable(paperNodeV2.table)

  yield* dbV2.ensure

  yield* dbV2.node.put("paper", {
    id: "p:effect-graph",
    title: "Graph DB in Effect v4",
    year: 2026,
    venue: "ICSE 2026"
  })

  const upgradedPaperRaw = yield* dbV2.node.get("paper", "p:effect-graph")
  if (upgradedPaperRaw === null) {
    return yield* new GraphInvariantError({
      context: "demo.paper",
      detail: "Expected upgraded paper to exist"
    })
  }
  const upgradedPaper = yield* Schema.decodeUnknownEffect(PaperV2)(upgradedPaperRaw)

  const missingPaper = yield* dbV2.node.queryById("paper", "p:missing")

  const circular: {
    self?: unknown
  } = {}
  circular.self = circular

  const serializationExit = yield* Effect.exit(
    dbV2.edge.put("broken", "p:effect-graph", "p:typed-errors", circular)
  )

  return {
    ensurePlanForPaperV2: paperPlan.statements,
    authoredByAda: authoredByAda.map((edge) => edge.dst),
    authoredIntoEffectGraph: authoredIntoEffectGraph.map((edge) => edge.src),
    missingPaperFound: Option.isSome(missingPaper),
    upgradedPaperVenue: upgradedPaper.venue,
    duplicateEdgeIdStable: authoredEdgeId === duplicateEdgeId,
    serializationFailureContext: serializationExit._tag === "Failure"
      ? extractInvariantContext(serializationExit.cause)
      : null
  }
})

export const runGraphDbDemo = program.pipe(
  Effect.provide(graphV1.layer),
  Effect.provide(graphV2.layer),
  Effect.provide(GraphDialectSqlite.layer()),
  Effect.provide(BunSqlite.SqliteClient.layer({ filename: ":memory:" }))
)
