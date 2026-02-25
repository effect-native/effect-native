/**
 * Effect Schema codecs for sqlite-graph-ext text payload contracts.
 *
 * @since 0.1.0
 */

import { Effect } from "effect"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"

const payloadToText = (payload: unknown) => {
  if (payload == null) return ""
  if (typeof payload === "string") return payload
  if (payload instanceof Uint8Array) return new TextDecoder().decode(payload)
  return String(payload)
}

const parseTsvRows = (payload: unknown) => {
  const text = payloadToText(payload)
  if (text.length === 0) return []
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => line.split("\t"))
}

const parseGroupedSetRows = (payload: unknown) => {
  const text = payloadToText(payload)
  if (text.length === 0) return []

  const lines = text.split("\n").filter((line) => line.length > 0)
  const groups: Array<{ key: string; members: Array<string> }> = []

  let currentKey: string | null = null
  let currentMembers: Array<string> = []

  for (const line of lines) {
    const tabIndex = line.indexOf("\t")
    if (tabIndex >= 0) {
      if (currentKey != null) {
        groups.push({ key: currentKey, members: currentMembers })
      }

      currentKey = line.slice(0, tabIndex)
      const firstMember = line.slice(tabIndex + 1)
      currentMembers = firstMember.length > 0 ? [firstMember] : []
      continue
    }

    if (currentKey != null) {
      currentMembers.push(line)
    }
  }

  if (currentKey != null) {
    groups.push({ key: currentKey, members: currentMembers })
  }

  return groups
}

const NullableNumberFromTextSchema = Schema.Union([Schema.Literal(""), Schema.NumberFromString]).pipe(
  Schema.decodeTo(Schema.NullOr(Schema.Number), {
    decode: SchemaGetter.transform((value) => (value === "" ? null : value)),
    encode: SchemaGetter.transform((value) => (value == null ? "" : value))
  })
)

export const IdsetEachRowSchema = Schema.Tuple([Schema.String, Schema.NumberFromString]).pipe(
  Schema.decodeTo(
    Schema.Struct({
      id: Schema.String,
      ord: Schema.Number
    }),
    {
      decode: SchemaGetter.transform(([id, ord]) => ({ id, ord })),
      encode: SchemaGetter.transform(({ id, ord }) => [id, ord])
    }
  )
)

export type IdsetEachRow = Schema.Schema.Type<typeof IdsetEachRowSchema>

export const GraphOutManyRowSchema = Schema.Tuple([Schema.String, Schema.String]).pipe(
  Schema.decodeTo(
    Schema.Struct({
      src: Schema.String,
      dst: Schema.String
    }),
    {
      decode: SchemaGetter.transform(([src, dst]) => ({ src, dst })),
      encode: SchemaGetter.transform(({ src, dst }) => [src, dst])
    }
  )
)

export type GraphOutManyRow = Schema.Schema.Type<typeof GraphOutManyRowSchema>

export const GraphInManyRowSchema = Schema.Tuple([Schema.String, Schema.String]).pipe(
  Schema.decodeTo(
    Schema.Struct({
      dst: Schema.String,
      src: Schema.String
    }),
    {
      decode: SchemaGetter.transform(([dst, src]) => ({ dst, src })),
      encode: SchemaGetter.transform(({ dst, src }) => [dst, src])
    }
  )
)

export type GraphInManyRow = Schema.Schema.Type<typeof GraphInManyRowSchema>

const GroupedSetPayloadSchema = Schema.Struct({
  key: Schema.String,
  members: Schema.Array(Schema.String)
})

export const GraphOutIdsetRowSchema = GroupedSetPayloadSchema.pipe(
  Schema.decodeTo(
    Schema.Struct({
      src: Schema.String,
      dstSet: Schema.Array(Schema.String)
    }),
    {
      decode: SchemaGetter.transform(({ key, members }) => ({ src: key, dstSet: members })),
      encode: SchemaGetter.transform(({ src, dstSet }) => ({ key: src, members: dstSet }))
    }
  )
)

export type GraphOutIdsetRow = Schema.Schema.Type<typeof GraphOutIdsetRowSchema>

export const GraphInIdsetRowSchema = GroupedSetPayloadSchema.pipe(
  Schema.decodeTo(
    Schema.Struct({
      dst: Schema.String,
      srcSet: Schema.Array(Schema.String)
    }),
    {
      decode: SchemaGetter.transform(({ key, members }) => ({ dst: key, srcSet: members })),
      encode: SchemaGetter.transform(({ dst, srcSet }) => ({ key: dst, members: srcSet }))
    }
  )
)

