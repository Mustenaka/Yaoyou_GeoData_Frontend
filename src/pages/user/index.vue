<template>
  <div class="page-shell">
    <PageHeader title="用户管理" subtitle="维护后台与客户端账号、角色、状态、试用和临时有效期。">
      <n-button type="primary" @click="openCreate">新建用户</n-button>
    </PageHeader>

    <div class="page-card toolbar">
      <n-input v-model:value="filters.keyword" clearable placeholder="用户名 / 邮箱 / 手机" style="width: 230px" @keyup.enter="fetchList" />
      <n-select v-if="authStore.isBackOfficeScopeAll" v-model:value="filters.company_id" clearable :options="companyOptions" placeholder="企业" style="width: 210px" />
      <n-select v-model:value="filters.role_code" clearable :options="availableRoleOptions" placeholder="角色" style="width: 150px" />
      <n-select v-model:value="filters.status" clearable :options="userStatusOptions" placeholder="状态" style="width: 130px" />
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
        :row-key="(row: UserItem) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="drawerVisible" width="560">
      <n-drawer-content :title="editingId ? '编辑用户' : '新建用户'">
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
          <n-form-item label="用户名" path="username">
            <n-input v-model:value="form.username" :disabled="Boolean(editingId)" />
          </n-form-item>
          <n-form-item v-if="!editingId" label="初始密码">
            <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="留空则后端生成临时密码" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="邮箱">
                <n-input v-model:value="form.email" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="手机">
                <n-input v-model:value="form.phone" />
              </n-form-item>
            </n-grid-item>
          </n-grid>
          <n-form-item v-if="authStore.isBackOfficeScopeAll" label="所属企业">
            <n-select v-model:value="form.company_id" clearable :options="companyOptions" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="角色">
                <n-select v-model:value="form.role_code" :options="availableRoleOptions" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="状态">
                <n-select v-model:value="form.status" :options="userStatusOptions" />
              </n-form-item>
            </n-grid-item>
          </n-grid>
          <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="试用到期">
                <n-input v-model:value="form.trial_expires_at" placeholder="2027-01-01T00:00:00Z" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="临时账号到期">
                <n-input v-model:value="form.temporary_expires_at" placeholder="2027-01-01T00:00:00Z" />
              </n-form-item>
            </n-grid-item>
          </n-grid>
          <n-space>
            <n-checkbox v-model:checked="form.can_use_mobile">允许 Mobile</n-checkbox>
            <n-checkbox v-model:checked="form.can_use_win">允许 Win</n-checkbox>
          </n-space>
        </n-form>
        <template #footer>
          <div class="drawer-footer">
            <n-button @click="drawerVisible = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="submitUser">保存</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="passwordModalVisible" preset="dialog" title="重置密码" positive-text="重置" negative-text="取消" @positive-click="submitResetPassword">
      <n-input v-model:value="passwordForm.password" type="password" show-password-on="click" placeholder="留空则后端生成临时密码" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, FormInst, FormRules, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { RoleCode, UserItem, UserPayload, UserStatus } from '@/types/api'
import { roleLabel, roleOptions, userStatusLabel, userStatusOptions } from '@/utils/labels'
import { formatDateTime } from '@/utils/format'

const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const saving = ref(false)
const rows = ref<UserItem[]>([])
const drawerVisible = ref(false)
const editingId = ref<number | null>(null)
const originalRole = ref<RoleCode | null>(null)
const originalStatus = ref<UserStatus | null>(null)
const formRef = ref<FormInst | null>(null)
const companyOptions = ref<SelectOption[]>([])
const passwordModalVisible = ref(false)
const resettingUserId = ref<number | null>(null)

const filters = reactive({
  keyword: '',
  company_id: null as number | null,
  role_code: null as RoleCode | null,
  status: null as UserStatus | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const form = reactive<UserPayload>({
  username: '',
  password: '',
  email: '',
  phone: '',
  company_id: null,
  role_code: 'normal_user',
  status: 'active',
  trial_expires_at: '',
  temporary_expires_at: '',
  can_use_mobile: true,
  can_use_win: true,
})

const passwordForm = reactive({ password: '' })

const assignableRoleValues = computed<RoleCode[]>(() => {
  if (authStore.isSuperAdmin) return roleOptions.map((item) => item.value)
  if (authStore.isAdmin) return ['enterprise_admin', 'normal_user', 'trial_user', 'temporary_user']
  return ['normal_user', 'trial_user', 'temporary_user']
})

const availableRoleOptions = computed(() => roleOptions.filter((item) => assignableRoleValues.value.includes(item.value)))

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: ['blur', 'input'] }],
}

const columns: DataTableColumns<UserItem> = [
  { title: '用户名', key: 'username', minWidth: 150, render: (row) => h('span', { class: 'mono' }, row.username) },
  { title: '企业', key: 'company_name', minWidth: 150, render: (row) => row.company_name || '-' },
  { title: '角色', key: 'role_code', width: 120, render: (row) => roleLabel(row.role_code) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(NTag, { type: row.status === 'active' ? 'success' : 'warning', round: true }, { default: () => userStatusLabel(row.status) }),
  },
  { title: '产品', key: 'products', width: 110, render: (row) => [row.can_use_mobile ? 'Mobile' : '', row.can_use_win ? 'Win' : ''].filter(Boolean).join(' / ') || '-' },
  { title: '试用到期', key: 'trial_expires_at', width: 160, render: (row) => formatDateTime(row.trial_expires_at) },
  { title: '临时到期', key: 'temporary_expires_at', width: 160, render: (row) => formatDateTime(row.temporary_expires_at) },
  { title: '最近登录', key: 'last_login_at', width: 170, render: (row) => formatDateTime(row.last_login_at) },
  {
    title: '操作',
    key: 'actions',
    width: 300,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', onClick: () => openResetPassword(row) }, { default: () => '重置密码' }),
        h(
          NPopconfirm,
          { onPositiveClick: () => toggleStatus(row) },
          {
            trigger: () =>
              h(
                NButton,
                { size: 'small', type: row.status === 'active' ? 'warning' : 'success', ghost: true },
                { default: () => (row.status === 'active' ? '禁用' : '启用') },
              ),
            default: () => `确认${row.status === 'active' ? '禁用' : '启用'}用户 ${row.username}？`,
          },
        ),
      ]),
  },
]

