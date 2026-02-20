import * as OR from "@openrouter/sdk"
import type { Scope } from "effect"
import { Config, Data, Effect, Layer, ServiceMap, Stream } from "effect"

/** Simple chat completion request (workaround for SDK response validation bug) */
export interface ChatRequest {
  model: string
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
  temperature?: number
  max_tokens?: number
}

/** Simple chat completion response */
export interface ChatResponse {
  id: string
  choices: Array<{
    message: { role: string; content: string }
    finish_reason: string
  }>
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

export class OpenRouterError extends Data.TaggedError("OpenRouterError")<{
  message: string
  cause?: unknown
}> {}

export class OpenRouterClientConfig extends ServiceMap.Service<OpenRouterClientConfig, OR.SDKOptions>()(
  "@effect-native/openrouter/OpenRouterClientConfig"
) {
  static layer = (config: OR.SDKOptions) => Layer.succeed(OpenRouterClientConfig)(config)

  static Default = Layer.effect(
    OpenRouterClientConfig,
    Effect.gen(function*() {
      const apiKey = yield* Config.string("OPENROUTER_API_KEY")
      const serverURL = yield* Config.string("OPENROUTER_BASE_URL").pipe(
        Config.withDefault(() => "https://openrouter.ai/api/v1")
      )
      return { apiKey, serverURL } as OR.SDKOptions
    })
  )
}

/** The shape returned by callModel, wrapping SDK ModelResult streams as Effects */
interface CallModelOutput {
  readonly result: ReturnType<OR.OpenRouter["callModel"]>
  readonly reasoningStream: Effect.Effect<Stream.Stream<string, OpenRouterError>, OpenRouterError>
  readonly newMessagesStream: Effect.Effect<Stream.Stream<unknown, OpenRouterError>, OpenRouterError>
  readonly toolStream: Effect.Effect<Stream.Stream<unknown, OpenRouterError>, OpenRouterError>
  readonly toolCalls: Effect.Effect<ReadonlyArray<unknown>, OpenRouterError>
  readonly toolCallsStream: Effect.Effect<Stream.Stream<unknown, OpenRouterError>, OpenRouterError>
  readonly response: Effect.Effect<unknown, OpenRouterError>
  readonly fullResponsesStream: Effect.Effect<Stream.Stream<unknown, OpenRouterError>, OpenRouterError>
  readonly text: Effect.Effect<string, OpenRouterError>
  readonly textStream: Effect.Effect<Stream.Stream<string, OpenRouterError>, OpenRouterError>
  readonly cancel: Effect.Effect<void, OpenRouterError>
}

interface OpenRouterService {
  readonly client: OR.OpenRouter
  readonly callModel: <const TTools extends ReadonlyArray<OR.Tool>>(
    request: OR.CallModelInput<TTools>
  ) => Effect.Effect<CallModelOutput, OpenRouterError, Scope.Scope>
  readonly chat: (request: ChatRequest) => Effect.Effect<ChatResponse, OpenRouterError>
}

export class OpenRouter
  extends ServiceMap.Service<OpenRouter, OpenRouterService>()("@effect-native/openrouter/OpenRouter")
{
  static DefaultWithoutDependencies = Layer.effect(
    OpenRouter,
    Effect.gen(function*() {
      const config = yield* OpenRouterClientConfig
      const openrouter = yield* Effect.try({
        try: () => new OR.OpenRouter(config),
        catch: (cause) => new OpenRouterError({ message: "Failed to create OpenRouter client", cause })
      })

      const callModel = Effect.fn(function*<const TTools extends ReadonlyArray<OR.Tool>>(
        request: OR.CallModelInput<TTools>
      ) {
        const result = yield* Effect.try({
          try: () => openrouter.callModel(request),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to callModel" })
        })
        yield* Effect.addFinalizer(() => cancel.pipe(Effect.ignore))

        const text = Effect.tryPromise({
          try: () => result.getText(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getText" })
        })
        const response = Effect.tryPromise({
          try: () => result.getResponse(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getResponse" })
        })
        const toolCalls = Effect.tryPromise({
          try: () => result.getToolCalls(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getToolCalls" })
        })
        const cancel = Effect.tryPromise({
          try: () => result.cancel(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to cancel" })
        })

        const fullResponsesStream = Effect.try({
          try: () => result.getFullResponsesStream(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getFullResponsesStream" })
        }).pipe(
          Effect.map((stream) =>
            Stream.fromAsyncIterable(
              stream,
              (cause) => new OpenRouterError({ cause, message: "Error during getFullResponsesStream" })
            )
          )
        )
        const textStream = Effect.try({
          try: () => result.getTextStream(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getTextStream" })
        }).pipe(
          Effect.map((stream) =>
            Stream.fromAsyncIterable(
              stream,
              (cause) => new OpenRouterError({ cause, message: "Error during TextStream" })
            )
          )
        )
        const newMessagesStream = Effect.try({
          try: () => result.getNewMessagesStream(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getNewMessagesStream" })
        }).pipe(
          Effect.map((stream) =>
            Stream.fromAsyncIterable(
              stream,
              (cause) => new OpenRouterError({ cause, message: "Error during NewMessagesStream" })
            )
          )
        )
        const reasoningStream = Effect.try({
          try: () => result.getReasoningStream(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getReasoningStream" })
        }).pipe(
          Effect.map((stream) =>
            Stream.fromAsyncIterable(
              stream,
              (cause) => new OpenRouterError({ cause, message: "Error during ReasoningStream" })
            )
          )
        )
        const toolStream = Effect.try({
          try: () => result.getToolStream(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getToolStream" })
        }).pipe(
          Effect.map((stream) =>
            Stream.fromAsyncIterable(
              stream,
              (cause) => new OpenRouterError({ cause, message: "Error during ToolStream" })
            )
          )
        )
        const toolCallsStream = Effect.try({
          try: () => result.getToolCallsStream(),
          catch: (cause) => new OpenRouterError({ cause, message: "Failed to getToolCallsStream" })
        }).pipe(
          Effect.map((stream) =>
            Stream.fromAsyncIterable(
              stream,
              (cause) => new OpenRouterError({ cause, message: "Error during ToolCallsStream" })
            )
          )
        )

        return {
          result,

          reasoningStream,
          newMessagesStream,

          toolStream,
          toolCalls,
          toolCallsStream,

          response,
          fullResponsesStream,

          text,
          textStream,

          cancel
        } as const
      })

      /** Simple chat completion that bypasses SDK response validation (workaround for SDK bug) */
      const chat = (request: ChatRequest) =>
        Effect.gen(function*() {
          const response = yield* Effect.tryPromise({
            try: () =>
              fetch(`${config.serverURL}/chat/completions`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${config.apiKey}`
                },
                body: JSON.stringify(request)
              }),
            catch: (cause) => new OpenRouterError({ cause, message: "Failed to fetch chat completion" })
          })

          if (!response.ok) {
            const errorText = yield* Effect.tryPromise({
              try: () => response.text(),
              catch: () => new OpenRouterError({ message: "Failed to read error response body" })
            })
            return yield* new OpenRouterError({ message: `OpenRouter API error (${response.status}): ${errorText}` })
          }

          const json = yield* Effect.tryPromise({
            try: () => response.json() as Promise<ChatResponse>,
            catch: (cause) => new OpenRouterError({ cause, message: "Failed to parse response JSON" })
          })

          return json
        })

      return {
        client: openrouter,
        callModel,
        chat
      } as const
    })
  )

  static layer = (config: OR.SDKOptions) =>
    OpenRouter.DefaultWithoutDependencies.pipe(Layer.provideMerge(OpenRouterClientConfig.layer(config)))
}
