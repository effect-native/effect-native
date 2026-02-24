/* eslint-disable no-console */

import { Database } from "bun:sqlite"
import { Data, Effect, Layer, Ref, ServiceMap } from "effect"

import { getLibSqlitePathSync } from "@effect-native/libsqlite" with { type: "macro" }
import { getGraphExtPathSync } from "@effect-native/sqlite-graph-ext" with { type: "macro" }

const embeddedLibSqlitePath = getLibSqlitePathSync()
const embeddedGraphExtPath = getGraphExtPathSync()
const graphExtInitSymbol = "sqlite3_graph_ext_init"

type ArtifactName = "libsqlite" | "graph-extension"

type ArtifactPhase = "resolve" | "configure" | "open" | "load-extension"

type SqlBinding = string | number | bigint | Uint8Array | null

type IdSetExpression = {
  readonly expression: string
  readonly bindings: ReadonlyArray<string>
}

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

interface DatabaseService {
  readonly db: Database
}

interface GraphExtensionService {
  readonly extensionPath: string
  readonly initSymbol: string
  readonly version: string
}

interface ProfilingService {
  readonly statementCount: Ref.Ref<number>
}

const DatabaseService = ServiceMap.Service<DatabaseService>("@effect-native/sqlite-graph-ext-demo/Database")
const GraphExtensionService = ServiceMap.Service<GraphExtensionService>(
  "@effect-native/sqlite-graph-ext-demo/GraphExtension"
)
const ProfilingService = ServiceMap.Service<ProfilingService>("@effect-native/sqlite-graph-ext-demo/Profiling")

