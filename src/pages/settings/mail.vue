<template>
  <div class="page-shell mail-page">
    <PageHeader title="邮件系统" subtitle="系统 SMTP 发信配置、测试发送与投递监控">
      <n-space>
        <n-button :loading="loading" @click="loadAll">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
        <n-button type="primary" :loading="saving" @click="saveSettings">
          <template #icon>
            <n-icon :component="SaveOutline" />
          </template>
          保存配置
        </n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <div class="mail-grid">
      <section class="page-card config-panel">
        <n-spin :show="loading">
          <div class="section-head">
            <strong>SMTP 配置</strong>
            <n-tag :type="form.enabled ? 'success' : 'default'" round>{{ form.enabled ? '已启用' : '未启用' }}</n-tag>
          </div>
          <n-form ref="formRef" :model="form" label-placement="top">
            <div class="switch-row">
              <span>启用系统发信</span>
              <n-switch v-model:value="form.enabled" />
            </div>

            <n-grid :cols="3" :x-gap="12" :y-gap="4" responsive="screen">
              <n-grid-item span="2">
                <n-form-item label="SMTP Host">
                  <n-input v-model:value="form.smtp_host" clearable placeholder="smtp.example.com" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="Port">
                  <n-input-number v-model:value="form.smtp_port" :min="1" :max="65535" class="full-input" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="Secure mode">
                  <n-select v-model:value="form.smtp_secure_mode" :options="secureOptions" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="Username">
                  <n-input v-model:value="form.smtp_username" clearable autocomplete="off" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="Password">
                  <n-input
                    v-model:value="form.smtp_password"
                    type="password"
                    show-password-on="click"
                    autocomplete="new-password"
                    :placeholder="passwordPlaceholder"
                  />
                </n-form-item>
              </n-grid-item>
            </n-grid>

            <n-grid :cols="3" :x-gap="12" :y-gap="4" responsive="screen">
              <n-grid-item>
                <n-form-item label="From address">
                  <n-input v-model:value="form.from_address" clearable placeholder="no-reply@example.com" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="From name">
                  <n-input v-model:value="form.from_name" clearable placeholder="垚无忧土工数据管理系统" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="Reply-To">
                  <n-input v-model:value="form.reply_to" clearable placeholder="support@example.com" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="Timeout seconds">
                  <n-input-number v-model:value="form.timeout_seconds" :min="1" :max="120" class="full-input" />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </n-form>
        </n-spin>
      </section>

      <aside class="side-stack">
        <section class="page-card">
          <div class="section-head">
            <strong>测试发送</strong>
            <n-tag :type="statusType(settings?.last_test_status)" round>{{ statusLabel(settings?.last_test_status || '') }}</n-tag>
          </div>
          <n-space vertical>
            <n-input v-model:value="testRecipient" clearable placeholder="测试收件邮箱" @keyup.enter="sendTestMail" />
            <n-button type="primary" ghost block :loading="testing" @click="sendTestMail">
              <template #icon>
                <n-icon :component="SendOutline" />
              </template>
              发送测试邮件
            </n-button>
            <n-descriptions :column="1" bordered size="small">
              <n-descriptions-item label="最近状态">{{ statusLabel(settings?.last_test_status || '') }}</n-descriptions-item>
              <n-descriptions-item label="最近时间">{{ formatDateTime(settings?.last_test_at) }}</n-descriptions-item>
              <n-descriptions-item label="错误摘要">{{ settings?.last_test_error || '-' }}</n-descriptions-item>
            </n-descriptions>
          </n-space>
        </section>

        <section class="page-card">
          <div class="section-head">
            <strong>最近 24h</strong>
            <span class="muted">{{ formatDateTime(summary.since) }}</span>
          </div>
          <div class="summary-grid">
            <div class="summary-item success">
              <span>成功</span>
              <strong>{{ summary.sent }}</strong>
            </div>
            <div class="summary-item danger">
              <span>失败</span>
              <strong>{{ summary.failed }}</strong>
            </div>
            <div class="summary-item neutral">
              <span>跳过</span>
              <strong>{{ summary.skipped }}</strong>
            </div>
            <div class="summary-item pending">
              <span>待处理</span>
              <strong>{{ summary.pending }}</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <section class="page-card">
      <div class="toolbar mail-toolbar">
        <n-select v-model:value="filters.status" clearable :options="statusOptions" placeholder="状态" class="filter-select" />
        <n-select v-model:value="filters.event_type" clearable :options="eventOptions" placeholder="事件类型" class="filter-select wide" />
        <n-input v-model:value="filters.keyword" clearable placeholder="收件人 / 主题 / 错误摘要" class="keyword-input" @keyup.enter="fetchDeliveries" />
        <n-date-picker v-model:value="dateRange" type="datetimerange" clearable class="date-input" />
        <div class="toolbar__spacer" />
        <n-button @click="fetchDeliveries">查询</n-button>
        <n-button quaternary @click="resetFilters">重置</n-button>
      </div>

      <n-data-table
        remote
        :columns="columns"
        :data="deliveries"
        :loading="deliveryLoading"
        :pagination="pagination"
        :row-key="(row: MailDeliveryLog) => row.id"
        :scroll-x="980"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, FormInst, PaginationProps } from 'naive-ui'
