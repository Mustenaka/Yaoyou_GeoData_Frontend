export function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  window.URL.revokeObjectURL(url)
}

export function filenameFromPath(path?: string | null, fallback = 'download') {
  if (!path) return fallback
  const normalized = path.replace(/\\/g, '/')
  return normalized.split('/').pop() || fallback
}

export function timestampedXlsxFilename(prefix: string, date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${prefix}-${stamp}.xlsx`
}

export function ensureXlsxBlob(blob: Blob) {
  if (!blob || blob.size === 0 || blob.type.includes('application/json')) {
    throw new Error('download failed')
  }
}
