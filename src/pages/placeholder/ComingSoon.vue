<template>
  <div class="page-shell">
    <PageHeader :title="pageTitle" subtitle="建设中，敬请期待" />

    <div class="placeholder-panel">
      <n-empty description="建设中，敬请期待">
        <template #extra>
          <div class="placeholder-panel__text">
            {{ pageDescription }}
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
  const group = typeof route.meta.group === 'string' ? route.meta.group : ''
  const subGroup = typeof route.meta.subGroup === 'string' ? route.meta.subGroup : ''
  const parts = [group, subGroup, pageTitle.value].filter(Boolean)
  return `${parts.join(' / ')} 功能正在建设中。`
})
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
</style>
