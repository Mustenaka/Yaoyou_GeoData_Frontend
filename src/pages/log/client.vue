<template>
  <div class="page-shell">
    <PageHeader title="客户端日志" subtitle="按企业、用户、设备、项目和版本追踪 Mobile/Win 上传的日志文件。" />

    <div class="page-card toolbar">
      <n-select v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-input v-model:value="filters.user_id_text" clearable placeholder="用户 ID" style="width: 110px" @keyup.enter="fetchLogs" />
      <n-input v-model:value="filters.device_id_text" clearable placeholder="设备 ID" style="width: 110px" @keyup.enter="fetchLogs" />
      <n-input v-model:value="filters.project_uuid" clearable placeholder="project_uuid" style="width: 220px" @keyup.enter="fetchLogs" />
      <n-select v-model:value="filters.parse_status" clearable :options="parseStatusOptions" placeholder="解析状态" style="width: 130px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchLogs">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: ClientFileItem) => row.file_id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { syncFileApi } from '@/api/syncFile'
import type { ClientFileItem } from '@/types/api'
import { formatBytes, formatDateTime, shortHash } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { clientTypeLabel, parseStatusLabel, parseStatusOptions } from '@/utils/labels'

const loading = ref(false)
const rows = ref<ClientFileItem[]>([])
const companyOptions = ref<SelectOption[]>([])

const filters = reactive({
  company_id: null as number | null,
  user_id_text: '',
  device_id_text: '',
  project_uuid: '',
  parse_status: '',
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const columns: DataTableColumns<ClientFileItem> = [
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

async function fetchLogs() {
  loading.value = true
  try {
    const result = await syncFileApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: filters.company_id || undefined,
      user_id: numberFilter(filters.user_id_text),
      device_fingerprint_id: numberFilter(filters.device_id_text),
      project_uuid: filters.project_uuid || undefined,
      parse_status: filters.parse_status || undefined,
      object_type: 'client_log',
    })
    rows.value = result.list
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, {
    company_id: null,
    user_id_text: '',
    device_id_text: '',
    project_uuid: '',
    parse_status: '',
  })
  pagination.page = 1
  fetchLogs()
}

function handlePage(page: number) {
  pagination.page = page
  fetchLogs()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchLogs()
}

async function downloadLog(row: ClientFileItem) {
  const blob = await syncFileApi.download(row.file_id)
  saveBlob(blob, row.original_filename || row.safe_filename || `${row.file_id}.log`)
}

onMounted(async () => {
  await Promise.all([loadCompanies(), fetchLogs()])
})
</script>
