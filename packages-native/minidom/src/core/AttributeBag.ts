/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"

import type { Namespace } from "./Namespace.js"
import { Namespace as NamespaceHelpers } from "./Namespace.js"

/**
 * @since 1.0.0
 * @category types
 */
export type AttributeEntry = readonly [namespace: Namespace, name: string, value: string]

const toEntry = (namespace: Namespace, name: string, value: string): AttributeEntry => [namespace, name, value]

const copyEntry = ([namespace, name, value]: AttributeEntry): AttributeEntry => [namespace, name, value]

/**
 * @since 1.0.0
 * @category model
 */
export interface View {
  readonly size: number
  readonly get: (namespace: Namespace, name: string) => Option.Option<string>
  readonly has: (namespace: Namespace, name: string) => boolean
  readonly entries: () => Iterable<AttributeEntry>
}

/**
 * @since 1.0.0
 * @category model
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
 * @since 1.0.0
 * @category tags
 */
export class Tag extends Context.Tag("@effect-native/minidom/AttributeBag/Service")<Tag, Service>() {}

/**
 * @since 1.0.0
 * @category layers
 */
export const layer = (options?: { readonly initial?: Iterable<AttributeEntry> }) =>
  Layer.effect(Tag, Effect.sync(() => service(options)))

/**
 * @since 1.0.0
 * @category constructors
 */
export const asyncService = (options?: {
  readonly initial?: Iterable<AttributeEntry>
  readonly scheduler?: (task: () => void) => void
  readonly loadInitial?: () => Effect.Effect<Iterable<AttributeEntry>>
}): Service => {
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

  return {
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
      })
  }
}

/**
 * @since 1.0.0
 * @category layers
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
 * @since 1.0.0
 * @category constructors
 */
export const viewFromEntries = (entries: Iterable<AttributeEntry>): View => {
  const list = Array.from(entries, copyEntry)
  return toView(list)
}

/**
 * @since 1.0.0
 * @category constructors
 * @example
 * ```ts
 * import { AttributeBag, Sync } from "@effect-native/minidom"
 * import * as Effect from "effect/Effect"
 * import * as Option from "effect/Option"
 *
 * const program = Effect.gen(function*() {
 *   const bag = AttributeBag.service()
 *   yield* bag.set("http://www.w3.org/1999/xhtml", "class", "hero")
 *   yield* bag.set(null, "id", "root")
 *   const snapshot = yield* bag.snapshot()
 *   return Array.from(snapshot.entries())
 * })
 *
 * const capability = Sync.detect(() => program)
 *
 * if (Option.isSome(capability)) {
 *   const entries = capability.value.run(program)
 *   console.log(entries)
 * }
 * ```
 */
export const service = (options?: { readonly initial?: Iterable<AttributeEntry> }): Service => {
  const store = new Map<string, AttributeEntry>()

  if (options?.initial) {
    for (const [namespace, name, value] of options.initial) {
      store.set(NamespaceHelpers.key(namespace, name), toEntry(namespace, name, value))
    }
  }

  const makeView = (): View => toView(Array.from(store.values(), copyEntry))

  return {
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
    refresh: () => Effect.void
  }
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const refresh = <E>(service: Service<E>): Effect.Effect<void, E> => service.refresh()

/**
 * @since 1.0.0
 * @category exports
 */
export const AttributeBag = {
  Tag,
  layer,
  layerAsync,
  service,
  asyncService,
  refresh,
  viewFromEntries
}
