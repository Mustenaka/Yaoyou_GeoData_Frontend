<template>
  <div class="page-shell">
    <PageHeader :title="detailTitle" subtitle="项目基本信息、工作表单配置、数据填充结果">
      <n-space>
        <n-button @click="router.push({ name: 'projects' })">返回列表</n-button>
        <n-button type="primary" :loading="packageExporting" @click="downloadProjectPackage">导出项目包</n-button>
        <n-button :loading="loading" @click="loadDetail">刷新</n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <n-spin :show="loading">
      <div v-if="detail" class="page-card">
        <n-tabs v-model:value="activeTab" type="line" animated>
          <n-tab-pane name="base" tab="① 项目基本信息">
            <n-descriptions label-placement="left" bordered :column="2" class="mobile-project-fields">
              <n-descriptions-item v-for="field in projectBaseFields" :key="field.key" :label="field.label">
                <span :class="{ mono: field.mono }">{{ field.value || '-' }}</span>
              </n-descriptions-item>
            </n-descriptions>

            <n-collapse class="debug-collapse">
              <n-collapse-item title="调试信息" name="debug">
                <n-descriptions label-placement="left" bordered :column="2" size="small">
                  <n-descriptions-item v-for="field in projectDebugFields" :key="field.key" :label="field.label" :span="field.span || 1">
                    <span :class="{ mono: field.mono }">{{ field.value || '-' }}</span>
                  </n-descriptions-item>
                </n-descriptions>
              </n-collapse-item>
            </n-collapse>

            <div class="section-title">最新项目配置</div>
            <div v-if="latestConfig" class="summary-panel">
              <div class="summary-panel__main">
                <div>
                  <div class="summary-panel__title">{{ configTypeLabel(latestConfig.config_type) }}</div>
                  <div class="summary-panel__meta">
                    版本 {{ latestConfig.config_version || '-' }} · {{ formatDateTime(latestConfig.created_at) }}
                  </div>
                </div>
                <n-tag :type="latestConfig.is_latest ? 'success' : 'default'" round>
                  {{ latestConfig.is_latest ? '最新' : '最近一条' }}
                </n-tag>
              </div>
              <n-descriptions label-placement="left" :column="2" size="small">
                <n-descriptions-item label="配置范围">{{ latestConfig.config_scope || '-' }}</n-descriptions-item>
                <n-descriptions-item label="来源文件">{{ latestConfig.source_file_id || '-' }}</n-descriptions-item>
              </n-descriptions>
              <n-space>
                <n-button type="primary" ghost @click="openConfigTab">查看结构化</n-button>
                <n-button :loading="configDownloading === latestConfig.id" @click="downloadConfig(latestConfig)">下载</n-button>
              </n-space>
            </div>
            <n-empty v-else description="暂无项目配置快照" />
          </n-tab-pane>

          <n-tab-pane name="config" tab="② 工作表单配置">
            <n-spin :show="configDetailLoading">
              <n-alert v-if="configError" type="error" class="block-alert">
                {{ configError }}
              </n-alert>
              <n-empty v-else-if="!latestConfig" description="暂无项目配置快照" />
              <template v-else-if="structuredConfig">
                <div class="section-toolbar">
                  <div>
                    <div class="section-title section-title--compact">配置快照</div>
                    <div class="section-subtitle">
                      {{ configTypeLabel(latestConfig.config_type) }} · 版本 {{ latestConfig.config_version || '-' }} ·
                      {{ formatDateTime(latestConfig.created_at) }}
                    </div>
                  </div>
                  <n-button :loading="configDownloading === latestConfig.id" @click="downloadConfig(latestConfig)">下载原始 JSON</n-button>
                </div>

                <n-alert v-if="structuredConfig.error" type="warning" class="block-alert">
                  {{ structuredConfig.error }}
                </n-alert>

                <div class="section-title">映射列</div>
                <n-data-table
                  :columns="mappingPreviewColumns"
                  :data="structuredConfig.mappingColumns"
                  :pagination="{ pageSize: 20 }"
                  :row-key="(row: ConfigMappingColumn) => row.key"
                  :scroll-x="720"
                >
                  <template #empty>
                    <n-empty description="配置中未找到工作表单映射列" />
                  </template>
                </n-data-table>

                <div class="section-title">规则明细</div>
                <n-data-table
                  :columns="mappingRuleColumns"
                  :data="structuredConfig.mappingRules"
                  :pagination="{ pageSize: 20 }"
                  :row-key="(row: ConfigMappingRule) => `${row.columnKey}:${row.id}`"
                  :scroll-x="1500"
                >
                  <template #empty>
                    <n-empty description="配置中未找到具体规则" />
                  </template>
                </n-data-table>

                <div class="section-title">关键配置项</div>
                <n-data-table
                  :columns="configItemColumns"
                  :data="structuredConfig.configItems"
                  :pagination="{ pageSize: 20 }"
                  :row-key="(row: ConfigKeyValueItem) => row.key"
                  :scroll-x="720"
                >
                  <template #empty>
                    <n-empty description="暂无可结构化展示的配置项" />
                  </template>
                </n-data-table>

                <n-collapse class="raw-collapse">
                  <n-collapse-item title="原始 JSON" name="raw-config-json">
                    <pre class="json-preview">{{ structuredConfig.rawText }}</pre>
                  </n-collapse-item>
                </n-collapse>
              </template>
            </n-spin>
          </n-tab-pane>

          <n-tab-pane name="forms" tab="③ 数据填充结果">
            <n-spin :show="formSnapshotLoading">
              <n-alert v-if="formSnapshotError" type="warning" class="block-alert">
                {{ formSnapshotError }}
              </n-alert>
              <n-empty v-if="!visibleFormSnapshotViews.length" description="暂无开土记录数据填充快照" />
              <n-tabs v-else v-model:value="activeFormTab" type="card" size="small" animated>
                <n-tab-pane
                  v-for="view in visibleFormSnapshotViews"
                  :key="view.item.id"
                  :name="view.item.form_type || 'unknown'"
                  :tab="view.parsed.formLabel || formTypeLabel(view.item.form_type)"
                >
                  <div class="form-snapshot">
                    <div class="section-toolbar">
                      <div>
                        <div class="section-title section-title--compact">{{ view.parsed.formLabel || formTypeLabel(view.item.form_type) }}</div>
                        <div class="section-subtitle">
                          {{ view.parsed.formLabel || formTypeLabel(view.item.form_type) }} -&gt; {{ view.item.form_type || '-' }} ·
                          {{ formatDateTime(view.item.created_at) }}
                        </div>
                      </div>
                      <n-space>
                        <n-button :loading="isTableExporting(view.item.form_type, 'data')" @click="downloadProjectTable(view.item.form_type, 'data')">
                          下载 xlsx
                        </n-button>
                        <n-button :loading="isTableExporting(view.item.form_type, 'sample')" @click="downloadProjectTable(view.item.form_type, 'sample')">
                          下载录入日期/试验员
                        </n-button>
                      </n-space>
                    </div>

                    <n-alert v-if="view.parsed.error" type="warning" class="block-alert">
                      {{ view.parsed.error }}
                    </n-alert>

                    <div class="data-section">
                      <div class="data-section__header">
                        <div>
                          <div class="data-section__title">{{ view.parsed.formLabel || formTypeLabel(view.item.form_type) }}</div>
                          <div class="section-subtitle">数据填充结果 · {{ view.item.row_count }} 行</div>
                        </div>
                      </div>
                      <n-data-table
                        :columns="view.parsed.tableColumns"
                        :data="view.parsed.rows"
                        :pagination="{ pageSize: 50 }"
                        :row-key="(row: SnapshotTableRow) => row.__rowKey"
                        :scroll-x="view.parsed.scrollX"
                        :max-height="520"
                      >
                        <template #empty>
                          <n-empty description="快照中暂无行数据" />
                        </template>
                      </n-data-table>
                    </div>

                    <div class="data-section">
                      <div class="data-section__header">
                        <div>
                          <div class="data-section__title">{{ view.parsed.sampleMetaLabel || '录入日期/试验员' }}</div>
                          <div class="section-subtitle">样品元数据 · {{ view.item.sample_count }} 条</div>
                        </div>
                      </div>
                      <n-data-table
                        v-if="view.parsed.sampleTableColumns.length"
                        :columns="view.parsed.sampleTableColumns"
                        :data="view.parsed.sampleRows"
                        :pagination="{ pageSize: 50 }"
                        :row-key="(row: SnapshotTableRow) => row.__rowKey"
                        :scroll-x="view.parsed.sampleScrollX"
                        :max-height="360"
                      >
                        <template #empty>
                          <n-empty description="快照中暂无录入日期/试验员数据" />
                        </template>
                      </n-data-table>
                      <n-empty v-else description="快照中暂无录入日期/试验员字段" />
                    </div>

                    <n-collapse class="raw-collapse">
                      <n-collapse-item title="原始快照 JSON" :name="`form-json-${view.item.id}`">
                        <pre class="json-preview">{{ view.parsed.rawText }}</pre>
                      </n-collapse-item>
                    </n-collapse>
                  </div>
                </n-tab-pane>
              </n-tabs>
            </n-spin>
          </n-tab-pane>
        </n-tabs>
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
import type { DataTableColumns } from 'naive-ui'
import { NButton, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import type { ConfigSnapshotItem, FormDataSnapshot, ProjectArchiveItem } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { pageList } from '@/utils/query'
import { configTypeLabel, formTypeLabel } from '@/utils/labels'
import {
  emptyParsedFormSnapshot,
  parseFormSnapshot,
  parseStructuredConfig,
  type ConfigKeyValueItem,
  type ConfigMappingColumn,
  type ConfigMappingRule,
  type ParsedFormSnapshot,
  type SnapshotTableRow,
  type StructuredConfig,
} from '@/utils/archive-config'

interface FormSnapshotView {
  item: FormDataSnapshot
  parsed: ParsedFormSnapshot
}

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const configDetailLoading = ref(false)
const formSnapshotLoading = ref(false)
const packageExporting = ref(false)
const configDownloading = ref<number | null>(null)
const tableExporting = ref<Record<string, boolean>>({})
const errorText = ref('')
const configError = ref('')
const formSnapshotError = ref('')
const activeTab = ref('base')
const activeFormTab = ref('excavation-record')
const ruleDetailVisible = ref(false)
const detail = ref<ProjectArchiveItem | null>(null)
const mobileData = ref<FormDataSnapshot[]>([])
const configs = ref<ConfigSnapshotItem[]>([])
const latestConfigDetail = ref<ConfigSnapshotItem | null>(null)
const formSnapshotViews = ref<FormSnapshotView[]>([])
const selectedRule = ref<ConfigMappingRule | null>(null)

const projectId = computed(() => Number(route.params.id))
const detailTitle = computed(() => detail.value?.project_name || detail.value?.project_uuid || '项目详情')
const latestConfig = computed(() => {
  const latest = configs.value.find((item) => item.is_latest)
  if (latest) return latest
  return [...configs.value].sort((a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || ''))[0] || null
})
const structuredConfig = computed<StructuredConfig | null>(() => (latestConfigDetail.value ? parseStructuredConfig(latestConfigDetail.value.snapshot_json) : null))
const ruleDetailTitle = computed(() => {
  const rule = selectedRule.value
  return rule ? `${rule.columnLabel} · ${rule.typeLabel}` : '规则详情'
})
const selectedRuleDetailSegments = computed(() => splitRuleDetail(selectedRule.value?.detail))
const visibleFormSnapshotViews = computed(() => {
  const latestExcavation = formSnapshotViews.value.find((view) => view.item.form_type === 'excavation-record')
  return latestExcavation ? [latestExcavation] : []
})
const projectBaseFields = computed(() => {
  const project = detail.value
  if (!project) return []
  return [
    { key: 'project_name', label: '项目名称', value: project.project_name },
    { key: 'project_code', label: '项目编号', value: project.project_code },
    { key: 'client_name', label: '委托单位', value: project.client_name },
    { key: 'project_lead', label: '项目负责人', value: project.project_lead },
    { key: 'test_lead', label: '试验负责人', value: project.test_lead },
    { key: 'start_date', label: '开工日期', value: project.start_date },
    { key: 'report_date', label: '报告日期', value: project.report_date },
    { key: 'project_uuid', label: 'project_uuid', value: project.project_uuid, mono: true },
  ]
})
const projectDebugFields = computed(() => {
  const project = detail.value
  if (!project) return []
  return [
    { key: 'last_uploaded_at', label: '最近上传', value: formatDateTime(project.last_uploaded_at) },
    { key: 'last_parsed_at', label: '最近解析', value: formatDateTime(project.last_parsed_at) },
    { key: 'parse_message', label: '解析消息', value: project.parse_message, span: 2 },
    { key: 'source_mobile_file_id', label: '项目包文件', value: project.source_mobile_file_id, mono: true },
    { key: 'latest_config_file_id', label: '最新配置文件', value: project.latest_config_file_id, mono: true },
    { key: 'latest_entry_data_file_id', label: '最新录入文件', value: project.latest_entry_data_file_id, mono: true },
    { key: 'latest_win_result_file_id', label: 'Win 结果文件', value: project.latest_win_result_file_id, mono: true },
    { key: 'uuid_fallback', label: 'UUID 回退', value: project.uuid_fallback ? '是' : '否' },
    { key: 'created_at', label: '档案创建', value: formatDateTime(project.created_at) },
    { key: 'updated_at', label: '档案更新', value: formatDateTime(project.updated_at) },
  ]
})

const mappingPreviewColumns: DataTableColumns<ConfigMappingColumn> = [
  { title: '字段 key', key: 'key', width: 180, render: (row) => h('span', { class: 'mono' }, row.key) },
  { title: '显示名', key: 'label', minWidth: 180 },
  { title: '宽度', key: 'width', width: 100 },
  { title: '类型', key: 'kind', width: 120 },
  { title: '规则数', key: 'ruleCount', width: 90 },
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
  { title: '说明', key: 'summary', minWidth: 240, render: (row) => h('div', { class: 'rule-detail-text' }, row.summary || '-') },
  { title: '规则内容', key: 'detail', minWidth: 560, render: (row) => h('div', { class: 'rule-detail-text' }, row.detail || '-') },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) =>
      h(
        NButton,
        { text: true, type: 'primary', size: 'small', onClick: () => openRuleDetail(row) },
        { default: () => '查看详情' },
      ),
  },
]

