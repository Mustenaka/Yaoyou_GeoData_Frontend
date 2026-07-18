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
  | 'superadmin'
  | 'admin'
  | 'enterprise_admin'
  | 'normal_user'
  | 'temporary_user'

export type UserStatus = 'active' | 'disabled' | 'expired' | 'locked'
export type ClientType = 'admin' | 'mobile' | 'win'
export type DeviceStatus = 'active' | 'disabled' | 'blocked'
export type AuthorizationStatus = 'pending' | 'active' | 'revoked' | 'expired'
export type AuthorizationValidityType = 'long_term' | 'fixed_term'
export type ProductCode = 'mobile' | 'win'
export type ProductGrantScope = ProductCode | 'both'
export type ProductEntitlementState = 'enabled' | 'suspended' | 'revoked'
export type ProductEntitlementMigrationState = 'needs_review' | 'confirmed'
export type DeviceBindingState = 'pending' | 'approved' | 'revoked'
export type DeviceAuthorizationRequestType = 'device_change' | 'device_add' | 'device_renewal'
export type DeviceRiskCategory = 'crack' | 'login_churn' | 'ip_churn' | 'account_churn'
export type DeviceRiskLevel = 'low' | 'medium' | 'high'
export type DeviceRiskHandleAction = 'handle' | 'block_user' | 'block_device'
export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected'
export type FileObjectType =
  | 'project_package'
  | 'entry_data'
  | 'global_config'
  | 'project_config'
  | 'win_result'
  | 'win_project'
  | 'win_data_source'
  | 'client_log'
  | 'operation_record'
export type ClientLogObjectType = 'client_log' | 'operation_record'
export type FileUploadStatus = 'initialized' | 'uploaded' | 'failed'
export type FileParseStatus = 'pending' | 'parsed' | 'failed' | 'skipped'
export type ConfigScope = 'global' | 'project'
export type ProjectLifecycleStatus = 'active' | 'archived' | 'deleted' | 'purged'

export interface TokenUser {
  id: number
  username: string
  real_name?: string
  role_code: RoleCode
  company_id?: number | null
  must_change_password?: boolean
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
  hide_smart_fill?: boolean
  win_features: Record<WinFeatureKey, boolean>
}

export interface TokenAuthorization {
  client_type: ClientType
  device_fingerprint_id?: number | null
  device_authorization_id?: number | null
  device_binding_id?: number | null
  product_scope?: string
  valid_until?: string | null
  status: string
  effective_status?: string
  effective_until?: string | null
  blocking_reason?: string
}

export interface TokenProductEntitlement {
  id: number
  product_code: ProductCode
  state: ProductEntitlementState
  migration_state?: ProductEntitlementMigrationState
  effective_status: string
  effective_until?: string | null
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user: TokenUser
  company?: TokenCompany | null
  authorization: TokenAuthorization | null
  product_entitlement?: TokenProductEntitlement | null
  policy: LoginPolicy
  server_time: string
  license_ticket?: string
  request_signing_key?: string
}

export interface MeResponse {
  user: TokenUser
  company?: TokenCompany | null
  authorization: TokenAuthorization | null
  product_entitlement?: TokenProductEntitlement | null
  policy: LoginPolicy
  server_time: string
  request_signing_key?: string
}

export type RegistrationAppType = 'enterprise' | 'user'
/** @deprecated Compatibility value returned by old registration records only. */
export type RegistrationProduct = 'mobile' | 'win' | 'both'
export type RegistrationStatus = 'pending' | 'approved' | 'rejected'
export type RegistrationSourceChannel = 'admin_apply_page' | 'official_site' | 'mobile_app' | 'win_app'

export interface RegistrationApplicationPayload {
  app_type: RegistrationAppType
  source_channel?: RegistrationSourceChannel
  desired_username: string
  company_name?: string
  contact_name: string
  phone: string
  email: string
  target_company_id?: number | null
  no_company?: boolean
  manager_user_id?: number | null
  requested_role?: RoleCode
  valid_until?: string | null
  device_client_type?: string
  device_fingerprint?: Record<string, unknown>
  reason?: string
}

export interface RegistrationApplicationUpdatePayload {
  desired_username?: string
  company_name?: string
  contact_name: string
  phone: string
  email: string
  target_company_id?: number | null
  no_company?: boolean
  manager_user_id?: number | null
  requested_role?: RoleCode
  valid_until?: string | null
  reason?: string
}

