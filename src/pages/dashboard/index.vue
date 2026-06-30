<template>
  <div class="dashboard-page">
    <section class="console-hero">
      <div class="console-hero__copy">
        <span class="console-hero__eyebrow">{{ scopeText }}</span>
        <h1>系统控制台</h1>
        <p>按当前角色权限汇总平台运行、授权到期、同步上传和安全风险状态。</p>
      </div>
      <div class="console-hero__actions">
        <span class="console-hero__time">更新于 {{ lastUpdatedText }}</span>
        <n-button :loading="loading" secondary type="primary" @click="loadAll">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
      </div>
    </section>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <n-spin :show="loading && !summary">
      <template v-if="summary">
        <section class="metric-grid" aria-label="控制台指标">
          <button
            v-for="card in metricCards"
            :key="card.key"
            class="metric-card"
            :class="[card.tone, { 'metric-card--action': card.action }]"
            type="button"
            :disabled="!card.action"
            @click="card.action?.()"
          >
            <span class="metric-card__icon">
              <n-icon :component="card.icon" />
            </span>
            <span class="metric-card__body">
              <span class="metric-card__label">{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <small>{{ card.detail }}</small>
            </span>
          </button>
        </section>

        <section class="overview-grid">
          <div class="dashboard-card dashboard-card--expiry">
            <div class="section-head">
              <div>
                <strong>到期提醒</strong>
                <span>{{ summary.expiring.window_days }} 天内需要关注</span>
              </div>
              <n-button text size="small" @click="router.push({ name: 'licenses' })">授权</n-button>
            </div>
            <div class="expiry-grid">
              <button v-if="authStore.isBackOfficeScopeAll" class="expiry-item" type="button" @click="router.push({ name: 'companies' })">
                <span>企业</span>
                <strong>{{ summary.expiring.company_count }}</strong>
              </button>
              <button v-if="authStore.isBackOfficeScopeAll" class="expiry-item" type="button" @click="router.push({ name: 'licenses' })">
                <span>授权</span>
                <strong>{{ summary.expiring.license_count }}</strong>
              </button>
              <button class="expiry-item" type="button" @click="router.push({ name: 'users', query: { role_code: 'trial_user' } })">
                <span>试用账号</span>
                <strong>{{ summary.expiring.trial_user_count }}</strong>
              </button>
              <button class="expiry-item" type="button" @click="router.push({ name: 'users', query: { role_code: 'temporary_user' } })">
                <span>临时账号</span>
                <strong>{{ summary.expiring.temporary_user_count }}</strong>
              </button>
            </div>
          </div>

          <div v-if="authStore.isSuperAdmin" class="dashboard-card dashboard-card--storage">
            <div class="section-head">
              <div>
                <strong>存储容量</strong>
                <span>{{ storage?.provider || 'local' }} · {{ storageLevelText }}</span>
              </div>
              <n-tag :type="storageTagType" round>{{ storageStatusLabel }}</n-tag>
            </div>
            <template v-if="storage">
              <div class="storage-layout">
                <v-chart class="storage-chart" :option="storageGaugeOption" autoresize />
                <div class="storage-meta">
                  <strong>{{ formatBytes(storage.used_bytes) }}</strong>
                  <span>已用 {{ storage.used_gb.toFixed(2) }} GB</span>
                  <span>黄色 {{ storageSoftLimitGb }} GB / 红色 {{ storageWarnLimitGb }} GB</span>
                </div>
              </div>
              <n-alert class="storage-alert" :type="storageAlertType" :bordered="false">
                {{ storageAdvice }}
              </n-alert>
            </template>
            <n-empty v-else :description="storageHiddenReason || '容量统计暂不可用'" />
          </div>
        </section>

        <section v-if="eventSections.length" class="event-grid">
          <div v-for="section in eventSections" :key="section.key" class="dashboard-card">
            <div class="section-head">
              <div>
                <strong>{{ section.title }}</strong>
                <span>{{ section.subtitle }}</span>
              </div>
              <n-button v-if="section.action" text size="small" @click="section.action">{{ section.actionLabel }}</n-button>
            </div>
            <div v-if="section.rows.length" class="event-list">
              <div v-for="item in section.rows" :key="item.key" class="event-row" :class="item.tone">
                <span class="event-row__dot" />
                <div class="event-row__content">
                  <strong>{{ item.title }}</strong>
                  <span>{{ item.desc }}</span>
                </div>
                <time>{{ item.time }}</time>
              </div>
            </div>
            <n-empty v-else :description="section.emptyText" />
          </div>
        </section>
      </template>
      <n-empty v-else description="控制台数据暂不可用" />
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  AlertCircleOutline,
  BusinessOutline,
  CloudUploadOutline,
  KeyOutline,
  PeopleOutline,
  RefreshOutline,
  ServerOutline,
  ShieldCheckmarkOutline,
} from '@vicons/ionicons5'
import { use } from 'echarts/core'
import { GaugeChart } from 'echarts/charts'
import { TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { useRouter } from 'vue-router'
import { ApiError } from '@/api/request'
import { opsApi } from '@/api/ops'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { DashboardRecentEvents, DashboardStorage, DashboardSummary } from '@/types/api'
import { formatBytes, formatDateTime } from '@/utils/format'
import { clientTypeLabel, objectTypeLabel, riskLevelLabel, roleLabel } from '@/utils/labels'

use([CanvasRenderer, GaugeChart, TooltipComponent])

type DashboardRow = {
  key: string
  title: string
  desc: string
  time: string
  tone?: string
}

type DashboardSection = {
  key: string
  title: string
  subtitle: string
  rows: DashboardRow[]
  emptyText: string
  actionLabel?: string
  action?: () => void
}

const storageSoftLimitGb = 20
const storageWarnLimitGb = 30

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const loading = ref(false)
const errorText = ref('')
const storageHiddenReason = ref('')
const summary = ref<DashboardSummary | null>(null)
const storage = ref<DashboardStorage | null>(null)
const recent = ref<DashboardRecentEvents | null>(null)
let refreshTimer = 0

const scopeText = computed(() => {
  if (!summary.value) return `${roleLabel(authStore.roleCode)} / ${authStore.companyName || '全平台'}`
  return summary.value.scope === 'company' ? `${authStore.companyName || '本企业'} 摘要` : '全平台运营摘要'
})

const lastUpdatedText = computed(() => formatDateTime(summary.value?.generated_at || recent.value?.generated_at || new Date().toISOString()))
const serviceOk = computed(() => summary.value?.service_status.overall === 'ok')
const serviceStatusText = computed(() => (serviceOk.value ? '正常' : '降级'))
const serviceDetail = computed(() => {
  const status = summary.value?.service_status
  if (!status) return '-'
  return `DB ${status.database} / Redis ${status.redis} / Storage ${status.storage}`
})

const metricCards = computed(() => {
  if (!summary.value) return []
  const item = summary.value
  return [
    {
      key: 'service',
      label: '服务状态',
      value: serviceStatusText.value,
      detail: serviceDetail.value,
      icon: ServerOutline,
      tone: serviceOk.value ? 'tone-green' : 'tone-red',
    },
    {
      key: 'users',
      label: item.scope === 'company' ? '企业用户' : '企业 / 用户',
      value: item.scope === 'company' ? item.user_count : `${item.active_company_count} / ${item.user_count}`,
      detail: `活跃会话 ${item.active_session_count}，设备 ${item.device_count}`,
      icon: item.scope === 'company' ? PeopleOutline : BusinessOutline,
      tone: 'tone-blue',
    },
    {
      key: 'uploads',
      label: '今日上传 / 失败',
      value: `${item.today_upload_count} / ${item.today_failed_count}`,
      detail: item.today_failed_count ? '存在失败上传' : '上传链路正常',
      icon: CloudUploadOutline,
      tone: item.today_failed_count ? 'tone-amber' : 'tone-green',
      action: authStore.isSuperAdmin ? goFailedUploads : undefined,
    },
    {
      key: 'risks',
      label: item.scope === 'company' ? '本企业高风险' : '未处理高风险',
      value: item.high_risk_count,
      detail: item.high_risk_count ? '需要尽快处理' : '暂无高风险待处理',
      icon: item.high_risk_count ? AlertCircleOutline : ShieldCheckmarkOutline,
      tone: item.high_risk_count ? 'tone-red' : 'tone-green',
      action: authStore.isSuperAdmin ? goRisks : undefined,
    },
  ]
})

const storagePercent = computed(() => {
  if (!storage.value) return 0
  return Math.min(100, Math.round((storage.value.used_gb / storageWarnLimitGb) * 100))
})

const storageLevel = computed(() => {
  if (!storage.value) return 'normal'
  if (storage.value.used_gb >= storageWarnLimitGb || storage.value.status === 'warn') return 'warn'
  if (storage.value.used_gb >= storageSoftLimitGb || storage.value.status === 'soft') return 'soft'
  return 'normal'
})

const storageLevelText = computed(() => {
  if (storageLevel.value === 'warn') return '红色警戒'
  if (storageLevel.value === 'soft') return '黄色提醒'
  return '正常'
})

const storageStatusLabel = computed(() => {
  if (!storage.value) return '未加载'
  return storageLevelText.value
})

const storageTagType = computed(() => {
  if (storageLevel.value === 'warn') return 'error'
  if (storageLevel.value === 'soft') return 'warning'
  return 'success'
})

const storageAlertType = computed(() => storageTagType.value)

const storageAdvice = computed(() => {
  if (!storage.value) return ''
  if (storageLevel.value === 'warn') return '容量已达到红色警戒线，建议清理临时文件、超期日志或安排扩容。'
  if (storageLevel.value === 'soft') return '容量进入黄色提醒区间，建议关注增长速度并评估归档策略。'
  return '容量处于正常区间。'
})

const storageGaugeOption = computed(() => {
  const valueColor = storageLevel.value === 'warn' ? '#ef746f' : storageLevel.value === 'soft' ? '#e2aa4d' : '#63c28a'
  const trackColor = themeStore.isDark ? '#263241' : '#e7edf3'
  const textColor = themeStore.isDark ? '#e8edf4' : '#17212f'
  return {
    backgroundColor: 'transparent',
    tooltip: {
      formatter: `容量占用 ${storagePercent.value}%`,
    },
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        radius: '100%',
        progress: {
          show: true,
          width: 12,
          itemStyle: { color: valueColor },
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [[1, trackColor]],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        title: {
          show: true,
          offsetCenter: [0, '32%'],
          color: themeStore.isDark ? '#8d9bae' : '#7b8a9a',
          fontSize: 12,
        },
        detail: {
          valueAnimation: true,
          formatter: '{value}%',
          offsetCenter: [0, '-4%'],
          color: textColor,
          fontSize: 26,
          fontWeight: 700,
        },
        data: [{ value: storagePercent.value, name: storageLevelText.value }],
      },
    ],
  }
})

