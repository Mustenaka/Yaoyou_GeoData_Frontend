<template>
  <div class="page-shell">
    <PageHeader title="移动端功能设置" subtitle="配置移动端“智能填充”数据查看入口是否隐藏；只影响入口可见性，不影响整表填充和底层配置数据。">
      <n-space>
        <n-button :loading="loading" @click="loadPolicy">
          <template #icon>
            <n-icon :component="RefreshOutline" />
          </template>
          刷新
        </n-button>
      </n-space>
    </PageHeader>

    <n-alert v-if="errorText" type="error" closable @close="errorText = ''">
      <div class="error-line">
        <span>{{ errorText }}</span>
        <n-button size="small" text type="primary" @click="loadPolicy">重试</n-button>
      </div>
    </n-alert>

    <n-spin :show="loading">
      <div class="feature-grid">
        <section class="page-card">
          <div class="section-head">
            <div>
              <h2>隐藏智能填充全局开关</h2>
              <p>开启后，所有企业的移动端都会隐藏“智能填充”数据查看/预览入口；智能填充执行功能仍可用。</p>
            </div>
            <n-switch v-model:value="globalHidden" size="large" />
          </div>
          <div class="card-actions">
            <n-text depth="3">隐藏智能填充全局开关开启时，下方企业开关仅保留配置值，实际下发效果统一为隐藏。</n-text>
            <n-button type="primary" :loading="globalSaving" @click="saveGlobalHidden">
              <template #icon>
                <n-icon :component="SaveOutline" />
              </template>
              保存隐藏智能填充全局开关
            </n-button>
          </div>
        </section>

        <section class="page-card table-card">
          <div class="table-head">
            <div>
              <h2>按企业隐藏智能填充入口</h2>
              <p>未开启隐藏智能填充全局开关时，可为单个企业隐藏移动端“智能填充”数据查看/预览入口；列表已按当前账号权限过滤。</p>
            </div>
            <n-input v-model:value="keyword" clearable placeholder="搜索企业名称" class="company-search" />
          </div>

          <n-data-table
            :columns="columns"
            :data="filteredCompanies"
            :loading="loading"
            :pagination="{ pageSize: 12 }"
            :row-key="rowKey"
            :bordered="false"
          >
            <template #empty>
              <n-empty :description="emptyDescription" />
            </template>
          </n-data-table>
        </section>
      </div>
    </n-spin>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { NSwitch, NTag, NText, useMessage, type DataTableColumns } from 'naive-ui'
import { RefreshOutline, SaveOutline } from '@vicons/ionicons5'
import PageHeader from '@/components/PageHeader.vue'
import { mobileFeatureApi, type MobileSmartFillCompany } from '@/api/mobile-feature'

const message = useMessage()
const loading = ref(false)
const globalSaving = ref(false)
const errorText = ref('')
const keyword = ref('')
const globalHidden = ref(false)
const savedGlobalHidden = ref(false)
const companies = ref<MobileSmartFillCompany[]>([])
const savingCompanyIds = ref<Set<number>>(new Set())

const filteredCompanies = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return companies.value
  return companies.value.filter((company) => company.company_name.toLowerCase().includes(query))
})

const emptyDescription = computed(() => {
  if (loading.value) return '正在加载企业智能填充隐藏设置'
  if (keyword.value.trim()) return '没有匹配企业'
  return '暂无企业智能填充隐藏设置'
})

const columns = computed<DataTableColumns<MobileSmartFillCompany>>(() => [
  {
    title: '企业名称',
    key: 'company_name',
    minWidth: 220,
    render: (row) => h('span', row.company_name || '-'),
  },
  {
    title: '隐藏智能填充入口',
    key: 'hidden',
    width: 260,
    render: (row) =>
      h(
        'div',
        { class: 'switch-cell' },
        [
          h(NSwitch, {
            value: row.hidden,
            disabled: globalHidden.value,
            loading: savingCompanyIds.value.has(row.company_id),
            onUpdateValue: (value: boolean) => updateCompanyHidden(row, value),
          }),
          globalHidden.value
            ? h(NTag, { size: 'small', type: 'warning', bordered: false }, { default: () => '已被全局隐藏覆盖' })
            : h(NText, { depth: 3 }, { default: () => (row.hidden ? '该企业隐藏入口' : '该企业入口可见') }),
        ],
      ),
  },
])

function rowKey(row: MobileSmartFillCompany) {
  return row.company_id
}

function setCompanySaving(companyId: number, saving: boolean) {
  const next = new Set(savingCompanyIds.value)
  if (saving) {
    next.add(companyId)
  } else {
    next.delete(companyId)
  }
  savingCompanyIds.value = next
}

async function loadPolicy() {
  loading.value = true
  errorText.value = ''
  try {
    const data = await mobileFeatureApi.smartFill()
    globalHidden.value = data.global_hidden
    savedGlobalHidden.value = data.global_hidden
    companies.value = (data.companies || []).map((item) => ({ ...item }))
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '移动端功能设置加载失败'
  } finally {
    loading.value = false
  }
}

async function saveGlobalHidden() {
  globalSaving.value = true
  errorText.value = ''
  const previous = savedGlobalHidden.value
  try {
    const data = await mobileFeatureApi.updateSmartFillGlobal(globalHidden.value)
    globalHidden.value = data.global_hidden
    savedGlobalHidden.value = data.global_hidden
    message.success('隐藏智能填充全局开关已保存')
  } catch (error) {
    globalHidden.value = previous
    errorText.value = error instanceof Error ? error.message : '隐藏智能填充全局开关保存失败'
  } finally {
    globalSaving.value = false
  }
}

async function updateCompanyHidden(row: MobileSmartFillCompany, hidden: boolean) {
  if (globalHidden.value || savingCompanyIds.value.has(row.company_id)) return
  const previous = row.hidden
  row.hidden = hidden
  setCompanySaving(row.company_id, true)
  try {
    const data = await mobileFeatureApi.updateSmartFillCompany(row.company_id, hidden)
    row.hidden = data.hidden
    message.success(`${row.company_name} 已更新`)
  } catch (error) {
    row.hidden = previous
    message.error(error instanceof Error ? error.message : '企业智能填充隐藏设置保存失败')
  } finally {
    setCompanySaving(row.company_id, false)
  }
}

onMounted(loadPolicy)
</script>

<style scoped>
.feature-grid {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 14px;
}

.section-head,
.table-head,
.card-actions {
  display: flex;
  gap: 14px;
}

.section-head,
.table-head {
  align-items: flex-start;
  justify-content: space-between;
}

.section-head h2,
.table-head h2 {
  margin: 0;
  font-size: 16px;
}

.section-head p,
.table-head p {
  margin: 6px 0 0;
  color: var(--yy-text-muted);
  line-height: 1.6;
}

.card-actions {
  align-items: center;
  justify-content: space-between;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--yy-border);
}

.table-card {
  min-width: 0;
}

.company-search {
  width: 240px;
}

.switch-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.error-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 1080px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .section-head,
  .table-head,
  .card-actions {
    flex-direction: column;
  }

  .company-search {
    width: 100%;
  }
}
</style>
