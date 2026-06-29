<template>
  <div class="page-shell">
    <PageHeader title="系统控制台" :subtitle="scopeText">
      <n-button :loading="loading" @click="loadAll">
        <template #icon>
          <n-icon :component="RefreshOutline" />
        </template>
        刷新
      </n-button>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <n-spin :show="loading && !summary">
      <div v-if="summary" class="dashboard-grid">
        <StatCard label="服务状态" :value="serviceStatusText" :accent="serviceAccent">
          DB {{ summary.service_status.database }} / Redis {{ summary.service_status.redis }} / Storage {{ summary.service_status.storage }}
        </StatCard>
        <StatCard label="企业 / 用户" :value="`${summary.active_company_count} / ${summary.user_count}`" accent="#2f855a">
          活跃会话 {{ summary.active_session_count }}，设备 {{ summary.device_count }}
        </StatCard>
        <button class="stat-action" type="button" @click="goFailedUploads">
          <StatCard label="今日上传 / 失败" :value="`${summary.today_upload_count} / ${summary.today_failed_count}`" :accent="summary.today_failed_count ? '#c2410c' : '#1f4e79'">
            查看失败上传
          </StatCard>
        </button>
        <button v-if="authStore.isSystemAdmin" class="stat-action" type="button" @click="goRisks">
          <StatCard label="未处理高风险" :value="summary.high_risk_count" :accent="summary.high_risk_count ? '#c53030' : '#2f855a'">
            查看风险事件
          </StatCard>
        </button>
        <StatCard v-else label="本企业高风险" :value="summary.high_risk_count" :accent="summary.high_risk_count ? '#c53030' : '#2f855a'">
          按企业范围统计
        </StatCard>
      </div>
    </n-spin>

    <div v-if="summary" class="page-grid-2">
      <div class="page-card">
        <div class="section-head">
          <strong>到期提醒</strong>
          <span>{{ summary.expiring.window_days }} 天内</span>
        </div>
        <div class="expiry-grid">
          <button v-if="authStore.isSystemAdmin" class="expiry-item" type="button" @click="router.push({ name: 'companies' })">
            <span>企业</span>
            <strong>{{ summary.expiring.company_count }}</strong>
          </button>
          <button v-if="authStore.isSystemAdmin" class="expiry-item" type="button" @click="router.push({ name: 'licenses' })">
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

      <div v-if="authStore.isSystemAdmin" class="page-card">
        <div class="section-head">
          <strong>存储容量</strong>
          <span>{{ storage?.provider || 'local' }}</span>
        </div>
        <template v-if="storage">
          <div class="storage-line">
            <strong>{{ formatBytes(storage.used_bytes) }}</strong>
            <span>soft {{ storage.soft_limit_gb }}G / warn {{ storage.warn_limit_gb }}G</span>
          </div>
          <n-progress type="line" :percentage="storagePercent" :status="storageProgressStatus" :height="12" :border-radius="4" />
          <n-alert class="storage-alert" :type="storageAlertType" :bordered="false">
            {{ storageAdvice }}
          </n-alert>
        </template>
        <n-empty v-else description="容量统计暂不可用" />
      </div>
    </div>

    <div v-if="recent" class="recent-grid">
      <div class="page-card">
        <div class="section-head">
          <strong>最近失败上传</strong>
          <n-button text size="small" @click="goFailedUploads">全部</n-button>
        </div>
        <n-list v-if="recent.failed_uploads.length" hoverable>
          <n-list-item v-for="item in recent.failed_uploads" :key="item.file_id">
            <div class="event-row">
              <strong>{{ item.original_filename || item.file_id }}</strong>
              <span>{{ objectTypeLabel(item.object_type) }} / {{ item.parse_message || 'upload failed' }}</span>
              <small>{{ formatDateTime(item.created_at) }}</small>
            </div>
          </n-list-item>
        </n-list>
        <n-empty v-else description="暂无失败上传" />
      </div>

      <div v-if="authStore.isSystemAdmin" class="page-card">
        <div class="section-head">
          <strong>最近高风险</strong>
          <n-button text size="small" @click="goRisks">全部</n-button>
        </div>
        <n-list v-if="recent.high_risks.length" hoverable>
          <n-list-item v-for="item in recent.high_risks" :key="item.id">
            <div class="event-row">
              <strong>{{ item.risk_type }}</strong>
              <span>{{ riskLevelLabel(item.risk_level) }} / 企业 {{ item.company_id ?? '-' }} / 用户 {{ item.user_id ?? '-' }}</span>
              <small>{{ formatDateTime(item.created_at) }}</small>
            </div>
          </n-list-item>
        </n-list>
        <n-empty v-else description="暂无高风险事件" />
      </div>

      <div class="page-card">
        <div class="section-head">
          <strong>最近同步</strong>
          <n-button text size="small" @click="router.push({ name: 'sync-files' })">全部</n-button>
        </div>
        <n-list v-if="recent.recent_uploads.length" hoverable>
          <n-list-item v-for="item in recent.recent_uploads" :key="item.file_id">
            <div class="event-row">
              <strong>{{ item.original_filename || item.file_id }}</strong>
              <span>{{ clientTypeLabel(item.source_client) }} / {{ objectTypeLabel(item.object_type) }} / {{ item.project_uuid || '-' }}</span>
              <small>{{ formatDateTime(item.created_at) }}</small>
            </div>
          </n-list-item>
        </n-list>
        <n-empty v-else description="暂无同步记录" />
      </div>

      <div class="page-card">
        <div class="section-head">
          <strong>近期到期明细</strong>
          <n-button v-if="authStore.isSystemAdmin" text size="small" @click="router.push({ name: 'licenses' })">授权</n-button>
        </div>
        <n-list v-if="expiryRows.length" hoverable>
          <n-list-item v-for="item in expiryRows" :key="item.key">
            <div class="event-row">
              <strong>{{ item.title }}</strong>
              <span>{{ item.desc }}</span>
              <small>{{ item.time }}</small>
            </div>
          </n-list-item>
        </n-list>
        <n-empty v-else description="暂无近期到期项" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RefreshOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { opsApi } from '@/api/ops'
