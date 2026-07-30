<template>
  <div class="page-shell">
    <PageHeader title="平台安全管理" subtitle="独立管理精确 IP 封禁、非常用 IP 观察和 Win 强制删除订单。">
      <n-button type="primary" @click="openCreateRule">新建 IP 封禁规则</n-button>
    </PageHeader>

    <div class="stats-grid">
      <div class="page-card stat"><span>生效规则</span><strong>{{ stats.active_rules }}</strong></div>
      <div class="page-card stat"><span>24 小时非常用 IP</span><strong>{{ stats.unusual_ip_last_24h }}</strong></div>
      <div class="page-card stat"><span>进行中删除订单</span><strong>{{ stats.active_orders }}</strong></div>
      <div class="page-card stat"><span>已完成删除</span><strong>{{ stats.completed_orders }}</strong></div>
    </div>

    <div class="page-card">
      <n-tabs v-model:value="activeTab" type="line" animated @update:value="refreshActive">
        <n-tab-pane name="rules" tab="IP 封禁规则">
          <div class="toolbar">
            <n-input v-model:value="ruleFilters.ip" clearable placeholder="精确 IPv4 / IPv6" style="width: 210px" @keyup.enter="fetchRules" />
            <n-select v-model:value="ruleFilters.status" clearable :options="ruleStatusOptions" placeholder="状态" style="width: 130px" />
            <n-select v-model:value="ruleFilters.client_scope" clearable :options="scopeOptions" placeholder="作用域" style="width: 140px" />
            <n-select v-model:value="ruleFilters.expiry" clearable :options="expiryOptions" placeholder="到期状态" style="width: 140px" />
            <div class="toolbar__spacer" />
            <n-button @click="fetchRules">查询</n-button>
          </div>
          <n-data-table
            remote
            :columns="ruleColumns"
            :data="rules"
            :loading="loadingRules"
            :pagination="rulePagination"
            :row-key="(row: IPBlockRule) => row.id"
            @update:page="(page: number) => changePage(rulePagination, page, fetchRules)"
          />
        </n-tab-pane>

        <n-tab-pane name="observations" tab="非常用 IP 观察 / 风险">
          <n-alert type="info" :bordered="false" class="tab-alert">
            非常用 IP 仅产生 <code>unusual_ip</code> 风险提醒，不会自动封禁 IP，也不会自动创建 Win 删除订单。
          </n-alert>
          <div class="toolbar">
            <n-input v-model:value="observationFilters.ip" clearable placeholder="精确 IP" style="width: 210px" @keyup.enter="fetchObservations" />
            <n-select v-model:value="observationFilters.client_type" clearable :options="clientOptions" placeholder="客户端" style="width: 140px" />
            <n-button @click="fetchObservations">查询</n-button>
            <n-button ghost @click="goUnusualRisks">查看风险事件</n-button>
          </div>
          <n-data-table
            remote
            :columns="observationColumns"
            :data="observations"
            :loading="loadingObservations"
            :pagination="observationPagination"
            :row-key="(row: DeviceIPObservation) => row.id"
            @update:page="(page: number) => changePage(observationPagination, page, fetchObservations)"
          />
        </n-tab-pane>

        <n-tab-pane name="orders" tab="Win 删除订单">
          <n-alert type="warning" :bordered="false" class="tab-alert">
            普通停用 IP 规则不会撤销已生成的订单。撤销订单是独立的高风险操作，必须填写理由并二次确认。
          </n-alert>
          <div class="toolbar">
            <n-input v-model:value="orderFilters.fingerprint_hash" clearable placeholder="设备指纹哈希" style="width: 260px" @keyup.enter="fetchOrders" />
            <n-select v-model:value="orderFilters.status" clearable :options="orderStatusOptions" placeholder="订单状态" style="width: 170px" />
            <n-button @click="fetchOrders">查询</n-button>
          </div>
          <n-data-table
            remote
            :columns="orderColumns"
            :data="orders"
            :loading="loadingOrders"
            :pagination="orderPagination"
            :row-key="(row: WinRemovalOrder) => row.order_id"
            @update:page="(page: number) => changePage(orderPagination, page, fetchOrders)"
          />
        </n-tab-pane>
      </n-tabs>
    </div>

    <n-modal v-model:show="createVisible" preset="card" title="新建 IP 封禁规则" style="width: 560px">
      <n-alert type="error" class="risk-confirm">
        该 IP 后续出现的所有 Win 设备将被禁止登录，并在两次启动流程中创建强制删除订单。共享办公网络、NAT 或 VPN 出口可能影响多台设备。
      </n-alert>
      <n-form label-placement="top">
        <n-form-item label="精确 IP">
          <n-input v-model:value="createForm.ip" placeholder="仅支持单个 IPv4 或 IPv6，不支持 CIDR" />
        </n-form-item>
        <n-form-item label="客户端作用域">
          <n-select v-model:value="createForm.client_scope" :options="scopeOptions" />
        </n-form-item>
        <n-form-item label="到期时间（可选）">
          <n-date-picker v-model:value="createForm.expires_at_ms" type="datetime" clearable style="width: 100%" />
        </n-form-item>
        <n-form-item label="封禁原因">
          <n-input v-model:value="createForm.reason" type="textarea" :maxlength="500" show-count />
        </n-form-item>
        <n-checkbox v-model:checked="createForm.danger_confirm">我已核对 IP、作用域及共享网络影响，并确认执行</n-checkbox>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="createVisible = false">取消</n-button>
          <n-button type="error" :loading="savingRule" @click="createRule">确认封禁</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="revokeVisible" preset="card" title="撤销 Win 删除订单" style="width: 520px">
      <n-alert type="warning" class="risk-confirm">
        撤销后该订单不再向 Win 客户端下发删除指令。已完成的订单不可恢复或撤销。
      </n-alert>
      <n-form-item label="撤销原因（至少 5 个字符）">
        <n-input v-model:value="revokeReason" type="textarea" :maxlength="500" show-count />
      </n-form-item>
      <template #footer>
        <n-space justify="end">
          <n-button @click="revokeVisible = false">取消</n-button>
          <n-button type="warning" :loading="revoking" @click="confirmRevoke">二次确认并撤销</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import { NButton, NTag, useDialog, useMessage, type DataTableColumns, type PaginationProps } from 'naive-ui'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { securityApi } from '@/api/security'
