<template>
  <n-drawer
    :show="show"
    placement="right"
    width="min(1120px, 96vw)"
    :auto-focus="false"
    @update:show="emit('update:show', $event)"
  >
    <n-drawer-content closable>
      <template #header>
        <div>
          <div class="drawer-title">{{ drawerTitle }}</div>
          <div class="drawer-subtitle">{{ item ? `${item.config_name} · 修订 #${item.revision}` : '读取配置内容' }}</div>
        </div>
      </template>

      <n-spin :show="loading">
        <n-alert v-if="errorText" type="error" closable @close="errorText = ''">{{ errorText }}</n-alert>
        <template v-if="detail && activePayload">
          <n-descriptions bordered :column="descriptionColumns" label-placement="left" size="small" class="meta-block">
            <n-descriptions-item label="配置名称">{{ detail.config_name }}</n-descriptions-item>
            <n-descriptions-item label="分发范围">{{ scopeText }}</n-descriptions-item>
            <n-descriptions-item label="版本">{{ detail.version || '—' }}</n-descriptions-item>
            <n-descriptions-item label="状态">
              <n-tag :type="detail.status === 'published' ? 'success' : 'default'" :bordered="false">
                {{ detail.status === 'published' ? '已发布' : '已撤销' }}
              </n-tag>
            </n-descriptions-item>
            <n-descriptions-item label="源文件">{{ detail.source_filename }}</n-descriptions-item>
            <n-descriptions-item label="发布时间">{{ formatDate(detail.published_at) }}</n-descriptions-item>
          </n-descriptions>

          <n-alert v-if="editing" type="warning" :bordered="false" class="edit-alert">
            简单编辑只修改单元格和数据行，不改变列结构或 Mobile 逻辑标识。保存会发布一个新修订，当前历史版本不会被覆盖。
          </n-alert>

          <div class="table-toolbar">
            <n-space align="center" wrap>
              <n-tag :bordered="false">{{ objectLabel }}</n-tag>
              <n-text depth="3">{{ tableRows.length }} 行 · {{ schemaColumns.length }} 列</n-text>
            </n-space>
            <n-space wrap>
              <n-dropdown trigger="click" :options="downloadOptions" @select="requestDownload">
                <n-button secondary>下载</n-button>
              </n-dropdown>
              <n-button v-if="!editing" type="primary" secondary @click="beginEdit">简单编辑</n-button>
              <n-button v-else type="primary" secondary @click="addRow">新增一行</n-button>
            </n-space>
          </div>

          <n-data-table
            :columns="tableColumns"
            :data="tableRows"
            :row-key="rowKey"
            :scroll-x="tableScrollWidth"
            :max-height="520"
            size="small"
            striped
          >
            <template #empty><n-empty description="配置中没有可预览的数据行" /></template>
          </n-data-table>
        </template>
        <n-empty v-else-if="!loading" description="未读取到配置内容" />
      </n-spin>

      <template v-if="editing" #footer>
        <div class="edit-footer">
          <div class="revision-fields">
            <n-input v-model:value="editVersion" maxlength="64" clearable placeholder="新版本标识（留空由服务器生成）" />
            <n-input v-model:value="editNote" maxlength="500" clearable placeholder="发布说明" />
          </div>
          <n-space>
            <n-button :disabled="saving" @click="cancelEdit">取消编辑</n-button>
            <n-button type="primary" :loading="saving" @click="publishRevision">发布为新修订</n-button>
          </n-space>
        </div>
      </template>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { NButton, NInput, NTag, useMessage, type DataTableColumns, type DropdownOption } from 'naive-ui'
import {
  configDistributionApi,
  type ConfigDistributionDownloadFormat,
  type ConfigDistributionItem,
  type ConfigDistributionPayload,
  type SmartFillConfigPayload,
} from '@/api/config-distribution'

interface SchemaColumn {
  key: string
  label: string
  width: number
  role: 'condition' | 'equals' | 'generate' | 'equipment'
  locked: boolean
}

const props = defineProps<{
  show: boolean
  item: ConfigDistributionItem | null
  startInEditMode?: boolean
}>()
const emit = defineEmits<{
  'update:show': [value: boolean]
  published: [item: ConfigDistributionItem]
  download: [item: ConfigDistributionItem, format: ConfigDistributionDownloadFormat]
}>()

