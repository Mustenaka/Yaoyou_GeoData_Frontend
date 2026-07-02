<template>
  <div class="page-shell">
    <PageHeader title="企业管理" subtitle="维护企业资料、有效期、启停状态与基础策略。">
      <n-button v-if="authStore.isBackOfficeScopeAll" type="primary" @click="openCreate">新建企业</n-button>
    </PageHeader>

    <div class="page-card toolbar">
      <n-input v-model:value="filters.keyword" clearable placeholder="企业名称 / 联系方式" style="width: 260px" @keyup.enter="fetchList" />
      <n-select v-model:value="filters.status" clearable :options="companyStatusOptions" placeholder="状态" style="width: 140px" />
      <div class="toolbar__spacer" />
      <n-button @click="fetchList">查询</n-button>
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
        :row-key="(row: CompanyItem) => row.id"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="drawerVisible" width="520">
      <n-drawer-content :title="editingId ? '编辑企业' : '新建企业'">
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
          <n-form-item label="企业名称" path="company_name">
            <n-input v-model:value="form.company_name" />
          </n-form-item>
          <n-form-item label="简称">
            <n-input v-model:value="form.company_short_name" />
          </n-form-item>
          <n-form-item label="统一社会信用代码">
            <n-input v-model:value="form.credit_code" />
          </n-form-item>
          <n-form-item label="联系人">
            <n-input v-model:value="form.legal_person" />
          </n-form-item>
          <n-form-item label="电话">
            <n-input v-model:value="form.contact_phone" />
          </n-form-item>
          <n-form-item label="邮箱">
            <n-input v-model:value="form.contact_email" />
          </n-form-item>
          <n-form-item label="地址">
            <n-input v-model:value="form.address" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="有效期开始">
                <n-input v-model:value="form.valid_from" placeholder="2026-01-01T00:00:00Z" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="有效期结束">
                <n-input v-model:value="form.valid_until" placeholder="2027-01-01T00:00:00Z" />
              </n-form-item>
            </n-grid-item>
          </n-grid>
          <n-form-item label="备注">
            <n-input v-model:value="form.remark" type="textarea" />
          </n-form-item>
        </n-form>
        <template #footer>
          <div class="drawer-footer">
            <n-button @click="drawerVisible = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="submitCompany">保存</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="policyVisible" width="520">
      <n-drawer-content title="企业策略">
        <n-alert type="info" style="margin-bottom: 12px">
          后端当前不返回策略详情；此处只提交已填写字段，留空字段不修改。
        </n-alert>
        <n-form :model="policyForm" label-placement="top">
          <n-form-item label="普通用户可编辑配置">
            <n-switch v-model:value="policyForm.allow_normal_user_config_edit" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="Mobile 设备上限">
                <n-input-number v-model:value="policyForm.max_mobile_devices" clearable style="width: 100%" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="Win 设备上限">
                <n-input-number v-model:value="policyForm.max_win_devices" clearable style="width: 100%" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="最低 Mobile 版本">
                <n-input v-model:value="policyForm.min_mobile_version" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="最低 Win 版本">
                <n-input v-model:value="policyForm.min_win_version" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="密码最小长度">
                <n-input-number v-model:value="policyForm.password_min_length" clearable style="width: 100%" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="日志保留天数">
                <n-input-number v-model:value="policyForm.log_retention_days" clearable style="width: 100%" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="存储配额 GB">
                <n-input-number v-model:value="policyForm.storage_quota_gb" clearable style="width: 100%" />
              </n-form-item>
            </n-grid-item>
          </n-grid>
          <n-form-item label="启用风险阻断">
            <n-switch v-model:value="policyForm.risk_block_enabled" />
          </n-form-item>
          <n-form-item v-if="authStore.isBackOfficeScopeAll" label="首个设备自动授权">
            <n-switch v-model:value="policyForm.auto_activate_first_device" />
          </n-form-item>
        </n-form>
        <template #footer>
          <div class="drawer-footer">
            <n-button @click="policyVisible = false">取消</n-button>
            <n-button type="primary" :loading="saving" @click="submitPolicy">更新策略</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>
  </div>
</template>

