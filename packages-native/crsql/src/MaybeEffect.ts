import { Effect } from "effect"

// TODO: move to a separate package
export type MaybeEffect<A, E = never, R = never> = Effect.Effect<A, E, R> | A
export const MaybeEffect: {
  (self: null | undefined): null
  <A, E = never, R = never>(self: Effect.Effect<A, E, R> | A): Effect.Effect<A, E, R>
} = function() {
  const [self] = arguments
  if (self == null) return null
  return Effect.isEffect(self) ? self : Effect.succeed(self)
} as any
