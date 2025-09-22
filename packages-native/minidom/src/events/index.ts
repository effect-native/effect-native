/**
 * @since 1.0.0
 */
import * as Reactivity from "@effect/experimental/Reactivity"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
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
  readonly stream: <A, E, R>(keys: EventKeys, effect: Effect.Effect<A, E, R>) => Stream.Stream<A, E, Exclude<R, Scope.Scope>>
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

const isEventKeyRecord = (u: unknown): u is Readonly<Record<string, ReadonlyArray<unknown>>> => {
  if (typeof u !== "object" || u === null || Array.isArray(u)) {
    return false
  }
  for (const value of Object.values(u)) {
    if (!Array.isArray(value)) {
      return false
    }
  }
  return true
}

const isEventKeys = (u: unknown): u is EventKeys => Array.isArray(u) || isEventKeyRecord(u)

/**
 * @since 1.0.0
 * @category combinators
 */
export function mutation(keys: EventKeys): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | Tag>
export function mutation<A, E, R>(effect: Effect.Effect<A, E, R>, keys: EventKeys): Effect.Effect<A, E, R | Tag>
export function mutation<A, E, R>(
  arg1: EventKeys | Effect.Effect<A, E, R>,
  arg2?: EventKeys
): Effect.Effect<A, E, R | Tag> | (<X, EX, RX>(effect: Effect.Effect<X, EX, RX>) => Effect.Effect<X, EX, RX | Tag>) {
  if (arg2 === undefined) {
    const keys = arg1 as EventKeys
    return (effect) => mutationImpl(effect, keys)
  }
  if (isEventKeys(arg1)) {
    return mutationImpl(arg2 as Effect.Effect<A, E, R>, arg1)
  }
  return mutationImpl(arg1 as Effect.Effect<A, E, R>, arg2 as EventKeys)
}

/**
 * @since 1.0.0
 * @category combinators
 */
export function query(keys: EventKeys): <A, E, R>(
  effect: Effect.Effect<A, E, R>
) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Tag>
export function query<A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: EventKeys
): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Tag>
export function query<A, E, R>(
  arg1: EventKeys | Effect.Effect<A, E, R>,
  arg2?: EventKeys
): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Tag> | (<X, EX, RX>(
  effect: Effect.Effect<X, EX, RX>
) => Effect.Effect<Mailbox.ReadonlyMailbox<X, EX>, never, RX | Scope.Scope | Tag>) {
  if (arg2 === undefined) {
    const keys = arg1 as EventKeys
    return (effect) => queryImpl(effect, keys)
  }
  if (isEventKeys(arg1)) {
    return queryImpl(arg2 as Effect.Effect<A, E, R>, arg1)
  }
  return queryImpl(arg1 as Effect.Effect<A, E, R>, arg2 as EventKeys)
}

/**
 * @since 1.0.0
 * @category combinators
 */
export function stream(keys: EventKeys): <A, E, R>(effect: Effect.Effect<A, E, R>) => Stream.Stream<A, E, Exclude<R, Scope.Scope> | Tag>
export function stream<A, E, R>(effect: Effect.Effect<A, E, R>, keys: EventKeys): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Tag>
export function stream<A, E, R>(
  arg1: EventKeys | Effect.Effect<A, E, R>,
  arg2?: EventKeys
): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Tag> | (<X, EX, RX>(
  effect: Effect.Effect<X, EX, RX>
) => Stream.Stream<X, EX, Exclude<RX, Scope.Scope> | Tag>) {
  if (arg2 === undefined) {
    const keys = arg1 as EventKeys
    return (effect) => streamImpl(effect, keys)
  }
  if (isEventKeys(arg1)) {
    return streamImpl(arg2 as Effect.Effect<A, E, R>, arg1)
  }
  return streamImpl(arg1 as Effect.Effect<A, E, R>, arg2 as EventKeys)
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const invalidate = (keys: EventKeys): Effect.Effect<void> =>
  Effect.flatMap(Tag, (service) => service.invalidate(keys))

/**
 * @since 1.0.0
 * @category combinators
 */
export const unsafeInvalidate = (keys: EventKeys): Effect.Effect<void> =>
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
