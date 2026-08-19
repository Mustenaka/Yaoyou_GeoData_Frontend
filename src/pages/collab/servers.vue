<template>
  <div class="page-shell">
    <PageHeader
      title="协作服务器"
      subtitle="登记可以承担实时协作的服务器。官方服务器由我们运维；自建服务器跑在客户自己的机器上，数据不出他们的机房。"
    >
      <n-space>
        <n-button :loading="loading" @click="load">
          <template #icon><n-icon :component="RefreshOutline" /></template>
          刷新
        </n-button>
        <n-button type="primary" @click="openRegister">
          <template #icon><n-icon :component="AddOutline" /></template>
          登记服务器
        </n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      <div class="error-line">
        <span>{{ errorText }}</span>
        <n-button size="small" text type="primary" @click="load">重试</n-button>
      </div>
    </n-alert>

    <!-- 签发器是所有协作的前提：它坏了，谁都拿不到票据，所有服务器都会拒绝设备。
         所以它放在最上面，而不是藏在某个详情里。 -->
    <n-alert v-if="signer && !signer.ready" type="warning">
      <template #header>票据签发器未就绪，协作当前无法使用</template>
      {{ signer.error || '后台没有可用的协作签名密钥。在此之前，所有协作服务器都会拒绝设备连接。' }}
    </n-alert>

    <div class="page-grid-4">
      <StatCard label="已登记" :value="servers.length" unit="台" />
      <StatCard
        label="正在服务"
        :value="activeCount"
        unit="台"
        accent="linear-gradient(90deg, var(--yy-tone-blue), var(--yy-tone-green))"
      />
      <StatCard
        label="等待首次心跳"
        :value="pendingCount"
        unit="台"
        accent="linear-gradient(90deg, var(--yy-tone-amber), var(--yy-tone-blue))"
      />
      <StatCard
        label="票据签发器"
        :value="signer?.ready ? '正常' : '异常'"
        :accent="signer?.ready
          ? 'linear-gradient(90deg, var(--yy-tone-green), var(--yy-tone-blue))'
          : 'linear-gradient(90deg, var(--yy-tone-red), var(--yy-tone-amber))'"
      >
        {{ signer?.algorithm || '—' }}
      </StatCard>
    </div>

    <div class="glass-panel panel">
      <div class="panel__title">服务器列表</div>
      <n-data-table
        :columns="columns"
        :data="servers"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :row-key="(row: CollabServer) => row.id"
        :bordered="false"
      >
        <template #empty>
          <n-empty description="还没有登记任何协作服务器" />
        </template>
      </n-data-table>
    </div>

    <n-modal
      v-model:show="registerOpen"
      preset="card"
      title="登记协作服务器"
      class="register-modal"
      :mask-closable="false"
    >
      <n-alert type="info" :bordered="false" class="register-hint">
        这三项要从服务器上 <code>install.sh</code> 第 1 步的输出里原样复制过来。
        地址填错一个字符，登记会成功，但每台设备都连不上——而且要到工地上才会发现。
      </n-alert>

      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="名称" path="name">
          <n-input v-model:value="form.name" placeholder="例如：华宁地勘 · 自建协作服务器" />
        </n-form-item>

        <n-form-item label="类型" path="kind">
          <n-radio-group v-model:value="form.kind">
            <n-radio-button value="self_hosted">自建（客户机器）</n-radio-button>
            <n-radio-button value="official">官方</n-radio-button>
          </n-radio-group>
        </n-form-item>

        <n-form-item label="服务器地址" path="base_url">
          <n-input v-model:value="form.base_url" placeholder="https://collab.example.com:8000" />
          <template #feedback>
            <span :class="endpointHintClass">{{ endpointHint }}</span>
          </template>
        </n-form-item>

        <n-form-item label="密钥标识 key-id" path="key_id">
          <n-input v-model:value="form.key_id" placeholder="collab-xxxxxxxxxxxx" />
        </n-form-item>

        <n-form-item label="公钥 public-key" path="public_key_ed25519">
          <n-input
            v-model:value="form.public_key_ed25519"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 3 }"
            placeholder="base64 编码的 Ed25519 公钥"
          />
        </n-form-item>

        <n-form-item label="归属企业">
          <n-select
            v-model:value="form.company_id"
            :options="companyOptions"
            clearable
            filterable
            placeholder="留空表示所有企业都可以被调度到这台服务器"
          />
        </n-form-item>

        <n-form-item label="离线宽限期（秒）">
          <n-input-number v-model:value="form.grace_seconds" :min="0" :max="86400" class="grace-input" />
          <template #feedback>
            断网后仍可继续协作的时长，最长 24 小时。填 0 表示一断网立刻转只读。
          </template>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="end">
          <n-button @click="registerOpen = false">取消</n-button>
          <n-button type="primary" :loading="saving" @click="submitRegister">登记</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="revokeOpen" preset="dialog" type="warning" title="吊销这台协作服务器">
      <template #default>
        <p>
          吊销 <strong>{{ revokeTarget?.name }}</strong> 会立即让它已经发出去的票据全部失效，
          正在上面协作的设备会被断开。
        </p>
        <p>正在这台服务器上录入的数据不会丢——设备本地都有，之后会同步上来。</p>
        <n-input
          v-model:value="revokeReason"
          type="textarea"
          :autosize="{ minRows: 2 }"
          placeholder="吊销理由（必填，会进审计记录）"
        />
      </template>
      <template #action>
        <n-space>
          <n-button @click="revokeOpen = false">取消</n-button>
          <n-button type="error" :loading="revoking" :disabled="!revokeReason.trim()" @click="submitRevoke">
            确认吊销
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import {
  NButton,
  NSpace,
  NTag,
  NText,
  NTooltip,
  useMessage,
  type DataTableColumns,
  type FormInst,
  type FormRules,
  type SelectOption,
} from 'naive-ui'
import { AddOutline, RefreshOutline } from '@vicons/ionicons5'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import { collabApi, type CollabServer, type CollabSignerHealth } from '@/api/collab'
import { companyApi } from '@/api/company'
import { formatDateTime } from '@/utils/format'

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const revoking = ref(false)
const errorText = ref('')
const servers = ref<CollabServer[]>([])
const signer = ref<CollabSignerHealth | null>(null)
const companyOptions = ref<SelectOption[]>([])