import { NTag, useMessage } from 'naive-ui'
import { RefreshOutline, SaveOutline, SendOutline } from '@vicons/ionicons5'
import PageHeader from '@/components/PageHeader.vue'
import { mailApi } from '@/api/mail'
import type {
  MailDeliveryListParams,
  MailDeliveryLog,
  MailDeliveryStatus,
  MailEventType,
  MailSecureMode,
  MailSettings,
} from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { queryValue } from '@/utils/query'

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const deliveryLoading = ref(false)
const errorText = ref('')
const settings = ref<MailSettings | null>(null)
const testRecipient = ref('')
const deliveries = ref<MailDeliveryLog[]>([])
const dateRange = ref<[number, number] | null>(null)

const form = reactive({
  enabled: false,
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_secure_mode: 'starttls' as MailSecureMode,
  from_address: '',
  from_name: '垚无忧土工数据管理系统',
  reply_to: '',
  timeout_seconds: 10,
})

const filters = reactive({
  status: null as MailDeliveryStatus | null,
  event_type: null as MailEventType | null,
  keyword: '',
})

const summary = reactive({
  since: '',
  sent: 0,
  failed: 0,
  skipped: 0,
  pending: 0,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const secureOptions: Array<{ label: string; value: MailSecureMode }> = [
  { label: 'STARTTLS', value: 'starttls' },
  { label: 'TLS', value: 'tls' },
  { label: 'None', value: 'none' },
]

const statusOptions: Array<{ label: string; value: MailDeliveryStatus }> = [
  { label: '成功', value: 'sent' },
  { label: '失败', value: 'failed' },
  { label: '跳过', value: 'skipped' },
  { label: '待处理', value: 'pending' },
]

const eventOptions: Array<{ label: string; value: MailEventType }> = [
  { label: '申请已提交', value: 'registration_submitted' },
  { label: '申请已通过', value: 'registration_approved' },
  { label: '申请未通过', value: 'registration_rejected' },
  { label: '测试邮件', value: 'test' },
]

const passwordPlaceholder = computed(() => (settings.value?.has_password ? '已配置，不回显；留空表示不修改' : '留空表示不配置密码'))

const columns: DataTableColumns<MailDeliveryLog> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  { title: '事件类型', key: 'event_type', width: 140, render: (row) => eventLabel(row.event_type) },
  { title: '收件人', key: 'recipient_masked', width: 150 },
  { title: '主题', key: 'subject', minWidth: 220, ellipsis: { tooltip: true } },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: statusType(row.status), round: true }, { default: () => statusLabel(row.status) }),
  },
  { title: '错误摘要', key: 'error_message', minWidth: 220, ellipsis: { tooltip: true }, render: (row) => row.error_message || '-' },
  { title: '关联申请 ID', key: 'related_application_id', width: 130, render: (row) => row.related_application_id || '-' },
]

function applySettings(data: MailSettings) {
  settings.value = data
  form.enabled = data.enabled
  form.smtp_host = data.smtp_host || ''
  form.smtp_port = data.smtp_port || 587
  form.smtp_username = data.smtp_username || ''
  form.smtp_password = ''
  form.smtp_secure_mode = (data.smtp_secure_mode || 'starttls') as MailSecureMode
  form.from_address = data.from_address || ''
  form.from_name = data.from_name || '垚无忧土工数据管理系统'
  form.reply_to = data.reply_to || ''
  form.timeout_seconds = data.timeout_seconds || 10
}

function validateSettings() {
  if (form.enabled && (!form.smtp_host.trim() || !form.from_address.trim())) {
    message.error('启用邮件前需要填写 SMTP Host 和 From address')
    return false
  }
  if (form.smtp_port < 1 || form.smtp_port > 65535) {
    message.error('SMTP Port 必须在 1-65535 之间')
    return false
  }
  if (form.timeout_seconds < 1 || form.timeout_seconds > 120) {
    message.error('Timeout seconds 必须在 1-120 之间')
    return false
  }
  return true
}

