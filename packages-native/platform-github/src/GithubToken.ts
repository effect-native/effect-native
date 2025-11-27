/**
 * GithubToken service for secure token management.
 *
 * Provides the GitHub token as a `Redacted<string>` for secure handling.
 * The token is automatically sourced from:
 * 1. The `github-token` action input
 * 2. The `GITHUB_TOKEN` environment variable
 *
 * @example
 * ```ts
 * import { GithubToken, ActionClient } from "@effect-native/platform-github"
 * import { Effect, Redacted } from "effect"
 *
 * // In your action, the token is automatically provided
 * const program = Effect.gen(function* () {
 *   // ActionClient uses GithubToken internally
 *   const client = yield* ActionClient.ActionClient
 *   // Or access the token directly if needed
 *   const token = yield* GithubToken.GithubToken
 *   console.log(Redacted.value(token)) // Use carefully!
 * })
 * ```
 *
 * @since 1.0.0
 */
import * as ActionsCore from "@actions/core"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = Symbol.for("@effect-native/platform-github/GithubToken")

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * The GithubToken service provides the GitHub API token.
 *
 * @since 1.0.0
 * @category context
 */
export class GithubToken extends Context.Tag("@effect-native/platform-github/GithubToken")<
  GithubToken,
  Redacted.Redacted<string>
>() {}

/**
 * Layer that reads the GitHub token from the action input or environment.
 *
 * Looks up in order:
 * 1. `github-token` action input (via @actions/core)
 * 2. `GITHUB_TOKEN` environment variable
 *
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<GithubToken> = Layer.effect(
  GithubToken,
  Effect.sync(() => {
    // Get token from action input (via @actions/core) or environment
    // Using core.getInput handles the INPUT_<NAME> env var lookup correctly
    const token = ActionsCore.getInput("github-token") || process.env.GITHUB_TOKEN || ""
    return Redacted.make(token)
  })
)

/**
 * Layer that provides a specific token value.
 *
 * Useful for testing or when you have the token from another source.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerFromString = (token: string): Layer.Layer<GithubToken> =>
  Layer.succeed(GithubToken, Redacted.make(token))

/**
 * Layer that provides a Redacted token value.
 *
 * @since 1.0.0
 * @category layers
 */
export const layerFromRedacted = (token: Redacted.Redacted<string>): Layer.Layer<GithubToken> =>
  Layer.succeed(GithubToken, token)

/**
 * Get the raw token value (unwraps Redacted).
 *
 * Use with care - the returned string is sensitive.
 *
 * @since 1.0.0
 * @category accessors
 */
export const value: Effect.Effect<string, never, GithubToken> = Effect.map(
  GithubToken,
  Redacted.value
)
