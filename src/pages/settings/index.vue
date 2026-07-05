<template>
  <div class="page-shell">
    <PageHeader title="基本设置" subtitle="容量、保留期、最低版本、风险阻断与维护任务">
      <n-space>
        <n-button :loading="loading" @click="loadSettings">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
        <n-button type="primary" :loading="saving" @click="saveSettings">
          <template #icon>
            <n-icon :component="SaveOutline" />
          </template>
          保存
        </n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <div class="settings-grid">
      <div class="page-card">
        <n-spin :show="loading">
          <n-form ref="formRef" :model="form" label-placement="top">
            <div class="section-title">存储与上传</div>
            <n-grid :cols="3" :x-gap="12" responsive="screen">
              <n-grid-item>
                <n-form-item label="容量提醒阈值(GB)">
                  <n-input-number v-model:value="form.storage_soft_limit_gb" :min="1" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="容量警戒阈值(GB)">
                  <n-input-number v-model:value="form.storage_warn_limit_gb" :min="1" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="单文件上限(MB)">
                  <n-input-number v-model:value="form.max_upload_mb" :min="1" />
                </n-form-item>
              </n-grid-item>
            </n-grid>

            <div class="section-title">保留期</div>
            <n-grid :cols="4" :x-gap="12" responsive="screen">
              <n-grid-item>
                <n-form-item label="普通日志(天)">
                  <n-input-number v-model:value="form.log_retention_days" :min="1" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="审计/风险(天)">
                  <n-input-number v-model:value="form.audit_retention_days" :min="1" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="临时文件(小时)">
                  <n-input-number v-model:value="form.tmp_retention_hours" :min="1" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="备份保留(天)">
                  <n-input-number v-model:value="form.backup_retention_days" :min="1" />
                </n-form-item>
              </n-grid-item>
            </n-grid>

            <div class="section-title">客户端策略</div>
            <n-grid :cols="2" :x-gap="12" responsive="screen">
              <n-grid-item>
                <n-form-item label="最低 Mobile 版本">
                  <n-input v-model:value="form.min_mobile_version" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="最低 Win 版本">
                  <n-input v-model:value="form.min_win_version" />
                </n-form-item>
              </n-grid-item>
            </n-grid>

            <div class="section-title">开关</div>
            <div class="switch-grid">
              <label class="switch-row">
                <span>风险阻断</span>
                <n-switch v-model:value="form.risk_block_enabled" />
              </label>
              <label class="switch-row">
                <span>定时任务</span>
                <n-switch v-model:value="form.jobs_enabled" />
              </label>
              <label class="switch-row">
                <span>自动备份</span>
                <n-switch v-model:value="form.backup_enabled" />
              </label>
              <label class="switch-row">
                <span>自动清理</span>
                <n-switch v-model:value="form.cleanup_enabled" />
              </label>
            </div>
          </n-form>
        </n-spin>
      </div>

      <div class="page-card maintenance-panel">
        <div class="section-head">
          <strong>维护操作</strong>
          <span>仅系统管理员</span>
        </div>
        <n-space vertical>
          <n-popconfirm @positive-click="runBackup">
            <template #trigger>
              <n-button type="primary" ghost :loading="backupLoading">
                <template #icon>
                  <n-icon :component="CloudUploadOutline" />
                </template>
                触发备份
              </n-button>
            </template>
            确认立即执行一次数据库备份？
          </n-popconfirm>
          <n-popconfirm @positive-click="runCleanup">
            <template #trigger>
              <n-button type="warning" ghost :loading="cleanupLoading">
                <template #icon>
                  <n-icon :component="TrashOutline" />
                </template>
                触发清理
              </n-button>
            </template>
            确认清理超期临时文件与超期日志？正式文件不会被删除。
          </n-popconfirm>
        </n-space>

        <n-alert class="maintenance-note" type="info" :bordered="false">
          清理不会删除 storage/files 正式文件，也不会删除 client_file 索引。
        </n-alert>

        <n-descriptions v-if="backupResult" class="result-block" title="最近备份" bordered :column="1">
          <n-descriptions-item label="备份文件">{{ backupResult.backup_path }}</n-descriptions-item>
          <n-descriptions-item label="大小">{{ formatBytes(backupResult.size_bytes) }}</n-descriptions-item>
          <n-descriptions-item label="表数量">{{ backupResult.table_count }}</n-descriptions-item>
          <n-descriptions-item label="清理旧备份">{{ backupResult.pruned_backups }}</n-descriptions-item>
          <n-descriptions-item label="时间">{{ formatDateTime(backupResult.created_at) }}</n-descriptions-item>
        </n-descriptions>

        <n-descriptions v-if="cleanupResult" class="result-block" title="最近清理" bordered :column="2">
          <n-descriptions-item label="临时文件">{{ cleanupResult.tmp_files_deleted }}</n-descriptions-item>
          <n-descriptions-item label="临时容量">{{ formatBytes(cleanupResult.tmp_bytes_deleted) }}</n-descriptions-item>
          <n-descriptions-item label="系统日志">{{ cleanupResult.system_logs_deleted }}</n-descriptions-item>
          <n-descriptions-item label="客户端日志">{{ cleanupResult.client_logs_deleted }}</n-descriptions-item>
          <n-descriptions-item label="审计">{{ cleanupResult.audit_logs_deleted }}</n-descriptions-item>
          <n-descriptions-item label="风险">{{ cleanupResult.risk_logs_deleted }}</n-descriptions-item>
          <n-descriptions-item label="服务器时间">{{ cleanupResult.server_time_logs_deleted }}</n-descriptions-item>
          <n-descriptions-item label="时间">{{ formatDateTime(cleanupResult.cleaned_at) }}</n-descriptions-item>
        </n-descriptions>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { CloudUploadOutline, RefreshOutline, SaveOutline, TrashOutline } from '@vicons/ionicons5'
