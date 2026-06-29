<template>
  <div class="page-shell">
    <PageHeader title="操作记录" subtitle="合并操作审计与客户端日志，按企业、用户、设备和项目追溯后台与客户端行为。" />

    <div class="page-card">
      <n-tabs v-model:value="activeTab" type="segment">
        <n-tab name="audit">操作审计</n-tab>
        <n-tab name="client-log">客户端日志</n-tab>
      </n-tabs>
    </div>

    <div v-if="activeTab === 'audit'" class="page-card toolbar">
      <n-select v-model:value="auditFilters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-input v-model:value="auditFilters.user_id_text" clearable placeholder="用户 ID" style="width: 110px" @keyup.enter="fetchAuditList" />
      <n-input v-model:value="auditFilters.device_id_text" clearable placeholder="设备 ID" style="width: 110px" @keyup.enter="fetchAuditList" />
      <n-input v-model:value="auditFilters.project_uuid" clearable placeholder="project_uuid" style="width: 220px" @keyup.enter="fetchAuditList" />
      <n-input v-model:value="auditFilters.module" clearable placeholder="模块" style="width: 120px" @keyup.enter="fetchAuditList" />
      <n-input v-model:value="auditFilters.action" clearable placeholder="操作" style="width: 120px" @keyup.enter="fetchAuditList" />
      <n-select v-model:value="auditFilters.result" clearable :options="auditResultOptions" placeholder="结果" style="width: 110px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchAuditList">查询</n-button>
      <n-button quaternary @click="resetAuditFilters">重置</n-button>
    </div>

    <div v-else class="page-card toolbar">
      <n-select v-model:value="logFilters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-input v-model:value="logFilters.user_id_text" clearable placeholder="用户 ID" style="width: 110px" @keyup.enter="fetchClientLogs" />
      <n-input v-model:value="logFilters.device_id_text" clearable placeholder="设备 ID" style="width: 110px" @keyup.enter="fetchClientLogs" />
      <n-input v-model:value="logFilters.project_uuid" clearable placeholder="project_uuid" style="width: 220px" @keyup.enter="fetchClientLogs" />
      <n-select v-model:value="logFilters.parse_status" clearable :options="parseStatusOptions" placeholder="解析状态" style="width: 130px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchClientLogs">查询</n-button>
      <n-button quaternary @click="resetLogFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        v-if="activeTab === 'audit'"
        remote
        :columns="auditColumns"
        :data="auditRows"
        :loading="auditLoading"
        :pagination="auditPagination"
        :row-key="(row: OperationAuditEvent) => row.id"
        @update:page="handleAuditPage"
        @update:page-size="handleAuditPageSize"
      />
      <n-data-table
        v-else
        remote
        :columns="logColumns"
        :data="logRows"
        :loading="logLoading"
        :pagination="logPagination"
        :row-key="(row: ClientFileItem) => row.file_id"
        @update:page="handleLogPage"
        @update:page-size="handleLogPageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="760">
      <n-drawer-content :title="detail ? `审计事件 #${detail.id}` : '审计事件'">
        <n-descriptions v-if="detail" label-placement="left" bordered :column="2">
          <n-descriptions-item label="事件 ID" :span="2"><span class="mono">{{ detail.event_id || '-' }}</span></n-descriptions-item>
          <n-descriptions-item label="企业 ID">{{ detail.company_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="用户 ID">{{ detail.user_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="设备 ID">{{ detail.device_fingerprint_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="客户端时间">{{ formatDateTime(detail.client_ts) }}</n-descriptions-item>
          <n-descriptions-item label="服务端时间">{{ formatDateTime(detail.server_ts || detail.created_at) }}</n-descriptions-item>
          <n-descriptions-item label="模块">{{ detail.module || '-' }}</n-descriptions-item>
          <n-descriptions-item label="操作">{{ detail.action || '-' }}</n-descriptions-item>
          <n-descriptions-item label="结果">{{ auditResultLabel(detail.result) }}</n-descriptions-item>
          <n-descriptions-item label="项目 UUID"><span class="mono">{{ detail.project_uuid || '-' }}</span></n-descriptions-item>
          <n-descriptions-item label="文件 ID">{{ detail.file_id || '-' }}</n-descriptions-item>
          <n-descriptions-item label="IP">{{ detail.ip || '-' }}</n-descriptions-item>
          <n-descriptions-item label="消息" :span="2">{{ detail.message || '-' }}</n-descriptions-item>
          <n-descriptions-item label="User-Agent" :span="2">{{ detail.user_agent || '-' }}</n-descriptions-item>
        </n-descriptions>
        <pre v-if="detail?.extra_json" class="json-preview">{{ formatJSON(detail.extra_json) }}</pre>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { auditApi } from '@/api/audit'
import { companyApi } from '@/api/company'
import { syncFileApi } from '@/api/syncFile'
import type { ClientFileItem, OperationAuditEvent } from '@/types/api'
import { compactText, formatBytes, formatDateTime, shortHash } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { auditResultLabel, auditResultOptions, clientTypeLabel, parseStatusLabel, parseStatusOptions } from '@/utils/labels'

const route = useRoute()
const activeTab = ref('audit')
const auditLoading = ref(false)
const logLoading = ref(false)
const auditRows = ref<OperationAuditEvent[]>([])
const logRows = ref<ClientFileItem[]>([])
const detail = ref<OperationAuditEvent | null>(null)
const detailVisible = ref(false)
const companyOptions = ref<SelectOption[]>([])

const auditFilters = reactive({
  company_id: null as number | null,
  user_id_text: '',
  device_id_text: '',
  project_uuid: '',
  module: '',
  action: '',
  result: '',
})

const logFilters = reactive({
  company_id: null as number | null,
  user_id_text: '',
  device_id_text: '',
  project_uuid: '',
  parse_status: '',
})

const auditPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const logPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

function resultTagType(result: string) {
  if (result === 'success') return 'success'
  if (result === 'failed' || result === 'rejected') return 'error'
  return 'default'
}

const auditColumns: DataTableColumns<OperationAuditEvent> = [
  { title: '时间', key: 'server_ts', width: 170, render: (row) => formatDateTime(row.server_ts || row.created_at) },
  { title: '企业', key: 'company_id', width: 90, render: (row) => row.company_id ?? '-' },
  { title: '用户', key: 'user_id', width: 90, render: (row) => row.user_id ?? '-' },
  { title: '设备', key: 'device_fingerprint_id', width: 90, render: (row) => row.device_fingerprint_id ?? '-' },
  { title: '模块', key: 'module', width: 130 },
  { title: '操作', key: 'action', width: 130 },
  {
    title: '结果',
    key: 'result',
    width: 100,
    render: (row) => h(NTag, { type: resultTagType(row.result), round: true }, { default: () => auditResultLabel(row.result) }),
  },
  { title: '项目', key: 'project_uuid', minWidth: 180, render: (row) => h('span', { class: 'mono' }, row.project_uuid || '-') },
  { title: '文件', key: 'file_id', width: 150, render: (row) => row.file_id || '-' },
  { title: 'IP', key: 'ip', width: 130, render: (row) => row.ip || '-' },
  { title: '消息', key: 'message', minWidth: 180, render: (row) => compactText(row.message, 60) },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
  },
]

const logColumns: DataTableColumns<ClientFileItem> = [
  { title: '上传时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.server_received_at || row.created_at) },
  { title: '来源端', key: 'source_client', width: 90, render: (row) => clientTypeLabel(row.source_client) },
  { title: '企业', key: 'company_id', width: 90, render: (row) => row.company_id ?? '-' },
  { title: '用户', key: 'user_id', width: 90 },
  { title: '设备', key: 'device_fingerprint_id', width: 90, render: (row) => row.device_fingerprint_id ?? '-' },
  { title: '项目', key: 'project_uuid', minWidth: 190, render: (row) => h('span', { class: 'mono' }, row.project_uuid || '-') },
  { title: '版本', key: 'app_version', width: 120, render: (row) => row.app_version || '-' },
  { title: '日志文件', key: 'original_filename', minWidth: 200, render: (row) => row.original_filename || row.safe_filename || '-' },
  { title: '大小', key: 'size_bytes', width: 100, render: (row) => formatBytes(row.size_bytes) },
  {
    title: '解析',
    key: 'parse_status',
    width: 100,
    render: (row) =>
      h(NTag, { type: row.parse_status === 'failed' ? 'error' : row.parse_status === 'parsed' ? 'success' : 'warning', round: true }, { default: () => parseStatusLabel(row.parse_status) }),
  },
  { title: 'SHA-256', key: 'sha256', width: 160, render: (row) => h('span', { class: 'mono' }, shortHash(row.sha256)) },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: () => downloadLog(row) }, { default: () => '下载' }),
  },
]

async function loadCompanies() {
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = result.list.map((item) => ({ label: item.company_name, value: item.id }))
}

function numberFilter(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

async function fetchAuditList() {
  auditLoading.value = true
  try {
    const result = await auditApi.list({
      page: auditPagination.page,
      page_size: auditPagination.pageSize,
      company_id: auditFilters.company_id || undefined,
      user_id: numberFilter(auditFilters.user_id_text),
      device_fingerprint_id: numberFilter(auditFilters.device_id_text),
      project_uuid: auditFilters.project_uuid || undefined,
      module: auditFilters.module || undefined,
      action: auditFilters.action || undefined,
      result: auditFilters.result || undefined,
    })
    auditRows.value = result.list
    auditPagination.itemCount = result.total
  } finally {
    auditLoading.value = false
  }
}

async function fetchClientLogs() {
  logLoading.value = true
  try {
    const result = await syncFileApi.list({
      page: logPagination.page,
      page_size: logPagination.pageSize,
      company_id: logFilters.company_id || undefined,
      user_id: numberFilter(logFilters.user_id_text),
      device_fingerprint_id: numberFilter(logFilters.device_id_text),
      project_uuid: logFilters.project_uuid || undefined,
      parse_status: logFilters.parse_status || undefined,
      object_type: 'client_log',
    })
    logRows.value = result.list
    logPagination.itemCount = result.total
  } finally {
    logLoading.value = false
  }
}

function resetAuditFilters() {
  Object.assign(auditFilters, {
    company_id: null,
    user_id_text: '',
    device_id_text: '',
    project_uuid: '',
    module: '',
    action: '',
    result: '',
  })
  auditPagination.page = 1
  fetchAuditList()
}

function resetLogFilters() {
  Object.assign(logFilters, {
    company_id: null,
    user_id_text: '',
    device_id_text: '',
    project_uuid: '',
    parse_status: '',
  })
  logPagination.page = 1
  fetchClientLogs()
}

function handleAuditPage(page: number) {
  auditPagination.page = page
  fetchAuditList()
}

function handleAuditPageSize(pageSize: number) {
  auditPagination.pageSize = pageSize
  auditPagination.page = 1
  fetchAuditList()
}

function handleLogPage(page: number) {
  logPagination.page = page
  fetchClientLogs()
}

function handleLogPageSize(pageSize: number) {
  logPagination.pageSize = pageSize
  logPagination.page = 1
  fetchClientLogs()
}

function openDetail(row: OperationAuditEvent) {
  detail.value = row
  detailVisible.value = true
}

function formatJSON(raw?: string | null) {
  if (!raw) return '{}'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

async function downloadLog(row: ClientFileItem) {
  const blob = await syncFileApi.download(row.file_id)
  saveBlob(blob, row.original_filename || row.safe_filename || `${row.file_id}.log`)
}

watch(
  () => route.query.project_uuid,
  (projectUuid) => {
    if (typeof projectUuid === 'string') {
      auditFilters.project_uuid = projectUuid
      logFilters.project_uuid = projectUuid
      auditPagination.page = 1
      logPagination.page = 1
      fetchAuditList()
      fetchClientLogs()
    }
  },
)

onMounted(async () => {
  if (route.query.tab === 'client-log') activeTab.value = 'client-log'
  if (typeof route.query.project_uuid === 'string') {
    auditFilters.project_uuid = route.query.project_uuid
    logFilters.project_uuid = route.query.project_uuid
  }
  await loadCompanies()
  await Promise.all([fetchAuditList(), fetchClientLogs()])
})
</script>

<style scoped>
.json-preview {
  margin-top: 14px;
  max-height: 360px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}
</style>
