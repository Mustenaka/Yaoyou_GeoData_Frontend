<template>
  <div class="page-shell">
    <PageHeader title="注册申请" subtitle="审核公开提交的企业与用户开通申请。" />

    <div class="page-card toolbar">
      <n-input v-model:value="filters.keyword" clearable placeholder="单位 / 账户名 / 实名 / 手机 / 邮箱" style="width: 320px" @keyup.enter="fetchList" />
      <n-select v-model:value="filters.status" clearable :options="statusOptions" placeholder="状态" style="width: 140px" />
      <n-select v-model:value="filters.source_channel" clearable :options="sourceOptions" placeholder="来源" style="width: 150px" />
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
        scroll-x="1320"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="detailVisible" width="600">
      <n-drawer-content title="申请详情">
        <n-descriptions v-if="selected" label-placement="left" :column="1" bordered>
          <n-descriptions-item label="申请 ID">{{ selected.id }}</n-descriptions-item>
          <n-descriptions-item label="类型">{{ appTypeLabel(selected.app_type) }}</n-descriptions-item>
          <n-descriptions-item label="来源">{{ sourceLabel(selected.source_channel) }}</n-descriptions-item>
          <n-descriptions-item label="账户名">{{ selected.desired_username || '-' }}</n-descriptions-item>
          <n-descriptions-item label="单位">{{ applicationCompanyLabel(selected) }}</n-descriptions-item>
          <n-descriptions-item label="无企业">{{ selected.no_company ? '是' : '否' }}</n-descriptions-item>
          <n-descriptions-item label="管理人">{{ managerLabel(selected) }}</n-descriptions-item>
          <n-descriptions-item label="姓名/实名">{{ selected.contact_name }}</n-descriptions-item>
          <n-descriptions-item label="手机">{{ selected.phone }}</n-descriptions-item>
          <n-descriptions-item label="邮箱">{{ selected.email }}</n-descriptions-item>
          <n-descriptions-item label="产品">{{ productLabel(selected.requested_product) }}</n-descriptions-item>
          <n-descriptions-item label="角色">{{ roleLabel(selected.requested_role) }}</n-descriptions-item>
          <n-descriptions-item label="账户有效期">{{ formatValidity(selected.valid_until) }}</n-descriptions-item>
          <n-descriptions-item label="状态">{{ statusLabel(selected.status) }}</n-descriptions-item>
          <n-descriptions-item label="创建账号">{{ createdAccountLabel(selected) }}</n-descriptions-item>
          <n-descriptions-item label="提交时间">{{ formatDateTime(selected.created_at) }}</n-descriptions-item>
          <n-descriptions-item label="处理时间">{{ formatDateTime(selected.handled_at) }}</n-descriptions-item>
          <n-descriptions-item label="处理备注">{{ selected.handle_note || '-' }}</n-descriptions-item>
          <n-descriptions-item label="说明">{{ selected.reason || '-' }}</n-descriptions-item>
        </n-descriptions>
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="editVisible" preset="card" title="编辑申请" :style="modalStyle('680px')">
      <n-form :model="editForm" label-placement="top">
        <n-form-item label="账户名">
          <n-input v-model:value="editForm.desired_username" maxlength="64" placeholder="用于登录的账户名，不可包含空格" />
        </n-form-item>

        <n-form-item v-if="editTarget?.app_type === 'enterprise'" label="单位名称">
          <n-input v-model:value="editForm.company_name" maxlength="128" />
        </n-form-item>

        <template v-if="editTarget?.app_type === 'user'">
          <n-form-item label="企业归属">
            <n-radio-group v-model:value="editCompanyMode" @update:value="handleEditCompanyMode">
              <n-radio value="company">分配企业</n-radio>
              <n-radio v-if="auth.isBackOfficeScopeAll" value="none">无企业</n-radio>
            </n-radio-group>
          </n-form-item>
          <n-form-item v-if="editCompanyMode === 'company'" label="目标企业">
            <n-select v-model:value="editForm.target_company_id" filterable clearable :options="companyOptions" @update:value="loadManagersForEdit" />
          </n-form-item>
          <n-form-item v-if="editCompanyMode === 'company'" label="管理人">
            <n-select v-model:value="editForm.manager_user_id" filterable clearable :options="managerOptions" placeholder="企业级管理，不指定具体管理员" />
          </n-form-item>
          <n-form-item label="申请角色">
            <n-select v-model:value="editForm.requested_role" :options="userRoleOptions" @update:value="handleEditRoleUpdate" />
          </n-form-item>
          <n-form-item v-if="editForm.requested_role === 'temporary_user'" label="授权时长">
            <div class="validity-field">
              <n-date-picker v-model:value="editForm.valid_until_value" type="datetime" clearable :disabled="editForm.valid_until_permanent" />
              <n-checkbox v-model:checked="editForm.valid_until_permanent" @update:checked="handleEditPermanentUpdate">长期有效</n-checkbox>
            </div>
          </n-form-item>
        </template>

        <div class="form-grid">
          <n-form-item label="姓名/实名">
            <n-input v-model:value="editForm.contact_name" maxlength="64" />
          </n-form-item>
          <n-form-item label="手机">
            <n-input v-model:value="editForm.phone" maxlength="32" />
          </n-form-item>
        </div>
        <n-form-item label="邮箱">
          <n-input v-model:value="editForm.email" maxlength="128" />
        </n-form-item>
        <n-form-item label="产品">
          <n-radio-group v-model:value="editForm.requested_product">
            <n-radio-button value="both">Mobile + Win</n-radio-button>
            <n-radio-button value="mobile">Mobile</n-radio-button>
            <n-radio-button value="win">Win</n-radio-button>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="申请说明">
          <n-input v-model:value="editForm.reason" type="textarea" maxlength="1000" show-count />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="editVisible = false">取消</n-button>
          <n-button type="primary" :loading="submittingEdit" @click="submitEdit">保存</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="approveVisible" preset="card" title="审批配置" :style="modalStyle('920px')">
      <n-form v-if="approveTarget" label-placement="top">
        <template v-if="approveTarget.app_type === 'enterprise'">
          <n-form-item label="账号数量">
            <n-input-number v-model:value="approveForm.account_count" :min="1" :max="50" @update:value="syncEnterpriseAccounts" />
          </n-form-item>
          <div class="account-list">
            <div v-for="(account, index) in enterpriseAccounts" :key="index" class="account-row">
              <div class="account-role">
                <n-tag :type="index === 0 ? 'success' : 'default'">{{ index === 0 ? '企业管理员' : '普通用户' }}</n-tag>
              </div>
              <div class="account-cell">
                <n-checkbox v-model:checked="account.username_manual">自填账户名</n-checkbox>
                <n-input v-if="account.username_manual" v-model:value="account.username" size="small" placeholder="默认使用申请账户名，留空则自动生成" />
              </div>
              <div class="account-cell">
                <n-checkbox v-model:checked="account.password_manual">自填密码</n-checkbox>
                <n-input v-if="account.password_manual" v-model:value="account.password" size="small" type="password" show-password-on="click" placeholder="8-16 位，含大小写和数字" />
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <n-form-item label="企业归属">
            <n-radio-group v-model:value="approveCompanyMode" @update:value="handleApproveCompanyMode">
              <n-radio value="company">分配企业</n-radio>
              <n-radio v-if="auth.isBackOfficeScopeAll" value="none">无企业</n-radio>
            </n-radio-group>
          </n-form-item>
          <n-form-item v-if="approveCompanyMode === 'company'" label="目标企业">
            <n-select v-model:value="approveForm.target_company_id" filterable clearable :options="companyOptions" @update:value="loadManagersForApprove" />
          </n-form-item>
          <n-form-item v-if="approveCompanyMode === 'company'" label="管理人">
            <n-select v-model:value="approveForm.manager_user_id" filterable clearable :options="managerOptions" placeholder="企业级管理，不指定具体管理员" />
          </n-form-item>
          <n-form-item label="创建角色">
            <n-select v-model:value="approveForm.requested_role" :options="userRoleOptions" @update:value="handleApproveRoleUpdate" />
          </n-form-item>
          <n-form-item v-if="approveForm.requested_role === 'temporary_user'" label="授权时长">
            <div class="validity-field">
              <n-date-picker v-model:value="userAccount.valid_until_value" type="datetime" clearable :disabled="userAccount.valid_until_permanent" />
              <n-checkbox v-model:checked="userAccount.valid_until_permanent" @update:checked="handleApprovePermanentUpdate">长期有效</n-checkbox>
            </div>
          </n-form-item>
          <div class="account-row account-row--single">
            <div class="account-role">
              <n-tag>{{ roleLabel(approveForm.requested_role) }}</n-tag>
            </div>
            <div class="account-cell">
              <n-checkbox v-model:checked="userAccount.username_manual">自填账户名</n-checkbox>
              <n-input v-if="userAccount.username_manual" v-model:value="userAccount.username" size="small" placeholder="默认使用申请账户名，留空则自动生成" />
            </div>
            <div class="account-cell">
              <n-checkbox v-model:checked="userAccount.password_manual">自填密码</n-checkbox>
              <n-input v-if="userAccount.password_manual" v-model:value="userAccount.password" size="small" type="password" show-password-on="click" placeholder="8-16 位，含大小写和数字" />
            </div>
          </div>
        </template>

        <n-form-item label="审批备注">
          <n-input v-model:value="approveForm.note" type="textarea" maxlength="500" show-count />
        </n-form-item>
      </n-form>
      <template #footer>
        <n-space justify="end">
          <n-button @click="approveVisible = false">取消</n-button>
          <n-button type="primary" :loading="submittingApprove" @click="submitApprove">通过</n-button>
        </n-space>
      </template>
    </n-modal>

    <n-modal v-model:show="rejectVisible" preset="dialog" title="拒绝申请" positive-text="拒绝" negative-text="取消" @positive-click="submitReject">
      <n-input v-model:value="rejectNote" type="textarea" maxlength="500" show-count placeholder="请输入拒绝原因" />
    </n-modal>

    <n-modal v-model:show="passwordVisible" preset="card" title="审批通过" :style="modalStyle('760px')">
      <n-space v-if="approveResult" vertical>
        <n-alert type="success">账号已创建，临时口令仅本次展示。</n-alert>
        <n-table :single-line="false" size="small">
          <thead>
            <tr>
              <th>账户名</th>
              <th>实名</th>
              <th>角色</th>
              <th>临时口令</th>
              <th>首登改密</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in approveCreatedUsers" :key="item.user.id">
              <td>{{ item.user.username }}</td>
              <td>{{ item.user.real_name || '-' }}</td>
              <td>{{ roleLabel(item.user.role_code) }}</td>
              <td><span class="mono">{{ item.temporary_password || '-' }}</span></td>
              <td>{{ credentialMustChangePassword(item) ? '是' : '否' }}</td>
            </tr>
          </tbody>
        </n-table>
      </n-space>
      <template #footer>
        <n-space justify="end">
          <n-button :loading="copyingCredentials" :disabled="!approveCreatedUsers.length" @click="copyCredentials">复制口令</n-button>
          <n-button :loading="exportingCredentials" :disabled="!approveCreatedUsers.length" @click="exportCredentialsExcel">导出Excel</n-button>
          <n-button type="primary" @click="passwordVisible = false">关闭</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { NButton, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { registrationApi, type RegistrationCredentialExportAccount } from '@/api/registration'
import { userApi } from '@/api/user'
import { useAuthStore } from '@/stores/auth'
import type {
  CompanyItem,
  RegistrationApplication,
  RegistrationApplicationUpdatePayload,
  RegistrationApprovePayload,
  RegistrationApproveResponse,
  RegistrationCreatedUserResponse,
  RegistrationProduct,
  RegistrationSourceChannel,
  RegistrationStatus,
  RoleCode,
  UserItem,
} from '@/types/api'
import { addMonthsDatePickerValue, datePickerISOString, datePickerValue, formatDateTime } from '@/utils/format'
import { roleLabel } from '@/utils/labels'
import { pageList, queryValue } from '@/utils/query'
import { ensureXlsxBlob, saveBlob, timestampedXlsxFilename } from '@/utils/download'

type AccountForm = {
  username_manual: boolean
  username: string
  password_manual: boolean
  password: string
  valid_until_value: number | null
  valid_until_permanent: boolean
}

const message = useMessage()
const auth = useAuthStore()
const loading = ref(false)
const rows = ref<RegistrationApplication[]>([])
const selected = ref<RegistrationApplication | null>(null)
const detailVisible = ref(false)
const rejectVisible = ref(false)
const rejectingId = ref<number | null>(null)
const rejectNote = ref('')
const passwordVisible = ref(false)
const approveResult = ref<RegistrationApproveResponse | null>(null)
const exportingCredentials = ref(false)
const copyingCredentials = ref(false)

const editVisible = ref(false)
const editTarget = ref<RegistrationApplication | null>(null)
const editCompanyMode = ref<'company' | 'none'>('company')
const submittingEdit = ref(false)

const approveVisible = ref(false)
const approveTarget = ref<RegistrationApplication | null>(null)
const approveCompanyMode = ref<'company' | 'none'>('company')
const submittingApprove = ref(false)

const companies = ref<CompanyItem[]>([])
const managers = ref<UserItem[]>([])
const enterpriseAccounts = ref<AccountForm[]>([])
const userAccount = reactive<AccountForm>(emptyAccount())

const filters = reactive({
  keyword: '',
  status: 'pending' as RegistrationStatus | null,
  source_channel: null as RegistrationSourceChannel | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const editForm = reactive({
  desired_username: '',
  company_name: '',
  contact_name: '',
  phone: '',
  email: '',
  target_company_id: null as number | null,
  no_company: false,
  manager_user_id: null as number | null,
  requested_product: 'both' as RegistrationProduct,
  requested_role: 'normal_user' as RoleCode,
  valid_until_value: null as number | null,
  valid_until_permanent: true,
  reason: '',
})

const approveForm = reactive({
  note: '',
  account_count: 1,
  target_company_id: null as number | null,
  no_company: false,
  manager_user_id: null as number | null,
  requested_role: 'normal_user' as RoleCode,
})

const statusOptions: Array<{ label: string; value: RegistrationStatus }> = [
  { label: '待审', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

const sourceOptions: Array<{ label: string; value: RegistrationSourceChannel }> = [
  { label: '官网首页', value: 'official_site' },
  { label: '后台申请页', value: 'admin_apply_page' },
  { label: '移动端', value: 'mobile_app' },
]

const userRoleOptions: Array<{ label: string; value: RoleCode }> = [
  { label: '普通用户', value: 'normal_user' },
  { label: '临时用户', value: 'temporary_user' },
]

const companyOptions = computed(() => companies.value.map((item) => ({ label: `${item.company_name} #${item.id}`, value: item.id })))
const managerOptions = computed(() => managers.value.map((item) => ({ label: `${item.username} #${item.id}`, value: item.id })))
const approveCreatedUsers = computed<RegistrationCreatedUserResponse[]>(() => {
  if (!approveResult.value) return []
  if (approveResult.value.created_users?.length) return approveResult.value.created_users
  if (approveResult.value.user) {
    return [{ user: approveResult.value.user, temporary_password: approveResult.value.temporary_password }]
  }
  return []
})

const columns: DataTableColumns<RegistrationApplication> = [
  { title: 'ID', key: 'id', width: 80 },
  { title: '类型', key: 'app_type', width: 90, render: (row) => appTypeLabel(row.app_type) },
  { title: '来源', key: 'source_channel', width: 110, render: (row) => sourceLabel(row.source_channel) },
  { title: '账户名', key: 'desired_username', minWidth: 130, render: (row) => h('span', { class: 'mono' }, row.desired_username || '-') },
  { title: '单位', key: 'company_name', minWidth: 190, render: (row) => applicationCompanyLabel(row) },
  { title: '姓名/实名', key: 'contact_name', width: 120 },
  { title: '手机', key: 'phone', width: 132 },
  { title: '产品', key: 'requested_product', width: 112, render: (row) => productLabel(row.requested_product) },
  { title: '账号', key: 'created_user_count', width: 90, render: (row) => createdAccountLabel(row) },
  {
    title: '状态',
    key: 'status',
    width: 96,
    render: (row) => h(NTag, { type: statusType(row.status), round: true }, { default: () => statusLabel(row.status) }),
  },
  { title: '提交时间', key: 'created_at', width: 168, render: (row) => formatDateTime(row.created_at) },
  {
    title: '操作',
    key: 'actions',
    width: 280,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
        row.status === 'pending' ? h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '编辑' }) : null,
        row.status === 'pending' ? h(NButton, { size: 'small', type: 'primary', onClick: () => openApprove(row) }, { default: () => '通过' }) : null,
        row.status === 'pending' ? h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => openReject(row) }, { default: () => '拒绝' }) : null,
      ]),
  },
]

