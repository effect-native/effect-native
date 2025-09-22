/**
 * Composite router helpers for orchestrating multiple MiniDom adapters.
 *
 * @since 0.0.0
 */
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"

import * as AttributeBag from "../core/AttributeBag.js"
import type { AttributeEntry } from "../core/AttributeBag.js"
import * as MiniDomError from "../core/MiniDomError.js"
import type { Namespace } from "../core/Namespace.js"
import type { TransactionCapability } from "../core/TransactionCapability.js"

/**
 * Error thrown when a composite router cannot find the requested adapter.
 *
 * @since 0.0.0
 * @category errors
 * @example
 * ```ts
 * import { Composite } from "@effect-native/minidom"
 *
 * throw new Composite.CompositeAdapterMissing("happy-dom")
 * ```
 */
export class CompositeAdapterMissing extends Error {
  constructor(readonly adapter: string | number | symbol) {
    super(`Composite router missing adapter: ${String(adapter)}`)
    this.name = "CompositeAdapterMissing"
  }
}

/**
 * Allowed ownership levels for adapters participating in a composite router.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const ownership: MiniDom.Composite.Ownership = "read-only"
 * ```
 */
export type Ownership = "read-write" | "read-only"

/**
 * Optional metadata describing how a particular adapter participates in the composite.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const capability: MiniDom.Composite.CompositeCapability = { ownership: "read-only" }
 * ```
 */
export interface CompositeCapability {
  readonly ownership?: Ownership
}

/**
 * Capability record advertised by each adapter to the composite router.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const adapter: MiniDom.Composite.AdapterCapabilities = {
 *   composite: { ownership: "read-write" }
 * }
 * ```
 */
export interface AdapterCapabilities {
  readonly composite?: CompositeCapability
  readonly transaction?: TransactionCapability
  readonly [key: string]: unknown
}

/**
 * Error union emitted by composite attribute operations.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const log = (error: MiniDom.Composite.CompositeError) => console.error(error.message)
 * ```
 */
export type CompositeError = MiniDomError.Unsupported | MiniDomError.Conflict | CompositeAdapterMissing

/**
 * Definition for connecting an attribute bag into the composite router.
 *
 * @since 0.0.0
 * @category types
 * @example
 * ```ts
 * import { AttributeBag, Composite } from "@effect-native/minidom"
 *
 * const bag = AttributeBag.makeSync()
 * const adapter: Composite.AdapterConfig = {
 *   bag,
 *   capabilities: { composite: { ownership: "read-write" } }
 * }
 * ```
 */
export interface AdapterConfig {
  readonly bag: AttributeBag.AttributeBag
  readonly transaction?: TransactionCapability
  readonly capabilities?: AdapterCapabilities
}

type AdapterRecord = Record<PropertyKey, AdapterConfig>

type Operation = "get" | "has" | "set" | "delete" | "transaction"

const isWriteOperation = (operation: Operation) =>
  operation === "set" || operation === "delete" || operation === "transaction"

const ActiveTransactionRef = FiberRef.unsafeMake<PropertyKey | null>(null)

const ownershipFor = (config: AdapterConfig): Ownership => config.capabilities?.composite?.ownership ?? "read-write"

const ensureOwnership = <K extends PropertyKey>(
  key: K,
  namespace: Namespace,
  name: string,
  operation: Operation,
  config: AdapterConfig
): Effect.Effect<void, MiniDomError.Unsupported> => {
  if (!isWriteOperation(operation)) {
    return Effect.void
  }

  if (ownershipFor(config) === "read-only") {
    return Effect.fail(
      new MiniDomError.Unsupported({
        message: `Composite adapter ${String(key)} is read-only and cannot ${operation} ${namespace ?? "null"}:${name}`,
        cause: {
          adapter: key,
          namespace,
          name,
          operation
        }
      })
    )
  }

  return Effect.void
}

const ensureTransactionBoundary = <K extends PropertyKey>(
  key: K,
  namespace: Namespace,
  name: string,
  operation: Operation
): Effect.Effect<void, MiniDomError.Unsupported> => {
  if (!isWriteOperation(operation)) {
    return Effect.void
  }

  return Effect.flatMap(FiberRef.get(ActiveTransactionRef), (active) => {
    if (active === null || active === key) {
      return Effect.void
    }

    return Effect.fail(
      new MiniDomError.Unsupported({
        message: `Composite transaction for ${String(active)} cannot mutate adapter ${
          String(key)
        } during ${operation} ${namespace ?? "null"}:${name}`,
        cause: {
          active,
          attempted: key,
          namespace,
          name,
          operation
        }
      })
    )
  })
}

