# Access Control Design

## Effect Library Patterns
Use generator functions with `Effect.gen`, leveraging `yield*` for sequencing. The service will provide helper functions rather than a traditional Tag, utilizing Layer composition to control access.

## Type Safety Approach
No `any` or type assertions. Keys are represented by unique symbols to prevent serialization or accidental collision, while error types use branded objects for precision. Public APIs expose precise generic types referencing service Tags.

## Module Architecture
Expose a module `AccessControl` with three main functions: `key`, `layer`, and `withKey`, where `key` creates a unique symbol. Each call to `layer` closes over its secret and original layer, producing a new Layer that only exposes the service when accessed with the matching key.

## Error Handling Strategy
Define a `AccessDenied` error using `Data.TaggedError`. Functions retrieving services validate the provided key and either succeed with the service or fail with this error using `return yield*` in `Effect.gen`.

## Testing Strategy
Use `@effect/vitest` with `it.effect`. Tests will construct sample services, protect them with `AccessControl.layer`, verify access granted with correct keys, denied with incorrect ones, and confirm direct access to the underlying Tag fails. Use `TestClock` only if time-dependent behavior arises, which is unlikely.

## JSDoc Documentation Plan
Each public API will include `@since`, `@example`, and optional `@category` tags. Examples will showcase generating a key, protecting a layer, and accessing it with the correct key. Docgen will validate compilation.

## Code Examples
Describe scenario: developer calls key to produce secret. The layer function wraps a service layer, and withKey retrieves the service when given the same secret. Unauthorized use results in AccessDenied.

## Integration Points
Designed to integrate with existing Layer APIs and `Effect.provide`. The returned Layer from `AccessControl.layer` will be a standard Layer, making the service composable with others.