function modalStyle(width: string) {
  return { width: `min(${width}, calc(100vw - 32px))` }
}

function emptyAccount(): AccountForm {
  return { username_manual: false, username: '', password_manual: false, password: '', valid_until_value: null, valid_until_permanent: true }
}

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

function sourceLabel(source?: string) {
  if (source === 'mobile_app') return '移动端'
  if (source === 'official_site') return '官网首页'
  if (source === 'admin_apply_page' || !source) return '后台申请页'
  return source
}

function productLabel(product?: string) {
  if (product === 'both') return 'Mobile + Win'
  if (product === 'mobile') return 'Mobile'
  if (product === 'win') return 'Win'
  return product || '-'
}

function formatValidity(value?: string | null) {
  return value ? formatDateTime(value) : '长期有效'
}

function validityPayload(permanent: boolean, value: number | null) {
  return permanent ? null : datePickerISOString(value)
}

function ensureDefaultTemporaryValidity(target: { valid_until_value: number | null; valid_until_permanent: boolean }) {
  if (target.valid_until_permanent) {
    target.valid_until_permanent = false
    target.valid_until_value = addMonthsDatePickerValue()
  }
}

function applicationCompanyLabel(row: RegistrationApplication) {
  if (row.app_type === 'enterprise') return row.company_name || '-'
  if (row.no_company) return '无企业'
  const company = companies.value.find((item) => item.id === row.target_company_id)
  return company?.company_name || `企业 #${row.target_company_id ?? '-'}`
}

