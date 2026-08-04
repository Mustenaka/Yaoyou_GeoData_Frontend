import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

const mapping = (id, label = '试样编号') => ({
  configId: id,
  formType: 'excavation-record',
  formTitle: '开土记录',
  columnsList: [{
    key: 'sampleNo',
    label,
    rules: [{ id: `${id}:sequence`, type: 'sequence', active: true }],
  }],
})

const fill = (id, name) => ({
  id,
  name,
  conditionColumns: ['土类'],
  equalsColumn: '等于',
  generateColumns: ['状态'],
  rows: [{ 土类: '黏土', 等于: '', 状态: '湿' }],
})

const equipmentType = (key, name, extra = {}) => ({ key, name, ...extra })
const equipmentConfig = (code) => ({
  columns: [{ key: 'code', label: '编号' }, { key: 'name', label: '名称' }],
  rows: [{ code, name: '电子天平' }],
})

const fieldRecordForms = [
  ['field-reserve-1', '预留1'],
  ['field-reserve-2', '预留2'],
  ['field-reserve-3', '预留3'],
]

const specialTestForms = [
  ['permeability-variable', '渗透（变水头）'],
  ['permeability-consolidation', '渗透（固结换算）'],
  ['ucs', '无侧限抗压强度'],
  ['at-rest-pressure', '静止侧压力系数'],
  ['ignition-loss', '烧矢量'],
  ['water-soil-simple-analysis', '水土简分析'],
  ['angle-of-repose', '休止角'],
  ['uu', 'UU'],
  ['cu', 'CU'],
  ['cd', 'CD'],
  ['special-backup-1', '备用1'],
  ['special-backup-2', '备用2'],
]

const normalizedSpecialTestTitles = [
  '渗透（变水头）',
  '渗透（固结换算）',
  '无侧限抗压强度',
  '静止侧压力系数',
  '烧矢量',
  '水土简分析',
  '休止角',
  '三轴UU/CU/CD',
  '备用1',
  '备用2',
  '备用3',
  '备用4',
]

const normalizedFormTitleOverrides = {
  uu: '三轴UU/CU/CD',
  cu: '备用1',
  cd: '备用2',
  'special-backup-1': '备用3',
  'special-backup-2': '备用4',
}

const projectWorkForms = [
  ...fieldRecordForms,
  ['excavation-record', '开土记录'],
  ...specialTestForms,
]

const formConfig = (formType, formTitle, scope) => ({
  form_title: formTitle,
  data_entry_mapping: {
    ...mapping(`mapping-${formType}-${scope}`, '孔号样号'),
    formType,
    formTitle,
  },
})

