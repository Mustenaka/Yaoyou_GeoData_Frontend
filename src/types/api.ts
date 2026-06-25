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
export type FileObjectType =
  | 'project_package'
  | 'entry_data'
  | 'global_config'
  | 'project_config'
  | 'win_result'
  | 'client_log'
  | 'operation_record'
export type FileUploadStatus = 'initialized' | 'uploaded' | 'failed'
export type FileParseStatus = 'pending' | 'parsed' | 'failed' | 'skipped'
export type ConfigScope = 'global' | 'project'

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

export interface ClientFileItem {
  id: number
  file_id: string
  company_id?: number | null
  user_id: number
  device_fingerprint_id?: number | null
  device_authorization_id?: number | null
  source_client: string
  app_version: string
  object_type: FileObjectType | string
  project_uuid: string
  project_code: string
  form_type: string
  original_filename: string
  safe_filename: string
  storage_provider: string
  storage_key: string
  bucket: string
  region: string
  mime_type: string
  size_bytes: number
  sha256: string
  upload_status: FileUploadStatus | string
  parse_status: FileParseStatus | string
  parse_message: string
  server_received_at: string
  created_at: string
  updated_at: string
}

export interface SyncFileListParams {
  page?: number
  page_size?: number
  company_id?: number | null
  user_id?: number | null
  device_fingerprint_id?: number | null
  object_type?: string
  project_uuid?: string
  project_code?: string
  upload_status?: string
  parse_status?: string
  start_at?: string | null
  end_at?: string | null
}

export interface ProjectArchiveItem {
  id: number
  company_id?: number | null
  project_uuid: string
  project_code: string
  project_name: string
  client_name: string
  uuid_fallback: boolean
  source_mobile_file_id: string
  latest_win_result_file_id: string
  latest_config_file_id: string
  latest_entry_data_file_id: string
  last_uploaded_at?: string | null
  last_parsed_at?: string | null
  parse_message: string
  created_at: string
  updated_at: string
}

export interface FormDataSnapshot {
  id: number
  project_cloud_index_id: number
  company_id?: number | null
  project_uuid: string
  form_type: string
  row_count: number
  sample_count: number
  source_file_id: string
  snapshot_json: string
  created_at: string
}

export interface ConfigSnapshotItem {
  id: number
  company_id?: number | null
  project_uuid: string
  config_scope: ConfigScope | string
  config_type: string
  config_version: string
  source_file_id: string
  snapshot_json: string
  summary_json: string
  is_latest: boolean
  created_at: string
  updated_at: string
}

export interface ConfigSnapshotListParams {
  page?: number
  page_size?: number
  company_id?: number | null
  project_uuid?: string
  config_scope?: string
  config_type?: string
  is_latest?: boolean | null
}

export interface OperationAuditEvent {
  id: number
  event_id: string
  company_id?: number | null
  user_id?: number | null
  device_fingerprint_id?: number | null
  module: string
  action: string
  result: string
  project_uuid: string
  file_id: string
  client_ts?: string | null
  server_ts: string
  ip: string
  user_agent: string
  message: string
  extra_json?: string | null
  created_at: string
}

export interface AuditListParams {
  page?: number
  page_size?: number
  company_id?: number | null
  user_id?: number | null
  device_fingerprint_id?: number | null
  module?: string
  action?: string
  result?: string
  project_uuid?: string
  start_at?: string | null
  end_at?: string | null
}

export interface SecurityRiskEvent {
  id: number
  risk_type: string
  risk_level: string
  block_action: string
  company_id?: number | null
  user_id?: number | null
  device_fingerprint_id?: number | null
  detail_json?: string | null
  handled_by?: number | null
  handled_at?: string | null
  handle_note: string
  created_at: string
  updated_at: string
}

export interface RiskListParams {
  page?: number
  page_size?: number
  company_id?: number | null
  user_id?: number | null
  risk_type?: string
  risk_level?: string
  handled?: boolean | null
}

export interface RiskHandlePayload {
  action: 'handle' | 'block' | 'unblock' | string
  note?: string
}

export interface ServerTimeLogItem {
  id: number
  client_type: string
  user_id?: number | null
  client_ts?: string | null
  server_ts: string
  delta_ms?: number | null
  nonce: string
  is_abnormal: boolean
  ip: string
  user_agent: string
  created_at: string
}

export interface ServerTimeLogParams {
  page?: number
  page_size?: number
  user_id?: number | null
  client_type?: string
  abnormal?: boolean | null
  start_at?: string | null
  end_at?: string | null
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
