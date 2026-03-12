<template>
  <div class="page-shell">
    <PageHeader title="系统日志" subtitle="当前后端接口返回最近 200 条日志，筛选在前端侧完成" />

    <div class="glass-panel toolbar">
      <n-select v-model:value="level" clearable :options="levelOptions" placeholder="日志级别" style="width: 140px" />
      <n-input v-model:value="keyword" clearable placeholder="搜索消息 / 来源 / traceId" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchLogs" :loading="loading">刷新</n-button>
    </div>

    <div class="glass-panel table-panel">
      <n-data-table
        :columns="columns"
        :data="filteredLogs"
        :loading="loading"
        :pagination="{ pageSize: 12 }"
        :row-key="(row: SystemLog) => row.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NTag } from 'naive-ui'
import { logApi } from '@/api/log'
import PageHeader from '@/components/PageHeader.vue'
import type { SystemLog } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const loading = ref(false)
const logs = ref<SystemLog[]>([])
const level = ref<SystemLog['level'] | null>(null)
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

const columns = [
  {
    title: '时间',
    key: 'created_at',
    width: 180,
    render: (row: SystemLog) => formatDateTime(row.created_at),
  },
  {
    title: '级别',
    key: 'level',
    width: 90,
    render: (row: SystemLog) =>
      h(
        NTag,
        { type: row.level === 'ERROR' || row.level === 'FATAL' ? 'error' : row.level === 'WARN' ? 'warning' : 'info', round: true },
        { default: () => row.level },
      ),
  },
  { title: '类型', key: 'log_type', width: 120 },
  { title: '来源', key: 'source', width: 180 },
  { title: '消息', key: 'message' },
  {
    title: 'Trace',
    key: 'trace_id',
    width: 180,
    render: (row: SystemLog) => h('span', { class: 'mono' }, row.trace_id),
  },
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
</style>