const message = useMessage()
const loading = ref(false)
const saving = ref(false)
const errorText = ref('')
const detail = ref<ConfigDistributionItem | null>(null)
const editing = ref(false)
const editedPayload = ref<ConfigDistributionPayload | null>(null)
const editVersion = ref('')
const editNote = ref('')
let loadSequence = 0

const drawerTitle = computed(() => editing.value ? '编辑并发布新修订' : '配置预览')
const objectLabel = computed(() => detail.value?.object_type === 'smart_fill_config' ? '智能填充配置' : '器械管理配置')
const activePayload = computed(() => editing.value ? editedPayload.value : detail.value?.payload || null)
const descriptionColumns = computed(() => window.innerWidth < 760 ? 1 : 2)
const scopeText = computed(() => {
  if (!detail.value) return '—'
  return detail.value.scope === 'company'
    ? (detail.value.company_name || `企业 #${detail.value.company_id}`)
    : '全部企业'
})
const downloadOptions: DropdownOption[] = [
  { label: 'Excel（.xlsx）', key: 'xlsx' },
  { label: 'CSV（.csv）', key: 'csv' },
  { label: '完整 JSON', key: 'json' },
]

const schemaColumns = computed<SchemaColumn[]>(() => {
  const payload = activePayload.value
  if (!payload) return []
  if (isSmartFillPayload(payload)) {
    const widths = payload.columnWidths || {}
    return [
      ...payload.conditionColumns.map((label) => schemaColumn(label, label, widths[label], 'condition')),
      schemaColumn(payload.equalsColumn, payload.equalsColumn, widths[payload.equalsColumn] || 90, 'equals'),
      ...payload.generateColumns.map((label) => schemaColumn(label, label, widths[label], 'generate')),
    ]
  }
  return payload.config.columns.map((column) => ({
    key: column.key,
    label: column.label,
    width: clampWidth(column.width),
    role: 'equipment',
    locked: Boolean(column.locked),
  }))
})

const tableRows = computed<Array<Record<string, string>>>(() => {
  const payload = activePayload.value
  if (!payload) return []
  return isSmartFillPayload(payload) ? payload.rows : payload.config.rows
})
const tableScrollWidth = computed(() => schemaColumns.value.reduce((sum, column) => sum + column.width, editing.value ? 96 : 0))
const tableColumns = computed<DataTableColumns<Record<string, string>>>(() => {
  const columns: DataTableColumns<Record<string, string>> = schemaColumns.value.map((column) => ({
    title: () => h('div', { class: 'column-title' }, [
      h('span', column.label),
      column.role !== 'equipment'
        ? h(NTag, { size: 'small', bordered: false, type: roleTagType(column.role) }, { default: () => roleLabel(column.role) })
        : null,
    ]),
    key: column.key,
    width: column.width,
    ellipsis: editing.value ? false : { tooltip: true },
    render: (row, rowIndex) => {
      if (!editing.value || column.locked) return row[column.key] || '—'
      return h(NInput, {
        value: row[column.key] || '',
        size: 'small',
        placeholder: '留空',
        'onUpdate:value': (value: string) => updateCell(rowIndex, column.key, value),
      })
    },
  }))
  if (editing.value) {
    columns.push({
      title: '操作', key: '__actions', width: 96, fixed: 'right',
      render: (_, rowIndex) => h(NButton, {
        size: 'small', type: 'error', tertiary: true, disabled: tableRows.value.length <= 1,
        onClick: () => removeRow(rowIndex),
      }, { default: () => '删除行' }),
    })
  }
  return columns
})

function schemaColumn(key: string, label: string, width: number | undefined, role: SchemaColumn['role']): SchemaColumn {
  return { key, label, width: clampWidth(width), role, locked: false }
}

function clampWidth(width?: number) {
  return Math.max(120, Math.min(320, Number(width) || 180))
}

function isSmartFillPayload(payload: ConfigDistributionPayload): payload is SmartFillConfigPayload {
  return 'conditionColumns' in payload
}

function roleLabel(role: SchemaColumn['role']) {
  if (role === 'condition') return '条件'
  if (role === 'equals') return '等于'
  if (role === 'generate') return '生成'
  return ''
}