import type { FormInst } from 'naive-ui'
import { useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { opsApi } from '@/api/ops'
import type { MaintenanceBackupResponse, MaintenanceCleanupResponse, SystemSettings } from '@/types/api'
import { formatBytes, formatDateTime } from '@/utils/format'

const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const saving = ref(false)
const backupLoading = ref(false)
const cleanupLoading = ref(false)
const errorText = ref('')
const backupResult = ref<MaintenanceBackupResponse | null>(null)
const cleanupResult = ref<MaintenanceCleanupResponse | null>(null)

const form = reactive<SystemSettings>({
  storage_soft_limit_gb: 20,
  storage_warn_limit_gb: 30,
  max_upload_mb: 300,
  log_retention_days: 180,
  audit_retention_days: 365,
  tmp_retention_hours: 24,
  min_mobile_version: '0.1.28',
  min_win_version: '1.0.0',
  risk_block_enabled: true,
  jobs_enabled: true,
  backup_enabled: true,
  cleanup_enabled: true,
  backup_retention_days: 14,
})

async function loadSettings() {
  loading.value = true
  errorText.value = ''
  try {
    Object.assign(form, await opsApi.settings())
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '系统设置加载失败'
  } finally {
    loading.value = false
  }
}

function validateSettings() {
  if (form.storage_soft_limit_gb > form.storage_warn_limit_gb) {
    message.error('容量提醒阈值不能大于警戒阈值')
    return false
  }
  if (form.audit_retention_days < form.log_retention_days) {
    message.error('审计/风险保留期不能短于普通日志保留期')
    return false
  }
  if (!form.min_mobile_version.trim() || !form.min_win_version.trim()) {
    message.error('最低版本不能为空')
    return false
  }
  return true
}

async function saveSettings() {
  if (!validateSettings()) return
  saving.value = true
  errorText.value = ''
  try {
    Object.assign(form, await opsApi.updateSettings({ ...form }))
    message.success('系统设置已保存')
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '系统设置保存失败'
  } finally {
    saving.value = false
  }
}

async function runBackup() {
  backupLoading.value = true
  errorText.value = ''
  try {
    backupResult.value = await opsApi.backup()
    message.success('数据库备份已完成')
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '数据库备份失败'
  } finally {
    backupLoading.value = false
  }
}

async function runCleanup() {
  cleanupLoading.value = true
  errorText.value = ''
  try {
    cleanupResult.value = await opsApi.cleanup()
    message.success('维护清理已完成')
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '维护清理失败'
  } finally {
    cleanupLoading.value = false
  }
}

onMounted(loadSettings)
</script>

<style scoped>
.settings-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 420px;
  gap: 14px;
}

.section-title {
  margin: 4px 0 12px;
  font-size: 14px;
  font-weight: 700;
}

.section-title:not(:first-child) {
  margin-top: 16px;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-fill);
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-head span {
  color: var(--yy-text-muted);
  font-size: 12px;
}

.maintenance-panel {
  align-self: start;
}

.maintenance-note,
.result-block {
  margin-top: 16px;
}

@media (max-width: 1180px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .switch-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .switch-grid {
    grid-template-columns: 1fr;
  }
}
</style>
