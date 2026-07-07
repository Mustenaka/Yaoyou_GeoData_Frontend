<template>
  <div class="page-shell">
    <PageHeader title="授权审批" subtitle="统一处理换机和新增设备授权申请，也可通过移动端加密导出信息为指定用户代加设备。">
      <n-button type="primary" @click="openExportAuthorize">导出信息代加设备</n-button>
    </PageHeader>

    <div class="page-card toolbar">
      <n-select v-model:value="filters.request_type" clearable :options="deviceAuthorizationRequestTypeOptions" placeholder="申请类型" style="width: 150px" />
      <n-select v-model:value="filters.status" clearable :options="changeRequestStatusOptions" placeholder="审批状态" style="width: 150px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchRequests">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: DeviceChangeRequest) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-modal v-model:show="exportModalVisible" preset="card" title="导出信息代加设备" :mask-closable="false" style="width: min(720px, 92vw)">
      <n-form label-placement="top">
        <n-form-item v-if="authStore.isBackOfficeScopeAll" label="限定企业">
          <n-select
            v-model:value="exportForm.company_id"
            clearable
            filterable
            :options="companyOptions"
            placeholder="可选，选择后只显示该企业用户"
            @update:value="handleExportCompanyChange"
          />
        </n-form-item>
        <n-form-item label="目标用户">
          <n-select
            v-model:value="exportForm.target_user_id"
            filterable
            remote
            clearable
            :loading="targetUserLoading"
            :options="targetUserOptions"
            placeholder="搜索并选择要归属的用户"
            @search="fetchTargetUsers"
            @focus="() => fetchTargetUsers()"
          />
        </n-form-item>
        <n-form-item label="导出 blob">
          <n-input
            v-model:value="exportForm.blob"
            type="textarea"
            :autosize="{ minRows: 7, maxRows: 12 }"
            placeholder="粘贴移动端导出的 YWDEV1.<sealed_box> 文本"
          />
        </n-form-item>
        <div class="blob-file-row">
          <input ref="blobFileInput" class="hidden-file-input" type="file" accept=".txt,.json,.blob" @change="handleBlobFileChange" />
          <n-button secondary @click="openBlobFilePicker">上传导出文件</n-button>
          <n-text depth="3">文件内容只在浏览器内读取，并随请求提交给后端解密。</n-text>
        </div>
      </n-form>
      <template #footer>
        <div class="modal-footer">
          <n-button @click="exportModalVisible = false">取消</n-button>
          <n-button type="primary" :loading="exportSubmitting" @click="submitExportAuthorize">代加并激活</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { deviceApi } from '@/api/device'
import { ApiError } from '@/api/request'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { ChangeRequestStatus, DeviceAuthorizationRequestType, DeviceChangeRequest, UserItem } from '@/types/api'
import {
  changeRequestStatusLabel,
  changeRequestStatusOptions,
  clientTypeLabel,
  deviceAuthorizationRequestTypeLabel,
  deviceAuthorizationRequestTypeOptions,
} from '@/utils/labels'
import { formatDateTime } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'

const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const rows = ref<DeviceChangeRequest[]>([])
const exportModalVisible = ref(false)
const exportSubmitting = ref(false)
const targetUserLoading = ref(false)
const targetUserOptions = ref<SelectOption[]>([])
const companyOptions = ref<SelectOption[]>([])
const blobFileInput = ref<HTMLInputElement | null>(null)

const filters = reactive({
  request_type: null as DeviceAuthorizationRequestType | null,
  status: 'pending' as ChangeRequestStatus | null,
})

const exportForm = reactive({
  company_id: null as number | null,
  target_user_id: null as number | null,
  blob: '',
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

function changeRequestCompanyLabel(row: DeviceChangeRequest) {
  if (row.company_name) {
    return row.company_name
  }
  return row.company_id != null ? `#${row.company_id}` : '-'
}

function changeRequestUserLabel(row: DeviceChangeRequest) {
  if (row.username) {
    return row.real_name ? `${row.username}（${row.real_name}）` : row.username
  }
  return row.user_id != null ? `#${row.user_id}` : '-'
}

const columns: DataTableColumns<DeviceChangeRequest> = [
  { title: '申请 ID', key: 'id', width: 90 },
  {
    title: '类型',
    key: 'request_type',
    width: 110,
    render: (row) =>
      h(
        NTag,
        { type: row.request_type === 'device_add' ? 'info' : 'default', round: true },
        { default: () => deviceAuthorizationRequestTypeLabel(row.request_type || 'device_change') },
      ),
  },
  { title: '企业', key: 'company_id', width: 140, render: changeRequestCompanyLabel },
  { title: '用户', key: 'user_id', width: 160, render: changeRequestUserLabel },
  { title: '客户端', key: 'new_client_type', width: 100, render: (row) => clientTypeLabel(row.new_client_type) },
  {
    title: '原设备',
    key: 'old_device_id',
    width: 110,
    render: (row) => (row.request_type === 'device_add' ? '不撤旧' : row.old_device_id ? `#${row.old_device_id}` : '-'),
  },
  { title: '新设备', key: 'new_device_id', width: 110, render: (row) => (row.new_device_id ? `#${row.new_device_id}` : '-') },
  { title: '新设备指纹', key: 'new_fingerprint_hash', minWidth: 220, render: (row) => h('span', { class: 'mono' }, row.new_fingerprint_hash) },
  { title: '原因', key: 'reason', minWidth: 160, render: (row) => row.reason || '-' },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) =>
      h(NTag, { type: row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'error', round: true }, { default: () => changeRequestStatusLabel(row.status) }),
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
            h(NButton, { size: 'small', type: 'success', onClick: () => decideRequest(row, true) }, { default: () => '同意' }),
            h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => decideRequest(row, false) }, { default: () => '拒绝' }),
          ])
        : '-',
  },
]