const resolveEmbeddedArtifact = (
  artifactPath: string,
  artifact: ArtifactName
): Effect.Effect<string, ArtifactError> => {
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

const runStatement = <T>(
  sql: string,
  run: () => T,
  statementCounter?: Ref.Ref<number>
): Effect.Effect<T, QueryError> =>
  Effect.gen(function*() {
    if (statementCounter != null) {
      yield* Ref.update(statementCounter, (n) => n + 1)
    }

    return yield* Effect.try({
      try: run,
      catch: (cause) => new QueryError({ sql, cause })
    })
  })

const configureCustomSqlite = (artifactPath: string): Effect.Effect<string, ArtifactError> =>
  Effect.try({
    try: () => {
      Database.setCustomSQLite(artifactPath)
      return artifactPath
    },
    catch: (cause) => new ArtifactError({ artifact: "libsqlite", phase: "configure", path: artifactPath, cause })
  })

const DatabaseLayer = Layer.effect(
  DatabaseService,
  Effect.acquireRelease(
    Effect.gen(function*() {
      const db = yield* Effect.try({
        try: () => new Database(":memory:"),
        catch: (cause) =>
          new ArtifactError({ artifact: "libsqlite", phase: "open", path: embeddedLibSqlitePath, cause })
      })
      return { db }
    }),
    ({ db }) => Effect.sync(() => db.close())
  )
)

const GraphExtensionLayer = Layer.effect(
  GraphExtensionService,
  Effect.gen(function*() {
    const { db } = yield* DatabaseService
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

    const extensionVersionValue = yield* runStatement(
      "SELECT graph_ext_version() AS version",
      () => {
        const row = db.query("SELECT graph_ext_version() AS version").get()
        return readColumn(row, "version")
      }
    )

    const extensionVersion = typeof extensionVersionValue === "string" ? extensionVersionValue : "unknown"

    console.log("Loaded graph extension:", extensionPath)
    console.log("Init symbol:", graphExtInitSymbol)
    console.log("Graph extension version:", extensionVersion)

    return { extensionPath, initSymbol: graphExtInitSymbol, version: extensionVersion }
  })
).pipe(Layer.provide(DatabaseLayer))

const ProfilingLayer = Layer.effect(
  ProfilingService,
  Effect.gen(function*() {
    return { statementCount: yield* Ref.make(0) }
  })
)

const DemoLayer = Layer.mergeAll(DatabaseLayer, GraphExtensionLayer, ProfilingLayer)

const decodeBlobValue = (value: unknown): string => {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  return String(value)
}

const parseTsvRows = (value: unknown): ReadonlyArray<ReadonlyArray<string>> => {
  const text = decodeBlobValue(value)
  if (text.length === 0) return []
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"))
}

const parseIdsetEachRows = (value: unknown): ReadonlyArray<{ readonly id: string; readonly ord: number }> =>
  parseTsvRows(value).flatMap((columns) => {
    const id = columns[0] ?? ""
    const ordText = columns[1] ?? ""
    const ord = Number(ordText)
    if (id.length === 0 || !Number.isFinite(ord)) {
      return []
    }
    return [{ id, ord }]
  })

const parseGroupedIdsetPayload = (
  value: unknown
): ReadonlyArray<{ readonly key: string; readonly members: ReadonlyArray<string> }> => {
  const text = decodeBlobValue(value)
  if (text.length === 0) return []

  const lines = text.split("\n").filter((line) => line.length > 0)
  const groups: Array<{ key: string; members: Array<string> }> = []

  let currentKey: string | null = null
  let currentMembers: Array<string> = []

  for (const line of lines) {
    const tabIndex = line.indexOf("\t")
    if (tabIndex >= 0) {
      if (currentKey != null) {
        groups.push({ key: currentKey, members: currentMembers })
      }

      currentKey = line.slice(0, tabIndex)
      const firstMember = line.slice(tabIndex + 1)
      currentMembers = firstMember.length > 0 ? [firstMember] : []
      continue
    }

    if (currentKey != null) {
      currentMembers.push(line)
    }
  }

  if (currentKey != null) {
    groups.push({ key: currentKey, members: currentMembers })
  }

  return groups
}

const uniqueSorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.from(new Set(values.filter((value) => value.length > 0))).sort((a, b) => a.localeCompare(b))

const readColumn = (row: unknown, columnName: string): unknown => {
  if (row == null || typeof row !== "object") return ""
  const value = Reflect.get(row, columnName)
  return value ?? ""
}

const runPayloadStatement = (
  db: Database,
  profiler: ProfilingService,
  sqlLabel: string,
  sql: string,
  bindings: ReadonlyArray<SqlBinding>,
  columnName = "payload"
): Effect.Effect<unknown, QueryError> =>
  runStatement(
    sqlLabel,
    () => {
      const row = db.query(sql).get(...Array.from(bindings))
      return readColumn(row, columnName)
    },
    profiler.statementCount
  )

const buildIdSetExpression = (values: ReadonlyArray<string>): IdSetExpression => {
  let expression = "idset_empty()"
  const bindings: Array<string> = []

  for (const value of uniqueSorted(values)) {
    expression = `idset_add(${expression}, ?)`
    bindings.push(value)
  }

  return { expression, bindings }
}

const seedSocialGraph = (db: Database, profiler: ProfilingService): Effect.Effect<void, QueryError> =>
  Effect.gen(function*() {
    yield* runStatement(
      "CREATE TABLE social_edges + indexes",
      () => {
        db.exec(
          "CREATE TABLE IF NOT EXISTS social_edges(src TEXT NOT NULL, dst TEXT NOT NULL, edge_type TEXT NOT NULL, deleted_at INTEGER); CREATE INDEX IF NOT EXISTS social_edges_src_type ON social_edges(src, edge_type); CREATE INDEX IF NOT EXISTS social_edges_dst_type ON social_edges(dst, edge_type)"
        )
      },
      profiler.statementCount
    )

    yield* runStatement(
      "INSERT social graph fixtures",
      () => {
        db.exec(
          "INSERT INTO social_edges(src, dst, edge_type, deleted_at) VALUES ('ava','bea','follows',NULL), ('ava','cam','follows',NULL), ('ava','dev','follows',NULL), ('ava','bot-zed','follows',NULL), ('ben','bea','follows',NULL), ('ben','cam','follows',NULL), ('ben','eli','follows',NULL), ('bea','finn','follows',NULL), ('bea','gia','follows',NULL), ('bea','hal','follows',NULL), ('bea','bot-promo','follows',NULL), ('cam','finn','follows',NULL), ('cam','ivy','follows',NULL), ('cam','hal','follows',NULL), ('dev','gia','follows',NULL), ('dev','kai','follows',NULL), ('dev','lio','follows',NULL), ('eli','finn','follows',NULL), ('eli','kai','follows',NULL), ('eli','mia','follows',NULL), ('zoe','finn','follows',NULL), ('yan','gia','follows',NULL), ('uma','kai','follows',NULL), ('mia','nia','follows',NULL), ('kai','nia','follows',NULL), ('finn','omar','follows',NULL), ('gia','omar','follows',NULL), ('bot-promo','spam-target','follows',NULL)"
        )
      },
      profiler.statementCount
    )
  })

const seedFeedRankingSnapshots = (db: Database, profiler: ProfilingService): Effect.Effect<void, QueryError> =>
  Effect.gen(function*() {
    yield* runStatement(
      "CREATE TABLE creator_feed_rankings",
      () => {
        db.exec(
          "CREATE TABLE IF NOT EXISTS creator_feed_rankings(serp_id TEXT NOT NULL, rank INTEGER NOT NULL, url_or_entity_id TEXT NOT NULL)"
        )
      },
      profiler.statementCount
    )

    yield* runStatement(
      "INSERT creator feed snapshots",
      () => {
        db.exec(
          "INSERT INTO creator_feed_rankings(serp_id, rank, url_or_entity_id) VALUES ('morning',1,'finn'), ('morning',2,'gia'), ('morning',3,'hal'), ('morning',4,'ivy'), ('morning',5,'kai'), ('evening',1,'gia'), ('evening',2,'finn'), ('evening',3,'mia'), ('evening',4,'kai'), ('evening',5,'nia')"
        )
      },
      profiler.statementCount
    )
  })

const runScenario = <R>(
  name: string,
  run: (db: Database, profiler: ProfilingService) => Effect.Effect<ReadonlyArray<R>, QueryError>
) =>
  Effect.gen(function*() {
    const { db } = yield* DatabaseService
    const profiler = yield* ProfilingService

    const started = yield* Effect.sync(() => performance.now())
    const rows = yield* run(db, profiler)
    const statementCount = yield* Ref.get(profiler.statementCount)
    const elapsedMs = Math.round((yield* Effect.sync(() => performance.now())) - started)

    console.log(`\n=== ${name} ===`)
    console.log(rows)
    console.log(`statementCount=${statementCount}`)
    console.log(`elapsedMs=${elapsedMs}`)
  })

const twoHopRecommendationScenario = (db: Database, profiler: ProfilingService) =>
  Effect.gen(function*() {
    yield* seedSocialGraph(db, profiler)

    const seekers = ["ava", "ben"]
    const seekersSet = buildIdSetExpression(seekers)

    const firstHopPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT graph_out_many(...) AS payload",
      `SELECT graph_out_many('social_edges', 'follows', ${seekersSet.expression}, 'deleted_at IS NULL AND dst NOT LIKE ''bot-%''') AS payload`,
      seekersSet.bindings
    )

    const firstHopEdges = parseTsvRows(firstHopPayload).flatMap((columns) => {
      const src = columns[0] ?? ""
      const dst = columns[1] ?? ""
      if (src.length === 0 || dst.length === 0) return []
      return [{ src, dst }]
    })

    const firstHopTargets = uniqueSorted(firstHopEdges.map((edge) => edge.dst))
    const firstHopSet = buildIdSetExpression(firstHopTargets)

    const secondHopPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT graph_two_hop_counts(...) AS payload",
      `SELECT graph_two_hop_counts('social_edges', 'follows', 'follows', ${firstHopSet.expression}) AS payload`,
      firstHopSet.bindings
    )

    const secondHopRows = parseTsvRows(secondHopPayload).flatMap((columns) => {
      const dst = columns[0] ?? ""
      const supportText = columns[1] ?? ""
      const supportCount = Number(supportText)
      if (dst.length === 0 || !Number.isFinite(supportCount)) return []
      return [{ dst, supportCount }]
    })

    const candidateSet = buildIdSetExpression(secondHopRows.map((row) => row.dst))
    const excludedSet = buildIdSetExpression([
      ...seekers,
      ...firstHopTargets,
      "bot-promo",
      "bot-zed",
      "hal",
      "spam-target"
    ])

    const recommendationSetExpression = `idset_diff(${candidateSet.expression}, ${excludedSet.expression})`
    const recommendationBindings = [...candidateSet.bindings, ...excludedSet.bindings]

    const recommendationHashPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT idset_hash(...) AS payload",
      `SELECT idset_hash(${recommendationSetExpression}) AS payload`,
      recommendationBindings
    )

    console.log(`recommendationSetHash=${decodeBlobValue(recommendationHashPayload)}`)

    const deterministicPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT idset_each(...) AS payload",
      `SELECT idset_each(${recommendationSetExpression}) AS payload`,
      recommendationBindings
    )

    const inboundPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT graph_in_many(...) AS payload",
      `SELECT graph_in_many('social_edges', 'follows', ${recommendationSetExpression}, 'deleted_at IS NULL') AS payload`,
      recommendationBindings
    )

    const supportByCandidate = new Map(secondHopRows.map((row) => [row.dst, row.supportCount]))
    const connectorsByCandidate = new Map<string, Array<string>>()

    for (const columns of parseTsvRows(inboundPayload)) {
      const candidate = columns[0] ?? ""
      const connector = columns[1] ?? ""
      if (candidate.length === 0 || connector.length === 0) continue

      const current = connectorsByCandidate.get(candidate) ?? []
      current.push(connector)
      connectorsByCandidate.set(candidate, current)
    }

    const sortedRecommendations = parseIdsetEachRows(deterministicPayload)
      .map(({ id, ord }) => {
        const connectors = uniqueSorted(connectorsByCandidate.get(id) ?? [])

        return {
          deterministic_ord: ord,
          candidate: id,
          support_count: supportByCandidate.get(id) ?? 0,
          via: connectors.join(", ")
        }
      })
      .sort((a, b) => b.support_count - a.support_count || a.candidate.localeCompare(b.candidate))

    return sortedRecommendations.map((row, index) => ({
      rank: index + 1,
      ...row
    }))
  })

