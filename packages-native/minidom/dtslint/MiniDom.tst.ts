/* eslint-disable @typescript-eslint/no-unused-vars */
import * as MiniDom from "@effect-native/minidom"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import { describe, expect, it } from "tstyche"

type InferEffect<Eff> = Eff extends Effect.Effect<infer A, infer E, infer R> ? { A: A; E: E; R: R } : never

declare const document: MiniDom.Nodes.Document
declare const baseEffect: Effect.Effect<number, never, never>
declare const syncProgram: Effect.Effect<number, never, never>

describe("MiniDom Nodes", () => {
  it("createProcessingInstruction returns typed effect", () => {
    const program = document.createProcessingInstruction("target", "data")
    type Types = InferEffect<typeof program>
    expect<Types["A"]>().type.toBeAssignableWith<MiniDom.Nodes.ProcessingInstruction>()
    expect<Types["E"]>().type.toBeAssignableWith<MiniDom.MiniDomError.MiniDomError>()
  })

  it("createDocumentFragment returns typed effect", () => {
    const program = document.createDocumentFragment()
    type Types = InferEffect<typeof program>
    expect<Types["A"]>().type.toBeAssignableWith<MiniDom.Nodes.DocumentFragment>()
    expect<Types["E"]>().type.toBeAssignableWith<MiniDom.MiniDomError.MiniDomError>()
  })
})

describe("MiniDom Events", () => {
  it("mutation widens environment with Events.Tag", () => {
    const program = MiniDom.Events.mutation(baseEffect, ["node"])
    type Types = InferEffect<typeof program>
    expect<Types["A"]>().type.toBeAssignableWith<number>()
    expect<Types["R"]>().type.toBeAssignableWith<MiniDom.Events.Tag>()
  })
})

describe("MiniDom Sync", () => {
  it("detect returns Option<MiniDom.Sync.Sync>", () => {
    const capability = MiniDom.SyncCapability.detect(() => syncProgram)
    expect<typeof capability>().type.toBeAssignableWith<Option.Option<MiniDom.SyncCapability.SyncCapability>>()
  })
})
