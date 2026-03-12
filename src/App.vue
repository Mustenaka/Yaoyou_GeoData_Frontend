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
    primaryColor: '#1677ff',
    primaryColorHover: '#3690ff',
    primaryColorPressed: '#0f5fd1',
    primaryColorSuppl: '#11b4d8',
    borderRadius: '14px',
    borderRadiusSmall: '10px',
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
    fontFamilyMono: '"JetBrains Mono", "Consolas", monospace',
  },
  Card: {
    color: 'rgba(255,255,255,0.88)',
    borderColor: 'rgba(22,119,255,0.10)',
  },
  DataTable: {
    thColor: 'rgba(22,119,255,0.04)',
    borderColor: 'rgba(22,119,255,0.10)',
    tdColorHover: 'rgba(22,119,255,0.03)',
  },
}
</script>
