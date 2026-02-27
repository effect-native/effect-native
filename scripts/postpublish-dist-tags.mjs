#!/usr/bin/env node
/* eslint-env node */
/* global console */
/* global process */
import { execSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"

function main() {
  const workspace = path.join(process.cwd(), "packages")
  const packageNames = readdirSync(workspace, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(workspace, entry.name, "package.json"))
    .filter(existsSync)

  const packageManifests = packageNames.map((pkgPath) => JSON.parse(readFileSync(pkgPath, "utf8")))
    .filter((pkg) => pkg.private !== true)
    .map((pkg) => ({ name: pkg.name, version: pkg.version }))

  function npmInfo(name, tag) {
    try {
      return execSync(`npm view ${name} dist-tags.${tag} --silent`, { encoding: "utf8" }).trim()
    } catch {
      return ""
    }
  }

  function setTag(name, v, tag) {
    execSync(`npm dist-tag add ${name}@${v} ${tag}`, { stdio: "inherit" })
  }

  for (const { name, version } of packageManifests) {
    const current = npmInfo(name, "beta")
    if (current === version) {
      console.log(`'beta' already points to ${name}@${version}; leaving dist-tags unchanged.`)
      continue
    }

    console.log(`Setting dist-tag 'beta' to ${name}@${version} (was: ${current || "unset"})`)
    setTag(name, version, "beta")
  }
}

main()
