/**
 * Attribute bag services for MiniDom nodes.
 *
 * @since 0.0.0
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Ref from "effect/Ref"
import * as Runtime from "effect/Runtime"

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
 * High-level error surfaced by attribute bag operations.
 *
 * @since 0.0.0
 * @category errors
 */
export class AttributeBagError extends Data.TaggedError("MiniDom.AttributeBagError")<
  {
    readonly message: string
    readonly cause?: unknown
  }
> {
  constructor(
    { cause, message = "Attribute bag operation failed" }: { readonly message?: string; readonly cause?: unknown } = {}
  ) {
    super({
      message,
      ...(cause !== undefined ? { cause } : {})
    })
  }
}

/**
 * Common interface implemented by AttributeBag services.
 *
 * @since 0.0.0
 * @category model
 */
export interface AttributeBagService {
  readonly get: (namespace: Namespace, name: string) => Effect.Effect<Option.Option<string>, AttributeBagError>
  readonly has: (namespace: Namespace, name: string) => Effect.Effect<boolean, AttributeBagError>
  readonly set: (namespace: Namespace, name: string, value: string) => Effect.Effect<void, AttributeBagError>
  readonly delete: (namespace: Namespace, name: string) => Effect.Effect<boolean, AttributeBagError>
  readonly entries: () => Effect.Effect<ReadonlyArray<AttributeEntry>, AttributeBagError>
  readonly snapshot: () => Effect.Effect<View, AttributeBagError>
  readonly refresh: () => Effect.Effect<void, AttributeBagError>
}

type AttributeBagWithStore = AttributeBagService & {
  readonly [StoreSymbol]: Map<string, AttributeEntry>
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
 *   const bag = AttributeBag.makeSync()
 *   yield* bag.set(null, "id", "root")
 *   return yield* bag.get(null, "id")
 * })
 * ```
 */
export class AttributeBag
  extends Context.Tag("@effect-native/minidom/AttributeBag")<AttributeBag, AttributeBagService>()
{}

/**
 * Layer that provides a synchronous {@link AttributeBag} backed by an in-memory map.
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
  Layer.effect(AttributeBag, Effect.sync(() => makeSync(options)))

/**
 * Constructs an asynchronous {@link AttributeBag} that lazily loads attributes.
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
 * const bag = AttributeBag.makeAsync({
 *   effect: Effect.succeed<ReadonlyArray<readonly [string | null, string, string]>>([
 *     [null, "id", "root"]
 *   ])
 * })
 *
 * Effect.runPromise(bag.refresh())
 * ```
 */
