export interface QualifiedTableName {
  readonly schema: string
  readonly table: string
}

export const parseQualifiedTableName = (name: string): QualifiedTableName => {
  const trimmed = name.trim()
  const pieces = trimmed.split(".")
  if (pieces.length === 1) {
    return {
      schema: "main",
      table: pieces[0] ?? trimmed
    }
  }

  const [schema, ...rest] = pieces
  const table = rest.join(".")

  return {
    schema,
    table
  }
}

export const quoteIdentifier = (identifier: string): string => {
  const escaped = identifier.replaceAll("\"", "\"\"")
  return `"${escaped}"`
}

export const quoteQualifiedTableName = (name: string): string => {
  const qualified = parseQualifiedTableName(name)
  return `${quoteIdentifier(qualified.schema)}.${quoteIdentifier(qualified.table)}`
}

export const quoteStringLiteral = (value: string): string => {
  const escaped = value.replaceAll("'", "''")
  return `'${escaped}'`
}

export const quoteIdentifierList = (names: ReadonlyArray<string>): string => names.map(quoteIdentifier).join(", ")

export const placeholders = (count: number): string => Array.from({ length: count }, () => "?").join(", ")
