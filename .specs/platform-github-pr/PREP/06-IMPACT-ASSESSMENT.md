# Impact Assessment: PR Helpers Module

## Friction Points

### 1. Migration from Prototype

**Risk:** Users of the prototype (action-demo) will need to update imports.
**Mitigation:**

- Document migration path
- Keep API similar where possible
- Prototype was internal, so limited blast radius

### 2. Layer Composition Complexity

**Risk:** Users may be confused about when to use event-specific layers vs parameterized operations.
**Mitigation:**

- Clear documentation with examples
- Event layers for "triggered by this event" use cases
- Parameterized operations for "access any PR" use cases

### 3. Multiple Event Support

**Risk:** Users want one action to handle multiple event types.
**Mitigation:**

- Use `ActionContext.eventName` to branch
- Use `ActionContext.typedPayload()` for type-safe access
- Document the pattern

## Benefits

### 1. Type Safety

- No more `as unknown as SomePayload` casts
- Compile-time verification of event type
- Better IDE autocomplete

### 2. Testability

- Mock layers for unit testing
- No need to construct real GitHub payloads
- Fast tests without network calls

### 3. Consistency

- Same patterns as existing ActionRunner/ActionContext/ActionClient
- Follows Effect ecosystem conventions
- Discoverable API

### 4. Flexibility

- Event-specific context for triggered events
- Parameterized operations for arbitrary access
- Both patterns available

## Human Costs

### 1. Learning Curve

- Users need to understand Event layers vs Operations
- New concepts: `IssueCommentContext`, parameterized refs
- **Mitigation:** Good docs, examples, migration guide

### 2. Boilerplate

- More imports needed
- Layer composition required
- **Mitigation:** Re-export from main index, provide convenience helpers

## Risk Assessment

| Risk                   | Likelihood | Impact | Mitigation                          |
| ---------------------- | ---------- | ------ | ----------------------------------- |
| Breaking changes       | Low        | Medium | Additive API, keep existing exports |
| Confusion about layers | Medium     | Low    | Documentation, examples             |
| Performance overhead   | Low        | Low    | Layers are lazy, minimal overhead   |
| Type complexity        | Medium     | Low    | IDE handles it, runtime is simple   |

## Go/No-Go Recommendation

**GO** - Proceed with implementation.

Rationale:

1. Benefits outweigh costs
2. Aligns with Effect ecosystem patterns
3. Solves real pain points (type safety, testability)
4. Low risk of breaking existing users
5. Clear migration path from prototype

## Success Criteria

1. ✅ Users can write type-safe issue_comment handlers
2. ✅ Users can access any PR's diff/comments without hardcoding context
3. ✅ Tests can mock GitHub API without network calls
4. ✅ Documentation includes migration guide from prototype
5. ✅ All existing Action.layer functionality preserved
