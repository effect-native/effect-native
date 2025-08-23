"use client"
import { serverAction, runHttpClientDemo } from "@/server/examples"
import { useState } from "react"

export function ClientComponent() {
  const [result, setResult] = useState<string>("")
  const [loading, setLoading] = useState(false)

  const runDemo = async () => {
    setLoading(true)
    try {
      const demoResult = await runHttpClientDemo()
      setResult(JSON.stringify(demoResult, null, 2))
    } catch (error) {
      setResult(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-gray-100">Effect Platform Demo</h1>
      <p className="mb-4 text-gray-700 dark:text-gray-300">Testing @effect-native/platform-demo with Next.js</p>
      
      <div className="space-y-4">
        <button 
          onClick={runDemo}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {loading ? "Running..." : "Run HTTP Client Demo"}
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
