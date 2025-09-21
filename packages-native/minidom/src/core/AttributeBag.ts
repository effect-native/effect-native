/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
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
export interface Service {
  readonly get: (namespace: Namespace, name: string) => Effect.Effect<Option.Option<string>>
  readonly has: (namespace: Namespace, name: string) => Effect.Effect<boolean>
  readonly set: (namespace: Namespace, name: string, value: string) => Effect.Effect<void>
  readonly delete: (namespace: Namespace, name: string) => Effect.Effect<boolean>
  readonly entries: () => Effect.Effect<ReadonlyArray<AttributeEntry>>
  readonly snapshot: () => Effect.Effect<View>
}

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
    snapshot: () => Effect.sync(makeView)
  }
}

/**
 * @since 1.0.0
 * @category exports
 */
export const AttributeBag = {
  service,
  viewFromEntries
}
