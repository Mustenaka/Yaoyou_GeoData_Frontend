<template>
  <div class="page-shell">
    <PageHeader title="项目档案" subtitle="按企业、设备、项目逐级查看云端上行档案；也可按关键词直接检索项目。" />

    <div class="page-card toolbar archive-toolbar">
      <n-input
        v-model:value="keyword"
        clearable
        placeholder="搜索 project_uuid / 编号 / 名称 / 委托单位"
        class="archive-toolbar__search"
        @keyup.enter="runSearch"
      />
      <n-button type="primary" @click="runSearch">搜索</n-button>
      <n-button v-if="searchMode" quaternary @click="clearSearch">返回逐级档案</n-button>
      <div class="toolbar__spacer" />
      <n-button :loading="loading" @click="refreshCurrent">刷新</n-button>
    </div>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <div class="page-card archive-nav">
      <n-breadcrumb>
        <n-breadcrumb-item :clickable="!searchMode" @click="goCompanies">企业</n-breadcrumb-item>
        <n-breadcrumb-item v-if="selectedCompany && !searchMode" clickable @click="goDevices">
          设备：{{ companyDisplayName(selectedCompany) }}
        </n-breadcrumb-item>
        <n-breadcrumb-item v-if="selectedDevice && !searchMode">
          项目：{{ deviceDisplayName(selectedDevice) }}
        </n-breadcrumb-item>
        <n-breadcrumb-item v-if="searchMode">关键词：{{ normalizedKeyword }}</n-breadcrumb-item>
      </n-breadcrumb>
    </div>

    <div v-if="searchMode" class="page-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">项目搜索结果</div>
          <div class="panel-subtitle">点击项目进入详情；清空关键词可回到逐级档案。</div>
        </div>
        <n-tag round>{{ searchPagination.itemCount || 0 }} 项</n-tag>
      </div>
      <n-data-table
        remote
        :columns="searchColumns"
        :data="searchRows"
        :loading="loading"
        :pagination="searchPagination"
        :row-key="(row: ProjectArchiveItem) => row.id"
        :row-props="searchRowProps"
        @update:page="handleSearchPage"
        @update:page-size="handleSearchPageSize"
      >
        <template #empty>
          <n-empty description="没有匹配项目" />
        </template>
      </n-data-table>
    </div>

    <div v-else-if="level === 'companies'" class="page-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">企业</div>
          <div class="panel-subtitle">选择企业后查看该企业下的设备与上行项目。</div>
        </div>
        <n-tag round>{{ companies.length }} 家</n-tag>
      </div>
      <n-data-table
        :columns="companyColumns"
        :data="companies"
        :loading="loading"
        :pagination="false"
        :row-key="companyRowKey"
        :row-props="companyRowProps"
      >
        <template #empty>
          <n-empty description="暂无企业档案" />
        </template>
      </n-data-table>
    </div>

    <div v-else-if="level === 'devices'" class="page-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">{{ selectedCompany ? companyDisplayName(selectedCompany) : '-' }} / 设备</div>
          <div class="panel-subtitle">仅展示后端返回的设备指纹脱敏值。</div>
        </div>
        <n-tag round>{{ devices.length }} 台</n-tag>
      </div>
      <n-data-table
        :columns="deviceColumns"
        :data="devices"
        :loading="loading"
        :pagination="false"
        :row-key="(row: ArchiveDeviceItem) => row.device_fingerprint_id"
        :scroll-x="1470"
        :row-props="deviceRowProps"
      >
        <template #empty>
          <n-empty description="该企业暂无设备档案" />
        </template>
      </n-data-table>
    </div>

    <div v-else class="page-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">{{ selectedDevice ? deviceDisplayName(selectedDevice) : '-' }} / 项目</div>
          <div class="panel-subtitle">按设备上行文件关联到项目档案，点击项目进入详情。</div>
        </div>
        <n-tag round>{{ projectPagination.itemCount || 0 }} 项</n-tag>
      </div>
      <n-data-table
        remote
        :columns="projectColumns"
        :data="deviceProjects"
        :loading="loading"
        :pagination="projectPagination"
        :row-key="(row: ArchiveDeviceProjectItem) => row.id"
        :row-props="projectRowProps"
        @update:page="handleProjectPage"
        @update:page-size="handleProjectPageSize"
      >
        <template #empty>
          <n-empty description="该设备暂无项目档案" />
        </template>
      </n-data-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { NButton, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import { deviceApi } from '@/api/device'
import type { ArchiveCompanyItem, ArchiveDeviceItem, ArchiveDeviceProjectItem, ProjectArchiveItem } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'
import {
  authStatusLabel,
  clientTypeLabel,
  deviceStatusLabel,
  projectLifecycleDisplayText,
  projectLifecycleTagType,
} from '@/utils/labels'

type ArchiveLevel = 'companies' | 'devices' | 'projects'
type TagType = 'default' | 'success' | 'warning' | 'error' | 'info'

const route = useRoute()
const router = useRouter()
const dialog = useDialog()
const message = useMessage()
const loading = ref(false)
const deletingDeviceId = ref<number | null>(null)
const errorText = ref('')
const keyword = ref('')
const searchMode = ref(false)
const level = ref<ArchiveLevel>('companies')

const companies = ref<ArchiveCompanyItem[]>([])
const devices = ref<ArchiveDeviceItem[]>([])
const deviceProjects = ref<ArchiveDeviceProjectItem[]>([])
const searchRows = ref<ProjectArchiveItem[]>([])
const selectedCompany = ref<ArchiveCompanyItem | null>(null)
const selectedDevice = ref<ArchiveDeviceItem | null>(null)

const normalizedKeyword = computed(() => keyword.value.trim())

const projectPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const searchPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const companyColumns: DataTableColumns<ArchiveCompanyItem> = [
  { title: '企业', key: 'company_name', minWidth: 220, render: (row) => companyDisplayName(row) },
  { title: '设备数', key: 'device_count', width: 110 },
  { title: '项目数', key: 'project_count', width: 110 },
  { title: '最近同步', key: 'last_uploaded_at', width: 190, render: (row) => formatDateTime(row.last_uploaded_at) },
  {
    title: '操作',
    key: 'actions',
    width: 110,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: (event: MouseEvent) => openCompany(row, event) }, { default: () => '查看设备' }),
  },
]

