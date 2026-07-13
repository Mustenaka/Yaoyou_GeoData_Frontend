<template>
  <div class="page-shell">
    <PageHeader title="授权设备" subtitle="分开查看设备安全状态、产品绑定状态与设备侧准入基础判定。" />

    <n-alert class="model-note" type="info" :bordered="false">
      <div class="model-note__content">
        <span>此页不冒充任意用户的完整准入结论；“设备侧状态”仅包含产品权益、设备绑定与指纹安全状态。</span>
        <n-space size="small">
          <n-tag size="small" :type="isV2Mode ? 'success' : 'warning'">{{ sourceOfTruthLabel }}</n-tag>
          <n-tag size="small" :type="assignedUserSupported ? 'success' : 'default'">
            {{ assignedUserSupported ? '专属用户已启用' : '专属用户暂未启用' }}
          </n-tag>
        </n-space>
      </div>
    </n-alert>

    <n-alert v-if="errorText" class="page-error" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <div class="page-card">
      <n-tabs v-model:value="activeTab" type="segment" @update:value="handleTabChange">
        <n-tab name="mobile">Mobile 设备</n-tab>
        <n-tab name="win">Win 设备</n-tab>
      </n-tabs>
    </div>

    <div class="page-card toolbar">
      <n-select v-if="authStore.isBackOfficeScopeAll" v-model:value="filters.company_id" clearable filterable remote :loading="companyOptionsLoading" :options="companyOptions" placeholder="搜索企业主体" style="width: 210px" @search="searchCompanies" />
      <n-input-number v-model:value="filters.device_fingerprint_id" clearable placeholder="设备 ID" style="width: 140px" />
      <n-select v-model:value="filters.state" clearable :options="deviceBindingStateOptions" placeholder="绑定状态" style="width: 140px" />
      <n-select v-model:value="filters.device_status" clearable :options="deviceStatusOptions" placeholder="设备安全状态" style="width: 150px" />
      <n-select v-model:value="filters.effective_status" clearable filterable :options="effectiveAccessStatusOptions" placeholder="设备侧状态" style="width: 190px" />
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
        :scroll-x="1560"
        :row-props="bindingRowProps"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="min(680px, 100vw)">
      <n-drawer-content :title="detail ? `授权设备 #${detail.device_fingerprint_id}` : '设备详情'">
        <n-descriptions v-if="detail" bordered :column="descriptionColumns" label-placement="left">
          <n-descriptions-item label="绑定 ID">{{ detail.id }}</n-descriptions-item>
          <n-descriptions-item label="产品授权 ID">{{ detail.entitlement_id }}</n-descriptions-item>
          <n-descriptions-item label="绑定权益代次">{{ detail.entitlement_generation }}</n-descriptions-item>
          <n-descriptions-item label="当前权益代次">{{ detail.current_entitlement_generation ?? detail.entitlement_generation }}</n-descriptions-item>
          <n-descriptions-item label="授权主体">{{ bindingSubject(detail) }}</n-descriptions-item>
          <n-descriptions-item label="产品">{{ productCodeLabel(detail.product_code) }}</n-descriptions-item>
          <n-descriptions-item label="设备名称">{{ detail.device_name || '-' }}</n-descriptions-item>
          <n-descriptions-item label="设备 ID">{{ detail.device_fingerprint_id }}</n-descriptions-item>
          <n-descriptions-item label="指纹摘要" :span="2">
            <span class="mono">{{ shortHash(detail.fingerprint_hash) }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="设备安全状态">{{ deviceStatusLabel(detail.device_status) }}</n-descriptions-item>
          <n-descriptions-item label="风险等级">{{ detail.risk_level || '-' }}</n-descriptions-item>
          <n-descriptions-item label="绑定状态">{{ deviceBindingStateLabel(detail.state) }}</n-descriptions-item>
          <n-descriptions-item label="共享范围">{{ assignmentLabel(detail) }}</n-descriptions-item>
          <n-descriptions-item label="设备侧状态">{{ effectiveStatusLabel(detail.device_readiness_status) }}</n-descriptions-item>
          <n-descriptions-item label="实际截止">{{ formatValidityDateTime(detail.effective_until) }}</n-descriptions-item>
          <n-descriptions-item label="阻断原因" :span="2">{{ blockingReasonLabel(detail.blocking_reason) }}</n-descriptions-item>
          <n-descriptions-item label="临时设备期限" :span="2">{{ bindingOverrideLabel(detail) }}</n-descriptions-item>
          <n-descriptions-item label="审批来源">{{ activationSourceLabel(detail.activation_source) }}</n-descriptions-item>
          <n-descriptions-item label="批准时间">{{ formatDateTime(detail.approved_at) }}</n-descriptions-item>
          <n-descriptions-item label="最近出现">{{ formatDateTime(detail.last_seen_at) }}</n-descriptions-item>
          <n-descriptions-item label="最近校验">{{ formatDateTime(detail.last_check_at) }}</n-descriptions-item>
          <n-descriptions-item label="旧授权 ID">{{ detail.legacy_authorization_id || '-' }}</n-descriptions-item>
          <n-descriptions-item label="读权威模式">{{ sourceModeLabel(detail.source_of_truth) }}</n-descriptions-item>
          <n-descriptions-item v-if="detail.revoked_reason" label="撤销原因" :span="2">{{ detail.revoked_reason }}</n-descriptions-item>
        </n-descriptions>
        <n-space v-if="detail" class="detail-actions">
          <n-button secondary @click="goEntitlement(detail)">查看产品授权</n-button>
          <n-button v-if="detail.legacy_authorization_id" secondary @click="goLegacyAuthorization(detail)">查看旧授权记录</n-button>
          <n-button v-if="rowCanUpdate(detail)" @click="openEdit(detail)">调整绑定</n-button>
          <n-button v-if="rowCanReapprove(detail)" type="warning" @click="reapproveBinding(detail)">重新批准到新代次</n-button>
          <n-button v-if="rowCanRevoke(detail)" type="error" ghost @click="openBindingRevoke(detail)">撤销绑定</n-button>
        </n-space>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="editVisible" width="min(560px, 100vw)">
      <n-drawer-content title="调整设备绑定">
        <n-alert v-if="editingBinding?.company_id && !assignedUserSupportedFor(editingBinding)" type="warning" class="drawer-note">
          {{ assignedUserRestrictionReason(editingBinding) }}
        </n-alert>
        <n-form label-placement="top">
          <n-form-item label="绑定状态">
            <n-select v-model:value="editForm.state" :options="editableBindingStateOptions" />
          </n-form-item>
          <n-form-item v-if="editingBinding?.company_id" label="使用范围">
            <n-radio-group v-model:value="editForm.assignment_mode" :disabled="!assignedUserSupportedFor(editingBinding)">
              <n-radio-button value="shared">企业共享</n-radio-button>
              <n-radio-button value="assigned">指定专属用户</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-form-item v-else label="使用范围">
            <n-input :value="`个人权益持有人 · 用户 #${editingBinding?.owner_user_id ?? '-'}`" disabled />
          </n-form-item>
          <n-form-item v-if="editingBinding?.company_id && editForm.assignment_mode === 'assigned'" label="专属用户" required>
            <n-select
              v-model:value="editForm.assigned_user_id"
              filterable
              remote
              :loading="assignedUserOptionsLoading"
              :options="assignedUserOptions"
              :disabled="!assignedUserSupportedFor(editingBinding)"
              placeholder="仅显示同主体且已开启对应产品准入的用户"
              @search="searchAssignedUsers"
            />
          </n-form-item>
          <n-form-item label="设备期限来源">
            <n-radio-group v-model:value="editForm.override_mode" @update:value="handleOverrideModeUpdate">
              <n-radio-button value="inherit">继承产品授权</n-radio-button>
              <n-radio-button value="temporary">临时设备例外</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-grid v-if="editForm.override_mode === 'temporary'" responsive="screen" cols="1 s:2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="临时生效时间">
                <n-date-picker v-model:value="editForm.valid_from_value" type="datetime" clearable placeholder="留空立即生效" style="width: 100%" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="临时截止时间" required>
                <n-date-picker v-model:value="editForm.valid_until_value" type="datetime" clearable placeholder="必须早于或等于产品截止" style="width: 100%" />
              </n-form-item>
            </n-grid-item>
          </n-grid>
          <n-alert type="default" :bordered="false">
            停用或阻断设备不会释放设备额度；只有显式撤销绑定才释放额度。
          </n-alert>
        </n-form>
        <template #footer>
          <div class="drawer-footer">
            <n-button @click="editVisible = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="submitBinding">保存</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="bindingRevokeVisible" preset="card" title="撤销设备绑定" style="width: min(520px, 92vw)">
      <n-alert type="error" :bordered="false" class="drawer-note">
        撤销绑定会释放设备额度并使该设备立即不可用；停用或阻断设备则不会释放额度。
      </n-alert>
      <n-form-item label="撤销原因" required>
        <n-input v-model:value="bindingRevokeReason" type="textarea" :rows="3" maxlength="240" show-count placeholder="请输入可审计的撤销原因" />
      </n-form-item>
      <div class="drawer-footer">
        <n-button @click="bindingRevokeVisible = false">取消</n-button>
        <n-button type="error" :loading="bindingRevokeSaving" @click="submitBindingRevoke">确认撤销</n-button>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { deviceBindingApi } from '@/api/authorization'
import { deviceApi } from '@/api/device'
import { useAuthStore } from '@/stores/auth'
import type {
  AuthorizationCapabilities,
  DeviceBindingItem,
  DeviceBindingState,
  DeviceStatus,
  ProductCode,
} from '@/types/api'
import {
  blockingReasonLabel,
  deviceBindingStateLabel,
  deviceBindingStateOptions,
  deviceStatusLabel,
  deviceStatusOptions,
  effectiveAccessStatusOptions,
  effectiveStatusLabel,
  productCodeLabel,
} from '@/utils/labels'
import { addMonthsDatePickerValue, datePickerISOString, datePickerValue, formatDateTime, formatValidityDateTime, shortHash } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'
import { fetchCompanySelectOptions, fetchUserSelectOptions, mergeSelectedOption } from '@/utils/adminOptions'

type DeviceTab = ProductCode
type TagType = 'default' | 'success' | 'warning' | 'error' | 'info'
type AssignmentMode = 'shared' | 'assigned'
type OverrideMode = 'inherit' | 'temporary'

interface BindingEditForm {
  state: Exclude<DeviceBindingState, 'revoked'>
  assignment_mode: AssignmentMode
  assigned_user_id: number | null
  override_mode: OverrideMode
  valid_from_value: number | null
  valid_until_value: number | null
}

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const narrowDrawer = useMediaQuery('(max-width: 700px)')
const activeTab = ref<DeviceTab>('mobile')
const loading = ref(false)
const saving = ref(false)
const errorText = ref('')
const bindings = ref<DeviceBindingItem[]>([])
const detail = ref<DeviceBindingItem | null>(null)
const detailVisible = ref(false)
const editVisible = ref(false)
const bindingRevokeVisible = ref(false)
const bindingRevokeSaving = ref(false)
const bindingRevokeReason = ref('')
const revokingBinding = ref<DeviceBindingItem | null>(null)
const editingBinding = ref<DeviceBindingItem | null>(null)
const sourceOfTruth = ref('')
const pageCapabilities = ref<AuthorizationCapabilities>({})
const companyOptions = ref<SelectOption[]>([])
const companyOptionsLoading = ref(false)
const assignedUserOptions = ref<SelectOption[]>([])
const assignedUserOptionsLoading = ref(false)
const targetBindingId = ref<number | null>(null)
const targetLegacyAuthorizationId = ref<number | null>(null)
let internalRouteUpdate = false

const filters = reactive({
  company_id: null as number | null,
  entitlement_id: null as number | null,
  device_fingerprint_id: null as number | null,
  state: null as DeviceBindingState | null,
  device_status: null as DeviceStatus | null,
  effective_status: null as string | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const editForm = reactive<BindingEditForm>({
  state: 'approved',
  assignment_mode: 'shared',
  assigned_user_id: null,
  override_mode: 'inherit',
  valid_from_value: null,
  valid_until_value: null,
})

const editableBindingStateOptions = deviceBindingStateOptions.filter((item) => item.value !== 'revoked')

const isV2Mode = computed(() => sourceOfTruth.value === 'v2_dual_write' || sourceOfTruth.value === 'v2_only')
const assignedUserSupported = computed(() => isV2Mode.value && pageCapabilities.value.assigned_user_supported === true)
const sourceOfTruthLabel = computed(() => sourceModeLabel(sourceOfTruth.value))
const descriptionColumns = computed(() => narrowDrawer.value ? 1 : 2)

const columns: DataTableColumns<DeviceBindingItem> = [
  { title: '设备 ID', key: 'device_fingerprint_id', width: 90 },
  { title: '授权主体', key: 'subject_name', minWidth: 170, render: (row) => bindingSubject(row) },
  { title: '产品', key: 'product_code', width: 90, render: (row) => productCodeLabel(row.product_code) },
  {
    title: '设备',
    key: 'device_name',
    minWidth: 170,
    render: (row) => h('div', { class: 'device-cell' }, [
      h('span', { class: 'device-cell__name' }, row.device_name || `设备 #${row.device_fingerprint_id}`),
      h('span', { class: 'device-cell__hash mono', title: row.fingerprint_hash || '' }, shortHash(row.fingerprint_hash)),
    ]),
  },
  {
    title: '设备安全状态',
    key: 'device_status',
    width: 130,
    render: (row) => h(NTag, { type: deviceStatusTagType(row.device_status), round: true }, { default: () => deviceStatusLabel(row.device_status) }),
  },
  {
    title: '绑定状态',
    key: 'state',
    width: 120,
    render: (row) => h(NTag, { type: bindingStateTagType(row.state), round: true }, { default: () => deviceBindingStateLabel(row.state) }),
  },
  { title: '权益代次', key: 'entitlement_generation', width: 100, render: (row) => `${row.entitlement_generation} / ${row.current_entitlement_generation ?? row.entitlement_generation}` },
  { title: '使用范围', key: 'assigned_user_id', minWidth: 150, render: (row) => assignmentLabel(row) },
  {
    title: '设备侧状态',
    key: 'device_readiness_status',
    minWidth: 220,
    render: (row) => h('div', { class: 'status-cell' }, [
      h(NTag, { type: readinessTagType(row.device_readiness_status), round: true }, { default: () => effectiveStatusLabel(row.device_readiness_status) }),
      row.blocking_reason ? h('span', { class: 'status-cell__reason', title: row.blocking_reason }, blockingReasonLabel(row.blocking_reason)) : null,
    ]),
  },
  { title: '期限来源', key: 'valid_until_override', width: 130, render: (row) => row.valid_from_override || row.valid_until_override ? '临时设备例外' : '继承产品授权' },
  { title: '最近出现', key: 'last_seen_at', width: 170, render: (row) => formatDateTime(row.last_seen_at) },
  { title: '最近校验', key: 'last_check_at', width: 170, render: (row) => formatDateTime(row.last_check_at) },
  {
    title: '操作',
    key: 'actions',
    width: 540,
    fixed: 'right',
    render: (row) => {
      const actions = [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
        h(NButton, { size: 'small', secondary: true, onClick: () => goEntitlement(row) }, { default: () => '产品授权' }),
      ]
      if (rowCanUpdate(row)) {
        actions.push(h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '调整绑定' }))
      }
      if (rowCanReapprove(row)) {
        actions.push(h(NButton, { size: 'small', type: 'warning', onClick: () => reapproveBinding(row) }, { default: () => '重新批准' }))
      }
      if (row.device_status) {
        actions.push(
          h(
            NPopconfirm,
            { onPositiveClick: () => updateDeviceStatus(row, row.device_status === 'active' ? 'disabled' : 'active') },
            {
              trigger: () => h(NButton, { size: 'small', type: row.device_status === 'active' ? 'warning' : 'success', ghost: true }, { default: () => row.device_status === 'active' ? '停用设备' : '恢复设备' }),
              default: () => `确认${row.device_status === 'active' ? '停用' : '恢复'}设备 #${row.device_fingerprint_id}？该动作不会释放设备额度。`,
            },
          ),
        )
        if (row.device_status !== 'blocked') {
          actions.push(
            h(
              NPopconfirm,
              { onPositiveClick: () => updateDeviceStatus(row, 'blocked', 'admin_block') },
              {
                trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '阻断设备' }),
                default: () => `确认阻断设备 #${row.device_fingerprint_id}？该动作不会释放设备额度。`,
              },
            ),
          )
        }
      }
      if (rowCanRevoke(row)) {
        actions.push(h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => openBindingRevoke(row) }, { default: () => '撤销绑定' }))
      }
      return h('div', { class: 'table-actions' }, actions)
    },
  },
]

