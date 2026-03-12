<template>
  <div class="page-shell">
    <PageHeader title="用户管理" subtitle="对接当前后端管理接口，支持检索、禁用和删除用户" />

    <div class="glass-panel toolbar">
      <n-input v-model:value="keyword" clearable placeholder="搜索用户名 / 邮箱" style="max-width: 280px" />
      <n-select v-model:value="statusFilter" clearable :options="statusOptions" placeholder="状态" style="width: 140px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchUsers" :loading="loading">刷新</n-button>
    </div>

    <div class="glass-panel table-panel">
      <n-data-table
        :columns="columns"
        :data="filteredUsers"
        :loading="loading"
        :pagination="{ pageSize: 10 }"
        :row-key="(row: UserInfo) => row.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { h } from 'vue'
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui'
import { userApi } from '@/api/user'
import PageHeader from '@/components/PageHeader.vue'
import type { UserInfo } from '@/types/api'
import { formatDateTime } from '@/utils/format'

const message = useMessage()
const loading = ref(false)
const users = ref<UserInfo[]>([])
const keyword = ref('')
const statusFilter = ref<number | null>(null)

const statusOptions = [
  { label: '正常', value: 1 },
  { label: '禁用', value: 0 },
]

const filteredUsers = computed(() =>
  users.value.filter((user) => {
    const matchesKeyword =
      !keyword.value ||
      user.username.toLowerCase().includes(keyword.value.toLowerCase()) ||
      user.email?.toLowerCase().includes(keyword.value.toLowerCase())
    const matchesStatus = statusFilter.value === null || user.status === statusFilter.value
    return matchesKeyword && matchesStatus
  }),
)

const columns = [
  { title: 'ID', key: 'id', width: 72 },
  {
    title: '用户名',
    key: 'username',
    width: 140,
    render: (row: UserInfo) => h('span', { class: 'mono' }, row.username),
  },
  { title: '邮箱', key: 'email' },
  { title: '手机号', key: 'phone', width: 140 },
  {
    title: '角色',
    key: 'role',
    width: 100,
    render: (row: UserInfo) =>
      h(NTag, { type: row.role === 'admin' ? 'warning' : 'info', round: true }, { default: () => row.role }),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: UserInfo) =>
      h(NTag, { type: row.status === 1 ? 'success' : 'error', round: true }, { default: () => (row.status === 1 ? '正常' : '禁用') }),
  },
  {
    title: '最近登录',
    key: 'last_login_at',
    width: 180,
    render: (row: UserInfo) => formatDateTime(row.last_login_at),
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render: (row: UserInfo) =>
      h('div', { style: 'display:flex;gap:8px' }, [
        h(
          NButton,
          {
            size: 'small',
            type: row.status === 1 ? 'warning' : 'success',
            ghost: true,
            onClick: () => toggleStatus(row),
          },
          { default: () => (row.status === 1 ? '禁用' : '启用') },
        ),
        h(
          NPopconfirm,
          { onPositiveClick: () => removeUser(row.id) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '删除' }),
            default: () => `确认删除用户 ${row.username} 吗？`,
          },
        ),
      ]),
  },
]

async function fetchUsers() {
  loading.value = true
  try {
    users.value = await userApi.list()
  } finally {
    loading.value = false
  }
}

async function toggleStatus(user: UserInfo) {
  await userApi.updateStatus(user.id, user.status === 1 ? 0 : 1)
  message.success(`用户 ${user.username} 状态已更新`)
  await fetchUsers()
}

async function removeUser(id: number) {
  await userApi.remove(id)
  message.success('用户已删除')
  await fetchUsers()
}

onMounted(fetchUsers)
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
