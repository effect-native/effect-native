/**
 * Bun runtime helper for sqlite-graph-ext bootstrapping.
 *
 * @since 0.1.0
 */

import { Database } from "bun:sqlite"
import { Data, Effect } from "effect"
import { createGraphExtClient, type GraphExtClient, type GraphExtClientOptions } from "./client.js"
import { getGraphExtPathSync } from "./index.js"

type BunGraphArtifact = "libsqlite" | "graph-extension"

type BunGraphRuntimePhase =
  | "resolve-libsqlite-artifact"
  | "configure-custom-sqlite"
  | "open-database"
  | "resolve-graph-extension-artifact"
  | "load-graph-extension"
  | "read-graph-extension-version"

export class BunGraphRuntimeError extends Data.TaggedError("BunGraphRuntimeError")<{
  readonly artifact: BunGraphArtifact
  readonly phase: BunGraphRuntimePhase
  readonly path: string
  readonly cause: unknown
}> {}

export interface BunGraphRuntimeOptions {
  readonly libSqlitePath: string
  readonly dbPath?: string
  readonly initSymbol?: string
  readonly graphExtensionPath?: string
  readonly onStatement?: GraphExtClientOptions["onStatement"]
}

export interface BunGraphRuntime {
  readonly db: Database
  readonly graph: GraphExtClient
  readonly version: string
  readonly libSqlitePath: string
  readonly graphExtensionPath: string
}

const normalizeExtensionLoadPath = (path: string) => path.replace(/\.(?:dylib|so|dll)$/i, "")

const resolveEmbeddedArtifact = (artifactPath: string, artifact: BunGraphArtifact, phase: BunGraphRuntimePhase) => {
  if (Bun.embeddedFiles.length === 0) {
    return Effect.succeed(artifactPath)
  }

  return Effect.tryPromise<string, BunGraphRuntimeError>({
    try: async () => {
      const embeddedArtifact = Bun.file(artifactPath)
      const exportedArtifactPath = `./.${embeddedArtifact.name}`
      await Bun.write(exportedArtifactPath, embeddedArtifact)
      return exportedArtifactPath
    },
    catch: (cause) => new BunGraphRuntimeError({ artifact, phase, path: artifactPath, cause })
  })
}

export const makeBunGraphRuntime = (options: BunGraphRuntimeOptions) =>
  Effect.gen(function*() {
    const libSqlitePath = options.libSqlitePath
    const graphExtensionPath = options?.graphExtensionPath ?? getGraphExtPathSync()
    const dbPath = options?.dbPath ?? ":memory:"
    const initSymbol = options?.initSymbol ?? "sqlite3_graph_ext_init"

    const resolvedLibSqlitePath = yield* resolveEmbeddedArtifact(
      libSqlitePath,
      "libsqlite",
      "resolve-libsqlite-artifact"
    )

    yield* Effect.try({
      try: () => {
        Database.setCustomSQLite(resolvedLibSqlitePath)
      },
      catch: (cause) =>
        new BunGraphRuntimeError({
          artifact: "libsqlite",
          phase: "configure-custom-sqlite",
          path: resolvedLibSqlitePath,
          cause
        })
    })

    const db = yield* Effect.try({
      try: () => new Database(dbPath),
      catch: (cause) =>
        new BunGraphRuntimeError({ artifact: "libsqlite", phase: "open-database", path: resolvedLibSqlitePath, cause })
    })

    const resolvedGraphExtensionPath = yield* resolveEmbeddedArtifact(
      graphExtensionPath,
      "graph-extension",
      "resolve-graph-extension-artifact"
    )

    yield* Effect.try({
      try: () => {
        db.loadExtension(normalizeExtensionLoadPath(resolvedGraphExtensionPath), initSymbol)
      },
      catch: (cause) =>
        new BunGraphRuntimeError({
          artifact: "graph-extension",
          phase: "load-graph-extension",
          path: resolvedGraphExtensionPath,
          cause
        })
    })

    const graph = options?.onStatement
      ? createGraphExtClient(db, { onStatement: options.onStatement })
      : createGraphExtClient(db)
    const version = yield* graph.version.pipe(
      Effect.mapError(
        (cause) =>
          new BunGraphRuntimeError({
            artifact: "graph-extension",
            phase: "read-graph-extension-version",
            path: resolvedGraphExtensionPath,
            cause
          })
      )
    )

    return {
      db,
      graph,
      version,
      libSqlitePath: resolvedLibSqlitePath,
      graphExtensionPath: resolvedGraphExtensionPath
    }
  })

export const withBunGraphRuntime = <A, E>(
  use: (runtime: BunGraphRuntime) => Effect.Effect<A, E>,
  options: BunGraphRuntimeOptions
) =>
  Effect.acquireUseRelease(
    makeBunGraphRuntime(options),
    use,
    (runtime) =>
      Effect.sync(() => {
        runtime.db.close()
      })
  )