function bindingSubject(row: DeviceBindingItem) {
  return row.subject_name || (row.company_id ? `企业 #${row.company_id}` : `个人用户 #${row.owner_user_id ?? '-'}`)
}

function assignmentLabel(row: DeviceBindingItem) {
  if (!row.company_id) {
    const owner = row.assigned_username || (row.assigned_user_id ? `用户 #${row.assigned_user_id}` : `用户 #${row.owner_user_id ?? '-'}`)
    return `个人专属 · ${owner}`
  }
  if (row.assigned_user_id) {
    const user = row.assigned_username || `用户 #${row.assigned_user_id}`
    return assignedUserSupportedFor(row) ? `专属 · ${user}` : `专属记录（当前模式禁止修改）· ${user}`
  }
  return '企业共享'
}

function bindingOverrideLabel(row: DeviceBindingItem) {
  if (!row.valid_from_override && !row.valid_until_override) return '继承产品授权期限'
  const from = row.valid_from_override ? formatDateTime(row.valid_from_override) : '立即'
  const until = row.valid_until_override ? formatDateTime(row.valid_until_override) : '未设置截止'
  return `${from} 至 ${until}`
}

function activationSourceLabel(source?: string) {
  const labels: Record<string, string> = {
    admin_issue: '后台发放',
    auto_first_device: '首台设备自动激活',
    registration_approved: '注册审批',
    device_add: '新增设备审批',
    device_change: '换机审批',
    admin_export_authorize: '导出代加授权',
  }
  return source ? labels[source] || source : '-'
}

