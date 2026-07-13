<template>
  <div class="page-shell">
    <PageHeader title="产品授权" subtitle="可一次联合授予 Mobile + Win；服务端仍分别核算两端权益、额度和设备。">
      <n-space>
        <n-button secondary @click="openLegacyHistory()">旧授权记录</n-button>
        <n-button v-if="canCreate" type="primary" @click="openCreate">新建产品授权</n-button>
      </n-space>
    </PageHeader>

    <n-alert class="model-note" type="info" :bordered="false">
      <div class="model-note__content">
        <span>Mobile + Win 可作为一个组合一次授权，但落库仍是两条独立产品权益；用户产品准入和设备绑定分别在用户、设备页面管理。</span>
        <n-space size="small">
          <n-tag size="small" :type="sourceOfTruth === 'v2_dual_write' || sourceOfTruth === 'v2_only' ? 'success' : 'warning'">
            {{ sourceOfTruthLabel }}
          </n-tag>
          <n-tag v-if="!authStore.isBackOfficeScopeAll" size="small">企业管理员只读</n-tag>
        </n-space>
      </div>
    </n-alert>

    <n-alert v-if="authStore.isBackOfficeScopeAll && readiness && !readinessReady" class="readiness-note" type="warning" :bordered="false">
      <strong>授权 V2 切换尚未就绪</strong>
      <span>{{ readinessIssueSummary }}</span>
    </n-alert>

    <n-alert v-if="errorText" class="page-error" type="error" closable @close="errorText = ''">
      {{ errorText }}
    </n-alert>

    <div class="page-card toolbar">
      <n-select v-if="authStore.isBackOfficeScopeAll" v-model:value="filters.company_id" clearable filterable remote :loading="companyOptionsLoading" :options="companyOptions" placeholder="搜索企业主体" style="width: 210px" @search="searchCompanies" @update:value="handleCompanyFilterUpdate" />
      <n-select v-if="authStore.isBackOfficeScopeAll" v-model:value="filters.owner_user_id" clearable filterable remote :loading="personalUserOptionsLoading" :options="personalUserOptions" placeholder="搜索个人主体" style="width: 190px" @search="searchPersonalUsers" @update:value="handleOwnerFilterUpdate" />
      <n-select v-model:value="filters.product_code" clearable :options="productCodeOptions" placeholder="产品" style="width: 120px" />
      <n-select v-model:value="filters.state" clearable :options="productEntitlementStateOptions" placeholder="配置状态" style="width: 140px" />
      <n-select v-model:value="filters.effective_status" clearable filterable :options="effectiveAccessStatusOptions" placeholder="当前状态" style="width: 190px" />
      <n-select v-model:value="filters.migration_state" clearable :options="productEntitlementMigrationStateOptions" placeholder="迁移确认" style="width: 150px" />
      <div class="toolbar__spacer" />
      <n-button @click="applyFilters">查询</n-button>
      <n-button quaternary @click="resetFilters">重置</n-button>
    </div>

    <div class="page-card">
      <n-data-table
        remote
        :columns="columns"
        :data="displayRows"
        :loading="loading"
        :pagination="pagination"
        :row-key="(row: ProductEntitlementItem) => row.id"
        :scroll-x="1360"
        @update:page="handlePage"
        @update:page-size="handlePageSize"
      />
    </div>

    <n-drawer v-model:show="formVisible" width="min(600px, 100vw)">
      <n-drawer-content :title="formDrawerTitle">
        <n-alert v-if="reviewMode && editingEntitlement" type="warning" class="drawer-note">
          <div class="reissue-warning">
            <strong>核对 {{ entitlementSubject(editingEntitlement) }} 的 {{ formProductLabel }} 商业权益</strong>
            <span>{{ isJointForm ? '本次会原子确认 Mobile 与 Win 两条权益；任一条不满足条件都不会部分确认。' : '确认后该权益才可进入 V2 权威判定。' }} 请逐项核对配置状态、生效时间、截止方式与设备额度，不能依赖迁移草稿的空值默认。</span>
            <n-checkbox v-model:checked="reviewStateAcknowledged">
              我已核对配置状态：{{ productEntitlementStateLabel(form.state) }}
            </n-checkbox>
            <n-checkbox v-model:checked="reviewStartAcknowledged">
              我已核对生效时间：{{ form.valid_from_value ? formatDateTime(form.valid_from_value) : '立即生效（未设置起始时间）' }}
            </n-checkbox>
            <n-checkbox v-model:checked="reviewTermAcknowledged">
              我已核对授权期限：{{ form.term_type === 'long_term' ? '长期有效（不设置截止时间）' : formatDateTime(form.valid_until_value) }}
            </n-checkbox>
            <n-checkbox v-model:checked="reviewQuotaAcknowledged">
              我已核对设备额度：{{ formQuotaSummary }}
            </n-checkbox>
            <n-checkbox v-model:checked="reviewAcknowledged">我已依据真实商业授权核对上述状态、期限和额度</n-checkbox>
          </div>
        </n-alert>
        <n-alert v-else-if="reissueMode && editingEntitlement" type="error" class="drawer-note">
          <div class="reissue-warning">
            <strong>将重新授予 {{ entitlementSubject(editingEntitlement) }} 的 {{ productCodeLabel(editingEntitlement.product_code) }}</strong>
            <span>权益代次将从 {{ editingEntitlement.generation }} 递增。旧用户准入和旧设备绑定不会自动复活，后续必须显式重新启用用户准入并批准所需设备。</span>
            <n-checkbox v-model:checked="reissueAcknowledged">我已核对新的授权期限和设备额度，并理解旧用户/设备不会自动恢复</n-checkbox>
          </div>
        </n-alert>
        <n-alert v-else-if="!editingId" type="info" class="drawer-note">
          {{ isJointForm ? 'Mobile + Win 会通过一次事务创建两条“待人工确认”权益；任一端失败都不会留下半套授权。' : '新建记录先保存为“待人工确认”，不会立即进入 V2 权威判定。' }} 保存后请从列表进入“复核”，逐项确认真实商业授权的状态、期限与设备额度。
        </n-alert>
        <n-alert v-if="editingId && isJointForm" :type="jointConfigurationDiffers ? 'warning' : 'info'" class="drawer-note" :bordered="false">
          {{ jointConfigurationDiffers
            ? '当前 Mobile 与 Win 的状态或期限不一致。表单以 Mobile 为共同设置基础；保存后两端会统一为本表单的状态和期限，但各自设备额度仍独立保留。'
            : '本次会在一个事务中同时更新 Mobile 与 Win；任一端发生并发变化或校验失败，服务端都会整批回滚。' }}
        </n-alert>
        <n-alert v-if="reviewMode && reviewAnomalies.length" type="error" class="drawer-note" :bordered="false">
          <div class="anomaly-resolution-list">
            <strong>迁移异常必须逐条处置，处置完成并重新加载后才能确认权益</strong>
            <div v-for="anomaly in reviewAnomalies" :key="`${anomaly.entitlement_id}:${anomaly.id}`" class="anomaly-resolution-item">
              <n-space align="center" size="small">
                <n-tag size="small" type="info">{{ productCodeLabel(anomaly.product_code) }}</n-tag>
                <span>{{ migrationAnomalyTypeLabel(anomaly.anomaly_type) }} · 旧授权 #{{ anomaly.legacy_authorization_id }}</span>
              </n-space>
              <template v-if="anomaly.anomaly_type === 'mixed_term_group'">
                <span class="anomaly-resolution-item__hint">仅当历史记录确实表示同一产品期限下的设备临时例外时，才可人工接受为设备期限覆盖。</span>
                <n-input
                  v-model:value="anomalyResolutionReasons[anomaly.id]"
                  type="textarea"
                  :rows="2"
                  maxlength="255"
                  show-count
                  placeholder="填写核对依据和接受理由（必填）"
                />
                <n-button
                  type="warning"
                  secondary
                  :loading="resolvingAnomalyId === anomaly.id"
                  :disabled="resolvingAnomalyId != null"
                  @click="resolveMixedTermAnomaly(anomaly)"
                >接受为设备期限例外</n-button>
              </template>
              <template v-else-if="anomaly.anomaly_type === 'noncanonical_product_scope'">
                <span class="anomaly-resolution-item__hint">这会把旧兼容记录的非标准产品范围收窄并规范为该设备当前的 {{ productCodeLabel(anomaly.product_code) }} 客户端类型；不能在此选择或扩大到其它产品。</span>
                <n-input
                  v-model:value="anomalyResolutionReasons[anomaly.id]"
                  type="textarea"
                  :rows="2"
                  maxlength="255"
                  show-count
                  placeholder="填写核对依据和规范化理由（必填）"
                />
                <n-button
                  type="warning"
                  secondary
                  :loading="resolvingAnomalyId === anomaly.id"
                  :disabled="resolvingAnomalyId != null"
                  @click="normalizeProductScopeAnomaly(anomaly)"
                >规范为当前设备产品</n-button>
              </template>
              <span v-else class="anomaly-resolution-item__hint">
                {{ nonAcceptableAnomalyHint(anomaly.anomaly_type) }} 此异常不能在复核页一键接受，需修复源数据或迁移映射后重新计算。
              </span>
            </div>
          </div>
        </n-alert>
        <n-form ref="formRef" :model="form" label-placement="top">
          <template v-if="!editingId">
            <n-form-item label="授权主体类型">
              <n-radio-group v-model:value="form.owner_type">
                <n-radio-button value="company">企业</n-radio-button>
                <n-radio-button value="user">无企业个人账号</n-radio-button>
              </n-radio-group>
            </n-form-item>
            <n-form-item v-if="form.owner_type === 'company'" label="企业主体" required>
              <n-select v-model:value="form.company_id" filterable remote :loading="companyOptionsLoading" :options="companyOptions" placeholder="搜索企业" @search="searchCompanies" />
            </n-form-item>
            <n-form-item v-else label="个人主体" required>
              <n-select v-model:value="form.owner_user_id" filterable remote :loading="personalUserOptionsLoading" :options="personalUserOptions" placeholder="搜索无企业个人账号" @search="searchPersonalUsers" />
            </n-form-item>
            <n-grid responsive="screen" cols="1 s:2" :x-gap="12">
              <n-grid-item>
                <n-form-item label="产品" required>
                  <n-select v-model:value="form.product_scope" :options="productGrantScopeOptions" />
                </n-form-item>
              </n-grid-item>
              <n-grid-item>
                <n-form-item label="迁移确认">
                  <n-select v-model:value="form.migration_state" :options="productEntitlementMigrationStateOptions" disabled />
                </n-form-item>
              </n-grid-item>
            </n-grid>
          </template>

          <n-grid responsive="screen" cols="1 s:2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="配置状态">
                <n-select v-model:value="form.state" :options="reviewMode ? productEntitlementStateOptions : editableEntitlementStateOptions" :disabled="reissueMode || reviewMode" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item v-if="!isJointForm">
              <n-form-item :label="`${formProductLabel} 设备额度`">
                <n-input-number v-model:value="form.device_limit" :min="0" :precision="0" clearable placeholder="留空表示不限" style="width: 100%" />
              </n-form-item>
            </n-grid-item>
          </n-grid>

          <n-grid v-if="isJointForm" responsive="screen" cols="1 s:2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="Mobile 设备额度">
                <n-input-number v-model:value="form.mobile_device_limit" :min="0" :precision="0" clearable placeholder="留空表示不限" style="width: 100%" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="Win 设备额度">
                <n-input-number v-model:value="form.win_device_limit" :min="0" :precision="0" clearable placeholder="留空表示不限" style="width: 100%" />
              </n-form-item>
            </n-grid-item>
          </n-grid>

          <n-form-item label="产品授权期限">
            <n-radio-group v-model:value="form.term_type" @update:value="handleTermTypeUpdate">
              <n-radio-button value="long_term">长期有效</n-radio-button>
              <n-radio-button value="fixed_term">固定截止</n-radio-button>
            </n-radio-group>
          </n-form-item>
          <n-grid responsive="screen" cols="1 s:2" :x-gap="12">
            <n-grid-item>
              <n-form-item label="生效时间">
                <n-date-picker v-model:value="form.valid_from_value" type="datetime" clearable placeholder="留空表示立即生效" style="width: 100%" />
              </n-form-item>
            </n-grid-item>
            <n-grid-item>
              <n-form-item label="固定截止时间" :required="form.term_type === 'fixed_term'">
                <n-date-picker
                  v-model:value="form.valid_until_value"
                  type="datetime"
                  clearable
                  :disabled="form.term_type === 'long_term'"
                  placeholder="选择截止时间"
                  style="width: 100%"
                />
              </n-form-item>
            </n-grid-item>
          </n-grid>
          <n-alert type="default" :bordered="false">
            额度留空表示不限；0 表示不允许绑定设备。产品自然到期由服务端计算，不存在可编辑的“过期”状态。
          </n-alert>
        </n-form>
        <template #footer>
          <div class="drawer-footer">
            <n-button @click="formVisible = false">取消</n-button>
            <n-button type="primary" :loading="saving" :disabled="reviewMode && reviewAnomalies.length > 0" @click="submitEntitlement">{{ reviewMode ? (isJointForm ? '联合确认两条权益' : '确认权益') : reissueMode ? '重新授予' : isJointForm ? '保存两条权益' : '保存' }}</n-button>
          </div>
        </template>
      </n-drawer-content>
    </n-drawer>

    <n-drawer v-model:show="detailVisible" width="min(760px, 100vw)">
      <n-drawer-content :title="detail ? `产品授权 #${detail.id}` : '旧授权兼容记录'">
        <template v-if="detail">
          <n-descriptions bordered :column="descriptionColumns" label-placement="left">
            <n-descriptions-item label="授权主体">{{ entitlementSubject(detail) }}</n-descriptions-item>
            <n-descriptions-item label="产品">{{ productCodeLabel(detail.product_code) }}</n-descriptions-item>
            <n-descriptions-item label="配置状态">{{ productEntitlementStateLabel(detail.state) }}</n-descriptions-item>
            <n-descriptions-item label="当前状态">{{ effectiveStatusLabel(detail.effective_status) }}</n-descriptions-item>
            <n-descriptions-item label="配置期限">{{ entitlementTerm(detail) }}</n-descriptions-item>
            <n-descriptions-item label="实际截止">{{ formatValidityDateTime(detail.effective_until) }}</n-descriptions-item>
            <n-descriptions-item label="设备额度">{{ quotaText(detail) }}</n-descriptions-item>
            <n-descriptions-item label="当前可用设备">{{ detail.usable_device_count ?? 0 }}</n-descriptions-item>
            <n-descriptions-item label="权益代次">{{ detail.generation }}</n-descriptions-item>
            <n-descriptions-item label="迁移确认">{{ productEntitlementMigrationStateLabel(detail.migration_state) }}</n-descriptions-item>
            <n-descriptions-item v-if="authStore.isBackOfficeScopeAll && detail.migration_anomalies?.length" label="迁移异常" :span="2">
              {{ migrationAnomalySummary(detail) }}
            </n-descriptions-item>
            <n-descriptions-item label="阻断原因" :span="2">{{ blockingReasonLabel(detail.blocking_reason) }}</n-descriptions-item>
            <n-descriptions-item v-if="detail.revoke_reason" label="撤销原因" :span="2">{{ detail.revoke_reason }}</n-descriptions-item>
            <n-descriptions-item label="读权威模式" :span="2">{{ sourceModeLabel(detail.source_of_truth) }}</n-descriptions-item>
          </n-descriptions>
          <n-space class="detail-actions">
            <n-button secondary @click="goDevices(detail)">查看绑定设备</n-button>
            <n-button v-if="rowCanUpdate(detail)" @click="openEdit(detail)">调整授权</n-button>
            <n-button v-if="rowCanUpdate(detail)" secondary @click="openJointEdit(detail)">共同调整 Mobile + Win</n-button>
            <n-button v-if="rowCanConfirm(detail)" type="warning" ghost @click="openReview(detail)">核对并确认</n-button>
            <n-button v-if="rowCanConfirm(detail)" type="warning" secondary @click="openJointReview(detail)">联合复核 Mobile + Win</n-button>
            <n-button v-if="rowCanReissue(detail)" type="warning" @click="openReissue(detail)">重新授予</n-button>
            <n-button v-if="rowCanRevoke(detail)" type="error" ghost @click="openRevoke(detail)">撤销授权</n-button>
          </n-space>
          <n-divider>关联旧授权记录</n-divider>
        </template>

        <n-alert type="warning" :bordered="false" class="legacy-note">
          旧记录只读，仅用于兼容、追溯和回滚窗口；不再从这里修改旧模型。需要终止设备准入时，请进入“查看绑定设备”撤销对应绑定。
        </n-alert>
        <n-alert v-if="legacyError" type="error" class="page-error">{{ legacyError }}</n-alert>
        <n-data-table
          remote
          :columns="legacyColumns"
          :data="legacyRows"
          :loading="legacyLoading"
          :pagination="legacyPagination"
          :row-key="(row: LicenseItem) => row.id"
          :scroll-x="980"
          :row-props="legacyRowProps"
          @update:page="handleLegacyPage"
          @update:page-size="handleLegacyPageSize"
        />
      </n-drawer-content>
    </n-drawer>

    <n-modal v-model:show="revokeVisible" preset="card" title="撤销产品授权" style="width: min(520px, 92vw)">
      <n-alert type="error" :bordered="false" class="drawer-note">
        撤销会终止当前权益代次，并使相关用户准入、设备绑定和在线会话失效。重新授予必须创建下一代次，旧绑定不会自动复活。
      </n-alert>
      <n-form-item label="撤销原因" required>
        <n-input v-model:value="revokeReason" type="textarea" :rows="3" maxlength="240" show-count placeholder="请输入可审计的撤销原因" />
      </n-form-item>
      <div class="drawer-footer">
        <n-button @click="revokeVisible = false">取消</n-button>
        <n-button type="error" :loading="revokeSaving" @click="submitRevoke">确认撤销</n-button>
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'
import type { DataTableColumns, FormInst, PaginationProps, SelectOption } from 'naive-ui'
import { NButton, NTag, useDialog, useMessage } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { authorizationMigrationAnomalyApi, productEntitlementApi } from '@/api/authorization'
import { licenseApi } from '@/api/license'
import { useAuthStore } from '@/stores/auth'
import type {
  AuthorizationCapabilities,
  AuthorizationMigrationAnomalySummary,
  AuthorizationV2Readiness,
  LicenseItem,
  ProductCode,
  ProductEntitlementBatchUpdateItem,
  ProductGrantScope,
  ProductEntitlementItem,
  ProductEntitlementMigrationState,
  ProductEntitlementPayload,
  ProductEntitlementState,
} from '@/types/api'
import {
  authStatusLabel,
  blockingReasonLabel,
  effectiveAccessStatusOptions,
  effectiveStatusLabel,
  productCodeLabel,
  productCodeOptions,
  productGrantScopeOptions,
  productEntitlementMigrationStateLabel,
  productEntitlementMigrationStateOptions,
  productEntitlementStateLabel,
  productEntitlementStateOptions,
} from '@/utils/labels'
import { addMonthsDatePickerValue, datePickerISOString, datePickerValue, formatDateTime, formatValidityDateTime, isEffectiveExpired } from '@/utils/format'
import { pageList, queryValue } from '@/utils/query'
import { fetchCompanySelectOptions, fetchUserSelectOptions, mergeSelectedOption } from '@/utils/adminOptions'

