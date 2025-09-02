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
 * **Security Note**: This module uses Effect SQL's tagged template literals,
 * which automatically handle parameterization and SQL injection protection.
 * The `${variable}` syntax is safe - Effect SQL converts these to proper
 * parameterized queries under the hood.
 *
 * @since 1.0.0
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
 * import * as CrSqlErrors from "@effect-native/crsql/CrSqlErrors"
 * import { Effect } from "effect"
 *
 * // Handle specific error types
 * const program = Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing()).pipe(
 *   Effect.catchTag("CrSqliteExtensionMissing", (error) =>
 *     Effect.succeed("handled error")
 *   )
 * )
 * ```
 */
export * as CrSqlErrors from "./CrSqlErrors.js"

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
 * import * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
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
 * const decoded = S.decodeUnknownSync(CrSqlSchema.ChangeRowSerialized)(changeRow)
 * ```
 */
export * as CrSqlSchema from "./CrSqlSchema.js"
