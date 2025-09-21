/**
 * @since 1.0.0
 */
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
export const Schema = {
  q,
  attribute,
  content,
  element
}
