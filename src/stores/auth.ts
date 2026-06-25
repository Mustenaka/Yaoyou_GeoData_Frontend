import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { authApi } from '@/api/auth'
import type { LoginPolicy, LoginResponse, MeResponse, RoleCode } from '@/types/api'
import { clearSessionStorage, storageKeys } from '@/utils/storage'

const emptyPolicy: LoginPolicy = {
  allow_normal_user_config_edit: false,
  min_mobile_version: '',
  min_win_version: '',
  risk_block_enabled: false,
}

function rolePermissions(roleCode: RoleCode | '') {
  if (roleCode === 'system_admin') {
    return ['dashboard', 'companies', 'users', 'licenses', 'devices', 'settings']
  }
  if (roleCode === 'enterprise_admin') {
    return ['dashboard', 'companies', 'users', 'devices']
  }
  return []
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = useStorage(storageKeys.accessToken, '')
  const refreshToken = useStorage(storageKeys.refreshToken, '')
  const userId = useStorage(storageKeys.userId, 0)
  const username = useStorage(storageKeys.username, '')
  const roleCode = useStorage<RoleCode | ''>(storageKeys.roleCode, '')
  const companyId = useStorage<number | null>(storageKeys.companyId, null)
  const companyName = useStorage(storageKeys.companyName, '')
  const permissions = useStorage<string[]>(storageKeys.permissions, [])
  const policy = useStorage<LoginPolicy>(storageKeys.policy, emptyPolicy)

  const isLoggedIn = computed(() => Boolean(accessToken.value))
  const isSystemAdmin = computed(() => roleCode.value === 'system_admin')
  const isEnterpriseAdmin = computed(() => roleCode.value === 'enterprise_admin')
  const canEnterAdmin = computed(() => isSystemAdmin.value || isEnterpriseAdmin.value)

  function applyMe(payload: MeResponse) {
    userId.value = payload.user.id
    username.value = payload.user.username
    roleCode.value = payload.user.role_code
    companyId.value = payload.company?.id ?? payload.user.company_id ?? null
    companyName.value = payload.company?.name ?? ''
    policy.value = payload.policy || emptyPolicy
    permissions.value = rolePermissions(payload.user.role_code)
  }

  function setSession(payload: LoginResponse) {
    accessToken.value = payload.access_token
    refreshToken.value = payload.refresh_token
    applyMe(payload)
  }

  async function fetchMe() {
    const me = await authApi.me()
    applyMe(me)
    return me
  }

  async function logout() {
    try {
      await authApi.logout(refreshToken.value || undefined)
    } finally {
      clearSession()
    }
  }

  function clearSession() {
    clearSessionStorage()
    accessToken.value = ''
    refreshToken.value = ''
    userId.value = 0
    username.value = ''
    roleCode.value = ''
    companyId.value = null
    companyName.value = ''
    permissions.value = []
    policy.value = emptyPolicy
  }

  return {
    accessToken,
    refreshToken,
    userId,
    username,
    roleCode,
    companyId,
    companyName,
    permissions,
    policy,
    isLoggedIn,
    isSystemAdmin,
    isEnterpriseAdmin,
    canEnterAdmin,
    setSession,
    fetchMe,
    logout,
    clearSession,
  }
})
