import type { DataTableColumns } from 'naive-ui'

export type JsonRecord = Record<string, unknown>
export type SnapshotCell = string | number | boolean | null
export type SnapshotTableRow = Record<string, SnapshotCell> & { __rowKey: string }

export interface ConfigMappingColumn {
  key: string
  label: string
  width: string
  kind: string
  ruleCount: number
}

export interface ConfigKeyValueItem {
  key: string
  label: string
  value: string
}

export interface StructuredConfig {
  rawText: string
  error: string
  mappingColumns: ConfigMappingColumn[]
  configItems: ConfigKeyValueItem[]
}

export interface SnapshotColumnDef {
  key: string
  label: string
  width: number
  kind: string
}

export interface ParsedFormSnapshot {
  rawText: string
  error: string
  columns: SnapshotColumnDef[]
  rows: SnapshotTableRow[]
  sampleColumns: SnapshotColumnDef[]
  sampleRows: SnapshotTableRow[]
  tableColumns: DataTableColumns<SnapshotTableRow>
  sampleTableColumns: DataTableColumns<SnapshotTableRow>
  scrollX: number
  sampleScrollX: number
}

export function parseStructuredConfig(raw?: string | null): StructuredConfig {
  const parsed = parseJSON(raw)
  if (!parsed.record) {
    return {
      rawText: parsed.rawText,
      error: parsed.error || '配置 JSON 为空或格式不正确',
      mappingColumns: [],
      configItems: [],
    }
  }

  const mappingSource = findMappingSource(parsed.record)
  return {
    rawText: parsed.rawText,
    error: parsed.error,
    mappingColumns: mappingSource ? extractMappingColumns(mappingSource) : [],
    configItems: extractConfigItems(parsed.record),
  }
}

export function parseFormSnapshot(raw?: string | null): ParsedFormSnapshot {
  const parsed = parseJSON(raw)
  if (!parsed.record) return emptyParsedFormSnapshot(parsed.error || '表单快照 JSON 为空或格式不正确', parsed.rawText)

  const rowsRaw = asArray(parsed.record.rows)
  const columns = normalizeColumns(asArray(parsed.record.columns), rowsRaw)
  const rows = normalizeRows(rowsRaw, columns)
  const sampleRowsRaw = firstArray(parsed.record, ['sampleMetaRows', 'sample_meta_rows', 'sampleRows'])
  const sampleColumns = normalizeColumns(firstArray(parsed.record, ['sampleMetaColumns', 'sample_meta_columns', 'sampleColumns']), sampleRowsRaw)
  const sampleRows = normalizeRows(sampleRowsRaw, sampleColumns)

  return {
    rawText: parsed.rawText,
    error: parsed.error,
    columns,
    rows,
    sampleColumns,
    sampleRows,
    tableColumns: buildDataTableColumns(columns),
    sampleTableColumns: buildDataTableColumns(sampleColumns),
    scrollX: tableScrollX(columns),
    sampleScrollX: tableScrollX(sampleColumns),
  }
}

export function emptyParsedFormSnapshot(error = '', rawText = '{}'): ParsedFormSnapshot {
  return {
    rawText,
    error,
    columns: [],
    rows: [],
    sampleColumns: [],
    sampleRows: [],
    tableColumns: [],
    sampleTableColumns: [],
    scrollX: 0,
    sampleScrollX: 0,
  }
}

export function parseJSON(raw?: string | null): { record: JsonRecord | null; rawText: string; error: string } {
  if (!raw) return { record: null, rawText: '{}', error: '' }
  try {
    const parsed = JSON.parse(raw) as unknown
    const rawText = JSON.stringify(parsed, null, 2)
    return { record: isRecord(parsed) ? parsed : null, rawText, error: isRecord(parsed) ? '' : 'JSON 顶层不是对象' }
  } catch {
    return { record: null, rawText: raw, error: 'JSON 解析失败' }
  }
}

