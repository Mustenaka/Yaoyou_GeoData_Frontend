<template>
  <div class="page-shell">
    <PageHeader title="用户管理" subtitle="分别维护账号总闸、账户有效期与 Mobile / Win 用户产品准入。">
      <n-button type="primary" @click="openCreate">新建用户</n-button>
    </PageHeader>

    <n-alert class="product-access-note" type="info" :bordered="false">
      “用户产品准入”只表示用户被分配使用 Mobile / Win 的资格；前提是其企业或个人主体已有有效的对应产品授权，且实际设备绑定与安全状态均通过。
    </n-alert>

    <div class="page-card toolbar">
      <n-input v-model:value="filters.keyword" clearable placeholder="账户名 / 实名 / 邮箱 / 手机" style="width: 260px" @keyup.enter="applyFilters" />
      <n-select v-if="authStore.isBackOfficeScopeAll" v-model:value="filters.company_id" clearable filterable remote :loading="companyOptionsLoading" :options="companyOptions" placeholder="搜索企业" style="width: 210px" @search="searchCompanies" />
      <n-select v-model:value="filters.role_code" clearable :options="availableRoleOptions" placeholder="角色" style="width: 150px" />
      <n-select v-model:value="filters.status" clearable :options="userStatusOptions" placeholder="状态" style="width: 130px" />
      <div class="toolbar__spacer" />
      <n-button @click="applyFilters">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
      <n-button :loading="exporting" @click="exportExcel">导出Excel</n-button>
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

    <n-drawer v-model:show="drawerVisible" width="min(560px, 100vw)">
      <n-drawer-content :title="editingId ? '编辑用户' : '新建用户'">
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
          <n-form-item label="账户名" path="username">
            <n-input :value="form.username" :disabled="Boolean(editingId)" @update:value="handleUsernameUpdate" />
          </n-form-item>
          <n-form-item label="实名">
            <n-input v-model:value="form.real_name" maxlength="64" />
          </n-form-item>
          <n-form-item v-if="!editingId" label="初始密码" path="password">
            <n-input
              :value="form.password"
              type="password"
              show-password-on="click"
              :placeholder="passwordPolicyText"
              @update:value="handleCreatePasswordUpdate"
            />
          </n-form-item>
          <n-grid responsive="screen" cols="1 s:2" :x-gap="12">
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
            <n-select v-model:value="form.company_id" clearable filterable remote :loading="companyOptionsLoading" :options="companyOptions" placeholder="搜索企业" @search="searchCompanies" />
          </n-form-item>
          <n-grid responsive="screen" cols="1 s:2" :x-gap="12">
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
          <n-form-item label="账户有效期">
            <div class="validity-field">
              <n-date-picker v-model:value="form.valid_until_value" type="datetime" clearable :disabled="form.valid_until_permanent" />
              <n-checkbox v-model:checked="form.valid_until_permanent" @update:checked="handleValidityPermanentUpdate">长期有效</n-checkbox>
            </div>
          </n-form-item>
          <n-form-item label="用户产品准入">
            <div class="product-access-field">
              <div class="product-access-editor">
                <n-checkbox v-model:checked="form.can_use_mobile" @update:checked="markProductAccessTouched('mobile')">允许使用 Mobile</n-checkbox>
                <n-tag size="small" :type="editAccessTagType('mobile')">{{ editAccessHint('mobile') }}</n-tag>
              </div>
              <div class="product-access-editor">
                <n-checkbox v-model:checked="form.can_use_win" @update:checked="markProductAccessTouched('win')">允许使用 Win</n-checkbox>
                <n-tag size="small" :type="editAccessTagType('win')">{{ editAccessHint('win') }}</n-tag>
              </div>
              <n-alert :type="hasPendingRegrant ? 'warning' : 'info'" :bordered="false">
                {{ hasPendingRegrant
                  ? '存在旧权益代次准入：对应复选框默认不勾选；主动勾选并保存会显式授予当前权益代次。'
                  : '最终可用仍取决于主体产品授权、当前权益代次、设备绑定与设备安全状态。legacy_shadow 下这里展示旧模型开关并明确标注，不冒充 V2 权威结果。' }}
              </n-alert>
            </div>
          </n-form-item>
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
      <n-space vertical>
        <n-input
          :value="passwordForm.password"
          type="password"
          show-password-on="click"
          :placeholder="passwordPolicyText"
          :status="resetPasswordPolicyError ? 'error' : undefined"
          @update:value="handleResetPasswordUpdate"
        />
        <n-text v-if="resetPasswordPolicyError" type="error">{{ resetPasswordPolicyError }}</n-text>
      </n-space>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DataTableColumns, FormInst, FormRules, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type { ProductCode, RoleCode, UserItem, UserPayload, UserProductAccessSummary, UserStatus } from '@/types/api'
