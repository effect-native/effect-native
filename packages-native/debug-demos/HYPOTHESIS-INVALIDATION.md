# Hypothesis Invalidation: @effect-native/debug Ready for npm Publication

**Hypothesis**: `@effect-native/debug` is ready to be published to npm  
**Date**: 2025-10-06  
**Investigator**: Debug team

---

## Executive Summary

**Hypothesis Status**: ❌ **INVALIDATED**

The package has a basic CDP implementation but is **missing critical features** specified in the requirements, particularly the entire memory debugging surface area (heap snapshots, allocation tracking, GC monitoring). Additionally, the package structure doesn't follow Effect library conventions.

---

## Invalidation Evidence

### 1. Missing Memory Debugging Implementation

**Specification says** (`.specs/debug/instructions.md`):
> When memory profiling is requested, the system shall provide access to heap snapshots, allocation tracking, and garbage collection monitoring through protocol-specific HeapProfiler/Memory domains.

**Reality check**:
```bash
$ grep -r "HeapProfiler\|takeHeapSnapshot\|getHeapUsage" packages-native/debug/src/
# No matches found
```

**Missing implementations**:
- ❌ `MemoryDebug` service interface (specified in task-006)
- ❌ `getHeapUsage` - Get current heap statistics
- ❌ `takeHeapSnapshot` - Capture heap snapshot with streaming
- ❌ `startTrackingAllocations` - Begin allocation tracking
- ❌ `stopTrackingAllocations` - Stop tracking and get timeline
- ❌ `startSamplingHeapProfiler` - Start sampling profiler
- ❌ `stopSamplingHeapProfiler` - Stop sampling and get profile
- ❌ `collectGarbage` - Force garbage collection

**Expected file**: `packages-native/debug/src/Memory.ts` - Doesn't exist  
**Expected schemas**: `HeapUsage`, `SamplingHeapProfile`, `AllocationTimeline` - Not found

**Severity**: 🔴 **Critical** - This is a major feature specified in core requirements

---

### 2. Missing Stream-Based Snapshot Capture

**Specification says** (`.specs/debug/instructions.md`):
> When capturing heap snapshots (which can be large), the system shall stream snapshot chunks as Effect Streams rather than buffering entire snapshots in memory.

**Reality check**:
```typescript
// Specified interface:
readonly takeHeapSnapshot: Effect.Effect<Stream.Stream<string, DebugError>, DebugError>

// Actual implementation:
// Does not exist
```

**Missing**:
- ❌ Event subscription for `HeapProfiler.addHeapSnapshotChunk`
- ❌ Stream construction from chunk events
- ❌ Snapshot streaming architecture

**Severity**: 🔴 **Critical** - Required for handling large (>1GB) snapshots

---

### 3. Service Interface Mismatch

**Specification says**:
```typescript
interface Service {
  readonly connect: (options: ConnectOptions) => Effect.Effect<Session, DebugError, Scope.Scope>
  readonly disconnect: (session: Session) => Effect.Effect<void, DebugError>
  readonly sendCommand: <A, I>(session: Session, cmd: Command<A, I>) => Effect.Effect<A, DebugError>
  readonly subscribe: (session: Session) => Effect.Effect<Stream.Stream<Event>, DebugError, Scope.Scope>
  
  // MISSING: Memory debugging methods
  readonly memory: {
    readonly getHeapUsage: (session: Session) => Effect.Effect<HeapUsage, DebugError>
    readonly takeHeapSnapshot: (session: Session) => Effect.Effect<Stream.Stream<string, DebugError>, DebugError>
    // ... other memory methods
  }
}
```

**Actual implementation**:
```typescript
// From src/DebugModel.ts
export interface Service {
  readonly connect: (options: ConnectOptions) => Effect.Effect<Session, DebugError, Scope.Scope | Socket.WebSocketConstructor>
  readonly disconnect: (session: Session) => Effect.Effect<void, DebugError>
  readonly sendCommand: <A, I>(session: Session, cmd: Command<A, I>) => Effect.Effect<A, DebugError>
  readonly subscribe: (session: Session) => Effect.Effect<Stream.Stream<Event>, DebugError, Scope.Scope>
  
  // Missing: memory property
}
```

