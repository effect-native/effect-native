/**
 * Attribute bag services for MiniDom nodes.
 *
 * @since 0.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

import type { Namespace } from "./Namespace.js"
import { Namespace as NamespaceHelpers } from "./Namespace.js"
import * as Transaction from "./TransactionCapability.js"

const StoreSymbol: unique symbol = Symbol.for("@effect-native/minidom/AttributeBag/Store")

/**
 * Tuple representation of a namespaced attribute entry.
 *
 * @since 0.0.0
 * @category types
 * @example
 * ```ts
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const entry: MiniDom.AttributeBag.AttributeEntry = [
 *   "http://www.w3.org/1999/xhtml",
 *   "class",
 *   "hero"
 * ]
 * ```
 */
export type AttributeEntry = readonly [namespace: Namespace, name: string, value: string]

const toEntry = (namespace: Namespace, name: string, value: string): AttributeEntry => [namespace, name, value]

const copyEntry = ([namespace, name, value]: AttributeEntry): AttributeEntry => [namespace, name, value]

/**
 * Immutable view that exposes attribute lookup operations.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 *
 * const view = AttributeBag.viewFromEntries([[null, "id", "root"]])
 * console.log(view.get(null, "id"))
 * ```
 */
export interface View {
  readonly size: number
  readonly get: (namespace: Namespace, name: string) => Option.Option<string>
  readonly has: (namespace: Namespace, name: string) => boolean
  readonly entries: () => Iterable<AttributeEntry>
}

/**
 * Effect-based attribute bag service.
 *
 * @since 0.0.0
 * @category model
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 * import * as Effect from "effect/Effect"
 *
 * const program = Effect.gen(function*() {
 *   const bag = AttributeBag.make()
 *   yield* bag.set(null, "id", "root")
 *   return yield* bag.get(null, "id")
 * })
 * ```
 */
export interface Service<E = never> {
  readonly get: (namespace: Namespace, name: string) => Effect.Effect<Option.Option<string>, E>
  readonly has: (namespace: Namespace, name: string) => Effect.Effect<boolean, E>
  readonly set: (namespace: Namespace, name: string, value: string) => Effect.Effect<void, E>
  readonly delete: (namespace: Namespace, name: string) => Effect.Effect<boolean, E>
  readonly entries: () => Effect.Effect<ReadonlyArray<AttributeEntry>, E>
  readonly snapshot: () => Effect.Effect<View, E>
  readonly refresh: () => Effect.Effect<void, E>
}

/**
 * Context tag for retrieving an {@link AttributeBag.Service} from the environment.
 *
 * @since 0.0.0
 * @category tags
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 * import { Effect } from "effect"
 *
 * const program = AttributeBag.Tag.pipe(
 *   Effect.map((bag) => bag.snapshot())
 * )
 * ```
 */
export class Tag extends Context.Tag("@effect-native/minidom/AttributeBag/Service")<Tag, Service>() {}

/**
 * Layer that provides a synchronous {@link Service} backed by an in-memory map.
 *
 * @since 0.0.0
 * @category layers
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 *
 * const layer = AttributeBag.layer()
 * console.log(typeof layer)
 * ```
 */
export const layer = (options?: { readonly initial?: Iterable<AttributeEntry> }) =>
  Layer.effect(Tag, Effect.sync(() => make(options)))

/**
 * Constructs an asynchronous {@link Service} that lazily loads attributes.
 *
 * The returned service exposes the internal store via a symbol for transaction
 * support.
 *
 * @since 0.0.0
 * @category constructors
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 * import * as Effect from "effect/Effect"
 *
 * const bag = AttributeBag.asyncService({
 *   loadInitial: () => Effect.succeed([[null, "id", "root"]])
 * })
 *
 * Effect.runPromise(bag.refresh())
 * ```
 */
