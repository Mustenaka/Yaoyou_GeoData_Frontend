<template>
  <div class="page-shell">
    <PageHeader :title="detailTitle" subtitle="项目档案详情：①项目基本信息 ②工作表单配置 ③数据填充结果，并保留 Win 结果、客户端日志和操作记录。">
      <n-space>
        <n-button @click="router.push({ name: 'projects' })">返回列表</n-button>
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
              <n-descriptions-item label="企业 ID">{{ detail.company_id ?? '-' }}</n-descriptions-item>
              <n-descriptions-item label="UUID 回退">{{ detail.uuid_fallback ? '是' : '否' }}</n-descriptions-item>
              <n-descriptions-item label="最近上传">{{ formatDateTime(detail.last_uploaded_at) }}</n-descriptions-item>
              <n-descriptions-item label="最近解析">{{ formatDateTime(detail.last_parsed_at) }}</n-descriptions-item>
              <n-descriptions-item label="Mobile 文件">{{ detail.source_mobile_file_id || '-' }}</n-descriptions-item>
              <n-descriptions-item label="Win 文件">{{ detail.latest_win_result_file_id || '-' }}</n-descriptions-item>
              <n-descriptions-item label="配置文件">{{ detail.latest_config_file_id || '-' }}</n-descriptions-item>
              <n-descriptions-item label="录入文件">{{ detail.latest_entry_data_file_id || '-' }}</n-descriptions-item>
              <n-descriptions-item label="解析消息" :span="2">{{ detail.parse_message || '-' }}</n-descriptions-item>
            </n-descriptions>

            <div class="section-title">关联文件</div>
            <n-data-table :columns="fileColumns" :data="projectFiles" :loading="loading" :pagination="{ pageSize: 8 }" />
          </n-tab-pane>

          <n-tab-pane name="configs" tab="② 工作表单配置">
            <div class="section-title">项目配置快照</div>
            <n-data-table :columns="configColumns" :data="configs" :loading="loading" :pagination="{ pageSize: 10 }" />
          </n-tab-pane>

          <n-tab-pane name="mobile" tab="③ 数据填充结果">
            <div class="section-title">Mobile 录入快照</div>
            <n-data-table :columns="mobileColumns" :data="mobileData" :loading="loading" :pagination="{ pageSize: 10 }" />
          </n-tab-pane>

          <n-tab-pane name="win" tab="Win结果">
            <n-data-table :columns="fileColumns" :data="winResults" :loading="loading" :pagination="{ pageSize: 10 }" />
          </n-tab-pane>

          <n-tab-pane name="logs" tab="客户端日志">
            <n-data-table :columns="fileColumns" :data="logFiles" :loading="loading" :pagination="{ pageSize: 10 }" />
          </n-tab-pane>

          <n-tab-pane name="audit" tab="操作记录">
            <n-data-table :columns="auditColumns" :data="auditEvents" :loading="loading" :pagination="{ pageSize: 10 }" />
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-spin>

    <n-drawer v-model:show="fileDetailVisible" width="720">
      <n-drawer-content :title="fileDetail?.original_filename || fileDetail?.file_id || '文件详情'">
        <n-descriptions v-if="fileDetail" label-placement="left" bordered :column="2">
          <n-descriptions-item label="文件 ID">{{ fileDetail.file_id }}</n-descriptions-item>
          <n-descriptions-item label="来源端">{{ clientTypeLabel(fileDetail.source_client) }}</n-descriptions-item>
          <n-descriptions-item label="企业 ID">{{ fileDetail.company_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="用户 ID">{{ fileDetail.user_id }}</n-descriptions-item>
          <n-descriptions-item label="设备 ID">{{ fileDetail.device_fingerprint_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ objectTypeLabel(fileDetail.object_type) }}</n-descriptions-item>
          <n-descriptions-item label="项目 UUID">{{ fileDetail.project_uuid || '-' }}</n-descriptions-item>
          <n-descriptions-item label="工程编号">{{ fileDetail.project_code || '-' }}</n-descriptions-item>
          <n-descriptions-item label="大小">{{ formatBytes(fileDetail.size_bytes) }}</n-descriptions-item>
          <n-descriptions-item label="MIME">{{ fileDetail.mime_type || '-' }}</n-descriptions-item>
          <n-descriptions-item label="上传状态">{{ uploadStatusLabel(fileDetail.upload_status) }}</n-descriptions-item>
          <n-descriptions-item label="解析状态">{{ parseStatusLabel(fileDetail.parse_status) }}</n-descriptions-item>
          <n-descriptions-item label="接收时间">{{ formatDateTime(fileDetail.server_received_at) }}</n-descriptions-item>
          <n-descriptions-item label="更新时间">{{ formatDateTime(fileDetail.updated_at) }}</n-descriptions-item>
          <n-descriptions-item label="SHA-256" :span="2">
            <span class="mono">{{ fileDetail.sha256 || '-' }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="失败原因" :span="2">{{ fileDetail.parse_message || '-' }}</n-descriptions-item>
        </n-descriptions>
        <template #footer>
          <div class="drawer-footer">
            <n-button v-if="fileDetail" @click="downloadFile(fileDetail)">下载</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="jsonVisible" preset="card" :title="jsonTitle" style="width: 760px">
      <pre class="json-preview">{{ jsonPreview }}</pre>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import { auditApi } from '@/api/audit'
import { syncFileApi } from '@/api/syncFile'
import type { ClientFileItem, ConfigSnapshotItem, FormDataSnapshot, OperationAuditEvent, ProjectArchiveItem } from '@/types/api'
import { formatBytes, formatDateTime, shortHash } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { pageList } from '@/utils/query'
import {
  auditResultLabel,
  clientTypeLabel,
  configScopeLabel,
  configTypeLabel,
  objectTypeLabel,
  parseStatusLabel,
  uploadStatusLabel,
} from '@/utils/labels'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const errorText = ref('')
const activeTab = ref('base')
const detail = ref<ProjectArchiveItem | null>(null)
const projectFiles = ref<ClientFileItem[]>([])
const mobileData = ref<FormDataSnapshot[]>([])
const winResults = ref<ClientFileItem[]>([])
const configs = ref<ConfigSnapshotItem[]>([])
const logFiles = ref<ClientFileItem[]>([])
const auditEvents = ref<OperationAuditEvent[]>([])
const fileDetail = ref<ClientFileItem | null>(null)
const fileDetailVisible = ref(false)
const jsonVisible = ref(false)
const jsonTitle = ref('JSON 摘要')
const jsonPreview = ref('')

const projectId = computed(() => Number(route.params.id))
const detailTitle = computed(() => detail.value?.project_name || detail.value?.project_uuid || '项目详情')

function statusTagType(status: string) {
  if (status === 'uploaded' || status === 'parsed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'default'
  return 'warning'
}

const fileColumns: DataTableColumns<ClientFileItem> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.server_received_at || row.created_at) },
  { title: '来源端', key: 'source_client', width: 90, render: (row) => clientTypeLabel(row.source_client) },
  { title: '类型', key: 'object_type', width: 110, render: (row) => objectTypeLabel(row.object_type) },
  { title: '文件名', key: 'original_filename', minWidth: 190, render: (row) => row.original_filename || row.safe_filename || '-' },
  { title: '大小', key: 'size_bytes', width: 100, render: (row) => formatBytes(row.size_bytes) },
  {
    title: '解析',
    key: 'parse_status',
    width: 100,
    render: (row) => h(NTag, { type: statusTagType(row.parse_status), round: true }, { default: () => parseStatusLabel(row.parse_status) }),
  },
  { title: '失败原因', key: 'parse_message', minWidth: 160, render: (row) => row.parse_message || '-' },
  { title: 'SHA-256', key: 'sha256', width: 160, render: (row) => h('span', { class: 'mono' }, shortHash(row.sha256)) },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openFileDetail(row) }, { default: () => '详情' }),
        h(NButton, { size: 'small', onClick: () => downloadFile(row) }, { default: () => '下载' }),
      ]),
  },
]

