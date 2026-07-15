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

export interface StructuredConfigModuleState {
  schemaVersion: string
  isSchema3: boolean
  dataEntryPresent: boolean
  dataEntrySource: string
  dataEntryDefaultApplied: boolean
  smartFillPresent: boolean
  smartFillSource: string
  smartFillConfigCount: number
  smartFillBodyCount: number
  smartFillDistributedRefCount: number
  smartFillUsesDefaultRule: boolean
  smartFillConfigFileId: string
  equipmentPresent: boolean
  equipmentSource: string
  equipmentConfigCount: number
  equipmentBodyCount: number
  equipmentDistributedRefCount: number
  equipmentIsEmpty: boolean
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
  moduleState: StructuredConfigModuleState
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
      moduleState: emptyStructuredConfigModuleState(),
    }
  }

  const record = normalizeStructuredConfigRecord(parsed.record)
  const workForms = extractWorkForms(record)
  const mappingColumns = workForms.flatMap((form) => form.columns)
  const fillConfigs = extractFillConfigs(record)
  const equipmentTypes = extractEquipmentTypes(record)
  const equipmentConfigs = extractEquipmentConfigs(record, equipmentTypes)
  return {
    rawText: parsed.rawText,
    error: parsed.error,
    basicInfoItems: extractGlobalConfigBasicInfo(record),
    operationSettings: extractOperationSettings(record),
    workForms,
    mappingColumns,
    mappingRules: workForms.flatMap((form) => form.rules),
    fillConfigs,
    equipmentTypes,
    equipmentConfigs,
    configItems: extractConfigItems(record),
    moduleState: extractStructuredConfigModuleState(parsed.record, fillConfigs.length, equipmentConfigs.length),
  }
}

function emptyStructuredConfigModuleState(): StructuredConfigModuleState {
  return {
    schemaVersion: '',
    isSchema3: false,
    dataEntryPresent: false,
    dataEntrySource: '',
    dataEntryDefaultApplied: false,
    smartFillPresent: false,
    smartFillSource: '',
    smartFillConfigCount: 0,
    smartFillBodyCount: 0,
    smartFillDistributedRefCount: 0,
    smartFillUsesDefaultRule: false,
    smartFillConfigFileId: '',
    equipmentPresent: false,
    equipmentSource: '',
    equipmentConfigCount: 0,
    equipmentBodyCount: 0,
    equipmentDistributedRefCount: 0,
    equipmentIsEmpty: false,
  }
}

function extractStructuredConfigModuleState(record: JsonRecord, fillConfigCount: number, equipmentConfigCount: number): StructuredConfigModuleState {
  const modules = asRecord(record.modules)
  const schema3DataEntry = asRecord(parseEmbeddedJSON(record.data_entry_mapping))
  const schema3MultiRule = asRecord(parseEmbeddedJSON(record.multi_rule_mapping))
  const schema3Equipment = asRecord(parseEmbeddedJSON(record.equipment_management))
  const v2DataEntry = asRecord(parseEmbeddedJSON(modules?.dataEntryMapping))
  const v2MultiRule = asRecord(parseEmbeddedJSON(modules?.multiRuleMapping))
  const v2Equipment = asRecord(parseEmbeddedJSON(modules?.equipmentManagement))
  const explicitState = findExplicitModuleState(record)
  const explicitDataEntry = asRecord(explicitState?.data_entry_mapping) || asRecord(explicitState?.dataEntryMapping)
  const explicitSmartFill = asRecord(explicitState?.multi_rule_mapping) || asRecord(explicitState?.multiRuleMapping)
  const explicitEquipment = asRecord(explicitState?.equipment_management) || asRecord(explicitState?.equipmentManagement)
  const explicitRuleReference = asRecord(explicitSmartFill?.rule_reference) || asRecord(explicitSmartFill?.ruleReference)
  const globalRule = asRecord(parseEmbeddedJSON(
    schema3MultiRule?.global_rule ?? schema3MultiRule?.globalRule ?? v2MultiRule?.globalRule ?? record.globalFillRule,
  ))
  const schemaVersion = firstNonEmptyString(record.schema_version, record.version, record.packageVersion, record.package_version)
  const isSchema3 = Number(schemaVersion) === 3
  const dataEntryPresent = !!explicitDataEntry || !!schema3DataEntry || !!v2DataEntry || !!asRecord(parseEmbeddedJSON(record.globalMapping))
  const smartFillPresent = !!explicitSmartFill || !!schema3MultiRule || !!v2MultiRule || isConfigCollection(record.fillConfigs)
  const equipmentPresent = !!explicitEquipment || !!schema3Equipment || !!v2Equipment || isConfigCollection(record.equipmentConfigs)
  const explicitSmartFillEmpty = optionalBoolean(explicitSmartFill?.default_empty_config ?? explicitSmartFill?.defaultEmptyConfig)
  const explicitEquipmentEmpty = optionalBoolean(explicitEquipment?.default_empty_config ?? explicitEquipment?.defaultEmptyConfig)
  return {
    schemaVersion,
    isSchema3,
    dataEntryPresent,
    dataEntrySource: firstNonEmptyString(explicitDataEntry?.source),
    dataEntryDefaultApplied: optionalBoolean(explicitDataEntry?.default_applied ?? explicitDataEntry?.defaultApplied) ?? false,
    smartFillPresent,
    smartFillSource: firstNonEmptyString(explicitSmartFill?.source),
    smartFillConfigCount: fillConfigCount,
    smartFillBodyCount: optionalNonNegativeNumber(explicitSmartFill?.body_count ?? explicitSmartFill?.bodyCount ?? explicitSmartFill?.local_body_count) ?? fillConfigCount,
    smartFillDistributedRefCount: optionalNonNegativeNumber(explicitSmartFill?.distributed_ref_count ?? explicitSmartFill?.distributedRefCount) ?? 0,
    smartFillUsesDefaultRule: explicitSmartFillEmpty ?? (!!globalRule && (!!schema3MultiRule || !!v2MultiRule) && fillConfigCount === 0),
    smartFillConfigFileId: firstNonEmptyString(
      explicitRuleReference?.config_file_id,
      explicitRuleReference?.configFileId,
      globalRule?.configFileId,
      globalRule?.config_file_id,
    ),
    equipmentPresent,
    equipmentSource: firstNonEmptyString(explicitEquipment?.source),
    equipmentConfigCount,
    equipmentBodyCount: optionalNonNegativeNumber(explicitEquipment?.body_count ?? explicitEquipment?.bodyCount ?? explicitEquipment?.local_body_count) ?? equipmentConfigCount,
    equipmentDistributedRefCount: optionalNonNegativeNumber(explicitEquipment?.distributed_ref_count ?? explicitEquipment?.distributedRefCount) ?? 0,
    equipmentIsEmpty: explicitEquipmentEmpty ?? ((!!schema3Equipment || !!v2Equipment) && equipmentConfigCount === 0),
  }
}