function roleTagType(role: SchemaColumn['role']): 'info' | 'warning' | 'success' {
  if (role === 'condition') return 'info'
  if (role === 'equals') return 'warning'
  return 'success'
}

function rowKey(row: Record<string, string>) {
  return tableRows.value.indexOf(row)
}

function clonePayload(payload: ConfigDistributionPayload): ConfigDistributionPayload {
  return JSON.parse(JSON.stringify(payload)) as ConfigDistributionPayload
}

async function loadDetail() {
  if (!props.show || !props.item) return
  const sequence = ++loadSequence
  loading.value = true
  errorText.value = ''
  detail.value = null
  editing.value = false
  editedPayload.value = null
  try {
    const value = await configDistributionApi.detail(props.item.id)
    if (sequence !== loadSequence) return
    detail.value = value
    if (props.startInEditMode) beginEdit()
  } catch (error) {
    if (sequence === loadSequence) errorText.value = error instanceof Error ? error.message : '配置详情加载失败'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

function beginEdit() {
  if (!detail.value?.payload) return
  editedPayload.value = clonePayload(detail.value.payload)
  editVersion.value = ''
  editNote.value = `基于修订 #${detail.value.revision} 后台简单编辑`
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  editedPayload.value = null
  errorText.value = ''
}

function updateCell(rowIndex: number, key: string, value: string) {
  const row = tableRows.value[rowIndex]
  if (row) row[key] = value
}

function addRow() {
  const row = schemaColumns.value.reduce<Record<string, string>>((value, column) => {
    value[column.key] = column.key === 'seq' ? String(tableRows.value.length + 1) : ''
    return value
  }, {})
  tableRows.value.push(row)
}

function removeRow(rowIndex: number) {
  if (tableRows.value.length <= 1) return
  tableRows.value.splice(rowIndex, 1)
  resequenceEquipmentRows()
}

function resequenceEquipmentRows() {
  const payload = editedPayload.value
  if (!payload || isSmartFillPayload(payload) || !payload.config.columns.some((column) => column.key === 'seq')) return
  payload.config.rows.forEach((row, index) => { row.seq = String(index + 1) })
}

async function publishRevision() {
  if (!detail.value || !editedPayload.value || tableRows.value.length === 0) return
  saving.value = true
  errorText.value = ''
  try {
    const filenameStem = detail.value.source_filename
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .trim() || 'config'
    const file = new File(
      [JSON.stringify(editedPayload.value, null, 2)],
      `${filenameStem}.edited.json`,
      { type: 'application/json' },
    )
    const published = await configDistributionApi.publish({
      object_type: detail.value.object_type,
      config_name: detail.value.config_name,
      scope: detail.value.scope,
      company_id: detail.value.company_id || undefined,
      version: editVersion.value,
      publish_note: editNote.value,
      file,
    })
    detail.value = published
    editing.value = false
    editedPayload.value = null
    message.success(`已发布修订 #${published.revision}`)
    emit('published', published)
  } catch (error) {
    errorText.value = error instanceof Error ? error.message : '编辑后的配置发布失败'
  } finally {
    saving.value = false
  }
}

function requestDownload(key: string | number) {
  if (!detail.value || !['xlsx', 'csv', 'json'].includes(String(key))) return
  emit('download', detail.value, String(key) as ConfigDistributionDownloadFormat)
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN', { hour12: false })
}

watch(() => [props.show, props.item?.id, props.startInEditMode] as const, loadDetail)
</script>

<style scoped>
.drawer-title {
  font-size: 17px;
  font-weight: 700;
}

.drawer-subtitle {
  margin-top: 3px;
  color: var(--yy-text-muted);
  font-size: 13px;
  font-weight: 400;
}

.meta-block,
.edit-alert {
  margin-bottom: 16px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

:deep(.column-title) {
  display: flex;
  align-items: center;
  gap: 6px;
}

.edit-footer {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.revision-fields {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(180px, 0.65fr) minmax(260px, 1.35fr);
  gap: 10px;
}

@media (max-width: 760px) {
  .table-toolbar,
  .edit-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .revision-fields {
    grid-template-columns: 1fr;
  }
}
</style>
