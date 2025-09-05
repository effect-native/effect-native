# Access Control Requirements

## Functional Requirements
- FR1.1: The system shall provide `AccessControl.key()` to generate unique keys.
- FR1.2: The system shall allow wrapping any Layer with `AccessControl.layer(secret, layer)` so that the layer requires the secret key for access.
- FR1.3: The system shall expose `AccessControl.withKey(secret)(Tag)` to retrieve a service when provided the correct key.
- FR1.4: Keys may be reused to protect multiple layers simultaneously.
- FR1.5: Unauthorized access attempts shall fail with an `AccessDenied` error.
- FR1.6: The system shall expose `AccessControl.AccessDenied` as a public error type.

## Non-Functional Requirements
- NFR2.3: Implementation must be safe under concurrent access with no global mutable state.
- NFR2.1: Operations must remain pure and free of side effects outside of Effect.
- NFR2.2: The overhead of access control should be minimal, adding no significant runtime cost.

## Technical Constraints
- TC3.1: Keys are opaque objects compared via reference equality.
- TC3.2: `AccessControl.layer` must hide the underlying service implementation unless accessed through `AccessControl.withKey`.

## Data Requirements
- DR4.1: Keys shall not be serialized or logged.
- DR4.2: AccessDenied errors should include no sensitive key material.

## Integration Requirements
- IR5.1: The feature must integrate with `Effect.provide` for layering.
- IR5.2: The service should compose with existing Layer combinators.

## Dependencies
- DEP6.1: Depends on the `effect` core library for Tag and Layer utilities.
- DEP6.2: Introduces no additional runtime dependencies.

## Success Criteria
- SC7.1: Tests demonstrate access granted with correct key and denied with incorrect key.
- SC7.2: Example usage from issue runs successfully.