type TagType = 'default' | 'success' | 'warning' | 'error' | 'info'
type OwnerType = 'company' | 'user'
type TermType = 'long_term' | 'fixed_term'

interface ReviewAnomaly extends AuthorizationMigrationAnomalySummary {
  entitlement_id: number
  product_code: ProductCode
}

interface EntitlementForm {
  owner_type: OwnerType
  company_id: number | null
  owner_user_id: number | null
  product_scope: ProductGrantScope
  state: ProductEntitlementState
  migration_state: ProductEntitlementMigrationState
  term_type: TermType
  valid_from_value: number | null
  valid_until_value: number | null
  device_limit: number | null
  mobile_device_limit: number | null
  win_device_limit: number | null
}

const authStore = useAuthStore()
const message = useMessage()
const dialog = useDialog()
const route = useRoute()
const router = useRouter()
const narrowDrawer = useMediaQuery('(max-width: 700px)')
const loading = ref(false)
const saving = ref(false)
const revokeSaving = ref(false)
const legacyLoading = ref(false)
const errorText = ref('')
const legacyError = ref('')
const rows = ref<ProductEntitlementItem[]>([])
const legacyRows = ref<LicenseItem[]>([])
const formVisible = ref(false)
const detailVisible = ref(false)
const revokeVisible = ref(false)
const editingId = ref<number | null>(null)
const editingEntitlement = ref<ProductEntitlementItem | null>(null)
const jointEntitlements = ref<ProductEntitlementItem[]>([])
const revokingEntitlement = ref<ProductEntitlementItem | null>(null)
const reviewMode = ref(false)
const reviewStateAcknowledged = ref(false)
const reviewStartAcknowledged = ref(false)
const reviewTermAcknowledged = ref(false)
const reviewQuotaAcknowledged = ref(false)
const reviewAcknowledged = ref(false)
const anomalyResolutionReasons = reactive<Record<number, string>>({})
const resolvingAnomalyId = ref<number | null>(null)
const reissueMode = ref(false)
const reissueAcknowledged = ref(false)
const revokeReason = ref('')
const detail = ref<ProductEntitlementItem | null>(null)
const formRef = ref<FormInst | null>(null)
const companyOptions = ref<SelectOption[]>([])
const personalUserOptions = ref<SelectOption[]>([])
const companyOptionsLoading = ref(false)
const personalUserOptionsLoading = ref(false)
const sourceOfTruth = ref('')
const readiness = ref<AuthorizationV2Readiness | null>(null)
const pageCapabilities = ref<AuthorizationCapabilities>({})
const targetLegacyAuthorizationId = ref<number | null>(null)
const targetEntitlementId = ref<number | null>(null)
const legacyUserId = ref<number | null>(null)
let internalRouteUpdate = false
const editableEntitlementStateOptions = productEntitlementStateOptions.filter((item) => item.value !== 'revoked')

