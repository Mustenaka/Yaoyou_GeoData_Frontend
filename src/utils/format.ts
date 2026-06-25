export function formatDateTime(value?: string | number | null) {
  if (!value) return '-'

  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('zh-CN', {
    hour12: false,
  })
}

export function formatPercent(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return '--'
  return `${value.toFixed(1)}%`
}

export function formatBytes(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return '-'
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let size = value / 1024
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`
}

export function shortHash(value?: string | null, head = 10, tail = 8) {
  if (!value) return '-'
  if (value.length <= head + tail + 3) return value
  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export function compactText(value?: string | null, max = 80) {
  if (!value) return '-'
  return value.length > max ? `${value.slice(0, max)}...` : value
}

export function clampHistory<T>(items: T[], max = 60) {
  if (items.length <= max) return items
  return items.slice(items.length - max)
}