import type { DeviceIPObservation, IPBlockRule, IPSecurityStats, WinRemovalOrder } from '@/types/api'
import { formatDateTime, shortHash } from '@/utils/format'
import { pageList } from '@/utils/query'

const router = useRouter()
const dialog = useDialog()
const message = useMessage()
const activeTab = ref('rules')
const rules = ref<IPBlockRule[]>([])
const observations = ref<DeviceIPObservation[]>([])
const orders = ref<WinRemovalOrder[]>([])
const stats = reactive<IPSecurityStats>({ active_rules: 0, unusual_ip_last_24h: 0, active_orders: 0, completed_orders: 0 })
const loadingRules = ref(false)
const loadingObservations = ref(false)
const loadingOrders = ref(false)
const createVisible = ref(false)
const savingRule = ref(false)
const revokeVisible = ref(false)
const revoking = ref(false)
const revokeReason = ref('')
const revokeTarget = ref<WinRemovalOrder | null>(null)

const ruleFilters = reactive({ ip: '', status: '', client_scope: '', expiry: '' })
const observationFilters = reactive({ ip: '', client_type: '' })
const orderFilters = reactive({ status: '', fingerprint_hash: '' })
const createForm = reactive({
  ip: '',
  client_scope: 'both',
  expires_at_ms: null as number | null,
  reason: '',
  danger_confirm: false,
})

function pagination(): PaginationProps {
  return { page: 1, pageSize: 20, itemCount: 0, showSizePicker: false }
}
const rulePagination = reactive<PaginationProps>(pagination())
const observationPagination = reactive<PaginationProps>(pagination())
const orderPagination = reactive<PaginationProps>(pagination())

