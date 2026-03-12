<template>
  <div class="stat-card glass-panel" :style="{ '--card-accent': accent }">
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
    accent: 'linear-gradient(90deg, #1677ff, #11b4d8)',
  },
)
</script>

<style scoped>
.stat-card {
  position: relative;
  overflow: hidden;
  padding: 16px;
}

.stat-card__bar {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 4px;
  background: var(--card-accent);
}

.stat-card__label {
  color: var(--sky-text-secondary);
  font-size: 13px;
}

.stat-card__value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 10px;
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
}

.stat-card__value small {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--sky-text-muted);
}

.stat-card__extra {
  margin-top: 8px;
  color: var(--sky-text-muted);
  font-size: 12px;
}
</style>