/**
 * Context object passed to guard hooks before delegating to an adapter.
 *
 * @since 0.0.0
 * @category types
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const guard = (context: MiniDom.Composite.GuardContext<string>) => {
 *   console.log(context.adapter, context.operation)
 *   return Effect.void
 * }
 * ```
 */
export interface GuardContext<K extends PropertyKey> {
  readonly adapter: K
  readonly namespace: Namespace
  readonly name: string
  readonly operation: Operation
  readonly capabilities?: AdapterCapabilities
}

/**
 * Configuration used to construct a composite attribute router.
 *
 * @since 0.0.0
 * @category types
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const bag = MiniDom.AttributeBag.makeSync()
 *
 * const options: MiniDom.Composite.RouterOptions<{ primary: MiniDom.Composite.AdapterConfig }> = {
 *   adapters: { primary: { bag } },
 *   resolve: () => "primary"
 * }
 * ```
 */
export interface RouterOptions<Adapters extends AdapterRecord> {
  readonly adapters: Adapters
  readonly resolve: (namespace: Namespace, name: string) => keyof Adapters
  readonly guard?: (context: GuardContext<keyof Adapters>) => Effect.Effect<void, MiniDomError.Unsupported>
}

const CompositeContextSymbol: unique symbol = Symbol.for("@effect-native/minidom/Composite/Context")

interface CompositeContext<Adapters extends AdapterRecord> {
  readonly adapters: Map<keyof Adapters, AdapterConfig>
  readonly options: RouterOptions<Adapters>
}

type CompositeService<Adapters extends AdapterRecord> = AttributeBag.AttributeBagShape<CompositeError> & {
  readonly [CompositeContextSymbol]: CompositeContext<Adapters>
}

const adapterTable = <Adapters extends AdapterRecord>(
  options: RouterOptions<Adapters>
) => new Map(Object.entries(options.adapters) as Array<[keyof Adapters, AdapterConfig]>)

const resolveAdapter = <Adapters extends AdapterRecord>(
  adapters: Map<keyof Adapters, AdapterConfig>,
  options: RouterOptions<Adapters>,
  namespace: Namespace,
  name: string
): Effect.Effect<readonly [keyof Adapters, AdapterConfig], CompositeAdapterMissing> =>
  Effect.try({
    try: () => {
      const key = options.resolve(namespace, name)
      const adapter = adapters.get(key)

      if (!adapter) {
        throw new CompositeAdapterMissing(key)
      }

      return [key, adapter] as const
    },
    catch: (error) => error as CompositeAdapterMissing
  })

const runGuard = <Adapters extends AdapterRecord>(
  options: RouterOptions<Adapters>,
  context: GuardContext<keyof Adapters>
): Effect.Effect<void, MiniDomError.Unsupported> => (options.guard ? options.guard(context) : Effect.void)

const delegate = <Adapters extends AdapterRecord, A>(params: {
  readonly adapters: Map<keyof Adapters, AdapterConfig>
  readonly options: RouterOptions<Adapters>
  readonly namespace: Namespace
  readonly name: string
  readonly operation: Operation
  readonly run: (bag: AttributeBag.AttributeBag) => Effect.Effect<A>
}): Effect.Effect<A, CompositeError> =>
  Effect.gen(function*() {
    const [key, adapter] = yield* resolveAdapter(
      params.adapters,
      params.options,
      params.namespace,
      params.name
    )

    yield* ensureOwnership(key, params.namespace, params.name, params.operation, adapter)
    yield* ensureTransactionBoundary(key, params.namespace, params.name, params.operation)

    const context: GuardContext<keyof Adapters> = {
      adapter: key,
      namespace: params.namespace,
      name: params.name,
      operation: params.operation,
      ...(adapter.capabilities ? { capabilities: adapter.capabilities } : {})
    }

    yield* runGuard(params.options, context)

    return yield* params.run(adapter.bag)
  })

const entriesFromAll = <Adapters extends AdapterRecord>(
  adapters: Map<keyof Adapters, AdapterConfig>
): Effect.Effect<ReadonlyArray<readonly [adapter: keyof Adapters, entry: AttributeEntry]>> =>
  Effect.map(
    Effect.forEach(Array.from(adapters.entries()), ([key, adapter]) =>
      Effect.map(adapter.bag.entries(), (entries) => entries.map((entry) => [key, entry] as const)), {
      concurrency: "unbounded"
    }),
    (entryGroups) =>
      entryGroups.flat()
  )

