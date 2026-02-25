/**
 * SQL expression helpers for `idset_*` combinators.
 *
 * @since 0.1.0
 */

export type IdSetExpression = {
  readonly expression: string
  readonly bindings: ReadonlyArray<string>
}

const uniqueSorted = (values: ReadonlyArray<string>): ReadonlyArray<string> =>
  Array.from(new Set(values.filter((value) => value.length > 0))).sort((a, b) => a.localeCompare(b))

const combineBinary = (
  name: "idset_union" | "idset_intersect" | "idset_diff",
  left: IdSetExpression,
  right: IdSetExpression
): IdSetExpression => ({
  expression: `${name}(${left.expression}, ${right.expression})`,
  bindings: [...left.bindings, ...right.bindings]
})

/**
 * Empty idset SQL expression.
 *
 * @since 0.1.0
 */
export const idsetEmpty: IdSetExpression = {
  expression: "idset_empty()",
  bindings: []
}

/**
 * Build a deterministic idset expression from raw values.
 *
 * @since 0.1.0
 */
export const idsetFromValues = (values: ReadonlyArray<string>): IdSetExpression => {
  let expression = idsetEmpty.expression
  const bindings: Array<string> = []

  for (const value of uniqueSorted(values)) {
    expression = `idset_add(${expression}, ?)`
    bindings.push(value)
  }

  return { expression, bindings }
}

/**
 * Build a union expression.
 *
 * @since 0.1.0
 */
export const idsetUnion = (left: IdSetExpression, right: IdSetExpression): IdSetExpression =>
  combineBinary("idset_union", left, right)

/**
 * Build an intersection expression.
 *
 * @since 0.1.0
 */
export const idsetIntersect = (left: IdSetExpression, right: IdSetExpression): IdSetExpression =>
  combineBinary("idset_intersect", left, right)

/**
 * Build a difference expression.
 *
 * @since 0.1.0
 */
export const idsetDiff = (left: IdSetExpression, right: IdSetExpression): IdSetExpression =>
  combineBinary("idset_diff", left, right)
