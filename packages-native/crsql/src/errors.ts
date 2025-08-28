import * as Schema from "effect/Schema"

/**
 * @since 0.0.0
 * @category Errors
 */
export class UnhexUnavailable extends Schema.TaggedError<UnhexUnavailable>(
  "@effect-native/crsql/UnhexUnavailable"
)("UnhexUnavailable", {
  cause: Schema.optional(Schema.Defect)
}) {}

/**
 * @since 0.0.0
 * @category Errors
 */
export class CrSqliteExtensionMissing extends Schema.TaggedError<CrSqliteExtensionMissing>(
  "@effect-native/crsql/CrSqliteExtensionMissing"
)("CrSqliteExtensionMissing", {
  cause: Schema.optional(Schema.Defect)
}) {}
