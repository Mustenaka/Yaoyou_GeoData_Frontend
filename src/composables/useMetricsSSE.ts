import { onBeforeUnmount, ref } from 'vue'
import type { RuntimeMetric } from '@/types/api'
import { clampHistory } from '@/utils/format'

export function useMetricsSSE() {
  const connected = ref(false)
  const current = ref<RuntimeMetric | null>(null)
  const history = ref<RuntimeMetric[]>([])

  let source: EventSource | null = null
  let timer: number | null = null
  let delay = 1000

  function connect() {
    source?.close()
    source = new EventSource(`${import.meta.env.VITE_API_BASE || '/api'}/admin/metrics/stream`)

    source.onopen = () => {
      connected.value = true
      delay = 1000
    }

    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as RuntimeMetric
      current.value = next
      history.value = clampHistory([...history.value, next], 60)
    }

    source.onerror = () => {
      connected.value = false
      source?.close()
      timer = window.setTimeout(connect, delay)
      delay = Math.min(delay * 2, 15000)
    }
  }

  function close() {
    source?.close()
    if (timer) {
      window.clearTimeout(timer)
      timer = null
    }
  }

  connect()
  onBeforeUnmount(close)

  return {
    connected,
    current,
    history,
  }
}