function sourceModeLabel(mode?: string) {
  if (mode === 'v2_only') return 'V2 权威'
  if (mode === 'v2_dual_write') return 'V2 权威 / 双写'
  if (mode === 'legacy_shadow') return '旧模型权威 / V2 影子'
  return mode || '模式待后端确认'
}

function deviceStatusTagType(status?: DeviceStatus): TagType {
  if (status === 'active') return 'success'
  if (status === 'blocked') return 'error'
  return status ? 'warning' : 'default'
}

function bindingStateTagType(state?: DeviceBindingState): TagType {
  if (state === 'approved') return 'success'
  if (state === 'revoked') return 'error'
  return 'warning'
}

function readinessTagType(status?: string): TagType {
  if (status === 'usable') return 'success'
  if (status?.includes('revoked') || status?.includes('expired') || status?.includes('disabled') || status?.includes('blocked')) return 'error'
  return status ? 'warning' : 'default'
}

function rowCanUpdate(row: DeviceBindingItem) {
  return authStore.isBackOfficeScopeAll && row.state !== 'revoked' && pageCapabilities.value.can_update === true && row.capabilities?.can_update === true
}

function rowCanRevoke(row: DeviceBindingItem) {
  return authStore.isBackOfficeScopeAll && row.state !== 'revoked' && pageCapabilities.value.can_revoke === true && row.capabilities?.can_revoke === true
}

