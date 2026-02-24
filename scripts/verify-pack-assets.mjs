#!/usr/bin/env node
import { existsSync } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

const root = process.cwd()
const packagesDir = path.join(root, "packages")
const packageDirs = await readdir(packagesDir, { withFileTypes: true })

const missing = []

for (const entry of packageDirs) {
  if (!entry.isDirectory()) {
    continue
  }

  const pkgDir = path.join(packagesDir, entry.name)
  const packageJsonPath = path.join(pkgDir, "package.json")
  if (!existsSync(packageJsonPath)) {
    continue
  }

  const manifest = JSON.parse(await readFile(packageJsonPath, "utf8"))
  const buildScript = manifest?.scripts?.build
  const usesPackV3 = typeof buildScript === "string" && buildScript.includes("pack-v3")
  if (!usesPackV3) {
    continue
  }

  const requiredFiles = ["README.md", "LICENSE"]
  for (const fileName of requiredFiles) {
    if (!existsSync(path.join(pkgDir, fileName))) {
      missing.push({
        packageName: manifest.name ?? entry.name,
        fileName
      })
    }
  }
}

if (missing.length > 0) {
  console.error("Missing required publish assets for pack-v3 packages:")
  for (const issue of missing) {
    console.error(`- ${issue.packageName}: ${issue.fileName}`)
  }
  process.exit(1)
}

console.log("All pack-v3 packages include README.md and LICENSE.")
