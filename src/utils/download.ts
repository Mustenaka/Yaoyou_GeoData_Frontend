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
