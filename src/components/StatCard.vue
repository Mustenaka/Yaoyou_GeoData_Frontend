<template>
  <div class="stat-card" :style="{ '--card-accent': accent }">
    <div class="stat-card__bar" />
    <div class="stat-card__label">{{ label }}</div>
    <div class="stat-card__value">
      <span>{{ value }}</span>
      <small v-if="unit">{{ unit }}</small>
    </div>
    <div class="stat-card__extra">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string | number
    unit?: string
    accent?: string
  }>(),
  {
    unit: '',
    accent: 'var(--yy-primary)',
  },
)
</script>

<style scoped>
.stat-card {
  position: relative;
  overflow: hidden;
  padding: 16px;
  background: var(--yy-surface);
  border: 1px solid var(--yy-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 20px var(--yy-shadow);
}

.stat-card__bar {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  background: var(--card-accent);
}

.stat-card__label {
  color: var(--yy-text-secondary);
  font-size: 13px;
}

.stat-card__value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 10px;
  font-size: 32px;
  font-weight: 700;
}

.stat-card__value small {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--yy-text-muted);
}

.stat-card__extra {
  margin-top: 8px;
  color: var(--yy-text-muted);
  font-size: 12px;
}
</style>
