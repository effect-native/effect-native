#!/usr/bin/env node
/* eslint-env node */
import { readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"

const root = process.cwd()
const pkgPath = path.join(root, "packages-native", "libsqlite", "package.json")
const metaPath = path.join(root, "packages-native", "libsqlite", "lib", "metadata.json")

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"))
const meta = JSON.parse(readFileSync(metaPath, "utf8"))

// Determine target SQLite version from metadata (all artifacts should match)
const versions = Array.from(new Set(meta.artifacts.map((a) => a.sqliteVersion).filter(Boolean)))
if (versions.length !== 1) {
  throw new Error(`Expected single sqliteVersion in metadata, got: ${versions.join(", ")}`)
}
const base = versions[0]

// Find next build number by inspecting published versions
let next = 1
try {
  const out = execSync(`npm view ${pkg.name} versions --json`, { encoding: "utf8" }).trim()
  const versionsJson = JSON.parse(out)
  const buildVersions = (Array.isArray(versionsJson) ? versionsJson : []).filter((v) => v.startsWith(`${base}+`))
  const nums = buildVersions.map((v) => {
    const m = v.match(/^\d+\.\d+\.\d+\+(\d+)$/)
    return m ? Number(m[1]) : 0
  })
  const max = nums.length ? Math.max(...nums) : 0
  next = max + 1
} catch {
  // no published versions or npm unavailable; default to +1
}

const target = `${base}+${next}`
if (pkg.version !== target) {
  console.log(`Setting ${pkg.name} version to ${target} (was ${pkg.version})`)
  pkg.version = target
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
} else {
  console.log(`${pkg.name} already at ${target}`)
}

