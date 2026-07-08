<template>
  <div class="page-shell">
    <PageHeader :title="pageTitle" subtitle="敬请期待 / 后续实现" />

    <div class="placeholder-panel">
      <n-empty description="建设中，敬请期待">
        <template #extra>
          <div class="placeholder-panel__text">
            {{ pageDescription }}
          </div>
          <div v-if="plannedFlow.length" class="placeholder-flow" aria-label="目标流程">
            <span v-for="(item, index) in plannedFlow" :key="item" class="placeholder-flow__item">
              {{ item }}
              <span v-if="index < plannedFlow.length - 1" class="placeholder-flow__arrow">→</span>
            </span>
          </div>
        </template>
      </n-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader.vue'

const route = useRoute()

const pageTitle = computed(() => String(route.meta.title || '建设中'))
const pageDescription = computed(() => {
  if (typeof route.meta.description === 'string' && route.meta.description) return route.meta.description
  const group = typeof route.meta.group === 'string' ? route.meta.group : ''
  const subGroup = typeof route.meta.subGroup === 'string' ? route.meta.subGroup : ''
  const parts = [group, subGroup, pageTitle.value].filter(Boolean)
  return `${parts.join(' / ')} 功能正在建设中。`
})
const plannedFlow = computed(() => (Array.isArray(route.meta.plannedFlow) ? route.meta.plannedFlow : []))
</script>

<style scoped>
.placeholder-panel {
  display: grid;
  min-height: 360px;
  place-items: center;
  padding: 48px 20px;
  border: 1px solid var(--yy-border);
  border-radius: 8px;
  background: var(--yy-surface);
}

.placeholder-panel__text {
  color: var(--yy-text-muted);
  font-size: 13px;
}

.placeholder-flow {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 760px;
  margin-top: 18px;
  color: var(--yy-text);
  font-size: 13px;
}

.placeholder-flow__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.placeholder-flow__arrow {
  color: var(--yy-text-muted);
}
</style>
