<template>
  <div class="page-shell">
    <PageHeader title="安全风险" subtitle="查看授权、设备、签名、时间、上传和解析相关风险，并记录处理动作。" />

    <div class="page-card toolbar">
      <n-select v-if="authStore.isBackOfficeScopeAll" v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-input v-model:value="filters.user_id_text" clearable placeholder="用户 ID" style="width: 110px" @keyup.enter="fetchList" />
      <n-input v-model:value="filters.risk_type" clearable placeholder="风险类型" style="width: 160px" @keyup.enter="fetchList" />
      <n-select v-model:value="filters.risk_level" clearable :options="riskLevelOptions" placeholder="等级" style="width: 110px" />
      <n-select v-model:value="filters.handled" clearable :options="booleanFilterOptions" placeholder="已处理" style="width: 120px" />
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
        :row-key="(row: SecurityRiskEvent) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="720">
      <n-drawer-content :title="detail ? `风险事件 #${detail.id}` : '风险事件'">
        <n-descriptions v-if="detail" label-placement="left" bordered :column="2">
          <n-descriptions-item label="类型">{{ detail.risk_type }}</n-descriptions-item>
          <n-descriptions-item label="等级">{{ riskLevelLabel(detail.risk_level) }}</n-descriptions-item>
          <n-descriptions-item label="企业">{{ riskCompanyLabel(detail) }}</n-descriptions-item>
          <n-descriptions-item label="用户">{{ riskUserLabel(detail) }}</n-descriptions-item>
          <n-descriptions-item label="设备 ID">{{ detail.device_fingerprint_id ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="阻断动作">{{ detail.block_action || '-' }}</n-descriptions-item>
          <n-descriptions-item label="风险说明" :span="2">{{ riskAdvice(detail.risk_type) }}</n-descriptions-item>
          <n-descriptions-item label="创建时间">{{ formatDateTime(detail.created_at) }}</n-descriptions-item>
          <n-descriptions-item label="处理时间">{{ formatDateTime(detail.handled_at) }}</n-descriptions-item>
          <n-descriptions-item label="处理人">{{ detail.handled_by ?? '-' }}</n-descriptions-item>
          <n-descriptions-item label="备注">{{ detail.handle_note || '-' }}</n-descriptions-item>
        </n-descriptions>
        <pre v-if="detail?.detail_json" class="json-preview">{{ formatJSON(detail.detail_json) }}</pre>
        <n-form v-if="detail" label-placement="top" style="margin-top: 14px">
          <n-form-item label="处理备注">
            <n-input v-model:value="handleNote" type="textarea" />
          </n-form-item>
        </n-form>
        <template #footer>
          <div class="drawer-footer">
            <n-popconfirm v-if="detail" @positive-click="handleRisk('handle')">
              <template #trigger>
                <n-button type="primary">标记处理</n-button>
              </template>
              确认标记该风险已处理？
            </n-popconfirm>
            <n-popconfirm v-if="detail" @positive-click="handleRisk('block')">
              <template #trigger>
                <n-button type="error" ghost>阻断</n-button>
              </template>
              确认执行阻断动作？
            </n-popconfirm>
            <n-popconfirm v-if="detail" @positive-click="handleRisk('unblock')">
              <template #trigger>
                <n-button ghost>解除</n-button>
              </template>
              确认解除阻断标记？
            </n-popconfirm>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { securityApi } from '@/api/security'
import { useAuthStore } from '@/stores/auth'
import type { SecurityRiskEvent } from '@/types/api'
import { compactText, formatDateTime } from '@/utils/format'
import { booleanFilterOptions, riskLevelLabel, riskLevelOptions } from '@/utils/labels'
import { pageList, queryValue } from '@/utils/query'

const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()
const loading = ref(false)
const rows = ref<SecurityRiskEvent[]>([])
const detail = ref<SecurityRiskEvent | null>(null)
const detailVisible = ref(false)
const handleNote = ref('')
const companyOptions = ref<SelectOption[]>([])

const filters = reactive({
  company_id: null as number | null,
  user_id_text: '',
  risk_type: '',
  risk_level: '',
  handled: null as boolean | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

function levelTagType(level: string) {
  if (level === 'critical' || level === 'high') return 'error'
  if (level === 'medium') return 'warning'
  return 'info'
}

const columns: DataTableColumns<SecurityRiskEvent> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  { title: '类型', key: 'risk_type', minWidth: 170 },
  {
    title: '等级',
    key: 'risk_level',
    width: 90,
    render: (row) => h(NTag, { type: levelTagType(row.risk_level), round: true }, { default: () => riskLevelLabel(row.risk_level) }),
  },
  { title: '企业', key: 'company_id', width: 150, render: (row) => riskCompanyLabel(row) },
  { title: '用户', key: 'user_id', width: 170, render: (row) => riskUserLabel(row) },
  { title: '设备', key: 'device_fingerprint_id', width: 90, render: (row) => row.device_fingerprint_id ?? '-' },
  { title: '动作', key: 'block_action', width: 120, render: (row) => row.block_action || '-' },
  {
    title: '处理',
    key: 'handled_at',
    width: 100,
    render: (row) => h(NTag, { type: row.handled_at ? 'success' : 'warning', round: true }, { default: () => (row.handled_at ? '已处理' : '未处理') }),
  },
  { title: '备注', key: 'handle_note', minWidth: 180, render: (row) => compactText(row.handle_note, 60) },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
  },
]

async function loadCompanies() {
  if (!authStore.isBackOfficeScopeAll) {
    filters.company_id = null
    companyOptions.value = []
    return
  }
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = pageList(result.list).map((item) => ({ label: item.company_name, value: item.id }))
}

function numberFilter(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

async function fetchList() {
  loading.value = true
  try {
    const result = await securityApi.risks({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: queryValue(filters.company_id),
      user_id: numberFilter(filters.user_id_text),
      risk_type: queryValue(filters.risk_type),
      risk_level: queryValue(filters.risk_level),
      handled: queryValue(filters.handled),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, {
    company_id: null,
    user_id_text: '',
    risk_type: '',
    risk_level: '',
    handled: null,
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

async function openDetail(row: SecurityRiskEvent) {
  await openDetailByID(row.id)
}

async function openDetailByID(id: number) {
  detail.value = await securityApi.riskDetail(id)
  handleNote.value = detail.value.handle_note || ''
  detailVisible.value = true
}

async function handleRisk(action: 'handle' | 'block' | 'unblock') {
  if (!detail.value) return
  detail.value = await securityApi.handleRisk(detail.value.id, { action, note: handleNote.value })
  message.success('风险状态已更新')
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

function firstQueryString(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function queryNumber(value: unknown) {
  const parsed = Number(firstQueryString(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function queryBool(value: unknown) {
  const text = firstQueryString(value).toLowerCase()
  if (!text) return null
  if (text === 'true' || text === '1') return true
  if (text === 'false' || text === '0') return false
  return null
}

function riskCompanyLabel(row: SecurityRiskEvent) {
  if (row.company_name) {
    return row.company_id != null ? `${row.company_name} (#${row.company_id})` : row.company_name
  }
  return row.company_id != null ? `#${row.company_id}` : '-'
}

function riskUserLabel(row: SecurityRiskEvent) {
  if (row.username) {
    const label = row.real_name ? `${row.username}（${row.real_name}）` : row.username
    return row.user_id != null ? `${label} (#${row.user_id})` : label
  }
  return row.user_id != null ? `#${row.user_id}` : '-'
}

function riskAdvice(riskType: string) {
  const advice: Record<string, string> = {
    signature_invalid: '签名校验异常，建议核对客户端签名密钥、时间戳和请求来源。',
    device_unauthorized: '设备未授权或授权状态异常，建议核对设备指纹与授权记录。',
    time_tamper: '客户端时间戳异常，建议核对终端系统时间与服务端时间差。',
    upload_failed: '上传链路失败，建议核对文件、网络与服务端解析日志。',
    parse_failed: '文件解析失败，建议检查文件结构、版本和解析错误信息。',
    account_churn: '账号变更频繁，建议核对用户近期登录与设备绑定行为。',
    ip_churn: '访问 IP 变化频繁，建议核对登录来源和网络环境。',
  }
  return advice[riskType] || riskType || '-'
}

async function applyRouteQueryAndFetch(openEvent: boolean) {
  filters.risk_type = firstQueryString(route.query.risk_type)
  filters.risk_level = firstQueryString(route.query.risk_level)
  filters.handled = queryBool(route.query.handled)
  pagination.page = 1
  await fetchList()

  const eventID = queryNumber(route.query.event_id)
  if (openEvent && eventID) {
    await openDetailByID(eventID)
  }
}

watch(
  () => route.query,
  () => {
    void applyRouteQueryAndFetch(true)
  },
)

onMounted(async () => {
  await Promise.all([loadCompanies(), applyRouteQueryAndFetch(true)])
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
