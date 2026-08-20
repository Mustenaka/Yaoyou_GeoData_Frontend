<template>
  <div class="page-shell">
    <PageHeader
      title="协作设置"
      subtitle="按企业开启多人协作，并指定这家企业的设备连到哪一台协作服务器。设备登录时随策略下发。"
    >
      <n-space>
        <n-button :loading="loading" @click="reload">
          <template #icon><n-icon :component="RefreshOutline" /></template>
          刷新
        </n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      <div class="error-line">
        <span>{{ errorText }}</span>
        <n-button size="small" text type="primary" @click="reload">重试</n-button>
      </div>
    </n-alert>

    <!-- 没有可用服务器时，这一页做什么都没意义：先把人送去登记。 -->
    <n-alert v-if="!loading && servingServers.length === 0" type="warning">
      <template #header>还没有可用的协作服务器</template>
      先在「协作服务器」页登记一台并等它上线，然后回到这里为企业选定。
      <n-button size="small" text type="primary" @click="goServers">前往登记 →</n-button>
    </n-alert>

    <div class="glass-panel panel">
      <div class="panel__head">
        <div class="panel__title">选择企业</div>
        <n-select
          v-model:value="companyId"
          :options="companyOptions"
          :loading="loadingCompanies"
          filterable
          clearable
          placeholder="搜索并选择一家企业"
          class="company-select"
          @update:value="loadSetting"
        />
      </div>

      <n-empty v-if="!companyId" description="选择一家企业后即可配置它的协作能力" class="empty-block" />

      <n-spin v-else :show="loading">
        <n-form label-placement="left" :label-width="140" class="setting-form">
          <n-form-item label="开启多人协作">
            <div class="switch-row">
              <n-switch v-model:value="form.collab_enabled" />
              <n-text depth="3">
                关闭后，这家企业的设备不会收到协作配置，App 里显示「企业未开启多人协作」。
              </n-text>
            </div>
          </n-form-item>

          <n-form-item label="协作服务器">
            <div class="server-row">
              <n-select
                v-model:value="form.server_id"
                :options="serverOptions"
                clearable
                placeholder="选择一台正在服务的协作服务器"
                :disabled="!form.collab_enabled"
              />
              <n-text v-if="selectedServer" depth="3" class="server-hint">
                设备将连接：<code>{{ selectedServer.base_url }}</code>
                <span v-if="!isSecure(selectedServer.base_url)" class="insecure">（明文 HTTP，链路不加密）</span>
              </n-text>
              <n-text v-else-if="form.collab_enabled" depth="3" class="server-hint">
                不选服务器的话，设备会显示「企业尚未选定协作服务器」。
              </n-text>
            </div>
          </n-form-item>

          <n-divider />

          <!-- 配额是给管理员兜底用的，不是给企业调的。写清楚每一项真正限制什么，
               否则填的人只能靠猜。 -->
          <n-form-item label="单项目最多设备">
            <n-input-number v-model:value="form.max_devices_per_project" :min="1" :max="200" class="num" />
            <n-text depth="3" class="num-hint">同一个项目最多允许几台设备同时协作。</n-text>
          </n-form-item>

          <n-form-item label="单项目最多行数">
            <n-input-number v-model:value="form.max_rows_per_project" :min="100" :max="500000" :step="1000" class="num" />
            <n-text depth="3" class="num-hint">超过后转为全量对账，不会丢数据。</n-text>
          </n-form-item>

          <n-form-item label="每秒操作上限">
            <n-input-number v-model:value="form.max_ops_per_sec" :min="1" :max="200" class="num" />
            <n-text depth="3" class="num-hint">单台设备每秒最多提交多少次改动。天平约 1 次/秒，扫码枪会成串到达。</n-text>
          </n-form-item>

          <n-form-item :label="' '">
            <n-space>
              <n-button type="primary" :loading="saving" :disabled="!dirty" @click="save">保存</n-button>
              <n-button :disabled="!dirty || saving" @click="resetForm">撤销修改</n-button>
              <n-text v-if="!dirty" depth="3">没有未保存的修改</n-text>
            </n-space>
          </n-form-item>
        </n-form>
      </n-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { NText, useMessage, type SelectOption } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import { collabApi, type CollabServer, type CollabSettingPayload } from '@/api/collab'
import { companyApi } from '@/api/company'

const message = useMessage()
const router = useRouter()

