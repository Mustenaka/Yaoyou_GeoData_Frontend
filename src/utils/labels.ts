import type {
  AuthorizationStatus,
  AuthorizationValidityType,
  ChangeRequestStatus,
  ClientLogObjectType,
  ClientType,
  DeviceBindingState,
  DeviceAuthorizationRequestType,
  DeviceRiskCategory,
  DeviceRiskLevel,
  DeviceStatus,
  FileObjectType,
  FileParseStatus,
  FileUploadStatus,
  ProjectLifecycleStatus,
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
  { label: '待授权', value: 'pending' },
  { label: '有效', value: 'active' },
  { label: '已取消', value: 'revoked' },
]

export const authorizationValidityTypeOptions: Array<{ label: string; value: AuthorizationValidityType }> = [
  { label: '长期有效', value: 'long_term' },
  { label: '固定截止', value: 'fixed_term' },
]

export const deviceBindingStateOptions: Array<{ label: string; value: DeviceBindingState }> = [
  { label: '待授权', value: 'pending' },
  { label: '已授权', value: 'approved' },
  { label: '已取消', value: 'revoked' },
]

export const deviceStatusOptions: Array<{ label: string; value: DeviceStatus }> = [
  { label: '正常', value: 'active' },
  { label: '停用', value: 'disabled' },
  { label: '阻断', value: 'blocked' },
]

