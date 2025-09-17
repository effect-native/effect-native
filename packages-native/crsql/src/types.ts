import type * as Effect from "effect/Effect"

export type ExcludeR<Self extends Effect.Effect<any, any, any>, UR> = Self extends
  Effect.Effect<infer A, infer E, infer R> ? Effect.Effect<A, E, Exclude<R, UR>> : never

export type AddR<Self extends Effect.Effect<any, any, any>, UR> = Self extends
  Effect.Effect<infer A, infer E, infer R> ? Effect.Effect<A, E, R | UR> : never
