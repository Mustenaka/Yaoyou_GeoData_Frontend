import type { DataTableColumns } from 'naive-ui'
import { formSnapshotColumnLabel, formSnapshotTableLabel, formTypeLabel } from './labels'

export type JsonRecord = Record<string, unknown>
export type SnapshotCell = string | number | boolean | null
export type SnapshotTableRow = Record<string, SnapshotCell> & { __rowKey: string }

export interface ConfigMappingColumn {
  key: string
  label: string
  width: string
  kind: string
  ruleCount: number
  rules: ConfigMappingRule[]
}

export interface ConfigMappingRule {
  id: string
  columnKey: string
  columnLabel: string
  type: string
  typeLabel: string
  active: boolean
  summary: string
  detail: string
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
  mappingRules: ConfigMappingRule[]
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
  formType: string
  formLabel: string
  sampleMetaLabel: string
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
      mappingRules: [],
      configItems: [],
    }
  }

  const mappingSource = findMappingSource(parsed.record)
  const mappingColumns = mappingSource ? extractMappingColumns(mappingSource) : []
  return {
    rawText: parsed.rawText,
    error: parsed.error,
    mappingColumns,
    mappingRules: mappingColumns.flatMap((column) => column.rules),
    configItems: extractConfigItems(parsed.record),
  }
}

export function parseFormSnapshot(raw?: string | null): ParsedFormSnapshot {
  const parsed = parseJSON(raw)
  if (!parsed.record) return emptyParsedFormSnapshot(parsed.error || '表单快照 JSON 为空或格式不正确', parsed.rawText)

  const labels = asRecord(parsed.record.labels)
  const formType = stringValue(parsed.record.formType) || stringValue(parsed.record.form_type)
  const formLabel = firstNonEmptyString(parsed.record.formLabel, parsed.record.formTitle, labels?.form, formTypeLabel(formType))
  const sampleMetaLabel = firstNonEmptyString(parsed.record.sampleMetaLabel, labels?.sampleMeta, formSnapshotTableLabel('sampleMeta'))
  const rowsRaw = asArray(parsed.record.rows)
  const columns = normalizeColumns(asArray(parsed.record.columns), rowsRaw, {
    formType,
    kind: 'data',
    labelMap: asRecord(labels?.columns),
  })
  const rows = normalizeRows(rowsRaw, columns)
  const sampleRowsRaw = firstArray(parsed.record, ['sampleMetaRows', 'sample_meta_rows', 'sampleRows'])
  const sampleColumns = normalizeColumns(firstArray(parsed.record, ['sampleMetaColumns', 'sample_meta_columns', 'sampleColumns']), sampleRowsRaw, {
    formType,
    kind: 'sampleMeta',
    labelMap: asRecord(labels?.sampleMetaColumns),
  })
  const sampleRows = normalizeRows(sampleRowsRaw, sampleColumns)

  return {
    rawText: parsed.rawText,
    error: parsed.error,
    formType,
    formLabel,
    sampleMetaLabel,
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
    formType: '',
    formLabel: '',
    sampleMetaLabel: formSnapshotTableLabel('sampleMeta'),
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
      const label = stringValue(column.label) || key
      return {
        key,
        label,
        width: stringValue(column.width) || '-',
        kind: stringValue(column.kind) || stringValue(column.type) || '-',
        ruleCount: rules.length,
        rules: normalizeMappingRules(rules, key, label),
      }
    })
  }
  if (columnBuckets) {
    return Object.entries(columnBuckets).map(([key, value]) => {
      const bucket = isRecord(value) ? value : {}
      const label = stringValue(bucket.label) || key
      const rules = asArray(bucket.rules)
      return {
        key,
        label,
        width: stringValue(bucket.width) || '-',
        kind: stringValue(bucket.kind) || stringValue(bucket.type) || '-',
        ruleCount: rules.length,
        rules: normalizeMappingRules(rules, key, label),
      }
    })
  }
  return []
}

function normalizeMappingRules(rawRules: unknown[], columnKey: string, columnLabel: string): ConfigMappingRule[] {
  return rawRules
    .map((item, index) => {
      if (!isRecord(item)) return null
      const type = stringValue(item.type) || 'other'
      const summary = firstNonEmptyString(item.ruleDescription, item.label, item.note, item.rule, item.specialRule)
      return {
        id: stringValue(item.id) || `${columnKey}-rule-${index + 1}`,
        columnKey,
        columnLabel,
        type,
        typeLabel: mappingRuleTypeLabel(type),
        active: item.active !== false,
        summary: summary || '-',
        detail: mappingRuleDetail(item),
      }
    })
    .filter((item): item is ConfigMappingRule => !!item)
}