const scopeOptions = [
  { label: 'Win + Mobile', value: 'both' },
  { label: '仅 Win', value: 'win' },
  { label: '仅 Mobile', value: 'mobile' },
]
const clientOptions = [
  { label: 'Win', value: 'win' },
  { label: 'Mobile', value: 'mobile' },
]
const ruleStatusOptions = [
  { label: '生效', value: 'active' },
  { label: '停用', value: 'disabled' },
]
const expiryOptions = [
  { label: '未到期', value: 'effective' },
  { label: '已到期', value: 'expired' },
]
const orderStatusOptions = [
  { label: '已布防', value: 'armed' },
  { label: '要求删除', value: 'delete_required' },
  { label: '执行中', value: 'executing' },
  { label: '等待重启', value: 'pending_reboot' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
  { label: '已撤销', value: 'revoked' },
]

function scopeLabel(value: string) {
  return scopeOptions.find((item) => item.value === value)?.label || value
}
function orderStatusLabel(value: string) {
  return orderStatusOptions.find((item) => item.value === value)?.label || value
}

const ruleColumns: DataTableColumns<IPBlockRule> = [
  { title: 'IP', key: 'canonical_ip', minWidth: 170, render: (row) => h('span', { class: 'mono' }, row.canonical_ip) },
  { title: '作用域', key: 'client_scope', width: 120, render: (row) => scopeLabel(row.client_scope) },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) => h(NTag, { type: row.status === 'active' ? 'error' : 'default', round: true }, { default: () => (row.status === 'active' ? '生效' : '停用') }),
  },
  { title: '到期时间', key: 'expires_at', width: 175, render: (row) => (row.expires_at ? formatDateTime(row.expires_at) : '长期') },
  { title: '创建人', key: 'created_by', width: 90 },
  { title: '原因', key: 'reason', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '操作',
    key: 'actions',
    width: 110,
    fixed: 'right',
    render: (row) =>
      h(
        NButton,
        { size: 'small', type: row.status === 'active' ? 'warning' : 'error', onClick: () => toggleRule(row) },
        { default: () => (row.status === 'active' ? '停用' : '重新启用') },
      ),
  },
]

const observationColumns: DataTableColumns<DeviceIPObservation> = [
  { title: '设备指纹摘要', key: 'fingerprint_hash', minWidth: 160, render: (row) => h('span', { class: 'mono' }, shortHash(row.fingerprint_hash, 10, 8)) },
  { title: 'IP', key: 'canonical_ip', minWidth: 150, render: (row) => h('span', { class: 'mono' }, row.canonical_ip) },
  { title: '客户端', key: 'client_type', width: 90 },
  { title: '安装实例', key: 'install_instance_id', minWidth: 150, render: (row) => h('span', { class: 'mono' }, shortHash(row.install_instance_id, 8, 6)) },
  { title: '允许次数', key: 'allowed_success_count', width: 100 },
  { title: '首次出现', key: 'first_seen_at', width: 175, render: (row) => formatDateTime(row.first_seen_at) },
  { title: '最后出现', key: 'last_seen_at', width: 175, render: (row) => formatDateTime(row.last_seen_at) },
  { title: '应用版本', key: 'last_app_version', width: 110 },
]

const orderColumns: DataTableColumns<WinRemovalOrder> = [
  { title: '订单', key: 'order_id', minWidth: 150, render: (row) => h('span', { class: 'mono' }, shortHash(row.order_id, 8, 6)) },
  { title: '设备指纹摘要', key: 'fingerprint_hash', minWidth: 160, render: (row) => h('span', { class: 'mono' }, shortHash(row.fingerprint_hash, 10, 8)) },
  { title: '安装实例', key: 'install_instance_id', minWidth: 150, render: (row) => h('span', { class: 'mono' }, shortHash(row.install_instance_id, 8, 6)) },
  { title: '来源规则', key: 'ip_block_rule_id', width: 100, render: (row) => `#${row.ip_block_rule_id}` },
  {
    title: '状态',
    key: 'status',
    width: 120,
    render: (row) => h(NTag, { type: row.status === 'completed' ? 'success' : row.status === 'revoked' ? 'default' : row.status === 'failed' ? 'error' : 'warning', round: true }, { default: () => orderStatusLabel(row.status) }),
  },
  { title: '首次命中', key: 'first_blocked_at', width: 175, render: (row) => formatDateTime(row.first_blocked_at) },
  { title: '最近失败', key: 'last_failure_code', minWidth: 120, render: (row) => row.last_failure_code || '-' },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    fixed: 'right',
    render: (row) =>
      h(
        NButton,
        { size: 'small', type: 'warning', disabled: ['completed', 'revoked'].includes(row.status), onClick: () => openRevoke(row) },
        { default: () => '撤销' },
      ),
  },
]

