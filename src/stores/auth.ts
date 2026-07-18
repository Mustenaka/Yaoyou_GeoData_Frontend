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
  win_features: { sky_projects: true, huaning_projects: true },
}

const legacySuperAdminRole = ['system', 'admin'].join('_')

function normalizeRoleCode(value: string): RoleCode | '' {
  if (value === legacySuperAdminRole) return 'superadmin'
  if (value === 'superadmin' || value === 'admin' || value === 'enterprise_admin') return value
  if (value === 'normal_user' || value === 'temporary_user') return value
  return ''
}

function rolePermissions(roleCode: RoleCode | '' | string) {
  const normalizedRoleCode = normalizeRoleCode(roleCode)
  if (normalizedRoleCode === 'superadmin') {
    return [
      'dashboard',
      'companies',
      'users',
      'devices',
      'device-risks',
      'device-authorization-requests',
      'registration-applications',
      'content-site-home',
      'content-mobile-support',
      'projects',
      'mobile-feature-settings',
      'mobile-smart-fill-config',
      'mobile-equipment-config',
      'mobile-collab-settings',
      'mobile-collab-sdk',
      'mobile-logs',
      'win-sky',
      'win-huaning',
      'win-logs',
      'win-features',
      'sync-files',
      'audit',
      'about',
      'release-notes',
      'settings',
      'mail-settings',
      'system-logs',
      'risks',
      'server-time',
    ]
  }
  if (normalizedRoleCode === 'admin') {
    return [
      'dashboard',
      'companies',
      'users',
      'registration-applications',
      'content-site-home',
      'content-mobile-support',
      'devices',
      'device-risks',
      'device-authorization-requests',
      'projects',
      'mobile-feature-settings',
      'mobile-smart-fill-config',
      'mobile-equipment-config',
      'mobile-collab-settings',
      'mobile-collab-sdk',
      'mobile-logs',
      'win-sky',
      'win-huaning',
      'win-logs',
      'win-features',
      'audit',
      'about',
      'release-notes',
      'risks',
    ]
  }
  if (normalizedRoleCode === 'enterprise_admin') {
    return ['dashboard', 'companies', 'users', 'registration-applications', 'devices', 'device-risks', 'device-authorization-requests', 'projects', 'mobile-logs', 'win-sky', 'win-huaning', 'win-logs', 'audit', 'about', 'release-notes', 'risks']
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
  const mustChangePassword = useStorage(storageKeys.mustChangePassword, false)
  const permissions = useStorage<string[]>(storageKeys.permissions, [])
  const policy = useStorage<LoginPolicy>(storageKeys.policy, emptyPolicy)
  roleCode.value = normalizeRoleCode(String(roleCode.value))

  const isLoggedIn = computed(() => Boolean(accessToken.value))
  const isSuperAdmin = computed(() => roleCode.value === 'superadmin')
  const isAdmin = computed(() => roleCode.value === 'admin')
  const isEnterpriseAdmin = computed(() => roleCode.value === 'enterprise_admin')
  const isBackOfficeScopeAll = computed(() => isSuperAdmin.value || isAdmin.value)
  const canEnterAdmin = computed(() => isBackOfficeScopeAll.value || isEnterpriseAdmin.value)

  function applyMe(payload: MeResponse) {
    const normalizedRoleCode = normalizeRoleCode(payload.user.role_code)
    userId.value = payload.user.id
    username.value = payload.user.username
    roleCode.value = normalizedRoleCode
    companyId.value = payload.company?.id ?? payload.user.company_id ?? null
    companyName.value = payload.company?.name ?? ''
    mustChangePassword.value = Boolean(payload.user.must_change_password)
    policy.value = payload.policy || emptyPolicy
    permissions.value = rolePermissions(normalizedRoleCode)
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
    mustChangePassword.value = false
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
    mustChangePassword,
    permissions,
    policy,
    isLoggedIn,
    isSuperAdmin,
    isAdmin,
    isEnterpriseAdmin,
    isBackOfficeScopeAll,
    canEnterAdmin,
    setSession,
    fetchMe,
    logout,
    clearSession,
  }
})
