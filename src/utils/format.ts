export function formatDateTime(value?: string | number | null) {
  if (!value) return '-'

  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('zh-CN', {
    hour12: false,
  })
}

export function datePickerValue(value?: string | number | null) {
  if (!value) return null
  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  const time = date.getTime()
  return Number.isNaN(time) ? null : time
}

export function datePickerISOString(value?: number | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function formatValidityDateTime(value?: string | number | null) {
  return value ? formatDateTime(value) : '长期有效'
}

export function isDateTimeExpired(value?: string | number | null, now = Date.now()) {
  if (!value) return false
  const time = typeof value === 'number' ? value : new Date(value).getTime()
  return Number.isFinite(time) && time < now
}

export function isEffectiveExpired(value?: string | number | null, effectiveExpired?: boolean, now = Date.now()) {
  if (typeof effectiveExpired === 'boolean') return effectiveExpired
  return isDateTimeExpired(value, now)
}

export function addMonthsDatePickerValue(months = 1, from = Date.now()) {
  const date = new Date(from)
  date.setMonth(date.getMonth() + months)
  return date.getTime()
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
