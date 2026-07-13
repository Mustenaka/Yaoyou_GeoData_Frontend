<template>
  <div class="page-shell">
    <PageHeader title="授权设备" subtitle="按企业查看当前获准使用项目的设备，并直接维护每台设备的授权期限。" />

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <div class="page-card toolbar">
      <n-select
        v-if="authStore.isBackOfficeScopeAll"
        v-model:value="filters.company_id"
        clearable
        filterable
        remote
        :loading="companyOptionsLoading"
        :options="companyOptions"
        placeholder="搜索企业"
        style="width: 220px"
        @search="searchCompanies"
      />
      <n-select v-model:value="filters.client_type" clearable :options="clientOptions" placeholder="客户端" style="width: 130px" />
      <n-input-number v-model:value="filters.device_fingerprint_id" clearable placeholder="设备 ID" style="width: 140px" />
      <n-select v-model:value="filters.state" clearable :options="authorizationStateOptions" placeholder="授权记录" style="width: 140px" />
      <div class="toolbar__spacer" />
      <n-button @click="applyFilters">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="columns"
        :data="bindings"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: DeviceBindingItem) => row.id"
        :scroll-x="1040"
        :row-props="bindingRowProps"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="validityVisible" width="min(520px, 100vw)">
      <n-drawer-content title="修改授权期限">
        <n-form v-if="editingBinding" label-placement="top">
          <n-descriptions bordered :column="1" class="device-summary">
            <n-descriptions-item label="企业">{{ companyLabel(editingBinding) }}</n-descriptions-item>
            <n-descriptions-item label="设备">{{ deviceLabel(editingBinding) }}</n-descriptions-item>
            <n-descriptions-item label="客户端">{{ clientLabel(editingBinding) }}</n-descriptions-item>
          </n-descriptions>

          <n-form-item label="授权期限">
            <n-radio-group v-model:value="validityForm.mode" @update:value="handleValidityModeUpdate">
              <n-radio-button value="long_term">长期有效</n-radio-button>
              <n-radio-button value="fixed_term">固定截止</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-form-item label="开始时间">
            <n-date-picker v-model:value="validityForm.valid_from_value" type="datetime" clearable placeholder="留空则立即生效" style="width: 100%" />
          </n-form-item>
          <n-form-item v-if="validityForm.mode === 'fixed_term'" label="截止时间" required>
            <n-date-picker v-model:value="validityForm.valid_until_value" type="datetime" clearable placeholder="请选择设备授权截止时间" style="width: 100%" />
          </n-form-item>

          <n-alert type="info" :bordered="false">
            修改只影响这台设备；同企业的账号和其他设备不受影响。
          </n-alert>
        </n-form>
        <template #footer>
          <div class="drawer-footer">
            <n-button @click="validityVisible = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="submitValidity">保存</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="revokeVisible" preset="card" title="取消设备授权" style="width: min(520px, 92vw)">
      <n-alert type="warning" :bordered="false" class="modal-note">
        取消后，这台设备将不能继续使用项目；同企业的其他设备不受影响。
      </n-alert>
      <n-form-item label="原因" required>
        <n-input v-model:value="revokeReason" type="textarea" :rows="3" maxlength="240" show-count placeholder="请输入可审计的取消原因" />
      </n-form-item>
      <div class="drawer-footer">
        <n-button @click="revokeVisible = false">返回</n-button>
        <n-button type="error" :loading="revokeSaving" @click="submitRevoke">确认取消授权</n-button>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { deviceBindingApi } from '@/api/authorization'
import { useAuthStore } from '@/stores/auth'
import type { AuthorizationCapabilities, DeviceBindingItem, DeviceBindingState, ProductCode } from '@/types/api'
import { addMonthsDatePickerValue, datePickerISOString, datePickerValue, formatDateTime, shortHash } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'
import { fetchCompanySelectOptions, mergeSelectedOption } from '@/utils/adminOptions'