const deviceColumns: DataTableColumns<ArchiveDeviceItem> = [
  { title: '设备', key: 'device_name', minWidth: 180, render: deviceDisplayName },
  { title: '端', key: 'client_type', width: 90, render: (row) => clientTypeLabel(row.client_type) },
  {
    title: '指纹',
    key: 'fingerprint_hash_masked',
    minWidth: 170,
    render: (row) => h('span', { class: 'mono' }, row.fingerprint_hash_masked || '-'),
  },
  {
    title: '设备状态',
    key: 'status',
    width: 110,
    render: (row) => h(NTag, { type: deviceTagType(row.status), round: true }, { default: () => deviceStatusLabel(row.status) }),
  },
  {
    title: '授权状态',
    key: 'authorization_status',
    width: 110,
    render: (row) => h(NTag, { type: authTagType(row.authorization_status), round: true }, { default: () => authStatusLabel(row.authorization_status) }),
  },
  { title: '有效期', key: 'valid_until', width: 170, render: (row) => formatDateTime(row.valid_until) },
  { title: '最近在线', key: 'last_seen_at', width: 170, render: (row) => formatDateTime(row.last_seen_at) },
  { title: '项目数', key: 'project_count', width: 90 },
  { title: '最近同步', key: 'last_uploaded_at', width: 170, render: (row) => formatDateTime(row.last_uploaded_at) },
  {
    title: '操作',
    key: 'actions',
    width: 210,
    fixed: 'right',
    render: (row) => h('div', { class: 'table-actions' }, [
      h(NButton, { size: 'small', onClick: (event: MouseEvent) => openDevice(row, event) }, { default: () => '查看项目' }),
      h(NButton, {
        size: 'small',
        type: 'error',
        loading: deletingDeviceId.value === row.device_fingerprint_id,
        onClick: (event: MouseEvent) => confirmDeleteDevice(row, event),
      }, { default: () => '删除设备' }),
    ]),
  },
]

const projectColumns: DataTableColumns<ArchiveDeviceProjectItem> = [
  { title: '编号', key: 'project_code', minWidth: 130, render: (row) => row.project_code || '-' },
  { title: '名称', key: 'project_name', minWidth: 180, render: (row) => row.project_name || '-' },
  { title: '委托单位', key: 'client_name', minWidth: 160, render: (row) => row.client_name || '-' },
  { title: '状态', key: 'lifecycle_status', width: 170, render: renderProjectLifecycleTag },
  { title: '表单类型', key: 'form_types', minWidth: 180, render: (row) => formTypesText(row.form_types) },
  { title: '行数', key: 'row_count_total', width: 90 },
  { title: '样本数', key: 'sample_count_total', width: 90 },
  { title: '最近同步', key: 'last_uploaded_at', width: 170, render: (row) => formatDateTime(row.last_uploaded_at) },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: (event: MouseEvent) => openDetail(row, event) }, { default: () => '详情' }),
  },
]

