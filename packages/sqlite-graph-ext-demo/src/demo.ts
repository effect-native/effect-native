/* eslint-disable no-console */

import { Data, Effect } from "effect"

import { getLibSqlitePathSync } from "@effect-native/libsqlite" with { type: "macro" }
import { getGraphExtPathSync } from "@effect-native/sqlite-graph" with { type: "macro" }
import * as SqliteGraphBun from "@effect-native/sqlite-graph/bun"
import * as SqliteGraph from "@effect-native/sqlite-graph/client"

const embeddedLibSqlitePath = getLibSqlitePathSync()
const embeddedGraphExtPath = getGraphExtPathSync()
const graphExtInitSymbol = "sqlite3_graph_ext_init"

class QueryError extends Data.TaggedError("QueryError")<{
  readonly sql: string
  readonly cause: unknown
}> {}

class ScenarioError extends Data.TaggedError("ScenarioError")<{
  readonly scenario: string
  readonly cause: unknown
}> {}

type DemoError =
  | QueryError
  | SqliteGraph.GraphExtDecodeError
  | SqliteGraph.GraphExtQueryError
  | SqliteGraphBun.BunGraphRuntimeError
  | ScenarioError

type DemoRuntime = SqliteGraphBun.BunGraphRuntime

type SqlEffect = <T>(sql: string, run: () => T) => Effect.Effect<T, QueryError>

interface ScenarioContext {
  readonly db: DemoRuntime["db"]
  readonly graph: SqliteGraph.GraphExtClient
  readonly sql: SqlEffect
  readonly statementCount: { value: number }
}

const SOCIAL_EDGE_TABLE = "social_edges"
const SOCIAL_EDGE_TYPE = "follows"
const SOCIAL_SEED_IDS = ["ava", "ben"]
const SOCIAL_EXCLUDE_IDS = ["bot-promo", "bot-zed", "hal", "spam-target"]

const COHORT_IDS = ["ava", "ben", "eli"]
const SPOTLIGHT_IDS = ["finn", "gia", "kai", "mia", "nia", "omar"]

const CREATOR_RANKINGS_TABLE = "creator_feed_rankings"

const SOCIAL_EDGE_FIXTURES = [
  ["ava", "bea"],
  ["ava", "cam"],
  ["ava", "dev"],
  ["ava", "bot-zed"],
  ["ben", "bea"],
  ["ben", "cam"],
  ["ben", "eli"],
  ["bea", "finn"],
  ["bea", "gia"],
  ["bea", "hal"],
  ["bea", "bot-promo"],
  ["cam", "finn"],
  ["cam", "ivy"],
  ["cam", "hal"],
  ["dev", "gia"],
  ["dev", "kai"],
  ["dev", "lio"],
  ["eli", "finn"],
  ["eli", "kai"],
  ["eli", "mia"],
  ["zoe", "finn"],
  ["yan", "gia"],
  ["uma", "kai"],
  ["mia", "nia"],
  ["kai", "nia"],
  ["finn", "omar"],
  ["gia", "omar"],
  ["bot-promo", "spam-target"]
] as const

const FEED_RANKING_FIXTURES = [
  ["morning", 1, "finn"],
  ["morning", 2, "gia"],
  ["morning", 3, "hal"],
  ["morning", 4, "ivy"],
  ["morning", 5, "kai"],
  ["evening", 1, "gia"],
  ["evening", 2, "finn"],
  ["evening", 3, "mia"],
  ["evening", 4, "kai"],
  ["evening", 5, "nia"]
] as const

const withRuntime = <A>(use: (runtime: DemoRuntime) => Effect.Effect<A, DemoError>) =>
  SqliteGraphBun.withBunGraphRuntime(use, {
    libSqlitePath: embeddedLibSqlitePath,
    graphExtensionPath: embeddedGraphExtPath,
    initSymbol: graphExtInitSymbol
  })

const createScenarioContext = (runtime: DemoRuntime) => {
  const statementCount = { value: 0 }

  // Goal: get a typed API for graph operations immediately after extension load.
  // Obstacle: raw SQL calls plus manual payload parsing are repetitive and easy to drift.
  // Why this resolves it: createGraphExtClient encapsulates SQL shape + decode contracts once.
  const graph = SqliteGraph.createGraphExtClient(runtime.db, {
    onStatement: () => {
      statementCount.value += 1
    }
  })

  const sql = <T>(sqlLabel: string, run: () => T) =>
    Effect.try({
      try: () => {
        statementCount.value += 1
        return run()
      },
      catch: (cause) => new QueryError({ sql: sqlLabel, cause })
    })

  return {
    db: runtime.db,
    graph,
    sql,
    statementCount
  }
}

