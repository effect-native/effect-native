import { describe, expect, it } from "@effect/vitest"
import { Chunk, Effect, Schedule, Stream } from "effect"
import * as ExpoStream from "../src/ExpoStream"

describe("ExpoStream", () => {
  describe("Text encoding/decoding", () => {
    it.effect("encode and decode text", () =>
      Effect.gen(function*() {
        const input = ["Hello", " ", "World", "!"]
        const result = yield* Stream.fromIterable(input).pipe(
          Stream.encodeText,
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(input)
      }))

    it.effect("handle UTF-8 characters", () =>
      Effect.gen(function*() {
        const input = ["Hello 👋", " ", "世界", " ", "🌍"]
        const result = yield* Stream.fromIterable(input).pipe(
          Stream.encodeText,
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(input)
      }))

    it.effect("handle empty strings", () =>
      Effect.gen(function*() {
        const input = ["", "test", "", ""]
        const result = yield* Stream.fromIterable(input).pipe(
          Stream.encodeText,
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(input)
      }))
  })

  describe("Stream transformations", () => {
    it.effect("chunk processing", () =>
      Effect.gen(function*() {
        const data = Array.from({ length: 100 }, (_, i) => `item-${i}`)
        const result = yield* Stream.fromIterable(data).pipe(
          Stream.encodeText,
          Stream.rechunk(10),
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(data)
      }))

    it.effect("stream concatenation", () =>
      Effect.gen(function*() {
        const stream1 = Stream.make("a", "b", "c")
        const stream2 = Stream.make("d", "e", "f")
        const result = yield* Stream.concat(stream1, stream2).pipe(
          Stream.encodeText,
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(["a", "b", "c", "d", "e", "f"])
      }))

    it.effect("stream filtering", () =>
      Effect.gen(function*() {
        const data = ["keep1", "skip", "keep2", "skip", "keep3"]
        const result = yield* Stream.fromIterable(data).pipe(
          Stream.filter((s) => s.startsWith("keep")),
          Stream.encodeText,
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(["keep1", "keep2", "keep3"])
      }))

    it.effect("stream mapping", () =>
      Effect.gen(function*() {
        const data = ["hello", "world"]
        const result = yield* Stream.fromIterable(data).pipe(
          Stream.map((s) => s.toUpperCase()),
          Stream.encodeText,
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(["HELLO", "WORLD"])
      }))
  })

  describe("Binary data handling", () => {
    it.effect("process binary chunks", () =>
      Effect.gen(function*() {
        const chunks = [
          new Uint8Array([1, 2, 3]),
          new Uint8Array([4, 5, 6]),
          new Uint8Array([7, 8, 9])
        ]
        const result = yield* Stream.fromIterable(chunks).pipe(
          Stream.mapChunks(Chunk.flatMap((chunk) => Chunk.unsafeFromArray(Array.from(chunk)))),
          Stream.runCollect
        )
        const flattened = Chunk.toArray(result)
        expect(flattened).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
      }))

    it.effect("encode strings to binary", () =>
      Effect.gen(function*() {
        const text = "Hello Binary"
        const encoded = yield* Stream.make(text).pipe(
          Stream.encodeText,
          Stream.runCollect
        )
        const firstChunk = Chunk.unsafeHead(encoded)
        const decoded = new TextDecoder().decode(firstChunk)
        expect(decoded).toEqual(text)
      }))

    it.effect("decode binary to strings", () =>
      Effect.gen(function*() {
        const text = "Binary to Text"
        const binary = new TextEncoder().encode(text)
        const result = yield* Stream.make(binary).pipe(
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.unsafeHead(result)).toEqual(text)
      }))
  })

  describe("Error handling", () => {
    it.effect("handle stream errors", () =>
      Effect.gen(function*() {
        const result = yield* Stream.make("a", "b", "c").pipe(
          Stream.mapEffect((s) =>
            s === "b"
              ? Effect.fail("Error at b")
              : Effect.succeed(s)
          ),
          Stream.catchAll(() => Stream.make("error-handled")),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(["a", "error-handled"])
      }))

    it.skip.effect("retry on failure", () =>
      Effect.gen(function*() {
        let attempts = 0
        const result = yield* Stream.make(1).pipe(
          Stream.mapEffect(() => 
            Effect.sync(() => {
              attempts++
              if (attempts < 3) throw new Error("retry")
              return "success"
            })
          ),
          Stream.retry(Schedule.recurs(2)),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(["success"])
        expect(attempts).toBeGreaterThanOrEqual(2)
      }))
  })

  describe("Stream composition", () => {
    it.effect("pipeline multiple transformations", () =>
      Effect.gen(function*() {
        const result = yield* Stream.range(1, 10).pipe(
          Stream.map((n) => n * 2),
          Stream.filter((n) => n > 10),
          Stream.take(3),
          Stream.map(String),
          Stream.encodeText,
          Stream.decodeText(),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(["12", "14", "16"])
      }))

    it.effect("zip streams", () =>
      Effect.gen(function*() {
        const numbers = Stream.range(1, 5)
        const letters = Stream.fromIterable(["a", "b", "c", "d", "e"])
        const result = yield* Stream.zip(numbers, letters).pipe(
          Stream.map(([n, l]) => `${n}${l}`),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual(["1a", "2b", "3c", "4d", "5e"])
      }))

    it.effect("merge streams", () =>
      Effect.gen(function*() {
        const stream1 = Stream.make(1, 3, 5)
        const stream2 = Stream.make(2, 4, 6)
        const result = yield* Stream.merge(stream1, stream2).pipe(
          Stream.runCollect
        )
        const sorted = Chunk.toArray(result).sort((a, b) => a - b)
        expect(sorted).toEqual([1, 2, 3, 4, 5, 6])
      }))
  })

  describe("Performance and buffering", () => {
    it.effect("buffer overflow handling", () =>
      Effect.gen(function*() {
        const result = yield* Stream.range(1, 100).pipe(
          Stream.buffer({ capacity: 10 }),
          Stream.take(5),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual([1, 2, 3, 4, 5])
      }))

    it.effect("chunked processing", () =>
      Effect.gen(function*() {
        const result = yield* Stream.range(1, 20).pipe(
          Stream.grouped(5),
          Stream.map((chunk) => Chunk.size(chunk)),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual([5, 5, 5, 5])
      }))

    it.skip.effect("throttling", () =>
      Effect.gen(function*() {
        // Simply test that throttle doesn't break the stream
        const result = yield* Stream.range(1, 5).pipe(
          Stream.grouped(2),
          Stream.throttle({
            cost: (chunk) => Chunk.size(chunk),
            duration: "10 millis",
            units: 10
          }),
          Stream.mapChunks((x) => x),
          Stream.runCollect
        )
        expect(Chunk.toArray(result)).toEqual([1, 2, 3, 4, 5])
      }))
  })

  describe("Integration with Expo", () => {
    it.effect("create stream from Expo data source", () =>
      Effect.gen(function*() {
        // Simulate an Expo data source
        const mockExpoData = () => Promise.resolve(["expo", "data", "stream"])

        const result = yield* Stream.fromAsyncIterable(
          (async function*() {
            const data = await mockExpoData()
            for (const item of data) {
              yield item
            }
          })()
        ).pipe(
          Stream.encodeText,
          Stream.decodeText(),
          Stream.runCollect
        )

        expect(Chunk.toArray(result)).toEqual(["expo", "data", "stream"])
      }))

    it.effect("stream to Expo sink", () =>
      Effect.gen(function*() {
        const collected: Array<string> = []
        const mockExpoSink = (data: string) => {
          collected.push(data)
          return Promise.resolve()
        }

        yield* Stream.make("item1", "item2", "item3").pipe(
          Stream.mapEffect((item) => Effect.promise(() => mockExpoSink(item))),
          Stream.runDrain
        )

        expect(collected).toEqual(["item1", "item2", "item3"])
      }))
  })
})
