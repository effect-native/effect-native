import * as Fs from "node:fs"
import * as Path from "node:path"

function packages() {
  const packagesInMain = Fs.readdirSync("packages")
  const packagesInAi = Fs.readdirSync("packages/ai").map((dir) => Path.join("ai", dir))
  const packagesInNative = Fs.existsSync("packages-native")
    ? Fs.readdirSync("packages-native").map((dir) => Path.join("../packages-native", dir))
    : []

  return packagesInMain
    .concat(packagesInAi)
    .filter((_) => Fs.existsSync(Path.join("packages", _, "docs/modules")))
    .concat(
      packagesInNative.filter((_) =>
        Fs.existsSync(Path.join("packages-native", _.replace("../packages-native/", ""), "docs/modules"))
      )
    )
}

function pkgName(pkg) {
  const basePath = pkg.startsWith("../packages-native/")
    ? Path.join("packages-native", pkg.replace("../packages-native/", ""))
    : Path.join("packages", pkg)
  const packageJson = Fs.readFileSync(Path.join(basePath, "package.json"))
  return JSON.parse(packageJson).name
}

function copyFiles(pkg) {
  const name = pkgName(pkg)
  const basePath = pkg.startsWith("../packages-native/")
    ? Path.join("packages-native", pkg.replace("../packages-native/", ""))
    : Path.join("packages", pkg)
  const docs = Path.join(basePath, "docs/modules")
  const dest = Path.join("docs", pkg)
  const files = Fs.readdirSync(docs, { withFileTypes: true })

  function handleFiles(root, files) {
    for (const file of files) {
      const path = Path.join(docs, root, file.name)
      const destPath = Path.join(dest, root, file.name)

      if (file.isDirectory()) {
        Fs.mkdirSync(destPath, { recursive: true })
        handleFiles(Path.join(root, file.name), Fs.readdirSync(path, { withFileTypes: true }))
        continue
      }

      const content = Fs.readFileSync(path, "utf8").replace(
        /^parent: Modules$/m,
        `parent: "${name}"`
      )
      Fs.writeFileSync(destPath, content)
    }
  }

  Fs.rmSync(dest, { recursive: true, force: true })
  Fs.mkdirSync(dest, { recursive: true })
  handleFiles("", files)
}

function generateIndex(pkg, order) {
  const name = pkgName(pkg)
  const content = `---
title: "${name}"
has_children: true
permalink: /docs/${pkg}
nav_order: ${order}
---
`

  Fs.writeFileSync(Path.join("docs", pkg, "index.md"), content)
}

packages().forEach((pkg, i) => {
  const basePath = pkg.startsWith("../packages-native/")
    ? Path.join("packages-native", pkg.replace("../packages-native/", ""))
    : Path.join("packages", pkg)
  const docsModulesPath = Path.join(basePath, "docs/modules")

  // Only process packages that have docs/modules directory
  if (Fs.existsSync(docsModulesPath)) {
    Fs.rmSync(Path.join("docs", pkg), { recursive: true, force: true })
    Fs.mkdirSync(Path.join("docs", pkg), { recursive: true })
    copyFiles(pkg)
    generateIndex(pkg, i + 2)
  }
})
