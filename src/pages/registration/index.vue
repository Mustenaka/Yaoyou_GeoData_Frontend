<template>
  <div class="page-shell">
    <PageHeader title="注册申请" subtitle="审核公开提交的企业与用户开通申请。" />

    <div class="page-card toolbar">
      <n-input v-model:value="filters.keyword" clearable placeholder="单位 / 联系人 / 手机 / 邮箱" style="width: 280px" @keyup.enter="fetchList" />
      <n-select v-model:value="filters.status" clearable :options="statusOptions" placeholder="状态" style="width: 140px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchList">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: RegistrationApplication) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="560">
      <n-drawer-content title="申请详情">
        <n-descriptions v-if="selected" label-placement="left" :column="1" bordered>
          <n-descriptions-item label="申请 ID">{{ selected.id }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ appTypeLabel(selected.app_type) }}</n-descriptions-item>
          <n-descriptions-item label="单位">{{ selected.company_name || `企业 #${selected.target_company_id ?? '-'}` }}</n-descriptions-item>
          <n-descriptions-item label="联系人">{{ selected.contact_name }}</n-descriptions-item>
          <n-descriptions-item label="手机">{{ selected.phone }}</n-descriptions-item>
          <n-descriptions-item label="邮箱">{{ selected.email }}</n-descriptions-item>
          <n-descriptions-item label="产品">{{ productLabel(selected.requested_product) }}</n-descriptions-item>
          <n-descriptions-item label="角色">{{ roleLabel(selected.requested_role) }}</n-descriptions-item>
          <n-descriptions-item label="状态">{{ statusLabel(selected.status) }}</n-descriptions-item>
          <n-descriptions-item label="提交时间">{{ formatDateTime(selected.created_at) }}</n-descriptions-item>
          <n-descriptions-item label="处理时间">{{ formatDateTime(selected.handled_at) }}</n-descriptions-item>
          <n-descriptions-item label="处理备注">{{ selected.handle_note || '-' }}</n-descriptions-item>
          <n-descriptions-item label="说明">{{ selected.reason || '-' }}</n-descriptions-item>
        </n-descriptions>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="rejectVisible" preset="dialog" title="拒绝申请" positive-text="拒绝" negative-text="取消" @positive-click="submitReject">
      <n-input v-model:value="rejectNote" type="textarea" maxlength="500" show-count placeholder="请输入拒绝原因" />
    </n-modal>

    <n-modal v-model:show="passwordVisible" preset="card" title="审批通过" style="width: 520px">
      <n-space v-if="approveResult" vertical>
        <n-alert type="success">账号已创建，临时口令仅本次展示。</n-alert>
        <n-descriptions label-placement="left" :column="1" bordered>
          <n-descriptions-item label="用户名">{{ approveResult.user.username }}</n-descriptions-item>
          <n-descriptions-item label="角色">{{ roleLabel(approveResult.user.role_code) }}</n-descriptions-item>
          <n-descriptions-item label="临时口令">
            <span class="mono">{{ approveResult.temporary_password || '-' }}</span>
          </n-descriptions-item>
          <n-descriptions-item label="首登改密">{{ approveResult.user.must_change_password ? '是' : '否' }}</n-descriptions-item>
        </n-descriptions>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button type="primary" @click="passwordVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { NButton, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { registrationApi } from '@/api/registration'
import type { RegistrationApplication, RegistrationApproveResponse, RegistrationStatus } from '@/types/api'
import { formatDateTime } from '@/utils/format'
import { roleLabel } from '@/utils/labels'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const rows = ref<RegistrationApplication[]>([])
const selected = ref<RegistrationApplication | null>(null)
const detailVisible = ref(false)
const rejectVisible = ref(false)
const rejectingId = ref<number | null>(null)
const rejectNote = ref('')
const passwordVisible = ref(false)
const approveResult = ref<RegistrationApproveResponse | null>(null)

const filters = reactive({
  keyword: '',
  status: 'pending' as RegistrationStatus | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const statusOptions: Array<{ label: string; value: RegistrationStatus }> = [
  { label: '待审', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

const columns: DataTableColumns<RegistrationApplication> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '类型', key: 'app_type', width: 100, render: (row) => appTypeLabel(row.app_type) },
  { title: '单位', key: 'company_name', minWidth: 170, render: (row) => row.company_name || `企业 #${row.target_company_id ?? '-'}` },
  { title: '联系人', key: 'contact_name', width: 120 },
  { title: '手机', key: 'phone', width: 140 },
  { title: '产品', key: 'requested_product', width: 120, render: (row) => productLabel(row.requested_product) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: statusType(row.status), round: true }, { default: () => statusLabel(row.status) }),
  },
  { title: '提交时间', key: 'created_at', width: 170, render: (row) => formatDateTime(row.created_at) },
  {
    title: '操作',
    key: 'actions',
    width: 230,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
        row.status === 'pending'
          ? h(NButton, { size: 'small', type: 'primary', onClick: () => confirmApprove(row) }, { default: () => '通过' })
          : null,
        row.status === 'pending'
          ? h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => openReject(row) }, { default: () => '拒绝' })
          : null,
      ]),
  },
]

function statusLabel(status?: string) {
  return statusOptions.find((item) => item.value === status)?.label || status || '-'
}

function statusType(status?: string) {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'error'
  return 'warning'
}

function appTypeLabel(type?: string) {
  if (type === 'enterprise') return '企业'
  if (type === 'user') return '用户'
  return type || '-'
}

function productLabel(product?: string) {
  if (product === 'both') return 'Mobile + Win'
  if (product === 'mobile') return 'Mobile'
  if (product === 'win') return 'Win'
  return product || '-'
}

async function fetchList() {
  loading.value = true
  try {
    const result = await registrationApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: filters.keyword || undefined,
      status: filters.status || undefined,
    })
    rows.value = result.list
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = 'pending'
  pagination.page = 1
  fetchList()
}

function handlePage(page: number) {
  pagination.page = page
  fetchList()
}

function handlePageSize(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.page = 1
  fetchList()
}

async function openDetail(row: RegistrationApplication) {
  selected.value = await registrationApi.detail(row.id)
  detailVisible.value = true
}

function confirmApprove(row: RegistrationApplication) {
  dialog.warning({
    title: '确认通过申请',
    content: `通过后将创建 ${appTypeLabel(row.app_type)}账号并生成临时口令。`,
    positiveText: '通过',
    negativeText: '取消',
    onPositiveClick: async () => {
      approveResult.value = await registrationApi.approve(row.id)
      passwordVisible.value = true
      message.success('申请已通过')
      await fetchList()
    },
  })
}

function openReject(row: RegistrationApplication) {
  rejectingId.value = row.id
  rejectNote.value = ''
  rejectVisible.value = true
}

async function submitReject() {
  if (!rejectingId.value) return false
  if (!rejectNote.value.trim()) {
    message.error('请输入拒绝原因')
    return false
  }
  await registrationApi.reject(rejectingId.value, rejectNote.value.trim())
  message.success('申请已拒绝')
  rejectVisible.value = false
  await fetchList()
  return true
}

onMounted(fetchList)
</script>
