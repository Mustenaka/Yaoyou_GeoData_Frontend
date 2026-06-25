export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export type RoleCode =
  | 'system_admin'
  | 'enterprise_admin'
  | 'normal_user'
  | 'trial_user'
  | 'temporary_user'

export type UserStatus = 'active' | 'disabled' | 'expired' | 'locked'
export type ClientType = 'admin' | 'mobile' | 'win'
export type DeviceStatus = 'active' | 'disabled' | 'blocked'
export type AuthorizationStatus = 'pending' | 'active' | 'revoked' | 'expired'
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected'

export interface TokenUser {
  id: number
  username: string
  role_code: RoleCode
  company_id?: number | null
}

export interface TokenCompany {
  id: number
  name: string
  valid_until?: string | null
}

export interface LoginPolicy {
  allow_normal_user_config_edit: boolean
  min_mobile_version: string
  min_win_version: string
  risk_block_enabled: boolean
}

export interface TokenAuthorization {
  client_type: ClientType
  device_fingerprint_id?: number | null
  device_authorization_id?: number | null
  product_scope?: string
  valid_until?: string | null
  status: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: TokenUser
  company?: TokenCompany | null
  authorization: TokenAuthorization
  policy: LoginPolicy
  server_time: string
  license_ticket?: string
}

export interface MeResponse {
  user: TokenUser
  company?: TokenCompany | null
  authorization: TokenAuthorization
  policy: LoginPolicy
  server_time: string
}

export interface CompanyItem {
  id: number
  company_name: string
  company_short_name: string
  credit_code?: string
  legal_person?: string
  contact_phone: string
  contact_email: string
  address?: string
  status: number
  valid_from?: string | null
  valid_until?: string | null
  remark?: string
  user_count?: number
  mobile_license_count?: number
  win_license_count?: number
  created_at: string
  updated_at: string
}

export interface CompanyPolicy {
  id?: number
  company_id?: number
  allow_normal_user_config_edit: boolean
  max_mobile_devices: number
  max_win_devices: number
  min_mobile_version: string
  min_win_version: string
  password_min_length: number
  log_retention_days: number
  storage_quota_gb: number
  risk_block_enabled: boolean
}

export interface CompanyDetail extends CompanyItem {
  policy?: CompanyPolicy
}

export interface CompanyPayload {
  company_name: string
  company_short_name?: string
  credit_code?: string
  legal_person?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  status?: number
  valid_from?: string | null
  valid_until?: string | null
  remark?: string
}

export interface CompanyPolicyPayload {
  allow_normal_user_config_edit?: boolean
  max_mobile_devices?: number
  max_win_devices?: number
  min_mobile_version?: string
  min_win_version?: string
  password_min_length?: number
  log_retention_days?: number
  storage_quota_gb?: number
  risk_block_enabled?: boolean
}

export interface UserItem {
  id: number
  username: string
  email: string
  phone: string
  company_id?: number | null
  company_name?: string
  role_code: RoleCode
  status: UserStatus
  trial_expires_at?: string | null
  temporary_expires_at?: string | null
  can_use_mobile: boolean
  can_use_win: boolean
  last_login_at?: string | null
  last_login_ip?: string
  created_at: string
  updated_at: string
}

export interface UserPayload {
  username?: string
  password?: string
  email?: string
  phone?: string
  company_id?: number | null
  role_code?: RoleCode
  status?: UserStatus
  trial_expires_at?: string | null
  temporary_expires_at?: string | null
  can_use_mobile?: boolean
  can_use_win?: boolean
}

export interface UserCreateResponse {
  user: UserItem
  temporary_password?: string
}

export interface PasswordResetResponse {
  reset: boolean
  temporary_password?: string
}

export interface LicenseItem {
  id: number
  company_id?: number | null
  company_name?: string
  user_id?: number | null
  username?: string
  device_fingerprint_id?: number | null
  fingerprint_hash?: string
  client_type: ClientType
  product_scope: string
  valid_from?: string | null
  valid_until?: string | null
  status: AuthorizationStatus
  revoked_at?: string | null
  last_check_at?: string | null
  created_at: string
  updated_at: string
}

export interface LicensePayload {
  user_id: number
  device_fingerprint_id: number
  client_type: 'mobile' | 'win'
  product_scope?: string
  license_key?: string
  valid_from?: string | null
  valid_until?: string | null
  status?: AuthorizationStatus
}

export interface LicenseUpdatePayload {
  product_scope?: string
  valid_from?: string | null
  valid_until?: string | null
  status?: AuthorizationStatus
}

export interface LicenseIssueResponse {
  authorization: LicenseItem
  license_key?: string
}

export interface DeviceItem {
  id: number
  company_id?: number | null
  company_name?: string
  user_id?: number | null
  username?: string
  client_type: 'mobile' | 'win'
  fingerprint_hash: string
  device_name: string
  os_version: string
  app_version: string
  status: DeviceStatus
  risk_level: string
  last_seen_at: string
  device_authorization_id?: number | null
  authorization_status?: AuthorizationStatus | ''
  product_scope?: string
  valid_until?: string | null
  last_check_at?: string | null
}

export interface DeviceDetail {
  id: number
  company_id?: number | null
  user_id?: number | null
  client_type: string
  fingerprint_hash: string
  fingerprint_payload_json?: string | null
  mobile_install_id?: string
  win_mainboard_id_hash?: string
  device_name?: string
  os_version?: string
  app_version?: string
  first_seen_at?: string
  last_seen_at?: string
  status: DeviceStatus
  risk_level: string
  blocked_at?: string | null
  blocked_reason?: string
  created_at: string
  updated_at: string
}

export interface DeviceChangeRequest {
  id: number
  company_id?: number | null
  user_id: number
  old_device_id?: number | null
  new_device_id?: number | null
  old_device_authorization_id?: number | null
  new_client_type: string
  new_fingerprint_hash: string
  reason: string
  status: ChangeRequestStatus
  handled_by?: number | null
  handled_at?: string | null
  note?: string
  created_at: string
  updated_at: string
}

export interface ListParams {
  page?: number
  page_size?: number
  keyword?: string
  company_id?: number | null
  user_id?: number | null
  status?: string
  role_code?: string
  client_type?: string
  risk_level?: string
  authorization_status?: string
}

export interface SystemLog {
  id: number
  log_type: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | string
  message: string
  source: string
  trace_id: string
  created_at: string
}

export interface ClientLog {
  id: number
  user_id: number
  device_id: string
  log_file: string
  log_content: string
  app_version: string
  created_at: string
}

export interface ProjectInfo {
  id: number
  project_uuid: string
  project_no?: string
  project_name: string
  client_name: string
  status: number
  creator_user_id: number
  description: string
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: number
  project_id: number
  user_id: number
  role: string
  permission: string
  joined_at: string
  username: string
}

export interface RuntimeMetric {
  cpu_usage: number
  memory_usage?: number
  mem_usage?: number
  disk_usage: number
  goroutines: number
  active_ws: number
  timestamp: number
}
