/**
 * @since 0.0.1
 */
import * as Socket from "@effect/platform/Socket"
import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { logDemo, logResult, logSection } from "./utils/DemoHelpers.js"

/**
 * @since 0.0.1
 * @category demos
 * @example
 * ```ts
 * import * as SocketDemo from "@effect-native/platform-demo/SocketDemo"
 * import * as NodeSocket from "@effect/platform-node/NodeSocket"
 * import * as Effect from "effect/Effect"
 * import * as Layer from "effect/Layer"
 * 
 * Effect.provide(
 *   SocketDemo.clientConnection,
 *   NodeSocket.layerWebSocket
 * ).pipe(Effect.runPromise)
 * ```
 */
export const clientConnection = Effect.gen(function* () {
  yield* logSection("Socket Client Connection")
  
  yield* logDemo("Connect", "Establishing socket connection")
  
  const socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  
  yield* logResult("Connected", "Socket established")
  
  yield* logDemo("Send Message", "Sending data to server")
  yield* socket.send("Hello from Effect Platform!")
  yield* logResult("Message sent", "Hello from Effect Platform!")
  
  yield* logDemo("Receive Message", "Waiting for response")
  const response = yield* socket.receive
  yield* logResult("Received", response)
  
  yield* logDemo("Close Connection", "Closing socket")
  yield* socket.close()
  yield* logResult("Status", "Connection closed")
  
  return { connected: true, response }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const bidirectionalChat = Effect.gen(function* () {
  yield* logSection("Bidirectional Chat")
  
  yield* logDemo("Chat Setup", "Creating chat connection")
  
  const socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  
  const messages = [
    "User: Hello!",
    "User: How are you?",
    "User: This is a test message",
    "User: Goodbye!"
  ]
  
  yield* logDemo("Chat Exchange", "Sending and receiving messages")
  
  for (const message of messages) {
    yield* socket.send(message)
    yield* Console.log(`📤 Sent: ${message}`)
    
    const response = yield* socket.receive
    yield* Console.log(`📥 Received: ${response}`)
    
    yield* Effect.sleep("500 millis")
  }
  
  yield* socket.close()
  yield* logResult("Chat", "Session ended")
  
  return { messages: messages.length }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const streamingData = Effect.gen(function* () {
  yield* logSection("Streaming Socket Data")
  
  yield* logDemo("Stream Setup", "Creating streaming connection")
  
  const socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  
  yield* logDemo("Send Stream", "Streaming data to server")
  
  const dataStream = Stream.range(1, 10).pipe(
    Stream.map((n) => `Data packet #${n}`),
    Stream.schedule(Stream.spaced("200 millis"))
  )
  
  yield* Stream.runForEach(dataStream, (data) =>
    Effect.gen(function* () {
      yield* socket.send(data)
      yield* Console.log(`➡️  Streamed: ${data}`)
    })
  )
  
  yield* logDemo("Receive Stream", "Processing incoming stream")
  
  const receiveStream = Stream.repeatEffect(socket.receive).pipe(
    Stream.take(10)
  )
  
  const received = yield* Stream.runCollect(receiveStream)
  yield* logResult("Received packets", received.length)
  
  yield* socket.close()
  
  return { streamed: 10, received: received.length }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const reconnection = Effect.gen(function* () {
  yield* logSection("Socket Reconnection")
  
  yield* logDemo("Initial Connection", "Establishing connection")
  
  let socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  yield* socket.send("Initial connection")
  const initial = yield* socket.receive
  yield* logResult("Initial response", initial)
  
  yield* logDemo("Simulate Disconnect", "Closing connection")
  yield* socket.close()
  yield* Effect.sleep("1 second")
  
  yield* logDemo("Reconnect", "Re-establishing connection")
  socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  yield* socket.send("Reconnected!")
  const reconnected = yield* socket.receive
  yield* logResult("Reconnection response", reconnected)
  
  yield* socket.close()
  yield* logResult("Status", "Reconnection demo complete")
  
  return { reconnected: true }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const errorHandling = Effect.gen(function* () {
  yield* logSection("Socket Error Handling")
  
  yield* logDemo("Connection Error", "Handling connection failures")
  
  const badConnection = yield* Socket.makeWebSocket("ws://invalid-url-that-doesnt-exist.com").pipe(
    Effect.either
  )
  
  yield* logResult("Connection attempt", 
    badConnection._tag === "Left" ? "Failed (as expected)" : "Unexpected success"
  )
  
  yield* logDemo("Send Error", "Handling send failures")
  
  const socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  yield* socket.close()
  
  const sendResult = yield* socket.send("This should fail").pipe(
    Effect.either
  )
  
  yield* logResult("Send after close",
    sendResult._tag === "Left" ? "Failed (as expected)" : "Unexpected success"
  )
  
  yield* logDemo("Timeout Handling", "Connection with timeout")
  
  const timeoutResult = yield* Socket.makeWebSocket("ws://echo.websocket.org").pipe(
    Effect.timeout("5 seconds"),
    Effect.either
  )
  
  if (timeoutResult._tag === "Right") {
    yield* timeoutResult.right.close()
  }
  
  yield* logResult("Timeout", 
    timeoutResult._tag === "Right" ? "Connected within timeout" : "Timed out"
  )
  
  return { errors: "handled" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const binaryData = Effect.gen(function* () {
  yield* logSection("Binary Data Transfer")
  
  yield* logDemo("Binary Setup", "Preparing binary data")
  
  const socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  
  const binaryData = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F])
  const base64Data = Buffer.from(binaryData).toString("base64")
  
  yield* logDemo("Send Binary", "Transmitting binary data")
  yield* socket.send(base64Data)
  yield* logResult("Sent binary (base64)", base64Data)
  
  yield* logDemo("Receive Binary", "Getting binary response")
  const received = yield* socket.receive
  const decodedBinary = Buffer.from(received, "base64")
  yield* logResult("Received and decoded", decodedBinary.toString())
  
  yield* socket.close()
  
  return { binary: "transferred" }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const multiplexing = Effect.gen(function* () {
  yield* logSection("Socket Multiplexing")
  
  yield* logDemo("Multi-Channel", "Simulating multiple channels")
  
  const socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  
  const channels = {
    chat: { prefix: "CHAT:", color: "\x1b[36m" },
    system: { prefix: "SYS:", color: "\x1b[33m" },
    data: { prefix: "DATA:", color: "\x1b[32m" }
  }
  
  yield* logDemo("Send on Channels", "Multiplexed messages")
  
  for (const [name, config] of Object.entries(channels)) {
    const message = `${config.prefix} Message on ${name} channel`
    yield* socket.send(message)
    yield* Console.log(`${config.color}📤 [${name}] Sent${"\x1b[0m"}`)
    
    const response = yield* socket.receive
    yield* Console.log(`${config.color}📥 [${name}] ${response}${"\x1b[0m"}`)
    
    yield* Effect.sleep("300 millis")
  }
  
  yield* socket.close()
  yield* logResult("Multiplexing", "Complete")
  
  return { channels: Object.keys(channels).length }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const queuedMessages = Effect.gen(function* () {
  yield* logSection("Message Queue")
  
  yield* logDemo("Queue Setup", "Creating message queue")
  
  const socket = yield* Socket.makeWebSocket("ws://echo.websocket.org")
  const sendQueue = yield* Queue.unbounded<string>()
  const receiveQueue = yield* Queue.unbounded<string>()
  
  yield* logDemo("Queue Messages", "Adding to send queue")
  
  yield* sendQueue.offer("Message 1")
  yield* sendQueue.offer("Message 2")
  yield* sendQueue.offer("Message 3")
  yield* sendQueue.offer("STOP")
  
  yield* logDemo("Process Queue", "Sending queued messages")
  
  yield* Effect.fork(
    Effect.forever(
      Queue.take(sendQueue).pipe(
        Effect.flatMap((msg) => {
          if (msg === "STOP") return Effect.interrupt
          return socket.send(msg).pipe(
            Effect.tap(() => Console.log(`➡️  Sent from queue: ${msg}`))
          )
        })
      )
    )
  )
  
  yield* Effect.fork(
    Stream.repeatEffect(socket.receive).pipe(
      Stream.take(3),
      Stream.runForEach((msg) =>
        Effect.gen(function* () {
          yield* receiveQueue.offer(msg)
          yield* Console.log(`⬅️  Added to receive queue: ${msg}`)
        })
      )
    )
  )
  
  yield* Effect.sleep("2 seconds")
  
  const receivedMessages = yield* Queue.takeAll(receiveQueue)
  yield* logResult("Queued responses", receivedMessages.length)
  
  yield* socket.close()
  
  return { sent: 3, received: receivedMessages.length }
})

/**
 * @since 0.0.1
 * @category demos
 */
export const runAllDemos = Effect.gen(function* () {
  yield* Console.log("\n⚠️  Socket demos require WebSocket server connection.")
  yield* Console.log("These demos use ws://echo.websocket.org for testing.")
  yield* Console.log("\nAvailable demos:")
  yield* Console.log("- clientConnection: Basic WebSocket connection")
  yield* Console.log("- bidirectionalChat: Two-way communication")
  yield* Console.log("- streamingData: Streaming data over socket")
  yield* Console.log("- reconnection: Connection recovery")
  yield* Console.log("- errorHandling: Error scenarios")
  yield* Console.log("- binaryData: Binary data transfer")
  yield* Console.log("- multiplexing: Multi-channel communication")
  yield* Console.log("- queuedMessages: Message queue pattern")
  
  yield* Console.log("\n✨ Socket demo descriptions complete!")
})