const configItemColumns: DataTableColumns<ConfigKeyValueItem> = [
  { title: '配置项', key: 'label', width: 220 },
  { title: '键', key: 'key', width: 220, render: (row) => h('span', { class: 'mono' }, row.key) },
  { title: '值', key: 'value', minWidth: 260 },
]

async function loadConfigs() {
  const result = await archiveApi.projectConfigs(projectId.value, { page: 1, page_size: 100 })
  configs.value = pageList(result.list)
}

function openRuleDetail(rule: ConfigMappingRule) {
  selectedRule.value = rule
  ruleDetailVisible.value = true
}

function splitRuleDetail(detail?: string) {
  const text = (detail || '').trim()
  if (!text || text === '-') return []
  return text
    .split('；')
    .map((item) => item.trim())
    .filter(Boolean)
}

async function loadLatestConfigDetail() {
  latestConfigDetail.value = null
  configError.value = ''
  const selected = latestConfig.value
  if (!selected) return

  configDetailLoading.value = true
  try {
    latestConfigDetail.value = await archiveApi.configDetail(selected.id)
  } catch (error) {
    configError.value = error instanceof Error ? error.message : '配置详情加载失败'
  } finally {
    configDetailLoading.value = false
  }
}

async function loadFormSnapshotDetails(items: FormDataSnapshot[]) {
  formSnapshotViews.value = []
  formSnapshotError.value = ''
  if (!items.length) return

  formSnapshotLoading.value = true
  try {
    const results = await Promise.allSettled(items.map((item) => archiveApi.formSnapshotDetail(item.id)))
    const views: FormSnapshotView[] = []
    const errors: string[] = []
    results.forEach((result, index) => {
      const listItem = items[index]
      if (result.status === 'fulfilled') {
        views.push({ item: result.value, parsed: parseFormSnapshot(result.value.snapshot_json) })
      } else {
        const messageText = result.reason instanceof Error ? result.reason.message : '快照详情加载失败'
        errors.push(`${listItem.form_type || listItem.id}: ${messageText}`)
        views.push({
          item: listItem,
          parsed: emptyParsedFormSnapshot(messageText),
        })
      }
    })
    formSnapshotViews.value = views
    activeFormTab.value = views.some((view) => view.item.form_type === 'excavation-record')
      ? 'excavation-record'
      : (views[0]?.item.form_type || 'excavation-record')
    formSnapshotError.value = errors.join('；')
  } finally {
    formSnapshotLoading.value = false
  }
}

