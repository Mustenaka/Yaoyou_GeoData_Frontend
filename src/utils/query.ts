export function queryValue<T>(value: T | null | undefined): Exclude<T, null> | undefined {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed === '' ? undefined : (trimmed as Exclude<T, null>)
  }
  return value as Exclude<T, null>
}

export function queryString(value: string | number | boolean | null | undefined): string | undefined {
  const normalized = queryValue(value)
  return normalized === undefined ? undefined : String(normalized)
}

export function pageList<T>(list: T[] | null | undefined): T[] {
  return Array.isArray(list) ? list : []
}