export type GraphInIdsetRow = Schema.Schema.Type<typeof GraphInIdsetRowSchema>

export const TwoHopCountRowSchema = Schema.Tuple([Schema.String, Schema.NumberFromString]).pipe(
  Schema.decodeTo(
    Schema.Struct({
      dst: Schema.String,
      supportCount: Schema.Number
    }),
    {
      decode: SchemaGetter.transform(([dst, supportCount]) => ({ dst, supportCount })),
      encode: SchemaGetter.transform(({ dst, supportCount }) => [dst, supportCount])
    }
  )
)

export type TwoHopCountRow = Schema.Schema.Type<typeof TwoHopCountRowSchema>

const RankedDiffStatusSchema = Schema.Literals(["entered", "exited", "moved", "unchanged"])

export const RankedDiffRowSchema = Schema.Tuple([
  Schema.String,
  NullableNumberFromTextSchema,
  NullableNumberFromTextSchema,
  NullableNumberFromTextSchema,
  RankedDiffStatusSchema
]).pipe(
  Schema.decodeTo(
    Schema.Struct({
      item: Schema.String,
      oldRank: Schema.NullOr(Schema.Number),
      newRank: Schema.NullOr(Schema.Number),
      deltaRank: Schema.NullOr(Schema.Number),
      status: RankedDiffStatusSchema
    }),
    {
      decode: SchemaGetter.transform(([item, oldRank, newRank, deltaRank, status]) => ({
        item,
        oldRank,
        newRank,
        deltaRank,
        status
      })),
      encode: SchemaGetter.transform(({ item, oldRank, newRank, deltaRank, status }) => [
        item,
        oldRank,
        newRank,
        deltaRank,
        status
      ])
    }
  )
)

export type RankedDiffRow = Schema.Schema.Type<typeof RankedDiffRowSchema>

const decodeIdsetEachRows = Schema.decodeUnknownSync(Schema.Array(IdsetEachRowSchema))
const decodeGraphOutManyRows = Schema.decodeUnknownSync(Schema.Array(GraphOutManyRowSchema))
const decodeGraphInManyRows = Schema.decodeUnknownSync(Schema.Array(GraphInManyRowSchema))
const decodeTwoHopCountRows = Schema.decodeUnknownSync(Schema.Array(TwoHopCountRowSchema))
const decodeRankedDiffRows = Schema.decodeUnknownSync(Schema.Array(RankedDiffRowSchema))
const decodeGraphOutIdsetRows = Schema.decodeUnknownSync(Schema.Array(GraphOutIdsetRowSchema))
const decodeGraphInIdsetRows = Schema.decodeUnknownSync(Schema.Array(GraphInIdsetRowSchema))

export const decodeIdsetEachPayload = (payload: unknown) =>
  Effect.try({
    try: () => decodeIdsetEachRows(parseTsvRows(payload)),
    catch: (cause) => cause
  })

export const decodeGraphOutManyPayload = (payload: unknown) =>
  Effect.try({
    try: () => decodeGraphOutManyRows(parseTsvRows(payload)),
    catch: (cause) => cause
  })

export const decodeGraphInManyPayload = (payload: unknown) =>
  Effect.try({
    try: () => decodeGraphInManyRows(parseTsvRows(payload)),
    catch: (cause) => cause
  })

export const decodeTwoHopCountPayload = (payload: unknown) =>
  Effect.try({
    try: () => decodeTwoHopCountRows(parseTsvRows(payload)),
    catch: (cause) => cause
  })

export const decodeRankedDiffPayload = (payload: unknown) =>
  Effect.try({
    try: () => decodeRankedDiffRows(parseTsvRows(payload)),
    catch: (cause) => cause
  })

export const decodeGraphOutIdsetPayload = (payload: unknown) =>
  Effect.try({
    try: () => decodeGraphOutIdsetRows(parseGroupedSetRows(payload)),
    catch: (cause) => cause
  })

export const decodeGraphInIdsetPayload = (payload: unknown) =>
  Effect.try({
    try: () => decodeGraphInIdsetRows(parseGroupedSetRows(payload)),
    catch: (cause) => cause
  })

export const payloadPreview = (payload: unknown) => {
  const text = payloadToText(payload)
  if (text.length <= 240) return text
  return `${text.slice(0, 240)}...`
}