function rowCanReapprove(row: DeviceBindingItem) {
  const currentGeneration = row.current_entitlement_generation ?? row.entitlement_generation
  return authStore.isBackOfficeScopeAll && row.state === 'revoked' && row.entitlement_generation < currentGeneration && pageCapabilities.value.can_reapprove === true && row.capabilities?.can_reapprove === true
}

function assignedUserSupportedFor(row?: DeviceBindingItem | null) {
  const mode = row?.source_of_truth || sourceOfTruth.value
  return mode === 'v2_only' && pageCapabilities.value.assigned_user_supported === true && row?.capabilities?.assigned_user_supported === true
}

function assignedUserRestrictionReason(row?: DeviceBindingItem | null) {
  const mode = row?.source_of_truth || sourceOfTruth.value
  if (mode === 'v2_dual_write') {
    return '当前处于 V2 双写回滚窗口；旧授权无法等价表达专属用户，因此仅允许企业共享。切换到 V2 单写后才开放专属用户。'
  }
  return `当前处于 ${sourceModeLabel(mode)}，专属用户尚未成为可写能力，因此该控件保持禁用。`
}

function firstQueryString(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function queryNumber(value: unknown) {
  const parsed = Number(firstQueryString(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function tabFromRoute(): DeviceTab {
  const tab = route.query.tab
  if (tab === 'risk') {
    router.replace({ name: 'device-risks' })
    return 'mobile'
  }
  return tab === 'win' ? 'win' : 'mobile'
}

function applyRouteFilters() {
  filters.company_id = queryNumber(route.query.company_id)
  filters.entitlement_id = queryNumber(route.query.entitlement_id)
  filters.device_fingerprint_id = queryNumber(route.query.device_fingerprint_id) ?? queryNumber(route.query.device_id)
  const state = firstQueryString(route.query.state)
  filters.state = state === 'pending' || state === 'approved' || state === 'revoked' ? state : null
  const deviceStatus = firstQueryString(route.query.device_status)
  filters.device_status = deviceStatus === 'active' || deviceStatus === 'disabled' || deviceStatus === 'blocked' ? deviceStatus : null
  filters.effective_status = firstQueryString(route.query.effective_status) || null
  targetBindingId.value = queryNumber(route.query.binding_id)
  targetLegacyAuthorizationId.value = queryNumber(route.query.legacy_authorization_id)
}

async function searchCompanies(keyword = '') {
  companyOptionsLoading.value = true
  const previous = companyOptions.value
  try {
    let next = await fetchCompanySelectOptions(keyword)
    for (const id of [filters.company_id, detail.value?.company_id, editingBinding.value?.company_id]) {
      if (!id) continue
      next = mergeSelectedOption(next, previous.find((option) => option.value === id) || { label: `企业 #${id}`, value: id })
    }
    companyOptions.value = next
  } finally {
    companyOptionsLoading.value = false
  }
}

async function searchAssignedUsers(keyword = '') {
  const binding = editingBinding.value
  if (!binding?.company_id || !assignedUserSupportedFor(binding)) {
    assignedUserOptions.value = binding?.assigned_user_id
      ? [{ label: binding.assigned_username || `用户 #${binding.assigned_user_id}`, value: binding.assigned_user_id }]
      : []
    return
  }
  assignedUserOptionsLoading.value = true
  const previous = assignedUserOptions.value
  try {
    const options = await fetchUserSelectOptions({ keyword, companyId: binding.company_id })
    let next: SelectOption[] = options.filter((option) => {
      const summary = binding.product_code === 'mobile' ? option.user.mobile_product_access : option.user.win_product_access
      return summary?.current_enabled === true
    })
    if (binding.assigned_user_id) {
      next = mergeSelectedOption(next, previous.find((option) => option.value === binding.assigned_user_id) || {
        label: binding.assigned_username || `用户 #${binding.assigned_user_id}`,
        value: binding.assigned_user_id,
      })
    }
    assignedUserOptions.value = next
  } finally {
    assignedUserOptionsLoading.value = false
  }
}

async function fetchBindings() {
  loading.value = true
  errorText.value = ''
  try {
    const result = await deviceBindingApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: queryValue(filters.company_id),
      entitlement_id: queryValue(filters.entitlement_id),
      product_code: activeTab.value,
      state: queryValue(filters.state),
      effective_status: queryValue(filters.effective_status),
      device_fingerprint_id: queryValue(filters.device_fingerprint_id),
      device_status: queryValue(filters.device_status),
    })
    bindings.value = pageList(result.list)
    pagination.itemCount = result.total
    sourceOfTruth.value = result.source_of_truth || result.mode || bindings.value[0]?.source_of_truth || ''
    pageCapabilities.value = result.capabilities || {}
  } catch (error) {
    bindings.value = []
    pagination.itemCount = 0
    errorText.value = apiUnavailableText(error)
  } finally {
    loading.value = false
  }
}

async function applyFilters() {
  pagination.page = 1
  targetBindingId.value = null
  targetLegacyAuthorizationId.value = null
  await syncRouteFromFilters()
  await fetchBindings()
}

async function resetFilters() {
  filters.company_id = null
  filters.entitlement_id = null
  filters.device_fingerprint_id = null
  filters.state = null
  filters.device_status = null
  filters.effective_status = null
  targetBindingId.value = null
  targetLegacyAuthorizationId.value = null
  pagination.page = 1
  await syncRouteFromFilters()
  await fetchBindings()
}

async function handleTabChange(value: string | number) {
  activeTab.value = value as DeviceTab
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
        tab: activeTab.value === 'win' ? 'win' : undefined,
        company_id: filters.company_id ? String(filters.company_id) : undefined,
        entitlement_id: filters.entitlement_id ? String(filters.entitlement_id) : undefined,
        device_fingerprint_id: filters.device_fingerprint_id ? String(filters.device_fingerprint_id) : undefined,
        state: filters.state || undefined,
        device_status: filters.device_status || undefined,
        effective_status: filters.effective_status || undefined,
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

async function openDetail(row: DeviceBindingItem) {
  detailVisible.value = true
  detail.value = row
  try {
    detail.value = await deviceBindingApi.detail(row.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '设备绑定详情加载失败')
  }
}

function openEdit(row: DeviceBindingItem) {
  if (!rowCanUpdate(row)) return
  editingBinding.value = row
  Object.assign(editForm, {
    state: row.state === 'pending' ? 'pending' : 'approved',
    assignment_mode: row.assigned_user_id || row.owner_user_id ? 'assigned' : 'shared',
    assigned_user_id: row.assigned_user_id ?? row.owner_user_id ?? null,
    override_mode: row.valid_from_override || row.valid_until_override ? 'temporary' : 'inherit',
    valid_from_value: datePickerValue(row.valid_from_override),
    valid_until_value: datePickerValue(row.valid_until_override),
  })
  assignedUserOptions.value = row.assigned_user_id
    ? [{ label: row.assigned_username || `用户 #${row.assigned_user_id}`, value: row.assigned_user_id }]
    : []
  editVisible.value = true
  void searchAssignedUsers()
}

function handleOverrideModeUpdate(value: string | number) {
  if (value === 'inherit') {
    editForm.valid_from_value = null
    editForm.valid_until_value = null
  } else if (!editForm.valid_until_value) {
    editForm.valid_until_value = addMonthsDatePickerValue(1)
  }
}

async function submitBinding() {
  const row = editingBinding.value
  if (!row || !rowCanUpdate(row)) return
  if (row.company_id && assignedUserSupportedFor(row) && editForm.assignment_mode === 'assigned' && !editForm.assigned_user_id) {
    message.error('请选择专属用户')
    return
  }
  if (editForm.override_mode === 'temporary' && !editForm.valid_until_value) {
    message.error('临时设备必须设置截止时间')
    return
  }
  if (editForm.valid_from_value && editForm.valid_until_value && editForm.valid_until_value <= editForm.valid_from_value) {
    message.error('临时截止时间必须晚于生效时间')
    return
  }
  const confirmed = await confirmHighRisk('确认调整设备绑定状态、使用范围或临时期限？相关客户端会按新条件重新判定。')
  if (!confirmed) return
  saving.value = true
  try {
    const payload = {
      state: editForm.state,
      valid_from_override: editForm.override_mode === 'temporary' ? datePickerISOString(editForm.valid_from_value) : null,
      valid_until_override: editForm.override_mode === 'temporary' ? datePickerISOString(editForm.valid_until_value) : null,
    } as Parameters<typeof deviceBindingApi.update>[1]
    if (assignedUserSupportedFor(row)) {
      payload.assigned_user_id = row.owner_user_id ?? (editForm.assignment_mode === 'assigned' ? editForm.assigned_user_id : null)
    }
    await deviceBindingApi.update(row.id, payload)
    message.success('设备绑定已更新')
    editVisible.value = false
    await refreshAfterMutation(row.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '设备绑定更新失败')
  } finally {
    saving.value = false
  }
}

function openBindingRevoke(row: DeviceBindingItem) {
  if (!rowCanRevoke(row)) return
  revokingBinding.value = row
  bindingRevokeReason.value = ''
  bindingRevokeVisible.value = true
}

async function submitBindingRevoke() {
  const row = revokingBinding.value
  if (!row || !rowCanRevoke(row)) return
  const reason = bindingRevokeReason.value.trim()
  if (!reason) {
    message.error('请输入撤销原因')
    return
  }
  const confirmed = await confirmHighRisk(`确认撤销设备 #${row.device_fingerprint_id} 的绑定并释放额度？`)
  if (!confirmed) return
  bindingRevokeSaving.value = true
  try {
    await deviceBindingApi.revoke(row.id, reason)
    message.success('设备绑定已撤销，相关设备额度已释放')
    bindingRevokeVisible.value = false
    await refreshAfterMutation(row.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '设备绑定撤销失败')
  } finally {
    bindingRevokeSaving.value = false
  }
}

async function reapproveBinding(row: DeviceBindingItem) {
  if (!rowCanReapprove(row)) return
  const currentGeneration = row.current_entitlement_generation ?? row.entitlement_generation
  const confirmed = await confirmHighRisk(
    `确认将设备 #${row.device_fingerprint_id} 从权益第 ${row.entitlement_generation} 代重新批准到第 ${currentGeneration} 代？此操作占用当前代设备额度，用户产品准入仍需独立有效。`,
  )
  if (!confirmed) return
  try {
    await deviceBindingApi.update(row.id, { state: 'approved', reapprove: true })
    message.success('设备已重新批准到当前权益代次')
    await refreshAfterMutation(row.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '设备重新批准失败')
  }
}

async function updateDeviceStatus(row: DeviceBindingItem, status: DeviceStatus, reason?: string) {
  try {
    await deviceApi.updateStatus(row.device_fingerprint_id, status, reason)
    message.success(status === 'blocked' ? '设备已阻断，绑定额度保持占用' : '设备安全状态已更新')
    await refreshAfterMutation(row.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '设备安全状态更新失败')
  }
}

async function refreshAfterMutation(bindingId: number) {
  await fetchBindings()
  if (detailVisible.value && detail.value?.id === bindingId) {
    detail.value = await deviceBindingApi.detail(bindingId)
  }
}

function goEntitlement(row: DeviceBindingItem) {
  router.push({ name: 'licenses', query: { entitlement_id: String(row.entitlement_id) } })
}

function goLegacyAuthorization(row: DeviceBindingItem) {
  if (!row.legacy_authorization_id) return
  router.push({
    name: 'licenses',
    query: {
      legacy_authorization_id: String(row.legacy_authorization_id),
      company_id: row.company_id ? String(row.company_id) : undefined,
      owner_user_id: row.owner_user_id ? String(row.owner_user_id) : undefined,
      product_code: row.product_code,
    },
  })
}

function bindingRowProps(row: DeviceBindingItem) {
  const matchesBinding = targetBindingId.value && row.id === targetBindingId.value
  const matchesLegacy = targetLegacyAuthorizationId.value && row.legacy_authorization_id === targetLegacyAuthorizationId.value
  return matchesBinding || matchesLegacy ? { class: 'target-row' } : {}
}

function apiUnavailableText(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 404) return '设备绑定 API 尚未可用，请确认测试服 Backend 已部署 AUTH-V2；页面没有回退为旧数据或假成功。'
  return error instanceof Error ? error.message : '设备绑定数据加载失败'
}

function confirmHighRisk(content: string) {
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '高风险操作确认',
      content,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
}

watch(
  () => [
    route.query.tab,
    route.query.company_id,
    route.query.entitlement_id,
    route.query.device_fingerprint_id,
    route.query.device_id,
    route.query.binding_id,
    route.query.legacy_authorization_id,
    route.query.state,
    route.query.device_status,
    route.query.effective_status,
  ],
  async () => {
    if (internalRouteUpdate) return
    applyRouteFilters()
    activeTab.value = tabFromRoute()
    pagination.page = 1
    await fetchBindings()
    await searchCompanies()
    if (targetBindingId.value) await loadTargetBinding(targetBindingId.value)
  },
)

async function loadTargetBinding(id: number) {
  try {
    detailVisible.value = true
    detail.value = await deviceBindingApi.detail(id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '目标设备绑定加载失败')
  }
}

onMounted(async () => {
  applyRouteFilters()
  activeTab.value = tabFromRoute()
  await fetchBindings()
  try {
    await searchCompanies()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '筛选项加载失败'
  }
  if (targetBindingId.value) await loadTargetBinding(targetBindingId.value)
})
</script>

<style scoped>
.model-note,
.page-error {
  margin-bottom: 16px;
}

.model-note__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.drawer-note {
  margin-bottom: 16px;
}

.device-cell,
.status-cell {
  display: grid;
  gap: 4px;
}

.device-cell__name {
  font-weight: 600;
}

.device-cell__hash,
.status-cell__reason {
  color: var(--text-color-3);
  font-size: 12px;
}

.status-cell__reason {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-actions {
  margin-top: 16px;
}

:deep(.target-row td) {
  background: rgba(24, 160, 88, 0.1) !important;
}

@media (max-width: 700px) {
  .model-note__content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