const mobileColumns: DataTableColumns<FormDataSnapshot> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  { title: '表单', key: 'form_type', width: 160 },
  { title: '行数', key: 'row_count', width: 90 },
  { title: '样本数', key: 'sample_count', width: 90 },
  { title: '来源文件', key: 'source_file_id', minWidth: 180 },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => showJSON(row.snapshot_json, 'Mobile 录入快照') }, { default: () => '查看' }),
        row.source_file_id ? h(NButton, { size: 'small', onClick: () => downloadByFileId(row.source_file_id, `${row.source_file_id}.bin`) }, { default: () => '下载' }) : null,
      ]),
  },
]

const configColumns: DataTableColumns<ConfigSnapshotItem> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  { title: '范围', key: 'config_scope', width: 90, render: (row) => configScopeLabel(row.config_scope) },
  { title: '类型', key: 'config_type', width: 110, render: (row) => configTypeLabel(row.config_type) },
  { title: '版本', key: 'config_version', width: 110, render: (row) => row.config_version || '-' },
  {
    title: '最新',
    key: 'is_latest',
    width: 80,
    render: (row) => h(NTag, { type: row.is_latest ? 'success' : 'default', round: true }, { default: () => (row.is_latest ? '是' : '否') }),
  },
  { title: '来源文件', key: 'source_file_id', minWidth: 170 },
  {
    title: '操作',
    key: 'actions',
    width: 240,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openConfig(row) }, { default: () => '摘要' }),
        h(NButton, { size: 'small', onClick: () => downloadConfig(row) }, { default: () => '下载' }),
        h(
          NPopconfirm,
          { onPositiveClick: () => markLatest(row) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'primary', ghost: true, disabled: row.is_latest }, { default: () => '标记最新' }),
            default: () => `确认将配置快照 #${row.id} 标记为最新？`,
          },
        ),
      ]),
  },
]

