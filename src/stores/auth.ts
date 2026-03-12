import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { LoginResponse } from '@/types/api'
import { storageKeys } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = useStorage(storageKeys.accessToken, '')
  const refreshToken = useStorage(storageKeys.refreshToken, '')
  const username = useStorage(storageKeys.username, '管理员')
  const userRole = useStorage<'admin' | 'user'>(storageKeys.userRole, 'user')
  const userId = useStorage<number>(storageKeys.userId, 0)

  const isLoggedIn = computed(() => Boolean(accessToken.value))
  const isAdmin = computed(() => userRole.value === 'admin')

  function setSession(payload: LoginResponse) {
    accessToken.value = payload.access_token
    refreshToken.value = payload.refresh_token
    username.value = payload.username
    userRole.value = payload.role
    userId.value = payload.user_id
  }

  function clearSession() {
    accessToken.value = ''
    refreshToken.value = ''
    username.value = '管理员'
    userRole.value = 'user'
    userId.value = 0
  }

  return {
    accessToken,
    refreshToken,
    username,
    userRole,
    userId,
    isAdmin,
    isLoggedIn,
    setSession,
    clearSession,
  }
})