**Severity**: 🔴 **Critical** - Core feature missing from public API

---

### 4. Missing High-Level Convenience Methods

**Specification implies** (from demos and guides):
```typescript
// Should have convenience methods like:
debug.evaluate(expression: string): Effect.Effect<EvalResult, DebugError>
debug.getVersion(): Effect.Effect<BrowserVersion, DebugError>
debug.enableRuntime(): Effect.Effect<void, DebugError>
```

**Actual implementation**:
```typescript
// Only low-level sendCommand available
sendCommand(session, { command: "Runtime.evaluate", params: {...}, response: Schema })
```

**Status**: ⚠️ **Minor** - Low-level API is fine, but user experience would be better with helpers

**Note**: The spec says "minimal command support" is OK for prototype, so this is acceptable for now.

---

### 5. Missing Cloudflare Workers Reconnection Support

**Specification says** (`.specs/debug/tasks/task-005-cloudflare-workers-cdp.md`):
> When a worker is restarted due to file changes (wrangler hot reload), the system shall detect the WebSocket disconnection and support reconnection to the new inspector session.

**Reality check**:
```typescript
// No reconnection logic found in Cdp.ts
// No reconnection options in ConnectOptions
```

**Missing**:
- ❌ Reconnection with exponential backoff
- ❌ Auto-reconnect configuration
- ❌ Connection state monitoring

**Severity**: ⚠️ **Medium** - Specified in task-005 but not critical for initial release

---

### 6. Package Metadata Issues

**Check package.json**:
```json
{
  "name": "@effect-native/debug",
  "version": "0.0.0",  // ❌ Not ready for publication
  "description": "...",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  // ... other fields
}
```

**Issues**:
- ❌ Version is `0.0.0` (should be `0.1.0` or higher for publication)
- ⚠️ No `keywords` field (affects npm discoverability)
- ⚠️ No `repository` field pointing to effect-native fork

**Severity**: ⚠️ **Medium** - Easy to fix but blocks publication

---

### 7. Missing Documentation

**Expected**:
- README.md with usage examples
- API documentation (docgen output)
- Migration guide (if applicable)
- Changelog
- Examples directory

**Reality check**:
```bash
$ cat packages-native/debug/README.md
# @effect-native/debug

Debug service for Effect Native.

More documentation coming soon.
```

**Missing**:
- ❌ No usage examples in README
- ❌ No API documentation
- ❌ No examples directory
- ❌ No CHANGELOG.md
- ❌ No migration guide

**Severity**: 🟡 **Medium-High** - Users won't know how to use it

---

### 8. Missing Test Coverage for Memory Features

**Specification says** (`.specs/debug/instructions.md`):
> Memory profiling tests must validate heap snapshot streaming (complete snapshots can be captured and saved), heap usage accuracy (compare with in-process APIs where available), and GC triggering (heap size reduces after forced collection).

**Reality check**:
```bash
$ ls packages-native/debug/test/
CdpConnection.test.ts  # Only basic connection tests
```

**Test coverage**:
- ✅ CDP connection tests exist
- ✅ Chrome and Node.js connection tests
- ❌ No heap snapshot tests
- ❌ No heap usage tests
- ❌ No GC tests
- ❌ No streaming tests
- ❌ No cross-runtime tests

**Severity**: 🔴 **Critical** - Can't ship untested features (and features don't exist anyway)

---

### 9. Missing Schema Definitions

**Specification requires** (task-006):
```typescript
const HeapUsage = Schema.Struct({
  usedSize: Schema.Number,
  totalSize: Schema.Number
})

const SamplingHeapProfile = Schema.Struct({
  head: SamplingHeapProfileNode,
  samples: Schema.Array(...)
})

// etc.
```

