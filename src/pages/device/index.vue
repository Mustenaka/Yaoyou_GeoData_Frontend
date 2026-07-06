<template>
  <div class="page-shell">
    <PageHeader title="设备管理" subtitle="查看 Mobile/Win 设备、授权状态、风险等级与最近在线记录。" />

    <div class="page-card">
      <n-tabs v-model:value="activeTab" type="segment" @update:value="handleTabChange">
        <n-tab name="mobile">Mobile 设备</n-tab>
        <n-tab name="win">Win 设备</n-tab>
      </n-tabs>
    </div>

    <div class="page-card toolbar">
      <n-input-number v-model:value="filters.company_id" clearable placeholder="企业 ID" style="width: 140px" />
      <n-input-number v-model:value="filters.user_id" clearable placeholder="用户 ID" style="width: 140px" />
      <n-select v-model:value="filters.status" clearable :options="deviceStatusOptions" placeholder="设备状态" style="width: 140px" />
      <n-select v-model:value="filters.authorization_status" clearable :options="authStatusOptions" placeholder="授权状态" style="width: 140px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchDevices">查询</n-button>
      <n-button quaternary @click="resetDeviceFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="deviceColumns"
        :data="devices"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: DeviceItem) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="560">
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
          <n-descriptions-item label="状态">{{ deviceStatusLabel(detail.status) }}</n-descriptions-item>
          <n-descriptions-item label="风险等级">{{ detail.risk_level }}</n-descriptions-item>
          <n-descriptions-item label="首次出现">{{ formatDateTime(detail.first_seen_at) }}</n-descriptions-item>
          <n-descriptions-item label="最后出现">{{ formatDateTime(detail.last_seen_at) }}</n-descriptions-item>
          <n-descriptions-item label="阻断原因">{{ detail.blocked_reason || '-' }}</n-descriptions-item>
        </n-descriptions>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { deviceApi } from '@/api/device'
import type { AuthorizationStatus, DeviceDetail, DeviceItem, DeviceStatus } from '@/types/api'
import {
  authStatusLabel,
  authStatusOptions,
  clientTypeLabel,
  deviceStatusLabel,
  deviceStatusOptions,
} from '@/utils/labels'
import { formatDateTime } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'

type DeviceTab = 'mobile' | 'win'

const message = useMessage()
const route = useRoute()
const router = useRouter()
const activeTab = ref<DeviceTab>('mobile')
const loading = ref(false)
const devices = ref<DeviceItem[]>([])
const detail = ref<DeviceDetail | null>(null)
const detailVisible = ref(false)

const filters = reactive({
  company_id: null as number | null,
  user_id: null as number | null,
  status: null as DeviceStatus | null,
  authorization_status: null as AuthorizationStatus | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const deviceColumns: DataTableColumns<DeviceItem> = [
  { title: 'ID', key: 'id', width: 70 },
  { title: '企业', key: 'company_name', minWidth: 150, render: (row) => row.company_name || '-' },
  { title: '用户', key: 'username', width: 130, render: (row) => row.username || '-' },
  { title: '客户端', key: 'client_type', width: 90, render: (row) => clientTypeLabel(row.client_type) },
  { title: '设备名', key: 'device_name', width: 140, render: (row) => row.device_name || '-' },
  { title: '系统', key: 'os_version', width: 130, render: (row) => row.os_version || '-' },
  {
    title: '设备状态',
    key: 'status',
    width: 110,
    render: (row) =>
      h(NTag, { type: row.status === 'active' ? 'success' : row.status === 'blocked' ? 'error' : 'warning', round: true }, { default: () => deviceStatusLabel(row.status) }),
  },
  {
    title: '授权',
    key: 'authorization_status',
    width: 110,
    render: (row) =>
      h(
        NTag,
        { type: row.authorization_status === 'active' ? 'success' : row.authorization_status === 'revoked' ? 'error' : 'warning', round: true },
        { default: () => authStatusLabel(row.authorization_status) },
      ),
  },
  { title: '风险', key: 'risk_level', width: 90, render: (row) => riskTag(row.risk_level) },
  { title: '最近出现', key: 'last_seen_at', width: 170, render: (row) => formatDateTime(row.last_seen_at) },
  {
    title: '操作',
    key: 'actions',
    width: 310,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
        h(
          NPopconfirm,
          { onPositiveClick: () => updateDeviceStatus(row, row.status === 'active' ? 'disabled' : 'active') },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', type: row.status === 'active' ? 'warning' : 'success', ghost: true },
                { default: () => (row.status === 'active' ? '停用' : '恢复') },
              ),
            default: () => `确认${row.status === 'active' ? '停用' : '恢复'}设备 #${row.id}？`,
          },
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => updateDeviceStatus(row, 'blocked', 'admin_block') },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '阻断' }),
            default: () => `确认阻断设备 #${row.id}？`,
          },
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => revokeDevice(row) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '撤销授权' }),
            default: () => `确认撤销设备 #${row.id} 的授权？`,
          },
        ),
      ]),
  },
]

function riskTag(level: string) {
  const type = level === 'high' ? 'error' : level === 'medium' ? 'warning' : 'success'
  return h(NTag, { type, round: true }, { default: () => level || 'normal' })
}

async function fetchDevices() {
  loading.value = true
  try {
    const result = await deviceApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: queryValue(filters.company_id),
      user_id: queryValue(filters.user_id),
      client_type: activeTab.value,
      status: queryValue(filters.status),
      authorization_status: queryValue(filters.authorization_status),
    })
    devices.value = pageList(result.list)
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function tabFromRoute(): DeviceTab {
  const tab = route.query.tab
  if (tab === 'risk') {
    router.replace({ name: 'device-risks' })
    return 'mobile'
  }
  if (tab === 'win') return tab
  return 'mobile'
}

function navigateForTab(tab: DeviceTab) {
  const targetTab = tab === 'mobile' ? undefined : tab
  if (route.name !== 'devices' || route.query.tab !== targetTab) {
    router.push({ name: 'devices', query: targetTab ? { tab: targetTab } : {} })
  }
}

function handleTabChange(value: string | number) {
  activeTab.value = value as DeviceTab
  pagination.page = 1
  navigateForTab(activeTab.value)
  fetchDevices()
}

function handlePage(page: number) {
  pagination.page = page
  fetchDevices()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchDevices()
}

function resetDeviceFilters() {
  filters.company_id = null
  filters.user_id = null
  filters.status = null
  filters.authorization_status = null
  pagination.page = 1
  fetchDevices()
}

async function openDetail(row: DeviceItem) {
  detail.value = await deviceApi.detail(row.id)
  detailVisible.value = true
}

async function updateDeviceStatus(row: DeviceItem, status: DeviceStatus, reason?: string) {
  await deviceApi.updateStatus(row.id, status, reason)
  message.success('设备状态已更新')
  await fetchDevices()
}

async function revokeDevice(row: DeviceItem) {
  await deviceApi.revoke(row.id, 'admin_revoke')
  message.success('设备授权已撤销')
  await fetchDevices()
}

watch(
  () => route.query.tab,
  () => {
    const nextTab = tabFromRoute()
    if (nextTab === activeTab.value) return
    activeTab.value = nextTab
    pagination.page = 1
    fetchDevices()
  },
)

onMounted(() => {
  activeTab.value = tabFromRoute()
  fetchDevices()
})
</script>
