/**
 * Event-specific context services for GitHub Actions.
 *
 * These modules provide typed access to webhook payloads for specific event types.
 * Each module validates the event type at layer construction, failing fast if
 * the event doesn't match.
 *
 * @since 1.0.0
 */

/**
 * @since 1.0.0
 */
export * as IssueComment from "./IssueComment.js"