const runScenario = <R>(
  runtime: DemoRuntime,
  name: string,
  run: (context: ScenarioContext) => Effect.Effect<ReadonlyArray<R>, DemoError>
) =>
  Effect.gen(function*() {
    const context = createScenarioContext(runtime)
    const started = yield* Effect.sync(() => performance.now())

    const rows = yield* run(context).pipe(
      Effect.mapError((cause) => new ScenarioError({ scenario: name, cause }))
    )

    const elapsedMs = Math.round((yield* Effect.sync(() => performance.now())) - started)
    console.log(`\n=== ${name} ===`)
    console.log(rows)
    console.log(`statementCount=${context.statementCount.value}`)
    console.log(`elapsedMs=${elapsedMs}`)
  })

const runSqlStatements = Effect.fn(function*(
  context: ScenarioContext,
  statements: ReadonlyArray<{
    readonly label: string
    readonly sql: string
  }>
) {
  yield* Effect.forEach(statements, (statement) =>
    context.sql(statement.label, () => {
      context.db.run(statement.sql)
    }))
})

const seedSocialGraph = Effect.fn(function*(context: ScenarioContext) {
  yield* runSqlStatements(context, [
    { label: "DROP TABLE IF EXISTS social_edges", sql: `DROP TABLE IF EXISTS ${SOCIAL_EDGE_TABLE}` },
    {
      label: "CREATE TABLE social_edges",
      sql:
        `CREATE TABLE ${SOCIAL_EDGE_TABLE}(src TEXT NOT NULL, dst TEXT NOT NULL, edge_type TEXT NOT NULL, deleted_at INTEGER)`
    },
    {
      label: "CREATE INDEX social_edges_src_type",
      sql: `CREATE INDEX social_edges_src_type ON ${SOCIAL_EDGE_TABLE}(src, edge_type)`
    },
    {
      label: "CREATE INDEX social_edges_dst_type",
      sql: `CREATE INDEX social_edges_dst_type ON ${SOCIAL_EDGE_TABLE}(dst, edge_type)`
    }
  ])

  yield* context.sql("INSERT social graph fixtures", () => {
    const placeholders = SOCIAL_EDGE_FIXTURES.map(() => "(?, ?, ?, NULL)").join(", ")
    const bindings = SOCIAL_EDGE_FIXTURES.flatMap(([src, dst]) => [src, dst, SOCIAL_EDGE_TYPE])
    const insertSql = `INSERT INTO ${SOCIAL_EDGE_TABLE}(src, dst, edge_type, deleted_at) VALUES ${placeholders}`
    context.db.query(insertSql).run(...bindings)
  })
})

const seedFeedRankings = Effect.fn(function*(context: ScenarioContext) {
  yield* runSqlStatements(context, [
    { label: "DROP TABLE IF EXISTS creator_feed_rankings", sql: `DROP TABLE IF EXISTS ${CREATOR_RANKINGS_TABLE}` },
    {
      label: "CREATE TABLE creator_feed_rankings",
      sql:
        `CREATE TABLE ${CREATOR_RANKINGS_TABLE}(serp_id TEXT NOT NULL, rank INTEGER NOT NULL, url_or_entity_id TEXT NOT NULL)`
    }
  ])

  yield* context.sql("INSERT creator feed snapshots", () => {
    const placeholders = FEED_RANKING_FIXTURES.map(() => "(?, ?, ?)").join(", ")
    const bindings = FEED_RANKING_FIXTURES.flatMap(([serpId, rank, itemId]) => [serpId, rank, itemId])
    const insertSql = `INSERT INTO ${CREATOR_RANKINGS_TABLE}(serp_id, rank, url_or_entity_id) VALUES ${placeholders}`
    context.db.query(insertSql).run(...bindings)
  })
})

const countPlaceholders = (sql: string) => {
  let count = 0
  for (const char of sql) {
    if (char === "?") count += 1
  }
  return count
}

const buildPlaceholders = (count: number) => Array.from({ length: count }, () => "?").join(", ")

const buildFirstHopSql = (edgeTable: string, seedPlaceholderCount: number) => {
  const seedPlaceholders = buildPlaceholders(seedPlaceholderCount)
  return [
    "SELECT DISTINCT dst AS target",
    `FROM ${edgeTable}`,
    "WHERE edge_type = ?",
    "  AND deleted_at IS NULL",
    `  AND src IN (${seedPlaceholders})`,
    "  AND dst NOT LIKE 'bot-%'",
    "ORDER BY dst"
  ].join("\n")
}

