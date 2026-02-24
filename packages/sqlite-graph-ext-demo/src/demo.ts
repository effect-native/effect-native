/* eslint-disable no-console */

import { Database } from "bun:sqlite"
import { Data, Effect } from "effect"

import { getLibSqlitePathSync } from "@effect-native/libsqlite" with { type: "macro" }
import { getGraphExtPathSync } from "@effect-native/sqlite-graph-ext" with { type: "macro" }
import * as SqliteGraph from "@effect-native/sqlite-graph-ext/client"

const embeddedLibSqlitePath = getLibSqlitePathSync()
const embeddedGraphExtPath = getGraphExtPathSync()
const graphExtInitSymbol = "sqlite3_graph_ext_init"

type ArtifactName = "libsqlite" | "graph-extension"

type ArtifactPhase = "resolve" | "configure" | "open" | "load-extension"

class ArtifactError extends Data.TaggedError("ArtifactError")<{
  readonly artifact: ArtifactName
  readonly phase: ArtifactPhase
  readonly path: string
  readonly cause: unknown
}> {}

class QueryError extends Data.TaggedError("QueryError")<{
  readonly sql: string
  readonly cause: unknown
}> {}

class ScenarioError extends Data.TaggedError("ScenarioError")<{
  readonly scenario: string
  readonly cause: unknown
}> {}

type DemoError =
  | ArtifactError
  | QueryError
  | SqliteGraph.GraphExtDecodeError
  | SqliteGraph.GraphExtQueryError
  | ScenarioError

interface DemoRuntime {
  readonly db: Database
  readonly extensionPath: string
  readonly version: string
}

type SqlEffect = <T>(sql: string, run: () => T) => Effect.Effect<T, QueryError>

interface ScenarioContext {
  readonly db: Database
  readonly graph: SqliteGraph.GraphExtClient
  readonly sql: SqlEffect
  readonly statementCount: { value: number }
}

const resolveEmbeddedArtifact = (artifactPath: string, artifact: ArtifactName) => {
  if (Bun.embeddedFiles.length === 0) {
    return Effect.succeed(artifactPath)
  }

  return Effect.tryPromise<string, ArtifactError>({
    try: async () => {
      const embeddedArtifact = Bun.file(artifactPath)
      const exportedArtifactPath = `./.${embeddedArtifact.name}`
      await Bun.write(exportedArtifactPath, embeddedArtifact)
      return exportedArtifactPath
    },
    catch: (cause) => new ArtifactError({ artifact, phase: "resolve", path: artifactPath, cause })
  })
}

const configureCustomSqlite = (artifactPath: string) =>
  Effect.try({
    try: () => {
      Database.setCustomSQLite(artifactPath)
    },
    catch: (cause) => new ArtifactError({ artifact: "libsqlite", phase: "configure", path: artifactPath, cause })
  })

const acquireRuntime = Effect.gen(function*() {
  const resolvedLibSqlitePath = yield* resolveEmbeddedArtifact(embeddedLibSqlitePath, "libsqlite")
  yield* configureCustomSqlite(resolvedLibSqlitePath)

  const db = yield* Effect.try({
    try: () => new Database(":memory:"),
    catch: (cause) => new ArtifactError({ artifact: "libsqlite", phase: "open", path: resolvedLibSqlitePath, cause })
  })

  const extensionPath = yield* resolveEmbeddedArtifact(embeddedGraphExtPath, "graph-extension")
  const extensionLoadPath = extensionPath.replace(/\.(?:dylib|so|dll)$/i, "")

  yield* Effect.try({
    try: () => db.loadExtension(extensionLoadPath, graphExtInitSymbol),
    catch: (cause) =>
      new ArtifactError({
        artifact: "graph-extension",
        phase: "load-extension",
        path: extensionPath,
        cause
      })
  })

  // Goal: get a typed API for graph operations immediately after extension load.
  // Obstacle: raw SQL calls plus manual payload parsing are repetitive and easy to drift.
  // Why this resolves it: createGraphExtClient encapsulates SQL shape + decode contracts once.
  const graph = SqliteGraph.createGraphExtClient(db)
  const version = yield* graph.version

  return {
    db,
    extensionPath,
    version
  }
})

const releaseRuntime = (runtime: DemoRuntime) =>
  Effect.sync(() => {
    runtime.db.close()
  })

const withRuntime = <A>(use: (runtime: DemoRuntime) => Effect.Effect<A, DemoError>) =>
  Effect.acquireUseRelease(acquireRuntime, use, releaseRuntime)