const auditColumns: DataTableColumns<OperationAuditEvent> = [
  { title: '时间', key: 'server_ts', width: 170, render: (row) => formatDateTime(row.server_ts || row.created_at) },
  { title: '企业', key: 'company_id', width: 90, render: (row) => row.company_id ?? '-' },
  { title: '用户', key: 'user_id', width: 90, render: (row) => row.user_id ?? '-' },
  { title: '设备', key: 'device_fingerprint_id', width: 90, render: (row) => row.device_fingerprint_id ?? '-' },
  { title: '模块', key: 'module', width: 120 },
  { title: '操作', key: 'action', width: 120 },
  { title: '结果', key: 'result', width: 90, render: (row) => auditResultLabel(row.result) },
  { title: '文件', key: 'file_id', minWidth: 160, render: (row) => row.file_id || '-' },
  { title: '消息', key: 'message', minWidth: 220, render: (row) => row.message || '-' },
]

async function loadConfigs() {
  const result = await archiveApi.projectConfigs(projectId.value, { page: 1, page_size: 100 })
  configs.value = pageList(result.list)
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
    const [files, mobile, win, logs, audits] = await Promise.all([
      archiveApi.projectFiles(projectId.value, { page: 1, page_size: 100 }),
      archiveApi.projectMobileData(projectId.value, { page: 1, page_size: 100 }),
      archiveApi.projectWinResults(projectId.value, { page: 1, page_size: 100 }),
      syncFileApi.list({ page: 1, page_size: 100, project_uuid: project.project_uuid, object_type: 'client_log' }),
      auditApi.list({ page: 1, page_size: 100, project_uuid: project.project_uuid }),
      loadConfigs(),
    ])
    projectFiles.value = pageList(files.list)
    mobileData.value = pageList(mobile.list)
    winResults.value = pageList(win.list)
    logFiles.value = pageList(logs.list)
    auditEvents.value = pageList(audits.list)
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '项目详情加载失败'
  } finally {
    loading.value = false
  }
}

async function openFileDetail(row: ClientFileItem) {
  fileDetail.value = await syncFileApi.detail(row.file_id)
  fileDetailVisible.value = true
}

async function downloadFile(row: ClientFileItem) {
  const blob = await syncFileApi.download(row.file_id)
  saveBlob(blob, row.original_filename || row.safe_filename || `${row.file_id}.bin`)
}

async function downloadByFileId(fileId: string, filename: string) {
  const blob = await syncFileApi.download(fileId)
  saveBlob(blob, filename)
}

async function openConfig(row: ConfigSnapshotItem) {
  const item = await archiveApi.configDetail(row.id)
  showJSON(item.summary_json || item.snapshot_json, `配置快照 #${item.id}`)
}

async function downloadConfig(row: ConfigSnapshotItem) {
  const blob = await archiveApi.downloadConfig(row.id)
  saveBlob(blob, `config-${row.id}-${row.config_type || 'snapshot'}.json`)
}

async function markLatest(row: ConfigSnapshotItem) {
  await archiveApi.markConfigLatest(row.id)
  message.success('已标记最新')
  await loadConfigs()
}

function showJSON(raw?: string | null, title = 'JSON 摘要') {
  jsonTitle.value = title
  if (!raw) {
    jsonPreview.value = '{}'
  } else {
    try {
      jsonPreview.value = JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      jsonPreview.value = raw
    }
  }
  jsonVisible.value = true
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
</style>
