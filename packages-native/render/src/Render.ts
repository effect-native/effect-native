import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Runtime from "effect/Runtime"
import * as Scope from "effect/Scope"
import type * as React from "react"
import type { RenderDriver } from "./Driver.js"

export interface Render<Driver extends RenderDriver.Any = RenderDriver.Any> {
  readonly driver: Driver
  readonly withRoot: (
    options: RenderDriver.Options<Driver>
  ) => Effect.Effect<
    RenderDriver.Root<Driver>,
    RenderDriver.Error<Driver>,
    Scope.Scope | RenderDriver.Environment<Driver>
  >
  readonly render: (
    root: RenderDriver.Root<Driver>,
    element: React.ReactNode
  ) => Effect.Effect<
    void,
    RenderDriver.Error<Driver>,
    RenderDriver.Environment<Driver>
  >
  readonly event: <Event, E = never, R = never>(
    handler: (event: Event) => Effect.Effect<void, E, R>
  ) => (event: Event) => void
}

export class RenderTag extends Context.Tag("@effect-native/render/Render")<RenderTag, Render>() {}

export const layer = <Driver extends RenderDriver.Any>(
  driver: Driver
): Layer.Layer<Render<Driver>> =>
  Layer.scoped(
    RenderTag,
    Effect.gen(function*() {
      const runtime = (yield* Effect.runtime<RenderDriver.Environment<Driver> | Scope.Scope>()).pipe(
        Runtime.updateContext(Context.omit(Scope.Scope))
      ) as Runtime.Runtime<RenderDriver.Environment<Driver>>
      const runFork = Runtime.runFork(runtime)

      return {
        driver,
        withRoot: (options) =>
          Effect.gen(function*() {
            const scope = yield* Scope.Scope
            return yield* pipe(
              driver.make(options),
              Scope.extend(scope)
            )
          }),
        render: (root, element) => driver.render(root, element),
        event: (handler) => (event) => {
          runFork(handler(event))
        }
      } satisfies Render<Driver>
    })
  )
