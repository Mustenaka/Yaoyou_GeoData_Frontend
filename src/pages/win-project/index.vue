<template>
  <div class="page-shell">
    <PageHeader :title="`${kindLabel} 项目数据记录`" :subtitle="`${kindLabel} 项目由 .${projectKind === 'sky' ? 'sky' : 'Huaning'} 文件上行创建；此处只读展示已解析的项目元数据与数据源预览。`" />

    <div class="page-card toolbar project-toolbar">
      <n-select
        v-if="authStore.isBackOfficeScopeAll"
        v-model:value="filters.company_id"
        clearable
        :options="companyOptions"
        placeholder="企业"
        class="company-select"
        @update:value="applyFilters"
      />
      <n-input v-model:value="filters.keyword" clearable placeholder="项目 UUID / 编号 / 名称 / 委托单位" class="keyword-input" @keyup.enter="applyFilters" />
      <n-button type="primary" @click="applyFilters">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
      <div class="toolbar__spacer" />
      <n-button
        :type="hideUuid ? 'primary' : 'default'"
        :secondary="hideUuid"
        :aria-pressed="hideUuid"
        title="开启后隐藏列表、详情和项目摘要中的 UUID"
        @click="hideUuid = !hideUuid"
      >
        隐藏UUID
      </n-button>
      <n-button :loading="loading" @click="fetchProjects">刷新</n-button>
    </div>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      <div class="error-line">
        <span>{{ errorText }}</span>
        <n-button text type="primary" size="small" @click="fetchProjects">重试</n-button>
      </div>
    </n-alert>

    <section class="page-card">
      <div class="table-head">
        <div>
          <h2>已归集项目</h2>
          <p>详情展示解析摘要；“预览数据源”进入完整只读表格，可按数据源单独下载原始 XLSX。</p>
        </div>
        <n-tag round>{{ pagination.itemCount }} 项</n-tag>
      </div>
      <n-data-table
        remote
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: WinProjectListItem) => row.project.id"
        :scroll-x="tableScrollX"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      >
        <template #empty>
          <n-empty :description="loading ? '正在加载项目数据' : '暂无已归集项目'" />
        </template>
      </n-data-table>
    </section>

    <n-drawer v-model:show="detailVisible" :width="drawerWidth">
      <n-drawer-content :title="selected ? `${kindLabel} 项目详情` : '项目详情'" closable>
        <n-spin :show="detailLoading">
          <template v-if="detail">
            <n-descriptions label-placement="left" :column="1" bordered size="small">
              <n-descriptions-item label="项目名称">{{ detail.project.project_name || '-' }}</n-descriptions-item>
              <n-descriptions-item label="项目编号">{{ detail.project.project_code || '-' }}</n-descriptions-item>
              <n-descriptions-item v-if="!hideUuid" label="项目 UUID"><span class="mono">{{ detail.project.project_uuid }}</span></n-descriptions-item>
              <n-descriptions-item label="委托单位">{{ detail.project.client_name || '-' }}</n-descriptions-item>
              <n-descriptions-item label="创建时间">{{ formatProjectDateTime(detail.created_at) }}</n-descriptions-item>
              <n-descriptions-item label="最新修改时间">{{ formatProjectDateTime(detail.updated_at) }}</n-descriptions-item>
              <n-descriptions-item label="项目负责人">{{ detail.project.project_lead || '-' }}</n-descriptions-item>
              <n-descriptions-item label="最近归集">{{ formatDateTime(detail.project.last_uploaded_at) }}</n-descriptions-item>
            </n-descriptions>

            <section class="detail-section">
              <div class="detail-section__head">
                <h3>项目文件摘要</h3>
                <n-tag v-if="detail.project_snapshot" size="small" round>{{ detail.project_snapshot.original_filename }}</n-tag>
              </div>
              <n-empty v-if="!detail.project_snapshot" description="暂无可展示的项目文件摘要" size="small" />
              <n-descriptions v-else :column="1" label-placement="left" size="small" bordered>
                <n-descriptions-item v-for="item in metadataEntries(detail.project_snapshot.metadata)" :key="item.key" :label="item.key">
                  {{ item.value }}
                </n-descriptions-item>
              </n-descriptions>
            </section>

            <section class="detail-section">
              <div class="detail-section__head">
                <h3>数据源解析与预览</h3>
                <n-tag size="small" round>{{ detail.data_sources.length }} 个</n-tag>
              </div>
              <n-empty v-if="!detail.data_sources.length" description="尚未归集匹配的数据源文件" size="small" />
              <n-collapse v-else>
                <n-collapse-item v-for="source in detail.data_sources" :key="source.id" :name="source.id">
                  <template #header>
                    <div class="source-title">
                      <strong>{{ sourceRoleLabel(source.source_role) }}</strong>
                      <span>{{ source.original_filename }}</span>
                    </div>
                  </template>
                  <n-alert v-if="source.preview && previewTruncated(source.preview)" type="warning" :bordered="false" class="preview-alert">
                    该预览已按服务端上限截断，仅用于确认解析结果，不代表完整源表。
                  </n-alert>
                  <div v-if="source.preview" class="preview-summary">
                    {{ source.preview.format }} · {{ source.preview.sheet_count }} 个工作表 · {{ source.preview.row_count }} 行 · {{ source.preview.column_count }} 列
                  </div>
                  <n-empty v-if="!source.preview?.sheets?.length" description="该数据源没有可展示的表格预览" size="small" />
                  <n-collapse v-else class="sheet-collapse">
                    <n-collapse-item v-for="sheet in source.preview.sheets" :key="sheet.name" :name="sheet.name">
                      <template #header>{{ sheet.name }}（{{ sheet.row_count }} 行 × {{ sheet.column_count }} 列）</template>
                      <div class="sheet-table-wrap">
                        <table class="sheet-table">
                          <tbody>
                            <tr v-for="(line, lineIndex) in sheet.rows" :key="lineIndex">
                              <td v-for="(cell, cellIndex) in line" :key="cellIndex">{{ cell }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <n-text v-if="sheet.rows_truncated || sheet.columns_truncated" depth="3" class="preview-limit">
                        已按行/列上限截断显示。
                      </n-text>
                    </n-collapse-item>
                  </n-collapse>
                </n-collapse-item>
              </n-collapse>
            </section>
          </template>
          <n-empty v-else-if="!detailLoading" description="未找到项目详情" />
        </n-spin>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { deviceApi } from '@/api/device'
import { winProjectApi } from '@/api/win-project'
import { useAuthStore } from '@/stores/auth'
import type { WinFileSnapshot, WinProjectDetail, WinProjectKind, WinProjectListItem, WinSpreadsheetPreview } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'

const props = defineProps<{ projectKind: WinProjectKind }>()
const router = useRouter()
const authStore = useAuthStore()
const dialog = useDialog()
const message = useMessage()
const loading = ref(false)
const deletingDeviceId = ref<number | null>(null)
const detailLoading = ref(false)
const errorText = ref('')
const rows = ref<WinProjectListItem[]>([])
const companyOptions = ref<SelectOption[]>([])
const selected = ref<WinProjectListItem | null>(null)
const detail = ref<WinProjectDetail | null>(null)
const detailVisible = ref(false)
const hideUuid = ref(true)

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

const kindLabel = computed(() => (props.projectKind === 'sky' ? 'SKY' : 'Huaning'))
const drawerWidth = computed(() => (window.innerWidth < 860 ? '100%' : '760px'))
const tableScrollX = computed(() => (hideUuid.value ? 1310 : 1560))
const columns = computed<DataTableColumns<WinProjectListItem>>(() => [
  { title: '项目名称', key: 'project_name', minWidth: 180, render: (row) => row.project.project_name || '-' },
  { title: '项目编号', key: 'project_code', width: 150, render: (row) => row.project.project_code || '-' },
  ...(hideUuid.value ? [] : [{ title: '项目 UUID', key: 'project_uuid', minWidth: 250, ellipsis: { tooltip: true }, render: (row: WinProjectListItem) => h('span', { class: 'mono' }, row.project.project_uuid) }]),
  { title: '委托单位', key: 'client_name', minWidth: 180, render: (row) => row.project.client_name || '-' },
  { title: '来源设备', key: 'device_name', minWidth: 180, render: deviceDisplayName },
  { title: '创建时间', key: 'created_at', width: 178, render: (row) => formatProjectDateTime(row.created_at) },
  { title: '最新修改时间', key: 'updated_at', width: 178, render: (row) => formatProjectDateTime(row.updated_at) },
  {
    title: '操作',
    key: 'actions',
    width: 330,
    fixed: 'right',
    render: (row) => h('div', { style: 'display:flex;gap:8px' }, [
      h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
      h(NButton, { size: 'small', type: 'primary', ghost: true, onClick: () => openDataSourcePreview(row) }, { default: () => '预览数据源' }),
      h(NButton, {
        size: 'small',
        type: 'error',
        disabled: !row.device_fingerprint_id,
        title: row.device_fingerprint_id ? '永久删除来源设备及全部关联云端数据' : '旧项目记录未关联可删除的来源设备',
        loading: !!row.device_fingerprint_id && deletingDeviceId.value === row.device_fingerprint_id,
        onClick: () => confirmDeleteDevice(row),
      }, { default: () => '删除设备' }),
    ]),
  },
])

function sourceRoleLabel(role: string) {
  const labels: Record<string, string> = {
    primary: '主数据源',
    shear: '直剪数据源',
    particle_analysis: '颗粒分析数据源',
  }
  return labels[role] || role || '数据源'
}

function metadataEntries(metadata?: Record<string, unknown>) {
  if (!metadata) return []
  return Object.entries(metadata)
    .filter(([key]) => !hideUuid.value || key !== 'project_uuid')
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([key, value]) => ({ key: metadataLabel(key), value: metadataValue(value, key) }))
}

