import * as Effect from "effect/Effect"

export type MaybeEffect<A, E = never, R = never> = Effect.Effect<A, E, R> | A
export function MaybeEffect(self: null | undefined): null
export function MaybeEffect<A, E = never, R = never>(self: MaybeEffect<A, E, R>): Effect.Effect<A, E, R>
export function MaybeEffect<A, E = never, R = never>(self: MaybeEffect<A, E, R> | null | undefined) {
  if (self == null) {
    return null
  }
  if (Effect.isEffect(self)) {
    return self
  }
  return Effect.succeed(self)
}
