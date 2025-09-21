/**
 * @since 1.0.0
 */
import type { StandardSchemaV1 } from "@standard-schema/spec"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type { Namespace } from "../core/Namespace.js"

/**
 * @since 1.0.0
 * @category model
 */
export interface ExpandedName {
  readonly ns: Namespace
  readonly name: string
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const q = (ns: Namespace, name: string): ExpandedName => ({ ns, name })

/**
 * @since 1.0.0
 * @category model
 */
export interface AttributeDefinition<Extensions = unknown> {
  readonly name: ExpandedName
  readonly required?: boolean
  readonly extensions?: Extensions
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const attribute = <Extensions>(definition: AttributeDefinition<Extensions>): AttributeDefinition<Extensions> =>
  definition

/**
 * @since 1.0.0
 * @category model
 */
export type ContentExpression =
  | { readonly type: "element"; readonly name: ExpandedName }
  | { readonly type: "sequence"; readonly of: ReadonlyArray<ContentExpression> }
  | { readonly type: "optional"; readonly of: ContentExpression }

const elementContent = (name: ExpandedName): ContentExpression => ({
  type: "element",
  name
})

const sequenceContent = (of: ReadonlyArray<ContentExpression>): ContentExpression => ({
  type: "sequence",
  of
})

const optionalContent = (of: ContentExpression): ContentExpression => ({
  type: "optional",
  of
})

/**
 * @since 1.0.0
 * @category namespaces
 */
export const content = {
  element: elementContent,
  sequence: sequenceContent,
  optional: optionalContent
} as const

/**
 * @since 1.0.0
 * @category model
 */
export interface ElementDefinition<ElementExtensions = unknown> {
  readonly name: ExpandedName
  readonly content: ContentExpression
  readonly attributes: ReadonlyArray<AttributeDefinition>
  readonly extensions?: ElementExtensions
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const element = <ElementExtensions = unknown>(definition: {
  readonly name: ExpandedName
  readonly content: ContentExpression
  readonly attributes?: ReadonlyArray<AttributeDefinition>
  readonly extensions?: ElementExtensions
}): ElementDefinition<ElementExtensions> => ({
  name: definition.name,
  content: definition.content,
  attributes: definition.attributes ?? [],
  ...(definition.extensions === undefined ? {} : { extensions: definition.extensions })
})

/**
 * @since 1.0.0
 * @category exports
 */
const key = (name: ExpandedName): string => `${name.ns ?? ""}|${name.name}`

/**
 * @since 1.0.0
 * @category model
 */
export interface Registry {
  readonly elements: ReadonlyMap<string, ElementDefinition>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const registry = (elements: ReadonlyArray<ElementDefinition>): Registry => ({
  elements: new Map(elements.map((definition) => [key(definition.name), definition]))
})

/**
 * @since 1.0.0
 * @category model
 */
export interface AdapterExtensionGroup {
  readonly elements: ReadonlyArray<{
    readonly name: ExpandedName
    readonly metadata: unknown
  }>
  readonly attributes: ReadonlyArray<{
    readonly element: ExpandedName
    readonly name: ExpandedName
    readonly metadata: unknown
  }>
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null

const isExpandedName = (value: unknown): value is ExpandedName =>
  isRecord(value) && typeof value.name === "string" && (value.ns === null || typeof value.ns === "string")

const isAttributeSnapshot = (value: unknown): value is { readonly name: ExpandedName; readonly value?: string } =>
  isRecord(value) && isExpandedName(value.name) && (value.value === undefined || typeof value.value === "string")

const isNodeSnapshot = (value: unknown): value is NodeSnapshot =>
  isRecord(value)
  && isExpandedName(value.name)
  && Array.isArray(value.children)
  && Array.isArray(value.attributes)
  && value.children.every(isNodeSnapshot)
  && value.attributes.every(isAttributeSnapshot)

/**
 * @since 1.0.0
 * @category introspection
 */
export const extensionsByAdapter = (registryValue: Registry): Readonly<Record<string, AdapterExtensionGroup>> => {
  const groups = new Map<
    string,
    {
      elements: Array<{ readonly name: ExpandedName; readonly metadata: unknown }>
      attributes: Array<{ readonly element: ExpandedName; readonly name: ExpandedName; readonly metadata: unknown }>
    }
  >()

  const ensureGroup = (adapter: string) => {
    let group = groups.get(adapter)
    if (!group) {
      group = { elements: [], attributes: [] }
      groups.set(adapter, group)
    }
    return group
  }

  for (const definition of registryValue.elements.values()) {
    if (isRecord(definition.extensions)) {
      for (const [adapter, metadata] of Object.entries(definition.extensions)) {
        const group = ensureGroup(adapter)
        group.elements.push({
          name: definition.name,
          metadata
        })
      }
    }

    for (const attribute of definition.attributes) {
      if (!isRecord(attribute.extensions)) {
        continue
      }
      for (const [adapter, metadata] of Object.entries(attribute.extensions)) {
        const group = ensureGroup(adapter)
        group.attributes.push({
          element: definition.name,
          name: attribute.name,
          metadata
        })
      }
    }
  }

  const result: Record<string, AdapterExtensionGroup> = Object.create(null)
  for (const [adapter, group] of groups) {
    result[adapter] = {
      elements: group.elements,
      attributes: group.attributes
    }
  }
  return result
}

const standardSchemaVendor = "@effect-native/minidom/Schema"

const HTML_NAMESPACE: Namespace = "http://www.w3.org/1999/xhtml"
const KV_NAMESPACE: Namespace = "https://kv.example"

const sqlArticleRegistry = registry([
  element({
    name: q(HTML_NAMESPACE, "article"),
    content: content.sequence([
      content.optional(content.element(q(HTML_NAMESPACE, "section")))
    ]),
    attributes: [
      attribute({
        name: q(null, "data-slug"),
        required: true,
        extensions: { sql: { column: "slug" } }
      })
    ],
    extensions: { sql: { table: "articles" } }
  }),
  element({
    name: q(HTML_NAMESPACE, "section"),
    content: content.sequence([]),
    attributes: [
      attribute({
        name: q(null, "data-order"),
        required: true,
        extensions: { sql: { column: "order" } }
      })
    ],
    extensions: { sql: { table: "article_sections" } }
  })
])

const kvFragmentRegistry = registry([
  element({
    name: q(KV_NAMESPACE, "fragment"),
    content: content.sequence([]),
    attributes: [
      attribute({
        name: q(null, "data-key"),
        required: true,
        extensions: { kv: { bucket: "fragments" } }
      })
    ],
    extensions: { kv: { collection: "fragments" } }
  })
])

/**
 * @since 1.0.0
 * @category standard-schema
 * @example
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const standard = MiniDom.Schema.toStandardSchemaV1(MiniDom.Schema.samples.sqlArticleRegistry)
 * const result = await standard["~standard"].validate({
 *   name: MiniDom.Schema.q("http://www.w3.org/1999/xhtml", "article"),
 *   attributes: [{ name: MiniDom.Schema.q(null, "data-slug"), value: "intro" }],
 *   children: []
 * })
 */
export const toStandardSchemaV1 = (
  registryValue: Registry,
  options?: { readonly vendor?: string }
): StandardSchemaV1<NodeSnapshot> => ({
  "~standard": {
    version: 1,
    vendor: options?.vendor ?? standardSchemaVendor,
    types: {
      input: undefined as unknown as NodeSnapshot,
      output: undefined as unknown as NodeSnapshot
    },
    validate: (value: unknown) => {
      if (!isNodeSnapshot(value)) {
        return {
          issues: [{ message: "invalid MiniDom NodeSnapshot input" }]
        }
      }

      const validation = Effect.runSync(validate(registryValue, value))
      if (validation.ok) {
        return { value }
      }

      const messages = Option.getOrElse(validation.issues, () => [])
      return {
        issues: messages.map((message) => ({ message }))
      }
    }
  }
})

/**
 * @since 1.0.0
 * @category samples
 * @example
 * import * as MiniDom from "@effect-native/minidom"
 *
 * const registry = MiniDom.Schema.samples.kvFragmentRegistry
 * const metadata = MiniDom.Schema.extensionsByAdapter(registry)
 * console.log(metadata.kv?.elements[0]?.metadata)
 */
export const samples = {
  sqlArticleRegistry,
  kvFragmentRegistry
} as const

/**
 * @since 1.0.0
 * @category model
 */
export interface NodeSnapshot {
  readonly name: ExpandedName
  readonly children: ReadonlyArray<NodeSnapshot>
  readonly attributes: ReadonlyArray<{ readonly name: ExpandedName; readonly value?: string }>
}

interface ValidationResult {
  readonly ok: boolean
  readonly issues: Option.Option<ReadonlyArray<string>>
}

const matchElement = (
  expression: ContentExpression,
  children: ReadonlyArray<NodeSnapshot>,
  registry: Registry
): { readonly issues: ReadonlyArray<string>; readonly remaining: ReadonlyArray<NodeSnapshot> } => {
  switch (expression.type) {
    case "element": {
      const [first, ...rest] = children
      if (!first) {
        return { issues: [`missing child ${expression.name.name}`], remaining: children }
      }
      if (key(first.name) !== key(expression.name)) {
        return { issues: [`expected child ${expression.name.name} but found ${first.name.name}`], remaining: children }
      }
      const subIssues = validateStructure(first, registry)
      return { issues: subIssues, remaining: rest }
    }
    case "optional": {
      const attempt = matchElement(expression.of, children, registry)
      if (attempt.issues.length > 0) {
        return { issues: [], remaining: children }
      }
      return attempt
    }
    case "sequence": {
      let current: ReadonlyArray<NodeSnapshot> = children
      const issues: Array<string> = []
      for (const expr of expression.of) {
        const result = matchElement(expr, current, registry)
        for (const issue of result.issues) {
          issues.push(issue)
        }
        current = result.remaining
      }
      return { issues, remaining: current }
    }
  }
}

const validateStructure = (node: NodeSnapshot, registry: Registry): ReadonlyArray<string> => {
  const definition = registry.elements.get(key(node.name))
  if (!definition) {
    return [`unknown element ${node.name.name}`]
  }

  const issues: Array<string> = []

  for (const attribute of definition.attributes) {
    const present = node.attributes.some((candidate) => key(candidate.name) === key(attribute.name))
    if (attribute.required === true && !present) {
      issues.push(`missing attribute ${attribute.name.name}`)
    }
  }

  const contentResult = matchElement(definition.content, node.children, registry)
  for (const issue of contentResult.issues) {
    issues.push(issue)
  }

  return issues
}

/**
 * @since 1.0.0
 * @category validation
 */
export const validate = (
  registryValue: Registry,
  node: NodeSnapshot
): Effect.Effect<ValidationResult> =>
  Effect.sync(() => {
    const issues = validateStructure(node, registryValue)
    return issues.length === 0
      ? { ok: true, issues: Option.none() }
      : { ok: false, issues: Option.some(issues) }
  })

/**
 * @since 1.0.0
 * @category exports
 */
export const Schema = {
  q,
  attribute,
  content,
  element,
  registry,
  validate,
  extensionsByAdapter,
  toStandardSchemaV1,
  samples
}
