<template>
  <n-config-provider :theme="naiveTheme" :theme-overrides="themeOverrides" abstract>
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
import { computed } from 'vue'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const naiveTheme = computed(() => (themeStore.isDark ? darkTheme : null))

const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: themeStore.isDark ? '#62b3ff' : '#1f4e79',
    primaryColorHover: themeStore.isDark ? '#86c8ff' : '#286196',
    primaryColorPressed: themeStore.isDark ? '#3b82f6' : '#173a5a',
    primaryColorSuppl: themeStore.isDark ? '#62b3ff' : '#2f855a',
    borderRadius: '8px',
    borderRadiusSmall: '4px',
    fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif',
    fontFamilyMono: '"JetBrains Mono", "Consolas", monospace',
    bodyColor: themeStore.isDark ? '#101418' : '#f4f6f8',
    textColorBase: themeStore.isDark ? '#e8edf4' : '#17212f',
    borderColor: themeStore.isDark ? '#2a3441' : '#d9e0e7',
  },
  Button: themeStore.isDark
    ? {
        textColorPrimary: '#08131f',
        textColorHoverPrimary: '#08131f',
        textColorPressedPrimary: '#08131f',
        textColorFocusPrimary: '#08131f',
      }
    : {},
  Card: {
    color: themeStore.isDark ? '#171c22' : '#ffffff',
    borderColor: themeStore.isDark ? '#2a3441' : '#d9e0e7',
  },
  DataTable: {
    thColor: themeStore.isDark ? '#1d2430' : '#f3f5f7',
    borderColor: themeStore.isDark ? '#2a3441' : '#d9e0e7',
    tdColorHover: themeStore.isDark ? '#202938' : '#f6f8fa',
  },
}))
</script>
