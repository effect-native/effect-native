/**
 * @since 1.0.0
 */
import { Command, CommandExecutor } from "@effect/platform"
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

const ATTR_DB_SYSTEM_NAME = "db.system.name"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect/sql-sqlite-cr/SqliteCrClient")

/**
 * @category type ids
 * @since 1.0.0
 */
export type TypeId = typeof TypeId

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteCrClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: SqliteCrClientConfig

  /** Not supported in sqlite-cr */
  readonly updateValues: never
}

/**
 * @category tags
 * @since 1.0.0
 */
export const SqliteCrClient = Context.GenericTag<SqliteCrClient>("@effect/sql-sqlite-cr/SqliteCrClient")

/**
 * @category models
 * @since 1.0.0
 */
export interface SqliteCrClientConfig {
  readonly filename: string
  readonly readonly?: boolean | undefined
  readonly spanAttributes?: Record<string, unknown> | undefined

  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}

/**
 * @category constructor
 * @since 1.0.0
 */
export const make = (
  options: SqliteCrClientConfig
): Effect.Effect<SqliteCrClient, never, Scope.Scope | Reactivity.Reactivity | CommandExecutor.CommandExecutor> =>
  Effect.gen(function*() {
    const compiler = Statement.makeCompilerSqlite(options.transformQueryNames)
    const transformRows = options.transformResultNames ?
      Statement.defaultTransforms(
        options.transformResultNames
      ).array :
      undefined

    const spanAttributes: ReadonlyArray<readonly [string, unknown]> = [
      [ATTR_DB_SYSTEM_NAME, "sqlite-cr"],
      ...Object.entries(options.spanAttributes ?? {})
    ]

    const commandExecutor = yield* CommandExecutor.CommandExecutor

    // Helper function to execute sqlite-cr commands
    const execCommand = (sql: string, params: ReadonlyArray<Statement.Primitive>, expectJson: boolean = false): Effect.Effect<any, SqlError> =>
      Effect.gen(function*() {
        try {
          // For CLI, we need to handle parameter substitution in the SQL string
          // This is a simplified approach - in production you'd want proper escaping
          let finalSql = sql
          params.forEach((param, index) => {
            const placeholder = `$${index + 1}`
            const value = typeof param === "string" ? `'${param.replace(/'/g, "''")}'` : String(param)
            finalSql = finalSql.replace(placeholder, value)
          })

          const args = expectJson ? ["-json", options.filename, finalSql] : [options.filename, finalSql]
          const command = Command.make("sqlite-cr", ...args)
          const result = yield* Command.string(command)
          
          if (expectJson && result.trim()) {
            try {
              return JSON.parse(result.trim())
            } catch (parseError) {
              yield* Effect.fail(new SqlError({
                message: `Failed to parse JSON response: ${parseError}`,
                cause: parseError
              }))
            }
          }
          
          return result.trim()
        } catch (error) {
          yield* Effect.fail(new SqlError({
            message: error instanceof Error ? error.message : String(error),
            cause: error
          }))
        }
      })

    const makeConnection = (): Effect.Effect<Connection, SqlError> =>
      Effect.succeed({
        execute(sql: string, params: ReadonlyArray<Statement.Primitive>, transformRows) {
          return Effect.gen(function*() {
            // Determine if this is a SELECT query that should return JSON
            const isSelect = sql.trim().toUpperCase().startsWith("SELECT")
            
            if (isSelect) {
              const rows = yield* execCommand(sql, params, true)
              const result = Array.isArray(rows) ? rows : []
              return transformRows ? transformRows(result) : result
            } else {
              // For non-SELECT queries, we don't expect JSON output
              yield* execCommand(sql, params, false)
              return []
            }
          })
        },

        executeRaw(sql: string, params: ReadonlyArray<Statement.Primitive>) {
          return execCommand(sql, params, false)
        },

        executeValues(sql: string, params: ReadonlyArray<Statement.Primitive>) {
          return Effect.gen(function*() {
            const rows = yield* execCommand(sql, params, true)
            
            if (!Array.isArray(rows) || rows.length === 0) {
              return []
            }
            
            // Convert rows to values (arrays of values)
            const firstRow = rows[0]
            const keys = Object.keys(firstRow)
            return rows.map(row => keys.map(key => row[key]))
          })
        },

        executeUnprepared(sql: string, params: ReadonlyArray<Statement.Primitive>, transformRows) {
          return this.execute(sql, params, transformRows)
        },

        executeStream(sql: string, params: ReadonlyArray<Statement.Primitive>, transformRows) {
          // For CLI-based implementation, we'll execute the query once and convert to stream
          return Stream.fromEffect(this.execute(sql, params, transformRows)).pipe(
            Stream.flatMap(rows => Stream.fromIterable(rows))
          )
        }
      })

    const acquirer = Effect.scoped(makeConnection())

    const client = yield* Client.make({
      acquirer,
      compiler,
      spanAttributes,
      transformRows
    })

    return Object.assign(client, {
      [TypeId]: TypeId as TypeId,
      config: options,
      updateValues: undefined as never
    })
  })

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: Config.Config.Wrap<SqliteCrClientConfig>
): Layer.Layer<SqliteCrClient, ConfigError, Reactivity.Reactivity | CommandExecutor.CommandExecutor> =>
  Layer.scoped(SqliteCrClient, Effect.flatMap(Config.unwrap(config), make))

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: SqliteCrClientConfig
): Layer.Layer<SqliteCrClient, never, Reactivity.Reactivity | CommandExecutor.CommandExecutor> =>
  Layer.scoped(SqliteCrClient, make(config))

/**
 * @category layers
 * @since 1.0.0
 */
export const layer = (
  config: Config.Config.Wrap<SqliteCrClientConfig>
): Layer.Layer<SqliteCrClient, ConfigError, Reactivity.Reactivity | CommandExecutor.CommandExecutor> =>
  Layer.scoped(SqliteCrClient, Effect.flatMap(Config.unwrap(config), make))

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: SqliteCrClientConfig
): Layer.Layer<SqliteCrClient, never, Reactivity.Reactivity | CommandExecutor.CommandExecutor> =>
  Layer.scoped(SqliteCrClient, make(config))