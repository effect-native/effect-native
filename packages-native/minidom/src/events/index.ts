/**
 * Observation helpers that wrap the Effect Reactivity service for MiniDom.
 *
 * @since 0.0.0
 */
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import * as Layer from "effect/Layer"
import type * as Mailbox from "effect/Mailbox"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

/**
 * Brand that marks MiniDom observation services.
 *
 * @since 0.0.0
 * @category symbols
 * @example
 * ```ts
 * import { Events } from "@effect-native/minidom"
 *
 * const service = { [Events.TypeId]: true } as const
 * console.log(service[Events.TypeId])
 * ```
 */
export const MiniDomEventsTypeId: unique symbol = Symbol.for("@effect-native/minidom/Events")

/**
 * Keys used to distinguish observation channels.
 *
 * @since 0.0.0
 * @category types
 * @example
 * ```ts
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const keys: MiniDom.Events.EventKeys = ["document", "title"]
 * ```
 */
export type EventKeys = ReadonlyArray<unknown> | Readonly<Record<string, ReadonlyArray<unknown>>>

/**
 * Observer service bridging MiniDom and the Effect Reactivity runtime.
 *
 * @since 0.0.0
 * @category model
 */
export interface Service {
  readonly [MiniDomEventsTypeId]: true
  readonly mutation: <A, E, R>(keys: EventKeys, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly query: <A, E, R>(
    keys: EventKeys,
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope>
  readonly stream: <A, E, R>(
    keys: EventKeys,
    effect: Effect.Effect<A, E, R>
  ) => Stream.Stream<A, E, Exclude<R, Scope.Scope>>
  readonly invalidate: (keys: EventKeys) => Effect.Effect<void>
  readonly unsafeInvalidate: (keys: EventKeys) => void
}

/**
 * Context tag for accessing the MiniDom events service.
 *
 * @since 0.0.0
 * @category tags
 * @example
 * ```ts
 * import { Effect } from "effect"
 * import { Events } from "@effect-native/minidom"
 *
 * const program = Events.Tag.pipe(
 *   Effect.map((service) => service.invalidate(["document"]))
 * )
 * ```
 */
export class Tag extends Context.Tag("@effect-native/minidom/Events")<Tag, Service>() {}

const toService = (reactivity: Reactivity.Reactivity.Service): Service => ({
  [MiniDomEventsTypeId]: true,
  mutation: reactivity.mutation,
  query: reactivity.query,
  stream: reactivity.stream,
  invalidate: reactivity.invalidate,
  unsafeInvalidate: reactivity.unsafeInvalidate
})

/**
 * Lifts the Reactivity service into the MiniDom observation interface.
 *
 * @since 0.0.0
 * @category constructors
 * @example
 * ```ts
 * import { Events } from "@effect-native/minidom"
 *
 * const effect = Events.make
 * console.log(typeof effect)
 * ```
 */
export const make = Effect.map(Reactivity.Reactivity, toService)

const coreLayer = Layer.effect(Tag, make)

/**
 * Layer that provisions the MiniDom events service.
 *
 * @since 0.0.0
 * @category layers
 * @example
 * ```ts
 * import { Events } from "@effect-native/minidom"
 *
 * const layer = Events.layer
 * console.log(typeof layer)
 * ```
 */
export const layer = Layer.provideMerge(coreLayer, Reactivity.layer)

const mutationImpl = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
): Effect.Effect<A, E, R | Tag> => Effect.flatMap(Tag, (service) => service.mutation(keys, effect))

const queryImpl = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Tag> =>
  Effect.flatMap(Tag, (service) => service.query(keys, effect))

const streamImpl = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Tag> =>
  Stream.unwrapScoped(Effect.map(Tag, (service) => service.stream(keys, effect)))

/**
 * Wraps a mutation effect so that dependent queries are notified on success.
 *
 * @since 0.0.0
 * @category combinators
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import { Events } from "@effect-native/minidom"
 *
 * const invalidateUsers = Events.mutation(["users"])(
 *   Effect.sync(() => console.log("mutated"))
 * )
 * ```
 */
export const mutation: {
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, E, R>(keys: EventKeys): (
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R | Tag>
  /**
   * Pair form of {@link mutation}.
   *
   * @since 0.0.0
   * @category combinators
   * @example
   * ```ts
   * import * as Effect from "effect/Effect"
   * import { Events } from "@effect-native/minidom"
   *
   * Events.mutation(
   *   Effect.sync(() => console.log("mutated")),
   *   ["users"]
   * )
   * ```
   */
  <A, E, R>(effect: Effect.Effect<A, E, R>, keys: EventKeys): Effect.Effect<A, E, R | Tag>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
) => mutationImpl(effect, keys))

/**
 * Executes an effect as a query and returns a mailbox that streams updates when keys invalidate.
 *
 * @since 0.0.0
 * @category combinators
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import { Events } from "@effect-native/minidom"
 *
 * const mailboxProgram = Events.query(["document"])(Effect.succeed("value"))
 * ```
 */
export const query: {
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, E, R>(keys: EventKeys): (
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Tag>
  /**
   * Pair form of {@link query}.
   *
   * @since 0.0.0
   * @category combinators
   * @example
   * ```ts
   * import * as Effect from "effect/Effect"
   * import { Events } from "@effect-native/minidom"
   *
   * Events.query(
   *   Effect.succeed("value"),
   *   ["document"]
   * )
   * ```
   */
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    keys: EventKeys
  ): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Tag>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
) => queryImpl(effect, keys))

