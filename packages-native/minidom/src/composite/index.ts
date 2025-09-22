/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"

import * as AttributeBag from "../core/AttributeBag.js"
import type { AttributeEntry } from "../core/AttributeBag.js"
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
 * @category types
 */
export interface AdapterConfig {
  readonly bag: AttributeBag.Service
  readonly capabilities?: unknown
}

type AdapterRecord = Record<PropertyKey, AdapterConfig>

export interface GuardContext<K extends PropertyKey> {
  readonly adapter: K
  readonly namespace: Namespace
  readonly name: string
  readonly operation: "get" | "has" | "set" | "delete"
  readonly capabilities?: unknown
}

/**
 * @since 1.0.0
 * @category types
 */
export interface RouterOptions<Adapters extends AdapterRecord> {
  readonly adapters: Adapters
  readonly resolve: (namespace: Namespace, name: string) => keyof Adapters
  readonly guard?: (context: GuardContext<keyof Adapters>) => Effect.Effect<void>
}

const adapterTable = <Adapters extends AdapterRecord>(
  options: RouterOptions<Adapters>
) => new Map(Object.entries(options.adapters) as Array<[keyof Adapters, AdapterConfig]>)

const resolveAdapter = <Adapters extends AdapterRecord>(
  adapters: Map<keyof Adapters, AdapterConfig>,
  options: RouterOptions<Adapters>,
  namespace: Namespace,
  name: string
): Effect.Effect<readonly [keyof Adapters, AttributeBag.Service], CompositeAdapterMissing> =>
  Effect.try({
    try: () => {
      const key = options.resolve(namespace, name)
      const adapter = adapters.get(key)

      if (!adapter) {
        throw new CompositeAdapterMissing(key)
      }

      return [key, adapter.bag]
    },
    catch: (error) => error as CompositeAdapterMissing
  })

const guard = <Adapters extends AdapterRecord>(
  options: RouterOptions<Adapters>,
  context: GuardContext<keyof Adapters>
): Effect.Effect<void> => (options.guard ? options.guard(context) : Effect.void)

const delegate = <Adapters extends AdapterRecord, A>(
  adapters: Map<keyof Adapters, AdapterConfig>,
  options: RouterOptions<Adapters>,
  namespace: Namespace,
  name: string,
  operation: GuardContext<keyof Adapters>["operation"],
  f: (bag: AttributeBag.Service) => Effect.Effect<A>
): Effect.Effect<A> =>
  Effect.flatMap(resolveAdapter(adapters, options, namespace, name), ([key, bag]) =>
    Effect.flatMap(
      guard(options, {
        adapter: key,
        namespace,
        name,
        operation,
        capabilities: adapters.get(key)?.capabilities
      }),
      () => f(bag)
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
): Effect.Effect<AttributeBag.Service> =>
  Effect.sync(() => {
    const adapters = adapterTable(options)

    return {
      get: (namespace, name) => delegate(adapters, options, namespace, name, "get", (bag) => bag.get(namespace, name)),
      has: (namespace, name) => delegate(adapters, options, namespace, name, "has", (bag) => bag.has(namespace, name)),
      set: (namespace, name, value) =>
        delegate(adapters, options, namespace, name, "set", (bag) => bag.set(namespace, name, value)),
      delete: (namespace, name) =>
        delegate(adapters, options, namespace, name, "delete", (bag) => bag.delete(namespace, name)),
      entries: () => entriesFromAll(adapters, options),
      snapshot: () => Effect.map(entriesFromAll(adapters, options), AttributeBag.viewFromEntries),
      refresh: () => refreshAll(adapters)
    }
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