function mappingRuleTypeLabel(type: string) {
  const labels: Record<string, string> = {
    disabled: '禁用',
    sequence: '序号自动生成',
    'manual-text': '自主录入（自由输入）',
    'manual-select': '自主录入（下拉菜单）',
    'device-scanner': '硬件接入（扫码枪）',
    'device-balance': '硬件接入（电子天平）',
    'equipment-table': '器材管理',
    'config-file': '配置文件',
    formula: '公式计算',
    other: '其他',
  }
  return labels[type] || type || '-'
}

function mappingRuleDetail(rule: JsonRecord) {
  const parts: string[] = []
  addDetail(parts, '键值', rule.keyValue)
  addDetail(parts, '规则', rule.rule)
  addDetail(parts, '特殊规则', rule.specialRule)
  addDetail(parts, '配置来源', rule.configSource)
  addDetail(parts, '配置路径', rule.configPath)
  addDetail(parts, '配置键', rule.configKey)
  addDetail(parts, '公式', rule.formula)
  addDetail(parts, '设备号', rule.deviceNo)
  addDetail(parts, '分段', rule.segmentIndex)
  addDetail(parts, '器材类型', rule.equipmentTypeKey)
  addDetail(parts, '器材列', rule.equipmentColumnKey)
  addDetail(parts, '器材分组', rule.equipmentGroupId)
  addDetail(parts, '硬件分组', rule.hardwareGroupId)
  addDetail(parts, '跳转方向', rule.autoRightShiftDirection)
  addDetail(parts, '跳转条件', summarizeList(rule.autoRightShiftConditions))
  addDetail(parts, '填充条件', summarizeList(rule.autoFillConditions))
  addDetail(parts, '小数位', rule.decimalPlaces)
  addDetail(parts, '公式小数位', rule.formulaDecimalEnabled === true ? rule.formulaDecimalPlaces : undefined)
  addDetail(parts, '单数据生成', rule.singleDataGenerate === true ? '是' : undefined)
  addDetail(parts, '保护已有值', rule.preserveManualInput === true ? '是' : undefined)
  addDetail(parts, '乱序', rule.shuffle === true ? '是' : undefined)
  addDetail(parts, '下拉选项', summarizeOptions(rule.dropdownOptionsText))
  addDetail(parts, '备注', rule.note)
  return parts.length ? parts.join('；') : '-'
}

function addDetail(parts: string[], label: string, value: unknown) {
  const text = detailValue(value)
  if (text) parts.push(`${label}：${text}`)
}

function detailValue(value: unknown) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return summarizeList(value)
  if (isRecord(value)) return objectSummary(value) || ''
  return String(value)
}

function summarizeList(value: unknown) {
  const list = asArray(value)
  if (!list.length) return ''
  return `${list.length} 项`
}

function summarizeOptions(value: unknown) {
  const lines = String(value == null ? '' : value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
  if (!lines.length) return ''
  return `${lines.length} 项：${lines.slice(0, 6).join('、')}${lines.length > 6 ? '...' : ''}`
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

type SnapshotColumnKind = 'data' | 'sampleMeta'

interface SnapshotColumnLabelOptions {
  formType?: string
  kind?: SnapshotColumnKind
  labelMap?: JsonRecord | null
}

function normalizeColumns(rawColumns: unknown[], rawRows: unknown[], options: SnapshotColumnLabelOptions = {}): SnapshotColumnDef[] {
  const columns = rawColumns
    .map((item, index) => {
      if (isRecord(item)) {
        const key = stringValue(item.key) || stringValue(item.field) || `column_${index + 1}`
        return {
          key,
          label: resolveSnapshotColumnLabel(key, stringValue(item.label) || stringValue(item.title), options),
          width: normalizeColumnWidth(item.width),
          kind: stringValue(item.kind) || stringValue(item.type) || '',
        }
      }
      const key = stringValue(item) || `column_${index + 1}`
      return { key, label: resolveSnapshotColumnLabel(key, '', options), width: 140, kind: '' }
    })
    .filter((item) => item.key)
  if (columns.length) return columns
  return deriveColumnsFromRows(rawRows, options)
}

function deriveColumnsFromRows(rawRows: unknown[], options: SnapshotColumnLabelOptions = {}): SnapshotColumnDef[] {
  const keys: string[] = []
  rawRows.slice(0, 50).forEach((row) => {
    if (!isRecord(row)) return
    Object.keys(row).forEach((key) => {
      if (!keys.includes(key)) keys.push(key)
    })
  })
  return keys.map((key) => ({ key, label: resolveSnapshotColumnLabel(key, '', options), width: 140, kind: '' }))
}

function resolveSnapshotColumnLabel(key: string, explicitLabel: string, options: SnapshotColumnLabelOptions = {}) {
  const mappedLabel = stringValue(options.labelMap?.[key])
  const fallbackLabel = formSnapshotColumnLabel(options.formType, key, options.kind || 'data')
  if (explicitLabel && explicitLabel !== key) return explicitLabel
  return mappedLabel || fallbackLabel || explicitLabel || key
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

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    const text = stringValue(value)
    if (text) return text
  }
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