const createScenarioContext = (runtime: DemoRuntime) => {
  const statementCount = { value: 0 }
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

const seedSocialGraph = (context: ScenarioContext) =>
  Effect.gen(function*() {
    yield* context.sql("DROP TABLE IF EXISTS social_edges", () => {
      context.db.run("DROP TABLE IF EXISTS social_edges")
    })

    yield* context.sql("CREATE TABLE social_edges + indexes", () => {
      context.db.run(
        "CREATE TABLE social_edges(src TEXT NOT NULL, dst TEXT NOT NULL, edge_type TEXT NOT NULL, deleted_at INTEGER); CREATE INDEX social_edges_src_type ON social_edges(src, edge_type); CREATE INDEX social_edges_dst_type ON social_edges(dst, edge_type)"
      )
    })

    yield* context.sql("INSERT social graph fixtures", () => {
      context.db.run(
        "INSERT INTO social_edges(src, dst, edge_type, deleted_at) VALUES ('ava','bea','follows',NULL), ('ava','cam','follows',NULL), ('ava','dev','follows',NULL), ('ava','bot-zed','follows',NULL), ('ben','bea','follows',NULL), ('ben','cam','follows',NULL), ('ben','eli','follows',NULL), ('bea','finn','follows',NULL), ('bea','gia','follows',NULL), ('bea','hal','follows',NULL), ('bea','bot-promo','follows',NULL), ('cam','finn','follows',NULL), ('cam','ivy','follows',NULL), ('cam','hal','follows',NULL), ('dev','gia','follows',NULL), ('dev','kai','follows',NULL), ('dev','lio','follows',NULL), ('eli','finn','follows',NULL), ('eli','kai','follows',NULL), ('eli','mia','follows',NULL), ('zoe','finn','follows',NULL), ('yan','gia','follows',NULL), ('uma','kai','follows',NULL), ('mia','nia','follows',NULL), ('kai','nia','follows',NULL), ('finn','omar','follows',NULL), ('gia','omar','follows',NULL), ('bot-promo','spam-target','follows',NULL)"
      )
    })
  })

const seedFeedRankings = (context: ScenarioContext) =>
  Effect.gen(function*() {
    yield* context.sql("DROP TABLE IF EXISTS creator_feed_rankings", () => {
      context.db.run("DROP TABLE IF EXISTS creator_feed_rankings")
    })

    yield* context.sql("CREATE TABLE creator_feed_rankings", () => {
      context.db.run(
        "CREATE TABLE creator_feed_rankings(serp_id TEXT NOT NULL, rank INTEGER NOT NULL, url_or_entity_id TEXT NOT NULL)"
      )
    })

    yield* context.sql("INSERT creator feed snapshots", () => {
      context.db.run(
        "INSERT INTO creator_feed_rankings(serp_id, rank, url_or_entity_id) VALUES ('morning',1,'finn'), ('morning',2,'gia'), ('morning',3,'hal'), ('morning',4,'ivy'), ('morning',5,'kai'), ('evening',1,'gia'), ('evening',2,'finn'), ('evening',3,'mia'), ('evening',4,'kai'), ('evening',5,'nia')"
      )
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

const runNaiveTwoHopWithoutExtension = (
  context: ScenarioContext,
  input: {
    readonly edgeTable: string
    readonly hop1EdgeType: string
    readonly hop2EdgeType: string
    readonly seedIds: ReadonlyArray<string>
    readonly excludeIds: ReadonlyArray<string>
  }
) =>
  Effect.gen(function*() {
    const seedPlaceholders = buildPlaceholders(input.seedIds.length)
    const excludePlaceholders = buildPlaceholders(input.excludeIds.length)

    const sql = [
      "WITH first_hop AS (",
      `  SELECT DISTINCT e1.dst AS mid FROM ${input.edgeTable} e1`,
      `  WHERE e1.edge_type = ? AND e1.deleted_at IS NULL AND e1.src IN (${seedPlaceholders}) AND e1.dst NOT LIKE 'bot-%'`,
      "),",
      "second_hop AS (",
      `  SELECT e2.dst AS candidate, COUNT(DISTINCT e2.src) AS support_count FROM ${input.edgeTable} e2`,
      "  JOIN first_hop fh ON fh.mid = e2.src",
      "  WHERE e2.edge_type = ? AND e2.deleted_at IS NULL",
      "  GROUP BY e2.dst",
      "),",
      "filtered AS (",
      "  SELECT candidate, support_count FROM second_hop",
      "  WHERE candidate NOT IN (SELECT mid FROM first_hop)",
      `    AND candidate NOT IN (${seedPlaceholders})`,
      `    AND candidate NOT IN (${excludePlaceholders})`,
      ")",
      "SELECT candidate, support_count FROM filtered ORDER BY support_count DESC, candidate ASC"
    ].join("\n")

    const rows = yield* context.sql("raw CTE recommendation pipeline", () => {
      const bindings = [
        input.hop1EdgeType,
        ...input.seedIds,
        input.hop2EdgeType,
        ...input.seedIds,
        ...input.excludeIds
      ] as const

      return context.db.query(sql).all(...bindings)
    })

    const normalized = rows.flatMap((row) => {
      if (row == null || typeof row !== "object") return []
      const candidate = Reflect.get(row, "candidate")
      const supportCount = Reflect.get(row, "support_count")
      if (typeof candidate !== "string") return []
      if (typeof supportCount !== "number" || !Number.isFinite(supportCount)) return []
      return [{ candidate, supportCount }]
    })

    return {
      rows: normalized,
      sqlCharacters: sql.length,
      placeholderCount: countPlaceholders(sql)
    }
  })

const recommendationDxScenario = (context: ScenarioContext) =>
  Effect.gen(function*() {
    yield* seedSocialGraph(context)

    // Goal: produce social recommendations from a seed cohort in one readable step.
    // Obstacle: the baseline needs a long CTE pipeline and brittle placeholder bookkeeping.
    // Why this resolves it: recommendByTwoHop composes the hard parts with deterministic idset semantics.
    const extension = yield* context.graph.recommendByTwoHop({
      edgeTable: "social_edges",
      hop1EdgeType: "follows",
      hop2EdgeType: "follows",
      seedIds: ["ava", "ben"],
      excludeIds: ["bot-promo", "bot-zed", "hal", "spam-target"]
    })

    const baseline = yield* runNaiveTwoHopWithoutExtension(context, {
      edgeTable: "social_edges",
      hop1EdgeType: "follows",
      hop2EdgeType: "follows",
      seedIds: ["ava", "ben"],
      excludeIds: ["bot-promo", "bot-zed", "hal", "spam-target"]
    })

    const extensionRows = extension.rows.map((row) => ({
      section: "with-extension-row",
      ...row
    }))

    const baselineRows = baseline.rows.map((row, index) => ({
      section: "without-extension-row",
      rank: index + 1,
      candidate: row.candidate,
      supportCount: row.supportCount
    }))

    const extensionCandidates = extension.rows.map((row) => row.candidate).join(", ")
    const baselineCandidates = baseline.rows.map((row) => row.candidate).join(", ")

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
        manual_cte: "first_hop + second_hop + filtered"
      },
      ...baselineRows,
      {
        section: "opinionated-verdict",
        why_awesome: "extension API gives typed rows, deterministic idset semantics, and less room for SQL footguns",
        why_raw_sql_hurts: "raw CTE orchestration pushes graph logic + placeholder bookkeeping into app code",
        extension_candidates: extensionCandidates,
        raw_sql_candidates: baselineCandidates,
        point: "when raw SQL drift sneaks in, you can ship the wrong ranking without realizing it"
      }
    ]
  })

const cohortLensScenario = (context: ScenarioContext) =>
  Effect.gen(function*() {
    yield* seedSocialGraph(context)

    // Goal: represent a dynamic cohort as a safe SQL expression.
    // Obstacle: hand-building IN clauses is noisy and quote/ordering sensitive.
    // Why this resolves it: idsetFromValues builds deterministic, parameterized idset expressions.
    const cohortSet = SqliteGraph.idsetFromValues(["ava", "ben", "eli"])

    // Goal: inspect each account's outbound neighborhood as a grouped set.
    // Obstacle: status quo requires custom SQL aggregation plus custom payload decoding in app code.
    // Why this resolves it: graphOutIdset returns typed grouped rows through one client call.
    const outbound = yield* context.graph.graphOutIdset({
      edgeTable: "social_edges",
      edgeType: "follows",
      srcSet: cohortSet
    })

    const spotlightSet = SqliteGraph.idsetFromValues(["finn", "gia", "kai", "mia", "nia", "omar"])
    // Goal: view inbound supporters for spotlight accounts.
    // Obstacle: reverse traversal normally duplicates query shape and parsing logic.
    // Why this resolves it: graphInIdset mirrors the outbound API with typed decoded output.
    const inbound = yield* context.graph.graphInIdset({
      edgeTable: "social_edges",
      edgeType: "follows",
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

const creatorMomentumScenario = (context: ScenarioContext) =>
  Effect.gen(function*() {
    yield* seedFeedRankings(context)

    // Goal: explain momentum between two ranking snapshots.
    // Obstacle: status quo diff logic requires multiple joins and null-handling edge cases.
    // Why this resolves it: rankedDiff emits typed enter/exit/move rows directly.
    const rows = yield* context.graph.rankedDiff({
      oldSerpId: "morning",
      newSerpId: "evening",
      table: "creator_feed_rankings"
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
    console.log("Loaded graph extension:", runtime.extensionPath)
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