const filters = reactive({
  company_id: null as number | null,
  owner_user_id: null as number | null,
  product_code: null as ProductCode | null,
  state: null as ProductEntitlementState | null,
  migration_state: null as ProductEntitlementMigrationState | null,
  effective_status: null as string | null,
})

const pagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const legacyPagination = reactive<PaginationProps>({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
})

const emptyForm: EntitlementForm = {
  owner_type: 'company',
  company_id: null,
  owner_user_id: null,
  product_scope: 'both',
  state: 'enabled',
  migration_state: 'needs_review',
  term_type: 'long_term',
  valid_from_value: null,
  valid_until_value: null,
  device_limit: null,
  mobile_device_limit: null,
  win_device_limit: null,
}

const form = reactive<EntitlementForm>({ ...emptyForm })
const isJointForm = computed(() => form.product_scope === 'both')
const formProductLabel = computed(() => isJointForm.value ? 'Mobile + Win' : productCodeLabel(form.product_scope))
const formQuotaSummary = computed(() => isJointForm.value
  ? `Mobile ${form.mobile_device_limit == null ? '不限' : `${form.mobile_device_limit} 台`}；Win ${form.win_device_limit == null ? '不限' : `${form.win_device_limit} 台`}`
  : form.device_limit == null ? '不限' : `${form.device_limit} 台`)
const jointConfigurationDiffers = computed(() => {
  const [mobile, win] = jointEntitlements.value
  if (!mobile || !win) return false
  return mobile.state !== win.state
    || (mobile.valid_from || null) !== (win.valid_from || null)
    || (mobile.valid_until || null) !== (win.valid_until || null)
    || mobile.migration_state !== win.migration_state
})
const reviewAnomalies = computed<ReviewAnomaly[]>(() => {
  const sources = jointEntitlements.value.length ? jointEntitlements.value : editingEntitlement.value ? [editingEntitlement.value] : []
  const seen = new Set<number>()
  const anomalies: ReviewAnomaly[] = []
  for (const entitlement of sources) {
    for (const anomaly of entitlement.migration_anomalies || []) {
      if (seen.has(anomaly.id)) continue
      seen.add(anomaly.id)
      anomalies.push({ ...anomaly, entitlement_id: entitlement.id, product_code: entitlement.product_code })
    }
  }
  return anomalies
})
const displayRows = computed(() => {
  const subjectOrder = new Map<string, number>()
  for (const row of rows.value) {
    const key = entitlementSubjectKey(row)
    if (!subjectOrder.has(key)) subjectOrder.set(key, subjectOrder.size)
  }
  return [...rows.value].sort((left, right) => {
    const subjectDifference = (subjectOrder.get(entitlementSubjectKey(left)) ?? 0) - (subjectOrder.get(entitlementSubjectKey(right)) ?? 0)
    if (subjectDifference) return subjectDifference
    return (left.product_code === 'mobile' ? 0 : 1) - (right.product_code === 'mobile' ? 0 : 1)
  })
})

const sourceOfTruthLabel = computed(() => sourceModeLabel(sourceOfTruth.value))
const readinessReady = computed(() => {
  const status = readiness.value
  return Boolean(status && !status.backfill_incomplete && status.needs_review_count === 0 && status.unmapped_legacy_count === 0 && status.pending_shadow_event_count === 0 && status.unresolved_anomaly_count === 0 && status.materialization_drift_count === 0)
})
const readinessIssueSummary = computed(() => {
  const status = readiness.value
  if (!status) return ''
  const issues: string[] = []
  if (status.backfill_incomplete) issues.push('历史回填未完成')
  if (status.needs_review_count) issues.push(`待人工复核 ${status.needs_review_count} 条`)
  if (status.unmapped_legacy_count) issues.push(`未映射旧授权 ${status.unmapped_legacy_count} 条`)
  if (status.pending_shadow_event_count) issues.push(`待处理影子事件 ${status.pending_shadow_event_count} 条`)
  if (status.unresolved_anomaly_count) issues.push(`未解决迁移异常 ${status.unresolved_anomaly_count} 条`)
  if (status.materialization_drift_count) issues.push(`授权物化漂移 ${status.materialization_drift_count} 条`)
  if (status.active_outside_effective_window_count) issues.push(`有效期外仍激活 ${status.active_outside_effective_window_count} 条`)
  return `${issues.join('；')}。完成复核与对账后再切换 V2 权威读。`
})
const formDrawerTitle = computed(() => reviewMode.value
  ? isJointForm.value ? '联合核对并确认 Mobile + Win' : '核对并确认产品授权'
  : reissueMode.value
    ? '重新授予产品授权'
    : editingId.value
      ? isJointForm.value ? '共同调整 Mobile + Win' : '调整产品授权'
      : isJointForm.value ? '新建 Mobile + Win 联合授权' : '新建产品授权')
const descriptionColumns = computed(() => narrowDrawer.value ? 1 : 2)
const canCreate = computed(() => authStore.isBackOfficeScopeAll && pageCapabilities.value.can_create === true)

