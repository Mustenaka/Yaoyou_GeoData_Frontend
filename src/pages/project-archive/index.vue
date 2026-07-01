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
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import { companyApi } from '@/api/company'
import type { ProjectArchiveItem } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const rows = ref<ProjectArchiveItem[]>([])
const companyOptions = ref<SelectOption[]>([])

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

async function loadCompanies() {
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = pageList(result.list).map((item) => ({ label: item.company_name, value: item.id }))
}

async function fetchList() {
  loading.value = true
  try {
    const result = await archiveApi.listProjects({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: queryValue(filters.company_id),
      keyword: queryValue(filters.keyword),
    })
    rows.value = pageList(result.list)
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

function openDetail(row: ProjectArchiveItem) {
  router.push({ name: 'project-detail', params: { id: row.id } })
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
