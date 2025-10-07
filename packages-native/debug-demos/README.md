# @effect-native/debug-demos

Demonstration projects for memory debugging and profiling using the Chrome DevTools Protocol and Effect.

## Overview

This package contains practical examples of:

1. **Memory leak detection** using the three-snapshot technique
2. **Heap snapshot analysis** with Chrome DevTools Protocol
3. **Automated leak detection** tools built with Effect
4. **Common leak patterns** and their fixes

These demos accompany the comprehensive guide in [BLOG-POST.md](./BLOG-POST.md): "Hunting Memory Leaks in Node.js: A Practical Guide with Effect and Chrome DevTools Protocol"

## Installation

```bash
cd packages-native/debug-demos
pnpm install
```

## Demos

### 1. Memory Leak Demo (Intentionally Leaky)

**File**: `src/memory-leak-demo.ts`

A realistic web crawler application with **four intentional memory leaks**:

- **Leak #1**: Unbounded cache that never evicts entries
- **Leak #2**: Event listeners that accumulate without cleanup
- **Leak #3**: Closures capturing large objects unnecessarily
- **Leak #4**: Global array that grows forever

**Run**:

```bash
# Start with inspector on port 9229
pnpm demo:leak

# Or start in break mode (wait for debugger)
pnpm demo:leak:wait
```

**Expected Behavior**:
- Memory grows linearly (~16 MB per iteration)
- After 10 iterations: ~200 MB heap usage
- After 20 iterations: OOM crash

**Output**:

```
🚀 Starting Memory Leak Demo
📊 This app intentionally leaks memory

📈 Iteration 1 complete
   Pages crawled: 10
   Cache size: 8.42 MB (10 entries)
   Heap used: 24.31 MB

📈 Iteration 10 complete
   Pages crawled: 100
   Cache size: 84.23 MB (100 entries)
   Heap used: 215.47 MB
   🔴 CRITICAL: Memory leak detected!
```

### 2. Fixed Version

**File**: `src/memory-leak-fixed.ts`

The same application with **all leaks fixed**:

- **Fix #1**: Bounded LRU cache with automatic eviction
- **Fix #2**: Event listeners properly removed
- **Fix #3**: Closures only capture needed data
- **Fix #4**: Circular buffer instead of unbounded array

**Run**:

```bash
pnpm demo:fixed
```

**Expected Behavior**:
- Memory stabilizes around 30-32 MB
- No growth after stabilization
- Runs indefinitely without OOM

**Output**:

```
🚀 Starting Memory Leak Demo - FIXED VERSION
✅ This version has all leaks fixed

📈 Iteration 1 complete
   Heap used: 24.31 MB

📈 Iteration 50 complete
   Heap used: 32.18 MB
   ✅ Memory usage is stable!
```

### 3. Automated Leak Detector

**File**: `src/leak-detector.ts`

Implements the **three-snapshot technique** for automated leak detection:

1. Takes baseline snapshot
2. Performs suspected action
3. Takes second snapshot
4. Repeats action
5. Takes third snapshot
6. Analyzes heap growth

**Run**:

```bash
# Start the leaky app first
pnpm demo:leak

# Then run detector (in another terminal)
pnpm demo:detector
```

**Output**:

```
🔍 Starting Memory Leak Detection

📊 STEP 1: Taking baseline snapshot
✅ Snapshot saved: baseline.heapsnapshot (24.31 MB)

📊 STEP 2: Performing action (first time)
✅ Snapshot saved: after-first-action.heapsnapshot (40.62 MB)

📊 STEP 3: Performing action again
✅ Snapshot saved: after-second-action.heapsnapshot (56.93 MB)

📊 STEP 4: Analyzing snapshots

🔴 MEMORY LEAK DETECTED!

The heap grew by 32.62 MB (134.2%) across the two actions.

Next Steps:
1. Load snapshots in Chrome DevTools
2. Use Comparison view
3. Look for objects with positive # Delta and Size Delta
```

**Snapshots saved to**: `./snapshots/`

### 4. Heap Monitor

**File**: `src/heap-monitor.ts`

Real-time heap usage monitoring (coming soon).

## Analyzing Snapshots

The leak detector saves three snapshot files:

- `baseline.heapsnapshot` - Before any actions
- `after-first-action.heapsnapshot` - After first action
- `after-second-action.heapsnapshot` - After repeating action

### Using Chrome DevTools

1. **Open DevTools**:
   ```bash
   # While your app is running with --inspect
   chrome://inspect
   ```

2. **Load Snapshots**:
   - Click "Open dedicated DevTools for Node"
   - Go to **Memory** tab
   - Click **Load** button
   - Select `after-second-action.heapsnapshot`