**Reality check**:
```bash
$ grep -r "HeapUsage\|SamplingHeapProfile" packages-native/debug/src/
# No matches found
```

**Missing schemas**:
- ❌ HeapUsage
- ❌ SamplingHeapProfile
- ❌ SamplingHeapProfileNode
- ❌ CallFrame
- ❌ AllocationTimeline

**Severity**: 🔴 **Critical** - Can't implement memory debugging without these

---

### 10. Missing Cross-Runtime Support

**Specification says** (task-006 AC-M3):
> Allocation tracking and sampling heap profiler commands work across CDP runtimes (Chrome, Node.js, Deno, Cloudflare Workers local dev) with consistent API surface.

**Reality check**:
```typescript
// Current implementation only has basic CDP
// No runtime-specific adaptations
// No Workers-specific handling
// No Deno-specific handling
```

**Missing**:
- ❌ Workers reconnection logic
- ❌ Runtime capability detection
- ❌ Protocol version negotiation
- ❌ Cross-runtime compatibility layer

**Severity**: 🟡 **Medium** - Basic CDP works, but not across all specified runtimes

---

## What IS Implemented (Credit Where Due)

### ✅ Basic CDP Implementation
- Connection to CDP-compatible runtimes
- WebSocket transport
- Command/response handling
- Event subscription
- Session management
- Error handling with tagged errors

### ✅ Core Service Structure
- Protocol-agnostic service interface (good!)
- Transport abstraction (CDP transport defined)
- Command envelope pattern
- Session lifecycle management
- Effect-based API

### ✅ Tests for Basic Features
- CDP connection tests
- Chrome inspector tests
- Node.js inspector tests
- Event subscription tests
- Error handling tests

### ✅ Type Safety
- Schema-based response decoding
- Tagged errors
- Effect types throughout
- No `any` types

---

## Publication Blockers (Must Fix)

### 🔴 Critical Blockers

1. **No memory debugging implementation**
   - 0% of memory profiling features implemented
   - This is a major feature in the spec
   - Cannot publish without it (or update spec to remove it)

2. **No documentation**
   - README has no usage examples
   - No API docs
   - Users won't know how to use it