const v2Mapping = mapping('mapping-v2')
const v2Fill = fill('fill-v2', 'V2 智能填充')
const fixtures = {
  v2: {
    version: '2',
    appSettings: { bluetoothReconnect: true },
    globalMapping: v2Mapping,
    fillConfigs: [v2Fill],
    equipmentTypes: [equipmentType('balance-v2', 'V2 天平', { builtin: true })],
    equipmentConfigs: { 'balance-v2': equipmentConfig('V2-1') },
    personnelRoster: [{ id: 'v2-person', name: '王五' }],
    modules: {
      dataEntryMapping: { config: v2Mapping },
      multiRuleMapping: { configs: [v2Fill] },
      equipmentManagement: { configs: { 'balance-v2': equipmentConfig('V2-1') } },
      personnelRoster: { rows: [{ id: 'v2-person', name: '王五' }] },
    },
  },
  schema3Default: {
    schema_version: 3,
    app_settings: { bluetoothReconnect: true },
    global_project_config: {
      jumpEnabled: true,
      formulaDecimalLimitEnabled: true,
      formulaDecimalLimitPlaces: 8,
    },
    data_entry_mapping: mapping('mapping-default'),
    form_configs: {
      ...Object.fromEntries(fieldRecordForms.map(([formType, formTitle]) => [
        formType,
        formConfig(formType, formTitle, 'global'),
      ])),
      'excavation-record': {
        form_title: '开土记录',
        data_entry_mapping: mapping('mapping-default'),
      },
      ...Object.fromEntries(specialTestForms.map(([formType, formTitle]) => [
        formType,
        formConfig(formType, formTitle, 'global'),
      ])),
      custom: {
        form_title: '自定义模块',
        data_entry_mapping: {
          ...mapping('mapping-custom-global', '自定义字段'),
          formType: 'custom',
          formTitle: '自定义模块',
        },
      },
    },
    multi_rule_mapping: { global_rule: { configFileId: 'builtin:default-fill' }, configs: [] },
    equipment_management: {
      custom_types: [],
      type_name_overrides: {},
      configs: {},
    },
    personnel_roster: {
      version: 1,
      rows: [
        { id: 'person-a', name: '张三' },
        { id: 'person-b', name: '李四' },
      ],
    },
    distributed_config_refs: [],
    module_state: {
      data_entry_mapping: { effective: true, source: 'generated-default', default_applied: true },
      multi_rule_mapping: {
        effective: true,
        source: 'generated-default',
        default_empty_config: true,
        local_body_count: 0,
        distributed_ref_count: 0,
        rule_reference: {
          config_file_id: 'builtin:default-fill',
          body_included: false,
          distributed_refs_present: false,
        },
      },
      equipment_management: {
        effective: true,
        source: 'default-empty',
        default_empty_config: true,
        local_body_count: 0,
        distributed_ref_count: 0,
      },
    },
  },
  schema3Modified: {
    schema_version: 3,
    app_settings: { bluetoothReconnect: false },
    global_project_config: { excavationFormPageSize: 80 },
    data_entry_mapping: mapping('mapping-modified', '自定义试样号'),
    multi_rule_mapping: { global_rule: { enabled: true }, configs: [fill('fill-local', '本地修改智能填充')] },
    equipment_management: {
      custom_types: [equipmentType('balance-local', '本地天平')],
      type_name_overrides: { 'balance-local': '自定义天平名称' },
      configs: { 'balance-local': equipmentConfig('LOCAL-1') },
    },
    distributed_config_refs: [],
  },
  resolvedNetwork: {
    schema_version: 3,
    data_entry_mapping: mapping('mapping-network'),
    multi_rule_mapping: { configs: [fill('fill-network', '网络智能填充')] },
    equipment_management: {
      custom_types: [equipmentType('equipment-network', '网络器材', { source: 'network' })],
      type_name_overrides: {},
      configs: { 'equipment-network': equipmentConfig('NETWORK-1') },
    },
    distributed_config_refs: [
      { object_type: 'smart_fill_config', config_key: 'fill-key', revision: 7 },
      { object_type: 'equipment_config', config_key: 'equipment-key', revision: 9 },
    ],
    resolved_distributed_configs: [
      { object_type: 'smart_fill_config', config_key: 'fill-key', revision: 7 },
      { object_type: 'equipment_config', config_key: 'equipment-key', revision: 9 },
    ],
    embeddedConfigs: [
      { kind: 'smart_fill_config', payload: fill('fill-network', '网络智能填充') },
      {
        kind: 'equipment_config',
        payload: {
          type: equipmentType('equipment-network', '网络器材'),
          config: equipmentConfig('NETWORK-1'),
        },
      },
    ],
  },
  projectModuleState: {
    packageVersion: 3,
    formConfigs: {
      ...Object.fromEntries(fieldRecordForms.map(([formType, formTitle]) => [
        formType,
        {
          dataEntryMapping: {
            config: formConfig(formType, formTitle, 'project').data_entry_mapping,
          },
        },
      ])),
      'excavation-record': {
        dataEntryMapping: { source: 'generated-default', config: mapping('mapping-project-default') },
        multiRuleMapping: { rule: { configFileId: 'builtin:project-default-fill' } },
        moduleState: {
          dataEntryMapping: { effective: true, source: 'generated-default', defaultApplied: true },
          multiRuleMapping: {
            effective: true,
            source: 'generated-default',
            defaultEmptyConfig: true,
            bodyCount: 0,
            ruleReference: { configFileId: 'builtin:project-default-fill', bodyIncluded: false },
          },
          equipmentManagement: {
            effective: true,
            source: 'default-empty',
            defaultEmptyConfig: true,
            bodyCount: 0,
          },
        },
      },
      ...Object.fromEntries(specialTestForms.map(([formType, formTitle]) => [
        formType,
        {
          dataEntryMapping: {
            config: formConfig(formType, formTitle, 'project').data_entry_mapping,
          },
        },
      ])),
    },
  },
  schema3NullModules: {
    schema_version: 3,
    data_entry_mapping: null,
    multi_rule_mapping: null,
    equipment_management: null,
  },
  schema3MalformedModules: {
    schema_version: 3,
    data_entry_mapping: '{broken',
    multi_rule_mapping: '{broken',
    equipment_management: '{broken',
  },
}

