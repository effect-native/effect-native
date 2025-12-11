# @effect-native/fizzy-api-client Requirements

## Architectural Requirements

### AR-1: Platform Integration

**AR-1.1** (Ubiquitous)
The package shall use `@effect/platform` HttpClient for all HTTP communication with Fizzy API servers.

**AR-1.2** (Ubiquitous)
The package shall work with any Effect-compatible HTTP client implementation (Node, Browser, Bun, etc.).

**AR-1.3** (Ubiquitous)
All API responses shall be validated against Effect Schemas to ensure type safety at runtime.

### AR-2: Service Architecture

**AR-2.1** (Ubiquitous)
All Fizzy resources (Boards, Cards, Comments, etc.) shall be provided as Effect services using the TypeId + Context.GenericTag pattern.

**AR-2.2** (Ubiquitous)
Services shall be composable through Effect's layer system for dependency injection.

**AR-2.3** (Ubiquitous)
Each service shall depend only on FizzyClient service, not directly on HttpClient.

### AR-3: Error Handling

**AR-3.1** (Ubiquitous)
All API operations shall return Effect types with proper error channels, never throwing exceptions.

**AR-3.2** (Ubiquitous)
Error types shall be tagged and contain actionable information including HTTP status, endpoint, and error details.

**AR-3.3** (Ubiquitous)
Network errors, parsing errors, and API errors shall be distinct error types.

### AR-4: Configuration

**AR-4.1** (Ubiquitous)
The FizzyClient service shall require configuration containing: base URL, account slug, and API token.

**AR-4.2** (Ubiquitous)
Configuration shall be validated at layer construction time, before any API calls are made.

**AR-4.3** (Ubiquitous)
API tokens shall be handled as Redacted strings to prevent accidental logging.

---

## Functional Requirements

### FR-1: FizzyClient Service

#### FR-1.1: Client Construction

**FR-1.1.1** (Ubiquitous)
The FizzyClient service shall provide a configured HTTP client for making authenticated requests to Fizzy API.

**FR-1.1.2** (Ubiquitous)
The client shall automatically include required headers: User-Agent and Authorization (Bearer token).

**FR-1.1.3** (Ubiquitous)
The client shall construct URLs in the format: `{baseUrl}/{accountSlug}/{endpoint}`.

#### FR-1.2: Request Methods

**FR-1.2.1** (Ubiquitous)
The `request` method shall accept: HTTP method, endpoint path, optional body, optional query parameters.

**FR-1.2.2** (Event-Driven)
When a request returns a 2xx status code,
the System shall parse the response body using the provided Schema and return the result.

**FR-1.2.3** (Unwanted Behavior)
If a request returns a 4xx status code,
the System shall fail with a FizzyClientError containing the status, message, and endpoint.

**FR-1.2.4** (Unwanted Behavior)
If a request returns a 5xx status code,
the System shall retry up to 3 times with exponential backoff before failing.

**FR-1.2.5** (Unwanted Behavior)
If a network error occurs,
the System shall fail with a FizzyNetworkError containing the cause.

#### FR-1.3: Response Handling

**FR-1.3.1** (Event-Driven)
When a POST request succeeds with a Location header,
the System shall extract and return the created resource URL.

**FR-1.3.2** (Event-Driven)
When a DELETE request succeeds with 204 No Content,
the System shall return void (Effect.void).

**FR-1.3.3** (Event-Driven)
When a PUT request succeeds with 204 No Content,
the System shall return void (Effect.void).

---

### FR-2: Board Service

#### FR-2.1: List Boards

**FR-2.1.1** (Ubiquitous)
The `Board.list()` method shall return an Effect that fetches all boards in the account.

**FR-2.1.2** (Ubiquitous)
Board list response shall include: id, title, description, created_at, updated_at, url.

#### FR-2.2: Get Board

**FR-2.2.1** (Event-Driven)
When `Board.get(boardId)` is called,
the System shall fetch the board with the specified ID.

**FR-2.2.2** (Unwanted Behavior)
If the board does not exist,
the System shall fail with a FizzyClientError with status 404.

#### FR-2.3: Create Board

**FR-2.3.1** (Event-Driven)
When `Board.create(data)` is called with title and optional description,
the System shall create a new board and return the Location URL.

**FR-2.3.2** (Ubiquitous)
The title parameter shall be required and non-empty.

#### FR-2.4: Update Board

**FR-2.4.1** (Event-Driven)
When `Board.update(boardId, data)` is called,
the System shall update the board with the provided fields (title and/or description).

#### FR-2.5: Delete Board

**FR-2.5.1** (Event-Driven)
When `Board.delete(boardId)` is called,
the System shall delete the board and return void on success.