const entryKey = (namespace: Namespace, name: string) => `${String(namespace)}::${name}`

const captureState = <Adapters extends AdapterRecord>(
  adapters: Map<keyof Adapters, AdapterConfig>
): Effect.Effect<Map<keyof Adapters, Map<string, AttributeEntry>>> =>
  Effect.map(entriesFromAll(adapters), (pairs) => {
    const state = new Map<keyof Adapters, Map<string, AttributeEntry>>()
    for (const [adapter, entry] of pairs) {
      if (!state.has(adapter)) {
        state.set(adapter, new Map())
      }
      state.get(adapter)!.set(entryKey(entry[0], entry[1]), entry)
    }
    return state
  })

const restoreAdapter = <_Adapters extends AdapterRecord>(
  adapter: AdapterConfig,
  before: Map<string, AttributeEntry>,
  after: Map<string, AttributeEntry>
): Effect.Effect<void> => {
  const removals: Array<Effect.Effect<void>> = []
  for (const key of after.keys()) {
    if (!before.has(key)) {
      const [namespace, name] = key.split("::") as [Namespace, string]
      removals.push(adapter.bag.delete(namespace, name).pipe(Effect.asVoid))
    }
  }

  const restorations: Array<Effect.Effect<void>> = []
  for (const [, [namespace, name, value]] of before) {
    restorations.push(adapter.bag.set(namespace, name, value))
  }

  return Effect.forEach(removals.concat(restorations), (effect) => effect, {
    concurrency: "unbounded"
  }).pipe(Effect.asVoid)
}

/**
 * Builds a composite attribute service from the supplied adapter map.
 *
 * @since 0.0.0
 * @category constructors
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import { AttributeBag, Composite } from "@effect-native/minidom"
 *
 * const bag = AttributeBag.makeSync({ initial: [[null, "id", "root"]] })
 *
 * const program = Effect.gen(function*() {
 *   const router = yield* Composite.makeRouter({
 *     adapters: { primary: { bag } },
 *     resolve: () => "primary"
 *   })
 *   return yield* router.get(null, "id")
 * })
 *
 * Effect.runPromise(program).then(console.log)
 * ```
 */
export const makeRouter = <Adapters extends AdapterRecord>(
  options: RouterOptions<Adapters>
): Effect.Effect<CompositeService<Adapters>> =>
  Effect.sync(() => {
    const adapters = adapterTable(options)

    const service: CompositeService<Adapters> = {
      get: (namespace, name) =>
        delegate({
          adapters,
          options,
          namespace,
          name,
          operation: "get",
          run: (bag) => bag.get(namespace, name)
        }),
      has: (namespace, name) =>
        delegate({
          adapters,
          options,
          namespace,
          name,
          operation: "has",
          run: (bag) => bag.has(namespace, name)
        }),
      set: (namespace, name, value) =>
        delegate({
          adapters,
          options,
          namespace,
          name,
          operation: "set",
          run: (bag) => bag.set(namespace, name, value)
        }),
      delete: (namespace, name) =>
        delegate({
          adapters,
          options,
          namespace,
          name,
          operation: "delete",
          run: (bag) => bag.delete(namespace, name)
        }),
      entries: () => Effect.map(entriesFromAll(adapters), (pairs) => pairs.map(([, entry]) => entry)),
      snapshot: () =>
        Effect.map(entriesFromAll(adapters), (pairs) => AttributeBag.viewFromEntries(pairs.map(([, entry]) => entry))),
      refresh: () => refreshAll(adapters),
      [CompositeContextSymbol]: {
        adapters,
        options
      }
    }

    return service
  })

/**
 * Refreshes every adapter participating in a composite router.
 *
 * @since 0.0.0
 * @category helpers
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import { AttributeBag, Composite } from "@effect-native/minidom"
 *
 * const adapters = new Map([
 *   ["primary", { bag: AttributeBag.makeAsync() }]
 * ] as const)
 *
 * Effect.runPromise(Composite.refreshAll(adapters))
 * ```
 */
