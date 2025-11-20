import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Effect from "effect/Effect"
import { cliLayers, wrpCli } from "./cli.js"

Effect.suspend(() => wrpCli(process.argv)).pipe(
  Effect.tapErrorCause(Effect.logError),
  Effect.provide(cliLayers),
  (effect) => effect,
  NodeRuntime.runMain
)
