<template>
  <div class="page-shell">
    <PageHeader :title="`${clientLabel}日志`" :subtitle="`查看${clientLabel}上传的运行日志和操作记录，按上传类型、设备与账号分层收纳。`" />

    <div class="page-card toolbar log-toolbar">
      <n-select v-if="authStore.isBackOfficeScopeAll" v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" class="filter-select wide" />
      <n-select v-model:value="filters.object_type" clearable :options="clientLogTypeOptions" placeholder="上传类型" class="filter-select" />
      <n-select v-model:value="filters.client_type" :options="clientOptions" placeholder="客户端" class="filter-select" disabled />
      <n-input v-model:value="filters.user_id_text" clearable placeholder="用户 ID" class="short-input" @keyup.enter="fetchLogs" />
      <n-input v-model:value="filters.device_id_text" clearable placeholder="设备 ID" class="short-input" @keyup.enter="fetchLogs" />
      <n-date-picker v-model:value="filters.time_range" type="datetimerange" clearable class="date-input" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchLogs">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </div>

    <section class="page-card log-panel">
      <div class="log-panel__head">
        <div>
          <strong>{{ clientLabel }}上传日志</strong>
          <span>日志默认不挂项目，按上传类型与设备 / 账号归档。</span>
        </div>
        <n-tag round>{{ pagination.itemCount }} 条</n-tag>
      </div>

      <n-spin :show="loading">
        <n-empty v-if="groupedSections.length === 0" :description="`暂无${clientLabel}日志`" />
        <n-collapse v-else v-model:expanded-names="expandedTypes" class="log-collapse">
          <n-collapse-item v-for="section in groupedSections" :key="section.key" :name="section.key">
            <template #header>
              <div class="section-header">
                <span>{{ section.title }}</span>
                <n-tag size="small" round>{{ section.count }} 条</n-tag>
              </div>
            </template>

            <n-collapse v-model:expanded-names="expandedGroups" class="device-collapse">
              <n-collapse-item v-for="group in section.groups" :key="group.key" :name="group.key">
                <template #header>
                  <div class="group-header">
                    <span>{{ group.title }}</span>
                    <small>{{ group.subtitle }}</small>
                    <n-tag size="small" round>{{ group.rows.length }} 条</n-tag>
                  </div>
                </template>

                <n-data-table
                  size="small"
                  :columns="columns"
                  :data="group.rows"
                  :pagination="false"
                  :row-key="(row: ClientLogItem) => row.id"
                  :scroll-x="1040"
                />
              </n-collapse-item>
            </n-collapse>
          </n-collapse-item>
        </n-collapse>
      </n-spin>

      <div class="pagination-row">
        <n-pagination
          v-model:page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.itemCount"
          :page-sizes="pagination.pageSizes"
          show-size-picker
          @update:page="handlePage"
          @update:page-size="handlePageSize"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { logApi } from '@/api/log'
import { useAuthStore } from '@/stores/auth'
import type { ClientLogItem, ClientLogListParams, ClientLogObjectType, ClientType } from '@/types/api'
import { saveBlob } from '@/utils/download'
import { formatBytes, formatDateTime, shortHash } from '@/utils/format'
import { clientLogTypeLabel, clientLogTypeOptions, clientTypeLabel, parseStatusLabel } from '@/utils/labels'
import { pageList, queryValue } from '@/utils/query'

const props = withDefaults(defineProps<{ clientType?: Extract<ClientType, 'mobile' | 'win'> }>(), {
  clientType: 'mobile',
})

type GroupedLogSection = {
  key: string
  title: string
  count: number
  groups: GroupedLogBucket[]
}

type GroupedLogBucket = {
  key: string
  title: string
  subtitle: string
  rows: ClientLogItem[]
}

const authStore = useAuthStore()
const message = useMessage()
const loading = ref(false)
const downloadingId = ref<number | null>(null)
const rows = ref<ClientLogItem[]>([])
const companyOptions = ref<SelectOption[]>([])
const expandedTypes = ref<string[]>([])
const expandedGroups = ref<string[]>([])

const clientOptions = computed<Array<{ label: string; value: ClientType }>>(() => [
  { label: props.clientType === 'win' ? 'Win' : 'Mobile', value: props.clientType },
])
const clientLabel = computed(() => (props.clientType === 'win' ? 'Win' : '移动端'))

const filters = reactive({
  company_id: null as number | null,
  object_type: null as ClientLogObjectType | null,
  client_type: props.clientType as ClientType,
  user_id_text: '',
  device_id_text: '',
  time_range: null as [number, number] | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const columns: DataTableColumns<ClientLogItem> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.server_received_at || row.created_at) },
  { title: '企业', key: 'company', width: 150, render: (row) => companyLabel(row) },
  { title: '设备', key: 'device', width: 180, render: (row) => deviceLabel(row) },
  { title: '账号', key: 'user', width: 150, render: (row) => userLabel(row) },
  { title: '客户端', key: 'client_type', width: 90, render: (row) => clientTypeLabel(row.client_type) },
  { title: '版本', key: 'app_version', width: 110, render: (row) => row.app_version || '-' },
  { title: '文件', key: 'file_name', minWidth: 220, ellipsis: { tooltip: true }, render: (row) => fileName(row) },
  { title: '大小', key: 'size_bytes', width: 100, render: (row) => formatBytes(row.size_bytes) },
  {
    title: '解析',
    key: 'parse_status',
    width: 100,
    render: (row) => h(NTag, { type: parseTagType(row.parse_status), round: true }, { default: () => parseStatusLabel(row.parse_status) }),
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) =>
      h(
        NButton,
        { size: 'small', loading: downloadingId.value === row.id, onClick: () => downloadLog(row) },
        { default: () => '下载' },
      ),
  },
]

