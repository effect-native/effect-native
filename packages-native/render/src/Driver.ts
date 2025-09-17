import type * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type { ReactNode } from "react"

export interface RenderDriver<Options, Root, E = never, R = never> {
  readonly make: (options: Options) => Effect.Effect<Root, E, Scope.Scope | R>
  readonly render: (root: Root, element: ReactNode) => Effect.Effect<void, E, R>
}

export declare namespace RenderDriver {
  export type Any = RenderDriver<any, any, any, any>
  export type Options<D extends Any> = D extends RenderDriver<infer Options, any, any, any> ? Options : never
  export type Root<D extends Any> = D extends RenderDriver<any, infer Root, any, any> ? Root : never
  export type Error<D extends Any> = D extends RenderDriver<any, any, infer E, any> ? E : never
  export type Environment<D extends Any> = D extends RenderDriver<any, any, any, infer R> ? R : never
}
