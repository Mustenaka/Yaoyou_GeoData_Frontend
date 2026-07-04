<template>
  <div class="page-shell">
    <PageHeader title="全局配置记录" subtitle="查看移动端上行的企业级全局配置快照，支持结构化预览与原始配置下载。">
      <n-button :loading="loading" @click="fetchList">刷新</n-button>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable class="page-alert" @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <div class="page-card toolbar">
      <n-select
        v-if="authStore.isBackOfficeScopeAll"
        v-model:value="filters.company_id"
        clearable
        filterable
        :options="companyOptions"
        placeholder="企业"
        style="width: 240px"
        @update:value="applyFilters"
      />
      <n-switch v-model:value="filters.only_latest" @update:value="applyFilters">
        <template #checked>仅看最新</template>
        <template #unchecked>全部记录</template>
      </n-switch>
      <div class="toolbar__spacer" />
      <n-button @click="applyFilters">查询</n-button>
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
        :scroll-x="1080"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="860">
      <n-drawer-content :title="detailTitle">
        <n-spin :show="detailLoading">
          <n-alert v-if="detailError" type="error" class="block-alert">
            {{ detailError }}
          </n-alert>
          <template v-if="detail && structuredConfig">
            <n-descriptions label-placement="left" bordered :column="2" size="small">
              <n-descriptions-item label="企业">{{ companyLabel(detail.company_id) }}</n-descriptions-item>
              <n-descriptions-item label="配置类型">{{ configTypeLabel(detail.config_type) }}</n-descriptions-item>
              <n-descriptions-item label="版本">{{ detail.config_version || '-' }}</n-descriptions-item>
              <n-descriptions-item label="最新">
                <n-tag :type="detail.is_latest ? 'success' : 'default'" round>{{ detail.is_latest ? '是' : '否' }}</n-tag>
              </n-descriptions-item>
              <n-descriptions-item label="来源文件" :span="2">
                <span class="mono">{{ detail.source_file_id || '-' }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="创建时间">{{ formatDateTime(detail.created_at) }}</n-descriptions-item>
              <n-descriptions-item label="更新时间">{{ formatDateTime(detail.updated_at) }}</n-descriptions-item>
            </n-descriptions>

            <n-alert v-if="structuredConfig.error" type="warning" class="block-alert">
              {{ structuredConfig.error }}
            </n-alert>

            <div class="section-title">映射列</div>
            <n-data-table
              :columns="mappingPreviewColumns"
              :data="structuredConfig.mappingColumns"
              :pagination="{ pageSize: 20 }"
              :row-key="(row: ConfigMappingColumn) => row.key"
              :scroll-x="720"
            >
              <template #empty>
                <n-empty description="配置中未找到工作表单映射列" />
              </template>
            </n-data-table>

            <div class="section-title">关键配置项</div>
            <n-data-table
              :columns="configItemColumns"
              :data="structuredConfig.configItems"
              :pagination="{ pageSize: 20 }"
              :row-key="(row: ConfigKeyValueItem) => row.key"
              :scroll-x="720"
            >
              <template #empty>
                <n-empty description="暂无可结构化展示的配置项" />
              </template>
            </n-data-table>

            <n-collapse class="raw-collapse">
              <n-collapse-item title="原始 JSON" name="raw-config-json">
                <pre class="json-preview">{{ structuredConfig.rawText }}</pre>
              </n-collapse-item>
            </n-collapse>
          </template>
        </n-spin>

        <template #footer>
          <div class="drawer-footer">
            <n-button v-if="detail" :loading="downloadId === detail.id" @click="downloadConfig(detail)">下载</n-button>
            <n-popconfirm v-if="detail && !detail.is_latest" @positive-click="markLatest(detail)">
              <template #trigger>
                <n-button type="primary" ghost :loading="markingId === detail.id">标记最新</n-button>
              </template>
              确认将该全局配置快照标记为最新？
            </n-popconfirm>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import { companyApi } from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import type { ConfigSnapshotItem } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { saveBlob } from '@/utils/download'
import { configTypeLabel } from '@/utils/labels'
import { pageList, queryValue } from '@/utils/query'
import {
  parseStructuredConfig,
  type ConfigKeyValueItem,
  type ConfigMappingColumn,
  type StructuredConfig,
} from '@/utils/archive-config'

const authStore = useAuthStore()
const message = useMessage()
const loading = ref(false)
const detailLoading = ref(false)
const rows = ref<ConfigSnapshotItem[]>([])
const detail = ref<ConfigSnapshotItem | null>(null)
const detailVisible = ref(false)
const errorText = ref('')
const detailError = ref('')
const downloadId = ref<number | null>(null)
const markingId = ref<number | null>(null)
const companyOptions = ref<SelectOption[]>([])

const filters = reactive({
  company_id: null as number | null,
  only_latest: false,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const structuredConfig = computed<StructuredConfig | null>(() => (detail.value ? parseStructuredConfig(detail.value.snapshot_json) : null))
const detailTitle = computed(() => {
  if (!detail.value) return '全局配置详情'
  return `${configTypeLabel(detail.value.config_type)} · 版本 ${detail.value.config_version || '-'}`
})

const mappingPreviewColumns: DataTableColumns<ConfigMappingColumn> = [
  { title: '字段 key', key: 'key', width: 180, render: (row) => h('span', { class: 'mono' }, row.key) },
  { title: '显示名', key: 'label', minWidth: 180 },
  { title: '宽度', key: 'width', width: 100 },
  { title: '类型', key: 'kind', width: 120 },
  { title: '规则数', key: 'ruleCount', width: 90 },
]

const configItemColumns: DataTableColumns<ConfigKeyValueItem> = [
  { title: '配置项', key: 'label', width: 220 },
  { title: '键', key: 'key', width: 220, render: (row) => h('span', { class: 'mono' }, row.key) },
  { title: '值', key: 'value', minWidth: 260 },
]

const columns: DataTableColumns<ConfigSnapshotItem> = [
  { title: '企业', key: 'company_id', width: 190, render: (row) => companyLabel(row.company_id) },
  { title: '配置类型', key: 'config_type', width: 130, render: (row) => configTypeLabel(row.config_type) },
  { title: '版本', key: 'config_version', width: 100, render: (row) => row.config_version || '-' },
  {
    title: '最新',
    key: 'is_latest',
    width: 90,
    render: (row) => h(NTag, { type: row.is_latest ? 'success' : 'default', round: true }, { default: () => (row.is_latest ? '是' : '否') }),
  },
  { title: '来源文件', key: 'source_file_id', minWidth: 220, render: (row) => h('span', { class: 'mono' }, row.source_file_id || '-') },
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '查看结构化' }),
        h(NButton, { size: 'small', loading: downloadId.value === row.id, onClick: () => downloadConfig(row) }, { default: () => '下载' }),
        row.is_latest
          ? null
          : h(
              NPopconfirm,
              { onPositiveClick: () => markLatest(row) },
              {
                trigger: () => h(NButton, { size: 'small', type: 'primary', ghost: true, loading: markingId.value === row.id }, { default: () => '标记最新' }),
                default: () => '确认将该全局配置快照标记为最新？',
              },
            ),
      ]),
  },
]

