<template>
  <div class="page-shell">
    <PageHeader :title="`${objectLabel}配置分发`" :subtitle="pageSubtitle">
      <n-button :loading="loading" @click="loadList">
        <template #icon><n-icon :component="RefreshOutline" /></template>
        刷新
      </n-button>
    </PageHeader>

    <n-alert type="info" :bordered="false">
      企业配置会覆盖同名全局配置；Mobile 只更新网络来源项，同名本地或自行导入配置会并存且不会被删除。
    </n-alert>
    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">{{ errorText }}</n-alert>

    <div class="distribution-grid">
      <section class="page-card publish-card">
        <div class="section-title">上传并发布</div>
        <div class="section-subtitle">支持 Mobile 当前格式的 .xlsx，也可上传同结构 .json；解析失败不会发布。</div>

        <n-form label-placement="top" :model="publishForm" class="publish-form">
          <n-form-item label="配置名称" required>
            <n-input v-model:value="publishForm.configName" maxlength="128" show-count placeholder="用于 Mobile 同名覆盖" />
          </n-form-item>
          <div class="field-row">
            <n-form-item label="分发范围" required>
              <n-select v-model:value="publishForm.scope" :options="scopeOptions" />
            </n-form-item>
            <n-form-item v-if="publishForm.scope === 'company'" label="指定企业" required>
              <n-select
                v-model:value="publishForm.companyId"
                filterable
                clearable
                :loading="companiesLoading"
                :options="companyOptions"
                placeholder="选择企业"
              />
            </n-form-item>
          </div>
          <n-form-item label="版本标识">
            <n-input v-model:value="publishForm.version" maxlength="64" placeholder="留空由服务器生成" />
          </n-form-item>
          <n-form-item label="发布说明">
            <n-input v-model:value="publishForm.publishNote" type="textarea" maxlength="500" show-count :autosize="{ minRows: 2, maxRows: 4 }" />
          </n-form-item>
          <n-form-item label="配置文件" required>
            <n-upload
              v-model:file-list="fileList"
              :default-upload="false"
              :max="1"
              accept=".xlsx,.json"
              @before-upload="beforeUpload"
            >
              <n-upload-dragger>
                <div class="upload-title">选择或拖入配置文件</div>
                <n-text depth="3">单文件不超过 5 MB</n-text>
              </n-upload-dragger>
            </n-upload>
          </n-form-item>
          <n-button type="primary" block :loading="publishing" :disabled="!canPublish" @click="publishConfig">
            解析并发布
          </n-button>
        </n-form>
      </section>

      <section class="page-card list-card">
        <div class="list-head">
          <div>
            <div class="section-title">发布历史</div>
            <div class="section-subtitle">共 {{ total }} 个版本，最新有效版本由 Mobile 拉取。</div>
          </div>
          <n-space class="filters" wrap>
            <n-input v-model:value="filters.keyword" clearable placeholder="名称 / 文件 / 说明" @keyup.enter="applyFilters" />
            <n-select v-model:value="filters.scope" clearable :options="scopeOptions" placeholder="全部范围" />
            <n-select v-model:value="filters.companyId" clearable filterable :loading="companiesLoading" :options="companyOptions" placeholder="全部企业" />
            <n-select v-model:value="filters.status" clearable :options="statusOptions" placeholder="全部状态" />
            <n-button @click="applyFilters">查询</n-button>
          </n-space>
        </div>

        <n-data-table
          remote
          :columns="columns"
          :data="items"
          :loading="loading"
          :row-key="(row: ConfigDistributionItem) => row.id"
          :pagination="pagination"
          :scroll-x="1050"
          @update:page="changePage"
          @update:page-size="changePageSize"
        >
          <template #empty><n-empty :description="loading ? '正在加载' : '暂无发布记录'" /></template>
        </n-data-table>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { NButton, NTag, useDialog, useMessage, type DataTableColumns, type UploadFileInfo } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import type { CompanyItem } from '@/types/api'
import {
  configDistributionApi,
  type ConfigDistributionItem,
  type ConfigDistributionObjectType,
  type ConfigDistributionScope,
  type ConfigDistributionStatus,
} from '@/api/config-distribution'

