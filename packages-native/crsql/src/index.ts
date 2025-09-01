/**
 * @since 0.0.0
 * @category Errors
 */
export * as errors from "./errors.js"

export * as schema from "./schema.js"

/**
 * Returns this database's CR‑SQLite site identifier as a 16‑byte hex string.
 *
 * Conceptually, the site ID is a stable replica identity persisted in the
 * database file by CR‑SQLite. It is used to:
 * - Disambiguate the origin of changes during synchronization
 * - Exclude local changes when pulling from remote peers
 *
 * Read via `hex(crsql_site_id())` to match the transport shape.
 *
 * @example
 * import * as CrSql from "@effect-native/crsql"
 * import { Effect } from "effect"
 *
 * const siteId = Effect.gen(function* () {
 *   return yield* CrSql.getSiteIdHex
 * })
 *
 * @since 0.0.0
 */
export * as CrSql from "./service.js"