type TagType = 'default' | 'success' | 'warning' | 'error' | 'info'
type ValidityMode = 'long_term' | 'fixed_term'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const loading = ref(false)
const saving = ref(false)
const revokeSaving = ref(false)
const errorText = ref('')
const bindings = ref<DeviceBindingItem[]>([])
const validityVisible = ref(false)
const revokeVisible = ref(false)
const editingBinding = ref<DeviceBindingItem | null>(null)
const revokingBinding = ref<DeviceBindingItem | null>(null)
const revokeReason = ref('')
const companyOptions = ref<SelectOption[]>([])
const companyOptionsLoading = ref(false)
const pageCapabilities = ref<AuthorizationCapabilities>({})
const targetBindingId = ref<number | null>(null)
let internalRouteUpdate = false

const clientOptions = [
  { label: 'Mobile', value: 'mobile' },
  { label: 'Win', value: 'win' },
]

const authorizationStateOptions = [
  { label: '当前授权', value: 'approved' },
  { label: '已取消', value: 'revoked' },
]

const filters = reactive({
  company_id: null as number | null,
  client_type: null as ProductCode | null,
  device_fingerprint_id: null as number | null,
  state: 'approved' as DeviceBindingState | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const validityForm = reactive({
  mode: 'long_term' as ValidityMode,
  valid_from_value: null as number | null,
  valid_until_value: null as number | null,
})

const columns: DataTableColumns<DeviceBindingItem> = [
  { title: '企业', key: 'company_name', minWidth: 180, render: companyLabel },
  {
    title: '设备',
    key: 'device_name',
    minWidth: 220,
    render: (row) => h('div', { class: 'device-cell' }, [
      h('span', { class: 'device-cell__name' }, deviceLabel(row)),
      h('span', { class: 'device-cell__hash mono', title: row.fingerprint_hash || '' }, shortHash(row.fingerprint_hash)),
    ]),
  },
  { title: '客户端', key: 'client_type', width: 100, render: clientLabel },
  {
    title: '授权状态',
    key: 'authorization_status',
    width: 120,
    render: (row) => {
      const state = authorizationViewState(row)
      return h(NTag, { type: authorizationTagType(state), round: true }, { default: () => authorizationStateLabel(state) })
    },
  },
  { title: '授权期限', key: 'valid_until', minWidth: 235, render: authorizationValidityLabel },
  { title: '最近使用', key: 'last_seen_at', width: 170, render: (row) => formatDateTime(row.last_seen_at) },
  {
    title: '操作',
    key: 'actions',
    width: 210,
    fixed: 'right',
    render: (row) => h('div', { class: 'table-actions' }, [
      rowCanUpdate(row)
        ? h(NButton, { size: 'small', onClick: () => openValidity(row) }, { default: () => '修改期限' })
        : null,
      rowCanRevoke(row)
        ? h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => openRevoke(row) }, { default: () => '取消授权' })
        : null,
    ]),
  },
]

