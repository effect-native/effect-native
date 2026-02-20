/**
 * Argument validation utilities for the note CLI.
 *
 * @since 0.1.0
 */

import { slugify } from "@effect-native/schemas/Slug"
import * as Array from "effect/Array"
import * as Schema from "effect/Schema"
import * as SchemaGetter from "effect/SchemaGetter"

/**
 * Checks if an argument looks like a filename (has dot, no spaces).
 *
 * Returns true if the argument contains a dot AND has no spaces.
 * This catches cases like "file.md", "test.txt", "config.json".
 *
 * @example
 * import { looksLikeFilename } from "note/Validate"
 *
 * looksLikeFilename("file.md") // true
 * looksLikeFilename("test.txt") // true
 * looksLikeFilename("hello world") // false
 *
 * @since 0.1.0
 * @category Validation
 */
export const looksLikeFilename = (arg: string): boolean => arg.includes(".") && !arg.includes(" ")

/**
 * Checks if an argument looks like a flag (starts with - or --, or contains =).
 *
 * Returns true if the argument:
 * - Starts with "-" (short flag or long flag)
 * - Contains "=" (key=value syntax)
 *
 * @example
 * import { looksLikeFlag } from "note/Validate"
 *
 * looksLikeFlag("--help") // true
 * looksLikeFlag("-v") // true
 * looksLikeFlag("key=value") // true
 * looksLikeFlag("hello") // false
 *
 * @since 0.1.0
 * @category Validation
 */
export const looksLikeFlag = (arg: string): boolean => arg.startsWith("-") || arg.includes("=")

/**
 * Schema that validates a string is a plain title word.
 *
 * Rejects strings that look like:
 * - Flags (starting with `-` or `--`, or containing `=`)
 * - Filenames (containing `.` with no spaces)
 *
 * @example
 * import * as Schema from "effect/Schema"
 * import { TitleWord } from "note/Validate"
 *
 * // Valid title words pass through
 * Schema.decodeUnknownSync(TitleWord)("hello") // "hello"
 * Schema.decodeUnknownSync(TitleWord)("my-title") // "my-title"
 *
 * @since 0.1.0
 * @category Schema
 */
export const TitleWord = Schema.String.pipe(
  Schema.check(
    Schema.makeFilter(
      (s: string) => looksLikeFlag(s) ? false : undefined,
      {
        message: (input: unknown) =>
          `"${String(input)}" looks like a flag. This tool doesn't accept flags yet.\nUsage: note <title words...>`
      }
    )
  ),
  Schema.check(
    Schema.makeFilter(
      (s: string) => looksLikeFilename(s) ? false : undefined,
      {
        message: (input: unknown) =>
          `"${String(input)}" looks like a filename. This tool creates filenames automatically.\nUsage: note <title words...>`
      }
    )
  )
)

/**
 * Parsed title input containing all derived values.
 *
 * @since 0.1.0
 * @category Models
 */
export interface TitleInput {
  /** Original words as provided */
  readonly words: Array.NonEmptyReadonlyArray<string>
  /** Joined title with spaces preserved */
  readonly title: string
  /** URL-safe slug derived from title */
  readonly slug: string
}

/**
 * Schema that transforms a non-empty array of validated title words
 * into a TitleInput containing the derived title and slug.
 *
 * Compatible with Argument.atLeast(1) which produces ReadonlyArray<string>.
 *
 * @example
 * import * as Schema from "effect/Schema"
 * import { TitleInput } from "note/Validate"
 *
 * const result = Schema.decodeUnknownSync(TitleInput)(["hello", "world"])
 * // result: { words: ["hello", "world"], title: "hello world", slug: "hello-world" }
 *
 * @since 0.1.0
 * @category Schema
 */
export const TitleInput: Schema.Codec<
  TitleInput,
  ReadonlyArray<string>
> = Schema.Array(TitleWord).pipe(
  Schema.decodeTo(
    Schema.Struct({
      words: Schema.NonEmptyArray(Schema.String),
      title: Schema.String,
      slug: Schema.String
    }),
    {
      decode: SchemaGetter.transform((words: ReadonlyArray<string>) => ({
        words: words as Array.NonEmptyReadonlyArray<string>,
        title: Array.join(words, " "),
        slug: slugify(Array.join(words, " "))
      })),
      encode: SchemaGetter.transform(({ words }: TitleInput) => words as ReadonlyArray<string>)
    }
  )
)