const columns: DataTableColumns<ProductEntitlementItem> = [
  {
    title: '授权主体',
    key: 'subject_name',
    minWidth: 190,
    render: (row) => h('div', { class: 'subject-cell' }, [
      h('span', { class: 'subject-cell__name' }, entitlementSubject(row)),
      h('span', { class: 'subject-cell__meta' }, entitlementSubjectMeta(row)),
    ]),
  },
  {
    title: '产品',
    key: 'product_code',
    width: 150,
    render: (row) => h('div', { class: 'product-cell' }, [
      h(NTag, { type: 'info', round: true }, { default: () => productCodeLabel(row.product_code) }),
      pageCombinationLabel(row) ? h('small', null, pageCombinationLabel(row)) : null,
    ]),
  },
  {
    title: '配置状态',
    key: 'state',
    width: 120,
    render: (row) => h(NTag, { type: entitlementStateTagType(row.state), round: true }, { default: () => productEntitlementStateLabel(row.state) }),
  },
  {
    title: '当前状态',
    key: 'effective_status',
    minWidth: 210,
    render: (row) => {
      const statusLabel = effectiveStatusLabel(row.effective_status)
      const reasonLabel = row.blocking_reason ? blockingReasonLabel(row.blocking_reason) : ''
      return h('div', { class: 'status-cell' }, [
        h(NTag, { type: effectiveStatusTagType(row.effective_status), round: true }, { default: () => statusLabel }),
        reasonLabel && reasonLabel !== statusLabel ? h('span', { class: 'status-cell__reason', title: row.blocking_reason }, reasonLabel) : null,
      ])
    },
  },
  { title: '产品期限', key: 'valid_until', width: 190, render: (row) => entitlementTerm(row) },
  {
    title: '设备额度',
    key: 'device_limit',
    width: 150,
    render: (row) => h('div', { class: 'quota-cell' }, [
      h('span', null, quotaText(row)),
      h('small', null, `当前可用 ${row.usable_device_count ?? 0}`),
    ]),
  },
  {
    title: '迁移确认',
    key: 'migration_state',
    minWidth: 220,
    render: (row) => h('div', { class: 'migration-cell' }, [
      h(NTag, { type: row.migration_state === 'confirmed' ? 'success' : 'warning', round: true }, { default: () => productEntitlementMigrationStateLabel(row.migration_state) }),
      authStore.isBackOfficeScopeAll && row.migration_anomalies?.length ? h('small', null, migrationAnomalySummary(row)) : null,
    ]),
  },
  { title: '代次', key: 'generation', width: 70 },
  {
    title: '操作',
    key: 'actions',
    width: 390,
    fixed: 'right',
    render: (row) => {
      const actions = [
        h(NButton, { size: 'small', onClick: () => openDetail(row) }, { default: () => '详情' }),
        h(NButton, { size: 'small', secondary: true, onClick: () => goDevices(row) }, { default: () => '设备' }),
      ]
      if (rowCanUpdate(row)) {
        actions.push(h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '调整' }))
        actions.push(h(NButton, { size: 'small', secondary: true, onClick: () => openJointEdit(row) }, { default: () => '共同调整' }))
      }
      if (rowCanConfirm(row)) {
        actions.push(h(NButton, { size: 'small', type: 'warning', ghost: true, onClick: () => openReview(row) }, { default: () => '核对并确认' }))
        actions.push(h(NButton, { size: 'small', type: 'warning', secondary: true, onClick: () => openJointReview(row) }, { default: () => '联合复核' }))
      }
      if (rowCanReissue(row)) {
        actions.push(h(NButton, { size: 'small', type: 'warning', onClick: () => openReissue(row) }, { default: () => '重新授予' }))
      }
      if (rowCanRevoke(row)) {
        actions.push(h(NButton, { size: 'small', type: 'error', ghost: true, onClick: () => openRevoke(row) }, { default: () => '撤销' }))
      }
      return h('div', { class: 'table-actions' }, actions)
    },
  },
]

const legacyColumns: DataTableColumns<LicenseItem> = [
  { title: '旧授权 ID', key: 'id', width: 100 },
  { title: '登记用户', key: 'username', minWidth: 130, render: (row) => row.username || (row.user_id ? `用户 #${row.user_id}` : '-') },
  { title: '设备 ID', key: 'device_fingerprint_id', width: 100, render: (row) => row.device_fingerprint_id ?? '-' },
  { title: '产品', key: 'client_type', width: 90, render: (row) => productCodeLabel(row.client_type) },
  {
    title: '服务端判定',
    key: 'effective_status',
    minWidth: 190,
    render: (row) => h('div', { class: 'status-cell' }, [
      h(NTag, { type: legacyStatusTagType(row), round: true }, { default: () => legacyStatusLabel(row) }),
      row.blocking_reason ? h('span', { class: 'status-cell__reason', title: row.blocking_reason }, blockingReasonLabel(row.blocking_reason)) : null,
    ]),
  },
  { title: '固定截止', key: 'effective_until', width: 180, render: (row) => formatValidityDateTime(row.effective_until ?? row.valid_until) },
  {
    title: '操作',
    key: 'actions',
    width: 170,
    fixed: 'right',
    render: (row) => {
      const actions = [h(NButton, { size: 'small', secondary: true, onClick: () => goLegacyDevice(row) }, { default: () => '定位设备' })]
      return h('div', { class: 'table-actions' }, actions)
    },
  },
]

function entitlementSubject(row: ProductEntitlementItem) {
  return row.subject_name || row.company_name || row.owner_username || (row.company_id ? `企业 #${row.company_id}` : `个人用户 #${row.owner_user_id ?? '-'}`)
}

function entitlementSubjectKey(row: ProductEntitlementItem) {
  return row.company_id ? `company:${row.company_id}` : `user:${row.owner_user_id ?? 0}`
}

function pageCounterpart(row: ProductEntitlementItem) {
  const counterpart = row.product_code === 'mobile' ? 'win' : 'mobile'
  return rows.value.find((candidate) => entitlementSubjectKey(candidate) === entitlementSubjectKey(row) && candidate.product_code === counterpart)
}

function pageCombinationLabel(row: ProductEntitlementItem) {
  const counterpart = pageCounterpart(row)
  if (!counterpart) return ''
  const sharedConfiguration = row.state === counterpart.state
    && row.migration_state === counterpart.migration_state
    && row.generation === counterpart.generation
    && (row.valid_from || null) === (counterpart.valid_from || null)
    && (row.valid_until || null) === (counterpart.valid_until || null)
  return sharedConfiguration ? 'Mobile + Win 均有权益 · 配置一致' : 'Mobile + Win 均有权益 · 配置有差异'
}

function entitlementSubjectMeta(row: ProductEntitlementItem) {
  if (row.company_id) return `企业主体 · ID ${row.company_id}`
  return `个人主体 · 用户 ID ${row.owner_user_id ?? '-'}`
}

function entitlementTerm(row: ProductEntitlementItem) {
  if (!row.valid_until) return '长期有效'
  return `固定截止 · ${formatDateTime(row.valid_until)}`
}

function allocatedDeviceCount(row: ProductEntitlementItem) {
  return row.allocated_device_count ?? row.bound_device_count ?? 0
}

function quotaText(row: ProductEntitlementItem) {
  const limit = row.device_limit == null ? '不限' : String(row.device_limit)
  return `${allocatedDeviceCount(row)} / ${limit}${row.over_quota ? ' · 已超额' : ''}`
}

function migrationAnomalyTypeLabel(type: string) {
  const labels: Record<string, string> = {
    illegal_scope_or_client: '产品或范围非法',
    noncanonical_product_scope: '产品范围不规范',
    cross_subject_fingerprint: '跨主体设备标识冲突',
    mixed_term_group: '同组授权期限混杂',
    runtime_selection_differs_latest: '运行时选择与最新记录不一致',
    unmapped_legacy_authorization: '旧授权未映射',
  }
  return labels[type] || type
}

function nonAcceptableAnomalyHint(type: string) {
  if (type === 'illegal_scope_or_client' || type === 'noncanonical_product_scope') {
    return '产品范围或客户端标识不是标准 mobile / win，需要先规范化历史数据。'
  }
  if (type === 'cross_subject_fingerprint') return '同一设备标识跨授权主体冲突，需要先核清设备归属。'
  if (type === 'runtime_selection_differs_latest') return '运行时选中的旧授权与最新记录不一致，需要先核清权威记录。'
  if (type === 'unmapped_legacy_authorization') return '旧授权尚未建立 V2 映射，需要先完成映射。'
  return '该异常没有安全的人工接受动作。'
}

function migrationAnomalySummary(row: ProductEntitlementItem) {
  const anomalies = row.migration_anomalies || []
  const types = [...new Set(anomalies.map((item) => migrationAnomalyTypeLabel(item.anomaly_type)))]
  return `${anomalies.length} 条 · ${types.join('、')}`
}

function sourceModeLabel(mode?: string) {
  if (mode === 'v2_only') return 'V2 权威'
  if (mode === 'v2_dual_write') return 'V2 权威 / 双写'
  if (mode === 'legacy_shadow') return '旧模型权威 / V2 影子'
  return mode || '模式待后端确认'
}

function entitlementStateTagType(state?: string): TagType {
  if (state === 'enabled') return 'success'
  if (state === 'revoked') return 'error'
  return 'warning'
}

