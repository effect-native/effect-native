/**
 * CR-SQLite service for conflict-free replicated database operations.
 *
 * This module provides a high-level service interface for working with CR-SQLite
 * databases, including operations for:
 * - Getting site identifiers and database versions
 * - Pulling and applying change sets for synchronization
 * - Managing peer tracking for distributed replication
 *
 * All operations are Effect-based for composable error handling and dependency injection.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import * as CrSql from "@effect-native/crsql"
 * import { Config, Effect, Layer } from "effect"
 * import { SqliteClient } from "@effect/sql-sqlite-node"
 *
 * const program = Effect.gen(function* () {
 *   const siteId = yield* CrSql.CrSql.getSiteIdHex
 *   const version = yield* CrSql.CrSql.getDbVersion
 *   const changes = yield* CrSql.CrSql.pullChanges("0")
 *
 *   console.log(`Site: ${siteId}, Version: ${version}, Changes: ${changes.length}`)
 * })
 *
 * const SqlLive = SqliteClient.layer({
 *   filename: "database.db",
 *   transformQueryNames: Config.literal("camelCase")
 * })
 *
 * Effect.runPromise(program.pipe(Effect.provide(SqlLive)))
 * ```
 */
export * as CrSql from "./CrSql.js"

/**
 * Error types for CR-SQLite operations.
 *
 * This module defines tagged errors used throughout the CR-SQLite package
 * for handling various failure scenarios in a type-safe manner.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import * as Errors from "@effect-native/crsql/errors"
 * import { Effect } from "effect"
 *
 * // Handle specific error types
 * const program = Effect.gen(function* () {
 *   // ... some CR-SQLite operation that might fail
 *   return "success"
 * }).pipe(
 *   Effect.catchTag("CrSqliteExtensionMissing", (error) =>
 *     Effect.succeed("handled error")
 *   )
 * )
 * ```
 */
export * as errors from "./errors.js"

/**
 * Schema definitions for CR-SQLite change tracking and serialization.
 *
 * This module provides Effect Schema definitions for CR-SQLite data structures,
 * including change rows, tracked peers, and various identifier types used
 * throughout the CR-SQLite system.
 *
 * @since 1.0.0
 * @example
 * ```typescript
 * import * as Schema from "@effect-native/crsql/schema"
 * import { Schema as S } from "effect"
 *
 * // Validate a change row from CR-SQLite
 * const changeRow = {
 *   table: "users",
 *   pk: "1A2B3C4D",
 *   cid: "name",
 *   val: "Alice",
 *   val_type: "text",
 *   col_version: "1",
 *   db_version: "1",
 *   site_id: "A1B2C3D4E5F6789012345678ABCDEF90",
 *   cl: 0,
 *   seq: 0
 * }
 *
 * const decoded = S.decodeUnknownSync(Schema.ChangeRowSerialized)(changeRow)
 * ```
 */
export * as schema from "./schema.js"