function isConfigCollection(value: unknown): boolean {
  const parsed = parseEmbeddedJSON(value)
  return Array.isArray(parsed) || !!asRecord(parsed)
}

function findExplicitModuleState(record: JsonRecord): JsonRecord | null {
  const direct = asRecord(parseEmbeddedJSON(record.module_state)) || asRecord(parseEmbeddedJSON(record.moduleState))
  if (direct) return direct
  const formConfigs = asRecord(record.formConfigs) || asRecord(record.form_configs)
  if (!formConfigs) return null
  for (const value of Object.values(formConfigs)) {
    const form = asRecord(parseEmbeddedJSON(value))
    const state = asRecord(parseEmbeddedJSON(form?.moduleState)) || asRecord(parseEmbeddedJSON(form?.module_state))
    if (state) return state
  }
  return null
}

function optionalBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function optionalNonNegativeNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function normalizeStructuredConfigRecord(record: JsonRecord): JsonRecord {
  const normalized: JsonRecord = { ...record }
  setAlias(normalized, 'version', record.schema_version)
  setAlias(normalized, 'appSettings', record.app_settings)
  setAlias(normalized, 'globalProjectConfig', record.global_project_config)
  setAlias(normalized, 'embeddedConfigs', record.embedded_configs)
  setAlias(normalized, 'configRefs', record.distributed_config_refs)
  setAlias(normalized, 'resolvedDistributedConfigs', record.resolved_distributed_configs)

  const modules: JsonRecord = { ...(asRecord(record.modules) || {}) }
  const dataEntryMapping = normalizeSnakeModule(record.data_entry_mapping, {
    generatedJson: 'generated_json',
    formType: 'form_type',
    formTitle: 'form_title',
  })
  const multiRuleMapping = normalizeSnakeModule(record.multi_rule_mapping, {
    globalRule: 'global_rule',
    generatedJson: 'generated_json',
    fillConfigs: 'fill_configs',
  })
  const equipmentManagement = normalizeSnakeModule(record.equipment_management, {
    customTypes: 'custom_types',
    typeNameOverrides: 'type_name_overrides',
    equipmentConfigs: 'configs',
    generatedJson: 'generated_json',
  })

  if (modules.dataEntryMapping === undefined && dataEntryMapping !== null) modules.dataEntryMapping = dataEntryMapping
  if (modules.multiRuleMapping === undefined && multiRuleMapping !== null) modules.multiRuleMapping = multiRuleMapping
  if (modules.equipmentManagement === undefined && equipmentManagement !== null) modules.equipmentManagement = equipmentManagement
  if (Object.keys(modules).length) normalized.modules = modules

  const canonicalDataEntryMapping = asRecord(modules.dataEntryMapping)
  const canonicalMultiRuleMapping = asRecord(modules.multiRuleMapping)
  const canonicalEquipmentManagement = asRecord(modules.equipmentManagement)
  setAlias(normalized, 'globalMapping', canonicalDataEntryMapping?.config ?? dataEntryMapping)
  setAlias(normalized, 'globalFillRule', canonicalMultiRuleMapping?.globalRule)
  setAlias(normalized, 'fillConfigs', canonicalMultiRuleMapping?.configs ?? canonicalMultiRuleMapping?.fillConfigs)
  setAlias(normalized, 'equipmentTypes', canonicalEquipmentManagement?.types)
  setAlias(normalized, 'customEquipmentTypes', canonicalEquipmentManagement?.customTypes)
  setAlias(normalized, 'equipmentTypeNameOverrides', canonicalEquipmentManagement?.typeNameOverrides)
  setAlias(normalized, 'equipmentConfigs', canonicalEquipmentManagement?.equipmentConfigs ?? canonicalEquipmentManagement?.configs)
  return normalized
}

