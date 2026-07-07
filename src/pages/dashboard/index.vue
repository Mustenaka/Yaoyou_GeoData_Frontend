<template>
  <div class="dashboard-page">
    <section class="console-head">
      <div class="console-head__copy">
        <span>{{ scopeText }}</span>
        <h1>系统控制台</h1>
        <p>按当前角色汇总平台运行、授权到期、同步上传、安全风险和操作消息。</p>
      </div>
      <div class="console-head__actions">
        <span class="console-head__time">更新于 {{ lastUpdatedText }}</span>
        <n-button :loading="loading" secondary type="primary" @click="loadAll">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
        <n-button :type="editing ? 'primary' : 'default'" secondary @click="editing = !editing">
          <template #icon>
            <n-icon :component="editing ? MoveOutline : GridOutline" />
          </template>
          {{ editing ? '完成排版' : '编辑排版' }}
        </n-button>
        <n-dropdown trigger="click" :options="addPanelOptions" @select="addPanel">
          <n-button :disabled="!editing || addPanelOptions.length === 0" secondary>
            <template #icon>
              <n-icon :component="AddOutline" />
            </template>
            添加组件
          </n-button>
        </n-dropdown>
        <n-popconfirm @positive-click="resetLayout">
          <template #trigger>
            <n-button :disabled="!editing" secondary>
              <template #icon>
                <n-icon :component="ReloadOutline" />
              </template>
              恢复默认
            </n-button>
          </template>
          恢复当前账号的默认控制台布局？
        </n-popconfirm>
      </div>
    </section>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <n-alert v-if="editing" type="info" :bordered="false">
      组件可拖动、缩放、增删；布局仅保存在当前浏览器和当前账号。
    </n-alert>

    <n-spin :show="loading && !summary">
      <template v-if="summary">
        <GridLayout
          class="dashboard-grid"
          :layout="visibleLayout"
          :col-num="12"
          :cols="gridCols"
          :breakpoints="gridBreakpoints"
          :row-height="92"
          :margin="[18, 18]"
          :is-draggable="editing && !isNarrow"
          :is-resizable="editing && !isNarrow"
          :use-css-transforms="true"
          :vertical-compact="true"
          :responsive="true"
          :prevent-collision="false"
          @layout-updated="handleLayoutUpdated"
        >
          <GridItem
            v-for="item in visibleLayout"
            :key="item.i"
            :x="item.x"
            :y="item.y"
            :w="item.w"
            :h="item.h"
            :i="item.i"
            :min-w="item.minW"
            :min-h="item.minH"
            drag-allow-from=".drag-handle"
            @moved="markUserLayoutCommit"
            @resized="markUserLayoutCommit"
          >
            <DashboardPanel
              :title="panelTitle(item.i)"
              :subtitle="panelSubtitle(item.i)"
              :action-label="panelActionLabel(item.i)"
              :editing="editing"
              :removable="visibleLayout.length > 1"
              @action="runPanelAction(item.i)"
              @remove="removePanel(item.i)"
            >
              <template #actions>
                <n-tag v-if="editing && !isNarrow" size="small" :bordered="false">{{ item.w }}x{{ item.h }}</n-tag>
              </template>

              <div v-if="item.i === 'summary'" class="metric-grid">
                <button v-for="card in metricCards" :key="card.key" class="metric-card" :class="`metric-card--${card.tone}`" type="button" :disabled="!card.route" @click="card.route?.()">
                  <span class="metric-card__icon">
                    <n-icon :component="card.icon" />
                  </span>
                  <span class="metric-card__body">
                    <small>{{ card.label }}</small>
                    <strong>{{ card.value }}</strong>
                    <em>{{ card.detail }}</em>
                  </span>
                </button>
              </div>

              <template v-else-if="item.i === 'server'">
                <div v-if="serverMetrics" class="server-metrics">
                  <div class="server-metrics__top">
                    <div>
                      <span>服务状态</span>
                      <strong :class="serverMetrics.service_status.overall === 'ok' ? 'text-green' : 'text-red'">{{ serverMetrics.service_status.overall === 'ok' ? '正常' : '降级' }}</strong>
                    </div>
                    <div>
                      <span>运行时长</span>
                      <strong>{{ formatUptime(serverMetrics.uptime_seconds) }}</strong>
                    </div>
                    <div>
                      <span>Goroutine</span>
                      <strong>{{ serverMetrics.goroutine_num }}</strong>
                    </div>
                  </div>
                  <div class="server-bars">
                    <div v-for="bar in serverBars" :key="bar.key" class="server-bar">
                      <div>
                        <span>{{ bar.label }}</span>
                        <strong>{{ formatMetricPercent(bar.value) }}</strong>
                      </div>
                      <n-progress type="line" :percentage="bar.percent" :height="8" :show-indicator="false" :color="bar.color" :rail-color="progressRailColor" />
                    </div>
                  </div>
                  <v-chart v-if="hasServerHistory" class="trend-chart" :option="serverTrendOption" autoresize />
                  <n-empty v-else description="暂无运行趋势历史" />
                </div>
                <n-empty v-else :description="serverMetricsError || '服务器指标加载中'" />
              </template>

              <template v-else-if="item.i === 'storage'">
                <div v-if="storage" class="storage-layout">
                  <v-chart class="storage-chart" :option="storageGaugeOption" autoresize />
                  <div class="storage-meta">
                    <strong>{{ formatBytes(storage.used_bytes) }}</strong>
                    <span>已用 {{ storage.used_gb.toFixed(2) }} GB</span>
                    <span>黄色 {{ storageSoftLimitGb }} GB / 红色 {{ storageWarnLimitGb }} GB</span>
                    <n-alert class="storage-advice" :type="storageAlertType" :bordered="false">{{ storageAdvice }}</n-alert>
                  </div>
                </div>
                <n-empty v-else :description="storageHiddenReason || '容量统计暂不可用'" />
              </template>

              <DashboardEventList v-else-if="item.i === 'message'" :rows="messageRows" :empty-text="messageEmptyText" @select="handleEventRow" />
              <DashboardEventList v-else-if="item.i === 'expiry'" :rows="expiryRows" :empty-text="recentErrorText || '暂无近期到期项'" @select="handleEventRow" />
              <DashboardEventList v-else-if="item.i === 'failed'" :rows="failedRows" :empty-text="recentErrorText || '暂无失败上传'" @select="handleEventRow" />
              <DashboardEventList v-else-if="item.i === 'risks'" :rows="riskRows" :empty-text="recentErrorText || '暂无高风险事件'" @select="handleEventRow" />
              <DashboardEventList v-else-if="item.i === 'sync'" :rows="syncRows" :empty-text="recentErrorText || '暂无同步记录'" @select="handleEventRow" />
              <DashboardEventList v-else-if="item.i === 'audit'" :rows="auditRows" :empty-text="auditErrorText || '暂无操作记录'" @select="handleEventRow" />

              <div v-else-if="item.i === 'business'" class="business-grid">
                <div class="business-item">
                  <span>{{ summary.scope === 'company' ? '企业用户' : '在线企业' }}</span>
                  <strong>{{ summary.scope === 'company' ? summary.user_count : summary.active_company_count }}</strong>
                </div>
                <div class="business-item">
                  <span>设备</span>
                  <strong>{{ summary.device_count }}</strong>
                </div>
                <div class="business-item">
                  <span>活跃会话</span>
                  <strong>{{ summary.active_session_count }}</strong>
                </div>
                <div class="business-item">
                  <span>今日失败率</span>
                  <strong>{{ todayFailureRate }}</strong>
                </div>
              </div>
            </DashboardPanel>
          </GridItem>
        </GridLayout>
      </template>
      <n-empty v-else description="控制台数据暂不可用" />
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import {
  AddOutline,
  AlertCircleOutline,
  BarChartOutline,
  BusinessOutline,
  CloudUploadOutline,
  GridOutline,
  KeyOutline,
  ListOutline,
  MoveOutline,
  NotificationsOutline,
  PeopleOutline,
  RefreshOutline,
  ReloadOutline,
  ServerOutline,
  ShieldCheckmarkOutline,
  StatsChartOutline,
  TimeOutline,
  WarningOutline,
} from '@vicons/ionicons5'
import { useMediaQuery } from '@vueuse/core'
import { GridItem, GridLayout, type LayoutItem } from 'grid-layout-plus'
import { LineChart, GaugeChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import type { DropdownOption } from 'naive-ui'
import { useMessage } from 'naive-ui'
import VChart from 'vue-echarts'
import { useRouter } from 'vue-router'
import { auditApi } from '@/api/audit'
import { opsApi } from '@/api/ops'
import { ApiError } from '@/api/request'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { DashboardRecentEvents, DashboardRiskEvent, DashboardServerMetrics, DashboardStorage, DashboardSummary, OperationAuditEvent } from '@/types/api'
import { formatBytes, formatDateTime, formatPercent } from '@/utils/format'
import { auditResultLabel, clientTypeLabel, objectTypeLabel, riskLevelLabel, roleLabel } from '@/utils/labels'
import DashboardEventList from './components/DashboardEventList.vue'
import DashboardPanel from './components/DashboardPanel.vue'

use([CanvasRenderer, GaugeChart, LineChart, GridComponent, LegendComponent, TooltipComponent])

type PanelId = 'summary' | 'server' | 'storage' | 'message' | 'expiry' | 'failed' | 'risks' | 'sync' | 'audit' | 'business'

type DashboardLayoutItem = LayoutItem & {
  i: PanelId
}

type PanelDefinition = {
  id: PanelId
  title: string
  description: string
  superOnly?: boolean
  backOfficeOnly?: boolean
  defaultItem: DashboardLayoutItem
}

type MetricCard = {
  key: string
  label: string
  value: string | number
  detail: string
  tone: 'green' | 'blue' | 'amber' | 'red'
  icon: Component
  route?: () => void
}

type EventRow = {
  key: string
  title: string
  desc: string
  time: string
  sortAt?: string | null
  tone?: 'green' | 'blue' | 'amber' | 'red' | 'neutral'
  route?: () => void
}

const panelDefinitions: Record<PanelId, PanelDefinition> = {
  summary: { id: 'summary', title: '概览统计', description: '服务、用户、上传和风险摘要', defaultItem: { i: 'summary', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 } },
  server: { id: 'server', title: '服务器性能', description: '真实 CPU、内存、磁盘与运行趋势', backOfficeOnly: true, defaultItem: { i: 'server', x: 0, y: 2, w: 8, h: 4, minW: 5, minH: 4 } },
  storage: { id: 'storage', title: '存储容量', description: '真实容量占用与阈值状态', superOnly: true, defaultItem: { i: 'storage', x: 8, y: 2, w: 4, h: 4, minW: 4, minH: 4 } },
  message: { id: 'message', title: '消息板', description: '聚合现有事件的只读信息流', defaultItem: { i: 'message', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 } },
  expiry: { id: 'expiry', title: '到期提醒', description: '企业、授权和临时账号到期项', defaultItem: { i: 'expiry', x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 } },
  failed: { id: 'failed', title: '最近失败上传', description: '文件同步失败记录', superOnly: true, defaultItem: { i: 'failed', x: 0, y: 10, w: 4, h: 4, minW: 3, minH: 3 } },
  risks: { id: 'risks', title: '最近高风险', description: '待关注安全风险', defaultItem: { i: 'risks', x: 4, y: 10, w: 4, h: 4, minW: 3, minH: 3 } },
  sync: { id: 'sync', title: '最近同步', description: '最近完成的上传同步', superOnly: true, defaultItem: { i: 'sync', x: 8, y: 10, w: 4, h: 4, minW: 3, minH: 3 } },
  audit: { id: 'audit', title: '操作记录', description: '最近后台操作', defaultItem: { i: 'audit', x: 0, y: 14, w: 6, h: 4, minW: 4, minH: 3 } },
  business: { id: 'business', title: '企业与用户', description: '角色范围内的基础运营指标', defaultItem: { i: 'business', x: 6, y: 14, w: 6, h: 4, minW: 4, minH: 3 } },
}

const dashboardLayoutVersion = 'v4'
const gridBreakpoints = { lg: 1200, md: 996, sm: 768, xs: 520, xxs: 0 }
const gridCols = { lg: 12, md: 12, sm: 6, xs: 2, xxs: 1 }

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const isNarrow = useMediaQuery('(max-width: 760px)')
const loading = ref(false)
const editing = ref(false)
const layoutReady = ref(false)
const errorText = ref('')
const recentErrorText = ref('')
const auditErrorText = ref('')
const storageHiddenReason = ref('')
const serverMetricsError = ref('')
const summary = ref<DashboardSummary | null>(null)
const storage = ref<DashboardStorage | null>(null)
const serverMetrics = ref<DashboardServerMetrics | null>(null)
const recent = ref<DashboardRecentEvents | null>(null)
const auditEvents = ref<OperationAuditEvent[]>([])
const layout = ref<DashboardLayoutItem[]>([])
const lastPersistedLayoutSignature = ref('')
const pendingUserLayoutCommit = ref(false)
const sessionRedirecting = ref(false)
let refreshTimer = 0
let serverMetricsTimer = 0

function themeColor(name: string) {
  const themeIsDark = themeStore.isDark
  void themeIsDark
  if (typeof window === 'undefined') return 'currentColor'
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'currentColor'
}

const layoutKey = computed(() => `yaoyou_dashboard_layout_${dashboardLayoutVersion}_${authStore.userId || authStore.username || 'anonymous'}`)

const availablePanelIds = computed<PanelId[]>(() => {
  return (Object.keys(panelDefinitions) as PanelId[]).filter((id) => {
    const definition = panelDefinitions[id]
    if (definition.superOnly && !authStore.isSuperAdmin) return false
    if (definition.backOfficeOnly && !authStore.isBackOfficeScopeAll) return false
    return true
  })
})

const visibleLayout = computed(() => layout.value.filter((item) => availablePanelIds.value.includes(item.i)))
const canUseRiskEvents = computed(() => authStore.isBackOfficeScopeAll || authStore.isEnterpriseAdmin)

const addPanelOptions = computed<DropdownOption[]>(() => {
  const used = new Set(visibleLayout.value.map((item) => item.i))
  return availablePanelIds.value
    .filter((id) => !used.has(id))
    .map((id) => ({
      key: id,
      label: panelDefinitions[id].title,
    }))
})

const scopeText = computed(() => {
  if (summary.value?.scope === 'company') return `${authStore.companyName || '本企业'} / 企业范围`
  if (authStore.isSuperAdmin) return '全平台 / 技术超级管理员'
  if (authStore.isAdmin) return '全平台 / 普通管理员'
  return `${roleLabel(authStore.roleCode)} / 管理后台`
})

const lastUpdatedText = computed(() => formatDateTime(serverMetrics.value?.generated_at || summary.value?.generated_at || recent.value?.generated_at))
const serviceOk = computed(() => summary.value?.service_status.overall === 'ok')
const storageSoftLimitGb = computed(() => storage.value?.soft_limit_gb || 20)
const storageWarnLimitGb = computed(() => storage.value?.warn_limit_gb || 30)
const storageLevel = computed(() => {
  if (!storage.value) return 'normal'
  if (storage.value.status === 'warn' || storage.value.used_gb >= storageWarnLimitGb.value) return 'warn'
  if (storage.value.status === 'soft' || storage.value.used_gb >= storageSoftLimitGb.value) return 'soft'
  return 'normal'
})
const storageLevelText = computed(() => (storageLevel.value === 'warn' ? '红色警戒' : storageLevel.value === 'soft' ? '黄色提醒' : '正常'))
const storageAlertType = computed(() => (storageLevel.value === 'warn' ? 'error' : storageLevel.value === 'soft' ? 'warning' : 'success'))
const storagePercent = computed(() => {
  if (!storage.value) return 0
  return clampPercent((storage.value.used_gb / Math.max(storageWarnLimitGb.value, 1)) * 100)
})
const progressRailColor = computed(() => themeColor('--yy-fill-active'))

const metricCards = computed<MetricCard[]>(() => {
  if (!summary.value) return []
  const item = summary.value
  return [
    {
      key: 'service',
      label: '服务状态',
      value: serviceOk.value ? '正常' : '降级',
      detail: `DB ${item.service_status.database} / Redis ${item.service_status.redis} / Storage ${item.service_status.storage}`,
      icon: ServerOutline,
      tone: serviceOk.value ? 'green' : 'red',
    },
    {
      key: 'users',
      label: item.scope === 'company' ? '企业用户' : '企业 / 用户',
      value: item.scope === 'company' ? item.user_count : `${item.active_company_count} / ${item.user_count}`,
      detail: `活跃会话 ${item.active_session_count}，设备 ${item.device_count}`,
      icon: item.scope === 'company' ? PeopleOutline : BusinessOutline,
      tone: 'blue',
      route: () => router.push({ name: 'users' }),
    },
    {
      key: 'uploads',
      label: '今日上传 / 失败',
      value: `${item.today_upload_count} / ${item.today_failed_count}`,
      detail: item.today_failed_count ? '存在失败上传' : '上传链路正常',
      icon: CloudUploadOutline,
      tone: item.today_failed_count ? 'amber' : 'green',
      route: authStore.isSuperAdmin ? goFailedUploads : undefined,
    },
    {
      key: 'risks',
      label: item.scope === 'company' ? '本企业高风险' : '未处理高风险',
      value: item.high_risk_count,
      detail: item.high_risk_count ? '需要尽快处理' : '暂无高风险待处理',
      icon: item.high_risk_count ? AlertCircleOutline : ShieldCheckmarkOutline,
      tone: item.high_risk_count ? 'red' : 'green',
      route: canUseRiskEvents.value ? goRisks : undefined,
    },
  ]
})

const serverBars = computed(() => {
  if (!serverMetrics.value) return []
  return [
    { key: 'cpu', label: 'CPU', value: serverMetrics.value.cpu_usage, percent: clampPercent(serverMetrics.value.cpu_usage), color: metricColor(serverMetrics.value.cpu_usage) },
    { key: 'memory', label: '内存', value: serverMetrics.value.memory_usage, percent: clampPercent(serverMetrics.value.memory_usage), color: metricColor(serverMetrics.value.memory_usage) },
    { key: 'disk', label: '磁盘', value: serverMetrics.value.disk_usage, percent: clampPercent(serverMetrics.value.disk_usage), color: metricColor(serverMetrics.value.disk_usage) },
  ]
})

const hasServerHistory = computed(() => Boolean(serverMetrics.value?.runtime_history?.length))

const serverTrendOption = computed(() => {
  const history = serverMetrics.value?.runtime_history || []
  const labelColor = themeColor('--yy-text-muted')
  const axisColor = themeColor('--yy-border')
  return {
    backgroundColor: 'transparent',
    color: [themeColor('--yy-tone-blue'), themeColor('--yy-tone-green'), themeColor('--yy-tone-amber')],
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      textStyle: { color: labelColor, fontSize: 12 },
      itemWidth: 10,
      itemHeight: 6,
    },
    grid: { top: 34, right: 8, bottom: 26, left: 38 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: history.map((item) => formatShortTime(item.created_at)),
      axisLine: { lineStyle: { color: axisColor } },
      axisLabel: { color: labelColor, fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { color: labelColor, formatter: '{value}%' },
      splitLine: { lineStyle: { color: axisColor } },
    },
    series: [
      { name: 'CPU', type: 'line', smooth: true, showSymbol: false, data: history.map((item) => Number(item.cpu_usage.toFixed(1))) },
      { name: '内存', type: 'line', smooth: true, showSymbol: false, data: history.map((item) => Number(item.memory_usage.toFixed(1))) },
      { name: '磁盘', type: 'line', smooth: true, showSymbol: false, data: history.map((item) => Number(item.disk_usage.toFixed(1))) },
    ],
  }
})

const storageGaugeOption = computed(() => {
  const valueColor = storageLevel.value === 'warn' ? themeColor('--yy-tone-red') : storageLevel.value === 'soft' ? themeColor('--yy-tone-amber') : themeColor('--yy-tone-green')
  const trackColor = themeColor('--yy-fill-active')
  const textColor = themeColor('--yy-text-primary')
  return {
    backgroundColor: 'transparent',
    tooltip: { formatter: `容量占用 ${storagePercent.value}%` },
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: '100%',
        progress: { show: true, width: 12, itemStyle: { color: valueColor } },
        axisLine: { lineStyle: { width: 12, color: [[1, trackColor]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: { show: true, offsetCenter: [0, '34%'], color: themeColor('--yy-text-muted'), fontSize: 12 },
        detail: { valueAnimation: true, formatter: '{value}%', offsetCenter: [0, '-4%'], color: textColor, fontSize: 28, fontWeight: 700 },
        data: [{ value: storagePercent.value, name: storageLevelText.value }],
      },
    ],
  }
})

const storageAdvice = computed(() => {
  if (!storage.value) return ''
  if (storageLevel.value === 'warn') return '容量已达到红色警戒线，建议清理临时文件、超期日志或安排扩容。'
  if (storageLevel.value === 'soft') return '容量进入黄色提醒区间，建议关注增长速度并评估归档策略。'
  return '容量处于正常区间。'
})

const expiryRows = computed<EventRow[]>(() => {
  const rows: EventRow[] = []
  ;(recent.value?.expiring_companies || []).forEach((item) => {
    rows.push({ key: `company-${item.id}`, title: item.company_name, desc: '企业有效期即将到期', time: formatDateTime(item.valid_until), sortAt: item.valid_until, tone: 'amber', route: authStore.isBackOfficeScopeAll ? () => router.push({ name: 'companies' }) : undefined })
  })
  ;(recent.value?.expiring_licenses || []).forEach((item) => {
    rows.push({ key: `license-${item.id}`, title: item.username || `用户 ${item.user_id ?? '-'}`, desc: `${clientTypeLabel(item.client_type)} 授权 / ${item.product_scope}`, time: formatDateTime(item.valid_until), sortAt: item.valid_until, tone: 'blue', route: authStore.isBackOfficeScopeAll ? () => router.push({ name: 'licenses' }) : undefined })
  })
  ;(recent.value?.expiring_users || []).forEach((item) => {
    rows.push({ key: `user-${item.id}`, title: item.username, desc: roleLabel(item.role_code), time: formatDateTime(item.valid_until), sortAt: item.valid_until, tone: 'amber', route: () => router.push({ name: 'users' }) })
  })
  return rows.slice(0, 12)
})

const failedRows = computed<EventRow[]>(() =>
  (recent.value?.failed_uploads || []).slice(0, 8).map((item) => ({
    key: `failed-${item.file_id}`,
    title: item.original_filename || item.file_id,
    desc: `${objectTypeLabel(item.object_type)} / ${item.parse_message || item.upload_status}`,
    time: formatDateTime(item.created_at),
    sortAt: item.created_at,
    tone: 'red',
    route: authStore.isSuperAdmin ? goFailedUploads : undefined,
  })),
)

function dashboardRiskCompanyLabel(item: DashboardRiskEvent) {
  if (item.company_name) {
    return item.company_id != null ? `${item.company_name}(#${item.company_id})` : item.company_name
  }
  return item.company_id != null ? `#${item.company_id}` : '-'
}

function dashboardRiskUserLabel(item: DashboardRiskEvent) {
  if (item.username) {
    const label = item.real_name ? `${item.username}（${item.real_name}）` : item.username
    return item.user_id != null ? `${label}(#${item.user_id})` : label
  }
  return item.user_id != null ? `#${item.user_id}` : '-'
}

const riskRows = computed<EventRow[]>(() =>
  (recent.value?.high_risks || []).slice(0, 8).map((item) => ({
    key: `risk-${item.id}`,
    title: item.risk_type,
    desc: `${riskLevelLabel(item.risk_level)} / ${dashboardRiskCompanyLabel(item)} / ${dashboardRiskUserLabel(item)}`,
    time: formatDateTime(item.created_at),
    sortAt: item.created_at,
    tone: 'red',
    route: canUseRiskEvents.value ? () => goRiskDetail(item.id) : undefined,
  })),
)

const syncRows = computed<EventRow[]>(() =>
  (recent.value?.recent_uploads || []).slice(0, 8).map((item) => ({
    key: `sync-${item.file_id}`,
    title: item.original_filename || item.file_id,
    desc: `${clientTypeLabel(item.source_client)} / ${objectTypeLabel(item.object_type)} / ${item.project_uuid || '-'}`,
    time: formatDateTime(item.created_at),
    sortAt: item.created_at,
    tone: 'green',
    route: authStore.isSuperAdmin ? () => router.push({ name: 'sync-files' }) : undefined,
  })),
)

const auditRows = computed<EventRow[]>(() =>
  auditEvents.value.slice(0, 8).map((item) => ({
    key: `audit-${item.id || item.event_id}`,
    title: `${item.module} / ${item.action}`,
    desc: `${auditResultLabel(item.result)} / ${item.message || item.ip || '-'}`,
    time: formatDateTime(item.created_at || item.server_ts),
    sortAt: item.created_at || item.server_ts,
    tone: item.result === 'success' ? 'green' : item.result === 'failed' ? 'red' : 'amber',
    route: () => router.push({ name: 'audit' }),
  })),
)

const messageRows = computed<EventRow[]>(() => {
  const rows: Array<EventRow & { sortAt: string }> = []
  if (authStore.isSuperAdmin) {
    failedRows.value.forEach((item) => rows.push({ ...item, key: `msg-${item.key}`, sortAt: item.sortAt || item.time }))
    syncRows.value.slice(0, 4).forEach((item) => rows.push({ ...item, key: `msg-${item.key}`, sortAt: item.sortAt || item.time }))
  }
  if (canUseRiskEvents.value) {
    riskRows.value.forEach((item) => rows.push({ ...item, key: `msg-${item.key}`, sortAt: item.sortAt || item.time }))
  }
  expiryRows.value.slice(0, 4).forEach((item) => rows.push({ ...item, key: `msg-${item.key}`, sortAt: item.sortAt || item.time }))
  auditRows.value.slice(0, 6).forEach((item) => rows.push({ ...item, key: `msg-${item.key}`, sortAt: item.sortAt || item.time }))
  return rows.sort((a, b) => timeValue(b.sortAt) - timeValue(a.sortAt)).slice(0, 12)
})

const messageEmptyText = computed(() => recentErrorText.value || auditErrorText.value || '暂无消息')

const todayFailureRate = computed(() => {
  if (!summary.value || summary.value.today_upload_count <= 0) return '0%'
  return formatPercent((summary.value.today_failed_count / summary.value.today_upload_count) * 100)
})

const serverPanelVisible = computed(() => authStore.isBackOfficeScopeAll && visibleLayout.value.some((item) => item.i === 'server'))

watch(
  () => [layoutKey.value, authStore.roleCode],
  () => loadLayout(),
  { immediate: true },
)

watch(serverPanelVisible, (visible) => {
  stopServerMetricsPolling()
  if (visible) {
    void loadServerMetrics(true)
    serverMetricsTimer = window.setInterval(() => {
      void loadServerMetrics(true)
    }, 8_000)
  }
})

function loadLayout() {
  layoutReady.value = false
  const stored = localStorage.getItem(layoutKey.value)
  layout.value = stored ? sanitizeLayout(stored) : defaultLayout()
  lastPersistedLayoutSignature.value = layoutSignature(layout.value)
  pendingUserLayoutCommit.value = false
  void nextTick(() => {
    layoutReady.value = true
  })
}

function defaultLayout() {
  return availablePanelIds.value.map((id) => cloneLayoutItem(panelDefinitions[id].defaultItem))
}

function cloneLayoutItem(item: DashboardLayoutItem): DashboardLayoutItem {
  return { ...item }
}

function sanitizeLayout(raw: string) {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return defaultLayout()
    const sanitized = sanitizeLayoutItems(parsed)
    return sanitized.length ? sanitized : defaultLayout()
  } catch {
    return defaultLayout()
  }
}

function sanitizeLayoutItems(items: unknown[]) {
  const seen = new Set<PanelId>()
  const next: DashboardLayoutItem[] = []
  items.forEach((item) => {
    if (!isRecord(item) || !isPanelId(item.i) || seen.has(item.i) || !availablePanelIds.value.includes(item.i)) return
    const def = panelDefinitions[item.i]
    next.push({
      ...def.defaultItem,
      x: clampInt(item.x, 0, 11),
      y: Math.max(0, toInt(item.y, def.defaultItem.y)),
      w: clampInt(item.w, def.defaultItem.minW || 1, 12),
      h: clampInt(item.h, def.defaultItem.minH || 1, 12),
      i: item.i,
    })
    seen.add(item.i)
  })
  return next
}

function layoutSignature(items: Array<Pick<LayoutItem, 'i' | 'x' | 'y' | 'w' | 'h'>>) {
  return JSON.stringify(
    items
      .map((item) => ({
        i: String(item.i),
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      }))
      .sort((a, b) => a.i.localeCompare(b.i)),
  )
}

function persistLayout(force = false) {
  if (!layoutReady.value || isNarrow.value) return
  const signature = layoutSignature(visibleLayout.value)
  if (!force && signature === lastPersistedLayoutSignature.value) return
  localStorage.setItem(layoutKey.value, JSON.stringify(visibleLayout.value.map((item) => ({ i: item.i, x: item.x, y: item.y, w: item.w, h: item.h, minW: item.minW, minH: item.minH }))))
  lastPersistedLayoutSignature.value = signature
}

function markUserLayoutCommit() {
  if (editing.value && !isNarrow.value) {
    pendingUserLayoutCommit.value = true
  }
}

function handleLayoutUpdated(items: LayoutItem[]) {
  if (!editing.value || isNarrow.value || !pendingUserLayoutCommit.value) return
  pendingUserLayoutCommit.value = false
  const sanitized = sanitizeLayoutItems(items)
  if (!sanitized.length) return
  const nextSignature = layoutSignature(sanitized)
  if (nextSignature === lastPersistedLayoutSignature.value) return
  layout.value = sanitized
  void nextTick(() => persistLayout())
}

function addPanel(key: string | number) {
  if (!isPanelId(key)) return
  pendingUserLayoutCommit.value = false
  const y = visibleLayout.value.reduce((max, item) => Math.max(max, item.y + item.h), 0)
  layout.value = [...visibleLayout.value, { ...panelDefinitions[key].defaultItem, y }]
  void nextTick(() => persistLayout(true))
}

function removePanel(id: PanelId) {
  if (visibleLayout.value.length <= 1) return
  pendingUserLayoutCommit.value = false
  layout.value = visibleLayout.value.filter((item) => item.i !== id)
  void nextTick(() => persistLayout(true))
}

function resetLayout() {
  pendingUserLayoutCommit.value = false
  layout.value = defaultLayout()
  void nextTick(() => persistLayout(true))
  message.success('已恢复默认布局')
}

function panelTitle(id: PanelId) {
  return panelDefinitions[id].title
}

function panelSubtitle(id: PanelId) {
  if (id === 'storage' && storage.value) return `${storage.value.provider || 'local'} / ${storageLevelText.value}`
  if (id === 'server' && serverMetrics.value) return `快照 ${formatDateTime(serverMetrics.value.generated_at)}`
  return panelDefinitions[id].description
}

function panelActionLabel(id: PanelId) {
  if (id === 'expiry' && authStore.isBackOfficeScopeAll) return '授权'
  if (id === 'failed' || id === 'sync') return authStore.isSuperAdmin ? '文件同步' : ''
  if (id === 'risks') return canUseRiskEvents.value ? '安全风险' : ''
  if (id === 'audit') return '操作记录'
  return ''
}

function runPanelAction(id: PanelId) {
  if (id === 'expiry' && authStore.isBackOfficeScopeAll) router.push({ name: 'licenses' })
  if (id === 'failed') goFailedUploads()
  if (id === 'sync' && authStore.isSuperAdmin) router.push({ name: 'sync-files' })
  if (id === 'risks') goRisks()
  if (id === 'audit') router.push({ name: 'audit' })
}

async function loadStorage() {
  if (!authStore.isSuperAdmin) {
    storage.value = null
    storageHiddenReason.value = '容量信息仅 superadmin 可见'
    return
  }
  try {
    storage.value = await opsApi.storage()
    storageHiddenReason.value = ''
  } catch (error) {
    storage.value = null
    if (error instanceof ApiError && error.code === 12001) {
      storageHiddenReason.value = '容量信息仅 superadmin 可见'
      return
    }
    storageHiddenReason.value = error instanceof Error ? error.message : '容量统计加载失败'
  }
}

async function loadServerMetrics(silent = false) {
  if (!authStore.isBackOfficeScopeAll) {
    serverMetrics.value = null
    serverMetricsError.value = '服务器指标仅平台管理员可见'
    return
  }
  try {
    serverMetrics.value = await opsApi.serverMetrics(80)
    serverMetricsError.value = ''
  } catch (error) {
    serverMetrics.value = null
    if (error instanceof ApiError && error.code === 12001) {
      serverMetricsError.value = '服务器指标仅 superadmin 可见'
      return
    }
    serverMetricsError.value = error instanceof Error ? error.message : '服务器指标加载失败'
    if (!silent) errorText.value = serverMetricsError.value
  }
}

async function loadAuditEvents() {
  try {
    const resp = await auditApi.list({ page: 1, page_size: 8 })
    auditEvents.value = resp.list || []
    auditErrorText.value = ''
  } catch (error) {
    auditEvents.value = []
    auditErrorText.value = error instanceof Error ? error.message : '操作记录加载失败'
    if (isDashboardSessionError(error)) {
      redirectToLoginFromDashboard()
    }
  }
}

async function loadSummary() {
  try {
    summary.value = await opsApi.summary()
    errorText.value = ''
  } catch (error) {
    summary.value = null
    errorText.value = error instanceof Error ? error.message : '控制台摘要加载失败'
    if (isDashboardSessionError(error)) {
      redirectToLoginFromDashboard()
    }
  }
}

async function loadRecentEvents() {
  try {
    recent.value = await opsApi.recentEvents()
    recentErrorText.value = ''
  } catch (error) {
    recent.value = null
    recentErrorText.value = error instanceof Error ? error.message : '近期事件加载失败'
    if (isDashboardSessionError(error)) {
      redirectToLoginFromDashboard()
    }
  }
}

async function loadAll() {
  loading.value = true
  errorText.value = ''
  try {
    await Promise.all([loadSummary(), loadRecentEvents(), loadAuditEvents(), loadStorage(), authStore.isBackOfficeScopeAll ? loadServerMetrics(true) : Promise.resolve()])
  } finally {
    loading.value = false
  }
}

function handleEventRow(row: EventRow) {
  row.route?.()
}

function goFailedUploads() {
  if (!authStore.isSuperAdmin) return
  router.push({ name: 'sync-files', query: { upload_status: 'failed' } })
}

function goRisks() {
  if (!canUseRiskEvents.value) return
  router.push({ name: 'risks', query: { risk_level: 'high', handled: 'false' } })
}

function goRiskDetail(id: number) {
  if (!canUseRiskEvents.value) return
  router.push({ name: 'risks', query: { event_id: String(id) } })
}

function stopServerMetricsPolling() {
  if (serverMetricsTimer) {
    window.clearInterval(serverMetricsTimer)
    serverMetricsTimer = 0
  }
}

function isDashboardSessionError(error: unknown) {
  return error instanceof ApiError && [10002, 11002, 11003, 12001].includes(error.code)
}

function redirectToLoginFromDashboard() {
  if (sessionRedirecting.value) return
  sessionRedirecting.value = true
  authStore.clearSession()
  message.error('登录状态或角色权限已失效，请重新登录')
  router.replace({ name: 'login', query: { redirect: '/dashboard' } })
}

function isPanelId(value: unknown): value is PanelId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(panelDefinitions, value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function toInt(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback
}

function clampInt(value: unknown, min: number, max: number) {
  return Math.min(max, Math.max(min, toInt(value, min)))
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

function metricColor(value: number) {
  if (value >= 85) return themeColor('--yy-tone-red')
  if (value >= 70) return themeColor('--yy-tone-amber')
  return themeColor('--yy-tone-green')
}

function formatMetricPercent(value: number) {
  return formatPercent(value)
}

function formatShortTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' })
}

function timeValue(value: string) {
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function formatUptime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 分钟'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days} 天 ${hours} 小时`
  if (hours > 0) return `${hours} 小时 ${minutes} 分钟`
  return `${minutes} 分钟`
}

onMounted(() => {
  void loadAll()
  refreshTimer = window.setInterval(() => {
    if (!loading.value) void loadAll()
  }, 90_000)
})

onBeforeUnmount(() => {
  window.clearInterval(refreshTimer)
  stopServerMetricsPolling()
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: var(--layout-padding);
}

.console-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 20px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-surface);
  box-shadow: 0 10px 26px var(--yy-shadow);
}

.console-head__copy {
  min-width: 0;
}

.console-head__copy span,
.console-head__time {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.console-head h1 {
  margin: 5px 0 4px;
  color: var(--yy-text);
  font-size: 24px;
  line-height: 1.2;
}

.console-head p {
  margin: 0;
  color: var(--yy-text-secondary);
}

.console-head__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.dashboard-grid {
  min-height: 420px;
  --vgl-placeholder-bg: var(--yy-primary);
  --vgl-placeholder-opacity: 12%;
  --vgl-resizer-border-color: var(--yy-primary);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  height: 100%;
}

.metric-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-height: 108px;
  padding: 14px;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  background: var(--yy-surface-soft);
  color: var(--yy-text);
  text-align: left;
}

.metric-card:disabled {
  cursor: default;
}

.metric-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--yy-tone-blue-bg);
  color: var(--yy-tone-blue);
  font-size: 21px;
}

