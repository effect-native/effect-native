import * as fs from "node:fs"
import * as path from "node:path"

const extensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]

function isRelativeImport(source) {
  return source.startsWith("./") || source.startsWith("../")
}

function hasIndexFile(dirPath) {
  for (const ext of extensions) {
    if (fs.existsSync(path.join(dirPath, `index${ext}`))) {
      return true
    }
  }

  return false
}

function isIndexImport(importPath) {
  const basename = path.basename(importPath)
  return basename === "index" || /^index\.(ts|tsx|js|jsx|mts|cts|mjs|cjs)$/.test(basename)
}

function resolvesToBarrel(importSource, currentFile) {
  const dir = path.dirname(currentFile)
  const resolved = path.resolve(dir, importSource)

  if (isIndexImport(importSource)) {
    return true
  }

  if (hasIndexFile(resolved)) {
    return true
  }

  return false
}

function createBarrelMatcher(options) {
  const patterns = (options.checkPatterns ?? []).map((pattern) => new RegExp(pattern))
  const checkRelative = options.checkRelativeIndexImports !== false

  return (source, currentFile) => {
    if (isRelativeImport(source)) {
      return checkRelative && resolvesToBarrel(source, currentFile)
    }

    for (const regex of patterns) {
      if (regex.test(source)) {
        return true
      }
    }

    return false
  }
}

function getModuleName(specifier) {
  return specifier.imported.type === "Identifier"
    ? specifier.imported.name
    : specifier.imported.value
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description: "Disallow importing from barrel files (index.ts), encourage importing specific modules instead"
    },
    schema: [
      {
        type: "object",
        properties: {
          checkPatterns: {
            type: "array",
            items: { type: "string" },
            description: "Regex patterns to match barrel imports"
          },
          checkRelativeIndexImports: {
            type: "boolean",
            description: "Whether to check relative imports that resolve to index files"
          }
        },
        additionalProperties: false
      }
    ]
  },
  create(context) {
    const currentFile = context.filename
    const options = context.options[0] ?? {}
    const isBarrelImport = createBarrelMatcher(options)

    return {
      ImportDeclaration(node) {
        if (node.importKind === "type") return

        const importSource = node.source.value

        if (!isBarrelImport(importSource, currentFile)) return

        const namespaceSpecifiers = []
        const namedValueSpecifiers = []

        for (const specifier of node.specifiers) {
          if (specifier.type === "ImportNamespaceSpecifier") {
            namespaceSpecifiers.push(specifier)
          } else if (specifier.type === "ImportSpecifier") {
            if (specifier.importKind !== "type") {
              namedValueSpecifiers.push(specifier)
            }
          }
        }

        for (const specifier of namespaceSpecifiers) {
          context.report({
            node: specifier,
            message:
              `Do not use namespace import from barrel file "${importSource}", import from specific modules instead`
          })
        }

        for (const specifier of namedValueSpecifiers) {
          const moduleName = getModuleName(specifier)
          const localName = specifier.local.name
          const message = isRelativeImport(importSource)
            ? `Do not import "${moduleName}" from barrel file "${importSource}", import from specific module instead`
            : `Use import * as ${localName} from "${importSource}/${moduleName}" instead`

          context.report({
            node: specifier,
            message
          })
        }
      }
    }
  }
}
