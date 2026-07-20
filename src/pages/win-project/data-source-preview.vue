<template>
  <div class="page-shell">
    <PageHeader :title="`${kindLabel} 数据源预览`" subtitle="只读查看源 XLSX 的全部工作表；表格按行分页加载，下载文件保持源文件内容不变。">
      <n-space>
        <n-button @click="returnToList">返回列表</n-button>
        <n-button
          type="primary"
          :disabled="!selectedSource"
          :loading="downloading"
          @click="downloadSelectedSource"
        >
          下载当前数据源
        </n-button>
        <n-button :loading="loading || tableLoading" @click="loadProject">刷新</n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      <div class="error-line">
        <span>{{ errorText }}</span>
        <n-button text type="primary" size="small" @click="retryCurrent">重试</n-button>
      </div>
    </n-alert>

    <n-spin :show="loading">
      <section v-if="detail" class="page-card summary-card">
        <n-descriptions bordered label-placement="left" :column="summaryColumns" size="small">
          <n-descriptions-item label="项目编号">{{ detail.project.project_code || '-' }}</n-descriptions-item>
          <n-descriptions-item label="项目名称">{{ detail.project.project_name || '-' }}</n-descriptions-item>
          <n-descriptions-item label="项目 UUID"><span class="mono">{{ detail.project.project_uuid }}</span></n-descriptions-item>
          <n-descriptions-item label="只读状态"><n-tag type="success" size="small">不可编辑</n-tag></n-descriptions-item>
        </n-descriptions>

        <div class="source-toolbar">
          <div class="selector-block">
            <span class="selector-label">数据源</span>
            <n-select
              v-model:value="selectedSourceId"
              :options="sourceOptions"
              :disabled="!sourceOptions.length"
              placeholder="选择数据源"
              @update:value="handleSourceChange"
            />
          </div>
          <div class="selector-block">
            <span class="selector-label">工作表</span>
            <n-select
              v-model:value="sheetIndex"
              :options="sheetOptions"
              :disabled="!sheetOptions.length"
              placeholder="选择工作表"
              @update:value="handleSheetChange"
            />
          </div>
          <div v-if="selectedSource" class="source-meta">
            <strong>{{ sourceRoleLabel(selectedSource.source_role) }}</strong>
            <span>{{ selectedSource.original_filename }}</span>
            <span>{{ selectedSource.sheet_count }} 个工作表</span>
          </div>
        </div>
      </section>
    </n-spin>

    <section v-if="detail && !detail.data_sources.length" class="page-card">
      <n-empty description="当前项目尚未归集可预览的数据源" />
    </section>

    <section v-else-if="selectedSource" class="page-card table-card">
      <div class="table-head">
        <div>
          <h2>{{ workbook?.sheet_name || '数据源表格' }}</h2>
          <p v-if="workbook?.rows.length">
            当前显示源表第 {{ workbook.row_start }}–{{ workbook.row_end }} 行，共 {{ workbook.column_count }} 个可见列；可继续翻页直至文件末尾。
          </p>
          <p v-else>当前工作表没有数据。</p>
        </div>
        <n-space>
          <n-tag round>{{ selectedSource.original_filename }}</n-tag>
          <n-tag type="success" round>只读</n-tag>
        </n-space>
      </div>

      <n-spin :show="tableLoading">
        <n-data-table
          :columns="tableColumns"
          :data="tableRows"
          :pagination="false"
          :row-key="(row: TableRow) => row.rowNumber"
          :scroll-x="tableScrollX"
          :max-height="620"
          striped
        >
          <template #empty>
            <n-empty :description="tableLoading ? '正在加载源表数据' : '当前工作表没有数据'" />
          </template>
        </n-data-table>
      </n-spin>

      <div class="pager">
        <n-button :disabled="tableLoading || page <= 1" @click="changePage(page - 1)">上一页</n-button>
        <span>第 {{ page }} 页</span>
        <n-button :disabled="tableLoading || !workbook?.has_more" @click="changePage(page + 1)">下一页</n-button>
        <n-select v-model:value="pageSize" class="page-size" :options="pageSizeOptions" @update:value="handlePageSizeChange" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import { useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { winProjectApi } from '@/api/win-project'
import type { WinFileSnapshot, WinProjectDetail, WinProjectKind, WinWorkbookSheetPage } from '@/types/api'
import { ensureXlsxBlob, saveBlob } from '@/utils/download'

interface TableRow {
  rowNumber: number
  cells: string[]
}

const props = defineProps<{ projectKind: WinProjectKind; projectId: number }>()
const router = useRouter()
const message = useMessage()
const loading = ref(false)
const tableLoading = ref(false)
const downloading = ref(false)
const errorText = ref('')
const detail = ref<WinProjectDetail | null>(null)
const selectedSourceId = ref<number | null>(null)
const workbook = ref<WinWorkbookSheetPage | null>(null)
const sheetIndex = ref(0)
const page = ref(1)
const pageSize = ref(50)

const kindLabel = computed(() => (props.projectKind === 'sky' ? 'SKY' : 'Huaning'))
const summaryColumns = computed(() => (window.innerWidth < 760 ? 1 : 2))
const selectedSource = computed(() => detail.value?.data_sources.find((item) => item.id === selectedSourceId.value) || null)
const sourceOptions = computed<SelectOption[]>(() => (detail.value?.data_sources || []).map((source) => ({
  label: `${sourceRoleLabel(source.source_role)} · ${source.original_filename}`,
  value: source.id,
})))
const sheetOptions = computed<SelectOption[]>(() => (workbook.value?.sheet_names || []).map((name, index) => ({ label: name, value: index })))
const pageSizeOptions: SelectOption[] = [
  { label: '每页 20 行', value: 20 },
  { label: '每页 50 行', value: 50 },
  { label: '每页 100 行', value: 100 },
]
const tableRows = computed<TableRow[]>(() => (workbook.value?.rows || []).map((cells, index) => ({
  rowNumber: (workbook.value?.row_start || 1) + index,
  cells,
})))
const tableColumns = computed<DataTableColumns<TableRow>>(() => {
  const count = workbook.value?.column_count || 0
  return [
    {
      title: '行号', key: 'rowNumber', width: 72, fixed: 'left',
      render: (row) => h('span', { class: 'row-number' }, String(row.rowNumber)),
    },
    ...Array.from({ length: count }, (_, index) => ({
      title: excelColumnName(index + 1),
      key: `column-${index}`,
      width: 160,
      render: (row: TableRow) => h('div', { class: 'source-cell', title: row.cells[index] || '' }, row.cells[index] || ''),
    })),
  ]
})
const tableScrollX = computed(() => Math.max(720, 72 + (workbook.value?.column_count || 0) * 160))

function sourceRoleLabel(role: string) {
  const labels: Record<string, string> = {
    primary: '主数据源',
    shear: '直剪数据源',
    particle_analysis: '颗粒分析数据源',
  }
  return labels[role] || role || '数据源'
}

function excelColumnName(value: number) {
  let number = value
  let name = ''
  while (number > 0) {
    number -= 1
    name = String.fromCharCode(65 + (number % 26)) + name
    number = Math.floor(number / 26)
  }
  return name
}

function returnToList() {
  void router.push({ name: props.projectKind === 'sky' ? 'win-sky' : 'win-huaning' })
}

async function loadProject() {
  loading.value = true
  errorText.value = ''
  workbook.value = null
  try {
    detail.value = await winProjectApi.detail(props.projectId, props.projectKind)
    const currentExists = detail.value.data_sources.some((source) => source.id === selectedSourceId.value)
    selectedSourceId.value = currentExists ? selectedSourceId.value : (detail.value.data_sources[0]?.id || null)
    sheetIndex.value = 0
    page.value = 1
    if (selectedSourceId.value) await loadTable()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '数据源信息加载失败'
  } finally {
    loading.value = false
  }
}

async function loadTable() {
  if (!selectedSourceId.value) {
    workbook.value = null
    return
  }
  tableLoading.value = true
  errorText.value = ''
  try {
    const result = await winProjectApi.previewDataSource(props.projectId, selectedSourceId.value, props.projectKind, {
      sheet_index: sheetIndex.value,
      page: page.value,
      page_size: pageSize.value,
    })
    workbook.value = result.workbook
  } catch (error) {
    workbook.value = null
    errorText.value = error instanceof Error ? error.message : '源表数据加载失败'
  } finally {
    tableLoading.value = false
  }
}

function handleSourceChange() {
  sheetIndex.value = 0
  page.value = 1
  workbook.value = null
  void loadTable()
}

function handleSheetChange() {
  page.value = 1
  void loadTable()
}

function handlePageSizeChange() {
  page.value = 1
  void loadTable()
}

function changePage(nextPage: number) {
  if (nextPage < 1) return
  page.value = nextPage
  void loadTable()
}

function retryCurrent() {
  if (detail.value && selectedSourceId.value) void loadTable()
  else void loadProject()
}

async function downloadSelectedSource() {
  const source = selectedSource.value
  if (!source) return
  downloading.value = true
  errorText.value = ''
  try {
    const blob = await winProjectApi.downloadDataSource(props.projectId, source.id, props.projectKind)
    ensureXlsxBlob(blob)
    saveBlob(blob, source.original_filename || `win-data-source-${source.id}.xlsx`)
    message.success('原始数据源下载已开始')
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '数据源下载失败'
  } finally {
    downloading.value = false
  }
}

onMounted(() => {
  void loadProject()
})
</script>

<style scoped>
.error-line,
.source-toolbar,
.source-meta,
.table-head,
.pager {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-line,
.table-head {
  justify-content: space-between;
}

.summary-card {
  display: grid;
  gap: 18px;
}

.source-toolbar {
  align-items: flex-end;
  flex-wrap: wrap;
}

.selector-block {
  display: grid;
  gap: 7px;
  width: min(320px, 100%);
}

.selector-label {
  color: var(--yy-text-muted);
  font-size: 13px;
}

.source-meta {
  min-width: 0;
  flex-wrap: wrap;
  padding-bottom: 8px;
  color: var(--yy-text-muted);
  font-size: 13px;
}

.source-meta strong {
  color: var(--yy-text-primary);
}

.table-card {
  min-width: 0;
}

.table-head {
  align-items: flex-start;
  margin-bottom: 16px;
}

.table-head h2 {
  margin: 0;
  font-size: 17px;
}

.table-head p {
  margin: 6px 0 0;
  color: var(--yy-text-muted);
  line-height: 1.6;
}

.pager {
  justify-content: flex-end;
  margin-top: 16px;
}

.page-size {
  width: 132px;
}

:deep(.row-number) {
  color: var(--yy-text-muted);
  font-variant-numeric: tabular-nums;
}

:deep(.source-cell) {
  max-height: 120px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.55;
}

@media (max-width: 760px) {
  .table-head {
    flex-direction: column;
  }

  .selector-block {
    width: 100%;
  }

  .pager {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