async function loadDetail() {
  if (!Number.isFinite(projectId.value) || projectId.value <= 0) {
    router.replace({ name: 'projects' })
    return
  }

  loading.value = true
  errorText.value = ''
  try {
    const project = await archiveApi.projectDetail(projectId.value)
    detail.value = project
    const [mobile] = await Promise.all([
      archiveApi.projectMobileData(projectId.value, { page: 1, page_size: 100 }),
      loadConfigs(),
    ])
    mobileData.value = pageList(mobile.list)
    await Promise.all([loadLatestConfigDetail(), loadFormSnapshotDetails(mobileData.value)])
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '项目详情加载失败'
  } finally {
    loading.value = false
  }
}

function openConfigTab() {
  activeTab.value = 'config'
}

async function downloadConfig(row: ConfigSnapshotItem) {
  configDownloading.value = row.id
  try {
    const blob = await archiveApi.downloadConfig(row.id)
    await ensureArchiveDownloadBlob(blob)
    saveBlob(blob, `config-${row.id}-${row.config_type || 'snapshot'}.json`)
    message.success('配置下载已开始')
  } catch (error) {
    message.error(readDownloadError(error))
  } finally {
    configDownloading.value = null
  }
}

async function downloadProjectPackage() {
  packageExporting.value = true
  try {
    const blob = await archiveApi.downloadProjectPackage(projectId.value)
    await ensureArchiveDownloadBlob(blob)
    saveBlob(blob, `${projectFilenamePrefix()}-project-package.zip`)
    message.success('项目包导出已开始')
  } catch (error) {
    message.error(readDownloadError(error))
  } finally {
    packageExporting.value = false
  }
}

