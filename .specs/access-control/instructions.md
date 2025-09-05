# Access Control Feature

## Overview and User Story
We need an idiomatic, composable Effect service that gates access to arbitrary resources using a secret key. Developers can wrap any Effect Layer and ensure it is only accessible when presenting the correct key.

## Core Requirements
- Provide `AccessControl.key()` to generate unique keys.
- Keys may be reused to protect multiple layers.
- Provide an `AccessControl` service for gating Layer access.
- Support providing a protected layer via `AccessControl.layer(secret, layer)`.
- Enable access to protected services using `AccessControl.withKey(secret)(Tag)`.

## Technical Specifications
- `AccessControl.layer` replaces the original service implementation with a gate requiring the key.
- `AccessControl.key()` returns a unique opaque object for use as a key.
- Unauthorized access should fail with an AccessDenied error.
- Implement as part of the `effect` package.
- The service should expose functions for wrapping layers and for retrieving tagged services when the key matches.
- Keys are opaque values compared using reference equality.

## Acceptance Criteria
- Underlying service is unreachable without going through AccessControl.withKey.
- Access with wrong key fails with AccessDenied error.
- Protected layers remain inaccessible without the proper key.
- `AccessControl.layer` composes with `Effect.provide` like other layers.
- `AccessControl.withKey` grants access when given the correct key.

## Out of Scope
- Persistent storage of keys.
- Role-based or hierarchical permissions.
- Cryptographic guarantees beyond reference equality.

## Success Metrics
- Example in issue description runs successfully.
- Test suite demonstrates denied access with wrong keys and granted access with correct key.

## Future Considerations
- Support for revoking keys or rotating secrets.
- Integration with external authentication systems.

## Testing Requirements
- Unit tests verifying access granted with correct key and denied otherwise.
- Tests showing layering works with `Effect.provide`.
