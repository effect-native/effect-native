import * as OR from "@openrouter/sdk"
import { Config, Effect, Layer, Schema, Stream } from "effect"

export class OpenRouterError extends Schema.TaggedError<OpenRouterError>()("OpenRouterError", {
  message: Schema.String,
  cause: Schema.Defect.pipe(Schema.optional)
}) {}

export class OpenRouterClientConfig
  extends Effect.Service<OpenRouterClientConfig>()("@effect-native/openrouter/OpenRouterClientConfig", {
    effect: Effect.gen(function*() {
      const apiKey = yield* Config.string("OPENROUTER_API_KEY")
      const serverURL = yield* Config.string("OPENROUTER_BASE_URL").pipe(
        Config.withDefault("https://openrouter.ai/api/v1")
      )
      return { apiKey, serverURL } as OR.SDKOptions
    })
  })
{
  static layer = (config: OR.SDKOptions) =>
    Layer.succeed(
      OpenRouterClientConfig, //
      OpenRouterClientConfig.make(config)
    )
}

export class OpenRouter extends Effect.Service<OpenRouter>()("@effect-native/openrouter/OpenRouter", {
  dependencies: [OpenRouterClientConfig.Default],
  effect: Effect.gen(function*() {
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

    return {
      client: openrouter,
      callModel
    } as const
  })
}) {
  static layer = (config: OR.SDKOptions) =>
    OpenRouter.DefaultWithoutDependencies.pipe(Layer.provideMerge(OpenRouterClientConfig.layer(config)))
}