const registerOpen = ref(false)
const revokeOpen = ref(false)
const revokeTarget = ref<CollabServer | null>(null)
const revokeReason = ref('')
const formRef = ref<FormInst | null>(null)

const emptyForm = () => ({
  name: '',
  kind: 'self_hosted' as CollabServer['kind'],
  base_url: '',
  key_id: '',
  public_key_ed25519: '',
  company_id: null as number | null,
  grace_seconds: 86400,
})
const form = reactive(emptyForm())

const activeCount = computed(() => servers.value.filter((row) => row.status === 'active').length)
const pendingCount = computed(() => servers.value.filter((row) => row.status === 'pending').length)

/**
 * 端点校验在这里再做一遍，规则和后端 collabproto.NormalizeEndpoint、
 * 以及移动端 collab-config.mjs 完全一致。三处同一条规则，这里只是把结论提前到
 * 还能改的时候告诉人，而不是等提交被后端拒。
 *
 * 「错误」和「提醒」是分开的，而且分得很认真：没写端口是合法的，只是多半不是
 * 本意。把它标成红色，等于让人怀疑一个其实正确的地址——反而更容易改错。
 */
const endpointError = computed(() => {
  const raw = form.base_url.trim()
  if (!raw) return ''
  const matched = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]+)([/?#][\s\S]*)?$/.exec(raw)
  if (!matched) return '不是合法地址。正确形式：http(s)://主机名或IP:端口'
  const scheme = matched[1].toLowerCase()
  if (scheme !== 'https' && scheme !== 'http') return '只支持 http:// 和 https://。'
  if (/[\s@]/.test(matched[2])) return '主机名里不能有空格或用户名。'
  const tail = matched[3]
  if (tail && tail !== '/') return '只能填源地址，不能带路径、查询串或片段。'
  return ''
})