export const refreshAll = <Adapters extends AdapterRecord>(
  adapters: Map<keyof Adapters, AdapterConfig>
): Effect.Effect<void, MiniDomError.Conflict> =>
  Effect.flatMap(FiberRef.get(ActiveTransactionRef), (active) => {
    if (active !== null) {
      return Effect.fail(
        new MiniDomError.Conflict({
          message: `Composite transaction for ${String(active)} cannot refresh adapters while in progress`,
          cause: { active, operation: "refresh" }
        })
      )
    }

    return Effect.gen(function*() {
      const before = yield* captureState(adapters)

      yield* Effect.forEach(Array.from(adapters.values()), (adapter) => adapter.bag.refresh(), {
        concurrency: "unbounded"
      })

      const after = yield* captureState(adapters)

      const conflicts: Array<keyof Adapters> = []

      for (const [key, beforeEntries] of before.entries()) {
        const afterEntries = after.get(key) ?? new Map<string, AttributeEntry>()

        if (beforeEntries.size !== afterEntries.size) {
          conflicts.push(key)
          continue
        }

        for (const [entryKey, entry] of beforeEntries) {
          const afterEntry = afterEntries.get(entryKey)
          if (!afterEntry || afterEntry[2] !== entry[2]) {
            conflicts.push(key)
            break
          }
        }
      }

      if (conflicts.length > 0) {
        yield* Effect.forEach(conflicts, (key) => {
          const adapter = adapters.get(key)!
          const beforeEntries = before.get(key) ?? new Map<string, AttributeEntry>()
          const afterEntries = after.get(key) ?? new Map<string, AttributeEntry>()
          return restoreAdapter(adapter, beforeEntries, afterEntries)
        }, {
          concurrency: "unbounded"
        })

        return yield* new MiniDomError.Conflict({
          message: "Composite refresh detected conflicting adapter state",
          cause: { adapters: conflicts.map((key) => String(key)) }
        })
      }
    })
  })

/**
 * Describes a transactional effect that should run against a specific adapter.
 *
 * @since 0.0.0
 * @category types
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import { Composite } from "@effect-native/minidom"
 *
 * const request: Composite.TransactionRequest<never, never, string> = {
 *   namespace: null,
 *   name: "title",
 *   effect: Effect.succeed("ok")
 * }
 * ```
 */
export interface TransactionRequest<R, E, A> {
  readonly namespace: Namespace
  readonly name: string
  readonly effect: Effect.Effect<A, E, R>
}

const compositeContext = <Adapters extends AdapterRecord>(
  service: CompositeService<Adapters>
): CompositeContext<Adapters> => service[CompositeContextSymbol]

/**
 * Executes an effect under the transactional capability of the resolved adapter.
 *
 * @since 0.0.0
 * @category combinators
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import { AttributeBag, Composite } from "@effect-native/minidom"
 *
 * const bag = AttributeBag.makeSync({ initial: [[null, "title", "draft"]] })
 *
 * const program = Effect.gen(function*() {
 *   const router = yield* Composite.makeRouter({
 *     adapters: { primary: { bag, transaction: AttributeBag.transaction(bag) } },
 *     resolve: () => "primary"
 *   })
 *
 *   return yield* Composite.runTransaction(router, {
 *     namespace: null,
 *     name: "title",
 *     effect: Effect.succeed("published")
 *   })
 * })
 *
 * Effect.runPromise(program).then(console.log)
 * ```
 */
export const runTransaction = <Adapters extends AdapterRecord, R, E, A>(
  service: CompositeService<Adapters>,
  request: TransactionRequest<R, E, A>
): Effect.Effect<A, CompositeError | MiniDomError.Conflict | E, R> =>
  Effect.gen(function*() {
    const context = compositeContext(service)
    const adapters = context.adapters
    const options = context.options

    const [key, adapter] = yield* resolveAdapter(adapters, options, request.namespace, request.name)
    yield* ensureOwnership(key, request.namespace, request.name, "transaction", adapter)
    yield* ensureTransactionBoundary(key, request.namespace, request.name, "transaction")

    const guardContext: GuardContext<keyof Adapters> = {
      adapter: key,
      namespace: request.namespace,
      name: request.name,
      operation: "transaction",
      ...(adapter.capabilities ? { capabilities: adapter.capabilities } : {})
    }

    const capability = adapter.transaction ?? adapter.capabilities?.transaction

    if (!capability) {
      return yield* Effect.fail(
        new MiniDomError.Unsupported({
          message: `Composite adapter ${String(key)} does not support transactions`
        })
      )
    }

    yield* runGuard(options, guardContext)

    return yield* capability.withTransaction(
      request.effect.pipe(Effect.locally(ActiveTransactionRef, key))
    )
  })
