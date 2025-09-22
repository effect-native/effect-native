/**
 * @since 1.0.0
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
 * @since 1.0.0
 * @category symbols
 */
export const MiniDomEventsTypeId: unique symbol = Symbol.for("@effect-native/minidom/Events")

/**
 * @since 1.0.0
 * @category types
 */
export type EventKeys = ReadonlyArray<unknown> | Readonly<Record<string, ReadonlyArray<unknown>>>

/**
 * @since 1.0.0
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
 * @since 1.0.0
 * @category tags
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
 * @since 1.0.0
 * @category constructors
 */
export const make = Effect.map(Reactivity.Reactivity, toService)

const coreLayer = Layer.effect(Tag, make)

/**
 * @since 1.0.0
 * @category layers
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
 * @since 1.0.0
 * @category combinators
 */
export const mutation: {
  /**
   * @since 1.0.0
   * @category combinators
   */
  <A, E, R>(keys: EventKeys): (
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<A, E, R | Tag>
  /**
   * @since 1.0.0
   * @category combinators
   */
  <A, E, R>(effect: Effect.Effect<A, E, R>, keys: EventKeys): Effect.Effect<A, E, R | Tag>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
) => mutationImpl(effect, keys))

/**
 * @since 1.0.0
 * @category combinators
 */
export const query: {
  /**
   * @since 1.0.0
   * @category combinators
   */
  <A, E, R>(keys: EventKeys): (
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Tag>
  /**
   * @since 1.0.0
   * @category combinators
   */
  <A, E, R>(effect: Effect.Effect<A, E, R>, keys: EventKeys): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Tag>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
) => queryImpl(effect, keys))

/**
 * @since 1.0.0
 * @category combinators
 */
export const stream: {
  /**
   * @since 1.0.0
   * @category combinators
   */
  <A, E, R>(keys: EventKeys): (
    effect: Effect.Effect<A, E, R>
  ) => Stream.Stream<A, E, Exclude<R, Scope.Scope> | Tag>
  /**
   * @since 1.0.0
   * @category combinators
   */
  <A, E, R>(effect: Effect.Effect<A, E, R>, keys: EventKeys): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Tag>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
) => streamImpl(effect, keys))

/**
 * @since 1.0.0
 * @category combinators
 */
export const invalidate = (keys: EventKeys): Effect.Effect<void, never, Tag> =>
  Effect.flatMap(Tag, (service) => service.invalidate(keys))

/**
 * @since 1.0.0
 * @category combinators
 */
export const unsafeInvalidate = (keys: EventKeys): Effect.Effect<void, never, Tag> =>
  Effect.flatMap(Tag, (service) => Effect.sync(() => service.unsafeInvalidate(keys)))

/**
 * @since 1.0.0
 * @category exports
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
 * @since 1.0.0
 * @category symbols
 */
export const TypeId = MiniDomEventsTypeId
