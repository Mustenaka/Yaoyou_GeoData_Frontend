<template>
  <div class="page-shell">
    <PageHeader title="Win 数据管理" subtitle="追踪 Win 结果文件与 project_uuid、设备授权上下文的关联状态。" />

    <div class="page-card toolbar">
      <n-select v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-select v-model:value="filters.parse_status" clearable :options="parseStatusOptions" placeholder="解析状态" style="width: 130px" />
      <n-input v-model:value="filters.user_id_text" clearable placeholder="用户 ID" style="width: 110px" @keyup.enter="fetchList" />
      <n-input v-model:value="filters.device_id_text" clearable placeholder="设备 ID" style="width: 110px" @keyup.enter="fetchList" />
      <n-input v-model:value="filters.project_uuid" clearable placeholder="project_uuid" style="width: 220px" @keyup.enter="fetchList" />
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
        :row-key="(row: ClientFileItem) => row.file_id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="680">
      <n-drawer-content :title="detail?.original_filename || 'Win 数据详情'">
        <n-descriptions v-if="detail" label-placement="left" bordered :column="2">
          <n-descriptions-item label="文件 ID">{{ detail.file_id }}</n-descriptions-item>
          <n-descriptions-item label="企业 ID">{{ detail.company_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="用户 ID">{{ detail.user_id }}</n-descriptions-item>
          <n-descriptions-item label="设备 ID">{{ detail.device_fingerprint_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="授权 ID">{{ detail.device_authorization_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="App 版本">{{ detail.app_version || '-' }}</n-descriptions-item>
          <n-descriptions-item label="项目 UUID" :span="2"><span class="mono">{{ detail.project_uuid || '-' }}</span></n-descriptions-item>
          <n-descriptions-item label="工程编号">{{ detail.project_code || '-' }}</n-descriptions-item>
          <n-descriptions-item label="大小">{{ formatBytes(detail.size_bytes) }}</n-descriptions-item>
          <n-descriptions-item label="解析状态">{{ parseStatusLabel(detail.parse_status) }}</n-descriptions-item>
          <n-descriptions-item label="上传时间">{{ formatDateTime(detail.server_received_at) }}</n-descriptions-item>
          <n-descriptions-item label="SHA-256" :span="2"><span class="mono">{{ detail.sha256 || '-' }}</span></n-descriptions-item>
          <n-descriptions-item label="失败原因" :span="2">{{ detail.parse_message || '-' }}</n-descriptions-item>
        </n-descriptions>
        <template #footer>
          <div class="drawer-footer">
            <n-button v-if="detail" @click="downloadRow(detail)">下载原文件</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
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
import { parseStatusLabel, parseStatusOptions } from '@/utils/labels'

const loading = ref(false)
const rows = ref<ClientFileItem[]>([])
const detail = ref<ClientFileItem | null>(null)
const detailVisible = ref(false)
const companyOptions = ref<SelectOption[]>([])

const filters = reactive({
  company_id: null as number | null,
  parse_status: '' as string,
  user_id_text: '',
  device_id_text: '',
  project_uuid: '',
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

function parseTagType(status: string) {
  if (status === 'parsed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'default'
  return 'warning'
}

const columns: DataTableColumns<ClientFileItem> = [
  { title: '上传时间', key: 'server_received_at', width: 170, render: (row) => formatDateTime(row.server_received_at || row.created_at) },
  { title: '企业', key: 'company_id', width: 90, render: (row) => row.company_id ?? '-' },
  { title: '用户', key: 'user_id', width: 90 },
  { title: '设备', key: 'device_fingerprint_id', width: 90, render: (row) => row.device_fingerprint_id ?? '-' },
  { title: '授权', key: 'device_authorization_id', width: 90, render: (row) => row.device_authorization_id ?? '-' },
  { title: 'project_uuid', key: 'project_uuid', minWidth: 220, render: (row) => h('span', { class: 'mono' }, row.project_uuid || '-') },
  { title: '编号', key: 'project_code', width: 130, render: (row) => row.project_code || '-' },
  { title: '文件名', key: 'original_filename', minWidth: 180, render: (row) => row.original_filename || row.safe_filename || '-' },
  { title: '大小', key: 'size_bytes', width: 100, render: (row) => formatBytes(row.size_bytes) },
  { title: '版本', key: 'app_version', width: 110, render: (row) => row.app_version || '-' },
  {
    title: '解析',
    key: 'parse_status',
    width: 100,
    render: (row) => h(NTag, { type: parseTagType(row.parse_status), round: true }, { default: () => parseStatusLabel(row.parse_status) }),
  },
  { title: '失败原因', key: 'parse_message', minWidth: 160, render: (row) => row.parse_message || '-' },
  { title: 'SHA-256', key: 'sha256', width: 160, render: (row) => h('span', { class: 'mono' }, shortHash(row.sha256)) },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
        h(NButton, { size: 'small', onClick: () => downloadRow(row) }, { default: () => '下载' }),
      ]),
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

async function fetchList() {
  loading.value = true
  try {
    const result = await syncFileApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: filters.company_id || undefined,
      user_id: numberFilter(filters.user_id_text),
      device_fingerprint_id: numberFilter(filters.device_id_text),
      object_type: 'win_result',
      parse_status: filters.parse_status || undefined,
      project_uuid: filters.project_uuid || undefined,
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
    parse_status: '',
    user_id_text: '',
    device_id_text: '',
    project_uuid: '',
  })
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

async function openDetail(row: ClientFileItem) {
  detail.value = await syncFileApi.detail(row.file_id)
  detailVisible.value = true
}

async function downloadRow(row: ClientFileItem) {
  const blob = await syncFileApi.download(row.file_id)
  saveBlob(blob, row.original_filename || row.safe_filename || `${row.file_id}.bin`)
}

onMounted(async () => {
  await Promise.all([loadCompanies(), fetchList()])
})
</script>