const searchColumns: DataTableColumns<ProjectArchiveItem> = [
  { title: 'project_uuid', key: 'project_uuid', minWidth: 220, render: (row) => h('span', { class: 'mono' }, row.project_uuid || '-') },
  { title: '编号', key: 'project_code', width: 130, render: (row) => row.project_code || '-' },
  { title: '名称', key: 'project_name', minWidth: 180, render: (row) => row.project_name || '-' },
  { title: '委托单位', key: 'client_name', minWidth: 160, render: (row) => row.client_name || '-' },
  { title: '状态', key: 'lifecycle_status', width: 170, render: renderProjectLifecycleTag },
  { title: '企业', key: 'company_id', width: 90, render: (row) => row.company_id ?? '-' },
  { title: '最近同步', key: 'last_uploaded_at', width: 170, render: (row) => formatDateTime(row.last_uploaded_at || row.updated_at) },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: (event: MouseEvent) => openDetail(row, event) }, { default: () => '详情' }),
  },
]

async function loadCompanies(autoEnter = false) {
  loading.value = true
  errorText.value = ''
  try {
    const result = await archiveApi.listArchiveCompanies()
    companies.value = result
    if (autoEnter && result.length === 1) {
      await selectCompany(result[0])
    }
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '企业档案加载失败'
  } finally {
    loading.value = false
  }
}

async function loadDevices() {
  if (!selectedCompany.value) return
  loading.value = true
  errorText.value = ''
  try {
    devices.value = await archiveApi.listCompanyDevices(companyParam(selectedCompany.value))
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '设备档案加载失败'
  } finally {
    loading.value = false
  }
}

async function loadDeviceProjects() {
  if (!selectedDevice.value) return
  loading.value = true
  errorText.value = ''
  try {
    const result = await archiveApi.listDeviceProjects(selectedDevice.value.device_fingerprint_id, {
      page: projectPagination.page,
      page_size: projectPagination.pageSize,
    })
    deviceProjects.value = pageList(result.list)
    projectPagination.itemCount = result.total
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '项目档案加载失败'
  } finally {
    loading.value = false
  }
}

async function loadSearch() {
  if (!normalizedKeyword.value) {
    clearSearch()
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    const result = await archiveApi.listProjects({
      page: searchPagination.page,
      page_size: searchPagination.pageSize,
      keyword: queryValue(normalizedKeyword.value),
    })
    searchRows.value = pageList(result.list)
    searchPagination.itemCount = result.total
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '项目搜索失败'
  } finally {
    loading.value = false
  }
}

async function selectCompany(row: ArchiveCompanyItem) {
  selectedCompany.value = row
  selectedDevice.value = null
  devices.value = []
  deviceProjects.value = []
  projectPagination.page = 1
  projectPagination.itemCount = 0
  level.value = 'devices'
  await loadDevices()
}

async function selectDevice(row: ArchiveDeviceItem) {
  selectedDevice.value = row
  deviceProjects.value = []
  projectPagination.page = 1
  projectPagination.itemCount = 0
  level.value = 'projects'
  await loadDeviceProjects()
}

function runSearch() {
  if (!normalizedKeyword.value) {
    clearSearch()
    return
  }
  searchMode.value = true
  searchPagination.page = 1
  loadSearch()
}

function clearSearch() {
  keyword.value = ''
  searchMode.value = false
  searchRows.value = []
  searchPagination.page = 1
  searchPagination.itemCount = 0
}

function refreshCurrent() {
  if (searchMode.value) {
    loadSearch()
    return
  }
  if (level.value === 'companies') {
    loadCompanies(false)
  } else if (level.value === 'devices') {
    loadDevices()
  } else {
    loadDeviceProjects()
  }
}

function goCompanies() {
  if (searchMode.value) return
  selectedCompany.value = null
  selectedDevice.value = null
  devices.value = []
  deviceProjects.value = []
  projectPagination.page = 1
  projectPagination.itemCount = 0
  level.value = 'companies'
  if (!companies.value.length) {
    loadCompanies(false)
  }
}

function goDevices() {
  if (searchMode.value || !selectedCompany.value) return
  selectedDevice.value = null
  deviceProjects.value = []
  projectPagination.page = 1
  projectPagination.itemCount = 0
  level.value = 'devices'
  if (!devices.value.length) {
    loadDevices()
  }
}

function handleProjectPage(page: number) {
  projectPagination.page = page
  loadDeviceProjects()
}

function handleProjectPageSize(pageSize: number) {
  projectPagination.pageSize = pageSize
  projectPagination.page = 1
  loadDeviceProjects()
}

function handleSearchPage(page: number) {
  searchPagination.page = page
  loadSearch()
}

