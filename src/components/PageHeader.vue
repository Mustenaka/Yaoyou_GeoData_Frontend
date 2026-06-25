<template>
  <div class="page-header">
    <div>
      <div class="page-header__title">{{ title }}</div>
      <div v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header__title {
  font-size: 22px;
  font-weight: 700;
}

.page-header__subtitle {
  margin-top: 6px;
  color: var(--yy-text-secondary);
  font-size: 13px;
}
</style>
