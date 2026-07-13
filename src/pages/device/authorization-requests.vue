<template>
  <div class="page-shell">
    <PageHeader title="授权审批" subtitle="审批后，设备即可在授权期限内使用项目。">
      <n-space>
        <n-button :disabled="checkedRowKeys.length === 0" @click="openBatchAuthorization">
          批量授权{{ checkedRowKeys.length ? `（${checkedRowKeys.length}）` : '' }}
        </n-button>
        <n-button type="primary" @click="openManualAuthorization">手动授权设备</n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="lastAuthorizedTarget" type="success" closable @close="lastAuthorizedTarget = null">
      <div class="result-alert">
        <span>设备授权已完成。</span>
        <n-button text type="primary" @click="goAuthorizedDevices(lastAuthorizedTarget)">查看授权设备</n-button>
      </div>
    </n-alert>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
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
        style="width: 220px"
      />
      <n-select v-model:value="filters.status" clearable :options="changeRequestStatusOptions" placeholder="审批状态" style="width: 150px" />
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
        :row-key="(row: DeviceChangeRequest) => row.id"
        :checked-row-keys="checkedRowKeys"
        :scroll-x="900"
        @update:checked-row-keys="handleCheckedRows"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-modal v-model:show="authorizeVisible" preset="card" title="授权设备" :mask-closable="false" style="width: min(680px, 92vw)">
      <n-alert type="info" :bordered="false" class="modal-note">
        授权后，该设备可使用项目。
      </n-alert>

      <n-scrollbar class="request-summary">
        <div v-for="request in authorizingRequests" :key="request.id" class="request-summary__item">
          <div>
            <strong>{{ requestCompanyLabel(request) }}</strong>
            <span>{{ requestDeviceLabel(request) }}</span>
          </div>
          <n-tag size="small" round>{{ clientLabel(request.new_client_type) }}</n-tag>
        </div>
      </n-scrollbar>

      <n-form label-placement="top">
        <n-form-item label="授权期限">
          <n-radio-group v-model:value="authorizeForm.mode" @update:value="handleAuthorizeModeUpdate">
            <n-radio-button value="long_term">长期有效</n-radio-button>
            <n-radio-button value="fixed_term">固定截止</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item v-if="authorizeForm.mode === 'fixed_term'" label="截止时间" required>
          <n-date-picker v-model:value="authorizeForm.valid_until_value" type="datetime" clearable style="width: 100%" />
        </n-form-item>
        <n-form-item label="备注">
          <n-input v-model:value="authorizeForm.note" type="textarea" :rows="3" maxlength="240" show-count placeholder="可选，填写本次授权说明" />
        </n-form-item>
      </n-form>

      <template #footer>
        <div class="modal-footer">
          <n-button @click="authorizeVisible = false">取消</n-button>
          <n-button type="primary" :loading="authorizeSubmitting" @click="submitAuthorization">
            {{ authorizingRequests.length > 1 ? `授权 ${authorizingRequests.length} 台设备` : '授权设备' }}
          </n-button>
        </div>
      </template>
    </n-modal>

    <n-modal v-model:show="manualVisible" preset="card" title="手动授权设备" :mask-closable="false" style="width: min(720px, 92vw)">
      <n-form label-placement="top">
        <n-form-item v-if="authStore.isBackOfficeScopeAll" label="企业">
          <n-select
            v-model:value="manualForm.company_id"
            clearable
            filterable
            :options="companyOptions"
            placeholder="选择企业后筛选登记账号"
            @update:value="handleManualCompanyChange"
          />
        </n-form-item>
        <n-form-item label="登记账号">
          <n-select
            v-model:value="manualForm.target_user_id"
            filterable
            remote
            clearable
            :loading="targetUserLoading"
            :options="targetUserOptions"
            placeholder="账号仅用于确定设备的企业归属"
            @search="fetchTargetUsers"
            @focus="() => fetchTargetUsers()"
          />
        </n-form-item>
        <n-form-item label="设备导出信息">
          <n-input
            v-model:value="manualForm.blob"
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
          <n-button @click="manualVisible = false">取消</n-button>
          <n-button type="primary" :loading="manualSubmitting" @click="submitManualAuthorization">授权设备</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { deviceApi } from '@/api/device'