async function fetchStats() {
  Object.assign(stats, await securityApi.ipSecurityStats())
}
async function fetchRules() {
  loadingRules.value = true
  try {
    const result = await securityApi.ipRules({ page: rulePagination.page, page_size: rulePagination.pageSize, ...ruleFilters })
    rules.value = pageList(result.list)
    rulePagination.itemCount = result.total
  } finally {
    loadingRules.value = false
  }
}
async function fetchObservations() {
  loadingObservations.value = true
  try {
    const result = await securityApi.ipObservations({ page: observationPagination.page, page_size: observationPagination.pageSize, ...observationFilters })
    observations.value = pageList(result.list)
    observationPagination.itemCount = result.total
  } finally {
    loadingObservations.value = false
  }
}
async function fetchOrders() {
  loadingOrders.value = true
  try {
    const result = await securityApi.removalOrders({ page: orderPagination.page, page_size: orderPagination.pageSize, ...orderFilters })
    orders.value = pageList(result.list)
    orderPagination.itemCount = result.total
  } finally {
    loadingOrders.value = false
  }
}
function refreshActive() {
  if (activeTab.value === 'rules') fetchRules()
  if (activeTab.value === 'observations') fetchObservations()
  if (activeTab.value === 'orders') fetchOrders()
}
function changePage(target: PaginationProps, page: number, load: () => Promise<void>) {
  target.page = page
  load()
}
function openCreateRule() {
  Object.assign(createForm, { ip: '', client_scope: 'both', expires_at_ms: null, reason: '', danger_confirm: false })
  createVisible.value = true
}
async function createRule() {
  if (!createForm.ip.trim() || createForm.reason.trim().length < 3 || !createForm.danger_confirm) {
    message.warning('请完整填写规则并勾选高风险确认')
    return
  }
  savingRule.value = true
  try {
    await securityApi.createIPRule({
      ip: createForm.ip.trim(),
      client_scope: createForm.client_scope,
      reason: createForm.reason.trim(),
      expires_at: createForm.expires_at_ms ? new Date(createForm.expires_at_ms).toISOString() : null,
      danger_confirm: true,
    })
    message.success('IP 封禁规则已创建')
    createVisible.value = false
    await Promise.all([fetchRules(), fetchStats()])
  } finally {
    savingRule.value = false
  }
}
function toggleRule(row: IPBlockRule) {
  const enabling = row.status !== 'active'
  dialog.warning({
    title: enabling ? '高风险：重新启用 IP 封禁' : '停用 IP 封禁规则',
    content: enabling
      ? '该 IP 后续出现的所有 Win 设备将被禁止登录，并在两次启动流程中创建强制删除订单。共享办公网络、NAT 或 VPN 出口可能影响多台设备。'
      : '停用 IP 规则不会撤销已经生成的 Win 删除订单。',
    positiveText: enabling ? '确认启用' : '确认停用',
    negativeText: '取消',
    onPositiveClick: async () => {
      await securityApi.setIPRuleStatus(row.id, enabling ? 'active' : 'disabled', enabling)
      message.success(enabling ? '规则已启用' : '规则已停用')
      await Promise.all([fetchRules(), fetchStats()])
    },
  })
}
function openRevoke(row: WinRemovalOrder) {
  revokeTarget.value = row
  revokeReason.value = ''
  revokeVisible.value = true
}
async function confirmRevoke() {
  if (!revokeTarget.value || revokeReason.value.trim().length < 5) {
    message.warning('撤销原因至少 5 个字符')
    return
  }
  revoking.value = true
  try {
    await securityApi.revokeRemovalOrder(revokeTarget.value.order_id, revokeReason.value.trim())
    message.success('删除订单已撤销')
    revokeVisible.value = false
    await Promise.all([fetchOrders(), fetchStats()])
  } finally {
    revoking.value = false
  }
}
function goUnusualRisks() {
  router.push({ name: 'risks', query: { risk_type: 'unusual_ip' } })
}

onMounted(() => Promise.all([fetchStats(), fetchRules()]))
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat span {
  color: var(--yy-text-secondary);
  font-size: 13px;
}

.stat strong {
  font-size: 26px;
}

.tab-alert,
.risk-confirm {
  margin-bottom: 16px;
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