/**
 * Materializes a {@link Stream.Stream} of query results that replays on invalidation.
 *
 * @since 0.0.0
 * @category combinators
 * @example
 * ```ts
 * import * as Effect from "effect/Effect"
 * import * as Stream from "effect/Stream"
 * import { Events } from "@effect-native/minidom"
 *
 * const stream = Events.stream(["document"])(Effect.succeed("value"))
 * ```
 */
export const stream: {
  /**
   * @since 0.0.0
   * @category combinators
   */
  <A, E, R>(keys: EventKeys): (
    effect: Effect.Effect<A, E, R>
  ) => Stream.Stream<A, E, Exclude<R, Scope.Scope> | Tag>
  /**
   * Pair form of {@link stream}.
   *
   * @since 0.0.0
   * @category combinators
   * @example
   * ```ts
   * import * as Effect from "effect/Effect"
   * import * as Stream from "effect/Stream"
   * import { Events } from "@effect-native/minidom"
   *
   * Events.stream(
   *   Effect.succeed("value"),
   *   ["document"]
   * )
   * ```
   */
  <A, E, R>(effect: Effect.Effect<A, E, R>, keys: EventKeys): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Tag>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
) => streamImpl(effect, keys))

/**
 * Invalidates cached query results for the provided keys.
 *
 * @since 0.0.0
 * @category combinators
 * @example
 * ```ts
 * import { Events } from "@effect-native/minidom"
 *
 * const effect = Events.invalidate(["users"])
 * ```
 */
export const invalidate = (keys: EventKeys): Effect.Effect<void, never, Tag> =>
  Effect.flatMap(Tag, (service) => service.invalidate(keys))

/**
 * Synchronously invalidates query results without allocating an effect.
 *
 * @since 0.0.0
 * @category combinators
 * @example
 * ```ts
 * import { Events } from "@effect-native/minidom"
 *
 * const effect = Events.unsafeInvalidate(["users"])
 * ```
 */
export const unsafeInvalidate = (keys: EventKeys): Effect.Effect<void, never, Tag> =>
  Effect.flatMap(Tag, (service) => Effect.sync(() => service.unsafeInvalidate(keys)))

/**
 * Namespace export collecting the observation helpers.
 *
 * @since 0.0.0
 * @category exports
 * @example
 * ```ts
 * import { Events } from "@effect-native/minidom"
 *
 * const layer = Events.layer
 * ```
 */
export const Events = {
  TypeId: MiniDomEventsTypeId,
  Tag,
  make,
  layer,
  mutation,
  query,
  stream,
  invalidate,
  unsafeInvalidate
}

/**
 * Alias for {@link MiniDomEventsTypeId} supporting named imports.
 *
 * @since 0.0.0
 * @category symbols
 */
export const TypeId = MiniDomEventsTypeId
