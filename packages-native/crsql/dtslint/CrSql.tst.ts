/* eslint-disable @typescript-eslint/no-unused-vars */
import type * as SqlClient from "@effect/sql/SqlClient"
import type { Context, Effect } from "effect"
import { describe, expect, it } from "tstyche"
import { fromSqliteClient } from "../src/CrSql.js"

declare const sql: SqlClient.SqlClient

type InferEffect<E> = E extends Effect.Effect<infer A, infer E, infer R> ? { A: A; E: E; R: R } : never

describe("CrSql.fromSqliteClient", () => {
  it("has a non-unknown environment", () => {
    const program = fromSqliteClient({ sql })
    type EffectTypes = InferEffect<typeof program>
    expect<EffectTypes["R"]>().type.not.toBe<never>()
    expect<EffectTypes["R"]>().type.not.toBe<unknown>()
  })
  it("fails with non-unknown errors", () => {
    const program = fromSqliteClient({ sql })
    type EffectTypes = InferEffect<typeof program>
    expect<EffectTypes["E"]>().type.not.toBe<never>()
    expect<EffectTypes["E"]>().type.not.toBe<unknown>()
  })
})
