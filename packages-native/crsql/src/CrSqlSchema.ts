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
import * as S from "effect/Schema"

/**
 * Basic hex string pattern (uppercase or lowercase) used for site_id and pk values.
 *
 * @since 1.0.0
 * @category Schema
 */
export const HexString = S.String.pipe(S.pattern(/^([0-9a-fA-F]{2})+$/))

/**
 * Site ID as a 32-character hex string (16 bytes).
 *
 * @since 1.0.0
 * @category Schema
 */
export const SiteIdHex = S.String.pipe(S.pattern(/^[0-9a-fA-F]{32}$/))

/**
 * @since 1.0.0
 * @category Models
 */
export type SiteIdHex = S.Schema.Type<typeof SiteIdHex>

/**
 * Version string schema for CR-SQLite version fields.
 *
 * Represents a bigint serialized as a base-10 string. There are two viable approaches
 * for version fields in this codebase:
 *
 * 1) Transport (string) only: keep versions as base-10 strings everywhere
 *    - Pro: avoids bigint parsing; matches SQL CAST(... AS TEXT) output
 *    - Con: consumers must parse to bigint for arithmetic/comparisons
 *
 * 2) Parsed (bigint) in code + string at IO: use S.BigInt transformations
 *    - Pro: safe arithmetic in code; precise type
 *    - Con: requires transform step at IO boundaries
 *
 * In "Serialized" schemas we use strings to faithfully represent boundary data.
 *
 * @since 1.0.0
 * @category Schema
 */
export const VersionString = S.String.pipe(
  S.pattern(/^[0-9]+$/),
  S.annotations({ identifier: "BigIntString", description: "bigint encoded as a base-10 string" })
)

/**
 * @since 1.0.0
 * @category Models
 */
export type VersionString = S.Schema.Type<typeof VersionString>

// Example for a parsed variant (not exported):
//
//   const Version = S.BigInt.pipe(S.nonNegativeBigInt())
//   type Version = S.Schema.Type<typeof Version> // bigint in code
//   type VersionEncoded = S.Schema.Encoded<typeof Version> // string at the boundary

/**
 * SQLite column value type from typeof() function.
 *
 * @since 1.0.0
 * @category Schema
 */
export const SqlValueType = S.Literal("null", "text", "integer", "real", "blob")

/**
 * Simple SQL identifier pattern.
 *
 * Must start with letter or underscore, followed by letters, digits, or underscores.
 *
 * @since 1.0.0
 * @category Schema
 */
export const Identifier = S.String.pipe(S.pattern(/^[A-Za-z_][A-Za-z0-9_]*$/))

/**
 * Pre-serialized crsql_changes row for transport (IO boundary shape).
 *
 * Represents a change row as returned by CR-SQLite with all fields serialized
 * for transport across boundaries:
 *
 * - `pk`: hex string of BLOB primary key
 * - `val`: null | string | number based on val_type:
 *   - if val_type === 'blob' then `val` is a hex string (SQL hex(val))
 *   - if val_type in ('integer', 'real') then `val` is a number
 *   - if val_type === 'text' then `val` is a string
 * - `col_version`/`db_version`: bigint encoded as base-10 string (CAST AS TEXT in SQL)
 * - `site_id`: hex string for site identity
 * - `cl`/`seq`: non-negative integers
 *
 * @since 1.0.0
 * @category Schema
 */
export const ChangeRowSerialized = S.Struct({
  table: Identifier.pipe(
    S.annotations({ description: "CRR table name (SQL identifier)" })
  ),
  pk: HexString.pipe(
    S.annotations({ description: "Primary key as hex-encoded BLOB" })
  ),
  cid: Identifier.pipe(
    S.annotations({ description: "Column id/name (SQL identifier)" })
  ),
  val: S.Union(S.Null, S.String, S.Number).pipe(
    S.annotations({
      description:
        "Value serialized from SQL: null | string | number. If val_type=blob, this is a hex string; if integer/real, a number; if text, a string"
    })
  ),
  val_type: SqlValueType.pipe(
    S.annotations({ description: "SQLite typeof(val): null | text | integer | real | blob" })
  ),
  col_version: VersionString.pipe(
    S.annotations({ description: "Column version (bigint) as base-10 string" })
  ),
  db_version: VersionString.pipe(
    S.annotations({ description: "Database version (bigint) as base-10 string" })
  ),
  site_id: SiteIdHex.pipe(
    S.annotations({ description: "Site id as 32‑char hex (16 bytes)" })
  ),
  cl: S.NonNegativeInt.pipe(
    S.annotations({
      description: "Causal length: the causal depth at the origin when this change was produced.\n" +
        "Represents how many prior changes were causally visible; useful for debugging\n" +
        "and advanced conflict policies. Most clients do not need to act on this field."
    })
  ),
  seq: S.NonNegativeInt.pipe(
    S.annotations({
      description: "Sequence number: within-version ordering for rows that share the same db_version.\n" +
        "Together, (db_version, seq) provides a deterministic total order for pull/apply."
    })
  )
}).pipe(
  S.annotations({
    identifier: "ChangeRowSerialized",
    description: "CR-SQLite change row as serialized by SQL (hex strings, bigint values as strings)"
  })
)

/**
 * @since 1.0.0
 * @category Models
 */
export type ChangeRowSerialized = S.Schema.Type<typeof ChangeRowSerialized>

/**
 * Pre-serialized crsql_tracked_peers row for transport (per-peer cursor).
 *
 * Represents a tracked peer as returned by CR-SQLite with serialized fields:
 * - `site_id`: hex string (16 bytes)
 * - `version`: bigint encoded as base-10 string (CAST AS TEXT in SQL)
 * - `seq`: non-negative integer
 *
 * @since 1.0.0
 * @category Schema
 */
export const TrackedPeerSerialized = S.Struct({
  site_id: SiteIdHex,
  version: VersionString,
  seq: S.NonNegativeInt
})

/**
 * @since 1.0.0
 * @category Models
 */
export type TrackedPeerSerialized = S.Schema.Type<typeof TrackedPeerSerialized>
