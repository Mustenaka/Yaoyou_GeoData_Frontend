<template>
  <div class="page-shell">
    <PageHeader title="配置管理" subtitle="查看全局/项目配置快照、版本、来源文件和最新标记。" />

    <div class="page-card toolbar">
      <n-select v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-select v-model:value="filters.config_scope" clearable :options="configScopeOptions" placeholder="范围" style="width: 120px" />
      <n-select v-model:value="filters.config_type" clearable :options="configTypeOptions" placeholder="类型" style="width: 140px" />
      <n-select v-model:value="filters.is_latest" clearable :options="booleanFilterOptions" placeholder="是否最新" style="width: 130px" />
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
        :row-key="(row: ConfigSnapshotItem) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="760">
      <n-drawer-content :title="detail ? `配置快照 #${detail.id}` : '配置快照'">
        <n-descriptions v-if="detail" label-placement="left" bordered :column="2">
          <n-descriptions-item label="企业 ID">{{ detail.company_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="项目 UUID"><span class="mono">{{ detail.project_uuid || '-' }}</span></n-descriptions-item>
          <n-descriptions-item label="范围">{{ configScopeLabel(detail.config_scope) }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ configTypeLabel(detail.config_type) }}</n-descriptions-item>
          <n-descriptions-item label="版本">{{ detail.config_version || '-' }}</n-descriptions-item>
          <n-descriptions-item label="是否最新">{{ detail.is_latest ? '是' : '否' }}</n-descriptions-item>
          <n-descriptions-item label="来源文件">{{ detail.source_file_id || '-' }}</n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ formatDateTime(detail.created_at) }}</n-descriptions-item>
        </n-descriptions>

        <n-tabs v-if="detail" type="line" style="margin-top: 14px">
          <n-tab-pane name="summary" tab="摘要">
            <pre class="json-preview">{{ formatJSON(detail.summary_json || detail.snapshot_json) }}</pre>
          </n-tab-pane>
          <n-tab-pane name="snapshot" tab="原始快照">
            <pre class="json-preview">{{ formatJSON(detail.snapshot_json) }}</pre>
          </n-tab-pane>
        </n-tabs>

        <template #footer>
          <div class="drawer-footer">
            <n-button v-if="detail" @click="downloadConfig(detail)">下载 JSON</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import { companyApi } from '@/api/company'
import type { ConfigSnapshotItem } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { booleanFilterOptions, configScopeLabel, configScopeOptions, configTypeLabel, configTypeOptions } from '@/utils/labels'

const message = useMessage()
const loading = ref(false)
const rows = ref<ConfigSnapshotItem[]>([])
const detail = ref<ConfigSnapshotItem | null>(null)
const detailVisible = ref(false)
const companyOptions = ref<SelectOption[]>([])

const filters = reactive({
  company_id: null as number | null,
  project_uuid: '',
  config_scope: '',
  config_type: '',
  is_latest: null as boolean | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const columns: DataTableColumns<ConfigSnapshotItem> = [
  { title: '企业', key: 'company_id', width: 90, render: (row) => row.company_id ?? '-' },
  { title: '范围', key: 'config_scope', width: 90, render: (row) => configScopeLabel(row.config_scope) },
  { title: '类型', key: 'config_type', width: 120, render: (row) => configTypeLabel(row.config_type) },
  { title: '版本', key: 'config_version', width: 110, render: (row) => row.config_version || '-' },
  { title: 'project_uuid', key: 'project_uuid', minWidth: 210, render: (row) => h('span', { class: 'mono' }, row.project_uuid || '-') },
  { title: '来源文件', key: 'source_file_id', minWidth: 160, render: (row) => row.source_file_id || '-' },
  {
    title: '最新',
    key: 'is_latest',
    width: 80,
    render: (row) => h(NTag, { type: row.is_latest ? 'success' : 'default', round: true }, { default: () => (row.is_latest ? '是' : '否') }),
  },
  { title: '上传时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  {
    title: '操作',
    key: 'actions',
    width: 230,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
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

async function loadCompanies() {
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = result.list.map((item) => ({ label: item.company_name, value: item.id }))
}

async function fetchList() {
  loading.value = true
  try {
    const result = await archiveApi.listConfigs({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: filters.company_id || undefined,
      project_uuid: filters.project_uuid || undefined,
      config_scope: filters.config_scope || undefined,
      config_type: filters.config_type || undefined,
      is_latest: filters.is_latest,
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
    project_uuid: '',
    config_scope: '',
    config_type: '',
    is_latest: null,
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

async function openDetail(row: ConfigSnapshotItem) {
  detail.value = await archiveApi.configDetail(row.id)
  detailVisible.value = true
}

async function downloadConfig(row: ConfigSnapshotItem) {
  const blob = await archiveApi.downloadConfig(row.id)
  saveBlob(blob, `config-${row.id}-${row.config_type || 'snapshot'}.json`)
}

async function markLatest(row: ConfigSnapshotItem) {
  await archiveApi.markConfigLatest(row.id)
  message.success('已标记最新')
  await fetchList()
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
