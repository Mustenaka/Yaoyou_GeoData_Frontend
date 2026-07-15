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

    <n-drawer v-model:show="detailVisible" width="min(860px, 100vw)">
      <n-drawer-content :title="detailDrawerTitle()">
        <div v-if="detailLoading" class="detail-loading" aria-live="polite">
          <n-skeleton text :repeat="8" />
        </div>

        <n-result v-else-if="detailError" status="error" title="授权详情加载失败" :description="detailError">
          <template #footer>
            <n-button type="primary" @click="reloadDetail">重试</n-button>
          </template>
        </n-result>

        <template v-else-if="detailBinding">
          <section class="detail-section">
            <div class="detail-section__header">
              <h3>授权概况</h3>
              <n-tag :type="authorizationTagType(authorizationViewState(detailBinding))" round>
                {{ authorizationStateLabel(authorizationViewState(detailBinding)) }}
              </n-tag>
            </div>
            <n-descriptions bordered :column="detailDescriptionColumns" label-placement="left" class="detail-descriptions">
              <n-descriptions-item label="授权记录">#{{ detailBinding.id }}</n-descriptions-item>
              <n-descriptions-item label="修订版本">{{ detailBinding.revision }}</n-descriptions-item>
              <n-descriptions-item label="权益记录">#{{ detailBinding.entitlement_id }}</n-descriptions-item>
              <n-descriptions-item label="权益代次">{{ detailBinding.entitlement_generation }} / 当前 {{ detailBinding.current_entitlement_generation ?? '-' }}</n-descriptions-item>
              <n-descriptions-item label="企业 / 归属">{{ companyLabel(detailBinding) }}</n-descriptions-item>
              <n-descriptions-item label="授权账号">{{ bindingOwnerLabel(detailBinding) }}</n-descriptions-item>
              <n-descriptions-item label="客户端">{{ clientLabel(detailBinding) }}</n-descriptions-item>
              <n-descriptions-item label="产品代码">{{ detailBinding.product_code || '-' }}</n-descriptions-item>
              <n-descriptions-item label="授权来源">{{ detailBinding.activation_source || '-' }}</n-descriptions-item>
              <n-descriptions-item label="事实来源">{{ detailBinding.source_of_truth || '-' }}</n-descriptions-item>
              <n-descriptions-item label="生命周期状态">{{ detailBinding.lifecycle_status || '-' }}</n-descriptions-item>
              <n-descriptions-item label="设备准入状态">{{ detailBinding.device_readiness_status || '-' }}</n-descriptions-item>
              <n-descriptions-item label="授权期限">{{ authorizationValidityLabel(detailBinding) }}</n-descriptions-item>
              <n-descriptions-item label="实际生效区间">{{ effectiveValidityLabel(detailBinding) }}</n-descriptions-item>
              <n-descriptions-item label="准入阻断原因">{{ detailBinding.blocking_reason || '-' }}</n-descriptions-item>
              <n-descriptions-item label="发起人">{{ actorIdLabel(detailBinding.requested_by) }}</n-descriptions-item>
              <n-descriptions-item label="批准人 / 时间">{{ actorTimeLabel(detailBinding.approved_by, detailBinding.approved_at) }}</n-descriptions-item>
              <n-descriptions-item label="撤销人 / 时间">{{ actorTimeLabel(detailBinding.revoked_by, detailBinding.revoked_at) }}</n-descriptions-item>
              <n-descriptions-item label="撤销原因">{{ detailBinding.revoked_reason || '-' }}</n-descriptions-item>
              <n-descriptions-item label="最近准入检查">{{ formatDateTime(detailBinding.last_check_at) }}</n-descriptions-item>
              <n-descriptions-item label="旧授权记录">{{ detailBinding.legacy_authorization_id ? `#${detailBinding.legacy_authorization_id}` : '-' }}</n-descriptions-item>
              <n-descriptions-item label="可用操作" :span="detailDescriptionColumns">{{ capabilitySummary(detailBinding.capabilities) }}</n-descriptions-item>
              <n-descriptions-item label="活跃会话">{{ detailBinding.active_session_count ?? 0 }} 个</n-descriptions-item>
              <n-descriptions-item label="最近会话到期">{{ formatDateTime(detailBinding.latest_session_expires_at) }}</n-descriptions-item>
              <n-descriptions-item label="创建时间">{{ formatDateTime(detailBinding.created_at) }}</n-descriptions-item>
              <n-descriptions-item label="更新时间">{{ formatDateTime(detailBinding.updated_at) }}</n-descriptions-item>
            </n-descriptions>
          </section>

          <section class="detail-section">
            <div class="detail-section__header">
              <h3>设备信息</h3>
              <n-text depth="3">指纹及设备标识仅显示脱敏摘要</n-text>
            </div>
            <n-descriptions v-if="detailBinding.device" bordered :column="detailDescriptionColumns" label-placement="left" class="detail-descriptions">
              <n-descriptions-item label="设备">{{ detailDeviceLabel(detailBinding) }}</n-descriptions-item>
              <n-descriptions-item label="设备记录">#{{ detailBinding.device.id }}</n-descriptions-item>
              <n-descriptions-item label="设备指纹">
                <span class="mono">{{ maskedIdentifier(detailBinding.device.fingerprint_hash || detailBinding.fingerprint_hash) }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="指纹载荷">{{ fingerprintPayloadSummary(detailBinding) }}</n-descriptions-item>
              <n-descriptions-item label="安装标识">
                <span class="mono">{{ maskedIdentifier(detailBinding.device.mobile_install_id_hash || detailBinding.device.mobile_install_id) }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="主板标识">
                <span class="mono">{{ maskedIdentifier(detailBinding.device.win_mainboard_id_hash) }}</span>
              </n-descriptions-item>
              <n-descriptions-item label="系统版本">{{ detailBinding.device.os_version || '-' }}</n-descriptions-item>
              <n-descriptions-item label="应用版本">{{ detailBinding.device.app_version || '-' }}</n-descriptions-item>
              <n-descriptions-item label="设备状态">{{ deviceStatusText(detailBinding.device.status) }}</n-descriptions-item>
              <n-descriptions-item label="风险级别">{{ detailBinding.device.risk_level || '-' }}</n-descriptions-item>
              <n-descriptions-item label="首次登记">{{ formatDateTime(detailBinding.device.first_seen_at) }}</n-descriptions-item>
              <n-descriptions-item label="最近使用">{{ formatDateTime(detailBinding.device.last_seen_at) }}</n-descriptions-item>
              <n-descriptions-item label="设备阻断时间">{{ formatDateTime(detailBinding.device.blocked_at) }}</n-descriptions-item>
              <n-descriptions-item label="设备创建时间">{{ formatDateTime(detailBinding.device.created_at) }}</n-descriptions-item>
              <n-descriptions-item label="设备更新时间">{{ formatDateTime(detailBinding.device.updated_at) }}</n-descriptions-item>
              <n-descriptions-item v-if="detailBinding.device.blocked_reason" label="阻断原因" :span="detailDescriptionColumns">
                {{ detailBinding.device.blocked_reason }}
              </n-descriptions-item>
            </n-descriptions>
            <n-empty v-else description="暂无可展示的设备详情" />
          </section>

          <section class="detail-section">
            <div class="detail-section__header">
              <h3>相关申请</h3>
              <n-text depth="3">{{ detailBinding.requests?.length || 0 }} 条</n-text>
            </div>
            <div v-if="detailBinding.requests?.length" class="request-list">
              <div v-for="request in detailBinding.requests" :key="request.id" class="request-card">
                <div class="request-card__header">
                  <n-space size="small">
                    <n-tag size="small" round>{{ requestTypeText(request.request_type) }}</n-tag>
                    <n-tag size="small" :type="requestStatusTagType(request.status)" round>{{ requestStatusText(request.status) }}</n-tag>
                  </n-space>
                  <span>{{ formatDateTime(request.created_at) }}</span>
                </div>
                <div class="request-card__meta">
                  <span>申请 #{{ request.id }}</span>
                  <span>申请人：{{ requestActorLabel(request) }}</span>
                  <span>企业：{{ request.company_name || (request.company_id ? `#${request.company_id}` : '-') }}</span>
                  <span v-if="request.handled_by">处理人：#{{ request.handled_by }}</span>
                  <span v-if="request.handled_at">处理于 {{ formatDateTime(request.handled_at) }}</span>
                  <span v-if="request.updated_at">更新于 {{ formatDateTime(request.updated_at) }}</span>
                </div>
                <p v-if="request.reason">原因：{{ request.reason }}</p>
                <p v-if="request.note">处理备注：{{ request.note }}</p>
              </div>
            </div>
            <n-empty v-else description="暂无相关授权申请" />
          </section>

          <section class="detail-section detail-section--history">
            <div class="detail-section__header">
              <h3>操作历史</h3>
              <n-text depth="3">最新记录在前</n-text>
            </div>
            <n-timeline v-if="detailBinding.history?.length">
              <n-timeline-item
                v-for="item in detailBinding.history"
                :key="item.id"
                :type="historyTimelineType(item.event_type)"
                :title="historyEventLabel(item.event_type)"
                :time="formatDateTime(item.occurred_at || item.created_at)"
              >
                <div class="history-content">
                  <div>{{ item.summary || historyEventLabel(item.event_type) }}</div>
                  <div class="history-meta">
                    <span>{{ historyActorLabel(item) }}</span>
                    <span v-if="item.request_id">申请 #{{ item.request_id }}</span>
                    <span v-if="historyRevision(item) !== null">修订 {{ historyRevision(item) }}</span>
                  </div>
                  <div v-if="safeHistoryDetail(item.detail_json)" class="history-detail">
                    {{ safeHistoryDetail(item.detail_json) }}
                  </div>
                </div>
              </n-timeline-item>
            </n-timeline>
            <n-empty v-else description="暂无操作历史" />
          </section>
        </template>

        <n-empty v-else description="请选择授权设备查看详情" />
      </n-drawer-content>
    </n-drawer>

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
import { h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { deviceBindingApi } from '@/api/authorization'
import { useAuthStore } from '@/stores/auth'
import type {
  AuthorizationCapabilities,
  DeviceBindingDetail,
  DeviceBindingHistoryItem,
  DeviceBindingItem,
  DeviceBindingRequestItem,
  DeviceBindingState,
  ProductCode,
} from '@/types/api'
import { addMonthsDatePickerValue, datePickerISOString, datePickerValue, formatDateTime, shortHash } from '@/utils/format'
import { changeRequestStatusLabel, deviceAuthorizationRequestTypeLabel, deviceStatusLabel } from '@/utils/labels'
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
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailBinding = ref<DeviceBindingDetail | null>(null)
const detailBindingId = ref<number | null>(null)
const validityVisible = ref(false)
const revokeVisible = ref(false)
const editingBinding = ref<DeviceBindingItem | null>(null)
const revokingBinding = ref<DeviceBindingItem | null>(null)
const revokeReason = ref('')
const companyOptions = ref<SelectOption[]>([])
const companyOptionsLoading = ref(false)
const pageCapabilities = ref<AuthorizationCapabilities>({})
const targetBindingId = ref<number | null>(null)
const detailDescriptionColumns = ref(2)
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
      h('span', { class: 'device-cell__hash mono' }, shortHash(row.fingerprint_hash)),
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
    width: 285,
    fixed: 'right',
    render: (row) => h('div', { class: 'table-actions' }, [
      h(NButton, { size: 'small', secondary: true, onClick: () => openDetail(row) }, { default: () => '详情' }),
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

function detailDrawerTitle() {
  return detailBinding.value ? `${deviceLabel(detailBinding.value)} · 授权详情` : '设备授权详情'
}

function detailDeviceLabel(row: DeviceBindingDetail) {
  return row.device?.device_name || row.device_name || `设备 #${row.device?.id || row.device_fingerprint_id}`
}

function bindingOwnerLabel(row: DeviceBindingDetail) {
  if (row.assigned_username) return `${row.assigned_username}${row.assigned_user_id ? ` #${row.assigned_user_id}` : ''}`
  if (row.subject_name) return `${row.subject_name}${row.owner_user_id ? ` #${row.owner_user_id}` : ''}`
  if (row.owner_user_id) return `账号 #${row.owner_user_id}`
  return '-'
}

function effectiveValidityLabel(row: DeviceBindingDetail) {
  const from = row.effective_from ? formatDateTime(row.effective_from) : '立即生效'
  return row.effective_until ? `${from} 至 ${formatDateTime(row.effective_until)}` : `${from}起长期有效`
}

function actorIdLabel(value?: number | null) {
  return value ? `#${value}` : '-'
}

function actorTimeLabel(actor?: number | null, occurredAt?: string | null) {
  if (!actor && !occurredAt) return '-'
  return `${actorIdLabel(actor)} / ${formatDateTime(occurredAt)}`
}

function capabilitySummary(capabilities?: AuthorizationCapabilities) {
  if (!capabilities) return '-'
  const enabled = Object.entries(capabilities)
    .filter(([, value]) => value === true)
    .map(([key]) => key)
  return enabled.length ? enabled.join('、') : '无可用操作'
}

function updateDetailDescriptionColumns() {
  detailDescriptionColumns.value = typeof window !== 'undefined' && window.innerWidth <= 700 ? 1 : 2
}

function maskedIdentifier(value?: string | null) {
  if (!value) return '-'
  if (value.length <= 4) return '***'
  if (value.length <= 12) return `${value.slice(0, 2)}***${value.slice(-2)}`
  return `${value.slice(0, 8)}...${value.slice(-6)}`
}

function fingerprintPayloadSummary(row: DeviceBindingDetail) {
  const payload = row.device?.fingerprint_payload || parseSafeRecord(row.device?.fingerprint_payload_json)
  if (!payload) return '未记录或不可展示'
  const keys = Object.keys(payload).filter((key) => !sensitiveDetailKey(key)).sort()
  return keys.length ? `已脱敏（${keys.slice(0, 8).join('、')}${keys.length > 8 ? '…' : ''}）` : '已脱敏'
}

function deviceStatusText(status?: string) {
  return deviceStatusLabel(status) || '-'
}

function requestTypeText(type?: string) {
  return deviceAuthorizationRequestTypeLabel(type)
}

function requestStatusText(status?: string) {
  return changeRequestStatusLabel(status)
}

function requestStatusTagType(status?: string): TagType {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'error'
  return 'default'
}

function requestActorLabel(request: DeviceBindingRequestItem) {
  const name = request.real_name || request.username
  return name ? `${name}${request.user_id ? ` #${request.user_id}` : ''}` : request.user_id ? `#${request.user_id}` : '-'
}

function historyEventLabel(type?: string) {
  const labels: Record<string, string> = {
    authorization_requested: '发起授权申请',
    authorized: '授权生效',
    auto_expired: '授权自动过期',
    renewal_requested: '发起续期申请',
    renewed: '授权续期',
    terms_updated: '修改授权期限',
    revoked: '取消授权',
    request_rejected: '拒绝授权申请',
  }
  return labels[type || ''] || type || '授权状态变更'
}

function historyTimelineType(type?: string): TagType {
  if (type === 'authorized' || type === 'renewed') return 'success'
  if (type === 'authorization_requested' || type === 'renewal_requested' || type === 'terms_updated') return 'warning'
  if (type === 'auto_expired' || type === 'revoked' || type === 'request_rejected') return 'error'
  return 'default'
}

function historyActorLabel(item: DeviceBindingHistoryItem) {
  const name = item.actor_real_name || item.actor_username
  if (name) return `操作人：${name}${item.actor_user_id ? ` #${item.actor_user_id}` : ''}`
  if (item.actor_user_id) return `操作人：#${item.actor_user_id}`
  return item.actor_type === 'system' || item.event_type === 'auto_expired' ? '系统自动记录' : '操作人：-'
}

function historyRevision(item: DeviceBindingHistoryItem) {
  return item.binding_revision ?? item.revision ?? null
}

function safeHistoryDetail(value: DeviceBindingHistoryItem['detail_json']) {
  const record = typeof value === 'string' ? parseSafeRecord(value) : value
  if (!record) return value ? '详情已记录（内容不适合直接展示）' : ''
  return Object.entries(record)
    .slice(0, 12)
    .map(([key, item]) => `${key}：${sensitiveDetailKey(key) ? '***' : safeDetailValue(item)}`)
    .join('；')
}

function parseSafeRecord(value?: string | null) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function sensitiveDetailKey(key: string) {
  return /(fingerprint|payload|token|secret|password|credential|signature|nonce|install|mainboard|private|certificate|hash)/i.test(key)
}

function safeDetailValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string') {
    if (/^[a-f\d]{24,}$/i.test(value) || /^eyJ[A-Za-z\d_-]+\./.test(value)) return '***'
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} 项`
  if (typeof value === 'object') return `${Object.keys(value as Record<string, unknown>).length} 项`
  return '-'
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

async function openDetail(row: DeviceBindingItem) {
  detailBindingId.value = row.id
  detailBinding.value = null
  detailError.value = ''
  detailVisible.value = true
  await reloadDetail()
}

async function reloadDetail() {
  const id = detailBindingId.value
  if (!id) return
  detailLoading.value = true
  detailError.value = ''
  try {
    const result = await deviceBindingApi.detail(id)
    if (detailBindingId.value === id) detailBinding.value = result
  } catch (error) {
    if (detailBindingId.value === id) {
      detailBinding.value = null
      detailError.value = error instanceof Error ? error.message : '设备授权详情加载失败'
    }
  } finally {
    if (detailBindingId.value === id) detailLoading.value = false
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
    if (detailVisible.value && detailBindingId.value === row.id) await reloadDetail()
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
    if (detailVisible.value && detailBindingId.value === row.id) await reloadDetail()
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
  updateDetailDescriptionColumns()
  window.addEventListener('resize', updateDetailDescriptionColumns)
  applyRouteFilters()
  await Promise.all([fetchBindings(), searchCompanies()])
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateDetailDescriptionColumns)
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

.detail-loading {
  min-height: 260px;
  padding: 8px 0;
}

.detail-section {
  padding: 4px 0 22px;
}

.detail-section + .detail-section {
  border-top: 1px solid var(--yy-border);
  padding-top: 22px;
}

.detail-section__header,
.request-card__header,
.request-card__meta,
.history-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-section__header {
  margin-bottom: 14px;
}

.detail-section__header h3 {
  margin: 0;
  color: var(--text-color-1);
  font-size: 16px;
}

.request-list {
  display: grid;
  gap: 12px;
}

.request-card {
  padding: 14px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-sm);
  background: var(--yy-surface);
}

.request-card__header > span,
.request-card__meta,
.history-meta,
.history-detail {
  color: var(--text-color-3);
  font-size: 12px;
}

.request-card__meta {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 8px;
}

.request-card p {
  margin: 8px 0 0;
  line-height: 1.6;
}

.history-content {
  display: grid;
  gap: 6px;
  line-height: 1.6;
}

.history-meta {
  justify-content: flex-start;
  flex-wrap: wrap;
}

.history-detail {
  overflow-wrap: anywhere;
}

:deep(.target-row td) {
  background: rgba(24, 160, 88, 0.1) !important;
}

@media (max-width: 700px) {
  :deep(.n-drawer-body-content-wrapper) {
    padding: 16px;
  }

  .detail-section__header,
  .request-card__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
