<template>
  <div class="page-shell">
    <PageHeader title="授权管理" subtitle="后台发放、调整和撤销 Mobile/Win 设备授权。">
      <n-button v-if="authStore.isBackOfficeScopeAll" type="primary" @click="openIssue">发放授权</n-button>
    </PageHeader>

    <div class="page-card toolbar">
      <n-select v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-select v-model:value="filters.user_id" clearable filterable :options="userOptions" placeholder="用户" style="width: 180px" />
      <n-select v-model:value="filters.client_type" clearable :options="clientTypeOptions" placeholder="产品" style="width: 120px" />
      <n-select v-model:value="filters.status" clearable :options="authStatusOptions" placeholder="状态" style="width: 130px" />
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
        :row-key="(row: LicenseItem) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="drawerVisible" width="560">
      <n-drawer-content :title="editingId ? '调整授权' : '发放授权'">
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
          <template v-if="!editingId">
            <n-form-item label="用户" path="user_id">
              <n-select v-model:value="form.user_id" filterable :options="userOptions" />
            </n-form-item>
            <n-form-item label="绑定设备" path="device_fingerprint_id">
              <n-select v-model:value="form.device_fingerprint_id" filterable :options="deviceOptions" />
            </n-form-item>
            <n-form-item label="客户端类型">
              <n-select v-model:value="form.client_type" :options="clientTypeOptions" />
            </n-form-item>
          </template>
          <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="产品范围">
                <n-input v-model:value="form.product_scope" placeholder="all / mobile / win" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="状态">
                <n-select v-model:value="form.status" :options="authStatusOptions" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="生效时间">
                <n-input v-model:value="form.valid_from" placeholder="留空立即生效" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="到期时间">
                <n-input v-model:value="form.valid_until" placeholder="2027-01-01T00:00:00Z" />
              </n-form-item>
            </n-grid-item>
          </n-grid>
        </n-form>
        <template #footer>
          <div class="drawer-footer">
            <n-button @click="drawerVisible = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="submitLicense">保存</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, FormInst, FormRules, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { deviceApi } from '@/api/device'
import { licenseApi } from '@/api/license'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { AuthorizationStatus, LicenseItem, LicensePayload } from '@/types/api'
import { authStatusLabel, authStatusOptions, clientTypeLabel, clientTypeOptions } from '@/utils/labels'
import { formatDateTime } from '@/utils/format'

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const rows = ref<LicenseItem[]>([])
const drawerVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)
const companyOptions = ref<SelectOption[]>([])
const userOptions = ref<SelectOption[]>([])
const deviceOptions = ref<SelectOption[]>([])

const filters = reactive({
  company_id: null as number | null,
  user_id: null as number | null,
  status: null as AuthorizationStatus | null,
  client_type: null as 'mobile' | 'win' | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const form = reactive<LicensePayload>({
  user_id: 0,
  device_fingerprint_id: 0,
  client_type: 'mobile',
  product_scope: 'all',
  valid_from: '',
  valid_until: '',
  status: 'active',
})

const rules: FormRules = {
  user_id: [{ required: true, type: 'number', message: '请选择用户', trigger: ['change'] }],
  device_fingerprint_id: [{ required: true, type: 'number', message: '请选择设备', trigger: ['change'] }],
}

const columns: DataTableColumns<LicenseItem> = [
  { title: '企业', key: 'company_name', minWidth: 150, render: (row) => row.company_name || '-' },
  { title: '用户', key: 'username', width: 140, render: (row) => row.username || '-' },
  { title: '产品', key: 'client_type', width: 90, render: (row) => clientTypeLabel(row.client_type) },
  { title: '范围', key: 'product_scope', width: 90 },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render: (row) =>
      h(NTag, { type: row.status === 'active' ? 'success' : row.status === 'revoked' ? 'error' : 'warning', round: true }, { default: () => authStatusLabel(row.status) }),
  },
  { title: '绑定设备', key: 'device_fingerprint_id', width: 110, render: (row) => row.device_fingerprint_id ?? '-' },
  { title: '到期', key: 'valid_until', width: 170, render: (row) => formatDateTime(row.valid_until) },
  { title: '最近校验', key: 'last_check_at', width: 170, render: (row) => formatDateTime(row.last_check_at) },
  {
    title: '操作',
    key: 'actions',
    width: 210,
    fixed: 'right',
    render: (row) => {
      if (!authStore.isBackOfficeScopeAll) return '只读'
      return h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '调整' }),
        h(
          NPopconfirm,
          { onPositiveClick: () => revokeLicense(row) },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', ghost: true }, { default: () => '撤销' }),
            default: () => `确认撤销 ${row.username || row.user_id} 的 ${clientTypeLabel(row.client_type)} 授权？`,
          },
        ),
      ])
    },
  },
]