const loading = ref(false)
const loadingCompanies = ref(false)
const saving = ref(false)
const errorText = ref('')
const companyId = ref<number | null>(null)
const companyOptions = ref<SelectOption[]>([])
const servers = ref<CollabServer[]>([])

const emptyForm = () => ({
  collab_enabled: false,
  server_id: null as number | null,
  max_devices_per_project: 12,
  max_rows_per_project: 50000,
  max_ops_per_sec: 20,
})
const form = reactive(emptyForm())
// 用来判断是否有未保存的修改。没有它，「保存」按钮永远可点，
// 人就分不清自己改没改过。
const saved = ref(JSON.stringify(emptyForm()))

// 只列出真的能服务的服务器。把 pending / revoked 的也放进来，
// 等于让人选一台注定连不上的机器。
const servingServers = computed(() => servers.value.filter((row) => row.status === 'active'))

const serverOptions = computed<SelectOption[]>(() =>
  servingServers.value.map((row) => ({
    label: `${row.name}（${row.base_url}）`,
    value: row.id,
  })),
)

const selectedServer = computed(() =>
  servers.value.find((row) => row.id === form.server_id) ?? null,
)

const dirty = computed(() => JSON.stringify({ ...form }) !== saved.value)

function isSecure(url: string) {
  return /^https:/i.test(url || '')
}

function goServers() {
  void router.push({ name: 'mobile-collab-servers' })
}

function resetForm() {
  Object.assign(form, JSON.parse(saved.value))
}

async function loadCompanies() {
  loadingCompanies.value = true
  try {
    const page = await companyApi.list({ page: 1, page_size: 200 })
    companyOptions.value = (page?.list ?? []).map((company) => ({
      label: company.company_name,
      value: company.id,
    }))
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载企业列表失败'
  } finally {
    loadingCompanies.value = false
  }
}

async function loadServers() {
  try {
    servers.value = (await collabApi.listServers()) ?? []
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载协作服务器失败'
  }
}

async function loadSetting(id: number | null) {
  if (!id) {
    Object.assign(form, emptyForm())
    saved.value = JSON.stringify(emptyForm())
    return
  }
  loading.value = true
  errorText.value = ''
  try {
    const setting = await collabApi.companySetting(id)
    const next = {
      collab_enabled: Boolean(setting?.collab_enabled),
      server_id: setting?.server_id ?? null,
      max_devices_per_project: setting?.max_devices_per_project || 12,
      max_rows_per_project: setting?.max_rows_per_project || 50000,
      max_ops_per_sec: setting?.max_ops_per_sec || 20,
    }
    Object.assign(form, next)
    saved.value = JSON.stringify({ ...form })
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载企业协作设置失败'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (!companyId.value) return
  // 开了协作却不选服务器，设备侧只会得到一句「尚未选定协作服务器」。
  // 在这里拦住，比让人到手机上才发现要好。
  if (form.collab_enabled && !form.server_id) {
    message.warning('开启协作后必须选择一台协作服务器，否则设备拿不到可连的地址。')
    return
  }
  saving.value = true
  try {
    const payload: CollabSettingPayload = {
      collab_enabled: form.collab_enabled,
      server_id: form.server_id,
      max_devices_per_project: form.max_devices_per_project,
      max_rows_per_project: form.max_rows_per_project,
      max_ops_per_sec: form.max_ops_per_sec,
    }
    await collabApi.updateCompanySetting(companyId.value, payload)
    saved.value = JSON.stringify({ ...form })
    message.success('已保存。该企业的设备下次登录时会收到新配置。')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

async function reload() {
  // 每次重新加载都先清掉旧错误。不清的话，第一次失败留下的红条会一直挂在
  // 页面上，哪怕重试已经成功——人会以为还是坏的。
  errorText.value = ''
  await Promise.all([loadCompanies(), loadServers()])
  await loadSetting(companyId.value)
}

onMounted(() => {
  void reload()
})
</script>

<style scoped>
.panel {
  padding: 20px;
}
.panel__head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 18px;
}
.panel__title {
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}
.company-select {
  max-width: 380px;
}
.empty-block {
  padding: 40px 0;
}
.setting-form {
  max-width: 720px;
}
.switch-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.server-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.server-hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.insecure {
  color: var(--yy-tone-amber, #d98324);
}
.num {
  width: 200px;
}
.num-hint {
  margin-left: 12px;
  font-size: 12px;
}
.error-line {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}
</style>
