<template>
  <div class="page-shell">
    <PageHeader title="客户端日志" subtitle="支持查看文本日志与下载上传文件" />

    <div class="glass-panel toolbar">
      <n-input v-model:value="keyword" clearable placeholder="搜索设备 ID / 版本 / 内容" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchLogs" :loading="loading">刷新</n-button>
    </div>

    <div class="glass-panel table-panel">
      <n-data-table
        :columns="columns"
        :data="filteredLogs"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :row-key="(row: ClientLog) => row.id"
      />
    </div>

    <n-modal v-model:show="showPreview" preset="card" title="日志内容预览" style="width: 720px">
      <pre class="log-preview">{{ previewContent }}</pre>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NButton, useMessage } from 'naive-ui'
import { logApi } from '@/api/log'
import PageHeader from '@/components/PageHeader.vue'
import type { ClientLog } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const message = useMessage()
const loading = ref(false)
const keyword = ref('')
const logs = ref<ClientLog[]>([])
const showPreview = ref(false)
const previewContent = ref('')

const filteredLogs = computed(() =>
  logs.value.filter((item) => {
    const text = `${item.device_id} ${item.app_version} ${item.log_content}`.toLowerCase()
    return !keyword.value || text.includes(keyword.value.toLowerCase())
  }),
)

const columns = [
  { title: 'ID', key: 'id', width: 72 },
  { title: '设备 ID', key: 'device_id', width: 220, render: (row: ClientLog) => h('span', { class: 'mono' }, row.device_id) },
  { title: '客户端版本', key: 'app_version', width: 140 },
  {
    title: '日志时间',
    key: 'created_at',
    width: 180,
    render: (row: ClientLog) => formatDateTime(row.created_at),
  },
  {
    title: '内容摘要',
    key: 'summary',
    render: (row: ClientLog) => row.log_content?.slice(0, 60) || (row.log_file ? '文件日志' : '-'),
  },
  {
    title: '操作',
    key: 'actions',
    width: 170,
    render: (row: ClientLog) =>
      h('div', { style: 'display:flex;gap:8px' }, [
        h(
          NButton,
          { size: 'small', ghost: true, onClick: () => previewLog(row) },
          { default: () => '查看' },
        ),
        h(
          NButton,
          { size: 'small', type: 'primary', ghost: true, onClick: () => downloadLog(row) },
          { default: () => '下载' },
        ),
      ]),
  },
]

async function fetchLogs() {
  loading.value = true
  try {
    logs.value = await logApi.clientList()
  } finally {
    loading.value = false
  }
}

function previewLog(row: ClientLog) {
  previewContent.value = row.log_content || '该记录以文件形式上传，请使用下载功能查看。'
  showPreview.value = true
}

async function downloadLog(row: ClientLog) {
  try {
    const blob = await logApi.downloadClientLog(row.id)
    const url = window.URL.createObjectURL(blob as Blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${row.device_id || 'client-log'}-${row.id}.log`
    anchor.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '下载失败')
  }
}

onMounted(fetchLogs)
</script>

<style scoped>
.toolbar,
.table-panel {
  padding: 16px;
}

.toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar__spacer {
  flex: 1;
}

.log-preview {
  margin: 0;
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.6;
}
</style>
