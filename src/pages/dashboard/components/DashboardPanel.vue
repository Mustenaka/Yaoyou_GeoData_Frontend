<template>
  <article class="dashboard-panel" :class="{ 'dashboard-panel--editing': editing }">
    <header class="dashboard-panel__head drag-handle">
      <div class="dashboard-panel__title">
        <strong>{{ title }}</strong>
        <span v-if="subtitle">{{ subtitle }}</span>
      </div>
      <div class="dashboard-panel__actions">
        <slot name="actions" />
        <n-button v-if="actionLabel" text size="small" @click="$emit('action')">
          {{ actionLabel }}
        </n-button>
        <n-button v-if="editing && removable" quaternary circle size="small" title="移除面板" @click="$emit('remove')">
          <template #icon>
            <n-icon :component="CloseOutline" />
          </template>
        </n-button>
      </div>
    </header>
    <div class="dashboard-panel__body">
      <slot />
    </div>
  </article>
</template>

<script setup lang="ts">
import { CloseOutline } from '@vicons/ionicons5'

defineProps<{
  title: string
  subtitle?: string
  actionLabel?: string
  editing?: boolean
  removable?: boolean
}>()

defineEmits<{
  action: []
  remove: []
}>()
</script>

<style scoped>
.dashboard-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  background: var(--yy-surface);
  box-shadow: 0 10px 26px var(--yy-shadow);
}

.dashboard-panel--editing {
  outline: 1px dashed var(--yy-tone-blue);
  outline-offset: -4px;
}

.dashboard-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 10px;
}

.dashboard-panel__title {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.dashboard-panel__title strong {
  overflow: hidden;
  color: var(--yy-text);
  font-size: 15px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-panel__title span {
  overflow: hidden;
  color: var(--yy-text-muted);
  font-size: 12px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-panel__actions {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
}

.dashboard-panel__body {
  flex: 1;
  min-height: 0;
  padding: 0 16px 16px;
}

.drag-handle {
  cursor: grab;
}

.dashboard-panel:not(.dashboard-panel--editing) .drag-handle {
  cursor: default;
}

@media (max-width: 760px) {
  .dashboard-panel__head {
    padding: 14px 14px 9px;
  }

  .dashboard-panel__body {
    padding: 0 14px 14px;
  }
}
</style>