function normalizeSnakeModule(value: unknown, aliases: Record<string, string>): JsonRecord | null {
  const record = asRecord(parseEmbeddedJSON(value))
  if (!record) return null
  const normalized: JsonRecord = { ...record }
  Object.entries(aliases).forEach(([canonical, source]) => setAlias(normalized, canonical, record[source]))
  return normalized
}

function setAlias(record: JsonRecord, key: string, value: unknown) {
  if (record[key] === undefined && value !== undefined) record[key] = value
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
    ...formConfigMappingCandidates(record),
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
    readNestedValue(record, ['data_entry_mapping', 'config']),
    readNestedValue(record, ['data_entry_mapping', 'generated_json']),
    record.data_entry_mapping,
    record.globalMapping,
    record.dataEntryMapping,
    record,
  ]
  const sources: ConfigWorkFormCandidate[] = []
  candidates.forEach((candidate) => {
    normalizeMappingSourceCandidates(candidate).forEach((source) => {
      if (!hasMappingColumns(source)) return
      const explicitID = firstNonEmptyString(source.configId, source.id)
      const formType = firstNonEmptyString(source.formType, source.form_type)
      const signature = explicitID ? `id:${explicitID}:${formType}` : `body:${stableValueSignature(source)}`
      if (sources.some((item) => item.signature === signature)) return
      sources.push({ signature, source })
    })
  })
  return sources.map((item) => item.source)
}

function formConfigMappingCandidates(record: JsonRecord): unknown[] {
  const formConfigs = asRecord(record.formConfigs) || asRecord(record.form_configs)
  if (!formConfigs) return []
  return Object.entries(formConfigs).flatMap(([formType, raw]) => {
    const form = asRecord(parseEmbeddedJSON(raw))
    if (!form) return []
    const mapping = form.dataEntryMapping ?? form.data_entry_mapping
    const parsed = parseEmbeddedJSON(mapping)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => withFormType(item, formType)).filter((item): item is JsonRecord => !!item)
    }
    const direct = withFormType(parsed, formType)
    const wrapper = asRecord(parsed)
    const config = withFormType(wrapper?.config, formType)
    const generated = asArray(parseEmbeddedJSON(wrapper?.generatedJson ?? wrapper?.generated_json))
      .map((item) => withFormType(item, formType))
      .filter((item): item is JsonRecord => !!item)
    return [config, direct, ...generated].filter((item): item is JsonRecord => !!item)
  })
}

function withFormType(value: unknown, formType: string) {
  const record = asRecord(parseEmbeddedJSON(value))
  if (!record) return null
  return firstNonEmptyString(record.formType, record.form_type) ? record : { ...record, formType }
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
  add('schemaVersion', '配置 Schema', record.schema_version)
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
  add('configRefs', '网络配置引用', arraySummary(record.configRefs))
  add('resolvedDistributedConfigs', '已解析网络配置', arraySummary(record.resolvedDistributedConfigs))
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
    { key: 'version', label: '快照版本', value: displayValue(record.version ?? record.schema_version) },
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
      const source = asRecord(item)
      const config = source ? normalizeSnakeModule(source, {
        conditionColumns: 'condition_columns',
        equalsColumn: 'equals_column',
        generateColumns: 'generate_columns',
        columnWidths: 'column_widths',
      }) : null
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
    ...collectEmbeddedConfigPayloads(record, new Set(['smart_fill_config', 'smart_fill_config_override'])),
  ])
  const generatedConfigs = uniqueConfigRecords(asArray(parseEmbeddedJSON(multiRuleMapping.generatedJson)))
  const includeGenerated = userConfigs.length === 0 || store?.builtinsSeeded !== true
  return includeGenerated ? uniqueConfigRecords([...userConfigs, ...generatedConfigs]) : userConfigs
}