import { effectiveStatusLabel, roleLabel, roleOptions, userStatusLabel, userStatusOptions } from '@/utils/labels'
import { addMonthsDatePickerValue, datePickerISOString, datePickerValue, formatDateTime, formatValidityDateTime } from '@/utils/format'
import { ensureXlsxBlob, saveBlob, timestampedXlsxFilename } from '@/utils/download'
import { passwordPolicyText, stripSpaces, validateOptionalPasswordInput, validateUsernameInput } from '@/utils/accountPolicy'
import { pageList, queryValue } from '@/utils/query'
import { fetchCompanySelectOptions, mergeSelectedOption } from '@/utils/adminOptions'

const authStore = useAuthStore()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const rows = ref<UserItem[]>([])
const drawerVisible = ref(false)
const editingId = ref<number | null>(null)
const originalRole = ref<RoleCode | null>(null)
const originalStatus = ref<UserStatus | null>(null)
const formRef = ref<FormInst | null>(null)
const companyOptions = ref<SelectOption[]>([])
const companyOptionsLoading = ref(false)
const passwordModalVisible = ref(false)
const resettingUserId = ref<number | null>(null)
const editingAccess = reactive<{ mobile: UserProductAccessSummary | null; win: UserProductAccessSummary | null }>({ mobile: null, win: null })
const productAccessTouched = reactive({ mobile: false, win: false })

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

type UserForm = Omit<UserPayload, 'valid_until'> & {
  valid_until_value: number | null
  valid_until_permanent: boolean
}
type TagType = 'default' | 'success' | 'warning' | 'error' | 'info'

const form = reactive<UserForm>({
  username: '',
  real_name: '',
  password: '',
  email: '',
  phone: '',
  company_id: null,
  role_code: 'normal_user',
  status: 'active',
  valid_until_value: null,
  valid_until_permanent: true,
  can_use_mobile: false,
  can_use_win: false,
})

const passwordForm = reactive({ password: '' })
const resetPasswordPolicyError = computed(() => validateOptionalPasswordInput(passwordForm.password))
const hasPendingRegrant = computed(() => Boolean(editingAccess.mobile?.needs_regrant || editingAccess.win?.needs_regrant))

const superadminUserPageRoles: RoleCode[] = ['admin', 'enterprise_admin', 'normal_user', 'temporary_user']
const adminUserPageRoles: RoleCode[] = ['enterprise_admin', 'normal_user', 'temporary_user']
const enterpriseUserPageRoles: RoleCode[] = ['normal_user', 'temporary_user']

const assignableRoleValues = computed<RoleCode[]>(() => {
  if (authStore.isSuperAdmin) return superadminUserPageRoles
  if (authStore.isAdmin) return adminUserPageRoles
  return enterpriseUserPageRoles
})

const availableRoleOptions = computed(() => roleOptions.filter((item) => assignableRoleValues.value.includes(item.value)))

const rules: FormRules = {
  username: [
    { required: true, message: '请输入账户名', trigger: ['blur', 'input'] },
    {
      validator: () => {
        const error = validateUsernameInput(form.username ?? '')
        return error ? new Error(error) : true
      },
      trigger: ['blur', 'input'],
    },
  ],
  password: [
    {
      validator: () => {
        const error = validateOptionalPasswordInput(form.password)
        return error ? new Error(error) : true
      },
      trigger: ['blur', 'input'],
    },
  ],
}

