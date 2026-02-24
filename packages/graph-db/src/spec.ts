/**
 * Graph schema definitions used by graph-db.
 *
 * @since 0.1.0
 */

import type * as Schema from "effect/Schema"
import type { ColumnDef, IndexDef, ReplicationMode, TableDef } from "./SchemaPlan.js"

export type RowShape = Readonly<Record<string, unknown>>

export interface NodeDef<A, Row extends RowShape = RowShape> {
  readonly kind: string
  readonly schema: Schema.Codec<A, Row, never, never>
  readonly table: TableDef
  readonly idColumn?: string | undefined
}

export interface EdgeDef {
  readonly edgeType: string
  readonly description?: string | undefined
}

export interface GraphSpec {
  readonly name?: string | undefined
  readonly replication?: ReplicationMode | undefined
  readonly nodes: ReadonlyArray<NodeDef<unknown>>
  readonly edges?: ReadonlyArray<EdgeDef> | undefined
  readonly edgeTableName?: string | undefined
  readonly edgeTableIndexes?: ReadonlyArray<IndexDef> | undefined
}

export const defaultNodeTableName = (kind: string): string => `node_${kind}`

export interface NodeDefOptions<A, Row extends RowShape = RowShape> {
  readonly kind: string
  readonly schema: Schema.Codec<A, Row, never, never>
  readonly columns: ReadonlyArray<ColumnDef>
  readonly indexes?: ReadonlyArray<IndexDef> | undefined
  readonly tableName?: string | undefined
  readonly idColumn?: string | undefined
  readonly replication?: ReplicationMode | undefined
}

export const nodeDef = <A, Row extends RowShape>(options: NodeDefOptions<A, Row>): NodeDef<A, Row> => ({
  kind: options.kind,
  schema: options.schema,
  idColumn: options.idColumn,
  table: {
    name: options.tableName ?? defaultNodeTableName(options.kind),
    columns: options.columns,
    indexes: options.indexes,
    replication: options.replication
  }
})

const edgeColumns: ReadonlyArray<ColumnDef> = [
  { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
  { name: "edge_type", sqlType: "TEXT", notNull: true },
  { name: "src", sqlType: "TEXT", notNull: true },
  { name: "dst", sqlType: "TEXT", notNull: true },
  { name: "props_json", sqlType: "TEXT" }
]

const edgeIndexes = (extra: ReadonlyArray<IndexDef>): ReadonlyArray<IndexDef> => [
  { name: "graph_edge_src_idx", columns: ["src", "edge_type"] },
  { name: "graph_edge_dst_idx", columns: ["dst", "edge_type"] },
  ...extra
]

export const edgeTableDef = (spec: GraphSpec): TableDef => ({
  name: spec.edgeTableName ?? "graph_edge",
  replication: spec.replication,
  columns: edgeColumns,
  indexes: edgeIndexes(spec.edgeTableIndexes ?? [])
})

export const tablesFromSpec = (spec: GraphSpec): ReadonlyArray<TableDef> => {
  const nodeTables = spec.nodes.map((node) => {
    const replication = node.table.replication ?? spec.replication
    return {
      ...node.table,
      replication
    }
  })

  return [...nodeTables, edgeTableDef(spec)]
}