function handleSearchPageSize(pageSize: number) {
  searchPagination.pageSize = pageSize
  searchPagination.page = 1
  loadSearch()
}

function openCompany(row: ArchiveCompanyItem, event?: MouseEvent) {
  event?.stopPropagation()
  selectCompany(row)
}

function openDevice(row: ArchiveDeviceItem, event?: MouseEvent) {
  event?.stopPropagation()
  selectDevice(row)
}

function deviceDisplayName(row: ArchiveDeviceItem) {
  if (row.device_alias) {
    return row.device_name ? `${row.device_alias}（${row.device_name}）` : row.device_alias
  }
  return row.device_name || row.fingerprint_hash_masked || `设备 #${row.device_fingerprint_id}`
}

function confirmDeleteDevice(row: ArchiveDeviceItem, event?: MouseEvent) {
  event?.stopPropagation()
  dialog.error({
    title: '永久删除设备及关联数据',
    content: `将永久删除“${deviceDisplayName(row)}”，自动取消授权，并清除关联的 Mobile/Win 项目、数据、配置、日志和文件。共同使用过的关联项目也会整项删除，且不可恢复。`,
    positiveText: '确认永久删除',
    negativeText: '取消',
    async onPositiveClick() {
      deletingDeviceId.value = row.device_fingerprint_id
      try {
        const result = await deviceApi.remove(row.device_fingerprint_id)
        message.success(`设备已删除，共清理 ${result.projects_deleted} 个项目、${result.files_deleted} 个文件记录`)
        await loadDevices()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '设备删除失败')
        return false
      } finally {
        deletingDeviceId.value = null
      }
      return true
    },
  })
}

function openDetail(row: ProjectArchiveItem, event?: MouseEvent) {
  event?.stopPropagation()
  router.push({ name: 'project-detail', params: { id: row.id } })
}

function companyParam(row: ArchiveCompanyItem): number | 'null' {
  return row.company_id === null ? 'null' : row.company_id
}

function companyDisplayName(row: ArchiveCompanyItem) {
  if (row.company_id === null) return row.company_name || '未归属'
  return row.company_name || `企业 #${row.company_id}`
}

function companyRowKey(row: ArchiveCompanyItem) {
  return row.company_id === null ? 'null' : String(row.company_id)
}

function formTypesText(formTypes: string[]) {
  return formTypes.length ? formTypes.join(', ') : '-'
}

function renderProjectLifecycleTag(row: ProjectArchiveItem) {
  return h(
    NTag,
    { type: projectLifecycleTagType(row.lifecycle_status), round: true },
    { default: () => projectLifecycleDisplayText(row.lifecycle_status, row.purge_after) },
  )
}

function deviceTagType(status?: string): TagType {
  if (status === 'active') return 'success'
  if (status === 'blocked') return 'error'
  if (status === 'disabled') return 'warning'
  return 'default'
}

function authTagType(status?: string): TagType {
  if (status === 'active') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'revoked' || status === 'expired') return 'error'
  return 'default'
}

function clickableRow<T>(onClick: () => void) {
  return {
    style: 'cursor: pointer',
    onClick,
  }
}

function companyRowProps(row: ArchiveCompanyItem) {
  return clickableRow(() => selectCompany(row))
}

function deviceRowProps(row: ArchiveDeviceItem) {
  return clickableRow(() => selectDevice(row))
}

function projectRowProps(row: ArchiveDeviceProjectItem) {
  return clickableRow(() => openDetail(row))
}

function searchRowProps(row: ProjectArchiveItem) {
  return clickableRow(() => openDetail(row))
}

watch(
  () => route.query.keyword,
  (value) => {
    if (typeof value === 'string' && value.trim()) {
      keyword.value = value
      searchMode.value = true
      searchPagination.page = 1
      loadSearch()
    }
  },
)

watch(
  () => normalizedKeyword.value,
  (value) => {
    if (!value && searchMode.value) {
      clearSearch()
    }
  },
)

onMounted(async () => {
  if (typeof route.query.keyword === 'string' && route.query.keyword.trim()) {
    keyword.value = route.query.keyword
    searchMode.value = true
    await loadSearch()
    return
  }
  await loadCompanies(true)
})
</script>

<style scoped>
.archive-toolbar {
  align-items: center;
}

.archive-toolbar__search {
  width: min(460px, 100%);
}

.archive-nav {
  padding-top: 14px;
  padding-bottom: 14px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
}

.panel-subtitle {
  margin-top: 4px;
  color: var(--yy-text-secondary);
  font-size: 13px;
}

@media (max-width: 720px) {
  .archive-toolbar__search {
    width: 100%;
  }

  .panel-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