export const makeAsync = <E = never>(options?: {
  readonly effect?: Effect.Effect<Iterable<AttributeEntry>, E, never>
  readonly scheduler?: (task: () => void) => void
}): AttributeBagWithStore => {
  const schedule = options?.scheduler ?? ((task: () => void) => {
    setTimeout(task, 0)
  })
  const store = new Map<string, AttributeEntry>()

  type LoadStatus = "idle" | "loading" | "loaded"
  type LoadState = {
    readonly status: LoadStatus
    readonly currentLoad: Option.Option<Deferred.Deferred<void, AttributeBagError>>
  }

  const makeLoadState = (status: LoadStatus, deferred?: Deferred.Deferred<void, AttributeBagError>): LoadState => ({
    status,
    currentLoad: deferred ? Option.some(deferred) : Option.none<Deferred.Deferred<void, AttributeBagError>>()
  })

  const loadState = Ref.unsafeMake<LoadState>(makeLoadState("idle"))

  const rawLoadEntries: Effect.Effect<Iterable<AttributeEntry>, E, never> = options?.effect
    ?? Effect.succeed<Iterable<AttributeEntry>>([])
  const loadEntries: Effect.Effect<Iterable<AttributeEntry>, AttributeBagError> = rawLoadEntries.pipe(
    Effect.catchAllCause((cause) => Effect.fail(new AttributeBagError({ cause })))
  )

  const installEntries = (entries: Iterable<AttributeEntry>) => {
    store.clear()
    for (const [namespace, name, value] of entries) {
      store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
    }
  }

  const launchLoad = Effect.gen(function*() {
    const deferred = yield* Deferred.make<void, AttributeBagError>()

    const active = yield* Ref.modify(loadState, (state) => {
      if (Option.isSome(state.currentLoad)) {
        return [state.currentLoad.value, state] as const
      }
      return [deferred, makeLoadState("loading", deferred)] as const
    })

    if (active !== deferred) {
      return active
    }

    const runtime = yield* Effect.runtime()

    yield* Effect.sync(() => {
      schedule(() => {
        const effect = loadEntries

        // FIXME: use idiomatic Effect .pipe(...) syntax
        Runtime.runCallback(runtime, effect, {
          onExit: (exit) => {
            if (Exit.isFailure(exit)) {
              Runtime.runFork(
                runtime,
                Deferred.failCause(deferred, exit.cause).pipe(
                  Effect.tap(() => Ref.set(loadState, makeLoadState("idle")))
                )
              )
            } else {
              Runtime.runFork(
                runtime,
                Effect.sync(() => installEntries(exit.value)).pipe(
                  Effect.zipRight(Deferred.succeed(deferred, undefined)),
                  Effect.tap(() => Ref.set(loadState, makeLoadState("loaded")))
                )
              )
            }
          }
        })
      })
    })

    return deferred
  })

  const ensureLoaded = options?.effect
    ? (): Effect.Effect<void, AttributeBagError> =>
      Effect.gen(function*() {
        const state = yield* Ref.get(loadState)
        if (state.status === "loaded") {
          return
        }

        const deferred = yield* launchLoad
        return yield* Deferred.await(deferred)
      })
    : () => Effect.void

  const resetAndTrigger = (): Effect.Effect<void, AttributeBagError> =>
    Effect.gen(function*() {
      yield* Ref.set(loadState, makeLoadState("idle"))
      const deferred = yield* launchLoad
      return yield* Deferred.await(deferred)
    })

  const run = <A>(evaluate: () => A): Effect.Effect<A, AttributeBagError> =>
    Effect.flatMap(
      ensureLoaded(),
      () =>
        Effect.async<A, AttributeBagError>((resume) => {
          try {
            schedule(() => {
              try {
                resume(Effect.succeed(evaluate()))
              } catch (cause) {
                resume(Effect.fail(new AttributeBagError({ cause })))
              }
            })
          } catch (cause) {
            resume(Effect.fail(new AttributeBagError({ cause })))
          }
        })
    )

  const makeView = (): View => toView(Array.from(store.values(), copyEntry))

  const service = AttributeBag.of({
    get: (namespace, name) => run(() => Option.fromNullable(store.get(NamespaceHelpers.key(namespace, name))?.[2])),
    has: (namespace, name) => run(() => store.has(NamespaceHelpers.key(namespace, name))),
    set: (namespace, name, value) =>
      run(() => {
        store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
      }),
    delete: (namespace, name) =>
      run(() => store.delete(NamespaceHelpers.key(namespace, name))).pipe(
        Effect.tap((removed) =>
          removed && options?.effect
            ? Effect.gen(function*() {
              yield* Ref.set(loadState, makeLoadState("idle"))
              yield* launchLoad
            })
            : Effect.void
        )
      ),
    entries: () => run(() => Array.from(store.values(), copyEntry)),
    snapshot: () => run(makeView),
    refresh: () => (options?.effect ? resetAndTrigger() : Effect.void)
  })

  return Object.assign(service, { [StoreSymbol]: store })
}

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
export const layerAsync = <E = never>(options?: {
  readonly effect?: Effect.Effect<Iterable<AttributeEntry>, E, never>
  readonly scheduler?: (task: () => void) => void
}) => Layer.effect(AttributeBag, Effect.sync(() => makeAsync<E>(options)))

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
 *   const bag = AttributeBag.makeSync()
 *   yield* bag.set("http://www.w3.org/1999/xhtml", "class", "hero").pipe(Effect.orDie)
 *   yield* bag.set(null, "id", "root").pipe(Effect.orDie)
 *   const snapshot = yield* bag.snapshot().pipe(Effect.orDie)
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
export const makeSync = (options?: { readonly initial?: Iterable<AttributeEntry> }): AttributeBagWithStore => {
  const store = new Map<string, AttributeEntry>()

  if (options?.initial) {
    for (const [namespace, name, value] of options.initial) {
      store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
    }
  }

  const safeSync = <A>(evaluate: () => A): Effect.Effect<A, AttributeBagError> =>
    Effect.try({
      try: evaluate,
      catch: (cause) => new AttributeBagError({ cause })
    })

  const makeView = () => toView(Array.from(store.values(), copyEntry))

  const service = AttributeBag.of({
    get: (namespace, name) =>
      safeSync(() => Option.fromNullable(store.get(NamespaceHelpers.key(namespace, name))?.[2])),
    has: (namespace, name) => safeSync(() => store.has(NamespaceHelpers.key(namespace, name))),
    set: (namespace, name, value) =>
      safeSync(() => {
        store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
      }),
    delete: (namespace, name) => safeSync(() => store.delete(NamespaceHelpers.key(namespace, name))),
    entries: () => safeSync(() => Array.from(store.values(), copyEntry)),
    snapshot: () => safeSync(makeView),
    refresh: () => Effect.void
  })

  return Object.assign(service, { [StoreSymbol]: store })
}

const hasStore = (
  service: AttributeBagService
): service is AttributeBagWithStore => StoreSymbol in service

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
 * const bag = AttributeBag.makeAsync()
 * Effect.runPromise(AttributeBag.refresh(bag))
 * ```
 */
export const refresh = <E>(service: AttributeBagService<E>) => service.refresh()

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
 * const bag = AttributeBag.makeSync({ initial: [[null, "mode", "draft"]] })
 * const capability = AttributeBag.transaction(bag)
 *
 * const program = TransactionCapability.run(capability, Effect.succeed("ok"))
 * ```
 */
export const transaction = (service: AttributeBagService): Transaction.TransactionCapability => {
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