const groupedSections = computed<GroupedLogSection[]>(() => {
  const sectionMap = new Map<string, Map<string, ClientLogItem[]>>()
  for (const row of rows.value) {
    const typeKey = row.object_type || 'client_log'
    if (!sectionMap.has(typeKey)) sectionMap.set(typeKey, new Map())
    const bucketKey = `${typeKey}:${row.device_fingerprint_id ?? 'none'}:${row.user_id || 'none'}`
    const bucket = sectionMap.get(typeKey)!
    if (!bucket.has(bucketKey)) bucket.set(bucketKey, [])
    bucket.get(bucketKey)!.push(row)
  }

  return Array.from(sectionMap.entries()).map(([typeKey, bucketMap]) => {
    const groups = Array.from(bucketMap.entries()).map(([key, groupRows]) => {
      const first = groupRows[0]
      return {
        key,
        title: deviceLabel(first),
        subtitle: userLabel(first),
        rows: groupRows,
      }
    })
    return {
      key: typeKey,
      title: clientLogTypeLabel(typeKey),
      count: groups.reduce((total, group) => total + group.rows.length, 0),
      groups,
    }
  })
})

function syncExpandedNames() {
  expandedTypes.value = groupedSections.value.map((section) => section.key)
  expandedGroups.value = groupedSections.value.flatMap((section) => section.groups.map((group) => group.key))
}

function numberFilter(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function timeAt(index: 0 | 1) {
  const value = filters.time_range?.[index]
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function companyLabel(row: ClientLogItem) {
  return row.company?.company_name || row.company_name || (row.company_id ? `企业 #${row.company_id}` : '未归属')
}

function deviceLabel(row: ClientLogItem) {
  const id = row.device_fingerprint_id
  const name = row.device?.device_name || ''
  const hash = row.device?.fingerprint_hash ? shortHash(row.device.fingerprint_hash, 8, 6) : ''
  if (name && id) return `${name} #${id}`
  if (id) return hash ? `设备 #${id} · ${hash}` : `设备 #${id}`
  return '未绑定设备'
}

function userLabel(row: ClientLogItem) {
  const name = row.user?.real_name || row.user?.username || row.username || ''
  if (name && row.user_id) return `${name} #${row.user_id}`
  if (row.user_id) return `用户 #${row.user_id}`
  return '未绑定账号'
}

function fileName(row: ClientLogItem) {
  return row.file_name || row.original_filename || row.safe_filename || row.file_id || '-'
}

function parseTagType(status?: string): 'success' | 'error' | 'default' | 'warning' {
  if (status === 'parsed') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'default'
  return 'warning'
}

async function loadCompanies() {
  if (!authStore.isBackOfficeScopeAll) return
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = pageList(result.list).map((item) => ({ label: item.company_name, value: item.id }))
}

async function fetchLogs() {
  loading.value = true
  try {
    const params: ClientLogListParams = {
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: queryValue(filters.company_id),
      object_type: queryValue(filters.object_type),
      client_type: props.clientType,
      user_id: numberFilter(filters.user_id_text),
      device_fingerprint_id: numberFilter(filters.device_id_text),
      start_at: timeAt(0),
      end_at: timeAt(1),
    }
    const result = await logApi.clientList(params)
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
    syncExpandedNames()
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.company_id = null
  filters.object_type = null
  filters.client_type = props.clientType
  filters.user_id_text = ''
  filters.device_id_text = ''
  filters.time_range = null
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

async function downloadLog(row: ClientLogItem) {
  downloadingId.value = row.id
  try {
    const blob = await logApi.clientDownload(row.id)
    saveBlob(blob, fileName(row))
    message.success('下载已开始')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下载失败')
  } finally {
    downloadingId.value = null
  }
}

onMounted(() => {
  void loadCompanies()
  void fetchLogs()
})

watch(
  () => props.clientType,
  (clientType) => {
    filters.client_type = clientType
    pagination.page = 1
    expandedTypes.value = []
    expandedGroups.value = []
    void fetchLogs()
  },
)
</script>

<style scoped>
.log-toolbar {
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  width: 140px;
}

.filter-select.wide {
  width: 210px;
}

.short-input {
  width: 112px;
}

.date-input {
  width: 320px;
}

.log-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.log-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.log-panel__head > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-panel__head span,
.group-header small {
  color: var(--text-muted);
  font-size: 13px;
}

.log-collapse,
.device-collapse {
  --n-title-font-size: 14px;
}

.section-header,
.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.section-header span,
.group-header span {
  font-weight: 600;
}

.group-header {
  flex-wrap: wrap;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 920px) {
  .date-input {
    width: 100%;
  }

  .filter-select,
  .filter-select.wide,
  .short-input {
    flex: 1 1 150px;
  }
}
</style>