import { useAuthStore } from '@/stores/auth'
import type { DashboardRecentEvents, DashboardStorage, DashboardSummary } from '@/types/api'
import { formatBytes, formatDateTime } from '@/utils/format'
import { clientTypeLabel, objectTypeLabel, riskLevelLabel, roleLabel } from '@/utils/labels'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const errorText = ref('')
const summary = ref<DashboardSummary | null>(null)
const storage = ref<DashboardStorage | null>(null)
const recent = ref<DashboardRecentEvents | null>(null)
let refreshTimer = 0

const scopeText = computed(() => {
  if (!summary.value) return `${roleLabel(authStore.roleCode)} / ${authStore.companyName || '全平台'}`
  return summary.value.scope === 'company' ? `${authStore.companyName || '本企业'} 摘要` : '全平台运营摘要'
})

const serviceStatusText = computed(() => (summary.value?.service_status.overall === 'ok' ? '正常' : '降级'))
const serviceAccent = computed(() => (summary.value?.service_status.overall === 'ok' ? '#2f855a' : '#c53030'))

const storagePercent = computed(() => {
  if (!storage.value || storage.value.warn_limit_gb <= 0) return 0
  return Math.min(100, Math.round((storage.value.used_gb / storage.value.warn_limit_gb) * 100))
})

const storageProgressStatus = computed(() => {
  if (storage.value?.status === 'warn') return 'error'
  if (storage.value?.status === 'soft') return 'warning'
  return 'success'
})

const storageAlertType = computed(() => {
  if (storage.value?.status === 'warn') return 'error'
  if (storage.value?.status === 'soft') return 'warning'
  return 'success'
})

const storageAdvice = computed(() => {
  if (!storage.value) return ''
  if (storage.value.status === 'warn') return '容量已达到警戒线，非必要大文件上传会被限制，请尽快清理临时文件、超期日志或扩容。'
  if (storage.value.status === 'soft') return '容量进入提醒区间，建议清理临时文件、超期日志并评估旧项目包归档。'
  return '容量处于正常区间。'
})

const expiryRows = computed(() => {
  if (!recent.value) return []
  const rows: Array<{ key: string; title: string; desc: string; time: string }> = []
  recent.value.expiring_companies.forEach((item) => {
    rows.push({ key: `company-${item.id}`, title: item.company_name, desc: '企业有效期即将到期', time: formatDateTime(item.valid_until) })
  })
  recent.value.expiring_licenses.forEach((item) => {
    rows.push({ key: `license-${item.id}`, title: item.username || `用户 ${item.user_id ?? '-'}`, desc: `${clientTypeLabel(item.client_type)} 授权 / ${item.product_scope}`, time: formatDateTime(item.valid_until) })
  })
  recent.value.expiring_users.forEach((item) => {
    const expiresAt = item.trial_expires_at || item.temporary_expires_at
    rows.push({ key: `user-${item.id}`, title: item.username, desc: roleLabel(item.role_code), time: formatDateTime(expiresAt) })
  })
  return rows.slice(0, 12)
})

async function loadAll() {
  loading.value = true
  errorText.value = ''
  try {
    const [summaryResult, recentResult] = await Promise.all([opsApi.summary(), opsApi.recentEvents()])
    summary.value = summaryResult
    recent.value = recentResult
    storage.value = authStore.isSystemAdmin ? await opsApi.storage() : null
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '控制台数据加载失败'
  } finally {
    loading.value = false
  }
}

function goFailedUploads() {
  router.push({ name: 'sync-files', query: { upload_status: 'failed' } })
}

function goRisks() {
  if (!authStore.isSystemAdmin) return
  router.push({ name: 'risks' })
}

onMounted(() => {
  loadAll()
  refreshTimer = window.setInterval(loadAll, 60_000)
})

onBeforeUnmount(() => {
  window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.dashboard-grid,
.recent-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.recent-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stat-action {
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.stat-action:hover :deep(.stat-card) {
  border-color: var(--yy-primary);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head strong {
  font-size: 15px;
}

.section-head span {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.expiry-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.expiry-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 86px;
  padding: 14px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: #fff;
  color: var(--yy-text);
  cursor: pointer;
  text-align: left;
}

.expiry-item:hover {
  border-color: var(--yy-primary);
  background: #f8fafc;
}

.expiry-item span {
  color: var(--yy-text-secondary);
  font-size: 13px;
}

.expiry-item strong {
  font-size: 30px;
}

.storage-line {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.storage-line strong {
  font-size: 26px;
}

.storage-line span {
  color: var(--yy-text-muted);
  font-family: var(--font-mono);
  font-size: 12px;
}

.storage-alert {
  margin-top: 12px;
}

.event-row {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.event-row strong,
.event-row span,
.event-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-row span,
.event-row small {
  color: var(--yy-text-muted);
  font-size: 12px;
}

@media (max-width: 1280px) {
  .dashboard-grid,
  .recent-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .expiry-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dashboard-grid,
  .recent-grid,
  .expiry-grid {
    grid-template-columns: 1fr;
  }
}
</style>
