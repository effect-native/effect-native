import { chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const pkgDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(pkgDir, "..")
const source = resolve(root, "build/esm/bin.js")
const target = resolve(root, "dist/bin.mjs")
const distPackageJsonPath = resolve(root, "dist/package.json")
const workspacePackagesDir = resolve(root, "..")

let content
try {
  content = await readFile(source, "utf8")
} catch (error) {
  throw new Error(`note: expected ESM build at ${source}`, { cause: error })
}

// Rewrite relative imports to point to dist/esm/ since bin.mjs is at package root
content = content.replace(
  /from "\.\/([A-Z][^"]+\.js)"/g,
  "from \"./dist/esm/$1\""
)

await mkdir(dirname(target), { recursive: true })
await writeFile(target, content, "utf8")
await chmod(target, 0o755)

const workspaceVersions = new Map()
const packageDirs = await readdir(workspacePackagesDir, { withFileTypes: true })

for (const entry of packageDirs) {
  if (!entry.isDirectory()) {
    continue
  }
  const packageJsonPath = resolve(workspacePackagesDir, entry.name, "package.json")
  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"))
    if (typeof packageJson.name === "string" && typeof packageJson.version === "string") {
      workspaceVersions.set(packageJson.name, packageJson.version)
    }
  } catch {
    // Ignore non-package directories.
  }
}

const resolveWorkspaceRange = (range, version) => {
  if (!range.startsWith("workspace:")) {
    return range
  }
  const tag = range.slice("workspace:".length)
  if (tag === "^") {
    return `^${version}`
  }
  if (tag === "~") {
    return `~${version}`
  }
  if (tag === "*" || tag.length === 0) {
    return version
  }
  return tag
}

const distPackageJson = JSON.parse(await readFile(distPackageJsonPath, "utf8"))
for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
  const dependencies = distPackageJson[field]
  if (dependencies == null || typeof dependencies !== "object") {
    continue
  }
  for (const [name, range] of Object.entries(dependencies)) {
    if (typeof range !== "string" || !range.startsWith("workspace:")) {
      continue
    }
    const version = workspaceVersions.get(name)
    if (version == null) {
      throw new Error(
        `note: unable to resolve workspace dependency "${name}" for dist/package.json`
      )
    }
    dependencies[name] = resolveWorkspaceRange(range, version)
  }
}

await writeFile(distPackageJsonPath, `${JSON.stringify(distPackageJson, null, 2)}\n`, "utf8")
