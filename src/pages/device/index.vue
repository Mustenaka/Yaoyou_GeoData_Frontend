<template>
  <div class="page-shell">
    <PageHeader :title="pageTitle" :subtitle="pageSubtitle" />

    <div class="page-card">
      <n-tabs v-model:value="activeTab" type="segment" @update:value="handleTabChange">
        <n-tab name="mobile">Mobile 设备</n-tab>
        <n-tab name="win">Win 设备</n-tab>
        <n-tab name="change">换机申请</n-tab>
        <n-tab name="risk">风险设备</n-tab>
      </n-tabs>
    </div>

    <div v-if="activeTab !== 'change'" class="page-card toolbar">
      <n-input-number v-model:value="filters.company_id" clearable placeholder="企业 ID" style="width: 140px" />
      <n-input-number v-model:value="filters.user_id" clearable placeholder="用户 ID" style="width: 140px" />
      <n-select v-model:value="filters.status" clearable :options="deviceStatusOptions" placeholder="设备状态" style="width: 140px" />
      <n-select v-model:value="filters.authorization_status" clearable :options="authStatusOptions" placeholder="授权状态" style="width: 140px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchDevices">查询</n-button>
      <n-button quaternary @click="resetDeviceFilters">重置</n-button>
    </div>

    <div v-else class="page-card toolbar">
      <n-select v-model:value="changeStatus" clearable :options="changeStatusOptions" placeholder="申请状态" style="width: 150px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchChangeRequests">查询</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        v-if="activeTab !== 'change'"
        remote
        :columns="deviceColumns"
        :data="devices"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: DeviceItem) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
      <n-data-table
        v-else
        remote
        :columns="changeColumns"
        :data="changeRequests"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: DeviceChangeRequest) => row.id"
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
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { deviceApi } from '@/api/device'
import type { AuthorizationStatus, DeviceChangeRequest, DeviceDetail, DeviceItem, DeviceStatus } from '@/types/api'
import {
  authStatusLabel,
  authStatusOptions,
  clientTypeLabel,
  deviceStatusLabel,
  deviceStatusOptions,
} from '@/utils/labels'
import { formatDateTime } from '@/utils/format'

type DeviceTab = 'mobile' | 'win' | 'change' | 'risk'

const message = useMessage()
const dialog = useDialog()
const route = useRoute()
const router = useRouter()
const activeTab = ref<DeviceTab>('mobile')
const loading = ref(false)
const devices = ref<DeviceItem[]>([])
const changeRequests = ref<DeviceChangeRequest[]>([])
const detail = ref<DeviceDetail | null>(null)
const detailVisible = ref(false)
const changeStatus = ref<string | null>('pending')

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

const pageTitle = computed(() => (activeTab.value === 'change' ? '换机申请' : '设备管理'))
const pageSubtitle = computed(() =>
  activeTab.value === 'change' ? '审批用户换绑 Mobile/Win 设备申请。' : '查看 Mobile/Win 设备、授权状态、风险等级与换机审批。',
)

const changeStatusOptions = [
  { label: '待处理', value: 'pending' },
  { label: '已同意', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

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

const changeColumns: DataTableColumns<DeviceChangeRequest> = [
  { title: '申请 ID', key: 'id', width: 90 },
  { title: '企业 ID', key: 'company_id', width: 100, render: (row) => row.company_id ?? '-' },
  { title: '用户 ID', key: 'user_id', width: 100 },
  { title: '客户端', key: 'new_client_type', width: 100, render: (row) => clientTypeLabel(row.new_client_type) },
  { title: '新设备指纹', key: 'new_fingerprint_hash', minWidth: 220, render: (row) => h('span', { class: 'mono' }, row.new_fingerprint_hash) },
  { title: '原因', key: 'reason', minWidth: 160, render: (row) => row.reason || '-' },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) =>
      h(NTag, { type: row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'error', round: true }, { default: () => changeStatusText(row.status) }),
  },
  { title: '申请时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row) =>
      row.status === 'pending'
        ? h('div', { class: 'table-actions' }, [
            h(NButton, { size: 'small', type: 'success', onClick: () => decideChange(row, true) }, { default: () => '同意' }),
            h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => decideChange(row, false) }, { default: () => '拒绝' }),
          ])
        : '-',
  },
]

function riskTag(level: string) {
  const type = level === 'high' ? 'error' : level === 'medium' ? 'warning' : 'success'
  return h(NTag, { type, round: true }, { default: () => level || 'normal' })
}

function changeStatusText(status: string) {
  if (status === 'approved') return '已同意'
  if (status === 'rejected') return '已拒绝'
  return '待处理'
}

async function fetchDevices() {
  loading.value = true
  try {
    const result = await deviceApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: filters.company_id,
      user_id: filters.user_id,
      client_type: activeTab.value === 'risk' ? undefined : activeTab.value,
      status: filters.status || undefined,
      authorization_status: filters.authorization_status || undefined,
      risk_level: activeTab.value === 'risk' ? 'high' : undefined,
    })
    devices.value = result.list
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

async function fetchChangeRequests() {
  loading.value = true
  try {
    const result = await deviceApi.changeRequests({
      page: pagination.page,
      page_size: pagination.pageSize,
      status: changeStatus.value || undefined,
    })
    changeRequests.value = result.list
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function reloadCurrent() {
  return activeTab.value === 'change' ? fetchChangeRequests() : fetchDevices()
}

function tabFromRoute(): DeviceTab {
  if (route.name === 'device-change-requests') return 'change'
  const tab = route.query.tab
  if (tab === 'win' || tab === 'risk') return tab
  return 'mobile'
}

function navigateForTab(tab: DeviceTab) {
  if (tab === 'change') {
    if (route.name !== 'device-change-requests') {
      router.push({ name: 'device-change-requests' })
    }
    return
  }

  const targetTab = tab === 'mobile' ? undefined : tab
  if (route.name !== 'devices' || route.query.tab !== targetTab) {
    router.push({ name: 'devices', query: targetTab ? { tab: targetTab } : {} })
  }
}

function handleTabChange(value: string | number) {
  activeTab.value = value as DeviceTab
  pagination.page = 1
  navigateForTab(activeTab.value)
  reloadCurrent()
}

function handlePage(page: number) {
  pagination.page = page
  reloadCurrent()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  reloadCurrent()
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

function decideChange(row: DeviceChangeRequest, approve: boolean) {
  dialog.warning({
    title: approve ? '确认同意换机' : '确认拒绝换机',
    content: approve ? '同意后将撤销旧授权并绑定新设备。' : '拒绝后旧设备授权保持不变。',
    positiveText: approve ? '同意' : '拒绝',
    negativeText: '取消',
    onPositiveClick: async () => {
      if (approve) {
        await deviceApi.approveChangeRequest(row.id, 'admin approve')
      } else {
        await deviceApi.rejectChangeRequest(row.id, 'admin reject')
      }
      message.success('换机申请已处理')
      await fetchChangeRequests()
    },
  })
}

watch(
  () => [route.name, route.query.tab],
  () => {
    const nextTab = tabFromRoute()
    if (nextTab === activeTab.value) return
    activeTab.value = nextTab
    pagination.page = 1
    reloadCurrent()
  },
)

onMounted(() => {
  activeTab.value = tabFromRoute()
  reloadCurrent()
})
</script>
