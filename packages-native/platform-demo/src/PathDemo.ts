/**
 * @since 0.0.1
 */
import * as Path from "@effect/platform/Path"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import { logDemo, logResult, logSection } from "./utils/DemoHelpers.js"

/**
 * @since 0.0.1
 * @category demos
 * @example
 * ```ts
 * import * as PathDemo from "@effect-native/platform-demo/PathDemo"
 * import * as NodePath from "@effect/platform-node/NodePath"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 * 
 * Effect.provide(
 *   PathDemo.basicOperations,
 *   NodePath.layer
 * ).pipe(Effect.runPromise)
 * ```
 */
export const basicOperations = Effect.gen(function* () {
  yield* logSection("Path Basic Operations")
  
  const path = yield* Path.Path
  
  yield* logDemo("Join Paths", "Combining path segments")
  const joined = path.join("home", "user", "documents", "file.txt")
  yield* logResult("Joined path", joined)
  
  yield* logDemo("Normalize Path", "Cleaning up path")
  const messy = path.join("home", "user", "..", "user", ".", "documents")
  const normalized = path.normalize(messy)
  yield* logResult("Normalized", normalized)
  
  yield* logDemo("Resolve Path", "Getting absolute path")
  const resolved = path.resolve("documents", "file.txt")
  yield* logResult("Resolved", resolved)
  
  yield* logDemo("Relative Path", "Computing relative path")
  const from = path.join("home", "user", "projects")
  const to = path.join("home", "user", "documents", "report.pdf")
  const relative = path.relative(from, to)
  yield* logResult("Relative path", relative)
  
  return { joined, normalized, resolved, relative }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const pathParsing = Effect.gen(function* () {
  yield* logSection("Path Parsing")
  
  const path = yield* Path.Path
  
  const fullPath = path.join("home", "user", "documents", "report.pdf")
  
  yield* logDemo("Directory Name", "Extracting directory")
  const dirname = path.dirname(fullPath)
  yield* logResult("Directory", dirname)
  
  yield* logDemo("Base Name", "Extracting filename")
  const basename = path.basename(fullPath)
  yield* logResult("Filename", basename)
  
  yield* logDemo("Extension", "Extracting file extension")
  const extname = path.extname(fullPath)
  yield* logResult("Extension", extname)
  
  yield* logDemo("Base Without Extension", "Filename without extension")
  const basenameNoExt = path.basename(fullPath, extname)
  yield* logResult("Name only", basenameNoExt)
  
  yield* logDemo("Parse Path", "Complete path breakdown")
  const parsed = path.parse(fullPath)
  yield* logResult("Parsed", parsed)
  
  return { dirname, basename, extname, parsed }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const pathChecks = Effect.gen(function* () {
  yield* logSection("Path Checks")
  
  const path = yield* Path.Path
  
  yield* logDemo("Is Absolute", "Checking absolute paths")
  const absolutePath = "/home/user/file.txt"
  const relativePath = "./documents/file.txt"
  yield* logResult(`${absolutePath} is absolute`, path.isAbsolute(absolutePath))
  yield* logResult(`${relativePath} is absolute`, path.isAbsolute(relativePath))
  
  yield* logDemo("Path Separator", "Platform-specific separator")
  yield* logResult("Separator", path.sep)
  
  yield* logDemo("Path Delimiter", "Platform-specific delimiter")
  yield* logResult("Delimiter", path.delimiter)
  
  yield* logDemo("Format Path", "Building path from parts")
  const formatted = path.format({
    dir: path.join("home", "user"),
    base: "document.txt"
  })
  yield* logResult("Formatted", formatted)
  
  return { separator: path.sep, delimiter: path.delimiter }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const crossPlatform = Effect.gen(function* () {
  yield* logSection("Cross-Platform Paths")
  
  const path = yield* Path.Path
  
  yield* logDemo("Platform Detection", "Current platform separator")
  const isWindows = path.sep === "\\"
  const platform = isWindows ? "Windows" : "Unix-like"
  yield* logResult("Platform", platform)
  yield* logResult("Path separator", path.sep)
  
  yield* logDemo("Convert Paths", "Normalizing for platform")
  const mixedPath = "C:\\Users\\name/documents\\file.txt"
  const normalized = path.normalize(mixedPath)
  yield* logResult("Mixed path", mixedPath)
  yield* logResult("Normalized", normalized)
  
  yield* logDemo("URL to Path", "Converting file URLs")
  const fileUrl = "file:///home/user/documents/file.txt"
  const fromUrl = path.fromFileUrl(new URL(fileUrl))
  yield* logResult("From URL", fromUrl)
  
  yield* logDemo("Path to URL", "Converting to file URL")
  const toUrl = path.toFileUrl("/home/user/documents/file.txt")
  yield* logResult("To URL", toUrl.href)
  
  return { platform, normalized }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const pathManipulation = Effect.gen(function* () {
  yield* logSection("Path Manipulation")
  
  const path = yield* Path.Path
  
  yield* logDemo("Change Extension", "Modifying file extension")
  const original = "document.txt"
  const withNewExt = path.join(
    path.dirname(original),
    path.basename(original, path.extname(original)) + ".pdf"
  )
  yield* logResult("Original", original)
  yield* logResult("With .pdf", withNewExt)
  
  yield* logDemo("Add Suffix", "Adding to filename")
  const file = "report.pdf"
  const dir = path.dirname(file)
  const name = path.basename(file, path.extname(file))
  const ext = path.extname(file)
  const withSuffix = path.join(dir, `${name}_backup${ext}`)
  yield* logResult("Original", file)
  yield* logResult("With suffix", withSuffix)
  
  yield* logDemo("Parent Directory", "Moving up directories")
  const deepPath = path.join("home", "user", "projects", "app", "src", "index.js")
  const parent1 = path.dirname(deepPath)
  const parent2 = path.dirname(parent1)
  const parent3 = path.dirname(parent2)
  yield* logResult("Original", deepPath)
  yield* logResult("Parent 1", parent1)
  yield* logResult("Parent 2", parent2)
  yield* logResult("Parent 3", parent3)
  
  return { manipulated: true }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const pathPatterns = Effect.gen(function* () {
  yield* logSection("Common Path Patterns")
  
  const path = yield* Path.Path
  
  yield* logDemo("Home Directory", "User home path")
  const home = path.resolve("~")
  yield* logResult("Home", home)
  
  yield* logDemo("Temp Directory", "Temporary files path")
  const temp = path.join(path.sep, "tmp", "app-" + Date.now())
  yield* logResult("Temp path", temp)
  
  yield* logDemo("Config Paths", "Application config locations")
  const configPaths = [
    path.join(home, ".config", "myapp"),
    path.join(home, ".myapp"),
    path.join(path.sep, "etc", "myapp")
  ]
  yield* logResult("Config paths", configPaths)
  
  yield* logDemo("Safe Filename", "Sanitizing user input")
  const userInput = "../../../etc/passwd"
  const safeName = path.basename(userInput).replace(/[^a-zA-Z0-9.-]/g, "_")
  yield* logResult("User input", userInput)
  yield* logResult("Safe name", safeName)
  
  yield* logDemo("Path Traversal", "Walking directory tree")
  const root = path.join("project")
  const paths = [
    root,
    path.join(root, "src"),
    path.join(root, "src", "components"),
    path.join(root, "src", "utils"),
    path.join(root, "tests")
  ]
  yield* logResult("Tree structure", paths)
  
  return { patterns: "demonstrated" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const pathComparison = Effect.gen(function* () {
  yield* logSection("Path Comparison")
  
  const path = yield* Path.Path
  
  yield* logDemo("Same Path Check", "Comparing paths")
  const path1 = path.join("home", "user", "file.txt")
  const path2 = path.join("home", "user", ".", "file.txt")
  const path3 = path.join("home", "admin", "file.txt")
  
  const norm1 = path.normalize(path1)
  const norm2 = path.normalize(path2)
  const norm3 = path.normalize(path3)
  
  yield* logResult(`${path1} === ${path2}`, norm1 === norm2)
  yield* logResult(`${path1} === ${path3}`, norm1 === norm3)
  
  yield* logDemo("Parent Check", "Is parent directory")
  const parent = path.join("home", "user")
  const child = path.join("home", "user", "documents", "file.txt")
  const notChild = path.join("home", "other", "file.txt")
  
  const isParent = (parent: string, child: string) => {
    const rel = path.relative(parent, child)
    return rel && !rel.startsWith("..") && !path.isAbsolute(rel)
  }
  
  yield* logResult(`${parent} is parent of ${child}`, isParent(parent, child))
  yield* logResult(`${parent} is parent of ${notChild}`, isParent(parent, notChild))
  
  return { compared: true }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function* () {
  yield* basicOperations
  yield* pathParsing
  yield* pathChecks
  yield* crossPlatform
  yield* pathManipulation
  yield* pathPatterns
  yield* pathComparison
  
  yield* Console.log("\n✨ All Path demos completed!")
})