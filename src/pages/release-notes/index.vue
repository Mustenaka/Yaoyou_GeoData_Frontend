<template>
  <div class="page-shell">
    <PageHeader title="版本更新日志" subtitle="后端服务与后台发布版本的只读更新说明。">
      <n-tag type="info" round>CHANGELOG 只读</n-tag>
    </PageHeader>

    <n-alert type="info" :bordered="false">
      数据源：前端仓库 CHANGELOG.md，只读渲染；后续可迁移到后端 release_notes 表并增加维护入口。
    </n-alert>

    <div class="release-grid">
      <section class="page-card release-summary">
        <div class="summary-label">最新版本</div>
        <strong>v{{ latestNote?.version || '-' }}</strong>
        <span>{{ latestNote?.date || '未标注日期' }}</span>
      </section>

      <div class="release-list">
        <article v-for="note in notes" :key="`${note.version}-${note.date}`" class="release-note">
          <div class="release-note__head">
            <div>
              <strong>v{{ note.version }}</strong>
              <span>{{ note.date || '未标注日期' }}</span>
            </div>
            <n-tag :type="note === latestNote ? 'success' : 'default'" round>
              {{ note === latestNote ? '当前发布' : '历史版本' }}
            </n-tag>
          </div>

          <div class="release-note__sections">
            <section v-for="section in note.sections" :key="section.heading" class="release-section">
              <h3>{{ section.heading }}</h3>
              <ul>
                <li v-for="item in section.items" :key="item">{{ item }}</li>
              </ul>
            </section>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import changelog from '../../../CHANGELOG.md?raw'

interface ReleaseSection {
  heading: string
  items: string[]
}

interface ReleaseNote {
  version: string
  date: string
  sections: ReleaseSection[]
}

function parseChangelog(raw: string) {
  const notes: ReleaseNote[] = []
  let current: ReleaseNote | null = null
  let currentSection: ReleaseSection | null = null

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('# ')) continue

    if (trimmed.startsWith('## ')) {
      const title = trimmed.slice(3).trim()
      const [version, date = ''] = title.split(/\s+-\s+/, 2)
      current = { version: version.replace(/^v/i, ''), date, sections: [] }
      currentSection = null
      notes.push(current)
      continue
    }

    if (trimmed.startsWith('### ') && current) {
      currentSection = { heading: trimmed.slice(4).trim(), items: [] }
      current.sections.push(currentSection)
      continue
    }

    if (trimmed.startsWith('- ') && current) {
      if (!currentSection) {
        currentSection = { heading: '更新说明', items: [] }
        current.sections.push(currentSection)
      }
      currentSection.items.push(trimmed.slice(2).trim())
    }
  }

  return notes
}

const notes = computed(() => parseChangelog(changelog))
const latestNote = computed(() => notes.value[0] || null)
</script>

<style scoped>
.release-grid {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 14px;
}

.release-summary {
  align-self: start;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.release-summary strong {
  color: var(--yy-text);
  font-size: 26px;
}

.release-summary span,
.summary-label {
  color: var(--yy-text-secondary);
}

.summary-label {
  font-size: 13px;
}

.release-list {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 14px;
}

.release-note {
  min-width: 0;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-surface);
  box-shadow: 0 12px 30px var(--yy-shadow);
  padding: 16px;
}

.release-note__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--yy-border);
  padding-bottom: 12px;
}

.release-note__head div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.release-note__head strong {
  color: var(--yy-text);
  font-size: 18px;
}

.release-note__head span {
  color: var(--yy-text-muted);
  font-size: 13px;
}

.release-note__sections {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 14px;
}

.release-section h3 {
  margin: 0 0 8px;
  color: var(--yy-text);
  font-size: 15px;
}

.release-section ul {
  margin: 0;
  padding-left: 18px;
  color: var(--yy-text-secondary);
  line-height: 1.75;
}

@media (max-width: 900px) {
  .release-grid,
  .release-note__sections {
    grid-template-columns: 1fr;
  }
}
</style>
