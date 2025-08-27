import * as S from "effect/Schema"

// Basic hex string (uppercase or lowercase) used for site_id and pk
export const HexString = S.String.pipe(S.pattern(/^([0-9a-fA-F]{2})+$/))

// SiteId is 16 bytes => 32 hex chars
export const SiteIdHex = S.String.pipe(S.pattern(/^[0-9a-fA-F]{32}$/))

// Column value type from SQLite typeof(): 'null' | 'text' | 'integer' | 'real' | 'blob'
export const SqlValueType = S.Literal("null", "text", "integer", "real", "blob")

// Pre-serialized crsql_changes row for transport
// - pk: hex string of BLOB pk
// - val: null | string (when blob, this is hex string; indicated by val_type)
// - col_version/db_version: string (CAST AS TEXT in SQL)
export const ChangeRowSerialized = S.Struct({
  table: S.String,
  pk: HexString,
  cid: S.String,
  val: S.Union(S.Null, S.String),
  val_type: SqlValueType,
  col_version: S.String,
  db_version: S.String,
  site_id: SiteIdHex,
  cl: S.Number,
  seq: S.Number
})

export type ChangeRowSerialized = S.Schema.Type<typeof ChangeRowSerialized>

// crsql_tracked_peers row (transport shape)
// - site_id: hex string (16 bytes)
// - version: string (CAST AS TEXT in SQL)
// - seq: number (integer)
export const TrackedPeerSerialized = S.Struct({
  site_id: SiteIdHex,
  version: S.String,
  seq: S.Number
})

export type TrackedPeerSerialized = S.Schema.Type<typeof TrackedPeerSerialized>

// Pre-serialized scalars
export const DbVersionString = S.String
export const SiteIdString = SiteIdHex
