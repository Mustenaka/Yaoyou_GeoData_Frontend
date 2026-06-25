<template>
  <n-config-provider :theme-overrides="themeOverrides" abstract>
    <n-loading-bar-provider>
      <n-message-provider>
        <n-dialog-provider>
          <router-view />
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import type { GlobalThemeOverrides } from 'naive-ui'

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#1f4e79',
    primaryColorHover: '#286196',
    primaryColorPressed: '#173a5a',
    primaryColorSuppl: '#2f855a',
    borderRadius: '8px',
    borderRadiusSmall: '4px',
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
    fontFamilyMono: '"JetBrains Mono", "Consolas", monospace',
  },
  Card: {
    color: '#ffffff',
    borderColor: '#d9e0e7',
  },
  DataTable: {
    thColor: '#f3f5f7',
    borderColor: '#d9e0e7',
    tdColorHover: '#f6f8fa',
  },
}
</script>