function metadataLabel(key: string) {
  const labels: Record<string, string> = {
    project_kind: '项目类型',
    version: '文件版本',
    project_uuid: '项目 UUID',
    project_code: '项目编号',
    project_name: '项目名称',
    client_name: '委托单位',
    client_address: '委托单位地址',
    design_company: '设计单位',
    survey_company: '勘察单位',
    project_lead: '项目负责人',
    test_lead: '试验负责人',
    start_date: '开始日期',
    report_date: '报告日期',
    created_at: '创建时间',
    updated_at: '最新修改时间',
    declared_data_sources: '声明的数据源',
  }
  return labels[key] || key
}

function metadataValue(value: unknown, key = '') {
  if ((key === 'created_at' || key === 'updated_at') && typeof value === 'string') {
    return formatProjectDateTime(value)
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          const source = item as { role?: string; filename?: string }
          return `${sourceRoleLabel(source.role || '')}：${source.filename || '-'}`
        }
        return String(item)
      })
      .join('；')
  }
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function formatProjectDateTime(value?: string | null) {
  if (!value) return '-'
  const formatted = formatDateTime(value)
  return formatted === '-' ? value : formatted
}

function previewTruncated(preview: WinSpreadsheetPreview) {
  return preview.sheets_truncated || preview.sheets.some((sheet) => sheet.rows_truncated || sheet.columns_truncated)
}