const cohortLensScenario = (db: Database, profiler: ProfilingService) =>
  Effect.gen(function*() {
    yield* seedSocialGraph(db, profiler)

    const cohortSet = buildIdSetExpression(["ava", "ben", "eli"])
    const outboundPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT graph_out_idset(...) AS payload",
      `SELECT graph_out_idset('social_edges', 'follows', ${cohortSet.expression}) AS payload`,
      cohortSet.bindings
    )

    const spotlightSet = buildIdSetExpression(["finn", "gia", "kai", "mia", "nia", "omar"])
    const inboundPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT graph_in_idset(...) AS payload",
      `SELECT graph_in_idset('social_edges', 'follows', ${spotlightSet.expression}) AS payload`,
      spotlightSet.bindings
    )

    const outboundGroups = parseGroupedIdsetPayload(outboundPayload)
    const inboundGroups = parseGroupedIdsetPayload(inboundPayload)
    const outboundMap = new Map(outboundGroups.map((group) => [group.key, group.members]))

    const avaSet = buildIdSetExpression(outboundMap.get("ava") ?? [])
    const benSet = buildIdSetExpression(outboundMap.get("ben") ?? [])

    const overlapPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT idset_each(idset_intersect(...)) AS payload",
      `SELECT idset_each(idset_intersect(${avaSet.expression}, ${benSet.expression})) AS payload`,
      [...avaSet.bindings, ...benSet.bindings]
    )

    const overlapMembers = parseIdsetEachRows(overlapPayload).map((row) => row.id)

    const outboundRows = outboundGroups.map((group) => ({
      lens: "outbound-neighborhood",
      account: group.key,
      member_count: group.members.length,
      members: group.members.join(", ")
    }))

    const inboundRows = inboundGroups.map((group) => ({
      lens: "inbound-support",
      account: group.key,
      member_count: group.members.length,
      members: group.members.join(", ")
    }))

    return [
      ...outboundRows,
      {
        lens: "overlap",
        account: "ava+ben",
        member_count: overlapMembers.length,
        members: overlapMembers.join(", ")
      },
      ...inboundRows
    ]
  })

