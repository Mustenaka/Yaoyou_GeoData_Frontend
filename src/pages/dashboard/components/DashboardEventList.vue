<template>
  <div v-if="rows.length" class="event-list">
    <button v-for="item in rows" :key="item.key" class="event-row" :class="`event-row--${item.tone || 'neutral'}`" type="button" @click="$emit('select', item)">
      <span class="event-row__dot" />
      <span class="event-row__content">
        <strong>{{ item.title }}</strong>
        <small>{{ item.desc }}</small>
      </span>
      <time>{{ item.time }}</time>
    </button>
  </div>
  <n-empty v-else :description="emptyText" />
</template>

<script setup lang="ts">
export type DashboardEventRow = {
  key: string
  title: string
  desc: string
  time: string
  tone?: 'green' | 'blue' | 'amber' | 'red' | 'neutral'
  route?: () => void
}

defineProps<{
  rows: DashboardEventRow[]
  emptyText: string
}>()

defineEmits<{
  select: [row: DashboardEventRow]
}>()
</script>

<style scoped>
.event-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding-right: 2px;
}

.event-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 48px;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: color-mix(in srgb, var(--yy-muted, #f3f6fa) 82%, transparent);
  color: var(--yy-text);
  text-align: left;
}

.event-row:hover {
  border-color: var(--yy-border-strong, var(--yy-border));
  background: var(--yy-muted, #f3f6fa);
}

.event-row__dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--yy-text-muted);
}

.event-row__content {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.event-row strong,
.event-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-row strong {
  font-size: 13px;
  line-height: 1.25;
}

.event-row small,
.event-row time {
  color: var(--yy-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.event-row--green .event-row__dot {
  background: #27a76a;
}

.event-row--blue .event-row__dot {
  background: #2f7af0;
}

.event-row--amber .event-row__dot {
  background: #d8912f;
}

.event-row--red .event-row__dot {
  background: #de5f59;
}

@media (max-width: 760px) {
  .event-row {
    grid-template-columns: 10px minmax(0, 1fr);
  }

  .event-row time {
    grid-column: 2;
  }
}
</style>
