# @effect-native/fizzy-api-client Instructions

## Context

Fizzy is Basecamp's new card-based project management tool that provides a REST API for programmatic access to boards, cards, comments, steps, and other project management resources. The Fizzy API follows RESTful conventions and returns JSON responses.

Currently, developers using Effect-TS who want to integrate with Fizzy must:
- Manually make HTTP requests using @effect/platform HttpClient
- Handle API authentication and error responses themselves
- Write their own type definitions for API requests and responses
- Implement pagination logic manually
- Handle rate limiting and retries without guidance

The effect-native ecosystem already provides platform packages for GitHub Actions, Node.js, Bun, and browsers. Adding a Fizzy API client package would enable Effect-TS developers to easily integrate Fizzy project management capabilities into their applications and workflows.

## User Story

**As a** developer building applications with Effect-TS that need to integrate with Fizzy,
**I want** type-safe, Effect-native wrappers for the Fizzy REST API,
**So that** I can interact with Fizzy boards, cards, and other resources with proper error handling, composability, and testability without writing boilerplate HTTP client code.

## High-Level Goals

1. **Provide Effect-native HTTP client for Fizzy API**
   - Built on @effect/platform HttpClient
   - Account-scoped API client service
   - Authentication via API token (User-Agent + Authorization headers)
   - Proper error types for API failures (4xx, 5xx, network errors)
   - Retry logic for transient failures

2. **Provide type-safe services for all Fizzy resources**
   - Boards (list, get, create, update, delete)
   - Cards (list, get, create, update, delete, move, archive)
   - Comments (list, get, create, update, delete)
   - Reactions (list, create, delete)
   - Steps (get, create, update, delete)
   - Tags (list)
   - Columns (list, get, create, update, delete)
   - Users (list, get, update, deactivate)
   - Notifications (list, mark read/unread, bulk mark read)

3. **Support common API patterns**
   - Pagination for list endpoints
   - Filtering (e.g., cards by column, status, tags, assignees)
   - Nested resource access (e.g., comments on a card)
   - File uploads (e.g., card covers, user avatars)
   - Proper handling of Location headers for created resources

4. **Support testability**
   - Mock layers for all services
   - Easy testing without Fizzy account
   - Integration with @effect/vitest
   - Test helpers for common scenarios

5. **Follow Effect platform conventions**
   - TypeId pattern for services
   - Tagged errors with actionable messages
   - Layer-based dependency injection
   - Schema validation for all API types
   - JSDoc with @since and @category tags
   - Pipeable API design

## Out of Scope

### For v1.0

- **Webhooks** - Fizzy API doesn't document webhook endpoints (may add if/when available)
- **Real-time updates** - No WebSocket or SSE support documented (may add if/when available)
- **Bulk operations** - No batch API documented; can be added as convenience layer later
- **Advanced caching** - Basic HTTP caching only; no intelligent cache invalidation
- **Rate limit prediction** - Only reactive rate limit handling, no proactive throttling
- **OAuth flow** - Focus on API token authentication only (user-provided tokens)
- **CLI tooling** - No command-line tools for Fizzy management
- **Admin operations** - Only documented API endpoints; no undocumented admin features

### Permanently Out of Scope

- **Web UI components** - Different concern; this is an API client only
- **Fizzy hosting/infrastructure** - This interacts with existing Fizzy instances
- **Alternative authentication methods** - Fizzy only supports API tokens per documentation
- **Custom Fizzy server implementation** - This is a client for Basecamp's Fizzy service