async function fetchCompanies() {
  if (!authStore.isBackOfficeScopeAll) return
  const result = await companyApi.list({ page: 1, page_size: 200 })
  companyOptions.value = result.list.map((item) => ({ label: item.company_name, value: item.id }))
}

async function fetchList() {
  loading.value = true
  try {
    const result = await userApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: filters.keyword || undefined,
      company_id: filters.company_id,
      role_code: filters.role_code || undefined,
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
  filters.company_id = null
  filters.role_code = null
  filters.status = null
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

function resetForm() {
  Object.assign(form, {
    username: '',
    password: '',
    email: '',
    phone: '',
    company_id: authStore.isBackOfficeScopeAll ? null : authStore.companyId,
    role_code: 'normal_user',
    status: 'active',
    trial_expires_at: '',
    temporary_expires_at: '',
    can_use_mobile: true,
    can_use_win: true,
  })
}

function openCreate() {
  editingId.value = null
  originalRole.value = null
  originalStatus.value = null
  resetForm()
  drawerVisible.value = true
}

async function openEdit(row: UserItem) {
  const detail = await userApi.detail(row.id)
  editingId.value = row.id
  originalRole.value = detail.role_code
  originalStatus.value = detail.status
  Object.assign(form, {
    username: detail.username,
    password: '',
    email: detail.email,
    phone: detail.phone,
    company_id: detail.company_id ?? null,
    role_code: detail.role_code,
    status: detail.status,
    trial_expires_at: detail.trial_expires_at || '',
    temporary_expires_at: detail.temporary_expires_at || '',
    can_use_mobile: detail.can_use_mobile,
    can_use_win: detail.can_use_win,
  })
  drawerVisible.value = true
}

function cleanPayload(): UserPayload {
  return {
    username: form.username,
    password: form.password || undefined,
    email: form.email || '',
    phone: form.phone || '',
    company_id: form.company_id ?? null,
    role_code: form.role_code,
    status: form.status,
    trial_expires_at: form.trial_expires_at || null,
    temporary_expires_at: form.temporary_expires_at || null,
    can_use_mobile: Boolean(form.can_use_mobile),
    can_use_win: Boolean(form.can_use_win),
  }
}

async function submitUser() {
  await formRef.value?.validate()
  if (editingId.value && form.role_code && form.role_code !== originalRole.value) {
    const confirmed = await confirmRoleChange(String(originalRole.value), form.role_code)
    if (!confirmed) return
  }
  saving.value = true
  try {
    if (!editingId.value) {
      const result = await userApi.create(cleanPayload())
      if (result.temporary_password) {
        dialog.success({
          title: '用户已创建',
          content: `临时密码：${result.temporary_password}`,
          positiveText: '知道了',
        })
      } else {
        message.success('用户已创建')
      }
    } else {
      const payload = cleanPayload()
      await userApi.update(editingId.value, payload)
      if (form.role_code && form.role_code !== originalRole.value) {
        await userApi.updateRole(editingId.value, form.role_code)
      }
      if (form.status && form.status !== originalStatus.value) {
        await userApi.updateStatus(editingId.value, form.status)
      }
      if (form.role_code === 'trial_user') {
        await userApi.updateTrial(editingId.value, form.trial_expires_at || null)
      }
      if (form.role_code === 'temporary_user') {
        await userApi.updateTemporary(editingId.value, form.temporary_expires_at || null)
      }
      message.success('用户已更新')
    }
    drawerVisible.value = false
    await fetchList()
  } finally {
    saving.value = false
  }
}

function confirmRoleChange(fromRole: string, toRole: string) {
  return new Promise<boolean>((resolve) => {
    dialog.warning({
      title: '确认角色转换',
      content: `用户角色将从 ${roleLabel(fromRole)} 调整为 ${roleLabel(toRole)}，该操作会改变后台和客户端权限。`,
      positiveText: '确认转换',
      negativeText: '取消',
      onPositiveClick: () => resolve(true),
      onNegativeClick: () => resolve(false),
      onClose: () => resolve(false),
    })
  })
}

function openResetPassword(row: UserItem) {
  resettingUserId.value = row.id
  passwordForm.password = ''
  passwordModalVisible.value = true
}

async function submitResetPassword() {
  if (!resettingUserId.value) return
  const result = await userApi.resetPassword(resettingUserId.value, passwordForm.password)
  if (result.temporary_password) {
    message.success(`临时密码：${result.temporary_password}`)
  } else {
    message.success('密码已重置')
  }
}

async function toggleStatus(row: UserItem) {
  await userApi.updateStatus(row.id, row.status === 'active' ? 'disabled' : 'active')
  message.success('用户状态已更新')
  await fetchList()
}

onMounted(async () => {
  await fetchCompanies()
  await fetchList()
})
</script>