const columns: DataTableColumns<UserItem> = [
  { title: '账户名', key: 'username', minWidth: 150, render: (row) => h('span', { class: 'mono' }, row.username) },
  { title: '实名', key: 'real_name', minWidth: 120, render: (row) => row.real_name || '-' },
  { title: '企业', key: 'company_name', minWidth: 150, render: (row) => row.company_name || '-' },
  { title: '角色', key: 'role_code', width: 120, render: (row) => roleLabel(row.role_code) },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) =>
      h(NTag, { type: row.status === 'active' ? 'success' : 'warning', round: true }, { default: () => userStatusLabel(row.status) }),
  },
  { title: '用户产品准入', key: 'products', width: 200, render: (row) => renderProductAccess(row) },
  { title: '有效期', key: 'valid_until', width: 170, render: (row) => formatValidity(row.valid_until) },
  { title: '最近登录', key: 'last_login_at', width: 170, render: (row) => formatDateTime(row.last_login_at) },
  {
    title: '操作',
    key: 'actions',
    width: 400,
    fixed: 'right',
    render: (row) => {
      const actions = [
        h(NButton, { size: 'small', secondary: true, onClick: () => goProductEntitlements(row) }, { default: () => '主体产品授权' }),
      ]
      if (canManageRow(row)) {
        actions.unshift(
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
        )
      }
      return h('div', { class: 'table-actions' }, actions)
    },
  },
]

async function searchCompanies(keyword = '') {
  if (!authStore.isBackOfficeScopeAll) return
  companyOptionsLoading.value = true
  const previous = companyOptions.value
  try {
    let next = await fetchCompanySelectOptions(keyword)
    for (const id of [filters.company_id, form.company_id]) {
      if (!id) continue
      next = mergeSelectedOption(next, previous.find((option) => option.value === id) || { label: `企业 #${id}`, value: id })
    }
    companyOptions.value = next
  } finally {
    companyOptionsLoading.value = false
  }
}