const endpointWarning = computed(() => {
  const raw = form.base_url.trim()
  if (!raw || endpointError.value) return ''
  const matched = /^(https?):\/\/([^/?#]+)/i.exec(raw)
  const scheme = (matched?.[1] || '').toLowerCase()
  const host = matched?.[2] ?? ''
  if (!/:\d+$/.test(host)) {
    return `没有写端口，会按 ${scheme === 'https' ? 443 : 80} 处理。自建服务器通常跑在 8000/8443 上，请确认这就是你要的。`
  }
  if (scheme === 'http') {
    // http 是被支持的：只有 IP 没有域名的客户，公网 CA 不会给裸 IP 签证书，
    // 强制 HTTPS 等于把协作挡在门外。但它不加密，这件事必须说出来。
    return '这是明文 HTTP：协作数据和登录票据在链路上可被看到。内网或可信网络可以这样用；走公网建议后续换成域名 + HTTPS。'
  }
  return ''
})

const endpointHint = computed(
  () =>
    endpointError.value ||
    endpointWarning.value ||
    '与服务器上 --public-url 完全一致。http 与 https 都支持，端口不能漏。',
)

const endpointHintClass = computed(() => {
  if (endpointError.value) return 'hint-bad'
  if (endpointWarning.value) return 'hint-warn'
  return ''
})

const rules: FormRules = {
  name: { required: true, message: '请填写名称', trigger: 'blur' },
  base_url: {
    required: true,
    trigger: ['blur', 'input'],
    validator: (_rule, value: string) => {
      if (!value?.trim()) return new Error('请填写服务器地址')
      // 只有 endpointError 会挡住提交。缺端口是提醒，不是错误。
      if (endpointError.value) return new Error(endpointError.value)
      return true
    },
  },
  key_id: { required: true, message: '请填写密钥标识', trigger: 'blur' },
  public_key_ed25519: { required: true, message: '请填写公钥', trigger: 'blur' },
}

const statusMeta: Record<CollabServer['status'], { text: string; type: 'default' | 'success' | 'warning' | 'error'; hint: string }> = {
  pending: { text: '待首次心跳', type: 'warning', hint: '已登记，但还没有收到过这台服务器的心跳。它可能还没启动，或者连不上后台。' },
  active: { text: '服务中', type: 'success', hint: '心跳正常，可以被调度。' },
  suspended: { text: '已暂停', type: 'default', hint: '暂时不再被调度到新会话。' },
  revoked: { text: '已吊销', type: 'error', hint: '票据已失效，不再服务任何设备。' },
}

const columns: DataTableColumns<CollabServer> = [
  {
    title: '名称',
    key: 'name',
    render: (row) =>
      h(NSpace, { vertical: true, size: 2 }, () => [
        h('span', { class: 'server-name' }, row.name),
        h(NText, { depth: 3, style: 'font-size:12px' }, () => (row.kind === 'official' ? '官方' : '自建')),
      ]),
  },
  {
    title: '地址',
    key: 'base_url',
    render: (row) => h('code', { class: 'endpoint' }, row.base_url),
  },
  {
    title: '状态',
    key: 'status',
    width: 130,
    render: (row) => {
      const meta = statusMeta[row.status] ?? { text: row.status, type: 'default' as const, hint: '' }
      return h(NTooltip, null, {
        trigger: () => h(NTag, { type: meta.type, size: 'small', round: true }, () => meta.text),
        default: () => meta.hint,
      })
    },
  },
  {
    title: '最后心跳',
    key: 'last_heartbeat_at',
    width: 180,
    render: (row) => (row.last_heartbeat_at ? formatDateTime(row.last_heartbeat_at) : h(NText, { depth: 3 }, () => '从未')),
  },
  {
    title: '版本',
    key: 'build_version',
    render: (row) =>
      row.build_version
        ? h(NSpace, { vertical: true, size: 2 }, () => [
            h('span', { style: 'font-size:12px' }, row.build_version),
            h(NText, { depth: 3, style: 'font-size:12px' }, () => `schema ${row.schema_version} · 协议 ${row.proto_versions || '—'}`),
          ])
        : h(NText, { depth: 3 }, () => '—'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 110,
    render: (row) =>
      row.status === 'revoked'
        ? h(NText, { depth: 3, style: 'font-size:12px' }, () => row.revoke_reason || '已吊销')
        : h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => openRevoke(row) }, () => '吊销'),
  },
]

function openRegister() {
  Object.assign(form, emptyForm())
  registerOpen.value = true
}

function openRevoke(row: CollabServer) {
  revokeTarget.value = row
  revokeReason.value = ''
  revokeOpen.value = true
}

async function load() {
  loading.value = true
  errorText.value = ''
  try {
    const [rows, health] = await Promise.all([collabApi.listServers(), collabApi.signer()])
    servers.value = rows ?? []
    signer.value = health ?? null
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '加载协作服务器失败'
  } finally {
    loading.value = false
  }
}

async function loadCompanies() {
  try {
    const page = await companyApi.list({ page: 1, page_size: 200 })
    companyOptions.value = (page?.list ?? []).map((company) => ({
      label: company.company_name,
      value: company.id,
    }))
  } catch {
    // 企业列表只是让「归属企业」这一项好选一点，取不到不该挡住登记本身。
    companyOptions.value = []
  }
}

async function submitRegister() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  saving.value = true
  try {
    await collabApi.registerServer({
      name: form.name.trim(),
      kind: form.kind,
      base_url: form.base_url.trim(),
      key_id: form.key_id.trim(),
      public_key_ed25519: form.public_key_ed25519.trim(),
      company_id: form.company_id,
      grace_seconds: form.grace_seconds,
    })
    message.success('已登记。等这台服务器发来第一次心跳后就会转为「服务中」。')
    registerOpen.value = false
    await load()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '登记失败')
  } finally {
    saving.value = false
  }
}

async function submitRevoke() {
  const target = revokeTarget.value
  if (!target) return
  revoking.value = true
  try {
    await collabApi.revokeServer(target.id, revokeReason.value.trim())
    message.success('已吊销')
    revokeOpen.value = false
    await load()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '吊销失败')
  } finally {
    revoking.value = false
  }
}

onMounted(() => {
  void load()
  void loadCompanies()
})
</script>

<style scoped>
.panel {
  padding: 20px;
}
.panel__title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}
.error-line {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
}
.server-name {
  font-weight: 600;
}
.endpoint {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
}
.register-modal {
  width: min(560px, 92vw);
}
.register-hint {
  margin-bottom: 18px;
}
.register-hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.hint-bad {
  color: var(--yy-tone-red, #d03050);
}
.hint-warn {
  color: var(--yy-tone-amber, #d98324);
}
.grace-input {
  width: 200px;
}
</style>