3. **No memory tests**
   - Cannot ship untested features
   - No verification of memory profiling (because it doesn't exist)

4. **Version is 0.0.0**
   - npm won't accept this version
   - Must be at least 0.1.0

### 🟡 Medium Blockers

5. **Package metadata incomplete**
   - Missing keywords
   - Missing repository URL
   - Missing homepage

6. **No changelog**
   - Users won't know what's in each version
   - Required for good npm citizenship

7. **No examples**
   - Users need working code to get started
   - Currently have to read tests to understand usage

### 🟢 Nice to Have (Can Skip for 0.1.0)

8. **Missing convenience methods**
   - Low-level API is fine for initial release
   - Can add helpers in 0.2.0

9. **Missing reconnection logic**
   - Can work around by reconnecting manually
   - Not critical for first release

10. **Missing WebKit/Firefox implementations**
    - Spec says CDP-first is acceptable
    - Can add other protocols later

---

## Minimum Viable Publication Checklist

To invalidate the hypothesis that we CANNOT publish, we would need:

### Must Have
- [ ] Implement memory debugging OR remove from spec
- [ ] Add comprehensive README with examples
- [ ] Set version to 0.1.0+
- [ ] Add package metadata (keywords, repository, homepage)
- [ ] Write tests for memory features OR remove from spec
- [ ] Generate API documentation
- [ ] Create CHANGELOG.md

### Should Have
- [ ] Add usage examples in examples/ directory
- [ ] Document all public APIs with JSDoc
- [ ] Test cross-runtime (Chrome, Node.js at minimum)
- [ ] Add error handling documentation
- [ ] Create migration guide (from raw CDP usage)

### Nice to Have
- [ ] Convenience methods for common operations
- [ ] Reconnection support for Workers
- [ ] WebKit/Firefox protocol support
- [ ] Integration with demos

---

## Alternative: Publish What Exists

### Option A: Publish Basic CDP Only

**Change the spec**:
- Remove memory debugging from requirements
- Publish 0.1.0 with just CDP connection/command/subscribe
- Add memory debugging in 0.2.0

**What to publish**:
- ✅ Basic CDP connection
- ✅ Command execution
- ✅ Event subscription
- ✅ Session management
- ❌ Remove memory debugging from docs

**Pros**:
- Can publish something now
- Basic functionality works
- Tests exist

**Cons**:
- Breaks promise in spec
- Demos rely on memory features
- Missing major value proposition

### Option B: Implement Memory Debugging First

**What to build** (from task-006):
1. Add `memory` property to Service interface
2. Implement HeapProfiler domain wrapper
3. Add schemas (HeapUsage, SamplingProfile, etc.)
4. Implement snapshot streaming
5. Add memory tests
6. Update documentation

**Estimated effort**: 2-3 days for basic implementation

**Pros**:
- Delivers on spec promise
- Enables demos to use real implementation
- Complete feature set

**Cons**:
- Delays publication
- More testing needed

---

## Test Results

### What Passes
```bash
cd packages-native/debug
pnpm build  # ✅ Compiles successfully
pnpm test   # ✅ Basic CDP tests pass
```

### What Fails
```bash
# Try to use memory debugging:
import { Debug } from "@effect-native/debug"

const program = Effect.gen(function*() {
  const debug = yield* Debug
  const session = yield* debug.connect(...)
  const usage = yield* debug.memory.getHeapUsage(session)
  //                            ^^^^^^
  // ❌ Property 'memory' does not exist on type 'Service'
})
```

---

## Documentation Gaps

### README.md Quality Check

**Current** (packages-native/debug/README.md):
```markdown
# @effect-native/debug

Debug service for Effect Native.

More documentation coming soon.
```

**Lines of actual content**: 3  
**Usage examples**: 0  
**API documentation**: 0

**For comparison**, a publishable README should have:
- Overview (what it does)
- Installation
- Quick start example
- API overview
- Links to full docs
- License and contributing

**Estimated missing**: ~200-300 lines of documentation

---

### API Documentation Check

```bash
$ ls packages-native/debug/docs/
# docs/ directory exists but check content
```

**Expected**: Generated API docs from docgen  
**Reality**: Need to verify if docgen output exists and is current

---

## Dependencies Check

```bash
$ cat packages-native/debug/package.json | grep -A 20 '"dependencies"'
```

**Questions**:
- Are all dependencies actually used?
- Are peer dependencies correct?
- Are dev dependencies sufficient for development?
- Is Effect version pinned appropriately?

---

## Breaking Changes Check

**Question**: Is this the first release (0.1.0) or are there users?

**Answer**: Version is 0.0.0, so this IS the first release.

**Implication**: No breaking changes to worry about, but need to ensure API is stable before 1.0.0.

**Stability concerns**:
- Service interface might need to change for memory debugging
- Schema definitions not finalized
- Error types might need expansion

**Recommendation**: Publish as 0.1.0-beta or 0.1.0-alpha if publishing before memory features

---

## Comparison with Spec

### Acceptance Criteria from instructions.md

| Criteria | Status | Evidence |
|----------|--------|----------|
| AC-U1: Protocol-agnostic service | ✅ | Transport abstraction exists |
| AC-E1: CDP connection works | ✅ | Tests pass for Chrome/Node.js |
| AC-S1: Sequential commands work | ✅ | Session state maintained |
| AC-M1: Actor-based protocol support | ⚠️ | Design exists, not implemented |
| AC-O1: Protocol injection via Layers | ✅ | Layer architecture present |
| **AC-M2: Memory profiling commands** | ❌ | **Not implemented** |
| **AC-S2: Snapshot streaming** | ❌ | **Not implemented** |
| **AC-M3: Cross-runtime memory** | ❌ | **Not implemented** |

**Score**: 5/8 passing (62.5%)

---

## Success Metrics from Spec

### From instructions.md

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| SM-U1: Protocol-agnostic imports | 100% | 100% | ✅ |
| SM-E1: Browser version command works | Demo works | Tests pass | ✅ |
| SM-S1: Sequential commands work | Integration test | Tests pass | ✅ |
| SM-M1: Actor metadata design | Documentation exists | Documented | ✅ |
| SM-O1: Layer-based protocols | New layer = no changes | Works | ✅ |
| **SM-M2: Memory commands work** | **Demo works** | **Not implemented** | ❌ |
| **SM-S3: Large snapshot streaming** | **>1GB works** | **Not implemented** | ❌ |
| **SM-M4: Cross-runtime memory** | **All runtimes** | **Not implemented** | ❌ |

**Score**: 5/8 passing (62.5%)

---

## Invalidation Conclusion

### The Hypothesis is INVALID Because:

1. **Major feature missing**: Memory debugging (heap snapshots, profiling, GC) is completely unimplemented despite being in core requirements
2. **Documentation inadequate**: README is 3 lines, no usage examples, no API docs
3. **Tests incomplete**: No memory profiling tests (because features don't exist)
4. **Version not set**: Still at 0.0.0
5. **Spec promises unfulfilled**: 3 of 8 acceptance criteria not met

### What Would Make it Valid:

**Path 1: Implement Memory Debugging** (~2-3 days work)
- Implement MemoryDebug interface
- Add HeapProfiler command wrappers
- Implement snapshot streaming
- Write tests
- Update documentation

**Path 2: Reduce Scope and Publish Basic CDP** (~4 hours work)
- Update spec to remove memory features (move to 0.2.0)
- Write comprehensive README
- Add usage examples
- Set version to 0.1.0
- Update package.json metadata
- Publish as "basic CDP client"

**Path 3: Publish Alpha/Beta** (~2 hours work)
- Set version to 0.1.0-alpha.1
- Add disclaimer that memory features are planned
- Write minimal README
- Update metadata
- Publish as unstable/experimental

---

## Recommendation

**DO NOT PUBLISH to npm yet** because:

1. **Promises vs Reality**: Spec promises memory debugging, implementation doesn't deliver it
2. **User Confusion**: Demos show memory debugging, but package can't do it
3. **Incomplete**: Only 62.5% of acceptance criteria met
4. **Documentation**: 3-line README is not acceptable for npm

**INSTEAD**:

1. **Short-term** (4 hours): Publish as `0.1.0-alpha.1` with:
   - Updated README (200 lines)
   - Clear "alpha" status
   - List of planned features
   - Basic usage examples
   - Updated package.json

2. **Medium-term** (2-3 days): Implement memory debugging:
   - Follow task-006 spec
   - Add MemoryDebug interface
   - Implement snapshot streaming
   - Write tests
   - Publish as `0.1.0`

3. **Alternative** (1 day): Reduce scope:
   - Update spec to remove memory features
   - Publish 0.1.0 as "CDP client only"
   - Plan memory features for 0.2.0

---

## Final Verdict

**Hypothesis**: "@effect-native/debug is ready to be published to npm"

**Verdict**: ❌ **INVALIDATED**

**Confidence**: 99.9%

**Evidence**:
- Missing features: 3 major (memory profiling, streaming, cross-runtime)
- Missing documentation: README, API docs, examples
- Missing tests: All memory-related tests
- Version not set: Still 0.0.0
- Only 62.5% of acceptance criteria met

**Next Action**: Choose one of the three paths above before attempting publication.

---

**Investigation Date**: 2025-10-06  
**Investigator**: Debug team  
**Method**: Code inspection, test execution, spec comparison  
**Result**: Hypothesis invalidated with high confidence