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

export interface ConfigSectionItem extends ConfigKeyValueItem {
  source: string
}

export interface ConfigSnapshotTable {
  id: string
  name: string
  description: string
  columns: SnapshotColumnDef[]
  rows: SnapshotTableRow[]
  tableColumns: DataTableColumns<SnapshotTableRow>
  scrollX: number
}

export interface ConfigFillConfigItem extends ConfigSnapshotTable {
  conditionColumnCount: number
  generateColumnCount: number
}

export interface ConfigWorkForm {
  id: string
  formType: string
  formTitle: string
  columns: ConfigMappingColumn[]
  rules: ConfigMappingRule[]
  tableColumns: DataTableColumns<SnapshotTableRow>
  rows: SnapshotTableRow[]
  scrollX: number
}

export interface ConfigEquipmentTypeItem {
  key: string
  name: string
  source: string
  description: string
}

export interface ConfigEquipmentConfigItem extends ConfigSnapshotTable {
  typeKey: string
  typeName: string
}

export interface StructuredConfig {
  rawText: string
  error: string
  basicInfoItems: ConfigKeyValueItem[]
  operationSettings: ConfigSectionItem[]
  workForms: ConfigWorkForm[]
  mappingColumns: ConfigMappingColumn[]
  mappingRules: ConfigMappingRule[]
  fillConfigs: ConfigFillConfigItem[]
  equipmentTypes: ConfigEquipmentTypeItem[]
  equipmentConfigs: ConfigEquipmentConfigItem[]
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
      basicInfoItems: [],
      operationSettings: [],
      workForms: [],
      mappingColumns: [],
      mappingRules: [],
      fillConfigs: [],
      equipmentTypes: [],
      equipmentConfigs: [],
      configItems: [],
    }
  }

  const workForms = extractWorkForms(parsed.record)
  const mappingColumns = workForms.flatMap((form) => form.columns)
  const equipmentTypes = extractEquipmentTypes(parsed.record)
  return {
    rawText: parsed.rawText,
    error: parsed.error,
    basicInfoItems: extractGlobalConfigBasicInfo(parsed.record),
    operationSettings: extractOperationSettings(parsed.record),
    workForms,
    mappingColumns,
    mappingRules: workForms.flatMap((form) => form.rules),
    fillConfigs: extractFillConfigs(parsed.record),
    equipmentTypes,
    equipmentConfigs: extractEquipmentConfigs(parsed.record, equipmentTypes),
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
  if (!sampleColumns.some((column) => column.key === 'sampleCode') && sampleRowsRaw.some((row) => isRecord(row) && stringValue(row.sampleCode))) {
    const sampleCodeColumn: SnapshotColumnDef = {
      key: 'sampleCode',
      label: resolveSnapshotColumnLabel('sampleCode', '', {
        formType,
        kind: 'sampleMeta',
        labelMap: asRecord(labels?.sampleMetaColumns),
      }),
      width: 180,
      kind: 'text',
    }
    const seqIndex = sampleColumns.findIndex((column) => column.key === 'seq')
    sampleColumns.splice(seqIndex >= 0 ? seqIndex + 1 : 0, 0, sampleCodeColumn)
  }
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

function extractWorkForms(record: JsonRecord): ConfigWorkForm[] {
  return collectMappingSources(record).map((source, index) => {
    const columns = extractMappingColumns(source)
    const rules = columns.flatMap((column) => column.rules)
    const formType = firstNonEmptyString(source.formType, source.form_type, source.type) || `form-${index + 1}`
    const formTitle = firstNonEmptyString(source.formTitle, source.title, source.name, formTypeLabel(formType), `工作表单${index + 1}`)
    const previewColumns = mappingPreviewSnapshotColumns(columns)
    return {
      id: firstNonEmptyString(source.configId, source.id, formType) || `work-form-${index + 1}`,
      formType,
      formTitle,
      columns,
      rules,
      tableColumns: buildDataTableColumns(previewColumns),
      rows: buildWorkFormPreviewRows(columns),
      scrollX: tableScrollX(previewColumns),
    }
  })
}

function collectMappingSources(record: JsonRecord): JsonRecord[] {
  const candidates = [
    readNestedValue(record, ['configs', 'dataEntryMapping', 'config']),
    readNestedValue(record, ['configs', 'dataEntryMapping']),
    readNestedValue(record, ['configs', 'globalMapping', 'config']),
    readNestedValue(record, ['configs', 'globalMapping']),
    readNestedValue(record, ['usageConfig', 'dataEntryMapping', 'config']),
    readNestedValue(record, ['usageConfig', 'dataEntryMapping']),
    readNestedValue(record, ['usageConfig', 'globalMapping', 'config']),
    readNestedValue(record, ['usageConfig', 'globalMapping']),
    readNestedValue(record, ['modules', 'dataEntryMapping', 'config']),
    readNestedValue(record, ['modules', 'dataEntryMapping', 'generatedJson']),
    readNestedValue(record, ['modules', 'dataEntryMapping']),
    record.globalMapping,
    record.dataEntryMapping,
    record,
  ]
  const sources: ConfigWorkFormCandidate[] = []
  candidates.forEach((candidate) => {
    normalizeMappingSourceCandidates(candidate).forEach((source) => {
      if (!hasMappingColumns(source)) return
      const signature = [
        firstNonEmptyString(source.configId, source.id),
        firstNonEmptyString(source.formType, source.form_type),
        extractMappingColumnCount(source),
      ].join(':')
      if (sources.some((item) => item.signature === signature)) return
      sources.push({ signature, source })
    })
  })
  return sources.map((item) => item.source)
}

interface ConfigWorkFormCandidate {
  signature: string
  source: JsonRecord
}

function normalizeMappingSourceCandidates(value: unknown): JsonRecord[] {
  const parsed = parseEmbeddedJSON(value)
  if (Array.isArray(parsed)) {
    return parsed.map((item) => asRecord(item)).filter((item): item is JsonRecord => !!item)
  }
  const record = asRecord(parsed)
  if (!record) return []
  const generated = asArray(parseEmbeddedJSON(record.generatedJson))
  if (!hasMappingColumns(record) && generated.length) {
    return generated.map((item) => asRecord(item)).filter((item): item is JsonRecord => !!item)
  }
  return [record]
}

function hasMappingColumns(record: JsonRecord) {
  return extractMappingColumnCount(record) > 0
}

function extractMappingColumnCount(record: JsonRecord) {
  const columnsList = asArray(parseEmbeddedJSON(record.columnsList))
  if (columnsList.length) return columnsList.length
  const columns = parseEmbeddedJSON(record.columns)
  if (Array.isArray(columns)) return columns.length
  return Object.keys(asRecord(columns) || {}).length
}

function extractMappingColumns(source: JsonRecord): ConfigMappingColumn[] {
  const rawColumns = parseEmbeddedJSON(source.columns)
  const columnsList = asArray(parseEmbeddedJSON(source.columnsList)).length ? asArray(parseEmbeddedJSON(source.columnsList)) : asArray(rawColumns)
  const columnBuckets = asRecord(rawColumns)
  if (columnsList.length) {
    return columnsList.map((item, index) => {
      const column = isRecord(item) ? item : { key: String(item), label: String(item) }
      const key = stringValue(column.key) || `column_${index + 1}`
      const bucket = columnBuckets ? asRecord(columnBuckets[key]) : null
      const columnRules = normalizeRuleList(column.rules)
      const rules = columnRules.length ? columnRules : bucket ? normalizeRuleList(bucket.rules) : []
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
      const rules = normalizeRuleList(bucket.rules)
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

function mappingPreviewSnapshotColumns(columns: ConfigMappingColumn[]): SnapshotColumnDef[] {
  return [
    { key: '__label', label: '配置项', width: 120, kind: 'readonly' },
    ...columns.map((column) => ({
      key: column.key,
      label: column.label || column.key,
      width: normalizeColumnWidth(column.width || 160),
      kind: column.kind || 'text',
    })),
  ]
}

function buildWorkFormPreviewRows(columns: ConfigMappingColumn[]): SnapshotTableRow[] {
  const rows: Array<{ key: string; label: string; value: (column: ConfigMappingColumn) => string }> = [
    { key: 'field-key', label: '字段 key', value: (column) => column.key },
    { key: 'rule-type', label: '规则类型', value: (column) => summarizeColumnRuleTypes(column.rules) },
    { key: 'rule-summary', label: '规则说明', value: (column) => summarizeColumnRuleSummaries(column.rules) },
    { key: 'rule-count', label: '规则数', value: (column) => String(column.ruleCount || 0) },
  ]
  return rows.map((row) => {
    const result: SnapshotTableRow = { __rowKey: row.key, __label: row.label }
    columns.forEach((column) => {
      result[column.key] = row.value(column)
    })
    return result
  })
}

function summarizeColumnRuleTypes(rules: ConfigMappingRule[]) {
  if (!rules.length) return '-'
  const activeRules = rules.filter((rule) => rule.active)
  const source = activeRules.length ? activeRules : rules
  return uniqueStrings(source.map((rule) => rule.typeLabel || rule.type)).join(' / ') || '-'
}

function summarizeColumnRuleSummaries(rules: ConfigMappingRule[]) {
  const summaries = uniqueStrings(rules.map((rule) => rule.summary).filter((item) => item && item !== '-'))
  return summaries.length ? summaries.join(' / ') : '-'
}

function uniqueStrings(values: string[]) {
  return values.filter((value, index, array) => !!value && array.indexOf(value) === index)
}

function normalizeMappingRules(rawRules: unknown[], columnKey: string, columnLabel: string): ConfigMappingRule[] {
  return rawRules
    .map((item, index) => {
      if (!isRecord(item)) return null
      const type = firstNonEmptyString(item.type, item.ruleType, item.kind) || 'other'
      const summary = firstNonEmptyString(item.ruleDescription, item.description, item.summary, item.label, item.note, item.rule, item.specialRule)
      return {
        id: stringValue(item.id) || `${columnKey}-rule-${index + 1}`,
        columnKey,
        columnLabel,
        type,
        typeLabel: mappingRuleTypeLabel(type),
        active: item.active !== false && item.enabled !== false,
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
  addDetail(parts, '规则说明', firstNonEmptyString(rule.label, rule.ruleDescription, rule.description))
  addDetail(parts, '键值对', rule.keyValue)
  addDetail(parts, '规则', rule.rule)
  addDetail(parts, '特殊处理规则', rule.specialRule)
  addDetail(parts, '配置来源', rule.configSource)
  addDetail(parts, '公式', rule.formula)
  addDetail(parts, '设备号', rule.deviceNo)
  addDetail(parts, '数据段', rule.segmentIndex)
  addDetail(parts, '器材类型', rule.equipmentTypeKey)
  addDetail(parts, '器材列', rule.equipmentColumnKey)
  addDetail(parts, '器材填充分组', rule.equipmentGroupId)
  addDetail(parts, '硬件填充分组', rule.hardwareGroupId)
  addDetail(parts, '跳转方向', autoRightShiftDirectionLabel(rule.autoRightShiftDirection))
  addDetail(parts, '跳转接收条件', summarizeConditionList(rule.autoRightShiftConditions))
  addDetail(parts, '条件生成规则', summarizeConditionList(rule.autoFillConditions))
  addDetail(parts, '输入数值小数位', rule.decimalPlaces)
  addDetail(parts, '公式结果小数位', rule.formulaDecimalEnabled === true ? rule.formulaDecimalPlaces : undefined)
  addDetail(parts, '单数据生成', rule.singleDataGenerate === true ? '是' : undefined)
  addDetail(parts, '保护已有值', rule.preserveManualInput === true ? '是' : undefined)
  addDetail(parts, '下拉选项', summarizeOptions(rule.dropdownOptionsText))
  return parts.length ? parts.join('；') : '-'
}

function autoRightShiftDirectionLabel(value: unknown) {
  const text = stringValue(value)
  const labels: Record<string, string> = {
    none: '不跳转',
    right: '同行向右',
    down: '同列向下',
  }
  return labels[text] || text
}

function summarizeConditionList(value: unknown) {
  const list = asArray(value)
  if (!list.length) return ''
  const labels = list.map((item) => {
    if (!isRecord(item)) return displayValue(item)
    const column = firstNonEmptyString(item.columnLabel, item.columnKey, item.key)
    const text = firstNonEmptyString(item.valuesText, item.value, item.values)
    return [column, text].filter(Boolean).join('=')
  }).filter(Boolean)
  return labels.length ? labels.join('；') : `${list.length} 项`
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

const visibleAppSettingFields: Array<{ key: string; label: string; source: string }> = [
  { key: 'bluetoothReconnect', label: '蓝牙自动重连', source: '软件设置' },
  { key: 'bluetoothReconnectIntervalSec', label: '蓝牙重连间隔（秒）', source: '软件设置' },
  { key: 'cursorColorRules', label: '光标色卡', source: '光标色卡' },
  { key: 'longPressDeleteMs', label: '长按删除时长（毫秒）', source: '交互配置' },
  { key: 'longPressCopyMs', label: '长按复制时长（毫秒）', source: '交互配置' },
  { key: 'excavationFormPageSize', label: '开土记录每页行数', source: '交互配置' },
]

function extractGlobalConfigBasicInfo(record: JsonRecord): ConfigKeyValueItem[] {
  return [
    { key: 'version', label: '快照版本', value: displayValue(record.version) },
    { key: 'exportedAt', label: '导出时间', value: formatExportedAt(record.exportedAt) },
  ].filter((item) => item.value && item.value !== '-')
}

function extractOperationSettings(record: JsonRecord): ConfigSectionItem[] {
  const config = asRecord(record.appSettings)
  if (!config) return []
  return visibleAppSettingFields
    .filter((item) => Object.prototype.hasOwnProperty.call(config, item.key))
    .map((item) => ({
      source: item.source,
      key: item.key,
      label: item.label,
      value: formatAppSettingValue(item.key, config[item.key]),
    }))
}

function formatAppSettingValue(key: string, value: unknown) {
  if (key === 'bluetoothReconnect') return value === true ? '开启' : '关闭'
  if (key === 'cursorColorRules') {
    const rules = asArray(value)
    if (!rules.length) return '-'
    return rules
      .map((item) => {
        const rule = asRecord(item)
        if (!rule) return ''
        return firstNonEmptyString(rule.name, rule.id)
      })
      .filter(Boolean)
      .join('、') || `${rules.length} 条`
  }
  return displayValue(value)
}

function extractFillConfigs(record: JsonRecord): ConfigFillConfigItem[] {
  const configs = collectFillConfigs(record)
  return configs
    .map((item, index) => {
    const config = asRecord(item)
    if (!config) return null
    const columns = buildFillConfigTableColumns(config)
    const rows = normalizeRows(asArray(config.rows), columns)
    return {
      id: firstNonEmptyString(config.id, config.key) || `fill-${index + 1}`,
      name: firstNonEmptyString(config.name, config.label, config.title) || `智能填充${index + 1}`,
      description: firstNonEmptyString(config.description, config.remark),
      columns,
      rows,
      tableColumns: buildDataTableColumns(columns),
      scrollX: tableScrollX(columns),
      conditionColumnCount: asArray(config.conditionColumns).length,
      generateColumnCount: asArray(config.generateColumns).length,
    }
  })
    .filter((item): item is ConfigFillConfigItem => !!item)
}

function collectFillConfigs(record: JsonRecord): unknown[] {
  const multiRuleMapping = readNestedRecord(record, ['modules', 'multiRuleMapping']) || {}
  const store = asRecord(parseEmbeddedJSON(multiRuleMapping.store))
  const userConfigs = uniqueConfigRecords([
    ...asArray(parseEmbeddedJSON(record.fillConfigs)),
    ...asArray(parseEmbeddedJSON(store?.configs)),
    ...asArray(parseEmbeddedJSON(multiRuleMapping.configs)),
    ...asArray(parseEmbeddedJSON(multiRuleMapping.fillConfigs)),
  ])
  const generatedConfigs = uniqueConfigRecords(asArray(parseEmbeddedJSON(multiRuleMapping.generatedJson)))
  const includeGenerated = userConfigs.length === 0 || store?.builtinsSeeded !== true
  return includeGenerated ? uniqueConfigRecords([...userConfigs, ...generatedConfigs]) : userConfigs
}

function uniqueConfigRecords(values: unknown[]) {
  const seen = new Set<string>()
  const rows: JsonRecord[] = []
  values.forEach((value, index) => {
    const record = asRecord(parseEmbeddedJSON(value))
    if (!record) return
    const signature = firstNonEmptyString(record.id, record.key, record.name, record.label) || `config-${index}`
    if (seen.has(signature)) return
    seen.add(signature)
    rows.push(record)
  })
  return rows
}

function buildFillConfigTableColumns(config: JsonRecord): SnapshotColumnDef[] {
  const widths = asRecord(config.columnWidths)
  const columns: SnapshotColumnDef[] = []
  asArray(config.conditionColumns).forEach((item) => {
    const label = stringValue(item)
    if (!label) return
    columns.push({ key: label, label, width: normalizeColumnWidth(widths?.[label] || 160), kind: 'condition' })
  })
  const equalsColumn = firstNonEmptyString(config.equalsColumn, '等于')
  columns.push({ key: equalsColumn, label: equalsColumn, width: normalizeColumnWidth(widths?.[equalsColumn] || 70), kind: 'equals' })
  asArray(config.generateColumns).forEach((item) => {
    const label = stringValue(item)
    if (!label) return
    columns.push({ key: label, label, width: normalizeColumnWidth(widths?.[label] || 160), kind: 'generate' })
  })
  return columns
}

function extractEquipmentTypes(record: JsonRecord): ConfigEquipmentTypeItem[] {
  const rows: ConfigEquipmentTypeItem[] = []
  const byKey = new Map<string, ConfigEquipmentTypeItem>()
  const add = (item: ConfigEquipmentTypeItem) => {
    const key = item.key.trim()
    if (!key) return
    const next = { ...item, key, name: item.name || key }
    const existing = byKey.get(key)
    if (existing) {
      existing.name = next.name || existing.name
      existing.source = next.source || existing.source
      existing.description = next.description || existing.description
      return
    }
    byKey.set(key, next)
    rows.push(next)
  }

  asArray(record.equipmentTypes).forEach((item) => {
    const type = asRecord(item)
    if (!type) return
    add({
      key: firstNonEmptyString(type.key, type.typeKey, type.id),
      name: firstNonEmptyString(type.name, type.label, type.title),
      source: '内置',
      description: firstNonEmptyString(type.description, type.remark),
    })
  })

  const custom = record.customEquipmentTypes
  if (Array.isArray(custom)) {
    custom.forEach((item) => {
      const type = asRecord(item)
      if (!type) return
      add({
        key: firstNonEmptyString(type.key, type.typeKey, type.id),
        name: firstNonEmptyString(type.name, type.label, type.title),
        source: '自定义',
        description: firstNonEmptyString(type.description, type.remark),
      })
    })
  } else if (isRecord(custom)) {
    Object.keys(custom)
      .sort()
      .forEach((key) => {
        const type = asRecord(custom[key])
        if (type) {
          add({
            key: firstNonEmptyString(type.key, key),
            name: firstNonEmptyString(type.name, type.label, type.title),
            source: '自定义',
            description: firstNonEmptyString(type.description, type.remark),
          })
        } else {
          add({ key, name: stringValue(custom[key]), source: '自定义', description: '' })
        }
      })
  }

  const overrides = asRecord(record.equipmentTypeNameOverrides)
  if (overrides) {
    Object.keys(overrides)
      .sort()
      .forEach((key) => add({ key, name: stringValue(overrides[key]), source: '名称覆盖', description: '' }))
  }
  return rows
}

function extractEquipmentConfigs(record: JsonRecord, types: ConfigEquipmentTypeItem[]): ConfigEquipmentConfigItem[] {
  const typeNames = new Map(types.map((item) => [item.key, item.name || item.key]))
  const configs = asRecord(record.equipmentConfigs) || readNestedRecord(record, ['modules', 'equipmentManagement', 'equipmentConfigs'])
  if (!configs) return []
  return Object.keys(configs)
    .sort()
    .map((typeKey) => {
      const typeName = typeNames.get(typeKey) || typeKey
      const config = asRecord(configs[typeKey])
      if (!config) return null
      const columns = extractEquipmentColumns(config)
      const tableColumns = columns.length ? columns : deriveEquipmentColumnsFromRows(asArray(config.rows))
      const rows = normalizeRows(asArray(config.rows), tableColumns)
      return {
        id: typeKey,
        name: typeName,
        description: '',
        typeKey,
        typeName,
        columns: tableColumns,
        rows,
        tableColumns: buildDataTableColumns(tableColumns),
        scrollX: tableScrollX(tableColumns),
      }
    })
    .filter((item): item is ConfigEquipmentConfigItem => !!item)
}

function extractEquipmentColumns(config: JsonRecord): SnapshotColumnDef[] {
  const rawColumns = asArray(config.columns).length ? asArray(config.columns) : asArray(config.columnsList)
  const columns = rawColumns
    .map((item) => {
      const column = asRecord(item)
      if (!column) return null
      const key = firstNonEmptyString(column.key, column.field, column.id)
      if (!key) return null
      return {
        key,
        label: firstNonEmptyString(column.label, column.title, column.name, key),
        width: normalizeColumnWidth(column.width || 160),
        kind: stringValue(column.kind) || stringValue(column.type) || 'text',
      }
    })
    .filter((item): item is SnapshotColumnDef => !!item)
  if (columns.length) return columns
  const columnMap = asRecord(config.columns)
  if (!columnMap) return []
  return Object.keys(columnMap)
    .sort()
    .map((key) => {
      const column = asRecord(columnMap[key])
      return {
        key,
        label: firstNonEmptyString(column?.label, column?.title, column?.name, key),
        width: normalizeColumnWidth(column?.width || 160),
        kind: stringValue(column?.kind) || stringValue(column?.type) || 'text',
      }
    })
}

function deriveEquipmentColumnsFromRows(rows: unknown[]): SnapshotColumnDef[] {
  const keys: string[] = []
  rows.slice(0, 20).forEach((row) => {
    if (!isRecord(row)) return
    Object.keys(row).forEach((key) => {
      if (!keys.includes(key)) keys.push(key)
    })
  })
  return keys.map((key) => ({ key, label: key, width: 160, kind: 'text' }))
}

function normalizeRuleList(value: unknown): unknown[] {
  const parsed = parseEmbeddedJSON(value)
  if (Array.isArray(parsed)) return parsed
  if (!isRecord(parsed)) return parsed === undefined || parsed === null ? [] : [parsed]
  if (looksLikeRule(parsed)) return [parsed]
  return Object.keys(parsed)
    .sort()
    .flatMap((key) => normalizeRuleList(parsed[key]))
}

function looksLikeRule(value: JsonRecord) {
  return ['type', 'ruleType', 'kind', 'enabled', 'active', 'description', 'formula', 'source', 'hardware', 'equipment'].some((key) => key in value)
}

function formatExportedAt(value: unknown) {
  const text = stringValue(value)
  if (!text) return displayValue(value)
  const numeric = Number(text)
  if (Number.isFinite(numeric) && numeric > 0) {
    const date = new Date(numeric > 9_999_999_999 ? numeric : numeric * 1000)
    if (!Number.isNaN(date.getTime())) return date.toLocaleString()
  }
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? text : date.toLocaleString()
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
    title: column.kind === 'equals' ? '=' : column.label || column.key,
    key: column.key,
    width: column.width,
    minWidth: Math.min(Math.max(column.width, 100), 220),
    align: column.kind === 'equals' ? 'center' : undefined,
    className: tableColumnClassName(column),
    ellipsis: { tooltip: true },
    render: (row) => (column.kind === 'equals' ? '=' : formatCell(row[column.key])),
  }))
}

function tableScrollX(columns: SnapshotColumnDef[]) {
  return Math.max(columns.reduce((sum, column) => sum + column.width, 0), 720)
}

function tableColumnClassName(column: SnapshotColumnDef) {
  if (column.kind === 'equals') return 'fill-equals-column'
  if (column.kind === 'condition') return 'fill-condition-column'
  if (column.kind === 'generate') return 'fill-generate-column'
  return ''
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

function parseEmbeddedJSON(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (!text || !/^[\[{]/.test(text)) return value
  try {
    return JSON.parse(text)
  } catch {
    return value
  }
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