function effectiveStatusTagType(status?: string): TagType {
  if (status === 'usable') return 'success'
  if (status?.includes('revoked') || status?.includes('expired') || status?.includes('disabled')) return 'error'
  return status ? 'warning' : 'default'
}

function rowCanUpdate(row: ProductEntitlementItem) {
  return authStore.isBackOfficeScopeAll && row.state !== 'revoked' && pageCapabilities.value.can_update === true && row.capabilities?.can_update === true
}

function rowCanConfirm(row: ProductEntitlementItem) {
  return authStore.isBackOfficeScopeAll && row.migration_state === 'needs_review' && pageCapabilities.value.can_confirm === true && row.capabilities?.can_confirm === true
}

function rowCanRevoke(row: ProductEntitlementItem) {
  return rowCanUpdate(row) && pageCapabilities.value.can_revoke === true && row.capabilities?.can_revoke === true
}

function rowCanReissue(row: ProductEntitlementItem) {
  return authStore.isBackOfficeScopeAll && row.state === 'revoked' && row.migration_state === 'confirmed' && pageCapabilities.value.can_reissue === true && row.capabilities?.can_reissue === true
}

function firstQueryString(value: unknown) {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function queryNumber(value: unknown) {
  const parsed = Number(firstQueryString(value))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function applyRouteFilters() {
  filters.company_id = queryNumber(route.query.company_id)
  filters.owner_user_id = filters.company_id ? null : queryNumber(route.query.owner_user_id)
  legacyUserId.value = queryNumber(route.query.user_id)
  const productCode = firstQueryString(route.query.product_code) || firstQueryString(route.query.client_type)
  filters.product_code = productCode === 'win' || productCode === 'mobile' ? productCode : null
  const state = firstQueryString(route.query.state)
  filters.state = state === 'enabled' || state === 'suspended' || state === 'revoked' ? state : null
  const migrationState = firstQueryString(route.query.migration_state)
  filters.migration_state = migrationState === 'needs_review' || migrationState === 'confirmed' ? migrationState : null
  filters.effective_status = firstQueryString(route.query.effective_status) || null
  targetEntitlementId.value = queryNumber(route.query.entitlement_id)
  targetLegacyAuthorizationId.value = queryNumber(route.query.legacy_authorization_id) ?? queryNumber(route.query.authorization_id)
}

async function searchCompanies(keyword = '') {
  companyOptionsLoading.value = true
  const previous = companyOptions.value
  try {
    let next = await fetchCompanySelectOptions(keyword)
    for (const id of [filters.company_id, form.company_id, detail.value?.company_id]) {
      if (!id) continue
      next = mergeSelectedOption(next, previous.find((option) => option.value === id) || { label: `企业 #${id}`, value: id })
    }
    companyOptions.value = next
  } finally {
    companyOptionsLoading.value = false
  }
}

async function searchPersonalUsers(keyword = '') {
  personalUserOptionsLoading.value = true
  const previous = personalUserOptions.value
  try {
    let next: SelectOption[] = (await fetchUserSelectOptions({ keyword, noCompany: true })).filter((option) => option.user.company_id == null)
    for (const id of [filters.owner_user_id, form.owner_user_id, detail.value?.owner_user_id]) {
      if (!id) continue
      next = mergeSelectedOption(next, previous.find((option) => option.value === id) || { label: `个人用户 #${id}`, value: id })
    }
    personalUserOptions.value = next
  } finally {
    personalUserOptionsLoading.value = false
  }
}

function handleCompanyFilterUpdate(value: number | null) {
  if (value != null) filters.owner_user_id = null
}

function handleOwnerFilterUpdate(value: number | null) {
  if (value != null) filters.company_id = null
}

async function fetchList() {
  loading.value = true
  errorText.value = ''
  try {
    const result = await productEntitlementApi.list({
      page: pagination.page,
      page_size: pagination.pageSize,
      company_id: queryValue(filters.company_id),
      owner_user_id: queryValue(filters.owner_user_id),
      product_code: queryValue(filters.product_code),
      state: queryValue(filters.state),
      migration_state: queryValue(filters.migration_state),
      effective_status: queryValue(filters.effective_status),
    })
    rows.value = pageList(result.list)
    pagination.itemCount = result.total
    sourceOfTruth.value = result.source_of_truth || result.mode || rows.value[0]?.source_of_truth || ''
    pageCapabilities.value = result.capabilities || {}
    readiness.value = authStore.isBackOfficeScopeAll ? result.readiness ?? null : null
  } catch (error) {
    rows.value = []
    pagination.itemCount = 0
    readiness.value = null
    errorText.value = apiUnavailableText(error, '产品授权')
  } finally {
    loading.value = false
  }
}

async function applyFilters() {
  pagination.page = 1
  targetEntitlementId.value = null
  targetLegacyAuthorizationId.value = null
  legacyUserId.value = null
  await syncRouteFromFilters()
  await fetchList()
}

async function resetFilters() {
  filters.company_id = null
  filters.owner_user_id = null
  filters.product_code = null
  filters.state = null
  filters.migration_state = null
  filters.effective_status = null
  legacyUserId.value = null
  targetLegacyAuthorizationId.value = null
  targetEntitlementId.value = null
  pagination.page = 1
  await syncRouteFromFilters()
  await fetchList()
}

async function syncRouteFromFilters() {
  internalRouteUpdate = true
  try {
    await router.replace({
      name: 'licenses',
      query: {
        company_id: filters.company_id ? String(filters.company_id) : undefined,
        owner_user_id: filters.owner_user_id ? String(filters.owner_user_id) : undefined,
        product_code: filters.product_code || undefined,
        state: filters.state || undefined,
        migration_state: filters.migration_state || undefined,
        effective_status: filters.effective_status || undefined,
      },
    })
    await nextTick()
  } finally {
    internalRouteUpdate = false
  }
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
  Object.assign(form, emptyForm)
}

function resetReviewAcknowledgements() {
  reviewStateAcknowledged.value = false
  reviewStartAcknowledged.value = false
  reviewTermAcknowledged.value = false
  reviewQuotaAcknowledged.value = false
  reviewAcknowledged.value = false
}

function clearAnomalyResolutionReasons() {
  for (const key of Object.keys(anomalyResolutionReasons)) delete anomalyResolutionReasons[Number(key)]
}

function openCreate() {
  if (!canCreate.value) return
  editingId.value = null
  editingEntitlement.value = null
  jointEntitlements.value = []
  reviewMode.value = false
  resetReviewAcknowledgements()
  clearAnomalyResolutionReasons()
  reissueMode.value = false
  reissueAcknowledged.value = false
  resetForm()
  formVisible.value = true
}

function openEdit(row: ProductEntitlementItem) {
  if (!rowCanUpdate(row)) return
  editingId.value = row.id
  editingEntitlement.value = row
  jointEntitlements.value = []
  reviewMode.value = false
  resetReviewAcknowledgements()
  clearAnomalyResolutionReasons()
  reissueMode.value = false
  reissueAcknowledged.value = false
  Object.assign(form, {
    owner_type: row.company_id ? 'company' : 'user',
    company_id: row.company_id ?? null,
    owner_user_id: row.owner_user_id ?? null,
    product_scope: row.product_code,
    state: row.state,
    migration_state: row.migration_state,
    term_type: row.valid_until ? 'fixed_term' : 'long_term',
    valid_from_value: datePickerValue(row.valid_from),
    valid_until_value: datePickerValue(row.valid_until),
    device_limit: row.device_limit ?? null,
    mobile_device_limit: null,
    win_device_limit: null,
  })
  formVisible.value = true
}

function openReview(row: ProductEntitlementItem) {
  if (!rowCanConfirm(row)) return
  editingId.value = row.id
  editingEntitlement.value = row
  jointEntitlements.value = []
  reviewMode.value = true
  resetReviewAcknowledgements()
  clearAnomalyResolutionReasons()
  reissueMode.value = false
  reissueAcknowledged.value = false
  Object.assign(form, {
    owner_type: row.company_id ? 'company' : 'user',
    company_id: row.company_id ?? null,
    owner_user_id: row.owner_user_id ?? null,
    product_scope: row.product_code,
    state: row.state,
    migration_state: row.migration_state,
    term_type: row.valid_until ? 'fixed_term' : 'long_term',
    valid_from_value: datePickerValue(row.valid_from),
    valid_until_value: datePickerValue(row.valid_until),
    device_limit: row.device_limit ?? null,
    mobile_device_limit: null,
    win_device_limit: null,
  })
  formVisible.value = true
}

function openReissue(row: ProductEntitlementItem) {
  if (!rowCanReissue(row)) return
  editingId.value = row.id
  editingEntitlement.value = row
  jointEntitlements.value = []
  reviewMode.value = false
  resetReviewAcknowledgements()
  clearAnomalyResolutionReasons()
  reissueMode.value = true
  reissueAcknowledged.value = false
  Object.assign(form, {
    owner_type: row.company_id ? 'company' : 'user',
    company_id: row.company_id ?? null,
    owner_user_id: row.owner_user_id ?? null,
    product_scope: row.product_code,
    state: 'enabled',
    migration_state: 'confirmed',
    term_type: row.valid_until ? 'fixed_term' : 'long_term',
    valid_from_value: null,
    valid_until_value: row.valid_until && (datePickerValue(row.valid_until) ?? 0) > Date.now() ? datePickerValue(row.valid_until) : row.valid_until ? addMonthsDatePickerValue(12) : null,
    device_limit: row.device_limit ?? null,
    mobile_device_limit: null,
    win_device_limit: null,
  })
  formVisible.value = true
}

async function loadSubjectEntitlements(row: ProductEntitlementItem) {
  const result = await productEntitlementApi.list({
    page: 1,
    page_size: 10,
    company_id: queryValue(row.company_id),
    owner_user_id: queryValue(row.owner_user_id),
  })
  return pageList(result.list)
    .filter((candidate) => entitlementSubjectKey(candidate) === entitlementSubjectKey(row))
    .filter((candidate) => candidate.product_code === 'mobile' || candidate.product_code === 'win')
    .sort((left, right) => (left.product_code === 'mobile' ? 0 : 1) - (right.product_code === 'mobile' ? 0 : 1))
}

function sameEntitlementSnapshot(left: ProductEntitlementItem, right: ProductEntitlementItem) {
  return left.id === right.id
    && left.product_code === right.product_code
    && left.revision === right.revision
    && left.updated_at === right.updated_at
    && left.state === right.state
    && left.migration_state === right.migration_state
    && left.generation === right.generation
    && (left.valid_from || null) === (right.valid_from || null)
    && (left.valid_until || null) === (right.valid_until || null)
    && (left.device_limit ?? null) === (right.device_limit ?? null)
}

async function verifyJointSnapshotBeforeSubmit() {
  const current = editingEntitlement.value
  if (!current || jointEntitlements.value.length !== 2) return false
  const latestPair = await loadSubjectEntitlements(current)
  const snapshotsCurrent = jointEntitlements.value.every((snapshot) => {
    const latest = latestPair.find((item) => item.product_code === snapshot.product_code)
    return Boolean(latest && sameEntitlementSnapshot(snapshot, latest))
  })
  const latestAllowed = latestPair.length === 2 && latestPair.every((item) => Number.isInteger(item.revision) && item.revision > 0 && (reviewMode.value ? rowCanConfirm(item) : rowCanUpdate(item)))
  if (snapshotsCurrent && latestAllowed) return true
  formVisible.value = false
  await fetchList()
  message.warning('Mobile 或 Win 权益已被其他操作更新，当前表单已关闭。请从最新列表重新打开后再提交，旧表单不会覆盖新数据。')
  return false
}

async function openJointForm(row: ProductEntitlementItem, mode: 'update' | 'review') {
  try {
    const pair = await loadSubjectEntitlements(row)
    const mobile = pair.find((item) => item.product_code === 'mobile')
    const win = pair.find((item) => item.product_code === 'win')
    if (!mobile || !win) {
      const existing = mobile || win
      const missing = mobile ? 'Win' : 'Mobile'
      if (!existing) {
        message.warning('当前主体尚无 Mobile 或 Win 权益，请从“新建产品授权”开始。')
      } else if (existing.state === 'revoked') {
        message.warning(`当前主体的 ${productCodeLabel(existing.product_code)} 权益已撤销，联合新建不会复活它。请从原记录重新授予，并将产品切换为 ${missing} 单独新建缺少的一端。`)
      } else if (existing.migration_state === 'confirmed') {
        message.warning(`当前主体已有已确认的 ${productCodeLabel(existing.product_code)} 权益。联合新建不会覆盖它，请将产品切换为 ${missing} 单独新建缺少的一端。`)
      } else {
        message.warning(`当前主体已有一条待复核的 ${productCodeLabel(existing.product_code)} 草稿。可从“新建产品授权”选择 Mobile + Win；仅当输入与现有草稿完全一致时才会幂等保留并补建 ${missing}，不一致会整批失败。`)
      }
      return
    }
    if (mode === 'review' && (!rowCanConfirm(mobile) || !rowCanConfirm(win))) {
      message.warning('联合复核要求 Mobile 与 Win 都处于“待人工确认”且当前账号拥有确认权限；请改用单项复核。')
      return
    }
    if (mode === 'update' && (!rowCanUpdate(mobile) || !rowCanUpdate(win))) {
      message.warning('共同调整要求 Mobile 与 Win 两条权益都可更新；已撤销或无权限的权益必须单独处理。')
      return
    }
    jointEntitlements.value = [mobile, win]
    editingId.value = mobile.id
    editingEntitlement.value = mobile
    reviewMode.value = mode === 'review'
    resetReviewAcknowledgements()
    clearAnomalyResolutionReasons()
    reissueMode.value = false
    reissueAcknowledged.value = false
    Object.assign(form, {
      owner_type: mobile.company_id ? 'company' : 'user',
      company_id: mobile.company_id ?? null,
      owner_user_id: mobile.owner_user_id ?? null,
      product_scope: 'both',
      state: mobile.state,
      migration_state: mode === 'review' ? 'needs_review' : mobile.migration_state,
      term_type: mobile.valid_until ? 'fixed_term' : 'long_term',
      valid_from_value: datePickerValue(mobile.valid_from),
      valid_until_value: datePickerValue(mobile.valid_until),
      device_limit: null,
      mobile_device_limit: mobile.device_limit ?? null,
      win_device_limit: win.device_limit ?? null,
    })
    formVisible.value = true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '联合授权信息加载失败')
  }
}

function openJointEdit(row: ProductEntitlementItem) {
  return openJointForm(row, 'update')
}

function openJointReview(row: ProductEntitlementItem) {
  return openJointForm(row, 'review')
}

async function reloadReviewEntitlements() {
  const current = editingEntitlement.value
  if (!current) return
  if (jointEntitlements.value.length) {
    const pair = await loadSubjectEntitlements(current)
    const mobile = pair.find((item) => item.product_code === 'mobile')
    const win = pair.find((item) => item.product_code === 'win')
    if (!mobile || !win) throw new Error('重新加载后未找到完整的 Mobile + Win 权益组合')
    const refreshedDetail = detail.value ? pair.find((item) => item.id === detail.value?.id) : null
    if (refreshedDetail) detail.value = refreshedDetail
  } else {
    const fresh = await productEntitlementApi.detail(current.id)
    if (detail.value?.id === fresh.id) detail.value = fresh
  }
  await fetchList()
  formVisible.value = false
  editingId.value = null
  editingEntitlement.value = null
  jointEntitlements.value = []
  reviewMode.value = false
  resetReviewAcknowledgements()
}

async function submitAnomalyResolution(
  anomaly: ReviewAnomaly,
  action: 'accept_as_device_override' | 'normalize_product_scope_to_client',
  confirmation: string,
) {
  const reason = (anomalyResolutionReasons[anomaly.id] || '').trim()
  if (!reason) {
    message.error('请填写核对依据和处置理由')
    return
  }
  if (Array.from(reason).length > 255) {
    message.error('处置理由不能超过 255 个字符')
    return
  }
  if (!/^[0-9a-f]{64}$/i.test(anomaly.evidence_hash || '')) {
    message.error('迁移异常证据指纹缺失或格式无效，请重新加载后再处理')
    return
  }
  const confirmed = await confirmHighRisk(confirmation)
  if (!confirmed) return
  resolvingAnomalyId.value = anomaly.id
  try {
    await authorizationMigrationAnomalyApi.resolve(anomaly.id, {
      action,
      reason,
      expected_evidence_hash: anomaly.evidence_hash,
    })
    delete anomalyResolutionReasons[anomaly.id]
    try {
      await reloadReviewEntitlements()
      message.success('迁移异常已记录人工处置，权益与就绪状态已刷新；请从最新列表重新打开复核')
    } catch (reloadError) {
      message.warning(reloadError instanceof Error ? `迁移异常已处置，但重新加载失败：${reloadError.message}` : '迁移异常已处置，但重新加载失败；请关闭抽屉后刷新页面')
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '迁移异常处置失败')
  } finally {
    resolvingAnomalyId.value = null
  }
}

function resolveMixedTermAnomaly(anomaly: ReviewAnomaly) {
  if (anomaly.anomaly_type !== 'mixed_term_group') return
  return submitAnomalyResolution(
    anomaly,
    'accept_as_device_override',
    `确认将 ${productCodeLabel(anomaly.product_code)} 的旧授权 #${anomaly.legacy_authorization_id} 期限差异接受为设备临时期限例外？证据发生变化时该异常会重新打开。`,
  )
}

function normalizeProductScopeAnomaly(anomaly: ReviewAnomaly) {
  if (anomaly.anomaly_type !== 'noncanonical_product_scope') return
  return submitAnomalyResolution(
    anomaly,
    'normalize_product_scope_to_client',
    `确认将旧授权 #${anomaly.legacy_authorization_id} 的非标准产品范围收窄并规范为当前设备的 ${productCodeLabel(anomaly.product_code)} 客户端类型？不会扩大到其它产品，证据变化时必须重新复核。`,
  )
}

function handleTermTypeUpdate(value: string | number) {
  if (value === 'long_term') {
    form.valid_until_value = null
  } else if (!form.valid_until_value) {
    form.valid_until_value = addMonthsDatePickerValue(12)
  }
}

function validateForm() {
  if (!editingId.value && form.owner_type === 'company' && !form.company_id) return '请选择企业主体'
  if (!editingId.value && form.owner_type === 'user' && !form.owner_user_id) return '请选择个人主体'
  if (form.term_type === 'fixed_term' && !form.valid_until_value) return '请选择固定截止时间'
  if (form.valid_from_value && form.valid_until_value && form.valid_until_value <= form.valid_from_value) return '截止时间必须晚于生效时间'
  if (reviewMode.value && reviewAnomalies.value.length) return '请先逐条处置迁移异常并重新加载权益，再执行确认'
  if (reviewMode.value && !reviewStateAcknowledged.value) return '请明确核对配置状态'
  if (reviewMode.value && !reviewStartAcknowledged.value) return '请明确核对生效时间（含立即生效）'
  if (reviewMode.value && !reviewTermAcknowledged.value) return '请明确核对截止时间或长期有效设置'
  if (reviewMode.value && !reviewQuotaAcknowledged.value) return '请明确核对设备额度（含不限额度）'
  if (reviewMode.value && !reviewAcknowledged.value) return '请确认已依据真实商业授权完成核对'
  if (reissueMode.value && form.valid_until_value && form.valid_until_value <= Date.now()) return '重新授予的固定截止时间必须晚于当前时间'
  if (reissueMode.value && !reissueAcknowledged.value) return '请确认新的期限、额度以及旧用户/设备不会自动恢复'
  return ''
}

function entitlementPayload(): ProductEntitlementPayload {
  const payload: ProductEntitlementPayload = {
    state: form.state,
    valid_from: datePickerISOString(form.valid_from_value),
    valid_until: form.term_type === 'long_term' ? null : datePickerISOString(form.valid_until_value),
    device_limit: form.device_limit,
  }
  if (!editingId.value) {
    payload.product_code = form.product_scope as ProductCode
    payload.migration_state = form.migration_state
    if (form.owner_type === 'company') payload.company_id = form.company_id
    else payload.owner_user_id = form.owner_user_id
  } else if (reviewMode.value || reissueMode.value) {
    if (reissueMode.value) payload.state = 'enabled'
    payload.migration_state = 'confirmed'
    if (reviewMode.value) payload.review_acknowledged = true
    if (reissueMode.value) payload.reissue = true
  }
  return payload
}

function productDeviceLimit(productCode: ProductCode) {
  if (!isJointForm.value) return form.device_limit
  return productCode === 'mobile' ? form.mobile_device_limit : form.win_device_limit
}

function jointCreateItems(): ProductEntitlementPayload[] {
  return (['mobile', 'win'] as ProductCode[]).map((productCode) => {
    const payload: ProductEntitlementPayload = {
      product_code: productCode,
      state: form.state,
      migration_state: 'needs_review',
      valid_from: datePickerISOString(form.valid_from_value),
      valid_until: form.term_type === 'long_term' ? null : datePickerISOString(form.valid_until_value),
      device_limit: productDeviceLimit(productCode),
    }
    if (form.owner_type === 'company') payload.company_id = form.company_id
    else payload.owner_user_id = form.owner_user_id
    return payload
  })
}

function jointUpdateItems(): ProductEntitlementBatchUpdateItem[] {
  return jointEntitlements.value.map((row) => {
    const payload: ProductEntitlementBatchUpdateItem = {
      id: row.id,
      expected_revision: row.revision,
      expected_updated_at: row.updated_at,
      state: form.state,
      valid_from: datePickerISOString(form.valid_from_value),
      valid_until: form.term_type === 'long_term' ? null : datePickerISOString(form.valid_until_value),
      device_limit: productDeviceLimit(row.product_code),
    }
    if (reviewMode.value) {
      payload.migration_state = 'confirmed'
      payload.review_acknowledged = true
    }
    return payload
  })
}

async function existingEntitlementsForCreate() {
  const result = await productEntitlementApi.list({
    page: 1,
    page_size: 10,
    company_id: form.owner_type === 'company' ? queryValue(form.company_id) : undefined,
    owner_user_id: form.owner_type === 'user' ? queryValue(form.owner_user_id) : undefined,
  })
  return pageList(result.list).filter((item) => item.product_code === 'mobile' || item.product_code === 'win')
}

async function submitEntitlement() {
  if (!editingId.value && !canCreate.value) return
  if (editingId.value && (!editingEntitlement.value || (reviewMode.value ? !rowCanConfirm(editingEntitlement.value) : reissueMode.value ? !rowCanReissue(editingEntitlement.value) : !rowCanUpdate(editingEntitlement.value)))) return
  await formRef.value?.validate()
  const formError = validateForm()
  if (formError) {
    message.error(formError)
    return
  }
  if (editingId.value && isJointForm.value) {
    try {
      if (!await verifyJointSnapshotBeforeSubmit()) return
    } catch (error) {
      message.error(error instanceof Error ? error.message : '无法核对 Mobile + Win 最新权益状态')
      return
    }
  }
  let existingJointProducts: ProductEntitlementItem[] = []
  if (!editingId.value && isJointForm.value) {
    try {
      existingJointProducts = await existingEntitlementsForCreate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '无法核对主体已有权益')
      return
    }
    const terminal = existingJointProducts.filter((item) => item.state === 'revoked')
    if (terminal.length) {
      message.error(`该主体已有已撤销的 ${terminal.map((item) => productCodeLabel(item.product_code)).join('、')} 权益。联合新建不会复活或覆盖已撤销权益，请从原记录执行“重新授予”。`)
      return
    }
    const established = existingJointProducts.filter((item) => item.migration_state !== 'needs_review')
    if (established.length) {
      const existingCodes = new Set(existingJointProducts.map((item) => item.product_code))
      const missingProducts = (['mobile', 'win'] as ProductCode[]).filter((product) => !existingCodes.has(product)).map(productCodeLabel)
      message.warning(`该主体已有已确认的 ${established.map((item) => productCodeLabel(item.product_code)).join('、')} 权益，联合新建不会修改它。${missingProducts.length ? `请将产品切换为 ${missingProducts.join('、')} 单独新建缺少的一端。` : '两端权益均已存在，请从列表使用“共同调整”。'}`)
      return
    }
  }
  const existingNotice = existingJointProducts.length
    ? `该主体已有 ${existingJointProducts.map((item) => `${productCodeLabel(item.product_code)} #${item.id}`).join('、')}。服务端仅在已有待复核草稿与本次输入完全一致时幂等保留并补建缺少的一端；不一致会整批失败，不会覆盖。`
    : ''
  const confirmed = await confirmHighRisk(
    reviewMode.value && isJointForm.value
      ? `确认已逐项核对 ${entitlementSubject(editingEntitlement.value!)} 的 Mobile 与 Win 状态、生效时间、授权期限及各自设备额度，并原子确认两条权益？任一条失败都不会部分确认。`
      : reviewMode.value
      ? `确认已逐项核对 ${entitlementSubject(editingEntitlement.value!)} 的状态、生效时间、授权期限和设备额度，并将该权益标记为迁移已确认？`
      : reissueMode.value
      ? `确认重新授予并进入第 ${(editingEntitlement.value?.generation ?? 0) + 1} 代权益？旧用户准入和设备绑定不会自动恢复。`
      : editingId.value && isJointForm.value
        ? '确认共同调整 Mobile 与 Win 的产品状态和期限，并分别应用两端设备额度？任一条发生并发变化或校验失败都会整批回滚。'
      : editingId.value
        ? '确认调整产品状态、期限或设备额度？相关客户端会按新条件重新判定。'
        : isJointForm.value
          ? `确认通过一个事务创建 Mobile 与 Win 两条待复核权益？任一端失败都不会留下半套授权。${existingNotice}`
          : '确认创建这条产品授权？',
  )
  if (!confirmed) return
  saving.value = true
  let jointResultItems: ProductEntitlementItem[] | null = null
  try {
    if (editingId.value && isJointForm.value) {
      const result = await productEntitlementApi.updateBatch({ items: jointUpdateItems() })
      jointResultItems = result.items
      message.success(reviewMode.value ? 'Mobile 与 Win 两条权益已联合复核确认' : 'Mobile 与 Win 两条权益已共同更新')
    } else if (editingId.value) {
      await productEntitlementApi.update(editingId.value, entitlementPayload())
      message.success(reviewMode.value ? '产品授权已按复核内容确认' : reissueMode.value ? '产品已重新授予；请继续启用所需用户准入并重新批准设备' : '产品授权已更新')
    } else if (isJointForm.value) {
      await productEntitlementApi.createBatch({ items: jointCreateItems() })
      message.success('Mobile 与 Win 两条待复核权益已在同一事务中创建')
    } else {
      await productEntitlementApi.create(entitlementPayload())
      message.success(form.migration_state === 'confirmed' ? '产品授权已创建并确认' : '产品授权草稿已创建')
    }
    formVisible.value = false
    if (editingId.value && isJointForm.value) {
      await fetchList()
      if (detail.value && jointResultItems) {
        const refreshedDetail = jointResultItems.find((item) => item.id === detail.value?.id)
        if (refreshedDetail) detail.value = refreshedDetail
      }
    }
    else if (editingId.value) await refreshAfterMutation(editingId.value)
    else await fetchList()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '产品授权保存失败')
  } finally {
    saving.value = false
  }
}

