import * as Fs from "@effect/platform/FileSystem"
import { assert, describe, expect, it } from "@effect/vitest"
import { pipe } from "effect"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Stream from "effect/Stream"
import * as ExpoFileSystem from "../src/ExpoFileSystem"

const runPromise = <E, A>(self: Effect.Effect<A, E, Fs.FileSystem>) =>
  Effect.runPromise(
    Effect.provide(self, ExpoFileSystem.layer)
  )

describe("ExpoFileSystem", () => {
  describe("Basic operations", () => {
    it("readFile", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        // Create a temp file to test with
        const path = yield* fs.makeTempFile()
        const testData = "lorem ipsum dolar sit amet"
        yield* fs.writeFile(path, new TextEncoder().encode(testData))

        const data = yield* fs.readFile(path)
        const text = new TextDecoder().decode(data)
        expect(text).toEqual(testData)
      })))

    it("writeFile", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const path = yield* fs.makeTempFile()
        const testData = "hello world"

        yield* fs.writeFile(path, new TextEncoder().encode(testData))
        const data = yield* fs.readFile(path)
        const text = new TextDecoder().decode(data)
        expect(text).toEqual(testData)
      })))

    it("writeFileString", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const path = yield* fs.makeTempFile()
        const testData = "hello world with string"

        yield* fs.writeFileString(path, testData)
        const text = yield* fs.readFileString(path)
        expect(text).toEqual(testData)
      })))

    it("exists", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const path = yield* fs.makeTempFile()

        const exists = yield* fs.exists(path)
        expect(exists).toBe(true)

        const notExists = yield* fs.exists("/nonexistent/path/file.txt")
        expect(notExists).toBe(false)
      })))

    it("remove", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const path = yield* fs.makeTempFile()

        yield* fs.writeFileString(path, "test content")
        const existsBefore = yield* fs.exists(path)
        expect(existsBefore).toBe(true)

        yield* fs.remove(path)
        const existsAfter = yield* fs.exists(path)
        expect(existsAfter).toBe(false)
      })))

    it("rename", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const oldPath = yield* fs.makeTempFile()
        const newPath = oldPath + ".renamed"
        const testData = "rename test"

        yield* fs.writeFileString(oldPath, testData)
        yield* fs.rename(oldPath, newPath)

        const oldExists = yield* fs.exists(oldPath)
        expect(oldExists).toBe(false)

        const newExists = yield* fs.exists(newPath)
        expect(newExists).toBe(true)

        const content = yield* fs.readFileString(newPath)
        expect(content).toEqual(testData)

        // Cleanup
        yield* fs.remove(newPath)
      })))

    it("copy", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const sourcePath = yield* fs.makeTempFile()
        const destPath = sourcePath + ".copy"
        const testData = "copy test"

        yield* fs.writeFileString(sourcePath, testData)
        yield* fs.copy(sourcePath, destPath)

        const sourceExists = yield* fs.exists(sourcePath)
        expect(sourceExists).toBe(true)

        const destExists = yield* fs.exists(destPath)
        expect(destExists).toBe(true)

        const content = yield* fs.readFileString(destPath)
        expect(content).toEqual(testData)

        // Cleanup
        yield* fs.remove(destPath)
      })))

    it("stat", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const path = yield* fs.makeTempFile()
        const testData = "stat test content"

        yield* fs.writeFileString(path, testData)
        const stat = yield* fs.stat(path)

        expect(stat.type).toEqual("File")
        expect(stat.size).toEqual(Fs.Size(testData.length))
      })))

    it("truncate", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const file = yield* fs.makeTempFile()

        const text = "hello world"
        yield* fs.writeFile(file, new TextEncoder().encode(text))

        const before = yield* pipe(fs.readFile(file), Effect.map((_) => new TextDecoder().decode(_)))
        expect(before).toEqual(text)

        yield* fs.truncate(file)

        const after = yield* pipe(fs.readFile(file), Effect.map((_) => new TextDecoder().decode(_)))
        expect(after).toEqual("")
      })))
  })

  describe("Directory operations", () => {
    it("makeDirectory", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const tempDir = yield* fs.makeTempDirectory()
        const newDir = `${tempDir}/testdir`

        yield* fs.makeDirectory(newDir)
        const exists = yield* fs.exists(newDir)
        expect(exists).toBe(true)

        const stat = yield* fs.stat(newDir)
        expect(stat.type).toEqual("Directory")
      })))

    it("readDirectory", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const tempDir = yield* fs.makeTempDirectory()

        // Create test files
        yield* fs.writeFileString(`${tempDir}/file1.txt`, "content1")
        yield* fs.writeFileString(`${tempDir}/file2.txt`, "content2")
        yield* fs.makeDirectory(`${tempDir}/subdir`)

        const entries = yield* fs.readDirectory(tempDir)
        const names = entries.map((e) => e[0]).sort()

        expect(names).toContain("file1.txt")
        expect(names).toContain("file2.txt")
        expect(names).toContain("subdir")
      })))

    it("makeTempDirectory", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        let dir = ""
        yield* pipe(
          Effect.gen(function*() {
            dir = yield* fs.makeTempDirectory()
            const stat = yield* fs.stat(dir)
            expect(stat.type).toEqual("Directory")
          }),
          Effect.scoped
        )
        const stat = yield* fs.stat(dir)
        expect(stat.type).toEqual("Directory")
      })))

    it("makeTempDirectoryScoped", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        let dir = ""
        yield* pipe(
          Effect.gen(function*() {
            dir = yield* fs.makeTempDirectoryScoped()
            const stat = yield* fs.stat(dir)
            expect(stat.type).toEqual("Directory")
          }),
          Effect.scoped
        )
        const error = yield* Effect.flip(fs.stat(dir))
        assert(error._tag === "SystemError" && error.reason === "NotFound")
      })))
  })

  describe("File handles", () => {
    it("should track the cursor position when reading", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem

        yield* pipe(
          Effect.gen(function*() {
            let text: string
            const path = yield* fs.makeTempFileScoped()
            const testContent = "lorem ipsum dolar sit amet"
            yield* fs.writeFileString(path, testContent)

            const file = yield* fs.open(path)

            text = yield* pipe(
              Effect.flatten(file.readAlloc(Fs.Size(5))),
              Effect.map((_) => new TextDecoder().decode(_))
            )
            expect(text).toBe("lorem")

            yield* file.seek(Fs.Size(7), "current")
            text = yield* pipe(
              Effect.flatten(file.readAlloc(Fs.Size(5))),
              Effect.map((_) => new TextDecoder().decode(_))
            )
            expect(text).toBe("dolar")

            yield* file.seek(Fs.Size(1), "current")
            text = yield* pipe(
              Effect.flatten(file.readAlloc(Fs.Size(8))),
              Effect.map((_) => new TextDecoder().decode(_))
            )
            expect(text).toBe("sit amet")

            yield* file.seek(Fs.Size(0), "start")
            text = yield* pipe(
              Effect.flatten(file.readAlloc(Fs.Size(11))),
              Effect.map((_) => new TextDecoder().decode(_))
            )
            expect(text).toBe("lorem ipsum")
          }),
          Effect.scoped
        )
      })))

    it("should track the cursor position when writing", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem

        yield* pipe(
          Effect.gen(function*() {
            let text: string
            const path = yield* fs.makeTempFileScoped()
            const file = yield* fs.open(path, { flag: "w+" })

            yield* file.write(new TextEncoder().encode("lorem ipsum"))
            yield* file.write(new TextEncoder().encode(" "))
            yield* file.write(new TextEncoder().encode("dolor sit amet"))
            text = yield* fs.readFileString(path)
            expect(text).toBe("lorem ipsum dolor sit amet")

            yield* file.seek(Fs.Size(-4), "current")
            yield* file.write(new TextEncoder().encode("hello world"))
            text = yield* fs.readFileString(path)
            expect(text).toBe("lorem ipsum dolor sit hello world")

            yield* file.seek(Fs.Size(6), "start")
            yield* file.write(new TextEncoder().encode("blabl"))
            text = yield* fs.readFileString(path)
            expect(text).toBe("lorem blabl dolor sit hello world")
          }),
          Effect.scoped
        )
      })))
  })

  describe("Streaming", () => {
    it("should stream file content", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const path = yield* fs.makeTempFile()
        const testData = "streaming test content"

        yield* fs.writeFileString(path, testData)

        const content = yield* pipe(
          fs.stream(path),
          Stream.map((_) => new TextDecoder().decode(_)),
          Stream.runCollect,
          Effect.map(Chunk.join(""))
        )

        expect(content).toEqual(testData)
      })))

    it("should stream with offset and bytesToRead", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const path = yield* fs.makeTempFile()
        const testData = "lorem ipsum dolar sit amet"

        yield* fs.writeFileString(path, testData)

        const content = yield* pipe(
          fs.stream(path, { offset: Fs.Size(6), bytesToRead: Fs.Size(5) }),
          Stream.map((_) => new TextDecoder().decode(_)),
          Stream.runCollect,
          Effect.map(Chunk.join(""))
        )

        expect(content).toBe("ipsum")
      })))

    it("should sink to file", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const path = yield* fs.makeTempFile()

        const data = ["hello", " ", "world", " ", "from", " ", "stream"]
        yield* pipe(
          Stream.fromIterable(data),
          Stream.map((s) => new TextEncoder().encode(s)),
          Stream.run(fs.sink(path))
        )

        const content = yield* fs.readFileString(path)
        expect(content).toEqual("hello world from stream")
      })))
  })

  describe("Watch", () => {
    it("should accept recursive option", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem

        yield* Effect.scoped(Effect.gen(function*() {
          const dir = yield* fs.makeTempDirectoryScoped()

          // Test that watch accepts no options
          const fiber1 = yield* fs.watch(dir).pipe(
            Stream.runDrain,
            Effect.fork
          )
          yield* Fiber.interrupt(fiber1)

          // Test that watch accepts recursive: true
          const fiber2 = yield* fs.watch(dir, { recursive: true }).pipe(
            Stream.runDrain,
            Effect.fork
          )
          yield* Fiber.interrupt(fiber2)

          // Test that watch accepts recursive: false
          const fiber3 = yield* fs.watch(dir, { recursive: false }).pipe(
            Stream.runDrain,
            Effect.fork
          )
          yield* Fiber.interrupt(fiber3)
        }))
      })))
  })

  describe("Error handling", () => {
    it("should handle file not found", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        const error = yield* Effect.flip(fs.readFile("/nonexistent/file.txt"))
        assert(error._tag === "SystemError" && error.reason === "NotFound")
      })))

    it("should handle permission errors", () =>
      runPromise(Effect.gen(function*() {
        const fs = yield* Fs.FileSystem
        // Try to write to a read-only location
        const error = yield* Effect.flip(fs.writeFileString("/system/protected.txt", "test"))
        assert(error._tag === "SystemError" && (error.reason === "PermissionDenied" || error.reason === "NotFound"))
      })))
  })
})