function firstQueryString(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function queryNumber(value: unknown) {
  const parsed = Number(firstQueryString(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function companyLabel(row: DeviceBindingItem) {
	if (row.company_id) return row.company_name || `企业 #${row.company_id}`
	return `个人账号：${row.subject_name || (row.owner_user_id ? `#${row.owner_user_id}` : '未知')}`
}

function deviceLabel(row: DeviceBindingItem) {
  return row.device_name || `设备 #${row.device_fingerprint_id}`
}

function clientValue(row: DeviceBindingItem) {
  return row.client_type || row.product_code
}

function clientLabel(row: DeviceBindingItem) {
  const client = clientValue(row)
  if (client === 'mobile') return 'Mobile'
  if (client === 'win') return 'Win'
  return client || '-'
}

function authorizationValidFrom(row: DeviceBindingItem) {
	if (row.valid_from !== undefined) return row.valid_from
	return row.valid_from_override ?? null
}

function authorizationValidUntil(row: DeviceBindingItem) {
	if (row.valid_until !== undefined) return row.valid_until
	return row.valid_until_override ?? null
}

function authorizationViewState(row: DeviceBindingItem) {
  if (row.state === 'revoked') return 'revoked'
  if (row.device_status === 'blocked') return 'blocked'
  if (row.device_status === 'disabled') return 'disabled'
	const backendState = String(row.device_readiness_status || '').toLowerCase()
  if (backendState.includes('not_started')) return 'not_started'
  if (backendState.includes('expired')) return 'expired'
  const now = Date.now()
  const from = authorizationValidFrom(row)
  const until = authorizationValidUntil(row)
  if (from && Date.parse(from) > now) return 'not_started'
  if (until && Date.parse(until) < now) return 'expired'
  return 'valid'
}

function authorizationStateLabel(state: string) {
  const labels: Record<string, string> = {
    valid: '有效',
    not_started: '未生效',
    expired: '已过期',
    revoked: '已取消',
    blocked: '已阻断',
    disabled: '已停用',
  }
  return labels[state] || state
}

function authorizationTagType(state: string): TagType {
  if (state === 'valid') return 'success'
  if (state === 'not_started') return 'warning'
  if (state === 'expired' || state === 'revoked' || state === 'blocked') return 'error'
  return 'default'
}

function authorizationValidityLabel(row: DeviceBindingItem) {
  const from = authorizationValidFrom(row)
  const until = authorizationValidUntil(row)
  if (!from && !until) return '长期有效'
  const fromText = from ? formatDateTime(from) : '立即生效'
  return until ? `${fromText} 至 ${formatDateTime(until)}` : `${fromText}起长期有效`
}

function rowCanUpdate(row: DeviceBindingItem) {
  return row.state === 'approved' && pageCapabilities.value.can_update !== false && row.capabilities?.can_update !== false
}

function rowCanRevoke(row: DeviceBindingItem) {
  return row.state === 'approved' && pageCapabilities.value.can_revoke !== false && row.capabilities?.can_revoke !== false
}

function applyRouteFilters() {
  filters.company_id = queryNumber(route.query.company_id)
  const client = firstQueryString(route.query.client_type) || firstQueryString(route.query.product_code) || firstQueryString(route.query.tab)
  filters.client_type = client === 'mobile' || client === 'win' ? client : null
  filters.device_fingerprint_id = queryNumber(route.query.device_fingerprint_id) ?? queryNumber(route.query.device_id)
  const state = firstQueryString(route.query.state)
  filters.state = state === 'revoked' ? 'revoked' : 'approved'
  targetBindingId.value = queryNumber(route.query.binding_id)
}

async function searchCompanies(keyword = '') {
  if (!authStore.isBackOfficeScopeAll) return
  companyOptionsLoading.value = true
  const previous = companyOptions.value
  try {
    let next = await fetchCompanySelectOptions(keyword)
    if (filters.company_id) {
      next = mergeSelectedOption(next, previous.find((option) => option.value === filters.company_id) || {
        label: `企业 #${filters.company_id}`,
        value: filters.company_id,
      })
    }
    companyOptions.value = next
  } catch {
    message.warning('企业筛选项加载失败，请稍后重试')
  } finally {
    companyOptionsLoading.value = false
  }
}

async function fetchBindings() {
  loading.value = true
  errorText.value = ''
  try {
    const result = await deviceBindingApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      binding_id: queryValue(targetBindingId.value),
      company_id: queryValue(filters.company_id),
      client_type: queryValue(filters.client_type),
      state: queryValue(filters.state),
      device_fingerprint_id: queryValue(filters.device_fingerprint_id),
    })
    bindings.value = pageList(result.list)
    pagination.itemCount = result.total
    pageCapabilities.value = result.capabilities || {}
  } catch (error) {
    bindings.value = []
    pagination.itemCount = 0
    errorText.value = error instanceof Error ? error.message : '授权设备加载失败'
  } finally {
    loading.value = false
  }
}

async function applyFilters() {
  pagination.page = 1
  targetBindingId.value = null
  await syncRouteFromFilters()
  await fetchBindings()
}

async function resetFilters() {
  filters.company_id = null
  filters.client_type = null
  filters.device_fingerprint_id = null
  filters.state = 'approved'
  targetBindingId.value = null
  pagination.page = 1
  await syncRouteFromFilters()
  await fetchBindings()
}

async function syncRouteFromFilters() {
  internalRouteUpdate = true
  try {
    await router.replace({
      name: 'devices',
      query: {
        company_id: filters.company_id ? String(filters.company_id) : undefined,
        client_type: filters.client_type || undefined,
        device_fingerprint_id: filters.device_fingerprint_id ? String(filters.device_fingerprint_id) : undefined,
        state: filters.state === 'revoked' ? 'revoked' : undefined,
      },
    })
    await nextTick()
  } finally {
    internalRouteUpdate = false
  }
}

function handlePage(page: number) {
  pagination.page = page
  fetchBindings()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchBindings()
}

function handleValidityModeUpdate(value: string | number) {
  if (value === 'long_term') {
    validityForm.valid_until_value = null
  } else if (!validityForm.valid_until_value) {
    validityForm.valid_until_value = addMonthsDatePickerValue()
  }
}

function openValidity(row: DeviceBindingItem) {
  if (!rowCanUpdate(row)) return
  editingBinding.value = row
  const validUntil = authorizationValidUntil(row)
  validityForm.mode = validUntil ? 'fixed_term' : 'long_term'
  validityForm.valid_from_value = datePickerValue(authorizationValidFrom(row))
  validityForm.valid_until_value = datePickerValue(validUntil)
  validityVisible.value = true
}

async function submitValidity() {
  const row = editingBinding.value
  if (!row || !rowCanUpdate(row)) return
  if (validityForm.mode === 'fixed_term' && !validityForm.valid_until_value) {
    message.error('请选择截止时间')
    return
  }
  if (validityForm.valid_from_value && validityForm.valid_until_value && validityForm.valid_until_value <= validityForm.valid_from_value) {
    message.error('截止时间必须晚于开始时间')
    return
  }
  const confirmed = await confirmAction('保存后，这台设备将立即按新期限重新判定是否可用。')
  if (!confirmed) return
  saving.value = true
  try {
    await deviceBindingApi.update(row.id, {
      valid_from: datePickerISOString(validityForm.valid_from_value),
      valid_until: validityForm.mode === 'fixed_term' ? datePickerISOString(validityForm.valid_until_value) : null,
      expected_revision: row.revision,
    })
    message.success('设备授权期限已更新')
    validityVisible.value = false
    await fetchBindings()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '设备授权期限更新失败')
  } finally {
    saving.value = false
  }
}

function openRevoke(row: DeviceBindingItem) {
  if (!rowCanRevoke(row)) return
  revokingBinding.value = row
  revokeReason.value = ''
  revokeVisible.value = true
}

async function submitRevoke() {
  const row = revokingBinding.value
  if (!row || !rowCanRevoke(row)) return
  const reason = revokeReason.value.trim()
  if (!reason) {
    message.error('请输入取消原因')
    return
  }
  revokeSaving.value = true
  try {
    await deviceBindingApi.revoke(row.id, row.revision, reason)
    message.success('设备授权已取消')
    revokeVisible.value = false
    await fetchBindings()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '取消设备授权失败')
  } finally {
    revokeSaving.value = false
  }
}

function bindingRowProps(row: DeviceBindingItem) {
  return targetBindingId.value === row.id ? { class: 'target-row' } : {}
}

function confirmAction(content: string) {
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '确认修改授权',
      content,
      positiveText: '确认保存',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
}

watch(
  () => [route.query.company_id, route.query.client_type, route.query.product_code, route.query.device_fingerprint_id, route.query.device_id, route.query.binding_id, route.query.state],
  async () => {
    if (internalRouteUpdate) return
    applyRouteFilters()
    pagination.page = 1
    await fetchBindings()
    await searchCompanies()
  },
)

onMounted(async () => {
  applyRouteFilters()
  await Promise.all([fetchBindings(), searchCompanies()])
})
</script>

<style scoped>
.device-cell {
  display: grid;
  gap: 4px;
}

.device-cell__name {
  font-weight: 600;
}

.device-cell__hash {
  color: var(--text-color-3);
  font-size: 12px;
}

.device-summary,
.modal-note {
  margin-bottom: 16px;
}

:deep(.target-row td) {
  background: rgba(24, 160, 88, 0.1) !important;
}

@media (max-width: 700px) {
  :deep(.n-drawer-body-content-wrapper) {
    padding: 16px;
  }
}
</style>