---

### FR-3: Card Service

#### FR-3.1: List Cards

**FR-3.1.1** (Event-Driven)
When `Card.list(options)` is called without filters,
the System shall return all cards in the account.

**FR-3.1.2** (Event-Driven)
When `Card.list(options)` is called with `columnId` filter,
the System shall return only cards in the specified column.

**FR-3.1.3** (Event-Driven)
When `Card.list(options)` is called with `status` filter,
the System shall return only cards with the specified status (draft, published, archived).

**FR-3.1.4** (Event-Driven)
When `Card.list(options)` is called with `tagIds` filter,
the System shall return only cards with all specified tags.

**FR-3.1.5** (Event-Driven)
When `Card.list(options)` is called with `assigneeIds` filter,
the System shall return only cards assigned to any of the specified users.

**FR-3.1.6** (Ubiquitous)
Card list response shall include: id, number, title, body, status, creator, assignees, tags, column, due_date, created_at, updated_at, url.

#### FR-3.2: Get Card

**FR-3.2.1** (Event-Driven)
When `Card.get(cardNumber)` is called,
the System shall fetch the card with the specified card number (not ID).

**FR-3.2.2** (Ubiquitous)
Card response shall include all fields from list response plus full body content.

#### FR-3.3: Create Card

**FR-3.3.1** (Event-Driven)
When `Card.create(data)` is called with required title and columnId,
the System shall create a new card and return the Location URL.

**FR-3.3.2** (Ubiquitous)
Optional create fields shall include: body, status, assignee_ids, tag_ids, due_date, cover.

**FR-3.3.3** (Event-Driven)
When creating a card with a cover field,
the System shall upload the file as multipart/form-data.

#### FR-3.4: Update Card

**FR-3.4.1** (Event-Driven)
When `Card.update(cardNumber, data)` is called,
the System shall update the card with the provided fields.

**FR-3.4.2** (Ubiquitous)
Updatable fields shall include: title, body, due_date, assignee_ids, tag_ids, cover.

#### FR-3.5: Move Card

**FR-3.5.1** (Event-Driven)
When `Card.move(cardNumber, data)` is called with columnId and optional position,
the System shall move the card to the specified column.

**FR-3.5.2** (Event-Driven)
When position is "top",
the System shall move the card to the top of the column.

**FR-3.5.3** (Event-Driven)
When position is "bottom" or omitted,
the System shall move the card to the bottom of the column.

#### FR-3.6: Archive Card

**FR-3.6.1** (Event-Driven)
When `Card.archive(cardNumber)` is called,
the System shall set the card status to archived.

#### FR-3.7: Delete Card

**FR-3.7.1** (Event-Driven)
When `Card.delete(cardNumber)` is called,
the System shall permanently delete the card and return void on success.

---

### FR-4: Comment Service

#### FR-4.1: List Comments

**FR-4.1.1** (Event-Driven)
When `Comment.list(cardNumber)` is called,
the System shall return all comments on the specified card.

**FR-4.1.2** (Ubiquitous)
Comment response shall include: id, body, creator, created_at, updated_at, url.

#### FR-4.2: Get Comment

**FR-4.2.1** (Event-Driven)
When `Comment.get(cardNumber, commentId)` is called,
the System shall fetch the specified comment.

#### FR-4.3: Create Comment

**FR-4.3.1** (Event-Driven)
When `Comment.create(cardNumber, data)` is called with body text,
the System shall create a new comment and return the Location URL.

**FR-4.3.2** (Ubiquitous)
The body parameter shall be required and non-empty.

#### FR-4.4: Update Comment

**FR-4.4.1** (Event-Driven)
When `Comment.update(cardNumber, commentId, data)` is called,
the System shall update the comment body.

**FR-4.4.2** (Unwanted Behavior)
If the authenticated user is not the comment creator,
the System shall fail with a FizzyClientError with status 403.

#### FR-4.5: Delete Comment

**FR-4.5.1** (Event-Driven)
When `Comment.delete(cardNumber, commentId)` is called,
the System shall delete the comment and return void on success.

**FR-4.5.2** (Unwanted Behavior)
If the authenticated user is not the comment creator,
the System shall fail with a FizzyClientError with status 403.

---

### FR-5: Reaction Service

#### FR-5.1: List Reactions

**FR-5.1.1** (Event-Driven)
When `Reaction.list(cardNumber, commentId)` is called,
the System shall return all reactions on the specified comment.

**FR-5.1.2** (Ubiquitous)
Reaction response shall include: id, content, reacter (user object), url.

#### FR-5.2: Create Reaction

**FR-5.2.1** (Event-Driven)
When `Reaction.create(cardNumber, commentId, data)` is called with content,
the System shall add a reaction to the comment.

