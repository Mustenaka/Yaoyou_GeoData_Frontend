<template>
  <div class="page-shell">
    <PageHeader title="文件同步中心" subtitle="统一追踪 Mobile、Win 和后台归集文件的上传、解析与存储状态。" />

    <div class="page-card toolbar">
      <n-select v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-select v-model:value="filters.object_type" clearable :options="objectTypeOptions" placeholder="文件类型" style="width: 140px" />
      <n-select v-model:value="filters.upload_status" clearable :options="uploadStatusOptions" placeholder="上传状态" style="width: 130px" />
      <n-select v-model:value="filters.parse_status" clearable :options="parseStatusOptions" placeholder="解析状态" style="width: 130px" />
      <n-input v-model:value="filters.project_uuid" clearable placeholder="project_uuid" style="width: 220px" @keyup.enter="fetchList" />
      <n-input v-model:value="filters.project_code" clearable placeholder="工程编号" style="width: 150px" @keyup.enter="fetchList" />
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

    <n-drawer v-model:show="detailVisible" width="720">
      <n-drawer-content :title="detail?.original_filename || detail?.file_id || '文件详情'">
        <n-descriptions v-if="detail" label-placement="left" bordered :column="2">
          <n-descriptions-item label="文件 ID">{{ detail.file_id }}</n-descriptions-item>
          <n-descriptions-item label="来源端">{{ clientTypeLabel(detail.source_client) }}</n-descriptions-item>
          <n-descriptions-item label="企业 ID">{{ detail.company_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="用户 ID">{{ detail.user_id }}</n-descriptions-item>
          <n-descriptions-item label="设备 ID">{{ detail.device_fingerprint_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ objectTypeLabel(detail.object_type) }}</n-descriptions-item>
          <n-descriptions-item label="项目 UUID">{{ detail.project_uuid || '-' }}</n-descriptions-item>
          <n-descriptions-item label="工程编号">{{ detail.project_code || '-' }}</n-descriptions-item>
          <n-descriptions-item label="大小">{{ formatBytes(detail.size_bytes) }}</n-descriptions-item>
          <n-descriptions-item label="MIME">{{ detail.mime_type || '-' }}</n-descriptions-item>
          <n-descriptions-item label="上传状态">{{ uploadStatusLabel(detail.upload_status) }}</n-descriptions-item>
          <n-descriptions-item label="解析状态">{{ parseStatusLabel(detail.parse_status) }}</n-descriptions-item>
          <n-descriptions-item label="接收时间">{{ formatDateTime(detail.server_received_at) }}</n-descriptions-item>
          <n-descriptions-item label="更新时间">{{ formatDateTime(detail.updated_at) }}</n-descriptions-item>
          <n-descriptions-item label="SHA-256" :span="2">
            <span class="mono">{{ detail.sha256 || '-' }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="存储键" :span="2">
            <span class="mono">{{ detail.storage_key || '-' }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="失败原因" :span="2">{{ detail.parse_message || '-' }}</n-descriptions-item>
        </n-descriptions>
        <template #footer>
          <div class="drawer-footer">
            <n-button v-if="detail" @click="downloadRow(detail)">下载</n-button>
            <n-button v-if="detail?.project_uuid" @click="goProject(detail)">关联项目</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { syncFileApi } from '@/api/syncFile'
import { useAuthStore } from '@/stores/auth'
import type { ClientFileItem, SyncFileListParams } from '@/types/api'
import { formatBytes, formatDateTime, shortHash } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import {
  clientTypeLabel,
  objectTypeLabel,
  objectTypeOptions,
  parseStatusLabel,
  parseStatusOptions,
  uploadStatusLabel,
  uploadStatusOptions,
} from '@/utils/labels'
import { pageList, queryValue } from '@/utils/query'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()
const loading = ref(false)
const rows = ref<ClientFileItem[]>([])
const detail = ref<ClientFileItem | null>(null)
const detailVisible = ref(false)
const companyOptions = ref<SelectOption[]>([])

const filters = reactive<SyncFileListParams>({
  page: 1,
  page_size: 20,
  company_id: null,
  object_type: '',
  project_uuid: '',
  project_code: '',
  upload_status: '',
  parse_status: '',
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

function statusTagType(status: string) {
  if (status === 'uploaded' || status === 'parsed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'default'
  return 'warning'
}

const columns: DataTableColumns<ClientFileItem> = [
  { title: '上传时间', key: 'server_received_at', width: 170, render: (row) => formatDateTime(row.server_received_at || row.created_at) },
  { title: '来源端', key: 'source_client', width: 90, render: (row) => clientTypeLabel(row.source_client) },
  { title: '企业', key: 'company_id', width: 90, render: (row) => row.company_id ?? '-' },
  { title: '用户', key: 'user_id', width: 90 },
  { title: '设备', key: 'device_fingerprint_id', width: 90, render: (row) => row.device_fingerprint_id ?? '-' },
  { title: 'project_uuid', key: 'project_uuid', minWidth: 210, render: (row) => h('span', { class: 'mono' }, row.project_uuid || '-') },
  { title: '编号', key: 'project_code', width: 130, render: (row) => row.project_code || '-' },
  { title: '类型', key: 'object_type', width: 110, render: (row) => objectTypeLabel(row.object_type) },
  { title: '原名', key: 'original_filename', minWidth: 180, render: (row) => row.original_filename || row.safe_filename || '-' },
  { title: '大小', key: 'size_bytes', width: 100, render: (row) => formatBytes(row.size_bytes) },
  { title: 'SHA-256', key: 'sha256', width: 170, render: (row) => h('span', { class: 'mono' }, shortHash(row.sha256)) },
  {
    title: '上传',
    key: 'upload_status',
    width: 100,
    render: (row) => h(NTag, { type: statusTagType(row.upload_status), round: true }, { default: () => uploadStatusLabel(row.upload_status) }),
  },
  {
    title: '解析',
    key: 'parse_status',
    width: 110,
    render: (row) => h(NTag, { type: statusTagType(row.parse_status), round: true }, { default: () => parseStatusLabel(row.parse_status) }),
  },
  { title: '失败原因', key: 'parse_message', minWidth: 160, render: (row) => row.parse_message || '-' },
  {
    title: '操作',
    key: 'actions',
    width: 270,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
        h(NButton, { size: 'small', onClick: () => downloadRow(row) }, { default: () => '下载' }),
        row.project_uuid ? h(NButton, { size: 'small', onClick: () => goProject(row) }, { default: () => '项目' }) : null,
        authStore.isSuperAdmin
          ? h(
              NPopconfirm,
              { onPositiveClick: () => reparse(row) },
              {
                trigger: () => h(NButton, { size: 'small', type: 'warning', ghost: true }, { default: () => '重解析' }),
                default: () => `确认重新解析 ${row.original_filename || row.file_id}？`,
              },
            )
          : null,
        authStore.isSuperAdmin
          ? h(
              NPopconfirm,
              { onPositiveClick: () => deleteRow(row) },
              {
                trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '删除' }),
                default: () => `确认归档/删除 ${row.original_filename || row.file_id}？`,
              },
            )
          : null,
      ]),
  },
]

async function loadCompanies() {
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = pageList(result.list).map((item) => ({ label: item.company_name, value: item.id }))
}

function currentParams() {
  return {
    ...filters,
    page: pagination.page,
    page_size: pagination.pageSize,
    company_id: queryValue(filters.company_id),
    object_type: queryValue(filters.object_type),
    project_uuid: queryValue(filters.project_uuid),
    project_code: queryValue(filters.project_code),
    upload_status: queryValue(filters.upload_status),
    parse_status: queryValue(filters.parse_status),
  }
}

async function fetchList() {
  loading.value = true
  try {
    const result = await syncFileApi.list(currentParams())
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, {
    company_id: null,
    object_type: '',
    project_uuid: '',
    project_code: '',
    upload_status: '',
    parse_status: '',
  })
  pagination.page = 1
  fetchList()
}

function applyQueryFilters() {
  const { upload_status: uploadStatus, parse_status: parseStatus, object_type: objectType, project_uuid: projectUuid, project_code: projectCode } = route.query
  if (typeof uploadStatus === 'string') filters.upload_status = uploadStatus
  if (typeof parseStatus === 'string') filters.parse_status = parseStatus
  if (typeof objectType === 'string') filters.object_type = objectType
  if (typeof projectUuid === 'string') filters.project_uuid = projectUuid
  if (typeof projectCode === 'string') filters.project_code = projectCode
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

async function reparse(row: ClientFileItem) {
  await syncFileApi.reparse(row.file_id)
  message.success('已提交重解析')
  await fetchList()
}

async function deleteRow(row: ClientFileItem) {
  await syncFileApi.delete(row.file_id)
  message.success('文件索引已删除')
  await fetchList()
}

function goProject(row: ClientFileItem) {
  router.push({ name: 'projects', query: { keyword: row.project_uuid || row.project_code } })
}

watch(
  () => route.query,
  () => {
    applyQueryFilters()
    pagination.page = 1
    fetchList()
  },
)

onMounted(async () => {
  applyQueryFilters()
  await Promise.all([loadCompanies(), fetchList()])
})
</script>
