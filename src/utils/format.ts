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

export function clampHistory<T>(items: T[], max = 60) {
  if (items.length <= max) return items
  return items.slice(items.length - max)
}
