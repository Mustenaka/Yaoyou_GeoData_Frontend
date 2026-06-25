<template>
  <div class="page-shell">
    <PageHeader title="项目档案" subtitle="按 project_uuid 串联 Mobile 项目资料、Win 结果、配置快照和追溯记录。" />

    <div class="page-card toolbar">
      <n-select v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-input v-model:value="filters.keyword" clearable placeholder="project_uuid / 编号 / 名称 / 委托单位" style="width: 360px" @keyup.enter="fetchList" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchList">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: ProjectArchiveItem) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="940">
      <n-drawer-content :title="detail?.project_name || detail?.project_uuid || '项目档案'">
        <n-tabs v-if="detail" type="line" animated>
          <n-tab-pane name="base" tab="基础">
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
          </n-tab-pane>

          <n-tab-pane name="files" tab="文件">
            <n-data-table :columns="fileColumns" :data="projectFiles" :loading="detailLoading" :pagination="{ pageSize: 8 }" />
          </n-tab-pane>

          <n-tab-pane name="mobile" tab="Mobile 快照">
            <n-data-table :columns="mobileColumns" :data="mobileData" :loading="detailLoading" :pagination="{ pageSize: 8 }" />
          </n-tab-pane>

          <n-tab-pane name="win" tab="Win 结果">
            <n-data-table :columns="fileColumns" :data="winResults" :loading="detailLoading" :pagination="{ pageSize: 8 }" />
          </n-tab-pane>

          <n-tab-pane name="configs" tab="配置">
            <n-data-table :columns="configColumns" :data="configs" :loading="detailLoading" :pagination="{ pageSize: 8 }" />
          </n-tab-pane>

          <n-tab-pane name="logs" tab="日志">
            <n-data-table :columns="fileColumns" :data="logFiles" :loading="detailLoading" :pagination="{ pageSize: 8 }" />
          </n-tab-pane>

          <n-tab-pane name="audit" tab="操作记录">
            <n-data-table :columns="auditColumns" :data="auditEvents" :loading="detailLoading" :pagination="{ pageSize: 8 }" />
          </n-tab-pane>
        </n-tabs>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="jsonVisible" preset="card" title="JSON 摘要" style="width: 760px">
      <pre class="json-preview">{{ jsonPreview }}</pre>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import { auditApi } from '@/api/audit'
import { companyApi } from '@/api/company'
import { syncFileApi } from '@/api/syncFile'
import type { ClientFileItem, ConfigSnapshotItem, FormDataSnapshot, OperationAuditEvent, ProjectArchiveItem } from '@/types/api'
import { formatBytes, formatDateTime, shortHash } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { auditResultLabel, configScopeLabel, configTypeLabel, objectTypeLabel, parseStatusLabel } from '@/utils/labels'

const route = useRoute()
const loading = ref(false)
const detailLoading = ref(false)
const rows = ref<ProjectArchiveItem[]>([])
const detail = ref<ProjectArchiveItem | null>(null)
const detailVisible = ref(false)
const companyOptions = ref<SelectOption[]>([])
const projectFiles = ref<ClientFileItem[]>([])
const mobileData = ref<FormDataSnapshot[]>([])
const winResults = ref<ClientFileItem[]>([])
const configs = ref<ConfigSnapshotItem[]>([])
const logFiles = ref<ClientFileItem[]>([])
const auditEvents = ref<OperationAuditEvent[]>([])
const jsonVisible = ref(false)
const jsonPreview = ref('')

const filters = reactive({
  company_id: null as number | null,
  keyword: '',
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const columns: DataTableColumns<ProjectArchiveItem> = [
  { title: 'project_uuid', key: 'project_uuid', minWidth: 220, render: (row) => h('span', { class: 'mono' }, row.project_uuid || '-') },
  { title: '编号', key: 'project_code', width: 130, render: (row) => row.project_code || '-' },
  { title: '名称', key: 'project_name', minWidth: 180, render: (row) => row.project_name || '-' },
  { title: '委托单位', key: 'client_name', minWidth: 160, render: (row) => row.client_name || '-' },
  { title: '企业', key: 'company_id', width: 90, render: (row) => row.company_id ?? '-' },
  { title: '最近 Mobile', key: 'source_mobile_file_id', width: 150, render: (row) => row.source_mobile_file_id || '-' },
  { title: '最近 Win', key: 'latest_win_result_file_id', width: 150, render: (row) => row.latest_win_result_file_id || '-' },
  { title: '最新配置', key: 'latest_config_file_id', width: 150, render: (row) => row.latest_config_file_id || '-' },
  { title: '最近同步', key: 'last_uploaded_at', width: 170, render: (row) => formatDateTime(row.last_uploaded_at || row.updated_at) },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
  },
]

const fileColumns: DataTableColumns<ClientFileItem> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.server_received_at || row.created_at) },
  { title: '类型', key: 'object_type', width: 110, render: (row) => objectTypeLabel(row.object_type) },
  { title: '文件名', key: 'original_filename', minWidth: 190, render: (row) => row.original_filename || row.safe_filename || '-' },
  { title: '大小', key: 'size_bytes', width: 100, render: (row) => formatBytes(row.size_bytes) },
  { title: '解析', key: 'parse_status', width: 100, render: (row) => parseStatusLabel(row.parse_status) },
  { title: 'SHA-256', key: 'sha256', width: 160, render: (row) => h('span', { class: 'mono' }, shortHash(row.sha256)) },
  { title: '操作', key: 'actions', width: 90, render: (row) => h(NButton, { size: 'small', onClick: () => downloadFile(row) }, { default: () => '下载' }) },
]

