/**
 * @since 1.0.0
 */
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
export interface AttributeDefinition {
  readonly name: ExpandedName
  readonly required?: boolean
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const attribute = (definition: AttributeDefinition): AttributeDefinition => definition

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
export interface ElementDefinition {
  readonly name: ExpandedName
  readonly content: ContentExpression
  readonly attributes: ReadonlyArray<AttributeDefinition>
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const element = (definition: {
  readonly name: ExpandedName
  readonly content: ContentExpression
  readonly attributes?: ReadonlyArray<AttributeDefinition>
}): ElementDefinition => ({
  name: definition.name,
  content: definition.content,
  attributes: definition.attributes ?? []
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
  validate
}
