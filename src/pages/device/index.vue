<template>
  <div class="page-shell">
    <PageHeader title="设备授权" subtitle="管理 Win 端与移动端设备激活状态" />

    <div class="glass-panel toolbar">
      <n-tabs v-model:value="deviceType" type="segment">
        <n-tab name="all">全部</n-tab>
        <n-tab name="win">Win 端</n-tab>
        <n-tab name="mobile">移动端</n-tab>
      </n-tabs>
      <div class="toolbar__spacer" />
      <n-button @click="fetchDevices" :loading="loading">刷新</n-button>
    </div>

    <div class="glass-panel table-panel">
      <n-data-table
        :columns="columns"
        :data="filteredDevices"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :row-key="(row: DeviceInfo) => row.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NButton, NTag, useMessage } from 'naive-ui'
import { deviceApi } from '@/api/device'
import PageHeader from '@/components/PageHeader.vue'
import type { DeviceInfo } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const message = useMessage()
const loading = ref(false)
const deviceType = ref<'all' | 'win' | 'mobile'>('all')
const devices = ref<DeviceInfo[]>([])

const filteredDevices = computed(() =>
  devices.value.filter((item) => deviceType.value === 'all' || item.device_type === deviceType.value),
)

const columns = [
  { title: '设备 ID', key: 'device_id', render: (row: DeviceInfo) => h('span', { class: 'mono' }, row.device_id) },
  { title: '设备名称', key: 'device_name', width: 180 },
  { title: '设备类型', key: 'device_type', width: 110 },
  { title: '系统版本', key: 'os_version', width: 140 },
  { title: '客户端版本', key: 'app_version', width: 120 },
  {
    title: '状态',
    key: 'activation_status',
    width: 100,
    render: (row: DeviceInfo) =>
      h(
        NTag,
        { type: row.activation_status === 1 ? 'success' : 'error', round: true },
        { default: () => (row.activation_status === 1 ? '已激活' : '已撤销') },
      ),
  },
  {
    title: '最近在线',
    key: 'last_online_at',
    width: 180,
    render: (row: DeviceInfo) => formatDateTime(row.last_online_at),
  },
  {
    title: '操作',
    key: 'actions',
    width: 130,
    render: (row: DeviceInfo) =>
      h(
        NButton,
        {
          size: 'small',
          type: row.activation_status === 1 ? 'warning' : 'success',
          ghost: true,
          onClick: () => toggleStatus(row),
        },
        { default: () => (row.activation_status === 1 ? '撤销授权' : '恢复授权') },
      ),
  },
]

async function fetchDevices() {
  loading.value = true
  try {
    devices.value = await deviceApi.list()
  } finally {
    loading.value = false
  }
}

async function toggleStatus(item: DeviceInfo) {
  await deviceApi.updateStatus(item.id, item.activation_status === 1 ? 0 : 1)
  message.success(`设备 ${item.device_name || item.device_id} 状态已更新`)
  await fetchDevices()
}

onMounted(fetchDevices)
</script>

<style scoped>
.toolbar,
.table-panel {
  padding: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar__spacer {
  flex: 1;
}
</style>
