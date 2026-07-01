<template>
  <div class="page-shell">
    <PageHeader title="服务器时间戳" subtitle="审计客户端上报时间、服务器时间、偏差和异常记录。" />

    <div class="page-card toolbar">
      <n-input v-model:value="filters.user_id_text" clearable placeholder="用户 ID" style="width: 110px" @keyup.enter="fetchList" />
      <n-select v-model:value="filters.client_type" clearable :options="clientTypeOptions" placeholder="客户端" style="width: 130px" />
      <n-select v-model:value="filters.abnormal" clearable :options="booleanFilterOptions" placeholder="仅异常" style="width: 120px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchList">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
      <n-button ghost @click="goTimeRisks">time_tamper 风险</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: ServerTimeLogItem) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="680">
      <n-drawer-content :title="detail ? `时间请求 #${detail.id}` : '时间请求'">
        <n-descriptions v-if="detail" label-placement="left" bordered :column="2">
          <n-descriptions-item label="请求时间">{{ formatDateTime(detail.created_at) }}</n-descriptions-item>
          <n-descriptions-item label="客户端">{{ clientTypeLabel(detail.client_type) }}</n-descriptions-item>
          <n-descriptions-item label="用户 ID">{{ detail.user_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="是否异常">{{ detail.is_abnormal ? '是' : '否' }}</n-descriptions-item>
          <n-descriptions-item label="客户端时间">{{ formatDateTime(detail.client_ts) }}</n-descriptions-item>
          <n-descriptions-item label="服务器时间">{{ formatDateTime(detail.server_ts) }}</n-descriptions-item>
          <n-descriptions-item label="时间差">{{ detail.delta_ms ?? '-' }} ms</n-descriptions-item>
          <n-descriptions-item label="IP">{{ detail.ip || '-' }}</n-descriptions-item>
          <n-descriptions-item label="Nonce" :span="2"><span class="mono">{{ detail.nonce || '-' }}</span></n-descriptions-item>
          <n-descriptions-item label="User-Agent" :span="2">{{ detail.user_agent || '-' }}</n-descriptions-item>
        </n-descriptions>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { NButton, NTag } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { securityApi } from '@/api/security'
import type { ServerTimeLogItem } from '@/types/api'
import { formatDateTime, shortHash } from '@/utils/format'
import { booleanFilterOptions, clientTypeLabel, clientTypeOptions } from '@/utils/labels'
import { pageList, queryValue } from '@/utils/query'

const router = useRouter()
const loading = ref(false)
const rows = ref<ServerTimeLogItem[]>([])
const detail = ref<ServerTimeLogItem | null>(null)
const detailVisible = ref(false)

const filters = reactive({
  user_id_text: '',
  client_type: '',
  abnormal: null as boolean | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const columns: DataTableColumns<ServerTimeLogItem> = [
  { title: '请求时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  { title: '客户端', key: 'client_type', width: 100, render: (row) => clientTypeLabel(row.client_type) },
  { title: '用户', key: 'user_id', width: 90, render: (row) => row.user_id ?? '-' },
  { title: '客户端时间', key: 'client_ts', width: 170, render: (row) => formatDateTime(row.client_ts) },
  { title: '服务器时间', key: 'server_ts', width: 170, render: (row) => formatDateTime(row.server_ts) },
  { title: '时间差', key: 'delta_ms', width: 110, render: (row) => (row.delta_ms === null || row.delta_ms === undefined ? '-' : `${row.delta_ms} ms`) },
  { title: 'Nonce', key: 'nonce', width: 150, render: (row) => h('span', { class: 'mono' }, shortHash(row.nonce, 8, 6)) },
  {
    title: '异常',
    key: 'is_abnormal',
    width: 90,
    render: (row) => h(NTag, { type: row.is_abnormal ? 'error' : 'success', round: true }, { default: () => (row.is_abnormal ? '是' : '否') }),
  },
  { title: 'IP', key: 'ip', width: 130, render: (row) => row.ip || '-' },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
  },
]

function numberFilter(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

async function fetchList() {
  loading.value = true
  try {
    const result = await securityApi.serverTimeLogs({
      page: pagination.page,
      page_size: pagination.pageSize,
      user_id: numberFilter(filters.user_id_text),
      client_type: queryValue(filters.client_type),
      abnormal: queryValue(filters.abnormal),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, {
    user_id_text: '',
    client_type: '',
    abnormal: null,
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

function openDetail(row: ServerTimeLogItem) {
  detail.value = row
  detailVisible.value = true
}

function goTimeRisks() {
  router.push({ name: 'risks', query: { risk_type: 'time_tamper' } })
}

onMounted(fetchList)
</script>