export interface RegistrationAccountPayload {
  username?: string
  password?: string
  real_name?: string
  valid_until?: string | null
}

export interface RegistrationApprovePayload {
  note?: string
  account_count?: number
  accounts?: RegistrationAccountPayload[]
  account?: RegistrationAccountPayload
  target_company_id?: number | null
  no_company?: boolean
  manager_user_id?: number | null
  requested_role?: RoleCode
  valid_until?: string | null
}

export interface RegistrationReceipt {
  id: number
  status: RegistrationStatus
  created_at: string
}

export interface RegistrationApplication {
  id: number
  app_type: RegistrationAppType
  source_channel: RegistrationSourceChannel | string
  desired_username: string
  company_name: string
  contact_name: string
  phone: string
  email: string
  target_company_id?: number | null
  no_company?: boolean
  manager_user_id?: number | null
  manager_username?: string
  /** @deprecated Historical application intent; never use as an authorization gate. */
  requested_product?: RegistrationProduct
  requested_role: RoleCode | string
  valid_until?: string | null
  device_client_type?: string | null
  device_fingerprint_payload_json?: string | null
  device_fingerprint_hash?: string | null
  reason: string
  status: RegistrationStatus
  created_ip: string
  created_at: string
  updated_at: string
  handled_by?: number | null
  handled_at?: string | null
  handle_note?: string
  created_account_user_id?: number | null
  created_company_id?: number | null
  created_user_count?: number
}

export interface RegistrationCreatedUserResponse {
  user: UserItem
  temporary_password?: string
}

export interface RegistrationApproveResponse {
  application: RegistrationApplication
  user: UserItem
  company?: CompanyItem
  temporary_password?: string
  created_users?: RegistrationCreatedUserResponse[]
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
  auto_activate_first_device: boolean
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
  cascade_user_valid_until?: boolean
  cascade_device_valid_until?: boolean
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
  auto_activate_first_device?: boolean
}

