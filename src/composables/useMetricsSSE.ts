import { onBeforeUnmount, ref } from 'vue'
import type { RuntimeMetric } from '@/types/api'
import { storageKeys } from '@/utils/storage'

export function useMetricsSSE() {
  const connected = ref(false)
  const current = ref<RuntimeMetric | null>(null)

  let controller: AbortController | null = null
  let reconnectTimer = 0
  let reconnectDelay = 1000
  let stopped = true
  let generation = 0

  function connect() {
    close()
    stopped = false
    generation += 1
    void openStream(generation)
  }

  async function openStream(streamGeneration: number) {
    const token = localStorage.getItem(storageKeys.accessToken) || ''
    if (!token || stopped || streamGeneration !== generation) return

    controller = new AbortController()
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || '/api'}/admin/metrics/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      if (!response.ok || !response.body) throw new Error(`metrics stream ${response.status}`)

      connected.value = true
      reconnectDelay = 1000
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (!stopped && streamGeneration === generation) {
        const { value, done } = await reader.read()
        if (done) break
        buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, '\n')
        let boundary = buffer.indexOf('\n\n')
        while (boundary >= 0) {
          const event = buffer.slice(0, boundary)
          buffer = buffer.slice(boundary + 2)
          const data = event
            .split('\n')
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n')
          if (data) current.value = JSON.parse(data) as RuntimeMetric
          boundary = buffer.indexOf('\n\n')
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
    } finally {
      connected.value = false
      controller = null
      if (!stopped && streamGeneration === generation) {
        reconnectTimer = window.setTimeout(() => {
          reconnectTimer = 0
          void openStream(streamGeneration)
        }, reconnectDelay)
        reconnectDelay = Math.min(reconnectDelay * 2, 15_000)
      }
    }
  }

  function close() {
    stopped = true
    generation += 1
    connected.value = false
    controller?.abort()
    controller = null
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = 0
    }
  }

  onBeforeUnmount(close)

  return { connected, current, connect, close }
}
