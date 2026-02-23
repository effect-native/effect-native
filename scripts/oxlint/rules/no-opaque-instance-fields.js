const SCHEMA_SOURCES = new Set(["effect", "effect/Schema"])
const SCHEMA_NAMESPACE_SOURCES = new Set(["effect/Schema"])

export default {
  meta: {
    type: "problem",
    docs: { description: "Disallow instance members in Schema.Opaque classes" }
  },
  create(context) {
    const schemaIdentifiers = new Set()
    const opaqueIdentifiers = new Set()

    function isSchemaOpaqueExtension(node) {
      const superClass = node.superClass
      if (!superClass || superClass.type !== "CallExpression") return false

      const inner = superClass.callee
      if (!inner || inner.type !== "CallExpression") return false

      return isOpaqueCallee(inner.callee)
    }

    function isOpaqueCallee(node) {
      if (!node) return false
      if (node.type === "Identifier") {
        return opaqueIdentifiers.has(node.name)
      }

      if (node.type !== "MemberExpression") {
        return false
      }

      if (node.property?.type !== "Identifier" || node.property.name !== "Opaque") {
        return false
      }

      return isSchemaObject(node.object)
    }

    function isSchemaObject(node) {
      if (!node) return false
      if (node.type === "Identifier") {
        return schemaIdentifiers.has(node.name)
      }

      return false
    }

    function checkClass(node) {
      if (!isSchemaOpaqueExtension(node)) return

      for (const element of node.body.body) {
        if (element.type === "PropertyDefinition" && !element.static) {
          context.report({
            node: element,
            message: "Classes extending Schema.Opaque must not have instance members"
          })
        } else if (element.type === "MethodDefinition" && !element.static) {
          context.report({
            node: element,
            message: "Classes extending Schema.Opaque must not have instance members"
          })
        }
      }
    }

    function importDeclaration(node) {
      if (node.importKind === "type") return

      const source = node.source.value

      if (typeof source !== "string" || !SCHEMA_SOURCES.has(source)) return

      for (const specifier of node.specifiers) {
        if (specifier.type === "ImportNamespaceSpecifier") {
          if (SCHEMA_NAMESPACE_SOURCES.has(source)) {
            schemaIdentifiers.add(specifier.local.name)
          }
        } else if (specifier.type === "ImportSpecifier" && specifier.importKind !== "type") {
          if (specifier.imported.type !== "Identifier") continue

          const importedName = specifier.imported.name

          if (importedName === "Schema") {
            schemaIdentifiers.add(specifier.local.name)
          } else if (importedName === "Opaque") {
            opaqueIdentifiers.add(specifier.local.name)
          }
        }
      }
    }

    return {
      ImportDeclaration: importDeclaration,
      ClassDeclaration: checkClass,
      ClassExpression: checkClass
    }
  }
}