export interface UserItem {
  id: number
  username: string
  real_name?: string
  email: string
  phone: string
  company_id?: number | null
  company_name?: string
  role_code: RoleCode
  status: UserStatus
  valid_until?: string | null
  can_use_mobile: boolean
  can_use_win: boolean
  mobile_product_access?: UserProductAccessSummary
  win_product_access?: UserProductAccessSummary
  last_login_at?: string | null
  last_login_ip?: string
  mobile_session_expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface UserProductAccessSummary {
  product_code: ProductCode
  entitlement_id?: number | null
  access_state?: string
  access_generation?: number
  current_entitlement_generation?: number
  current_enabled?: boolean
  needs_regrant?: boolean
  effective_status?: string
  source_of_truth?: string
}

export interface UserPayload {
  username?: string
  real_name?: string
  password?: string
  email?: string
  phone?: string
  company_id?: number | null
  role_code?: RoleCode
  status?: UserStatus
  valid_until?: string | null
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
  validity_type?: AuthorizationValidityType
  effective_expired?: boolean
  lifecycle_status?: string
  effective_status?: string
  effective_until?: string | null
  blocking_reason?: string
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

export interface AuthorizationCapabilities {
  can_create?: boolean
  can_update?: boolean
  can_confirm?: boolean
  can_revoke?: boolean
  can_reissue?: boolean
  can_reapprove?: boolean
  assigned_user_supported?: boolean
}

export interface AuthorizationV2Readiness {
  legacy_authorization_count: number
  needs_review_count: number
  unmapped_legacy_count: number
  pending_shadow_event_count: number
  unresolved_anomaly_count: number
  materialization_drift_count: number
  active_outside_effective_window_count: number
  backfill_incomplete: boolean
}

export interface AuthorizationMigrationAnomalySummary {
  id: number
  legacy_authorization_id: number
  anomaly_type: string
  evidence_hash: string
}

export interface AuthorizationMigrationAnomalyResolutionPayload {
  action: 'accept_as_device_override' | 'normalize_product_scope_to_client'
  reason: string
  expected_evidence_hash: string
}

export interface AuthorizationMigrationAnomalyItem extends AuthorizationMigrationAnomalySummary {
  resolved_at?: string | null
  resolution_action?: string
  resolution_evidence_hash?: string
  resolved_by?: number | null
  resolution_reason?: string
  resolution_recorded_at?: string | null
  created_at: string
  updated_at: string
}

export interface AuthorizationPageResult<T> extends PageResult<T> {
  source_of_truth?: string
  mode?: string
  capabilities?: AuthorizationCapabilities
  readiness?: AuthorizationV2Readiness | null
}

export interface DeviceBindingItem {
  id: number
  revision: number
  entitlement_id: number
  entitlement_generation: number
  current_entitlement_generation?: number
  device_fingerprint_id: number
  company_id?: number | null
  owner_user_id?: number | null
  subject_name?: string
  company_name?: string
  product_code: ProductCode
  client_type?: 'mobile' | 'win' | string
  state: DeviceBindingState
  assigned_user_id?: number | null
  assigned_username?: string
  valid_from_override?: string | null
  valid_until_override?: string | null
  valid_from?: string | null
  valid_until?: string | null
  activation_source?: string
  requested_by?: number | null
  approved_by?: number | null
  approved_at?: string | null
  revoked_at?: string | null
  revoked_by?: number | null
  revoked_reason?: string
  last_check_at?: string | null
  created_at: string
  updated_at: string
  lifecycle_status?: string
  device_readiness_status?: string
  effective_from?: string | null
  effective_until?: string | null
  blocking_reason?: string
  legacy_authorization_id?: number | null
  source_of_truth?: string
  capabilities?: AuthorizationCapabilities
  device_name?: string
  fingerprint_hash?: string
  device_status?: DeviceStatus
  risk_level?: string
  last_seen_at?: string | null
}

export interface DeviceBindingDetailDevice {
  id: number
  company_id?: number | null
  user_id?: number | null
  client_type?: 'mobile' | 'win' | string
  fingerprint_hash?: string
  fingerprint_payload?: Record<string, string> | null
  fingerprint_payload_json?: string | null
  mobile_install_id?: string | null
  mobile_install_id_hash?: string | null
  win_mainboard_id_hash?: string | null
  device_name?: string
  os_version?: string
  app_version?: string
  first_seen_at?: string | null
  last_seen_at?: string | null
  status?: DeviceStatus | string
  risk_level?: string
  blocked_at?: string | null
  blocked_reason?: string
  created_at?: string
  updated_at?: string
}

export interface DeviceBindingRequestItem {
  id: number
  request_type: DeviceAuthorizationRequestType | string
  status: ChangeRequestStatus | string
  reason?: string
  note?: string
  user_id?: number | null
  username?: string
  real_name?: string
  company_id?: number | null
  company_name?: string
  handled_by?: number | null
  handled_at?: string | null
  created_at: string
  updated_at?: string
}

export interface DeviceBindingHistoryItem {
  id: number
  event_key?: string
  event_type: string
  device_binding_id?: number
  device_fingerprint_id?: number
  company_id?: number | null
  owner_user_id?: number | null
  actor_type?: string
  summary?: string
  detail_json?: string | Record<string, unknown> | null
  actor_user_id?: number | null
  request_id?: number | null
  revision?: number | null
  binding_revision?: number | null
  occurred_at: string
  created_at?: string
  actor_username?: string
  actor_real_name?: string
}

export interface DeviceBindingDetail extends DeviceBindingItem {
  device?: DeviceBindingDetailDevice | null
  requests?: DeviceBindingRequestItem[]
  history?: DeviceBindingHistoryItem[]
  active_session_count?: number
  latest_session_expires_at?: string | null
}

export interface DeviceBindingUpdatePayload {
  state?: DeviceBindingState
  assigned_user_id?: number | null
  valid_from_override?: string | null
  valid_until_override?: string | null
  valid_from?: string | null
  valid_until?: string | null
  expected_revision: number
}

export interface DeviceBindingListParams {
  page?: number
  page_size?: number
  binding_id?: number
  company_id?: number
  owner_user_id?: number
  entitlement_id?: number
  product_code?: ProductCode
  client_type?: 'mobile' | 'win'
  state?: DeviceBindingState
  effective_status?: string
  device_fingerprint_id?: number
  device_status?: DeviceStatus
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
  valid_from?: string | null
  valid_until?: string | null
  validity_type?: AuthorizationValidityType
  effective_expired?: boolean
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
  request_type: DeviceAuthorizationRequestType | string
  company_id?: number | null
  company_name?: string
  user_id: number
  username?: string
  real_name?: string
  old_device_id?: number | null
  new_device_id?: number | null
  new_device_name?: string
  old_device_authorization_id?: number | null
  old_device_binding_id?: number | null
  new_device_binding_id?: number | null
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

export interface DeviceChangeRequestListParams {
  page?: number
  page_size?: number
  status?: ChangeRequestStatus | string | null
  request_type?: DeviceAuthorizationRequestType | string | null
  company_id?: number | null
}

export interface DeviceAuthorizationDecisionPayload {
  note?: string
  valid_from?: string | null
  valid_until?: string | null
}

export interface DeviceAuthorizationBatchApproveItem {
  id: number
  valid_from?: string | null
  valid_until?: string | null
}

export interface DeviceAuthorizationBatchApprovePayload {
  items: DeviceAuthorizationBatchApproveItem[]
  note?: string
}

export interface DeviceAuthorizationBatchApproveResponse {
  items: DeviceChangeRequest[]
}

export interface DeviceExportAuthorizePayload {
  blob: string
  target_user_id: number
}

export interface DeviceExportAuthorizeResponse {
  device_fingerprint_id: number
  device_authorization_id?: number | null
  device_binding_id?: number | null
  target_user_id: number
  company_id?: number | null
  client_type: 'mobile' | 'win' | string
  product_scope: string
  valid_until?: string | null
  status: AuthorizationStatus | string
  activation_source: string
}

export interface DeviceRiskCategoryItem {
  category: DeviceRiskCategory | string
  level: DeviceRiskLevel | string
  count: number
  last_at: string
}

export interface DeviceRiskCompany {
  id: number
  company_name: string
}

export interface DeviceRiskUser {
  id: number
  username: string
  real_name?: string
  company_id?: number | null
}

export interface DeviceRiskItem {
  device_fingerprint_id: number
  company_id?: number | null
  company_name?: string
  company?: DeviceRiskCompany | null
  user_id?: number | null
  username?: string
  user?: DeviceRiskUser | null
  client_type: 'mobile' | 'win' | string
  device_name?: string
  categories: DeviceRiskCategoryItem[]
  max_level: DeviceRiskLevel | string
  last_at: string
}

export interface DeviceRiskListParams {
  page?: number
  page_size?: number
  company_id?: number | null
  client_type?: string | null
  category?: DeviceRiskCategory | string | null
  level?: DeviceRiskLevel | string | null
}

export interface DeviceRiskHandlePayload {
  action: DeviceRiskHandleAction
  note: string
}

export interface DeviceRiskHandleResult {
  device_fingerprint_id: number
  action: DeviceRiskHandleAction
  note: string
  blocked_user_id?: number
  affected_events: number
  handled_at: string
}

export interface ListParams {
  id?: number
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
  no_company?: boolean
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

export interface ClientLogCompany {
  id: number
  company_name: string
}

export interface ClientLogUser {
  id: number
  username: string
  real_name?: string
  company_id?: number | null
}

export interface ClientLogDevice {
  id: number
  client_type: ClientType | string
  device_name: string
  fingerprint_hash: string
}

export interface ClientLogItem {
  id: number
  file_id: string
  object_type: ClientLogObjectType | string
  client_type: ClientType | string
  company_id?: number | null
  company_name?: string
  company?: ClientLogCompany
  user_id: number
  username?: string
  user?: ClientLogUser
  device_fingerprint_id?: number | null
  device?: ClientLogDevice
  app_version?: string
  original_filename?: string
  safe_filename?: string
  file_name?: string
  mime_type?: string
  size_bytes: number
  upload_status: FileUploadStatus | string
  parse_status: FileParseStatus | string
  parse_message?: string
  server_received_at: string
  created_at: string
}

export interface ClientLogListParams {
  page?: number
  page_size?: number
  company_id?: number | null
  user_id?: number | null
  device_fingerprint_id?: number | null
  object_type?: ClientLogObjectType | string | null
  client_type?: ClientType | string | null
  start_at?: string | null
  end_at?: string | null
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
  project_lead?: string
  test_lead?: string
  start_date?: string
  report_date?: string
  uuid_fallback: boolean
  source_mobile_file_id: string
  latest_win_result_file_id: string
  latest_config_file_id: string
  latest_entry_data_file_id: string
  last_uploaded_at?: string | null
  last_parsed_at?: string | null
  parse_message: string
  lifecycle_status: ProjectLifecycleStatus | string
  lifecycle_reported_at?: string | null
  purge_after?: string | null
  created_at: string
  updated_at: string
}

export type WinProjectKind = 'sky' | 'huaning'
export type WinFeatureKey = 'sky_projects' | 'huaning_projects'

export interface WinProjectListItem {
  project: ProjectArchiveItem
  project_kind: WinProjectKind
}

export interface WinSpreadsheetPreviewSheet {
  name: string
  row_count: number
  column_count: number
  rows_truncated: boolean
  columns_truncated: boolean
  rows: string[][]
}

export interface WinSpreadsheetPreview {
  schema_version: number
  format: string
  sheet_count: number
  row_count: number
  column_count: number
  sheets_truncated: boolean
  sheets: WinSpreadsheetPreviewSheet[]
}

export interface WinFileSnapshot {
  id: number
  project_cloud_index_id: number
  project_snapshot_id?: number | null
  project_uuid: string
  project_kind: WinProjectKind
  source_role: string
  source_file_id: string
  original_filename: string
  sheet_count: number
  row_count: number
  column_count: number
  metadata?: Record<string, unknown>
  preview?: WinSpreadsheetPreview | null
  source_received_at: string
  created_at?: string
  updated_at?: string
}

export interface WinProjectDetail {
  project: ProjectArchiveItem
  project_kind: WinProjectKind
  project_snapshot?: WinFileSnapshot | null
  data_sources: WinFileSnapshot[]
}

export interface WinFeatureItem {
  key: WinFeatureKey
  label: string
  global_disabled: boolean
}

export interface WinFeatureCompany {
  company_id: number
  company_name: string
  disabled: Record<WinFeatureKey, boolean>
  effective_disabled: Record<WinFeatureKey, boolean>
}

export interface WinFeaturePolicy {
  features: WinFeatureItem[]
  companies: WinFeatureCompany[]
}

export interface WinFeatureUpdateResponse {
  feature_key: WinFeatureKey
  scope_type: 'global' | 'company'
  scope_id: number
  disabled: boolean
}

export interface ArchiveCompanyItem {
  company_id: number | null
  company_name: string
  device_count: number
  project_count: number
  last_uploaded_at?: string | null
}

export interface ArchiveDeviceItem {
  device_fingerprint_id: number
  company_id?: number | null
  device_name: string
  client_type: ClientType | string
  fingerprint_hash_masked: string
  status: DeviceStatus | string
  authorization_status: AuthorizationStatus | string
  valid_until?: string | null
  last_seen_at: string
  project_count: number
  last_uploaded_at?: string | null
}

export interface ArchiveDeviceProjectItem extends ProjectArchiveItem {
  form_types: string[]
  row_count_total: number
  sample_count_total: number
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
  company_name?: string
  user_id?: number | null
  username?: string
  real_name?: string
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

export interface ServiceHealth {
  api: string
  database: string
  redis: string
  storage: string
  overall: string
}

export interface BackendVersionInfo {
  system_name: string
  service: string
  version: string
  build_time: string
  sha: string
}

export interface HealthStatus {
  status: string
  backend?: BackendVersionInfo
}

export interface VersionStatus {
  backend: BackendVersionInfo
}

export interface ExpiringSummary {
  window_days: number
  company_count: number
  license_count: number
  trial_user_count: number
  temporary_user_count: number
}

export interface DashboardSummary {
  scope: 'system' | 'company' | string
  company_id?: number | null
  generated_at: string
  service_status: ServiceHealth
  active_company_count: number
  user_count: number
  active_session_count: number
  device_count: number
  today_upload_count: number
  today_failed_count: number
  high_risk_count: number
  expiring: ExpiringSummary
}

export interface DashboardStorage {
  provider: string
  status: 'normal' | 'soft' | 'warn' | string
  used_bytes: number
  used_gb: number
  soft_limit_gb: number
  warn_limit_gb: number
  updated_at: string
  cache_ttl_seconds: number
}

export interface DashboardServerMetricSample {
  id: number
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  goroutine_num: number
  active_ws: number
  storage_used_bytes: number
  upload_failed_count: number
  high_risk_count: number
  expiring_count: number
  created_at: string
}

export interface DashboardServerMetrics {
  generated_at: string
  uptime_seconds: number
  service_status: ServiceHealth
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  goroutine_num: number
  active_ws: number
  storage_used_bytes: number
  storage_used_gb: number
  storage_soft_limit_gb: number
  storage_warn_limit_gb: number
  storage_status: 'normal' | 'soft' | 'warn' | string
  runtime_history: DashboardServerMetricSample[]
  runtime_history_limit: number
  runtime_history_count: number
  runtime_history_updated?: string | null
}

export interface DashboardFileEvent {
  file_id: string
  company_id?: number | null
  user_id: number
  source_client: string
  object_type: string
  project_uuid: string
  original_filename: string
  upload_status: string
  parse_status: string
  parse_message: string
  created_at: string
}

export interface DashboardRiskEvent {
  id: number
  risk_type: string
  risk_level: string
  block_action: string
  company_id?: number | null
  company_name?: string
  user_id?: number | null
  username?: string
  real_name?: string
  device_fingerprint_id?: number | null
  handled_at?: string | null
  created_at: string
}

export interface ExpiringLicenseEvent {
  id: number
  authorization_kind?: 'product_entitlement' | 'legacy_device_authorization' | string
  subject_name?: string
  company_id?: number | null
  user_id?: number | null
  username: string
  client_type: string
  product_scope: string
  device_fingerprint_id?: number | null
  valid_until?: string | null
  status: string
}

export interface ExpiringUserEvent {
  id: number
  company_id?: number | null
  username: string
  role_code: RoleCode | string
  valid_until?: string | null
}

export interface ExpiringCompanyEvent {
  id: number
  company_name: string
  valid_until?: string | null
  status: number
}

export interface DashboardRecentEvents {
  generated_at: string
  failed_uploads: DashboardFileEvent[] | null
  recent_uploads: DashboardFileEvent[] | null
  high_risks: DashboardRiskEvent[] | null
  expiring_licenses: ExpiringLicenseEvent[] | null
  expiring_users: ExpiringUserEvent[] | null
  expiring_companies: ExpiringCompanyEvent[] | null
}

export interface SystemSettings {
  storage_soft_limit_gb: number
  storage_warn_limit_gb: number
  max_upload_mb: number
  log_retention_days: number
  audit_retention_days: number
  tmp_retention_hours: number
  min_mobile_version: string
  min_win_version: string
  risk_block_enabled: boolean
  jobs_enabled: boolean
  backup_enabled: boolean
  cleanup_enabled: boolean
  backup_retention_days: number
}

export type SystemSettingsPayload = Partial<SystemSettings>

export type MailSecureMode = 'none' | 'starttls' | 'tls'
export type MailDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped'
export type MailEventType = 'registration_submitted' | 'registration_approved' | 'registration_rejected' | 'test'

export interface MailSettings {
  enabled: boolean
  smtp_host: string
  smtp_port: number
  smtp_username: string
  has_password: boolean
  smtp_secure_mode: MailSecureMode | string
  from_address: string
  from_name: string
  reply_to: string
  timeout_seconds: number
  last_test_at?: string | null
  last_test_status: MailDeliveryStatus | string
  last_test_error: string
}

export interface MailSettingsPayload {
  enabled?: boolean
  smtp_host?: string
  smtp_port?: number
  smtp_username?: string
  smtp_password?: string
  smtp_secure_mode?: MailSecureMode
  from_address?: string
  from_name?: string
  reply_to?: string
  timeout_seconds?: number
}

export interface MailDeliveryLog {
  id: number
  event_type: MailEventType | string
  recipient_masked: string
  subject: string
  status: MailDeliveryStatus | string
  error_message: string
  related_application_id?: number | null
  related_user_id?: number | null
  attempt_count: number
  sent_at?: string | null
  created_at: string
  updated_at: string
}

export interface MailDeliveryListParams {
  page?: number
  page_size?: number
  status?: MailDeliveryStatus | ''
  event_type?: MailEventType | ''
  keyword?: string
  start_at?: string | null
  end_at?: string | null
}

export interface MailDeliverySummary {
  since: string
  sent: number
  failed: number
  skipped: number
  pending: number
}

export interface MailDeliveryListResponse {
  list: MailDeliveryLog[]
  total: number
  page: number
  page_size: number
  summary_24h: MailDeliverySummary
}

export interface MaintenanceBackupResponse {
  backup_path: string
  size_bytes: number
  table_count: number
  pruned_backups: number
  runtime_status_id: number
  created_at: string
}

export interface MaintenanceCleanupResponse {
  tmp_files_deleted: number
  tmp_bytes_deleted: number
  system_logs_deleted: number
  client_logs_deleted: number
  client_log_files_deleted: number
  audit_logs_deleted: number
  risk_logs_deleted: number
  server_time_logs_deleted: number
  runtime_status_id: number
  cleaned_at: string
}
