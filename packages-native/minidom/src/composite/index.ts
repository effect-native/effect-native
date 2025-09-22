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
}

/**
 * @since 1.0.0
 * @category types
 */
export interface GuardContext<K extends PropertyKey> {
  readonly adapter: K
  readonly namespace: Namespace
  readonly name: string
  readonly operation: "get" | "has" | "set" | "delete"
}

/**
 * @since 1.0.0
 * @category types
 */
export interface RouterOptions<Adapters extends Record<PropertyKey, AdapterConfig>> {
  readonly adapters: Adapters
  readonly resolve: (namespace: Namespace, name: string) => keyof Adapters
  readonly guard?: (context: GuardContext<keyof Adapters>) => Effect.Effect<void>
}

const resolveAdapter = <Adapters extends Record<PropertyKey, AdapterConfig>>(
  options: RouterOptions<Adapters>,
  namespace: Namespace,
  name: string
): Effect.Effect<readonly [keyof Adapters, AttributeBag.Service]> =>
  Effect.sync(() => {
    const key = options.resolve(namespace, name)
    const adapter = options.adapters[key]

    if (!adapter) {
      throw new CompositeAdapterMissing(key)
    }

    return [key, adapter.bag]
  })

const guard = <Adapters extends Record<PropertyKey, AdapterConfig>>(
  options: RouterOptions<Adapters>,
  context: GuardContext<keyof Adapters>
): Effect.Effect<void> => (options.guard ? options.guard(context) : Effect.void)

const delegate = <Adapters extends Record<PropertyKey, AdapterConfig>, A>(
  options: RouterOptions<Adapters>,
  namespace: Namespace,
  name: string,
  operation: GuardContext<keyof Adapters>["operation"],
  f: (bag: AttributeBag.Service) => Effect.Effect<A>
): Effect.Effect<A> =>
  Effect.flatMap(resolveAdapter(options, namespace, name), ([key, bag]) =>
    Effect.flatMap(
      guard(options, { adapter: key, namespace, name, operation }),
      () => f(bag)
    ))

const entriesFromAll = <Adapters extends Record<PropertyKey, AdapterConfig>>(
  options: RouterOptions<Adapters>
): Effect.Effect<ReadonlyArray<AttributeEntry>> =>
  Effect.map(
    Effect.forEach(Object.values(options.adapters), (adapter) => adapter.bag.entries(), {
      concurrency: "unbounded"
    }),
    (entryGroups) => entryGroups.flat()
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeRouter = <Adapters extends Record<PropertyKey, AdapterConfig>>(
  options: RouterOptions<Adapters>
): Effect.Effect<AttributeBag.Service> =>
  Effect.sync(() => ({
    get: (namespace, name) => delegate(options, namespace, name, "get", (bag) => bag.get(namespace, name)),
    has: (namespace, name) => delegate(options, namespace, name, "has", (bag) => bag.has(namespace, name)),
    set: (namespace, name, value) =>
      delegate(options, namespace, name, "set", (bag) => bag.set(namespace, name, value)),
    delete: (namespace, name) => delegate(options, namespace, name, "delete", (bag) => bag.delete(namespace, name)),
    entries: () => entriesFromAll(options),
    snapshot: () => Effect.map(entriesFromAll(options), AttributeBag.viewFromEntries),
    refresh: () => refreshAll(options)
  }))

/**
 * @since 1.0.0
 * @category helpers
 */
export const refreshAll = <Adapters extends Record<PropertyKey, AdapterConfig>>(
  options: RouterOptions<Adapters>
): Effect.Effect<void> =>
  Effect.asVoid(
    Effect.forEach(Object.values(options.adapters), (adapter) => adapter.bag.refresh(), {
      concurrency: "unbounded"
    })
  )
