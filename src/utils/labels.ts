import type {
  AuthorizationStatus,
  ClientType,
  DeviceStatus,
  FileObjectType,
  FileParseStatus,
  FileUploadStatus,
  RoleCode,
  UserStatus,
} from '@/types/api'

export const roleOptions: Array<{ label: string; value: RoleCode }> = [
  { label: '技术超级管理员', value: 'superadmin' },
  { label: '普通管理员', value: 'admin' },
  { label: '企业管理员', value: 'enterprise_admin' },
  { label: '普通用户', value: 'normal_user' },
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

export const objectTypeOptions: Array<{ label: string; value: FileObjectType }> = [
  { label: '项目包', value: 'project_package' },
  { label: '录入数据', value: 'entry_data' },
  { label: '全局配置', value: 'global_config' },
  { label: '项目配置', value: 'project_config' },
  { label: 'Win 结果', value: 'win_result' },
  { label: '客户端日志', value: 'client_log' },
  { label: '操作记录', value: 'operation_record' },
]

export const uploadStatusOptions: Array<{ label: string; value: FileUploadStatus }> = [
  { label: '已初始化', value: 'initialized' },
  { label: '已上传', value: 'uploaded' },
  { label: '失败', value: 'failed' },
]

export const parseStatusOptions: Array<{ label: string; value: FileParseStatus }> = [
  { label: '待解析', value: 'pending' },
  { label: '已解析', value: 'parsed' },
  { label: '解析失败', value: 'failed' },
  { label: '已跳过', value: 'skipped' },
]

export const configScopeOptions = [
  { label: '全局', value: 'global' },
  { label: '项目', value: 'project' },
]

export const configTypeOptions = [
  { label: '完整配置', value: 'all' },
  { label: '操作设置', value: 'app_settings' },
  { label: '映射规则', value: 'mapping' },
  { label: '智能填充', value: 'fill_rule' },
  { label: '器材配置', value: 'equipment' },
]

export const riskLevelOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '严重', value: 'critical' },
]

export const auditResultOptions = [
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '拒绝', value: 'rejected' },
]

export const booleanFilterOptions = [
  { label: '是', value: true },
  { label: '否', value: false },
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

export function objectTypeLabel(type?: string) {
  return objectTypeOptions.find((item) => item.value === type)?.label || type || '-'
}

export function uploadStatusLabel(status?: string) {
  return uploadStatusOptions.find((item) => item.value === status)?.label || status || '-'
}

export function parseStatusLabel(status?: string) {
  return parseStatusOptions.find((item) => item.value === status)?.label || status || '-'
}

export function configScopeLabel(scope?: string) {
  return configScopeOptions.find((item) => item.value === scope)?.label || scope || '-'
}

export function configTypeLabel(type?: string) {
  return configTypeOptions.find((item) => item.value === type)?.label || type || '-'
}

export function riskLevelLabel(level?: string) {
  return riskLevelOptions.find((item) => item.value === level)?.label || level || '-'
}

export function auditResultLabel(result?: string) {
  return auditResultOptions.find((item) => item.value === result)?.label || result || '-'
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