const buildSecondHopSql = (edgeTable: string, firstHopPlaceholderCount: number) => {
  const firstHopPlaceholders = buildPlaceholders(firstHopPlaceholderCount)
  return [
    "SELECT e2.dst AS candidate, COUNT(DISTINCT e1.src) AS support_count",
    `FROM ${edgeTable} e1`,
    `JOIN ${edgeTable} e2 ON e2.src = e1.dst`,
    "WHERE e1.edge_type = ?",
    "  AND e2.edge_type = ?",
    `  AND e1.src IN (${firstHopPlaceholders})`,
    "GROUP BY e2.dst",
    "ORDER BY e2.dst"
  ].join("\n")
}

const buildInboundSql = (edgeTable: string, candidatePlaceholderCount: number) => {
  const candidatePlaceholders = buildPlaceholders(candidatePlaceholderCount)
  return [
    "SELECT dst AS candidate, src AS connector",
    `FROM ${edgeTable}`,
    "WHERE edge_type = ?",
    "  AND deleted_at IS NULL",
    `  AND dst IN (${candidatePlaceholders})`,
    "ORDER BY dst, src"
  ].join("\n")
}

const runNaiveTwoHopWithoutExtension = Effect.fn(function*(context: ScenarioContext, input: {
  readonly edgeTable: string
  readonly hop1EdgeType: string
  readonly hop2EdgeType: string
  readonly seedIds: ReadonlyArray<string>
  readonly excludeIds: ReadonlyArray<string>
}) {
  const firstHopSql = buildFirstHopSql(input.edgeTable, input.seedIds.length)
  const firstHopRows = yield* context.sql(
    "raw first-hop targets",
    () => context.db.query(firstHopSql).all(input.hop1EdgeType, ...input.seedIds)
  )

  const firstHopTargets = firstHopRows.flatMap((row) => {
    if (row == null || typeof row !== "object") return []
    const target = Reflect.get(row, "target")
    return typeof target === "string" ? [target] : []
  })

  if (firstHopTargets.length === 0) {
    return {
      rows: [],
      sqlCharacters: firstHopSql.length,
      placeholderCount: countPlaceholders(firstHopSql),
      statementCount: 1
    }
  }

  const secondHopSql = buildSecondHopSql(input.edgeTable, firstHopTargets.length)
  const secondHopRows = yield* context.sql(
    "raw second-hop counts",
    () => context.db.query(secondHopSql).all(input.hop1EdgeType, input.hop2EdgeType, ...firstHopTargets)
  )

  const secondHopCounts = secondHopRows.flatMap((row) => {
    if (row == null || typeof row !== "object") return []
    const candidate = Reflect.get(row, "candidate")
    const supportCount = Reflect.get(row, "support_count")
    if (typeof candidate !== "string") return []
    if (typeof supportCount !== "number" || !Number.isFinite(supportCount)) return []
    return [{ candidate, supportCount }]
  })

  const excluded = new Set([...input.seedIds, ...firstHopTargets, ...input.excludeIds])
  const candidateRows = secondHopCounts.filter((row) => !excluded.has(row.candidate))
  const deterministicCandidates = Array.from(new Set(candidateRows.map((row) => row.candidate))).sort((a, b) =>
    a.localeCompare(b)
  )
  const deterministicOrdByCandidate = new Map(deterministicCandidates.map((candidate, index) => [candidate, index + 1]))
  const supportByCandidate = new Map(candidateRows.map((row) => [row.candidate, row.supportCount]))

  let inboundSqlCharacters = 0
  let inboundSqlPlaceholderCount = 0
  let inboundStatementCount = 0
  const connectorsByCandidate = new Map<string, Array<string>>()

  if (deterministicCandidates.length > 0) {
    const inboundSql = buildInboundSql(input.edgeTable, deterministicCandidates.length)
    inboundSqlCharacters = inboundSql.length
    inboundSqlPlaceholderCount = countPlaceholders(inboundSql)
    inboundStatementCount = 1

    const inboundRows = yield* context.sql(
      "raw inbound connectors",
      () => context.db.query(inboundSql).all(input.hop2EdgeType, ...deterministicCandidates)
    )

    for (const row of inboundRows) {
      if (row == null || typeof row !== "object") continue
      const candidate = Reflect.get(row, "candidate")
      const connector = Reflect.get(row, "connector")
      if (typeof candidate !== "string" || typeof connector !== "string") continue
      const connectors = connectorsByCandidate.get(candidate) ?? []
      connectors.push(connector)
      connectorsByCandidate.set(candidate, connectors)
    }
  }

  const rows = deterministicCandidates
    .map((candidate) => {
      const connectors = Array.from(new Set(connectorsByCandidate.get(candidate) ?? [])).sort((a, b) =>
        a.localeCompare(b)
      )
      return {
        candidate,
        deterministicOrd: deterministicOrdByCandidate.get(candidate) ?? 0,
        supportCount: supportByCandidate.get(candidate) ?? 0,
        via: connectors.join(", ")
      }
    })
    .sort((left, right) => {
      if (left.supportCount !== right.supportCount) {
        return right.supportCount - left.supportCount
      }
      return left.candidate.localeCompare(right.candidate)
    })
    .map((row, index) => ({ rank: index + 1, ...row }))

  return {
    rows,
    sqlCharacters: firstHopSql.length + secondHopSql.length + inboundSqlCharacters,
    placeholderCount: countPlaceholders(firstHopSql) + countPlaceholders(secondHopSql) + inboundSqlPlaceholderCount,
    statementCount: 2 + inboundStatementCount
  }
})