export const asyncService = (options?: {
  readonly initial?: Iterable<AttributeEntry>
  readonly scheduler?: (task: () => void) => void
  readonly loadInitial?: () => Effect.Effect<Iterable<AttributeEntry>>
}): Service & { readonly [StoreSymbol]: Map<string, AttributeEntry> } => {
  const schedule = options?.scheduler ?? ((task: () => void) => {
    setTimeout(task, 0)
  })

  const store = new Map<string, AttributeEntry>()
  let state: "idle" | "loading" | "loaded" = options?.initial ? "loaded" : "idle"
  let pending: Promise<void> | undefined
  const waiters: Array<(effect: Effect.Effect<void>) => void> = []

  if (options?.initial) {
    for (const [namespace, name, value] of options.initial) {
      store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
    }
  }

  const runWaiters = (effect: Effect.Effect<void>) => {
    while (waiters.length > 0) {
      const resume = waiters.shift()!
      resume(effect)
    }
  }

  const triggerLoad = () => {
    if (pending || !options?.loadInitial) {
      return
    }

    state = "loading"
    pending = Promise.resolve()

    schedule(() => {
      const current = Effect.runPromise(options.loadInitial!()).then(
        (entries) => {
          store.clear()
          for (const [namespace, name, value] of entries) {
            store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
          }
          state = "loaded"
          runWaiters(Effect.void)
        },
        (error) => {
          state = "idle"
          runWaiters(Effect.die(error))
          throw error
        }
      ).finally(() => {
        if (pending === current) {
          pending = undefined
        }
      })

      pending = current
    })
  }

  const ensureLoaded = options?.loadInitial
    ? () =>
      Effect.async<void, never, never>((resume) => {
        if (state === "loaded") {
          resume(Effect.void)
          return
        }

        waiters.push(resume)

        if (state === "idle") {
          triggerLoad()
        }
      })
    : () => Effect.void

  const run = <A>(evaluate: () => A): Effect.Effect<A> =>
    Effect.flatMap(ensureLoaded(), () =>
      Effect.async((resume) => {
        schedule(() => {
          resume(Effect.succeed(evaluate()))
        })
      }))

  const makeView = (): View => toView(Array.from(store.values(), copyEntry))

  const service: Service & { readonly [StoreSymbol]: Map<string, AttributeEntry> } = {
    get: (namespace, name) => run(() => Option.fromNullable(store.get(NamespaceHelpers.key(namespace, name))?.[2])),
    has: (namespace, name) => run(() => store.has(NamespaceHelpers.key(namespace, name))),
    set: (namespace, name, value) =>
      run(() => {
        store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
      }),
    delete: (namespace, name) =>
      run(() => store.delete(NamespaceHelpers.key(namespace, name))).pipe(
        Effect.tap((removed) =>
          removed && options?.loadInitial
            ? Effect.sync(() => {
              state = "idle"
              pending = undefined
              triggerLoad()
            })
            : Effect.void
        )
      ),
    entries: () => run(() => Array.from(store.values(), copyEntry)),
    snapshot: () => run(makeView),
    refresh: () =>
      Effect.async<void, never, never>((resume) => {
        waiters.push(resume)
        state = "idle"
        pending = undefined
        triggerLoad()
      }),
    [StoreSymbol]: store
  }

  return service
}

/**
 * Alias for {@link asyncService}; retained for backwards compatibility while providing
 * a more descriptive constructor name.
 *
 * @since 0.0.0
 * @category constructors
 */
export const makeAsync = asyncService

/**
 * Layer that installs the asynchronous attribute bag service into the environment.
 *
 * @since 0.0.0
 * @category layers
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 *
 * const layer = AttributeBag.layerAsync()
 * console.log(typeof layer)
 * ```
 */
export const layerAsync = (options?: {
  readonly initial?: Iterable<AttributeEntry>
  readonly scheduler?: (task: () => void) => void
}) => Layer.effect(Tag, Effect.sync(() => asyncService(options)))

const toView = (entries: ReadonlyArray<AttributeEntry>): View => {
  const index = new Map<string, AttributeEntry>()
  for (const entry of entries) {
    index.set(NamespaceHelpers.key(entry[0], entry[1]), entry)
  }

  return {
    size: entries.length,
    get: (namespace, name) => Option.fromNullable(index.get(NamespaceHelpers.key(namespace, name))?.[2]),
    has: (namespace, name) => index.has(NamespaceHelpers.key(namespace, name)),
    entries: () => entries.map(copyEntry)
  }
}

/**
 * Builds a read-only {@link View} from an attribute entry iterable.
 *
 * @since 0.0.0
 * @category constructors
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 *
 * const view = AttributeBag.viewFromEntries([[null, "role", "banner"]])
 * console.log(view.size) // 1
 * ```
 */
export const viewFromEntries = (entries: Iterable<AttributeEntry>): View => {
  const list = Array.from(entries, copyEntry)
  return toView(list)
}

