/**
 * @since 0.0.1
 */
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { logDemo, logResult, logSection, withTiming } from "./utils/DemoHelpers.js"

/**
 * @since 0.0.1
 * @category demos
 * @example
 * ```ts
 * import * as FileSystemDemo from "@effect-native/platform-demo/FileSystemDemo"
 * import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 *
 * Effect.provide(
 *   FileSystemDemo.basicOperations,
 *   NodeFileSystem.layer
 * ).pipe(Effect.runPromise)
 * ```
 */
export const basicOperations = Effect.gen(function*() {
  yield* logSection("FileSystem Basic Operations")

  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  yield* logDemo("Write File", "Creating a text file")
  const tempDir = yield* fs.makeTempDirectoryScoped()
  const filePath = path.join(tempDir, "demo.txt")
  yield* fs.writeFileString(filePath, "Hello from @effect/platform!")
  yield* logResult("File created", filePath)

  yield* logDemo("Read File", "Reading the file contents")
  const content = yield* fs.readFileString(filePath)
  yield* logResult("Content", content)

  yield* logDemo("File Stats", "Getting file information")
  const stats = yield* fs.stat(filePath)
  yield* logResult("Size", `${stats.size} bytes`)
  yield* logResult("Is File", stats.type === "File")

  yield* logDemo("Append to File", "Adding more content")
  yield* fs.writeFileString(filePath, "\nAppended line", { flag: "a" })
  const updatedContent = yield* fs.readFileString(filePath)
  yield* logResult("Updated content", updatedContent)

  return { tempDir, filePath }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const directoryOperations = Effect.gen(function*() {
  yield* logSection("Directory Operations")

  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  yield* logDemo("Create Directory", "Making a new directory")
  const tempDir = yield* fs.makeTempDirectoryScoped()
  const subDir = path.join(tempDir, "subdirectory")
  yield* fs.makeDirectory(subDir)
  yield* logResult("Directory created", subDir)

  yield* logDemo("List Directory", "Reading directory contents")
  yield* fs.writeFileString(path.join(tempDir, "file1.txt"), "File 1")
  yield* fs.writeFileString(path.join(tempDir, "file2.txt"), "File 2")
  yield* fs.writeFileString(path.join(subDir, "nested.txt"), "Nested file")

  const entries = yield* fs.readDirectory(tempDir)
  yield* logResult("Directory entries", entries)

  yield* logDemo("Directory Stats", "Checking if path is directory")
  const dirStats = yield* fs.stat(subDir)
  yield* logResult("Is Directory", dirStats.type === "Directory")

  return { tempDir, subDir }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const streamOperations = Effect.gen(function*() {
  yield* logSection("Stream Operations")

  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const tempDir = yield* fs.makeTempDirectoryScoped()
  const largePath = path.join(tempDir, "large.txt")

  yield* logDemo("Stream Write", "Writing data via stream")
  const lines = Stream.range(1, 100).pipe(
    Stream.map((n) => `Line ${n}: This is line number ${n}\n`)
  )
  yield* Stream.run(lines, fs.sink(largePath))
  yield* logResult("Stream written", largePath)

  yield* logDemo("Stream Read", "Reading data via stream")
  const firstFiveLines = yield* fs
    .stream(largePath)
    .pipe(
      Stream.decodeText(),
      Stream.splitLines,
      Stream.take(5),
      Stream.runCollect
    )
  yield* logResult("First 5 lines", firstFiveLines)

  yield* logDemo("Stream Transform", "Processing file data")
  const lineCount = yield* fs
    .stream(largePath)
    .pipe(
      Stream.decodeText(),
      Stream.splitLines,
      Stream.runCount
    )
  yield* logResult("Total lines", lineCount)

  return { tempDir, largePath }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const fileOperations = Effect.gen(function*() {
  yield* logSection("File Operations")

  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const tempDir = yield* fs.makeTempDirectoryScoped()
  const sourcePath = path.join(tempDir, "source.txt")
  const destPath = path.join(tempDir, "destination.txt")

  yield* logDemo("Copy File", "Copying a file")
  yield* fs.writeFileString(sourcePath, "Original content")
  yield* fs.copy(sourcePath, destPath)
  const copiedContent = yield* fs.readFileString(destPath)
  yield* logResult("Copied content", copiedContent)

  yield* logDemo("Move/Rename File", "Moving a file")
  const newPath = path.join(tempDir, "renamed.txt")
  yield* fs.rename(destPath, newPath)
  const exists = yield* fs.exists(newPath)
  yield* logResult("File renamed", exists)

  yield* logDemo("Remove File", "Deleting a file")
  yield* fs.remove(newPath)
  const stillExists = yield* fs.exists(newPath)
  yield* logResult("File removed", !stillExists)

  return { tempDir, sourcePath }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const watchOperations = Effect.gen(function*() {
  yield* logSection("Watch Operations")

  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  const tempDir = yield* fs.makeTempDirectoryScoped()
  const watchPath = path.join(tempDir, "watched.txt")

  yield* logDemo("Watch File", "Monitoring file changes")

  const watcher = yield* fs.watch(watchPath)

  const watchStream = Stream.fromAsyncIterable(watcher, (e) => e).pipe(
    Stream.take(3),
    Stream.tap((event) => Console.log("File event:", event))
  )

  yield* Effect.fork(
    Stream.runDrain(watchStream)
  )

  yield* Effect.sleep("100 millis")
  yield* fs.writeFileString(watchPath, "Initial content")
  yield* Effect.sleep("100 millis")
  yield* fs.writeFileString(watchPath, "Modified content")
  yield* Effect.sleep("100 millis")
  yield* fs.remove(watchPath)
  yield* Effect.sleep("100 millis")

  yield* logResult("Watch completed", "Events captured")

  return { tempDir, watchPath }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const errorHandling = Effect.gen(function*() {
  yield* logSection("FileSystem Error Handling")

  const fs = yield* FileSystem.FileSystem

  yield* logDemo("Handle Missing File", "Graceful error recovery")
  const result = yield* fs
    .readFileString("/nonexistent/file.txt")
    .pipe(
      Effect.catchTag("SystemError", (error) => Effect.succeed(`Caught error: ${error.reason}`))
    )
  yield* logResult("Error handled", result)

  yield* logDemo("Check Existence", "Safe file checking")
  const exists = yield* fs.exists("/nonexistent/file.txt")
  yield* logResult("File exists", exists)

  return { handled: true }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function*() {
  yield* withTiming("Basic Operations", basicOperations)
  yield* withTiming("Directory Operations", directoryOperations)
  yield* withTiming("Stream Operations", streamOperations)
  yield* withTiming("File Operations", fileOperations)
  yield* withTiming("Error Handling", errorHandling)

  yield* Console.log("\n✨ All FileSystem demos completed!")
})
