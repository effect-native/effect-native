/**
 * Cloudflare Workers AI Proxy - Memory Leak Demo
 *
 * This demo simulates an AI proxy service that forwards requests to OpenRouter
 * or similar AI APIs. Instead of streaming responses, it buffers the entire
 * response in memory before sending to the client.
 *
 * SCENARIO:
 * - Users hit /api/chat endpoint
 * - Worker proxies to OpenRouter/OpenAI
 * - Worker buffers full AI response (can be 10KB-1MB+)
 * - Worker processes/transforms response
 * - Worker sends buffered response to client
 *
 * LEAKS IN THIS CODE:
 * 1. Buffering entire AI responses instead of streaming
 * 2. Global request metadata cache that grows across requests
 * 3. Response handlers with closures capturing large data
 * 4. Request/response logging arrays in global scope
 *
 * Workers have 128MB memory limit. With these leaks, after 100-200 requests
 * with large AI responses, you'll hit: "Worker exceeded memory limit"
 *
 * Run with: wrangler dev --inspector-port=9229
 * Then: curl -X POST http://localhost:8787/api/chat -d '{"prompt":"test"}'
 */

// ============================================================================
// LEAK #1: Global Request Metadata Cache
// ============================================================================

interface RequestMetadata {
  id: string
  timestamp: number
  prompt: string
  model: string
  // LEAK: Accumulates across requests in same isolate
}

// LEAK: Global map that persists across requests in the same Worker isolate
// In production, Workers can handle thousands of requests before recycling
const requestCache = new Map<string, RequestMetadata>()

// LEAK: Global array of request IDs
const requestHistory: Array<string> = []

// ============================================================================
// LEAK #2: Response Buffer Accumulator
// ============================================================================

interface BufferedResponse {
  requestId: string
  chunks: Array<string>
  totalSize: number
  startTime: number
  // LEAK: Keeping full response in memory
}

// LEAK: Storing recent responses globally
const recentResponses: Array<BufferedResponse> = []

// ============================================================================
// LEAK #3: Analytics/Logging Accumulator
// ============================================================================

interface RequestLog {
  id: string
  timestamp: number
  duration: number
  promptLength: number
  responseLength: number
  model: string
  // LEAK: Full prompt and response stored
  fullPrompt: string
  fullResponse: string
}

// LEAK: Unbounded logging array
const requestLogs: Array<RequestLog> = []

// ============================================================================
// Types
// ============================================================================

interface ChatRequest {
  prompt: string
  model?: string
  max_tokens?: number
  stream?: boolean
}

interface ChatResponse {
  id: string
  model: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// ============================================================================
// Simulated AI API Client (represents OpenRouter/OpenAI)
// ============================================================================

class AIAPIClient {
  private apiKey: string
  private baseURL: string

  constructor(apiKey: string, baseURL = "https://openrouter.ai/api/v1") {
    this.apiKey = apiKey
    this.baseURL = baseURL
  }

  /**
   * LEAK: This buffers the entire response instead of streaming
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Simulate API call
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: request.model || "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: request.prompt
          }
        ],
        max_tokens: request.max_tokens || 1000,
        stream: false // LEAK: Not streaming
      })
    })

    // LEAK: Read entire response into memory
    const data = await response.json() as ChatResponse

    return data
  }

  /**
   * LEAK: This also buffers everything
   * In reality, this would use ReadableStream but we're simulating the leak
   */
  async chatWithBuffer(request: ChatRequest): Promise<string> {
    // Simulate large AI response (10-100KB typical, can be 1MB+)
    const responseSize = Math.floor(Math.random() * 50000) + 10000
    const largeResponse = "A".repeat(responseSize)

    // LEAK: Entire response in memory before returning
    const fullResponse =
      `Here's a detailed AI response: ${largeResponse}\n\nThis response contains ${responseSize} characters of generated content.`

    return fullResponse
  }
}

// ============================================================================
// Response Processor (with leaks)
// ============================================================================

class ResponseProcessor {
  private handlers: Array<(data: string) => void> = []

  /**
   * LEAK: Closure captures entire response data
   */
  processResponse(response: string, metadata: RequestMetadata) {
    // LEAK: This closure captures the entire response
    const handler = () => {
      console.log(`Processed response for request ${metadata.id}`)
      console.log(`Response length: ${response.length}`)
      // Only uses length but captures entire response string
    }

    // LEAK: Handlers array grows
    this.handlers.push(handler)

    // Simulate some processing
    const processed = response.toUpperCase()

    return processed
  }

  /**
   * LEAK: Transform but keep references
   */
  async transformResponse(response: string, requestId: string): Promise<string> {
    // LEAK: Store in global buffered responses
    const buffer: BufferedResponse = {
      requestId,
      chunks: response.split("\n"), // LEAK: Splitting large response
      totalSize: response.length,
      startTime: Date.now()
    }

    recentResponses.push(buffer)

    // LEAK: Never clean up old responses
    // In real scenario, this would grow with each request

    return buffer.chunks.join("\n")
  }
}

// ============================================================================
// AI Proxy Handler (main worker logic)
// ============================================================================

class AIProxyHandler {
  private client: AIAPIClient
  private processor: ResponseProcessor

  constructor(apiKey: string) {
    this.client = new AIAPIClient(apiKey)
    this.processor = new ResponseProcessor()
  }

