<template>
  <div class="page-shell">
    <PageHeader title="操作记录" subtitle="按企业、用户、设备、项目、模块、操作和结果检索审计事件。" />

    <div class="page-card toolbar">
      <n-select v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-input v-model:value="filters.user_id_text" clearable placeholder="用户 ID" style="width: 110px" @keyup.enter="fetchList" />
      <n-input v-model:value="filters.device_id_text" clearable placeholder="设备 ID" style="width: 110px" @keyup.enter="fetchList" />
      <n-input v-model:value="filters.project_uuid" clearable placeholder="project_uuid" style="width: 220px" @keyup.enter="fetchList" />
      <n-input v-model:value="filters.module" clearable placeholder="模块" style="width: 120px" @keyup.enter="fetchList" />
      <n-input v-model:value="filters.action" clearable placeholder="操作" style="width: 120px" @keyup.enter="fetchList" />
      <n-select v-model:value="filters.result" clearable :options="auditResultOptions" placeholder="结果" style="width: 110px" />
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
        :row-key="(row: OperationAuditEvent) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
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
import { h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { auditApi } from '@/api/audit'
import { companyApi } from '@/api/company'
import type { OperationAuditEvent } from '@/types/api'
import { compactText, formatDateTime } from '@/utils/format'
import { auditResultLabel, auditResultOptions } from '@/utils/labels'

const loading = ref(false)
const rows = ref<OperationAuditEvent[]>([])
const detail = ref<OperationAuditEvent | null>(null)
const detailVisible = ref(false)
const companyOptions = ref<SelectOption[]>([])

const filters = reactive({
  company_id: null as number | null,
  user_id_text: '',
  device_id_text: '',
  project_uuid: '',
  module: '',
  action: '',
  result: '',
})

const pagination = reactive<PaginationProps>({
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

const columns: DataTableColumns<OperationAuditEvent> = [
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
    const result = await auditApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: filters.company_id || undefined,
      user_id: numberFilter(filters.user_id_text),
      device_fingerprint_id: numberFilter(filters.device_id_text),
      project_uuid: filters.project_uuid || undefined,
      module: filters.module || undefined,
      action: filters.action || undefined,
      result: filters.result || undefined,
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
    module: '',
    action: '',
    result: '',
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

onMounted(async () => {
  await Promise.all([loadCompanies(), fetchList()])
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
