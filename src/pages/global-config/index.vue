<template>
  <div class="page-shell">
    <PageHeader title="全局配置记录" subtitle="按企业和设备查看移动端上行的全局配置快照">
      <n-button :loading="loading" @click="refreshCurrent">刷新</n-button>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <div class="page-card archive-nav">
      <n-breadcrumb>
        <n-breadcrumb-item clickable @click="goCompanies">企业</n-breadcrumb-item>
        <n-breadcrumb-item v-if="selectedCompany" clickable @click="goDevices">
          设备：{{ companyDisplayName(selectedCompany) }}
        </n-breadcrumb-item>
      </n-breadcrumb>
    </div>

    <div v-if="level === 'companies'" class="page-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">企业</div>
          <div class="panel-subtitle">选择企业后查看该企业下的设备和全局配置版本。</div>
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
          <n-empty description="暂无企业记录" />
        </template>
      </n-data-table>
    </div>

    <div v-else class="page-card">
      <div class="panel-head">
        <div>
          <div class="panel-title">{{ selectedCompany ? companyDisplayName(selectedCompany) : '-' }} / 设备</div>
          <div class="panel-subtitle">设备指纹仅展示后端返回的脱敏值；点击设备进入该设备最新全局配置详情。</div>
        </div>
        <n-tag round>{{ devices.length }} 台</n-tag>
      </div>
      <n-data-table
        :columns="deviceColumns"
        :data="devices"
        :loading="loading"
        :pagination="false"
        :row-key="(row: ArchiveDeviceItem) => row.device_fingerprint_id"
        :row-props="deviceRowProps"
      >
        <template #empty>
          <n-empty description="该企业暂无设备记录" />
        </template>
      </n-data-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns } from 'naive-ui'
import { NButton, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { archiveApi } from '@/api/archive'
import type { ArchiveCompanyItem, ArchiveDeviceItem } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { pageList } from '@/utils/query'
import { authStatusLabel, clientTypeLabel, deviceStatusLabel } from '@/utils/labels'

type ArchiveLevel = 'companies' | 'devices'
type TagType = 'default' | 'success' | 'warning' | 'error' | 'info'

const router = useRouter()
const message = useMessage()
const loading = ref(false)
const errorText = ref('')
const level = ref<ArchiveLevel>('companies')
const companies = ref<ArchiveCompanyItem[]>([])
const devices = ref<ArchiveDeviceItem[]>([])
const selectedCompany = ref<ArchiveCompanyItem | null>(null)
const openingDeviceId = ref<number | null>(null)

const companyColumns: DataTableColumns<ArchiveCompanyItem> = [
  { title: '企业', key: 'company_name', minWidth: 220, render: (row) => companyDisplayName(row) },
  { title: '设备数', key: 'device_count', width: 110 },
  { title: '项目数', key: 'project_count', width: 110 },
  { title: '最近同步', key: 'last_uploaded_at', width: 190, render: (row) => formatDateTime(row.last_uploaded_at) },
  {
    title: '操作',
    key: 'actions',
    width: 120,
    fixed: 'right',
    render: (row) => h(NButton, { size: 'small', onClick: (event: MouseEvent) => openCompany(row, event) }, { default: () => '查看设备' }),
  },
]

const deviceColumns: DataTableColumns<ArchiveDeviceItem> = [
  { title: '设备', key: 'device_name', minWidth: 180, render: (row) => row.device_name || '-' },
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
  { title: '最近同步', key: 'last_uploaded_at', width: 170, render: (row) => formatDateTime(row.last_uploaded_at) },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    fixed: 'right',
    render: (row) =>
      h(
        NButton,
        { size: 'small', loading: openingDeviceId.value === row.device_fingerprint_id, onClick: (event: MouseEvent) => openDevice(row, event) },
        { default: () => '查看配置' },
      ),
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
    errorText.value = error instanceof Error ? error.message : '企业列表加载失败'
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
    errorText.value = error instanceof Error ? error.message : '设备列表加载失败'
  } finally {
    loading.value = false
  }
}

async function selectCompany(row: ArchiveCompanyItem) {
  selectedCompany.value = row
  devices.value = []
  level.value = 'devices'
  await loadDevices()
}

async function openDevice(row: ArchiveDeviceItem, event?: MouseEvent) {
  event?.stopPropagation()
  openingDeviceId.value = row.device_fingerprint_id
  try {
    const result = await archiveApi.listDeviceGlobalConfigs(row.device_fingerprint_id, { page: 1, page_size: 1 })
    const latest = pageList(result.list)[0]
    if (!latest) message.info('该设备暂无全局配置')
    await router.push({
      name: 'global-config-detail',
      params: { id: latest?.id || 0 },
      query: {
        device_id: String(row.device_fingerprint_id),
        device_name: row.device_name || '',
        fingerprint: row.fingerprint_hash_masked || '',
        company_id: selectedCompany.value?.company_id === null ? 'null' : String(selectedCompany.value?.company_id || ''),
        company_name: selectedCompany.value?.company_name || '',
      },
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '设备全局配置加载失败')
  } finally {
    openingDeviceId.value = null
  }
}

function openCompany(row: ArchiveCompanyItem, event?: MouseEvent) {
  event?.stopPropagation()
  selectCompany(row)
}

function refreshCurrent() {
  if (level.value === 'companies') {
    loadCompanies(false)
  } else {
    loadDevices()
  }
}

function goCompanies() {
  selectedCompany.value = null
  devices.value = []
  level.value = 'companies'
  if (!companies.value.length) loadCompanies(false)
}

function goDevices() {
  if (!selectedCompany.value) return
  level.value = 'devices'
  if (!devices.value.length) loadDevices()
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
  return clickableRow(() => openDevice(row))
}

onMounted(() => {
  loadCompanies(true)
})
</script>

<style scoped>
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
  .panel-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