const recommendationDxScenario = Effect.fn(function*(context: ScenarioContext) {
  yield* seedSocialGraph(context)

  const recommendationInput = {
    edgeTable: SOCIAL_EDGE_TABLE,
    hop1EdgeType: SOCIAL_EDGE_TYPE,
    hop2EdgeType: SOCIAL_EDGE_TYPE,
    seedIds: SOCIAL_SEED_IDS,
    excludeIds: SOCIAL_EXCLUDE_IDS
  }

  // Goal: produce social recommendations from a seed cohort in one readable step.
  // Obstacle: the baseline needs a long CTE pipeline and brittle placeholder bookkeeping.
  // Why this resolves it: recommendByTwoHop composes the hard parts with deterministic idset semantics.
  const extension = yield* context.graph.recommendByTwoHop(recommendationInput)

  const baseline = yield* runNaiveTwoHopWithoutExtension(context, recommendationInput)

  const extensionRows = extension.rows.map((row) => ({
    section: "with-extension-row",
    ...row
  }))

  const baselineRows = baseline.rows.map((row) => ({
    section: "without-extension-row",
    ...row
  }))

  const extensionCandidates = extension.rows.map((row) => row.candidate).join(", ")
  const baselineCandidates = baseline.rows.map((row) => row.candidate).join(", ")
  const parityMismatch: Array<{
    readonly index: number
    readonly extension: SqliteGraph.TwoHopRecommendationRow
    readonly baseline: SqliteGraph.TwoHopRecommendationRow | null
  }> = []

  for (const [index, row] of extension.rows.entries()) {
    const baselineRow = baseline.rows[index]
    if (baselineRow == null) {
      parityMismatch.push({ index, extension: row, baseline: null })
      continue
    }
    if (
      row.rank !== baselineRow.rank ||
      row.deterministicOrd !== baselineRow.deterministicOrd ||
      row.candidate !== baselineRow.candidate ||
      row.supportCount !== baselineRow.supportCount ||
      row.via !== baselineRow.via
    ) {
      parityMismatch.push({ index, extension: row, baseline: baselineRow })
    }
  }
  const parity = parityMismatch.length === 0 && extension.rows.length === baseline.rows.length
  const parityIndicator = parity ? "PARITY_CONFIRMED" : "MISMATCH_DETECTED"

  return [
    {
      section: "with-extension-summary",
      one_api_call: "graph.recommendByTwoHop(...)",
      recommendation_set_hash: extension.recommendationSetHash
    },
    ...extensionRows,
    {
      section: "without-extension-summary",
      sql_characters: baseline.sqlCharacters,
      placeholders: baseline.placeholderCount,
      sql_statements: baseline.statementCount,
      raw_pipeline: "first_hop_targets + second_hop_counts + inbound_connectors"
    },
    ...baselineRows,
    {
      section: "parity-check",
      indicator: parityIndicator,
      baseline_row_count: baseline.rows.length,
      extension_row_count: extension.rows.length,
      mismatch_preview: parity ? "none" : JSON.stringify(parityMismatch[0])
    },
    {
      section: "opinionated-verdict",
      why_awesome: "extension API gives typed rows, deterministic idset semantics, and less room for SQL footguns",
      why_raw_sql_hurts: "raw CTE orchestration pushes graph logic + placeholder bookkeeping into app code",
      extension_candidates: extensionCandidates,
      raw_sql_candidates: baselineCandidates,
      point: parity
        ? "both implementations match, and the extension keeps that parity with cleaner call-site ergonomics"
        : "baseline and extension diverged, so the mismatch is explicit instead of silently assumed"
    }
  ]
})

