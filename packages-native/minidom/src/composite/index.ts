/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"

import * as AttributeBag from "../core/AttributeBag.js"
import type { AttributeEntry } from "../core/AttributeBag.js"
import * as MiniDomError from "../core/MiniDomError.js"
import type { Namespace } from "../core/Namespace.js"

/**
 * @since 1.0.0
 * @category errors
 */
export class CompositeAdapterMissing extends Error {
  constructor(readonly adapter: string | number | symbol) {
    super(`Composite router missing adapter: ${String(adapter)}`)
    this.name = "CompositeAdapterMissing"
  }
}

/**
 * @since 1.0.0
 * @category model
 */
export type Ownership = "read-write" | "read-only"

/**
 * @since 1.0.0
 * @category model
 */
export interface CompositeCapability {
  readonly ownership?: Ownership
}

/**
 * @since 1.0.0
 * @category model
 */
export interface AdapterCapabilities {
  readonly composite?: CompositeCapability
  readonly [key: string]: unknown
}

/**
 * @since 1.0.0
 * @category model
 */
export type CompositeError = MiniDomError.Unsupported | CompositeAdapterMissing

/**
 * @since 1.0.0
 * @category types
 */
export interface AdapterConfig {
  readonly bag: AttributeBag.Service
  readonly capabilities?: AdapterCapabilities
}

type AdapterRecord = Record<PropertyKey, AdapterConfig>

type Operation = "get" | "has" | "set" | "delete"

const isWriteOperation = (operation: Operation) => operation === "set" || operation === "delete"

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

/**
 * @since 1.0.0
 * @category types
 */
export interface GuardContext<K extends PropertyKey> {
  readonly adapter: K
  readonly namespace: Namespace
  readonly name: string
  readonly operation: Operation
  readonly capabilities?: AdapterCapabilities
}

/**
 * @since 1.0.0
 * @category types
 */
export interface RouterOptions<Adapters extends AdapterRecord> {
  readonly adapters: Adapters
  readonly resolve: (namespace: Namespace, name: string) => keyof Adapters
  readonly guard?: (context: GuardContext<keyof Adapters>) => Effect.Effect<void, MiniDomError.Unsupported>
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

const delegate = <Adapters extends AdapterRecord, A>(
  adapters: Map<keyof Adapters, AdapterConfig>,
  options: RouterOptions<Adapters>,
  namespace: Namespace,
  name: string,
  operation: Operation,
  f: (bag: AttributeBag.Service) => Effect.Effect<A>
): Effect.Effect<A, CompositeError> =>
  Effect.flatMap(resolveAdapter(adapters, options, namespace, name), ([key, adapter]) =>
    Effect.flatMap(
      ensureOwnership(key, namespace, name, operation, adapter),
      () => {
        const context: GuardContext<keyof Adapters> = {
          adapter: key,
          namespace,
          name,
          operation,
          ...(adapter.capabilities ? { capabilities: adapter.capabilities } : {})
        }

        return Effect.flatMap(runGuard(options, context), () => f(adapter.bag))
      }
    ))

const entriesFromAll = <Adapters extends AdapterRecord>(
  adapters: Map<keyof Adapters, AdapterConfig>
): Effect.Effect<ReadonlyArray<AttributeEntry>> =>
  Effect.map(
    Effect.forEach(Array.from(adapters.values()), (adapter) => adapter.bag.entries(), {
      concurrency: "unbounded"
    }),
    (entryGroups) => entryGroups.flat()
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeRouter = <Adapters extends AdapterRecord>(
  options: RouterOptions<Adapters>
): Effect.Effect<AttributeBag.Service<CompositeError>> =>
  Effect.sync(() => {
    const adapters = adapterTable(options)

    const service: AttributeBag.Service<CompositeError> = {
      get: (namespace, name) => delegate(adapters, options, namespace, name, "get", (bag) => bag.get(namespace, name)),
      has: (namespace, name) => delegate(adapters, options, namespace, name, "has", (bag) => bag.has(namespace, name)),
      set: (namespace, name, value) =>
        delegate(adapters, options, namespace, name, "set", (bag) => bag.set(namespace, name, value)),
      delete: (namespace, name) =>
        delegate(adapters, options, namespace, name, "delete", (bag) => bag.delete(namespace, name)),
      entries: () => entriesFromAll(adapters),
      snapshot: () => Effect.map(entriesFromAll(adapters), AttributeBag.viewFromEntries),
      refresh: () => refreshAll(adapters)
    }

    return service
  })

/**
 * @since 1.0.0
 * @category helpers
 */
export const refreshAll = <Adapters extends AdapterRecord>(
  adapters: Map<keyof Adapters, AdapterConfig>
): Effect.Effect<void> =>
  Effect.asVoid(
    Effect.forEach(Array.from(adapters.values()), (adapter) => adapter.bag.refresh(), {
      concurrency: "unbounded"
    })
  )