function deviceDisplayName(row: WinProjectListItem) {
  if (row.device_alias) {
    return row.device_name ? `${row.device_alias}（${row.device_name}）` : row.device_alias
  }
  return row.device_name || (row.device_fingerprint_id ? `设备 #${row.device_fingerprint_id}` : '未关联')
}

async function loadCompanies() {
  if (!authStore.isBackOfficeScopeAll) return
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = pageList(result.list).map((company) => ({ label: company.company_name, value: company.id }))
}

async function fetchProjects() {
  loading.value = true
  errorText.value = ''
  try {
    const result = await winProjectApi.list(props.projectKind, {
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: queryValue(filters.company_id),
      keyword: queryValue(filters.keyword),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '项目数据加载失败'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.page = 1
  void fetchProjects()
}

function resetFilters() {
  filters.company_id = null
  filters.keyword = ''
  pagination.page = 1
  void fetchProjects()
}

function handlePage(page: number) {
  pagination.page = page
  void fetchProjects()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  void fetchProjects()
}

async function openDetail(row: WinProjectListItem) {
  selected.value = row
  detail.value = null
  detailVisible.value = true
  detailLoading.value = true
  try {
    detail.value = await winProjectApi.detail(row.project.id, props.projectKind)
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '项目详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

function openDataSourcePreview(row: WinProjectListItem) {
  void router.push({
    name: props.projectKind === 'sky' ? 'win-sky-data-sources' : 'win-huaning-data-sources',
    params: { id: row.project.id },
  })
}

function confirmDeleteDevice(row: WinProjectListItem) {
  if (!row.device_fingerprint_id) return
  const deviceId = row.device_fingerprint_id
  dialog.error({
    title: '永久删除设备及关联数据',
    content: `将永久删除“${deviceDisplayName(row)}”，自动取消授权，并清除其关联的 SKY/Huaning、Mobile 项目、数据、配置、日志和文件。共同使用过的关联项目也会整项删除，且不可恢复。`,
    positiveText: '确认永久删除',
    negativeText: '取消',
    async onPositiveClick() {
      deletingDeviceId.value = deviceId
      try {
        const result = await deviceApi.remove(deviceId)
        message.success(`设备已删除，共清理 ${result.projects_deleted} 个项目、${result.files_deleted} 个文件记录`)
        if (selected.value?.device_fingerprint_id === deviceId) {
          selected.value = null
          detail.value = null
          detailVisible.value = false
        }
        await fetchProjects()
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

onMounted(() => {
  void loadCompanies()
  void fetchProjects()
})

watch(
  () => props.projectKind,
  () => {
    pagination.page = 1
    selected.value = null
    detail.value = null
    detailVisible.value = false
    void fetchProjects()
  },
)
</script>

<style scoped>
.project-toolbar,
.table-head,
.error-line,
.detail-section__head,
.source-title {
  display: flex;
  gap: 12px;
}

.project-toolbar,
.table-head,
.detail-section__head {
  align-items: center;
}

.keyword-input { width: 320px; }
.company-select { width: 210px; }
.table-head { justify-content: space-between; margin-bottom: 16px; }
.table-head h2, .detail-section h3 { margin: 0; font-size: 16px; }
.table-head p { margin: 5px 0 0; color: var(--yy-text-muted); line-height: 1.6; }
.error-line { justify-content: space-between; align-items: center; }
.detail-section { margin-top: 22px; }
.detail-section__head { justify-content: space-between; margin-bottom: 12px; }
.source-title { align-items: baseline; min-width: 0; }
.source-title span { color: var(--yy-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-alert { margin: 8px 0; }
.preview-summary, .preview-limit { display: block; margin: 10px 0; color: var(--yy-text-muted); font-size: 13px; }
.sheet-collapse { margin-top: 10px; }
.sheet-table-wrap { overflow: auto; border: 1px solid var(--yy-border); border-radius: 6px; max-height: 360px; }
.sheet-table { border-collapse: collapse; min-width: 100%; font-size: 12px; }
.sheet-table td { min-width: 96px; max-width: 260px; padding: 7px 9px; border-right: 1px solid var(--yy-border); border-bottom: 1px solid var(--yy-border); white-space: pre-wrap; word-break: break-word; vertical-align: top; }
.sheet-table tr:first-child td { background: var(--yy-bg-soft); font-weight: 600; position: sticky; top: 0; }

@media (max-width: 760px) {
  .project-toolbar { flex-wrap: wrap; }
  .keyword-input, .company-select { width: 100%; }
  .table-head { align-items: flex-start; }
}
</style>