const cohortLensScenario = Effect.fn(function*(context: ScenarioContext) {
  yield* seedSocialGraph(context)

  // Goal: represent a dynamic cohort as a safe SQL expression.
  // Obstacle: hand-building IN clauses is noisy and quote/ordering sensitive.
  // Why this resolves it: idsetFromValues builds deterministic, parameterized idset expressions.
  const cohortSet = SqliteGraph.idsetFromValues(COHORT_IDS)

  // Goal: inspect each account's outbound neighborhood as a grouped set.
  // Obstacle: status quo requires custom SQL aggregation plus custom payload decoding in app code.
  // Why this resolves it: graphOutIdset returns typed grouped rows through one client call.
  const outbound = yield* context.graph.graphOutIdset({
    edgeTable: SOCIAL_EDGE_TABLE,
    edgeType: SOCIAL_EDGE_TYPE,
    srcSet: cohortSet
  })

  const spotlightSet = SqliteGraph.idsetFromValues(SPOTLIGHT_IDS)
  // Goal: view inbound supporters for spotlight accounts.
  // Obstacle: reverse traversal normally duplicates query shape and parsing logic.
  // Why this resolves it: graphInIdset mirrors the outbound API with typed decoded output.
  const inbound = yield* context.graph.graphInIdset({
    edgeTable: SOCIAL_EDGE_TABLE,
    edgeType: SOCIAL_EDGE_TYPE,
    dstSet: spotlightSet
  })

  const outboundMap = new Map(outbound.map((row) => [row.src, row.dstSet]))
  // Goal: compute overlap between two neighborhoods without writing ad-hoc SQL joins.
  // Obstacle: without set combinators this becomes extra SQL and higher cognitive load.
  // Why this resolves it: idsetIntersect composes set logic declaratively in TypeScript.
  const overlapSet = SqliteGraph.idsetIntersect(
    SqliteGraph.idsetFromValues(outboundMap.get("ava") ?? []),
    SqliteGraph.idsetFromValues(outboundMap.get("ben") ?? [])
  )

  // Goal: materialize overlap members in stable order for display.
  // Obstacle: naive decoding gives inconsistent ordering and ad-hoc parsing code.
  // Why this resolves it: idsetEach provides deterministic rows with ord metadata.
  const overlap = yield* context.graph.idsetEach(overlapSet)

  const outboundRows = outbound.map((row) => ({
    lens: "outbound-neighborhood",
    account: row.src,
    member_count: row.dstSet.length,
    members: row.dstSet.join(", ")
  }))

  const inboundRows = inbound.map((row) => ({
    lens: "inbound-support",
    account: row.dst,
    member_count: row.srcSet.length,
    members: row.srcSet.join(", ")
  }))

  return [
    ...outboundRows,
    {
      lens: "overlap",
      account: "ava+ben",
      member_count: overlap.length,
      members: overlap.map((row) => row.id).join(", ")
    },
    ...inboundRows
  ]
})

const creatorMomentumScenario = Effect.fn(function*(context: ScenarioContext) {
  yield* seedFeedRankings(context)

  // Goal: explain momentum between two ranking snapshots.
  // Obstacle: status quo diff logic requires multiple joins and null-handling edge cases.
  // Why this resolves it: rankedDiff emits typed enter/exit/move rows directly.
  const rows = yield* context.graph.rankedDiff({
    oldSerpId: "morning",
    newSerpId: "evening",
    table: CREATOR_RANKINGS_TABLE
  })

  return rows.map((row) => ({
    creator: row.item,
    old_rank: row.oldRank,
    new_rank: row.newRank,
    delta_rank: row.deltaRank,
    status: row.status
  }))
})

const program = withRuntime((runtime) =>
  Effect.gen(function*() {
    console.log("Loaded graph extension:", runtime.graphExtensionPath)
    console.log("Init symbol:", graphExtInitSymbol)
    console.log("Graph extension version:", runtime.version)

    yield* runScenario(runtime, "recommendation DX comparison", recommendationDxScenario)
    yield* runScenario(runtime, "cohort neighborhood lens", cohortLensScenario)
    yield* runScenario(runtime, "creator momentum with ranked_diff", creatorMomentumScenario)
  })
)

Effect.runPromise(program).catch((cause) => {
  console.error(cause)
  process.exit(1)
})