const props = defineProps<{ objectType: ConfigDistributionObjectType }>()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const publishing = ref(false)
const companiesLoading = ref(false)
const errorText = ref('')
const items = ref<ConfigDistributionItem[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const fileList = ref<UploadFileInfo[]>([])
const companyOptions = ref<Array<{ label: string; value: number }>>([])

const publishForm = reactive({
  configName: '',
  scope: 'company' as ConfigDistributionScope,
  companyId: null as number | null,
  version: '',
  publishNote: '',
})
const filters = reactive({
  keyword: '',
  scope: null as ConfigDistributionScope | null,
  companyId: null as number | null,
  status: null as ConfigDistributionStatus | null,
})

const objectLabel = computed(() => props.objectType === 'smart_fill_config' ? '智能填充' : '器械管理')
const pageSubtitle = computed(() => `上传、解析并按全网或指定企业分发${objectLabel.value}配置。`)
const scopeOptions = [
  { label: '全部企业（全网）', value: 'global' },
  { label: '指定企业', value: 'company' },
]
const statusOptions = [
  { label: '已发布', value: 'published' },
  { label: '已撤销', value: 'revoked' },
]

const selectedFile = computed(() => fileList.value[0]?.file || null)
const canPublish = computed(() => {
  if (!publishForm.configName.trim() || !selectedFile.value) return false
  return publishForm.scope === 'global' || Boolean(publishForm.companyId)
})
const pagination = computed(() => ({
  page: page.value,
  pageSize: pageSize.value,
  itemCount: total.value,
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
}))

const columns = computed<DataTableColumns<ConfigDistributionItem>>(() => [
  { title: '配置名称', key: 'config_name', minWidth: 180 },
  {
    title: '分发范围', key: 'scope', minWidth: 180,
    render: (row) => h(NTag, { type: row.scope === 'company' ? 'info' : 'success', bordered: false }, {
      default: () => row.scope === 'company' ? (row.company_name || `企业 #${row.company_id}`) : '全部企业',
    }),
  },
  { title: '版本', key: 'version', width: 130 },
  { title: '修订', key: 'revision', width: 90, render: (row) => `#${row.revision}` },
  { title: '源文件', key: 'source_filename', minWidth: 170, ellipsis: { tooltip: true } },
  {
    title: '状态', key: 'status', width: 100,
    render: (row) => h(NTag, { type: row.status === 'published' ? 'success' : 'default', bordered: false }, {
      default: () => row.status === 'published' ? '已发布' : '已撤销',
    }),
  },
  { title: '发布时间', key: 'published_at', width: 170, render: (row) => formatDate(row.published_at) },
  {
    title: '操作', key: 'actions', width: 100, fixed: 'right',
    render: (row) => row.status === 'published'
      ? h(NButton, { size: 'small', type: 'error', secondary: true, onClick: () => confirmRevoke(row) }, { default: () => '撤销' })
      : h('span', { class: 'muted-action' }, '—'),
  },
])

async function loadCompanies() {
  companiesLoading.value = true
  try {
    const companies: CompanyItem[] = []
    let page = 1
    let total = 0
    do {
      const data = await companyApi.list({ page, page_size: 100, keyword: '', status: 1 })
      const batch = data.list || []
      companies.push(...batch)
      total = data.total || companies.length
      page += 1
      if (batch.length === 0) break
    } while (companies.length < total)
    companyOptions.value = companies.map((company) => ({ label: company.company_name, value: company.id }))
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '企业列表加载失败'
  } finally {
    companiesLoading.value = false
  }
}

async function loadList() {
  loading.value = true
  errorText.value = ''
  try {
    const data = await configDistributionApi.list({
      page: page.value,
      page_size: pageSize.value,
      object_type: props.objectType,
      scope: filters.scope || undefined,
      company_id: filters.companyId || undefined,
      status: filters.status || undefined,
      keyword: filters.keyword.trim() || undefined,
    })
    items.value = data.list || []
    total.value = data.total || 0
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '配置分发记录加载失败'
  } finally {
    loading.value = false
  }
}

function beforeUpload({ file }: { file: UploadFileInfo }) {
  const name = file.name.toLowerCase()
  if (!name.endsWith('.xlsx') && !name.endsWith('.json')) {
    message.error('只支持 .xlsx 或 .json 配置文件')
    return false
  }
  if (file.file && file.file.size > 5 * 1024 * 1024) {
    message.error('配置文件不能超过 5 MB')
    return false
  }
  return true
}

async function publishConfig() {
  if (!canPublish.value || !selectedFile.value) return
  publishing.value = true
  errorText.value = ''
  try {
    await configDistributionApi.publish({
      object_type: props.objectType,
      config_name: publishForm.configName.trim(),
      scope: publishForm.scope,
      company_id: publishForm.scope === 'company' ? publishForm.companyId || undefined : undefined,
      version: publishForm.version,
      publish_note: publishForm.publishNote,
      file: selectedFile.value,
    })
    message.success(`${objectLabel.value}配置已发布`)
    publishForm.configName = ''
    publishForm.version = ''
    publishForm.publishNote = ''
    fileList.value = []
    page.value = 1
    await loadList()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '配置发布失败'
  } finally {
    publishing.value = false
  }
}

function confirmRevoke(row: ConfigDistributionItem) {
  dialog.warning({
    title: '撤销配置版本',
    content: `确认撤销“${row.config_name}”修订 #${row.revision}？Mobile 后续将不再获得该版本。`,
    positiveText: '确认撤销',
    negativeText: '取消',
    onPositiveClick: async () => {
      errorText.value = ''
      try {
        await configDistributionApi.revoke(row.id)
        message.success('配置版本已撤销')
        await loadList()
      } catch (error) {
        errorText.value = error instanceof Error ? error.message : '配置撤销失败'
      }
    },
  })
}

function applyFilters() {
  page.value = 1
  loadList()
}

function changePage(value: number) {
  page.value = value
  loadList()
}

function changePageSize(value: number) {
  pageSize.value = value
  page.value = 1
  loadList()
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
}

watch(() => props.objectType, () => {
  page.value = 1
  publishForm.configName = ''
  fileList.value = []
  loadList()
})

onMounted(() => {
  loadCompanies()
  loadList()
})
</script>

<style scoped>
.distribution-grid {
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 14px;
}

.publish-card,
.list-card {
  min-width: 0;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.section-subtitle {
  margin-top: 6px;
  color: var(--yy-text-muted);
  line-height: 1.6;
}

.publish-form {
  margin-top: 16px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 12px;
}

.list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.filters :deep(.n-input) {
  width: 210px;
}

.filters :deep(.n-select) {
  width: 130px;
}

.upload-title {
  margin-bottom: 8px;
  font-weight: 600;
}

.muted-action {
  color: var(--yy-text-muted);
}

@media (max-width: 1180px) {
  .distribution-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .field-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .list-head {
    flex-direction: column;
  }

  .filters,
  .filters :deep(.n-input),
  .filters :deep(.n-select) {
    width: 100%;
  }
}
</style>
