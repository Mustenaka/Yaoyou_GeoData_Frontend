<template>
  <div class="page-shell">
    <PageHeader title="系统日志" subtitle="查看服务端模块、级别、Trace 与消息。" />

    <div class="page-card toolbar">
      <n-select v-model:value="level" clearable :options="levelOptions" placeholder="级别" style="width: 130px" />
      <n-input v-model:value="keyword" clearable placeholder="消息 / 来源 / Trace" style="width: 320px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchLogs" :loading="loading">刷新</n-button>
    </div>

    <div class="page-card">
      <n-data-table :columns="columns" :data="filteredLogs" :loading="loading" :pagination="{ pageSize: 20 }" :row-key="(row: SystemLog) => row.id" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import type { DataTableColumns } from 'naive-ui'
import { NTag } from 'naive-ui'
import { logApi } from '@/api/log'
import PageHeader from '@/components/PageHeader.vue'
import type { SystemLog } from '@/types/api'
import { compactText, formatDateTime } from '@/utils/format'

const loading = ref(false)
const logs = ref<SystemLog[]>([])
const level = ref<string | null>(null)
const keyword = ref('')

const levelOptions = [
  { label: 'INFO', value: 'INFO' },
  { label: 'WARN', value: 'WARN' },
  { label: 'ERROR', value: 'ERROR' },
  { label: 'FATAL', value: 'FATAL' },
]

const filteredLogs = computed(() =>
  logs.value.filter((item) => {
    const matchesLevel = !level.value || item.level === level.value
    const text = `${item.message} ${item.source} ${item.trace_id}`.toLowerCase()
    const matchesKeyword = !keyword.value || text.includes(keyword.value.toLowerCase())
    return matchesLevel && matchesKeyword
  }),
)

const columns: DataTableColumns<SystemLog> = [
  { title: '时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  {
    title: '级别',
    key: 'level',
    width: 90,
    render: (row) =>
      h(NTag, { type: row.level === 'ERROR' || row.level === 'FATAL' ? 'error' : row.level === 'WARN' ? 'warning' : 'info', round: true }, { default: () => row.level }),
  },
  { title: '类型', key: 'log_type', width: 120, render: (row) => row.log_type || '-' },
  { title: '来源', key: 'source', width: 160, render: (row) => row.source || '-' },
  { title: '消息', key: 'message', minWidth: 260, render: (row) => compactText(row.message, 120) },
  { title: 'Trace', key: 'trace_id', width: 210, render: (row) => h('span', { class: 'mono' }, row.trace_id || '-') },
]

async function fetchLogs() {
  loading.value = true
  try {
    logs.value = await logApi.systemList()
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)
</script>