async function loadOptions() {
  const [companies, users, devices] = await Promise.all([
    companyApi.list({ page: 1, page_size: 200 }),
    userApi.list({ page: 1, page_size: 300 }),
    deviceApi.list({ page: 1, page_size: 300 }),
  ])
  companyOptions.value = companies.list.map((item) => ({ label: item.company_name, value: item.id }))
  userOptions.value = users.list.map((item) => ({ label: `${item.username} · ${item.company_name || '-'}`, value: item.id }))
  deviceOptions.value = devices.list.map((item) => ({
    label: `#${item.id} · ${clientTypeLabel(item.client_type)} · ${item.username || '-'} · ${item.authorization_status || 'pending'}`,
    value: item.id,
  }))
}

async function fetchList() {
  loading.value = true
  try {
    const result = await licenseApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: filters.company_id,
      user_id: filters.user_id,
      status: filters.status || undefined,
      client_type: filters.client_type || undefined,
    })
    rows.value = result.list
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.company_id = null
  filters.user_id = null
  filters.status = null
  filters.client_type = null
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

function openIssue() {
  if (!authStore.isBackOfficeScopeAll) return
  editingId.value = null
  Object.assign(form, {
    user_id: 0,
    device_fingerprint_id: 0,
    client_type: 'mobile',
    product_scope: 'all',
    valid_from: '',
    valid_until: '',
    status: 'active',
  })
  drawerVisible.value = true
}

function openEdit(row: LicenseItem) {
  if (!authStore.isBackOfficeScopeAll) return
  editingId.value = row.id
  Object.assign(form, {
    user_id: row.user_id || 0,
    device_fingerprint_id: row.device_fingerprint_id || 0,
    client_type: row.client_type === 'win' ? 'win' : 'mobile',
    product_scope: row.product_scope || 'all',
    valid_from: row.valid_from || '',
    valid_until: row.valid_until || '',
    status: row.status,
  })
  drawerVisible.value = true
}

async function submitLicense() {
  if (!authStore.isBackOfficeScopeAll) return
  await formRef.value?.validate()
  const confirmed = await confirmHighRisk(editingId.value ? '确认调整授权期限、范围或状态？' : '确认发放新的设备授权？')
  if (!confirmed) return
  saving.value = true
  try {
    if (editingId.value) {
      await licenseApi.update(editingId.value, {
        product_scope: form.product_scope || 'all',
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        status: form.status,
      })
      message.success('授权已更新')
    } else {
      const result = await licenseApi.issue({
        ...form,
        product_scope: form.product_scope || 'all',
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
      })
      message.success(result.license_key ? `授权已发放，密钥已生成` : '授权已发放')
    }
    drawerVisible.value = false
    await fetchList()
    await loadOptions()
  } finally {
    saving.value = false
  }
}

async function revokeLicense(row: LicenseItem) {
  if (!authStore.isBackOfficeScopeAll) return
  await licenseApi.update(row.id, { status: 'revoked' })
  message.success('授权已撤销')
  await fetchList()
}

function confirmHighRisk(content: string) {
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '高风险操作确认',
      content,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
}

onMounted(async () => {
  await loadOptions()
  await fetchList()
})
</script>