function uniqueConfigRecords(values: unknown[]) {
  const seen = new Set<string>()
  const rows: JsonRecord[] = []
  values.forEach((value) => {
    const record = asRecord(parseEmbeddedJSON(value))
    if (!record) return
    const identity = firstNonEmptyString(record.id, record.key, record.configKey, record.config_key)
    const signature = identity ? `id:${identity}` : `body:${stableValueSignature(record)}`
    if (seen.has(signature)) return
    seen.add(signature)
    rows.push(record)
  })
  return rows
}

function collectEmbeddedConfigPayloads(record: JsonRecord, kinds: Set<string>) {
  const entries = [
    ...asArray(parseEmbeddedJSON(record.embeddedConfigs)),
    ...asArray(parseEmbeddedJSON(record.embedded_configs)),
  ]
  return entries.flatMap((item) => {
    const entry = asRecord(parseEmbeddedJSON(item))
    if (!entry) return []
    const kind = firstNonEmptyString(entry.kind, entry.object_type).toLowerCase()
    if (!kinds.has(kind)) return []
    const payload = asRecord(parseEmbeddedJSON(entry.payload))
    return payload ? [payload] : []
  })
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
      source: equipmentSourceLabel(type, '内置'),
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
        source: equipmentSourceLabel(type, '自定义'),
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
            source: equipmentSourceLabel(type, '自定义'),
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

  collectEmbeddedConfigPayloads(record, new Set(['equipment_config', 'equipment_config_override'])).forEach((payload) => {
    const type = asRecord(payload.type)
    if (!type) return
    add({
      key: firstNonEmptyString(type.key, type.typeKey, type.id, payload.key),
      name: firstNonEmptyString(type.name, type.label, type.title, payload.name),
      source: '网络下发',
      description: firstNonEmptyString(type.description, type.remark, payload.description),
    })
  })
  return rows
}

function equipmentSourceLabel(type: JsonRecord, fallback: string) {
  const source = firstNonEmptyString(type.source, type.sourceType, type.source_type).toLowerCase()
  if (type.builtin === true) return '内置'
  if (source === 'network') return '网络下发'
  if (source === 'self_upload') return '本地副本'
  if (source === 'local') return type.builtin === true ? '内置' : fallback
  return fallback
}

function extractEquipmentConfigs(record: JsonRecord, types: ConfigEquipmentTypeItem[]): ConfigEquipmentConfigItem[] {
  const typeNames = new Map(types.map((item) => [item.key, item.name || item.key]))
  const configs = collectEquipmentConfigSources(record)
  return configs
    .sort((left, right) => left.typeKey.localeCompare(right.typeKey))
    .map(({ typeKey, typeName: sourceTypeName, description, config }) => {
      const typeName = typeNames.get(typeKey) || sourceTypeName || typeKey
      const columns = extractEquipmentColumns(config)
      const tableColumns = columns.length ? columns : deriveEquipmentColumnsFromRows(asArray(config.rows))
      const rows = normalizeRows(asArray(config.rows), tableColumns)
      return {
        id: typeKey,
        name: typeName,
        description,
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

interface EquipmentConfigSource {
  typeKey: string
  typeName: string
  description: string
  config: JsonRecord
}

function collectEquipmentConfigSources(record: JsonRecord): EquipmentConfigSource[] {
  const rows = new Map<string, EquipmentConfigSource>()
  const add = (fallbackKey: string, raw: unknown) => {
    const entry = asRecord(parseEmbeddedJSON(raw))
    if (!entry) return
    const type = asRecord(entry.type)
    const config = asRecord(parseEmbeddedJSON(entry.config)) || entry
    const typeKey = firstNonEmptyString(fallbackKey, type?.key, type?.typeKey, entry.typeKey, entry.key, entry.id)
    if (!typeKey || rows.has(typeKey)) return
    rows.set(typeKey, {
      typeKey,
      typeName: firstNonEmptyString(type?.name, type?.label, entry.typeName, entry.name),
      description: firstNonEmptyString(type?.description, entry.description, entry.remark),
      config,
    })
  }

  const configs = parseEmbeddedJSON(record.equipmentConfigs)
  if (Array.isArray(configs)) configs.forEach((item) => add('', item))
  else Object.entries(asRecord(configs) || {}).forEach(([key, value]) => add(key, value))

  collectEmbeddedConfigPayloads(record, new Set(['equipment_config', 'equipment_config_override']))
    .forEach((payload) => add('', payload))
  return [...rows.values()]
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

function stableValueSignature(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableValueSignature(item)).join(',')}]`
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValueSignature(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? String(value)
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
