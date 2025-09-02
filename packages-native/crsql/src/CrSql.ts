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
 *   filename: "database.db"
 * })
 * ```
 */
import * as SqlClient from "@effect/sql/SqlClient"
import * as Effect from "effect/Effect"
import * as CrSqlErrors from "./CrSqlErrors.js"
import type * as CrSqlSchema from "./schema.js"

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
 * ```typescript
 * import * as CrSql from "@effect-native/crsql"
 * import { Effect } from "effect"
 *
 * const siteId = Effect.gen(function* () {
 *   return yield* CrSql.CrSql.getSiteIdHex
 * })
 * ```
 *
 * @since 1.0.0
 * @category Operations
 */
export const getSiteIdHex = Effect.fn("@effect-native/crsql/getSiteIdHex")(function*() {
  const sql = yield* SqlClient.SqlClient
  yield* sql`SELECT hex(crsql_site_id()) as site_id`.pipe(
    Effect.catchAll((cause) => Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause })))
  )
  const rows = yield* sql<{ site_id: CrSqlSchema.SiteIdHex }>`SELECT hex(crsql_site_id()) AS site_id`

  // CR-SQLite always returns exactly one row with site_id, but adding defensive check
  if (rows.length === 0) {
    return yield* Effect.fail(
      new CrSqlErrors.CrSqliteExtensionMissing({
        cause: new Error("crsql_site_id() returned no rows")
      })
    )
  }

  return rows[0].site_id
})()

/**
 * Returns the current CR‑SQLite database version as a base‑10 string.
 *
 * The database version is a monotonically increasing logical clock updated
 * by CR‑SQLite whenever changes are applied. It is commonly used as a
 * cursor when exporting changes (e.g. {@link pullChanges}). Casting
 * to TEXT avoids 64‑bit precision issues in JavaScript.
 *
 * @example
 * ```typescript
 * import * as CrSql from "@effect-native/crsql"
 * import { Effect } from "effect"
 *
 * const version = Effect.gen(function* () {
 *   return yield* CrSql.CrSql.getDbVersion
 * })
 * ```
 *
 * @since 1.0.0
 * @category Operations
 */
export const getDbVersion = Effect.fn("@effect-native/crsql/getDbVersion")(function*() {
  const sql = yield* SqlClient.SqlClient
  const rows = yield* sql<
    { version: CrSqlSchema.VersionString }
  >`SELECT CAST(crsql_db_version() AS TEXT) AS version`

  // CR-SQLite always returns exactly one row with version, but adding defensive check
  if (rows.length === 0) {
    return yield* Effect.fail(
      new CrSqlErrors.CrSqliteExtensionMissing({
        cause: new Error("crsql_db_version() returned no rows")
      })
    )
  }

  return rows[0].version
})()

/**
 * Pulls CR‑SQLite change rows newer than a given version, optionally
 * excluding changes produced by specific sites.
 *
 * The result is in the pre‑serialized, wire‑ready shape:
 * - `pk` and `site_id` are hex strings (`hex(...)`)
 * - `val` is null, a hex string (when `val_type = 'blob'`), a string, or a
 *   number depending on SQLite's dynamic type
 * - `col_version` and `db_version` are bigint values encoded as base‑10 strings
 * - Results are ordered by `(db_version, seq)` for a deterministic total order
 *
 * @param since - lower bound (exclusive) for `db_version` (default "0")
 *                Safe from SQL injection via Effect SQL's automatic parameterization
 * @param excludeSites - optional list of site IDs (hex) to exclude
 *
 * @example
 * ```typescript
 * import * as CrSql from "@effect-native/crsql"
 * import { Effect } from "effect"
 *
 * const changes = Effect.gen(function* () {
 *   const since = yield* CrSql.CrSql.getDbVersion
 *   return yield* CrSql.CrSql.pullChanges(since, ["A1B2C3D4E5F6789012345678ABCDEF90"])
 * })
 * ```
 *
 * @since 1.0.0
 * @category Operations
 */
export const pullChanges = Effect.fn("@effect-native/crsql/pullChanges")(function*(
  since: CrSqlSchema.VersionString = "0",
  excludeSites?: ReadonlyArray<CrSqlSchema.SiteIdHex>
) {
  const sql = yield* SqlClient.SqlClient
  if (excludeSites?.length) {
    return yield* sql<CrSqlSchema.ChangeRowSerialized>`
      SELECT
        "table",
        hex(pk) as pk,
        cid,
        CASE
          WHEN val IS NULL THEN NULL
          WHEN typeof(val) = 'blob' THEN hex(val)
          ELSE val
        END as val,
        typeof(val) as val_type,
        CAST(col_version AS TEXT) as col_version,
        CAST(db_version AS TEXT) as db_version,
        hex(site_id) as site_id,
        cl,
        seq
      FROM crsql_changes
      WHERE db_version > CAST(${since} AS INTEGER)
        AND hex(site_id) NOT IN (${sql.in(excludeSites)})
      ORDER BY db_version, seq
    `
  }
  return yield* sql<CrSqlSchema.ChangeRowSerialized>`
    SELECT
      "table",
      hex(pk) as pk,
      cid,
      CASE
        WHEN val IS NULL THEN NULL
        WHEN typeof(val) = 'blob' THEN hex(val)
        ELSE val
      END as val,
      typeof(val) as val_type,
      CAST(col_version AS TEXT) as col_version,
      CAST(db_version AS TEXT) as db_version,
      hex(site_id) as site_id,
      cl,
      seq
    FROM crsql_changes
    WHERE db_version > CAST(${since} AS INTEGER)
    ORDER BY db_version, seq
  `
})

/**
 * Applies a batch of CR‑SQLite change rows in a single transaction.
 *
 * Inverse of {@link pullChanges}. Expects the serialized transport
 * shape and performs decoding in SQL:
 * - `unhex(?)` converts hex strings to BLOBs for `pk`, `site_id`, and
 *   `val` when the value type is `blob`
 * - `CAST(... AS INTEGER)` converts bigint strings into 64‑bit integers
 *
 * Notes:
 * - Wrapped in `SqlClient.withTransaction` for atomicity.
 * - Idempotency and conflict semantics are provided by CR‑SQLite.
 *
 * @param changes - array of pre‑serialized change rows to apply
 *
 * @example
 * ```typescript
 * import * as CrSql from "@effect-native/crsql"
 * import { Effect } from "effect"
 *
 * const apply = (rows: ReadonlyArray<CrSql.schema.ChangeRowSerialized>) =>
 *   CrSql.CrSql.applyChanges(rows)
 * ```
 *
 * @since 1.0.0
 * @category Operations
 */
export const applyChanges = Effect.fn("@effect-native/crsql/applyChanges")(function*(
  changes: ReadonlyArray<CrSqlSchema.ChangeRowSerialized>
) {
  const sql = yield* SqlClient.SqlClient
  // Ensure unhex() exists and returns something meaningful
  yield* sql`SELECT hex(unhex('00')) as ok`.pipe(
    Effect.catchAll((cause) => Effect.fail(new CrSqlErrors.UnhexUnavailable({ cause })))
  )
  yield* sql.withTransaction(
    Effect.forEach(
      changes,
      (change) =>
        sql`
          INSERT INTO crsql_changes ("table", pk, cid, val, col_version, db_version, site_id, cl, seq)
          VALUES (
            ${change.table},
            unhex(${change.pk}),
            ${change.cid},
            CASE
              WHEN ${change.val_type} = 'null' THEN NULL
              WHEN ${change.val_type} = 'blob' THEN unhex(${change.val})
              ELSE ${change.val}
            END,
            CAST(${change.col_version} AS INTEGER),
            CAST(${change.db_version} AS INTEGER),
            unhex(${change.site_id}),
            ${change.cl},
            ${change.seq}
          )
        `,
      { concurrency: "unbounded", discard: true }
    )
  )
})

/**
 * Sets or updates the tracked version for a peer site in `crsql_tracked_peers`.
 *
 * Useful for maintaining per‑peer cursors in a pull/apply protocol. Values
 * are stored in the database types and projected back as strings when read
 * (see {@link getPeerVersion}).
 *
 * @param siteId - peer site identifier (hex, 16 bytes)
 * @param version - peer database version (base‑10 string)
 * @param seq - peer sequence number associated with the version
 *
 * @example
 * ```typescript
 * import * as CrSql from "@effect-native/crsql"
 * import { Effect } from "effect"
 *
 * const updatePeer = Effect.gen(function* () {
 *   yield* CrSql.CrSql.setPeerVersion("A1B2C3D4E5F6789012345678ABCDEF90", "42", 0)
 * })
 * ```
 *
 * @since 1.0.0
 * @category Operations
 */
export const setPeerVersion = Effect.fn("@effect-native/crsql/setPeerVersion")(function*(
  siteId: CrSqlSchema.SiteIdHex,
  version: CrSqlSchema.VersionString,
  seq: number
) {
  const sql = yield* SqlClient.SqlClient
  yield* sql`
    INSERT OR REPLACE INTO crsql_tracked_peers (site_id, version, tag, event, seq)
    VALUES (unhex(${siteId}), CAST(${version} AS INTEGER), 0, 0, ${seq})
  `
})

/**
 * Reads the tracked version for a peer site from `crsql_tracked_peers`.
 *
 * Returns `null` when no row exists. The version is returned as a base‑10
 * string to avoid bigint precision issues; `seq` is a non‑negative integer.
 *
 * @param siteId - peer site identifier (hex, 16 bytes)
 * @returns `{ version: string, seq: number } | null`
 *
 * @example
 * ```typescript
 * import * as CrSql from "@effect-native/crsql"
 * import { Effect } from "effect"
 *
 * const checkPeer = Effect.gen(function* () {
 *   const peerInfo = yield* CrSql.CrSql.getPeerVersion("A1B2C3D4E5F6789012345678ABCDEF90")
 *   if (peerInfo) {
 *     console.log(`Peer version: ${peerInfo.version}, seq: ${peerInfo.seq}`)
 *   }
 * })
 * ```
 *
 * @since 1.0.0
 * @category Operations
 */
export const getPeerVersion = Effect.fn("@effect-native/crsql/getPeerVersion")(function*(
  siteId: CrSqlSchema.SiteIdHex
) {
  const sql = yield* SqlClient.SqlClient
  const rows = yield* sql<{
    version: CrSqlSchema.VersionString
    seq: number
  }>`SELECT CAST(version AS TEXT) as version, seq FROM crsql_tracked_peers WHERE site_id = unhex(${siteId})`

  // Return single object if found, null if not found (consistent with integration tests)
  return rows.length > 0 ? rows[0] : null
})
