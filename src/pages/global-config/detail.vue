<template>
  <div class="page-shell">
    <PageHeader :title="detailTitle" subtitle="查看该设备最新或历史全局配置的完整结构化内容">
      <n-space>
        <n-button @click="router.push({ name: 'mobile-global-config' })">返回列表</n-button>
        <n-button v-if="detail" :loading="rawDownloading" @click="downloadRaw">下载原始 JSON</n-button>
        <n-popconfirm v-if="detail && !detail.is_latest" @positive-click="markLatest">
          <template #trigger>
            <n-button ghost type="primary" :loading="markingLatest">标记最新</n-button>
          </template>
          确认将该全局配置快照标记为最新？
        </n-popconfirm>
        <n-button :loading="loading" @click="loadAll">刷新</n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <n-spin :show="loading">
      <div class="page-card detail-summary">
        <div class="detail-summary__main">
          <n-descriptions label-placement="left" bordered :column="2" size="small">
            <n-descriptions-item label="企业">{{ companyDisplay }}</n-descriptions-item>
            <n-descriptions-item label="设备">{{ deviceDisplay }}</n-descriptions-item>
            <n-descriptions-item label="设备指纹">
              <span class="mono">{{ fingerprintDisplay }}</span>
            </n-descriptions-item>
            <n-descriptions-item label="版本">
              <span v-if="detail">{{ detail.config_version || '-' }}</span>
              <span v-else>-</span>
            </n-descriptions-item>
            <n-descriptions-item label="配置类型">{{ detail ? configTypeLabel(detail.config_type) : '-' }}</n-descriptions-item>
            <n-descriptions-item label="创建时间">{{ detail ? formatDateTime(detail.created_at) : '-' }}</n-descriptions-item>
            <n-descriptions-item label="来源文件" :span="2">
              <span class="mono">{{ detail?.source_file_id || '-' }}</span>
            </n-descriptions-item>
          </n-descriptions>
        </div>
        <div class="version-picker">
          <div class="version-picker__label">历史版本</div>
          <n-select
            v-model:value="selectedVersionId"
            :options="versionOptions"
            :loading="versionsLoading"
            placeholder="选择版本"
            @update:value="handleVersionChange"
          />
        </div>
      </div>

      <n-empty v-if="!detail" description="该设备暂无全局配置" class="page-card empty-card" />

      <div v-else-if="structuredConfig" class="page-card">
        <n-alert v-if="structuredConfig.error" type="warning" class="block-alert">
          {{ structuredConfig.error }}
        </n-alert>

        <n-tabs v-model:value="activeTab" type="line" animated>
          <n-tab-pane name="basic" tab="基本信息">
            <n-data-table
              :columns="keyValueColumns"
              :data="basicRows"
              :pagination="false"
              :row-key="(row: ConfigKeyValueItem) => row.key"
              :scroll-x="720"
            />
          </n-tab-pane>

          <n-tab-pane name="mapping" tab="工作表单">
            <template v-if="activeWorkForm">
              <div class="work-form-picker">
                <span class="work-form-picker__label">选择工作表单</span>
                <n-select
                  v-model:value="selectedWorkFormId"
                  :options="workFormOptions"
                  placeholder="选择工作表单"
                />
              </div>
              <div class="config-table-block">
                <div class="section-title">{{ activeWorkForm.formTitle }}</div>
                <div class="section-meta">
                  {{ activeWorkForm.formType }} · {{ activeWorkForm.columns.length }} 列 / {{ activeWorkForm.rules.length }} 条规则
                </div>
                <n-data-table
                  :columns="activeWorkForm.tableColumns"
                  :data="activeWorkForm.rows"
                  :pagination="false"
                  :row-key="(row: SnapshotTableRow) => row.__rowKey"
                  :scroll-x="activeWorkForm.scrollX"
                  :max-height="420"
                />
              </div>
            </template>
            <n-empty v-else description="配置中未找到工作表单配置" />

            <div class="section-title">映射规则明细</div>
            <n-data-table
              :columns="mappingRuleColumns"
              :data="activeWorkForm?.rules || []"
              :pagination="{ pageSize: 20 }"
              :row-key="(row: ConfigMappingRule) => `${row.columnKey}:${row.id}`"
              :scroll-x="1180"
            >
              <template #empty>
                <n-empty description="配置中未找到映射规则" />
              </template>
            </n-data-table>
          </n-tab-pane>

          <n-tab-pane name="fill" tab="智能填充">
            <div class="tab-actions">
              <n-button type="primary" :loading="fillDownloading" @click="downloadConfigTable('fill')">导出智能填充</n-button>
            </div>
            <template v-if="structuredConfig.fillConfigs.length">
              <div v-for="config in structuredConfig.fillConfigs" :key="config.id" class="config-table-block">
                <div class="section-title">{{ config.name }}</div>
                <div class="section-meta">
                  {{ config.conditionColumnCount }} 个条件列 / {{ config.generateColumnCount }} 个生成列 / {{ config.rows.length }} 行
                  <span v-if="config.description"> · {{ config.description }}</span>
                </div>
                <n-data-table
                  :columns="config.tableColumns"
                  :data="config.rows"
                  :pagination="{ pageSize: 20 }"
                  :row-key="(row: Record<string, unknown>) => String(row.__rowKey)"
                  :scroll-x="config.scrollX"
                />
              </div>
            </template>
            <n-alert
              v-else-if="structuredConfig.moduleState.isSchema3 && structuredConfig.moduleState.smartFillUsesDefaultRule"
              type="info"
              :bordered="false"
              class="module-empty-state"
            >
              <div class="module-empty-state__content">
                <strong>已保存默认智能填充规则</strong>
                <span>当前无配置表正文</span>
                <span v-if="structuredConfig.moduleState.smartFillConfigFileId" class="mono">
                  配置文件：{{ structuredConfig.moduleState.smartFillConfigFileId }}
                </span>
              </div>
            </n-alert>
            <n-empty v-else description="暂无智能填充配置" />
          </n-tab-pane>

          <n-tab-pane name="equipment" tab="器材管理">
            <div class="tab-actions">
              <n-button type="primary" :loading="equipmentDownloading" @click="downloadConfigTable('equipment')">导出器材管理</n-button>
            </div>
            <template v-if="structuredConfig.equipmentConfigs.length">
              <div v-for="config in structuredConfig.equipmentConfigs" :key="config.typeKey" class="config-table-block">
                <div class="section-title">{{ config.typeName }}</div>
                <div class="section-meta">
                  {{ config.columns.length }} 列 / {{ config.rows.length }} 行
                  <span class="mono"> · {{ config.typeKey }}</span>
                </div>
                <n-data-table
                  :columns="config.tableColumns"
                  :data="config.rows"
                  :pagination="{ pageSize: 20 }"
                  :row-key="(row: Record<string, unknown>) => String(row.__rowKey)"
                  :scroll-x="config.scrollX"
                />
              </div>
            </template>
            <n-alert
              v-else-if="structuredConfig.moduleState.isSchema3 && structuredConfig.moduleState.equipmentIsEmpty"
              type="info"
              :bordered="false"
              class="module-empty-state"
            >
              <div class="module-empty-state__content">
                <strong>已保存默认器材管理配置</strong>
                <span>当前配置表为空</span>
              </div>
            </n-alert>
            <n-empty v-else description="暂无器材配置" />
          </n-tab-pane>

          <n-tab-pane name="operation" tab="操作设置">
            <n-data-table
              :columns="operationColumns"
              :data="structuredConfig.operationSettings"
              :pagination="{ pageSize: 30 }"
              :row-key="(row: ConfigSectionItem) => `${row.source}:${row.key}`"
              :scroll-x="860"
            >
              <template #empty>
                <n-empty description="暂无操作设置" />
              </template>
            </n-data-table>
          </n-tab-pane>
        </n-tabs>

        <n-collapse class="raw-collapse">
          <n-collapse-item title="原始 JSON" name="raw-json">
            <pre class="json-preview">{{ structuredConfig.rawText }}</pre>
          </n-collapse-item>
        </n-collapse>
      </div>
    </n-spin>

    <n-modal
      v-model:show="ruleDetailVisible"
      preset="card"
      :title="ruleDetailTitle"
      style="width: min(920px, calc(100vw - 32px))"
      :bordered="false"
    >
      <div v-if="selectedRule" class="rule-detail-modal-content">
        <n-descriptions label-placement="left" bordered :column="2" size="small">
          <n-descriptions-item label="字段">{{ selectedRule.columnLabel }}</n-descriptions-item>
          <n-descriptions-item label="字段 key">
            <span class="mono">{{ selectedRule.columnKey }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="规则类型">{{ selectedRule.typeLabel }}</n-descriptions-item>
          <n-descriptions-item label="规则 ID">
            <span class="mono">{{ selectedRule.id }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="启用">{{ selectedRule.active ? '是' : '否' }}</n-descriptions-item>
          <n-descriptions-item label="说明">{{ selectedRule.summary || '-' }}</n-descriptions-item>
        </n-descriptions>

        <div class="section-title">规则内容</div>
        <div v-if="selectedRuleDetailSegments.length" class="rule-detail-full">
          <div v-for="(segment, index) in selectedRuleDetailSegments" :key="`${index}-${segment}`" class="rule-detail-segment">
            <span class="rule-detail-segment__index">{{ index + 1 }}</span>
            <span>{{ segment }}</span>
          </div>
        </div>
        <n-empty v-else description="暂无规则内容" />
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { NButton, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import type { ConfigSnapshotItem } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { configTypeLabel } from '@/utils/labels'
import { pageList } from '@/utils/query'
import {
  parseStructuredConfig,
  type ConfigKeyValueItem,
  type ConfigMappingRule,
  type ConfigSectionItem,
  type SnapshotTableRow,
  type StructuredConfig,
} from '@/utils/archive-config'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const versionsLoading = ref(false)
const fillDownloading = ref(false)
const equipmentDownloading = ref(false)
const rawDownloading = ref(false)
const markingLatest = ref(false)
const errorText = ref('')
const activeTab = ref('basic')
const selectedWorkFormId = ref<string | null>(null)
const detail = ref<ConfigSnapshotItem | null>(null)
const versions = ref<ConfigSnapshotItem[]>([])
const selectedVersionId = ref<number | null>(null)
const ruleDetailVisible = ref(false)
const selectedRule = ref<ConfigMappingRule | null>(null)

const configId = computed(() => Number(route.params.id || 0))
const deviceId = computed(() => Number(route.query.device_id || 0))
const structuredConfig = computed<StructuredConfig | null>(() => (detail.value ? parseStructuredConfig(detail.value.snapshot_json) : null))
const workFormOptions = computed<SelectOption[]>(() =>
  (structuredConfig.value?.workForms || []).map((form) => ({
    label: `${form.formTitle}（${form.formType}）`,
    value: form.id,
  })),
)
const activeWorkForm = computed(() => {
  const forms = structuredConfig.value?.workForms || []
  return forms.find((form) => form.id === selectedWorkFormId.value) || forms[0] || null
})
const detailTitle = computed(() => (detail.value ? `全局配置详情 · 版本 ${detail.value.config_version || '-'}` : '全局配置详情'))
const companyDisplay = computed(() => {
  const name = stringQuery('company_name')
  const id = stringQuery('company_id')
  if (name) return id && id !== 'null' ? `${name} #${id}` : name
  if (detail.value?.company_id) return `企业 #${detail.value.company_id}`
  return id === 'null' ? '未归属' : '-'
})
const deviceDisplay = computed(() => stringQuery('device_name') || (deviceId.value > 0 ? `设备 #${deviceId.value}` : '-'))
const fingerprintDisplay = computed(() => stringQuery('fingerprint') || '-')
const versionOptions = computed<SelectOption[]>(() =>
  versions.value.map((item) => ({
    label: `版本 ${item.config_version || '-'} · ${formatDateTime(item.created_at)} · #${item.id}`,
    value: item.id,
  })),
)
const basicRows = computed<ConfigKeyValueItem[]>(() => {
  const item = detail.value
  const parsed = structuredConfig.value
  if (!item) return []
  return [
    ...(parsed?.basicInfoItems || []),
    { key: 'config_version', label: '配置版本', value: item.config_version || '-' },
    { key: 'company', label: '企业', value: companyDisplay.value },
    { key: 'device', label: '设备', value: deviceDisplay.value },
    { key: 'source_file_id', label: '来源文件', value: item.source_file_id || '-' },
    { key: 'created_at', label: '创建时间', value: formatDateTime(item.created_at) },
  ]
})
const ruleDetailTitle = computed(() => {
  const rule = selectedRule.value
  return rule ? `${rule.columnLabel} · ${rule.typeLabel}` : '规则详情'
})
const selectedRuleDetailSegments = computed(() => splitRuleDetail(selectedRule.value?.detail))

const keyValueColumns: DataTableColumns<ConfigKeyValueItem> = [
  { title: '键', key: 'key', width: 220, render: (row) => h('span', { class: 'mono' }, row.key) },
  { title: '中文标签', key: 'label', width: 220 },
  { title: '值', key: 'value', minWidth: 280, render: (row) => h('div', { class: 'cell-wrap' }, row.value || '-') },
]

const operationColumns: DataTableColumns<ConfigSectionItem> = [
  { title: '来源', key: 'source', width: 240, render: (row) => h('span', { class: 'mono' }, row.source) },
  { title: '键', key: 'key', width: 220, render: (row) => h('span', { class: 'mono' }, row.key) },
  { title: '中文标签', key: 'label', width: 220 },
  { title: '值', key: 'value', minWidth: 260, render: (row) => h('div', { class: 'cell-wrap' }, row.value || '-') },
]

const mappingRuleColumns: DataTableColumns<ConfigMappingRule> = [
  { title: '字段', key: 'columnLabel', width: 180, render: (row) => `${row.columnLabel} (${row.columnKey})` },
  { title: '规则类型', key: 'typeLabel', width: 170 },
  {
    title: '启用',
    key: 'active',
    width: 80,
    render: (row) => h(NTag, { type: row.active ? 'success' : 'default', round: true }, { default: () => (row.active ? '是' : '否') }),
  },
  { title: '说明', key: 'summary', minWidth: 240, render: (row) => h('div', { class: 'cell-wrap' }, row.summary || '-') },
  { title: '关键参数', key: 'detail', minWidth: 520, render: (row) => h('div', { class: 'cell-wrap' }, row.detail || '-') },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) => h(NButton, { text: true, type: 'primary', size: 'small', onClick: () => openRuleDetail(row) }, { default: () => '查看详情' }),
  },
]

async function loadVersions() {
  if (!Number.isFinite(deviceId.value) || deviceId.value <= 0) return
  versionsLoading.value = true
  try {
    const result = await archiveApi.listDeviceGlobalConfigs(deviceId.value, { page: 1, page_size: 100 })
    versions.value = pageList(result.list)
  } finally {
    versionsLoading.value = false
  }
}

async function fetchDetail(id: number) {
  if (!Number.isFinite(id) || id <= 0) {
    detail.value = null
    selectedVersionId.value = null
    return
  }
  detail.value = await archiveApi.configDetail(id)
  selectedVersionId.value = detail.value.id
}

async function loadAll() {
  loading.value = true
  errorText.value = ''
  try {
    await loadVersions()
    const targetId = configId.value > 0 ? configId.value : versions.value[0]?.id || 0
    if (targetId > 0 && targetId !== configId.value) {
      await router.replace({ name: 'global-config-detail', params: { id: targetId }, query: route.query })
    }
    await fetchDetail(targetId)
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '全局配置详情加载失败'
  } finally {
    loading.value = false
  }
}

async function handleVersionChange(value: number | null) {
  if (!value || value === configId.value) return
  await router.push({ name: 'global-config-detail', params: { id: value }, query: route.query })
}

async function downloadConfigTable(kind: 'fill' | 'equipment') {
  if (!detail.value) return
  if (kind === 'fill') fillDownloading.value = true
  if (kind === 'equipment') equipmentDownloading.value = true
  try {
    const blob = await archiveApi.downloadConfigTable(detail.value.id, kind)
    await ensureDownloadBlob(blob)
    const prefix = kind === 'fill' ? '智能填充' : '器材管理'
    saveBlob(blob, `${prefix}-${detail.value.config_version || detail.value.id}.xlsx`)
    message.success(`${prefix} xlsx 下载已开始`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导出 xlsx 失败')
  } finally {
    if (kind === 'fill') fillDownloading.value = false
    if (kind === 'equipment') equipmentDownloading.value = false
  }
}

async function downloadRaw() {
  if (!detail.value) return
  rawDownloading.value = true
  try {
    const blob = await archiveApi.downloadConfig(detail.value.id)
    await ensureDownloadBlob(blob)
    saveBlob(blob, `global-config-${detail.value.id}-${detail.value.config_version || 'snapshot'}.json`)
    message.success('原始 JSON 下载已开始')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下载原始 JSON 失败')
  } finally {
    rawDownloading.value = false
  }
}

async function markLatest() {
  if (!detail.value) return
  markingLatest.value = true
  try {
    detail.value = await archiveApi.markConfigLatest(detail.value.id)
    await loadVersions()
    message.success('已标记为最新')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '标记最新失败')
  } finally {
    markingLatest.value = false
  }
}

function openRuleDetail(rule: ConfigMappingRule) {
  selectedRule.value = rule
  ruleDetailVisible.value = true
}

function splitRuleDetail(detail?: string) {
  const text = (detail || '').trim()
  if (!text || text === '-') return []
  return text
    .split(/；|\n(?=\S)/)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function ensureDownloadBlob(blob: Blob) {
  if (!blob || blob.size === 0) throw new Error('下载文件为空')
  if (blob.type.includes('application/json')) {
    const text = await blob.text()
    try {
      const payload = JSON.parse(text) as { message?: string; msg?: string }
      throw new Error(payload.message || payload.msg || '下载失败')
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(text || '下载失败')
      throw error
    }
  }
}

function stringQuery(key: string) {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

watch(
  () => (structuredConfig.value?.workForms || []).map((form) => form.id).join('|'),
  () => {
    const forms = structuredConfig.value?.workForms || []
    if (!forms.some((form) => form.id === selectedWorkFormId.value)) {
      selectedWorkFormId.value = forms[0]?.id || null
    }
  },
  { immediate: true },
)

watch(
  () => route.params.id,
  async () => {
    if (!loading.value) {
      try {
        await fetchDetail(configId.value)
      } catch (error) {
        errorText.value = error instanceof Error ? error.message : '全局配置详情加载失败'
      }
    }
  },
)

onMounted(loadAll)
</script>

<style scoped>
.detail-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
  gap: 16px;
}

.detail-summary__main {
  min-width: 0;
}

.version-picker {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.version-picker__label {
  color: var(--yy-text-secondary);
  font-size: 13px;
}

.block-alert {
  margin-bottom: 12px;
}

.section-title {
  margin: 18px 0 12px;
  font-size: 14px;
  font-weight: 700;
}

.tab-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
}

.config-table-block {
  margin-top: 16px;
}

.work-form-picker {
  display: grid;
  grid-template-columns: 120px minmax(240px, 420px);
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.work-form-picker__label {
  color: var(--yy-text-secondary);
  font-size: 13px;
}

.config-table-block:first-of-type {
  margin-top: 0;
}

.module-empty-state {
  margin-top: 4px;
}

.module-empty-state__content {
  display: grid;
  gap: 6px;
}

.module-empty-state__content strong {
  color: var(--yy-text);
}

.section-meta {
  margin: -6px 0 10px;
  color: var(--yy-text-secondary);
  font-size: 12px;
}

.cell-wrap {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
}

.raw-collapse {
  margin-top: 16px;
}

.json-preview {
  margin: 0;
  max-height: 520px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}

.empty-card {
  padding: 44px 16px;
}

.rule-detail-full {
  display: grid;
  gap: 8px;
}

.rule-detail-segment {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 8px 10px;
  border: 1px solid var(--yy-border);
  border-radius: 6px;
  background: var(--yy-bg-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.rule-detail-segment__index {
  color: var(--yy-text-secondary);
  font-family: var(--font-mono);
}

:deep(.fill-condition-column) {
  background: var(--yy-column-blue-bg);
}

:deep(.fill-equals-column) {
  background: var(--yy-column-neutral-bg);
  color: var(--yy-text-primary);
  font-weight: 700;
  text-align: center;
}

:deep(.fill-generate-column) {
  background: var(--yy-column-green-bg);
}

@media (max-width: 900px) {
  .detail-summary {
    grid-template-columns: 1fr;
  }

  .work-form-picker {
    grid-template-columns: 1fr;
  }
}
</style>