function openRevoke(row: ProductEntitlementItem) {
  if (!rowCanRevoke(row)) return
  revokingEntitlement.value = row
  revokeReason.value = ''
  revokeVisible.value = true
}

async function submitRevoke() {
  const row = revokingEntitlement.value
  if (!row || !rowCanRevoke(row)) return
  const reason = revokeReason.value.trim()
  if (!reason) {
    message.error('请输入撤销原因')
    return
  }
  const confirmed = await confirmHighRisk(`确认撤销 ${entitlementSubject(row)} 的 ${productCodeLabel(row.product_code)} 产品授权？`)
  if (!confirmed) return
  revokeSaving.value = true
  try {
    await productEntitlementApi.update(row.id, { state: 'revoked', revoke_reason: reason })
    message.success('产品授权已撤销')
    revokeVisible.value = false
    await refreshAfterMutation(row.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '撤销失败')
  } finally {
    revokeSaving.value = false
  }
}

async function refreshAfterMutation(id: number) {
  await fetchList()
  if (detailVisible.value && detail.value?.id === id) {
    detail.value = await productEntitlementApi.detail(id)
  }
}

async function openDetail(row: ProductEntitlementItem) {
  detailVisible.value = true
  detail.value = row
  targetLegacyAuthorizationId.value = null
  legacyPagination.page = 1
  try {
    const [fresh] = await Promise.all([productEntitlementApi.detail(row.id), loadLegacyHistory(row)])
    detail.value = fresh
  } catch (error) {
    message.error(error instanceof Error ? error.message : '产品授权详情加载失败')
  }
}

