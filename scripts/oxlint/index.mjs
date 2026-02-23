import noImportFromBarrelPackage from "./rules/no-import-from-barrel-package.js"
import noJsExtensionImports from "./rules/no-js-extension-imports.js"
import noOpaqueInstanceFields from "./rules/no-opaque-instance-fields.js"

export default {
  meta: {
    name: "effect"
  },
  rules: {
    "no-import-from-barrel-package": noImportFromBarrelPackage,
    "no-js-extension-imports": noJsExtensionImports,
    "no-opaque-instance-fields": noOpaqueInstanceFields
  }
}
