import type { AuthorizationStatus, ClientType, DeviceStatus, RoleCode, UserStatus } from '@/types/api'

export const roleOptions: Array<{ label: string; value: RoleCode }> = [
  { label: '系统管理员', value: 'system_admin' },
  { label: '企业管理员', value: 'enterprise_admin' },
  { label: '普通用户', value: 'normal_user' },
  { label: '试用用户', value: 'trial_user' },
  { label: '临时用户', value: 'temporary_user' },
]

export const userStatusOptions: Array<{ label: string; value: UserStatus }> = [
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'disabled' },
  { label: '过期', value: 'expired' },
  { label: '锁定', value: 'locked' },
]

export const companyStatusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
]

export const clientTypeOptions: Array<{ label: string; value: ClientType }> = [
  { label: 'Mobile', value: 'mobile' },
  { label: 'Win', value: 'win' },
]

export const authStatusOptions: Array<{ label: string; value: AuthorizationStatus }> = [
  { label: '待激活', value: 'pending' },
  { label: '有效', value: 'active' },
  { label: '已撤销', value: 'revoked' },
  { label: '已过期', value: 'expired' },
]

export const deviceStatusOptions: Array<{ label: string; value: DeviceStatus }> = [
  { label: '正常', value: 'active' },
  { label: '停用', value: 'disabled' },
  { label: '阻断', value: 'blocked' },
]

export function roleLabel(role?: string) {
  return roleOptions.find((item) => item.value === role)?.label || role || '-'
}

export function userStatusLabel(status?: string) {
  return userStatusOptions.find((item) => item.value === status)?.label || status || '-'
}

export function authStatusLabel(status?: string) {
  return authStatusOptions.find((item) => item.value === status)?.label || status || '-'
}

export function deviceStatusLabel(status?: string) {
  return deviceStatusOptions.find((item) => item.value === status)?.label || status || '-'
}

export function clientTypeLabel(type?: string) {
  if (type === 'mobile') return 'Mobile'
  if (type === 'win') return 'Win'
  if (type === 'admin') return 'Admin'
  return type || '-'
}

export function booleanText(value: boolean) {
  return value ? '是' : '否'
}