async function loadCompanies() {
  if (!authStore.isBackOfficeScopeAll) return
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = pageList(result.list).map((item) => ({ label: `${item.company_name} #${item.id}`, value: item.id }))
}

async function fetchList() {
  loading.value = true
  errorText.value = ''
  try {
    const result = await archiveApi.listConfigs({
      page: pagination.page,
      page_size: pagination.pageSize,
      config_scope: 'global',
      company_id: authStore.isBackOfficeScopeAll ? queryValue(filters.company_id) : undefined,
      is_latest: filters.only_latest ? true : undefined,
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '全局配置记录加载失败'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.page = 1
  fetchList()
}

function resetFilters() {
  filters.company_id = null
  filters.only_latest = false
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
  detailVisible.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = await archiveApi.configDetail(row.id)
  } catch (error) {
    detailError.value = error instanceof Error ? error.message : '全局配置详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

async function downloadConfig(row: ConfigSnapshotItem) {
  downloadId.value = row.id
  try {
    const blob = await archiveApi.downloadConfig(row.id)
    await ensureDownloadBlob(blob)
    saveBlob(blob, `global-config-${row.id}-${row.config_type || 'snapshot'}.json`)
    message.success('配置下载已开始')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下载失败')
  } finally {
    downloadId.value = null
  }
}

async function markLatest(row: ConfigSnapshotItem) {
  markingId.value = row.id
  try {
    const updated = await archiveApi.markConfigLatest(row.id)
    if (detail.value?.id === updated.id) detail.value = { ...detail.value, ...updated }
    message.success('已标记为最新')
    await fetchList()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '标记最新失败')
  } finally {
    markingId.value = null
  }
}

async function ensureDownloadBlob(blob: Blob) {
  if (!blob || blob.size === 0) throw new Error('下载文件为空')
  if (blob.type.includes('application/json')) {
    const text = await blob.text()
    try {
      const payload = JSON.parse(text) as { message?: string; msg?: string }
      throw new Error(payload.message || payload.msg || '下载失败')
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(text || '下载失败')
      throw error
    }
  }
}

function companyLabel(companyId?: number | null) {
  if (companyId === null || companyId === undefined) return '-'
  const option = companyOptions.value.find((item) => item.value === companyId)
  return option?.label ? String(option.label) : `#${companyId}`
}

onMounted(async () => {
  await Promise.all([loadCompanies(), fetchList()])
})
</script>

<style scoped>
.page-alert,
.block-alert {
  margin-bottom: 12px;
}

.section-title {
  margin: 18px 0 12px;
  font-size: 14px;
  font-weight: 700;
}

.raw-collapse {
  margin-top: 14px;
}

.json-preview {
  margin: 0;
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}
</style>
