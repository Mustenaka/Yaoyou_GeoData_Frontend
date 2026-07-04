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
            <n-descriptions label-placement="left" bordered :column="2">
              <n-descriptions-item label="project_uuid">
                <span class="mono">{{ detail.project_uuid }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="工程编号">{{ detail.project_code || '-' }}</n-descriptions-item>
              <n-descriptions-item label="工程名称">{{ detail.project_name || '-' }}</n-descriptions-item>
              <n-descriptions-item label="委托单位">{{ detail.client_name || '-' }}</n-descriptions-item>
              <n-descriptions-item label="最近上传">{{ formatDateTime(detail.last_uploaded_at) }}</n-descriptions-item>
              <n-descriptions-item label="最近解析">{{ formatDateTime(detail.last_parsed_at) }}</n-descriptions-item>
              <n-descriptions-item label="解析消息" :span="2">{{ detail.parse_message || '-' }}</n-descriptions-item>
            </n-descriptions>

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
              <n-empty v-if="!formSnapshotViews.length" description="暂无数据填充快照" />
              <div v-for="view in formSnapshotViews" :key="view.item.id" class="form-snapshot">
                <div class="section-toolbar">
                  <div>
                    <div class="section-title section-title--compact">{{ view.item.form_type || '未命名表单' }}</div>
                    <div class="section-subtitle">
                      {{ formatDateTime(view.item.created_at) }} · {{ view.item.row_count }} 行 · {{ view.item.sample_count }} 条录入日期/试验员
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

                <n-collapse v-if="view.parsed.sampleRows.length" class="raw-collapse">
                  <n-collapse-item title="录入日期/试验员预览" :name="`sample-${view.item.id}`">
                    <n-data-table
                      :columns="view.parsed.sampleTableColumns"
                      :data="view.parsed.sampleRows"
                      :pagination="{ pageSize: 50 }"
                      :row-key="(row: SnapshotTableRow) => row.__rowKey"
                      :scroll-x="view.parsed.sampleScrollX"
                      :max-height="360"
                    />
                  </n-collapse-item>
                </n-collapse>
              </div>
            </n-spin>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import { NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import type { ConfigSnapshotItem, FormDataSnapshot, ProjectArchiveItem } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { pageList } from '@/utils/query'
import { configTypeLabel } from '@/utils/labels'
import {
  emptyParsedFormSnapshot,
  parseFormSnapshot,
  parseStructuredConfig,
  type ConfigKeyValueItem,
  type ConfigMappingColumn,
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
const detail = ref<ProjectArchiveItem | null>(null)
const mobileData = ref<FormDataSnapshot[]>([])
const configs = ref<ConfigSnapshotItem[]>([])
const latestConfigDetail = ref<ConfigSnapshotItem | null>(null)
const formSnapshotViews = ref<FormSnapshotView[]>([])

const projectId = computed(() => Number(route.params.id))
const detailTitle = computed(() => detail.value?.project_name || detail.value?.project_uuid || '项目详情')
const latestConfig = computed(() => {
  const latest = configs.value.find((item) => item.is_latest)
  if (latest) return latest
  return [...configs.value].sort((a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || ''))[0] || null
})
const structuredConfig = computed<StructuredConfig | null>(() => (latestConfigDetail.value ? parseStructuredConfig(latestConfigDetail.value.snapshot_json) : null))

const mappingPreviewColumns: DataTableColumns<ConfigMappingColumn> = [
  { title: '字段 key', key: 'key', width: 180, render: (row) => h('span', { class: 'mono' }, row.key) },
  { title: '显示名', key: 'label', minWidth: 180 },
  { title: '宽度', key: 'width', width: 100 },
  { title: '类型', key: 'kind', width: 120 },
  { title: '规则数', key: 'ruleCount', width: 90 },
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