async function downloadProjectTable(formType: string, kind: 'data' | 'sample') {
  const normalizedFormType = formType || 'excavation-record'
  const key = tableExportKey(normalizedFormType, kind)
  setTableExporting(key, true)
  try {
    const blob = await archiveApi.downloadProjectTable(projectId.value, { form_type: normalizedFormType, kind })
    await ensureArchiveDownloadBlob(blob)
    saveBlob(blob, `${projectFilenamePrefix()}-${safeFilenamePart(normalizedFormType)}-${kind}.xlsx`)
    message.success(kind === 'sample' ? '录入日期/试验员表格下载已开始' : '数据填充结果表格下载已开始')
  } catch (error) {
    message.error(readDownloadError(error))
  } finally {
    setTableExporting(key, false)
  }
}

function isTableExporting(formType: string, kind: 'data' | 'sample') {
  return Boolean(tableExporting.value[tableExportKey(formType || 'excavation-record', kind)])
}

function setTableExporting(key: string, value: boolean) {
  tableExporting.value = { ...tableExporting.value, [key]: value }
}

function tableExportKey(formType: string, kind: 'data' | 'sample') {
  return `${formType}:${kind}`
}

async function ensureArchiveDownloadBlob(blob: Blob) {
  if (!blob || blob.size === 0) {
    throw new Error('下载文件为空')
  }
  if (blob.type.includes('application/json')) {
    const text = await blob.text()
    try {
      const payload = JSON.parse(text) as { message?: string; msg?: string }
      throw new Error(payload.message || payload.msg || '下载失败')
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(text || '下载失败')
      }
      throw error
    }
  }
}

