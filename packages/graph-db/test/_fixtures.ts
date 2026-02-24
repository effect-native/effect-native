import { type GraphSpec, type NodeDef, nodeDef } from "@effect-native/graph-db"
import * as Schema from "effect/Schema"

export const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  visits: Schema.Number
})

export const UserSchemaWithNickname = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  visits: Schema.Number,
  nickname: Schema.String
})

export const userNodeV1 = (): NodeDef<unknown> =>
  nodeDef({
    kind: "user",
    schema: UserSchema,
    columns: [
      { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
      { name: "name", sqlType: "TEXT", notNull: true },
      { name: "visits", sqlType: "INTEGER", notNull: true }
    ],
    indexes: [
      { name: "node_user_name_idx", columns: ["name"] }
    ]
  })

export const userNodeV2 = (): NodeDef<unknown> =>
  nodeDef({
    kind: "user",
    schema: UserSchemaWithNickname,
    columns: [
      { name: "id", sqlType: "TEXT", primaryKey: true, notNull: true },
      { name: "name", sqlType: "TEXT", notNull: true },
      { name: "visits", sqlType: "INTEGER", notNull: true },
      { name: "nickname", sqlType: "TEXT", notNull: true, defaultSql: "''" }
    ],
    indexes: [
      { name: "node_user_name_idx", columns: ["name"] },
      { name: "node_user_nickname_idx", columns: ["nickname"] }
    ]
  })

export const makeSpec = (
  node: NodeDef<unknown>,
  options: {
    readonly name?: string
    readonly replication?: "none" | "crr"
  } = {}
): GraphSpec => ({
  name: options.name,
  replication: options.replication,
  nodes: [node]
})