async function fetchList() {
  loading.value = true
  try {
    const result = await userApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: queryValue(filters.keyword),
      company_id: queryValue(filters.company_id),
      role_code: queryValue(filters.role_code),
      status: queryValue(filters.status),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.page = 1
  fetchList()
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

async function exportExcel() {
  exporting.value = true
  try {
    const blob = await userApi.exportXlsx({
      keyword: queryValue(filters.keyword),
      company_id: queryValue(filters.company_id),
      role_code: queryValue(filters.role_code),
      status: queryValue(filters.status),
    })
    ensureXlsxBlob(blob)
    saveBlob(blob, timestampedXlsxFilename('users'))
    message.success('导出Excel成功')
  } catch {
    message.error('导出Excel失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

function handleUsernameUpdate(value: string) {
  form.username = stripSpaces(value)
}

function handleCreatePasswordUpdate(value: string) {
  form.password = stripSpaces(value)
}

function handleResetPasswordUpdate(value: string) {
  passwordForm.password = stripSpaces(value)
}

function handleValidityPermanentUpdate(checked: boolean) {
  if (checked) {
    form.valid_until_value = null
  } else if (!form.valid_until_value) {
    form.valid_until_value = addMonthsDatePickerValue()
  }
}

function formatValidity(value?: string | null) {
  return formatValidityDateTime(value)
}

function renderProductAccess(row: UserItem) {
  if (row.role_code === 'superadmin' || row.role_code === 'admin') {
    return h(NTag, { size: 'small', type: 'info', round: true }, { default: () => '平台特权角色 · 不需要产品准入' })
  }
  return h('div', { class: 'product-access-tags' }, [
    renderProductAccessTag(row, 'mobile'),
    renderProductAccessTag(row, 'win'),
  ])
}

function productAccessSummary(row: UserItem, product: ProductCode) {
  return product === 'mobile' ? row.mobile_product_access : row.win_product_access
}

function legacyProductEnabled(row: UserItem, product: ProductCode) {
  return product === 'mobile' ? row.can_use_mobile : row.can_use_win
}

function isV2Source(source?: string) {
  return source === 'v2_dual_write' || source === 'v2_only'
}

function productEffectiveTagType(status?: string): TagType {
  if (!status || status === 'usable') return 'success'
  if (status.includes('expired') || status.includes('revoked') || status.includes('disabled') || status.includes('blocked')) return 'error'
  if (status.includes('suspended') || status.includes('not_started') || status.includes('pending')) return 'warning'
  return 'default'
}

function renderProductAccessTag(row: UserItem, product: ProductCode) {
  const summary = productAccessSummary(row, product)
  const productName = product === 'mobile' ? 'Mobile' : 'Win'
  let label = `${productName} 准入未确认`
  let type: TagType = 'default'
  if (summary && isV2Source(summary.source_of_truth)) {
    if (summary.needs_regrant) {
      label = `${productName} 旧代次需重授 ${summary.access_generation || '-'}→${summary.current_entitlement_generation || '-'}`
      type = 'warning'
    } else if (summary.current_enabled && (!summary.effective_status || summary.effective_status === 'usable')) {
      label = `${productName} 已准入 · 第 ${summary.current_entitlement_generation || summary.access_generation} 代`
      type = 'success'
    } else if (summary.current_enabled) {
      label = `${productName} 已准入 · ${effectiveStatusLabel(summary.effective_status)}`
      type = productEffectiveTagType(summary.effective_status)
    } else {
      label = `${productName} ${effectiveStatusLabel(summary.effective_status)}`
      type = productEffectiveTagType(summary.effective_status)
    }
  } else if (summary?.source_of_truth === 'legacy_shadow') {
    const legacyEnabled = legacyProductEnabled(row, product)
    label = summary.needs_regrant
      ? `${productName} 旧模型允许 / V2 待重授`
      : `${productName} 旧模型${legacyEnabled ? '允许' : '关闭'} / V2 影子`
    type = summary.needs_regrant ? 'warning' : legacyEnabled ? 'info' : 'default'
  } else {
    label = `${productName} 兼容旧字段${legacyProductEnabled(row, product) ? '允许' : '关闭'} / V2 未确认`
    type = legacyProductEnabled(row, product) ? 'info' : 'default'
  }
  return h(NTag, { size: 'small', type, round: true }, { default: () => label })
}

function editAccessSummary(product: ProductCode) {
  return product === 'mobile' ? editingAccess.mobile : editingAccess.win
}

function editAccessHint(product: ProductCode) {
  const summary = editAccessSummary(product)
  if (!editingId.value) return '新用户：保存后按主体当前权益创建准入'
  if (!summary) return '兼容旧字段；V2 准入摘要未返回'
  if (summary.needs_regrant) return `旧代次 ${summary.access_generation || '-'}，当前第 ${summary.current_entitlement_generation || '-'} 代；勾选保存可重授`
  if (summary.source_of_truth === 'legacy_shadow') return `旧模型权威；V2 影子${summary.current_enabled ? '已对齐' : '未开通'}`
  if (summary.current_enabled && (!summary.effective_status || summary.effective_status === 'usable')) return `当前第 ${summary.current_entitlement_generation || summary.access_generation} 代已准入且产品当前可用`
  if (summary.current_enabled) return `用户已准入，但当前${effectiveStatusLabel(summary.effective_status)}`
  return effectiveStatusLabel(summary.effective_status)
}

function editAccessTagType(product: ProductCode): TagType {
  const summary = editAccessSummary(product)
  if (summary?.needs_regrant) return 'warning'
  if (summary?.source_of_truth === 'legacy_shadow') return 'info'
  if (summary?.current_enabled || summary?.effective_status) return productEffectiveTagType(summary.effective_status)
  return 'default'
}

function markProductAccessTouched(product: ProductCode) {
  productAccessTouched[product] = true
}

function goProductEntitlements(row: UserItem) {
  router.push({
    name: 'licenses',
    query: row.company_id ? { company_id: String(row.company_id) } : { owner_user_id: String(row.id) },
  })
}

function currentValidUntilPayload() {
  return form.valid_until_permanent ? null : datePickerISOString(form.valid_until_value)
}

function resetForm() {
  editingAccess.mobile = null
  editingAccess.win = null
  productAccessTouched.mobile = false
  productAccessTouched.win = false
  Object.assign(form, {
    username: '',
    real_name: '',
    password: '',
    email: '',
    phone: '',
    company_id: authStore.isBackOfficeScopeAll ? null : authStore.companyId,
    role_code: 'normal_user',
    status: 'active',
    valid_until_value: null,
    valid_until_permanent: true,
    can_use_mobile: false,
    can_use_win: false,
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
  if (!canManageRow(row)) {
    message.warning('当前角色不可编辑该账号')
    return
  }
  const detail = await userApi.detail(row.id)
  editingId.value = row.id
  originalRole.value = detail.role_code
  originalStatus.value = detail.status
  editingAccess.mobile = detail.mobile_product_access || null
  editingAccess.win = detail.win_product_access || null
  const mobileSelection = detail.mobile_product_access
    ? detail.mobile_product_access.current_enabled === true
    : detail.can_use_mobile
  const winSelection = detail.win_product_access
    ? detail.win_product_access.current_enabled === true
    : detail.can_use_win
  productAccessTouched.mobile = false
  productAccessTouched.win = false
  Object.assign(form, {
    username: detail.username,
    real_name: detail.real_name || '',
    password: '',
    email: detail.email,
    phone: detail.phone,
    company_id: detail.company_id ?? null,
    role_code: detail.role_code,
    status: detail.status,
    valid_until_value: datePickerValue(detail.valid_until),
    valid_until_permanent: !detail.valid_until,
    can_use_mobile: mobileSelection,
    can_use_win: winSelection,
  })
  if (detail.company_id) {
    companyOptions.value = mergeSelectedOption(companyOptions.value, {
      label: detail.company_name || `企业 #${detail.company_id}`,
      value: detail.company_id,
    })
  }
  drawerVisible.value = true
}

function cleanPayload(includeValidity: boolean): UserPayload {
  const payload: UserPayload = {
    username: form.username,
    real_name: form.real_name || '',
    password: form.password || undefined,
    email: form.email || '',
    phone: form.phone || '',
    company_id: form.company_id ?? null,
    role_code: form.role_code,
    status: form.status,
  }
  if (!editingId.value || productAccessTouched.mobile) {
    payload.can_use_mobile = Boolean(form.can_use_mobile)
  }
  if (!editingId.value || productAccessTouched.win) {
    payload.can_use_win = Boolean(form.can_use_win)
  }
  if (includeValidity) {
    payload.valid_until = currentValidUntilPayload()
  }
  return payload
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
      const result = await userApi.create(cleanPayload(true))
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
      const payload = cleanPayload(false)
      await userApi.update(editingId.value, payload)
      if (form.role_code && form.role_code !== originalRole.value) {
        await userApi.updateRole(editingId.value, form.role_code)
      }
      if (form.status && form.status !== originalStatus.value) {
        await userApi.updateStatus(editingId.value, form.status)
      }
      await userApi.updateValidity(editingId.value, currentValidUntilPayload())
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
  if (!canManageRow(row)) {
    message.warning('当前角色不可重置该账号密码')
    return
  }
  resettingUserId.value = row.id
  passwordForm.password = ''
  passwordModalVisible.value = true
}

async function submitResetPassword() {
  if (!resettingUserId.value) return
  const policyError = validateOptionalPasswordInput(passwordForm.password)
  if (policyError) {
    message.error(policyError)
    return
  }
  const result = await userApi.resetPassword(resettingUserId.value, passwordForm.password)
  if (result.temporary_password) {
    message.success(`临时密码：${result.temporary_password}`)
  } else {
    message.success('密码已重置')
  }
}

async function toggleStatus(row: UserItem) {
  if (!canManageRow(row)) {
    message.warning('当前角色不可修改该账号状态')
    return
  }
  await userApi.updateStatus(row.id, row.status === 'active' ? 'disabled' : 'active')
  message.success('用户状态已更新')
  await fetchList()
}

function canManageRow(row: UserItem) {
  return assignableRoleValues.value.includes(row.role_code)
}

onMounted(async () => {
  await searchCompanies()
  await fetchList()
})

watch(
  () => form.role_code,
  (roleCode) => {
    if (!editingId.value && roleCode === 'temporary_user' && form.valid_until_permanent) {
      form.valid_until_permanent = false
      form.valid_until_value = addMonthsDatePickerValue()
    }
  },
)
</script>

<style scoped>
.validity-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
}

.product-access-note {
  margin-bottom: 16px;
}

.product-access-field {
  display: grid;
  gap: 12px;
  width: 100%;
}

.product-access-editor {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.product-access-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 560px) {
  .validity-field {
    grid-template-columns: 1fr;
  }
}
</style>
