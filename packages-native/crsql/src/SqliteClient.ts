/**
 * CR-SQLite compatible Sqlite client tag and type.
 *
 * This augments the base `@effect/sql` `SqlClient` with the SQLite-specific
 * ability to `loadExtension`, which CR-SQLite requires to activate its
 * functionality on a connection.
 *
 * Implementations are provided by platform drivers such as
 * `@effect/sql-sqlite-node` and `@effect/sql-sqlite-bun`, which already expose
 * a `loadExtension` method. This tag allows CR-SQLite helpers to depend on the
 * minimal capability needed across platforms.
 *
 * @since 0.0.0
 */
import * as SqlClient from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import { Effect, Layer } from "effect"
import * as Context from "effect/Context"
import * as Data from "effect/Data"

/**
 * Extends the generic `SqlClient` with SQLite's `loadExtension` capability.
 *
 * @since 0.0.0
 */
export interface SqliteClient extends SqlClient.SqlClient {
  /**
   * Loads a SQLite extension from a full filesystem path.
   *
   * Required to enable CR-SQLite (crsqlite) for the current connection.
   */
  readonly loadExtension: (path: string) => Effect.Effect<void, SqlError>
}

/**
 * Tag for a CR-SQLite compatible SQLite client.
 *
 * @since 0.0.0
 */
export const SqliteClient = Context.GenericTag<SqliteClient>(
  "@effect-native/crsql/SqliteClient"
)

export class SqliteClientError extends Data.TaggedError("SqliteClientError")<{
  cause: unknown
}> {}

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (client: SqliteClient) => Layer.scopedContext(Effect.succeed(Context.make(SqliteClient, client)))

export const Default = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  if (!("loadExtension" in sql && typeof sql.loadExtension === "function")) {
    return yield* new SqliteClientError({ cause: "SqlClient missing loadExtension method" })
  }
  return layer(sql as SqliteClient)
}).pipe(Layer.unwrapEffect)