import { ApiError } from '@/api/request'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { ChangeRequestStatus, DeviceChangeRequest, UserItem } from '@/types/api'
import { changeRequestStatusOptions } from '@/utils/labels'
import { addMonthsDatePickerValue, datePickerISOString, formatDateTime, shortHash } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'

type ValidityMode = 'long_term' | 'fixed_term'
type RowKey = string | number

interface AuthorizedTarget {
  company_id?: number | null
  device_fingerprint_id?: number | null
  client_type?: string
}

const authStore = useAuthStore()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const errorText = ref('')
const rows = ref<DeviceChangeRequest[]>([])
const checkedRowKeys = ref<RowKey[]>([])
const authorizeVisible = ref(false)
const authorizeSubmitting = ref(false)
const authorizingRequests = ref<DeviceChangeRequest[]>([])
const manualVisible = ref(false)
const manualSubmitting = ref(false)
const targetUserLoading = ref(false)
const targetUserOptions = ref<SelectOption[]>([])
const companyOptions = ref<SelectOption[]>([])
const blobFileInput = ref<HTMLInputElement | null>(null)
const lastAuthorizedTarget = ref<AuthorizedTarget | null>(null)

const filters = reactive({
  company_id: null as number | null,
  status: 'pending' as ChangeRequestStatus | null,
})

const authorizeForm = reactive({
  mode: 'long_term' as ValidityMode,
  valid_until_value: null as number | null,
  note: '',
})

const manualForm = reactive({
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

const columns: DataTableColumns<DeviceChangeRequest> = [
  { type: 'selection', disabled: (row) => row.status !== 'pending' },
  { title: '企业', key: 'company_id', minWidth: 180, render: requestCompanyLabel },
  {
    title: '设备',
    key: 'new_device_id',
    minWidth: 260,
    render: (row) => h('div', { class: 'device-cell' }, [
      h('span', { class: 'device-cell__name' }, requestDeviceLabel(row)),
      h('span', { class: 'device-cell__hash mono', title: row.new_fingerprint_hash }, shortHash(row.new_fingerprint_hash)),
    ]),
  },
  { title: '客户端', key: 'new_client_type', width: 100, render: (row) => clientLabel(row.new_client_type) },
  { title: '申请时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) => row.status === 'pending'
      ? h('div', { class: 'table-actions' }, [
          h(NButton, { size: 'small', type: 'primary', onClick: () => openAuthorization([row]) }, { default: () => '授权' }),
          h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => rejectRequest(row) }, { default: () => '拒绝' }),
        ])
      : h(NTag, { type: row.status === 'approved' ? 'success' : 'default', round: true }, { default: () => row.status === 'approved' ? '已授权' : '已拒绝' }),
  },
]

function requestCompanyLabel(row: DeviceChangeRequest) {
	if (row.company_name) return row.company_name
	if (row.company_id) return `企业 #${row.company_id}`
	const account = row.real_name || row.username || `#${row.user_id}`
	return `个人账号：${account}`
}

function requestDeviceLabel(row: DeviceChangeRequest) {
  return row.new_device_name || (row.new_device_id ? `设备 #${row.new_device_id}` : '待登记设备')
}

function clientLabel(value?: string) {
  if (value === 'mobile') return 'Mobile'
  if (value === 'win') return 'Win'
  return value || '-'
}