.metric-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.metric-card small,
.metric-card em,
.server-metrics span,
.business-item span,
.storage-meta span {
  color: var(--yy-text-muted);
  font-size: 12px;
  font-style: normal;
}

.metric-card strong {
  overflow: hidden;
  color: var(--yy-text);
  font-size: 24px;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-card--green .metric-card__icon {
  background: var(--yy-tone-green-bg);
  color: var(--yy-tone-green);
}

.metric-card--amber .metric-card__icon {
  background: var(--yy-tone-amber-bg);
  color: var(--yy-tone-amber);
}

.metric-card--red .metric-card__icon {
  background: var(--yy-tone-red-bg);
  color: var(--yy-tone-red);
}

.server-metrics {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 12px;
}

.server-metrics__top {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.server-metrics__top > div,
.business-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
  padding: 12px;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  background: var(--yy-surface-soft);
}

.server-metrics__top strong,
.business-item strong,
.storage-meta strong {
  color: var(--yy-text);
  font-size: 20px;
  line-height: 1.15;
}

.server-bars {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.server-bar {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 7px;
}

.server-bar > div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.trend-chart {
  flex: 1;
  min-height: 170px;
}

.storage-layout {
  display: grid;
  grid-template-columns: minmax(170px, 0.9fr) minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  height: 100%;
}

.storage-chart {
  height: 210px;
  min-width: 0;
}

.storage-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 9px;
}

.storage-advice {
  margin-top: 3px;
}

.business-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  height: 100%;
  align-content: start;
}

.text-green {
  color: var(--yy-green) !important;
}

.text-red {
  color: var(--yy-red) !important;
}

@media (max-width: 1180px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dashboard-page {
    gap: 14px;
    padding: 12px;
  }

  .console-head {
    align-items: stretch;
    flex-direction: column;
    padding: 16px;
  }

  .console-head__actions {
    justify-content: flex-start;
  }

  .metric-grid,
  .server-metrics__top,
  .server-bars,
  .storage-layout,
  .business-grid {
    grid-template-columns: 1fr;
  }

  .metric-card {
    min-height: 96px;
  }

  .storage-chart {
    height: 180px;
  }
}
</style>