function findMappingSource(record: JsonRecord): JsonRecord | null {
  const candidates = [
    readNestedRecord(record, ['configs', 'dataEntryMapping', 'config']),
    readNestedRecord(record, ['configs', 'dataEntryMapping']),
    readNestedRecord(record, ['configs', 'globalMapping', 'config']),
    readNestedRecord(record, ['configs', 'globalMapping']),
    readNestedRecord(record, ['usageConfig', 'dataEntryMapping', 'config']),
    readNestedRecord(record, ['usageConfig', 'dataEntryMapping']),
    readNestedRecord(record, ['usageConfig', 'globalMapping', 'config']),
    readNestedRecord(record, ['usageConfig', 'globalMapping']),
    readNestedRecord(record, ['modules', 'dataEntryMapping']),
    readNestedRecord(record, ['globalMapping']),
    readNestedRecord(record, ['dataEntryMapping']),
    record,
  ]
  return candidates.find((item) => item && hasMappingColumns(item)) || null
}

function hasMappingColumns(record: JsonRecord) {
  return asArray(record.columnsList).length > 0 || asArray(record.columns).length > 0 || Object.keys(asRecord(record.columns) || {}).length > 0
}

function extractMappingColumns(source: JsonRecord): ConfigMappingColumn[] {
  const columnsList = asArray(source.columnsList).length ? asArray(source.columnsList) : asArray(source.columns)
  const columnBuckets = asRecord(source.columns)
  if (columnsList.length) {
    return columnsList.map((item, index) => {
      const column = isRecord(item) ? item : { key: String(item), label: String(item) }
      const key = stringValue(column.key) || `column_${index + 1}`
      const bucket = columnBuckets ? asRecord(columnBuckets[key]) : null
      const rules = bucket ? asArray(bucket.rules) : []
      return {
        key,
        label: stringValue(column.label) || key,
        width: stringValue(column.width) || '-',
        kind: stringValue(column.kind) || stringValue(column.type) || '-',
        ruleCount: rules.length,
      }
    })
  }
  if (columnBuckets) {
    return Object.entries(columnBuckets).map(([key, value]) => {
      const bucket = isRecord(value) ? value : {}
      return {
        key,
        label: stringValue(bucket.label) || key,
        width: stringValue(bucket.width) || '-',
        kind: stringValue(bucket.kind) || stringValue(bucket.type) || '-',
        ruleCount: asArray(bucket.rules).length,
      }
    })
  }
  return []
}

function extractConfigItems(record: JsonRecord): ConfigKeyValueItem[] {
  const items: ConfigKeyValueItem[] = []
  const add = (key: string, label: string, value: unknown) => {
    if (value === undefined) return
    items.push({ key, label, value: displayValue(value) })
  }

  add('packageVersion', '项目包版本', record.packageVersion)
  add('version', '配置版本', record.version)
  add('exportedAt', '导出时间', record.exportedAt)
  add('usageConfig', '项目使用配置', objectSummary(record.usageConfig))
  add('configs', '项目配置块', objectSummary(record.configs))
  add('resources.files', '资源文件数', asArray(readNestedValue(record, ['resources', 'files'])).length || undefined)
  add('appSettings', '应用设置', objectSummary(record.appSettings))
  add('globalProjectConfig', '全局项目配置', objectSummary(record.globalProjectConfig))
  add('globalMapping', '全局映射', objectSummary(record.globalMapping))
  add('globalFillRule', '智能填充规则', objectSummary(record.globalFillRule))
  add('fillConfigs', '智能填充配置表', arraySummary(record.fillConfigs))
  add('equipmentTypes', '器材类型', arraySummary(record.equipmentTypes))
  add('equipmentConfigs', '器材配置', arraySummary(record.equipmentConfigs))
  add('modules', '模块配置', objectSummary(record.modules))

  const operationSettings = readNestedRecord(record, ['usageConfig', 'operationSettings']) || readNestedRecord(record, ['appSettings'])
  if (operationSettings) {
    Object.entries(operationSettings).slice(0, 12).forEach(([key, value]) => add(`operationSettings.${key}`, `操作设置：${key}`, value))
  }
  return items
}