const expiryRows = computed<DashboardRow[]>(() => {
  if (!recent.value) return []
  const rows: DashboardRow[] = []
  recent.value.expiring_companies.forEach((item) => {
    rows.push({
      key: `company-${item.id}`,
      title: item.company_name,
      desc: '企业有效期即将到期',
      time: formatDateTime(item.valid_until),
      tone: 'tone-amber',
    })
  })
  recent.value.expiring_licenses.forEach((item) => {
    rows.push({
      key: `license-${item.id}`,
      title: item.username || `用户 ${item.user_id ?? '-'}`,
      desc: `${clientTypeLabel(item.client_type)} 授权 / ${item.product_scope}`,
      time: formatDateTime(item.valid_until),
      tone: 'tone-blue',
    })
  })
  recent.value.expiring_users.forEach((item) => {
    rows.push({
      key: `user-${item.id}`,
      title: item.username,
      desc: roleLabel(item.role_code),
      time: formatDateTime(item.trial_expires_at || item.temporary_expires_at),
      tone: 'tone-amber',
    })
  })
  return rows.slice(0, 10)
})

const eventSections = computed<DashboardSection[]>(() => {
  if (!recent.value) return []
  const sections: DashboardSection[] = []

  if (authStore.isSuperAdmin) {
    sections.push({
      key: 'failed',
      title: '最近失败上传',
      subtitle: '需要排查的同步失败',
      actionLabel: '文件同步',
      action: goFailedUploads,
      emptyText: '暂无失败上传',
      rows: recent.value.failed_uploads.slice(0, 6).map((item) => ({
        key: `failed-${item.file_id}`,
        title: item.original_filename || item.file_id,
        desc: `${objectTypeLabel(item.object_type)} / ${item.parse_message || item.upload_status}`,
        time: formatDateTime(item.created_at),
        tone: 'tone-red',
      })),
    })
    sections.push({
      key: 'risks',
      title: '最近高风险',
      subtitle: '安全风险待处理线索',
      actionLabel: '安全风险',
      action: goRisks,
      emptyText: '暂无高风险事件',
      rows: recent.value.high_risks.slice(0, 6).map((item) => ({
        key: `risk-${item.id}`,
        title: item.risk_type,
        desc: `${riskLevelLabel(item.risk_level)} / 企业 ${item.company_id ?? '-'} / 用户 ${item.user_id ?? '-'}`,
        time: formatDateTime(item.created_at),
        tone: 'tone-red',
      })),
    })
    sections.push({
      key: 'sync',
      title: '最近同步',
      subtitle: '最近完成的文件同步',
      actionLabel: '文件同步',
      action: () => router.push({ name: 'sync-files' }),
      emptyText: '暂无同步记录',
      rows: recent.value.recent_uploads.slice(0, 6).map((item) => ({
        key: `sync-${item.file_id}`,
        title: item.original_filename || item.file_id,
        desc: `${clientTypeLabel(item.source_client)} / ${objectTypeLabel(item.object_type)} / ${item.project_uuid || '-'}`,
        time: formatDateTime(item.created_at),
        tone: 'tone-green',
      })),
    })
  }

  sections.push({
    key: 'expiry',
    title: '近期到期明细',
    subtitle: `${summary.value?.expiring.window_days || 30} 天窗口`,
    actionLabel: authStore.isBackOfficeScopeAll ? '授权' : undefined,
    action: authStore.isBackOfficeScopeAll ? () => router.push({ name: 'licenses' }) : undefined,
    emptyText: '暂无近期到期项',
    rows: expiryRows.value,
  })

  return sections
})

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

