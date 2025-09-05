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
// NOTE: avoid static import of libcrsql here to keep docgen example compilation
// simple (some TS runners disallow `import.meta` in dependency graphs). We
// dynamically import the path at runtime instead.
import * as SqlClient from "@effect/sql/SqlClient"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import * as CrSqlErrors from "./CrSqlErrors.js"
import * as Statement from "@effect/sql/Statement"
import * as CrSqliteExtension from "./CrSqliteExtension.js"
import * as CrSqlSchema from "./CrSqlSchema.js"
import type * as SqliteClient from "./SqliteClient.js"
import * as SqlError from "@effect/sql/SqlError"

// TODO(effect-native): Reactivity integration
// - Define and export key helpers (dbVersion, changes, table, row, peer)
// - Add reactive accessors (reactiveDbVersion, reactivePeerVersion, reactivePullChanges)
// - Wrap mutations with Reactivity.mutation and invalidate precise keys
// See packages-native/crsql/TODO.md (Key Scheme, Key Helper Builders, Reactive Accessors, Mutation Wiring)

const makeCrSql = Effect.gen(function*() {
  const sql = yield* SqlClient.SqlClient
  const { sha } = yield* CrSqliteExtension.ExtInfoLoaded
  if (!sha) return yield* new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql extension SHA missing" })

  yield* Effect.addFinalizer(() => crsql.finalize.pipe(Effect.ignoreLogged))

  const getSiteIdHex = sql<{ site_id: CrSqlSchema.SiteIdHex }>`SELECT hex(crsql_site_id()) AS site_id`.pipe(
    Effect.flatMap((rows) =>
      rows.length > 0
        ? Effect.succeed(rows[0].site_id)
        : Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql_site_id() returned no rows" }))
    ),
    Effect.withSpan("CrSql.getSiteIdHex")
  )

  const getDbVersion = sql<{ version: CrSqlSchema.VersionString }>`SELECT CAST(crsql_db_version() AS TEXT) AS version`
    .pipe(
      Effect.flatMap((rows) =>
        rows.length > 0
          ? Effect.succeed(rows[0].version)
          : Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql_db_version() returned no rows" }))
      ),
      Effect.withSpan("CrSql.getDbVersion")
    )

  const getNextDbVersion = sql<{ v: CrSqlSchema.VersionString }>`SELECT CAST(crsql_next_db_version() AS TEXT) AS v`
    .pipe(
      Effect.flatMap((rows) =>
        rows.length > 0
          ? Effect.succeed(rows[0].v)
          : Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql_next_db_version() returned no rows" }))
      ),
      Effect.withSpan("CrSql.getNextDbVersion")
    )

  const getRowsImpacted = sql<{ n: number }>`SELECT crsql_rows_impacted() AS n`.pipe(
    Effect.flatMap((rows) =>
      rows.length > 0
        ? Effect.succeed(rows[0].n)
        : Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause: "crsql_rows_impacted() returned no rows" }))
    ),
    Effect.withSpan("CrSql.getRowsImpacted")
  )

  const pullChanges = Effect.fn("@effect-native/crsql/CrSql#pullChanges")(function* pullChanges(
    since: CrSqlSchema.VersionString = "0",
    excludeSites?: ReadonlyArray<CrSqlSchema.SiteIdHex>
  ) {
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

  // TODO(effect-native): Add reactive Stream accessors
  // - reactiveDbVersion: Reactivity.stream(["crsql:dbVersion"], getDbVersion)
  // - reactivePeerVersion(siteId): Reactivity.stream({ "crsql:peer": [siteId] }, getPeerVersion(siteId))
  // - reactivePullChanges(since, excludes): Reactivity.stream(["crsql:changes"], pullChanges(since, excludes))
  // See packages-native/crsql/TODO.md#reactive-accessors

  const finalize = Effect.fn("@effect-native/crsql/CrSql#finalize")(function* finalize() {
    yield* sql`SELECT crsql_finalize();`.pipe(
      Effect.catchAll((cause) => Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause })))
    )
  })()

  const asCrr = Effect.fn("@effect-native/crsql/CrSql#asCrr")(function* asCrr(tableName: string) {
    // Idempotent: crsql_as_crr ignores if already a CRR
    yield* sql`SELECT crsql_as_crr(${tableName})`
  })

  const asTable = Effect.fn("@effect-native/crsql/CrSql#asTable")(function* asTable(tableName: string) {
    yield* sql`SELECT crsql_as_table(${tableName})`
  })

  const beginAlter = Effect.fn("@effect-native/crsql/CrSql#beginAlter")(function* beginAlter(tableName: string) {
    yield* sql`SELECT crsql_begin_alter(${tableName})`
  })

  const commitAlter = Effect.fn("@effect-native/crsql/CrSql#commitAlter")(function* commitAlter(tableName: string) {
    yield* sql`SELECT crsql_commit_alter(${tableName})`
  })

  const getSha = sql<{ sha: string }>`SELECT crsql_sha() as sha`.pipe(
    Effect.map((rows) => rows[0].sha),
    Effect.withSpan("CrSql.getSha")
  )

  /**
   * Apply schema changes using CR-SQLite's automigration engine.
   *
   * This is exposed as a flexible tagged template or a plain-string function:
   *
   * - Template: `yield* crsql.automigrate`...schema...``
   * - String:   `yield* crsql.automigrate(schema)`
   *
   * The provided SQL should describe the desired schema using normal SQLite DDL
   * (e.g. `CREATE TABLE IF NOT EXISTS ...`, index definitions) plus any
   * CR-SQLite setup statements you want re-applied after structural changes
   * (e.g. `SELECT crsql_as_crr('table')`, `SELECT crsql_fract_as_ordered(...)`).
   *
   * Under the hood, crsql_automigrate performs the following (per upstream):
   * - Creates a temporary in-memory database and executes your schema after
   *   stripping CRR-specific statements (e.g., `crsql_as_crr`, `crsql_fract_as_ordered`).
   * - Diffs the temp DB against the current database and applies structural
   *   changes inside a savepoint:
   *   - Drops tables that no longer exist in the new schema
   *   - Adds or drops columns as needed (NOTE: adding primary key columns is
   *     not supported and will fail)
   *   - Updates non-PK indices to match the new schema (drops/recreates when needed)
   *   - For CRR tables, wraps structural changes in `crsql_begin_alter` /
   *     `crsql_commit_alter` to safely manage triggers
   * - Finally, executes your original schema string on the local DB so CRR
   *   statements and other declarative conveniences are (re)applied.
   *
   * Guidance and limitations:
   * - Use `CREATE TABLE IF NOT EXISTS` (and similar idempotent DDL) in your
   *   schema so it can be applied repeatedly.
   * - Do not attempt to change primary key definitions using automigrate; use
   *   a manual migration for PK changes.
   * - Keep your own schema version/name in a metadata table (e.g.,
   *   `crsql_master`) and decide when to call `automigrate` vs. a first-time
   *   `exec` of the schema (the upstream js driver does this pattern).
   * - Some SQLite drivers cache table info aggressively; after automigrating,
   *   you may prefer to use a fresh connection or call `crsql.finalize` before
   *   continuing to avoid stale statement state. Our tests demonstrate both
   *   approaches.
   *
   * Errors:
   * - Fails fast with a SqlError when schema is invalid or a disallowed change
   *   (e.g., adding a PK column) is detected. No errors are swallowed.
   *
   * Examples
   * ```ts
   * // Initial apply
   * yield* crsql.automigrate`
   *   CREATE TABLE IF NOT EXISTS items (
   *     id BLOB PRIMARY KEY,
   *     name TEXT NOT NULL DEFAULT ''
   *   );
   *   SELECT crsql_as_crr('items');
   * `
   *
   * // Later migration: add a column
   * yield* crsql.automigrate`
   *   CREATE TABLE IF NOT EXISTS items (
   *     id BLOB PRIMARY KEY,
   *     name TEXT NOT NULL DEFAULT '',
   *     note TEXT NOT NULL DEFAULT ''
   *   );
   *   SELECT crsql_as_crr('items');
   * `
   * ```
   */
  type AutomigrateTag = {
    (strings: TemplateStringsArray, ...values: ReadonlyArray<unknown>): Effect.Effect<void>
    (schema: string): Effect.Effect<void>
  }

  const automigrate: AutomigrateTag = ((first: unknown, ...values: ReadonlyArray<unknown>) => {
    const buildSchema = (strings: TemplateStringsArray, values: ReadonlyArray<unknown>) => {
      let out = ""
      for (let i = 0; i < strings.length; i++) {
        out += strings[i]
        if (i < values.length) out += String(values[i])
      }
      return out
    }
    const schema = Array.isArray(first) && Object.prototype.hasOwnProperty.call(first, "raw")
      ? buildSchema(first as TemplateStringsArray, values)
      : String(first)
    // Delegate to crsql_automigrate. Fail fast on any error.
    return Effect.gen(function*() {
      yield* sql`SELECT crsql_automigrate(${schema})`
    }).pipe(Effect.withSpan("CrSql.automigrate"))
  }) as AutomigrateTag

  /**
   * Enable Fractional Indexing for ordered lists on a table.
   *
   * crsql_fract_as_ordered configures a table so that an order column is
   * maintained via an “infinite precision” fractional index. This allows:
   * - Appending/prepending via special sentinel values (1 = append, -1 = prepend)
   * - Generating keys between two neighbors without reindexing
   * - Conflict resolution for concurrent/offline inserts that target the same
   *   position; the index is guaranteed to converge
   *
   * References:
   * - Overview video: https://www.youtube.com/watch?v=BghFgK6VJIE
   * - Extension source: https://github.com/vlcn-io/cr-sqlite/tree/main/core/rs/fractindex-core/src
   * - Implementation uses a view named "{table}_fractindex" for ordered ops
   *
   * Notes:
   * - Minimal signature is provided here (table + order column). The upstream
   *   function also accepts additional columns that define the list scope (e.g.,
   *   list_id). A variadic helper that passes additional grouping columns can be
   *   added in a follow-up with a safe parameterization strategy.
   */
  const fractAsOrdered = Effect.fn("@effect-native/crsql/CrSql#fractAsOrdered")(function* fractAsOrdered(
    tableName: string,
    orderColumn: string
  ) {
    yield* sql`SELECT crsql_fract_as_ordered(${tableName}, ${orderColumn})`
  })

  /**
   * Variant of {@link fractAsOrdered} that accepts additional grouping columns
   * which define list partitions (e.g., list_id). All arguments are passed as
   * text parameters to `crsql_fract_as_ordered(table, order, ...groups)`.
   *
   * Example:
   * ```ts
   * yield* crsql.fractAsOrderedWith("items", "ord", ["list_id"]) // per-list ordering
   * ```
   */
  const fractAsOrderedWith = Effect.fn("@effect-native/crsql/CrSql#fractAsOrderedWith")(function* fractAsOrderedWith(
    tableName: string,
    orderColumn: string,
    groupColumns: ReadonlyArray<string>
  ) {
    const args = [tableName, orderColumn, ...groupColumns]
    const placeholders = Array.from({ length: args.length }, () => "?").join(", ")
    // Use a parameterized fragment to safely pass variadic arguments
    yield* sql`${Statement.unsafeFragment(`SELECT crsql_fract_as_ordered(${placeholders})`, args)}`
  })

  /**
   * Generate a fractional key between two existing order keys.
   *
   * Returns a stable string key that sorts between the two inputs when used in
   * the configured order column. Use this when inserting “between” neighbors or
   * during reordering operations.
   */
  const fractKeyBetween = Effect.fn("@effect-native/crsql/CrSql#fractKeyBetween")((key1: string, key2: string) =>
    sql<{ key: string }>`SELECT crsql_fract_key_between(${key1}, ${key2}) AS key`.pipe(
      Effect.map((rows) => rows[0].key),
      Effect.withSpan("CrSql.fractKeyBetween")
    )
  )

  // Product decision: rely on SQLite's unhex() (available in sqlite >= 3.50.2).
  // If unhex() is missing or disabled in the host, we fail fast with
  // UnhexUnavailable rather than adding feature-detection fallbacks.
  // NOTE: verifying unhex() presence as early as possible in layer creation
  // so that it'll be easier to know when there's a configuration issue
  yield* sql`SELECT hex(unhex('00')) as ok`.pipe(
    Effect.catchAll((cause) => Effect.fail(new CrSqlErrors.UnhexUnavailable({ cause })))
  )
  const applyChanges = Effect.fn("@effect-native/crsql/CrSql#applyChanges")(function* applyChanges(
    changes: ReadonlyArray<CrSqlSchema.ChangeRowSerialized>
  ) {
    // TODO(effect-native): Wrap with Reactivity.mutation and invalidate keys
    // - Invalidate ["crsql:dbVersion", "crsql:changes"] after successful apply
    // - Aggregate row-level invalidations by table: { ["crsql:row:" + table]: [pkHex...] }
    //   where pkHex is the hex string from change.pk
    // Implementation should keep Effect.withTransaction intact and only augment with Reactivity
    // See packages-native/crsql/TODO.md#mutation-wiring
    const APPLY_CONCURRENCY = 64 as const
    yield* sql.withTransaction(
      Effect.forEach(
        changes,
        (change) =>
          // Product decision: use unhex() to decode transport hex into BLOBs
          // (pk, site_id, and val when val_type='blob'), instead of pushing this
          // responsibility into application code. Tests assume unhex() presence.
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
        { concurrency: APPLY_CONCURRENCY, discard: true }
      )
    )
  })

  /**
   * Derive a SQLite schema (DDL) string from a set of CR‑SQLite change rows.
   *
   * The generated schema aims to be a safe minimum required to enable CRR on
   * the referenced tables and accept the provided changes:
   * - For each table present in the change set, emits a `CREATE TABLE IF NOT EXISTS` with
   *   a single `id BLOB PRIMARY KEY` column (assumes single‑column BLOB PKs, which
   *   is consistent with this project's usage and tests)
   * - Adds one column per observed `cid` (excluding `id`) with a type inferred from
   *   `val_type` across changes for that column. Supported mappings:
   *     - text -> TEXT
   *     - integer -> INTEGER
   *     - real -> REAL
   *     - blob -> BLOB
   *   If a column is only ever observed with `val_type = 'null'`, inference fails fast.
   *   If conflicting types are observed for the same column, inference fails fast.
   * - Appends `SELECT crsql_as_crr('<table>');` for each table
   *
   * Notes and limitations:
   * - This does not attempt to infer composite primary keys or constraints beyond types.
   *   It is intentionally conservative to keep failures visible and deterministic.
   * - Intended to be used with {@link automigrate}: `yield* crsql.automigrate(schema)`
   *
   * @param changes - exported change rows to analyze
   * @returns schema DDL suitable for crsql_automigrate
   */
  const schemaFromChanges = Effect.fn("@effect-native/crsql/CrSql#schemaFromChanges")(function* schemaFromChanges(
    changes: ReadonlyArray<CrSqlSchema.ChangeRowSerialized>
  ) {
    type SqlType = "TEXT" | "INTEGER" | "REAL" | "BLOB"
    const mapType = (t: CrSqlSchema.SqlValueType): SqlType | null => {
      if (t === "null") return null
      const mapping: { readonly [K in Exclude<CrSqlSchema.SqlValueType, "null">]: SqlType } = {
        text: "TEXT",
        integer: "INTEGER",
        real: "REAL",
        blob: "BLOB"
      }
      return mapping[t]
    }

    // Collect per-table column type info from observed changes
    const byTable = new Map<string, Map<string, SqlType>>()
    for (const c of changes) {
      let cols = byTable.get(c.table)
      if (!cols) {
        cols = new Map()
        byTable.set(c.table, cols)
      }
      if (c.cid === "id") continue // we'll always declare `id` explicitly as PK first
      const observed = mapType(c.val_type)
      if (observed === null) {
        // Skip null here; we will validate after aggregation to ensure at least one non-null sample per column
        continue
      }
      const prev = cols.get(c.cid)
      if (prev && prev !== observed) {
        // Conflicting type inference for the same column => fail fast
        return yield* Effect.fail(
          new SqlError.SqlError({
            message: `Conflicting types for ${c.table}.${c.cid}: ${prev} vs ${observed}`,
            cause: undefined
          })
        )
      }
      cols.set(c.cid, observed)
    }

    // Validate columns that only had null observations (no concrete type seen)
    for (const [table, cols] of byTable) {
      for (const [cid, typ] of cols) {
        if (!typ) {
          return yield* Effect.fail(
            new SqlError.SqlError({
              message: `Unable to infer type for ${table}.${cid} (only null values observed)`,
              cause: undefined
            })
          )
        }
      }
    }

    // Build DDL
    const chunks: Array<string> = []
    const tables = Array.from(byTable.keys()).sort()
    for (const table of tables) {
      const cols = byTable.get(table)!
      // Deterministic order: id first, then other columns sorted by name
      const parts: Array<string> = ["id BLOB PRIMARY KEY"]
      const others = Array.from(cols.entries())
        .filter(([name]) => name !== "id")
        .sort((a, b) => a[0].localeCompare(b[0]))
      for (const [name, typ] of others) {
        parts.push(`${name} ${typ}`)
      }
      const create = `CREATE TABLE IF NOT EXISTS ${table} (\n  ${parts.join(",\n  ")}\n);`
      const asCrrStmt = `SELECT crsql_as_crr('${table}');`
      chunks.push(create, asCrrStmt)
    }

    return chunks.join("\n")
  })

  const setPeerVersion = Effect.fn("@effect-native/crsql/CrSql#setPeerVersion")(function* setPeerVersion(
    props: {
      siteId: CrSqlSchema.SiteIdHex
      version: CrSqlSchema.VersionString
      seq: number
    }
  ) {
    // TODO(effect-native): Wrap with Reactivity.mutation to invalidate peer watchers
    // - Invalidate { "crsql:peer": [siteId] }
    // See packages-native/crsql/TODO.md#mutation-wiring
    // Product decision: compare/store peer site ids as BLOBs via unhex().
    yield* sql`
      INSERT OR REPLACE INTO crsql_tracked_peers (site_id, version, tag, event, seq)
      VALUES (unhex(${props.siteId}), CAST(${props.version} AS INTEGER), 0, 0, ${props.seq})
    `
  })

  // Product decision: rely on unhex() to compare stored BLOB site_id with
  // transport hex. Environments without unhex() should fail fast.
  const getPeerVersion = Effect.fn("@effect-native/crsql/CrSql#getPeerVersion")(function* getPeerVersion(
    siteId: CrSqlSchema.SiteIdHex
  ) {
    const [peerVersion] = yield* sql<{ version: CrSqlSchema.VersionString; seq: number }>`
      SELECT CAST(version AS TEXT) as version, seq
      FROM crsql_tracked_peers
      WHERE site_id = unhex(${siteId})
    `
    return peerVersion ?? null
  })

  const listTrackedPeers = sql<CrSqlSchema.TrackedPeerSerialized>`
    SELECT hex(site_id) AS site_id, CAST(version AS TEXT) AS version, seq
    FROM crsql_tracked_peers
  `.pipe(Effect.withSpan("CrSql.listTrackedPeers"))

  const trackedPeersMap = listTrackedPeers.pipe(
    Effect.map((rows) =>
      Object.fromEntries(
        rows.map((r) => [r.site_id, { version: r.version, seq: r.seq }])
      ) as Record<CrSqlSchema.SiteIdHex, { version: CrSqlSchema.VersionString; seq: number }>
    ),
    Effect.withSpan("CrSql.trackedPeersMap")
  )

  const crsql = {
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
    getSiteIdHex,
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
    getDbVersion,
    getNextDbVersion,
    getRowsImpacted,
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
    pullChanges,
    /**
     * Tears down CR‑SQLite per‑connection resources by calling `crsql_finalize()`.
     *
     * Why can't crsqlite auto-destruct itself? See this SQLite forum context:
     * https://sqlite.org/forum/forumpost/c94f943821
     *
     * CR‑SQLite registers persistent prepared statements and caches when the
     * extension loads. In some host environments, relying on the extension unload
     * hook to clean these up is unreliable. The upstream project recommends
     * explicitly running `SELECT crsql_finalize();` before closing the SQLite
     * connection to finalize statements and clear caches.
     *
     * References:
     * - CR‑SQLite README example: selects `crsql_finalize()` before closing
     * - SQLite forum context on extension destructors: https://sqlite.org/forum/forumpost/c94f943821
     * - Upstream implementation in `ext-data.c` documents intended usage
     *
     * Safe to call multiple times. No result rows are used.
     *
     * @example
     * ```typescript
     * import * as CrSql from "@effect-native/crsql"
     * import { Effect } from "effect"
     *
     * // Close down a connection cleanly
     * const done = Effect.gen(function* () {
     *   // ...your work with the database...
     *   yield* CrSql.CrSql.finalize
     *   // then close the underlying SQLite connection
     * })
     * ```
     *
     * @since 1.0.0
     * @category Operations
     */
    finalize,
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
     * const apply = (rows: ReadonlyArray<CrSql.CrSqlSchema.ChangeRowSerialized>) =>
     *   CrSql.CrSql.applyChanges(rows)
     * ```
     *
     * @since 1.0.0
     * @category Operations
     */
    applyChanges,
    /** Create CRR tracking for an existing table. */
    asCrr,
    /** Remove CRR tracking and downgrade to table. */
    asTable,
    /** Prepare a CRR table for schema alteration. */
    beginAlter,
    /** Finalize schema alteration on a CRR table. */
    commitAlter,
    /** Extension SHA string from crsql_sha(). */
    getSha,
    /** Enable fractional ordering on a table/column. */
    fractAsOrdered,
    fractAsOrderedWith,
    /** Compute a fractional key between two keys. */
    fractKeyBetween,
    /** Infer a schema DDL string from exported changes. */
    schemaFromChanges,
    /** Apply schema migrations via crsql_automigrate using a template tag. */
    automigrate,
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
    setPeerVersion,
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
    getPeerVersion,
    listTrackedPeers,
    trackedPeersMap,

    // TODO(effect-native): expose reactive helpers in service API
    // reactiveDbVersion,
    // reactivePeerVersion,
    // reactivePullChanges,

    /**
     * The underlying `SqlClient` instance used by this service.
     */
    sql: sql satisfies SqlClient.SqlClient
  } as const

  return crsql
})

/**
 * CR-SQLite service accessor class.
 *
 * Use `CrSql` accessors in Effects to interact with the CR-SQLite-backed
 * database via the provided `SqlClient`.
 *
 * @since 1.0.0
 */
export class CrSql extends Effect.Service<CrSql>()("CrSql", {
  accessors: true,
  effect: makeCrSql,
  dependencies: [CrSqliteExtension.ExtInfoLoaded.Default]
}) {
  static fromSqliteClient = Effect.fn("@effect-native/crsql/CrSql.fromSqliteClient")(
    function*(
      params: {
        sql: SqliteClient.SqliteClient
        /** when you want to take ownership of extension loading, provide this */
        loadedExtensionInfo?: Effect.Effect<CrSqlSchema.ExtInfoLoaded>
      }
    ) {
      // reuse the same SqlClient layer everywhere
      const layerSqlClient = Layer.succeed(SqlClient.SqlClient, params.sql)

      // load the extension via params or default to our standard loader
      const loadInfo = yield* params.loadedExtensionInfo?.pipe(
        Schema.decodeUnknown(CrSqlSchema.ExtInfoLoaded),
        Effect.catchTag("ParseError", (cause) => Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing({ cause }))),
        Effect.withSpan("params.loadedExtensionInfo")
      ) ??
        CrSqliteExtension.loadLibCrSql.pipe(Effect.provide(layerSqlClient))

      // proves that the extension has loaded
      const dbInfo = yield* CrSqliteExtension.sqlExtInfo.pipe(Effect.provide(layerSqlClient))

      const layers = Layer.mergeAll(
        layerSqlClient,
        Layer.succeed(
          CrSqliteExtension.ExtInfoLoaded,
          CrSqliteExtension.ExtInfoLoaded.make(CrSqlSchema.ExtInfo.make({ ...loadInfo, ...dbInfo }))
        )
      )

      return yield* makeCrSql.pipe(Effect.provide(layers))
    }
  )
}