<script setup lang="ts">
import { h, onMounted, reactive, ref } from 'vue'
import type { DataTableColumns, FormInst, FormRules, PaginationProps } from 'naive-ui'
import { NButton, NPopconfirm, NTag, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { companyApi } from '@/api/company'
import { useAuthStore } from '@/stores/auth'
import type { CompanyItem, CompanyPayload, CompanyPolicyPayload } from '@/types/api'
import { companyStatusOptions } from '@/utils/labels'
import { formatDateTime } from '@/utils/format'
import { ensureXlsxBlob, saveBlob, timestampedXlsxFilename } from '@/utils/download'
import { pageList, queryString, queryValue } from '@/utils/query'

const authStore = useAuthStore()
const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const exporting = ref(false)
const rows = ref<CompanyItem[]>([])
const drawerVisible = ref(false)
const policyVisible = ref(false)
const editingId = ref<number | null>(null)
const policyCompanyId = ref<number | null>(null)
const formRef = ref<FormInst | null>(null)

const filters = reactive({
  keyword: '',
  status: null as number | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const emptyForm: CompanyPayload = {
  company_name: '',
  company_short_name: '',
  credit_code: '',
  legal_person: '',
  contact_phone: '',
  contact_email: '',
  address: '',
  status: 1,
  valid_from: '',
  valid_until: '',
  remark: '',
}

const form = reactive<CompanyPayload>({ ...emptyForm })

const policyForm = reactive<CompanyPolicyPayload>({
  allow_normal_user_config_edit: undefined,
  max_mobile_devices: undefined,
  max_win_devices: undefined,
  min_mobile_version: '',
  min_win_version: '',
  password_min_length: undefined,
  log_retention_days: undefined,
  storage_quota_gb: undefined,
  risk_block_enabled: undefined,
  auto_activate_first_device: undefined,
})

const rules: FormRules = {
  company_name: [{ required: true, message: '请输入企业名称', trigger: ['blur', 'input'] }],
}

const columns: DataTableColumns<CompanyItem> = [
  { title: '企业名称', key: 'company_name', minWidth: 180 },
  { title: '联系人', key: 'legal_person', width: 120, render: (row) => row.legal_person || '-' },
  { title: '电话', key: 'contact_phone', width: 140, render: (row) => row.contact_phone || '-' },
  { title: '邮箱', key: 'contact_email', minWidth: 160, render: (row) => row.contact_email || '-' },
  {
    title: '状态',
    key: 'status',
    width: 90,
    render: (row) =>
      h(NTag, { type: row.status === 1 ? 'success' : 'error', round: true }, { default: () => (row.status === 1 ? '启用' : '禁用') }),
  },
  { title: '有效期', key: 'valid_until', width: 170, render: (row) => formatDateTime(row.valid_until) },
  { title: '用户数', key: 'user_count', width: 86, render: (row) => row.user_count ?? 0 },
  { title: 'Mobile 授权', key: 'mobile_license_count', width: 110, render: (row) => row.mobile_license_count ?? 0 },
  { title: 'Win 授权', key: 'win_license_count', width: 96, render: (row) => row.win_license_count ?? 0 },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    fixed: 'right',
    render: (row) =>
      h('div', { class: 'table-actions' }, [
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', onClick: () => openPolicy(row) }, { default: () => '策略' }),
        authStore.isBackOfficeScopeAll
          ? h(
              NPopconfirm,
              { onPositiveClick: () => toggleStatus(row) },
              {
                trigger: () =>
                  h(
                    NButton,
                    { size: 'small', type: row.status === 1 ? 'warning' : 'success', ghost: true },
                    { default: () => (row.status === 1 ? '禁用' : '启用') },
                  ),
                default: () => `确认${row.status === 1 ? '禁用' : '启用'}企业 ${row.company_name}？`,
              },
            )
          : null,
      ]),
  },
]

async function fetchList() {
  loading.value = true
  try {
    const result = await companyApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      keyword: queryValue(filters.keyword),
      status: queryString(filters.status),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  filters.keyword = ''
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
    const blob = await companyApi.exportXlsx({
      keyword: queryValue(filters.keyword),
      status: queryString(filters.status),
    })
    ensureXlsxBlob(blob)
    saveBlob(blob, timestampedXlsxFilename('companies'))
    message.success('导出Excel成功')
  } catch {
    message.error('导出Excel失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

function assignForm(payload: CompanyPayload) {
  Object.assign(form, emptyForm, payload)
}

function openCreate() {
  editingId.value = null
  assignForm({ ...emptyForm })
  drawerVisible.value = true
}

async function openEdit(row: CompanyItem) {
  const detail = await companyApi.detail(row.id)
  editingId.value = row.id
  assignForm({
    company_name: detail.company_name,
    company_short_name: detail.company_short_name,
    credit_code: detail.credit_code,
    legal_person: detail.legal_person,
    contact_phone: detail.contact_phone,
    contact_email: detail.contact_email,
    address: detail.address,
    status: detail.status,
    valid_from: detail.valid_from || '',
    valid_until: detail.valid_until || '',
    remark: detail.remark,
  })
  drawerVisible.value = true
}

function openPolicy(row: CompanyItem) {
  policyCompanyId.value = row.id
  Object.assign(policyForm, {
    allow_normal_user_config_edit: undefined,
    max_mobile_devices: undefined,
    max_win_devices: undefined,
    min_mobile_version: '',
    min_win_version: '',
    password_min_length: undefined,
    log_retention_days: undefined,
    storage_quota_gb: undefined,
    risk_block_enabled: undefined,
    auto_activate_first_device: undefined,
  })
  policyVisible.value = true
}

function cleanCompanyPayload(): CompanyPayload {
  return {
    ...form,
    valid_from: form.valid_from || null,
    valid_until: form.valid_until || null,
  }
}

function cleanPolicyPayload(): CompanyPolicyPayload {
  const payload: CompanyPolicyPayload = {}
  Object.entries(policyForm).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      ;(payload as Record<string, unknown>)[key] = value
    }
  })
  return payload
}

async function submitCompany() {
  await formRef.value?.validate()
  saving.value = true
  try {
    if (editingId.value) {
      await companyApi.update(editingId.value, cleanCompanyPayload())
      message.success('企业资料已更新')
    } else {
      await companyApi.create(cleanCompanyPayload())
      message.success('企业已创建')
    }
    drawerVisible.value = false
    await fetchList()
  } finally {
    saving.value = false
  }
}

async function submitPolicy() {
  if (!policyCompanyId.value) return
  saving.value = true
  try {
    await companyApi.updatePolicy(policyCompanyId.value, cleanPolicyPayload())
    message.success('企业策略已更新')
    policyVisible.value = false
  } finally {
    saving.value = false
  }
}

async function toggleStatus(row: CompanyItem) {
  await companyApi.updateStatus(row.id, row.status === 1 ? 0 : 1)
  message.success('企业状态已更新')
  await fetchList()
}

onMounted(fetchList)
</script>