async function openLegacyHistory(entitlement?: ProductEntitlementItem) {
  detailVisible.value = true
  detail.value = entitlement || null
  if (!entitlement) targetLegacyAuthorizationId.value = queryNumber(route.query.legacy_authorization_id)
  legacyPagination.page = 1
  await loadLegacyHistory(entitlement)
}

async function loadLegacyHistory(entitlement?: ProductEntitlementItem) {
  legacyLoading.value = true
  legacyError.value = ''
  try {
    const listParams = {
      page: legacyPagination.page,
      page_size: legacyPagination.pageSize,
      company_id: queryValue(entitlement?.company_id ?? filters.company_id),
      user_id: queryValue(entitlement?.owner_user_id ?? legacyUserId.value ?? filters.owner_user_id),
      client_type: queryValue(entitlement?.product_code ?? filters.product_code),
      status: undefined,
    }
    const [result, targetResult] = await Promise.all([
      licenseApi.list(listParams),
      targetLegacyAuthorizationId.value
        ? licenseApi.list({ id: targetLegacyAuthorizationId.value, page: 1, page_size: 1 })
        : Promise.resolve(null),
    ])
    const pageRows = pageList(result.list)
    const target = pageList(targetResult?.list).find((row) => row.id === targetLegacyAuthorizationId.value)
    legacyRows.value = target && !pageRows.some((row) => row.id === target.id) ? [target, ...pageRows] : pageRows
    legacyPagination.itemCount = result.total
  } catch (error) {
    legacyRows.value = []
    legacyPagination.itemCount = 0
    legacyError.value = apiUnavailableText(error, '旧授权兼容')
  } finally {
    legacyLoading.value = false
  }
}

