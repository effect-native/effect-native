/**
 * @since 1.0.0
 */
import type * as PlatformError from "@effect/platform/Error"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromReadableStream = <E = PlatformError.PlatformError>(
  stream: () => ReadableStream<Uint8Array>,
  onError: (error: unknown) => E
): Stream.Stream<Uint8Array, E> =>
  Stream.asyncScoped<Uint8Array, E>((emit) =>
    Effect.gen(function*() {
      const reader = stream().getReader()

      yield* Effect.addFinalizer(() => Effect.promise(() => reader.cancel()))

      const read = (): Effect.Effect<void> =>
        Effect.tryPromise({
          try: () => reader.read(),
          catch: onError
        }).pipe(
          Effect.flatMap((result) =>
            result.done
              ? Effect.fail(Option.none())
              : Effect.succeed(Chunk.of(result.value))
          ),
          Effect.flatMap((chunk) => emit(Stream.fromChunk(chunk))),
          Effect.flatMap(() => read())
        )

      yield* read()
    })
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const toReadableStream = <E>(
  stream: Stream.Stream<Uint8Array, E>
): Effect.Effect<ReadableStream<Uint8Array>, E> =>
  Effect.map(
    Stream.toReadableStream(stream),
    (stream) => stream as ReadableStream<Uint8Array>
  )
