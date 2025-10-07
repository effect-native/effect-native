# Cloudflare Workers AI Proxy - Memory Leak Demo

This is a standalone Cloudflare Workers project demonstrating memory leak debugging in the Workers environment, specifically focusing on an AI proxy use case.

## The Problem

You've built an AI proxy on Cloudflare Workers that forwards requests to OpenRouter/OpenAI. It works great in testing, but in production you see:

```
Worker exceeded memory limit
```

**No stack trace. No error details. Just silent failure.**

This demo shows you exactly how to find and fix these leaks.

## Critical: 128MB Per Isolate, Not Per Request

**The 128MB memory limit is PER ISOLATE**, not per request. A single isolate can serve **multiple concurrent requests** simultaneously, all sharing the same 128MB pool.

This means:
- **10 concurrent requests** each buffering **50MB** = **500MB needed** → **INSTANT CRASH!**
- Leaked global state reduces memory available for concurrent requests
- Buffering that seems fine sequentially becomes catastrophic with concurrency

## Quick Start

### Prerequisites

```bash
# Install wrangler globally
npm install -g wrangler

# Or use pnpm (from parent directory)
pnpm install
```

### Run the Leaky Version

```bash
# Copy leaky version to src/index.ts (or use pnpm dev:leak)
pnpm dev:leak

# Or manually:
cp ../src/workers-ai-proxy-leak.ts src/index.ts
wrangler dev --inspector-port=9229
```

### Run the Fixed Version

```bash
# Copy fixed version to src/index.ts
pnpm dev:fixed

# Or manually:
cp ../src/workers-ai-proxy-fixed.ts src/index.ts
wrangler dev --inspector-port=9229
```

## Testing the Leak

### Sequential Load Test

```bash
# Send 100 requests sequentially
for i in {1..100}; do
  curl -X POST http://localhost:8787/api/chat \
    -H "Content-Type: application/json" \
    -d '{"prompt":"Write a detailed story about space exploration","max_tokens":2000}'
  echo "Request $i complete"
done

# Check stats
curl http://localhost:8787/stats | jq
```

**Expected with leaky version**:
- Memory grows from ~5MB → ~100MB
- After ~200 requests: "Worker exceeded memory limit"

**Expected with fixed version**:
- Memory stays stable at ~8-12MB
- No crashes, even after 1000+ requests

### Concurrent Load Test (More Realistic)

```bash
# Install hey (HTTP load generator)
brew install hey

# Send 100 requests with 10 concurrent
hey -n 100 -c 10 -m POST \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a story","max_tokens":2000}' \
  http://localhost:8787/api/chat
```

**Expected with leaky version**:
- Crashes much faster (10-20 rounds of concurrent requests)
- **10 concurrent × 50MB buffered** = **500MB needed** → crash!

**Expected with fixed version**:
- Handles 20+ concurrent requests safely
- **20 concurrent × 2MB streaming** = **40MB used** → safe!

## Debugging with Chrome DevTools

### Connect Inspector

```bash
# Start worker with inspector
wrangler dev --inspector-port=9229

# In Chrome, navigate to:
chrome://inspect

# Click "Configure..." and add:
localhost:9229

# Click "inspect" when target appears
```

### Take Heap Snapshots

1. **Memory** tab in DevTools
2. Click **Take snapshot** (baseline)
3. Send 50 requests
4. Click **Take snapshot** (after-first)
5. Send 50 more requests
6. Click **Take snapshot** (after-second)

### Analyze Snapshots

1. Load the latest snapshot
2. Dropdown: Select **"Comparison"**
3. Base: Select previous snapshot
4. Look for:
   - **Growing arrays**: `requestCache`, `recentResponses`, `requestLogs`
   - **Large strings**: Buffered AI responses
   - **Growing closures**: Event listeners, callbacks

### Find Retainer Paths

Click on a leaked object (e.g., `BufferedResponse`) → View **Retainers**:

```
BufferedResponse
└─ in element of Array
   └─ in property 'recentResponses'
      └─ in Window / global scope
```

**Root cause**: Global array never cleaned up!

## The Leaks (Educational)

### Leak #1: Buffering Entire Responses

```typescript
// LEAK: Each request buffers 10-100KB
const data = await response.json()
```

**Concurrent impact**: 10 requests × 50KB = 500KB active + leaked global state

### Leak #2: Global Request Cache

```typescript
// LEAK: Map grows across all requests
const requestCache = new Map<string, RequestMetadata>()
```

**Impact**: Reduces pool available for concurrent requests

### Leak #3: Response Buffer Accumulator

```typescript
// LEAK: Storing full responses globally
const recentResponses: Array<BufferedResponse> = []
```

**Impact**: After 100 requests = 5-10MB leaked forever

### Leak #4: Logging Full Content

```typescript
// LEAK: Logs store entire prompts and responses
requestLogs.push({ fullPrompt, fullResponse })
```