function managerLabel(row: RegistrationApplication) {
  if (row.no_company) return '-'
  if (row.manager_username) return `${row.manager_username} #${row.manager_user_id}`
  return row.manager_user_id ? `用户 #${row.manager_user_id}` : '企业级管理'
}

function createdAccountLabel(row: RegistrationApplication) {
  const count = row.created_user_count || (row.created_account_user_id ? 1 : 0)
  return count ? `${count} 个` : '-'
}

async function fetchList() {
  loading.value = true
  try {
    const result = await registrationApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: queryValue(filters.keyword),
      status: queryValue(filters.status),
      source_channel: queryValue(filters.source_channel),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

async function loadCompanies() {
  const result = await companyApi.list({ page: 1, page_size: 100 })
  companies.value = pageList(result.list)
}

async function loadManagers(companyId: number | null) {
  managers.value = []
  if (!companyId || !auth.isBackOfficeScopeAll) return
  try {
    const result = await userApi.list({ page: 1, page_size: 100, company_id: companyId, role_code: 'enterprise_admin' })
    managers.value = pageList(result.list)
  } catch {
    managers.value = []
  }
}

function resetFilters() {
  filters.keyword = ''
  filters.status = 'pending'
  filters.source_channel = null
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

async function openEdit(row: RegistrationApplication) {
  editTarget.value = await registrationApi.detail(row.id)
  if (!editTarget.value) return
  Object.assign(editForm, {
    company_name: editTarget.value.company_name || '',
    desired_username: editTarget.value.desired_username || '',
    contact_name: editTarget.value.contact_name || '',
    phone: editTarget.value.phone || '',
    email: editTarget.value.email || '',
    target_company_id: editTarget.value.target_company_id ?? null,
    no_company: Boolean(editTarget.value.no_company),
    manager_user_id: editTarget.value.manager_user_id ?? null,
    requested_product: editTarget.value.requested_product,
    requested_role: (editTarget.value.requested_role || 'normal_user') as RoleCode,
    valid_until_value: datePickerValue(editTarget.value.valid_until),
    valid_until_permanent: !editTarget.value.valid_until,
    reason: editTarget.value.reason || '',
  })
  editCompanyMode.value = editForm.no_company ? 'none' : 'company'
  await loadManagers(editForm.target_company_id)
  editVisible.value = true
}

function handleEditRoleUpdate(value: RoleCode) {
  if (value === 'temporary_user') {
    ensureDefaultTemporaryValidity(editForm)
  } else {
    editForm.valid_until_permanent = true
    editForm.valid_until_value = null
  }
}

function handleEditPermanentUpdate(checked: boolean) {
  if (checked) {
    editForm.valid_until_value = null
  } else if (!editForm.valid_until_value) {
    editForm.valid_until_value = addMonthsDatePickerValue()
  }
}

function handleEditCompanyMode(value: string) {
  if (value === 'none') {
    editForm.no_company = true
    editForm.target_company_id = null
    editForm.manager_user_id = null
    managers.value = []
  } else {
    editForm.no_company = false
  }
}

async function loadManagersForEdit(value: number | null) {
  editForm.manager_user_id = null
  await loadManagers(value)
}

async function submitEdit() {
  if (!editTarget.value) return
  if (!editForm.desired_username?.trim() || /\s/.test(editForm.desired_username)) {
    message.error('请填写账户名，且不可包含空格')
    return
  }
  if (!editForm.contact_name || !editForm.phone || !editForm.email) {
    message.error('请填写姓名/实名、手机和邮箱')
    return
  }
  if (editTarget.value.app_type === 'enterprise' && !editForm.company_name) {
    message.error('请填写单位名称')
    return
  }
  if (editTarget.value.app_type === 'user' && editCompanyMode.value === 'company' && !editForm.target_company_id) {
    message.error('请选择目标企业')
    return
  }
  submittingEdit.value = true
  try {
    const payload: RegistrationApplicationUpdatePayload = {
      desired_username: editForm.desired_username.trim(),
      company_name: editTarget.value.app_type === 'enterprise' ? editForm.company_name : '',
      contact_name: editForm.contact_name,
      phone: editForm.phone,
      email: editForm.email,
      target_company_id: editTarget.value.app_type === 'user' && !editForm.no_company ? editForm.target_company_id : null,
      no_company: editTarget.value.app_type === 'user' ? editForm.no_company : false,
      manager_user_id: editTarget.value.app_type === 'user' && !editForm.no_company ? editForm.manager_user_id : null,
      requested_product: editForm.requested_product,
      requested_role: editTarget.value.app_type === 'enterprise' ? 'enterprise_admin' : editForm.requested_role,
      valid_until: editTarget.value.app_type === 'user' && editForm.requested_role === 'temporary_user' ? validityPayload(editForm.valid_until_permanent, editForm.valid_until_value) : null,
      reason: editForm.reason,
    }
    await registrationApi.update(editTarget.value.id, payload)
    message.success('申请已更新')
    editVisible.value = false
    await fetchList()
  } finally {
    submittingEdit.value = false
  }
}

async function openApprove(row: RegistrationApplication) {
  approveTarget.value = await registrationApi.detail(row.id)
  approveResult.value = null
  approveForm.note = ''
  approveForm.account_count = 1
  approveForm.target_company_id = approveTarget.value.target_company_id ?? null
  approveForm.no_company = Boolean(approveTarget.value.no_company)
  approveForm.manager_user_id = approveTarget.value.manager_user_id ?? null
  approveForm.requested_role = (approveTarget.value.requested_role || 'normal_user') as RoleCode
  approveCompanyMode.value = approveForm.no_company ? 'none' : 'company'
  enterpriseAccounts.value = [accountWithDesiredUsername(approveTarget.value.desired_username)]
  Object.assign(userAccount, accountWithDesiredUsername(approveTarget.value.desired_username))
  userAccount.valid_until_value = datePickerValue(approveTarget.value.valid_until)
  userAccount.valid_until_permanent = !approveTarget.value.valid_until
  if (approveForm.requested_role === 'temporary_user' && !approveTarget.value.valid_until) {
    ensureDefaultTemporaryValidity(userAccount)
  }
  await loadManagers(approveForm.target_company_id)
  approveVisible.value = true
}

function syncEnterpriseAccounts(value: number | null) {
  const count = Math.max(1, Math.min(50, Number(value || 1)))
  approveForm.account_count = count
  while (enterpriseAccounts.value.length < count) enterpriseAccounts.value.push(emptyAccount())
  while (enterpriseAccounts.value.length > count) enterpriseAccounts.value.pop()
}

function handleApproveCompanyMode(value: string) {
  if (value === 'none') {
    approveForm.no_company = true
    approveForm.target_company_id = null
    approveForm.manager_user_id = null
    managers.value = []
  } else {
    approveForm.no_company = false
  }
}

async function loadManagersForApprove(value: number | null) {
  approveForm.manager_user_id = null
  await loadManagers(value)
}

function handleApproveRoleUpdate(value: RoleCode) {
  if (value === 'temporary_user') {
    ensureDefaultTemporaryValidity(userAccount)
  } else {
    userAccount.valid_until_permanent = true
    userAccount.valid_until_value = null
  }
}

function handleApprovePermanentUpdate(checked: boolean) {
  if (checked) {
    userAccount.valid_until_value = null
  } else if (!userAccount.valid_until_value) {
    userAccount.valid_until_value = addMonthsDatePickerValue()
  }
}

function accountPayload(account: AccountForm) {
  return {
    username: account.username_manual ? account.username.trim() : '',
    password: account.password_manual ? account.password : '',
    valid_until: validityPayload(account.valid_until_permanent, account.valid_until_value),
  }
}

function accountWithDesiredUsername(desiredUsername?: string): AccountForm {
  const account = emptyAccount()
  const username = desiredUsername?.trim() || ''
  if (username) {
    account.username_manual = true
    account.username = username
  }
  return account
}

async function submitApprove() {
  if (!approveTarget.value) return
  if (approveTarget.value.app_type === 'user' && approveCompanyMode.value === 'company' && !approveForm.target_company_id) {
    message.error('请选择目标企业')
    return
  }
  submittingApprove.value = true
  try {
    let payload: RegistrationApprovePayload
    if (approveTarget.value.app_type === 'enterprise') {
      payload = {
        note: approveForm.note,
        account_count: approveForm.account_count,
        accounts: enterpriseAccounts.value.map(accountPayload),
      }
    } else {
      payload = {
        note: approveForm.note,
        target_company_id: approveCompanyMode.value === 'company' ? approveForm.target_company_id : null,
        no_company: approveCompanyMode.value === 'none',
        manager_user_id: approveCompanyMode.value === 'company' ? approveForm.manager_user_id : null,
        requested_role: approveForm.requested_role,
        account: accountPayload(userAccount),
      }
    }
    approveResult.value = await registrationApi.approve(approveTarget.value.id, payload)
    approveVisible.value = false
    passwordVisible.value = true
    message.success('申请已通过')
    await fetchList()
  } finally {
    submittingApprove.value = false
  }
}

function credentialMustChangePassword(item: RegistrationCreatedUserResponse) {
  const user = item.user as RegistrationCreatedUserResponse['user'] & { must_change_password?: boolean }
  return Boolean(user.must_change_password)
}

function credentialAccounts(): RegistrationCredentialExportAccount[] {
  return approveCreatedUsers.value.map((item) => ({
    username: item.user.username,
    real_name: item.user.real_name || '',
    role_code: item.user.role_code,
    temporary_password: item.temporary_password || '',
    must_change_password: credentialMustChangePassword(item),
  }))
}

async function exportCredentialsExcel() {
  const applicationId = approveResult.value?.application?.id
  const accounts = credentialAccounts()
  if (!applicationId || !accounts.length) {
    message.error('暂无可导出的口令')
    return
  }
  exportingCredentials.value = true
  try {
    const blob = await registrationApi.exportCredentials(applicationId, accounts)
    ensureXlsxBlob(blob)
    saveBlob(blob, timestampedXlsxFilename('registration-credentials'))
    message.success('Excel 已导出')
  } catch {
    message.error('导出失败，请稍后重试')
  } finally {
    exportingCredentials.value = false
  }
}

async function copyCredentials() {
  const items = approveCreatedUsers.value
  if (!items.length) {
    message.error('暂无可复制的口令')
    return
  }
  const companyName = approveResult.value?.company?.company_name || '无企业'
  const lines = [
    '【垚无忧土工数据系统】账号开通',
    `单位：${companyName}`,
    '账户名\t实名\t角色\t临时口令',
    ...items.map((item) =>
      [item.user.username, item.user.real_name || '-', roleLabel(item.user.role_code), item.temporary_password || '-'].join('\t'),
    ),
    '提示：首次登录需修改初始口令。',
  ]
  copyingCredentials.value = true
  try {
    await writeClipboardText(lines.join('\n'))
    message.success('口令已复制')
  } catch {
    message.error('复制失败，请手动选择表格内容复制')
  } finally {
    copyingCredentials.value = false
  }
}

async function writeClipboardText(text: string) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'readonly')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) {
    throw new Error('clipboard copy failed')
  }
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

onMounted(async () => {
  await Promise.all([loadCompanies(), fetchList()])
})
</script>

<style scoped>
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.account-list {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.account-row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr) minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 10px;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-sm);
}

.account-row--single {
  margin-bottom: 16px;
}

.account-role,
.account-cell {
  min-width: 0;
}

.account-cell {
  display: grid;
  gap: 6px;
}

.validity-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  width: 100%;
}

@media (max-width: 720px) {
  .form-grid,
  .account-row,
  .validity-field {
    grid-template-columns: 1fr;
  }
}
</style>
