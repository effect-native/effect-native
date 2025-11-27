/**
 * @since 1.0.0
 */
import * as github from "@actions/github"
import { GenericTag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Redacted from "effect/Redacted"
import type * as Api from "../ActionClient.js"
import { ActionApiError } from "../ActionError.js"
import * as GithubToken from "../GithubToken.js"

/** @internal */
export const TypeId: Api.TypeId = Symbol.for(
  "@effect-native/platform-github/ActionClient"
) as Api.TypeId

/** @internal */
export const ActionClient = GenericTag<Api.ActionClient>(
  "@effect-native/platform-github/ActionClient"
)

/**
 * Create ActionClient with lazy Octokit initialization.
 *
 * The Octokit client is created on first use, not at layer construction time.
 * This allows actions that don't use the GitHub API to run without a token.
 *
 * @internal
 */
export const make = (token: string): Api.ActionClient => {
  // Lazy initialization - only create octokit when first needed
  let octokit: ReturnType<typeof github.getOctokit> | undefined

  const getOctokit = (): ReturnType<typeof github.getOctokit> => {
    if (!octokit) {
      if (!token) {
        throw new Error(
          "GitHub token is required for API access. " +
            "Provide it via the 'github-token' input or GITHUB_TOKEN environment variable."
        )
      }
      octokit = github.getOctokit(token)
    }
    return octokit
  }

  return {
    [TypeId]: TypeId,

    // Getter that lazily creates the octokit
    get octokit() {
      return getOctokit()
    },

    request: <T>(route: string, options?: Record<string, unknown>) =>
      Effect.tryPromise({
        try: () => getOctokit().request(route, options) as Promise<T>,
        catch: (error) =>
          new ActionApiError({
            method: route,
            status: (error as { status?: number }).status,
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      }),

    graphql: <T>(query: string, variables?: Record<string, unknown>) =>
      Effect.tryPromise({
        try: () => getOctokit().graphql<T>(query, variables),
        catch: (error) =>
          new ActionApiError({
            method: "graphql",
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      }),

    paginate: <T>(route: string, options?: Record<string, unknown>) =>
      Effect.tryPromise({
        try: () => getOctokit().paginate(route, options) as Promise<ReadonlyArray<T>>,
        catch: (error) =>
          new ActionApiError({
            method: route,
            status: (error as { status?: number }).status,
            description: error instanceof Error ? error.message : String(error),
            cause: error
          })
      })
  }
}

/**
 * Layer that creates ActionClient from a raw token string.
 * @internal
 * @deprecated Use `Default` which reads from GithubToken service
 */
export const layer = (token: string) => Layer.succeed(ActionClient, make(token))

/**
 * Default layer that reads token from GithubToken service.
 * @internal
 */
export const Default: Layer.Layer<Api.ActionClient, never, GithubToken.GithubToken> = Layer.effect(
  ActionClient,
  Effect.map(GithubToken.GithubToken, (redactedToken) => make(Redacted.value(redactedToken)))
)
