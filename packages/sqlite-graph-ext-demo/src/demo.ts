/* eslint-disable @typescript-eslint/no-require-imports */

import { Data, Effect, Ref, Runtime } from "effect"
import { Database } from "bun:sqlite"

import { getGraphExtPathSync } from "@effect-native/sqlite-graph-ext" with { type: "macro" }
import { getLibSqlitePathSync } from "@effect-native/libsqlite" with { type: "macro" }

const embeddedLibSqlitePath = String(require(getLibSqlitePathSync()))
const embeddedGraphExtPath = String(require(getGraphExtPathSync()))

class SetupError extends Data.TaggedError("SetupError")<{
  readonly cause: unknown
  readonly context: "bootstrap" | "extension"
}> {}

class ExtensionLoadError extends Data.TaggedError("ExtensionLoadError")<{
  readonly path: string
  readonly initSymbol: string
  readonly cause: unknown
}> {}

class QueryError extends Data.TaggedError("QueryError")<{
  readonly sql: string
  readonly cause: unknown
}> {}

const decodeBlob = (value: unknown): string => {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  return String(value)
}

const parseTsvRows = (value: unknown): readonly (readonly string[])[] => {
  const text = decodeBlob(value)
  if (!text) return []
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"))
}

const parseIdsetRows = (value: unknown): readonly string[] => {
  const text = decodeBlob(value)
  if (!text) return []
  return text.split("\n").filter((line) => line.length > 0)
}

const idsetExprWithBindings = (values: readonly string[]) => {
  let expression = "idset_empty()"
  for (const _ of values) {
    expression = `idset_add(${expression}, ?)`
  }
  return { expression, bindings: Array.from(values) }
}

const executeSql = <T>(
  db: Database,
  statementCounter: Ref.Ref<number>,
  sql: string,
  run: () => T
): Effect.Effect<T, QueryError> =>
  Effect.gen(function*() {
    yield* Ref.update(statementCounter, (n) => n + 1)
    return yield* Effect.try({
      try: run,
      catch: (cause) => new QueryError({ sql, cause })
    })
  })

const bootstrapSqlite = Effect.sync(() => {
  if (Bun.embeddedFiles.length) {
    const embeddedLibSqliteFile = Bun.file(embeddedLibSqlitePath)
    const exportedLibSqlitePath = `./.${embeddedLibSqliteFile.name}`
    Bun.write(exportedLibSqlitePath, embeddedLibSqliteFile)
    Database.setCustomSQLite(exportedLibSqlitePath)
    return
  }

  Database.setCustomSQLite(embeddedLibSqlitePath)
})

const loadGraphExtension = (db: Database) =>
  Effect.sync(() => {
    db.loadExtension(embeddedGraphExtPath, "sqlite3_graph_ext_init")
  }).pipe(
    Effect.catchAll((cause) => {
      if (String(cause).includes("no such file")) {
        const embeddedGraphExtFile = Bun.file(embeddedGraphExtPath)
        const exportedGraphExtPath = `./.${embeddedGraphExtFile.name}`
        return Effect.sync(() => {
          Bun.write(exportedGraphExtPath, embeddedGraphExtFile)
          db.loadExtension(exportedGraphExtPath, "sqlite3_graph_ext_init")
        })
      }

      return Effect.fail(new ExtensionLoadError({
        path: embeddedGraphExtPath,
        initSymbol: "sqlite3_graph_ext_init",
        cause
      }))
    })
  )

const initializeDb = Effect.gen(function*() {
  yield* bootstrapSqlite
  const db = new Database(":memory:")
  yield* loadGraphExtension(db)

  const extensionCounter = yield* Ref.make(0)
  const extensionRows = yield* executeSql(
    db,
    extensionCounter,
    "SELECT graph_ext_version() AS version",
    () => db.query("SELECT graph_ext_version() AS version").all()
  )

  if (!extensionRows.length) {
    return yield* Effect.fail(new SetupError({
      context: "extension",
      cause: new Error("graph_ext_version() returned no rows")
    }))
  }

  const [versionRow] = extensionRows as Array<{ version: string }>
  console.log("Graph extension version:", versionRow.version)
  return db
})

const runScenario = (
  name: string,
  run: (db: Database, counter: Ref.Ref<number>) => Effect.Effect<readonly unknown[], QueryError>
) =>
  Effect.gen(function*() {
    const db = yield* initializeDb
    const profiler = yield* Ref.make(0)
    const started = performance.now()

    const rows = yield* run(db, profiler)
    const statementCount = yield* Ref.get(profiler)
    const elapsedMs = Math.round(performance.now() - started)

    db.close()

    console.log(`${name} rows=${rows.length}`)
    console.log(`statementCount=${statementCount}`)
    console.log(`elapsedMs=${elapsedMs}`)
  })

