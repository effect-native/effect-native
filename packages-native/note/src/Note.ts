/**
 * Core note creation logic.
 *
 * @since 0.1.0
 */

import { slugify } from "@effect-native/schemas/Slug"

/**
 * Generates the note filename from title and date.
 *
 * Format: `note-YYYY-MM-DD-<slug>.md`
 *
 * @since 0.1.0
 * @category Note
 */
export const makeFilename = (title: string, date: Date): string => {
  const dateStr = date.toISOString().slice(0, 10)
  const slug = slugify(title)
  return `note-${dateStr}-${slug}.md`
}

/**
 * Generates the note markdown content.
 *
 * Format:
 * ```
 * # <title>
 *
 * Created: <ISO-8601-timestamp>
 * ```
 *
 * @since 0.1.0
 * @category Note
 */
export const makeContent = (title: string, timestamp: Date): string =>
  `# ${title}\n\nCreated: ${timestamp.toISOString()}\n`