function normalizeColumns(rawColumns: unknown[], rawRows: unknown[]): SnapshotColumnDef[] {
  const columns = rawColumns
    .map((item, index) => {
      if (isRecord(item)) {
        const key = stringValue(item.key) || stringValue(item.field) || `column_${index + 1}`
        return {
          key,
          label: stringValue(item.label) || stringValue(item.title) || key,
          width: normalizeColumnWidth(item.width),
          kind: stringValue(item.kind) || stringValue(item.type) || '',
        }
      }
      const key = stringValue(item) || `column_${index + 1}`
      return { key, label: key, width: 140, kind: '' }
    })
    .filter((item) => item.key)
  if (columns.length) return columns
  return deriveColumnsFromRows(rawRows)
}

function deriveColumnsFromRows(rawRows: unknown[]): SnapshotColumnDef[] {
  const keys: string[] = []
  rawRows.slice(0, 50).forEach((row) => {
    if (!isRecord(row)) return
    Object.keys(row).forEach((key) => {
      if (!keys.includes(key)) keys.push(key)
    })
  })
  return keys.map((key) => ({ key, label: key, width: 140, kind: '' }))
}

function normalizeRows(rawRows: unknown[], columns: SnapshotColumnDef[]): SnapshotTableRow[] {
  return rawRows.map((row, index) => {
    const normalized: SnapshotTableRow = { __rowKey: `row-${index + 1}` }
    if (isRecord(row)) {
      columns.forEach((column) => {
        normalized[column.key] = normalizeCellValue(row[column.key])
      })
    } else if (Array.isArray(row)) {
      columns.forEach((column, columnIndex) => {
        normalized[column.key] = normalizeCellValue(row[columnIndex])
      })
    }
    return normalized
  })
}

function buildDataTableColumns(columns: SnapshotColumnDef[]): DataTableColumns<SnapshotTableRow> {
  return columns.map((column) => ({
    title: column.label || column.key,
    key: column.key,
    width: column.width,
    minWidth: Math.min(Math.max(column.width, 100), 220),
    ellipsis: { tooltip: true },
    render: (row) => formatCell(row[column.key]),
  }))
}

function tableScrollX(columns: SnapshotColumnDef[]) {
  return Math.max(columns.reduce((sum, column) => sum + column.width, 0), 720)
}

function normalizeColumnWidth(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number.parseInt(String(value || ''), 10)
  if (!Number.isFinite(numberValue) || numberValue <= 0) return 140
  return Math.min(Math.max(numberValue, 90), 260)
}

function normalizeCellValue(value: unknown): SnapshotCell {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return displayValue(value)
}

function formatCell(value: SnapshotCell | undefined) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function firstArray(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = asArray(record[key])
    if (value.length) return value
  }
  return []
}

function readNestedRecord(record: JsonRecord, path: string[]) {
  const value = readNestedValue(record, path)
  return asRecord(value)
}

function readNestedValue(record: JsonRecord, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => (isRecord(current) ? current[key] : undefined), record)
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: unknown): JsonRecord | null {
  return isRecord(value) ? value : null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function objectSummary(value: unknown) {
  if (!isRecord(value)) return undefined
  const keys = Object.keys(value)
  return keys.length ? `${keys.length} 项：${keys.slice(0, 8).join('、')}${keys.length > 8 ? '...' : ''}` : '空'
}

function arraySummary(value: unknown) {
  const list = asArray(value)
  return list.length ? `${list.length} 项` : undefined
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} 项`
  if (isRecord(value)) {
    const keys = Object.keys(value)
    return keys.length ? keys.slice(0, 10).join('、') : '空对象'
  }
  return String(value)
}
