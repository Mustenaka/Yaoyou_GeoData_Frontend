<template>
  <div class="page-shell">
    <PageHeader title="Win 功能设置" subtitle="控制企业是否可使用 SKY 与 Huaning 项目云归集接口。日志、登录和注册不受此处影响。" />

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      <div class="error-line"><span>{{ errorText }}</span><n-button text type="primary" size="small" @click="loadPolicy">重试</n-button></div>
    </n-alert>

    <n-spin :show="loading">
      <section class="page-card">
        <div class="section-head">
          <div>
            <h2>全局开关</h2>
            <p>关闭后，所有企业的对应 Win 项目接口都会被后端拒绝；企业开关仍保留配置值。</p>
          </div>
          <n-button :loading="loading" @click="loadPolicy">刷新</n-button>
        </div>
        <n-empty v-if="!features.length && !loading" description="暂无 Win 功能策略" />
        <div v-else class="feature-grid">
          <div v-for="feature in features" :key="feature.key" class="feature-card">
            <div>
              <strong>{{ feature.label }}</strong>
              <p>{{ feature.global_disabled ? '已全局停用' : '全局可用' }}</p>
            </div>
            <n-switch :value="!feature.global_disabled" :loading="savingGlobal.has(feature.key)" @update:value="(enabled) => updateGlobal(feature, !enabled)">
              <template #checked>可用</template><template #unchecked>停用</template>
            </n-switch>
          </div>
        </div>
      </section>

      <section class="page-card table-card">
        <div class="section-head">
          <div><h2>企业开关</h2><p>企业设置在全局停用时会被覆盖；生效状态由后端作为最终权限闸。</p></div>
          <n-input v-model:value="keyword" clearable placeholder="搜索企业名称" class="company-search" />
        </div>
        <n-data-table :columns="columns" :data="filteredCompanies" :loading="loading" :pagination="{ pageSize: 12 }" :row-key="(row: WinFeatureCompany) => row.company_id" :bordered="false">
          <template #empty><n-empty :description="keyword ? '没有匹配企业' : '暂无企业策略'" /></template>
        </n-data-table>
      </section>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { NSwitch, NTag, NText, useMessage, type DataTableColumns } from 'naive-ui'
import PageHeader from '@/components/PageHeader.vue'
import { winFeatureApi } from '@/api/win-feature'
import type { WinFeatureCompany, WinFeatureItem, WinFeatureKey } from '@/types/api'

const message = useMessage()
const loading = ref(false)
const errorText = ref('')
const keyword = ref('')
const features = ref<WinFeatureItem[]>([])
const companies = ref<WinFeatureCompany[]>([])
const savingGlobal = ref(new Set<WinFeatureKey>())
const savingCompanies = ref(new Set<string>())

const filteredCompanies = computed(() => {
  const normalized = keyword.value.trim().toLowerCase()
  return normalized ? companies.value.filter((company) => company.company_name.toLowerCase().includes(normalized)) : companies.value
})

const columns = computed<DataTableColumns<WinFeatureCompany>>(() => [
  { title: '企业', key: 'company_name', minWidth: 220 },
  ...features.value.map((feature) => ({
    title: feature.label,
    key: feature.key,
    minWidth: 250,
    render: (company: WinFeatureCompany) => renderCompanyFeature(company, feature),
  })),
])

function updateSet<T>(source: typeof savingGlobal | typeof savingCompanies, key: T, active: boolean) {
  const next = new Set(source.value)
  if (active) next.add(key as never)
  else next.delete(key as never)
  source.value = next as never
}

function companySavingKey(companyId: number, feature: WinFeatureKey) {
  return `${companyId}:${feature}`
}

function renderCompanyFeature(company: WinFeatureCompany, feature: WinFeatureItem) {
  const disabled = Boolean(company.disabled?.[feature.key])
  const effectiveDisabled = Boolean(company.effective_disabled?.[feature.key])
  const saving = savingCompanies.value.has(companySavingKey(company.company_id, feature.key))
  return h('div', { class: 'switch-cell' }, [
    h(NSwitch, { value: !disabled, loading: saving, disabled: feature.global_disabled, onUpdateValue: (enabled: boolean) => updateCompany(company, feature, !enabled) }),
    effectiveDisabled
      ? h(NTag, { size: 'small', type: 'warning', bordered: false }, { default: () => (feature.global_disabled ? '受全局停用覆盖' : '企业已停用') })
      : h(NText, { depth: 3 }, { default: () => '企业可用' }),
  ])
}

async function loadPolicy() {
  loading.value = true
  errorText.value = ''
  try {
    const policy = await winFeatureApi.list()
    features.value = policy.features || []
    companies.value = policy.companies || []
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : 'Win 功能设置加载失败'
  } finally {
    loading.value = false
  }
}

async function updateGlobal(feature: WinFeatureItem, disabled: boolean) {
  if (savingGlobal.value.has(feature.key)) return
  const previous = feature.global_disabled
  feature.global_disabled = disabled
  updateSet(savingGlobal, feature.key, true)
  try {
    await winFeatureApi.updateGlobal(feature.key, disabled)
    await loadPolicy()
    message.success(`${feature.label}全局设置已更新`)
  } catch (error) {
    feature.global_disabled = previous
    message.error(error instanceof Error ? error.message : '全局设置保存失败')
  } finally {
    updateSet(savingGlobal, feature.key, false)
  }
}

async function updateCompany(company: WinFeatureCompany, feature: WinFeatureItem, disabled: boolean) {
  const key = companySavingKey(company.company_id, feature.key)
  if (savingCompanies.value.has(key) || feature.global_disabled) return
  const previous = Boolean(company.disabled?.[feature.key])
  company.disabled[feature.key] = disabled
  updateSet(savingCompanies, key, true)
  try {
    await winFeatureApi.updateCompany(feature.key, company.company_id, disabled)
    await loadPolicy()
    message.success(`${company.company_name}已更新`)
  } catch (error) {
    company.disabled[feature.key] = previous
    message.error(error instanceof Error ? error.message : '企业设置保存失败')
  } finally {
    updateSet(savingCompanies, key, false)
  }
}

onMounted(loadPolicy)
</script>

<style scoped>
.section-head, .error-line, .feature-card, .switch-cell { display: flex; gap: 12px; }
.section-head, .error-line, .feature-card { justify-content: space-between; align-items: center; }
.section-head { margin-bottom: 16px; }
.section-head h2 { margin: 0; font-size: 16px; }
.section-head p { margin: 5px 0 0; color: var(--yy-text-muted); line-height: 1.6; }
.feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
.feature-card { padding: 16px; border: 1px solid var(--yy-border); border-radius: 8px; }
.feature-card p { margin: 5px 0 0; color: var(--yy-text-muted); }
.table-card { margin-top: 16px; }
.company-search { width: 240px; }
.switch-cell { align-items: center; }
@media (max-width: 720px) { .section-head { align-items: flex-start; flex-direction: column; } .company-search { width: 100%; } }
</style>