function handleLegacyPage(page: number) {
  legacyPagination.page = page
  loadLegacyHistory(detail.value || undefined)
}

function handleLegacyPageSize(pageSize: number) {
  legacyPagination.pageSize = pageSize
  legacyPagination.page = 1
  loadLegacyHistory(detail.value || undefined)
}

function legacyStatusLabel(row: LicenseItem) {
  if (row.effective_status && row.effective_status !== 'usable') return effectiveStatusLabel(row.effective_status)
  if (isEffectiveExpired(row.effective_until ?? row.valid_until, row.effective_expired)) return '已过期'
  return authStatusLabel(row.lifecycle_status || row.status)
}

function legacyStatusTagType(row: LicenseItem): TagType {
  if (row.effective_status === 'usable') return 'success'
  if (row.effective_status || isEffectiveExpired(row.effective_until ?? row.valid_until, row.effective_expired) || row.status === 'revoked') return 'error'
  return row.status === 'active' ? 'success' : 'warning'
}

function legacyRowProps(row: LicenseItem) {
  return row.id === targetLegacyAuthorizationId.value ? { class: 'target-row' } : {}
}

function goDevices(row: ProductEntitlementItem) {
  router.push({
    name: 'devices',
    query: {
      entitlement_id: String(row.id),
      tab: row.product_code === 'win' ? 'win' : undefined,
    },
  })
}

function goLegacyDevice(row: LicenseItem) {
  router.push({
    name: 'devices',
    query: {
      device_fingerprint_id: row.device_fingerprint_id ? String(row.device_fingerprint_id) : undefined,
      legacy_authorization_id: String(row.id),
      tab: row.client_type === 'win' ? 'win' : undefined,
    },
  })
}

function apiUnavailableText(error: unknown, resource: string) {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 404) return `${resource} API 尚未可用，请确认测试服 Backend 已部署 AUTH-V2。`
  return error instanceof Error ? error.message : `${resource}数据加载失败`
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

async function loadRouteTarget() {
  if (targetEntitlementId.value) {
    try {
      const entitlement = await productEntitlementApi.detail(targetEntitlementId.value)
      await openDetail(entitlement)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '目标产品授权加载失败')
    }
  } else if (targetLegacyAuthorizationId.value) {
    await openLegacyHistory()
  }
}

watch(
  () => [
    route.query.company_id,
    route.query.owner_user_id,
    route.query.user_id,
    route.query.product_code,
    route.query.client_type,
    route.query.state,
    route.query.migration_state,
    route.query.effective_status,
    route.query.entitlement_id,
    route.query.legacy_authorization_id,
    route.query.authorization_id,
  ],
  async () => {
    if (internalRouteUpdate) return
    applyRouteFilters()
    pagination.page = 1
    await fetchList()
    await Promise.all([searchCompanies(), searchPersonalUsers()])
    await loadRouteTarget()
  },
)

watch(
  () => form.owner_type,
  (ownerType) => {
    if (ownerType === 'company') form.owner_user_id = null
    else form.company_id = null
  },
)

watch(
  () => form.product_scope,
  (scope, previous) => {
    if (editingId.value) return
    if (previous === 'both' && scope === 'mobile') form.device_limit = form.mobile_device_limit
    if (previous === 'both' && scope === 'win') form.device_limit = form.win_device_limit
    if (scope === 'both' && previous === 'mobile') form.mobile_device_limit = form.device_limit
    if (scope === 'both' && previous === 'win') form.win_device_limit = form.device_limit
  },
)

watch(
  () => form.state,
  () => {
    if (!reviewMode.value) return
    reviewStateAcknowledged.value = false
    reviewAcknowledged.value = false
  },
)

watch(
  () => form.valid_from_value,
  () => {
    if (!reviewMode.value) return
    reviewStartAcknowledged.value = false
    reviewAcknowledged.value = false
  },
)

watch(
  () => [form.term_type, form.valid_until_value],
  () => {
    if (!reviewMode.value) return
    reviewTermAcknowledged.value = false
    reviewAcknowledged.value = false
  },
)

watch(
  () => [form.device_limit, form.mobile_device_limit, form.win_device_limit],
  () => {
    if (!reviewMode.value) return
    reviewQuotaAcknowledged.value = false
    reviewAcknowledged.value = false
  },
)

onMounted(async () => {
  applyRouteFilters()
  await fetchList()
  if (authStore.isBackOfficeScopeAll) {
    try {
      await Promise.all([searchCompanies(), searchPersonalUsers()])
    } catch (error) {
      errorText.value = error instanceof Error ? error.message : '筛选项加载失败'
    }
  }
  await loadRouteTarget()
})
</script>

<style scoped>
.model-note,
.readiness-note,
.page-error {
  margin-bottom: 16px;
}

.readiness-note :deep(.n-alert-body__content) {
  display: grid;
  gap: 4px;
}

.model-note__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.drawer-note,
.legacy-note {
  margin-bottom: 16px;
}

.reissue-warning {
  display: grid;
  gap: 10px;
}

.anomaly-resolution-list,
.anomaly-resolution-item {
  display: grid;
  gap: 10px;
}

.anomaly-resolution-item {
  border-top: 1px solid var(--border-color);
  padding-top: 10px;
}

.anomaly-resolution-item__hint {
  color: var(--text-color-2);
  font-size: 13px;
}

.subject-cell,
.product-cell,
.status-cell,
.quota-cell,
.migration-cell {
  display: grid;
  gap: 4px;
}

.subject-cell__name {
  font-weight: 600;
}

.subject-cell__meta,
.product-cell small,
.status-cell__reason,
.quota-cell small,
.migration-cell small {
  color: var(--text-color-3);
  font-size: 12px;
}

.status-cell__reason {
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-actions {
  margin-top: 16px;
}

:deep(.target-row td) {
  background: rgba(245, 159, 0, 0.12) !important;
}

@media (max-width: 700px) {
  .model-note__content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
