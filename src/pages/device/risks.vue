<template>
  <div class="page-shell">
    <PageHeader title="风险设备" subtitle="按设备聚合尝试破解、频繁切换账号与频繁切换 IP 风险。" />

    <n-alert class="risk-note" type="info" :bordered="false">
      频繁切换账号按企业感知判断：同企业内多账号使用同一已授权设备视为正常，跨企业或无企业账号共享才计入风险。
    </n-alert>

    <div class="page-card toolbar">
      <n-select v-if="authStore.isBackOfficeScopeAll" v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-select v-model:value="filters.client_type" clearable :options="clientTypeOptions" placeholder="客户端" style="width: 130px" />
      <n-select v-model:value="filters.category" clearable :options="deviceRiskCategoryOptions" placeholder="危险类型" style="width: 170px" />
      <n-select v-model:value="filters.level" clearable :options="deviceRiskLevelOptions" placeholder="等级" style="width: 110px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchRisks">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: DeviceRiskItem) => row.device_fingerprint_id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="620">
      <n-drawer-content title="设备详情">
        <n-descriptions v-if="detail" bordered :column="1">
          <n-descriptions-item label="设备 ID">{{ detail.id }}</n-descriptions-item>
          <n-descriptions-item label="客户端">{{ clientTypeLabel(detail.client_type) }}</n-descriptions-item>
          <n-descriptions-item label="指纹摘要">
            <span class="mono">{{ detail.fingerprint_hash }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="Mobile 安装摘要">{{ detail.mobile_install_id || '-' }}</n-descriptions-item>
          <n-descriptions-item label="Win 主板摘要">{{ detail.win_mainboard_id_hash || '-' }}</n-descriptions-item>
          <n-descriptions-item label="设备名称">{{ detail.device_name || '-' }}</n-descriptions-item>
          <n-descriptions-item label="系统版本">{{ detail.os_version || '-' }}</n-descriptions-item>
          <n-descriptions-item label="App 版本">{{ detail.app_version || '-' }}</n-descriptions-item>
          <n-descriptions-item label="设备状态">{{ deviceStatusLabel(detail.status) }}</n-descriptions-item>
          <n-descriptions-item label="风险等级">{{ detail.risk_level || '-' }}</n-descriptions-item>
          <n-descriptions-item label="首次出现">{{ formatDateTime(detail.first_seen_at) }}</n-descriptions-item>
          <n-descriptions-item label="最后出现">{{ formatDateTime(detail.last_seen_at) }}</n-descriptions-item>
          <n-descriptions-item label="阻断原因">{{ detail.blocked_reason || '-' }}</n-descriptions-item>
        </n-descriptions>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, NTooltip, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { deviceApi } from '@/api/device'
import { useAuthStore } from '@/stores/auth'
import type { DeviceDetail, DeviceRiskCategory, DeviceRiskItem, DeviceRiskLevel } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import {
  clientTypeLabel,
  clientTypeOptions,
  deviceRiskCategoryLabel,
  deviceRiskCategoryOptions,
  deviceRiskLevelLabel,
  deviceRiskLevelOptions,
  deviceStatusLabel,
} from '@/utils/labels'
import { pageList, queryValue } from '@/utils/query'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()
const loading = ref(false)
const rows = ref<DeviceRiskItem[]>([])
const detail = ref<DeviceDetail | null>(null)
const detailVisible = ref(false)
const companyOptions = ref<SelectOption[]>([])

const filters = reactive({
  company_id: null as number | null,
  client_type: null as 'mobile' | 'win' | null,
  category: null as DeviceRiskCategory | null,
  level: null as DeviceRiskLevel | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const columns: DataTableColumns<DeviceRiskItem> = [
  { title: '设备 ID', key: 'device_fingerprint_id', width: 90 },
  { title: '企业', key: 'company_name', minWidth: 160, render: (row) => companyText(row) },
  { title: '最近用户', key: 'username', width: 140, render: (row) => userText(row) },
  { title: '客户端', key: 'client_type', width: 100, render: (row) => clientTypeLabel(row.client_type) },
  { title: '设备名称', key: 'device_name', minWidth: 150, render: (row) => row.device_name || '-' },
  {
    title: '危险类型',
    key: 'categories',
    minWidth: 260,
    render: (row) => renderCategoryTags(row),
  },
  {
    title: '等级',
    key: 'max_level',
    width: 90,
    render: (row) => riskLevelTag(row.max_level),
  },
  { title: '计数', key: 'count', width: 80, render: (row) => totalCount(row) },
  { title: '最近时间', key: 'last_at', width: 170, render: (row) => formatDateTime(row.last_at) },
  {
    title: '操作',
    key: 'actions',
    width: 170,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
        authStore.isSuperAdmin
          ? h(NButton, { size: 'small', quaternary: true, onClick: () => openRiskEvents() }, { default: () => '事件流' })
          : null,
      ]),
  },
]

function companyText(row: DeviceRiskItem) {
  return row.company?.company_name || row.company_name || (row.company_id ? `企业 #${row.company_id}` : '未归属')
}

function userText(row: DeviceRiskItem) {
  return row.user?.username || row.username || (row.user_id ? `用户 #${row.user_id}` : '-')
}

function totalCount(row: DeviceRiskItem) {
  return (row.categories || []).reduce((sum, item) => sum + Number(item.count || 0), 0)
}

function renderCategoryTags(row: DeviceRiskItem) {
  const categories = row.categories || []
  if (!categories.length) return '-'
  return h(
    'div',
    { class: 'risk-tags' },
    categories.map((item) => {
      const tag = h(
        NTag,
        { type: riskLevelTagType(item.level), round: true },
        { default: () => `${deviceRiskCategoryLabel(item.category)} · ${deviceRiskLevelLabel(item.level)} · ${item.count}` },
      )
      if (item.category !== 'account_churn') return tag
      return h(NTooltip, null, {
        trigger: () => tag,
        default: () => '同企业内多账号使用不判危；跨企业或无企业账号共享才计入风险。',
      })
    }),
  )
}

function riskLevelTag(level?: string) {
  return h(NTag, { type: riskLevelTagType(level), round: true }, { default: () => deviceRiskLevelLabel(level) })
}

function riskLevelTagType(level?: string) {
  if (level === 'high') return 'error'
  if (level === 'medium') return 'warning'
  return 'success'
}

async function loadCompanies() {
  if (!authStore.isBackOfficeScopeAll) return
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = pageList(result.list).map((item) => ({ label: `${item.company_name} #${item.id}`, value: item.id }))
}

async function fetchRisks() {
  loading.value = true
  try {
    const result = await deviceApi.risks({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: queryValue(filters.company_id),
      client_type: queryValue(filters.client_type),
      category: queryValue(filters.category),
      level: queryValue(filters.level),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } catch (error) {
    message.error('风险设备加载失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.company_id = null
  filters.client_type = null
  filters.category = null
  filters.level = null
  pagination.page = 1
  fetchRisks()
}

function handlePage(page: number) {
  pagination.page = page
  fetchRisks()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchRisks()
}

async function openDetail(row: DeviceRiskItem) {
  detail.value = await deviceApi.detail(row.device_fingerprint_id)
  detailVisible.value = true
}

function openRiskEvents() {
  router.push({ name: 'risks' })
}

onMounted(async () => {
  await Promise.all([loadCompanies(), fetchRisks()])
})
</script>

<style scoped>
.risk-note {
  margin-bottom: 14px;
}

.risk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
</style>
