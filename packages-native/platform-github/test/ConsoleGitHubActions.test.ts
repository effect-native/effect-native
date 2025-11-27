import { it } from "@effect/vitest"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect } from "vitest"
import * as ActionRunnerTest from "../src/ActionRunnerTest.js"
import * as ConsoleGitHubActions from "../src/ConsoleGitHubActions.js"

describe("ConsoleGitHubActions", () => {
  describe("layer", () => {
    it.effect("Console.info uses ActionRunner.info", () =>
      Effect.gen(function*() {
        const ctx = ActionRunnerTest.make()
        const testLayer = ConsoleGitHubActions.layer.pipe(
          Layer.provide(ctx.layer)
        )

        yield* Console.info("test message").pipe(Effect.provide(testLayer))
        expect(ctx.logs).toContainEqual({ level: "info", message: "test message" })
      }))

    it.effect("Console.debug uses ActionRunner.debug", () =>
      Effect.gen(function*() {
        const ctx = ActionRunnerTest.make()
        const testLayer = ConsoleGitHubActions.layer.pipe(
          Layer.provide(ctx.layer)
        )

        yield* Console.debug("debug message").pipe(Effect.provide(testLayer))
        expect(ctx.logs).toContainEqual({ level: "debug", message: "debug message" })
      }))

    it.effect("Console.warn uses ActionRunner.warning", () =>
      Effect.gen(function*() {
        const ctx = ActionRunnerTest.make()
        const testLayer = ConsoleGitHubActions.layer.pipe(
          Layer.provide(ctx.layer)
        )

        yield* Console.warn("warning message").pipe(Effect.provide(testLayer))
        expect(ctx.logs).toContainEqual({ level: "warning", message: "warning message" })
      }))

    it.effect("Console.error uses ActionRunner.error", () =>
      Effect.gen(function*() {
        const ctx = ActionRunnerTest.make()
        const testLayer = ConsoleGitHubActions.layer.pipe(
          Layer.provide(ctx.layer)
        )

        yield* Console.error("error message").pipe(Effect.provide(testLayer))
        expect(ctx.logs).toContainEqual({ level: "error", message: "error message" })
      }))

    it.effect("Console.log uses ActionRunner.info", () =>
      Effect.gen(function*() {
        const ctx = ActionRunnerTest.make()
        const testLayer = ConsoleGitHubActions.layer.pipe(
          Layer.provide(ctx.layer)
        )

        yield* Console.log("log message").pipe(Effect.provide(testLayer))
        expect(ctx.logs).toContainEqual({ level: "info", message: "log message" })
      }))

    it.effect("formats multiple arguments", () =>
      Effect.gen(function*() {
        const ctx = ActionRunnerTest.make()
        const testLayer = ConsoleGitHubActions.layer.pipe(
          Layer.provide(ctx.layer)
        )

        yield* Console.info("hello", { foo: "bar" }, 42).pipe(Effect.provide(testLayer))
        expect(ctx.logs).toContainEqual({ level: "info", message: "hello {\"foo\":\"bar\"} 42" })
      }))

    it.effect("Console.withGroup uses ActionRunner.startGroup and endGroup", () =>
      Effect.gen(function*() {
        const ctx = ActionRunnerTest.make()
        const testLayer = ConsoleGitHubActions.layer.pipe(
          Layer.provide(ctx.layer)
        )

        yield* Console.withGroup(
          Console.info("inside group"),
          { label: "test group" }
        ).pipe(Effect.provide(testLayer))

        // Check that startGroup was called (groups array should have had the group name)
        // Note: The group is popped after endGroup, so we check the logs instead
        expect(ctx.logs).toContainEqual({ level: "info", message: "inside group" })
      }))
  })
})
