import fs from "node:fs"
import path from "node:path"

const extensionByPlatform = {
  "darwin-aarch64": "dylib",
  "darwin-x86_64": "dylib",
  "linux-aarch64": "so",
  "linux-x86_64": "so",
  "win-x86_64": "dll",
  "win-i686": "dll"
}

const detectPlatformTag = () => {
  if (process.platform === "darwin" && process.arch === "arm64") return "darwin-aarch64"
  if (process.platform === "darwin" && process.arch === "x64") return "darwin-x86_64"
  if (process.platform === "linux" && process.arch === "arm64") return "linux-aarch64"
  if (process.platform === "linux" && process.arch === "x64") return "linux-x86_64"
  if (process.platform === "win32" && process.arch === "x64") return "win-x86_64"
  if (process.platform === "win32" && process.arch === "ia32") return "win-i686"
  throw new Error(`Unsupported runtime platform ${process.platform}-${process.arch}`)
}

const explicit = process.argv[2]
const platform = explicit ?? detectPlatformTag()
if (!Object.prototype.hasOwnProperty.call(extensionByPlatform, platform)) {
  throw new Error(`Unsupported sqlite-graph-ext platform: ${platform}`)
}

const ext = extensionByPlatform[platform]
const candidates = [
  `sqlite3_graph_ext.${ext}`,
  `libsqlite3_graph_ext.${ext}`,
]
const source = candidates
  .flatMap((name) => [path.resolve("zig-out", "lib", name), path.resolve("zig-out", "bin", name)])
  .find((value) => fs.existsSync(value))

if (source == null) {
  throw new Error(`Missing zig artifact: ${source}`)
}

const destinationDir = path.resolve("lib", platform)
const destination = path.join(destinationDir, `sqlite3_graph_ext.${ext}`)
fs.mkdirSync(destinationDir, { recursive: true })
fs.copyFileSync(source, destination)
console.log(`copied: ${source} -> ${destination}`)