3. **Compare Snapshots**:
   - Dropdown at top: Select **"Comparison"**
   - Base snapshot: `after-first-action.heapsnapshot`
   - Look for:
     - Positive **# Delta** (object count increased)
     - Positive **Size Delta** (size increased)
     - Large **Retained Size**

4. **Find Retainer Paths**:
   - Click on leaked object type (e.g., `PageData`)
   - Expand an instance
   - View **Retainers** section
   - Follow chain to root to find what's keeping it alive

## Understanding the Output

### Leaky Version Indicators

```
Cache size: 84.23 MB (100 entries)        ← Growing
Pipeline listeners: 1200                   ← Growing
Processor callbacks: 1200                  ← Growing
Heap used: 215.47 MB                       ← Growing
🔴 CRITICAL: Memory leak detected!
```

### Fixed Version Indicators

```
Cache size: 8.42 MB (100/100 entries)     ← Bounded
Pipeline listeners: 2                      ← Constant
Processor callbacks: 100                   ← Bounded
Heap used: 32.18 MB                        ← Stable
✅ Memory usage is healthy
```

## Common Leak Patterns

The demos demonstrate these common patterns:

### 1. Unbounded Cache
```typescript
// ❌ LEAK
cache.set(key, value)  // Never evicts

// ✅ FIX
cache.set(key, value)
while (cache.size > maxSize) {
  cache.delete(oldest)
}
```

### 2. Event Listeners
```typescript
// ❌ LEAK
emitter.on('event', handler)  // Never removed

// ✅ FIX
emitter.on('event', handler)
// Later:
emitter.off('event', handler)
```

### 3. Closures
```typescript
// ❌ LEAK
const fn = () => {
  console.log(largeObject.id)  // Captures entire object
}

// ✅ FIX
const id = largeObject.id  // Extract what you need
const fn = () => {
  console.log(id)  // Only captures small value
}
```

### 4. Global Arrays
```typescript
// ❌ LEAK
const items = []
items.push(data)  // Grows forever

// ✅ FIX
const items = new CircularBuffer(1000)
items.push(data)  // Overwrites oldest when full
```

## Troubleshooting

### Inspector Not Available

**Error**: `ECONNREFUSED 127.0.0.1:9229`

**Fix**:
```bash
# Ensure app is running with --inspect flag
node --inspect=9229 your-app.js

# Check if inspector is listening
curl http://127.0.0.1:9229/json
```

### GC Not Available

**Warning**: `Global GC not available`

**Fix**:
```bash
# Add --expose-gc flag
node --inspect=9229 --expose-gc your-app.js
```

### Snapshots Too Large

**Error**: Out of memory while taking snapshot

**Fix**:
```bash
# Increase Node.js heap size
node --inspect=9229 --expose-gc --max-old-space-size=8192 your-app.js
```

### Can't Load Snapshots in DevTools

**Error**: "Failed to load snapshot"

**Fix**:
- Ensure snapshot file is valid JSON
- Check file size (DevTools has limits ~2GB)
- Try using CLI tools like `heapsnapshot-parser`

## Learning Resources

- **Blog Post**: [BLOG-POST.md](./BLOG-POST.md) - Comprehensive guide
- **CDP HeapProfiler**: https://chromedevtools.github.io/devtools-protocol/tot/HeapProfiler/
- **Chrome DevTools Memory**: https://developer.chrome.com/docs/devtools/memory-problems/
- **Node.js v8 module**: https://nodejs.org/api/v8.html
- **Effect**: https://effect.website

## Architecture

```
src/
├── memory-leak-demo.ts      # Leaky application (educational)
├── memory-leak-fixed.ts     # Fixed version (reference)
├── leak-detector.ts         # Automated detector (tool)
└── heap-monitor.ts          # Real-time monitoring (coming soon)

snapshots/                   # Generated by leak detector
├── baseline.heapsnapshot
├── after-first-action.heapsnapshot
└── after-second-action.heapsnapshot
```

## Testing in CI

You can use the leak detector in CI to catch regressions:

```typescript
// In your test suite
test("should not leak memory", async () => {
  const result = await runLeakDetector(myAction)
  expect(result.leakDetected).toBe(false)
  expect(result.heapGrowthPercent).toBeLessThan(10)
})
```

## Contributing

These demos are educational tools. To add new examples:

1. Create a new file in `src/`
2. Add script to `package.json`
3. Document in this README
4. Update blog post with new pattern

## License

MIT

## Related Packages

- `@effect-native/debug` - Main debugging service (in development)
- `.specs/debug/` - Specifications and research
- `.specs/debug/research-memory.md` - Memory debugging research
- `.specs/debug/tasks/task-006-memory-debugging.md` - Implementation spec

---

**Questions?** See [BLOG-POST.md](./BLOG-POST.md) for detailed explanations or open an issue on GitHub.