async function loadAll() {
  loading.value = true
  errorText.value = ''
  try {
    const [summaryResult, recentResult] = await Promise.all([opsApi.summary(), opsApi.recentEvents()])
    summary.value = summaryResult
    recent.value = recentResult
    await loadStorage()
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '控制台数据加载失败'
  } finally {
    loading.value = false
  }
}

function goFailedUploads() {
  if (!authStore.isSuperAdmin) return
  router.push({ name: 'sync-files', query: { upload_status: 'failed' } })
}

function goRisks() {
  if (!authStore.isSuperAdmin) return
  router.push({ name: 'risks' })
}

onMounted(() => {
  loadAll()
  refreshTimer = window.setInterval(() => {
    if (!loading.value) {
      loadAll()
    }
  }, 90_000)
})

onBeforeUnmount(() => {
  window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: var(--layout-padding);
}

.console-hero,
.dashboard-card,
.metric-card {
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-surface);
  box-shadow: 0 8px 20px var(--yy-shadow);
}

.console-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
}

.console-hero__copy {
  min-width: 0;
}

.console-hero__eyebrow,
.console-hero__time,
.section-head span,
.metric-card small,
.event-row span,
.event-row time,
.storage-meta span {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.console-hero h1 {
  margin: 5px 0 4px;
  color: var(--yy-text);
  font-size: 24px;
  line-height: 1.2;
}

.console-hero p {
  margin: 0;
  color: var(--yy-text-secondary);
}

.console-hero__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.metric-grid,
.overview-grid,
.event-grid {
  display: grid;
  gap: 14px;
}

.metric-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.overview-grid {
  grid-template-columns: minmax(0, 1.35fr) minmax(360px, 0.65fr);
}

.event-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.metric-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 12px;
  width: 100%;
  min-height: 128px;
  padding: 16px;
  color: var(--yy-text);
  text-align: left;
}

