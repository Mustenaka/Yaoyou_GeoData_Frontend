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
    modules: {
      dataEntryMapping: { config: v2Mapping },
      multiRuleMapping: { configs: [v2Fill] },
      equipmentManagement: { configs: { 'balance-v2': equipmentConfig('V2-1') } },
    },
  },
  schema3Default: {
    schema_version: 3,
    app_settings: { bluetoothReconnect: true },
    global_project_config: { excavationFormPageSize: 50 },
    data_entry_mapping: mapping('mapping-default'),
    multi_rule_mapping: { global_rule: { configFileId: 'builtin:default-fill' }, configs: [] },
    equipment_management: {
      custom_types: [],
      type_name_overrides: {},
      configs: {},
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
  const { parseStructuredConfig } = await server.ssrLoadModule('/src/utils/archive-config.ts')
  const parse = (fixture) => parseStructuredConfig(JSON.stringify(fixture))

  const v2 = parse(fixtures.v2)
  assert.equal(v2.error, '')
  assert.equal(v2.workForms.length, 1, 'v2 duplicate mapping aliases must collapse')
  assert.equal(v2.fillConfigs.length, 1, 'v2 duplicate fill aliases must collapse')
  assert.equal(v2.equipmentConfigs.length, 1)
  assert.equal(v2.moduleState.isSchema3, false)

  const defaultConfig = parse(fixtures.schema3Default)
  assert.equal(defaultConfig.workForms[0]?.formTitle, '开土记录')
  assert.equal(defaultConfig.workForms[0]?.columns[0]?.label, '试样编号')
  assert.equal(defaultConfig.fillConfigs.length, 0)
  assert.equal(defaultConfig.equipmentConfigs.length, 0)
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

  const devicePage = await readFile(new URL('../pages/device/index.vue', import.meta.url), 'utf8')
  const requestPage = await readFile(new URL('../pages/device/authorization-requests.vue', import.meta.url), 'utf8')
  const globalConfigPage = await readFile(new URL('../pages/global-config/detail.vue', import.meta.url), 'utf8')
  const authorizationApi = await readFile(new URL('../api/authorization.ts', import.meta.url), 'utf8')
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
  assert.match(authorizationApi, /request\.get<DeviceBindingDetail, DeviceBindingDetail>/)

  console.log('archive-config and device authorization regression checks passed')
} finally {
  await server.close()
}
