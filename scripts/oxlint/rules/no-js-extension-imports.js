function isRelativeImport(source) {
  return source.startsWith("./") || source.startsWith("../")
}

function getJsExtension(source) {
  if (source.endsWith(".js")) return ".js"
  if (source.endsWith(".jsx")) return ".jsx"
  if (source.endsWith(".mjs")) return ".mjs"
  if (source.endsWith(".cjs")) return ".cjs"
  return undefined
}

function checkSource(source, context) {
  const value = source.value

  if (!isRelativeImport(value)) {
    return
  }

  const ext = getJsExtension(value)
  if (!ext) return

  const extensionMap = {
    ".js": ".ts",
    ".jsx": ".tsx",
    ".mjs": ".mts",
    ".cjs": ".cts"
  }

  const tsExt = extensionMap[ext]
  const fixedSource = value.slice(0, -ext.length) + tsExt

  context.report({
    node: source,
    message: `Use "${tsExt}" extension instead of "${ext}" for relative imports`,
    fix(fixer) {
      return fixer.replaceTextRange(source.range, `"${fixedSource}"`)
    }
  })
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow .js, .jsx, .mjs and .cjs extensions in relative imports, use .ts, .tsx, .mts or .cts instead"
    },
    fixable: "code"
  },
  create(context) {
    function handleImportDeclaration(node) {
      checkSource(node.source, context)
    }

    function handleExportAllDeclaration(node) {
      checkSource(node.source, context)
    }

    function handleExportNamedDeclaration(node) {
      if (node.source) {
        checkSource(node.source, context)
      }
    }

    return {
      ImportDeclaration: handleImportDeclaration,
      ExportAllDeclaration: handleExportAllDeclaration,
      ExportNamedDeclaration: handleExportNamedDeclaration
    }
  }
}
