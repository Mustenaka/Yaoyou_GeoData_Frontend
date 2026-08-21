<template>
  <div class="page-shell">
    <PageHeader
      title="协作设置"
      subtitle="每家企业的协作开启情况一目了然；点「编辑」为企业开启协作并指定协作服务器，设备登录时随策略下发。"
    >
      <n-space>
        <n-input
          v-model:value="keyword"
          clearable
          placeholder="搜索企业名称"
          style="width: 220px"
          @keyup.enter="reload"
          @clear="reload"
        />
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
      先在「协作服务器」页登记一台并等它上线，然后回到这里为企业开启。
      <n-button size="small" text type="primary" @click="goServers">前往登记 →</n-button>
    </n-alert>

    <div class="glass-panel panel">
      <n-data-table
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="false"
        :row-key="(row: CollabCompanySettingRow) => row.company_id"
      />
      <div class="pager">
        <n-pagination
          v-model:page="page"
          :page-size="pageSize"
          :item-count="total"
          @update:page="load"
        />
      </div>
    </div>

    <!-- 行内编辑。表单与原页一致；企业从行里来，不再让人先去选。 -->
    <n-modal
      v-model:show="editorOpen"
      preset="card"
      :title="editing ? `协作设置 · ${editing.company_name}` : '协作设置'"
      style="width: 560px"
      :mask-closable="!saving"
    >
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
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button :disabled="saving" @click="editorOpen = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="save">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import { NButton, NTag, NText, useMessage, type DataTableColumns, type SelectOption } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'
import {
  collabApi,
  type CollabCompanySettingRow,
  type CollabServer,
  type CollabSettingPayload,
} from '@/api/collab'

const message = useMessage()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const errorText = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = 20
const total = ref(0)
const rows = ref<CollabCompanySettingRow[]>([])
const servers = ref<CollabServer[]>([])

const editorOpen = ref(false)
const editing = ref<CollabCompanySettingRow | null>(null)
const form = reactive({
  collab_enabled: false,
  server_id: null as number | null,
  max_devices_per_project: 12,
  max_rows_per_project: 50000,
  max_ops_per_sec: 20,
})

// 只列出真的能服务的服务器。把 pending / revoked 的也放进来，
// 等于让人选一台注定连不上的机器。
const servingServers = computed(() => servers.value.filter((row) => row.status === 'active'))

const serverOptions = computed<SelectOption[]>(() =>
  servingServers.value.map((row) => ({
    label: `${row.name}（${row.base_url}）`,
    value: row.id,
  })),
)

const selectedServer = computed(() => servers.value.find((row) => row.id === form.server_id) ?? null)

function isSecure(url: string) {
  return /^https:/i.test(url || '')
}

function goServers() {
  void router.push({ name: 'mobile-collab-servers' })
}

const columns = computed<DataTableColumns<CollabCompanySettingRow>>(() => [
  {
    title: '企业',
    key: 'company_name',
    render: (row) =>
      h('div', [
        h('span', row.company_name),
        row.company_status === 0
          ? h(NTag, { size: 'small', type: 'error', style: 'margin-left:8px' }, () => '已停用')
          : null,
      ]),
  },
  {
    title: '协作',
    key: 'collab_enabled',
    width: 110,
    render: (row) => {
      if (row.collab_enabled) return h(NTag, { size: 'small', type: 'success' }, () => '已开启')
      // 「显式关」与「从未配置」要能分开看：前者是决定，后者是空白。
      return row.configured
        ? h(NTag, { size: 'small' }, () => '已关闭')
        : h(NText, { depth: 3 }, () => '未配置')
    },
  },
  {
    title: '协作服务器',
    key: 'server_name',
    render: (row) => {
      if (!row.server_id) {
        return row.collab_enabled
          ? h(NText, { type: 'warning' }, () => '未选定（设备连不上）')
          : h(NText, { depth: 3 }, () => '—')
      }
      const parts = [
        h('span', row.server_name || `#${row.server_id}`),
        h(NTag, { size: 'small', style: 'margin-left:8px' }, () => (row.server_kind === 'official' ? '官方' : '自建')),
      ]
      if (row.server_status && row.server_status !== 'active') {
        parts.push(h(NTag, { size: 'small', type: 'warning', style: 'margin-left:6px' }, () => '不在服务中'))
      }
      return h('div', parts)
    },
  },
  {
    title: '配额（设备/行/每秒）',
    key: 'quota',
    width: 170,
    render: (row) => `${row.max_devices_per_project} / ${row.max_rows_per_project} / ${row.max_ops_per_sec}`,
  },
  {
    title: '更新时间',
    key: 'updated_at',
    width: 170,
    render: (row) => (row.updated_at ? new Date(row.updated_at).toLocaleString() : h(NText, { depth: 3 }, () => '—')),
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (row) =>
      h(NButton, { size: 'small', onClick: () => openEditor(row) }, () => '编辑'),
  },
])

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const result = await collabApi.listSettings({
      page: page.value,
      page_size: pageSize,
      keyword: keyword.value.trim() || undefined,
    })
    rows.value = result?.list ?? []
    total.value = result?.total ?? 0
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载协作设置总览失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  void load()
}

async function loadServers() {
  try {
    servers.value = (await collabApi.listServers()) ?? []
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载协作服务器失败'
  }
}

function openEditor(row: CollabCompanySettingRow) {
  editing.value = row
  Object.assign(form, {
    collab_enabled: row.collab_enabled,
    server_id: row.server_id ?? null,
    max_devices_per_project: row.max_devices_per_project,
    max_rows_per_project: row.max_rows_per_project,
    max_ops_per_sec: row.max_ops_per_sec,
  })
  editorOpen.value = true
}

async function save() {
  if (!editing.value) return
  // 开了协作却不选服务器，设备侧只会得到一句「尚未选定协作服务器」。
  // 允许保存（也许服务器还没登记好），但把后果说在前面。
  if (form.collab_enabled && !form.server_id) {
    message.warning('尚未选择协作服务器：设备会提示「企业尚未选定协作服务器」')
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
    await collabApi.updateCompanySetting(editing.value.company_id, payload)
    message.success(`已保存「${editing.value.company_name}」的协作设置`)
    editorOpen.value = false
    void load()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
  void loadServers()
})
</script>

<style scoped>
.panel {
  padding: 16px 20px 20px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.error-line {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-form {
  margin-top: 4px;
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.server-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.server-hint code {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.14);
}

.insecure {
  color: var(--yy-warning, #d98324);
}

.num {
  width: 180px;
}

.num-hint {
  margin-left: 12px;
}
</style>
