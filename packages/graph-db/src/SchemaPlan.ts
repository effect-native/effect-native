/**
 * Schema planning model for graph-db ensure operations.
 *
 * @since 0.1.0
 */

export type SqlColumnType = "TEXT" | "INTEGER" | "REAL" | "BLOB"

export type ReplicationMode = "none" | "crr"

export interface ColumnDef {
  readonly name: string
  readonly sqlType: SqlColumnType
  readonly notNull?: boolean | undefined
  readonly primaryKey?: boolean | undefined
  readonly defaultSql?: string | undefined
}

export interface IndexDef {
  readonly name: string
  readonly columns: ReadonlyArray<string>
  readonly unique?: boolean | undefined
}

export interface TableDef {
  readonly name: string
  readonly columns: ReadonlyArray<ColumnDef>
  readonly indexes?: ReadonlyArray<IndexDef> | undefined
  readonly replication?: ReplicationMode | undefined
}

export type IncompatibleReason =
  | "MissingPrimaryKey"
  | "TypeMismatch"
  | "NotNullMismatch"
  | "PrimaryKeyMismatch"
  | "IndexShapeMismatch"
  | "IndexNameCollision"
  | "UniqueIndexForbiddenInCrr"

export interface SchemaIncompatible {
  readonly tableName: string
  readonly reason: IncompatibleReason
  readonly detail: string
}

export interface TablePlan {
  readonly table: TableDef
  readonly statements: ReadonlyArray<string>
  readonly incompatible: ReadonlyArray<SchemaIncompatible>
}

export interface SchemaPlan {
  readonly tables: ReadonlyArray<TablePlan>
  readonly statements: ReadonlyArray<string>
  readonly incompatible: ReadonlyArray<SchemaIncompatible>
}

export const emptyTablePlan = (table: TableDef): TablePlan => ({
  table,
  statements: [],
  incompatible: []
})

export const mergeTablePlans = (plans: ReadonlyArray<TablePlan>): SchemaPlan => ({
  tables: plans,
  statements: plans.flatMap((plan) => plan.statements),
  incompatible: plans.flatMap((plan) => plan.incompatible)
})
