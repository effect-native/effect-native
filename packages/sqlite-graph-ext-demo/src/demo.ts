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
    yield* executeSql(db, counter, "CREATE TABLE IF NOT EXISTS edge_table(src TEXT, dst TEXT)", () => {
      db.exec("CREATE TABLE IF NOT EXISTS edge_table(src TEXT, dst TEXT)")
    })

    yield* executeSql(
      db,
      counter,
      "INSERT INTO edge_table(src, dst) VALUES('a', 'b'), ('a', 'c'), ('b', 'd'), ('c', 'd')",
      () => {
        db.exec("INSERT INTO edge_table(src, dst) VALUES('a', 'b'), ('a', 'c'), ('b', 'd'), ('c', 'd')")
      }
    )

    // Placeholder query shape: extension path and extension profile are verified in future iterations.
    const rows = yield* executeSql(
      db,
      counter,
      "SELECT dst, 1 AS support_count FROM edge_table LIMIT 10",
      () => db.query("SELECT dst, 1 AS support_count FROM edge_table LIMIT 10").all()
    )

    return rows as readonly unknown[]
  })

const deltaScenario = (db: Database, counter: Ref.Ref<number>) =>
  Effect.gen(function*() {
    yield* executeSql(db, counter, "CREATE TABLE IF NOT EXISTS serp(serp_id TEXT, rank INTEGER, item TEXT)", () => {
      db.exec("CREATE TABLE IF NOT EXISTS serp(serp_id TEXT, rank INTEGER, item TEXT)")
    })
    yield* executeSql(db, counter, "INSERT INTO serp(serp_id, rank, item) VALUES('old', 1, 'a'), ('new', 2, 'b')", () => {
      db.exec("INSERT INTO serp(serp_id, rank, item) VALUES('old', 1, 'a'), ('new', 2, 'b')")
    })

    const rows = yield* executeSql(
      db,
      counter,
      "SELECT 'demo' AS item, 1 AS old_rank, 1 AS new_rank, 0 AS delta_rank, 'unchanged' AS status",
      () => {
        return [
          {
            item: "demo",
            old_rank: 1,
            new_rank: 1,
            delta_rank: 0,
            status: "unchanged"
          }
        ]
      }
    )

    return rows
  })

const resolutionScenario = (db: Database, counter: Ref.Ref<number>) =>
  Effect.gen(function*() {
    const rows = yield* executeSql(db, counter, "SELECT 'candidate' AS entity", () => {
      return [{
        entity: "sample"
      }]
    })

    const finalRows = yield* executeSql(
      db,
      counter,
      "SELECT 'candidate' AS id",
      () => db.query("SELECT 'candidate' AS id").all()
    )

    return finalRows
  })

const program = Effect.gen(function*() {
  yield* runScenario("ranking", rankingScenario)
  yield* runScenario("delta", deltaScenario)
  yield* runScenario("resolution", resolutionScenario)
}).pipe(
  Effect.catchAll((cause) => {
    return Effect.sync(() => {
      if (cause instanceof SetupError || cause instanceof ExtensionLoadError || cause instanceof QueryError) {
        console.error(cause)
      } else {
        console.error(cause)
      }
      process.exit(1)
    })
  })
)

Runtime.runPromise(program)
