/**
 * Shared wiring for the `effect-native` CLI: command tree, layers, and runtime helpers.
 *
 * The module keeps our ultra extreme programming feedback loops visible in the
 * generated help output and exposes utilities that the entrypoint and tests share.
 *
 * @since 0.0.1
 */
import { NodeServices } from "@effect/platform-node"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Command } from "effect/unstable/cli"
import packageJson from "../package.json" with { type: "json" }

/**
 * Current `effect-native` package version.
 * @since 0.0.1
 */
export const version = packageJson.version as string

const doctorCommand = Command.make("doctor", {}, () =>
  Console.log(
    [
      "doctor checks that your workstation can keep feedback loops tight:",
      "  1. bun install --frozen-lockfile",
      "  2. bun run ok",
      "     (optional) nix develop --command bun run ok"
    ].join("\n")
  )).pipe(
    Command.withDescription(
      "Verify tooling: Effect, Bun, and native deps stay in sync"
    )
  )

/**
 * Root command exposed by the CLI.
 * @since 0.0.1
 */
export const effectNativeCommand = Command.make("effect-native").pipe(
  Command.withDescription(
    [
      `effect-native ${version}`,
      "",
      "Effect Native CLI for ultra extreme programmers",
      "",
      "tight feedback loops keep optimism in check:",
      "  - daily: plan with the customer -> release something tiny",
      "  - hourly: pair -> TDD -> refactor -> CI",
      "  - each change: red -> green -> refactor following the simple design rules",
      "",
      "Guardrails: 5-min build, sustainable pace, collective ownership",
      "",
      "Slice time very thinly so every slice includes discovery, design, implementation, and checks",
      "",
      "uXP activities repeat every slice:",
      "  - figure out what to do",
      "  - figure out the structure that will let us do it",
      "  - implement the features",
      "  - make sure they work as expected"
    ].join("\n")
  ),
  Command.withSubcommands([
    doctorCommand
  ])
)

/**
 * Baseline layer stack required by the CLI.
 * @since 0.0.1
 */
export const MainLayer = Layer.merge(
  NodeServices.layer,
  Layer.empty
)

/**
 * CLI configuration layer (kept for backwards compatibility; no-op in effect v4).
 * @since 0.0.1
 */
export const CliLayer = Layer.empty

/**
 * Fully-configured CLI application ready to interpret explicit args.
 * Uses `Command.runWith` so callers can supply args directly (for tests, etc.).
 * @since 0.0.1
 */
export const cli = Command.runWith(effectNativeCommand, { version })

/**
 * Convenience helper for executing the CLI with the default layer stack.
 * @since 0.0.1
 */
export const run = (args: ReadonlyArray<string>) =>
  Effect.suspend(() => cli(args)).pipe(
    Effect.provide(MainLayer)
  )