.metric-card:disabled {
  cursor: default;
}

.metric-card--action {
  cursor: pointer;
}

.metric-card--action:hover {
  border-color: var(--yy-primary);
  transform: translateY(-1px);
}

.metric-card__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--yy-fill);
  font-size: 22px;
}

.metric-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
}

.metric-card__label {
  color: var(--yy-text-secondary);
  font-size: 13px;
}

.metric-card strong {
  overflow-wrap: anywhere;
  font-size: 28px;
  line-height: 1.1;
}

.dashboard-card {
  min-width: 0;
  padding: 16px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.section-head strong {
  font-size: 15px;
}

.expiry-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.expiry-item {
  display: flex;
  min-height: 92px;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-surface-soft);
  color: var(--yy-text);
  cursor: pointer;
  text-align: left;
}

.expiry-item:hover {
  border-color: var(--yy-primary);
}

.expiry-item span {
  color: var(--yy-text-secondary);
  font-size: 13px;
}

.expiry-item strong {
  font-size: 30px;
}

.storage-layout {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}

.storage-chart {
  width: 160px;
  height: 132px;
}

.storage-meta {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.storage-meta strong {
  font-size: 24px;
}

.storage-alert {
  margin-top: 10px;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 10px;
  border-radius: var(--radius-md);
  background: var(--yy-surface-soft);
}

.event-row__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.event-row__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.event-row strong,
.event-row span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tone-blue {
  color: var(--yy-primary);
}

.tone-green {
  color: var(--yy-green);
}

.tone-amber {
  color: var(--yy-amber);
}

.tone-red {
  color: var(--yy-red);
}

@media (max-width: 1280px) {
  .metric-grid,
  .event-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .dashboard-page {
    padding: 12px;
  }

  .console-hero,
  .console-hero__actions {
    align-items: flex-start;
    flex-direction: column;
  }

  .metric-grid,
  .event-grid,
  .expiry-grid {
    grid-template-columns: 1fr;
  }

  .storage-layout {
    grid-template-columns: 1fr;
  }
}
</style>