export const changeRequestStatusOptions: Array<{ label: string; value: ChangeRequestStatus }> = [
  { label: '待授权', value: 'pending' },
  { label: '已授权', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
]

export const deviceAuthorizationRequestTypeOptions: Array<{ label: string; value: DeviceAuthorizationRequestType }> = [
  { label: '换机', value: 'device_change' },
  { label: '新增设备', value: 'device_add' },
  { label: '续期申请', value: 'device_renewal' },
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

export const clientLogTypeOptions: Array<{ label: string; value: ClientLogObjectType }> = [
  { label: '运行日志', value: 'client_log' },
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

export const formTypeOptions = [
  { label: '开土记录', value: 'excavation-record' },
  { label: '渗透（变水头）', value: 'permeability-variable' },
]

export const projectLifecycleOptions: Array<{ label: string; value: ProjectLifecycleStatus }> = [
  { label: '进行中', value: 'active' },
  { label: '归档', value: 'archived' },
  { label: '回收站', value: 'deleted' },
  { label: '待彻底删除', value: 'purged' },
]

export const formSnapshotTableLabels: Record<string, string> = {
  data: '开土记录',
  rows: '开土记录',
  sampleMeta: '录入日期/试验员',
  sample_meta: '录入日期/试验员',
  sampleRows: '录入日期/试验员',
}

export const excavationRecordColumnLabels: Record<string, string> = {
  seq: '序号',
  sampleCode: '孔号样号',
  depth: '取土深度',
  color: '颜色',
  soilName: '土名',
  state: '状态',
  remark: '备注',
  sieveWeight: '留筛土重',
  clayContent: '粘粒含量',
  avgWater: '平均w%',
  avgDensity: '平均ρg/cm3',
  waterWet1: 'W1湿土g',
  waterWet2: 'W2湿土g',
  densityWet1: 'ρ1湿土g',
  densityWet2: 'ρ2湿土g',
  waterDry1: 'W1干土g',
  waterDry2: 'W2干土g',
  testSelection: '试验选择',
  waterCalc1: 'W1%',
  waterCalc2: 'W2%',
  waterCode1: 'W1盒号',
  waterBoxWeight1: 'W1盒重g',
  waterCode2: 'W2盒号',
  waterBoxWeight2: 'W2盒重g',
  ringCode1: 'ρ1HD号',
  ringWeight1: 'ρ1HD重g',
  ringCode2: 'ρ2HD号',
  ringWeight2: 'ρ2HD重g',
  humidity: '湿度',
  compactness: '密实度',
  shakeReaction: '摇振反应',
  glossReaction: '光泽反应',
  dryStrength: '干强度',
  toughness: '韧性',
  packingDisturbance: '包装与扰动情况',
  llWet1: 'WL1湿土g',
  llWet2: 'WL2湿土g',
  llDry1: 'WL1干土g',
  llDry2: 'WL2干土g',
  llCode1: 'WL1盒号',
  llBoxWeight1: 'WL1盒重g',
  llCode2: 'WL2盒号',
  llBoxWeight2: 'WL2盒重g',
  plWet1: 'WP1湿土g',
  plWet2: 'WP2湿土g',
  plDry1: 'WP1干土g',
  plDry2: 'WP2干土g',
  plCode1: 'WP1盒号',
  plBoxWeight1: 'WP1盒重g',
  plCode2: 'WP2盒号',
  plBoxWeight2: 'WP2盒重g',
  zjInstrumentNo: 'ZJ仪器编号',
  shearMethod: '剪切方法',
  pressureSequence: '压力序列',
  shearR1: 'r1',
  shearR2: 'r2',
  shearR3: 'r3',
  shearR4: 'r4',
  kfFlaskNo: 'KF烧瓶编号',
  kfMeasuringCylinderNo: 'KF量筒编号',
  kfHydrometerNo: 'KF密度计号',
  kfTotalDrySoilWeight: 'KF总干土重g',
  kfDrySoilWeight05To025: '0.5-0.25mm干土重g',
  kfDrySoilWeight025To0075: '0.25-0.075mm干土重g',
  kfDrySoilWeightLt0075: '<0.075mm干土重g',
  specificGravityGs: '比重Gs',
  waterTemperature: '水温℃',
  hydrometer1min: '1min',
  hydrometer5min: '5min',
  hydrometer30min: '30min',
  hydrometer120min: '120min',
  hydrometer150min: '150min',
  hydrometer180min: '180min',
  hydrometer240min: '240min',
  hydrometer1440min: '1440min',
}

export const sampleMetaColumnLabels: Record<string, string> = {
  seq: '序号',
  sampleCode: '孔号样号',
  testDate: '开土日期',
  entryDate: '录入日期',
  tester: '试验员',
  remark: '备注',
}

export const riskLevelOptions = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
  { label: '严重', value: 'critical' },
]

export const deviceRiskLevelOptions: Array<{ label: string; value: DeviceRiskLevel }> = [
  { label: '低', value: 'low' },
  { label: '中', value: 'medium' },
  { label: '高', value: 'high' },
]

export const deviceRiskCategoryOptions: Array<{ label: string; value: DeviceRiskCategory }> = [
  { label: '尝试破解', value: 'crack' },
  { label: '频繁登录', value: 'login_churn' },
  { label: '频繁切换账号', value: 'account_churn' },
  { label: '频繁切换 IP', value: 'ip_churn' },
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
  if (status === 'expired') return '已过期'
  return authStatusOptions.find((item) => item.value === status)?.label || status || '-'
}

export function deviceBindingStateLabel(state?: string) {
  return deviceBindingStateOptions.find((item) => item.value === state)?.label || state || '-'
}

const effectiveStatusLabels: Record<string, string> = {
  usable: '可用',
  company_disabled: '企业已停用',
  company_not_started: '企业当前不可用',
  company_expired: '企业当前不可用',
  product_not_granted: '设备尚未授权',
  product_suspended: '设备授权当前不可用',
  product_revoked: '设备授权已取消',
  product_not_started: '设备授权尚未生效',
  product_expired: '设备授权已过期',
  account_disabled: '账号已停用',
  account_expired: '账号已过期',
  user_product_disabled: '当前账号不可使用此设备',
  device_unregistered: '设备未登记',
  device_pending: '设备待授权',
  device_revoked: '设备授权已取消',
  device_disabled: '设备已停用',
  device_blocked: '设备已阻断',
  device_override_not_started: '设备授权尚未生效',
  device_override_expired: '设备授权已过期',
  device_user_mismatch: '专属用户不匹配',
  device_company_mismatch: '设备企业不匹配',
  client_type_mismatch: '客户端类型不匹配',
  version_too_low: '客户端版本过低',
  session_invalid: '会话已失效',
}

export const effectiveAccessStatusOptions = Object.entries(effectiveStatusLabels).map(([value, label]) => ({ label, value }))

export function effectiveStatusLabel(status?: string) {
  return status ? effectiveStatusLabels[status] || status : '-'
}

const blockingReasonLabels: Record<string, string> = {
  COMPANY_DISABLED: '企业已停用',
  COMPANY_NOT_STARTED: '企业当前不可用',
  COMPANY_EXPIRED: '企业当前不可用',
  PRODUCT_NOT_GRANTED: '设备尚未授权',
  PRODUCT_ENTITLEMENT_NOT_GRANTED: '设备尚未授权',
  PRODUCT_ENTITLEMENT_SUSPENDED: '设备授权当前不可用',
  PRODUCT_ENTITLEMENT_REVOKED: '设备授权已取消',
  PRODUCT_ENTITLEMENT_NOT_STARTED: '设备授权尚未生效',
  PRODUCT_ENTITLEMENT_EXPIRED: '设备授权已过期',
  ACCOUNT_DISABLED: '账号已停用',
  ACCOUNT_EXPIRED: '账号已过期',
  USER_PRODUCT_DISABLED: '当前账号不可使用此设备',
  USER_PRODUCT_ACCESS_DISABLED: '当前账号不可使用此设备',
  DEVICE_UNREGISTERED: '设备未登记',
  DEVICE_BINDING_PENDING: '设备待授权',
  DEVICE_BINDING_REVOKED: '设备授权已取消',
  DEVICE_BINDING_GENERATION_MISMATCH: '设备授权记录已失效，请重新授权',
  DEVICE_BINDING_FINGERPRINT_MISMATCH: '设备授权与当前指纹不匹配',
  DEVICE_DISABLED: '设备已停用',
  DEVICE_BLOCKED: '设备已阻断',
  DEVICE_OVERRIDE_NOT_STARTED: '设备授权尚未生效',
  DEVICE_OVERRIDE_EXPIRED: '设备授权已过期',
  DEVICE_AUTHORIZATION_NOT_STARTED: '旧设备授权尚未生效',
  DEVICE_AUTHORIZATION_EXPIRED: '旧设备授权已过期',
  DEVICE_USER_MISMATCH: '设备专属用户不匹配',
  DEVICE_COMPANY_MISMATCH: '设备企业归属不匹配',
  CLIENT_TYPE_MISMATCH: '设备客户端类型与当前授权不匹配',
  VERSION_TOO_LOW: '客户端版本过低',
  SESSION_INVALID: '会话已失效',
}

export function blockingReasonLabel(reason?: string) {
  return reason ? blockingReasonLabels[reason] || effectiveStatusLabels[reason.toLowerCase()] || reason : '-'
}

export function authorizationValidityTypeValue(type?: string | null, validUntil?: string | number | null): AuthorizationValidityType {
  if (type === 'fixed_term' || type === 'long_term') return type
  return validUntil ? 'fixed_term' : 'long_term'
}

export function authorizationValidityTypeLabel(type?: string | null, validUntil?: string | number | null) {
  const value = authorizationValidityTypeValue(type, validUntil)
  return authorizationValidityTypeOptions.find((item) => item.value === value)?.label || '-'
}

export function authorizationValidityTagType(type?: string | null, validUntil?: string | number | null) {
  return authorizationValidityTypeValue(type, validUntil) === 'long_term' ? 'success' : 'warning'
}

export function deviceStatusLabel(status?: string) {
  return deviceStatusOptions.find((item) => item.value === status)?.label || status || '-'
}

export function changeRequestStatusLabel(status?: string) {
  return changeRequestStatusOptions.find((item) => item.value === status)?.label || status || '-'
}

export function deviceAuthorizationRequestTypeLabel(type?: string) {
  return deviceAuthorizationRequestTypeOptions.find((item) => item.value === type)?.label || type || '-'
}

export function objectTypeLabel(type?: string) {
  return objectTypeOptions.find((item) => item.value === type)?.label || type || '-'
}

export function clientLogTypeLabel(type?: string) {
  return clientLogTypeOptions.find((item) => item.value === type)?.label || objectTypeLabel(type)
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

export function formTypeLabel(type?: string) {
  return formTypeOptions.find((item) => item.value === type)?.label || type || '-'
}

export function projectLifecycleLabel(status?: string) {
  return projectLifecycleOptions.find((item) => item.value === status)?.label || status || '-'
}

export type ProjectLifecycleTagType = 'default' | 'success' | 'warning' | 'error' | 'info'

export function projectLifecycleTagType(status?: string): ProjectLifecycleTagType {
  if (status === 'active') return 'success'
  if (status === 'archived') return 'info'
  if (status === 'deleted') return 'warning'
  if (status === 'purged') return 'error'
  return 'default'
}

export function projectPurgeRemainingText(purgeAfter?: string | null, now = Date.now()) {
  if (!purgeAfter) return ''
  const deadline = new Date(purgeAfter).getTime()
  if (!Number.isFinite(deadline)) return ''
  const diff = deadline - now
  if (diff <= 0) return '即将清理'
  const days = Math.max(1, Math.ceil(diff / (24 * 60 * 60 * 1000)))
  return `剩 ${days} 天`
}

export function projectLifecycleDisplayText(status?: string, purgeAfter?: string | null, now = Date.now()) {
  const label = projectLifecycleLabel(status)
  if (status !== 'purged') return label
  const remaining = projectPurgeRemainingText(purgeAfter, now)
  return remaining ? `${label} · ${remaining}` : label
}

export function formSnapshotTableLabel(kind?: string) {
  return kind ? formSnapshotTableLabels[kind] || kind : '-'
}

export function formSnapshotColumnLabel(formType?: string, key?: string, kind: 'data' | 'sampleMeta' = 'data') {
  if (!key) return ''
  if (kind === 'sampleMeta') return sampleMetaColumnLabels[key] || excavationRecordColumnLabels[key] || ''
  if (formType === 'excavation-record') return excavationRecordColumnLabels[key] || ''
  return ''
}

export function riskLevelLabel(level?: string) {
  return riskLevelOptions.find((item) => item.value === level)?.label || level || '-'
}

export function deviceRiskLevelLabel(level?: string) {
  return deviceRiskLevelOptions.find((item) => item.value === level)?.label || riskLevelLabel(level)
}

export function deviceRiskCategoryLabel(category?: string) {
  return deviceRiskCategoryOptions.find((item) => item.value === category)?.label || category || '-'
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