const server = await createServer({
  root: process.cwd(),
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
})

try {
  const { parseFormSnapshot, parseStructuredConfig } = await server.ssrLoadModule('/src/utils/archive-config.ts')
  const { buildFormHierarchy, sortFormHierarchyItems } = await server.ssrLoadModule('/src/utils/form-taxonomy.ts')
  const parse = (fixture) => parseStructuredConfig(JSON.stringify(fixture))

  const v2 = parse(fixtures.v2)
  assert.equal(v2.error, '')
  assert.equal(v2.workForms.length, 1, 'v2 duplicate mapping aliases must collapse')
  assert.equal(v2.fillConfigs.length, 1, 'v2 duplicate fill aliases must collapse')
  assert.equal(v2.equipmentConfigs.length, 1)
  assert.deepEqual(v2.personnelRoster, [{ id: 'v2-person', name: '王五', sequence: 1 }])
  assert.equal(v2.moduleState.isSchema3, false)

  const defaultConfig = parse(fixtures.schema3Default)
  assert.deepEqual(
    defaultConfig.workForms.map((form) => form.formTitle),
    [...fieldRecordForms.map(([, formTitle]) => formTitle), '开土记录', ...normalizedSpecialTestTitles, '自定义模块'],
  )
  assert.equal(defaultConfig.workForms[3]?.formTitle, '开土记录')
  assert.equal(defaultConfig.workForms[3]?.columns[0]?.label, '试样编号')
  assert.equal(defaultConfig.fillConfigs.length, 0)
  assert.equal(defaultConfig.equipmentConfigs.length, 0)
  assert.deepEqual(defaultConfig.personnelRoster.map((item) => item.name), ['张三', '李四'])
  assert.match(defaultConfig.configItems.find((item) => item.key === 'personnelRoster')?.value || '', /2/)
  assert.equal(defaultConfig.moduleState.isSchema3, true)
  assert.equal(defaultConfig.moduleState.dataEntrySource, 'generated-default')
  assert.equal(defaultConfig.moduleState.dataEntryDefaultApplied, true)
  assert.equal(defaultConfig.moduleState.smartFillPresent, true)
  assert.equal(defaultConfig.moduleState.smartFillSource, 'generated-default')
  assert.equal(defaultConfig.moduleState.smartFillBodyCount, 0)
  assert.equal(defaultConfig.moduleState.smartFillDistributedRefCount, 0)
  assert.equal(defaultConfig.moduleState.smartFillUsesDefaultRule, true)
  assert.equal(defaultConfig.moduleState.smartFillConfigFileId, 'builtin:default-fill')
  assert.equal(defaultConfig.moduleState.equipmentPresent, true)
  assert.equal(defaultConfig.moduleState.equipmentSource, 'default-empty')
  assert.equal(defaultConfig.moduleState.equipmentBodyCount, 0)
  assert.equal(defaultConfig.moduleState.equipmentDistributedRefCount, 0)
  assert.equal(defaultConfig.moduleState.equipmentIsEmpty, true)
  assert.equal(defaultConfig.operationSettings.find((item) => item.key === 'formulaDecimalLimitEnabled')?.value, '开启')
  assert.equal(defaultConfig.operationSettings.find((item) => item.key === 'formulaDecimalLimitPlaces')?.value, '8 位')

  const modified = parse(fixtures.schema3Modified)
  assert.equal(modified.workForms[0]?.columns[0]?.label, '自定义试样号')
  assert.equal(modified.fillConfigs[0]?.name, '本地修改智能填充')
  assert.equal(modified.equipmentTypes.find((item) => item.key === 'balance-local')?.name, '自定义天平名称')
  assert.equal(modified.equipmentConfigs[0]?.rows[0]?.code, 'LOCAL-1')

  const network = parse(fixtures.resolvedNetwork)
  assert.equal(network.fillConfigs.length, 1, 'materialized and embedded smart-fill bodies must not duplicate')
  assert.equal(network.equipmentConfigs.length, 1, 'materialized and embedded equipment bodies must not duplicate')
  assert.equal(network.equipmentTypes[0]?.source, '网络下发')
  assert.equal(network.equipmentConfigs[0]?.rows[0]?.code, 'NETWORK-1')
  assert.match(network.configItems.find((item) => item.key === 'resolvedDistributedConfigs')?.value || '', /2 项/)

  const projectState = parse(fixtures.projectModuleState)
  assert.equal(projectState.workForms.length, 16)
  assert.deepEqual(
    projectState.workForms.map((form) => form.formTitle),
    [...fieldRecordForms.map(([, formTitle]) => formTitle), '开土记录', ...normalizedSpecialTestTitles],
  )
  assert.equal(projectState.workForms[3]?.rules[0]?.id, 'mapping-project-default:sequence')
  assert.equal(projectState.workForms[4]?.rules[0]?.id, 'mapping-permeability-variable-project:sequence')
  assert.equal(projectState.moduleState.isSchema3, true)
  assert.equal(projectState.moduleState.dataEntryDefaultApplied, true)
  assert.equal(projectState.moduleState.smartFillUsesDefaultRule, true)
  assert.equal(projectState.moduleState.smartFillConfigFileId, 'builtin:project-default-fill')
  assert.equal(projectState.moduleState.equipmentIsEmpty, true)

  for (const damagedFixture of [fixtures.schema3NullModules, fixtures.schema3MalformedModules]) {
    const damaged = parse(damagedFixture)
    assert.equal(damaged.moduleState.dataEntryPresent, false)
    assert.equal(damaged.moduleState.smartFillPresent, false)
    assert.equal(damaged.moduleState.smartFillUsesDefaultRule, false)
    assert.equal(damaged.moduleState.equipmentPresent, false)
    assert.equal(damaged.moduleState.equipmentIsEmpty, false)
  }

  projectWorkForms.forEach(([formType, formTitle], index) => {
    const snapshot = parseFormSnapshot(JSON.stringify({
      formType,
      columns: [
        { key: 'seq', label: '序号' },
        { key: 'sampleCode', label: '孔号样号' },
      ],
      rows: [{ seq: 1, sampleCode: `SPECIAL-${index + 1}` }],
    }))
    assert.equal(snapshot.formLabel, normalizedFormTitleOverrides[formType] || formTitle)
    assert.deepEqual(snapshot.tableColumns.map((column) => column.title), ['序号', '孔号样号'])
    assert.equal(snapshot.rows[0]?.sampleCode, `SPECIAL-${index + 1}`)
  })

  const legacySnapshot = parseFormSnapshot(JSON.stringify({
    formType: 'foundation-bed',
    formTitle: '基床系数（固结换算）',
    rows: [],
  }))
  assert.equal(legacySnapshot.formLabel, '水土简分析')

  const hierarchyItems = [
    ...projectWorkForms.map(([formType, label]) => ({ key: formType, formType, label })),
    { key: 'custom', formType: 'custom', label: '自定义模块' },
  ]
  const hierarchy = buildFormHierarchy(hierarchyItems)
  assert.deepEqual(hierarchy.map((section) => section.label), ['野外记录', '勘察记录', '土工试验', '其他配置'])
  assert.deepEqual(hierarchy.map((section) => section.count), [3, 0, 13, 1])
  assert.deepEqual(hierarchy[2].subgroups.map((group) => [group.label, group.items.length]), [
    ['常规试验', 1],
    ['特殊试验', 12],
  ])
  assert.equal(sortFormHierarchyItems(hierarchyItems)[0]?.formType, 'field-reserve-1')

  const devicePage = await readFile(new URL('../pages/device/index.vue', import.meta.url), 'utf8')
  const requestPage = await readFile(new URL('../pages/device/authorization-requests.vue', import.meta.url), 'utf8')
  const globalConfigPage = await readFile(new URL('../pages/global-config/detail.vue', import.meta.url), 'utf8')
  const formHierarchyPicker = await readFile(new URL('../components/FormHierarchyPicker.vue', import.meta.url), 'utf8')
  const formTaxonomySource = await readFile(new URL('./form-taxonomy.ts', import.meta.url), 'utf8')
  const authorizationApi = await readFile(new URL('../api/authorization.ts', import.meta.url), 'utf8')
  const projectArchiveDetailPage = await readFile(new URL('../pages/project-archive/detail.vue', import.meta.url), 'utf8')
  assert.match(devicePage, /deviceBindingApi\.detail\(id\)/)
  assert.match(devicePage, /操作历史/)
  assert.match(devicePage, /sensitiveDetailKey/)
  assert.doesNotMatch(devicePage, /\{\{\s*detailBinding\.device\.fingerprint_payload\s*\}\}/)
  assert.match(requestPage, /device_renewal/)
  assert.match(requestPage, /续期设备授权/)
  assert.match(globalConfigPage, /已保存默认智能填充规则/)
  assert.match(globalConfigPage, /当前无配置表正文/)
  assert.match(globalConfigPage, /已保存默认器材管理配置/)
  assert.match(globalConfigPage, /当前配置表为空/)
  assert.match(globalConfigPage, /selectedWorkFormId/)
  assert.match(globalConfigPage, /人员名单/)
  assert.match(globalConfigPage, /FormHierarchyPicker/)
  assert.match(formHierarchyPicker, /buildFormHierarchy/)
  assert.match(formTaxonomySource, /野外记录/)
  assert.match(formTaxonomySource, /勘察记录/)
  assert.match(formTaxonomySource, /土工试验/)
  assert.match(formTaxonomySource, /常规试验/)
  assert.match(formTaxonomySource, /特殊试验/)
  assert.match(authorizationApi, /request\.get<DeviceBindingDetail, DeviceBindingDetail>/)
  assert.match(projectArchiveDetailPage, /暂无工作表单数据填充快照/)
  assert.match(projectArchiveDetailPage, /seenFormTypes/)
  assert.match(projectArchiveDetailPage, /configFormPickerItems/)
  assert.match(projectArchiveDetailPage, /:data="activeConfigForm\.columns"/)
  assert.match(projectArchiveDetailPage, /:data="activeConfigForm\.rules"/)
  assert.match(projectArchiveDetailPage, /formSnapshotPickerItems/)
  const projectArchivePage = await readFile(new URL('../pages/project-archive/index.vue', import.meta.url), 'utf8')
  assert.match(projectArchivePage, /formTypes\.map\(\(formType\) => formTypeLabel\(formType\)\)/)

  console.log('archive-config and device authorization regression checks passed')
} finally {
  await server.close()
}