async function fetchRequests() {
  loading.value = true
  try {
    const result = await deviceApi.changeRequests({
      page: pagination.page,
      page_size: pagination.pageSize,
      status: queryValue(filters.status),
      request_type: queryValue(filters.request_type),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function handlePage(page: number) {
  pagination.page = page
  fetchRequests()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchRequests()
}

function resetFilters() {
  filters.request_type = null
  filters.status = 'pending'
  pagination.page = 1
  fetchRequests()
}

function decideRequest(row: DeviceChangeRequest, approve: boolean) {
  const requestName = deviceAuthorizationRequestTypeLabel(row.request_type || 'device_change')
  const approveContent =
    row.request_type === 'device_add'
      ? '同意后将为新设备激活授权，不撤销用户已有设备。'
      : '同意后将按换机流程撤销旧授权并激活新设备。'
  dialog.warning({
    title: approve ? `确认同意${requestName}` : `确认拒绝${requestName}`,
    content: approve ? approveContent : '拒绝后不会改变现有设备授权。',
    positiveText: approve ? '同意' : '拒绝',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (approve) {
          await deviceApi.approveChangeRequest(row.id, 'admin approve')
        } else {
          await deviceApi.rejectChangeRequest(row.id, 'admin reject')
        }
        message.success('授权申请已处理')
        await fetchRequests()
      } catch (error) {
        message.error(deviceRequestErrorText(error))
      }
    },
  })
}

async function fetchCompanies() {
  if (!authStore.isBackOfficeScopeAll) return
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = pageList(result.list).map((item) => ({ label: `${item.company_name} #${item.id}`, value: item.id }))
}

async function fetchTargetUsers(keyword = '') {
  targetUserLoading.value = true
  try {
    const scopedCompanyID = authStore.isEnterpriseAdmin ? authStore.companyId : exportForm.company_id
    const result = await userApi.list({
      page: 1,
      page_size: 50,
      keyword: queryValue(keyword),
      company_id: queryValue(scopedCompanyID),
      status: 'active',
    })
    targetUserOptions.value = pageList(result.list)
      .filter(canUseAsTargetUser)
      .map((item) => ({ label: targetUserLabel(item), value: item.id }))
  } finally {
    targetUserLoading.value = false
  }
}

function canUseAsTargetUser(user: UserItem) {
  if (!authStore.isEnterpriseAdmin) return true
  return user.company_id === authStore.companyId
}

function targetUserLabel(user: UserItem) {
  const company = user.company_name ? ` / ${user.company_name}` : user.company_id ? ` / 企业 #${user.company_id}` : ''
  const products = [user.can_use_mobile ? 'Mobile' : '', user.can_use_win ? 'Win' : ''].filter(Boolean).join('+')
  return `${user.username} #${user.id}${company}${products ? ` / ${products}` : ''}`
}

function openExportAuthorize() {
  exportForm.company_id = authStore.isEnterpriseAdmin ? authStore.companyId : null
  exportForm.target_user_id = null
  exportForm.blob = ''
  exportModalVisible.value = true
  fetchTargetUsers()
}

function handleExportCompanyChange() {
  exportForm.target_user_id = null
  fetchTargetUsers()
}

function openBlobFilePicker() {
  blobFileInput.value?.click()
}

async function handleBlobFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  exportForm.blob = (await file.text()).trim()
  input.value = ''
}

async function submitExportAuthorize() {
  if (!exportForm.target_user_id) {
    message.warning('请选择目标用户')
    return
  }
  const blob = exportForm.blob.trim()
  if (!blob) {
    message.warning('请粘贴或上传导出 blob')
    return
  }
  exportSubmitting.value = true
  try {
    const result = await deviceApi.authorizeByExport({
      blob,
      target_user_id: exportForm.target_user_id,
    })
    message.success(`设备已代加并激活授权 #${result.device_authorization_id}`)
    exportModalVisible.value = false
    await fetchRequests()
  } catch (error) {
    message.error(deviceRequestErrorText(error))
  } finally {
    exportSubmitting.value = false
  }
}

function deviceRequestErrorText(error: unknown) {
  if (error instanceof ApiError) {
    const messages: Record<number, string> = {
      12006: '只能处理本企业用户或设备',
      13002: '设备已归属其他企业，不能代加',
      13008: '设备授权配额已满，请先撤销旧授权或调整企业配额',
      13009: '服务器未配置设备导出解密私钥',
      13010: '导出数据无法解析，请重新导出设备信息',
      13011: '导出数据已过期，请在 7 天内重新导出',
    }
    return messages[error.code] || error.message
  }
  return '操作失败，请稍后重试'
}

onMounted(() => {
  fetchCompanies()
  fetchRequests()
})
</script>

<style scoped>
.blob-file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: -4px;
}

.hidden-file-input {
  display: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