**Impact**: Massive memory waste (100+ bytes needed, storing 50KB+)

## The Fixes (Production-Ready)

### Fix #1: Stream Responses

```typescript
// Stream instead of buffer
return new Response(response.body, {
  headers: { 'Transfer-Encoding': 'chunked' }
})
```

**Benefit**: ~2MB per request (not 50MB), safe with 20+ concurrent requests

### Fix #2: Bounded LRU Cache

```typescript
const requestCache = new LRUCache<string, RequestMetadata>(100)
```

**Benefit**: Max 100 entries (~50KB total, not growing forever)

### Fix #3: Circular Buffer for Logs

```typescript
const requestLogs = new CircularBuffer<RequestLog>(500)
```

**Benefit**: Max 500 entries, overwrites oldest

### Fix #4: Metadata-Only Logging

```typescript
interface RequestLog {
  promptLength: number  // Just the length
  // NO fullPrompt or fullResponse
}
```

**Benefit**: Each log entry ~100 bytes (not 50KB)

### Fix #5: TransformStream Processing

```typescript
const { readable, writable } = new TransformStream({
  transform(chunk, controller) {
    controller.enqueue(transformChunk(chunk))
  }
})
```

**Benefit**: Process in chunks, no buffering

## Stats Endpoint

Both versions expose a `/stats` endpoint:

```bash
curl http://localhost:8787/stats
```

**Leaky version output**:
```json
{
  "cachedRequests": 200,
  "requestHistoryLength": 200,
  "bufferedResponses": 200,
  "totalBufferedSizeKB": "10240.00",
  "totalLogs": 200,
  "totalLogsSizeKB": "10240.00",
  "estimatedTotalMemoryKB": "20480.00"
}
```

**Fixed version output**:
```json
{
  "cachedRequests": 100,
  "maxCachedRequests": 100,
  "requestHistoryLength": 500,
  "maxRequestHistory": 1000,
  "totalLogs": 500,
  "maxLogs": 500,
  "streaming": true,
  "memoryOptimized": true
}
```

## Production Deployment

### Before Deploying

- [ ] Run concurrent load test locally (500+ requests)
- [ ] Verify memory stays stable in DevTools
- [ ] Test with realistic payload sizes
- [ ] Set up tail workers for monitoring
- [ ] Configure analytics for metrics

### Deploy to Staging First

```bash
# Deploy to staging
wrangler deploy --env staging

# Monitor with tail
wrangler tail debug-demo-ai-proxy-staging

# Generate load
hey -n 1000 -c 50 https://staging.example.com/api/chat
```

### Gradual Rollout

1. Deploy to 1% of traffic
2. Monitor for 24 hours (tail workers, analytics)
3. Check error rates and memory-related failures
4. If stable, increase to 10%, 50%, 100%

### Set Up Monitoring

```typescript
// tail-worker.ts - Monitor memory issues
export default {
  async tail(events: TraceEvent[]) {
    for (const event of events) {
      if (event.outcome === 'exceededMemory') {
        await fetch('https://alerts.example.com/webhook', {
          method: 'POST',
          body: JSON.stringify({
            alert: 'MEMORY_LEAK',
            worker: 'ai-proxy',
            timestamp: event.eventTimestamp,
            scriptName: event.scriptName
          })
        })
      }
    }
  }
}
```

## Troubleshooting

### "Worker exceeded memory limit" with no details

**Solution**: Run locally with `wrangler dev --inspector-port=9229` and use heap snapshots to find the leak.

### Memory seems fine locally but crashes in production

**Possible causes**:
- Production has higher concurrency (10-50+ concurrent requests)
- Local dev doesn't enforce exact 128MB limit
- Production isolates live longer, accumulating more global state

**Solution**: 
- Test with higher concurrency locally using `hey -c 50`
- Use tail workers to detect patterns
- Check if global state is leaking

### Snapshots don't show obvious leaks

**Try**:
- Take more snapshots (need 3+ to establish trend)
- Generate more load (need 100+ requests)
- Look for subtle leaks (small arrays growing)
- Check string allocations (buffered content)

### Performance is slow

**Check**:
- Are you streaming? Or buffering everything?
- CPU time in logs (use `wrangler tail`)
- Network latency to upstream APIs
- Consider using Workers AI instead of external APIs

## Next Steps

After understanding the leaks:

1. Apply fixes to your actual Worker
2. Test with realistic load
3. Deploy to staging
4. Monitor with tail workers
5. Gradual production rollout

## Resources

- **Guide**: `../WORKERS-MEMORY-GUIDE.md` - Comprehensive debugging guide
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Observability**: https://developers.cloudflare.com/workers/observability/
- **Limits**: https://developers.cloudflare.com/workers/platform/limits/
- **Debugging**: https://developers.cloudflare.com/workers/observability/debugging/

## License

MIT - Educational demo code