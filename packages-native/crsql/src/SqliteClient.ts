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
import type * as SqlClient from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import type { Effect } from "effect"
import * as Context from "effect/Context"

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