const rankingScenario = (db: Database, counter: Ref.Ref<number>) =>
  Effect.gen(function*() {
    yield* executeSql(
      db,
      counter,
      "CREATE TABLE IF NOT EXISTS edge_table(src TEXT, dst TEXT, edge_type TEXT)",
      () => {
        db.exec("CREATE TABLE IF NOT EXISTS edge_table(src TEXT, dst TEXT, edge_type TEXT)")
      }
    )

    yield* executeSql(
      db,
      counter,
      "INSERT INTO edge_table(src, dst, edge_type) VALUES('alice', 'post-1', 'follows'), ('alice', 'post-2', 'follows'), ('bob', 'post-1', 'follows'), ('post-1', 'groupA', 'viewed_by'), ('post-2', 'groupB', 'viewed_by'), ('post-3', 'groupA', 'viewed_by')",
      () => {
        db.exec(
          "INSERT INTO edge_table(src, dst, edge_type) VALUES('alice', 'post-1', 'follows'), ('alice', 'post-2', 'follows'), ('bob', 'post-1', 'follows'), ('post-1', 'groupA', 'viewed_by'), ('post-2', 'groupB', 'viewed_by'), ('post-3', 'groupA', 'viewed_by')"
        )
      }
    )

    const startSet = idsetExprWithBindings(["alice", "bob"])
    const rows = yield* executeSql(
      db,
      counter,
      "SELECT graph_two_hop_counts('edge_table', 'follows', 'viewed_by', idset_add(idset_add(idset_empty(), 'alice'), 'bob')) AS results",
      () => {
        const statement = db.query(
          `SELECT graph_two_hop_counts('edge_table', 'follows', 'viewed_by', ${startSet.expression}) AS results`
        )
        const row = statement.get(...startSet.bindings) as { results: unknown } | null
        return row == null ? [] : [row]
      }
    )

    const parsedRows = parseTsvRows((rows[0] as { results: unknown })?.results)
    return parsedRows.slice(0, 3).map(([dst, support_count]) => ({
      dst,
      support_count: Number(support_count)
    }))
  })

const deltaScenario = (db: Database, counter: Ref.Ref<number>) =>
  Effect.gen(function*() {
    yield* executeSql(
      db,
      counter,
      "CREATE TABLE IF NOT EXISTS serp_snapshots(serp_id TEXT, rank INTEGER, url_or_entity_id TEXT)",
      () => {
        db.exec("CREATE TABLE IF NOT EXISTS serp_snapshots(serp_id TEXT, rank INTEGER, url_or_entity_id TEXT)")
      }
    )
    yield* executeSql(
      db,
      counter,
      "INSERT INTO serp_snapshots(serp_id, rank, url_or_entity_id) VALUES('old', 1, 'alpha'), ('old', 2, 'beta'), ('old', 3, 'gamma'), ('new', 1, 'beta'), ('new', 2, 'alpha'), ('new', 4, 'delta')",
      () => {
        db.exec(
          "INSERT INTO serp_snapshots(serp_id, rank, url_or_entity_id) VALUES('old', 1, 'alpha'), ('old', 2, 'beta'), ('old', 3, 'gamma'), ('new', 1, 'beta'), ('new', 2, 'alpha'), ('new', 4, 'delta')"
        )
      }
    )

    const rows = yield* executeSql(
      db,
      counter,
      "SELECT ranked_diff('old', 'new', 'serp_snapshots') AS diff",
      () => {
        const row = db.query("SELECT ranked_diff(?, ?, ?) AS diff").get("old", "new", "serp_snapshots") as
          | { diff: unknown }
          | null
        return row == null ? [] : [row]
      }
    )

    const parsedRows = parseTsvRows((rows[0] as { diff: unknown })?.diff)
    return parsedRows.map(([item, old_rank, new_rank, delta_rank, status]) => ({
      item,
      old_rank: old_rank.length > 0 ? Number(old_rank) : null,
      new_rank: new_rank.length > 0 ? Number(new_rank) : null,
      delta_rank: delta_rank.length > 0 ? Number(delta_rank) : null,
      status
    }))
  })

const resolutionScenario = (db: Database, counter: Ref.Ref<number>) =>
  Effect.gen(function*() {
    const phoneSet = idsetExprWithBindings(["555-111", "555-222", "555-333", "555-999"])
    const addressSet = idsetExprWithBindings(["555-111", "555-444", "555-333"])
    const rows = yield* executeSql(
      db,
      counter,
      "SELECT idset_intersect(idset_empty(), idset_empty()) AS intersection",
      () => {
        const statement = db.query(
          `SELECT idset_intersect(${phoneSet.expression}, ${addressSet.expression}) AS intersection`
        )
        const row = statement.get(...phoneSet.bindings, ...addressSet.bindings) as { intersection: unknown } | null
        return row == null ? [] : [row]
      }
    )

    const parsedRows = parseIdsetRows((rows[0] as { intersection: unknown })?.intersection)
    return parsedRows.map((id) => ({ id }))
  })

const program = Effect.gen(function*() {
  yield* runScenario("ranking", rankingScenario)
  yield* runScenario("delta", deltaScenario)
  yield* runScenario("resolution", resolutionScenario)
}).pipe(
  Effect.catchAll((cause) => {
    return Effect.sync(() => {
      console.error(cause)
      process.exit(1)
    })
  })
)

Runtime.runPromise(program)