  async handleChatRequest(request: Request): Promise<Response> {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()

    try {
      // Parse request
      const body = await request.json() as ChatRequest

      // LEAK #1: Store metadata globally
      const metadata: RequestMetadata = {
        id: requestId,
        timestamp: Date.now(),
        prompt: body.prompt,
        model: body.model || "gpt-3.5-turbo"
      }
      requestCache.set(requestId, metadata)
      requestHistory.push(requestId)

      // LEAK #2: Buffer entire AI response
      console.log(`[${requestId}] Fetching AI response (buffering)...`)
      const aiResponse = await this.client.chatWithBuffer(body)

      console.log(`[${requestId}] Response size: ${aiResponse.length} bytes`)

      // LEAK #3: Process with closures that capture everything
      const processed = this.processor.processResponse(aiResponse, metadata)

      // LEAK #4: Transform and store globally
      const transformed = await this.processor.transformResponse(
        processed,
        requestId
      )

      const duration = Date.now() - startTime

      // LEAK #5: Store complete request/response in logs
      const log: RequestLog = {
        id: requestId,
        timestamp: startTime,
        duration,
        promptLength: body.prompt.length,
        responseLength: transformed.length,
        model: body.model || "gpt-3.5-turbo",
        fullPrompt: body.prompt, // LEAK: Full prompt
        fullResponse: transformed // LEAK: Full response (can be 100KB+)
      }
      requestLogs.push(log)

      // LEAK: Never clean up old logs
      console.log(`[${requestId}] Total cached requests: ${requestCache.size}`)
      console.log(`[${requestId}] Total request history: ${requestHistory.length}`)
      console.log(`[${requestId}] Total buffered responses: ${recentResponses.length}`)
      console.log(`[${requestId}] Total logs: ${requestLogs.length}`)

      // Calculate approximate memory usage
      const estimatedMemoryKB = requestCache.size * 0.5 + // ~0.5KB per metadata
        recentResponses.reduce((sum, r) => sum + r.totalSize, 0) / 1024 +
        requestLogs.reduce((sum, l) => sum + l.responseLength, 0) / 1024
      console.log(`[${requestId}] Estimated memory usage: ${estimatedMemoryKB.toFixed(2)} KB`)

      if (estimatedMemoryKB > 100000) {
        // > 100MB
        console.error("⚠️  WARNING: Approaching memory limit!")
      }

      // Return buffered response
      return new Response(transformed, {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
          "X-Request-ID": requestId,
          "X-Processing-Time": `${duration}ms`,
          "X-Memory-Usage": `${estimatedMemoryKB.toFixed(2)}KB`
        }
      })
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[${requestId}] Error:`, error)

      return new Response(
        JSON.stringify({
          error: "Internal server error",
          requestId,
          duration
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      )
    }
  }

  getStats() {
    const totalLogsSize = requestLogs.reduce(
      (sum, log) => sum + log.fullPrompt.length + log.fullResponse.length,
      0
    )
    const totalBufferedSize = recentResponses.reduce(
      (sum, resp) => sum + resp.totalSize,
      0
    )

    return {
      cachedRequests: requestCache.size,
      requestHistoryLength: requestHistory.length,
      bufferedResponses: recentResponses.length,
      totalBufferedSizeKB: (totalBufferedSize / 1024).toFixed(2),
      totalLogs: requestLogs.length,
      totalLogsSizeKB: (totalLogsSize / 1024).toFixed(2),
      estimatedTotalMemoryKB: (
        (requestCache.size * 500 + totalBufferedSize + totalLogsSize) /
        1024
      ).toFixed(2)
    }
  }
}

// ============================================================================
// Worker Export (Cloudflare Workers format)
// ============================================================================

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url)

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response("OK", { status: 200 })
    }

    // Stats endpoint (shows leak metrics)
    if (url.pathname === "/stats") {
      const handler = new AIProxyHandler(env.OPENROUTER_API_KEY || "test-key")
      const stats = handler.getStats()

      return new Response(JSON.stringify(stats, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Chat endpoint (the leaky one)
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const handler = new AIProxyHandler(env.OPENROUTER_API_KEY || "test-key")
      return await handler.handleChatRequest(request)
    }

    // Default 404
    return new Response("Not Found", { status: 404 })
  }
}

// ============================================================================
// Development/Testing Notes
// ============================================================================

/**
 * To run this demo:
 *
 * 1. Setup:
 *    wrangler init
 *    # Add this file as src/index.ts
 *
 * 2. Run with inspector:
 *    wrangler dev --inspector-port=9229
 *
 * 3. Trigger leak with load:
 *    for i in {1..100}; do
 *      curl -X POST http://localhost:8787/api/chat \
 *        -H "Content-Type: application/json" \
 *        -d '{"prompt":"Write a long detailed story","max_tokens":2000}'
 *    done
 *
 * 4. Check stats:
 *    curl http://localhost:8787/stats
 *
 * 5. Watch memory grow:
 *    # Connect debugger to port 9229
 *    # Take heap snapshots after 10, 50, 100 requests
 *    # Compare snapshots to see growing arrays
 *
 * Expected behavior:
 * - First 20 requests: ~10-20 MB total
 * - After 50 requests: ~50-70 MB
 * - After 100 requests: ~100-130 MB → Worker crashes
 * - Error: "Worker exceeded memory limit"
 *
 * What you'll see in snapshots:
 * - requestCache: Growing Map with metadata
 * - requestHistory: Array growing linearly
 * - recentResponses: Array of buffered responses (10-100KB each)
 * - requestLogs: Array with full prompts + responses
 *
 * Root causes:
 * 1. Not streaming AI responses (buffering 100KB+ per request)
 * 2. Global state persisting across requests
 * 3. No cleanup/eviction of old data
 * 4. Closures capturing large response strings
 */
