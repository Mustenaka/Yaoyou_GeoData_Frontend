<template>
  <div class="page-shell">
    <PageHeader title="协作监控" subtitle="当前后端尚未开放管理员实时协作流，这里先聚合项目与成员数据进行监控落地" />

    <div class="page-grid-4">
      <StatCard label="项目总数" :value="projects.length" unit="个" />
      <StatCard label="成员总量" :value="memberCount" unit="人" accent="linear-gradient(90deg, var(--yy-tone-blue), var(--yy-tone-green))" />
      <StatCard label="活跃项目估算" :value="activeProjectCount" unit="个" accent="linear-gradient(90deg, var(--yy-primary), var(--yy-tone-blue))" />
      <StatCard label="接口状态" value="兼容模式" accent="linear-gradient(90deg, var(--yy-tone-amber), var(--yy-tone-blue))">
        待后端补充管理员协作流
      </StatCard>
    </div>

    <div class="glass-panel panel">
      <div class="panel__title">项目协作概览</div>
      <n-data-table
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="{ pageSize: 8 }"
        :row-key="(row: CollabRow) => row.id"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { projectApi } from '@/api/project'
import PageHeader from '@/components/PageHeader.vue'
import StatCard from '@/components/StatCard.vue'
import type { ProjectInfo, ProjectMember } from '@/types/api'
import { formatDateTime } from '@/utils/format'

interface CollabRow {
  id: number
  project_name: string
  project_no: string
  member_count: number
  owner: string
  updated_at: string
  status: number
}

const loading = ref(false)
const projects = ref<ProjectInfo[]>([])
const membersMap = ref<Record<number, ProjectMember[]>>({})

const rows = computed<CollabRow[]>(() =>
  projects.value.map((project) => {
    const members = membersMap.value[project.id] || []
    const owner = members.find((item) => item.role === 'owner')?.username || '-'
    return {
      id: project.id,
      project_name: project.project_name,
      project_no: project.project_no,
      member_count: members.length,
      owner,
      updated_at: project.updated_at,
      status: project.status,
    }
  }),
)

const memberCount = computed(() => Object.values(membersMap.value).reduce((sum, items) => sum + items.length, 0))
const activeProjectCount = computed(() => projects.value.filter((item) => item.status === 1).length)

const columns = [
  { title: '项目编号', key: 'project_no', width: 160 },
  { title: '项目名称', key: 'project_name' },
  { title: '成员数', key: 'member_count', width: 100 },
  { title: '项目负责人', key: 'owner', width: 140 },
  {
    title: '最近更新时间',
    key: 'updated_at',
    width: 180,
    render: (row: CollabRow) => formatDateTime(row.updated_at),
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row: CollabRow) => (row.status === 1 ? '活跃' : '非活跃'),
  },
]

async function fetchData() {
  loading.value = true
  try {
    const result = await projectApi.list({ page: 1, page_size: 50 })
    projects.value = result.list
    const memberEntries = await Promise.all(
      result.list.map(async (project) => [project.id, await projectApi.members(project.id)] as const),
    )
    membersMap.value = Object.fromEntries(memberEntries)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<style scoped>
.panel {
  padding: 16px;
}

.panel__title {
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 700;
}
</style>
