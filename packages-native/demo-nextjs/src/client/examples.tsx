"use client"
import { serverAction, runHttpClientDemo } from "@/server/examples"
import { useState } from "react"

export function ClientComponent() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState<false | "server" | "browser">(false)
  const [lastRuntime, setLastRuntime] = useState<null | "server" | "browser">(null)

  const runServerDemo = async () => {
    setLoading("server")
    try {
      const demoResult = await runHttpClientDemo()
      setResult(JSON.stringify(demoResult, null, 2))
      setLastRuntime("server")
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const runBrowserDemo = async () => {
    setLoading("browser")
    try {
      const [{ Effect }, HttpClientDemo, BrowserHttpClient] = await Promise.all([
        import("effect/Effect"),
        import("@effect-native/platform-demo/HttpClientDemo"),
        import("@effect/platform-browser/BrowserHttpClient")
      ])
      // Run basic requests in browser
      const basic = await Effect.provide(
        HttpClientDemo.basicRequests,
        BrowserHttpClient.layerXMLHttpRequest
      ).pipe(Effect.runPromise)
      // Demonstrate XHR arraybuffer path by running streaming demo
      const streaming = await Effect.provide(
        BrowserHttpClient.withXHRArrayBuffer(HttpClientDemo.streamingResponses),
        BrowserHttpClient.layerXMLHttpRequest
      ).pipe(Effect.runPromise)
      setResult(JSON.stringify({ message: "Ran in browser via platform-browser", basic, streaming }, null, 2))
      setLastRuntime("browser")
    } catch (error) {
      setResult(`Browser error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">Effect Platform Demo</h1>
      <p className="mb-2 text-gray-700 dark:text-gray-300">Testing @effect-native/platform-demo with Next.js</p>
      <div className="mb-4 text-sm">
        <span className="inline-block px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
          Last run: {lastRuntime ?? "—"}
        </span>
      </div>
      
      <div className="space-y-4">
        <button 
          onClick={runServerDemo}
          disabled={!!loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {loading === "server" ? "Running..." : "Run HTTP Client Demo (server)"}
        </button>
        
        <button 
          onClick={runBrowserDemo}
          disabled={!!loading}
          className="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700"
        >
          {loading === "browser" ? "Running..." : "Run HTTP Client Demo (browser)"}
        </button>
        
        <button 
          onClick={() => serverAction().then(console.log, console.warn)}
          className="px-4 py-2 bg-green-500 text-white rounded ml-2 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
        >
          Test Server Action
        </button>
      </div>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded overflow-auto">
          {result}
        </pre>
      )}
    </div>
  )
}