async function fetchRequests() {
  loading.value = true
  errorText.value = ''
  try {
    const result = await deviceApi.changeRequests({
      page: pagination.page,
      page_size: pagination.pageSize,
      status: queryValue(filters.status),
      company_id: queryValue(filters.company_id),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
    checkedRowKeys.value = []
  } catch (error) {
    rows.value = []
    pagination.itemCount = 0
    errorText.value = error instanceof Error ? error.message : '授权审批加载失败'
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.page = 1
  fetchRequests()
}

function resetFilters() {
  filters.company_id = null
  filters.status = 'pending'
  pagination.page = 1
  fetchRequests()
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

function handleCheckedRows(keys: RowKey[]) {
  checkedRowKeys.value = keys
}

function openBatchAuthorization() {
  const ids = new Set(checkedRowKeys.value.map(Number))
  const requests = rows.value.filter((row) => ids.has(row.id) && row.status === 'pending')
  const first = requests[0]
  if (!first) return
  const sameAuthorizationOwner = requests.every((request) => (
    first.company_id
      ? request.company_id === first.company_id
      : !request.company_id && request.user_id === first.user_id
  ))
  if (!sameAuthorizationOwner) {
    message.warning('批量授权只能选择同一企业的设备；个人设备需属于同一账号。Mobile 与 Win 可以一起选择。')
    return
  }
  openAuthorization(requests)
}

function openAuthorization(requests: DeviceChangeRequest[]) {
  if (!requests.length) return
  authorizingRequests.value = requests
  authorizeForm.mode = 'long_term'
  authorizeForm.valid_until_value = null
  authorizeForm.note = ''
  authorizeVisible.value = true
}

function handleAuthorizeModeUpdate(value: string | number) {
  if (value === 'long_term') {
    authorizeForm.valid_until_value = null
  } else if (!authorizeForm.valid_until_value) {
    authorizeForm.valid_until_value = addMonthsDatePickerValue()
  }
}

async function submitAuthorization() {
  if (!authorizingRequests.value.length) return
  if (authorizeForm.mode === 'fixed_term' && !authorizeForm.valid_until_value) {
    message.error('请选择截止时间')
    return
  }
  if (authorizeForm.valid_until_value && authorizeForm.valid_until_value <= Date.now()) {
    message.error('截止时间必须晚于当前时间')
    return
  }
  const validUntil = authorizeForm.mode === 'fixed_term' ? datePickerISOString(authorizeForm.valid_until_value) : null
  const note = authorizeForm.note.trim()
  authorizeSubmitting.value = true
  try {
    if (authorizingRequests.value.length === 1) {
      const request = authorizingRequests.value[0]
      await deviceApi.approveChangeRequest(request.id, { valid_from: null, valid_until: validUntil, note })
    } else {
      await deviceApi.batchApproveChangeRequests({
        items: authorizingRequests.value.map((request) => ({ id: request.id, valid_from: null, valid_until: validUntil })),
        note,
      })
    }
    const first = authorizingRequests.value[0]
    const sameCompany = authorizingRequests.value.every((request) => request.company_id === first.company_id)
    lastAuthorizedTarget.value = {
      company_id: sameCompany ? first.company_id : null,
      device_fingerprint_id: authorizingRequests.value.length === 1 ? first.new_device_id : null,
      client_type: authorizingRequests.value.length === 1 ? first.new_client_type : '',
    }
    message.success(`已授权 ${authorizingRequests.value.length} 台设备`)
    authorizeVisible.value = false
    checkedRowKeys.value = []
    await fetchRequests()
  } catch (error) {
    message.error(deviceRequestErrorText(error))
  } finally {
    authorizeSubmitting.value = false
  }
}

function rejectRequest(row: DeviceChangeRequest) {
  dialog.warning({
    title: '确认拒绝授权',
    content: '拒绝后，这台设备不会获得项目使用权限。',
    positiveText: '拒绝',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await deviceApi.rejectChangeRequest(row.id, 'admin reject')
        message.success('授权申请已拒绝')
        await fetchRequests()
      } catch (error) {
        message.error(deviceRequestErrorText(error))
      }
    },
  })
}

async function fetchCompanies() {
  if (!authStore.isBackOfficeScopeAll) return
  try {
    const result = await companyApi.list({ page: 1, page_size: 200 })
    companyOptions.value = pageList(result.list).map((item) => ({ label: `${item.company_name} #${item.id}`, value: item.id }))
  } catch {
    message.warning('企业筛选项加载失败，请稍后重试')
  }
}

async function fetchTargetUsers(keyword = '') {
  targetUserLoading.value = true
  try {
    const scopedCompanyID = authStore.isEnterpriseAdmin ? authStore.companyId : manualForm.company_id
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
  } catch {
    message.warning('账号选项加载失败，请稍后重试')
  } finally {
    targetUserLoading.value = false
  }
}

function canUseAsTargetUser(user: UserItem) {
  return !authStore.isEnterpriseAdmin || user.company_id === authStore.companyId
}

function targetUserLabel(user: UserItem) {
  const company = user.company_name ? ` / ${user.company_name}` : user.company_id ? ` / 企业 #${user.company_id}` : ''
  return `${user.username} #${user.id}${company}`
}

function openManualAuthorization() {
  manualForm.company_id = authStore.isEnterpriseAdmin ? authStore.companyId : null
  manualForm.target_user_id = null
  manualForm.blob = ''
  manualVisible.value = true
  fetchTargetUsers()
}

function handleManualCompanyChange() {
  manualForm.target_user_id = null
  fetchTargetUsers()
}

function openBlobFilePicker() {
  blobFileInput.value?.click()
}

async function handleBlobFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  manualForm.blob = (await file.text()).trim()
  input.value = ''
}

async function submitManualAuthorization() {
  if (!manualForm.target_user_id) {
    message.warning('请选择登记账号')
    return
  }
  const blob = manualForm.blob.trim()
  if (!blob) {
    message.warning('请粘贴或上传设备导出信息')
    return
  }
  manualSubmitting.value = true
  try {
    const result = await deviceApi.authorizeByExport({ blob, target_user_id: manualForm.target_user_id })
    message.success(`设备 #${result.device_fingerprint_id} 已授权`)
    lastAuthorizedTarget.value = {
      company_id: result.company_id,
      device_fingerprint_id: result.device_fingerprint_id,
      client_type: result.client_type,
    }
    manualVisible.value = false
    await fetchRequests()
  } catch (error) {
    message.error(deviceRequestErrorText(error))
  } finally {
    manualSubmitting.value = false
  }
}

function goAuthorizedDevices(target: AuthorizedTarget) {
  router.push({
    name: 'devices',
    query: {
      company_id: target.company_id ? String(target.company_id) : undefined,
      device_fingerprint_id: target.device_fingerprint_id ? String(target.device_fingerprint_id) : undefined,
      client_type: target.client_type || undefined,
    },
  })
}

function deviceRequestErrorText(error: unknown) {
  if (error instanceof ApiError) {
    const messages: Record<number, string> = {
      12006: '只能处理本企业用户或设备',
      13002: '设备已归属其他企业，不能授权',
      13009: '服务器未配置设备导出解密私钥',
      13010: '设备导出信息无法解析，请重新导出',
      13011: '设备导出信息已过期，请在 7 天内重新导出',
    }
    return messages[error.code] || error.message
  }
  return error instanceof Error ? error.message : '操作失败，请稍后重试'
}

onMounted(async () => {
  await Promise.all([fetchCompanies(), fetchRequests()])
})
</script>

<style scoped>
.result-alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.modal-note,
.request-summary {
  margin-bottom: 16px;
}

.request-summary {
  max-height: 220px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-sm);
}

.request-summary__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--yy-border);
}

.request-summary__item:last-child {
  border-bottom: 0;
}

.request-summary__item > div,
.device-cell {
  display: grid;
  gap: 4px;
}

.request-summary__item span,
.device-cell__hash {
  color: var(--text-color-3);
  font-size: 12px;
}

.device-cell__name {
  font-weight: 600;
}

.blob-file-row,
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 640px) {
  .result-alert,
  .blob-file-row,
  .request-summary__item {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