function readDownloadError(error: unknown) {
  return error instanceof Error ? error.message : '下载失败'
}

function projectFilenamePrefix() {
  return safeFilenamePart(detail.value?.project_code || detail.value?.project_name || detail.value?.project_uuid || `project-${projectId.value}`)
}

function safeFilenamePart(value: string) {
  const safe = value.trim().replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '')
  return safe || 'project'
}

watch(
  () => route.params.id,
  () => loadDetail(),
)

onMounted(loadDetail)
</script>

<style scoped>
.section-title {
  margin: 18px 0 12px;
  font-size: 14px;
  font-weight: 700;
}

.section-title--compact {
  margin: 0 0 4px;
}

.section-subtitle {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.section-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin: 8px 0 14px;
}

.debug-collapse {
  margin-top: 14px;
}

.rule-detail-text {
  white-space: normal;
  word-break: break-word;
  line-height: 1.6;
}

.rule-detail-modal-content {
  display: grid;
  gap: 14px;
}

.rule-detail-full {
  display: grid;
  gap: 8px;
}

.rule-detail-segment {
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--yy-border);
  border-radius: 6px;
  background: var(--yy-surface-soft);
  line-height: 1.6;
  word-break: break-word;
}

.rule-detail-segment__index {
  color: var(--yy-text-muted);
  font-family: var(--font-mono);
}

.summary-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  background: var(--yy-surface-soft);
}

.summary-panel__main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.summary-panel__title {
  font-size: 15px;
  font-weight: 700;
}

.summary-panel__meta {
  margin-top: 4px;
  color: var(--yy-text-muted);
  font-size: 12px;
}

.form-snapshot {
  padding: 16px 0;
  border-bottom: 1px solid var(--yy-border);
}

.form-snapshot:last-child {
  border-bottom: 0;
}

.data-section {
  margin-top: 14px;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  overflow: hidden;
}

.data-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--yy-surface-soft);
  border-bottom: 1px solid var(--yy-border);
}

.data-section__title {
  font-size: 14px;
  font-weight: 700;
}

.block-alert {
  margin-bottom: 12px;
}

.raw-collapse {
  margin-top: 14px;
}

.json-preview {
  margin: 0;
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 720px) {
  .section-toolbar,
  .summary-panel__main {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
