/**
 * Slug generation utilities and schemas.
 *
 * @since 0.1.0
 */

import * as Schema from "effect/Schema"

/**
 * Converts a title string to a URL-safe slug.
 *
 * Algorithm:
 * 1. Convert to lowercase
 * 2. Replace whitespace sequences with hyphens
 * 3. Remove non-alphanumeric characters (except hyphens)
 * 4. Collapse consecutive hyphens
 * 5. Trim leading/trailing hyphens
 *
 * @since 0.1.0
 * @category Slug
 */
export const slugify = (title: string): string =>
  title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

/**
 * Schema that transforms a string into its slug form.
 *
 * @since 0.1.0
 * @category Schema
 */
export const Slug: Schema.Schema<string, string> = Schema.transform(
  Schema.String,
  Schema.String,
  {
    strict: true,
    decode: slugify,
    encode: (slug) => slug
  }
)

/**
 * Internal branded string schema for Slug.
 */
const SlugBrandedString = Schema.String.pipe(Schema.brand("Slug"))

/**
 * Brand type for slugified strings.
 *
 * @since 0.1.0
 * @category Brands
 */
export type SlugBrand = typeof SlugBrandedString.Type

/**
 * Schema for a branded slug type.
 *
 * The input string is slugified and branded.
 *
 * @since 0.1.0
 * @category Schema
 */
export const SlugBranded: Schema.Schema<SlugBrand, string> = Schema.transform(
  Schema.String,
  SlugBrandedString,
  {
    strict: true,
    decode: slugify,
    encode: (slug) => slug
  }
)