**FR-5.2.2** (Ubiquitous)
The content parameter shall be a string with maximum 16 characters.

#### FR-5.3: Delete Reaction

**FR-5.3.1** (Event-Driven)
When `Reaction.delete(cardNumber, commentId, reactionId)` is called,
the System shall remove the reaction and return void on success.

**FR-5.3.2** (Unwanted Behavior)
If the authenticated user is not the reaction creator,
the System shall fail with a FizzyClientError with status 403.

---

### FR-6: Step Service

#### FR-6.1: Get Step

**FR-6.1.1** (Event-Driven)
When `Step.get(cardNumber, stepId)` is called,
the System shall fetch the specified step.

**FR-6.1.2** (Ubiquitous)
Step response shall include: id, content, completed.

#### FR-6.2: Create Step

**FR-6.2.1** (Event-Driven)
When `Step.create(cardNumber, data)` is called with content text,
the System shall create a new step and return the Location URL.

**FR-6.2.2** (Ubiquitous)
The completed field shall default to false if not provided.

#### FR-6.3: Update Step

**FR-6.3.1** (Event-Driven)
When `Step.update(cardNumber, stepId, data)` is called,
the System shall update the step content and/or completed status.

#### FR-6.4: Delete Step

**FR-6.4.1** (Event-Driven)
When `Step.delete(cardNumber, stepId)` is called,
the System shall delete the step and return void on success.

---

### FR-7: Tag Service

#### FR-7.1: List Tags

**FR-7.1.1** (Ubiquitous)
The `Tag.list()` method shall return all tags in the account, sorted alphabetically.

**FR-7.1.2** (Ubiquitous)
Tag response shall include: id, title, created_at, url.

---

### FR-8: Column Service

#### FR-8.1: List Columns

**FR-8.1.1** (Event-Driven)
When `Column.list(boardId)` is called,
the System shall return all columns on the specified board, sorted by position.

**FR-8.1.2** (Ubiquitous)
Column response shall include: id, name, color, created_at.

#### FR-8.2: Get Column

**FR-8.2.1** (Event-Driven)
When `Column.get(boardId, columnId)` is called,
the System shall fetch the specified column.

#### FR-8.3: Create Column

**FR-8.3.1** (Event-Driven)
When `Column.create(boardId, data)` is called with name,
the System shall create a new column and return the Location URL.

**FR-8.3.2** (Ubiquitous)
The color field shall be optional and must be one of the predefined color values if provided.

**FR-8.3.3** (Ubiquitous)
Valid color values shall be: var(--color-card-default), var(--color-card-1) through var(--color-card-8).

#### FR-8.4: Update Column

**FR-8.4.1** (Event-Driven)
When `Column.update(boardId, columnId, data)` is called,
the System shall update the column name and/or color.

#### FR-8.5: Delete Column

**FR-8.5.1** (Event-Driven)
When `Column.delete(boardId, columnId)` is called,
the System shall delete the column and return void on success.

---

### FR-9: User Service

#### FR-9.1: List Users

**FR-9.1.1** (Ubiquitous)
The `User.list()` method shall return all active users in the account.

**FR-9.1.2** (Ubiquitous)
User response shall include: id, name, role, active, email_address, created_at, url.

**FR-9.1.3** (Ubiquitous)
The role field shall be one of: owner, member.

#### FR-9.2: Get User

**FR-9.2.1** (Event-Driven)
When `User.get(userId)` is called,
the System shall fetch the specified user.

#### FR-9.3: Update User

**FR-9.3.1** (Event-Driven)
When `User.update(userId, data)` is called,
the System shall update the user name and/or avatar.

**FR-9.3.2** (Unwanted Behavior)
If the authenticated user does not have permission to update the target user,
the System shall fail with a FizzyClientError with status 403.

**FR-9.3.3** (Event-Driven)
When updating with an avatar file,
the System shall upload the file as multipart/form-data.

#### FR-9.4: Deactivate User

**FR-9.4.1** (Event-Driven)
When `User.deactivate(userId)` is called,
the System shall deactivate the user and return void on success.

**FR-9.4.2** (Unwanted Behavior)
If the authenticated user does not have permission to deactivate the target user,
the System shall fail with a FizzyClientError with status 403.

---

### FR-10: Notification Service

#### FR-10.1: List Notifications

**FR-10.1.1** (Ubiquitous)
The `Notification.list()` method shall return notifications for the authenticated user.

**FR-10.1.2** (Ubiquitous)
Unread notifications shall be returned first, followed by read notifications.

**FR-10.1.3** (Ubiquitous)
Notification response shall include: id, read, read_at, created_at, title, body, creator, card, url.

