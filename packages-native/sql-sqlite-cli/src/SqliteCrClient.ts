/**
 * @since 1.0.0
 */
import type * as Reactivity from "@effect/experimental/Reactivity"
import { Command, CommandExecutor } from "@effect/platform"
import * as Client from "@effect/sql/SqlClient"
import type { Connection } from "@effect/sql/SqlConnection"
import { SqlError } from "@effect/sql/SqlError"
import * as Statement from "@effect/sql/Statement"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import type { ConfigError } from "effect/ConfigError"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

const ATTR_DB_SYSTEM_NAME = "db.system.name"

/**
 * @category type ids
 * @since 1.0.0
 */
export const TypeId: unique symbol = Symbol.for("@effect-native/sql-sqlite-cli/SqliteCrClient")

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
export const SqliteCrClient = Context.GenericTag<SqliteCrClient>("@effect-native/sql-sqlite-cli/SqliteCrClient")

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
 * Internal type for parsed JSON rows
 * @internal
 */
interface ParsedRow {
  readonly [key: string]: unknown
}

/**
 * Escapes a SQL string value properly
 * @internal
 */
const escapeStringValue = (value: string): string => `'${value.replace(/'/g, "''")}'`

/**
 * Converts a primitive value to its SQL representation
 * @internal
 */
const primitiveToSql = (param: Statement.Primitive): string => {
  if (param === null) return "NULL"
  if (typeof param === "string") return escapeStringValue(param)
  if (typeof param === "boolean") return param ? "1" : "0"
  if (typeof param === "number") return String(param)
  if (param instanceof Date) return escapeStringValue(param.toISOString())
  if (param instanceof Uint8Array) {
    return `X'${Array.from(param).map((b) => b.toString(16).padStart(2, "0")).join("")}'`
  }
  return String(param)
}

/**
 * Substitutes parameters in SQL string
 * @internal
 */
const substituteParameters = (
  sql: string,
  params: ReadonlyArray<Statement.Primitive>
): Effect.Effect<string, SqlError> =>
  Effect.try({
    try: () => {
      let result = sql
      params.forEach((param, index) => {
        const placeholder = new RegExp(`\\$${index + 1}(?!\\d)`, "g")
        result = result.replace(placeholder, primitiveToSql(param))
      })
      return result
    },
    catch: (error) =>
      new SqlError({
        message: `Failed to substitute SQL parameters: ${error}`,
        cause: error
      })
  })

/**
 * Parses JSON output from sqlite-cr
 * @internal
 */
const parseJsonOutput = (output: string): Effect.Effect<ReadonlyArray<ParsedRow>, SqlError> =>
  Effect.try({
    try: () => {
      const trimmed = output.trim()
      if (!trimmed) return []
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed : []
    },
    catch: (error) =>
      new SqlError({
        message: `Failed to parse JSON response: ${error}`,
        cause: error
      })
  })

/**
 * Executes a sqlite-cr command
 * @internal
 */
const executeCommand = (
  commandExecutor: CommandExecutor.CommandExecutor,
  config: SqliteCrClientConfig
) =>
(
  sql: string,
  params: ReadonlyArray<Statement.Primitive>,
  options: { readonly json: boolean }
): Effect.Effect<string, SqlError> =>
  pipe(
    substituteParameters(sql, params),
    Effect.flatMap((finalSql) => {
      const args = options.json
        ? ["-json", config.filename, finalSql]
        : [config.filename, finalSql]

      const command = Command.make("nix", "run", "github:subtleGradient/sqlite-cr", "--", ...args)
      return pipe(
        commandExecutor.string(command),
        Effect.mapError((error) =>
          new SqlError({
            message: `SQLite command failed: ${error}`,
            cause: error
          })
        )
      )
    })
  )

/**
 * Creates a SQLite connection
 * @internal
 */
const makeConnection = (
  commandExecutor: CommandExecutor.CommandExecutor,
  config: SqliteCrClientConfig,
  transformRows: ((rows: ReadonlyArray<ParsedRow>) => ReadonlyArray<ParsedRow>) | undefined
): Connection => {
  const execCommand = executeCommand(commandExecutor, config)

  return {
    execute(sql: string, params: ReadonlyArray<Statement.Primitive>, localTransformRows?) {
      const isSelect = /^\s*SELECT/i.test(sql)
      const transform = localTransformRows ?? transformRows

      return isSelect
        ? pipe(
          execCommand(sql, params, { json: true }),
          Effect.flatMap(parseJsonOutput),
          Effect.map((rows) => transform ? transform(rows) : rows)
        )
        : pipe(
          execCommand(sql, params, { json: false }),
          Effect.as([])
        )
    },

    executeRaw(sql: string, params: ReadonlyArray<Statement.Primitive>) {
      return execCommand(sql, params, { json: false })
    },

    executeValues(sql: string, params: ReadonlyArray<Statement.Primitive>) {
      return pipe(
        execCommand(sql, params, { json: true }),
        Effect.flatMap(parseJsonOutput),
        Effect.map((rows): ReadonlyArray<ReadonlyArray<Statement.Primitive>> => {
          if (rows.length === 0) return []
          const keys = Object.keys(rows[0])
          return rows.map((row) => keys.map((key) => row[key] as Statement.Primitive))
        })
      )
    },

    executeUnprepared(sql: string, params: ReadonlyArray<Statement.Primitive>, localTransformRows?) {
      return this.execute(sql, params, localTransformRows)
    },

    executeStream(sql: string, params: ReadonlyArray<Statement.Primitive>, localTransformRows?) {
      return pipe(
        Stream.fromEffect(this.execute(sql, params, localTransformRows)),
        Stream.flatMap(Stream.fromIterable)
      )
    }
  }
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
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined

    const spanAttributes = Chunk.fromIterable([
      [ATTR_DB_SYSTEM_NAME, "sqlite-cr"] as const,
      ...Object.entries(options.spanAttributes ?? {})
    ])

    const commandExecutor = yield* CommandExecutor.CommandExecutor
    const connection = makeConnection(commandExecutor, options, transformRows)
    const acquirer = Effect.succeed(connection)

    const client = yield* Client.make({
      acquirer,
      compiler,
      spanAttributes: Chunk.toReadonlyArray(spanAttributes),
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
  Layer.scoped(
    SqliteCrClient,
    pipe(
      Config.unwrap(config),
      Effect.flatMap(make)
    )
  )

/**
 * @category layers
 * @since 1.0.0
 */
export const layerConfig = (
  config: SqliteCrClientConfig
): Layer.Layer<SqliteCrClient, never, Reactivity.Reactivity | CommandExecutor.CommandExecutor> =>
  Layer.scoped(SqliteCrClient, make(config))