const mobileColumns: DataTableColumns<FormDataSnapshot> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  { title: '表单', key: 'form_type', width: 160 },
  { title: '行数', key: 'row_count', width: 90 },
  { title: '样本数', key: 'sample_count', width: 90 },
  { title: '来源文件', key: 'source_file_id', minWidth: 180 },
  { title: '操作', key: 'actions', width: 90, render: (row) => h(NButton, { size: 'small', onClick: () => showJSON(row.snapshot_json) }, { default: () => '查看' }) },
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
  { title: '操作', key: 'actions', width: 90, render: (row) => h(NButton, { size: 'small', onClick: () => showJSON(row.summary_json || row.snapshot_json) }, { default: () => '摘要' }) },
]

const auditColumns: DataTableColumns<OperationAuditEvent> = [
  { title: '时间', key: 'server_ts', width: 170, render: (row) => formatDateTime(row.server_ts || row.created_at) },
  { title: '模块', key: 'module', width: 120 },
  { title: '操作', key: 'action', width: 120 },
  { title: '结果', key: 'result', width: 90, render: (row) => auditResultLabel(row.result) },
  { title: '用户', key: 'user_id', width: 90, render: (row) => row.user_id ?? '-' },
  { title: '文件', key: 'file_id', minWidth: 160, render: (row) => row.file_id || '-' },
  { title: '消息', key: 'message', minWidth: 220, render: (row) => row.message || '-' },
]

async function loadCompanies() {
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = result.list.map((item) => ({ label: item.company_name, value: item.id }))
}

async function fetchList() {
  loading.value = true
  try {
    const result = await archiveApi.listProjects({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: filters.company_id || undefined,
      keyword: filters.keyword || undefined,
    })
    rows.value = result.list
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.company_id = null
  filters.keyword = ''
  pagination.page = 1
  fetchList()
}

function handlePage(page: number) {
  pagination.page = page
  fetchList()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchList()
}

async function openDetail(row: ProjectArchiveItem) {
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await archiveApi.projectDetail(row.id)
    const [files, mobile, win, cfgs, logs, audits] = await Promise.all([
      archiveApi.projectFiles(row.id, { page: 1, page_size: 100 }),
      archiveApi.projectMobileData(row.id, { page: 1, page_size: 100 }),
      archiveApi.projectWinResults(row.id, { page: 1, page_size: 100 }),
      archiveApi.projectConfigs(row.id, { page: 1, page_size: 100 }),
      syncFileApi.list({ page: 1, page_size: 100, project_uuid: row.project_uuid, object_type: 'client_log' }),
      auditApi.list({ page: 1, page_size: 100, project_uuid: row.project_uuid }),
    ])
    projectFiles.value = files.list
    mobileData.value = mobile.list
    winResults.value = win.list
    configs.value = cfgs.list
    logFiles.value = logs.list
    auditEvents.value = audits.list
  } finally {
    detailLoading.value = false
  }
}

async function downloadFile(row: ClientFileItem) {
  const blob = await syncFileApi.download(row.file_id)
  saveBlob(blob, row.original_filename || row.safe_filename || `${row.file_id}.bin`)
}

function showJSON(raw?: string | null) {
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
  () => route.query.keyword,
  (keyword) => {
    if (typeof keyword === 'string' && keyword !== filters.keyword) {
      filters.keyword = keyword
      pagination.page = 1
      fetchList()
    }
  },
)

onMounted(async () => {
  if (typeof route.query.keyword === 'string') {
    filters.keyword = route.query.keyword
  }
  await Promise.all([loadCompanies(), fetchList()])
})
</script>

<style scoped>
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