#### FR-10.2: Mark as Read

**FR-10.2.1** (Event-Driven)
When `Notification.markRead(notificationId)` is called,
the System shall mark the notification as read and return void on success.

#### FR-10.3: Mark as Unread

**FR-10.3.1** (Event-Driven)
When `Notification.markUnread(notificationId)` is called,
the System shall mark the notification as unread and return void on success.

#### FR-10.4: Bulk Mark as Read

**FR-10.4.1** (Event-Driven)
When `Notification.markAllRead()` is called,
the System shall mark all unread notifications as read and return void on success.

---

### FR-11: Error Types

**FR-11.1** (Ubiquitous)
FizzyClientError shall contain: status code, message, endpoint path, response body.

**FR-11.2** (Ubiquitous)
FizzyNetworkError shall contain: cause (underlying network error), endpoint path.

**FR-11.3** (Ubiquitous)
FizzyParseError shall contain: expected schema, actual response, parsing error details.

**FR-11.4** (Ubiquitous)
FizzyConfigError shall contain: reason (InvalidUrl, MissingToken, MissingAccountSlug).

---

## Non-Functional Requirements

### NFR-1: Compatibility

**NFR-1.1**
The package shall work with Node.js versions 18, 20, and 22.

**NFR-1.2**
The package shall work with Bun runtime.

**NFR-1.3**
The package shall work with browser environments when used with appropriate HTTP client layers.

**NFR-1.4**
The package shall support any Fizzy API server that implements the documented API specification.

### NFR-2: Performance

**NFR-2.1**
Simple GET requests shall complete in under 100ms excluding network latency.

**NFR-2.2**
Schema validation shall complete in under 10ms for typical API responses.

**NFR-2.3**
Client construction shall complete in under 20ms.

### NFR-3: Retry Logic

**NFR-3.1**
Failed requests due to 5xx errors shall retry up to 3 times.

**NFR-3.2**
Retry delays shall use exponential backoff: 1s, 2s, 4s.

**NFR-3.3**
Network timeout errors shall retry with the same backoff strategy.

**NFR-3.4**
Client errors (4xx) shall NOT retry automatically.

### NFR-4: Documentation

**NFR-4.1**
All public exports shall have JSDoc with `@since` and `@category` tags.

**NFR-4.2**
All public methods shall have `@example` tags showing typical usage.

**NFR-4.3**
Error messages shall be actionable and include endpoint paths and status codes.

**NFR-4.4**
Each service module shall have a module-level JSDoc describing its purpose.

### NFR-5: Testing

**NFR-5.1**
All services shall have mock/test layers that don't require network access.

**NFR-5.2**
Test coverage shall be at least 80% for all service methods.

**NFR-5.3**
Integration tests shall be runnable against a real Fizzy instance using environment variables.

**NFR-5.4**
Tests shall use @effect/vitest for Effect-aware testing.

### NFR-6: Security

**NFR-6.1**
API tokens shall be handled as Redacted strings throughout the codebase.

**NFR-6.2**
Tokens shall never appear in error messages or logs.

**NFR-6.3**
File upload operations shall validate file types and sizes before sending.

**NFR-6.4**
URL construction shall prevent path traversal vulnerabilities.

---

## Constraints

### C-1: Dependencies

**C-1.1**
The package shall depend on `@effect/platform` for HTTP client abstractions.

**C-1.2**
The package shall depend on `@effect/schema` for validation and type generation.

**C-1.3**
Effect packages (`effect`, `@effect/platform`, `@effect/schema`) shall be peer dependencies.

**C-1.4**
The package shall NOT depend on any Fizzy-specific SDKs; it shall use HTTP directly.

### C-2: Effect Patterns

**C-2.1**
All services shall use TypeId + Context.GenericTag pattern.

**C-2.2**
Error types shall use Schema.TaggedError for automatic schema derivation.

**C-2.3**
All API types shall be defined using @effect/schema Schema definitions.

**C-2.4**
The package shall follow pipeable API design for composability.

### C-3: Package Structure

**C-3.1**
The package shall be located at `packages-native/fizzy-api-client/`.

**C-3.2**
The package shall follow effect-native monorepo conventions.

**C-3.3**
The package name shall be `@effect-native/fizzy-api-client`.

**C-3.4**
The package shall use `@effect/build-utils` for building.

### C-4: API Alignment

**C-4.1**
All endpoints shall match the Fizzy API specification exactly.

**C-4.2**
Request and response formats shall conform to the documented Fizzy API.

**C-4.3**
The package shall support all endpoints documented in the Fizzy API as of version 1.0.

**C-4.4**
Future API additions may be added in minor version updates.