const parseNullableInt = (value: string): number | null => {
  if (value.length === 0) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const creatorMomentumScenario = (db: Database, profiler: ProfilingService) =>
  Effect.gen(function*() {
    yield* seedFeedRankingSnapshots(db, profiler)

    const diffPayload = yield* runPayloadStatement(
      db,
      profiler,
      "SELECT ranked_diff(...) AS payload",
      "SELECT ranked_diff('morning', 'evening', 'creator_feed_rankings') AS payload",
      []
    )

    return parseTsvRows(diffPayload).flatMap((columns) => {
      const item = columns[0] ?? ""
      const oldRank = parseNullableInt(columns[1] ?? "")
      const newRank = parseNullableInt(columns[2] ?? "")
      const deltaRank = parseNullableInt(columns[3] ?? "")
      const status = columns[4] ?? ""
      if (item.length === 0) return []

      return [{
        creator: item,
        old_rank: oldRank,
        new_rank: newRank,
        delta_rank: deltaRank,
        status
      }]
    })
  })

const runDemoScenario = <R>(
  name: string,
  scenario: (db: Database, profiler: ProfilingService) => Effect.Effect<ReadonlyArray<R>, QueryError>
) => runScenario(name, scenario).pipe(Effect.provide(DemoLayer))

const program = Effect.gen(function*() {
  const resolvedLibSqlitePath = yield* resolveEmbeddedArtifact(embeddedLibSqlitePath, "libsqlite")
  yield* configureCustomSqlite(resolvedLibSqlitePath)

  yield* runDemoScenario("two-hop recommendation pipeline", twoHopRecommendationScenario)
  yield* runDemoScenario("cohort neighborhood lens", cohortLensScenario)
  yield* runDemoScenario("creator momentum with ranked_diff", creatorMomentumScenario)
})

Effect.runPromise(program).catch((cause) => {
  console.error(cause)
  process.exit(1)
})
