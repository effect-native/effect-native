import type { JsonlRecord, TimedChunk } from "./types.js"

export function isSSEResponse(headers: Headers): boolean {
  const contentType = headers.get("content-type") ?? ""
  return contentType.includes("text/event-stream")
}

/** Represents an extracted SSE item from raw chunk data */
type SSEItem =
  | { type: "data"; payload: string }
  | { type: "comment"; raw: string }

/**
 * Parse SSE events from a chunk, extracting both data payloads and comment lines.
 * SSE format:
 * - "data: <payload>\n\n" - data event
 * - ": <comment>\n\n" - comment line (keep-alive, status, etc.)
 *
 * A single network chunk may contain multiple SSE events batched together.
 * Returns an array of SSE items in the order they appear.
 */
function extractAllSSEItems(chunk: string): Array<SSEItem> {
  const items: Array<SSEItem> = []

  // Split by SSE event boundaries (double newline)
  // An SSE event can span multiple lines before the double newline
  const events = chunk.split(/\n\n/)

  for (const event of events) {
    if (!event.trim()) continue

    // Check for data lines
    const dataMatch = event.match(/^data:\s*(.*)$/m)
    if (dataMatch) {
      items.push({ type: "data", payload: dataMatch[1] ?? "" })
      continue
    }

    // Check for comment lines (start with colon)
    // SSE spec: lines starting with ':' are comments
    if (event.trimStart().startsWith(":")) {
      // Store the raw comment including the original format
      items.push({ type: "comment", raw: event + "\n\n" })
    }
  }

  return items
}

/**
 * Try to parse a string as JSON.
 * Returns the parsed value or null if parsing fails.
 */
function tryParseJson(str: string): unknown | null {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

export async function recordStreamWithTiming(stream: ReadableStream<Uint8Array>): Promise<Array<TimedChunk>> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  const chunks: Array<TimedChunk> = []
  let lastChunkTime = Date.now()

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    const now = Date.now()
    const delay_ms = now - lastChunkTime
    lastChunkTime = now
    chunks.push({
      data: decoder.decode(value, {
        stream: true
      }),
      delay_ms
    })
  }

  return chunks
}

export function replayStreamWithTiming(timedChunks: Array<TimedChunk>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let chunkIndex = 0

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (chunkIndex >= timedChunks.length) {
        controller.close()
        return
      }

      // Non-null assertion is safe here because we've already verified chunkIndex < timedChunks.length
      const chunk = timedChunks[chunkIndex]!

      if (chunk.delay_ms > 0 && chunkIndex > 0) {
        const cappedDelay = Math.min(chunk.delay_ms, 30000)
        await new Promise((resolve) => setTimeout(resolve, cappedDelay))
      }

      controller.enqueue(encoder.encode(chunk.data))
      chunkIndex++
    }
  })
}

/** Replay stream from an async iterable of timed chunks (for generator transforms) */
export function replayStreamFromAsyncIterable(
  chunks: AsyncIterable<TimedChunk>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let iterator: AsyncIterator<TimedChunk> | null = null
  let isFirst = true

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!iterator) {
        iterator = chunks[Symbol.asyncIterator]()
      }

      const { done, value } = await iterator.next()
      if (done) {
        controller.close()
        return
      }

      if (value.delay_ms > 0 && !isFirst) {
        const cappedDelay = Math.min(value.delay_ms, 30000)
        await new Promise((resolve) => setTimeout(resolve, cappedDelay))
      }
      isFirst = false

      controller.enqueue(encoder.encode(value.data))
    }
  })
}

export function timedChunksToJsonl(chunks: Array<TimedChunk>): string {
  const lines: Array<string> = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!
    const items = extractAllSSEItems(chunk.data)

    if (items.length > 0) {
      // Process each SSE item in this chunk
      for (const item of items) {
        if (item.type === "comment") {
          // Store comment lines with "comment" field
          lines.push(JSON.stringify({ comment: item.raw }))
        } else {
          // item.type === "data"
          const parsed = tryParseJson(item.payload)
          if (parsed !== null) {
            lines.push(JSON.stringify({ json: parsed }))
          } else {
            lines.push(JSON.stringify({ text: item.payload }))
          }
        }
      }
    } else {
      // Fallback: check if the chunk is a raw comment line
      if (chunk.data.trimStart().startsWith(":")) {
        lines.push(JSON.stringify({ comment: chunk.data }))
      } else {
        // Store raw data as text if no SSE payload found
        lines.push(JSON.stringify({ text: chunk.data }))
      }
    }

    // Add timing line after all events from this chunk
    // This represents the delay before the next network chunk
    // Skip timing for the last chunk since there's nothing after it
    if (i < chunks.length - 1) {
      const nextChunk = chunks[i + 1]!
      lines.push(JSON.stringify({ delay_ms: nextChunk.delay_ms }))
    }
  }

  return lines.join("\n")
}

export function jsonlToTimedChunks(jsonl: string): Array<TimedChunk> {
  const lines = jsonl.split("\n").filter((line) => line.trim().length > 0)
  const chunks: Array<TimedChunk> = []
  let pendingDelay = 0

  for (const line of lines) {
    const parsed = JSON.parse(line) as
      | JsonlRecord
      | {
        data: string
        __timing: {
          delay_ms: number
        }
      }

    // Handle new format: separate timing lines
    if ("delay_ms" in parsed && !("__timing" in parsed)) {
      // This is a timing line - store for the next data chunk
      pendingDelay = parsed.delay_ms
      continue
    }

    // Handle new format: {json: ...}, {text: ...}, or {comment: ...} (without __timing)
    if ("json" in parsed && !("__timing" in parsed)) {
      chunks.push({
        data: `data: ${JSON.stringify(parsed.json)}\n\n`,
        delay_ms: pendingDelay
      })
      pendingDelay = 0
      continue
    }
    if ("text" in parsed && !("__timing" in parsed)) {
      chunks.push({
        data: `data: ${parsed.text}\n\n`,
        delay_ms: pendingDelay
      })
      pendingDelay = 0
      continue
    }
    // Handle SSE comment lines - replay without data: prefix
    if ("comment" in parsed && !("__timing" in parsed)) {
      chunks.push({
        data: parsed.comment,
        delay_ms: pendingDelay
      })
      pendingDelay = 0
      continue
    }

    // Handle legacy format with __timing embedded
    if ("json" in parsed && "__timing" in parsed) {
      const legacy = parsed as {
        json: unknown
        __timing: {
          delay_ms: number
        }
      }
      chunks.push({
        data: `data: ${JSON.stringify(legacy.json)}\n\n`,
        delay_ms: legacy.__timing.delay_ms
      })
      continue
    }
    if ("text" in parsed && "__timing" in parsed) {
      const legacy = parsed as {
        text: string
        __timing: {
          delay_ms: number
        }
      }
      chunks.push({
        data: `data: ${legacy.text}\n\n`,
        delay_ms: legacy.__timing.delay_ms
      })
      continue
    }

    // Handle oldest legacy format: {data: string, __timing: ...}
    if ("data" in parsed) {
      const oldest = parsed as {
        data: string
        __timing: {
          delay_ms: number
        }
      }
      chunks.push({
        data: oldest.data,
        delay_ms: oldest.__timing.delay_ms
      })
    }
  }

  return chunks
}
