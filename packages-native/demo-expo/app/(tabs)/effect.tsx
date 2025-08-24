import { useState } from 'react'
import { Button, StyleSheet, View, ScrollView } from 'react-native'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'

// Effect + Layers
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as HttpClientDemo from '@effect-native/platform-demo/HttpClientDemo'
import * as KeyValueStoreDemo from '@effect-native/platform-demo/KeyValueStoreDemo'
import * as ExpoHttpClient from '@effect-native/platform-expo/ExpoHttpClient'
import * as ExpoKeyValueStore from '@effect-native/platform-expo/ExpoKeyValueStore'

export default function EffectScreen() {
  const [output, setOutput] = useState<string>('')
  const [busy, setBusy] = useState<null | string>(null)

  const runHttp = async () => {
    setBusy('http')
    setOutput('')
    try {
      const result = await Effect.provide(
        HttpClientDemo.basicRequests,
        ExpoHttpClient.layer
      ).pipe(Effect.runPromise)
      setOutput(JSON.stringify({ kind: 'http', result }, null, 2))
    } catch (e) {
      setOutput(`HTTP error: ${String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  const runKv = async () => {
    setBusy('kv')
    setOutput('')
    try {
      const result = await Effect.provide(
        KeyValueStoreDemo.basicOperations,
        ExpoKeyValueStore.layerAsyncStorage
      ).pipe(Effect.runPromise)
      setOutput(JSON.stringify({ kind: 'kv', result }, null, 2))
    } catch (e) {
      setOutput(`KV error: ${String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.section}>
        <ThemedText type="title">@effect-native/platform-demo</ThemedText>
        <ThemedText>
          Run demos using platform-expo layers directly in Expo.
        </ThemedText>
      </ThemedView>

      <View style={styles.row}>
        <Button title={busy === 'http' ? 'Running…' : 'Run HTTP Client Demo'} onPress={runHttp} disabled={!!busy} />
      </View>

      <View style={styles.row}>
        <Button title={busy === 'kv' ? 'Running…' : 'Run KeyValueStore Demo'} onPress={runKv} disabled={!!busy} />
      </View>

      <ThemedView style={styles.output}>
        <ThemedText>{output || 'Results will appear here.'}</ThemedText>
      </ThemedView>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  section: { gap: 8 },
  row: { marginVertical: 4 },
  output: { padding: 12, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth }
})

