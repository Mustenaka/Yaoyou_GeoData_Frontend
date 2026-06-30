import { computed, watchEffect } from 'vue'
import { defineStore } from 'pinia'
import { usePreferredDark, useStorage } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'system'

const themeStorageKey = 'yaoyou_theme_mode'

export const useThemeStore = defineStore('theme', () => {
  const mode = useStorage<ThemeMode>(themeStorageKey, 'light')
  const prefersDark = usePreferredDark()

  const isDark = computed(() => (mode.value === 'system' ? prefersDark.value : mode.value === 'dark'))
  const modeLabel = computed(() => {
    if (mode.value === 'system') return '跟随系统'
    return isDark.value ? '暗色' : '明亮'
  })

  function setMode(nextMode: ThemeMode) {
    mode.value = nextMode
  }

  watchEffect(() => {
    document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
    document.documentElement.style.colorScheme = isDark.value ? 'dark' : 'light'
  })

  return {
    mode,
    isDark,
    modeLabel,
    setMode,
  }
})