async function loadSettings() {
  loading.value = true
  errorText.value = ''
  try {
    applySettings(await mailApi.settings())
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '邮件配置加载失败'
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!validateSettings()) return
  await formRef.value?.validate()
  saving.value = true
  errorText.value = ''
  try {
    const payload = {
      enabled: form.enabled,
      smtp_host: form.smtp_host.trim(),
      smtp_port: form.smtp_port,
      smtp_username: form.smtp_username.trim(),
      smtp_secure_mode: form.smtp_secure_mode,
      from_address: form.from_address.trim(),
      from_name: form.from_name.trim(),
      reply_to: form.reply_to.trim(),
      timeout_seconds: form.timeout_seconds,
      ...(form.smtp_password.trim() ? { smtp_password: form.smtp_password.trim() } : {}),
    }
    applySettings(await mailApi.updateSettings(payload))
    message.success('邮件配置已保存')
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '邮件配置保存失败'
  } finally {
    saving.value = false
  }
}

async function sendTestMail() {
  if (!testRecipient.value.trim()) {
    message.error('请输入测试收件邮箱')
    return
  }
  testing.value = true
  errorText.value = ''
  try {
    const result = await mailApi.test(testRecipient.value.trim())
    if (result.status === 'sent') {
      message.success('测试邮件已发送')
    } else {
      message.warning(`测试邮件${statusLabel(result.status)}`)
    }
    await Promise.all([loadSettings(), fetchDeliveries()])
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '测试邮件发送失败'
  } finally {
    testing.value = false
  }
}

function deliveryParams(): MailDeliveryListParams {
  return {
    page: pagination.page,
    page_size: pagination.pageSize,
    status: queryValue(filters.status) as MailDeliveryStatus | '',
    event_type: queryValue(filters.event_type) as MailEventType | '',
    keyword: queryValue(filters.keyword),
    start_at: dateRange.value?.[0] ? new Date(dateRange.value[0]).toISOString() : null,
    end_at: dateRange.value?.[1] ? new Date(dateRange.value[1]).toISOString() : null,
  }
}

async function fetchDeliveries() {
  deliveryLoading.value = true
  try {
    const result = await mailApi.deliveries(deliveryParams())
    deliveries.value = result.list || []
    pagination.itemCount = result.total
    Object.assign(summary, result.summary_24h || { since: '', sent: 0, failed: 0, skipped: 0, pending: 0 })
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '邮件记录加载失败'
  } finally {
    deliveryLoading.value = false
  }
}

async function loadAll() {
  await Promise.all([loadSettings(), fetchDeliveries()])
}

function resetFilters() {
  filters.status = null
  filters.event_type = null
  filters.keyword = ''
  dateRange.value = null
  pagination.page = 1
  fetchDeliveries()
}

function handlePage(page: number) {
  pagination.page = page
  fetchDeliveries()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchDeliveries()
}

function statusLabel(status?: string) {
  return statusOptions.find((item) => item.value === status)?.label || (status ? status : '-')
}

function statusType(status?: string) {
  if (status === 'sent') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'skipped') return 'warning'
  if (status === 'pending') return 'info'
  return 'default'
}

function eventLabel(eventType?: string) {
  return eventOptions.find((item) => item.value === eventType)?.label || eventType || '-'
}

onMounted(loadAll)
</script>

<style scoped>
.mail-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 14px;
}

.config-panel {
  min-width: 0;
}

.side-stack {
  display: grid;
  gap: 14px;
  align-self: start;
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

.muted {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 10px 12px;
  margin-bottom: 14px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-fill);
}

.full-input {
  width: 100%;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 72px;
  padding: 12px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-fill);
}

.summary-item span {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.summary-item strong {
  font-size: 24px;
  line-height: 1;
}

.summary-item.success strong {
  color: #15803d;
}

.summary-item.danger strong {
  color: #b91c1c;
}

.summary-item.neutral strong {
  color: #6b7280;
}

.summary-item.pending strong {
  color: #2563eb;
}

.mail-toolbar {
  margin-bottom: 14px;
}

.filter-select {
  width: 130px;
}

.filter-select.wide {
  width: 160px;
}

.keyword-input {
  width: 260px;
}

.date-input {
  width: 360px;
}

@media (max-width: 1180px) {
  .mail-grid {
    grid-template-columns: 1fr;
  }

  .side-stack {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .mail-page :deep(.page-header) {
    align-items: stretch;
    flex-direction: column;
  }

  .side-stack,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .filter-select,
  .filter-select.wide,
  .keyword-input,
  .date-input {
    width: 100%;
  }
}
</style>