/**
 * Creates a synchronous attribute bag service backed by an in-memory map.
 *
 * @since 0.0.0
 * @category constructors
 * @example
 * ```ts
 * import { AttributeBag, SyncCapability } from "@effect-native/minidom"
 * import * as Effect from "effect/Effect"
 * import * as Option from "effect/Option"
 *
 * const program = Effect.gen(function*() {
 *   const bag = AttributeBag.make()
 *   yield* bag.set("http://www.w3.org/1999/xhtml", "class", "hero")
 *   yield* bag.set(null, "id", "root")
 *   const snapshot = yield* bag.snapshot()
 *   return Array.from(snapshot.entries())
 * })
 *
 * const capability = SyncCapability.detect(() => program)
 *
 * Option.match(capability, {
 *   onNone: () => {
 *     console.log("adapter did not expose a synchronous capability")
 *   },
 *   onSome: (syncRunner) => {
 *     const entries = syncRunner.run(program)
 *     console.log(entries)
 *   }
 * })
 * ```
 */
export const make = (options?: { readonly initial?: Iterable<AttributeEntry> }): Service & {
  readonly [StoreSymbol]: Map<string, AttributeEntry>
} => {
  const store = new Map<string, AttributeEntry>()

  if (options?.initial) {
    for (const [namespace, name, value] of options.initial) {
      store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
    }
  }

  const makeView = (): View => toView(Array.from(store.values(), copyEntry))

  const service: Service & { readonly [StoreSymbol]: Map<string, AttributeEntry> } = {
    get: (namespace, name) =>
      Effect.sync(() => Option.fromNullable(store.get(NamespaceHelpers.key(namespace, name))?.[2])),
    has: (namespace, name) => Effect.sync(() => store.has(NamespaceHelpers.key(namespace, name))),
    set: (namespace, name, value) =>
      Effect.sync(() => {
        store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
      }),
    delete: (namespace, name) => Effect.sync(() => store.delete(NamespaceHelpers.key(namespace, name))),
    entries: () => Effect.sync(() => Array.from(store.values(), copyEntry)),
    snapshot: () => Effect.sync(makeView),
    refresh: () => Effect.void,
    [StoreSymbol]: store
  }

  return service
}

const hasStore = (
  service: Service
): service is Service & { readonly [StoreSymbol]: Map<string, AttributeEntry> } => StoreSymbol in service

/**
 * Re-runs the service's refresh effect, ensuring async bags reload data.
 *
 * @since 0.0.0
 * @category combinators
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 * import * as Effect from "effect/Effect"
 *
 * const bag = AttributeBag.asyncService()
 * Effect.runPromise(AttributeBag.refresh(bag))
 * ```
 */
export const refresh = <E>(service: Service<E>): Effect.Effect<void, E> => service.refresh()

/**
 * Derives a {@link Transaction.TransactionCapability} capability from an attribute bag service.
 *
 * @since 0.0.0
 * @category capabilities
 * @example
 * ```ts
 * import { AttributeBag, TransactionCapability } from "@effect-native/minidom"
 * import * as Effect from "effect/Effect"
 *
 * const bag = AttributeBag.make({ initial: [[null, "mode", "draft"]] })
 * const capability = AttributeBag.transaction(bag)
 *
 * const program = TransactionCapability.run(capability, Effect.succeed("ok"))
 * ```
 */
export const transaction = (service: Service): Transaction.TransactionCapability => {
  if (!hasStore(service)) {
    return Transaction.unsupported({
      message: "AttributeBag service does not implement transactional semantics"
    })
  }

  const store = service[StoreSymbol]

  return Transaction.make((operation) => {
    const snapshot = new Map(store)

    const restore = Effect.sync(() => {
      store.clear()
      for (const [key, value] of snapshot) {
        store.set(key, value)
      }
    })

    return Effect.tapError(operation, () => restore)
  })
}

/**
 * Namespace export bundling the attribute bag helpers.
 *
 * @since 0.0.0
 * @category exports
 * @example
 * ```ts
 * import { AttributeBag } from "@effect-native/minidom"
 * import * as Effect from "effect/Effect"
 *
 * const bag = AttributeBag.make()
 * Effect.runPromise(bag.entries()).then(console.log)
 * ```
 */
export const AttributeBag = {
  Tag,
  layer,
  layerAsync,
  /** @deprecated Use {@link make} instead. */
  service: make,
  make,
  /** @deprecated Use {@link makeAsync} instead. */
  asyncService,
  makeAsync,
  refresh,
  transaction,
  viewFromEntries
}
